import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Button } from '@/components/ui/button';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'All product categories',
    description: `Browse every category at ${settings.businessName} — mobile spare parts, accessories, tools and electronics.`,
    path: '/categories',
    brand: toSeoBrand(settings),
  });
}

export default async function CategoriesPage() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { isActive: true, parentId: null, showInNav: true },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        icon: true,
        position: true,
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
        children: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          select: { id: true, name: true, slug: true, _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
        },
      },
    }),
  ]);

  return (
    <div className="container py-8 lg:py-12">
      <Breadcrumbs items={[{ name: 'Categories' }]} className="mb-6" />

      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue-50 px-3 py-1.5 text-xs font-semibold text-brand-blue-700 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
          <LayoutGrid className="size-3.5" />
          Catalogue
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">All categories</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {categories.length > 0
            ? `Everything we stock at ${settings.businessName}, grouped by what it is. Open a category to see products, brands and availability.`
            : 'Categories are being set up. Browse the full catalogue in the meantime.'}
        </p>
      </header>

      <div className="mt-10 space-y-5">
        {categories.map((category) => (
          <section
            key={category.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
                  <CategoryIcon name={category.icon} size={22} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    <Link href={`/category/${category.slug}`} className="transition hover:text-brand-blue-600">
                      {category.name}
                    </Link>
                  </h2>
                  {category.shortDescription ? (
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {category.shortDescription}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {category._count.products} product{category._count.products === 1 ? '' : 's'}
                    {category.children.length > 0 ? ` · ${category.children.length} sub-categories` : ''}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={`/category/${category.slug}`}>
                  View all
                  <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </div>

            {category.children.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/category/${child.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition hover:border-brand-blue-300 hover:text-brand-blue-600 dark:border-white/10"
                    >
                      {child.name}
                      {child._count.products > 0 ? (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {child._count.products}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/15">
          <h2 className="text-lg font-semibold">No categories yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Once categories are added in the admin panel they will appear here automatically.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/products">Browse all products</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
