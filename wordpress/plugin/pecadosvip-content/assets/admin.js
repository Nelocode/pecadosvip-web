(function ($) {
  'use strict';
  const config = window.pvcAdmin || {};
  // Keep the block editor's REST save and the visual fields in sync. Without this,
  // a new record could publish before WordPress submits its legacy meta-box form.
  function syncEditorMeta() {
    if (!window.wp?.data || !document.getElementById('pvc-key')) return;
    const store = wp.data.select('core/editor');
    if (!store?.getEditedPostAttribute) return;
    const data = {};
    Object.entries(config.fields || {}).forEach(([key, schema]) => {
      const controls = Array.from(document.getElementsByName('pvc_data[' + key + ']'));
      const arrayControls = Array.from(document.getElementsByName('pvc_data[' + key + '][]'));
      if (schema.type === 'boolean') data[key] = controls.some(input => input.type === 'checkbox' && input.checked);
      else if (schema.type === 'array') {
        const values = arrayControls.length ? arrayControls.filter(input => input.type !== 'checkbox' || input.checked).map(input => input.value) : (controls[0]?.value || '').split(/\r?\n/);
        data[key] = values.filter(Boolean).map(value => schema.items.type === 'integer' ? Number(value) : value.trim()).filter(value => value !== '');
      } else if (controls.length) data[key] = schema.type === 'integer' ? Number(controls[0].value) : controls[0].value;
    });
    wp.data.dispatch('core/editor').editPost({ meta: { ...(store.getEditedPostAttribute('meta') || {}), pv_key: document.getElementById('pvc-key').value, pv_locale: document.getElementById('pvc-locale').value, pv_data: data } });
  }
  $(document).on('input change', '#pvc-identity input, #pvc-identity textarea, #pvc-identity select', syncEditorMeta);
  function mediaItem(item, name) {
    const li = $('<li>').attr('data-id', item.id);
    $('<img>').attr({ src: item.sizes?.thumbnail?.url || item.url, alt: item.alt || '' }).appendTo(li);
    $('<input type="hidden">').attr({ name: name + '[]', value: item.id }).appendTo(li);
    const controls = $('<div>').appendTo(li);
    [['pvc-earlier', '↑', 'Mover antes'], ['pvc-later', '↓', 'Mover después'], ['pvc-remove', 'Quitar', 'Quitar imagen de la galería']].forEach(([cls, label, aria]) => {
      $('<button type="button" class="button">').addClass(cls).text(label).attr('aria-label', aria).appendTo(controls);
    });
    return li;
  }
  $('.pvc-gallery').sortable({ items: '> li', tolerance: 'pointer', update: syncEditorMeta });
  $(document).on('click', '.pvc-add-gallery', function () {
    const wrapper = $(this).closest('.pvc-gallery-control');
    const frame = wp.media({ title: config.mediaTitle, library: { type: 'image' }, button: { text: config.mediaUse }, multiple: true });
    frame.on('select', () => { frame.state().get('selection').toJSON().forEach(item => {
      if (!wrapper.find('li[data-id="' + item.id + '"]').length) wrapper.find('.pvc-gallery').append(mediaItem(item, wrapper.attr('data-name')));
    }); syncEditorMeta(); });
    frame.open();
  }).on('click', '.pvc-remove', function () { $(this).closest('li').remove(); syncEditorMeta(); })
    .on('click', '.pvc-earlier', function () { const item = $(this).closest('li'); item.insertBefore(item.prev()); syncEditorMeta(); })
    .on('click', '.pvc-later', function () { const item = $(this).closest('li'); item.insertAfter(item.next()); syncEditorMeta(); })
    .on('click', '.pvc-choose-single', function () {
      const wrapper = $(this).closest('.pvc-media-single');
      const frame = wp.media({ title: config.mediaTitle, library: { type: 'image' }, button: { text: 'Usar esta imagen' }, multiple: false });
      frame.on('select', () => { const item = frame.state().get('selection').first().toJSON(); wrapper.find('input').val(item.id); wrapper.find('img').attr({ src: item.sizes?.medium?.url || item.url, alt: item.alt || '' }).prop('hidden', false); }); frame.open();
    }).on('click', '.pvc-clear-single', function () { const wrapper = $(this).closest('.pvc-media-single'); wrapper.find('input').val('0'); wrapper.find('img').attr('src', '').prop('hidden', true); });
  $('#pvc-import').on('click', async function () {
    const button = $(this); const status = $('#pvc-import-status'); button.prop('disabled', true); let offset = 0, created = 0, skipped = 0;
    try {
      while (true) {
        status.text('Importando… ' + offset + ' contenidos procesados.');
        const response = await $.post(config.ajaxUrl, { action: 'pvc_import_seed', nonce: config.importNonce, offset });
        if (!response.success) throw new Error(response.data?.message || 'No se pudo completar la importación.');
        const result = response.data; created += result.created; skipped += result.skipped; offset = result.next;
        if (result.complete) { status.text('Importación terminada: ' + created + ' creados; ' + skipped + ' ya existentes.'); break; }
      }
    } catch (error) { status.text((error.responseJSON?.data?.message || error.message || 'Importación interrumpida.') + ' Puedes pulsar Importar de nuevo para continuar.'); }
    finally { button.prop('disabled', false); }
  });
})(jQuery);
