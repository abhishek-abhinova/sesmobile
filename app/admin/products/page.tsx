import Link from 'next/link';
import { Package, Search } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { ProductImage } from '@/components/shared/product-image';
import { PublishToggle, StockStatusSelect } from '@/components/admin/product-row-actions';
import type { PageProps } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

const STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
const STOCKS = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON'] as const;

export default async function AdminProductsPage({
  searchParams,
}: PageProps<{ q?: string; status?: string; stock?: string; page?: string }>) {
  const params = await searchParams;
  const q = params.q?.trim();
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : undefined;
  const stock = STOCKS.includes(params.stock as (typeof STOCKS)[number])
    ? (params.stock as (typeof STOCKS)[number])
    : undefined;
  const page = Math.max(1, Number(params.page ?? '1') || 1);

  const where: Prisma.ProductWhereInput = {
    ...(status && { status }),
    ...(stock && { stockStatus: stock }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { searchKeywords: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        mrp: true,
        customerPrice: true,
        retailerPrice: true,
        costPrice: true,
        stockStatus: true,
        stockQuantity: true,
        status: true,
        isFeatured: true,
        isBestSeller: true,
        viewCount: true,
        enquiryCount: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true, thumbnailUrl: true, alt: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { position: 'asc' }, select: { id: true, name: true } }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} matching products</p>
        </div>
        <form className="flex gap-2" action="/admin/products" method="get">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {stock ? <input type="hidden" name="stock" value={stock} /> : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search name or SKU…"
              className="h-10 w-64 rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25 dark:border-white/15 dark:bg-white/[0.04]"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </header>

      <div className="flex flex-wrap gap-2">
        <Chip href="/admin/products" active={!status && !stock}>
          All
        </Chip>
        {STATUSES.map((option) => (
          <Chip key={option} href={`/admin/products?status=${option}`} active={status === option}>
            {option.toLowerCase()}
          </Chip>
        ))}
        <span className="mx-1 hidden w-px bg-slate-200 sm:block dark:bg-white/10" />
        {STOCKS.map((option) => (
          <Chip
            key={option}
            href={`/admin/products?stock=${option}`}
            active={stock === option}
          >
            {option.toLowerCase().replace(/_/g, ' ')}
          </Chip>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Adjust the filters, or add the first product to get the catalogue started."
          action={{ href: '/admin/products', label: 'Clear filters' }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">MRP</th>
                  <th className="px-4 py-3 text-right font-medium">Dealer</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Live</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {products.map((product) => {
                  const image = product.images[0];
                  return (
                    <tr key={product.id} className="align-middle transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                            <ProductImage
                              src={image?.thumbnailUrl ?? image?.url ?? null}
                              alt={image?.alt ?? product.name}
                              imageClassName="size-11 object-cover"
                              sizes="44px"
                            />
                          </span>
                          <span className="min-w-0">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="block max-w-[16rem] truncate font-medium hover:text-brand-blue-600"
                            >
                              {product.name}
                            </Link>
                            <span className="block font-mono text-[11px] text-muted-foreground">{product.sku}</span>
                            {product.brand ? (
                              <span className="block text-[11px] text-muted-foreground">{product.brand.name}</span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.category?.name ?? '—'}
                        {product.isFeatured ? (
                          <Badge variant="default" className="ml-2">
                            featured
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {product.mrp ? formatCurrency(Number(product.mrp)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {product.retailerPrice ? (
                          formatCurrency(Number(product.retailerPrice))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {product.costPrice ? formatCurrency(Number(product.costPrice)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{product.stockQuantity}</td>
                      <td className="px-4 py-3">
                        <StockStatusSelect id={product.id} value={product.stockStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <PublishToggle id={product.id} status={product.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span className="block">{formatNumber(product.viewCount)} views</span>
                        <span className="block">{formatNumber(product.enquiryCount)} enquiries</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/products"
          params={{ q, status, stock }}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Categories available for editing: {categories.length} · brands: {brands.length}
      </p>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-500/15 dark:text-brand-blue-300'
          : 'border-slate-200 text-muted-foreground hover:border-brand-blue-300 dark:border-white/10'
      }`}
    >
      {children}
    </Link>
  );
}
