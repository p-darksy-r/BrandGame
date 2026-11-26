// Copyright (c) 2026 p-darksy-r. BrandGame.
const { test, expect } = require('@playwright/test');

async function settings(page) {
    await page.goto('http://127.0.0.1:8766');
    await page.waitForFunction(() => window.__brandGameReady);
    await page.locator('#btn-menu-settings').click();
}

async function seed(page, points) {
    await page.evaluate(score => {
        GAME_STATE.saveData.globalScore = score;
        sendNativeRequest({ Action: 'write_save', Data: GAME_STATE.saveData });
    }, points);
}

test('a downloaded backup can be previewed on another profile, imported and undone after restart', async ({ page, browser }, testInfo) => {
    await settings(page);
    await seed(page, 150);
    await page.evaluate(() => {
        const save = GAME_STATE.saveData;
        save.customLevels.push({ id: 'player-room', name: 'Minha sala', brands: [{ name: 'Apple', slug: 'apple', hint: 'Pista minha' }] });
        save.levelsUnlocked.tech = 2;
        recordLevelResult(save, 'tech', 1, 'medium', 3, 3, true, 150, 9876);
        sendNativeRequest({ Action: 'write_save', Data: save });
    });
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#btn-progress-export').click();
    const file = testInfo.outputPath('portable-progress.json');
    await (await downloadEvent).saveAs(file);

    const other = await browser.newContext();
    try {
        const dest = await other.newPage();
        await settings(dest);
        await seed(dest, 7);
        const score = () => dest.evaluate(() => GAME_STATE.saveData.globalScore);
        const choose = () => dest.locator('#progress-import-file').setInputFiles(file);
        await choose();
        await expect(dest.locator('#progress-preview-score')).toContainText('150');
        await expect(dest.locator('#progress-preview-stars')).toContainText('3');
        await expect(dest.locator('#progress-preview-rooms')).toContainText('1');
        expect(await score()).toBe(7);
        await dest.locator('#btn-progress-cancel').click();
        expect(await score()).toBe(7);
        await choose();
        await dest.locator('#btn-progress-confirm').click();
        await expect.poll(score).toBe(150);
        await settings(dest);
        expect(await dest.evaluate(() => GAME_STATE.saveData.customLevels[0].brands[0].hint)).toBe('Pista minha');
        await dest.locator('#btn-progress-restore').click();
        await expect(dest.locator('#progress-preview-score')).toContainText('7');
        await dest.locator('#btn-progress-confirm').click();
        await expect.poll(score).toBe(7);
        await settings(dest);
        expect(await score()).toBe(7);
        expect(await dest.evaluate(() => GAME_STATE.saveData.customLevels.length)).toBe(0);
        await dest.locator('#btn-settings-back').click();
        dest.once('dialog', dialog => dialog.accept());
        await dest.locator('#btn-menu-reset').click();
        await expect.poll(score).toBe(0);
        await settings(dest);
        expect(await dest.evaluate(() => loadPreviousProgress())).toBe(null);
        await expect(dest.locator('#btn-progress-restore')).toBeHidden();
    } finally { await other.close(); }
});

test('an unrelated JSON file cannot replace the current save', async ({ page }) => {
    await settings(page);
    await seed(page, 42);
    await page.locator('#progress-import-file').setInputFiles({name: 'other.json', mimeType: 'application/json', buffer: Buffer.from('{"score":99}')});
    await expect(page.locator('#progress-backup-status')).not.toHaveText('');
    await expect(page.locator('#progress-backup-dialog')).not.toBeVisible();
    await settings(page);
    expect(await page.evaluate(() => GAME_STATE.saveData.globalScore)).toBe(42);
});

test('native 3.5 save.json can recover a campaign directly in the browser', async ({ page }) => {
    await settings(page);
    const old = await page.evaluate(() => {
        const save = createDefaultSaveData();
        save.gameVersion = '3.5.0';
        save.globalScore = 199;
        save.levelsUnlocked.food = 9;
        return JSON.stringify(save);
    });
    await page.locator('#progress-import-file').setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(old) });
    await expect(page.locator('#progress-preview-score')).toHaveText('199');
    await page.locator('#btn-progress-confirm').click();
    await expect.poll(() => page.evaluate(() => GAME_STATE.saveData.levelsUnlocked.food)).toBe(9);
    await settings(page);
    expect(await page.evaluate(() => GAME_STATE.saveData.globalScore)).toBe(199);
});
