// Copyright (c) 2026 p-darksy-r.
const UI_CATEGORIES = [
    { id: 'tech', label: 'Technology', desc: 'Code and hardware masters.' },
    { id: 'auto', label: 'Automotive', desc: 'Supercar and speed engine marks.' },
    { id: 'food', label: 'Food & Drink', desc: 'Snack lines and beverage labels.' },
    { id: 'fashion', label: 'Fashion', desc: 'Jewelry, styling and luxury icons.' },
    { id: 'media', label: 'Media & Fun', desc: 'Entertainment, gaming, and logos.' }
];

function renderCategoryCards() {
    const grid = document.getElementById('category-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const categories = [...UI_CATEGORIES, { id: 'custom', label: 'Custom Arena', desc: 'Your rooms, your rules. Saved on this device.' }];
    categories.forEach(cat => {
        const custom = cat.id === 'custom';
        const completed = Math.min((GAME_STATE.saveData.levelsUnlocked[cat.id] || 1) - 1, 100);
        const count = custom ? GAME_STATE.saveData.customLevels.length : completed;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'category-card';
        card.dataset.category = cat.id;
        card.innerHTML = `<span class="icon-tile">${uiIcon(cat.id)}</span><div><h3>${t(cat.label)}</h3><p>${t(cat.desc)}</p></div><div class="card-bottom"><span>${custom ? t('{count} rooms', { count }) : t('{count} / 100 completed', { count })}</span>${uiIcon('arrow')}</div>`;
        card.addEventListener('click', () => custom ? selectCustomCategory() : selectCategory(cat.id, cat.label));
        grid.appendChild(card);
    });
}

function selectCategory(catId, catLabel) {
    GAME_STATE.currentCategory = catId;
    GAME_STATE.levelSelectPage = 0;
    const label = UI_CATEGORIES.find(cat => cat.id === catId)?.label || catLabel;
    const title = document.getElementById('level-category-title');
    if (title) title.textContent = t(label);
    const badge = document.getElementById('level-category-badge');
    if (badge) badge.textContent = t('Local collection');
    const pageSelect = document.getElementById('select-level-page');
    if (pageSelect) {
        pageSelect.value = '0';
        pageSelect.parentElement?.classList.remove('hidden');
    }
    renderLevelButtonsList();
    showScreen('screen-levels');
}

function renderLevelButtonsList() {
    const grid = document.getElementById('level-buttons-grid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.className = 'level-grid';
    const category = GAME_STATE.currentCategory;
    const unlocked = GAME_STATE.saveData.levelsUnlocked[category] || 1;
    const start = GAME_STATE.levelSelectPage * 10 + 1;
    for (let level = start; level <= Math.min(start + 9, 100); level++) {
        const locked = level > unlocked;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'level-card';
        button.disabled = locked;
        const record = resultSummary(GAME_STATE.saveData.levelResults[category][level]);
        const label = locked ? t('Locked') : record.wins ? t('{score} pts · {time}', { score: record.bestScore, time: formatBestTime(record.bestTimeMs) }) : t(level < unlocked ? 'Completed · no record' : 'Not completed');
        button.innerHTML = `${locked ? uiIcon('lock') : `<span class="level-stars">${starsMarkup(record.stars)}</span>`}<strong>${t('Level {level}', { level })}</strong><span class="level-record">${label}</span>`;
        button.setAttribute('aria-label', t('Level {level}, {stars} stars, {status}', { level, stars: record.stars, status: label }));
        if (!locked) button.addEventListener('click', () => launchLevel(level));
        grid.appendChild(button);
    }
}
