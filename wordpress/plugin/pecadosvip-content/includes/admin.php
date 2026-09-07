<?php
if (!defined('ABSPATH')) { exit; }

add_action('admin_menu', function() {
    add_menu_page('PecadosVip', 'PecadosVip', 'edit_posts', 'pecadosvip-content', 'pvc_dashboard', 'dashicons-palmtree', 25);
    add_submenu_page('pecadosvip-content', 'Textos, cabecera y pie', 'Textos y diseño', 'manage_options', 'pecadosvip-copy', 'pvc_copy_admin');
});
add_action('admin_notices', function() {
    $message = get_transient('pvc_notice_' . get_current_user_id());
    if ($message) { delete_transient('pvc_notice_' . get_current_user_id()); echo '<div class="notice notice-warning"><p>' . esc_html($message) . '</p></div>'; }
});
function pvc_dashboard(): void {
    if (!current_user_can('edit_posts')) { return; }
    echo '<div class="wrap pvc-admin"><h1>PecadosVip · Contenido editable</h1><p>Los cambios publicados aquí aparecen en la web sin compilar el tema. Cada idioma tiene su propio contenido y estado de publicación.</p><div class="pvc-dashboard">';
    foreach (pvc_types() as $type => $labels) { echo '<a class="pvc-dashboard-card" href="' . esc_url(admin_url('edit.php?post_type=' . $type)) . '"><span class="dashicons ' . esc_attr($labels[2]) . '"></span><strong>' . esc_html($labels[0]) . '</strong><span>Editar títulos, textos, imágenes y orden</span></a>'; }
    echo '</div><h2>Cómo editar</h2><ol><li>Entra en Perfiles, Servicios, Ciudades o Páginas de la web y selecciona el idioma.</li><li>Edita el título, contenido y extracto. Usa Imagen destacada y Galería para cambiar las fotografías.</li><li>Guarda como borrador para continuar después, pulsa Vista previa para revisar y Publicar/Actualizar para mostrar el cambio.</li><li>En Textos y diseño puedes cambiar cabecera, navegación, botones, pie y demás mensajes por idioma.</li></ol><p>La biblioteca de medios y los contenidos permanecen en WordPress al cambiar de tema. Las funciones comerciales del backend original no se activan desde este panel.</p>';
    if (current_user_can('manage_options')) {
        echo '<h2>Importar el contenido inicial</h2><p>Importa el catálogo y las imágenes locales incluidos en el tema. No reemplaza contenidos ni ajustes que ya existan. Puedes repetir la importación si se interrumpe.</p><button type="button" class="button button-primary" id="pvc-import">Importar contenido inicial</button> <span id="pvc-import-status" role="status" aria-live="polite"></span>';
    }
    echo '</div>';
}
add_action('admin_enqueue_scripts', function($hook) {
    $screen = get_current_screen();
    if (!$screen || (!isset(pvc_types()[$screen->post_type ?? '']) && strpos($hook, 'pecadosvip') === false)) { return; }
    wp_enqueue_media(); wp_enqueue_script('jquery-ui-sortable');
    wp_enqueue_script('pecadosvip-content-admin', plugins_url('../assets/admin.js', __FILE__), array('jquery', 'jquery-ui-sortable', 'wp-data'), PVC_VERSION, true);
    wp_enqueue_style('pecadosvip-content-admin', plugins_url('../assets/admin.css', __FILE__), array(), PVC_VERSION);
    wp_localize_script('pecadosvip-content-admin', 'pvcAdmin', array('ajaxUrl' => admin_url('admin-ajax.php'), 'importNonce' => wp_create_nonce('pvc_import'), 'mediaTitle' => 'Seleccionar imágenes', 'mediaUse' => 'Usar estas imágenes', 'fields' => isset(pvc_types()[$screen->post_type ?? '']) ? pvc_fields($screen->post_type) : array()));
});
add_action('add_meta_boxes', function() {
    foreach (pvc_types() as $type => $labels) { add_meta_box('pvc-identity', 'Idioma, clave y datos', 'pvc_meta_box', $type, 'normal', 'high'); }
});
function pvc_select(string $name, array $options, string $value, string $id = ''): void {
    echo '<select name="' . esc_attr($name) . '" id="' . esc_attr($id) . '">';
    foreach ($options as $key => $label) { echo '<option value="' . esc_attr($key) . '" ' . selected($value, (string) $key, false) . '>' . esc_html($label) . '</option>'; }
    echo '</select>';
}
function pvc_gallery_control(string $name, array $ids): void {
    echo '<div class="pvc-gallery-control" data-name="' . esc_attr($name) . '"><input type="hidden" name="' . esc_attr($name) . '[]" value=""><ul class="pvc-gallery">';
    foreach ($ids as $id) {
        $media = pvc_media($id); if (!$media) { continue; }
        echo '<li data-id="' . esc_attr((string) $id) . '"><img src="' . esc_url($media['url']) . '" alt="' . esc_attr($media['alt']) . '"><input type="hidden" name="' . esc_attr($name) . '[]" value="' . esc_attr((string) $id) . '"><div><button type="button" class="button pvc-earlier" aria-label="Mover antes">↑</button><button type="button" class="button pvc-later" aria-label="Mover después">↓</button><button type="button" class="button pvc-remove" aria-label="Quitar imagen de la galería">Quitar</button></div></li>';
    }
    echo '</ul><button type="button" class="button pvc-add-gallery">Añadir imágenes</button><p class="description">Arrastra las imágenes o usa las flechas para cambiar el orden. Quitar de la galería conserva el archivo en la biblioteca de medios.</p></div>';
}
function pvc_meta_box(WP_Post $post): void {
    wp_nonce_field('pvc_meta', 'pvc_meta_nonce');
    $locale = get_post_meta($post->ID, 'pv_locale', true) ?: 'es'; $key = get_post_meta($post->ID, 'pv_key', true); $data = pvc_sanitize_data(get_post_meta($post->ID, 'pv_data', true), $post->post_type);
    echo '<div class="pvc-admin"><p><label for="pvc-locale"><strong>Idioma</strong></label><br>';
    pvc_select('pvc_locale', pvc_locales(), $locale, 'pvc-locale');
    echo '</p><p><label for="pvc-key"><strong>Clave de la ruta</strong></label><br><input id="pvc-key" type="text" name="pvc_key" value="' . esc_attr($key) . '" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="ejemplo-valeria"><span class="description">Misma clave para las traducciones del mismo contenido. No uses espacios ni acentos.</span></p><div class="pvc-fields">';
    foreach (pvc_fields($post->post_type) as $field => $schema) {
        $value = $data[$field] ?? ($schema['type'] === 'array' ? array() : ''); $name = 'pvc_data[' . $field . ']'; $id = 'pvc-field-' . $field;
        echo '<div class="pvc-field"><label for="' . esc_attr($id) . '"><strong>' . esc_html($schema['label']) . '</strong></label><br>';
        if (($schema['control'] ?? '') === 'gallery') { pvc_gallery_control($name, (array) $value); }
        elseif (in_array($schema['control'] ?? '', array('cities', 'services', 'profiles'), true)) {
            echo '<input type="hidden" name="' . esc_attr($name) . '[]" value="">';
            $related_type = array('cities' => 'city', 'services' => 'service', 'profiles' => 'profile')[$schema['control']];
            $choices = array(); foreach (pvc_records($related_type, $locale) as $city) { $choices[$city['key']] = $city['title']; }
            foreach ((array) $value as $city) { if (!isset($choices[$city])) { $choices[$city] = ucfirst($city); } }
            if (!$choices && $related_type === 'city') { $choices = array('madrid' => 'Madrid', 'barcelona' => 'Barcelona'); }
            if (!$choices) { echo '<p class="description">Publica primero una ficha en este idioma para poder seleccionarla aquí.</p>'; }
            foreach ($choices as $city => $label) { echo '<label class="pvc-check"><input type="checkbox" name="' . esc_attr($name) . '[]" value="' . esc_attr($city) . '" ' . checked(in_array($city, (array) $value, true), true, false) . '> ' . esc_html($label) . '</label>'; }
        } elseif (($schema['control'] ?? '') === 'service-group') {
            echo '<input id="' . esc_attr($id) . '" type="text" name="' . esc_attr($name) . '" value="' . esc_attr((string) $value) . '" list="pvc-service-groups"><datalist id="pvc-service-groups">';
            foreach ((pvc_copy($locale)['services']['groups'] ?? array()) as $group_key => $group) { echo '<option value="' . esc_attr($group_key) . '">' . esc_html($group['label'] ?? $group_key) . '</option>'; }
            echo '</datalist><p class="description">Elige uno de los grupos sugeridos o escribe un nombre para un grupo nuevo.</p>';
        } elseif ($schema['type'] === 'boolean') { echo '<input type="hidden" name="' . esc_attr($name) . '" value="0"><input id="' . esc_attr($id) . '" type="checkbox" name="' . esc_attr($name) . '" value="1" ' . checked((bool) $value, true, false) . '>'; }
        elseif (isset($schema['enum'])) {
            $labels = array_combine($schema['enum'], array_map('ucfirst', $schema['enum']));
            if ($field === 'availability') { $labels = array('available' => 'Disponible', 'limited' => 'Limitada', 'on-request' => 'Bajo consulta', 'unavailable' => 'No disponible'); }
            pvc_select($name, $labels, (string) $value, $id);
        } elseif ($schema['type'] === 'array') { echo '<textarea id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" rows="3">' . esc_textarea(implode("\n", (array) $value)) . '</textarea>'; }
        else { echo '<input id="' . esc_attr($id) . '" type="' . ($schema['type'] === 'integer' ? 'number' : 'text') . '" name="' . esc_attr($name) . '" value="' . esc_attr((string) $value) . '"' . (isset($schema['minimum']) ? ' min="' . (int) $schema['minimum'] . '" max="' . (int) $schema['maximum'] . '" required' : '') . '>'; }
        echo '</div>';
    }
    echo '</div></div>';
}
function pvc_save_meta($id, $post): void {
    if (!isset(pvc_types()[$post->post_type]) || wp_is_post_revision($id) || wp_is_post_autosave($id) || !current_user_can('edit_post', $id) || !isset($_POST['pvc_meta_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['pvc_meta_nonce'])), 'pvc_meta')) { return; }
    $locale = sanitize_key(wp_unslash($_POST['pvc_locale'] ?? '')); $key = sanitize_title(wp_unslash($_POST['pvc_key'] ?? '')); $data = pvc_sanitize_data(wp_unslash($_POST['pvc_data'] ?? array()), $post->post_type);
    $valid = pvc_validate($post->post_type, $locale, $key, $data, $id, get_post_status($id) === 'publish');
    if (is_wp_error($valid)) { set_transient('pvc_notice_' . get_current_user_id(), $valid->get_error_message(), 120); return; }
    update_post_meta($id, 'pv_locale', $locale); update_post_meta($id, 'pv_key', $key); update_post_meta($id, 'pv_data', $data);
}
add_action('save_post', 'pvc_save_meta', 20, 2);

function pvc_flatten(array $data, string $prefix = ''): array {
    $flat = array(); foreach ($data as $key => $value) {
        $path = $prefix === '' ? (string) $key : $prefix . '.' . $key;
        if (is_array($value)) { $flat += pvc_flatten($value, $path); } elseif (is_scalar($value)) { $flat[$path] = $value; }
    } return $flat;
}
function pvc_set_nested(array &$array, string $path, $value): void {
    $keys = explode('.', $path); $cursor =& $array; foreach ($keys as $key) { if (!isset($cursor[$key]) || !is_array($cursor[$key])) { $cursor[$key] = array(); } $cursor =& $cursor[$key]; } $cursor = $value;
}
function pvc_label(string $path): string {
    $names = array('site' => 'Identidad e imágenes', 'hero' => 'Portada', 'nav' => 'Navegación', 'footer' => 'Pie de página', 'home' => 'Inicio', 'services' => 'Servicios', 'profiles' => 'Perfiles', 'cities' => 'Ciudades', 'catalog' => 'Textos generales', 'brandPrimary' => 'Nombre principal de la marca', 'brandSuffix' => 'Segunda parte de la marca', 'logo' => 'Logotipo', 'mosaic' => 'Mosaico de fondo', 'icon' => 'Icono del sitio');
    return implode(' · ', array_map(function($part) use ($names) { return $names[$part] ?? ucfirst(trim((string) preg_replace('/([a-z])([A-Z])/', '$1 $2', $part))); }, explode('.', $path)));
}
function pvc_copy_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    $locale = sanitize_key(wp_unslash($_GET['lang'] ?? 'es')); if (!isset(pvc_locales()[$locale])) { $locale = 'es'; }
    $copy = pvc_copy($locale); $groups = array_keys($copy); $group = sanitize_text_field(wp_unslash($_GET['group'] ?? 'site')); if (!array_key_exists($group, $copy)) { $group = (string) ($groups[0] ?? ''); }
    echo '<div class="wrap pvc-admin"><h1>Textos y diseño</h1><p>Edita un idioma y una sección a la vez. Los cambios se aplican al guardar. Para las fotos de perfiles y servicios usa sus propias fichas.</p><nav class="nav-tab-wrapper">';
    foreach (pvc_locales() as $code => $label) { echo '<a class="nav-tab ' . ($code === $locale ? 'nav-tab-active' : '') . '" href="' . esc_url(add_query_arg(array('page' => 'pecadosvip-copy', 'lang' => $code, 'group' => $group), admin_url('admin.php'))) . '">' . esc_html($label) . '</a>'; }
    echo '</nav><form method="get"><input type="hidden" name="page" value="pecadosvip-copy"><input type="hidden" name="lang" value="' . esc_attr($locale) . '"><p><label for="pvc-group">Sección: </label>';
    pvc_select('group', array_combine($groups, array_map('pvc_label', $groups)) ?: array(), $group, 'pvc-group'); submit_button('Abrir sección', 'secondary', '', false); echo '</p></form>';
    if (!$copy) { echo '<p>Primero importa el contenido inicial desde PecadosVip.</p></div>'; return; }
    if (isset($_GET['saved'])) { echo '<div class="notice notice-success inline"><p>Cambios guardados. Ya están disponibles en la web.</p></div>'; }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="pvc_save_copy"><input type="hidden" name="pvc_locale" value="' . esc_attr($locale) . '"><input type="hidden" name="pvc_group" value="' . esc_attr($group) . '">';
    wp_nonce_field('pvc_copy_' . $locale, 'pvc_copy_nonce');
    $flat = pvc_flatten(array($group => $copy[$group])); echo '<div class="pvc-copy-fields">';
    foreach ($flat as $path => $value) {
        $token = bin2hex($path); $name = 'pvc_copy[' . $token . ']'; $id = 'pvc-copy-' . $token;
        echo '<div class="pvc-copy-field"><label for="' . esc_attr($id) . '"><strong>' . esc_html(pvc_label($path)) . '</strong></label>';
        if (in_array($path, array('site.logo', 'site.hero', 'site.mosaic', 'site.icon'), true)) {
            $image = pvc_media($value);
            echo '<div class="pvc-media-single"><input type="hidden" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" value="' . esc_attr((string) $value) . '"><img src="' . esc_url($image['url'] ?? '') . '" alt="' . esc_attr($image['alt'] ?? '') . '"' . ($image ? '' : ' hidden') . '><button type="button" class="button pvc-choose-single">Elegir imagen</button> <button type="button" class="button pvc-clear-single">Quitar</button></div>';
        } elseif (is_bool($value)) { echo '<input type="hidden" name="' . esc_attr($name) . '" value="0"><input id="' . esc_attr($id) . '" type="checkbox" name="' . esc_attr($name) . '" value="1" ' . checked($value, true, false) . '>'; }
        elseif (is_numeric($value) && !is_string($value)) { echo '<input type="number" step="any" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" value="' . esc_attr((string) $value) . '">'; }
        else { echo '<textarea rows="' . (strlen((string) $value) > 120 ? '3' : '1') . '" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '">' . esc_textarea((string) $value) . '</textarea>'; }
        echo '</div>';
    }
    echo '</div>'; submit_button('Guardar cambios de esta sección'); echo '</form></div>';
}
add_action('admin_post_pvc_save_copy', function() {
    if (!current_user_can('manage_options')) { wp_die('No tienes permisos para editar estos ajustes.', '', array('response' => 403)); }
    $locale = sanitize_key(wp_unslash($_POST['pvc_locale'] ?? '')); if (!isset(pvc_locales()[$locale])) { wp_die('Idioma no válido.', '', array('response' => 400)); }
    check_admin_referer('pvc_copy_' . $locale, 'pvc_copy_nonce');
    $copy = pvc_copy($locale); $group = sanitize_text_field(wp_unslash($_POST['pvc_group'] ?? '')); if (!array_key_exists($group, $copy)) { wp_die('Sección no válida.', '', array('response' => 400)); }
    $schema = pvc_flatten(array($group => $copy[$group])); $overrides = (array) get_option('pvc_copy_' . $locale, array()); $submitted = wp_unslash($_POST['pvc_copy'] ?? array());
    foreach ($schema as $path => $default) {
        $token = bin2hex($path); if (!is_array($submitted) || !array_key_exists($token, $submitted)) { continue; } $value = $submitted[$token];
        if (!is_scalar($value)) { continue; }
        if (in_array($path, array('site.logo', 'site.hero', 'site.mosaic', 'site.icon'), true)) { $value = absint($value); if ($value && !pvc_media($value)) { continue; } }
        elseif (is_bool($default)) { $value = rest_sanitize_boolean($value); }
        elseif (is_int($default)) { $value = (int) $value; }
        elseif (is_float($default)) { $value = (float) $value; }
        else { $value = sanitize_textarea_field((string) $value); }
        pvc_set_nested($overrides, $path, $value);
    }
    update_option('pvc_copy_' . $locale, $overrides, false); pvc_bump();
    wp_safe_redirect(add_query_arg(array('page' => 'pecadosvip-copy', 'lang' => $locale, 'group' => $group, 'saved' => 1), admin_url('admin.php'))); exit;
});

add_action('restrict_manage_posts', function($post_type) {
    if (!isset(pvc_types()[$post_type])) { return; }
    pvc_select('pvc_lang', array('' => 'Todos los idiomas') + pvc_locales(), sanitize_key(wp_unslash($_GET['pvc_lang'] ?? '')));
});
add_action('pre_get_posts', function($query) {
    if (!is_admin() || !$query->is_main_query() || !isset(pvc_types()[$query->get('post_type') ?: ''])) { return; }
    $locale = sanitize_key(wp_unslash($_GET['pvc_lang'] ?? '')); if (isset(pvc_locales()[$locale])) { $query->set('meta_query', array(array('key' => 'pv_locale', 'value' => $locale))); }
});
foreach (array_keys(pvc_types()) as $type) {
    add_filter('manage_' . $type . '_posts_columns', function($columns) { return $columns + array('pvc_locale' => 'Idioma', 'pvc_key' => 'Clave'); });
    add_action('manage_' . $type . '_posts_custom_column', function($column, $id) { if ($column === 'pvc_locale') { echo esc_html(pvc_locales()[get_post_meta($id, 'pv_locale', true)] ?? 'Sin idioma'); } if ($column === 'pvc_key') { echo esc_html(get_post_meta($id, 'pv_key', true)); } }, 10, 2);
}
