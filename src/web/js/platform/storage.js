/* BrandGame - Copyright (c) 2026 p-darksy-r */

const SAVE_STORAGE_KEY = 'brandgame_savedata';
const LEGACY_SAVE_STORAGE_KEY = 'brandgame_v3_savedata';

function parseBrowserSaveRecord(raw) {
    const data = raw ? JSON.parse(raw) : null;
    const previous = data?._brandGamePrevious ?? null;
    if (data && typeof data === 'object') delete data._brandGamePrevious;
    return { save: data, previous };
}

function sendNativeRequest(payload) {
    if (window.chrome?.webview?.postMessage) {
        window.chrome.webview.postMessage(payload);
        return;
    }
    if (payload.Action === 'load_save') {
        let saved = null;
        try {
            saved = window.localStorage.getItem(SAVE_STORAGE_KEY);
            if (saved === null) {
                saved = window.localStorage.getItem(LEGACY_SAVE_STORAGE_KEY);
                // Keep the original key intact so older installations retain their save.
                if (saved !== null) window.localStorage.setItem(SAVE_STORAGE_KEY, saved);
            }
        }
        catch (error) { console.warn('Save storage unavailable; using this session only.', error); }
        if (saved) {
            try { saved = parseBrowserSaveRecord(saved).save; } catch { /* normalizeSaveData handles malformed saves. */ }
        }
        onSaveLoaded(saved);
    } else if (payload.Action === 'write_save') {
        try {
            const storage = window.localStorage;
            let previous = null;
            try { previous = parseBrowserSaveRecord(storage.getItem(SAVE_STORAGE_KEY)).previous; } catch { /* Replace malformed records on save. */ }
            const record = previous === null ? payload.Data : { ...payload.Data, _brandGamePrevious: previous };
            storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(record));
        }
        catch (error) { console.warn('Could not persist this session.', error); }
    } else if (payload.Action === 'exit_app') {
        window.close();
    }
}

function onSaveLoaded(data) {
    GAME_STATE.saveData = normalizeSaveData(data);
    applyLanguage(GAME_STATE.saveData.language);
    applyAppearanceSettings();
    sfx.volume = GAME_STATE.saveData.volume;
    updateGlobalStatsHUD();
    renderMainMenuProgress();
    syncSettingsPanel();
    applyVisualSettings();
    const [width, height] = GAME_STATE.saveData.resolution.split('x').map(Number);
    sendNativeRequest({ Action: 'resize_window', Width: width, Height: height });
    window.__brandGameReady = true;
}

window.onSaveLoaded = onSaveLoaded;
