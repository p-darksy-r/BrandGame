// Copyright (c) 2026 p-darksy-r.
const { test, expect } = require('@playwright/test');
const url = 'http://127.0.0.1:8766/';

test.beforeEach(async ({ context }) => {
    await context.route(/^https?:\/\//, route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
});

async function open(page) {
    await page.goto(url);
    await page.waitForFunction(() => window.__brandGameReady);
}

test('languages and appearance persist without altering scores or authored room names', async ({ page }) => {
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    await expect(page.locator('#btn-menu-start')).toHaveText('Vamos jogar');
    await expect(page.locator('.brand-lockup h1')).toHaveText('BrandGame');
    await page.evaluate(() => {
        GAME_STATE.saveData.globalScore = 1234;
        GAME_STATE.saveData.customLevels.push({ id: 'localization-room', name: 'Fashion', brands: [{ name: 'Apple', slug: 'apple', hint: 'Settings' }] });
        sendNativeRequest({ Action: 'write_save', Data: GAME_STATE.saveData });
    });
    await page.locator('#btn-menu-settings').click();
    await page.locator('#settings-theme').selectOption('forest');
    await page.locator('#settings-language').selectOption('es');
    await expect(page.locator('#settings-title')).toHaveText('Ajustes');
    await expect(page.locator('.brand-lockup h1')).toHaveText('BrandGame');
    await page.reload();
    await page.waitForFunction(() => window.__brandGameReady);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'forest');
    await expect(page.locator('#global-score')).toHaveText('1234');
    await page.locator('#btn-menu-start').click();
    await page.locator('#category-cards-grid button').last().click();
    await expect(page.locator('.room-name')).toHaveText('Fashion');
    await page.locator('.room-name').click();
    await page.waitForFunction(() => GAME_STATE.roundStatus === 'playing');
    await page.locator('#btn-gameplay-hint').click();
    await expect(page.locator('#clue-text')).toHaveText('Settings');
    await page.locator('#btn-gameplay-quit').click();
    await page.locator('#btn-categories-back').click();
    await page.locator('#btn-menu-settings').click();
    await page.locator('#settings-language').selectOption('en');
    await expect(page.locator('#settings-title')).toHaveText('Settings');
    await page.locator('#settings-language').selectOption('pt-PT');
    await expect(page.locator('#settings-title')).toHaveText('Definições');
    expect(await page.evaluate(() => GAME_STATE.saveData.globalScore)).toBe(1234);
});

test('help and game overlays keep keyboard focus usable', async ({ page }) => {
    await open(page);
    await page.locator('#btn-menu-help').click();
    await expect(page.locator('#help-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#help-dialog')).not.toBeVisible();
    await expect(page.locator('#btn-menu-help')).toBeFocused();
    await page.locator('#btn-menu-start').click();
    await page.locator('#category-cards-grid button').first().click();
    await page.locator('#level-buttons-grid button').first().click();
    await page.waitForFunction(() => GAME_STATE.roundStatus === 'playing');
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('#btn-resume-round')).toBeFocused();
    expect(await page.locator('#gameplay-content').evaluate(element => element.inert)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.locator('#input-guess')).toBeFocused();
    await page.locator('#input-guess').fill(await page.evaluate(() => GAME_STATE.currentBrand.name));
    await page.keyboard.press('Enter');
    await expect(page.locator('#btn-feedback-next')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#btn-feedback-next')).toBeFocused();
});

for (const language of ['pt-PT', 'es']) {
    test(`built-in clues are translated in ${language}`, async ({ page }) => {
        await open(page);
        await page.locator('#btn-menu-settings').click();
        await page.locator('#settings-language').selectOption(language);
        await page.locator('#btn-settings-back').click();
        await page.locator('#btn-menu-start').click();
        await page.locator('#category-cards-grid button').first().click();
        await page.locator('#level-buttons-grid button').first().click();
        await page.waitForFunction(() => GAME_STATE.roundStatus === 'playing');
        const clue = await page.evaluate(() => ({ source: GAME_STATE.currentBrand.hint, translated: t(GAME_STATE.currentBrand.hint) }));
        expect(clue.translated).not.toBe(clue.source);
        await page.locator('#btn-gameplay-hint').click();
        await expect(page.locator('#clue-text')).toHaveText(clue.translated);
    });
}

for (const viewport of [{ width: 375, height: 812 }, { width: 800, height: 600 }, { width: 1600, height: 1000 }]) {
    test(`screens fit a ${viewport.width}px viewport without horizontal overflow`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await open(page);
        async function fits() {
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        }
        await fits();
        await page.locator('#btn-menu-settings').click();
        await page.locator('#settings-theme').selectOption('light');
        await fits();
        await page.locator('#btn-settings-back').click();
        await page.locator('#btn-menu-start').click();
        await fits();
        await page.locator('#category-cards-grid button').first().click();
        await fits();
        await page.locator('#level-buttons-grid button').first().click();
        await page.waitForFunction(() => GAME_STATE.roundStatus === 'playing');
        await fits();
        expect(await page.locator('#logo-image').evaluate(element => getComputedStyle(element).filter)).not.toContain('invert');
        await page.locator('#btn-gameplay-quit').click();
        await page.locator('#btn-levels-back').click();
        await page.locator('#btn-trigger-creator').click();
        await fits();
        if (viewport.width === 375) await page.screenshot({ path: 'artifacts/qa/modern-mobile-creator.png', fullPage: true });
    });
}

test('all themes retain readable primary actions and render local vector icons', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page);
    for (const theme of ['midnight', 'light', 'forest', 'amethyst']) {
        await page.locator('#btn-menu-settings').click();
        await page.locator('#settings-theme').selectOption(theme);
        await page.locator('#btn-settings-back').click();
        const contrast = await page.locator('#btn-menu-start').evaluate(element => {
            const style = getComputedStyle(element);
            function luminance(rgb) {
                const values = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => {
                    channel /= 255;
                    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
                });
                return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
            }
            const fg = luminance(style.color), bg = luminance(style.backgroundColor);
            return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
        });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
        expect(await page.locator('#screen-main-menu button').evaluateAll(buttons => buttons.every(button => button.querySelector('svg[aria-hidden=true]') && button.textContent.trim()))).toBe(true);
        await page.screenshot({ path: `artifacts/qa/modern-menu-${theme}.png`, fullPage: true });
    }
});
