import type { MetadataRoute } from 'next';
import {
  getRuntimePublicationState,
  getRuntimeSitemapRoutes,
} from '../lib/content/runtime-publication';
import { siteConfig } from '../lib/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const { release } = getRuntimePublicationState();
  if (!siteConfig.indexingEnabled || !siteConfig.origin || !release.ok) {
    return [];
  }

  return getRuntimeSitemapRoutes().map((route) => ({
    url: new URL(route.path, siteConfig.origin).toString(),
    lastModified: route.lastModified,
    changeFrequency: route.kind === 'profile' ? 'daily' : 'weekly',
    priority: route.kind === 'home' ? 1 : 0.8,
  }));
}
