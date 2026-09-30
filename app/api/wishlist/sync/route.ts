import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { withApi, jsonOk, jsonError, ErrorCodes, assertSameOrigin } from '@/lib/api';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const syncSchema = z.object({
  productIds: z.array(z.string().cuid()).max(200).default([]),
  meta: z
    .array(
      z.object({
        productId: z.string().cuid(),
        name: z.string().max(200),
        slug: z.string().max(200),
        sku: z.string().max(60),
        imageUrl: z.string().max(2000).nullish(),
        price: z.number().nullish(),
        retailerPrice: z.number().nullish(),
        inStock: z.boolean().optional(),
      }),
    )
    .max(200)
    .default([]),
});

/**
 * Called right after a guest signs in: merges the localStorage wishlist into
 * the account. Only products that are still ACTIVE are copied, so deleted or
 * archived products are never resurrected.
 */
export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const user = await getCurrentUser();
  if (!user) return jsonError(ErrorCodes.UNAUTHORIZED, 'Sign in to sync your wishlist.', 401);

  const body = syncSchema.parse(await req.json().catch(() => null));
  if (body.productIds.length === 0) return jsonOk({ synced: 0, requested: 0 });

  const valid = await prisma.product.findMany({
    where: { id: { in: body.productIds }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (valid.length === 0) {
    return jsonOk({ synced: 0, requested: body.productIds.length, skipped: body.productIds.length });
  }

  const validIds = valid.map((v) => v.id);

  const result = await prisma.wishlistItem.createMany({
    data: validIds.map((id) => ({ userId: user.id, productId: id })),
    skipDuplicates: true,
  });

  if (result.count > 0) {
    void prisma.product.updateMany({
      where: { id: { in: validIds } },
      data: { wishlistCount: { increment: result.count } },
    }).catch(() => undefined);
  }

  // Clear the guest session rows so the two do not double up.
  const guestId = req.headers.get('x-guest-id');
  if (guestId) {
    const session = await prisma.wishlistSession.findUnique({ where: { sessionId: guestId }, select: { id: true } });
    if (session) {
      await prisma.wishlistSessionItem.deleteMany({ where: { sessionId: session.id, productId: { in: validIds } } });
    }
  }

  return jsonOk({
    synced: result.count,
    requested: body.productIds.length,
    skipped: body.productIds.length - valid.length,
  });
});
