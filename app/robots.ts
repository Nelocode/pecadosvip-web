import type { MetadataRoute } from 'next';
import { getRuntimePublicationState } from '../lib/content/runtime-publication';
import { siteConfig } from '../lib/site-config';

export default function robots(): MetadataRoute.Robots {
  const { release } = getRuntimePublicationState();
  if (!siteConfig.indexingEnabled || !siteConfig.origin || !release.ok) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/preview/'],
    },
    sitemap: `${siteConfig.origin}/sitemap.xml`,
  };
}
