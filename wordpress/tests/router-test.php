<?php
/** Pure dynamic-router contract. Execute only in Docker PHP; no static snapshot expectations. */
$theme_dir = getenv('PVWP_THEME_DIR') ?: __DIR__ . '/../theme/pecadosvip';
require_once $theme_dir . '/inc/router.php';
$route = array('kind' => 'home', 'title' => 'Fixture', 'allowed' => array('city' => array('madrid', 'barcelona'), 'availability' => array('on-request', 'available')));
$index = array('ready' => true, 'routes' => array('/es' => $route, '/fr' => $route,
    '/es/servicios' => array('kind' => 'services', 'allowed' => array('category' => array('travel'))),
    '/es/perfiles/qa-new-record' => array('kind' => 'profile', 'record' => array('id' => 999, 'title' => 'New DB record'), 'allowed' => array('foto' => array('0', '1', 'cover', 'gallery-01'))),
));
$count = 0;
function pvqa_equal($expected, $actual, string $label): void {
    global $count;
    if ($expected !== $actual) { throw new RuntimeException($label . ': expected ' . var_export($expected, true) . ', got ' . var_export($actual, true)); }
    $count++;
}
function pvqa_route(string $uri, string $base = ''): array { global $index; return pvwp_resolve_request($uri, $base, $index); }
pvqa_equal('/es', pvqa_route('/')['redirect'], 'Root locale');
pvqa_equal(200, pvqa_route('/es')['status'], 'Published route');
pvqa_equal(200, pvqa_route('/es/')['status'], 'Trailing slash');
pvqa_equal(array('city' => 'madrid', 'availability' => 'on-request'), pvqa_route('/es?availability=on-request&city=madrid')['query'], 'Dynamic filters canonical order');
pvqa_equal(array(), pvqa_route('/es?city=&availability=')['query'], 'Empty filters');
pvqa_equal(array(), pvqa_route('/es?tracking=x&tracking=y')['query'], 'Unknown tracking ignored');
pvqa_equal(404, pvqa_route('/es?city=unknown')['status'], 'Unknown city');
pvqa_equal(404, pvqa_route('/es?city=madrid&city=barcelona')['status'], 'Repeated city');
pvqa_equal(404, pvqa_route('/es?city=madrid&c%69ty=madrid')['status'], 'Encoded repeated city');
pvqa_equal(404, pvqa_route('/es?city[]=madrid')['status'], 'Array city');
pvqa_equal(404, pvqa_route('/es?city%5Bx%5D=madrid')['status'], 'Nested city');
pvqa_equal(404, pvqa_route('/es/not-published')['status'], 'Unknown or unpublished DB identity');
pvqa_equal('fr', pvqa_route('/fr/not-published')['locale'], 'Localized 404');
pvqa_equal(503, pvwp_resolve_request('/es', '', array('ready' => false))['status'], 'Plugin/seed unavailable');
pvqa_equal('/fr?city=madrid', pvqa_route('/preview-local-sintetico?lang=fr&city=madrid')['redirect'], 'Legacy alias');
pvqa_equal(404, pvqa_route('/preview-local-sintetico?lang=es&lang=fr')['status'], 'Duplicate legacy locale');
pvqa_equal(404, pvqa_route('/preview-local-sintetico?lang[]=es')['status'], 'Array legacy locale');
pvqa_equal(array(), pvqa_route('/es/servicios?category=all')['query'], 'All services category');
pvqa_equal(array('category' => 'travel'), pvqa_route('/es/servicios?category=travel')['query'], 'Dynamic category');
pvqa_equal(999, pvqa_route('/es/perfiles/qa-new-record')['route']['record']['id'], 'New database profile route');
pvqa_equal(array('foto' => '1'), pvqa_route('/es/perfiles/qa-new-record?foto=1')['query'], 'Attachment gallery numeric index');
pvqa_equal(array('foto' => 'cover'), pvqa_route('/es/perfiles/qa-new-record?foto=cover')['query'], 'Cover alias');
pvqa_equal(404, pvqa_route('/es/perfiles/qa-new-record?foto=2')['status'], 'Unknown attachment index');
pvqa_equal(404, pvqa_route('/es/perfiles/qa-new-record?foto=0&foto=1')['status'], 'Repeated photo');
pvqa_equal(200, pvqa_route('/demo/es', '/demo/')['status'], 'Subdirectory installation');
pvqa_equal('/es', pvqa_route('/demo/', '/demo')['redirect'], 'Subdirectory root');
pvqa_equal(false, pvqa_route('/demography/es', '/demo')['owned'], 'Base prefix boundary');
pvqa_equal(false, pvqa_route('/es', '/demo')['owned'], 'Outside home base');
foreach (array('/wp-admin/', '/wp-admin/admin-ajax.php', '/wp-login.php', '/wp-cron.php', '/wp-json/wp/v2/pages', '/xmlrpc.php', '/wp-content/uploads/photo.jpg', '/native-page', '/madrid', '/servicios', '/?p=12', '/?page_id=12', '/?s=test', '/?rest_route=/wp/v2/pages', '/?preview=true', '/?feed=rss2', '/?pagename=about', '/?post_type=product', '/?author=1', '/?paged=2') as $native) {
    pvqa_equal(false, pvqa_route($native)['owned'], 'Native WordPress: ' . $native);
}
unset($index['routes']['/es/perfiles/qa-new-record']);
pvqa_equal(404, pvqa_route('/es/perfiles/qa-new-record')['status'], 'Unpublishing removes route without an export');
echo 'PASS: ' . $count . " dynamic router assertions.\n";
