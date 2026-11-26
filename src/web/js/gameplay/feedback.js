/* BrandGame - https://github.com/p-darksy-r/BrandGame - Copyright (c) 2026 p-darksy-r */

function submitUserGuess() {
    if (GAME_STATE.roundStatus !== "playing") return;
    const inputField = document.getElementById("input-guess");
    const guess = inputField ? inputField.value.trim() : "";
    if (!guess) return;
    updateRoundClock();
    if (GAME_STATE.roundStatus !== "playing") return;
    GAME_STATE.roundStatus = "pending";
    clearInterval(GAME_STATE.timerInterval);

    const result = calculateGuessResult(guess, GAME_STATE.currentBrand.name, GAME_STATE.elapsedTime);

    if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
        window.chrome.webview.postMessage({
            UserGuess: guess,
            CorrectAnswer: GAME_STATE.currentBrand.name,
            TimeElapsed: Math.round(GAME_STATE.elapsedTime)
        });
    } else {
        onMatchResult(result);
    }
}

function onMatchResult(result) {
    if (GAME_STATE.roundStatus !== "pending") return;
    GAME_STATE.roundStatus = "feedback";
    GAME_STATE.currentLevelElapsedMs += Math.round(Math.min(GAME_STATE.elapsedTime, GAME_STATE.timeLimit) * 1000);
    const badge = document.getElementById("feedback-badge");
    const overlay = document.getElementById("feedback-overlay");
    const textAns = document.getElementById("feedback-answer");
    const statsCard = document.getElementById("feedback-stats-card");

    if (overlay) overlay.classList.remove("hidden");
    if (textAns) textAns.textContent = GAME_STATE.currentBrand.name;

    const img = document.getElementById("logo-image");
    if (img) img.style.filter = "var(--logo-filter)";

    const resultIcon = document.getElementById('feedback-icon');
    if (resultIcon) resultIcon.innerHTML = uiIcon(result.correct ? 'check' : 'close');
    if (result.correct) {
        sfx.playCoin();
        if (badge) {
            badge.textContent = t("CORRECT!");
            badge.className = "feedback-success";
        }
        const matchEl = document.getElementById("feedback-match");
        if (matchEl) matchEl.textContent = `${Math.round(result.match)}%`;

        const finalScore = Math.max(result.score - GAME_STATE.clueCost, 5);
        const scoreEl = document.getElementById("feedback-score");
        if (scoreEl) scoreEl.textContent = `+${finalScore}`;
        if (statsCard) statsCard.classList.remove("hidden");

        GAME_STATE.currentLevelScore += finalScore;
        GAME_STATE.currentLevelCorrectCount++;
    } else {
        sfx.playWrong();
        triggerVibration();
        if (badge) {
            badge.textContent = t("INCORRECT");
            badge.className = "feedback-error";
        }
        if (statsCard) statsCard.classList.add("hidden");
        loseRoundLife();
    }

    const nextBtn = document.getElementById("btn-feedback-next");
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (GAME_STATE.roundStatus !== "feedback") return;
            if (overlay) overlay.classList.add("hidden");
            if (GAME_STATE.lives <= 0) triggerLevelEnd(false);
            else advanceTurn();
        };
    }
}
window.onMatchResult = onMatchResult;

function loseRoundLife() {
    const brand = GAME_STATE.currentBrand;
    const alreadyMissed = GAME_STATE.missedBrands.some(missed =>
        missed.slug === brand.slug && missed.name === brand.name);
    if (!alreadyMissed) GAME_STATE.missedBrands.push(brand);
    GAME_STATE.lives--;
}

function processLossOfLife() {
    if (GAME_STATE.roundStatus !== "playing") return;
    GAME_STATE.roundStatus = "feedback";
    GAME_STATE.currentLevelElapsedMs += Math.round(Math.min(GAME_STATE.elapsedTime, GAME_STATE.timeLimit) * 1000);
    sfx.playWrong();
    triggerVibration();
    loseRoundLife();

    const badge = document.getElementById("feedback-badge");
    const overlay = document.getElementById("feedback-overlay");
    const textAns = document.getElementById("feedback-answer");
    const statsCard = document.getElementById("feedback-stats-card");

    if (overlay) overlay.classList.remove("hidden");
    if (badge) {
        badge.textContent = t("TIME OUT");
        const resultIcon = document.getElementById('feedback-icon');
        if (resultIcon) resultIcon.innerHTML = uiIcon('clock');
        badge.className = "feedback-error";
    }
    if (textAns) textAns.textContent = GAME_STATE.currentBrand.name;
    if (statsCard) statsCard.classList.add("hidden");

    const nextBtn = document.getElementById("btn-feedback-next");
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (GAME_STATE.roundStatus !== "feedback") return;
            if (overlay) overlay.classList.add("hidden");
            if (GAME_STATE.lives <= 0) triggerLevelEnd(false);
            else advanceTurn();
        };
    }
}
