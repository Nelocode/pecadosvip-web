/* Automatic local translation. The server independently checks eligibility, source versions, permissions and publication. */
(() => {
  'use strict';
  const config = window.PvcLocalTranslation;
  const status = document.getElementById('pvc-lt-status');
  const run = document.getElementById('pvc-lt-run');
  const stop = document.getElementById('pvc-lt-stop');
  const enable = document.getElementById('pvc-lt-enable');
  const enablePublish = document.getElementById('pvc-lt-publish-enable');
  const disable = document.getElementById('pvc-lt-disable');
  const select = document.getElementById('pvc-lt-source');
  const refresh = document.getElementById('pvc-lt-refresh');
  const publishToggle = document.getElementById('pvc-lt-publish-toggle');
  const publishSave = document.getElementById('pvc-lt-publish-save');
  const publishNow = document.getElementById('pvc-lt-publish-now');
  if (!config || !status || !run) return;
  let active = false;
  let pollTimer = 0;
  const AUTO_INTERVAL_MS = 60000;
  /* Re-checks the queue while the tab stays open. Called only from event handlers, once the
     auto switch exists, so no timer is ever armed before the page is fully wired. */
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (!autoSwitch || !autoSwitch.checked) return;
    pollTimer = setTimeout(async () => {
      if (!active) {
        try {
          const pending = await request('pvc_lt_pending');
          if (pending.jobs.length) {
            log(`Modo automático: ${pending.jobs.length} traducciones pendientes.`);
            active = true; run.disabled = true; stop.disabled = false;
            await cycle('');
          }
        } catch (error) { log(`Modo automático: ${error.message}`); }
      }
      schedulePoll();
    }, AUTO_INTERVAL_MS);
  }
  const engines = new Map();
  const log = (message) => { status.textContent = (status.textContent + '\n' + message).slice(-12000); };
  const reset = () => { active = false; run.disabled = false; stop.disabled = true; };
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
  function describe(job, labels) {
    const kind = labels?.[job.type] || job.type;
    return `${kind} «${job.title}» → ${job.lang}`;
  }
  /* Automatic run: every pending pair for the current scope, in server order. */
  async function cycle(selectedId) {
    try {
      const pending = await request('pvc_lt_pending');
      const queue = selectedId ? pending.jobs.filter(job => String(job.id) === String(selectedId)) : pending.jobs;
      log(`${pending.legacy} identidades Legacy protegidas; ${pending.jobs.length} traducciones pendientes; ${pending.complete} guardadas; ${pending.protected} versiones existentes para conservar o revisar.`);
      log(`${queue.length} elementos en esta ejecución. Publicación automática: ${pending.publish ? 'activada' : 'desactivada'}.`);
      let done = 0;
      for (const job of queue) {
        if (!active) break;
        const translator = await engine(job.lang);
        const translations = {};
        log(`Traduciendo ${describe(job, pending.labels)}…`);
        for (const [key, text] of Object.entries(job.segments)) {
          if (!active) break;
          translations[key] = await translator.translate(text);
        }
        if (!active) break;
        const saved = await request('pvc_lt_store', {id: job.id, lang: job.lang, fingerprint: job.fingerprint, translations: JSON.stringify(translations)});
        done++;
        log(`${done}/${queue.length} · ${saved.lang}: ${saved.status === 'publish' ? 'publicado' : 'borrador para revisar'} · ${saved.url}`);
      }
      log(active ? `Proceso terminado: ${done} traducciones.` : `Detenido tras ${done} traducciones. Los borradores guardados se conservan.`);
      reset();
    } catch (error) { log(`Detenido: ${error.message}`); reset(); }
  }
  enable?.addEventListener('click', async () => {
    enable.disabled = true;
    try { await request('pvc_lt_enable', enablePublish?.checked ? {publish: '1'} : {}); location.reload(); }
    catch (error) { log(error.message); enable.disabled = false; }
  });
  disable?.addEventListener('click', async () => {
    active = false;
    try { await request('pvc_lt_disable'); location.reload(); }
    catch (error) { log(error.message); }
  });
  publishSave?.addEventListener('click', async () => {
    publishSave.disabled = true;
    try {
      const saved = await request('pvc_lt_settings', publishToggle?.checked ? {publish: '1'} : {});
      log(saved.publish ? 'Publicación automática activada. Las próximas traducciones quedarán publicadas.' : 'Publicación automática desactivada. Las próximas traducciones quedarán en borrador.');
    } catch (error) { log(error.message); }
    publishSave.disabled = false;
  });
  publishNow?.addEventListener('click', async () => {
    publishNow.disabled = true;
    try {
      const saved = await request('pvc_lt_publish');
      log(`${saved.published} borradores de traducción publicados; ${saved.skipped} sin cambios (versión existente, fuente modificada o validación fallida).`);
    } catch (error) { log(error.message); }
    publishNow.disabled = false;
  });
  refresh?.addEventListener('click', async () => {
    try {
      const pending = await request('pvc_lt_pending');
      select.replaceChildren(new Option('Toda la cola pendiente (automático)', ''));
      const seen = new Set();
      for (const job of pending.jobs) { if (!seen.has(job.id)) { seen.add(job.id); select.add(new Option(`${pending.labels?.[job.type] || job.type}: ${job.title}`, String(job.id))); } }
      log(`${seen.size} elementos elegibles; ${pending.legacy} identidades Legacy protegidas. No se ha traducido nada.`);
    } catch (error) { log(error.message); }
  });
  run.addEventListener('click', async () => {
    if (active) return;
    const selectedId = select?.value || '';
    active = true; run.disabled = true; stop.disabled = false;
    try { // Model creation follows this explicit user gesture; prepare every pair before starting.
      await Promise.all(['en', 'fr', 'it'].map(engine));
      if (active) await cycle(selectedId);
    } catch (error) { log(`Detenido: ${error.message}`); reset(); }
    schedulePoll();
  });
  stop?.addEventListener('click', () => { active = false; run.disabled = false; stop.disabled = true; clearTimeout(pollTimer); log('Detenido. Las traducciones ya guardadas se conservan.'); });

  /* Automatic mode. A new model published while this tab stays open is translated without
     anyone pressing anything again; the browser engine is already prepared, so no further
     user gesture is needed. Closing the tab stops it, and nothing runs in the background. */
  const autoSwitch = document.getElementById('pvc-lt-auto');
  if (autoSwitch) {
    try { autoSwitch.checked = localStorage.getItem('pvc-lt-auto') === '1'; } catch { /* no storage */ }
    autoSwitch.addEventListener('change', () => {
      try { localStorage.setItem('pvc-lt-auto', autoSwitch.checked ? '1' : '0'); } catch { /* no storage */ }
      log(autoSwitch.checked ? 'Modo automático activado: lo nuevo se traducirá mientras esta pestaña siga abierta.' : 'Modo automático desactivado.');
      schedulePoll();
    });
    if (autoSwitch.checked) log('Modo automático activo. Pulsa el botón una vez para preparar el traductor; después seguirá solo mientras la pestaña esté abierta.');
  }
})();
