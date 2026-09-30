import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PackageSearch } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { publicProductSelect, serialiseProducts } from '@/lib/pricing';
import { buildProductQuery, getProductFacets } from '@/lib/queries/products';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { ProductGrid } from '@/components/product/product-card';
import { ProductFilters, type ProductFacets } from '@/components/product/product-filters';
import { EmptyState } from '@/components/shared/empty-state';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { Pagination } from '@/components/shared/pagination';
import { CategoryIcon } from '@/components/shared/category-icon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function loadCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      icon: true,
      imageUrl: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      ogImageUrl: true,
      parentId: true,
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, icon: true, imageUrl: true, _count: { select: { products: true } } },
      },
      _count: { select: { products: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [category, settings] = await Promise.all([loadCategory(slug), getSettings()]);

  if (!category) {
    return { title: 'Category not found', robots: { index: false, follow: false } };
  }

  const description =
    category.seoDescription ??
    category.description ??
    category.shortDescription ??
    `Browse ${category.name} at ${settings.businessName}, ${settings.city}. Retail and wholesale pricing, fast WhatsApp support.`;

  return buildMetadata({
    title: category.seoTitle ?? `${category.name} — ${settings.businessName}`,
    description,
    path: `/category/${category.slug}`,
    brand: toSeoBrand(settings),
    image: category.ogImageUrl ?? category.imageUrl,
    keywords: category.seoKeywords ?? undefined,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const [settings, viewer] = await Promise.all([getSettings(), getCurrentUser()]);
  const category = await loadCategory(slug);

  if (!category) notFound();

  const childSlugs = category.children.map((child) => child.slug);

  const built = buildProductQuery(
    {
      category: childSlugs.length > 0 ? [category.slug, ...childSlugs] : category.slug,
      ...(typeof query.brand === 'string' ? { brand: query.brand } : {}),
      ...(typeof query.model === 'string' ? { model: query.model } : {}),
      sort: typeof query.sort === 'string' ? (query.sort as never) : 'newest',
      page: Number.parseInt(String(query.page ?? '1'), 10) || 1,
      pageSize: 24,
    },
    { publicOnly: true },
  );

  const [rows, total, facets] = await Promise.all([
    prisma.product.findMany({
      where: built.where,
      orderBy: built.orderBy,
      skip: built.skip,
      take: built.take,
      select: publicProductSelect,
    }),
    prisma.product.count({ where: built.where }),
    getProductFacets(built.where),
  ]);

  const products = serialiseProducts(rows, {
    viewer,
    siteSettings: {
      retailerPricingEnabled: settings.retailerPricingEnabled,
      showCostPriceToAdminOnly: settings.showCostPriceToAdminOnly,
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / built.pageSize));

  const facetsForUi: ProductFacets = {
    brands: facets.brands,
    models: facets.models,
    priceMin: Math.max(0, Math.floor(facets.priceMin)),
    priceMax: Math.max(facets.priceMax, Math.floor(facets.priceMin) + 100),
    categories: childSlugs.map((childSlug) => {
      const child = category.children.find((c) => c.slug === childSlug);
      return {
        id: child?.id ?? childSlug,
        name: child?.name ?? childSlug,
        slug: childSlug,
        icon: child?.icon ?? null,
        count: child?._count.products ?? 0,
      };
    }),
  };

  const crumbs = [
    ...(category.parent ? [{ name: category.parent.name, href: `/category/${category.parent.slug}` }] : []),
    { name: category.name },
  ];

  return (
    <div className="container py-6 lg:py-10">
      <Breadcrumbs items={crumbs} className="mb-4" />

      <header className="mb-6 flex items-start gap-4">
        {category.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={category.imageUrl} alt="" className="size-16 rounded-2xl object-contain" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
            <CategoryIcon name={category.icon} size={28} />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{category.name}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {category.shortDescription ?? category.description ?? `${total} products available.`}
          </p>
        </div>
      </header>

      {category.children.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium transition hover:border-brand-blue-300 hover:text-brand-blue-600 dark:border-white/10 dark:bg-white/[0.03]"
            >
              {child.name}
              <span className="text-xs text-muted-foreground">{child._count.products}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
        <div className="order-2 lg:order-1">
          <ProductFilters facets={facetsForUi} total={total} />
        </div>

        <div className="order-1 lg:order-2">
          {products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products in this category yet"
              description="We are stocking this category now. Send us the model you need and we will confirm availability and pricing on WhatsApp."
              action={{ href: '/contact', label: 'Send an enquiry' }}
            />
          ) : (
            <>
              <ProductGrid products={products} columns={4} />
              <Pagination
                page={built.page}
                totalPages={totalPages}
                basePath={`/category/${category.slug}`}
                params={query}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
