import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getRequestContext, requireAdmin } from '@/lib/auth';
import { withApi, jsonOk, jsonError, ErrorCodes, assertSameOrigin, paginate, notFound } from '@/lib/api';
import { reviewCreateSchema, reviewModerateSchema } from '@/lib/validators';
import { limitEnquiry } from '@/lib/rate-limit';
import { notifyNewReview } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';
import { getSettings } from '@/lib/settings';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET — public: approved reviews for a product */
const listSchema = z.object({
  productId: z.string().cuid().optional(),
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SPAM']).default('APPROVED'),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).max(5000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest', 'rating-desc', 'rating-asc']).default('newest'),
});

export const GET = withApi(async (req: Request) => {
  const url = new URL(req.url);
  const parsed = listSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return jsonError(ErrorCodes.VALIDATION, 'Invalid query.', 422);
  const q = parsed.data;

  // Non-admins can only ever read APPROVED reviews.
  const user = await getCurrentUser();
  const isAdmin = Boolean(user?.isAdmin);
  if (q.status !== 'APPROVED' && !isAdmin) {
    return jsonError(ErrorCodes.FORBIDDEN, 'Administrator access required.', 403);
  }

  const where = {
    status: (isAdmin ? q.status : 'APPROVED') as 'APPROVED',
    ...(q.productId && { productId: q.productId }),
    ...(q.q && {
      OR: [
        { authorName: { contains: q.q, mode: 'insensitive' as const } },
        { body: { contains: q.q, mode: 'insensitive' as const } },
        { title: { contains: q.q, mode: 'insensitive' as const } },
        { product: { name: { contains: q.q, mode: 'insensitive' as const } } },
      ],
    }),
  };

  const orderBy =
    q.sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : q.sort === 'rating-desc'
        ? { rating: 'desc' as const }
        : q.sort === 'rating-asc'
          ? { rating: 'asc' as const }
          : { createdAt: 'desc' as const };

  const [total, rows, aggregate, distribution] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        productId: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        status: true,
        isFeatured: true,
        isVerified: true,
        adminReply: true,
        helpfulCount: true,
        createdAt: true,
        product: { select: { name: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
      },
    }),
    prisma.review.aggregate({ where: { status: 'APPROVED' }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.review.groupBy({ by: ['rating'], where: { status: 'APPROVED' }, _count: { _all: true } }),
  ]);

  return jsonOk(
    paginate(
      rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      total,
      q.page,
      q.pageSize,
    ),
    {
      summary: {
        average: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
        count: aggregate._count._all,
        distribution: distribution.map((d) => ({ rating: d.rating, count: d._count._all })),
      },
    },
  );
});

/* POST — submit a review (moderated) */
export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const settings = await getSettings();
  if (!settings.enableReviews) {
    return jsonError(ErrorCodes.VALIDATION, 'Reviews are currently disabled.', 422);
  }

  const body = await req.json().catch(() => null);
  const data = reviewCreateSchema.parse(body);

  if (data.website) {
    return jsonOk({ success: true, pending: true }, undefined, 201);
  }

  const ctx = await getRequestContext();
  const limit = await limitEnquiry('review', ctx.ip);
  if (!limit.success) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'You have already submitted several reviews. Thank you!', 429);
  }

  const product = await prisma.product.findFirst({ where: { id: data.productId, status: 'ACTIVE' }, select: { id: true, name: true } });
  if (!product) throw notFound('Product');

  const user = await getCurrentUser();

  // One review per account (when signed in) and a per-IP cap to limit spam.
  if (user) {
    const existing = await prisma.review.findFirst({ where: { productId: data.productId, userId: user.id }, select: { id: true } });
    if (existing) {
      return jsonError(ErrorCodes.CONFLICT, 'You have already reviewed this product.', 409);
    }
  } else {
    const seenFromDevice = await prisma.review.count({ where: { productId: data.productId, ipHash: hashIp(ctx.ip) } });
    if (seenFromDevice >= 1) {
      return jsonError(ErrorCodes.CONFLICT, 'A review from this device has already been submitted for this product.', 409);
    }
  }

  const review = await prisma.review.create({
    data: {
      productId: data.productId,
      userId: user?.id ?? null,
      authorName: data.authorName,
      authorEmail: data.authorEmail || user?.email || null,
      rating: data.rating,
      title: data.title ?? null,
      body: data.body,
      status: 'PENDING',
      isVerified: Boolean(user),
      ipHash: hashIp(ctx.ip),
    },
  });

  void notifyNewReview({
    id: review.id,
    productName: product.name,
    rating: review.rating,
    authorName: review.authorName,
  }).catch(() => undefined);

  return jsonOk(
    {
      success: true,
      pending: true,
      message: 'Thank you! Your review has been submitted and will appear once approved.',
    },
    undefined,
    201,
  );
});

/* PATCH — moderate (admin) */
export const PATCH = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const data = reviewModerateSchema.parse(await req.json().catch(() => null));

  const existing = await prisma.review.findUnique({ where: { id: data.id }, select: { id: true, status: true, productId: true, product: { select: { name: true } } } });
  if (!existing) throw notFound('Review');

  const review = await prisma.review.update({
    where: { id: data.id },
    data: { status: data.status, ...(data.adminReply !== undefined && { adminReply: data.adminReply ?? null }) },
  });

  await logActivity({
    action: data.status === 'APPROVED' ? 'APPROVE' : data.status === 'REJECTED' ? 'REJECT' : 'UPDATE',
    entityType: 'Review',
    entityId: review.id,
    entityName: `${review.rating}★ on ${existing.product.name}`,
    user: admin,
    metadata: { from: existing.status, to: data.status },
  });

  return jsonOk({ id: review.id, status: review.status });
});

/* DELETE — admin */
export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();

  const body = await req.json().catch(() => null);
  const ids = z.object({ ids: z.array(z.string().cuid()).min(1).max(200) }).parse(body).ids;

  const { count } = await prisma.review.deleteMany({ where: { id: { in: ids } } });
  await logActivity({ action: 'DELETE', entityType: 'Review', user: admin, metadata: { count } });

  return jsonOk({ deleted: count });
});

/** SHA-256 of the IP — used only to rate-limit duplicates, never to identify. */
function hashIp(ip: string): string {
  return createHash('sha256').update(`${ip}:ses-review-salt`).digest('hex').slice(0, 32);
}
