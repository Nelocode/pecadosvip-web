<?php
if (!defined('ABSPATH')) { exit; }

add_action('init', static function() {
    foreach (array_keys(pvc_types()) as $type) {
        foreach (array('pv_seo_title', 'pv_seo_description', 'pv_seo_noindex') as $key) {
            register_post_meta($type, $key, array('single' => true, 'type' => $key === 'pv_seo_noindex' ? 'boolean' : 'string', 'show_in_rest' => true, 'revisions_enabled' => true, 'sanitize_callback' => $key === 'pv_seo_noindex' ? 'rest_sanitize_boolean' : 'sanitize_text_field', 'auth_callback' => 'pvc_meta_auth'));
        }
    }
}, 20);

add_action('admin_menu', static function() {
    add_submenu_page('pecadosvip-content', 'SEO automático', 'SEO automático', 'manage_options', 'pecadosvip-seo', 'pvc_seo_admin');
});
add_action('admin_post_pvc_seo_save', 'pvc_seo_save_settings');
function pvc_seo_save_settings(): void {
    if (!current_user_can('manage_options')) { wp_die('No tienes permiso.', '', array('response' => 403)); }
    check_admin_referer('pvc_seo_save');
    if (isset($_POST['save_settings'])) {
        $site = isset($_POST['site_url']) && is_string($_POST['site_url']) ? esc_url_raw(wp_unslash($_POST['site_url']), array('https')) : '';
        update_option('pvc_seo_settings', array('enabled' => isset($_POST['enabled']), 'site_url' => untrailingslashit($site), 'daily' => isset($_POST['daily'])), false);
        pvc_seo_schedule();
    }
    pvc_seo_audit();
    wp_safe_redirect(admin_url('admin.php?page=pecadosvip-seo&updated=1'));
    exit;
}
add_action('add_meta_boxes', static function() {
    foreach (array_keys(pvc_types()) as $type) { add_meta_box('pvc-seo', 'SEO automático', 'pvc_seo_metabox', $type, 'normal', 'default'); }
});
function pvc_seo_metabox($post): void {
    if (!pvc_seo_informational(array('id' => $post->ID, 'data' => (array) get_post_meta($post->ID, 'pv_data', true)))) {
        echo '<p>La optimización está limitada a páginas informativas de tipos información, acerca de, contacto o legal. Este contenido conserva las restricciones de indexación.</p>';
        return;
    }
    wp_nonce_field('pvc_seo_meta', 'pvc_seo_nonce');
    echo '<p>Deja los campos vacíos para usar el título y el extracto de esta ficha. Si no hay extracto, se resumirá el comienzo de su texto. Cada idioma conserva sus propios datos.</p>';
    foreach (array('pv_seo_title' => 'Título para buscadores', 'pv_seo_description' => 'Descripción para buscadores') as $key => $label) {
        echo '<p><label for="' . esc_attr($key) . '"><strong>' . esc_html($label) . '</strong></label><br><input class="widefat" id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="' . esc_attr(get_post_meta($post->ID, $key, true)) . '"></p>';
    }
    echo '<p><label><input type="checkbox" name="pv_seo_noindex" value="1" ' . checked((bool) get_post_meta($post->ID, 'pv_seo_noindex', true), true, false) . '> Excluir esta ficha de los buscadores</label></p><p>El contenido marcado como ficticio queda excluido automáticamente. Cambia esa clasificación solo si describe contenido real verificado.</p>';
}
add_action('save_post', 'pvc_seo_save_meta', 30);
function pvc_seo_save_meta($id): void {
    if (!isset(pvc_types()[get_post_type($id)]) || !current_user_can('edit_post', $id) || wp_is_post_revision($id) || wp_is_post_autosave($id)) { return; }
    if (!isset($_POST['pvc_seo_nonce']) || !is_string($_POST['pvc_seo_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['pvc_seo_nonce'])), 'pvc_seo_meta')) { return; }
    foreach (array('pv_seo_title', 'pv_seo_description') as $key) {
        $value = isset($_POST[$key]) && is_string($_POST[$key]) ? sanitize_text_field(wp_unslash($_POST[$key])) : '';
        if ($value === '') { delete_post_meta($id, $key); } else { update_post_meta($id, $key, $value); }
    }
    update_post_meta($id, 'pv_seo_noindex', isset($_POST['pv_seo_noindex']) ? '1' : '');
}
function pvc_seo_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    $settings = pvc_seo_settings(); $report = (array) get_option('pvc_seo_report', array()); $blockers = pvc_seo_blockers();
    $rows = $report['rows'] ?? array();
    $locale = isset($_GET['locale']) && is_string($_GET['locale']) ? sanitize_key(wp_unslash($_GET['locale'])) : '';
    $type = isset($_GET['kind']) && is_string($_GET['kind']) ? sanitize_key(wp_unslash($_GET['kind'])) : '';
    $rows = array_values(array_filter($rows, static fn($row) => (!$locale || $row['locale'] === $locale) && (!$type || $row['type'] === $type)));
    $page = max(1, isset($_GET['seo_page']) ? absint($_GET['seo_page']) : 1); $pages = max(1, (int) ceil(count($rows) / 25)); $page = min($page, $pages);
    echo '<div class="wrap pvc-seo"><h1>SEO automático</h1><p>Mantén las páginas de cada ciudad e idioma preparadas para buscadores. Los metadatos se actualizan al publicar; el diagnóstico se revisa diariamente cuando funciona la programación de WordPress.</p>';
    echo '<div class="notice notice-info inline"><p><strong>Este panel evalúa la preparación técnica y editorial.</strong> Para definir metas, consultar la medición disponible y priorizar acciones, abre el <a href="' . esc_url(admin_url('admin.php?page=pecadosvip-seo-growth')) . '">Plan SEO proactivo</a>. No garantiza primeras posiciones ni confirma indexación.</p></div>';
    if (isset($_GET['updated'])) { echo '<div class="notice notice-success inline"><p>Diagnóstico actualizado.</p></div>'; }
    echo '<h2>' . ($blockers ? 'Indexación bloqueada' : 'Indexación habilitada para las fichas elegibles') . '</h2>';
    if ($blockers) { echo '<ul>'; foreach ($blockers as $issue) { echo '<li>• ' . esc_html($issue) . '</li>'; } echo '</ul>'; }
    echo '<div style="display:flex;gap:16px;flex-wrap:wrap;margin:20px 0">';
    foreach (array('Publicadas' => $report['total'] ?? '—', 'Elegibles por contenido' => $report['eligible'] ?? '—', 'Avisos editoriales' => $report['issues'] ?? '—') as $label => $value) {
        echo '<div class="postbox" style="padding:18px;min-width:180px;margin:0"><strong style="font-size:28px">' . esc_html((string) $value) . '</strong><br>' . esc_html($label) . '</div>';
    }
    echo '</div><p>Elegible significa que el contenido supera las exclusiones locales; sigue sujeto a los bloqueos de la instalación.</p>';
    if ($report) {
        echo '<p>Último diagnóstico: ' . esc_html(wp_date('d/m/Y H:i:s T', $report['time'])) . '. ' . ($report['revision'] !== pvc_revision() ? '<strong>Hay cambios posteriores: actualiza el diagnóstico.</strong>' : 'Corresponde a la revisión editorial actual.') . '</p>';
    } else { echo '<p>Aún no hay un diagnóstico. Pulsa «Analizar ahora».</p>'; }
    $next = wp_next_scheduled('pvc_seo_daily_audit');
    echo '<p>Próxima revisión programada: ' . esc_html($next ? wp_date('d/m/Y H:i T', $next) : 'desactivada') . '.</p>';
    if (defined('DISABLE_WP_CRON') && DISABLE_WP_CRON) { echo '<div class="notice notice-warning inline"><p>WP-Cron está desactivado. El alojamiento debe ejecutar el evento con un cron externo; la programación guardada no acredita su ejecución.</p></div>'; }
    elseif ($next && $next < time() - HOUR_IN_SECONDS) { echo '<div class="notice notice-warning inline"><p>La revisión está atrasada. Comprueba el cron del alojamiento.</p></div>'; }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="pvc_seo_save">'; wp_nonce_field('pvc_seo_save'); submit_button('Analizar ahora', 'secondary', 'audit_only'); echo '</form>';
    echo '<h2>Configuración</h2><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="pvc_seo_save">'; wp_nonce_field('pvc_seo_save');
    echo '<p><label for="pvc-seo-site">URL definitiva, incluida la subcarpeta si existe</label><br><input class="regular-text" type="url" id="pvc-seo-site" name="site_url" placeholder="https://tudominio.com" value="' . esc_attr($settings['site_url']) . '"></p>';
    echo '<p><label><input type="checkbox" name="enabled" value="1" ' . checked((bool) $settings['enabled'], true, false) . '> Habilitar indexación de contenido real publicado en el dominio definitivo</label></p>';
    echo '<p><label><input type="checkbox" name="daily" value="1" ' . checked((bool) $settings['daily'], true, false) . '> Revisar automáticamente cada día</label></p>';
    submit_button('Guardar y analizar', 'primary', 'save_settings'); echo '</form>';
    echo '<h2>Páginas y oportunidades</h2><form method="get"><input type="hidden" name="page" value="pecadosvip-seo"><label for="seo-locale">Idioma </label><select id="seo-locale" name="locale"><option value="">Todos</option>';
    foreach (pvc_locales() as $key => $label) { echo '<option value="' . esc_attr($key) . '" ' . selected($locale, $key, false) . '>' . esc_html($label) . '</option>'; }
    echo '</select> <label for="seo-kind">Contenido </label><select id="seo-kind" name="kind"><option value="">Todos</option>';
    foreach (array('city' => 'Ciudades', 'profile' => 'Perfiles', 'service' => 'Servicios', 'page' => 'Páginas') as $key => $label) { echo '<option value="' . esc_attr($key) . '" ' . selected($type, $key, false) . '>' . esc_html($label) . '</option>'; }
    echo '</select> <button class="button">Filtrar</button></form><br><div style="overflow-x:auto"><table class="widefat striped"><thead><tr><th>Página</th><th>Vista previa orientativa de búsqueda</th><th>Acciones recomendadas</th></tr></thead><tbody>';
    foreach (array_slice($rows, ($page - 1) * 25, 25) as $row) {
        echo '<tr><td><strong>' . esc_html($row['title']) . '</strong><br>' . esc_html(strtoupper($row['locale'])) . '<br><a href="' . esc_url(get_edit_post_link($row['id'])) . '">Editar contenido y SEO</a></td><td><strong>' . esc_html($row['meta']['title']) . '</strong><br><small>' . esc_html($row['url']) . '</small><p>' . esc_html($row['meta']['description']) . '</p></td><td>';
        if (!$row['issues']) { echo 'Sin avisos en estas comprobaciones.'; }
        else { echo '<ul>'; foreach ($row['issues'] as $issue) { echo '<li>' . esc_html($issue) . '</li>'; } echo '</ul>'; }
        echo '</td></tr>';
    }
    if (!$rows) { echo '<tr><td colspan="3">No hay datos para estos filtros. Publica contenido o ejecuta un diagnóstico.</td></tr>'; }
    echo '</tbody></table></div><p>Página ' . (int) $page . ' de ' . (int) $pages . ' · ' . count($rows) . ' resultados. ';
    foreach (array($page - 1 => 'Anterior', $page + 1 => 'Siguiente') as $target => $label) {
        if ($target >= 1 && $target <= $pages) { echo '<a class="button" href="' . esc_url(add_query_arg(array('page' => 'pecadosvip-seo', 'locale' => $locale, 'kind' => $type, 'seo_page' => $target), admin_url('admin.php'))) . '">' . esc_html($label) . '</a> '; }
    }
    echo '</p><h2>Medir resultados reales</h2><p><a href="https://search.google.com/search-console/">Abrir Google Search Console</a>: verifica la propiedad, envía el sitemap y consulta clics, impresiones y posición media. Filtra por país, consulta y páginas de ciudad. La posición media no acredita una posición fija en una ciudad.</p><p>Sitemap de WordPress: <a href="' . esc_url(home_url('/wp-sitemap.xml')) . '">' . esc_html(home_url('/wp-sitemap.xml')) . '</a>. Las rutas de PecadosVip se incorporan cuando superan los bloqueos de indexación.</p><p>Google puede elegir otro título o fragmento. <a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=es">Guía de Google</a> · <a href="https://developers.google.com/search/docs/specialty/explicit/guidelines?hl=es">Contenido para adultos y SafeSearch</a>.</p></div>';
}
