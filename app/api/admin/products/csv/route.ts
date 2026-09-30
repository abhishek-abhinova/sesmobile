import { NextResponse } from 'next/server';
import { Prisma, ProductStatus, StockStatus } from '@prisma/client';
import { z } from 'zod';
import { withApi, jsonOk, jsonError, assertSameOrigin, ErrorCodes } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseCsvRecords, toCsv } from '@/lib/csv';
import { uniqueSlug } from '@/lib/slug';
import { logActivity } from '@/lib/activity';
import { limitMutation } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Columns the owner edits in a spreadsheet. `sku` is the join key: the photos
 * imported by `npm run db:seed` already carry SKUs such as SES-WA0087.
 */
const COLUMNS = [
  'sku',
  'name',
  'slug',
  'mrp',
  'customer_price',
  'retailer_price',
  'cost_price',
  'brand',
  'category',
  'stock_qty',
  'stock_status',
  'status',
  'short_description',
  'is_featured',
  'is_new_arrival',
] as const;

const STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON'] as const;

const importSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  apply: z.boolean().optional().default(true),
});

const slugTaken = (excludeId?: string) => async (candidate: string) => {
  const found = await prisma.product.findFirst({
    where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return Boolean(found);
};

const toMoney = (value: string): Prisma.Decimal | null | undefined => {
  if (value === '') return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return new Prisma.Decimal(parsed.toFixed(2));
};

const toInt = (value: string): number | null | undefined => {
  if (value === '') return null;
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
};

const toBool = (value: string): boolean | undefined => {
  if (value === '') return undefined;
  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
};

/* -------------------------------------------------------------------------- */
/*  GET — download the current catalogue as a spreadsheet                      */
/* -------------------------------------------------------------------------- */

export const GET = withApi(async () => {
  await requireAdmin();

  const products = await prisma.product.findMany({
    orderBy: [{ position: 'asc' }, { sku: 'asc' }],
    select: {
      sku: true,
      name: true,
      slug: true,
      mrp: true,
      customerPrice: true,
      retailerPrice: true,
      costPrice: true,
      stockQuantity: true,
      stockStatus: true,
      status: true,
      shortDescription: true,
      isFeatured: true,
      isNewArrival: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const rows: Array<Array<string | number>> = [
    [...COLUMNS],
    ...products.map((product) => [
      product.sku,
      product.name,
      product.slug,
      product.mrp?.toString() ?? '',
      product.customerPrice?.toString() ?? '',
      product.retailerPrice?.toString() ?? '',
      product.costPrice?.toString() ?? '',
      product.brand?.name ?? '',
      product.category?.name ?? '',
      product.stockQuantity,
      product.stockStatus,
      product.status,
      product.shortDescription ?? '',
      product.isFeatured ? 'yes' : '',
      product.isNewArrival ? 'yes' : '',
    ]),
  ];

  const csv = toCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ses-products-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});

/* -------------------------------------------------------------------------- */
/*  POST — validate (dry run) or apply an edited spreadsheet                    */
/* -------------------------------------------------------------------------- */

export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(ErrorCodes.VALIDATION, 'Request body must be JSON with a "csv" string.', 422);
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(ErrorCodes.VALIDATION, 'The spreadsheet could not be read.', 422, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const limit = await limitMutation(`products:csv:${admin.id}`, 20, 60_000);
  if (!limit.success) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'Too many imports in a row. Wait a moment and try again.', 429);
  }

  const { csv, apply } = parsed.data;
  const records = parseCsvRecords(csv);

  if (records.length === 0) {
    return jsonError(ErrorCodes.VALIDATION, 'The spreadsheet has no data rows.', 422);
  }
  if (records.length > 2000) {
    return jsonError(ErrorCodes.VALIDATION, 'Please import at most 2000 rows at a time.', 422);
  }

  const skus = records.map((record) => (record.sku ?? '').toUpperCase()).filter(Boolean);
  const existing = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: { id: true, sku: true, name: true, status: true },
  });
  const bySku = new Map(existing.map((product) => [product.sku.toUpperCase(), product]));

  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);
  const brandByName = new Map(brands.map((brand) => [brand.name.toLowerCase(), brand.id]));
  const categoryByName = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));

  const importLog = await prisma.importLog.create({
    data: {
      filename: 'ses-products.csv',
      totalRows: records.length,
      createdById: admin.id,
      status: apply ? 'PENDING' : 'VALIDATED',
    },
  });

  const errors: string[] = [];
  let valid = 0;
  let updated = 0;
  let created = 0;

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2; // header is row 1
    const rowErrors: string[] = [];
    const sku = (record.sku ?? '').toUpperCase();

    if (!sku) rowErrors.push('sku is required');
    if (record.name && record.name.length > 160) rowErrors.push('name is longer than 160 characters');

    const status = (record.status ?? '').toUpperCase();
    if (status && !STATUSES.includes(status as (typeof STATUSES)[number])) {
      rowErrors.push(`status must be one of ${STATUSES.join(', ')}`);
    }
    const stockStatus = (record.stock_status ?? '').toUpperCase();
    if (stockStatus && !STOCK_STATUSES.includes(stockStatus as (typeof STOCK_STATUSES)[number])) {
      rowErrors.push(`stock_status must be one of ${STOCK_STATUSES.join(', ')}`);
    }

    for (const field of ['mrp', 'customer_price', 'retailer_price', 'cost_price'] as const) {
      const value = record[field] ?? '';
      if (value !== '' && toMoney(value) === undefined) rowErrors.push(`${field} is not a valid amount`);
    }
    for (const field of ['stock_qty'] as const) {
      const value = record[field] ?? '';
      if (value !== '' && toInt(value) === undefined) rowErrors.push(`${field} is not a valid number`);
    }

    const brand = record.brand ? brandByName.get(record.brand.toLowerCase()) : undefined;
    if (record.brand && !brand) rowErrors.push(`brand "${record.brand}" does not exist`);
    const category = record.category ? categoryByName.get(record.category.toLowerCase()) : undefined;
    if (record.category && !category) rowErrors.push(`category "${record.category}" does not exist`);

    const name = record.name?.trim();

    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNumber}: ${rowErrors.join('; ')}`);
      await prisma.importRow.create({
        data: {
          importLogId: importLog.id,
          rowNumber,
          raw: record as Prisma.InputJsonValue,
          errors: rowErrors,
          isValid: false,
        },
      });
      continue;
    }

    valid++;
    const product = sku ? bySku.get(sku) : undefined;

    const scalars: {
      name?: string;
      slug?: string;
      shortDescription?: string | null;
      mrp?: Prisma.Decimal | null;
      customerPrice?: Prisma.Decimal | null;
      retailerPrice?: Prisma.Decimal | null;
      costPrice?: Prisma.Decimal | null;
      stockQuantity?: number;
      stockStatus?: StockStatus;
      status?: ProductStatus;
      isFeatured?: boolean;
      isNewArrival?: boolean;
    } = {};

    if (name) scalars.name = name;
    if (record.slug) scalars.slug = await uniqueSlug(record.slug, slugTaken(product?.id));
    if (record.short_description !== undefined) scalars.shortDescription = record.short_description || null;

    for (const [field, column] of [
      ['mrp', 'mrp'],
      ['customerPrice', 'customer_price'],
      ['retailerPrice', 'retailer_price'],
      ['costPrice', 'cost_price'],
    ] as const) {
      const value = toMoney(record[column] ?? '');
      if (value !== undefined) scalars[field] = value;
    }
    if (record.stock_qty !== undefined) {
      const quantity = toInt(record.stock_qty);
      if (quantity !== undefined && quantity !== null) scalars.stockQuantity = quantity;
    }
    if (stockStatus) scalars.stockStatus = stockStatus as StockStatus;
    if (status) scalars.status = status as ProductStatus;
    const featured = toBool(record.is_featured ?? '');
    if (featured !== undefined) scalars.isFeatured = featured;
    const newArrival = toBool(record.is_new_arrival ?? '');
    if (newArrival !== undefined) scalars.isNewArrival = newArrival;

    const relations: { brand?: { connect: { id: string } }; category?: { connect: { id: string } } } = {};
    if (brand) relations.brand = { connect: { id: brand } };
    if (category) relations.category = { connect: { id: category } };

    if (apply) {
      if (product) {
        await prisma.product.update({ where: { id: product.id }, data: { ...scalars, ...relations } });
        updated++;
      } else if (sku && name) {
        const createdProduct = await prisma.product.create({
          data: {
            sku,
            name,
            slug: scalars.slug ?? (await uniqueSlug(name, slugTaken())),
            status: scalars.status ?? ProductStatus.DRAFT,
            ...scalars,
            ...relations,
          },
        });
        bySku.set(sku, { id: createdProduct.id, sku, name: createdProduct.name, status: createdProduct.status });
        created++;
      }
    }

    await prisma.importRow.create({
      data: {
        importLogId: importLog.id,
        rowNumber,
        raw: record as Prisma.InputJsonValue,
        isValid: true,
        productId: product?.id ?? null,
      },
    });
  }

  const invalid = records.length - valid;
  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      validRows: valid,
      invalidRows: invalid,
      importedRows: created,
      updatedRows: updated,
      errors: errors.slice(0, 100),
      status: apply ? (errors.length > 0 ? 'COMPLETED' : 'COMPLETED') : 'VALIDATED',
      completedAt: new Date(),
    },
  });

  if (apply && (updated > 0 || created > 0)) {
    await logActivity({
      action: 'UPDATE',
      entityType: 'Product',
      entityName: 'CSV import',
      user: admin,
      metadata: { updated, created, invalid, importLogId: importLog.id },
    });
  }

  return jsonOk({
    applied: apply,
    total: records.length,
    valid,
    invalid,
    updated,
    created,
    errors: errors.slice(0, 25),
    truncated: errors.length > 25,
  });
});
