import type { Metadata } from 'next';
import Link from 'next/link';
import { PackageSearch, SearchX } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { publicProductSelect, serialiseProducts } from '@/lib/pricing';
import { buildProductQuery, getProductFacets, SORT_OPTIONS, type SortOption } from '@/lib/queries/products';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { ProductGrid } from '@/components/product/product-card';
import { ProductFilters, type ProductFacets } from '@/components/product/product-filters';
import { EmptyState } from '@/components/shared/empty-state';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { Pagination } from '@/components/shared/pagination';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean))];
}

function toNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(value: string | string[] | undefined): boolean | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const settings = await getSettings();
  const q = typeof params.q === 'string' ? params.q : undefined;

  const title = q
    ? `Search results for “${q}”`
    : Array.isArray(params.category)
      ? 'Products'
      : typeof params.category === 'string'
        ? `Shop ${params.category.replace(/-/g, ' ')}`
        : 'Mobile spare parts & accessories';

  return buildMetadata({
    title,
    description: q
      ? `Products matching ${q} at ${settings.businessName}, ${settings.city}. Retail and wholesale pricing available.`
      : `Browse the full catalogue of mobile spare parts, displays, batteries, chargers and accessories at ${settings.businessName}, ${settings.city}.`,
    path: '/products',
    brand: toSeoBrand(settings),
    // Filtered permutations should not compete with the canonical listing.
    noIndex: Boolean(q),
  });
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [settings, viewer] = await Promise.all([getSettings(), getCurrentUser()]);

  const sort = (typeof params.sort === 'string' && (SORT_OPTIONS as readonly string[]).includes(params.sort)
    ? params.sort
    : 'newest') as SortOption;

  const query = buildProductQuery(
    {
      ...(typeof params.q === 'string' ? { q: params.q } : {}),
      ...(toList(params.category).length > 0 ? { category: toList(params.category) } : {}),
      ...(toList(params.brand).length > 0 ? { brand: toList(params.brand) } : {}),
      ...(toList(params.model).length > 0 ? { model: toList(params.model) } : {}),
      ...(toNumber(params.minPrice) !== undefined ? { minPrice: toNumber(params.minPrice) } : {}),
      ...(toNumber(params.maxPrice) !== undefined ? { maxPrice: toNumber(params.maxPrice) } : {}),
      ...(typeof params.availability === 'string' &&
      ['in-stock', 'out-of-stock', 'all'].includes(params.availability)
        ? { availability: params.availability as 'in-stock' | 'out-of-stock' | 'all' }
        : {}),
      ...(toBool(params.onSale) !== undefined ? { onSale: toBool(params.onSale) } : {}),
      ...(toBool(params.featured) !== undefined ? { featured: toBool(params.featured) } : {}),
      ...(toBool(params.newArrival) !== undefined ? { newArrival: toBool(params.newArrival) } : {}),
      sort,
      page: toNumber(params.page) ?? 1,
      pageSize: 24,
    },
    { publicOnly: true },
  );

  const [rows, total, facets, categoryList] = await Promise.all([
    prisma.product.findMany({
      where: query.where,
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
      select: publicProductSelect,
    }),
    prisma.product.count({ where: query.where }),
    getProductFacets(query.where),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, icon: true, _count: { select: { products: true } } },
    }),
  ]);

  const products = serialiseProducts(rows, {
    viewer,
    siteSettings: {
      retailerPricingEnabled: settings.retailerPricingEnabled,
      showCostPriceToAdminOnly: settings.showCostPriceToAdminOnly,
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const q = typeof params.q === 'string' ? params.q : null;

  const facetsForUi: ProductFacets = {
    brands: facets.brands,
    models: facets.models,
    priceMin: Math.max(0, Math.floor(facets.priceMin)),
    priceMax: Math.max(facets.priceMax, Math.floor(facets.priceMin) + 100),
    categories: categoryList.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      count: category._count.products,
    })),
  };

  return (
    <div className="container py-6 lg:py-10">
      <Breadcrumbs items={[{ name: q ? `Search: ${q}` : 'Products' }]} className="mb-4" />

      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {q ? `Results for “${q}”` : 'All products'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {q
            ? 'Showing matching products. Refine using the filters, or message us on WhatsApp if you need something specific.'
            : `Displays, batteries, charging ports, covers and accessories — retail and wholesale from ${settings.businessName}.`}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
        <div className="order-2 lg:order-1">
          <ProductFilters facets={facetsForUi} total={total} />
        </div>

        <div className="order-1 lg:order-2">
          {products.length === 0 ? (
            <EmptyState
              icon={q ? SearchX : PackageSearch}
              title={q ? 'No products matched your search' : 'No products in this filter yet'}
              description={
                q
                  ? 'Try a shorter search term, a different spelling, or clear the filters. You can also send us the part name on WhatsApp.'
                  : 'We are adding products regularly. Send us your requirement list and we will confirm availability and pricing.'
              }
              action={{ href: '/contact', label: 'Send an enquiry' }}
            />
          ) : (
            <>
              <ProductGrid products={products} columns={4} />
              <Pagination page={query.page} totalPages={totalPages} basePath="/products" params={params} />
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Showing {products.length} of {total} products ·{' '}
                <Link href="/contact" className="text-brand-blue-600 hover:underline dark:text-brand-blue-400">
                  Can&rsquo;t find what you need?
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
