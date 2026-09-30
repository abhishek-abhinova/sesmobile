import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getRequestContext } from '@/lib/auth';
import { getPricingSettings } from '@/lib/settings';
import { publicProductSelect, serialiseProduct, type ProductWithRelations } from '@/lib/pricing';
import { withApi, jsonOk, jsonError, ErrorCodes, notFound } from '@/lib/api';
import { track } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/*  GET — product detail by slug (public, price-tier aware)                   */
/*  Mutations are handled by /api/products (POST/PATCH/PUT/DELETE) so there    */
/*  is exactly one write path per resource.                                   */
/* -------------------------------------------------------------------------- */

export const GET = withApi(async (_req: Request, ctx) => {
  const slug = ctx.params?.slug;
  if (!slug) return jsonError(ErrorCodes.VALIDATION, 'Product slug is required.', 422);

  const product = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: publicProductSelect,
  });
  if (!product) throw notFound('Product');

  const [viewer, siteSettings] = await Promise.all([getCurrentUser(), getPricingSettings()]);
  const serialised = serialiseProduct(product as unknown as ProductWithRelations, { viewer, siteSettings });

  const [related, approvedReviews, reviewAgg] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: product.id },
        OR: [
          ...(product.categoryId ? [{ categoryId: product.categoryId }] : []),
          ...(product.brandId ? [{ brandId: product.brandId }] : []),
          ...(product.subcategoryId ? [{ subcategoryId: product.subcategoryId }] : []),
        ],
      },
      select: publicProductSelect,
      orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }],
      take: 8,
    }),
    prisma.review.findMany({
      where: { productId: product.id, status: 'APPROVED' },
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        isVerified: true,
        isFeatured: true,
        adminReply: true,
        helpfulCount: true,
        createdAt: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    }),
    prisma.review.aggregate({
      where: { productId: product.id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const ratingBuckets = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId: product.id, status: 'APPROVED' },
    _count: { _all: true },
  });

  // Fire-and-forget view counter (never blocks the response).
  void Promise.all([
    track({
      type: 'PRODUCT_VIEW',
      entityType: 'Product',
      entityId: product.id,
      userType: viewer?.isRetailer ? 'RETAILER' : viewer ? 'CUSTOMER' : 'GUEST',
    }),
    prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }),
  ]).catch(() => undefined);

  return jsonOk({
    product: serialised,
    related: related.map((r) => serialiseProduct(r as unknown as ProductWithRelations, { viewer, siteSettings })),
    reviews: approvedReviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    reviewSummary: {
      average: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
      count: reviewAgg._count._all,
      distribution: ratingBuckets.map((b) => ({ rating: b.rating, count: b._count._all })),
    },
  });
});

/* -------------------------------------------------------------------------- */
/*  PUT — record a "recently viewed" and return the recently-viewed rail       */
/* -------------------------------------------------------------------------- */

const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
  exclude: z.string().max(64).optional(),
  record: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export const PUT = withApi(async (req: Request, ctx) => {
  const slug = ctx.params?.slug;
  if (!slug) return jsonError(ErrorCodes.VALIDATION, 'Product slug is required.', 422);

  const parsed = recentQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return jsonError(ErrorCodes.VALIDATION, 'Invalid query parameters.', 422);

  const product = await prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } });
  if (!product) throw notFound('Product');

  const requestCtx = await getRequestContext();
  const user = await getCurrentUser();
  const guestId = req.headers.get('x-guest-id') ?? requestCtx.guestId ?? null;

  if (parsed.data.record) {
    try {
      if (user) {
        await prisma.recentlyViewed.upsert({
          where: { userId_productId: { userId: user.id, productId: product.id } },
          create: { userId: user.id, productId: product.id, sessionId: guestId },
          update: { lastViewedAt: new Date(), viewCount: { increment: 1 } },
        });
      } else if (guestId) {
        const session = await prisma.wishlistSession.upsert({
          where: { sessionId: guestId },
          create: { sessionId: guestId },
          update: {},
        });
        const existing = await prisma.wishlistSessionItem.findFirst({
          where: { sessionId: session.id, productId: product.id },
          select: { id: true },
        });
        if (existing) {
          await prisma.wishlistSessionItem.update({ where: { id: existing.id }, data: { createdAt: new Date() } });
        } else {
          await prisma.wishlistSessionItem.create({ data: { sessionId: session.id, productId: product.id } });
        }
      }
    } catch {
      /* recently-viewed must never break the page */
    }
  }

  const where = user
    ? { userId: user.id }
    : guestId
      ? { sessionId: guestId }
      : { id: '__no_session__' };

  const recent = await prisma.recentlyViewed.findMany({
    where: {
      ...where,
      ...(parsed.data.exclude ? { productId: { not: parsed.data.exclude } } : {}),
    },
    orderBy: { lastViewedAt: 'desc' },
    take: parsed.data.limit,
    select: { product: { select: publicProductSelect } },
  });

  const [viewer, siteSettings] = await Promise.all([getCurrentUser(), getPricingSettings()]);

  return jsonOk(
    recent.map((r) => serialiseProduct(r.product as unknown as ProductWithRelations, { viewer, siteSettings })),
  );
});
