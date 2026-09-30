import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getPricingSettings } from '@/lib/settings';
import { withApi, jsonOk, jsonError, ErrorCodes, assertSameOrigin, notFound } from '@/lib/api';
import { publicProductSelect, serialiseProduct, type ProductWithRelations } from '@/lib/pricing';
import { z } from 'zod';
import { wishlistToggleSchema, wishlistRemoveSchema } from '@/lib/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SerialisedWishlistItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  imageUrl: string | null;
  price: number | null;
  retailerPrice?: number;
  inStock: boolean;
  quantity: number;
}

function readGuestId(req: Request): string | null {
  return req.headers.get('x-guest-id');
}

/* GET — returns the wishlist for the signed-in user or the guest session. */
export const GET = withApi(async (req: Request) => {
  const user = await getCurrentUser();
  const guestId = readGuestId(req);

  if (user) {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { product: { select: publicProductSelect } },
    });
    const [siteSettings] = await Promise.all([getPricingSettings()]);
    return jsonOk(
      rows.map((r) => {
        const p = serialiseProduct(r.product as unknown as ProductWithRelations, { viewer: user, siteSettings });
        return {
          productId: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          imageUrl: p.primaryImage?.thumbnailUrl ?? p.primaryImage?.url ?? null,
          price: p.price.effectivePrice,
          ...(p.price.retailerPrice !== undefined ? { retailerPrice: p.price.retailerPrice } : {}),
          inStock: p.stockStatus === 'IN_STOCK' || p.stockStatus === 'LOW_STOCK',
          quantity: 1,
        } satisfies SerialisedWishlistItem;
      }),
    );
  }

  if (!guestId) return jsonOk([]);

  const rows = await prisma.wishlistSessionItem.findMany({
    where: { session: { sessionId: guestId } },
    orderBy: { createdAt: 'desc' },
    select: { product: { select: publicProductSelect } },
  });

  const [siteSettings] = await Promise.all([getPricingSettings()]);

  return jsonOk(
    rows.map((r) => {
      const p = serialiseProduct(r.product as unknown as ProductWithRelations, { viewer: null, siteSettings });
      return {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        imageUrl: p.primaryImage?.thumbnailUrl ?? p.primaryImage?.url ?? null,
        price: p.price.effectivePrice,
        inStock: p.stockStatus === 'IN_STOCK' || p.stockStatus === 'LOW_STOCK',
        quantity: 1,
      } satisfies SerialisedWishlistItem;
    }),
  );
});

/* POST — add a product (authenticated) */
export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const user = await getCurrentUser();
  if (!user) return jsonError(ErrorCodes.UNAUTHORIZED, 'Please sign in to save products to your wishlist.', 401);

  const { productId } = wishlistToggleSchema.parse(await req.json().catch(() => null));

  const product = await prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, select: { id: true } });
  if (!product) throw notFound('Product');

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  });
  if (existing) return jsonOk({ saved: true, alreadyExists: true });

  await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  void prisma.product.update({ where: { id: productId }, data: { wishlistCount: { increment: 1 } } }).catch(() => undefined);

  return jsonOk({ saved: true }, undefined, 201);
});

/* DELETE — remove (authenticated or guest) */
export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const user = await getCurrentUser();
  const { productIds } = wishlistRemoveSchema.parse(await req.json().catch(() => null));

  if (user) {
    const { count } = await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId: { in: productIds } },
    });
    if (count > 0) {
      void prisma.product.updateMany({ where: { id: { in: productIds } }, data: { wishlistCount: { decrement: count } } }).catch(() => undefined);
    }
    return jsonOk({ removed: count });
  }

  const guestId = readGuestId(req);
  if (!guestId) return jsonOk({ removed: 0 });

  const session = await prisma.wishlistSession.findUnique({ where: { sessionId: guestId }, select: { id: true } });
  if (!session) return jsonOk({ removed: 0 });

  const { count } = await prisma.wishlistSessionItem.deleteMany({
    where: { sessionId: session.id, productId: { in: productIds } },
  });

  return jsonOk({ removed: count });
});

/* Guests can also persist wishlist selections server-side (used by the
   client provider before the visitor signs in). */
export const PATCH = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const guestId = readGuestId(req);
  if (!guestId) return jsonError(ErrorCodes.VALIDATION, 'Missing session identifier.', 422);

  const body = z.object({ productIds: z.array(z.string().cuid()).max(200) }).parse(await req.json().catch(() => ({})));

  const session = await prisma.wishlistSession.upsert({
    where: { sessionId: guestId },
    create: { sessionId: guestId },
    update: {},
    select: { id: true },
  });

  // Only persist products that are still live.
  const valid = await prisma.product.findMany({
    where: { id: { in: body.productIds }, status: 'ACTIVE' },
    select: { id: true },
  });

  if (valid.length) {
    await prisma.wishlistSessionItem.createMany({
      data: valid.map((v) => ({ sessionId: session.id, productId: v.id })),
      skipDuplicates: true,
    });
  }

  return jsonOk({ synced: valid.length });
});
