// Copyright (c) 2026 p-darksy-r.
// Original, local SVG interface icons. Decorative icons never replace a text label.
const UI_ICON_PATHS = {
    language: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
    play: '<path d="m9 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface, #142132)"/><circle cx="16" cy="17" r="3" fill="var(--surface, #142132)"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v2a4 4 0 0 0 5 4m7-6h4v2a4 4 0 0 1-5 4M12 13v6m-5 2h10m-8-2h6"/>',
    heart: '<path d="M20.4 5.6a5.1 5.1 0 0 0-7.2 0L12 6.8l-1.2-1.2a5.1 5.1 0 0 0-7.2 7.2L12 21l8.4-8.2a5.1 5.1 0 0 0 0-7.2Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    bulb: '<path d="M8 16a7 7 0 1 1 8 0l-1 2H9Zm1 6h6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3m0 3h.01"/>',
    refresh: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
    exit: '<path d="M10 4H5v16h5m4-12 4 4-4 4m-5-4h12"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15m-8 4v7m4-7v7"/>',
    monitor: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5m-5 0h10"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    volume: '<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    motion: '<path d="M3 8h5m-7 4h5m-3 4h5"/><rect x="11" y="4" width="10" height="16" rx="3"/>',
    leaf: '<path d="M20 3C9 1 3 7 5 15c2 8 16 6 15-12ZM5 21 16 9"/>',
    save: '<path d="M5 3h12l4 4v14H3V3Zm3 0v6h8V3M7 21v-8h10v8"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    tech: '<rect x="6" y="6" width="12" height="12" rx="3"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
    auto: '<path d="m4 10 2-6h12l2 6M3 10h18v8H3Zm2 8v3m14-3v3M6 14h2m8 0h2"/>',
    food: '<path d="M5 3v7a3 3 0 0 0 6 0V3M8 3v19M19 3c-4 1-4 7-4 10h4m0-10v19"/>',
    fashion: '<path d="m8 3-5 7 9 11 9-11-5-7Zm-5 7h18M8 3l4 18 4-18"/>',
    media: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 6 3-6 3Z"/>',
    custom: '<path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    palette: '<circle cx="8" cy="9" r=".5"/><circle cx="12" cy="6" r=".5"/><circle cx="16" cy="9" r=".5"/><path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5a3 3 0 0 0 3-3 9 9 0 0 0-9-7Z"/>'
};

function uiIcon(name, extraClass = '') {
    return `<svg class="ui-icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${UI_ICON_PATHS[name] || UI_ICON_PATHS.help}</svg>`;
}

function mountIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = uiIcon(element.dataset.icon); });
}

function starsMarkup(count) {
    return `<span class="sr-only">${'★'.repeat(count)}${'☆'.repeat(3 - count)}</span>` +
        [1, 2, 3].map(star => uiIcon('star', star <= count ? 'star-earned' : 'star-empty')).join('');
}
