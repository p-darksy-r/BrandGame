/* BrandGame - https://github.com/p-darksy-r/BrandGame - Copyright (c) 2026 p-darksy-r */

function showScreen(screenId) {
    if (screenId === "screen-main-menu") renderMainMenuProgress();
    if (screenId === "screen-report") {
        document.getElementById("practice-missed-btn").classList.toggle("hidden", !GAME_STATE.missedBrands.length);
    }
    const screens = ["screen-main-menu", "screen-categories", "screen-levels", "screen-gameplay", "screen-report", "practice-screen", "screen-settings", "screen-creator"];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === screenId) el.classList.remove("hidden");
            else el.classList.add("hidden");
        }
    });

    const active = document.getElementById(screenId);
    if (active) {
        localizePage(active);
        active.querySelector('h2[tabindex]')?.focus({ preventScroll: true });
    }
    document.body.dataset.screen = screenId;
    if (screenId !== "screen-gameplay") {
        clearCustomThemeClasses();
    }

    const header = document.getElementById("header-stats");
    if (header) {
        if (screenId === "screen-main-menu" || screenId === "screen-categories") header.classList.remove("hidden");
        else header.classList.add("hidden");
    }
}

function clearCustomThemeClasses() {
    document.body.classList.remove("theme-cyber-neon", "theme-retro-amber", "theme-matrix-green", "theme-midnight-blue");
}

function updateGlobalStatsHUD() {
    const globalStars = totalEarnedStars(GAME_STATE.saveData);

    const starsEl = document.getElementById("global-stars");
    if (starsEl) starsEl.textContent = globalStars;
    const scoreEl = document.getElementById("global-score");
    if (scoreEl) scoreEl.textContent = GAME_STATE.saveData.globalScore + (GAME_STATE.saveData.customScore || 0);
}

function renderMainMenuProgress() {
    const counter = document.getElementById('catalog-entry-count');
    if (counter) {
        const count = Object.values(BRAND_DATABASE).reduce((total, brands) => total + brands.length, 0);
        counter.textContent = t('{count} brand entries', { count });
    }
    const list = document.getElementById('category-summary-list');
    if (!list) return;
    list.innerHTML = '';
    document.getElementById('legacy-progress-note')?.classList.toggle('hidden', !hasLegacyCompletions(GAME_STATE.saveData));
    UI_CATEGORIES.forEach(category => {
        const completed = Math.max(0, Math.min(100, (GAME_STATE.saveData.levelsUnlocked[category.id] || 1) - 1));
        const item = document.createElement('div');
        item.className = 'progress-item';
        item.innerHTML = `<span class="progress-icon">${uiIcon(category.id)}</span><div class="progress-label"><span>${t(category.label)}</span><small>${completed} / 100</small></div><div class="progress-track" role="progressbar" aria-label="${t(category.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completed}"><span style="width:${completed}%"></span></div>`;
        list.appendChild(item);
    });
    const custom = document.createElement('div');
    custom.className = 'progress-item custom-summary';
    custom.innerHTML = `<span class="progress-icon">${uiIcon('custom')}</span><div class="progress-label"><span>${t('Custom Arena')}</span><small>${t('{count} rooms', { count: GAME_STATE.saveData.customLevels.length })}</small></div><span class="helper">${t('Your rooms, your rules.')}</span>`;
    list.appendChild(custom);
}

function populatePageSelectDropdown() {
    const sel = document.getElementById("select-level-page");
    if (!sel) return;
    sel.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = t('Levels {first}–{last}', { first: i * 10 + 1, last: i * 10 + 10 });
        sel.appendChild(opt);
    }
    sel.onchange = (e) => {
        GAME_STATE.levelSelectPage = parseInt(e.target.value);
        renderLevelButtonsList();
    };
}
