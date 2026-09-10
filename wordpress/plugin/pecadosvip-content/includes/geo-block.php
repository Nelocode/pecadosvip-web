<?php
/**
 * Per-profile country restriction.
 *
 * A profile may declare the country its visitors must not come from. The origin cannot know
 * where a visitor is, so the country is read from a header that the edge in front of the site
 * adds: `CF-IPCountry` when Cloudflare is in front, or whatever header the deployed proxy
 * sends. The header name is configuration rather than a guess: the `pvc_geo_header` option,
 * the `PVC_GEO_HEADER` constant, or the `pvc_geo_header` filter.
 *
 * Two properties are deliberate.
 *
 * - Nothing is enforced until a source is configured. This site is served by Apache directly
 *   today and no geo header arrives, so an unconditional fail-closed rule would hide every
 *   restricted profile from every visitor overnight. Until a header is configured the field
 *   stays stored, the site behaves exactly as before, and the admin screen says so out loud.
 * - Once a source is configured, an unknown country fails closed. A restriction that cannot be
 *   checked is not a restriction, and for a legal one hiding is the safe direction.
 *
 * Editors, wp-admin, WP-CLI and cron always see every profile, so the restriction can never
 * lock the owner out of their own content.
 *
 * The filtering happens in `pvc_records()`, which is the single source every public projection
 * reads: the profile listing, the route index that resolves each detail page, the canonical
 * link, the REST catalogue and the informational records. A restricted profile therefore
 * leaves the listing and its detail route answers 404, consistently, without touching each
 * template.
 */
if (!defined('ABSPATH')) { exit; }

/** Header the edge uses to report the visitor country, or '' when none is usable. */
function pvc_geo_header(): string {
    $header = defined('PVC_GEO_HEADER') ? (string) PVC_GEO_HEADER : (string) get_option('pvc_geo_header', '');
    if (function_exists('apply_filters')) { $header = (string) apply_filters('pvc_geo_header', $header); }
    $header = strtoupper(trim($header));
    return preg_match('/^[A-Z0-9](?:[A-Z0-9-]{0,62}[A-Z0-9])?$/', $header) === 1 ? $header : '';
}

/** Whether the restriction is applied at all. */
function pvc_geo_enabled(): bool { return pvc_geo_header() !== ''; }

/** Visitor country from the configured header, or null when it cannot be established. */
function pvc_geo_country(): ?string {
    $header = pvc_geo_header();
    if ($header === '') { return null; }
    $raw = $_SERVER['HTTP_' . str_replace('-', '_', $header)] ?? '';
    $value = strtoupper(trim(is_string($raw) ? $raw : ''));
    // Cloudflare answers XX when it cannot place the visitor and T1 for Tor; neither is a country.
    if (preg_match('/^[A-Z]{2}$/', $value) !== 1 || in_array($value, array('XX', 'T1'), true)) { return null; }
    return $value;
}

/** The people who run the site always see every profile. */
function pvc_geo_exempt(): bool {
    if (defined('WP_CLI') && WP_CLI) { return true; }
    if (defined('DOING_CRON') && DOING_CRON) { return true; }
    if (function_exists('is_admin') && is_admin()) { return true; }
    return function_exists('current_user_can') && current_user_can('edit_posts');
}

/** Country a record declares as forbidden, or '' when it declares none or is malformed. */
function pvc_geo_declared(array $record): string {
    $value = strtoupper(trim((string) ($record['data']['blockedCountry'] ?? '')));
    return preg_match('/^[A-Z]{2}$/', $value) === 1 && $value !== 'XX' ? $value : '';
}

/** Whether this record must be withheld from the current visitor. */
function pvc_geo_blocked(array $record): bool {
    $declared = pvc_geo_declared($record);
    if ($declared === '' || !pvc_geo_enabled()) { return false; }
    $country = pvc_geo_country();
    // An unknown country fails closed: a restriction that cannot be checked is not a restriction.
    return $country === null || $country === $declared;
}

/** Withholds restricted profiles from every public projection. */
function pvc_geo_visible(array $records, string $type = 'profile'): array {
    if (pvc_type($type) !== 'pv_profile' || pvc_geo_exempt()) { return $records; }
    $visible = array();
    foreach ($records as $record) { if (!pvc_geo_blocked($record)) { $visible[] = $record; } }
    return $visible;
}
add_filter('pvc_records', 'pvc_geo_visible', 10, 2);

/* ------------------------------------------------------------------- admin */

/** How many profiles declare a restriction, so the screen can be honest about them. */
function pvc_geo_declared_count(): int {
    static $count = null;
    if ($count !== null) { return $count; }
    $count = 0;
    $ids = get_posts(array('post_type' => 'pv_profile', 'post_status' => array('publish', 'draft', 'pending', 'future', 'private'), 'posts_per_page' => -1, 'fields' => 'ids', 'suppress_filters' => false));
    foreach ($ids as $id) {
        if (pvc_geo_declared(array('data' => (array) get_post_meta($id, 'pv_data', true))) !== '') { $count++; }
    }
    return $count;
}

add_action('admin_menu', function () {
    add_submenu_page('pecadosvip-content', 'Bloqueo por país', 'Bloqueo por país', 'manage_options', 'pecadosvip-geo', 'pvc_geo_admin');
});

/** Warns where it cannot be missed while restrictions exist and nothing applies them. */
add_action('admin_notices', function () {
    if (!function_exists('current_user_can') || !current_user_can('manage_options')) { return; }
    if (pvc_geo_enabled() || pvc_geo_declared_count() === 0) { return; }
    echo '<div class="notice notice-warning"><p><strong>Bloqueo por país sin aplicar.</strong> '
        . esc_html((string) pvc_geo_declared_count()) . ' perfil(es) declaran un país bloqueado, pero no hay ninguna cabecera de país configurada, así que se muestran a todo el mundo. Configúrala en <a href="'
        . esc_url(admin_url('admin.php?page=pecadosvip-geo')) . '">PecadosVip → Bloqueo por país</a>.</p></div>';
});

function pvc_geo_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['pvc_geo_header']) && check_admin_referer('pvc_geo_save')) {
        update_option('pvc_geo_header', sanitize_text_field(wp_unslash((string) $_POST['pvc_geo_header'])), false);
        echo '<div class="notice notice-success"><p>Guardado.</p></div>';
    }
    $stored = (string) get_option('pvc_geo_header', '');
    $active = pvc_geo_header();
    $country = pvc_geo_country();
    $declared = pvc_geo_declared_count();
    echo '<div class="wrap"><h1>Bloqueo por país</h1>';
    echo '<p>Un perfil puede declarar el país desde el que no debe mostrarse. El origen no puede saber de dónde llega un visitante, así que el país se lee de una cabecera que añade el proxy situado delante del sitio. Este sitio se sirve hoy con Apache directo, sin proxy que añada esa cabecera.</p>';
    echo '<form method="post">' . wp_nonce_field('pvc_geo_save', '_wpnonce', true, false);
    echo '<table class="form-table"><tr><th scope="row"><label for="pvc_geo_header">Cabecera del país</label></th><td>'
        . '<input name="pvc_geo_header" id="pvc_geo_header" type="text" class="regular-text" value="' . esc_attr($stored) . '" placeholder="CF-IPCountry">'
        . '<p class="description">Déjalo vacío para no aplicar ningún bloqueo. Con Cloudflare delante del sitio la cabecera es <code>CF-IPCountry</code>.</p></td></tr></table>';
    submit_button('Guardar');
    echo '</form>';
    echo '<h2>Estado</h2><ul>';
    if ($active === '') {
        echo '<li><strong>El bloqueo no se aplica.</strong> Los perfiles que declaren un país bloqueado se muestran a todo el mundo.</li>';
        if (trim($stored) !== '') { echo '<li>El nombre guardado no es una cabecera válida, así que se ignora.</li>'; }
    } else {
        echo '<li>El bloqueo se aplica leyendo la cabecera <code>' . esc_html($active) . '</code>.</li>';
        echo '<li>' . ($country === null
            ? 'En esta petición la cabecera no llegó o no traía un país, así que los perfiles con país bloqueado se ocultan (fallo cerrado). Si estás navegando directamente al origen, esto es esperado.'
            : 'País detectado en esta petición: <code>' . esc_html($country) . '</code>.') . '</li>';
    }
    echo '<li>Perfiles que declaran un país bloqueado: <strong>' . esc_html((string) $declared) . '</strong>.</li>';
    echo '<li>Editores, administración, WP-CLI y cron ven siempre todos los perfiles.</li>';
    echo '</ul></div>';
}
