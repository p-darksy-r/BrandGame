// Copyright (c) 2026 p-darksy-r. BrandGame.
using System.Text.Json;
using Microsoft.Web.WebView2.Core;

namespace BrandGame.Services;

// Runs only with --smoke-test and an isolated BRANDGAME_PROFILE_ROOT.
internal static class SmokeScenario
{
    internal static async Task<bool> RunAsync(CoreWebView2 view)
    {
        await view.ExecuteScriptAsync("""
            window.__nativeSmoke = 'running';
            (async () => {
                const wait = async predicate => {
                    for (let n = 0; n < 200; n++) {
                        if (predicate()) return;
                        await new Promise(resolve => setTimeout(resolve, 25));
                    }
                    throw new Error('Timed out waiting for native game flow: ' + GAME_STATE.roundStatus);
                };
                const click = id => document.getElementById(id).click();
                await wait(() => window.__brandGameReady);
                click('btn-menu-start');
                document.querySelector('#category-cards-grid button').click();
                const playFirstLevel = async (missFirst = false) => {
                    document.querySelector('#level-buttons-grid button').click();
                    let missed;
                    for (let round = 0; round < 3; round++) {
                        await wait(() => GAME_STATE.roundStatus === 'playing');
                        const logo = document.getElementById('logo-image');
                        await wait(() => logo.complete && logo.naturalWidth > 0);
                        if (GAME_STATE.clueCost !== 0) throw new Error('Clue cost carried into another round');
                        if (round === 0) {
                            click('btn-gameplay-hint');
                            click('btn-gameplay-hint');
                            if (!document.getElementById('clue-text').textContent || GAME_STATE.clueCost !== 5)
                                throw new Error('Hint unavailable or charged more than once');
                        }
                        const incorrect = missFirst && round === 0;
                        const name = GAME_STATE.currentBrand.name;
                        if (incorrect) missed = name;
                        document.getElementById('input-guess').value = incorrect ? '0000000000' : name;
                        click('btn-guess-submit');
                        await wait(() => GAME_STATE.roundStatus === 'feedback');
                        const expected = t(incorrect ? 'INCORRECT' : 'CORRECT!');
                        if (document.getElementById('feedback-badge').textContent !== expected)
                            throw new Error('Native answer evaluation failed');
                        click('btn-feedback-next');
                    }
                    return missed;
                };
                await playFirstLevel();
                if (GAME_STATE.saveData.levelsUnlocked.tech !== 2 || GAME_STATE.saveData.globalScore <= 0 ||
                    GAME_STATE.saveData.levelResults.tech[1].medium.stars !== 3 || totalEarnedStars(GAME_STATE.saveData) !== 3)
                    throw new Error('Level progress was not awarded');
                // Exercise the real WebView2 bridge and its recovery slot using the isolated profile.
                const earned = GAME_STATE.saveData.globalScore;
                const imported = readProgressBackup(makeProgressBackup({ ...GAME_STATE.saveData, globalScore: earned + 100 }));
                await replaceProgressSave(imported);
                onSaveLoaded(imported);
                const previous = await loadPreviousProgress();
                if (!previous || previous.globalScore !== earned || totalEarnedStars(previous) !== 3)
                    throw new Error('Previous progress did not survive import');
                await replaceProgressSave(previous);
                onSaveLoaded(previous);
                click('btn-report-continue');
                const missed = await playFirstLevel(true);
                const progressAtReport = JSON.stringify(GAME_STATE.saveData);
                click('practice-missed-btn');
                const practiceInput = document.getElementById('practice-input');
                await wait(() => practiceInput.offsetWidth > 0 && !practiceInput.disabled);
                practiceInput.value = missed;
                click('practice-submit-btn');
                click('practice-next-btn');
                await wait(() => document.getElementById('practice-complete').offsetWidth > 0);
                click('practice-back-btn');
                if (!document.getElementById('screen-report').offsetWidth ||
                    JSON.stringify(GAME_STATE.saveData) !== progressAtReport)
                    throw new Error('Practice changed the original level result or progress');
                window.__nativeSmoke = 'passed';
            })().catch(error => { window.__nativeSmoke = error.message; });
            """);
        for (int attempt = 0; attempt < 150; attempt++)
        {
            string result = await view.ExecuteScriptAsync("window.__nativeSmoke");
            if (result == "\"passed\"")
            {
                if (Environment.GetEnvironmentVariable("BRANDGAME_SMOKE_CHECK_UPDATES") == "1")
                    await CheckPublishedVersionAsync(view);
                // The web message write is asynchronous: wait for the actual persisted save.
                for (int saveAttempt = 0; saveAttempt < 50; saveAttempt++)
                {
                    string json = await new SaveStore(AppPaths.SaveFile).LoadAsync();
                    using var save = JsonDocument.Parse(json);
                    if (save.RootElement.ValueKind == JsonValueKind.Object &&
                        save.RootElement.TryGetProperty("levelsUnlocked", out var levels) &&
                        levels.GetProperty("tech").GetInt32() == 2 &&
                        save.RootElement.GetProperty("globalScore").GetInt32() > 0 &&
                        save.RootElement.GetProperty("levelResults").GetProperty("tech").GetProperty("1").GetProperty("medium").GetProperty("stars").GetInt32() == 3) return true;
                    await Task.Delay(100);
                }
                throw new InvalidOperationException("Native save was not persisted.");
            }
            if (result != "\"running\"") throw new InvalidOperationException(result);
            await Task.Delay(100);
        }
        return false;
    }

    // The published-release job opts into network access after installing the verified ZIP.
    private static async Task CheckPublishedVersionAsync(CoreWebView2 view)
    {
        string started = await view.ExecuteScriptAsync("""
            (() => {
                for (const id of ['btn-report-continue', 'btn-levels-back', 'btn-categories-back', 'btn-menu-settings']) {
                    document.getElementById(id).click();
                }
                const button = document.getElementById('btn-update-check');
                if (!button.offsetWidth || button.disabled || document.getElementById('update-available-version').textContent.trim()) return false;
                button.click();
                return true;
            })()
            """);
        if (started != "true") throw new InvalidOperationException("Cannot start the update check from Settings.");
        for (int attempt = 0; attempt < 120; attempt++)
        {
            string finished = await view.ExecuteScriptAsync("!document.getElementById('btn-update-check').disabled");
            if (finished == "true")
            {
                string matches = await view.ExecuteScriptAsync("document.getElementById('update-available-version').textContent.trim() === GAME_VERSION");
                if (matches == "true") return;
                throw new InvalidOperationException("Settings did not show the installed release as the available version.");
            }
            await Task.Delay(200);
        }
        throw new TimeoutException("The published update check did not finish.");
    }
}
