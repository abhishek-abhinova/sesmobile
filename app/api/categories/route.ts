import { prisma } from '@/lib/prisma';
import { withApi, jsonOk, jsonError, ErrorCodes, notFound, assertSameOrigin, paginate } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';
import { categoryCreateSchema, categoryUpdateSchema, categoryReorderSchema } from '@/lib/validators';
import { uniqueSlug } from '@/lib/slug';
import { logActivity } from '@/lib/activity';
import { limitMutation } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET — hierarchical tree or flat list */
const listSchema = z.object({
  tree: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  includeEmpty: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  parentId: z.string().cuid().optional(),
  nav: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  featured: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withApi(async (req: Request) => {
  const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return jsonError(ErrorCodes.VALIDATION, 'Invalid query.', 422);
  const q = parsed.data;

  const where = {
    isActive: true,
    ...(q.nav ? { showInNav: true } : {}),
    ...(q.featured ? { isFeatured: true } : {}),
    ...(q.parentId ? { parentId: q.parentId } : {}),
    ...(q.includeEmpty ? {} : { products: { some: { status: 'ACTIVE' as const } } }),
  };

  const categories = await prisma.category.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      icon: true,
      imageUrl: true,
      thumbnailUrl: true,
      parentId: true,
      position: true,
      isActive: true,
      isFeatured: true,
      showInNav: true,
      showInFooter: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      ogImageUrl: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { products: true, children: true } },
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });

  // Only ACTIVE products should be counted for public-facing totals.
  const counts = await prisma.product.groupBy({
    by: ['categoryId', 'subcategoryId'],
    where: { status: 'ACTIVE' },
    _count: { _all: true },
  });

  const activeCount = new Map<string, number>();
  for (const c of counts) {
    if (c.categoryId) activeCount.set(c.categoryId, (activeCount.get(c.categoryId) ?? 0) + c._count._all);
    if (c.subcategoryId) activeCount.set(c.subcategoryId, (activeCount.get(c.subcategoryId) ?? 0) + c._count._all);
  }

  const enriched = categories.map(({ _count, ...c }) => ({
    ...c,
    productCount: activeCount.get(c.id) ?? 0,
    childCount: _count.children,
    totalProductCount: _count.products,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  if (q.tree) {
    const byParent = new Map<string | null, typeof enriched>();
    for (const c of enriched) {
      const list = byParent.get(c.parentId) ?? [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
    const build = (parentId: string | null): typeof enriched =>
      (byParent.get(parentId) ?? []).map((c) => ({ ...c, children: build(c.id) }));
    return jsonOk(build(null));
  }

  if (q.page && q.pageSize) {
    const start = (q.page - 1) * q.pageSize;
    return jsonOk(paginate(enriched.slice(start, start + q.pageSize), enriched.length, q.page, q.pageSize));
  }

  return jsonOk(enriched.slice(0, q.limit ?? 200));
});

/* POST — create */
export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const limit = await limitMutation(`category-create:${admin.id}`, 30, 60_000);
  if (!limit.success) return jsonError(ErrorCodes.RATE_LIMITED, 'Slow down a moment.', 429);

  const data = categoryCreateSchema.parse(await req.json().catch(() => null));

  const slug = await uniqueSlug(data.slug ?? data.name, async (candidate) => {
    const found = await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(found);
  });

  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId }, select: { id: true, parentId: true } });
    if (!parent) return jsonError(ErrorCodes.VALIDATION, 'Parent category not found.', 422, { fieldErrors: { parentId: ['Unknown parent category.'] } });
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      shortDescription: data.shortDescription ?? null,
      icon: data.icon ?? null,
      imageUrl: data.imageUrl ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      parentId: data.parentId || null,
      position: data.position,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      showInNav: data.showInNav,
      showInFooter: data.showInFooter,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      seoKeywords: data.seoKeywords ?? null,
      ogImageUrl: data.ogImageUrl ?? null,
    },
  });

  await logActivity({ action: 'CREATE', entityType: 'Category', entityId: category.id, entityName: category.name, user: admin });

  return jsonOk(category, undefined, 201);
});

/* PATCH — update (also used for reorder) */
export const PATCH = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const body = await req.json().catch(() => null);

  // Reorder mode
  if (body && typeof body === 'object' && 'items' in body && Array.isArray((body as { items: unknown }).items)) {
    const { items } = categoryReorderSchema.parse(body);
    await prisma.$transaction(
      items.map((item) => prisma.category.update({ where: { id: item.id }, data: { position: item.position } })),
    );
    await logActivity({ action: 'UPDATE', entityType: 'Category', user: admin, metadata: { reorder: true, count: items.length } });
    return jsonOk({ reordered: items.length });
  }

  const data = categoryUpdateSchema.parse(body);

  const existing = await prisma.category.findUnique({ where: { id: data.id }, select: { id: true, name: true, slug: true, parentId: true } });
  if (!existing) throw notFound('Category');

  // Prevent cycles in the category tree.
  if (data.parentId && data.parentId !== data.id) {
    let cursor: string | null = data.parentId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === data.id) {
        return jsonError(ErrorCodes.VALIDATION, 'A category cannot be moved under itself or its own child.', 422, {
          fieldErrors: { parentId: ['This would create a circular category structure.'] },
        });
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const node: { parentId: string | null } | null = await prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = node?.parentId ?? null;
    }
  }

  const slug =
    data.slug ??
    (data.name && data.name !== existing.name
      ? await uniqueSlug(data.name, async (candidate) => {
          const found = await prisma.category.findFirst({ where: { slug: candidate, id: { not: data.id } }, select: { id: true } });
          return Boolean(found);
        })
      : existing.slug);

  const category = await prisma.category.update({
    where: { id: data.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      slug,
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription ?? null }),
      ...(data.icon !== undefined && { icon: data.icon ?? null }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl ?? null }),
      ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl ?? null }),
      ...(data.parentId !== undefined && { parentId: data.parentId || null }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
      ...(data.showInNav !== undefined && { showInNav: data.showInNav }),
      ...(data.showInFooter !== undefined && { showInFooter: data.showInFooter }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle ?? null }),
      ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription ?? null }),
      ...(data.seoKeywords !== undefined && { seoKeywords: data.seoKeywords ?? null }),
      ...(data.ogImageUrl !== undefined && { ogImageUrl: data.ogImageUrl ?? null }),
    },
  });

  await logActivity({ action: 'UPDATE', entityType: 'Category', entityId: category.id, entityName: category.name, user: admin });

  return jsonOk(category);
});

/* DELETE — only allowed when no products are attached */
export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError(ErrorCodes.VALIDATION, 'Category id is required.', 422);

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { products: true, children: true } } },
  });
  if (!category) throw notFound('Category');

  if (category._count.children > 0) {
    return jsonError(ErrorCodes.CONFLICT, `Cannot delete "${category.name}" — it has ${category._count.children} subcategor(ies). Reassign or remove them first.`, 409);
  }

  if (category._count.products > 0) {
    return jsonError(
      ErrorCodes.CONFLICT,
      `Cannot delete "${category.name}" — ${category._count.products} product(s) are still assigned to it. Move them to another category first.`,
      409,
    );
  }

  await prisma.category.delete({ where: { id } });
  await logActivity({ action: 'DELETE', entityType: 'Category', entityId: id, entityName: category.name, user: admin });

  return jsonOk({ success: true });
});
