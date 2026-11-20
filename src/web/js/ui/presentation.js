// Copyright (c) 2026 p-darksy-r.
// Presentation preferences and modal behaviour are independent of game rules.
function applyAppearanceSettings() {
    document.body.dataset.theme = GAME_STATE.saveData.theme;
    const theme = document.getElementById('settings-theme');
    const language = document.getElementById('settings-language');
    if (theme) theme.value = GAME_STATE.saveData.theme;
    if (language) language.value = GAME_STATE.saveData.language;
}

function setupPresentation() {
    mountIcons();
    const help = document.getElementById('help-dialog');
    document.getElementById('btn-menu-help').addEventListener('click', () => help.showModal());
    const native = Boolean(window.chrome?.webview?.postMessage);
    document.querySelectorAll('[data-native-only]').forEach(element => element.classList.toggle('hidden', !native));
    document.getElementById('browser-window-note').classList.toggle('hidden', native);
    document.getElementById('settings-theme').addEventListener('change', event => {
        GAME_STATE.saveData.theme = event.target.value;
        applyAppearanceSettings();
        sendNativeRequest({ Action: 'write_save', Data: GAME_STATE.saveData });
    });
    document.getElementById('settings-language').addEventListener('change', event => {
        GAME_STATE.saveData.language = event.target.value;
        applyLanguage(event.target.value);
        renderMainMenuProgress();
        renderCategoryCards();
        populatePageSelectDropdown();
        syncSettingsPanel();
        sendNativeRequest({ Action: 'write_save', Data: GAME_STATE.saveData });
    });
    // Hide underlying controls from keyboard/assistive navigation while a game modal is open.
    const gameContent = document.getElementById('gameplay-content');
    const pause = document.getElementById('pause-overlay');
    const feedback = document.getElementById('feedback-overlay');
    const syncOverlay = () => {
        const paused = !pause.classList.contains('hidden');
        const answered = !feedback.classList.contains('hidden');
        gameContent.inert = paused || answered;
        if (paused) document.getElementById('btn-resume-round').focus();
        else if (answered) document.getElementById('btn-feedback-next').focus();
    };
    const observer = new MutationObserver(syncOverlay);
    for (const overlay of [pause, feedback]) observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Tab' || document.getElementById('screen-gameplay').classList.contains('hidden')) return;
        if (gameContent.inert) {
            event.preventDefault();
            document.getElementById(!pause.classList.contains('hidden') ? 'btn-resume-round' : 'btn-feedback-next').focus();
        }
    });
}
