// Copyright (c) 2026 p-darksy-r. BrandGame.
// Portable file operations run only after the player's explicit export/import action.
const progressRequests = new Map();
let nextProgressRequest = 0;

function askProgressHost(action, fields = {}) {
    return new Promise((resolve, reject) => {
        const id = ++nextProgressRequest;
        progressRequests.set(id, { resolve, reject });
        try { window.chrome.webview.postMessage({ Action: action, RequestId: id, ...fields }); }
        catch (error) { progressRequests.delete(id); reject(error); }
    });
}

window.onProgressFileResult = ({ id, ok, value }) => {
    const pending = progressRequests.get(id);
    if (!pending) return;
    progressRequests.delete(id);
    if (ok) pending.resolve(value);
    else pending.reject(new Error('Progress file operation failed.'));
};

async function exportProgressFile(text) {
    if (window.chrome?.webview?.postMessage) return askProgressHost('export_progress', { Text: text });
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    try {
        link.href = url;
        link.download = 'BrandGame-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.append(link);
        link.click();
    } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
    return true;
}

async function replaceProgressSave(save) {
    if (window.chrome?.webview?.postMessage) {
        await askProgressHost('replace_progress', { Data: save, Current: GAME_STATE.saveData });
        return;
    }
    const storage = window.localStorage;
    const record = parseBrowserSaveRecord(storage.getItem(SAVE_STORAGE_KEY));
    const previous = record.save || GAME_STATE.saveData;
    // One write commits both snapshots. Quota failure leaves the complete old record intact.
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ ...save, _brandGamePrevious: previous }));
}

async function resetProgressSave(defaultSave) {
    if (window.chrome?.webview?.postMessage) {
        await askProgressHost('reset_progress', { Data: defaultSave });
        return;
    }
    const storage = window.localStorage;
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(defaultSave));
}

async function loadPreviousProgress() {
    let previous;
    if (window.chrome?.webview?.postMessage) {
        previous = await askProgressHost('previous_progress');
    } else {
        const storage = window.localStorage;
        previous = parseBrowserSaveRecord(storage.getItem(SAVE_STORAGE_KEY)).previous;
    }
    if (previous === null) return null;
    return normalizeSaveData(previous);
}
