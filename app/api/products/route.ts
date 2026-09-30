import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withApi, paginate, jsonOk, notFound, assertSameOrigin, jsonError, ErrorCodes } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireAdmin, requireStaff } from '@/lib/auth';
import { getPricingSettings } from '@/lib/settings';
import { publicProductSelect, serialiseProducts, type ProductWithRelations } from '@/lib/pricing';
import { buildProductQuery, getProductFacets, type ProductQueryParams, type SortOption } from '@/lib/queries/products';
import {
  productCreateSchema,
  productUpdateSchema,
  bulkProductActionSchema,
  optionalBooleanFromQuery,
} from '@/lib/validators';
import { uniqueSlug } from '@/lib/slug';
import { logActivity } from '@/lib/activity';
import { notifyLowStock } from '@/lib/notifications';
import { limitMutation } from '@/lib/rate-limit';
import { SORT_OPTIONS } from '@/lib/queries/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/*  GET — public catalogue listing                                            */
/* -------------------------------------------------------------------------- */

const listQuerySchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(400).optional(),
  subcategory: z.string().max(400).optional(),
  brand: z.string().max(400).optional(),
  model: z.string().max(400).optional(),
  minPrice: z.coerce.number().min(0).max(10_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(10_000_000).optional(),
  availability: z.enum(['in-stock', 'out-of-stock', 'all']).optional(),
  featured: optionalBooleanFromQuery,
  bestSeller: optionalBooleanFromQuery,
  newArrival: optionalBooleanFromQuery,
  wholesaleDeal: optionalBooleanFromQuery,
  onSale: optionalBooleanFromQuery,
  sort: z.enum(SORT_OPTIONS).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(96).optional(),
  facets: optionalBooleanFromQuery,
  isDemo: optionalBooleanFromQuery,
});

export const GET = withApi(async (req: Request) => {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(ErrorCodes.VALIDATION, 'Some filter values are invalid.', 422);
  }

  const params: ProductQueryParams = parsed.data;
  const query = buildProductQuery(params, { publicOnly: true });

  const [viewer, siteSettings, total, rows] = await Promise.all([
    getCurrentUser(),
    getPricingSettings(),
    prisma.product.count({ where: query.where }),
    prisma.product.findMany({
      where: query.where,
      select: publicProductSelect,
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
    }),
  ]);

  const products = serialiseProducts(rows as unknown as ProductWithRelations[], { viewer, siteSettings });

  let facets: Awaited<ReturnType<typeof getProductFacets>> | undefined;
  if (params.facets) {
    facets = await getProductFacets(query.where);
  }

  return jsonOk(paginate(products, total, query.page, query.pageSize), facets ? { facets } : undefined);
});

/* -------------------------------------------------------------------------- */
/*  POST — create (admin)                                                     */
/* -------------------------------------------------------------------------- */

export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const limit = await limitMutation(`product-create:${admin.id}`, 30, 60_000);
  if (!limit.success) return jsonError(ErrorCodes.RATE_LIMITED, 'Slow down a moment.', 429);

  const body = await req.json().catch(() => null);
  const data = productCreateSchema.parse(body);

  const slug = await uniqueSlug(data.slug ?? data.name, async (candidate) => {
    const found = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(found);
  });

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku }, select: { id: true, name: true } });
  if (existingSku) {
    return jsonError(ErrorCodes.CONFLICT, `SKU "${data.sku}" is already used by "${existingSku.name}".`, 409, {
      fieldErrors: { sku: ['This SKU is already in use.'] },
    });
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug,
      sku: data.sku,
      shortDescription: data.shortDescription ?? null,
      description: data.description ?? null,
      mrp: data.mrp ?? null,
      costPrice: data.costPrice ?? null,
      customerPrice: data.customerPrice ?? null,
      retailerPrice: data.retailerPrice ?? null,
      showMrp: data.showMrp,
      showCustomerPrice: data.showCustomerPrice,
      showRetailerPrice: data.showRetailerPrice,
      showDiscount: data.showDiscount,
      discountType: data.discountType,
      discountValue: data.discountValue ?? null,
      brandId: data.brandId || null,
      categoryId: data.categoryId || null,
      subcategoryId: data.subcategoryId || null,
      supportedModels: data.supportedModels,
      status: data.status,
      stockStatus: data.stockStatus,
      stockQuantity: data.stockQuantity,
      lowStockThreshold: data.lowStockThreshold,
      minimumOrderQty: data.minimumOrderQty,
      minimumWholesaleQty: data.minimumWholesaleQty,
      wholesaleOnly: data.wholesaleOnly,
      isFeatured: data.isFeatured,
      isBestSeller: data.isBestSeller,
      isNewArrival: data.isNewArrival,
      isWholesaleDeal: data.isWholesaleDeal,
      badge: data.badge ?? null,
      position: data.position,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      seoKeywords: data.seoKeywords ?? null,
      ogImageUrl: data.ogImageUrl ?? null,
      searchKeywords: data.searchKeywords ?? null,
      isDemo: data.isDemo,
      publishedAt: data.status === 'ACTIVE' ? new Date() : null,
      images: {
        create: data.images.map((img, index) => ({
          url: img.url,
          thumbnailUrl: img.thumbnailUrl ?? null,
          blurDataUrl: img.blurDataUrl ?? null,
          alt: img.alt ?? data.name,
          usage: img.usage,
          isPrimary: img.isPrimary || index === 0 ? index === 0 || img.isPrimary : false,
          position: img.position ?? index,
        })),
      },
    },
    include: { images: true },
  });

  await prisma.inventoryLog.create({
    data: {
      productId: product.id,
      type: 'IN',
      quantity: data.stockQuantity,
      balanceAfter: data.stockQuantity,
      note: 'Initial stock on product creation',
      createdById: admin.id,
    },
  });

  if (data.stockStatus === 'LOW_STOCK' || (data.stockQuantity > 0 && data.stockQuantity <= data.lowStockThreshold)) {
    await notifyLowStock([{ id: product.id, name: product.name, sku: product.sku, stockQuantity: product.stockQuantity }]);
  }

  await logActivity({
    action: 'CREATE',
    entityType: 'Product',
    entityId: product.id,
    entityName: product.name,
    user: admin,
    metadata: { sku: product.sku, status: product.status },
  });

  return jsonOk({ id: product.id, slug: product.slug }, undefined, 201);
});

/* -------------------------------------------------------------------------- */
/*  PATCH — update (admin)                                                    */
/* -------------------------------------------------------------------------- */

export const PATCH = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();

  const body = await req.json().catch(() => null);
  const data = productUpdateSchema.parse(body);
  const { id, images, ...fields } = data;

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, sku: true, stockQuantity: true, status: true, isDemo: true },
  });
  if (!existing) throw notFound('Product');

  if (fields.sku && fields.sku !== existing.sku) {
    const clash = await prisma.product.findUnique({ where: { sku: fields.sku }, select: { id: true, name: true } });
    if (clash) {
      return jsonError(ErrorCodes.CONFLICT, `SKU "${fields.sku}" is already used by "${clash.name}".`, 409, {
        fieldErrors: { sku: ['This SKU is already in use.'] },
      });
    }
  }

  const slug = fields.slug
    ? fields.slug
    : fields.name && fields.name !== existing.name
      ? await uniqueSlug(fields.name, async (candidate) => {
          const found = await prisma.product.findFirst({ where: { slug: candidate, id: { not: id } }, select: { id: true } });
          return Boolean(found);
        })
      : existing.slug;

  const updated = await prisma.$transaction(async (tx) => {
    const payload: Prisma.ProductUpdateInput = {};

    if (fields.name !== undefined) payload.name = fields.name;
    if (fields.sku !== undefined) payload.sku = fields.sku;
    if (slug !== existing.slug) payload.slug = slug;
    if (fields.shortDescription !== undefined) payload.shortDescription = fields.shortDescription ?? null;
    if (fields.description !== undefined) payload.description = fields.description ?? null;
    if (fields.mrp !== undefined) payload.mrp = fields.mrp ?? null;
    if (fields.costPrice !== undefined) payload.costPrice = fields.costPrice ?? null;
    if (fields.customerPrice !== undefined) payload.customerPrice = fields.customerPrice ?? null;
    if (fields.retailerPrice !== undefined) payload.retailerPrice = fields.retailerPrice ?? null;
    if (fields.showMrp !== undefined) payload.showMrp = fields.showMrp;
    if (fields.showCustomerPrice !== undefined) payload.showCustomerPrice = fields.showCustomerPrice;
    if (fields.showRetailerPrice !== undefined) payload.showRetailerPrice = fields.showRetailerPrice;
    if (fields.showDiscount !== undefined) payload.showDiscount = fields.showDiscount;
    if (fields.discountType !== undefined) payload.discountType = fields.discountType;
    if (fields.discountValue !== undefined) payload.discountValue = fields.discountValue ?? null;
    if (fields.brandId !== undefined) payload.brand = fields.brandId ? { connect: { id: fields.brandId } } : { disconnect: true };
    if (fields.categoryId !== undefined) payload.category = fields.categoryId ? { connect: { id: fields.categoryId } } : { disconnect: true };
    if (fields.subcategoryId !== undefined) payload.subcategory = fields.subcategoryId ? { connect: { id: fields.subcategoryId } } : { disconnect: true };
    if (fields.supportedModels !== undefined) payload.supportedModels = fields.supportedModels;
    if (fields.status !== undefined) {
      payload.status = fields.status;
      if (fields.status === 'ACTIVE' && existing.status !== 'ACTIVE') payload.publishedAt = new Date();
    }
    if (fields.stockStatus !== undefined) payload.stockStatus = fields.stockStatus;
    if (fields.stockQuantity !== undefined) payload.stockQuantity = fields.stockQuantity;
    if (fields.lowStockThreshold !== undefined) payload.lowStockThreshold = fields.lowStockThreshold;
    if (fields.minimumOrderQty !== undefined) payload.minimumOrderQty = fields.minimumOrderQty;
    if (fields.minimumWholesaleQty !== undefined) payload.minimumWholesaleQty = fields.minimumWholesaleQty;
    if (fields.wholesaleOnly !== undefined) payload.wholesaleOnly = fields.wholesaleOnly;
    if (fields.isFeatured !== undefined) payload.isFeatured = fields.isFeatured;
    if (fields.isBestSeller !== undefined) payload.isBestSeller = fields.isBestSeller;
    if (fields.isNewArrival !== undefined) payload.isNewArrival = fields.isNewArrival;
    if (fields.isWholesaleDeal !== undefined) payload.isWholesaleDeal = fields.isWholesaleDeal;
    if (fields.badge !== undefined) payload.badge = fields.badge ?? null;
    if (fields.position !== undefined) payload.position = fields.position;
    if (fields.seoTitle !== undefined) payload.seoTitle = fields.seoTitle ?? null;
    if (fields.seoDescription !== undefined) payload.seoDescription = fields.seoDescription ?? null;
    if (fields.seoKeywords !== undefined) payload.seoKeywords = fields.seoKeywords ?? null;
    if (fields.ogImageUrl !== undefined) payload.ogImageUrl = fields.ogImageUrl ?? null;
    if (fields.searchKeywords !== undefined) payload.searchKeywords = fields.searchKeywords ?? null;
    if (fields.isDemo !== undefined) payload.isDemo = fields.isDemo;

    const result = await tx.product.update({ where: { id }, data: payload });

    if (images) {
      // Replace the whole gallery — the admin form always submits the full set.
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length) {
        await tx.productImage.createMany({
          data: images.map((img, index) => ({
            productId: id,
            url: img.url,
            thumbnailUrl: img.thumbnailUrl ?? null,
            blurDataUrl: img.blurDataUrl ?? null,
            alt: img.alt ?? fields.name ?? existing.name,
            usage: img.usage,
            isPrimary: img.isPrimary || images.filter((i) => i.isPrimary).length === 0 ? img.isPrimary || index === 0 : img.isPrimary,
            position: img.position ?? index,
          })),
        });
      }
    }

    if (fields.stockQuantity !== undefined && fields.stockQuantity !== existing.stockQuantity) {
      const delta = fields.stockQuantity - existing.stockQuantity;
      await tx.inventoryLog.create({
        data: {
          productId: id,
          type: delta > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(delta),
          balanceAfter: fields.stockQuantity,
          note: 'Adjusted from admin product form',
          createdById: admin.id,
        },
      });
    }

    return result;
  });

  await logActivity({
    action: 'UPDATE',
    entityType: 'Product',
    entityId: id,
    entityName: updated.name,
    user: admin,
    metadata: { fields: Object.keys(fields) },
  });

  if (updated.stockStatus === 'LOW_STOCK' || (updated.stockQuantity > 0 && updated.stockQuantity <= updated.lowStockThreshold)) {
    await notifyLowStock([{ id: updated.id, name: updated.name, sku: updated.sku, stockQuantity: updated.stockQuantity }]);
  }

  return jsonOk({ id: updated.id, slug: updated.slug, updatedAt: updated.updatedAt });
});

/* -------------------------------------------------------------------------- */
/*  PUT — bulk actions                                                        */
/* -------------------------------------------------------------------------- */

export const PUT = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();

  const body = await req.json().catch(() => null);
  const { ids, action, value } = bulkProductActionSchema.parse(body);

  const count = ids.length;
  let result: { affected: number; action: string };

  switch (action) {
    case 'publish':
      result = {
        action,
        affected: (
          await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { status: 'ACTIVE', publishedAt: new Date() },
          })
        ).count,
      };
      break;
    case 'unpublish':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: 'DRAFT' } })).count };
      break;
    case 'archive':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status: 'ARCHIVED' } })).count };
      break;
    case 'delete':
      result = { action, affected: (await prisma.product.deleteMany({ where: { id: { in: ids } } })).count };
      break;
    case 'feature':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isFeatured: true } })).count };
      break;
    case 'unfeature':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isFeatured: false } })).count };
      break;
    case 'best_seller':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isBestSeller: true } })).count };
      break;
    case 'clear_best_seller':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isBestSeller: false } })).count };
      break;
    case 'new_arrival':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isNewArrival: true } })).count };
      break;
    case 'clear_new_arrival':
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isNewArrival: false } })).count };
      break;
    case 'set_category':
      if (!value) return jsonError(ErrorCodes.VALIDATION, 'A category id is required for this action.', 422);
      result = { action, affected: (await prisma.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: value } })).count };
      break;
    case 'set_stock_status':
      if (!value || !['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON'].includes(value)) {
        return jsonError(ErrorCodes.VALIDATION, 'Invalid stock status.', 422);
      }
      result = {
        action,
        affected: (
          await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { stockStatus: value as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'COMING_SOON' },
          })
        ).count,
      };
      break;
    default:
      return jsonError(ErrorCodes.VALIDATION, `Unsupported action: ${action}`, 422);
  }

  await logActivity({ action: action === 'delete' ? 'DELETE' : 'UPDATE', entityType: 'Product', user: admin, metadata: { bulk: true, count, action, ids } });

  return jsonOk({ affected: result.affected, action: result.action, requested: count });
});

/* -------------------------------------------------------------------------- */
/*  DELETE — single product (staff)                                           */
/* -------------------------------------------------------------------------- */

export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const staff = await requireStaff();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError(ErrorCodes.VALIDATION, 'Product id is required.', 422);

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, isDemo: true } });
  if (!product) throw notFound('Product');

  await prisma.product.delete({ where: { id } });
  await logActivity({ action: 'DELETE', entityType: 'Product', entityId: id, entityName: product.name, user: staff });

  return jsonOk({ success: true, id });
});

export type { ProductQueryParams, SortOption };
