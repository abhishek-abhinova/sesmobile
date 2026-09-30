import { prisma } from '@/lib/prisma';
import { withApi, jsonOk, jsonError, ErrorCodes, notFound, assertSameOrigin } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';
import { brandCreateSchema, brandUpdateSchema } from '@/lib/validators';
import { uniqueSlug } from '@/lib/slug';
import { logActivity } from '@/lib/activity';
import { limitMutation } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listSchema = z.object({
  q: z.string().max(120).optional(),
  active: z
    .enum(['true', 'false', 'all'])
    .default('true')
    .transform((v) => (v === 'all' ? undefined : v === 'true')),
  limit: z.coerce.number().int().min(1).max(300).optional(),
});

export const GET = withApi(async (req: Request) => {
  const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return jsonError(ErrorCodes.VALIDATION, 'Invalid query.', 422);
  const q = parsed.data;

  const brands = await prisma.brand.findMany({
    where: {
      ...(q.active !== undefined ? { isActive: q.active } : {}),
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      website: true,
      country: true,
      isPartner: true,
      isActive: true,
      position: true,
      seoTitle: true,
      seoDescription: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { products: true } },
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    ...(q.limit ? { take: q.limit } : {}),
  });

  const counts = await prisma.product.groupBy({
    by: ['brandId'],
    where: { status: 'ACTIVE', brandId: { not: null } },
    _count: { _all: true },
  });
  const activeCount = new Map(counts.map((c) => [c.brandId as string, c._count._all]));

  return jsonOk(
    brands.map((b) => ({
      ...b,
      productCount: activeCount.get(b.id) ?? 0,
      totalProductCount: b._count.products,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
  );
});

export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const limit = await limitMutation(`brand-create:${admin.id}`, 40, 60_000);
  if (!limit.success) return jsonError(ErrorCodes.RATE_LIMITED, 'Slow down a moment.', 429);

  const data = brandCreateSchema.parse(await req.json().catch(() => null));
  const slug = await uniqueSlug(data.slug ?? data.name, async (candidate) => {
    const found = await prisma.brand.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(found);
  });

  const brand = await prisma.brand.create({
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      logoUrl: data.logoUrl ?? null,
      website: data.website || null,
      country: data.country ?? null,
      isPartner: data.isPartner,
      isActive: data.isActive,
      position: data.position,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
    },
  });

  await logActivity({ action: 'CREATE', entityType: 'Brand', entityId: brand.id, entityName: brand.name, user: admin });
  return jsonOk(brand, undefined, 201);
});

export const PATCH = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const data = brandUpdateSchema.parse(await req.json().catch(() => null));

  const existing = await prisma.brand.findUnique({ where: { id: data.id }, select: { id: true, name: true, slug: true } });
  if (!existing) throw notFound('Brand');

  const slug =
    data.slug ??
    (data.name && data.name !== existing.name
      ? await uniqueSlug(data.name, async (candidate) => {
          const found = await prisma.brand.findFirst({ where: { slug: candidate, id: { not: data.id } }, select: { id: true } });
          return Boolean(found);
        })
      : existing.slug);

  const brand = await prisma.brand.update({
    where: { id: data.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      slug,
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl ?? null }),
      ...(data.website !== undefined && { website: data.website || null }),
      ...(data.country !== undefined && { country: data.country ?? null }),
      ...(data.isPartner !== undefined && { isPartner: data.isPartner }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle ?? null }),
      ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription ?? null }),
    },
  });

  await logActivity({ action: 'UPDATE', entityType: 'Brand', entityId: brand.id, entityName: brand.name, user: admin });
  return jsonOk(brand);
});

export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError(ErrorCodes.VALIDATION, 'Brand id is required.', 422);

  const brand = await prisma.brand.findUnique({ where: { id }, select: { id: true, name: true, _count: { select: { products: true } } } });
  if (!brand) throw notFound('Brand');

  if (brand._count.products > 0) {
    return jsonError(
      ErrorCodes.CONFLICT,
      `Cannot delete "${brand.name}" — ${brand._count.products} product(s) reference it. Deactivate it instead.`,
      409,
    );
  }

  await prisma.brand.delete({ where: { id } });
  await logActivity({ action: 'DELETE', entityType: 'Brand', entityId: id, entityName: brand.name, user: admin });
  return jsonOk({ success: true });
});
