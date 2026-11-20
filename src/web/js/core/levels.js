/* BrandGame - Copyright (c) 2026 p-darksy-r */

function hashString(value) {
    let hash = 0;
    for (const character of value) hash = Math.imul(hash, 31) + character.charCodeAt(0) | 0;
    return hash >>> 0;
}

// Integer arithmetic gives repeatable selections in browsers and WebView2.
function seededShuffle(array, seed) {
    let state = seed >>> 0;
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const j = state % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function brandsPerLevel(level) {
    return Math.floor((level - 1) / 10) + 3;
}

// These smaller categories need a rotation across levels. Build it from the catalog
// alone so opening a level directly or replaying it gives the same rounds.
const rotatingCampaigns = new Map();

function buildRotatingCampaign(category, pool) {
    const entries = pool.map(brand => ({ brand, appearances: 0, lastLevel: null }));
    const levels = [];
    const baseSeed = hashString(category);
    for (let level = 1; level <= 100; level++) {
        const seed = baseSeed + level * 7919;
        const candidates = seededShuffle(entries, seed);
        candidates.sort((a, b) => {
            // Exclude the previous lineup as far as the pool allows. Prefer
            // less-played brands, then avoid those from two levels ago.
            const previous = Number(a.lastLevel === level - 1) - Number(b.lastLevel === level - 1);
            const recent = Number(a.lastLevel === level - 2) - Number(b.lastLevel === level - 2);
            return previous || a.appearances - b.appearances || recent;
        });
        const selected = candidates.slice(0, brandsPerLevel(level));
        for (const entry of selected) {
            entry.appearances++;
            entry.lastLevel = level;
        }
        levels.push(seededShuffle(selected.map(entry => entry.brand), seed + 1));
    }
    return levels;
}

function getBrandsForLevel(category, level) {
    if (!Object.hasOwn(BRAND_DATABASE, category) || !Number.isInteger(level) || level < 1 || level > 100) return [];
    const pool = BRAND_DATABASE[category];
    if (category === 'fashion' || category === 'food') {
        if (!rotatingCampaigns.has(category)) rotatingCampaigns.set(category, buildRotatingCampaign(category, pool));
        return [...rotatingCampaigns.get(category)[level - 1]];
    }
    return seededShuffle(pool, hashString(category) + level * 7919).slice(0, brandsPerLevel(level));
}

window.getBrandsForLevel = getBrandsForLevel;
