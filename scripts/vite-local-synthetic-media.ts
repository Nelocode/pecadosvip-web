import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import type { Plugin } from 'vite';

import {
  getSyntheticPreviewAsset,
  isSyntheticPreviewRequestAllowed,
} from '../lib/preview/synthetic-preview.ts';
import {
  getSyntheticServiceMedia,
  isSyntheticServiceMediaKey,
} from '../lib/preview/synthetic-service-media.ts';
import {
  getSyntheticCityMedia,
  isSyntheticCityMediaSlug,
} from '../lib/preview/synthetic-city-media.ts';
import {
  getSyntheticDecorMedia,
  isSyntheticDecorMediaKey,
} from '../lib/preview/synthetic-decor-media.ts';
import {
  getSyntheticHeroMedia,
  isSyntheticHeroMediaKey,
} from '../lib/preview/synthetic-hero-media.ts';

const syntheticMediaPattern =
  /^\/preview-local-sintetico\/media\/([a-z0-9-]+)\/([a-z0-9-]+)$/;
const syntheticServiceMediaPattern =
  /^\/preview-local-sintetico\/service-media\/([a-z0-9-]+)$/;
const syntheticCityMediaPattern =
  /^\/preview-local-sintetico\/city-media\/([a-z0-9-]+)$/;
const syntheticDecorMediaPattern =
  /^\/preview-local-sintetico\/decor-media\/([a-z0-9-]+)$/;
const syntheticHeroMediaPattern =
  /^\/preview-local-sintetico\/hero-media\/([a-z0-9-]+)$/;
const blockedHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, noimageindex',
};

export function parseLocalRequestPathname(requestUrl: string | undefined): string | null {
  try {
    return new URL(requestUrl ?? '/', 'http://localhost').pathname;
  } catch {
    return null;
  }
}

export function localSyntheticMediaPlugin(): Plugin {
  return {
    name: 'pecadosvip-local-synthetic-media',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = parseLocalRequestPathname(request.url);
        if (pathname === null) {
          response.writeHead(400, blockedHeaders);
          response.end();
          return;
        }
        const profileMatch = syntheticMediaPattern.exec(pathname);
        const serviceMatch = syntheticServiceMediaPattern.exec(pathname);
        const cityMatch = syntheticCityMediaPattern.exec(pathname);
        const decorMatch = syntheticDecorMediaPattern.exec(pathname);
        const heroMatch = syntheticHeroMediaPattern.exec(pathname);
        if (
          !profileMatch &&
          !serviceMatch &&
          !cityMatch &&
          !decorMatch &&
          !heroMatch
        ) {
          next();
          return;
        }

        const hostHeader =
          typeof request.headers.host === 'string'
            ? request.headers.host
            : undefined;
        const environment = {
          NODE_ENV: 'development',
          PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW:
            process.env.PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW,
        };
        if (!isSyntheticPreviewRequestAllowed(hostHeader, environment)) {
          response.writeHead(404, blockedHeaders);
          response.end();
          return;
        }

        const serviceKey = serviceMatch?.[1];
        const citySlug = cityMatch?.[1];
        const decorKey = decorMatch?.[1];
        const heroKey = heroMatch?.[1];
        const candidate = profileMatch
          ? getSyntheticPreviewAsset(profileMatch[1]!, profileMatch[2]!)
          : isSyntheticServiceMediaKey(serviceKey)
            ? getSyntheticServiceMedia(serviceKey, 'es')
            : isSyntheticCityMediaSlug(citySlug)
              ? getSyntheticCityMedia(citySlug, 'es')
              : isSyntheticDecorMediaKey(decorKey)
                ? getSyntheticDecorMedia(decorKey)
                : isSyntheticHeroMediaKey(heroKey)
                  ? getSyntheticHeroMedia(heroKey)
                : undefined;
        if (!candidate) {
          response.writeHead(404, blockedHeaders);
          response.end();
          return;
        }

        const assetRoot = resolve(
          process.cwd(),
          'assets',
          profileMatch
            ? 'synthetic-profiles'
            : serviceMatch
              ? 'synthetic-services'
              : cityMatch
                ? 'synthetic-cities'
                : decorMatch
                  ? 'synthetic-decor'
                  : 'synthetic-hero',
        );
        const filePath = resolve(process.cwd(), candidate.sourcePath);
        if (!filePath.startsWith(`${assetRoot}${sep}`)) {
          response.writeHead(404, blockedHeaders);
          response.end();
          return;
        }

        try {
          const bytes = await readFile(filePath);
          response.writeHead(200, {
            ...blockedHeaders,
            'Content-Length': String(bytes.byteLength),
            'Content-Type': candidate.contentType,
          });
          response.end(bytes);
        } catch {
          response.writeHead(404, blockedHeaders);
          response.end();
        }
      });
    },
  };
}
