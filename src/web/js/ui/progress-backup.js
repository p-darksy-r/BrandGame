// Copyright (c) 2026 p-darksy-r.
function setupProgressBackups() {
    const byId = id => document.getElementById(id);
    const exportButton = byId('btn-progress-export');
    const importButton = byId('btn-progress-import');
    const restoreButton = byId('btn-progress-restore');
    const fileInput = byId('progress-import-file');
    const dialog = byId('progress-backup-dialog');
    const confirmButton = byId('btn-progress-confirm');
    const cancelButton = byId('btn-progress-cancel');
    const status = byId('progress-backup-status');
    let pending = null;
    let busy = false;
    let availabilityRequest = 0;

    function setBusy(value) {
        busy = value;
        for (const button of [exportButton, importButton, restoreButton, confirmButton, cancelButton])
            button.disabled = value;
    }

    function announce(message = '', error = false) {
        status.toggleAttribute('data-error', error);
        status.textContent = message ? t(message) : '';
    }

    async function refreshRestoreButton() {
        const request = ++availabilityRequest;
        try {
            const previous = await loadPreviousProgress();
            if (request === availabilityRequest) restoreButton.classList.toggle('hidden', !previous);
        } catch {
            if (request === availabilityRequest) restoreButton.classList.add('hidden');
        }
    }

    function showPreview(save, isRestore) {
        if (document.body.dataset.screen !== 'screen-settings') return;
        pending = { save, isRestore };
        byId('progress-preview-title').textContent = t(isRestore ? 'Restore previous progress?' : 'Replace current progress?');
        byId('progress-preview-score').textContent = save.globalScore + save.customScore;
        byId('progress-preview-stars').textContent = totalEarnedStars(save);
        byId('progress-preview-rooms').textContent = save.customLevels.length;
        dialog.showModal();
    }

    function canStart() {
        if (busy || dialog.open) return false;
        if (!window.__brandGameReady) {
            announce('Please wait for your progress to load.');
            return false;
        }
        announce();
        return true;
    }

    byId('btn-menu-settings').addEventListener('click', () => {
        announce();
        void refreshRestoreButton();
    });

    exportButton.addEventListener('click', async () => {
        if (!canStart()) return;
        setBusy(true);
        try {
            const text = makeProgressBackup(GAME_STATE.saveData);
            if (await exportProgressFile(text) !== false) announce('Backup file prepared.');
        } catch {
            announce('Could not export your progress.', true);
        } finally {
            setBusy(false);
        }
    });

    importButton.addEventListener('click', () => {
        if (canStart()) fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        fileInput.value = ''; // Allow selecting the same file again after cancelling.
        if (!file || !canStart()) return;
        if (file.size > MAX_BACKUP_BYTES) {
            announce('This file is too large to import.', true);
            return;
        }
        setBusy(true);
        try {
            const save = readProgressBackup(await file.text());
            showPreview(save, false);
        } catch {
            announce('Could not read this backup. Choose a BrandGame backup or a 3.5.0 save.json file.', true);
        } finally {
            setBusy(false);
            if (dialog.open) cancelButton.focus();
        }
    });

    restoreButton.addEventListener('click', async () => {
        if (!canStart()) return;
        setBusy(true);
        try {
            const previous = await loadPreviousProgress();
            if (previous) showPreview(previous, true);
            else {
                restoreButton.classList.add('hidden');
                announce('There is no previous progress to restore.');
            }
        } catch {
            announce('Could not read the previous progress on this device.', true);
        } finally {
            setBusy(false);
            if (dialog.open) cancelButton.focus();
        }
    });

    cancelButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => {
        const trigger = pending?.isRestore ? restoreButton : importButton;
        pending = null;
        trigger.focus();
    });

    confirmButton.addEventListener('click', async () => {
        if (busy || !pending || !dialog.open) return;
        const { save, isRestore } = pending;
        setBusy(true);
        try {
            await replaceProgressSave(save);
        } catch {
            dialog.close();
            announce('Could not save the replacement. Your current progress is unchanged.', true);
            return;
        } finally {
            setBusy(false);
        }
        onSaveLoaded(save);
        populatePageSelectDropdown();
        dialog.close();
        announce(isRestore ? 'Previous progress restored.' : 'Progress imported.');
        void refreshRestoreButton();
    });
}
