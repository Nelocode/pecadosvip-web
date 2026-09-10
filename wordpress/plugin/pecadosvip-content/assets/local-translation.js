/* Local translation only. The server independently checks eligibility, versions and publication. */
(() => {
  'use strict';
  const config = window.PvcLocalTranslation;
  const status = document.getElementById('pvc-lt-status');
  const run = document.getElementById('pvc-lt-run');
  const stop = document.getElementById('pvc-lt-stop');
  const enable = document.getElementById('pvc-lt-enable');
  const disable = document.getElementById('pvc-lt-disable');
  const select = document.getElementById('pvc-lt-source');
  const refresh = document.getElementById('pvc-lt-refresh');
  if (!config || !status || !run) return;
  let active = false;
  const engines = new Map();
  const log = (message) => { status.textContent = (status.textContent + '\n' + message).slice(-12000); };
  async function request(action, values = {}) {
    const body = new URLSearchParams({action, nonce: config.nonce, ...values});
    const response = await fetch(config.ajax, {method: 'POST', credentials: 'same-origin', body});
    const result = await response.json();
    if (!result.success) throw new Error(result.data?.message || `Error ${response.status}`);
    return result.data;
  }
  async function engine(lang) {
    if (engines.has(lang)) return engines.get(lang);
    if (!window.Translator) throw new Error('Este navegador no ofrece traducción local. Usa Chrome o Edge de escritorio compatible.');
    const state = await Translator.availability({sourceLanguage: 'es', targetLanguage: lang});
    if (state === 'unavailable') throw new Error(`Traducción local no disponible para ${lang}.`);
    log(`Preparando ${lang}${state === 'available' ? '' : ' (descarga del modelo local)' }…`);
    const translator = await Translator.create({sourceLanguage: 'es', targetLanguage: lang});
    engines.set(lang, translator); return translator;
  }
  async function cycle(selectedId) {
    try {
      const pending = await request('pvc_lt_pending');
      log(`${pending.legacy} identidades Legacy protegidas; ${pending.jobs.length} traducciones pendientes; ${pending.complete} guardadas; ${pending.protected} versiones existentes para conservar o revisar.`);
      for (const job of pending.jobs.filter(job => String(job.id) === selectedId)) {
        if (!active) break;
        const translator = await engine(job.lang);
        const translations = {};
        log(`Traduciendo ${job.title} → ${job.lang}…`);
        for (const [key, text] of Object.entries(job.segments)) {
          if (!active) break;
          translations[key] = await translator.translate(text);
        }
        if (!active) break;
        const saved = await request('pvc_lt_store', {id: job.id, lang: job.lang, fingerprint: job.fingerprint, translations: JSON.stringify(translations)});
        log(`Borrador ${job.lang} para revisar: ${saved.url}`);
      }
      log('Proceso terminado. No se publicó contenido. Revisa los borradores en WordPress.');
      active = false; run.disabled = false; stop.disabled = true;
    } catch (error) { log(`Detenido: ${error.message}`); active = false; run.disabled = false; stop.disabled = true; }
  }
  enable?.addEventListener('click', async () => {
    enable.disabled = true;
    try { await request('pvc_lt_enable'); location.reload(); }
    catch (error) { log(error.message); enable.disabled = false; }
  });
  disable?.addEventListener('click', async () => {
    active = false;
    try { await request('pvc_lt_disable'); location.reload(); }
    catch (error) { log(error.message); }
  });
  refresh?.addEventListener('click', async () => {
    try {
      const pending = await request('pvc_lt_pending');
      select.replaceChildren(new Option('Selecciona una página', ''));
      const seen = new Set();
      for (const job of pending.jobs) { if (!seen.has(job.id)) { select.add(new Option(job.title, String(job.id))); seen.add(job.id); } }
      log(`${seen.size} páginas elegibles; ${pending.legacy} identidades Legacy protegidas. No se ha traducido nada.`);
    } catch (error) { log(error.message); }
  });
  run.addEventListener('click', async () => {
    if (active) return;
    const selectedId = select?.value;
    if (!selectedId) { log('Consulta y selecciona una página informativa primero.'); return; }
    active = true; run.disabled = true; stop.disabled = false;
    try { // Model creation follows this explicit user gesture; prepare every pair before polling.
      await Promise.all(['en', 'fr', 'it'].map(engine));
      if (active) await cycle(selectedId);
    } catch (error) { log(`Detenido: ${error.message}`); active = false; run.disabled = false; stop.disabled = true; }
  });
  stop.addEventListener('click', () => { active = false; run.disabled = false; stop.disabled = true; log('Detenido. Los borradores guardados se conservan.'); });
})();
