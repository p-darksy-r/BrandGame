// Copyright (c) 2026 p-darksy-r.
const { test, expect } = require('@playwright/test');

const wrongAnswer = 'zzzzzzzzzzzzzzzz';

async function startLevel(page, category, customLevels = [], language = 'en') {
    await page.addInitScript(options => {
        localStorage.setItem('brandgame_savedata', JSON.stringify({
            ...options, reducedMotion: true
        }));
    }, { customLevels, language });
    await page.goto('http://127.0.0.1:8766');
    await page.waitForFunction(() => window.__brandGameReady);
    await page.locator('#btn-menu-start').click();
    await page.locator(`[data-category="${category}"]`).click();
    await page.locator('#level-buttons-grid button').first().click();
}

async function playRound(page, outcome) {
    await expect(page.locator('#input-guess')).toBeEnabled();
    const brand = await page.evaluate(() => ({ name: GAME_STATE.currentBrand.name, slug: GAME_STATE.currentBrand.slug }));
    if (outcome === 'timeout') {
        await page.clock.fastForward(60_000);
        await expect(page.locator('#feedback-badge')).toHaveText('TIME OUT');
    } else {
        const correct = outcome === 'correct';
        await page.locator('#input-guess').fill(correct ? brand.name : wrongAnswer);
        await page.locator('#btn-guess-submit').click();
        const badge = await page.evaluate(key => t(key), correct ? 'CORRECT!' : 'INCORRECT');
        await expect(page.locator('#feedback-badge')).toHaveText(badge);
    }
    await page.locator('#btn-feedback-next').click();
    return brand;
}

async function reportSnapshot(page) {
    return page.evaluate(() => ({
        save: GAME_STATE.saveData,
        persisted: localStorage.getItem('brandgame_savedata'),
        report: ['report-correct-count', 'report-stars', 'report-score', 'report-cat-high']
            .map(id => document.getElementById(id).textContent)
    }));
}

async function expectPracticeBrand(page, brand) {
    await expect(page.locator('#practice-logo')).toBeVisible();
    await expect(page.locator('#practice-logo')).toHaveAttribute('src', new RegExp('/' + brand.slug + '\\.svg$'));
    await expect(page.locator('#practice-input')).toBeEnabled();
}

async function practiceAnswer(page, answer) {
    await page.locator('#practice-input').fill(answer);
    await page.locator('#practice-input').press('Enter');
    await expect(page.locator('#practice-feedback')).toBeVisible();
    await page.locator('#practice-next-btn').click();
}

test('a failed campaign level trains wrong and timed-out brands without a deadline or save writes', async ({ page }) => {
    await page.clock.install();
    await startLevel(page, 'tech');
    const wrong = await playRound(page, 'wrong');
    await playRound(page, 'correct');
    const timeout = await playRound(page, 'timeout');
    await expect(page.locator('#screen-report h2')).toHaveText('LEVEL FAILED');
    const original = await reportSnapshot(page);
    await page.evaluate(() => {
        const send = window.sendNativeRequest;
        window.practiceSaveWrites = 0;
        window.sendNativeRequest = payload => {
            if (payload.Action === 'write_save') window.practiceSaveWrites++;
            return send(payload);
        };
    });

    await page.locator('#practice-missed-btn').click();
    await expectPracticeBrand(page, wrong);
    await page.clock.fastForward(10 * 60_000);
    await expectPracticeBrand(page, wrong);
    await expect(page.locator('#timer-track')).toBeHidden();
    await expect(page.locator('#practice-next-btn')).toBeHidden();

    await practiceAnswer(page, wrongAnswer);
    await expectPracticeBrand(page, timeout);
    await practiceAnswer(page, timeout.name);
    await expectPracticeBrand(page, wrong);
    await practiceAnswer(page, wrong.name);
    await expect(page.locator('#practice-complete')).toBeVisible();
    await page.locator('#practice-back-btn').click();
    await expect(page.locator('#screen-report')).toBeVisible();
    expect(await reportSnapshot(page)).toEqual(original);
    expect(await page.evaluate(() => window.practiceSaveWrites)).toBe(0);

    await page.locator('#btn-report-continue').click();
    await page.locator('#level-buttons-grid button').first().click();
    for (let i = 0; i < 3; i++) await playRound(page, 'correct');
    await expect(page.locator('#report-stars')).toHaveText('★★★');
    await expect(page.locator('#practice-missed-btn')).toBeHidden();
});

const apple = { name: 'Orchard', slug: 'apple', hint: 'Settings' };
const otherBrands = [
    { name: 'Zara', slug: 'zara' },
    { name: 'YouTube', slug: 'youtube' },
    { name: 'GitHub', slug: 'github' }
];

test('a won custom room keeps its author’s answer and clue, score and record after leaving practice early', async ({ page }) => {
    await startLevel(page, 'custom', [{ id: 'custom-win', name: 'Room aliases', brands: [apple, ...otherBrands] }], 'pt-PT');
    await playRound(page, 'wrong');
    for (let i = 0; i < otherBrands.length; i++) await playRound(page, 'correct');
    await expect(page.locator('#screen-report h2')).toHaveText('NÍVEL CONCLUÍDO!');
    const original = await reportSnapshot(page);
    expect(original.save.customScore).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Treinar as que falhei' }).click();
    await expectPracticeBrand(page, apple);
    await page.locator('#practice-hint-btn').click();
    await expect(page.locator('#practice-hint')).toHaveText(apple.hint);
    await page.keyboard.press('Escape');
    await expect(page.locator('#screen-report')).toBeVisible();
    expect(await reportSnapshot(page)).toEqual(original);

    await page.locator('#practice-missed-btn').click();
    await expectPracticeBrand(page, apple);
    await practiceAnswer(page, apple.name.toUpperCase());
    await expect(page.locator('#practice-complete')).toBeVisible();
    await page.locator('#practice-back-btn').click();
    expect(await reportSnapshot(page)).toEqual(original);
});

test('a room lost on the third life trains each missed brand once and excludes unplayed rounds', async ({ page }) => {
    await startLevel(page, 'custom', [{
        id: 'custom-repeats', name: 'Repeated logos', brands: [apple, apple, ...otherBrands]
    }]);
    for (let i = 0; i < 3; i++) await playRound(page, 'wrong');
    await expect(page.locator('#report-correct-count')).toHaveText('0 / 5');
    await page.locator('#practice-missed-btn').click();
    await expectPracticeBrand(page, apple);
    await practiceAnswer(page, apple.name);
    await expectPracticeBrand(page, otherBrands[0]);
    await practiceAnswer(page, otherBrands[0].name);
    await expect(page.locator('#practice-complete')).toBeVisible();
});
