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

/**
 * Cookie consent.
 *
 * Nothing here loads a non-essential resource: this module only records the visitor's
 * decision and announces it. Any future integration must wait for the
 * "pvn:cookie-consent" event or call window.PecadosVipConsent.granted(category)
 * before loading a cookie or SDK. Fail-closed: without storage or without a decision,
 * nothing optional is granted and the banner is shown again.
 *
 * Adult access is NOT handled here. It is a server-side gate with a verified adapter
 * (inc/age-access.php); a self-declaration in the browser is never proof of age.
 */
(() => {
  'use strict';
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* no storage: no optional consent */ } };
  const clear = (key) => { try { localStorage.removeItem(key); } catch { /* ignore */ } };
  const statusNodes = () => [...document.querySelectorAll('[data-pvn-cookie-status]')];
  const say = (message) => statusNodes().forEach(node => { node.textContent = message || ''; });
  const banner = document.querySelector('[data-pvn-cookie-banner]');
  const consentKey = banner?.dataset.storageKey || 'pvn-cookie-consent';
  const policyVersion = banner?.dataset.policyVersion || '1';
  const messageFor = (name) => statusNodes().map(node => node.dataset[name] || '').find(Boolean) || '';
  let grantedCategories = ['essential'];
  window.PecadosVipConsent = { granted: (category) => grantedCategories.includes(category) };

  if (banner) {
    const categories = banner.querySelector('[data-pvn-cookie-categories]');
    const save = banner.querySelector('[data-pvn-cookie-save]');
    const configure = banner.querySelector('[data-pvn-cookie-configure]');
    const boxes = () => [...banner.querySelectorAll('[data-pvn-cookie-category]')];
    const record = read(consentKey);
    const grant = (list) => {
      grantedCategories = ['essential', ...list];
      write(consentKey, { version: policyVersion, categories: grantedCategories, at: new Date().toISOString() });
      document.dispatchEvent(new CustomEvent('pvn:cookie-consent', { detail: { version: policyVersion, categories: grantedCategories } }));
      banner.querySelector('[data-pvn-cookie-categories]')?.setAttribute('hidden', '');
      if (save) save.hidden = true;
      banner.hidden = true;
      say('');
    };
    if (record && record.version === policyVersion) {
      grantedCategories = ['essential', ...(Array.isArray(record.categories) ? record.categories.filter(category => category !== 'essential') : [])];
      banner.remove();
    } else {
      banner.hidden = false;
      if (record) say(messageFor('messageReview'));
      banner.querySelector('[data-pvn-cookie-accept]')?.addEventListener('click', () => grant(boxes().map(box => box.value)));
      banner.querySelector('[data-pvn-cookie-reject]')?.addEventListener('click', () => grant([]));
      configure?.addEventListener('click', () => {
        if (categories) categories.hidden = false;
        if (save) save.hidden = false;
        configure.hidden = true;
      });
      save?.addEventListener('click', () => grant(boxes().filter(box => box.checked).map(box => box.value)));
    }
  }

  document.querySelectorAll('[data-pvn-cookie-revoke]').forEach(button => button.addEventListener('click', () => {
    clear(consentKey);
    grantedCategories = ['essential'];
    say(messageFor('messageRevoked'));
    if (banner && document.body.contains(banner)) { banner.hidden = false; }
  }));
})();
/**
 * 18+ Age Gate and GeoIP Block.
 */
(() => {
  'use strict';
  
  // GeoIP Restriction logic
  const profileContainer = document.querySelector('[data-blocked-country]');
  if (profileContainer) {
    const blockedCountry = profileContainer.getAttribute('data-blocked-country').toUpperCase();
    if (blockedCountry) {
      fetch('https://get.geojs.io/v1/ip/country.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.country && data.country.toUpperCase() === blockedCountry) {
            document.body.innerHTML = `
              <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a1a;color:#c2a77a;font-family:sans-serif;text-align:center;padding:2rem;">
                <div>
                  <h1 style="font-size:2rem;margin-bottom:1rem;">Perfil no disponible</h1>
                  <p style="color:#f2f2f2;">Lo sentimos, este perfil no está disponible en tu ubicación actual por privacidad.</p>
                </div>
              </div>
            `;
          }
        })
        .catch(err => console.error('GeoIP lookup failed', err));
    }
  }

  // 18+ Age Verification Modal
  const ageKey = 'pv_age_verified';
  const ageVerified = sessionStorage.getItem(ageKey);
  
  if (!ageVerified) {
    const overlay = document.createElement('div');
    overlay.className = 'pvn-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;backdrop-filter:blur(10px);';
    
    const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;color:#f2f2f2;padding:35px 25px;border:1px solid #c2a77a;border-radius:8px;width:90%;max-width:400px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.9);position:relative;font-family:sans-serif;';
        
        modal.innerHTML = `
            <button class="pvn-reserve-close" style="position:absolute;top:15px;right:15px;background:transparent;border:none;color:#c2a77a;font-size:1.5rem;cursor:pointer;line-height:1;padding:5px;">✖</button>
            <h2 style="font-size:2.2rem;margin:10px 0 5px;color:#c2a77a;font-weight:normal;font-family:serif;letter-spacing:2px;">${phone}</h2>
            <p style="color:#888;margin-bottom:30px;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">Contacta con nosotros</p>
            
            <div style="display:flex;flex-direction:column;gap:12px;">
                <a href="tel:${phone}" style="display:flex;align-items:center;justify-content:center;background:#111;color:#f2f2f2;padding:15px;border:1px solid #c2a77a;border-radius:4px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.9rem;">
                    <svg style="margin-right:12px; transition: color 0.3s;" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6.62 10.79a15.149 15.149 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg> Toca aquí para llamar
                </a>
                <a href="${tg}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:#111;color:#f2f2f2;padding:15px;border:1px solid #c2a77a;border-radius:4px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.9rem;">
                    <svg style="margin-right:12px; transition: color 0.3s;" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.94 0C5.35 0 0 5.35 0 11.94c0 6.59 5.35 11.94 11.94 11.94 6.59 0 11.94-5.35 11.94-11.94C23.88 5.35 18.53 0 11.94 0zm4.96 7.22c.1.01.32.02.46.14.15.12.18.29.17.32.02.09.04.31.02.47-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.22-.46-1.9-.9-1.06-.69-1.65-1.12-2.68-1.8-1.18-.78-.42-1.21.26-1.91.18-.18 3.25-2.98 3.31-3.23.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.79 1.14-5.06 3.34-.48.33-.91.49-1.3.48-.43-.01-1.25-.24-1.86-.44-.75-.25-1.35-.37-1.3-.79.03-.22.33-.43.89-.67 3.5-1.52 5.83-2.53 7-3.01 3.33-1.39 4.03-1.63 4.48-1.64z"/></svg> Mensaje Telegram
                </a>
                <a href="${wa}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:#111;color:#f2f2f2;padding:15px;border:1px solid #c2a77a;border-radius:4px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.9rem;">
                    <svg style="margin-right:12px; transition: color 0.3s;" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12.01 2a9.92 9.92 0 00-8.48 15.02L2 22l5.12-1.46A9.9 9.9 0 0012.01 22c5.49 0 9.95-4.46 9.95-9.96 0-5.49-4.46-9.97-9.95-9.97zm0 18.3c-1.63 0-3.21-.43-4.59-1.25l-.33-.19-3.41.97.91-3.32-.22-.34A8.34 8.34 0 013.68 12c0-4.59 3.73-8.32 8.33-8.32 4.59 0 8.32 3.74 8.32 8.32 0 4.59-3.73 8.32-8.32 8.32zm4.56-6.22c-.25-.13-1.48-.73-1.72-.82-.23-.08-.41-.12-.58.12-.17.25-.66.82-.8.99-.15.17-.29.2-.54.08-.25-.13-1.06-.39-2.02-1.25-.74-.67-1.24-1.49-1.39-1.74-.15-.25-.02-.38.1-.5.12-.12.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.12-.58-1.4-.79-1.92-.2-.5-.41-.43-.58-.44h-.5c-.17 0-.46.06-.7.31-.25.25-.95.93-.95 2.27 0 1.34.98 2.63 1.11 2.8.13.17 1.91 2.92 4.63 4.09 2.71 1.17 2.71.78 3.2.74.5-.04 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.15-.48-.28z"/></svg> Mensaje Whatsapp
                </a>
            </div>
        `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    document.getElementById('pvn-age-accept').addEventListener('click', () => {
      sessionStorage.setItem(ageKey, 'true');
      overlay.remove();
      document.body.style.overflow = '';
    });
    
    document.getElementById('pvn-age-reject').addEventListener('click', () => {
      window.location.href = 'https://google.com';
    });
  }
})();
(() => {
    'use strict';
    const reserveBtn = document.querySelector('.pvn-reserve-btn');
    if (!reserveBtn) return;

    let userCity = null;

    // Pre-fetch location
    fetch('https://get.geojs.io/v1/ip/geo.json')
        .then(res => res.json())
        .then(data => {
            const lat = parseFloat(data.latitude);
            const lon = parseFloat(data.longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
                const distMadrid = Math.pow(lat - 40.4168, 2) + Math.pow(lon - -3.7038, 2);
                const distBcn = Math.pow(lat - 41.3851, 2) + Math.pow(lon - 2.1734, 2);
                userCity = distMadrid < distBcn ? 'madrid' : 'bcn';
            } else {
                userCity = 'madrid'; // default
            }
        })
        .catch(() => {
            userCity = 'madrid'; // default fallback
        });

    reserveBtn.addEventListener('click', () => {
        const city = userCity || 'madrid';
        
        let phone = reserveBtn.getAttribute(`data-phone-${city}`);
        let wa = reserveBtn.getAttribute(`data-wa-${city}`);
        let tg = reserveBtn.getAttribute(`data-tg-${city}`);
        
        // Fallback to the other city if this one is completely empty
        if (!phone && !wa && !tg) {
            const otherCity = city === 'madrid' ? 'bcn' : 'madrid';
            phone = reserveBtn.getAttribute(`data-phone-${otherCity}`);
            wa = reserveBtn.getAttribute(`data-wa-${otherCity}`);
            tg = reserveBtn.getAttribute(`data-tg-${otherCity}`);
        }

        // Nothing is invented: the button is only rendered with an approved destination, so an
        // empty value must stay empty instead of turning into a placeholder number.
        if (!phone && !wa && !tg) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        
        const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;color:#f2f2f2;padding:35px 25px;border:1px solid #c2a77a;border-radius:8px;width:90%;max-width:400px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.9);position:relative;font-family:sans-serif;';
        
        modal.innerHTML = `
            <button class="pvn-reserve-close" style="position:absolute;top:15px;right:15px;background:transparent;border:none;color:#c2a77a;font-size:1.5rem;cursor:pointer;line-height:1;padding:5px;transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">✖</button>
            <h2 style="font-size:2.2rem;margin:10px 0 5px;color:#c2a77a;font-weight:normal;font-family:serif;letter-spacing:1px;">${phone}</h2>
            <p style="color:#888;margin-bottom:30px;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">Contacta con nosotros</p>
            
            <div style="display:flex;flex-direction:column;gap:12px;">
                <a href="tel:${phone}" style="display:flex;align-items:center;justify-content:center;background:#111;color:#f2f2f2;padding:15px;border:1px solid #c2a77a;border-radius:4px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.9rem;transition: background 0.3s;" onmouseover="this.style.background='#c2a77a'; this.style.color='#000';" onmouseout="this.style.background='#111'; this.style.color='#f2f2f2';">
                    <svg style="margin-right:12px; transition: color 0.3s;" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6.62 10.79a15.149 15.149 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg> Toca aquí para llamar
                </a>
                <a href="${tg}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:#111;color:#f2f2f2;padding:15px;border:1px solid #c2a77a;border-radius:4px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.9rem;transition: background 0.3s;" onmouseover="this.style.background='#c2a77a'; this.style.color='#000';" onmouseout="this.style.background='#111'; this.style.color='#f2f2f2';">
                    <svg style="margin-right:12px; transition: color 0.3s;" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.94 0C5.35 0 0 5.35 0 11.94c0 6.59 5.35 11.94 11.94 11.94 6.59 0 11.94-5.35 11.94-11.94C23.88 5.35 18.53 0 11.94 0zm4.96 7.22c.1.01.32.02.46.14.15.12.18.29.17.32.02.09.04.31.02.47-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.22-.46-1.9-.9-1.06-.69-1.65-1.12-2.68-1.8-1.18-.78-.42-1.21.26-1.91.18-.18 3.25-2.98 3.31-3.23.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.79 1.14-5.06 3.34-.48.33-.91.49-1.3.48-.43-.01-1.25-.24-1.86-.44-.75-.25-1.35-.37-1.3-.79.03-.22.33-.43.89-.67 3.5-1.52 5.83-2.53 7-3.01 3.33-1.39 4.03-1.63 4.48-1.64z"/></svg> Mensaje Telegram
                </a>
                <a href="${wa}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:#111;color:#f2f2f2;padding:15px;border:1px solid #c2a77a;border-radius:4px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;font-size:0.9rem;transition: background 0.3s;" onmouseover="this.style.background='#c2a77a'; this.style.color='#000';" onmouseout="this.style.background='#111'; this.style.color='#f2f2f2';">
                    <svg style="margin-right:12px; transition: color 0.3s;" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12.01 2a9.92 9.92 0 00-8.48 15.02L2 22l5.12-1.46A9.9 9.9 0 0012.01 22c5.49 0 9.95-4.46 9.95-9.96 0-5.49-4.46-9.97-9.95-9.97zm0 18.3c-1.63 0-3.21-.43-4.59-1.25l-.33-.19-3.41.97.91-3.32-.22-.34A8.34 8.34 0 013.68 12c0-4.59 3.73-8.32 8.33-8.32 4.59 0 8.32 3.74 8.32 8.32 0 4.59-3.73 8.32-8.32 8.32zm4.56-6.22c-.25-.13-1.48-.73-1.72-.82-.23-.08-.41-.12-.58.12-.17.25-.66.82-.8.99-.15.17-.29.2-.54.08-.25-.13-1.06-.39-2.02-1.25-.74-.67-1.24-1.49-1.39-1.74-.15-.25-.02-.38.1-.5.12-.12.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.12-.58-1.4-.79-1.92-.2-.5-.41-.43-.58-.44h-.5c-.17 0-.46.06-.7.31-.25.25-.95.93-.95 2.27 0 1.34.98 2.63 1.11 2.8.13.17 1.91 2.92 4.63 4.09 2.71 1.17 2.71.78 3.2.74.5-.04 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.15-.48-.28z"/></svg> Mensaje Whatsapp
                </a>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden'; // prevent background scrolling
        
        const closeBtn = modal.querySelector('.pvn-reserve-close');
        closeBtn.addEventListener('click', () => {
            overlay.remove();
            document.body.style.overflow = '';
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        });
    });
})();
