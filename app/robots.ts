import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

export const revalidate = 86400;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = settings.siteUrl.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/account',
          '/retailer/dashboard',
          '/api/',
          '/login',
          '/register',
          '/reset-password',
          '/*?*sort=',
          '/*?*page=',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
