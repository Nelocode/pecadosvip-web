<?php
/** Pure URL validation; no request string is used as a filesystem include. */
function pvwp_parse_query(string $raw_query): array {
    $values = array(); $duplicates = array();
    foreach (explode('&', $raw_query) as $part) { if ($part === '') { continue; } $pair = explode('=', $part, 2); $key = urldecode($pair[0]); if (array_key_exists($key, $values)) { $duplicates[$key] = true; } $values[$key] = urldecode($pair[1] ?? ''); }
    return array('values' => $values, 'duplicates' => $duplicates);
}
function pvwp_resolve_request(string $uri, string $home_path, array $index): array {
    $parts = explode('?', $uri, 2); $raw = $parts[0]; $query = pvwp_parse_query($parts[1] ?? ''); $values = $query['values']; $base = rtrim($home_path, '/');
    if ($base !== '') { if ($raw !== $base && strpos($raw, $base . '/') !== 0) { return array('owned' => false); } $raw = substr($raw, strlen($base)); }
    $path = '/' . ltrim($raw, '/'); $path = $path === '/' ? '/' : rtrim($path, '/');
    if (preg_match('#^/(?:wp-admin|wp-json|wp-includes|wp-content)(?:/|$)|^/wp-[^/]+\.php$|^/xmlrpc\.php$#', $path)) { return array('owned' => false); }
    foreach (array('rest_route', 'p', 'page_id', 'name', 'pagename', 'post_type', 'attachment', 'attachment_id', 's', 'feed', 'preview', 'preview_id', 'customize_changeset_uuid', 'author', 'author_name', 'cat', 'category_name', 'tag', 'tag_id', 'taxonomy', 'term', 'm', 'year', 'monthnum', 'day', 'paged', 'cpage', 'embed', 'robots', 'favicon', 'sitemap') as $key) { if ($path === '/' && array_key_exists($key, $values)) { return array('owned' => false); } }
    if ($path === '/') { return array('owned' => true, 'status' => 302, 'redirect' => '/es', 'locale' => 'es'); }
    $legacy = $path === '/preview-local-sintetico' || strpos($path, '/preview-local-sintetico/') === 0;
    if ($legacy) { $locale = $values['lang'] ?? 'es'; if (!in_array($locale, array('es', 'en', 'fr', 'it'), true) || isset($query['duplicates']['lang']) || preg_grep('/^lang\[/', array_keys($values))) { return array('owned' => true, 'status' => 404, 'locale' => 'es'); } $path = '/' . $locale . substr($path, strlen('/preview-local-sintetico')); }
    if (!preg_match('#^/(es|en|fr|it)(?:/|$)#', $path, $match)) { return array('owned' => false); }
    $locale = $match[1]; $error = array('owned' => true, 'status' => 404, 'locale' => $locale, 'path' => $path);
    if (empty($index['ready'])) { return array_merge($error, array('status' => 503)); }
    $route = $index['routes'][$path] ?? null; if (!is_array($route)) { return $error; } $selected = array();
    foreach (($route['allowed'] ?? array()) as $key => $allowed) {
        foreach (array_keys($values) as $incoming) { if (strpos($incoming, $key . '[') === 0) { return $error; } }
        if (isset($query['duplicates'][$key])) { return $error; }
        if (!isset($values[$key]) || $values[$key] === '' || ($key === 'category' && $values[$key] === 'all')) { continue; }
        if (!in_array($values[$key], $allowed, true)) { return $error; } $selected[$key] = $values[$key];
    }
    if ($legacy) { return array('owned' => true, 'status' => 302, 'locale' => $locale, 'redirect' => $path . ($selected ? '?' . http_build_query($selected) : '')); }
    return array('owned' => true, 'status' => 200, 'locale' => $locale, 'path' => $path, 'query' => $selected, 'route' => $route);
}
