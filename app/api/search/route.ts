import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getPricingSettings } from '@/lib/settings';
import { publicProductSelect, serialiseProducts, type ProductWithRelations } from '@/lib/pricing';
import { getSearchSuggestions, buildProductWhere, buildOrderBy, SORT_OPTIONS } from '@/lib/queries/products';
import { withApi, jsonOk, jsonError, ErrorCodes } from '@/lib/api';
import { normaliseForSearch } from '@/lib/slug';
import { track } from '@/lib/analytics';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  type: z.enum(['all', 'suggest', 'products']).default('all'),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  sort: z.enum(SORT_OPTIONS).default('relevance'),
});

/**
 * Global search. Accepts free text, brand, model, SKU, category and keywords —
 * e.g. "Samsung A15 display" narrows by combining all terms.
 */
export const GET = withApi(async (req: Request) => {
  const parsed = searchSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return jsonError(ErrorCodes.VALIDATION, 'Enter at least one character to search.', 422);
  }

  const { q, type, limit, sort } = parsed.data;
  const viewer = await getCurrentUser();

  if (type === 'suggest') {
    const suggestions = await getSearchSuggestions(q, limit);
    void track({ type: 'SEARCH', query: q, metadata: { mode: 'suggest' } });
    return jsonOk({ suggestions });
  }

  const where = buildProductWhere({ q }, { publicOnly: true });
  const [total, rows, siteSettings] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: publicProductSelect,
      orderBy: buildOrderBy(sort),
      take: limit,
    }),
    getPricingSettings(),
  ]);

  const products = serialiseProducts(rows as unknown as ProductWithRelations[], { viewer, siteSettings });

  // Log the search (privacy-conscious: query text only, no PII).
  void prisma.searchQuery
    .create({
      data: {
        query: q.slice(0, 190),
        normalised: normaliseForSearch(q).slice(0, 190),
        resultCount: total,
        userType: viewer?.isRetailer ? 'RETAILER' : viewer ? 'CUSTOMER' : 'GUEST',
      },
    })
    .catch(() => undefined);
  void track({ type: 'SEARCH', query: q, metadata: { results: total } });

  const [suggestions, categories, brands] =
    type === 'all'
      ? await Promise.all([
          getSearchSuggestions(q, 5),
          prisma.category.findMany({
            where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
            take: 4,
          }),
          prisma.brand.findMany({
            where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, slug: true },
            take: 4,
          }),
        ])
      : [[], [], []];

  return jsonOk({
    query: q,
    total,
    products,
    suggestions,
    categories: categories.map((c) => ({ ...c, productCount: c._count.products })),
    brands,
  });
});
