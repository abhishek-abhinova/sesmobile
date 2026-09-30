import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { publicProductSelect, serialiseProduct, serialiseProducts } from '@/lib/pricing';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { ProductDetailView } from '@/components/product/product-detail-view';
import type { ReviewSummary } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteProps {
  params: Promise<{ slug: string }>;
}

/** SEO-friendly product detail: /product/ubon-bluetooth-speaker */
export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      name: true,
      shortDescription: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      ogImageUrl: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      brand: { select: { name: true } },
    },
  });

  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: false } };
  }

  const settings = await getSettings();

  return buildMetadata({
    title: product.seoTitle ?? (product.brand ? `${product.name} — ${product.brand.name}` : product.name),
    description:
      product.seoDescription ??
      product.shortDescription ??
      product.description?.slice(0, 155) ??
      `Buy ${product.name} at wholesale and retail prices from ${settings.businessName}, ${settings.city}.`,
    path: `/product/${slug}`,
    brand: toSeoBrand(settings),
    image: product.ogImageUrl ?? product.images[0]?.url,
    type: 'product',
    keywords: product.seoKeywords ?? undefined,
  });
}

export default async function ProductPage({ params }: RouteProps) {
  const { slug } = await params;

  const [settings, viewer] = await Promise.all([getSettings(), getCurrentUser()]);

  const row = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: publicProductSelect,
  });

  // Real 404 (with the not-found UI), not an API error object.
  if (!row) notFound();

  const product = serialiseProduct(row, {
    viewer,
    siteSettings: {
      retailerPricingEnabled: settings.retailerPricingEnabled,
      showCostPriceToAdminOnly: settings.showCostPriceToAdminOnly,
    },
  });

  const [reviewRows, relatedRows] = await Promise.all([
    settings.enableReviews
      ? prisma.review.findMany({
          where: { productId: product.id, status: 'APPROVED' },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
          take: 20,
          select: {
            id: true,
            productId: true,
            authorName: true,
            rating: true,
            title: true,
            body: true,
            isVerified: true,
            adminReply: true,
            helpfulCount: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: product.id },
        OR: [
          { categoryId: product.category?.id ?? undefined },
          { subcategoryId: product.subcategory?.id ?? undefined },
          { brandId: product.brand?.id ?? undefined },
        ],
      },
      select: publicProductSelect,
      orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }],
      take: 4,
    }),
  ]);

  const reviews: ReviewSummary[] = reviewRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  const related = serialiseProducts(relatedRows, {
    viewer,
    siteSettings: {
      retailerPricingEnabled: settings.retailerPricingEnabled,
      showCostPriceToAdminOnly: settings.showCostPriceToAdminOnly,
    },
  });

  // Fire-and-forget view counter. Never block the render on it.
  void prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  return (
    <ProductDetailView
      product={product}
      reviews={reviews}
      related={related}
      reviewsEnabled={settings.enableReviews}
      businessName={settings.businessName}
      whatsappNumber={settings.whatsappNumber}
      phone={settings.phone}
      siteUrl={settings.siteUrl}
    />
  );
}
