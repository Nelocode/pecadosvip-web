<?php
/** Optional, shared information slots. No defaults or records are published automatically. */
if (!defined('ABSPATH')) { exit; }

function pvc_profile_information_defaults(): array {
    $block = array('enabled' => false, 'title' => '', 'body' => '', 'buttonLabel' => '', 'pageKey' => '');
    return array('slot1' => $block, 'slot2' => $block, 'slot3' => $block);
}
function pvc_profile_information_sanitize($raw): array {
    $blocks = pvc_profile_information_defaults();
    if (!is_array($raw)) { return $blocks; }
    foreach ($blocks as $slot => &$block) {
        $input = $raw[$slot] ?? array();
        if (!is_array($input)) { continue; }
        $block['enabled'] = in_array($input['enabled'] ?? false, array(true, 1, '1'), true);
        foreach (array('title', 'body', 'buttonLabel', 'pageKey') as $field) {
            if (!is_string($input[$field] ?? null)) { continue; }
            $block[$field] = $field === 'body' ? sanitize_textarea_field($input[$field]) : ($field === 'pageKey' ? (preg_match('/^wp:[1-9][0-9]*$/D', $input[$field]) ? $input[$field] : sanitize_key($input[$field])) : sanitize_text_field($input[$field]));
        }
    }
    unset($block);
    return $blocks;
}
function pvc_profile_information(string $locale): array {
    if (!isset(pvc_locales()[$locale])) { return array(); }
    return pvc_profile_information_sanitize(get_option('pvc_profile_information_' . $locale, array()));
}
/** Standard pages keep WordPress permalinks; their IDs cannot collide with legacy pv_key values. */
function pvc_profile_information_wp_page(int $id): ?array {
    if ($id < 1) { return null; }
    $post = get_post($id);
    if (!$post || $post->post_type !== 'page' || $post->post_status !== 'publish' || $post->post_password !== '') { return null; }
    $url = get_permalink($post);
    if (!is_string($url) || !preg_match('#^https?://#i', $url)) { return null; }
    return array('key' => 'wp:' . $id, 'title' => get_the_title($post), 'url' => $url, 'source' => 'wordpress');
}
function pvc_profile_information_native_page(array $page, string $locale): ?array {
    $path = pvc_suffix('pv_page', $page['key'], $page['data']);
    if (($path === '' && ($page['data']['kind'] ?? '') !== 'home') || ($path !== '' && (!preg_match('#^[a-z0-9]+(?:[-/][a-z0-9]+)*$#D', $path) || preg_match('#^(wp-|api(?:/|$)|es(?:/|$)|en(?:/|$)|fr(?:/|$)|it(?:/|$))#', $path)))) { return null; }
    return array('key' => $page['key'], 'title' => $page['title'], 'url' => home_url('/' . $locale . ($path !== '' ? '/' . $path : '')), 'source' => 'pecadosvip');
}
/** Resolve at render time too, so an unpublished destination never leaves a public button. */
function pvc_profile_information_destination(string $key, string $locale): ?array {
    if (!isset(pvc_locales()[$locale])) { return null; }
    if (preg_match('/^wp:([1-9][0-9]*)$/D', $key, $match)) {
        $id = (int) $match[1];
        return (string) $id === $match[1] ? pvc_profile_information_wp_page($id) : null;
    }
    $page = pvc_record('page', $locale, $key);
    return $page ? pvc_profile_information_native_page($page, $locale) : null;
}
function pvc_profile_information_pages(string $locale): array {
    if (!isset(pvc_locales()[$locale])) { return array(); }
    $pages = array();
    // Standard WordPress pages have no pv_locale. The editor chooses their language manually.
    foreach (get_posts(array('post_type' => 'page', 'post_status' => 'publish', 'has_password' => false, 'posts_per_page' => -1, 'orderby' => array('title' => 'ASC', 'ID' => 'ASC'), 'suppress_filters' => false)) as $post) {
        $destination = pvc_profile_information_wp_page((int) $post->ID);
        if ($destination) { $pages[$destination['key']] = $destination; }
    }
    foreach (pvc_records('page', $locale) as $page) {
        $destination = pvc_profile_information_native_page($page, $locale);
        if ($destination) { $pages[$destination['key']] = $destination; }
    }
    return $pages;
}
function pvc_profile_information_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    $locale = sanitize_key(wp_unslash($_GET['lang'] ?? 'es'));
    if (!isset(pvc_locales()[$locale])) { $locale = 'es'; }
    $blocks = pvc_profile_information($locale);
    $pages = pvc_profile_information_pages($locale);
    echo '<div class="wrap pvc-admin"><h1>Bloques informativos del perfil</h1><p>Estos tres espacios se comparten entre todas las páginas individuales de perfiles, también las que crees después. Cada idioma tiene sus propios textos.</p><p>Escribe tu contenido, elige una página si quieres un botón y marca «Mostrar este bloque». Los espacios vacíos o desactivados no aparecen en la web. Los bloques existentes de otras secciones se conservan.</p><nav class="nav-tab-wrapper">';
    foreach (pvc_locales() as $code => $label) {
        echo '<a class="nav-tab ' . ($code === $locale ? 'nav-tab-active' : '') . '" href="' . esc_url(add_query_arg(array('page' => 'pvc-profile-information', 'lang' => $code), admin_url('admin.php'))) . '">' . esc_html($label) . '</a>';
    }
    echo '</nav>';
    if (isset($_GET['saved'])) { echo '<div class="notice notice-success inline"><p>Bloques guardados para este idioma.</p></div>'; }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="pvc_save_profile_information"><input type="hidden" name="locale" value="' . esc_attr($locale) . '">';
    wp_nonce_field('pvc_profile_information_' . $locale, 'pvc_profile_information_nonce');
    foreach ($blocks as $slot => $block) {
        $number = substr($slot, -1); $prefix = 'blocks[' . $slot . ']'; $id = 'pvc-info-' . $slot;
        echo '<fieldset class="pvc-information-fieldset"><legend><h2>Bloque ' . esc_html($number) . '</h2></legend>';
        echo '<p><label><input type="checkbox" name="' . esc_attr($prefix . '[enabled]') . '" value="1" ' . checked($block['enabled'], true, false) . '> Mostrar este bloque</label></p>';
        echo '<p><label for="' . esc_attr($id . '-title') . '"><strong>Título</strong></label><br><input class="large-text" id="' . esc_attr($id . '-title') . '" name="' . esc_attr($prefix . '[title]') . '" value="' . esc_attr($block['title']) . '"></p>';
        echo '<p><label for="' . esc_attr($id . '-body') . '"><strong>Texto</strong></label><br><textarea class="large-text" rows="6" id="' . esc_attr($id . '-body') . '" name="' . esc_attr($prefix . '[body]') . '">' . esc_textarea($block['body']) . '</textarea><span class="description">Texto plano. Se conservan los saltos de línea.</span></p>';
        echo '<p><label for="' . esc_attr($id . '-button') . '"><strong>Texto del botón (opcional)</strong></label><br><input class="regular-text" id="' . esc_attr($id . '-button') . '" name="' . esc_attr($prefix . '[buttonLabel]') . '" value="' . esc_attr($block['buttonLabel']) . '" placeholder="LEE NUESTRA GUÍA"></p>';
        echo '<p><label for="' . esc_attr($id . '-page') . '"><strong>Página de destino (opcional)</strong></label><br><select style="width:100%;max-width:60rem" id="' . esc_attr($id . '-page') . '" name="' . esc_attr($prefix . '[pageKey]') . '"><option value="">Sin enlace</option>';
        if ($block['pageKey'] !== '' && !isset($pages[$block['pageKey']])) {
            echo '<option value="' . esc_attr($block['pageKey']) . '" selected>Página no disponible · ' . esc_html($block['pageKey']) . '</option>';
        }
        foreach (array('wordpress' => 'Páginas de WordPress', 'pecadosvip' => 'Páginas de PecadosVip · ' . pvc_locales()[$locale]) as $source => $group) {
            echo '<optgroup label="' . esc_attr($group) . '">';
            foreach ($pages as $key => $page) {
                if ($page['source'] !== $source) { continue; }
                $label = (trim($page['title']) !== '' ? $page['title'] : '(Sin título)') . ' — ' . $page['url'];
                echo '<option value="' . esc_attr($key) . '" ' . selected($block['pageKey'], $key, false) . '>' . esc_html($label) . '</option>';
            }
            echo '</optgroup>';
        }
        echo '</select><br><span class="description">Puedes elegir páginas publicadas desde «Páginas» de WordPress o «Páginas de la web» de PecadosVip. Las de PecadosVip corresponden a este idioma; para las de WordPress, elige la versión que necesites. El botón necesita texto y una página pública sin contraseña.</span></p></fieldset><hr>';
    }
    submit_button('Guardar bloques de este idioma'); echo '</form></div>';
}
add_action('admin_menu', function() {
    add_submenu_page('pecadosvip-content', 'Bloques informativos del perfil', 'Bloques del perfil', 'manage_options', 'pvc-profile-information', 'pvc_profile_information_admin');
}, 20);
add_action('admin_post_pvc_save_profile_information', function() {
    if (!current_user_can('manage_options')) { wp_die('No tienes permisos para editar estos bloques.', '', array('response' => 403)); }
    $locale = sanitize_key(wp_unslash($_POST['locale'] ?? ''));
    if (!isset(pvc_locales()[$locale])) { wp_die('Idioma no válido.', '', array('response' => 400)); }
    check_admin_referer('pvc_profile_information_' . $locale, 'pvc_profile_information_nonce');
    $blocks = pvc_profile_information_sanitize(wp_unslash($_POST['blocks'] ?? array()));
    $option = 'pvc_profile_information_' . $locale;
    if (get_option($option, null) !== $blocks && !update_option($option, $blocks, false)) { wp_die('No se pudieron guardar los bloques. Inténtalo de nuevo.', '', array('response' => 500)); }
    pvc_bump();
    wp_safe_redirect(add_query_arg(array('page' => 'pvc-profile-information', 'lang' => $locale, 'saved' => 1), admin_url('admin.php'))); exit;
});
