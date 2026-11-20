// Copyright (c) 2026 p-darksy-r.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
    const context = vm.createContext({ window: {} });
    for (const file of ['core/version', 'core/results', 'core/state', 'locales/en', 'locales/pt-PT', 'locales/es', 'locales/hints-pt-PT', 'locales/hints-es', 'ui/i18n', 'data/offline-catalog'])
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/web/js', `${file}.js`), 'utf8'), context);
    return context;
}

test('language and theme normalization preserve legacy progress and rooms', () => {
    const context = load();
    const old = { globalScore: 987, levelsUnlocked: { tech: 12 }, customLevels: [{ name: 'Fashion', brands: [{ name: 'Apple', slug: 'apple', hint: 'Settings' }] }] };
    const migrated = context.normalizeSaveData(old);
    assert.equal(migrated.globalScore, 987);
    assert.equal(migrated.levelsUnlocked.tech, 12);
    assert.equal(migrated.language, 'pt-PT');
    assert.equal(migrated.theme, 'midnight');
    assert.equal(migrated.customLevels[0].brands[0].hint, 'Settings');
    assert.equal(context.normalizeSaveData({ ...old, language: 'es-MX', theme: 'light' }).language, 'es');
    assert.equal(context.normalizeSaveData({ ...old, language: 'en-GB', theme: 'amethyst' }).theme, 'amethyst');
    assert.equal(context.normalizeSaveData({ language: '__proto__', theme: '<script>' }).theme, 'midnight');
});

test('translations substitute values without reading inherited dictionary keys', () => {
    const context = load();
    vm.runInContext("GAME_STATE.saveData.language='pt-PT'", context);
    assert.equal(context.t('Settings'), 'Definições');
    assert.equal(context.t('{count} rooms', { count: 0 }), '0 salas');
    assert.equal(context.t('Unknown {name}', { name: 'Apple' }), 'Unknown Apple');
    assert.equal(context.t('constructor'), 'constructor');
    vm.runInContext("GAME_STATE.saveData.language='es'", context);
    assert.equal(context.t('Settings'), 'Ajustes');
    vm.runInContext("GAME_STATE.saveData.language='en'", context);
    assert.equal(context.t('Settings'), 'Settings');
});

test('Portuguese and Spanish dictionaries cover the same interface keys', () => {
    const context = load();
    assert.deepEqual(Object.keys(context.BRANDGAME_LOCALES['pt-PT']).sort(), Object.keys(context.BRANDGAME_LOCALES.es).sort());
    for (const dictionary of Object.values(context.BRANDGAME_LOCALES)) {
        for (const [source, translation] of Object.entries(dictionary)) {
            assert.ok(typeof translation === 'string' && translation.trim(), source);
            const placeholders = text => (text.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) || []).sort();
            assert.deepEqual(placeholders(source), placeholders(translation), source);
        }
    }
});

test('every built-in clue has a Portuguese and Spanish translation', () => {
    const context = load();
    const hints = vm.runInContext('Object.values(OFFLINE_CATALOG).flat().map(brand => brand.hint)', context);
    assert.equal(hints.length, 496);
    for (const language of ['pt-PT', 'es']) {
        const dictionary = context.BRANDGAME_LOCALES[language];
        for (const hint of hints) {
            assert.ok(Object.hasOwn(dictionary, hint), `${language}: ${hint}`);
            assert.notEqual(dictionary[hint], hint, `${language}: untranslated clue`);
        }
    }
});
