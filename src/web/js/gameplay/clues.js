/* BrandGame - https://github.com/p-darksy-r/BrandGame - Copyright (c) 2026 p-darksy-r */

function buyLetterClue() {
    if (GAME_STATE.roundStatus !== "playing") return;
    const name = cleanStringForMatch(GAME_STATE.currentBrand.name);
    if (GAME_STATE.revealedIndices.length >= name.length) return;

    const possible = [];
    for (let i = 0; i < name.length; i++) {
        if (!GAME_STATE.revealedIndices.includes(i)) possible.push(i);
    }

    if (possible.length > 0) {
        const rand = possible[Math.floor(Math.random() * possible.length)];
        GAME_STATE.revealedIndices.push(rand);
        renderRevealedLetters();
        GAME_STATE.clueCost += 10;
    }
}

function renderRevealedLetters() {
    const brandName = GAME_STATE.currentBrand.name.normalize('NFC');
    const hud = document.getElementById("revealed-letters-hud");
    if (!hud) return;

    let displayStr = "";
    let cleanCharIndex = 0;

    for (const char of brandName) {
        if (!cleanStringForMatch(char)) {
            displayStr += char + " ";
        } else {
            if (GAME_STATE.revealedIndices.includes(cleanCharIndex)) {
                displayStr += char.toUpperCase() + " ";
            } else {
                displayStr += "_ ";
            }
            cleanCharIndex++;
        }
    }
    hud.textContent = displayStr.trim();
}

function triggerVibration() {
    if (!GAME_STATE.saveData.vibration || GAME_STATE.saveData.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.getElementById("screen-gameplay");
    if (el) {
        el.classList.add("shake-active");
        setTimeout(() => el.classList.remove("shake-active"), 400);
    }
}
