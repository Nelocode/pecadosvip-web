import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const wordpress = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function runHttpSmoke(baseUrl, fixture) {
  const target = new URL(baseUrl);
  assert.equal(target.hostname, '127.0.0.1', 'HTTP QA is restricted to the local Docker fixture.');
  assert.ok(fixture?.published?.length > 0, 'Actual WordPress QA fixtures are required.');
  const checks = [];
  const check = (name, detail = {}) => checks.push({ name, status: 'passed', ...detail });
  const cookies = new Map();
  const request = async (route, options = {}, authenticated = false) => {
    const headers = new Headers(options.headers || {});
    if (authenticated && cookies.size) headers.set('Cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual', signal: AbortSignal.timeout(30000), ...options, headers });
    if (authenticated) {
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0]; const separator = pair.indexOf('=');
        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    }
    return { response, body: await response.text() };
  };
  const getCatalog = async (locale = 'es') => {
    const result = await request(`/?rest_route=/pecadosvip/v1/catalog&lang=${locale}`);
    assert.equal(result.response.status, 200, `public editable catalog ${locale}`);
    return JSON.parse(result.body);
  };
  let failure;
  try {
    const sourcePath = path.join(wordpress, 'dist', 'pecadosvip', 'content', 'seed.json');
    const sourceBefore = digest(await readFile(sourcePath));
    const root = await request('/');
    assert.equal(root.response.status, 302);
    assert.equal(root.response.headers.get('location'), `${baseUrl}/es`);
    check('root redirects to localized WordPress frontend');

    const routes = new Map(fixture.seedRoutes.map((route) => [route.path, route]));
    for (const locale of ['es', 'en', 'fr', 'it']) {
      const catalog = await getCatalog(locale);
      assert.equal(catalog.locale, locale);
      for (const item of fixture.hidden) {
        assert.ok(![...catalog.profiles, ...catalog.services].some((record) => record.id === item.id), 'Hidden record leaked through public catalog');
      }
      for (const city of catalog.cities) {
        for (const availability of ['available', 'limited', 'on-request', 'unavailable']) {
          const query = new URLSearchParams({ city: city.key, availability });
          const route = `/${locale}/perfiles?${query}`;
          routes.set(route, { path: route, locale });
        }
      }
      for (const category of new Set(catalog.services.map((service) => service.data.group).filter(Boolean))) {
        const route = `/${locale}/servicios?${new URLSearchParams({ category })}`;
        routes.set(route, { path: route, locale });
      }
      for (const profile of catalog.profiles) {
        for (const [index] of profile.gallery.entries()) {
          const route = `/${locale}/perfiles/${profile.key}?foto=${index}`;
          routes.set(route, { path: route, locale });
        }
      }
    }
    let routeCount = 0;
    for (const route of routes.values()) {
      const { response, body } = await request(route.path);
      assert.equal(response.status, 200, `${route.path}: HTTP ${response.status}`);
      assert.match(body, /<main[^>]*id="main-content"|id="main-content"[^>]*>/, `${route.path}: native WordPress main content absent`);
      assert.match(body, new RegExp(`<html[^>]+lang="${route.locale}"`), `${route.path}: HTML language`);
      assert.ok(!/__(?:PV_HOME|PV_THEME)__/.test(body), `${route.path}: obsolete URL placeholder`);
      assert.ok(!/(?:Fatal error|Parse error|Uncaught Error):/.test(body), `${route.path}: PHP error`);
      assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
      routeCount++;
      if (routeCount % 100 === 0) console.log(`Docker HTTP QA: ${routeCount} páginas/filtros de contenido WordPress verificados.`);
    }
    check('all seeded database routes and dynamic filters render in WordPress', { routeCount, seedCounts: fixture.seedCounts });

    let mediaCount = 0;
    for (const mediaUrl of new Set([...fixture.seedMedia, fixture.gallery.url])) {
      const media = new URL(mediaUrl);
      assert.equal(media.origin, target.origin, 'Seed media must remain inside local WordPress');
      assert.ok(media.pathname.startsWith(`${target.pathname === '/' ? '' : target.pathname}/wp-content/uploads/`), 'Media must be real WordPress library uploads');
      const response = await fetch(media, { signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200, `${media.pathname}: image inaccessible`);
      assert.match(response.headers.get('content-type') || '', /image\//);
      await response.arrayBuffer(); mediaCount++;
    }
    check('imported and newly uploaded Media Library images are accessible', { mediaCount });

    const native = await request('/qa-native-page/');
    assert.equal(native.response.status, 200);
    assert.match(native.body, /QA_NATIVE_PAGE_CONTENT/);
    const rest = await request('/?rest_route=/wp/v2/pages&slug=qa-native-page');
    assert.equal(rest.response.status, 200);
    assert.ok(JSON.parse(rest.body).some((page) => page.content.rendered.includes('QA_NATIVE_PAGE_CONTENT')));
    const admin = await request('/wp-admin/');
    assert.ok([301, 302].includes(admin.response.status));
    assert.ok(admin.response.headers.get('location')?.includes('wp-login.php'));
    check('native WordPress page, REST and admin authentication preserved');

    for (const item of fixture.published) {
      const before = await request(item.path);
      assert.equal(before.response.status, 200, `new published ${item.type} route`);
      assert.ok(before.body.includes(item.title), `new ${item.type} title absent`);
    }
    for (const item of fixture.hidden) assert.equal((await request(item.path)).response.status, 404, 'Draft/private/password-protected route must be hidden');
    check('new published records create routes immediately; protected records remain hidden');

    const sample = fixture.published.find((item) => item.type === 'profile');
    const endpoint = `/?rest_route=/wp/v2/pecadosvip-profile/${sample.id}`;
    const payload = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'QA MUST NOT SAVE' }) };
    assert.ok([401, 403].includes((await request(endpoint, payload)).response.status), 'Anonymous REST mutation must fail');

    // Authenticate only against the local test site; credentials/cookies/nonces are never logged or reported.
    await request('/wp-login.php', {}, true);
    const password = (await readFile(path.join(wordpress, 'output', 'docker-secrets', 'admin-password.txt'), 'utf8')).trim();
    const login = await request('/wp-login.php', { method: 'POST', body: new URLSearchParams({ log: 'pecadosvip_qa', pwd: password, 'wp-submit': 'Log In', redirect_to: `${baseUrl}/wp-admin/`, testcookie: '1' }) }, true);
    assert.ok([302, 303].includes(login.response.status) && login.response.headers.get('location')?.includes('/wp-admin/'), 'QA admin login failed');
    assert.ok([401, 403].includes((await request(endpoint, payload, true)).response.status), 'Cookie without REST nonce must not authorize mutation');
    assert.equal((await request(endpoint, { ...payload, headers: { ...payload.headers, 'X-WP-Nonce': 'invalid' } }, true)).response.status, 403, 'Invalid REST nonce must fail');
    const restNonce = (await request('/wp-admin/admin-ajax.php?action=rest-nonce', {}, true)).body.trim();
    assert.match(restNonce, /^[a-f0-9]{10}$/, 'Could not obtain authenticated WordPress REST nonce');
    const mutate = (item, data) => request(`/?rest_route=/wp/v2/pecadosvip-${item.type}/${item.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': restNonce }, body: JSON.stringify(data) }, true);
    check('anonymous, nonce-free and invalid-nonce REST writes rejected');

    const invalidAge = await mutate(sample, { meta: { pv_data: { age: 17 } } });
    assert.equal(invalidAge.response.status, 400, 'Invalid adult age must be rejected by REST schema');
    for (const item of fixture.published) {
      const update = await mutate(item, { title: item.afterTitle, content: `<p>${item.afterContent}</p>`, excerpt: item.afterContent });
      assert.equal(update.response.status, 200, `save ${item.type} ${item.locale}`);
      const after = await request(item.path);
      assert.equal(after.response.status, 200);
      assert.ok(after.body.includes(item.afterTitle), `saved title not reflected on ${item.path}`);
      assert.ok(after.body.includes(item.afterContent), `saved content not reflected on ${item.path}`);
      assert.ok(!after.body.includes(item.title), `old title still rendered on ${item.path}`);
    }
    check('saving profile, service, city and page content updates frontend without build', { savedRecords: fixture.published.length });

    const currentProfile = (await getCatalog(sample.locale)).profiles.find((profile) => profile.id === sample.id);
    const galleryUpdate = await mutate(sample, { featured_media: fixture.gallery.id, meta: { pv_data: { ...currentProfile.data, gallery: [fixture.gallery.id] } } });
    assert.equal(galleryUpdate.response.status, 200);
    const galleryPage = await request(`${sample.path}?foto=0`);
    assert.equal(galleryPage.response.status, 200);
    assert.ok(galleryPage.body.includes(fixture.gallery.url), 'New WordPress gallery image not reflected on profile');
    assert.equal((await request(`${sample.path}?foto=1`)).response.status, 404, 'Removed gallery item must no longer resolve');
    check('Media Library featured image and gallery edits update the page and valid photo indexes');

    const statusFixture = fixture.hidden.find((item) => item.status === 'draft');
    assert.equal((await mutate(statusFixture, { status: 'publish' })).response.status, 200);
    assert.equal((await request(statusFixture.path)).response.status, 200, 'New publication must create route');
    assert.equal((await mutate(statusFixture, { status: 'private' })).response.status, 200);
    assert.equal((await request(statusFixture.path)).response.status, 404, 'Making profile private must immediately remove public route');
    check('publish and private transitions update routing without a build');

    for (const locale of ['es', 'en', 'fr', 'it']) {
      const settings = await request(`/wp-admin/admin.php?page=pecadosvip-copy&lang=${locale}&group=hero`, {}, true);
      assert.equal(settings.response.status, 200, 'Editable copy settings page');
      const match = settings.body.match(/name="pvc_copy_nonce"[^>]*value="([^"]+)"/);
      assert.ok(match, 'Copy form nonce missing');
      const value = `QA EDITABLE HERO ${locale.toUpperCase()}`;
      const form = new URLSearchParams({ action: 'pvc_save_copy', pvc_locale: locale, pvc_group: 'hero', pvc_copy_nonce: match[1], [`pvc_copy[${Buffer.from('hero.titlePrimary').toString('hex')}]`]: value });
      const invalid = new URLSearchParams(form); invalid.set('pvc_copy_nonce', 'invalid');
      assert.equal((await request('/wp-admin/admin-post.php', { method: 'POST', body: invalid }, true)).response.status, 403, 'Invalid copy form nonce must fail');
      const saved = await request('/wp-admin/admin-post.php', { method: 'POST', body: form }, true);
      assert.ok([302, 303].includes(saved.response.status), `Save ${locale} copy`);
      const home = await request(`/${locale}`);
      assert.ok(home.body.includes(value), `${locale} saved homepage text missing`);
      assert.equal((await getCatalog(locale)).copy.hero.titlePrimary, value, `${locale} saved copy API mismatch`);
    }
    check('Spanish, English, French and Italian text edits save through nonce-protected WordPress admin forms');
    assert.equal(digest(await readFile(sourcePath)), sourceBefore, 'Source seed must remain unchanged while database edits affect the website');
    check('frontend changed from WordPress edits while the built seed remained unchanged');

    for (const route of ['/es/qa-nonexistent', '/es?city=invalid', '/es?city=madrid&city=barcelona', '/es?city[]=madrid', `${sample.path}?foto=invalid`]) {
      assert.equal((await request(route)).response.status, 404, `Invalid route/filter: ${route}`);
    }
    check('invalid dynamic paths, duplicated/array filters and gallery identities return 404');
  } catch (error) {
    failure = error;
    checks.push({ name: 'Editable WordPress HTTP smoke', status: 'failed', error: error.stack || String(error) });
  }
  const reportPath = path.join(wordpress, 'output', `docker-http-smoke${target.pathname && target.pathname !== '/' ? '-subdirectory' : ''}.json`);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), environment: 'local Docker WordPress/PHP/MariaDB', conversion: 'native-editable', baseUrl, passed: !failure, checks }, null, 2));
  if (failure) throw failure;
  console.log(`Docker WordPress editable QA correcta. Informe: ${reportPath}`);
}
