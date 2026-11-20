// Copyright (c) 2026 p-darksy-r.
function applyWindowBounds() {
    // Window presets are applied by the native host. Web layout follows the viewport.
    const main = document.querySelector('main');
    if (main) for (const property of ['maxWidth', 'maxHeight', 'width', 'height']) main.style[property] = '';
}

function selectSetting(id, active) {
    const button = document.getElementById(id);
    if (button) button.setAttribute('aria-pressed', String(active));
}

function applyVisualSettings() {
    const low = GAME_STATE.saveData.quality === 'low';
    document.body.classList.toggle('low-quality', low);
    selectSetting('btn-qual-low', low);
    selectSetting('btn-qual-high', !low);
    const main = document.querySelector('main');
    if (main) main.style.filter = `brightness(${GAME_STATE.saveData.brightness || 100}%)`;
}

function applyMotionSettings() {
    document.body.classList.toggle('reduced-motion', GAME_STATE.saveData.reducedMotion);
    const checkbox = document.getElementById('settings-reduced-motion');
    if (checkbox) checkbox.checked = GAME_STATE.saveData.reducedMotion;
}

function syncSettingsPanel() {
    const volume = document.getElementById('settings-volume');
    if (volume) volume.value = GAME_STATE.saveData.volume;
    sfx.volume = GAME_STATE.saveData.volume;
    const volumeLabel = document.getElementById('volume-label');
    if (volumeLabel) volumeLabel.textContent = `${Math.round(GAME_STATE.saveData.volume * 100)}%`;
    const brightness = document.getElementById('settings-brightness');
    if (brightness) brightness.value = GAME_STATE.saveData.brightness;
    const brightnessLabel = document.getElementById('brightness-label');
    if (brightnessLabel) brightnessLabel.textContent = `${GAME_STATE.saveData.brightness}%`;
    updateDifficultyToggles();
    updateResolutionButtons();
    updateVibrationButton();
    applyVisualSettings();
    applyMotionSettings();
    applyAppearanceSettings();
    applyWindowBounds();
}

function updateResolutionButtons() {
    ['800x600', '1024x768', '1280x960'].forEach((size, index) => selectSetting(`btn-win-${['sm', 'md', 'lg'][index]}`, GAME_STATE.saveData.resolution === size));
}

function updateVibrationButton() {
    const button = document.getElementById('btn-vibrate-toggle');
    const active = GAME_STATE.saveData.vibration;
    if (button) {
        button.innerHTML = uiIcon(active ? 'check' : 'close') + `<span>${t(active ? 'Enabled' : 'Disabled')}</span>`;
        button.setAttribute('aria-pressed', String(active));
    }
}

function updateDifficultyToggles() {
    for (const difficulty of ['easy', 'medium', 'hard']) selectSetting(`diff-${difficulty}`, GAME_STATE.saveData.difficulty === difficulty);
}
