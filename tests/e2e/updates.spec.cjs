// Copyright (c) 2026 p-darksy-r. BrandGame.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const releasesUrl = 'https://github.com/p-darksy-r/BrandGame/releases';
const fileUrl = pathToFileURL(path.resolve(__dirname, '../../src/web/index.html')).href;

async function openSettings(page) {
    await page.goto(fileUrl);
    await page.waitForFunction(() => window.__brandGameReady);
    await page.locator('#btn-menu-settings').click();
}

test('offline browser settings show the installed version and official downloads without connecting', async ({ page, context }) => {
    const external = [];
    page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
    await context.setOffline(true);
    await page.setViewportSize({ width: 320, height: 700 });
    await openSettings(page);
    const version = await page.evaluate(() => GAME_VERSION);
    await expect(page.locator('#settings-installed-version')).toHaveText(version);
    await expect(page.locator('#update-releases-link')).toHaveAttribute('href', releasesUrl);
    await expect(page.locator('#update-releases-link')).toHaveAttribute('target', '_blank');
    await expect(page.locator('#btn-update-check')).toBeHidden();
    await expect(page.locator('#update-browser-info')).toBeVisible();
    await expect(page.locator('#update-available-version')).toBeHidden();
    await expect(page.locator('#updates-title')).toHaveText('Atualizações');
    await page.locator('#settings-language').selectOption('es');
    await expect(page.locator('#update-releases-link')).toHaveText('Versiones oficiales en GitHub');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(external).toEqual([]);
});

test('the Windows check runs on request, verifies numeric versions, and recovers from errors', async ({ page, context }) => {
    await context.setOffline(true);
    await page.addInitScript(() => {
        const host = new EventTarget();
        window.updateRequests = [];
        host.postMessage = m => {
            if (m.Action === 'load_save') queueMicrotask(() => onSaveLoaded(null));
            if (m.Action === 'previous_progress') queueMicrotask(() => onProgressFileResult({ id: m.RequestId, ok: true, value: null }));
            if (m.Action === 'check_updates') window.updateRequests.push(m);
        };
        Object.defineProperty(window.chrome, 'webview', { configurable: true, value: host });
    });
    await openSettings(page);
    const installed = await page.evaluate(() => GAME_VERSION);
    await page.locator('#settings-language').selectOption('en');
    const button = page.locator('#btn-update-check');
    const result = page.locator('#update-status');
    await expect(button).toBeVisible();
    await expect(page.locator('#update-browser-info')).toBeHidden();
    expect(await page.evaluate(() => window.updateRequests.length)).toBe(0);

    const [major, minor] = installed.split('.').map(Number);
    const newer = [major, minor + 10, 0].join('.');
    const outcomes = [
        [true, newer, 'A new version is available in the official releases.'],
        [true, installed, 'Your game is up to date.'],
        [true, '0.0.0', 'Your installed version is newer than the published release.'],
        [true, null, 'No signed release is available on this channel.'],
        [false, null, 'Could not verify the release. Check your connection and try again.'],
        [true, installed, 'Your game is up to date.']
    ];
    for (const [index, [ok, version, expected]] of outcomes.entries()) {
        await button.click();
        await expect(button).toBeDisabled();
        await expect(button).toHaveAttribute('aria-busy', 'true');
        await button.evaluate(b => b.click());
        expect(await page.evaluate(() => window.updateRequests.length)).toBe(index + 1);
        await expect(result).toHaveText('Checking the signed release on GitHub…');
        await page.evaluate(({ ok, version }) => {
            const { RequestId: id } = window.updateRequests.at(-1);
            window.onProgressFileResult({ id, ok, value: { version } });
        }, { ok, version });
        await expect(button).toBeEnabled();
        await expect(result).toHaveText(expected);
        if (ok && version) await expect(page.locator('#update-available-version')).toHaveText(version);
        else await expect(page.locator('#update-available-row')).toBeHidden();
    }
    await page.locator('#settings-language').selectOption('pt-PT');
    await expect(result).toHaveText('O teu jogo está atualizado.');
    await page.evaluate(() => window.chrome.webview.dispatchEvent(new MessageEvent('message', { data: 'release-link-error' })));
    await expect(page.locator('#update-link-error')).toBeFocused();
    await expect(page.locator('#update-link-error code')).toHaveText(releasesUrl);
});
