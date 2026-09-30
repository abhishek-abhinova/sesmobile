import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/* ==========================================================================
 *  Catalogue query builder
 *  Translates validated search params into a Prisma `where` + `orderBy`.
 *  Shared by the products page, the search API, the category pages and the
 *  retailer dashboard so filtering behaves identically everywhere.
 * ======================================================================== */

export const SORT_OPTIONS = [
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'popular',
  'featured',
  'name-asc',
  'name-desc',
  'relevance',
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export interface ProductQueryParams {
  q?: string;
  category?: string | string[];
  subcategory?: string | string[];
  brand?: string | string[];
  model?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  availability?: 'in-stock' | 'out-of-stock' | 'all';
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  wholesaleDeal?: boolean;
  onSale?: boolean;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  isDemo?: boolean;
  minWholesaleQty?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  /** Ask the caller to also return brand/model/price facets. */
  facets?: boolean;
  includeInactiveCategories?: boolean;
}

export interface BuiltQuery {
  where: Prisma.ProductWhereInput;
  orderBy: Prisma.ProductOrderByWithRelationInput[];
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 96;

function toTokens(value?: string | string[]): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : value.split(',');
  return arr.map((v) => v.trim()).filter(Boolean);
}

/** Trigram-insensitive full-text-ish match across name, sku, model and keywords. */
export function buildSearchWhere(q?: string): Prisma.ProductWhereInput | null {
  const query = q?.trim();
  if (!query) return null;

  const terms = query.split(/\s+/).filter((t) => t.length > 0);
  if (terms.length === 0) return null;

  // Every term must appear somewhere (AND semantics) — better precision for
  // multi-word queries like "samsung a15 display".
  const and: Prisma.ProductWhereInput[] = terms.map((term) => ({
    OR: [
      { name: { contains: term, mode: 'insensitive' } },
      { sku: { contains: term, mode: 'insensitive' } },
      { shortDescription: { contains: term, mode: 'insensitive' } },
      { searchKeywords: { contains: term, mode: 'insensitive' } },
      { seoKeywords: { contains: term, mode: 'insensitive' } },
      { supportedModels: { has: term } },
      { brand: { name: { contains: term, mode: 'insensitive' } } },
      { category: { name: { contains: term, mode: 'insensitive' } } },
      { subcategory: { name: { contains: term, mode: 'insensitive' } } },
    ],
  }));

  return { AND: and };
}

export function buildProductWhere(
  params: ProductQueryParams,
  opts: { publicOnly?: boolean } = {},
): Prisma.ProductWhereInput {
  const { publicOnly = true } = opts;
  const and: Prisma.ProductWhereInput[] = [];

  const status: Prisma.EnumProductStatusFilter = publicOnly
    ? { in: ['ACTIVE'] }
    : params.status
      ? { equals: params.status }
      : { in: ['ACTIVE', 'DRAFT'] };

  const where: Prisma.ProductWhereInput = { status, AND: and };

  const search = buildSearchWhere(params.q);
  if (search) and.push(search);

  const slugs = toTokens(params.category);
  if (slugs.length) {
    // A category slug matches either the parent category or the subcategory,
    // so `/products/mobile-accessories` returns everything filed beneath it.
    and.push({ OR: [{ category: { slug: { in: slugs } } }, { subcategory: { slug: { in: slugs } } }] });
  }

  const subSlugs = toTokens(params.subcategory);
  if (subSlugs.length) {
    and.push({ subcategory: { slug: { in: subSlugs } } });
  }

  const brandSlugs = toTokens(params.brand);
  if (brandSlugs.length) {
    and.push({
      OR: [
        { brand: { slug: { in: brandSlugs } } },
        { brand: { name: { in: brandSlugs, mode: 'insensitive' } } },
      ],
    });
  }

  const models = toTokens(params.model);
  if (models.length) {
    and.push({ AND: models.map((m) => ({ supportedModels: { has: m } })) });
  }

  if (typeof params.minPrice === 'number' || typeof params.maxPrice === 'number') {
    const priceFilter: Prisma.DecimalNullableFilter = {};
    if (typeof params.minPrice === 'number') priceFilter.gte = params.minPrice;
    if (typeof params.maxPrice === 'number') priceFilter.lte = params.maxPrice;
    and.push({ OR: [{ customerPrice: priceFilter }, { mrp: priceFilter }] });
  }

  if (params.availability === 'in-stock') {
    and.push({ stockStatus: { in: ['IN_STOCK', 'LOW_STOCK'] } });
  } else if (params.availability === 'out-of-stock') {
    and.push({ stockStatus: 'OUT_OF_STOCK' });
  }

  if (params.featured) and.push({ isFeatured: true });
  if (params.bestSeller) and.push({ isBestSeller: true });
  if (params.newArrival) and.push({ isNewArrival: true });
  if (params.wholesaleDeal) and.push({ isWholesaleDeal: true });
  if (params.minWholesaleQty) and.push({ minimumWholesaleQty: { gt: 1 } });
  if (params.onSale) {
    and.push({ mrp: { not: null } });
    and.push({ customerPrice: { not: null } });
  }
  if (typeof params.isDemo === 'boolean') and.push({ isDemo: params.isDemo });

  if (!params.includeInactiveCategories) {
    and.push({
      OR: [
        { categoryId: null },
        { category: { isActive: true } },
        { subcategory: { isActive: true } },
      ],
    });
  }

  return where;
}

export function buildOrderBy(sort: SortOption = 'newest'): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'price-asc':
      return [{ customerPrice: 'asc' }, { name: 'asc' }];
    case 'price-desc':
      return [{ customerPrice: 'desc' }, { name: 'asc' }];
    case 'popular':
      return [{ viewCount: 'desc' }, { enquiryCount: 'desc' }];
    case 'featured':
      return [{ isFeatured: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }];
    case 'name-asc':
      return [{ name: 'asc' }];
    case 'name-desc':
      return [{ name: 'desc' }];
    case 'relevance':
      return [{ isFeatured: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }];
    case 'newest':
    default:
      return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
  }
}

export function buildProductQuery(
  params: ProductQueryParams,
  opts: { publicOnly?: boolean } = {},
): BuiltQuery {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));

  return {
    where: buildProductWhere(params, opts),
    orderBy: buildOrderBy(params.sort),
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/* -------------------------------------------------------------------------- */
/*  Model / brand facets (used to populate the filter sidebar)                */
/* -------------------------------------------------------------------------- */

export async function getProductFacets(where: Prisma.ProductWhereInput) {
  const [brands, models, priceRange, brandCounts] = await Promise.all([
    prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where,
      select: { supportedModels: true },
      distinct: ['supportedModels'],
    }),
    prisma.product.aggregate({
      where,
      _min: { customerPrice: true },
      _max: { customerPrice: true },
    }),
    prisma.product.groupBy({
      by: ['brandId'],
      where,
      _count: { _all: true },
    }),
  ]);

  const modelSet = new Set<string>();
  for (const row of models) {
    for (const m of row.supportedModels) modelSet.add(m);
  }

  const sortedModels = [...modelSet].sort((a, b) => a.localeCompare(b));
  const countsByBrand = new Map(brandCounts.map((c) => [c.brandId, c._count._all]));

  return {
    brands: brands
      .map((b) => ({ id: b.id, name: b.name, slug: b.slug, logoUrl: b.logoUrl, count: countsByBrand.get(b.id) ?? 0 }))
      .filter((b) => b.count > 0 || !where.brandId),
    models: sortedModels,
    priceMin: priceRange._min.customerPrice ? Number(priceRange._min.customerPrice) : 0,
    priceMax: priceRange._max.customerPrice ? Number(priceRange._max.customerPrice) : 10000,
  };
}

/* -------------------------------------------------------------------------- */
/*  Instantly-typed search suggestions                                        */
/* -------------------------------------------------------------------------- */

export interface SearchSuggestion {
  type: 'product' | 'category' | 'brand' | 'model';
  label: string;
  sublabel?: string;
  href: string;
  imageUrl?: string | null;
}

export async function getSearchSuggestions(
  q: string,
  limit = 8,
): Promise<SearchSuggestion[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
              { searchKeywords: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        supportedModels: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        brand: { select: { name: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }],
      take: limit,
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: query, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
      take: 3,
    }),
    prisma.brand.findMany({
      where: { isActive: true, name: { contains: query, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
      take: 3,
    }),
  ]);

  const suggestions: SearchSuggestion[] = [];

  for (const p of products) {
    const model = p.supportedModels[0];
    suggestions.push({
      type: 'product',
      label: p.name,
      sublabel: [p.brand?.name, model, p.sku].filter(Boolean).join(' · '),
      href: `/product/${p.slug}`,
      imageUrl: p.images[0]?.url ?? null,
    });
  }

  for (const c of categories) {
    suggestions.push({
      type: 'category',
      label: c.name,
      sublabel: `${c._count.products} products`,
      href: `/category/${c.slug}`,
    });
  }

  for (const b of brands) {
    suggestions.push({
      type: 'brand',
      label: b.name,
      sublabel: 'Brand',
      href: `/products?brand=${encodeURIComponent(b.slug)}`,
    });
  }

  return suggestions.slice(0, limit);
}
