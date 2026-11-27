/* BrandGame - https://github.com/p-darksy-r/BrandGame - Copyright (c) 2026 p-darksy-r */

function roundTextHint() {
    const hint = GAME_STATE.currentBrand.hint;
    if (typeof hint !== 'string' || !hint.trim()) return '';
    return GAME_STATE.currentCategory === 'custom' ? hint : t(hint);
}

function revealableLetters() {
    return [...GAME_STATE.currentBrand.name.normalize('NFC')].filter(char => cleanStringForMatch(char));
}

function updateClueControls() {
    const playing = GAME_STATE.roundStatus === 'playing';
    const hintButton = document.getElementById('btn-gameplay-hint');
    if (hintButton) {
        const hasHint = Boolean(roundTextHint());
        const used = GAME_STATE.hintUsed;
        let label = 'Hint · −5 pts';
        if (!hasHint) label = 'No hint available';
        else if (used) label = 'Hint revealed';
        hintButton.lastElementChild.textContent = t(label);
        hintButton.setAttribute('aria-disabled', String(!playing || !hasHint || used));
        hintButton.setAttribute('aria-expanded', String(used));
    }
    const letterButton = document.getElementById('btn-gameplay-reveal-char');
    if (letterButton) {
        const length = revealableLetters().length;
        const exhausted = GAME_STATE.revealedIndices.length >= length;
        let label = 'Letter · −10 pts';
        if (length === 0) label = 'No letters available';
        else if (exhausted) label = 'All letters revealed';
        letterButton.lastElementChild.textContent = t(label);
        letterButton.setAttribute('aria-disabled', String(!playing || exhausted));
    }
}

function resetRoundClues() {
    GAME_STATE.revealedIndices = [];
    GAME_STATE.clueCost = 0;
    GAME_STATE.hintUsed = false;
    const hint = document.getElementById('clue-text');
    hint.textContent = '';
    hint.classList.add('hidden');
    document.getElementById('clue-announcement').textContent = '';
    renderRevealedLetters();
    updateClueControls();
}

function buyTextClue() {
    if (GAME_STATE.roundStatus !== 'playing' || GAME_STATE.hintUsed) return;
    const hint = roundTextHint();
    if (!hint) return;
    GAME_STATE.hintUsed = true;
    GAME_STATE.clueCost += 5;
    const clue = document.getElementById('clue-text');
    clue.textContent = hint;
    clue.classList.remove('hidden');
    updateClueControls();
    document.getElementById('clue-announcement').textContent = hint;
}

function buyLetterClue() {
    if (GAME_STATE.roundStatus !== 'playing') return;
    const letters = revealableLetters();
    const possible = [];
    for (let i = 0; i < letters.length; i++) {
        if (!GAME_STATE.revealedIndices.includes(i)) possible.push(i);
    }
    if (!possible.length) return;
    const index = possible[Math.floor(Math.random() * possible.length)];
    GAME_STATE.revealedIndices.push(index);
    GAME_STATE.clueCost += 10;
    renderRevealedLetters();
    updateClueControls();
    const announcement = document.getElementById('clue-announcement');
    if (announcement) {
        announcement.textContent = t('Letter {position} of {total}: {letter}.', {
            position: index + 1, total: letters.length, letter: letters[index].toUpperCase()
        });
    }
}

function renderRevealedLetters() {
    const hud = document.getElementById('revealed-letters-hud');
    if (!hud) return;
    const mask = [];
    const revealed = [];
    let index = 0;
    for (const char of GAME_STATE.currentBrand.name.normalize('NFC')) {
        if (!cleanStringForMatch(char)) {
            mask.push(char);
            continue;
        }
        const known = GAME_STATE.revealedIndices.includes(index);
        mask.push(known ? char.toUpperCase() : '_');
        index++;
        if (known) revealed.push(t('{position}: {letter}', { position: index, letter: char.toUpperCase() }));
    }
    hud.textContent = mask.join(' ').trim();
    const summary = revealed.length ? t('Revealed letters: {letters}.', { letters: revealed.join(', ') }) : '';
    hud.setAttribute('aria-label', [t('Letters in the name: {total}.', { total: index }), summary].filter(Boolean).join(' '));
}

function triggerVibration() {
    if (!GAME_STATE.saveData.vibration || GAME_STATE.saveData.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.getElementById("screen-gameplay");
    if (el) {
        el.classList.add("shake-active");
        setTimeout(() => el.classList.remove("shake-active"), 400);
    }
}
