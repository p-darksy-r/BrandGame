// Copyright (c) 2026 p-darksy-r.
function selectCustomCategory() {
    GAME_STATE.currentCategory = 'custom';
    const title = document.getElementById('level-category-title');
    if (title) title.textContent = t('Custom Arena Rooms');
    const badge = document.getElementById('level-category-badge');
    if (badge) badge.textContent = t('Saved on this device');
    document.getElementById('select-level-page')?.parentElement?.classList.add('hidden');
    const grid = document.getElementById('level-buttons-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const rooms = GAME_STATE.saveData.customLevels;
    grid.className = rooms.length ? 'level-grid' : 'empty-state';
    if (!rooms.length) {
        grid.innerHTML = `<span class="icon-tile large">${uiIcon('custom')}</span><h3>${t('No rooms yet')}</h3><p>${t('Pick your favourite brands and build a challenge of your own.')}</p><button class="button primary">${uiIcon('plus')}<span>${t('Create a room')}</span></button>`;
        grid.querySelector('button').addEventListener('click', () => document.getElementById('btn-trigger-creator').click());
    }
    rooms.forEach((room, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'level-card';
        const best = resultSummary(GAME_STATE.saveData.customResults[customResultKey(room, index)]);
        button.innerHTML = `${uiIcon('custom')}<strong class="room-name" data-i18n-skip></strong><span class="level-stars">${starsMarkup(best.stars)}</span><small>${t('{count} brands', { count: room.brands.length })}</small>`;
        button.querySelector('.room-name').textContent = room.name;
        button.addEventListener('click', () => launchCustomLevel(index));
        grid.appendChild(button);
    });
    showScreen('screen-levels');
}

function publishCustomLevelRoom() {
    const levelNameEl = document.getElementById("creator-level-name");
    const levelName = levelNameEl ? levelNameEl.value.trim() : "";

    if (!levelName) {
        alert(t("Please enter a custom name for your Level Room!"));
        return;
    }

    const catEl = document.getElementById("creator-level-category");
    const category = catEl ? catEl.value : "tech";

    const diffEl = document.getElementById("creator-level-difficulty");
    const difficulty = diffEl ? diffEl.value : "medium";

    const themeEl = document.getElementById("creator-level-theme");
    const theme = themeEl ? themeEl.value : "cyber-neon";

    const timerEl = document.getElementById("creator-level-timer");
    const timer = Math.max(5, Math.min(120, timerEl ? (parseInt(timerEl.value) || 15) : 15));

    const customBrands = [];
    for (let i = 1; i <= 10; i++) {
        const nameEl = document.getElementById(`c-brand-${i}-name`);
        const slugEl = document.getElementById(`c-brand-${i}-slug`);
        const hintEl = document.getElementById(`c-brand-${i}-hint`);

        if (!nameEl || !slugEl) continue;

        const bName = nameEl.value.trim();
        const bSlug = slugEl.value.trim().toLowerCase();
        const bHint = hintEl ? hintEl.value.trim() : "";

        if (!bName && !bSlug) continue;

        if (!bName || !bSlug) {
            alert(t('Brand #{number} requires both a Name and an SVG Slug.', { number: i }));
            return;
        }

        if (!getLocalLogoPath(bSlug)) {
            alert(t('Brand #{number}: choose one of the suggested offline logo identifiers.', { number: i }));
            return;
        }

        customBrands.push({
            name: bName,
            slug: bSlug,
            hint: bHint
        });
    }

    if (customBrands.length === 0) {
        alert(t("Please add at least one valid Brand (Name + Slug)!"));
        return;
    }

    const newRoom = {
        id: "custom_" + Date.now(),
        name: levelName,
        category: category,
        difficulty: difficulty,
        theme: theme,
        timer: timer,
        brands: customBrands
    };

    if (!GAME_STATE.saveData.customLevels) GAME_STATE.saveData.customLevels = [];
    GAME_STATE.saveData.customLevels.push(newRoom);

    sendNativeRequest({ Action: "write_save", Data: GAME_STATE.saveData });
    updateGlobalStatsHUD();
    alert(t("Level Room Successfully Published!"));

    renderCategoryCards();
    showScreen("screen-categories");
}

function populateLocalLogoOptions() {
    const list = document.createElement('datalist');
    list.id = 'local-logo-options';
    for (const slug of [...LOCAL_LOGO_SLUGS].sort()) {
        const option = document.createElement('option');
        option.value = slug;
        list.appendChild(option);
    }
    document.body.appendChild(list);
    document.querySelectorAll('input[id$="-slug"]').forEach(input => input.setAttribute('list', list.id));
}
