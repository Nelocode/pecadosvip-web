<?php
if (!defined('ABSPATH')) { exit; }

add_action('template_redirect', 'pvc_frontend_admin_route', 5);

function pvc_frontend_admin_route() {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $home_path = parse_url(home_url(), PHP_URL_PATH) ?: '';
    if ($home_path !== '' && strpos($path, $home_path) === 0) {
        $path = substr($path, strlen($home_path));
    }
    
    if (rtrim($path, '/') !== '/admin-models') {
        return;
    }

    if (!is_user_logged_in() || !current_user_can('edit_posts')) {
        wp_redirect(wp_login_url(home_url('/admin-models')));
        exit;
    }

    require_once PVC_DIR . '/includes/admin.php';

    $type = isset($_GET['type']) ? sanitize_key($_GET['type']) : 'pv_profile';
    $type = str_starts_with($type, 'pv_') ? $type : 'pv_' . $type;
    if (!in_array($type, array('pv_profile', 'pv_service', 'pv_city', 'pv_page'))) { $type = 'pv_profile'; }

    // Handle form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pvc_frontend_admin_nonce']) && wp_verify_nonce($_POST['pvc_frontend_admin_nonce'], 'pvc_save_model')) {
        $post_id = isset($_POST['post_ID']) ? (int) $_POST['post_ID'] : 0;
        
        $post_data = array(
            'post_title'   => sanitize_text_field($_POST['post_title'] ?? ''),
            'post_content' => wp_kses_post($_POST['post_content'] ?? ''),
            'post_type'    => $type,
            'post_status'  => 'publish'
        );

        if ($post_id) {
            $post_data['ID'] = $post_id;
            wp_update_post($post_data);
        } else {
            $post_id = wp_insert_post($post_data);
        }

        if ($post_id && !is_wp_error($post_id)) {
            // Save featured image
            if (isset($_POST['post_thumbnail_id'])) {
                if (empty($_POST['post_thumbnail_id'])) {
                    delete_post_thumbnail($post_id);
                } else {
                    set_post_thumbnail($post_id, (int)$_POST['post_thumbnail_id']);
                }
            }
            
            $locale = sanitize_key($_POST['pvc_locale'] ?? 'es');
            $key = sanitize_title($_POST['pvc_key'] ?? '');
            if (!$key) { $key = sanitize_title($_POST['post_title']); }
            
            $raw_data = wp_unslash($_POST['pvc_data'] ?? array());
            
            // Clean up arrays from textarea
            foreach (pvc_fields($type) as $fk => $field) {
                if ($field['type'] === 'array' && !isset($field['control']) && isset($raw_data[$fk]) && is_string($raw_data[$fk])) {
                    $raw_data[$fk] = preg_split('/\r\n|\r|\n/', $raw_data[$fk]);
                    $raw_data[$fk] = array_filter(array_map('trim', $raw_data[$fk]));
                }
                if ($field['type'] === 'boolean') {
                    $raw_data[$fk] = isset($raw_data[$fk]) ? 1 : 0;
                }
            }
            
            $data = pvc_sanitize_data($raw_data, $type);
            update_post_meta($post_id, 'pv_locale', $locale);
            update_post_meta($post_id, 'pv_key', $key);
            update_post_meta($post_id, 'pv_data', $data);
        }
        wp_redirect(home_url('/admin-models?type=' . $type . '&msg=saved'));
        exit;
    }

    require_once ABSPATH . 'wp-admin/includes/media.php';
    nocache_headers();
    
    $pvwp_locale = 'es';
    $types_labels = array(
        'pv_profile' => 'Perfiles',
        'pv_service' => 'Servicios',
        'pv_city' => 'Ciudades',
        'pv_page' => 'Páginas'
    );
    
    $type_label = $types_labels[$type];
    $type_short = substr($type, 3);

    ?>
    <!doctype html>
    <html lang="<?php echo esc_attr($pvwp_locale); ?>">
    <head>
        <meta charset="<?php bloginfo('charset'); ?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Administración Visual - <?php echo esc_html($type_label); ?></title>
        <?php wp_head(); ?>
        <?php wp_enqueue_media(); ?>
        <style>
            #wpadminbar { display: none !important; }
            html { margin-top: 0 !important; }
            .pvn-site input[type=text], .pvn-site input[type=number], .pvn-site textarea {
                width: 100%; min-height: 44px; border: 1px solid #b9914a65; border-radius: 0; background: #0d0b08; color: #f0e9de; padding: .65rem .8rem; font: inherit;
            }
            .pvn-checkbox-group { display: flex; flex-wrap: wrap; gap: 1rem; }
            .pvn-checkbox-group label { flex-direction: row; align-items: center; gap: 0.5rem; flex: 0 0 auto; cursor: pointer; }
            .pvn-checkbox-group input[type=checkbox] { width: 1.2rem; height: 1.2rem; margin: 0; accent-color: var(--pvn-gold); }
            
            .pvn-gallery-preview { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; }
            .pvn-gallery-item { width: 100px; height: 133px; position: relative; border: 1px solid var(--pvn-line); background: #000; }
            .pvn-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
            .pvn-gallery-item button { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.8); color: #e1bf7b; border: none; padding: 0.2rem 0.5rem; cursor: pointer; }
            
            .pvn-msg { border: 1px solid var(--pvn-line); padding: 1rem; margin-bottom: 2rem; background: #0d0b08; color: var(--pvn-gold); }
            
            .pvn-admin-layout { display: flex; flex-direction: column; max-width: 1400px; margin: 0 auto; padding: 2rem 1rem; gap: 2rem; }
            @media (min-width: 768px) { .pvn-admin-layout { flex-direction: row; } }
            
            .pvn-admin-sidebar { width: 100%; }
            @media (min-width: 768px) { .pvn-admin-sidebar { width: 220px; flex-shrink: 0; } }
            .pvn-admin-sidebar-menu { background: #090805b8; border: 1px solid var(--pvn-line); padding: 1rem; }
            .pvn-admin-sidebar-menu ul { list-style: none; padding: 0; margin: 0; }
            .pvn-admin-sidebar-menu li { margin-bottom: 0.25rem; }
            .pvn-admin-sidebar-menu a { display: block; padding: 0.75rem 1rem; color: #f1eadf; text-decoration: none; border-left: 3px solid transparent; transition: all 0.2s; font-size: 0.9rem; letter-spacing: 0.5px; }
            .pvn-admin-sidebar-menu a:hover { background: rgba(255,255,255,0.03); color: var(--pvn-gold); }
            .pvn-admin-sidebar-menu a.active { border-left-color: var(--pvn-gold); color: var(--pvn-gold); background: rgba(255,255,255,0.05); font-weight: bold; }
        </style>
    </head>
    <body class="pvwp-frontend">
        <div class="public-page pvn-site">
            <div class="pvn-mosaic"></div>
            
            <header class="pvn-header" id="inicio">
                <div class="pvn-header-row">
                    <?php if (function_exists('pvwp_brand')) pvwp_brand(); ?>
                    <nav class="pvn-desktop-nav">
                         <a href="<?php echo esc_url(home_url('/')); ?>" style="color: var(--pvn-gold);">← Volver al sitio</a>
                    </nav>
                </div>
            </header>
            
            <main id="main-content">
                <div class="pvn-admin-layout">
                    
                    <aside class="pvn-admin-sidebar">
                        <div class="pvn-admin-sidebar-menu">
                            <ul>
                                <?php foreach($types_labels as $t => $label): ?>
                                    <li>
                                        <a href="<?php echo esc_url(home_url('/admin-models?type=' . $t)); ?>" class="<?php echo $type === $t ? 'active' : ''; ?>">
                                            <?php echo esc_html($label); ?>
                                        </a>
                                    </li>
                                <?php endforeach; ?>
                                <li style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--pvn-line);">
                                    <a href="<?php echo esc_url(admin_url('admin.php?page=pecadosvip-copy')); ?>" target="_blank">Textos y diseño ↗</a>
                                </li>
                            </ul>
                        </div>
                    </aside>
                    
                    <section class="pvn-section" style="flex-grow: 1; min-width: 0; padding: 0; margin: 0; max-width: none;">
                        <p class="pvn-eyebrow">Gestión de <?php echo esc_html($type_label); ?></p>
                        
                        <?php if (isset($_GET['msg']) && $_GET['msg'] === 'saved'): ?>
                            <div class="pvn-msg">Los cambios se han guardado correctamente.</div>
                        <?php endif; ?>

                        <?php if (isset($_GET['edit']) || isset($_GET['new'])): 
                            $post_id = isset($_GET['edit']) ? (int) $_GET['edit'] : 0;
                            $post = $post_id ? get_post($post_id) : (object) array('ID' => 0, 'post_title' => '', 'post_content' => '', 'post_type' => $type);
                            $data = $post_id ? pvc_sanitize_data(get_post_meta($post_id, 'pv_data', true), $type) : array();
                            $locale = $post_id ? (get_post_meta($post_id, 'pv_locale', true) ?: 'es') : 'es';
                            $key = $post_id ? get_post_meta($post_id, 'pv_key', true) : '';
                            $fields = pvc_fields($type);
                            $thumbnail_id = $post_id ? get_post_thumbnail_id($post_id) : '';
                        ?>
                            <form method="post" action="" class="pvn-filters">
                                <?php wp_nonce_field('pvc_save_model', 'pvc_frontend_admin_nonce'); ?>
                                <input type="hidden" name="post_ID" value="<?php echo esc_attr($post_id); ?>">
                                <input type="hidden" name="pvc_locale" value="<?php echo esc_attr($locale); ?>">
                                <input type="hidden" name="pvc_key" value="<?php echo esc_attr($key); ?>">
                                
                                <fieldset style="margin-bottom: 2rem;">
                                    <legend>Datos Básicos</legend>
                                    <label>
                                        Título / Nombre
                                        <input type="text" name="post_title" value="<?php echo esc_attr($post->post_title); ?>" required>
                                    </label>
                                    <label style="flex-basis: 100%;">
                                        Contenido / Descripción
                                        <textarea name="post_content" rows="6"><?php echo esc_textarea($post->post_content); ?></textarea>
                                    </label>
                                </fieldset>
                                
                                <fieldset style="margin-bottom: 2rem;">
                                    <legend>Imagen Principal (Portada)</legend>
                                    <div style="flex-basis: 100%;">
                                        <button type="button" class="pvn-button pvn-add-media" style="border: 1px solid var(--pvn-gold); background: transparent; color: var(--pvn-gold); margin-bottom: 1rem;" data-target="pvn-featured-preview" data-multiple="false">Establecer Imagen Destacada</button>
                                        <div class="pvn-gallery-preview" id="pvn-featured-preview">
                                            <?php if ($thumbnail_id): $img = wp_get_attachment_image_src($thumbnail_id, 'thumbnail'); if ($img): ?>
                                                <div class="pvn-gallery-item">
                                                    <img src="<?php echo esc_url($img[0]); ?>" alt="">
                                                    <input type="hidden" name="post_thumbnail_id" value="<?php echo esc_attr($thumbnail_id); ?>">
                                                    <button type="button" onclick="this.parentElement.remove()">×</button>
                                                </div>
                                            <?php endif; endif; ?>
                                        </div>
                                    </div>
                                </fieldset>

                                <fieldset style="margin-bottom: 2rem;">
                                    <legend>Campos de <?php echo esc_html($type_label); ?></legend>
                                    
                                    <?php foreach($fields as $fk => $field): 
                                        $val = $data[$fk] ?? ($field['default'] ?? null);
                                        $label = $field['label'] ?? $fk;
                                    ?>
                                        <?php if ($field['type'] === 'boolean'): ?>
                                            <label style="flex-direction: row; align-items: center; gap: 0.5rem; flex-basis: 100%;">
                                                <input type="checkbox" name="pvc_data[<?php echo esc_attr($fk); ?>]" value="1" <?php checked((bool)$val); ?>>
                                                <?php echo esc_html($label); ?>
                                            </label>
                                        <?php elseif ($field['type'] === 'integer'): ?>
                                            <label>
                                                <?php echo esc_html($label); ?>
                                                <input type="number" name="pvc_data[<?php echo esc_attr($fk); ?>]" value="<?php echo esc_attr($val); ?>" 
                                                       min="<?php echo esc_attr($field['minimum'] ?? ''); ?>" max="<?php echo esc_attr($field['maximum'] ?? ''); ?>">
                                            </label>
                                        <?php elseif ($field['type'] === 'string' && isset($field['enum'])): ?>
                                            <label>
                                                <?php echo esc_html($label); ?>
                                                <select name="pvc_data[<?php echo esc_attr($fk); ?>]">
                                                    <?php foreach($field['enum'] as $opt): ?>
                                                        <option value="<?php echo esc_attr($opt); ?>" <?php selected($val, $opt); ?>><?php echo esc_html($opt); ?></option>
                                                    <?php endforeach; ?>
                                                </select>
                                            </label>
                                        <?php elseif ($field['type'] === 'string'): ?>
                                            <label>
                                                <?php echo esc_html($label); ?>
                                                <input type="text" name="pvc_data[<?php echo esc_attr($fk); ?>]" value="<?php echo esc_attr($val); ?>">
                                            </label>
                                        <?php elseif ($field['type'] === 'array' && ($field['control'] ?? '') === 'gallery'): ?>
                                            <div style="flex-basis: 100%; margin-top: 1rem;">
                                                <label><?php echo esc_html($label); ?></label>
                                                <button type="button" class="pvn-button pvn-add-media" style="border: 1px solid var(--pvn-gold); background: transparent; color: var(--pvn-gold); margin-bottom: 1rem;" data-target="pvn-gallery-<?php echo esc_attr($fk); ?>" data-multiple="true">Añadir Fotos a la Galería</button>
                                                <div class="pvn-gallery-preview" id="pvn-gallery-<?php echo esc_attr($fk); ?>">
                                                    <?php foreach ((array)$val as $img_id): $img = wp_get_attachment_image_src($img_id, 'thumbnail'); if ($img): ?>
                                                        <div class="pvn-gallery-item">
                                                            <img src="<?php echo esc_url($img[0]); ?>" alt="">
                                                            <input type="hidden" name="pvc_data[<?php echo esc_attr($fk); ?>][]" value="<?php echo esc_attr($img_id); ?>">
                                                            <button type="button" onclick="this.parentElement.remove()">×</button>
                                                        </div>
                                                    <?php endif; endforeach; ?>
                                                </div>
                                            </div>
                                        <?php elseif ($field['type'] === 'array' && ($field['control'] ?? '') === 'cities'): ?>
                                            <div class="pvn-checkbox-group" style="flex-basis: 100%; margin-top: 1rem;">
                                                <strong style="display: block; margin-bottom: 0.5rem; color: #d7cbb4; font-weight: normal; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;"><?php echo esc_html($label); ?></strong>
                                                <?php foreach (pvc_records('city', $pvwp_locale) as $c): ?>
                                                    <label><input type="checkbox" name="pvc_data[<?php echo esc_attr($fk); ?>][]" value="<?php echo esc_attr($c['key']); ?>" <?php checked(in_array($c['key'], (array)$val)); ?>> <?php echo esc_html($c['title']); ?></label>
                                                <?php endforeach; ?>
                                            </div>
                                        <?php elseif ($field['type'] === 'array' && ($field['control'] ?? '') === 'services'): ?>
                                            <div class="pvn-checkbox-group" style="flex-basis: 100%; margin-top: 1rem;">
                                                <strong style="display: block; margin-bottom: 0.5rem; color: #d7cbb4; font-weight: normal; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;"><?php echo esc_html($label); ?></strong>
                                                <?php foreach (pvc_records('service', $pvwp_locale) as $s): ?>
                                                    <label><input type="checkbox" name="pvc_data[<?php echo esc_attr($fk); ?>][]" value="<?php echo esc_attr($s['key']); ?>" <?php checked(in_array($s['key'], (array)$val)); ?>> <?php echo esc_html($s['title']); ?></label>
                                                <?php endforeach; ?>
                                            </div>
                                        <?php elseif ($field['type'] === 'array' && ($field['control'] ?? '') === 'profiles'): ?>
                                            <div class="pvn-checkbox-group" style="flex-basis: 100%; margin-top: 1rem;">
                                                <strong style="display: block; margin-bottom: 0.5rem; color: #d7cbb4; font-weight: normal; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;"><?php echo esc_html($label); ?></strong>
                                                <?php foreach (pvc_records('profile', $pvwp_locale) as $p): ?>
                                                    <label><input type="checkbox" name="pvc_data[<?php echo esc_attr($fk); ?>][]" value="<?php echo esc_attr($p['key']); ?>" <?php checked(in_array($p['key'], (array)$val)); ?>> <?php echo esc_html($p['title']); ?></label>
                                                <?php endforeach; ?>
                                            </div>
                                        <?php elseif ($field['type'] === 'array'): ?>
                                            <label style="flex-basis: 45%;">
                                                <?php echo esc_html($label); ?>
                                                <textarea name="pvc_data[<?php echo esc_attr($fk); ?>]" rows="3"><?php echo esc_textarea(implode("\n", (array)$val)); ?></textarea>
                                            </label>
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                </fieldset>

                                <fieldset>
                                    <button type="submit" class="pvn-button pvn-gold">Guardar Cambios</button>
                                    <a href="<?php echo esc_url(home_url('/admin-models?type=' . $type)); ?>" style="color: var(--pvn-gold); margin-left: 1rem; text-decoration: underline;">Cancelar</a>
                                </fieldset>
                            </form>
                            
                            <script>
                            jQuery(document).ready(function($){
                                $('.pvn-add-media').click(function(e) {
                                    e.preventDefault();
                                    var btn = $(this);
                                    var targetId = btn.data('target');
                                    var isMultiple = btn.data('multiple') === true;
                                    var fieldName = isMultiple ? targetId.replace('pvn-gallery-', 'pvc_data[') + '][]' : 'post_thumbnail_id';
                                    
                                    var mediaUploader = wp.media({ title: 'Seleccionar Fotos', button: { text: 'Usar imagen' }, multiple: isMultiple });
                                    mediaUploader.on('select', function() {
                                        var selection = mediaUploader.state().get('selection');
                                        if (!isMultiple) { $('#' + targetId).empty(); }
                                        selection.map(function(attachment) {
                                            attachment = attachment.toJSON();
                                            var url = attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url;
                                            var html = '<div class="pvn-gallery-item">' +
                                                '<img src="' + url + '" alt="">' +
                                                '<input type="hidden" name="' + fieldName + '" value="' + attachment.id + '">' +
                                                '<button type="button" onclick="this.parentElement.remove()">×</button>' +
                                            '</div>';
                                            $('#' + targetId).append(html);
                                        });
                                    });
                                    mediaUploader.open();
                                });
                            });
                            </script>

                        <?php else: ?>
                            
                            <div style="margin-bottom: 2rem;">
                                <a href="<?php echo esc_url(home_url('/admin-models?type=' . $type . '&new=1')); ?>" class="pvn-button pvn-gold">Añadir Nuevo(a)</a>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem;">
                                <?php 
                                $records = pvc_records($type_short, $pvwp_locale);
                                foreach ($records as $record): 
                                    $edit_url = home_url('/admin-models?type=' . $type . '&edit=' . $record['id']);
                                ?>
                                    <article class="pvn-profile-card">
                                        <a class="pvn-profile-photo" href="<?php echo esc_url($edit_url); ?>" style="display: flex; align-items: center; justify-content: center; background: #0c0b08; aspect-ratio: <?php echo $type === 'pv_city' || $type === 'pv_page' ? '16/9' : '3/4'; ?>; text-decoration: none;">
                                            <?php if ($record['image']): ?>
                                                <img src="<?php echo esc_url($record['image']['url']); ?>" alt="" style="width: 100%; height: 100%; object-fit: cover;">
                                            <?php else: ?>
                                                <span style="color: #666; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px;">Sin foto</span>
                                            <?php endif; ?>
                                        </a>
                                        <div class="pvn-profile-summary">
                                            <h3><a href="<?php echo esc_url($edit_url); ?>"><?php echo esc_html($record['title']); ?></a></h3>
                                            <?php if ($type === 'pv_profile'): ?>
                                                <p><?php echo esc_html($record['data']['homeZone'] ?? ''); ?></p>
                                                <small><?php echo esc_html($record['data']['age'] ?? ''); ?> Años</small>
                                            <?php elseif ($type === 'pv_service'): ?>
                                                <p><?php echo esc_html($record['data']['group'] ?? ''); ?></p>
                                            <?php elseif ($type === 'pv_city'): ?>
                                                <p>Zona: <?php echo esc_html($record['data']['zone'] ?? ''); ?></p>
                                            <?php elseif ($type === 'pv_page'): ?>
                                                <p>Ruta: <?php echo esc_html($record['data']['route'] ?? ''); ?></p>
                                            <?php endif; ?>
                                            <a class="pvn-card-link" href="<?php echo esc_url($edit_url); ?>" style="display: inline-block; margin-top: 0.5rem;">Editar</a>
                                        </div>
                                    </article>
                                <?php endforeach; ?>
                                <?php if (empty($records)): ?>
                                    <p>No hay elementos registrados en esta sección.</p>
                                <?php endif; ?>
                            </div>

                        <?php endif; ?>

                    </section>
                </div>
            </main>
            
            <footer class="pvn-footer">
                <a href="#inicio">Volver arriba</a>
            </footer>
        </div>
        <?php wp_footer(); ?>
    </body>
    </html>
    <?php
    exit;
}
