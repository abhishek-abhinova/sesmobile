import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const base = settings.siteUrl.replace(/\/$/, '');

  const [products, categories, brands, pages] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true, isFeatured: true },
      take: 5000,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      take: 500,
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      take: 500,
    }),
    prisma.page.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
      take: 200,
    }),
  ]);

  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/retailer`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/retailer/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: product.isFeatured ? 0.9 : 0.7,
    })),

    ...categories.map((category) => ({
      url: `${base}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    ...brands.map((brand) => ({
      url: `${base}/products?brand=${encodeURIComponent(brand.slug)}`,
      lastModified: brand.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),

    ...pages.map((page) => ({
      url: `${base}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}
