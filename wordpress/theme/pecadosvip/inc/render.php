<?php
if (!defined('ABSPATH')) { exit; }

function pvwp_value(string $path, $fallback = '') {
    $value = function_exists('pvc_copy') ? pvc_copy(pvwp_context()['locale'] ?? 'es') : array();
    if (strpos($path, 'site.') === 0 && function_exists('pvc_site')) { $value['site'] = pvc_site(pvwp_context()['locale'] ?? 'es'); }
    foreach (explode('.', $path) as $key) { if (!is_array($value) || !array_key_exists($key, $value)) { return $fallback; } $value = $value[$key]; }
    return $value;
}
function pvwp_text(string $path, array $vars = array()): string {
    $value = pvwp_value($path); if (!is_scalar($value)) { return ''; }
    $text = (string) $value;
    foreach ($vars as $key => $replacement) { $text = str_replace('{' . $key . '}', (string) $replacement, $text); }
    return $text;
}
function pvwp_label(string $path, array $vars = array()): void { echo esc_html(pvwp_text($path, $vars)); }
function pvwp_group_label(string $group): string { return pvwp_text('services.groups.' . $group . '.label') ?: $group; }
function pvwp_tags(array $data): void {
    if (empty($data['tags'])) { return; }
    echo '<div class="pvn-tags">'; foreach ($data['tags'] as $tag) { echo '<span>' . esc_html($tag) . '</span>'; } echo '</div>';
}
function pvwp_extra_gallery(array $record): void {
    if (empty($record['gallery'])) { return; }
    echo '<div class="pvn-extra-gallery">';
    foreach ($record['gallery'] as $image) { if (empty($image['url'])) { continue; } echo '<a href="' . esc_url($image['url']) . '">'; pvwp_media($image, '', false, '(max-width:700px) 45vw, 24vw'); echo '</a>'; }
    echo '</div>';
}
function pvwp_media($image, string $class = '', bool $priority = false, string $sizes = '100vw'): void {
    if (is_numeric($image) && function_exists('pvc_media')) { $image = pvc_media((int) $image); }
    if (!is_array($image) || empty($image['url'])) { return; }
    // Attachment metadata supplies WordPress-generated responsive variants when available.
    if (!empty($image['id']) && wp_attachment_is_image((int) $image['id'])) {
        echo wp_get_attachment_image((int) $image['id'], 'full', false, array('class' => $class, 'alt' => $image['alt'] ?? '', 'loading' => $priority ? 'eager' : 'lazy', 'fetchpriority' => $priority ? 'high' : 'auto', 'decoding' => 'async', 'sizes' => $sizes));
        return;
    }
    echo '<img class="' . esc_attr($class) . '" src="' . esc_url($image['url']) . '" alt="' . esc_attr($image['alt'] ?? '') . '" loading="' . ($priority ? 'eager' : 'lazy') . '" decoding="async"';
    if (!empty($image['width']) && !empty($image['height'])) { echo ' width="' . (int) $image['width'] . '" height="' . (int) $image['height'] . '"'; }
    echo '>';
}
function pvwp_rich(array $record): void {
    if (empty($record['content'])) { return; }
    echo '<div class="pvn-rich" data-content-id="' . (int) ($record['id'] ?? 0) . '">';
    // The plugin already applies WordPress the_content exactly once, including editor blocks.
    echo $record['content'];
    echo '</div>';
    if (!empty($record['id']) && current_user_can('edit_post', (int) $record['id'])) {
        $edit = get_edit_post_link((int) $record['id']);
        if ($edit) { echo '<a class="pvn-editor-link" href="' . esc_url($edit) . '">' . esc_html__('Edit', 'pecadosvip') . '</a>'; }
    }
}
function pvwp_language_url(string $locale): ?string {
    $context = pvwp_context(); $route = $context['route'] ?? array(); $kind = $route['kind'] ?? 'home';
    if (in_array($kind, array('home', 'profiles', 'services'), true)) {
        $key = array('home' => 'home', 'profiles' => 'perfiles', 'services' => 'servicios')[$kind];
        if (!pvc_record('page', $locale, $key)) { return null; }
        $suffix = $key === 'home' ? '' : $key;
    } else {
        $record = pvc_record($kind, $locale, $route['record']['key'] ?? '');
        if (!$record) { return null; }
        $suffix = pvwp_record_path($kind, $record);
    }
    $query = $context['query'] ?? array();
    if (isset($query['category'])) {
        $groups = array_map(static fn($s) => $s['data']['group'] ?? '', pvc_records('service', $locale));
        if (!in_array($query['category'], $groups, true)) { unset($query['category']); }
    }
    if (isset($query['city']) && !pvc_record('city', $locale, $query['city'])) { unset($query['city']); }
    if (isset($query['foto']) && $kind === 'profile') {
        $gallery = $record['gallery'] ?? array(); $photo = $query['foto'];
        $index = $photo === 'cover' ? 0 : (strpos($photo, 'gallery-') === 0 ? (int) substr($photo, 8) : (int) $photo);
        if (!isset($gallery[$index])) { unset($query['foto']); }
    }
    return pvwp_url($suffix, $locale, $query);
}
function pvwp_filigree(): void {
    $image = pvwp_value('site.mosaic', array());
    if (is_numeric($image)) { $image = pvc_media((int) $image); }
    if (!is_array($image) || empty($image['url'])) { return; }
    echo '<div class="pvn-mosaic" aria-hidden="true" style="--pvn-mosaic:url(&quot;' . esc_url($image['url']) . '&quot;)"></div>';
}
function pvwp_brand(): void {
    echo '<a class="pvn-brand" href="' . esc_url(pvwp_url()) . '">';
    if (has_custom_logo()) { $image = pvc_media((int) get_theme_mod('custom_logo')); pvwp_media($image, 'pvn-custom-logo', true); }
    else { pvwp_media(pvwp_value('site.logo', array()), 'pvn-brand-mark', true, '110px');
        echo '<span class="pvn-brand-copy"><span><span class="pvn-brand-gold">' . esc_html(pvwp_text('site.brandPrimary')) . '</span><span class="pvn-brand-white">' . esc_html(pvwp_text('site.brandSuffix')) . '</span></span><small>' . esc_html(pvwp_text('brand.tagline')) . '</small></span>';
    }
    echo '</a>';
}
function pvwp_nav_links(): void {
    $location = 'primary_' . pvwp_context()['locale'];
    if (has_nav_menu($location)) { wp_nav_menu(array('theme_location' => $location, 'container' => false, 'items_wrap' => '<ul class="pvn-wp-menu">%3$s</ul>', 'depth' => 2, 'fallback_cb' => false)); return; }
    $links = array(array('', 'navigation.home', 'home'), array('#cobertura', 'navigation.zones', ''), array('perfiles', 'navigation.profiles', 'profiles'), array('servicios', 'navigation.services', 'services'), array('contacto', 'navigation.contact', 'page'));
    $current = pvwp_context()['route']['kind'] ?? '';
    foreach ($links as [$path, $key, $kind]) {
        $href = strpos($path, '#') === 0 ? pvwp_url() . $path : pvwp_url($path);
        if ($path === 'contacto' && !pvc_record('page', pvwp_context()['locale'], 'contacto')) { continue; }
        if (in_array($path, array('', 'perfiles', 'servicios'), true) && !pvc_record('page', pvwp_context()['locale'], $path === '' ? 'home' : $path)) { continue; }
        echo '<a href="' . esc_url($href) . '"' . ($kind !== '' && $current === $kind ? ' aria-current="page"' : '') . '>' . esc_html(pvwp_text($key)) . '</a>';
    }
}
function pvwp_header(): void { ?>
    <header class="pvn-header" id="inicio">
        <div class="pvn-header-row"><?php pvwp_brand(); ?>
            <nav class="pvn-desktop-nav" aria-label="<?php echo esc_attr(pvwp_text('navigation.primaryAria')); ?>"><?php pvwp_nav_links(); ?></nav>
            <button class="pvn-menu-button" type="button" aria-controls="pvn-mobile-menu" aria-expanded="false" hidden><?php pvwp_label('services.navigation.menu'); ?> <span aria-hidden="true">☰</span></button>
        </div>
        <nav class="pvn-languages" aria-label="<?php echo esc_attr(pvwp_text('navigation.languageAria')); ?>">
        <?php foreach (array('es', 'en', 'fr', 'it') as $locale) { $url = pvwp_language_url($locale); if ($url === null) { continue; } $copy = pvc_copy($locale); ?>
            <a href="<?php echo esc_url($url); ?>" lang="<?php echo esc_attr($locale); ?>" hreflang="<?php echo esc_attr($locale); ?>" <?php if ($locale === pvwp_context()['locale']) { echo 'aria-current="page"'; } ?>><?php echo esc_html($copy['languageName'] ?? $locale); ?></a>
        <?php } ?></nav>
    </header>
    <dialog id="pvn-mobile-menu" class="pvn-mobile-menu" aria-label="<?php echo esc_attr(pvwp_text('navigation.mobileAria')); ?>">
        <button class="pvn-menu-close" type="button"><?php pvwp_label('services.navigation.close'); ?> <span aria-hidden="true">×</span></button>
        <nav><?php pvwp_nav_links(); ?></nav>
    </dialog>
    <noscript><nav class="pvn-noscript-nav" aria-label="<?php echo esc_attr(pvwp_text('navigation.mobileAria')); ?>"><?php pvwp_nav_links(); ?></nav></noscript>
<?php }
function pvwp_hero(): void { ?>
    <section class="pvn-hero" aria-labelledby="pvn-hero-title">
        <?php pvwp_media(pvwp_value('site.hero', array()), 'pvn-hero-image', true, '(max-width: 700px) 100vw, 70vw'); ?>
        <div class="pvn-hero-content"><p class="pvn-eyebrow"><?php pvwp_label('hero.eyebrow'); ?></p>
            <h1 id="pvn-hero-title"><span><?php pvwp_label('hero.titlePrimary'); ?></span><br><?php pvwp_label('hero.titleSecondary'); ?></h1>
            <p class="pvn-hero-location"><?php pvwp_label('hero.location'); ?></p><p class="pvn-kicker"><?php pvwp_label('hero.kicker'); ?></p>
            <div class="pvn-hero-actions"><a class="pvn-button pvn-gold" href="<?php echo esc_url(pvwp_url('', null, array('city' => 'madrid')) . '#zona-madrid'); ?>"><?php pvwp_label('hero.madridCta'); ?><span aria-hidden="true">→</span></a>
            <a class="pvn-button pvn-gold" href="<?php echo esc_url(pvwp_url('', null, array('city' => 'barcelona')) . '#zona-barcelona'); ?>"><?php pvwp_label('hero.barcelonaCta'); ?><span aria-hidden="true">→</span></a></div>
            <p class="pvn-hero-note"><?php pvwp_label('hero.note'); ?></p>
        </div><span class="pvn-disclosure pvn-hero-disclosure"><?php pvwp_label('hero.generatedImageDisclosure'); ?></span>
    </section>
    <div class="pvn-trust"><?php foreach (pvwp_value('trustSignals', array()) as $i => $signal) { ?><article><span class="pvn-trust-icon" aria-hidden="true"><?php echo array('◇', '♛', '⌖', '♧')[$i % 4]; ?></span><small><?php echo esc_html($signal['code']); ?></small><h2><?php echo esc_html($signal['title']); ?></h2><p><?php echo esc_html($signal['detail']); ?></p></article><?php } ?></div>
<?php }
function pvwp_section_heading(string $eyebrow, string $title, string $body = ''): void {
    echo '<div class="pvn-section-heading"><p class="pvn-eyebrow">' . esc_html($eyebrow) . '</p><h2>' . esc_html($title) . '</h2>';
    if ($body !== '') { echo '<p>' . esc_html($body) . '</p>'; } echo '</div>';
}
function pvwp_coverage(): void {
    $locale = pvwp_context()['locale']; $cities = pvc_records('city', $locale); $zones = array();
    foreach ($cities as $city) { $zones[$city['data']['zone'] ?? $city['key']][] = $city; }
    ?><section id="cobertura" class="pvn-section">
    <?php pvwp_section_heading(pvwp_text('coverage.eyebrow'), pvwp_text('coverage.title'), pvwp_text('coverage.body')); ?>
    <div class="pvn-coverage-zones"><?php foreach ($zones as $zone => $destinations) { $base = pvc_record('city', $locale, (string) $zone); ?>
        <section class="pvn-coverage-zone"><h3><?php echo esc_html($base['title'] ?? $zone); ?></h3><div class="pvn-city-grid">
        <?php foreach ($destinations as $city) { ?><a class="pvn-city-card" href="<?php echo esc_url(pvwp_url($city['key'])); ?>"><?php pvwp_media($city['image'] ?? null, '', false, '(max-width:700px) 45vw, 22vw'); ?><div><h4><?php echo esc_html($city['title']); ?></h4><small><?php echo esc_html(($city['data']['coverage'] ?? '') ?: pvwp_text('coverage.pendingStatus')); ?></small></div></a><?php } ?>
        </div></section><?php } ?></div><p class="pvn-muted pvn-centered"><?php pvwp_label('coverage.mediaDisclosure'); ?></p></section><?php
}
function pvwp_profile_matches(array $profile, string $city): bool {
    if ($city === '') { return true; }
    $cities = $profile['data']['cities'] ?? array();
    return in_array($city, $cities, true) || ($profile['data']['homeZone'] ?? '') === $city;
}
function pvwp_profile_card(array $profile): void {
    $data = $profile['data']; $href = pvwp_url('perfiles/' . $profile['key']); $names = array();
    foreach (($data['cities'] ?? array()) as $key) { $city = pvc_record('city', pvwp_context()['locale'], $key); if ($city) { $names[] = $city['title']; } }
    ?><article class="pvn-profile-card" data-record-id="<?php echo (int) $profile['id']; ?>"><a class="pvn-profile-photo" href="<?php echo esc_url($href); ?>" tabindex="-1" aria-hidden="true"><?php pvwp_media($profile['image'] ?? null, '', false, '(max-width:700px) 45vw, 22vw'); ?></a>
    <div class="pvn-profile-summary"><h3><a href="<?php echo esc_url($href); ?>"><?php echo esc_html($profile['title']); ?></a></h3><p><?php echo esc_html(implode(' · ', $names)); ?></p><small><?php echo esc_html((string) ($data['age'] ?? '')); ?> <?php pvwp_label('profilesSection.ageYears'); ?></small><p class="pvn-availability" data-status="<?php echo esc_attr($data['availability'] ?? 'on-request'); ?>"><?php pvwp_label('filters.availability.' . ($data['availability'] ?? 'on-request')); ?></p><?php if ($data['synthetic'] ?? true) { ?><span class="pvn-disclosure"><?php pvwp_label('profilesSection.cardDisclosureShort'); ?></span><?php } ?><a class="pvn-card-link" href="<?php echo esc_url($href); ?>"><?php pvwp_label('profilesSection.viewProfile'); ?> <span aria-hidden="true">→</span></a></div></article><?php
}
function pvwp_profiles(?string $city_override = null): void {
    $context = pvwp_context(); $locale = $context['locale']; $city = $city_override ?? ($context['query']['city'] ?? ''); $availability = $context['query']['availability'] ?? '';
    $profiles = array_values(array_filter(pvc_records('profile', $locale), static fn($p) => pvwp_profile_matches($p, $city) && ($availability === '' || ($p['data']['availability'] ?? '') === $availability)));
    ?><section id="perfiles" class="pvn-section">
    <?php pvwp_section_heading(pvwp_text('profilesSection.eyebrow'), pvwp_text('profilesSection.title'), pvwp_text('profilesSection.note')); ?>
    <form class="pvn-filters" action="<?php echo esc_url(pvwp_url('perfiles')); ?>#perfiles" method="get"><fieldset><legend><?php pvwp_label('filters.legend'); ?></legend>
    <label><?php pvwp_label('filters.cityLabel'); ?><select name="city"><option value=""><?php pvwp_label('filters.allCities'); ?></option><?php foreach (pvc_records('city', $locale) as $c) { ?><option value="<?php echo esc_attr($c['key']); ?>" <?php selected($city, $c['key']); ?>><?php echo esc_html($c['title']); ?></option><?php } ?></select></label>
    <label><?php pvwp_label('filters.availabilityLabel'); ?><select name="availability"><option value=""><?php pvwp_label('filters.allAvailabilities'); ?></option><?php foreach (pvwp_value('filters.availability', array()) as $key => $label) { ?><option value="<?php echo esc_attr($key); ?>" <?php selected($availability, $key); ?>><?php echo esc_html($label); ?></option><?php } ?></select></label>
    <button class="pvn-button pvn-gold" type="submit"><?php pvwp_label('filters.apply'); ?></button><a href="<?php echo esc_url(pvwp_url('perfiles') . '#perfiles'); ?>"><?php pvwp_label('filters.reset'); ?></a></fieldset></form>
    <?php if (!$profiles) { ?><p class="pvn-empty"><?php pvwp_label('profilesSection.emptyTitle'); ?></p><?php } else {
        $zones = array(); foreach ($profiles as $p) { $key = $p['data']['homeZone'] ?? ($p['data']['cities'][0] ?? ''); $city_record = pvc_record('city', $locale, $key); $zone = $city_record['data']['zone'] ?? $key; $zones[$zone][] = $p; }
        foreach ($zones as $zone => $group) { $zone_record = pvc_record('city', $locale, (string) $zone); ?>
        <section id="zona-<?php echo esc_attr($zone); ?>" class="pvn-profile-zone" data-carousel><div class="pvn-row-heading"><h3><?php echo esc_html($zone_record['title'] ?? $zone); ?></h3><div class="pvn-carousel-controls" hidden><button type="button" data-carousel-prev aria-label="<?php echo esc_attr(pvwp_text('nativeUi.previous')); ?>">←</button><button type="button" data-carousel-play aria-pressed="false"><?php pvwp_label('nativeUi.play'); ?></button><button type="button" data-carousel-next aria-label="<?php echo esc_attr(pvwp_text('nativeUi.next')); ?>">→</button></div></div><div class="pvn-profile-track" data-carousel-track><?php foreach ($group as $profile) { pvwp_profile_card($profile); } ?></div></section>
        <?php }
    } ?></section><?php
}
function pvwp_service_card(array $service, bool $selectable = false): void {
    $group = $service['data']['group'] ?? ''; $href = pvwp_url('servicios/' . $service['key']);
    ?><article class="pvn-service-card synthetic-service-card" data-key="<?php echo esc_attr($service['key']); ?>" data-title="<?php echo esc_attr($service['title']); ?>" data-category="<?php echo esc_attr($group); ?>" data-order="<?php echo (int) ($service['order'] ?? 0); ?>"><div class="pvn-service-photo"><a href="<?php echo esc_url($href); ?>" tabindex="-1" aria-hidden="true"><?php pvwp_media($service['image'] ?? null, '', false, '(max-width:700px) 45vw, 23vw'); ?></a><span class="pvn-disclosure"><?php pvwp_label('services.media.generatedBadge'); ?></span><?php if ($selectable) { ?><button class="pvn-service-select" type="button" aria-pressed="false" data-select-service hidden><?php pvwp_label('services.hub.addToSelection'); ?></button><?php } ?></div><div class="pvn-service-copy"><small><?php echo esc_html(pvwp_group_label($group)); ?></small><h3><a href="<?php echo esc_url($href); ?>"><?php echo esc_html($service['title']); ?></a></h3><p><?php echo esc_html($service['excerpt'] ?? ''); ?></p><a class="pvn-card-link" href="<?php echo esc_url($href); ?>"><?php pvwp_label('services.hub.openService'); ?> →</a></div></article><?php
}
function pvwp_services(array $page): void {
    $services = pvc_records('service', pvwp_context()['locale']); $category = pvwp_context()['query']['category'] ?? ''; $groups = array_values(array_unique(array_map(static fn($s) => $s['data']['group'] ?? '', $services)));
    ?><section class="pvn-section pvn-page-intro"><p class="pvn-eyebrow"><?php pvwp_label('services.hub.eyebrow'); ?></p><h1><?php echo esc_html($page['title']); ?></h1><p><?php echo esc_html($page['excerpt'] ?? ''); ?></p><?php pvwp_rich($page); ?></section>
    <section id="service-catalog" class="pvn-section" data-service-explorer><?php pvwp_section_heading(pvwp_text('services.hub.catalogEyebrow'), pvwp_text('services.hub.catalogTitle', array('count' => count($services))), pvwp_text('services.hub.catalogLead')); ?>
    <form class="pvn-filters" method="get" action="<?php echo esc_url(pvwp_url('servicios')); ?>#service-catalog" data-service-form><fieldset><legend><?php pvwp_label('services.hub.filterLegend'); ?></legend><label><?php pvwp_label('services.hub.filterLabel'); ?><select name="category" data-service-category><option value=""><?php pvwp_label('services.hub.allGroups'); ?></option><?php foreach ($groups as $group) { ?><option value="<?php echo esc_attr($group); ?>" <?php selected($category, $group); ?>><?php echo esc_html(pvwp_group_label($group)); ?></option><?php } ?></select></label><button class="pvn-button pvn-gold" type="submit"><?php pvwp_label('services.hub.applyFilter'); ?></button><a href="<?php echo esc_url(pvwp_url('servicios') . '#service-catalog'); ?>"><?php pvwp_label('services.hub.resetFilter'); ?></a></fieldset></form>
    <div class="pvn-search-controls" data-enhanced-controls hidden><label><?php pvwp_label('services.hub.searchLabel'); ?><input type="search" data-service-search placeholder="<?php echo esc_attr(pvwp_text('services.hub.searchPlaceholder')); ?>"></label><label><?php pvwp_label('services.hub.sortLabel'); ?><select data-service-sort><option value="editorial"><?php pvwp_label('services.hub.sortEditorial'); ?></option><option value="name"><?php pvwp_label('services.hub.sortName'); ?></option></select></label><button class="pvn-button" type="button" data-service-reset><?php pvwp_label('services.hub.clearFilters'); ?></button></div>
    <p class="pvn-results" aria-live="polite" data-service-results></p><div class="pvn-service-grid" data-service-grid><?php foreach ($services as $s) { echo '<div class="pvn-service-item"' . ($category !== '' && ($s['data']['group'] ?? '') !== $category ? ' hidden' : '') . '>'; pvwp_service_card($s, true); echo '</div>'; } ?></div>
    <p class="pvn-empty" data-service-empty hidden><?php pvwp_label('services.hub.noResultsTitle'); ?></p>
    <aside class="pvn-selection" data-service-selection hidden><h3><?php pvwp_label('services.hub.selectionTitle'); ?></h3><p><?php pvwp_label('services.hub.selectionBody'); ?></p><ul data-selection-list></ul><p data-selection-status role="status"><?php pvwp_label('services.hub.selectionEmpty'); ?></p><button class="pvn-button" type="button" data-selection-clear><?php pvwp_label('services.hub.clearSelection'); ?></button><small><?php pvwp_label('services.hub.selectionPrivacy'); ?></small></aside></section>
    <?php $faqs = pvwp_value('services.faqs', array()); if ($faqs) { ?><section class="pvn-section pvn-faq"><?php pvwp_section_heading(pvwp_text('services.hub.faqEyebrow'), pvwp_text('services.hub.faqTitle')); foreach ($faqs as $faq) { ?><details><summary><?php echo esc_html($faq['question']); ?></summary><p><?php echo esc_html($faq['answer']); ?></p></details><?php } ?></section><?php }
}
function pvwp_breadcrumb(string $section, string $label, string $title): void { ?>
    <nav class="pvn-breadcrumb" aria-label="<?php echo esc_attr(pvwp_text('profile.breadcrumbAria')); ?>"><a href="<?php echo esc_url(pvwp_url()); ?>"><?php pvwp_label('navigation.home'); ?></a><span aria-hidden="true">/</span><a href="<?php echo esc_url(pvwp_url($section)); ?>"><?php echo esc_html($label); ?></a><span aria-hidden="true">/</span><span aria-current="page"><?php echo esc_html($title); ?></span></nav>
<?php }
function pvwp_profile(array $profile): void {
    $data = $profile['data']; $gallery = $profile['gallery'] ?? array(); if (!$gallery && !empty($profile['image'])) { $gallery = array($profile['image']); }
    $photo = pvwp_context()['query']['foto'] ?? '0'; $index = $photo === 'cover' ? 0 : (strpos($photo, 'gallery-') === 0 ? (int) substr($photo, 8) : (int) $photo); $selected = $gallery[$index] ?? ($gallery[0] ?? null);
    ?><section class="pvn-section"><?php pvwp_breadcrumb('perfiles', pvwp_text('navigation.profiles'), $profile['title']); ?><div class="pvn-profile-detail"><div class="pvn-gallery"><figure class="pvn-gallery-main"><?php pvwp_media($selected, '', true, '(max-width:700px) 100vw, 48vw'); ?><figcaption class="pvn-disclosure"><?php pvwp_label('profile.imageGenerated'); ?></figcaption></figure><nav class="pvn-gallery-thumbs" aria-label="<?php echo esc_attr(pvwp_text('profile.galleryAria')); ?>"><?php foreach ($gallery as $i => $image) { ?><a href="<?php echo esc_url(pvwp_url('perfiles/' . $profile['key'], null, array('foto' => (string) $i))); ?>" <?php if ($i === $index) { echo 'aria-current="true"'; } ?> aria-label="<?php echo esc_attr(pvwp_text('profile.selectPhotoAria') . ' ' . ($i + 1) . ': ' . $profile['title']); ?>"><?php pvwp_media($image, '', false, '100px'); ?></a><?php } ?></nav></div>
    <div class="pvn-profile-info"><p class="pvn-eyebrow"><?php pvwp_label('profile.statusBanner'); ?></p><h1><?php echo esc_html($profile['title']); ?></h1><p class="pvn-profile-age"><?php echo esc_html((string) ($data['age'] ?? '')); ?> <?php pvwp_label('profile.ageYears'); ?></p><div class="pvn-tags"><?php foreach (($data['cities'] ?? array()) as $key) { $city = pvc_record('city', pvwp_context()['locale'], $key); if ($city) { ?><a href="<?php echo esc_url(pvwp_url($key)); ?>"><?php echo esc_html($city['title']); ?></a><?php } } ?></div><p class="pvn-availability" data-status="<?php echo esc_attr($data['availability'] ?? 'on-request'); ?>"><?php pvwp_label('profile.availability.' . ($data['availability'] ?? 'on-request')); ?></p>
    <?php if (!empty($data['height'])) { ?><p><?php echo esc_html($data['height']); ?></p><?php } pvwp_rich($profile); ?><div class="pvn-tags"><?php foreach (array_merge($data['tags'] ?? array(), $data['conceptTags'] ?? array(), $data['languages'] ?? array()) as $tag) { ?><span><?php echo esc_html($tag); ?></span><?php } ?></div>
    <aside class="pvn-notice"><p><?php pvwp_label('profile.syntheticNotice'); ?></p><h2><?php pvwp_label('profile.contactDisabledTitle'); ?></h2><p><?php pvwp_label('profile.contactDisabledBody'); ?></p><button class="pvn-button" type="button" disabled><?php pvwp_label('profile.contactDisabledButton'); ?></button></aside></div></div>
    <?php $related = array(); foreach (($data['services'] ?? array()) as $key) { $service = pvc_record('service', pvwp_context()['locale'], $key); if ($service) { $related[] = $service; } } if ($related) { ?><section class="pvn-related"><h2><?php pvwp_label('navigation.services'); ?></h2><div class="pvn-service-grid"><?php foreach ($related as $service) { pvwp_service_card($service); } ?></div></section><?php } ?>
    <a class="pvn-button" href="<?php echo esc_url(pvwp_url('perfiles')); ?>"><?php pvwp_label('profile.backToProfiles'); ?></a></section><?php
}
function pvwp_service(array $service): void {
    ?><section class="pvn-section"><?php pvwp_breadcrumb('servicios', pvwp_text('navigation.services'), $service['title']); ?><div class="pvn-service-detail"><div class="pvn-detail-image"><?php pvwp_media($service['image'] ?? null, '', true, '(max-width:700px) 100vw, 48vw'); ?><span class="pvn-disclosure"><?php pvwp_label('services.media.generatedBadge'); ?></span></div><div><p class="pvn-eyebrow"><?php echo esc_html(pvwp_group_label($service['data']['group'] ?? '')); ?></p><h1><?php echo esc_html($service['title']); ?></h1><p class="pvn-lead"><?php echo esc_html($service['excerpt'] ?? ''); ?></p><?php pvwp_rich($service); pvwp_tags($service['data']); ?></div></div><?php pvwp_extra_gallery($service); ?><aside class="pvn-notice"><h2><?php pvwp_label('services.detail.disabledTitle'); ?></h2><p><?php pvwp_label('services.detail.disabledBody'); ?></p><button class="pvn-button" type="button" disabled><?php pvwp_label('services.detail.disabledButton'); ?></button></aside>
    <?php $related_profiles = array(); foreach (($service['data']['relatedProfiles'] ?? array()) as $key) { $p = pvc_record('profile', pvwp_context()['locale'], $key); if ($p) { $related_profiles[] = $p; } } if ($related_profiles) { ?><section class="pvn-related"><h2><?php pvwp_label('services.detail.profilesTitle'); ?></h2><div class="pvn-profile-track"><?php foreach ($related_profiles as $profile) { pvwp_profile_card($profile); } ?></div></section><?php } ?>
    <a class="pvn-button" href="<?php echo esc_url(pvwp_url('servicios')); ?>"><?php pvwp_label('services.detail.backToServices'); ?></a></section><?php
}
function pvwp_render_route(array $context): void {
    $kind = $context['route']['kind']; $record = $context['route']['record'] ?? array();
    if ($kind === 'home') { pvwp_hero(); if (!empty($record['content'])) { echo '<section class="pvn-section">'; pvwp_rich($record); echo '</section>'; } pvwp_coverage(); pvwp_profiles();
        echo '<section id="servicios" class="pvn-section">'; pvwp_section_heading(pvwp_text('servicesSection.eyebrow'), pvwp_text('servicesSection.title'), pvwp_text('servicesSection.body')); echo '<div class="pvn-service-grid">'; foreach (array_slice(pvc_records('service', $context['locale']), 0, 4) as $service) { pvwp_service_card($service); } echo '</div><a class="pvn-button" href="' . esc_url(pvwp_url('servicios')) . '">' . esc_html(pvwp_text('servicesSection.exploreRoutes')) . ' →</a></section>';
    } elseif ($kind === 'profiles') { if (!empty($record['content'])) { echo '<section class="pvn-section">'; pvwp_rich($record); echo '</section>'; } echo '<h1 class="pvn-listing-title">' . esc_html($record['title']) . '</h1>'; pvwp_profiles(); }
    elseif ($kind === 'services') { pvwp_services($record); }
    elseif ($kind === 'profile') { pvwp_profile($record); }
    elseif ($kind === 'service') { pvwp_service($record); }
    else { echo '<article class="pvn-section pvn-editorial-page"><p class="pvn-eyebrow">' . esc_html(pvwp_text('brand.tagline')) . '</p><h1>' . esc_html($record['title']) . '</h1>'; if (!empty($record['image'])) { pvwp_media($record['image'], 'pvn-page-image', true); } pvwp_rich($record); pvwp_tags($record['data']); if (!empty($record['data']['coverage'])) { echo '<p class="pvn-muted">' . esc_html($record['data']['coverage']) . '</p>'; } echo '</article>'; if ($kind === 'city') { pvwp_profiles($record['key']); } }
}
function pvwp_footer(): void { ?>
    <section id="seguridad" class="pvn-section pvn-security"><?php pvwp_section_heading(pvwp_text('security.eyebrow'), pvwp_text('security.title')); ?><ul><?php foreach (pvwp_value('security.items', array()) as $item) { ?><li><?php echo esc_html($item); ?></li><?php } ?></ul></section>
    <footer class="pvn-footer"><p><?php pvwp_label('footer.tagline'); ?></p><nav aria-label="<?php echo esc_attr(pvwp_text('navigation.footerAria')); ?>"><?php pvwp_nav_links(); foreach (pvc_records('page', pvwp_context()['locale']) as $page) { if (!in_array($page['key'], array('home', 'perfiles', 'servicios', 'contacto'), true)) { ?><a href="<?php echo esc_url(pvwp_url(pvwp_record_path('page', $page))); ?>"><?php echo esc_html($page['title']); ?></a><?php } } ?></nav><p class="pvn-muted"><?php pvwp_label('footer.reviewStatus'); ?></p><a href="#inicio"><?php pvwp_label('footer.backToTop'); ?> ↑</a></footer>
    <nav class="pvn-bottom-nav" aria-label="<?php echo esc_attr(pvwp_text('navigation.mobileAria')); ?>"><a href="<?php echo esc_url(pvwp_url()); ?>"><span aria-hidden="true">⌂</span><?php pvwp_label('navigation.home'); ?></a><a href="<?php echo esc_url(pvwp_url() . '#cobertura'); ?>"><span aria-hidden="true">⌖</span><?php pvwp_label('navigation.zones'); ?></a><a href="<?php echo esc_url(pvwp_url('perfiles')); ?>"><span aria-hidden="true">◇</span><?php pvwp_label('navigation.profiles'); ?></a><a href="<?php echo esc_url(pvwp_url('servicios')); ?>"><span aria-hidden="true">♧</span><?php pvwp_label('navigation.services'); ?></a><a href="<?php echo esc_url(pvwp_url() . '#seguridad'); ?>"><span aria-hidden="true">♙</span><?php pvwp_label('navigation.controls'); ?></a></nav>
<?php }
