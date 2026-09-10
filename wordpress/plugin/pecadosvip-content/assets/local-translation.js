/* Local translation only. The server independently checks eligibility, versions and publication. */
(() => {
  'use strict';
  const config = window.PvcLocalTranslation;
  const status = document.getElementById('pvc-lt-status');
  const run = document.getElementById('pvc-lt-run');
  const stop = document.getElementById('pvc-lt-stop');
  const enable = document.getElementById('pvc-lt-enable');
  if (!config || !status || !run) return;
  let active = false, timer = null;
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
  async function cycle() {
    try {
      const pending = await request('pvc_lt_pending');
      log(`${pending.legacy} identidades Legacy protegidas; ${pending.jobs.length} traducciones pendientes; ${pending.complete} guardadas; ${pending.protected} versiones existentes para conservar o revisar.`);
      for (const job of pending.jobs) {
        if (!active) break;
        const translator = await engine(job.lang);
        const translations = {};
        log(`Traduciendo ${job.title} → ${job.lang}…`);
        for (const [key, text] of Object.entries(job.segments)) {
          if (!active) break;
          translations[key] = await translator.translate(text);
        }
        if (!active) break;
        const saved = await request('pvc_lt_store', {id: job.id, target_id: job.target_id, lang: job.lang, fingerprint: job.fingerprint, translations: JSON.stringify(translations)});
        log(`Guardada ${job.lang}: ${saved.url}`);
      }
      if (active) { log('Esperando nuevas altas. Próxima revisión en 30 segundos.'); timer = setTimeout(cycle, 30000); }
    } catch (error) { log(`Detenido: ${error.message}`); active = false; run.disabled = false; stop.disabled = true; }
  }
  enable?.addEventListener('click', async () => {
    enable.disabled = true;
    try { const result = await request('pvc_lt_enable'); document.getElementById('pvc-lt-policy').textContent = `Alcance activo. Identidades Legacy protegidas: ${result.legacy_count}`; enable.remove(); }
    catch (error) { log(error.message); enable.disabled = false; }
  });
  run.addEventListener('click', async () => {
    if (active) return;
    active = true; run.disabled = true; stop.disabled = false;
    try { // Model creation follows this explicit user gesture; prepare every pair before polling.
      await Promise.all(['en', 'fr', 'it'].map(engine));
      if (active) await cycle();
    } catch (error) { log(`Detenido: ${error.message}`); active = false; run.disabled = false; stop.disabled = true; }
  });
  stop.addEventListener('click', () => { active = false; clearTimeout(timer); run.disabled = false; stop.disabled = true; log('Detenido. Las traducciones guardadas se conservan.'); });
})();
