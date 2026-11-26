// BrandGame - Copyright (c) 2026 p-darksy-r.
function setupMissedPractice() {
    const start = document.getElementById('practice-missed-btn');
    const back = document.getElementById('practice-back-btn');
    const count = document.getElementById('practice-count');
    const round = document.getElementById('practice-round');
    const complete = document.getElementById('practice-complete');
    const form = document.getElementById('practice-form');
    const logo = document.getElementById('practice-logo');
    const input = document.getElementById('practice-input');
    const submit = document.getElementById('practice-submit-btn');
    const hintButton = document.getElementById('practice-hint-btn');
    const hint = document.getElementById('practice-hint');
    const feedback = document.getElementById('practice-feedback');
    const next = document.getElementById('practice-next-btn');
    const retry = document.getElementById('practice-retry-btn');
    let session = null;

    function updateCount() {
        count.textContent = t('{done} / {total} recognised', {
            done: session.total - session.remaining.length, total: session.total
        });
    }

    async function showBrand() {
        const currentSession = session;
        const brand = session.remaining[0];
        input.value = '';
        input.disabled = submit.disabled = true;
        hint.textContent = GAME_STATE.currentCategory === 'custom' ? brand.hint || '' : t(brand.hint);
        hint.classList.add('hidden');
        hintButton.classList.toggle('hidden', !brand.hint);
        hintButton.setAttribute('aria-expanded', 'false');
        form.classList.remove('hidden');
        next.classList.add('hidden');
        retry.classList.add('hidden');
        logo.classList.add('hidden');
        feedback.className = 'muted';
        feedback.textContent = t('Loading logo…');
        logo.src = getLocalLogoPath(brand.slug);
        try {
            await logo.decode();
        } catch {
            if (session !== currentSession) return;
            form.classList.add('hidden');
            feedback.textContent = t('Could not load this logo.');
            retry.classList.remove('hidden');
            retry.focus();
            return;
        }
        if (session !== currentSession) return;
        feedback.textContent = '';
        logo.classList.remove('hidden');
        input.disabled = submit.disabled = false;
        input.focus();
    }

    function returnToResult() {
        session = null;
        showScreen('screen-report');
        start.focus();
    }

    start.addEventListener('click', () => {
        session = createMissedPractice();
        if (!session.total) return;
        round.classList.remove('hidden');
        complete.classList.add('hidden');
        updateCount();
        showScreen('practice-screen');
        showBrand();
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!session || input.disabled) return;
        const result = submitPracticeGuess(session, input.value);
        if (!result) return;
        input.disabled = true;
        form.classList.add('hidden');
        updateCount();
        feedback.className = result.correct ? 'feedback-success' : 'feedback-error';
        feedback.textContent = t(result.correct ? 'Correct! It’s {name}.' : 'It’s {name}. You’ll see this logo again.', { name: result.brand.name });
        next.lastElementChild.textContent = t(session.remaining.length ? 'Continue' : 'Finish practice');
        next.classList.remove('hidden');
        next.focus();
    });

    hintButton.addEventListener('click', () => {
        const hidden = hint.classList.toggle('hidden');
        hintButton.setAttribute('aria-expanded', String(!hidden));
    });

    next.addEventListener('click', () => {
        if (session.remaining.length) {
            showBrand();
            return;
        }
        round.classList.add('hidden');
        complete.classList.remove('hidden');
        complete.querySelector('h3').focus();
    });

    retry.addEventListener('click', showBrand);
    back.addEventListener('click', returnToResult);
    document.getElementById('practice-screen').addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            returnToResult();
        }
    });
}
