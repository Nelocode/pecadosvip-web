<?php
if (!defined('ABSPATH')) { exit; }
add_action('admin_menu', static function() {
    add_submenu_page('pecadosvip-content', 'Plan SEO proactivo', 'Plan SEO proactivo', 'manage_options', 'pecadosvip-seo-growth', 'pvc_growth_admin');
});
function pvc_growth_validate_target(array $input, array $inventory) {
    $post_id = absint($input['post_id'] ?? 0); $query = trim(sanitize_text_field($input['query'] ?? ''));
    $country = sanitize_key($input['country'] ?? 'esp'); $device = sanitize_key($input['device'] ?? 'all');
    $goal = (int) ($input['goal'] ?? 3);
    if (!$post_id || $query === '' || mb_strlen($query) > 150 || !in_array($country, array('esp', 'fra', 'gbr', 'ita', 'deu', 'usa'), true) || !in_array($device, array('all', 'mobile', 'desktop', 'tablet'), true) || $goal < 1 || $goal > 10) {
        return new WP_Error('target_invalid', 'Selecciona una página, una consulta de hasta 150 caracteres y una meta entre 1 y 10.');
    }
    foreach ($inventory as $row) {
        if ((int) $row['record']['id'] === $post_id && pvc_seo_record_allowed($row['record'])) { return array('post_id' => $post_id, 'query' => $query, 'country' => $country, 'device' => $device, 'goal' => $goal); }
    }
    return new WP_Error('target_excluded', 'El objetivo debe ser una página informativa publicada (información, acerca de, contacto o legal), elegible y sin restricciones.');
}
add_action('admin_post_pvc_growth_save', 'pvc_growth_save');
function pvc_growth_save(): void {
    if (!current_user_can('manage_options')) { wp_die('No tienes permiso.', '', array('response' => 403)); }
    check_admin_referer('pvc_growth_save');
    $input = array();
    foreach (array('operation', 'post_id', 'query', 'country', 'device', 'goal', 'target_id', 'action_id', 'fingerprint', 'state', 'property') as $key) {
        $input[$key] = isset($_POST[$key]) && is_string($_POST[$key]) ? wp_unslash($_POST[$key]) : '';
    }
    $operation = $input['operation'];
    if ($operation === 'target') {
        $target = pvc_growth_validate_target($input, pvc_seo_inventory());
        if (is_wp_error($target)) { wp_die(esc_html($target->get_error_message()), '', array('response' => 400)); }
        $targets = pvc_growth_targets(); $id = pvc_growth_target_key($target);
        if (count($targets) >= 12 && !isset($targets[$id])) { wp_die('Máximo 12 objetivos activos. Retira uno antes de añadir otro.', '', array('response' => 400)); }
        $targets[$id] = $target; update_option('pvc_growth_targets', $targets, false);
    } elseif ($operation === 'remove') {
        $targets = pvc_growth_targets(); $id = sanitize_key($input['target_id']); unset($targets[$id]); update_option('pvc_growth_targets', $targets, false);
        $data = (array) get_option('pvc_growth_measurements', array()); unset($data[$id]); update_option('pvc_growth_measurements', $data, false);
    } elseif ($operation === 'settings') {
        $property = sanitize_text_field($input['property']);
        if ($property !== '' && !pvc_growth_property_valid($property)) { wp_die('La propiedad debe coincidir exactamente con sc-domain:dominio o con la URL de esta instalación terminada en /.', '', array('response' => 400)); }
        if (isset($_POST['sync']) && ($property === '' || !pvc_growth_credentials_ready())) { wp_die('Configura la propiedad y el acceso OAuth del alojamiento antes de habilitar la sincronización.', '', array('response' => 400)); }
        update_option('pvc_growth_settings', array('property' => $property, 'sync' => isset($_POST['sync'])), false); pvc_growth_schedule();
    } elseif ($operation === 'action') {
        $plan = (array) get_option('pvc_growth_plan', array()); $id = sanitize_key($input['action_id']);
        if (isset($plan['actions'][$id]) && hash_equals($plan['actions'][$id]['fingerprint'], $input['fingerprint']) && in_array($input['state'], array('pending', 'working', 'reviewed'), true)) { $plan['actions'][$id]['state'] = $input['state']; update_option('pvc_growth_plan', $plan, false); }
    } elseif ($operation === 'unlock') {
        $lock = (int) get_option('pvc_growth_lock', 0);
        if ($lock && $lock < time() - 300) { delete_option('pvc_growth_lock'); }
    } elseif ($operation === 'sync') { pvc_growth_sync(); }
    elseif ($operation === 'discover') { pvc_growth_discover(); }
    // Manual action states are retained only while their evidence is unchanged.
    pvc_seo_audit();
    wp_safe_redirect(admin_url('admin.php?page=pecadosvip-seo-growth')); exit;
}
function pvc_growth_form(string $operation): void {
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="pvc_growth_save"><input type="hidden" name="operation" value="' . esc_attr($operation) . '">'; wp_nonce_field('pvc_growth_save');
}
function pvc_growth_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    $settings = pvc_growth_settings(); $plan = (array) get_option('pvc_growth_plan', array()); $data = (array) get_option('pvc_growth_measurements', array()); $targets = pvc_growth_targets();
    echo '<div class="wrap"><h1>Plan SEO proactivo</h1><p><strong>Objetivo: acercarnos a los primeros resultados y sostener la visibilidad.</strong> El ciclo es medir, priorizar, revisar el contenido y comparar su evolución. Meta inicial sugerida: posición media de 3 o mejor.</p><p>Las mejoras técnicas del SEO automático se aplican al servir las páginas. Las acciones de este plan requieren revisión editorial; marcarlas como revisadas no publica cambios ni acredita mejoras en Google.</p>';
    echo '<div class="notice notice-info inline"><p>La medición compara dos períodos consecutivos de 28 días con datos finales de Search Console. El período termina tres días antes de hoy, según la zona horaria de Google. La ciudad se identifica por su página; el filtro geográfico mide país, no un puesto exacto en una ciudad. No se garantizan primeras posiciones.</p></div>';
    echo '<p><a class="button" href="' . esc_url(admin_url('admin.php?page=pecadosvip-seo')) . '">Abrir diagnóstico técnico</a></p><h2>Prioridades de trabajo</h2>';
    $audit = (array) get_option('pvc_seo_report', array());
    if (!$plan || ($audit['revision'] ?? '') !== pvc_revision()) { echo '<p><strong>Actualiza el plan para incorporar los cambios editoriales recientes.</strong></p>'; }
    pvc_growth_form('refresh'); submit_button('Actualizar plan', 'secondary'); echo '</form>';
    $pending = count(array_filter($plan['actions'] ?? array(), static fn($a) => $a['state'] === 'pending'));
    echo '<p>' . (int) $pending . ' acciones pendientes. Los avisos se mantienen en este panel; no se envían correos.</p><div style="overflow-x:auto"><table class="widefat striped"><thead><tr><th>Prioridad</th><th>Acción y evidencia</th><th>Seguimiento</th></tr></thead><tbody>';
    // Keep the panel bounded; the full technical inventory is available in SEO automático.
    foreach (array_slice($plan['actions'] ?? array(), 0, 50, true) as $id => $action) {
        echo '<tr><td>' . ($action['priority'] <= 20 ? 'Alta' : ($action['priority'] <= 40 ? 'Media' : 'Seguimiento')) . '</td><td><strong>' . esc_html($action['action']) . '</strong><p>' . esc_html($action['reason']) . '</p>';
        if ($action['post_id']) { echo '<a href="' . esc_url(get_edit_post_link($action['post_id'])) . '">Revisar página</a>'; }
        echo '</td><td>'; pvc_growth_form('action');
        echo '<input type="hidden" name="action_id" value="' . esc_attr($id) . '"><input type="hidden" name="fingerprint" value="' . esc_attr($action['fingerprint']) . '"><label>Estado <select name="state">';
        foreach (array('pending' => 'Pendiente', 'working' => 'En revisión', 'reviewed' => 'Revisada') as $value => $label) { echo '<option value="' . esc_attr($value) . '" ' . selected($action['state'], $value, false) . '>' . esc_html($label) . '</option>'; }
        echo '</select></label> <button class="button">Guardar</button></form></td></tr>';
    }
    echo '</tbody></table></div><p>Se muestran hasta 50 prioridades. El diagnóstico técnico conserva el inventario completo.</p><h2>Búsquedas objetivo</h2><p>Asocia cada búsqueda a una página informativa (información, acerca de, contacto o legal). Perfiles, servicios y catálogos quedan fuera de la optimización. Máximo 12 objetivos; repetir la misma combinación actualiza su meta.</p>';
    pvc_growth_form('target');
    echo '<p><label>Página <select name="post_id" required><option value="">Selecciona una página</option>';
    foreach (pvc_seo_inventory() as $row) { if (!pvc_seo_record_allowed($row['record'])) { continue; } echo '<option value="' . (int) $row['record']['id'] . '">' . esc_html($row['record']['locale'] . ' · ' . $row['record']['title'] . ' · ' . $row['url']) . '</option>'; }
    echo '</select></label></p><p><label>Búsqueda exacta <input name="query" type="text" maxlength="150" required class="regular-text"></label></p><p><label>País <select name="country">';
    foreach (array('esp' => 'España', 'fra' => 'Francia', 'gbr' => 'Reino Unido', 'ita' => 'Italia', 'deu' => 'Alemania', 'usa' => 'Estados Unidos') as $code => $label) { echo '<option value="' . esc_attr($code) . '">' . esc_html($label) . '</option>'; }
    echo '</select></label> <label>Dispositivo <select name="device"><option value="all">Todos</option><option value="mobile">Móvil</option><option value="desktop">Ordenador</option><option value="tablet">Tableta</option></select></label> <label>Meta de posición media <input name="goal" type="number" min="1" max="10" value="3" required></label></p>'; submit_button('Guardar objetivo'); echo '</form>';
    foreach ($targets as $id => $target) {
        $sample = $data[$id] ?? array();
        echo '<div class="postbox" style="padding:16px"><h3>' . esc_html($target['query']) . '</h3><p>País: ' . esc_html(strtoupper($target['country'])) . ' · Dispositivo: ' . esc_html($target['device']) . ' · Meta media ≤ ' . (int) $target['goal'] . '</p>';
        if (!empty($sample['time'])) { echo '<p>Última medición válida: ' . esc_html(wp_date('d/m/Y H:i T', $sample['time'])) . '. <strong>' . ($sample['time'] < time() - 3 * DAY_IN_SECONDS ? 'Datos desactualizados.' : 'Datos históricos de Search Console.') . '</strong></p>'; }
        if (!empty($sample['url'])) { echo '<p>URL medida: ' . esc_html($sample['url']) . '</p>'; }
        if (!empty($sample['error'])) { echo '<p><strong>' . esc_html($sample['error']) . '</strong></p>'; }
        if (($sample['property'] ?? '') !== $settings['property']) { echo '<p>Sin medición para la propiedad seleccionada.</p>'; }
        else {
            foreach (array('current' => 'Período actual', 'previous' => 'Período anterior') as $period => $label) {
                $metric = $sample[$period] ?? null; echo '<p><strong>' . esc_html($label) . '</strong> ' . esc_html(implode(' — ', $sample['periods'][$period] ?? array())) . ': ';
                echo $metric ? esc_html('Clics ' . $metric['clicks'] . ' · Impresiones ' . $metric['impressions'] . ' · CTR ' . round(100 * $metric['ctr'], 2) . '% · Posición media ' . round($metric['position'], 2)) : 'Sin observaciones devueltas. No se infiere una posición.'; echo '</p>';
            }
        }
        pvc_growth_form('remove'); echo '<input type="hidden" name="target_id" value="' . esc_attr($id) . '"><button class="button">Retirar objetivo y su historial</button></form></div>';
    }
    $discovery = (array) get_option('pvc_growth_discovery', array());
    echo '<h2>Oportunidades descubiertas en España</h2><p>Consultas observadas con al menos 30 impresiones y posición media entre 3 y 20, asociadas a páginas elegibles. Muestra de hasta 500 filas devueltas por Google, ordenadas por clics; no representa todas las búsquedas del nicho. Se priorizan aquí hasta 20 por impresiones.</p>';
    if (!empty($discovery['error'])) { echo '<p>' . esc_html($discovery['error']) . '</p>'; }
    $discovery_fresh = !empty($discovery['time']) && $discovery['time'] >= time() - 3 * DAY_IN_SECONDS && ($discovery['property'] ?? '') === $settings['property'] && empty($discovery['error']);
    if (!$discovery_fresh) { echo '<p>Sin descubrimiento reciente válido para esta propiedad. Configura la conexión y consulta Google.</p>'; }
    else {
        echo '<p>Período: ' . esc_html(implode(' — ', $discovery['period'])) . '. Datos actualizados: ' . esc_html(wp_date('d/m/Y H:i T', $discovery['time'])) . '.</p>';
        foreach ($discovery['rows'] as $row) {
            echo '<div class="postbox" style="padding:12px"><strong>' . esc_html($row['query']) . '</strong><p>' . esc_html($row['url']) . '<br>Impresiones: ' . esc_html((string) $row['impressions']) . ' · Posición media: ' . esc_html((string) round($row['position'], 2)) . '</p>';
            pvc_growth_form('target');
            foreach (array('post_id' => $row['post_id'], 'query' => $row['query'], 'country' => 'esp', 'device' => 'all', 'goal' => 3) as $key => $value) { echo '<input type="hidden" name="' . esc_attr($key) . '" value="' . esc_attr((string) $value) . '">'; }
            echo '<button class="button">Añadir al seguimiento con meta 3</button></form></div>';
        }
        if (!$discovery['rows']) { echo '<p>No se encontraron oportunidades con esos criterios en la muestra recibida. No significa ausencia de demanda.</p>'; }
    }
    pvc_growth_form('discover'); submit_button('Buscar oportunidades ahora', 'secondary'); echo '</form>';
    echo '<h2>Conexión con Google Search Console</h2><p>Estado del acceso: <strong>' . (pvc_growth_credentials_ready() ? 'credenciales presentes; verifica una consulta real' : 'pendiente de configurar en el alojamiento') . '</strong>. Los secretos no se introducen ni se muestran en este panel.</p><p>Verifica primero la propiedad en <a href="https://search.google.com/search-console/">Search Console</a>. Después configura el acceso OAuth de solo lectura siguiendo la guía de entrega.</p>';
    pvc_growth_form('settings'); echo '<p><label>Propiedad <input class="regular-text" name="property" value="' . esc_attr($settings['property']) . '" placeholder="sc-domain:pecadosvip.com"></label></p><p><label><input name="sync" type="checkbox" value="1" ' . checked((bool) $settings['sync'], true, false) . '> Activar sincronización automática de solo lectura</label></p>'; submit_button('Guardar conexión'); echo '</form>';
    $next = wp_next_scheduled('pvc_growth_sync');
    echo '<p>Próxima sincronización: ' . esc_html($next ? wp_date('d/m/Y H:i T', $next) : 'desactivada') . '. Se consulta un objetivo por hora y se reserva un turno diario para descubrir oportunidades; con 12 objetivos, una vuelta requiere aproximadamente 13 horas cuando funciona el cron.</p>';
    if ((defined('DISABLE_WP_CRON') && DISABLE_WP_CRON) || ($next && $next < time() - HOUR_IN_SECONDS)) { echo '<p><strong>Comprueba el cron del alojamiento: la programación no prueba su ejecución.</strong></p>'; }
    pvc_growth_form('sync'); submit_button('Consultar siguiente objetivo', 'secondary'); echo '</form>';
    $lock = (int) get_option('pvc_growth_lock', 0);
    if ($lock && $lock < time() - 300) { echo '<p>Un intento anterior quedó interrumpido. Tras comprobarlo, libera el bloqueo para reanudar.</p>'; pvc_growth_form('unlock'); submit_button('Liberar bloqueo antiguo', 'secondary'); echo '</form>'; }
    echo '</div>';
}
