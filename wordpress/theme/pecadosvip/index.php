<?php
if (!defined('ABSPATH')) { exit; }
$pvwp_page = pvwp_context(); $pvwp_owned = !empty($pvwp_page['owned']); $pvwp_ready = $pvwp_owned && ($pvwp_page['status'] ?? 404) === 200;
$pvwp_locale = $pvwp_page['locale'] ?? 'es'; $pvwp_error = pvwp_error_copy($pvwp_locale);
?><!doctype html>
<html <?php if ($pvwp_owned) { echo 'lang="' . esc_attr($pvwp_locale) . '"'; } else { language_attributes(); } ?>>
<head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head>
<body <?php body_class($pvwp_ready ? 'pvwp-frontend' : 'pvwp-native'); ?>>
<?php wp_body_open(); ?><a class="skip-link" href="#main-content"><?php echo esc_html($pvwp_ready ? pvwp_text('navigation.skipLink') : $pvwp_error['skip']); ?></a>
<?php if ($pvwp_ready) : ?>
<div class="public-page synthetic-preview-page pvn-site"><?php pvwp_filigree(); pvwp_header(); ?><main id="main-content">
<?php if (!empty($pvwp_page['preview'])) : ?><p class="pvn-preview-notice"><?php echo esc_html__('Preview', 'pecadosvip'); ?></p><?php endif; ?>
<?php pvwp_render_route($pvwp_page); ?></main><?php pvwp_footer(); ?></div>
<?php elseif ($pvwp_owned) : ?>
<main id="main-content" class="pvwp-native-shell"><h1><?php echo esc_html(($pvwp_page['status'] ?? 404) === 503 ? $pvwp_error['unavailable'] : $pvwp_error['notFound']); ?></h1><p><?php echo esc_html(($pvwp_page['status'] ?? 404) === 503 ? $pvwp_error['build'] : $pvwp_error['message']); ?></p><a href="<?php echo esc_url(home_url('/' . $pvwp_locale)); ?>"><?php echo esc_html($pvwp_error['back']); ?></a></main>
<?php else : ?>
<header class="pvwp-native-shell"><a href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a></header><main id="main-content" class="pvwp-native-shell">
<?php if (have_posts()) : while (have_posts()) : the_post(); ?><article id="post-<?php the_ID(); ?>" <?php post_class(); ?>><h1><?php the_title(); ?></h1><?php the_content(); wp_link_pages(); ?></article><?php endwhile; the_posts_navigation(); else : ?><h1><?php echo esc_html($pvwp_error['notFound']); ?></h1><?php get_search_form(); endif; ?></main><footer class="pvwp-native-shell"><?php bloginfo('name'); ?></footer>
<?php endif; wp_footer(); ?></body></html>
