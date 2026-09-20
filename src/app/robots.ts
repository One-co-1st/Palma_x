import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Operational surfaces carry no public record and are never indexed.
        disallow: [
          '/account',
          '/dossier',
          '/admin',
          '/portal',
          '/judge',
          '/creator',
          '/claim',
          '/register',
          '/forgot',
          '/reset',
          '/gazette/confirm',
          '/gazette/leave',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
