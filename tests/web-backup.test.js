// Copyright (c) 2026 p-darksy-r. BrandGame.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
    const context = vm.createContext({TextEncoder});
    for (const file of ['version', 'results', 'state', 'backup']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/web/js/core', `${file}.js`), 'utf8'), context);
    }
    return context;
}

function populated(context) {
    const save = context.createDefaultSaveData();
    Object.assign(save, {globalScore: 442, customScore: 200, language: 'es', theme: 'forest', reducedMotion: true});
    save.levelsUnlocked.tech = 3;
    save.categoryScores.tech = 442;
    save.customLevels = [{name: 'Da família', brands: [{name: 'Marca antiga', slug: 'unavailable-logo'}]}];
    context.recordLevelResult(save, 'tech', 2, 'medium', 3, 3, true, 100, 4300);
    context.recordLevelResult(save, 'custom', 0, 'hard', 1, 1, true, 75, 1000);
    return save;
}

test('portable backups round-trip records, original room text, legacy logos and preferences', () => {
    const c = fixture();
    const save = populated(c);
    const body = c.makeProgressBackup(save);
    const restored = c.readProgressBackup('\uFEFF' + body);
    assert.deepEqual(JSON.parse(JSON.stringify(restored)), JSON.parse(JSON.stringify(save)));
    restored.customLevels[0].name = 'Changed';
    assert.equal(save.customLevels[0].name, 'Da família');
    const older = JSON.parse(body);
    older.save.gameVersion = '3.5.0';
    assert.equal(c.readProgressBackup(JSON.stringify(older)).gameVersion, save.gameVersion);
});

test('historical text and large room collections survive migration and the portable backup', () => {
    const c = fixture();
    const longHint = 'Uma pista guardada antes de existir um limite. '.repeat(120);
    const legacyRoom = {name: 'R'.repeat(300), brands: Array.from({length: 12}, (_, i) => ({
        name: `Marca ${i}`, slug: 'antigo-' + 'a'.repeat(280), hint: longHint
    }))};
    const existing = c.normalizeSaveData({gameVersion: '3.5.0', levelsUnlocked: {tech: 7},
        customLevels: [legacyRoom, ...Array.from({length: 4096}, () => ({name: 'Room', brands: [{name: 'A', slug: 'a'}]}))]});
    const restored = c.readProgressBackup(c.makeProgressBackup(existing));
    assert.equal(restored.levelsUnlocked.tech, 7);
    assert.equal(restored.customLevels.length, 4097);
    assert.deepEqual(JSON.parse(JSON.stringify(restored.customLevels[0])), legacyRoom);
});

test('invalid, incompatible or lossy imports are rejected before replacement', () => {
    const c = fixture();
    const json = c.makeProgressBackup(populated(c));
    for (const change of [
        b => {delete b.save.globalScore}, b => {b.format = 'Other'}, b => {b.version = 2},
        b => {b.save.progressSchema = 3}, b => {b.save.globalScore = -1},
        b => {b.save.theme = 'unknown'}, b => {b.save.levelResults.tech[101] = {}},
        b => {b.save.customLevels[0].brands[0].hint = {}}, b => {b.save.customLevels[0].theme = 'has spaces'},
        b => {b.save.customLevels[0].brands = []}, b => {b.save.customResults = {'room:unknown': {}}},
        b => {b.save.levelResults.tech[2].medium.plays = -1}, b => {b.save.levelsUnlocked = []},
        b => {b.save.customLevels[0].brands[0].constructor = 'unexpected'},
        b => {Object.defineProperty(b.save.levelResults.tech, '__proto__', {value:{}, enumerable: true})}
    ]) {
        const b = JSON.parse(json);
        change(b);
        assert.throws(() => c.readProgressBackup(JSON.stringify(b)));
    }
    for (const invalid of ['{}', 'null', '[]', '{"truncated":', JSON.stringify({ ...JSON.parse(json).save, extra: true })]) {
        assert.throws(() => c.readProgressBackup(invalid));
    }
});

test('raw Windows saves preserve progress, consume only valid disk recovery pointers and reject incompatible data', () => {
    const c = fixture();
    const save = populated(c);
    for (const [version, slot] of [['3.5.0', undefined], ['3.6.0', 0], ['3.7.0', 1], [save.gameVersion, undefined]]) {
        const record = { ...save, gameVersion: version, _brandGameRestoreSlot: slot };
        assert.deepEqual(JSON.parse(JSON.stringify(c.readProgressBackup(JSON.stringify(record)))), JSON.parse(JSON.stringify(save)));
    }
    for (const changed of [{ _brandGameRestoreSlot: null }, { _brandGameRestoreSlot: 2 }, { _brandGameRestoreSlot: '1' },
        { _brandGamePrevious: save }, { format: 'Other' }, { progressSchema: 3 }, { globalScore: -1 }]) {
        assert.throws(() => c.readProgressBackup(JSON.stringify({ ...save, ...changed })));
    }
    const envelope = JSON.parse(c.makeProgressBackup(save));
    envelope.save._brandGameRestoreSlot = 0;
    assert.throws(() => c.readProgressBackup(JSON.stringify(envelope)));
});

test('backup size is bounded in UTF-8 bytes before decoding a potentially large file', () => {
    const c = fixture();
    const limit = vm.runInContext('MAX_BACKUP_BYTES', c);
    const large = '€'.repeat(Math.ceil(limit / 3));
    assert.ok(large.length < limit && Buffer.byteLength(large) > limit);
    assert.throws(() => c.readProgressBackup(large), /Invalid or unsupported/);
});
