/* BrandGame - Copyright (c) 2026 p-darksy-r */

const LANGUAGES = Object.freeze([
    Object.freeze({ code: 'pt-PT', label: 'Português (Portugal)' }),
    Object.freeze({ code: 'en', label: 'English' }),
    Object.freeze({ code: 'es', label: 'Español' })
]);
const localizedTextNodes = new WeakMap();
const localizedAttributes = new WeakMap();
const untranslatedSelector = '[data-i18n-skip], script, style, svg, code, textarea';

function getLanguage() {
    return normalizeLanguage(GAME_STATE.saveData.language);
}

function t(source, replacements = {}) {
    const key = String(source ?? '');
    const dictionary = globalThis.BRANDGAME_LOCALES?.[getLanguage()];
    const text = dictionary && Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : key;
    return text.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name) =>
        Object.prototype.hasOwnProperty.call(replacements, name) ? String(replacements[name]) : placeholder);
}

// Recover source strings for UI text created with t() before its first DOM pass.
// User-authored names and clues opt out with data-i18n-skip on their container.
function translationSource(text) {
    for (const dictionary of Object.values(globalThis.BRANDGAME_LOCALES || {})) {
        if (Object.prototype.hasOwnProperty.call(dictionary, text)) return text;
    }
    for (const dictionary of Object.values(globalThis.BRANDGAME_LOCALES || {})) {
        for (const [source, translated] of Object.entries(dictionary)) {
            if (translated === text) return source;
        }
    }
    return text;
}

function localizeTextNode(node) {
    if (!node.nodeValue?.trim()) return;
    const previous = localizedTextNodes.get(node);
    const current = node.nodeValue;
    const original = previous && previous.output === current ? previous.original : current;
    const trimmed = original.trim();
    const source = previous && previous.output === current ? previous.source : translationSource(trimmed);
    const output = original.replace(trimmed, t(source));
    if (current !== output) node.nodeValue = output;
    localizedTextNodes.set(node, { original, source, output });
}

function localizeElementAttributes(element) {
    let records = localizedAttributes.get(element);
    if (!records) { records = new Map(); localizedAttributes.set(element, records); }
    for (const name of ['title', 'aria-label', 'placeholder', 'alt']) {
        const current = element.getAttribute(name);
        if (!current) continue;
        const previous = records.get(name);
        const source = element.getAttribute(`data-i18n-${name}`) ||
            (previous && previous.output === current ? previous.source : translationSource(current));
        const output = t(source);
        if (current !== output) element.setAttribute(name, output);
        records.set(name, { source, output });
    }
}

function localizePage(root = document) {
    if (!root) return;
    function visit(node) {
        if (node.nodeType === 3) { localizeTextNode(node); return; }
        if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
        if (node.nodeType === 1) {
            if (node.matches('script, style, svg, code, textarea')) return;
            localizeElementAttributes(node);
            if (node.matches('[data-i18n-skip]')) return;
            // Explicit keys target plain labels. Containers keep their child markup intact.
            const explicit = node.getAttribute('data-i18n');
            if (explicit && node.childElementCount === 0) {
                node.textContent = t(explicit);
                return;
            }
        }
        for (const child of Array.from(node.childNodes)) visit(child);
    }
    if (root.nodeType === 1 && root.parentElement?.closest(untranslatedSelector)) return;
    visit(root);
}

function applyLanguage(language = GAME_STATE.saveData.language) {
    GAME_STATE.saveData.language = normalizeLanguage(language);
    document.documentElement.lang = GAME_STATE.saveData.language;
    document.title = t('BrandGame — Play your recognition');
    localizePage(document);
    return GAME_STATE.saveData.language;
}
