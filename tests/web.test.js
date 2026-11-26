// Copyright (c) 2026 p-darksy-r. BrandGame.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../src/web');

function context(files, additions = {}) {
    const sandbox = vm.createContext({ window: {}, console, ...additions });
    for (const file of [...new Set(["js/core/version.js", "js/core/results.js", "js/ui/icons.js", ...files])]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
    return sandbox;
}
const dataFiles = ['js/data/offline-catalog.js', 'js/data/brands.js'];

test('all five catalogs contain distinct identities with local logos', () => {
    const ctx = context(dataFiles);
    const database = ctx.window.BRAND_DATABASE;
    assert.equal(Object.keys(database).length, 5);
    for (const brands of Object.values(database)) {
        assert.ok(brands.length >= 12);
        assert.equal(new Set(brands.map(brand => brand.name.toLowerCase())).size, brands.length);
        assert.equal(new Set(brands.map(brand => brand.slug)).size, brands.length);
        for (const brand of brands) {
            assert.ok(brand.name && brand.hint);
            assert.ok(fs.existsSync(path.join(root, ctx.getLocalLogoPath(brand.slug))));
        }
    }
    assert.ok(!database.auto.some(brand => ['Norton', 'Proton'].includes(brand.name)));
    assert.ok(!database.fashion.some(brand => ['Pandora', 'Element'].includes(brand.name)));
    assert.equal(ctx.getLocalLogoPath('../private'), null);
});

test('500 category levels are deterministic, unique and follow the 3 to 12 brand progression', () => {
    const ctx = context([...dataFiles, 'js/core/levels.js']);
    for (const category of Object.keys(ctx.window.BRAND_DATABASE)) {
        for (let level = 1; level <= 100; level++) {
            const brands = ctx.getBrandsForLevel(category, level);
            assert.equal(brands.length, Math.floor((level - 1) / 10) + 3);
            assert.equal(new Set(brands.map(brand => brand.name)).size, brands.length);
            assert.deepEqual(brands, ctx.getBrandsForLevel(category, level));
        }
    }
    for (const invalid of [0, 101, 1.5, NaN]) assert.equal(ctx.getBrandsForLevel('tech', invalid).length, 0);
    assert.equal(ctx.getBrandsForLevel('__proto__', 1).length, 0);
    assert.notDeepEqual(ctx.getBrandsForLevel('tech', 1), ctx.getBrandsForLevel('tech', 2));
});

test('fashion and food rotations distribute brands evenly and minimize repeats between adjacent levels', () => {
    const catalogue = context(dataFiles).window.BRAND_DATABASE;
    // A smaller pool also exercises levels where repeats really are unavoidable.
    for (const [category, pool] of [['fashion', catalogue.fashion], ['food', catalogue.food], ['fashion', catalogue.fashion.slice(0, 13)]]) {
        const ctx = context(['js/core/levels.js'], { BRAND_DATABASE: { [category]: pool } });
        const counts = new Map(pool.map(brand => [brand.slug, 0]));
        let previous = new Set();
        for (let level = 1; level <= 100; level++) {
            const current = ctx.getBrandsForLevel(category, level).map(brand => brand.slug);
            const repeated = current.filter(slug => previous.has(slug)).length;
            const unavoidable = Math.max(0, previous.size + current.length - pool.length);
            assert.equal(repeated, unavoidable, `${category}, level ${level}`);
            for (const slug of current) counts.set(slug, counts.get(slug) + 1);
            previous = new Set(current);
        }
        assert.ok(Math.max(...counts.values()) - Math.min(...counts.values()) <= 1);
    }
});

test('web scoring matches the shared native engine cases', () => {
    const ctx = context(['js/core/matching.js']);
    const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'matching-cases.json'), 'utf8'));
    for (const item of cases) {
        const result = ctx.calculateGuessResult(item.guess, item.answer, item.elapsed);
        assert.ok(Math.abs(result.match - item.match) < 0.00001);
        assert.equal(result.correct, item.correct);
        assert.equal(result.score, item.score);
    }
});

test('practice recognizes the shared native matching cases and leaves blank guesses unanswered', () => {
    const ctx = context(['js/core/matching.js', 'js/gameplay/practice.js']);
    const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'matching-cases.json'), 'utf8'));
    for (const { guess, answer, correct } of cases) {
        const brand = { name: answer };
        ctx.GAME_STATE = { missedBrands: [brand] };
        const session = ctx.createMissedPractice();
        const result = ctx.submitPracticeGuess(session, guess || '  ');
        if (!guess) assert.equal(result, null);
        else assert.equal(result.correct, correct, `${guess} / ${answer}`);
        assert.equal(session.remaining.length, correct ? 0 : 1);
        assert.deepEqual(ctx.GAME_STATE.missedBrands, [brand]);
    }
});

test('old and malformed saves recover defaults while preserving progress and completed categories', () => {
    const ctx = context(['js/core/state.js']);
    for (const malformed of [null, 'broken json', [], 42]) assert.equal(ctx.normalizeSaveData(malformed).levelsUnlocked.tech, 1);
    const save = ctx.normalizeSaveData({ globalScore: 42, levelsUnlocked: { tech: 101, auto: -1 }, volume: 9, brightness: NaN, customLevels: [null, {}] });
    assert.equal(save.globalScore, 42);
    assert.equal(save.levelsUnlocked.tech, 101);
    assert.equal(save.levelsUnlocked.auto, 1);
    assert.equal(save.levelsUnlocked.food, 1);
    assert.equal(save.volume, 1);
    assert.equal(save.brightness, 100);
    assert.equal(save.customLevels.length, 0);
});

test('clues hide accented letters until bought and reveal their original spelling', () => {
    const hud = { textContent: '' };
    const ctx = context(['js/core/state.js', 'js/core/matching.js', 'js/gameplay/clues.js'], {
        document: { getElementById: () => hud }
    });
    vm.runInContext('GAME_STATE.currentBrand = { name: "Żabka" }; GAME_STATE.roundStatus = "playing"; renderRevealedLetters();', ctx);
    assert.equal(hud.textContent, '_ _ _ _ _');
    vm.runInContext('for (let i = 0; i < 6; i++) buyLetterClue();', ctx);
    assert.equal(hud.textContent, 'Ż A B K A');
    assert.equal(vm.runInContext('GAME_STATE.clueCost', ctx), 50);
});

test('each round accepts one submission and deducts each letter clue once', () => {
    const input = { value: 'Apple' };
    const ctx = context(['js/core/state.js', 'js/core/matching.js', 'js/gameplay/clues.js', 'js/gameplay/feedback.js'], {
        document: { getElementById: id => id === 'input-guess' ? input : null },
        updateRoundClock() {}, clearInterval() {}, sfx: { playCoin() {}, playWrong() {} }
    });
    vm.runInContext('GAME_STATE.currentBrand = {name:"Apple"}; GAME_STATE.roundStatus = "playing"; buyLetterClue(); submitUserGuess(); submitUserGuess(); onMatchResult({correct:true,match:100,score:50});', ctx);
    assert.equal(vm.runInContext('GAME_STATE.currentLevelScore', ctx), 40);
    assert.equal(vm.runInContext('GAME_STATE.currentLevelCorrectCount', ctx), 1);
    assert.equal(vm.runInContext('GAME_STATE.clueCost', ctx), 10);
});

test('storage-denied browsers can still load a session and cannot crash on save', () => {
    const ctx = context(['js/core/state.js', 'js/platform/storage.js'], {
        window: { localStorage: { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } } },
        console: { warn() {} }, sfx: {}, applyLanguage() {}, applyAppearanceSettings() {}, updateGlobalStatsHUD() {}, renderMainMenuProgress() {}, syncSettingsPanel() {}, applyVisualSettings() {}
    });
    ctx.sendNativeRequest({ Action: 'load_save' });
    assert.equal(vm.runInContext('GAME_STATE.saveData.globalScore', ctx), 0);
    ctx.sendNativeRequest({ Action: 'write_save', Data: {} });
});

test('browser rename copies the legacy save and never overwrites current progress', () => {
    const legacy = JSON.stringify({ globalScore: 123, language: 'es', theme: 'forest' });
    const entries = new Map([['brandgame_v3_savedata', legacy]]);
    const ctx = context(['js/core/state.js', 'js/platform/storage.js'], {
        window: { localStorage: { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) } },
        sfx: {}, applyLanguage() {}, applyAppearanceSettings() {}, updateGlobalStatsHUD() {}, renderMainMenuProgress() {}, syncSettingsPanel() {}, applyVisualSettings() {}
    });
    ctx.sendNativeRequest({ Action: 'load_save' });
    assert.equal(entries.get('brandgame_savedata'), legacy);
    assert.equal(entries.get('brandgame_v3_savedata'), legacy);
    assert.equal(vm.runInContext('GAME_STATE.saveData.globalScore', ctx), 123);
    assert.equal(vm.runInContext('GAME_STATE.saveData.theme', ctx), 'forest');
    ctx.sendNativeRequest({ Action: 'write_save', Data: { globalScore: 456 } });
    ctx.sendNativeRequest({ Action: 'load_save' });
    assert.equal(vm.runInContext('GAME_STATE.saveData.globalScore', ctx), 456);
    assert.equal(entries.get('brandgame_v3_savedata'), legacy);
});

test('completing level 100 persists all 100 completed levels', () => {
    const ctx = context(['js/core/state.js', 'js/gameplay/report.js'], {
        document: { getElementById() { return null; }, querySelector() { return null; } },
        clearInterval() {}, sfx: { playFanfare() {} }, sendNativeRequest() {}, updateGlobalStatsHUD() {}, showScreen() {}
    });
    vm.runInContext('GAME_STATE.currentCategory="tech"; GAME_STATE.currentLevel=100; GAME_STATE.saveData.levelsUnlocked.tech=100; GAME_STATE.activeBrands=[{}]; GAME_STATE.currentLevelCorrectCount=1; triggerLevelEnd(true);', ctx);
    assert.equal(vm.runInContext('normalizeSaveData(GAME_STATE.saveData).levelsUnlocked.tech', ctx), 101);
});

test('HTML references exist and all scripts load together without conflicting declarations', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script src="(?!https?:)([^"]+)"/g)].map(match => match[1]);
    assert.ok(scripts.length >= 15);
    const ctx = context(scripts, { document: { addEventListener() {} } });
    assert.equal(typeof ctx.window.onMatchResult, 'function');
    assert.equal(typeof ctx.window.onSaveLoaded, 'function');
    for (const match of html.matchAll(/(?:src|href)="(?!https?:)([^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
    assert.equal(vm.runInContext('GAME_VERSION', ctx), fs.readFileSync(path.join(__dirname, '../VERSION'), 'utf8').trim());
});
