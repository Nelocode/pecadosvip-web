<?php
/**
 * Plugin Name: PecadosVip — Contenido editable
 * Description: Perfiles, servicios, ciudades, páginas y textos multilingües de presentación, editables en WordPress.
 * Version: 1.3.0
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Text Domain: pecadosvip-content
 */
if (!defined('ABSPATH')) { exit; }
define('PVC_VERSION', '1.3.0');
define('PVC_DIR', __DIR__);

function pvc_types(): array {
    return array('pv_profile' => array('Perfiles', 'Perfil', 'dashicons-id-alt'), 'pv_service' => array('Servicios', 'Servicio', 'dashicons-star-filled'), 'pv_city' => array('Ciudades', 'Ciudad', 'dashicons-location-alt'), 'pv_page' => array('Páginas de la web', 'Página de la web', 'dashicons-admin-page'));
}
function pvc_type(string $type): string { return str_starts_with($type, 'pv_') ? $type : 'pv_' . $type; }
function pvc_locales(): array { return array('es' => 'Español', 'en' => 'English', 'fr' => 'Français', 'it' => 'Italiano'); }
function pvc_fields(string $type): array {
    $common = array('synthetic' => array('label' => 'Contenido generado con IA / identidad ficticia', 'type' => 'boolean', 'default' => true), 'tags' => array('label' => 'Etiquetas (una por línea)', 'type' => 'array', 'items' => array('type' => 'string')));
    $specific = array(
        'pv_profile' => array(
            'age' => array('label' => 'Edad (solo personas adultas)', 'type' => 'integer', 'minimum' => 18, 'maximum' => 100, 'default' => 25),
            'cities' => array('label' => 'Ciudades', 'type' => 'array', 'items' => array('type' => 'string'), 'control' => 'cities'),
            'homeZone' => array('label' => 'Zona principal', 'type' => 'string', 'enum' => array('madrid', 'barcelona'), 'default' => 'madrid'),
            'availability' => array('label' => 'Estado de disponibilidad', 'type' => 'string', 'enum' => array('available', 'limited', 'on-request', 'unavailable'), 'default' => 'on-request'),
            'languages' => array('label' => 'Idiomas (uno por línea)', 'type' => 'array', 'items' => array('type' => 'string')),
            'height' => array('label' => 'Estatura (texto, por ejemplo 1,70 m)', 'type' => 'string'),
            'services' => array('label' => 'Servicios relacionados', 'type' => 'array', 'items' => array('type' => 'string'), 'control' => 'services'),
            'conceptTags' => array('label' => 'Características del perfil (una por línea)', 'type' => 'array', 'items' => array('type' => 'string')),
            'gallery' => array('label' => 'Galería de imágenes', 'type' => 'array', 'items' => array('type' => 'integer'), 'control' => 'gallery'),
            'videos' => array('label' => 'Vídeos del perfil', 'type' => 'array', 'items' => array('type' => 'integer'), 'control' => 'videos'),
        ),
        'pv_service' => array('group' => array('label' => 'Grupo del servicio', 'type' => 'string', 'control' => 'service-group'), 'relatedProfiles' => array('label' => 'Perfiles relacionados', 'type' => 'array', 'items' => array('type' => 'string'), 'control' => 'profiles'), 'gallery' => array('label' => 'Galería de imágenes', 'type' => 'array', 'items' => array('type' => 'integer'), 'control' => 'gallery')),
        'pv_city' => array('zone' => array('label' => 'Zona', 'type' => 'string', 'enum' => array('madrid', 'barcelona'), 'default' => 'madrid'), 'coverage' => array('label' => 'Nota de cobertura', 'type' => 'string')),
        'pv_page' => array('kind' => array('label' => 'Tipo de página', 'type' => 'string', 'default' => 'page'), 'route' => array('label' => 'Ruta sin idioma ni barra inicial (ejemplo legal/privacidad)', 'type' => 'string')),
    );
    return array_merge($common, $specific[pvc_type($type)] ?? array());
}
function pvc_data_schema(string $type): array {
    $properties = array();
    foreach (pvc_fields($type) as $key => $field) { $properties[$key] = array_intersect_key($field, array_flip(array('type', 'items', 'enum', 'minimum', 'maximum', 'default'))); }
    return array('type' => 'object', 'properties' => $properties, 'additionalProperties' => false);
}
function pvc_meta_auth($allowed, $key, $post_id): bool { return current_user_can('edit_post', (int) $post_id); }
function pvc_register(): void {
    foreach (pvc_types() as $type => $labels) {
        register_post_type($type, array('labels' => array('name' => $labels[0], 'singular_name' => $labels[1], 'add_new_item' => 'Añadir ' . strtolower($labels[1]), 'edit_item' => 'Editar ' . strtolower($labels[1])), 'public' => false, 'publicly_queryable' => false, 'exclude_from_search' => true, 'show_ui' => true, 'show_in_rest' => true, 'rest_base' => 'pecadosvip-' . substr($type, 3), 'show_in_menu' => 'pecadosvip-content', 'map_meta_cap' => true, 'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'page-attributes', 'custom-fields'), 'rewrite' => false));
        register_post_meta($type, 'pv_key', array('single' => true, 'type' => 'string', 'show_in_rest' => array('schema' => array('type' => 'string', 'pattern' => '^[a-z0-9]+(?:-[a-z0-9]+)*$')), 'sanitize_callback' => 'sanitize_title', 'auth_callback' => 'pvc_meta_auth', 'revisions_enabled' => true));
        register_post_meta($type, 'pv_locale', array('single' => true, 'type' => 'string', 'show_in_rest' => array('schema' => array('type' => 'string', 'enum' => array_keys(pvc_locales()))), 'sanitize_callback' => 'sanitize_key', 'auth_callback' => 'pvc_meta_auth', 'revisions_enabled' => true));
        register_post_meta($type, 'pv_data', array('single' => true, 'type' => 'object', 'show_in_rest' => array('schema' => pvc_data_schema($type)), 'sanitize_callback' => function($data) use ($type) { return pvc_sanitize_data($data, $type); }, 'auth_callback' => 'pvc_meta_auth', 'revisions_enabled' => true));
        add_filter('rest_pre_insert_' . $type, 'pvc_rest_validate', 10, 2);
    }
}
add_action('init', 'pvc_register');

function pvc_sanitize_data($data, string $type): array {
    $data = is_array($data) ? $data : (is_object($data) ? (array) $data : array()); $result = array();
    foreach (pvc_fields($type) as $key => $field) {
        if (!array_key_exists($key, $data)) { if (array_key_exists('default', $field)) { $result[$key] = $field['default']; } continue; }
        $value = $data[$key];
        if ($field['type'] === 'boolean') { $value = rest_sanitize_boolean($value); }
        elseif ($field['type'] === 'integer') { $value = (int) $value; }
        elseif ($field['type'] === 'array') {
            $values = is_array($value) ? $value : preg_split('/\r\n|\r|\n/', (string) $value);
            $value = array_values(array_unique(array_filter(array_map($field['items']['type'] === 'integer' ? 'absint' : 'sanitize_text_field', $values), static function($item) { return $item !== '' && $item !== 0; })));
        } else { $value = sanitize_text_field((string) $value); }
        if (isset($field['enum']) && !in_array($value, $field['enum'], true)) { $value = $field['default'] ?? $field['enum'][0]; }
        $result[$key] = $value;
    }
    return $result;
}
function pvc_duplicate(string $type, string $locale, string $key, int $exclude = 0): bool {
    $query = new WP_Query(array('post_type' => $type, 'post_status' => 'publish', 'posts_per_page' => 1, 'fields' => 'ids', 'post__not_in' => $exclude ? array($exclude) : array(), 'meta_query' => array(array('key' => 'pv_key', 'value' => $key), array('key' => 'pv_locale', 'value' => $locale))));
    return !empty($query->posts);
}
function pvc_suffix(string $type, string $key, array $data): string {
    if ($type === 'pv_profile') { return 'perfiles/' . $key; }
    if ($type === 'pv_service') { return 'servicios/' . $key; }
    if ($type !== 'pv_page') { return $key; }
    $kind = $data['kind'] ?? ''; $custom_route = trim((string) ($data['route'] ?? ''), '/');
    return $kind === 'home' ? '' : ($custom_route !== '' ? $custom_route : (($kind === 'legal' ? 'legal/' : '') . $key));
}
function pvc_validate(string $type, string $locale, string $key, array $data, int $id = 0, bool $publishing = true) {
    if (!isset(pvc_locales()[$locale]) || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $key)) { return new WP_Error('pvc_identity', 'Selecciona un idioma y una clave válida (letras minúsculas, números y guiones).', array('status' => 400)); }
    if ($type === 'pv_profile' && (!isset($data['age']) || !is_numeric($data['age']) || (int) $data['age'] < 18 || (int) $data['age'] > 100)) { return new WP_Error('pvc_age', 'La edad debe estar entre 18 y 100 años.', array('status' => 400)); }
    if ($publishing && pvc_duplicate($type, $locale, $key, $id)) { return new WP_Error('pvc_duplicate', 'Ya existe un contenido publicado con esta clave e idioma. Usa otra clave o edita el existente.', array('status' => 409)); }
    if (!empty($data['route']) && (!preg_match('#^[a-z0-9]+(?:[-/][a-z0-9]+)*$#', $data['route']) || preg_match('#^(wp-|api(?:/|$)|es(?:/|$)|en(?:/|$)|fr(?:/|$)|it(?:/|$))#', $data['route']))) { return new WP_Error('pvc_route', 'La ruta debe ser relativa y no puede usar rutas reservadas.', array('status' => 400)); }
    if ($type === 'pv_page') {
        $special_keys = array('home' => 'home', 'profiles' => 'perfiles', 'services' => 'servicios'); $kind = $data['kind'] ?? '';
        if (isset($special_keys[$kind]) && $key !== $special_keys[$kind]) { return new WP_Error('pvc_page_key', 'Esta página de inicio o catálogo debe conservar su clave: ' . $special_keys[$kind] . '.', array('status' => 400)); }
        if (in_array($key, array_values($special_keys), true) && array_search($key, $special_keys, true) !== $kind) { return new WP_Error('pvc_page_kind', 'Conserva el tipo de la página de inicio o catálogo para que su ruta siga funcionando.', array('status' => 400)); }
        if (isset($special_keys[$kind]) && !empty($data['route'])) { return new WP_Error('pvc_page_route', 'Las páginas de inicio y catálogo usan su ruta fija. Deja vacío el campo Ruta.', array('status' => 400)); }
    }
    if ($publishing) {
        $suffix = pvc_suffix($type, $key, $data);
        $others = get_posts(array('post_type' => array_keys(pvc_types()), 'post_status' => 'publish', 'posts_per_page' => -1, 'post__not_in' => $id ? array($id) : array(), 'meta_key' => 'pv_locale', 'meta_value' => $locale));
        foreach ($others as $other) {
            $other_data = (array) get_post_meta($other->ID, 'pv_data', true);
            if (pvc_suffix($other->post_type, (string) get_post_meta($other->ID, 'pv_key', true), $other_data) === $suffix) { return new WP_Error('pvc_route_duplicate', 'Otra ficha publicada ya utiliza esta ruta en el mismo idioma. Elige otra clave o ruta.', array('status' => 409)); }
        }
    }
    return true;
}
function pvc_validate_profile_content(string $type, string $content) {
    if ($type !== 'pv_profile') { return true; }
    // Media must enter through the dedicated attachment fields so every public
    // rendition is processed. Reject unsupported inline media without deleting it.
    if (preg_match('/<(?:img|picture|video|audio|source|iframe|embed|object)\b|\[(?:gallery|video|audio|embed|caption)\b|url\s*\(|https?:\/\/[^\s<>"\x27]+\.(?:jpe?g|png|gif|webp|avif|mp4|webm|mov|m4v|ogg|avi)(?:[?#\s<>"\x27]|$)|(?:^|\n|>)\s*https?:\/\/[^\s<>]+\s*(?:\n|<|$)/i', $content)) {
        return new WP_Error('pvc_profile_inline_media', 'Para aplicar la marca de agua, añade las fotografías y los vídeos mediante Imagen destacada, Galería de imágenes o Vídeos del perfil. Conserva aquí la descripción en texto y retira los archivos incrustados antes de guardar.', array('status' => 400));
    }
    return true;
}
function pvc_rest_validate($post, WP_REST_Request $request) {
    $id = (int) ($request['id'] ?? 0); $type = $post->post_type ?? get_post_type($id); $meta = (array) ($request->get_param('meta') ?? array());
    $locale = (string) ($meta['pv_locale'] ?? get_post_meta($id, 'pv_locale', true)); $key = (string) ($meta['pv_key'] ?? get_post_meta($id, 'pv_key', true));
    $data = pvc_sanitize_data($meta['pv_data'] ?? get_post_meta($id, 'pv_data', true), $type);
    $content_valid = pvc_validate_profile_content($type, (string) ($post->post_content ?? get_post_field('post_content', $id)));
    if (is_wp_error($content_valid)) { return $content_valid; }
    $publishing = ($request['status'] ?? get_post_status($id)) === 'publish';
    // Gutenberg first creates a blank auto-draft; validation applies when identity/content is saved.
    if (!$publishing && $key === '' && $locale === '') { return $post; }
    $valid = pvc_validate($type, $locale, $key, $data, $id, $publishing);
    return is_wp_error($valid) ? $valid : $post;
}
function pvc_insert_guard(array $data, array $postarr): array {
    if (!isset(pvc_types()[$data['post_type'] ?? '']) || ($data['post_status'] ?? '') !== 'publish') { return $data; }
    $id = (int) ($postarr['ID'] ?? 0); $meta = $postarr['meta_input'] ?? array();
    if (isset($_POST['pvc_meta_nonce']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['pvc_meta_nonce'])), 'pvc_meta')) {
        $meta = array('pv_locale' => sanitize_key(wp_unslash($_POST['pvc_locale'] ?? '')), 'pv_key' => sanitize_title(wp_unslash($_POST['pvc_key'] ?? '')), 'pv_data' => wp_unslash($_POST['pvc_data'] ?? array()));
    }
    // REST validates its incoming metadata before calling wp_insert_post, then writes metadata afterwards.
    if (defined('REST_REQUEST') && REST_REQUEST) { return $data; }
    $content_valid = pvc_validate_profile_content($data['post_type'], (string) ($data['post_content'] ?? ''));
    if (is_wp_error($content_valid)) { $data['post_status'] = 'draft'; set_transient('pvc_notice_' . get_current_user_id(), $content_valid->get_error_message(), 120); return $data; }
    $locale = (string) ($meta['pv_locale'] ?? get_post_meta($id, 'pv_locale', true)); $key = (string) ($meta['pv_key'] ?? get_post_meta($id, 'pv_key', true));
    $valid = pvc_validate($data['post_type'], $locale, $key, pvc_sanitize_data($meta['pv_data'] ?? get_post_meta($id, 'pv_data', true), $data['post_type']), $id);
    if (is_wp_error($valid)) { $data['post_status'] = 'draft'; set_transient('pvc_notice_' . get_current_user_id(), $valid->get_error_message(), 120); }
    return $data;
}
add_filter('wp_insert_post_data', 'pvc_insert_guard', 10, 2);
add_action('wp_restore_post_revision', function($id) {
    $type = get_post_type($id); if (!isset(pvc_types()[$type]) || get_post_status($id) !== 'publish') { return; }
    $valid = pvc_validate($type, (string) get_post_meta($id, 'pv_locale', true), (string) get_post_meta($id, 'pv_key', true), pvc_sanitize_data(get_post_meta($id, 'pv_data', true), $type), (int) $id);
    if (is_wp_error($valid)) { wp_update_post(array('ID' => $id, 'post_status' => 'draft')); set_transient('pvc_notice_' . get_current_user_id(), 'La revisión se restauró como borrador: ' . $valid->get_error_message(), 120); }
}, 20);

function pvc_revision(): string { return (string) get_option('pvc_revision', '1'); }
function pvc_bump(): void { update_option('pvc_revision', sprintf('%.6f', microtime(true)), false); }
foreach (array('added_option', 'updated_option', 'deleted_option') as $hook) { add_action($hook, function($option) { if (str_starts_with((string) $option, 'pvc_copy_')) { pvc_bump(); } }); }
add_action('save_post', function($id) { if (isset(pvc_types()[get_post_type($id)]) || get_post_type($id) === 'attachment') { pvc_bump(); } });
add_action('before_delete_post', function($id) { if (isset(pvc_types()[get_post_type($id)]) || get_post_type($id) === 'attachment') { pvc_bump(); } });
foreach (array('added_post_meta', 'updated_post_meta', 'deleted_post_meta') as $hook) { add_action($hook, function($meta_id, $post_id) { if (isset(pvc_types()[get_post_type($post_id)]) || get_post_type($post_id) === 'attachment') { pvc_bump(); } }, 10, 2); }

function pvc_media($id): ?array {
    if (!is_numeric($id) || !wp_attachment_is_image((int) $id)) { return null; }
    $image = wp_get_attachment_image_src((int) $id, 'full');
    if (!$image) { return null; }
    return array('id' => (int) $id, 'url' => $image[0], 'alt' => (string) get_post_meta((int) $id, '_wp_attachment_image_alt', true), 'width' => (int) $image[1], 'height' => (int) $image[2]);
}
function pvc_normalize(WP_Post $post): array {
    $data = pvc_sanitize_data(get_post_meta($post->ID, 'pv_data', true), $post->post_type);
    $profile = $post->post_type === 'pv_profile';
    $image = $profile ? pvc_watermark_media(get_post_thumbnail_id($post), 'image') : pvc_media(get_post_thumbnail_id($post));
    $gallery = array_values(array_filter(array_map($profile ? static fn($id) => pvc_watermark_media($id, 'image') : 'pvc_media', $data['gallery'] ?? array())));
    $record = array('id' => $post->ID, 'key' => (string) get_post_meta($post->ID, 'pv_key', true), 'locale' => (string) get_post_meta($post->ID, 'pv_locale', true), 'title' => get_the_title($post), 'content' => apply_filters('the_content', $post->post_content), 'excerpt' => $post->post_excerpt, 'image' => $image, 'gallery' => $gallery, 'data' => $data, 'order' => (int) $post->menu_order);
    if ($profile) { $record['videos'] = array_values(array_filter(array_map(static fn($id) => pvc_watermark_media($id, 'video'), $data['videos'] ?? array()))); }
    return $record;
}
function pvc_records(string $type, string $locale): array {
    $type = pvc_type($type); if (!isset(pvc_types()[$type]) || !isset(pvc_locales()[$locale])) { return array(); }
    // Cache only this request and generation. A mutation refreshes all record/media
    // projections immediately, including when an integration edits and reads in one request.
    static $memo = array(); static $generation = null;
    $revision = pvc_revision(); if ($generation !== $revision) { $memo = array(); $generation = $revision; }
    $cache_key = $type . ':' . $locale;
    if (array_key_exists($cache_key, $memo)) { return $memo[$cache_key]; }
    $posts = get_posts(array('post_type' => $type, 'post_status' => 'publish', 'has_password' => false, 'posts_per_page' => -1, 'orderby' => array('menu_order' => 'ASC', 'ID' => 'ASC'), 'meta_query' => array(array('key' => 'pv_locale', 'value' => $locale)), 'suppress_filters' => false));
    $records = array();
    foreach ($posts as $post) { $record = pvc_normalize($post); if (!is_wp_error(pvc_validate($type, $locale, $record['key'], $record['data'], $post->ID, false))) { $records[] = $record; } }
    $memo[$cache_key] = $records; return $records;
}
function pvc_record(string $type, string $locale, string $key): ?array {
    foreach (pvc_records($type, $locale) as $record) { if ($record['key'] === $key) { return $record; } }
    return null;
}
function pvc_copy(string $locale): array {
    if (!isset(pvc_locales()[$locale])) { return array(); }
    $seed = (array) get_option('pvc_copy_seed', array());
    $copy = array_replace_recursive((array) ($seed[$locale] ?? array()), (array) get_option('pvc_copy_' . $locale, array()));
    // Only labels used by the native theme belong in its UI/public API. Older seeds
    // also held profile/page text snapshots; those must not bypass CPT publication.
    $public_groups = array('brand', 'coverage', 'filters', 'footer', 'hero', 'nativeUi', 'navigation', 'profile', 'profilesSection', 'security', 'services', 'servicesSection', 'site', 'trustSignals', 'languageName');
    return array_intersect_key($copy, array_flip($public_groups));
}
function pvc_site(string $locale): array {
    $site = (array) (pvc_copy($locale)['site'] ?? array());
    foreach (array('logo', 'hero', 'mosaic', 'icon') as $key) { $site[$key] = pvc_media($site[$key] ?? 0); }
    return $site;
}
function pvc_route(WP_Post $post): string {
    $locale = (string) get_post_meta($post->ID, 'pv_locale', true); $key = (string) get_post_meta($post->ID, 'pv_key', true); $data = (array) get_post_meta($post->ID, 'pv_data', true);
    return home_url('/' . $locale . '/' . pvc_suffix($post->post_type, $key, $data));
}
add_filter('post_type_link', function($link, $post) { return isset(pvc_types()[$post->post_type]) ? pvc_route($post) : $link; }, 10, 2);
add_filter('preview_post_link', function($link, $post) { return isset(pvc_types()[$post->post_type]) ? add_query_arg(array('preview' => 'true', 'preview_id' => $post->ID, '_wpnonce' => wp_create_nonce('pvc_preview_' . $post->ID)), pvc_route($post)) : $link; }, 10, 2);
function pvc_preview_record(string $locale, string $type, string $key): ?array {
    $id = absint($_GET['preview_id'] ?? 0); $nonce = sanitize_text_field(wp_unslash($_GET['_wpnonce'] ?? ''));
    if (!$id || !is_user_logged_in() || !current_user_can('edit_post', $id) || !wp_verify_nonce($nonce, 'pvc_preview_' . $id)) { return null; }
    $post = get_post($id);
    if (!$post || $post->post_type !== pvc_type($type) || get_post_meta($id, 'pv_locale', true) !== $locale || get_post_meta($id, 'pv_key', true) !== $key) { return null; }
    nocache_headers();
    $autosave = wp_get_post_autosave($id, get_current_user_id());
    if ($autosave) { $post->post_content = $autosave->post_content; $post->post_title = $autosave->post_title; $post->post_excerpt = $autosave->post_excerpt; }
    return pvc_normalize($post);
}

add_action('rest_api_init', function() {
    register_rest_route('pecadosvip/v1', '/catalog', array('methods' => WP_REST_Server::READABLE, 'permission_callback' => '__return_true', 'args' => array('lang' => array('default' => 'es', 'enum' => array_keys(pvc_locales()), 'sanitize_callback' => 'sanitize_key')), 'callback' => function(WP_REST_Request $request) {
        $locale = $request['lang']; $response = new WP_REST_Response(array('locale' => $locale, 'revision' => pvc_revision(), 'profiles' => pvc_records('profile', $locale), 'services' => pvc_records('service', $locale), 'cities' => pvc_records('city', $locale), 'pages' => pvc_records('page', $locale), 'copy' => pvc_copy($locale), 'site' => pvc_site($locale)));
        $response->header('Cache-Control', 'no-store'); $response->header('X-Robots-Tag', 'noindex, nofollow'); return $response;
    }));
});
require_once PVC_DIR . '/includes/media-watermark.php';
require_once PVC_DIR . '/includes/admin.php';
require_once PVC_DIR . '/includes/seo.php';
require_once PVC_DIR . '/includes/import.php';
require_once PVC_DIR . '/includes/frontend-admin.php';
require_once PVC_DIR . '/includes/selective-translation.php';
