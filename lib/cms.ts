import 'server-only';
import { prisma } from '@/lib/prisma';

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
  updatedAt: string;
}

/**
 * Fetches a published CMS page.
 *
 * Content is authored by an administrator in the admin panel and rendered as
 * trusted HTML — the same content is emitted in the sitemap, so it must stay
 * XSS-safe by construction (the admin editor is the only writer).
 */
export async function getPublishedPage(slug: string): Promise<CmsPage | null> {
  const page = await prisma.page.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      ogImageUrl: true,
      updatedAt: true,
    },
  });

  if (!page) return null;

  return { ...page, updatedAt: page.updatedAt.toISOString() };
}
