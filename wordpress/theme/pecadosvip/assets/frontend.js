/* Progressive enhancement for native WordPress HTML. No content snapshot or React hydration. */
(() => {
  'use strict';
  const config = window.PecadosVipWP || {};
  const hub = config.copy?.hub || {};
  const ui = config.copy?.ui || {};
  const locale = config.locale || document.documentElement.lang || 'es';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const interpolate = (text, values) => String(text || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

  const menu = document.querySelector('#pvn-mobile-menu');
  const menuButton = document.querySelector('.pvn-menu-button');
  if (menu && menuButton && typeof menu.showModal === 'function') {
    menuButton.hidden = false;
    let previousOverflow = '';
    const close = () => menu.close();
    menuButton.addEventListener('click', () => {
      previousOverflow = document.body.style.overflow;
      menu.showModal();
      document.body.style.overflow = 'hidden';
      menuButton.setAttribute('aria-expanded', 'true');
      menu.querySelector('button')?.focus();
    });
    menu.querySelector('.pvn-menu-close')?.addEventListener('click', close);
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    menu.addEventListener('click', event => { if (event.target === menu) { const r = menu.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right) close(); } });
    menu.addEventListener('close', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = previousOverflow;
      menuButton.focus({ preventScroll: true });
    });
  }

  const mosaic = document.querySelector('.pvn-mosaic');
  if (mosaic && matchMedia('(hover:hover) and (pointer:fine)').matches && !reducedMotion.matches) {
    let frame = 0;
    document.addEventListener('pointermove', event => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        mosaic.style.setProperty('--pvn-x', `${event.clientX}px`);
        mosaic.style.setProperty('--pvn-y', `${event.clientY}px`);
        mosaic.dataset.active = 'true';
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => { delete mosaic.dataset.active; });
  }

  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const track = carousel.querySelector('[data-carousel-track]');
    const controls = carousel.querySelector('.pvn-carousel-controls');
    const toggle = carousel.querySelector('[data-carousel-play]');
    if (!track || !controls || !toggle) return;
    let playing = !reducedMotion.matches;
    let hovered = false;
    let timer = 0;
    const overflowing = () => track.scrollWidth > track.clientWidth + 4;
    const move = direction => {
      const card = track.firstElementChild;
      const step = (card?.getBoundingClientRect().width || track.clientWidth) + parseFloat(getComputedStyle(track).columnGap || '0');
      const end = track.scrollWidth - track.clientWidth;
      const target = direction > 0 && track.scrollLeft >= end - 5 ? 0 : direction < 0 && track.scrollLeft <= 5 ? end : Math.max(0, Math.min(end, track.scrollLeft + step * direction));
      track.scrollTo({ left: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    };
    const schedule = () => {
      clearInterval(timer);
      toggle.textContent = playing ? ui.pause : ui.play;
      toggle.setAttribute('aria-pressed', String(playing));
      controls.hidden = !overflowing();
      if (playing && !hovered && !document.hidden && !carousel.contains(document.activeElement) && overflowing()) timer = setInterval(() => move(1), 6500);
    };
    carousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => { playing = false; move(-1); schedule(); });
    carousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => { playing = false; move(1); schedule(); });
    toggle.addEventListener('click', () => { playing = !playing; schedule(); });
    carousel.addEventListener('pointerenter', () => { hovered = true; schedule(); });
    carousel.addEventListener('pointerleave', () => { hovered = false; schedule(); });
    carousel.addEventListener('focusin', schedule);
    carousel.addEventListener('focusout', () => setTimeout(schedule, 0));
    carousel.addEventListener('touchstart', () => { playing = false; schedule(); }, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) playing = false; schedule(); });
    new ResizeObserver(schedule).observe(track);
    schedule();
  });

  document.querySelectorAll('[data-service-explorer]').forEach(explorer => {
    const form = explorer.querySelector('[data-service-form]');
    const category = explorer.querySelector('[data-service-category]');
    const search = explorer.querySelector('[data-service-search]');
    const sort = explorer.querySelector('[data-service-sort]');
    const grid = explorer.querySelector('[data-service-grid]');
    const result = explorer.querySelector('[data-service-results]');
    const empty = explorer.querySelector('[data-service-empty]');
    const selection = explorer.querySelector('[data-service-selection]');
    const selectedList = explorer.querySelector('[data-selection-list]');
    const selectedStatus = explorer.querySelector('[data-selection-status]');
    if (!form || !category || !search || !sort || !grid || !result || !selection || !selectedList || !selectedStatus) return;
    const items = [...grid.querySelectorAll('.pvn-service-item')];
    const cards = items.map(item => item.querySelector('[data-key]')).filter(Boolean);
    // Deliberately memory-only; selection is never sent to a server or persisted across visits.
    const selected = new Map();
    const normalize = value => value.toLocaleLowerCase(locale).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const update = (replaceUrl = true) => {
      const needle = normalize(search.value);
      let visible = 0;
      const ordered = [...items].sort((a, b) => {
        const ca = a.querySelector('[data-key]'); const cb = b.querySelector('[data-key]');
        return sort.value === 'name' ? ca.dataset.title.localeCompare(cb.dataset.title, locale) : Number(ca.dataset.order) - Number(cb.dataset.order);
      });
      ordered.forEach(item => {
        const card = item.querySelector('[data-key]');
        const matches = (!category.value || category.value === card.dataset.category) && (!needle || normalize(card.textContent).includes(needle));
        item.hidden = !matches;
        if (matches) visible++;
        grid.append(item);
      });
      result.textContent = interpolate(visible === 1 ? hub.resultSingular : hub.resultPlural, { count: visible });
      if (empty) empty.hidden = visible !== 0;
      if (replaceUrl) {
        const url = new URL(location.href);
        if (category.value) url.searchParams.set('category', category.value); else url.searchParams.delete('category');
        history.replaceState(null, '', url);
      }
    };
    const updateSelection = () => {
      selectedList.replaceChildren();
      selected.forEach(card => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = card.querySelector('h3 a').href; link.textContent = card.dataset.title;
        const button = document.createElement('button'); button.type = 'button'; button.textContent = hub.removeFromSelection || ui.remove;
        button.setAttribute('aria-label', `${button.textContent}: ${card.dataset.title}`);
        button.addEventListener('click', () => { selected.delete(card.dataset.key); updateSelection(); });
        li.append(link, button); selectedList.append(li);
      });
      cards.forEach(card => {
        const button = card.querySelector('[data-select-service]'); if (!button) return;
        const active = selected.has(card.dataset.key);
        button.textContent = active ? hub.removeFromSelection : hub.addToSelection;
        button.setAttribute('aria-label', `${button.textContent}: ${card.dataset.title}`);
        button.setAttribute('aria-pressed', String(active));
      });
      selectedStatus.textContent = selected.size ? `${ui.selected || hub.selectionTitle}: ${selected.size} / 3` : hub.selectionEmpty;
    };
    explorer.querySelector('[data-enhanced-controls]').hidden = false;
    selection.hidden = false;
    cards.forEach(card => {
      const button = card.querySelector('[data-select-service]'); if (!button) return;
      button.hidden = false;
      button.addEventListener('click', () => {
        if (selected.has(card.dataset.key)) selected.delete(card.dataset.key);
        else if (selected.size < 3) selected.set(card.dataset.key, card);
        else { selectedStatus.textContent = hub.selectionLimit; return; }
        updateSelection();
      });
    });
    form.addEventListener('submit', event => { event.preventDefault(); update(); });
    category.addEventListener('change', () => update());
    search.addEventListener('input', () => update(false));
    sort.addEventListener('change', () => update(false));
    explorer.querySelector('[data-service-reset]')?.addEventListener('click', () => { category.value = ''; search.value = ''; sort.value = 'editorial'; update(); });
    explorer.querySelector('[data-selection-clear]')?.addEventListener('click', () => { selected.clear(); updateSelection(); });
    update(false); updateSelection();
  });
})();
