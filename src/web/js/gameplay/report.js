/* BrandGame - https://github.com/p-darksy-r/BrandGame - Copyright (c) 2026 p-darksy-r */

function triggerLevelEnd(completed) {
    if (GAME_STATE.levelRecorded) return;
    GAME_STATE.levelRecorded = true;
    clearInterval(GAME_STATE.timerInterval);
    GAME_STATE.roundStatus = "idle";
    const starsEl = document.getElementById("report-stars");
    const correctCountEl = document.getElementById("report-correct-count");
    const scoreEl = document.getElementById("report-score");
    const highEl = document.getElementById("report-cat-high");

    const totalBrands = GAME_STATE.activeBrands.length;
    if (correctCountEl) correctCountEl.textContent = `${GAME_STATE.currentLevelCorrectCount} / ${totalBrands}`;
    if (scoreEl) scoreEl.textContent = GAME_STATE.currentLevelScore;

    const isCustom = GAME_STATE.currentCategory === "custom";
    const difficulty = isCustom ? GAME_STATE.saveData.customLevels[GAME_STATE.currentLevel]?.difficulty : GAME_STATE.saveData.difficulty;
    const recorded = recordLevelResult(GAME_STATE.saveData, GAME_STATE.currentCategory, GAME_STATE.currentLevel,
        difficulty, GAME_STATE.currentLevelCorrectCount, totalBrands, completed, GAME_STATE.currentLevelScore, GAME_STATE.currentLevelElapsedMs);

    const reportHeader = document.querySelector("#screen-report h2");

    if (recorded.stars > 0) {
        sfx.playFanfare();
        if (reportHeader) {
            reportHeader.textContent = t("LEVEL CLEAR!");
            reportHeader.className = "feedback-success";
        }

        const stars = starsMarkup(recorded.stars);

        if (starsEl) {
            starsEl.innerHTML = stars;
            starsEl.className = "result-stars";
        }

        if (isCustom) {
            GAME_STATE.saveData.customScore = (GAME_STATE.saveData.customScore || 0) + GAME_STATE.currentLevelScore;
        } else {
            const currentCatUnlocked = GAME_STATE.saveData.levelsUnlocked[GAME_STATE.currentCategory] || 1;
            if (GAME_STATE.currentLevel === currentCatUnlocked && currentCatUnlocked <= 100) {
                GAME_STATE.saveData.levelsUnlocked[GAME_STATE.currentCategory] = currentCatUnlocked + 1;
            }
            GAME_STATE.saveData.categoryScores[GAME_STATE.currentCategory] += GAME_STATE.currentLevelScore;
            GAME_STATE.saveData.globalScore += GAME_STATE.currentLevelScore;
        }
    } else {
        sfx.playWrong();
        triggerVibration();
        if (reportHeader) {
            reportHeader.textContent = t("LEVEL FAILED");
            reportHeader.className = "feedback-error";
        }
        if (starsEl) {
            starsEl.innerHTML = starsMarkup(0);
            starsEl.className = "result-stars";
        }
    }

    if (highEl) highEl.textContent = t('{score} pts · {time}', { score: recorded.best.bestScore, time: formatBestTime(recorded.best.bestTimeMs) });

    sendNativeRequest({ Action: "write_save", Data: GAME_STATE.saveData });
    updateGlobalStatsHUD();
    showScreen("screen-report");
}
