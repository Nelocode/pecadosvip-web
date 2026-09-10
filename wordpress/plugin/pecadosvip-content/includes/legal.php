<?php
/**
 * Spanish legal mechanics (LSSI art. 10 identification, layered privacy, cookies and
 * adult declaration). Nothing here is legal advice and no document is published on its
 * own: the provider data, the cookie inventory and the approval are supplied by the
 * responsible party.
 *
 * Publication stays closed while the required intake is incomplete. The public
 * templates render a "pending approval" state instead of invented legal text.
 */
if (!defined('ABSPATH')) { exit; }

function pvc_legal_cookie_categories(): array {
    return array('essential' => 'Necesarias', 'analytics' => 'Analítica', 'marketing' => 'Publicidad');
}

/** LSSI 34/2002 art. 10 identification. Required fields gate publication. */
function pvc_legal_provider_fields(): array {
    return array(
        'name' => array('label' => 'Nombre o denominación social', 'required' => true),
        'tax_id' => array('label' => 'NIF / CIF', 'required' => true),
        'address' => array('label' => 'Domicilio o establecimiento permanente', 'required' => true),
        'email' => array('label' => 'Correo de contacto directo y efectivo', 'required' => true),
        'trade_name' => array('label' => 'Nombre comercial autorizado', 'required' => false),
        'phone' => array('label' => 'Teléfono de contacto', 'required' => false),
        'registry' => array('label' => 'Datos registrales y códigos de conducta', 'required' => false),
        'domain_owner' => array('label' => 'Titular del dominio', 'required' => false),
        'approver' => array('label' => 'Responsable jurídico que aprueba la publicación', 'required' => true),
    );
}
function pvc_legal_defaults(): array {
    return array(
        'approved' => false,
        'approved_at_utc' => '',
        'document_version' => '1',
        'provider' => array_fill_keys(array_keys(pvc_legal_provider_fields()), ''),
        'cookies' => array(
            'banner_enabled' => false,
            'policy_version' => '1',
            'inventory' => array(
                array('name' => 'wordpress_test_cookie', 'provider' => 'Este sitio (WordPress)', 'purpose' => 'Comprobar si el navegador acepta cookies.', 'duration' => 'Sesión', 'category' => 'essential'),
                array('name' => 'wp-settings-*', 'provider' => 'Este sitio (WordPress)', 'purpose' => 'Preferencias de la interfaz para personas con la sesión iniciada.', 'duration' => '1 año', 'category' => 'essential'),
            ),
            'analytics' => array('enabled' => false, 'provider' => '', 'description' => '', 'retention' => '', 'region' => '', 'dpa' => ''),
        ),
        'age_gate' => array('enabled' => false, 'minimum' => 18, 'statement_version' => '1'),
    );
}
function pvc_legal_settings(): array {
    $saved = (array) get_option('pvc_legal_settings', array());
    $defaults = pvc_legal_defaults();
    $settings = array_replace_recursive($defaults, $saved);
    // Lists must replace, never merge, so removing an inventory row is honoured.
    if (isset($saved['cookies']['inventory']) && is_array($saved['cookies']['inventory'])) { $settings['cookies']['inventory'] = $saved['cookies']['inventory']; }
    $settings['provider'] = array_intersect_key((array) $settings['provider'], pvc_legal_provider_fields()) + $defaults['provider'];
    return $settings;
}
/** Required intake still empty. Ordered so the admin checklist reads like LEGAL_INPUTS_REQUIRED.md. */
function pvc_legal_missing(?array $settings = null): array {
    $settings = $settings ?? pvc_legal_settings();
    $missing = array();
    foreach (pvc_legal_provider_fields() as $key => $field) {
        if (!empty($field['required']) && trim((string) ($settings['provider'][$key] ?? '')) === '') { $missing[] = $field['label']; }
    }
    return $missing;
}
function pvc_legal_privacy_ready(): bool { return pvc_legal_ready(); }
/** Identification may be shown only when the responsible party approved a complete intake. */
function pvc_legal_ready(?array $settings = null): bool {
    $settings = $settings ?? pvc_legal_settings();
    return !empty($settings['approved']) && !pvc_legal_missing($settings);
}
function pvc_legal_non_essential(): array {
    $settings = pvc_legal_settings();
    return array_values(array_filter((array) $settings['cookies']['inventory'], static function($row) { return ($row['category'] ?? 'essential') !== 'essential'; }));
}
function pvc_legal_sanitize($input): array {
    $defaults = pvc_legal_defaults();
    $input = is_array($input) ? $input : array();
    $settings = array(
        'approved' => !empty($input['approved']),
        'approved_at_utc' => sanitize_text_field((string) ($input['approved_at_utc'] ?? '')),
        'document_version' => preg_replace('/[^0-9A-Za-z._-]/', '', (string) ($input['document_version'] ?? '1')) ?: '1',
        'provider' => array(),
        'cookies' => array(
            'banner_enabled' => !empty($input['cookies']['banner_enabled']),
            'policy_version' => preg_replace('/[^0-9A-Za-z._-]/', '', (string) ($input['cookies']['policy_version'] ?? '1')) ?: '1',
            'inventory' => array(),
            'analytics' => array(),
        ),
        'age_gate' => array(
            'enabled' => !empty($input['age_gate']['enabled']),
            'minimum' => max(18, min(21, (int) ($input['age_gate']['minimum'] ?? 18))),
            'statement_version' => preg_replace('/[^0-9A-Za-z._-]/', '', (string) ($input['age_gate']['statement_version'] ?? '1')) ?: '1',
        ),
    );
    foreach (array_keys(pvc_legal_provider_fields()) as $key) { $settings['provider'][$key] = sanitize_text_field((string) ($input['provider'][$key] ?? '')); }
    $categories = pvc_legal_cookie_categories();
    foreach ((array) ($input['cookies']['inventory'] ?? array()) as $row) {
        if (!is_array($row)) { continue; }
        $name = sanitize_text_field((string) ($row['name'] ?? ''));
        if ($name === '') { continue; }
        $category = (string) ($row['category'] ?? 'essential');
        $settings['cookies']['inventory'][] = array(
            'name' => $name,
            'provider' => sanitize_text_field((string) ($row['provider'] ?? '')),
            'purpose' => sanitize_textarea_field((string) ($row['purpose'] ?? '')),
            'duration' => sanitize_text_field((string) ($row['duration'] ?? '')),
            'category' => isset($categories[$category]) ? $category : 'essential',
        );
    }
    if (!$settings['cookies']['inventory']) { $settings['cookies']['inventory'] = $defaults['cookies']['inventory']; }
    foreach (array('enabled', 'provider', 'description', 'retention', 'region', 'dpa') as $key) {
        $value = $input['cookies']['analytics'][$key] ?? ($key === 'enabled' ? false : '');
        $settings['cookies']['analytics'][$key] = $key === 'enabled' ? !empty($value) : sanitize_text_field((string) $value);
    }
    // Approval records who confirmed it, but never invents the missing data.
    if ($settings['approved'] && trim((string) ($input['approved_at_utc'] ?? '')) === '') { $settings['approved_at_utc'] = gmdate('c'); }
    if (!$settings['approved']) { $settings['approved_at_utc'] = ''; }
    return $settings;
}
/** A non-essential cookie is never loaded before consent, and never at all until the intake is approved. */
function pvc_legal_cookie_consent_required(): bool {
    $settings = pvc_legal_settings();
    return !empty($settings['cookies']['banner_enabled']) && pvc_legal_ready($settings) && (bool) pvc_legal_non_essential();
}

add_action('admin_post_pvc_save_legal', function() {
    if (!current_user_can('manage_options')) { wp_die('No tienes permisos para editar estos ajustes.', '', array('response' => 403)); }
    check_admin_referer('pvc_legal', 'pvc_legal_nonce');
    update_option('pvc_legal_settings', pvc_legal_sanitize(wp_unslash($_POST['pvc_legal'] ?? array())), false);
    wp_safe_redirect(add_query_arg(array('page' => 'pecadosvip-legal', 'saved' => 1), admin_url('admin.php'))); exit;
});

function pvc_legal_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    $settings = pvc_legal_settings(); $missing = pvc_legal_missing($settings);
    require_once PVC_DIR . '/includes/admin.php';
    echo '<div class="wrap pvc-admin"><h1>Legal y privacidad</h1>';
    echo '<p>Completa la identificación del prestador exigida por el artículo 10 de la LSSI, el inventario de cookies y la declaración de mayoría de edad. Mientras falten datos obligatorios, la web no muestra la identificación ni activa los canales de contacto, y los documentos legales permanecen como plantilla pendiente de aprobación.</p>';
    if (isset($_GET['saved'])) { echo '<div class="notice notice-success inline"><p>Ajustes guardados.</p></div>'; }
    echo $missing ? '<div class="notice notice-warning"><p><strong>Faltan datos obligatorios (' . count($missing) . '):</strong> ' . esc_html(implode(' · ', $missing)) . '</p></div>' : '<div class="notice notice-success inline"><p>Identificación del prestador completa' . (empty($settings['approved']) ? '. Falta marcar la aprobación para publicarla.' : ' y aprobada.') . '</p></div>';
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="pvc_save_legal">';
    wp_nonce_field('pvc_legal', 'pvc_legal_nonce');
    echo '<h2>Identificación del prestador (LSSI art. 10)</h2><table class="form-table" role="presentation"><tbody>';
    foreach (pvc_legal_provider_fields() as $key => $field) {
        echo '<tr><th scope="row"><label for="pvc-legal-' . esc_attr($key) . '">' . esc_html($field['label']) . (!empty($field['required']) ? ' <span aria-hidden="true">*</span>' : '') . '</label></th><td><input type="text" class="regular-text" id="pvc-legal-' . esc_attr($key) . '" name="pvc_legal[provider][' . esc_attr($key) . ']" value="' . esc_attr((string) $settings['provider'][$key]) . '"' . (!empty($field['required']) ? ' required' : '') . '>' . (!empty($field['required']) ? '<p class="description">Obligatorio.</p>' : '') . '</td></tr>';
    }
    echo '</tbody></table>';
    echo '<h2>Aprobación y versión</h2><table class="form-table" role="presentation"><tbody>';
    echo '<tr><th scope="row">Aprobación</th><td><label><input type="checkbox" name="pvc_legal[approved]" value="1" ' . checked(!empty($settings['approved']), true, false) . '> El responsable jurídico aprueba publicar esta identificación y los documentos legales.</label><p class="description">Sin esta marca la identificación no se muestra y el contacto permanece desactivado.</p></td></tr>';
    echo '<tr><th scope="row"><label for="pvc-legal-version">Versión del documento</label></th><td><input type="text" id="pvc-legal-version" name="pvc_legal[document_version]" value="' . esc_attr((string) $settings['document_version']) . '"><p class="description">Fecha de aprobación registrada: ' . esc_html($settings['approved_at_utc'] !== '' ? $settings['approved_at_utc'] : 'sin aprobar') . '.</p></td></tr>';
    echo '</tbody></table>';
    echo '<h2>Cookies y analítica</h2><table class="form-table" role="presentation"><tbody>';
    echo '<tr><th scope="row">Aviso de cookies</th><td><label><input type="checkbox" name="pvc_legal[cookies][banner_enabled]" value="1" ' . checked(!empty($settings['cookies']['banner_enabled']), true, false) . '> Mostrar el aviso con aceptar, rechazar y configurar.</label><p class="description">Se muestra solo si hay cookies no esenciales inventariadas y la identificación está aprobada. No se carga ninguna cookie no esencial antes del consentimiento.</p></td></tr>';
    echo '<tr><th scope="row"><label for="pvc-legal-cookie-version">Versión de la política de cookies</label></th><td><input type="text" id="pvc-legal-cookie-version" name="pvc_legal[cookies][policy_version]" value="' . esc_attr((string) $settings['cookies']['policy_version']) . '"></td></tr>';
    echo '</tbody></table>';
    $categories = pvc_legal_cookie_categories();
    echo '<h3>Inventario de cookies</h3><p>Una fila por cookie o SDK. Revisa y completa el inventario con el responsable legal antes de activar cookies no esenciales.</p><table class="widefat striped"><thead><tr><th>Nombre</th><th>Proveedor</th><th>Finalidad</th><th>Duración</th><th>Categoría</th></tr></thead><tbody>';
    foreach ((array) $settings['cookies']['inventory'] as $i => $row) {
        echo '<tr><td><input type="text" name="pvc_legal[cookies][inventory][' . (int) $i . '][name]" value="' . esc_attr((string) $row['name']) . '"></td>';
        echo '<td><input type="text" name="pvc_legal[cookies][inventory][' . (int) $i . '][provider]" value="' . esc_attr((string) $row['provider']) . '"></td>';
        echo '<td><input type="text" class="large-text" name="pvc_legal[cookies][inventory][' . (int) $i . '][purpose]" value="' . esc_attr((string) $row['purpose']) . '"></td>';
        echo '<td><input type="text" name="pvc_legal[cookies][inventory][' . (int) $i . '][duration]" value="' . esc_attr((string) $row['duration']) . '"></td><td><select name="pvc_legal[cookies][inventory][' . (int) $i . '][category]">';
        foreach ($categories as $value => $label) { echo '<option value="' . esc_attr($value) . '" ' . selected((string) $row['category'], $value, false) . '>' . esc_html($label) . '</option>'; }
        echo '</select></td></tr>';
    }
    $next = count((array) $settings['cookies']['inventory']);
    echo '<tr><td><input type="text" name="pvc_legal[cookies][inventory][' . (int) $next . '][name]" value=""></td><td><input type="text" name="pvc_legal[cookies][inventory][' . (int) $next . '][provider]" value=""></td><td><input type="text" class="large-text" name="pvc_legal[cookies][inventory][' . (int) $next . '][purpose]" value=""></td><td><input type="text" name="pvc_legal[cookies][inventory][' . (int) $next . '][duration]" value=""></td><td><select name="pvc_legal[cookies][inventory][' . (int) $next . '][category]">';
    foreach ($categories as $value => $label) { echo '<option value="' . esc_attr($value) . '">' . esc_html($label) . '</option>'; }
    echo '</select></td></tr></tbody></table>';
    echo '<p class="description">Deja el nombre vacío para descartar la fila añadida.</p>';
    $analytics = (array) $settings['cookies']['analytics'];
    echo '<h3>Documentación de analítica (no se carga ningún proveedor)</h3><table class="form-table" role="presentation"><tbody>';
    echo '<tr><th scope="row">Proveedor previsto</th><td><label><input type="checkbox" name="pvc_legal[cookies][analytics][enabled]" value="1" ' . checked(!empty($analytics['enabled']), true, false) . '> Hay un proveedor de analítica previsto.</label></td></tr>';
    foreach (array('provider' => 'Nombre del proveedor', 'description' => 'Finalidad y alcance', 'retention' => 'Conservación', 'region' => 'Región y transferencias', 'dpa' => 'Contrato / DPA') as $key => $label) {
        echo '<tr><th scope="row"><label for="pvc-legal-an-' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td><input type="text" class="regular-text" id="pvc-legal-an-' . esc_attr($key) . '" name="pvc_legal[cookies][analytics][' . esc_attr($key) . ']" value="' . esc_attr((string) $analytics[$key]) . '"></td></tr>';
    }
    echo '</tbody></table>';
    echo '<h2>Control de acceso de personas adultas</h2><p>La comprobación se realiza en el servidor mediante un adaptador de verificación (<code>pvwp_age_verified_session</code>). El tema no acepta cookies, parámetros ni autodeclaraciones como prueba, y no recibe documentos de identidad ni fechas de nacimiento. Sin un adaptador que confirme una sesión válida, el contenido permanece cerrado y solo son accesibles los documentos legales y el canal de reporte.</p><table class="form-table" role="presentation"><tbody>';
    echo '<tr><th scope="row">Activar la puerta de acceso</th><td><label><input type="checkbox" name="pvc_legal[age_gate][enabled]" value="1" ' . checked(!empty($settings['age_gate']['enabled']), true, false) . '> Exigir una sesión de mayoría de edad verificada antes de servir contenido.</label><p class="description">Desactivado por defecto. Al activarlo sin un adaptador de verificación conectado, todo el contenido pasa a responder 403 y solo quedan visibles la pantalla neutra, los documentos legales y el canal de reporte. No sustituye a la protección de los archivos originales ni a la verificación de edad de un proveedor autorizado.</p></td></tr>';
    echo '<tr><th scope="row"><label for="pvc-legal-age-min">Edad mínima</label></th><td><input type="number" min="18" max="21" id="pvc-legal-age-min" name="pvc_legal[age_gate][minimum]" value="' . esc_attr((string) $settings['age_gate']['minimum']) . '"></td></tr>';
    echo '<tr><th scope="row"><label for="pvc-legal-age-version">Versión del aviso de acceso</label></th><td><input type="text" id="pvc-legal-age-version" name="pvc_legal[age_gate][statement_version]" value="' . esc_attr((string) $settings['age_gate']['statement_version']) . '"></td></tr>';
    echo '</tbody></table>';
    echo '<h2>Documentos pendientes de redacción jurídica</h2><ol><li>Aviso legal</li><li>Política de privacidad por capas</li><li>Política y panel de cookies</li><li>Términos del servicio y contacto</li><li>Política 18+ y control de acceso</li><li>Consentimientos y derechos de imagen</li><li>Registro de tratamientos y encargados</li><li>Procedimiento de derechos, retirada e incidentes</li></ol><p>Cada documento requiere propietario, versión, fuente jurídica y aprobación. La web publica la plantilla editable con el bloque de identificación, nunca un texto inventado.</p>';
    submit_button('Guardar ajustes legales');
    echo '</form></div>';
}
