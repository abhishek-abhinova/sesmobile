import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { AppProviders } from '@/components/providers/app-providers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { MobileNavBar } from '@/components/layout/mobile-nav-bar';
import { WhatsAppFab } from '@/components/layout/whatsapp-fab';
import { StructuredData } from '@/components/shared/structured-data';
import { organizationSchema, localBusinessSchema, websiteSchema } from '@/lib/seo';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1a3a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const brand = toSeoBrand(settings);

  return buildMetadata({
    title: settings.seoTitle ?? `${settings.businessName} — ${settings.tagline}`,
    description:
      settings.seoDescription ??
      `${settings.tagline} in ${settings.city}, ${settings.state}. Retail and wholesale prices, fast WhatsApp support, dealer enquiries welcome.`,
    path: '/',
    brand,
    keywords: settings.seoKeywords ?? undefined,
  });
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const brand = toSeoBrand(settings);

  // Only the essentials of the visitor are needed by the client shell.
  const viewer = user
    ? {
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
        isEditor: user.isEditor,
        isRetailer: user.isRetailer,
        isApprovedRetailer: user.isApprovedRetailer,
        canSeeRetailerPricing: user.canSeeRetailerPricing,
        businessName: user.businessName ?? null,
      }
    : null;

  const contact = {
    businessName: settings.businessName,
    tagline: settings.tagline,
    whatsappNumber: settings.whatsappNumber,
    phone: settings.phone,
    email: settings.email,
    address: settings.fullAddress,
    city: settings.city,
    state: settings.state,
    gstin: settings.gstin,
    logoUrl: settings.logoUrl,
    footerAbout: settings.footerAbout,
    footerCopyright: settings.footerCopyright,
    socialLinks: settings.socialLinks,
    businessHours: settings.businessHours,
    googleMapsUrl: settings.googleMapsUrl,
  };

  return (
    <html lang="en-IN" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <head>
        {settings.faviconUrl ? <link rel="icon" href={settings.faviconUrl} /> : null}
        {settings.customHead ? (
          // Admin-controlled head markup (verification tags, fonts, etc.).
          <script
            type="application/dangerously-allow-html"
            dangerouslySetInnerHTML={{ __html: settings.customHead }}
          />
        ) : null}
        <StructuredData data={organizationSchema(brand)} id="schema-organization" />
        <StructuredData data={localBusinessSchema(brand)} id="schema-localbusiness" />
        <StructuredData data={websiteSchema(brand)} id="schema-website" />
      </head>
      <body className="min-h-dvh bg-background font-sans">
        <AppProviders isAuthenticated={Boolean(user)}>
          <a
            href="#main"
            className="sr-only z-[100] rounded-md bg-brand-blue-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
          >
            Skip to content
          </a>

          <SiteHeader settings={contact} categories={await navCategories()} viewer={viewer} />

          {settings.maintenanceMode ? (
            <main id="main" className="container flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
              <h1 className="text-3xl font-bold">We are doing a quick maintenance</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                {settings.maintenanceMessage ?? 'Please check back shortly. For urgent orders, WhatsApp or call us.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href={`https://wa.me/${settings.whatsappNumber}`}
                  className="inline-flex h-11 items-center rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  WhatsApp us
                </a>
                <a href={`tel:${settings.phone}`} className="inline-flex h-11 items-center rounded-lg border px-5 text-sm font-semibold">
                  {settings.phone}
                </a>
              </div>
            </main>
          ) : (
            <>
              <main id="main" className="pb-mobile-nav md:pb-0">
                {children}
              </main>
              <SiteFooter settings={contact} pages={await footerPages()} />
            </>
          )}

          <MobileNavBar viewer={viewer} />
          {!settings.maintenanceMode ? <WhatsAppFab contact={contact} /> : null}
        </AppProviders>
      </body>
    </html>
  );
}

/** Top-level categories for the header mega-menu. */
async function navCategories() {
  try {
    return await prisma.category.findMany({
      where: { isActive: true, showInNav: true, parentId: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        imageUrl: true,
        children: {
          where: { isActive: true, showInNav: true },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
          take: 12,
          select: { id: true, name: true, slug: true },
        },
      },
    });
  } catch {
    return [];
  }
}

async function footerPages() {
  try {
    return await prisma.page.findMany({
      where: { isPublished: true, showInFooter: true },
      orderBy: { title: 'asc' },
      take: 10,
      select: { id: true, title: true, slug: true },
    });
  } catch {
    return [];
  }
}
