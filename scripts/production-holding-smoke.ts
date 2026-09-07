import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { lstat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCatalog } from '../lib/i18n/catalog.ts';
import {
  localizedPath,
  SUPPORTED_LOCALES,
  type Locale,
} from '../lib/i18n/locales.ts';
import { getSyntheticBetaCopy } from '../lib/preview/synthetic-beta-copy.ts';

const READY_TIMEOUT_MS = 20_000;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_SERVER_LOG_CHARS = 64 * 1024;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const standaloneServer = resolve(repositoryRoot, 'dist', 'standalone', 'server.js');

function delay(milliseconds: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function findLoopbackPort() {
  const reservation = createServer();
  reservation.unref();
  reservation.listen({ host: '127.0.0.1', port: 0, exclusive: true });
  await once(reservation, 'listening');
  const address = reservation.address();
  assert(address && typeof address === 'object', 'Could not reserve a loopback port.');
  const port = address.port;
  reservation.close();
  await once(reservation, 'close');
  return port;
}

function collectBoundedLog(
  stream: NodeJS.ReadableStream | null,
  append: (chunk: string) => void,
) {
  stream?.setEncoding('utf8');
  stream?.on('data', (chunk: string) => append(chunk));
}

async function waitForServer(origin: string, child: ChildProcess) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`The production server exited before readiness with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(origin, {
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status > 0) return;
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }

  throw new Error(`Timed out waiting for the production server: ${String(lastError)}`);
}

async function request(origin: string, path: string, method = 'GET') {
  const response = await fetch(new URL(path, origin), {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return {
    path,
    method,
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  };
}

type HttpResult = Awaited<ReturnType<typeof request>>;

const requiredHeaders = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'permissions-policy',
  'referrer-policy',
  'x-content-type-options',
  'x-frame-options',
  'x-robots-tag',
] as const;

function readHtmlLang(body: string): string | undefined {
  return body.match(/<html\b[^>]*\blang=["']([^"']+)["']/iu)?.[1];
}

function readAttribute(tag: string, attribute: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\b${attribute}=["']([^"']*)["']`, 'iu'),
  );
  return match?.[1];
}

function assertNoActiveConversions(origin: string, result: HttpResult) {
  assert.doesNotMatch(result.body, /blocked-smoke-destination|example\.org/iu);
  assert.doesNotMatch(
    result.body,
    /<a\b[^>]*\bhref=["'](?:https?:\/\/|\/\/|mailto:|tel:|sms:|whatsapp:|tg:)/iu,
    `${result.path} exposes an external or direct-contact link.`,
  );
  assert.doesNotMatch(
    result.body,
    /googletagmanager|google-analytics|gtag\s*\(|dataLayer\s*=|analytics\.js|plausible\.io|matomo|mixpanel|segment\.com|amplitude/iu,
    `${result.path} exposes an analytics integration.`,
  );

  for (const match of result.body.matchAll(/<form\b[^>]*>/giu)) {
    const formTag = match[0];
    const method = (readAttribute(formTag, 'method') ?? 'get').toLowerCase();
    assert.equal(method, 'get', `${result.path} exposes a non-GET form.`);
    const action = readAttribute(formTag, 'action') ?? result.path;
    const actionUrl = new URL(action, origin);
    assert.equal(
      actionUrl.origin,
      origin,
      `${result.path} exposes a cross-origin form action.`,
    );
    assert.doesNotMatch(
      actionUrl.pathname,
      /(?:contact|contacto|reserv|booking|checkout|payment|pago)/iu,
      `${result.path} exposes a conversion form action.`,
    );
  }

  const conversionLabel =
    /(?:contact|contatt|contacter|reserv|r[eé]serv|booking|prenot|payment|paiement|pagamento|pago|checkout|whatsapp|telegram)/iu;
  for (const match of result.body.matchAll(
    /<button\b([^>]*)>([\s\S]*?)<\/button>/giu,
  )) {
    const attributes = match[1] ?? '';
    const text = (match[2] ?? '').replace(/<[^>]+>/gu, ' ');
    if (!conversionLabel.test(`${attributes} ${text}`)) continue;
    assert.match(
      attributes,
      /(?:^|\s)disabled(?:=["'][^"']*["'])?(?:\s|$)/iu,
      `${result.path} exposes an enabled conversion control.`,
    );
  }
}

function assertPublicBetaHtml(
  origin: string,
  result: HttpResult,
  locale: Locale,
) {
  assert.equal(result.status, 200, `${result.path} must render the public beta.`);
  assert.match(result.headers.get('content-type') ?? '', /^text\/html\b/iu);
  assert.equal(
    readHtmlLang(result.body),
    locale,
    `${result.path} must declare html lang=${locale}.`,
  );
  assert.match(
    result.body,
    /class=["'][^"']*synthetic-preview-page/iu,
    `${result.path} lacks the synthetic-beta document marker.`,
  );

  for (const header of requiredHeaders) {
    assert(result.headers.has(header), `${result.path} is missing ${header}.`);
  }
  assert.equal(
    result.headers.has('x-powered-by'),
    false,
    `${result.path} exposes x-powered-by.`,
  );
  assert.match(result.headers.get('x-robots-tag') ?? '', /noindex/iu);
  assert.match(
    result.headers.get('content-security-policy') ?? '',
    /default-src 'self'/u,
  );
  assert.match(
    result.headers.get('content-security-policy') ?? '',
    /frame-ancestors 'none'/u,
  );
  assert.match(
    result.headers.get('content-security-policy') ?? '',
    /form-action 'self'/u,
  );
  assertNoActiveConversions(origin, result);
}

async function stopServer(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), delay(5_000)]);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await once(child, 'exit');
  }
}

async function main() {
  const serverStats = await lstat(standaloneServer);
  assert(
    serverStats.isFile() && !serverStats.isSymbolicLink(),
    'The validated standalone server entrypoint is absent or unsafe.',
  );
  const port = await findLoopbackPort();
  const origin = `http://127.0.0.1:${port}`;
  let serverLog = '';
  const appendLog = (chunk: string) => {
    serverLog = `${serverLog}${chunk}`.slice(-MAX_SERVER_LOG_CHARS);
  };
  const child = spawn(
    process.execPath,
    [standaloneServer],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        PORT: String(port),
        PECADOSVIP_ENABLE_DRAFT_PREVIEW: 'true',
        PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: 'true',
        VITE_PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: 'true',
        NEXT_PUBLIC_CONTACT_APPROVED: 'true',
        NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
        NEXT_PUBLIC_WHATSAPP_URL: 'https://example.org/blocked-smoke-destination',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  collectBoundedLog(child.stdout, appendLog);
  collectBoundedLog(child.stderr, appendLog);

  try {
    await waitForServer(origin, child);
    const root = await request(origin, '/');
    assert.ok(
      root.status === 307 || root.status === 308,
      '/ must redirect permanently or temporarily to the Spanish beta.',
    );
    assert.equal(root.headers.get('location'), '/es');

    const localizedBetaResults = [];
    const cleanCatalogResults = [];
    const contactHoldingResults = [];
    for (const locale of SUPPORTED_LOCALES) {
      const homePath = localizedPath(locale);
      const home = await request(origin, homePath);
      assertPublicBetaHtml(origin, home, locale);
      assert.ok(
        home.body.includes(getSyntheticBetaCopy(locale).hero.note),
        `${homePath} lacks its localized synthetic-beta disclosure.`,
      );
      localizedBetaResults.push({
        path: home.path,
        status: home.status,
        lang: readHtmlLang(home.body),
        noindex: true,
      });

      const cleanPaths = [
        localizedPath(locale, '/perfiles'),
        localizedPath(locale, '/perfiles/valeria'),
        localizedPath(locale, '/servicios'),
        localizedPath(locale, '/servicios/compania-privada'),
      ];
      for (const path of cleanPaths) {
        assert.equal(/[?#]/u.test(path), false, `${path} must remain a clean path.`);
        const result = await request(origin, path);
        assertPublicBetaHtml(origin, result, locale);
        cleanCatalogResults.push({
          path: result.path,
          status: result.status,
          lang: readHtmlLang(result.body),
          noindex: true,
        });
      }

      const contactPath = localizedPath(locale, '/contacto');
      const contact = await request(origin, contactPath);
      assert.equal(
        contact.status,
        200,
        `${contactPath} must render a neutral, inactive contact state.`,
      );
      assert.equal(readHtmlLang(contact.body), locale);
      assert.ok(
        contact.body.includes(getCatalog(locale).holding.title),
        `${contactPath} must remain a localized holding page.`,
      );
      assert.match(contact.headers.get('x-robots-tag') ?? '', /noindex/iu);
      assertNoActiveConversions(origin, contact);
      contactHoldingResults.push({
        path: contact.path,
        status: contact.status,
        active: false,
      });
    }

    const localizedNotFoundResults = [];
    for (const locale of SUPPORTED_LOCALES) {
      const path = localizedPath(locale, '/perfiles/no-existe');
      const result = await request(origin, path);
      assert.equal(result.status, 404, `${path} must remain unavailable.`);
      assert.ok(
        result.body.includes(getCatalog(locale).notFound.title),
        `${path} lacks its localized not-found state.`,
      );
      assert.match(result.headers.get('x-robots-tag') ?? '', /noindex/iu);
      localizedNotFoundResults.push({ path, status: result.status, localized: true });
    }

    const legal = await request(origin, '/legal/privacidad');
    assert.equal(legal.status, 404, 'Blocked legal copy must not be exposed.');
    const blockedPreviewRoutes = await Promise.all(
      [
        '/preview-local-sintetico',
        '/preview-local-sintetico/perfiles/valeria',
        '/preview-local-sintetico/servicios',
        '/preview-local-sintetico/servicios/compania-privada',
        '/preview-local-sintetico/media/valeria/cover',
        '/preview-local-sintetico/service-media/company-private-lounge',
        '/preview-local-sintetico/city-media/madrid',
        '/preview-local-sintetico/decor-media/border-filigree',
        '/preview-local-sintetico/hero-media/home-editorial',
      ].map((path) => request(origin, path)),
    );
    for (const blockedPreviewRoute of blockedPreviewRoutes) {
      assert.equal(
        blockedPreviewRoute.status,
        404,
        `${blockedPreviewRoute.path} must remain unavailable in production.`,
      );
    }
    const blockedAdminRoutes = await Promise.all([
      request(origin, '/admin'),
      request(origin, '/admin/login'),
      request(origin, '/admin/kyc'),
      request(origin, '/api/admin'),
      request(origin, '/api/admin/auth/login', 'POST'),
      request(origin, '/admin/auth/login', 'POST'),
    ]);
    for (const blockedAdminRoute of blockedAdminRoutes) {
      assert.equal(
        blockedAdminRoute.status,
        404,
        `${blockedAdminRoute.method} ${blockedAdminRoute.path} must not ship in the public app.`,
      );
    }
    const blockedConversionApis = await Promise.all(
      [
        '/api/contact',
        '/api/reservas',
        '/api/bookings',
        '/api/payments',
        '/api/checkout',
        '/api/analytics',
      ].map((path) => request(origin, path, 'POST')),
    );
    for (const blockedConversionApi of blockedConversionApis) {
      assert.equal(
        blockedConversionApi.status,
        404,
        `${blockedConversionApi.path} must not expose a conversion endpoint.`,
      );
    }

    const robots = await request(origin, '/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get('content-type') ?? '', /^text\/plain\b/iu);
    assert.match(robots.body, /^User-Agent:\s*\*\s*$/imu);
    assert.match(robots.body, /^Disallow:\s*\/\s*$/imu);
    assert.doesNotMatch(robots.body, /^Allow:/imu);
    assert.doesNotMatch(robots.body, /Sitemap:/iu);

    const sitemap = await request(origin, '/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(
      sitemap.headers.get('content-type') ?? '',
      /^(?:application|text)\/xml\b/iu,
    );
    assert.match(sitemap.body, /<urlset\b[^>]*>/iu);
    assert.match(sitemap.body, /<\/urlset>/iu);
    assert.doesNotMatch(sitemap.body, /<url>/iu);
    assert.doesNotMatch(sitemap.body, /<loc>/iu);

    console.log(
      JSON.stringify({
        schema: 'pecadosvip.production-public-beta-smoke',
        version: 2,
        result: 'PASS',
        publicSyntheticBeta: true,
        commercialActivation: false,
        origin,
        rootRedirect: {
          path: root.path,
          status: root.status,
          location: root.headers.get('location'),
        },
        localizedBetaRoutes: localizedBetaResults,
        cleanCatalogRoutes: cleanCatalogResults,
        inactiveContactRoutes: contactHoldingResults,
        blockedRoutes: [
          { path: legal.path, status: legal.status },
          ...blockedPreviewRoutes.map((result) => ({
            path: result.path,
            status: result.status,
          })),
          ...blockedAdminRoutes.map((result) => ({
            path: result.path,
            method: result.method,
            status: result.status,
          })),
          ...blockedConversionApis.map((result) => ({
            path: result.path,
            method: result.method,
            status: result.status,
          })),
          ...localizedNotFoundResults,
        ],
        conversionControls: {
          externalContactLinks: 0,
          nonGetForms: 0,
          enabledConversionButtons: 0,
          conversionApis: 0,
          analyticsIntegrations: 0,
        },
        robotsDisallowAll: true,
        sitemapUrlCount: 0,
        limits: [
          'Local loopback Vinext standalone runtime only; no Docker engine or deployed runtime was tested.',
          'This smoke proves the public synthetic-beta routing and fail-closed conversion boundary, not legal approval, linguistic approval, UAT or deployed production readiness.',
        ],
      }),
    );
  } catch (error) {
    console.error(serverLog);
    throw error;
  } finally {
    await stopServer(child);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
