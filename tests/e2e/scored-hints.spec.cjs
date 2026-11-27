// Copyright (c) 2026 p-darksy-r. BrandGame.
const { test, expect } = require('@playwright/test');

async function enterCustomRoom(page, brands) {
    await page.addInitScript(rooms => {
        localStorage.setItem('brandgame_savedata', JSON.stringify({
            language: 'en', reducedMotion: true, customLevels: rooms
        }));
    }, [{ id: 'hint-test', name: 'Clue room', timer: 120, brands }]);
    await page.goto('http://127.0.0.1:8766');
    await page.waitForFunction(() => window.__brandGameReady);
    await page.locator('#btn-menu-start').click();
    await page.locator('[data-category="custom"]').click();
    await page.locator('#level-buttons-grid button').click();
    await expect(page.locator('#input-guess')).toBeEnabled();
}

test('only delivered clues cost points, with a fresh allowance on the next round', async ({ page }) => {
    // Freeze game time so both correct responses start from exactly 50 points.
    const start = new Date('2025-01-01T00:00:00Z');
    await page.clock.install({ time: start });
    await page.clock.pauseAt(new Date(start.getTime() + 60_000));
    await enterCustomRoom(page, [
        { name: 'É!', slug: 'apple' },
        { name: 'YouTube', slug: 'youtube', hint: 'A video site.' }
    ]);
    const hint = page.locator('#btn-gameplay-hint');
    const letter = page.locator('#btn-gameplay-reveal-char');
    const announcement = page.locator('#clue-announcement');
    const input = page.locator('#input-guess');

    await expect(hint).toHaveAccessibleName('No hint available');
    await expect(hint).toBeDisabled();
    await hint.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#clue-text')).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(letter).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#revealed-letters-hud')).toHaveText('É !');
    await expect(announcement).toHaveAttribute('role', 'status');
    await expect(announcement).toHaveText(/1.*1.*É/);
    await expect(letter).toBeFocused();
    await expect(letter).toHaveAccessibleName('All letters revealed');
    await expect(letter).toBeDisabled();
    await page.keyboard.press('Enter');
    await input.fill('e');
    await input.press('Enter');
    await expect(page.locator('#feedback-score')).toHaveText('+40');
    await page.locator('#btn-feedback-next').click();

    await expect(input).toBeEnabled();
    await expect(announcement).toBeEmpty();
    await expect(letter).toBeEnabled();
    await expect(hint).toBeEnabled();
    await expect(hint).toHaveAccessibleName(/5 pts/);
    await hint.focus();
    await page.keyboard.press('Enter');
    await expect(hint).toHaveAccessibleName('Hint revealed');
    await expect(hint).toBeDisabled();
    await expect(hint).toBeFocused();
    await expect(page.locator('#clue-text')).toHaveText('A video site.');
    await expect(announcement).toContainText('A video site.');
    await page.keyboard.press('Enter');
    await input.fill('YouTube');
    await input.press('Enter');
    await expect(page.locator('#feedback-score')).toHaveText('+45');
    await page.locator('#btn-feedback-next').click();
    await expect(page.locator('#report-score')).toHaveText('85');
});

test('long custom clues and answers remain readable on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const name = 'Marathon'.repeat(10);
    const hint = 'UnbrokenCustomClue'.repeat(14);
    await enterCustomRoom(page, [{ name, slug: 'apple', hint }]);
    await page.locator('#btn-gameplay-hint').click();
    await expect(page.locator('#clue-text')).toHaveText(hint);

    // Check the actual text bounds as well as the page: the body clips horizontal overflow.
    async function expectTextToFit(id) {
        const bounds = await page.locator(id).evaluate(element => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const rect = range.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: document.documentElement.clientWidth };
        });
        expect(bounds.left).toBeGreaterThanOrEqual(-1);
        expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
    }
    await expectTextToFit('#clue-text');
    await expectTextToFit('#revealed-letters-hud');
    await page.locator('#input-guess').fill(name);
    await page.locator('#input-guess').press('Enter');
    await expect(page.locator('#feedback-answer')).toHaveText(name);
    await expectTextToFit('#feedback-answer');
});
