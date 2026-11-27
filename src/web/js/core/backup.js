// Copyright (c) 2026 p-darksy-r. BrandGame.
// Allow a native save (4 MiB) plus the small versioned file header.
const MAX_BACKUP_SAVE_BYTES = 4 * 1024 * 1024;
const MAX_BACKUP_BYTES = MAX_BACKUP_SAVE_BYTES + 1024;

function requireBackup(condition) {
    if (!condition) throw new Error('Invalid or unsupported BrandGame backup.');
}

function requireBackupSize(text, limit) {
    requireBackup(typeof text === 'string' && text.length <= limit && new TextEncoder().encode(text).length <= limit);
}

function hasBackupFields(value, required, optional = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return required.every(key => Object.hasOwn(value, key)) &&
        Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}

function validateBackupRoom(room) {
    requireBackup(hasBackupFields(room, ['name', 'brands'], ['id', 'category', 'difficulty', 'theme', 'timer']));
    requireBackup(typeof room.name === 'string' && room.name.trim());
    if (Object.hasOwn(room, 'id')) requireBackup(typeof room.id === 'string' && /^[\w-]{1,80}$/.test(room.id));
    if (Object.hasOwn(room, 'category')) requireBackup(RESULT_CATEGORIES.includes(room.category));
    if (Object.hasOwn(room, 'difficulty')) requireBackup(RESULT_DIFFICULTIES.includes(room.difficulty));
    if (Object.hasOwn(room, 'theme')) requireBackup(['cyber-neon', 'retro-amber', 'matrix-green', 'midnight-blue'].includes(room.theme));
    if (Object.hasOwn(room, 'timer')) requireBackup(Number.isInteger(room.timer) && room.timer >= 5 && room.timer <= 120);
    // The envelope size already bounds storage. Do not discard rooms from older creators
    // based on the current form's number of fields, text lengths or available logo catalog.
    requireBackup(Array.isArray(room.brands) && room.brands.length > 0);
    for (const brand of room.brands) {
        requireBackup(hasBackupFields(brand, ['name', 'slug'], ['hint']));
        // Matching in the Windows bridge accepts names of at most 256 UTF-16 code units.
        requireBackup(typeof brand.name === 'string' && brand.name.trim() && brand.name.length <= 256);
        requireBackup(typeof brand.slug === 'string' && brand.slug.length > 0);
        if (Object.hasOwn(brand, 'hint')) requireBackup(typeof brand.hint === 'string');
    }
}

function sameBackupValue(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameBackupValue(a[key], b[key]));
}

function validatedBackupSave(save) {
    const fields = Object.keys(createDefaultSaveData());
    requireBackup(hasBackupFields(save, fields));
    requireBackup(save.progressSchema === 2 && typeof save.gameVersion === 'string' && /^\d+\.\d+\.\d+$/.test(save.gameVersion));
    requireBackup(Array.isArray(save.customLevels));
    const roomKeys = new Set();
    for (const [index, room] of save.customLevels.entries()) {
        validateBackupRoom(room);
        const key = customResultKey(room, index);
        requireBackup(!roomKeys.has(key));
        roomKeys.add(key);
    }
    // Live saves recover missing or invalid data using defaults. An import must instead
    // reject any fields the normalizer would drop, clamp or replace. Only the app version advances.
    const normalized = normalizeSaveData(save);
    for (const key of fields) {
        if (key !== 'gameVersion') requireBackup(sameBackupValue(save[key], normalized[key]));
    }
    requireBackupSize(JSON.stringify(normalized), MAX_BACKUP_SAVE_BYTES);
    return normalized;
}

function makeProgressBackup(save) {
    return JSON.stringify({ format: 'BrandGame', version: 1, save: validatedBackupSave(save) });
}

function readProgressBackup(text) {
    requireBackupSize(text, MAX_BACKUP_BYTES);
    const data = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (data?.progressSchema === 2 && !Object.hasOwn(data, 'format')) {
        // The Windows save may point to a recovery file on the source PC.
        // Only the player data belongs to the destination profile.
        if (Object.hasOwn(data, '_brandGameRestoreSlot')) {
            requireBackup(data._brandGameRestoreSlot === 0 || data._brandGameRestoreSlot === 1);
            delete data._brandGameRestoreSlot;
        }
        return validatedBackupSave(data);
    }
    requireBackup(hasBackupFields(data, ['format', 'version', 'save']) && data.format === 'BrandGame' && data.version === 1);
    return validatedBackupSave(data.save);
}
