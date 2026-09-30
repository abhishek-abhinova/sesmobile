import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { publicProductSelect, serialiseProducts } from '@/lib/pricing';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { ProductGrid } from '@/components/product/product-card';
import { EmptyState } from '@/components/shared/empty-state';
import { HomeHero } from '@/components/home/hero';
import { TrustStrip, CategoryTiles } from '@/components/home/trust-strip';
import { RetailerCta } from '@/components/home/retailer-cta';
import { BrandCloud, StatsBand, CtaBanner, Section } from '@/components/home/brand-cloud';
import { PackageSearch } from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return buildMetadata({
    title: settings.seoTitle ?? `${settings.businessName} — ${settings.tagline}`,
    description:
      settings.seoDescription ??
      `Wholesale mobile spare parts, accessories and electronics in ${settings.city}, ${settings.state}. Retail and dealer pricing, genuine quality, GST billing and fast WhatsApp support.`,
    path: '/',
    brand: toSeoBrand(settings),
    keywords:
      settings.seoKeywords ??
      `mobile spare parts ${settings.city}, wholesale mobile accessories, mobile display wholesale, phone battery dealer`,
  });
}

export default async function HomePage() {
  const [settings, viewer] = await Promise.all([getSettings(), getCurrentUser()]);

  const pricingOptions = {
    viewer,
    siteSettings: {
      retailerPricingEnabled: settings.retailerPricingEnabled,
      showCostPriceToAdminOnly: settings.showCostPriceToAdminOnly,
    },
  };

  const now = new Date();

  const [categories, brands, featured, newArrivals, bestSellers, heroBanner, counts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null, showInNav: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        imageUrl: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 12,
      select: { id: true, name: true, slug: true, logoUrl: true, _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE', isFeatured: true },
      orderBy: [{ isBestSeller: 'desc' }, { viewCount: 'desc' }],
      take: 8,
      select: publicProductSelect,
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE', isNewArrival: true },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      select: publicProductSelect,
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE', isBestSeller: true },
      orderBy: { viewCount: 'desc' },
      take: 4,
      select: publicProductSelect,
    }),
    prisma.banner.findFirst({
      where: {
        isActive: true,
        position: 'HOME_HERO',
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        title: true,
        subtitle: true,
        eyebrow: true,
        imageUrl: true,
        ctaLabel: true,
        ctaUrl: true,
      },
    }),
    Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.brand.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true, parentId: null } }),
    ]),
  ]);

  const [productCount, brandCount, categoryCount] = counts;

  const featuredProducts = serialiseProducts(featured, pricingOptions);
  const newProducts = serialiseProducts(newArrivals, pricingOptions);
  const topProducts = serialiseProducts(bestSellers, pricingOptions);

  const hasCatalogue = productCount > 0;

  return (
    <>
      <HomeHero
        businessName={settings.businessName}
        city={settings.city}
        tagline={settings.tagline}
        whatsappNumber={settings.whatsappNumber}
        phone={settings.phone}
        {...(heroBanner ? { heroBanner } : {})}
      />

      <TrustStrip />

      {categories.length > 0 ? (
        <section className="container py-12 lg:py-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Shop by category</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Screens, batteries, charging ports, covers and more.
              </p>
            </div>
            <Link href="/products" className="shrink-0 text-sm font-semibold text-brand-blue-600 hover:underline dark:text-brand-blue-400">
              All products →
            </Link>
          </div>

          <CategoryTiles
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              slug: category.slug,
              icon: category.icon,
              imageUrl: category.imageUrl,
              productCount: category._count.products,
            }))}
          />
        </section>
      ) : null}

      {hasCatalogue ? (
        <>
          {featuredProducts.length > 0 ? (
            <section className="container pb-12 lg:pb-16">
              <Section
                eyebrow="Handpicked"
                title="Featured products"
                description="The parts our customers ask for most often."
                action={{ href: '/products?featured=true', label: 'View all' }}
              >
                <ProductGrid products={featuredProducts} columns={4} />
              </Section>
            </section>
          ) : null}

          {topProducts.length > 0 ? (
            <section className="container pb-12 lg:pb-16">
              <Section
                eyebrow="Best sellers"
                title="Moving fast this month"
                action={{ href: '/products?sort=popular', label: 'View all' }}
              >
                <ProductGrid products={topProducts} columns={4} />
              </Section>
            </section>
          ) : null}

          <RetailerCta
            businessName={settings.businessName}
            whatsappNumber={settings.whatsappNumber}
            siteUrl={settings.siteUrl}
            city={settings.city}
          />

          {newProducts.length > 0 ? (
            <section className="container pb-12 lg:pb-16">
              <Section
                eyebrow="Just in"
                title="New arrivals"
                action={{ href: '/products?newArrival=true', label: 'View all' }}
              >
                <ProductGrid products={newProducts} columns={4} />
              </Section>
            </section>
          ) : null}
        </>
      ) : (
        <section className="container py-14">
          <EmptyState
            icon={PackageSearch}
            title="The catalogue is being prepared"
            description="Products are being added right now. Message us on WhatsApp with the part you need and we will share availability and pricing straight away."
            action={{ href: '/contact', label: 'Contact the shop' }}
          />
        </section>
      )}

      {brands.length > 0 ? (
        <section className="border-y border-slate-200 bg-slate-50/70 py-12 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="container">
            <h2 className="mb-6 text-center text-xl font-bold sm:text-2xl">Brands we stock</h2>
            <BrandCloud
              brands={brands.map((brand) => ({
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
                logoUrl: brand.logoUrl,
                productCount: brand._count.products,
              }))}
            />
          </div>
        </section>
      ) : null}

      {hasCatalogue ? (
        <StatsBand productCount={productCount} brandCount={brandCount} categoryCount={categoryCount} city={settings.city} />
      ) : null}

      <CtaBanner
        title="Need a part that is not listed yet?"
        body="We source many items on request. Send us the model name or a photo of the part on WhatsApp and we will confirm availability and price."
        primary={{ href: '/contact', label: 'Send an enquiry' }}
        secondary={{ href: '/products', label: 'Browse catalogue' }}
      />
    </>
  );
}
