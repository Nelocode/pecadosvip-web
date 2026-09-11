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
    modal.className = 'pvn-modal';
    modal.style.cssText = 'background:#1a1a1a;border:1px solid #c2a77a;padding:3rem;max-width:500px;border-radius:8px;color:#f2f2f2;';
    
    modal.innerHTML = `
      <h2 style="color:#c2a77a;margin-bottom:1rem;font-size:1.5rem;">Confirmación de Edad</h2>
      <p style="margin-bottom:2rem;line-height:1.5;">Debes ser mayor de 18 años para ingresar a este sitio. Al entrar confirmas tu mayoría de edad y aceptas nuestros términos y condiciones legales.</p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
        <button id="pvn-age-accept" style="background:#c2a77a;color:#000;border:none;padding:0.8rem 2rem;cursor:pointer;font-weight:bold;border-radius:4px;font-size:1rem;">Soy mayor de 18 años</button>
        <button id="pvn-age-reject" style="background:transparent;color:#c2a77a;border:1px solid #c2a77a;padding:0.8rem 2rem;cursor:pointer;font-weight:bold;border-radius:4px;font-size:1rem;">Salir</button>
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

        // If still empty, use defaults
        phone = phone || '+34 000 000 000';
        wa = wa || 'https://wa.me/34000000000';
        tg = tg || 'https://t.me/pecadosvip';

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        
        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;color:#000;padding:25px;border-radius:12px;width:90%;max-width:400px;text-align:center;box-shadow:0 15px 30px rgba(0,0,0,0.5);position:relative;font-family:sans-serif;';
        
        modal.innerHTML = `
            <button class="pvn-reserve-close" style="position:absolute;top:15px;right:15px;background:#fff;border:1px solid #333;color:#333;padding:5px 10px;font-weight:bold;cursor:pointer;border-radius:4px;font-size:0.9rem;">Cerrar ✖</button>
            <h2 style="font-size:2rem;margin:35px 0 10px;color:#000;font-weight:bold;">${phone}</h2>
            <p style="color:#666;margin-bottom:20px;font-size:1.1rem;">Contacta con nosotros</p>
            <hr style="border:none;border-top:3px solid #ccc;margin-bottom:20px;">
            <a href="tel:${phone}" style="display:flex;align-items:center;justify-content:center;background:#b92831;color:#fff;padding:15px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:12px;font-size:1.1rem;box-shadow:0 3px 6px rgba(0,0,0,0.2);">📞 Toca aquí para llamar</a>
            <a href="${tg}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:#2ca4d8;color:#fff;padding:15px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:12px;font-size:1.1rem;box-shadow:0 3px 6px rgba(0,0,0,0.2);">✈️ Mensaje Telegram</a>
            <a href="${wa}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:#44c152;color:#fff;padding:15px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:12px;font-size:1.1rem;box-shadow:0 3px 6px rgba(0,0,0,0.2);">💬 Mensaje Whatsapp</a>
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
