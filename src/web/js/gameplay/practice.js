// Copyright (c) 2026 p-darksy-r. BrandGame.

function createMissedPractice() {
    const remaining = [...GAME_STATE.missedBrands];
    return { total: remaining.length, remaining };
}

function submitPracticeGuess(session, guess) {
    const brand = session.remaining[0];
    if (!brand || !guess.trim()) return null;

    const correct = calculateMatchPercentage(guess, brand.name) >= MINIMUM_MATCH_PERCENTAGE;
    session.remaining.shift();
    if (!correct) session.remaining.push(brand);
    return { correct, brand };
}
