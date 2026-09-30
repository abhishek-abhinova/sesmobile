import 'server-only';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import { getPublishedPage } from '@/lib/cms';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { CmsPageView } from '@/components/shared/cms-page-view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shared implementation for the CMS-backed routes (about, privacy, terms,
 * shipping, return policy, …). Each route passes its own slug so URLs stay
 * static and indexable.
 */
export async function buildCmsMetadata(
  slug: string,
  fallbackTitle: string,
  fallbackDescription: (city: string, businessName: string) => string,
): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPublishedPage(slug), getSettings()]);

  if (!page) {
    return { title: fallbackTitle, robots: { index: false, follow: true } };
  }

  return buildMetadata({
    title: page.seoTitle ?? `${page.title} — ${settings.businessName}`,
    description: page.seoDescription ?? fallbackDescription(settings.city, settings.businessName),
    path: `/${slug}`,
    brand: toSeoBrand(settings),
    image: page.ogImageUrl ?? page.coverImageUrl,
    keywords: page.seoKeywords ?? undefined,
    type: 'article',
  });
}

export async function buildCmsElement(slug: string): Promise<React.ReactElement> {
  const [page, settings] = await Promise.all([getPublishedPage(slug), getSettings()]);

  if (!page) notFound();

  return <CmsPageView page={page} city={settings.city} businessName={settings.businessName} />;
}
