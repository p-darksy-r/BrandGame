// Copyright (c) 2026 p-darksy-r. BrandGame.
// WebView2 correlates host responses by request ID.
const nativeRequests = new Map();
let nextNativeRequest = 0;

function askNativeHost(action, fields = {}) {
    return new Promise((resolve, reject) => {
        const id = ++nextNativeRequest;
        nativeRequests.set(id, { resolve, reject });
        try { window.chrome.webview.postMessage({ Action: action, RequestId: id, ...fields }); }
        catch (error) { nativeRequests.delete(id); reject(error); }
    });
}

window.onProgressFileResult = ({ id, ok, value }) => {
    const pending = nativeRequests.get(id);
    if (!pending) return;
    nativeRequests.delete(id);
    if (ok) pending.resolve(value);
    else pending.reject(new Error('Native request failed.'));
};
