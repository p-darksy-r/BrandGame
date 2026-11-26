// Copyright (c) 2026 p-darksy-r. BrandGame.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('failed browser import preserves the active save and last restore point across ordinary writes', async () => {
    const entries = new Map();
    const primary = 'brandgame_savedata';
    let failCommit = false;
    const storage = {
        getItem: key => entries.get(key) ?? null,
        setItem(key, value) {
            if (key === primary && failCommit) throw Error('Quota exceeded');
            entries.set(key, value);
        },
        removeItem: key => entries.delete(key)
    };
    const ctx = vm.createContext({ window: { localStorage: storage }, console });
    for (const part of ['core/version', 'core/results', 'core/state', 'platform/storage', 'platform/progress-files']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/web/js', part + '.js'), 'utf8'), ctx);
    }
    vm.runInContext('GAME_STATE.saveData.globalScore = 12', ctx);
    await ctx.replaceProgressSave({ globalScore: 20 });
    assert.equal((await ctx.loadPreviousProgress()).globalScore, 12);
    ctx.sendNativeRequest({ Action: 'write_save', Data: { globalScore: 34 } });
    failCommit = true;
    await assert.rejects(ctx.replaceProgressSave({ globalScore: 56 }), /Quota/);
    assert.equal(JSON.parse(entries.get(primary)).globalScore, 34);
    assert.equal((await ctx.loadPreviousProgress()).globalScore, 12);
    await assert.rejects(ctx.resetProgressSave({ globalScore: 0 }), /Quota/);
    assert.equal((await ctx.loadPreviousProgress()).globalScore, 12);
    failCommit = false;
    await ctx.replaceProgressSave(await ctx.loadPreviousProgress());
    assert.equal(JSON.parse(entries.get(primary)).globalScore, 12);
    assert.equal((await ctx.loadPreviousProgress()).globalScore, 34);
    await ctx.resetProgressSave({ globalScore: 0 });
    assert.equal(await ctx.loadPreviousProgress(), null);
    assert.deepEqual([...entries.keys()], [primary]);
});
