// Copyright (c) 2026 p-darksy-r. BrandGame.
function compareReleaseVersion(available, installed) {
    const releasePattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
    if (typeof available !== 'string' || !releasePattern.test(available)) throw new Error('Invalid release version.');
    const remote = available.split('.').map(Number);
    const local = installed.split('.').map(Number);
    for (let part = 0; part < local.length; part++) {
        if (remote[part] !== local[part]) return remote[part] - local[part];
    }
    return 0;
}

function setupUpdateSettings() {
    const button = document.getElementById('btn-update-check');
    const status = document.getElementById('update-status');
    const available = document.getElementById('update-available-version');
    const availableRow = document.getElementById('update-available-row');
    const link = document.getElementById('update-releases-link');
    const linkError = document.getElementById('update-link-error');

    document.getElementById('settings-installed-version').textContent = GAME_VERSION;
    const native = Boolean(window.chrome?.webview?.postMessage);
    document.getElementById('update-browser-info').classList.toggle('hidden', native);
    if (!native) return;

    // Keep the source key so switching the interface language also translates an existing result.
    function announce(key, error = false) {
        status.dataset.i18n = key;
        status.textContent = t(key);
        status.toggleAttribute('data-error', error);
    }

    button.addEventListener('click', async () => {
        if (button.disabled) return;
        const hadFocus = document.activeElement === button;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        availableRow.classList.add('hidden');
        available.textContent = '';
        announce('Checking the signed release on GitHub…');
        try {
            const reply = await askNativeHost('check_updates');
            if (reply.version === null) {
                announce('No signed release is available on this channel.');
                return;
            }
            const comparison = compareReleaseVersion(reply.version, GAME_VERSION);
            available.textContent = reply.version;
            availableRow.classList.remove('hidden');
            if (comparison > 0) announce('A new version is available in the official releases.');
            else if (comparison < 0) announce('Your installed version is newer than the published release.');
            else announce('Your game is up to date.');
        } catch {
            announce('Could not verify the release. Check your connection and try again.', true);
        } finally {
            button.disabled = false;
            button.removeAttribute('aria-busy');
            if (hadFocus && document.activeElement === document.body && button.offsetWidth) button.focus();
        }
    });

    link.addEventListener('click', () => linkError.classList.add('hidden'));
    window.chrome.webview.addEventListener?.('message', event => {
        if (event.data !== 'release-link-error') return;
        linkError.querySelector('code').textContent = link.href;
        linkError.classList.remove('hidden');
        linkError.focus();
    });
}
