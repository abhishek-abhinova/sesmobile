import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { getPublicEnv } from '@/lib/env';
import type { SiteSettings, SocialLink } from '@prisma/client';

export interface ResolvedSettings {
  businessName: string;
  tagline: string;
  ownerName: string;
  logoUrl: string | null;
  logoAltText: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  phone: string;
  whatsappNumber: string;
  email: string | null;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
  gstin: string;
  businessHours: BusinessHour[];
  currencyCode: string;
  currencySymbol: string;
  retailerPricingEnabled: boolean;
  wholesaleLandingEnabled: boolean;
  showCostPriceToAdminOnly: boolean;
  allowGuestWishlist: boolean;
  requireApprovalForRetailer: boolean;
  enableReviews: boolean;
  enableAnalytics: boolean;
  enablePwa: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  twitterHandle: string | null;
  footerAbout: string | null;
  footerCopyright: string | null;
  socialLinks: Array<{ platform: string; label: string; url: string; icon: string | null }>;
  siteUrl: string;
  fullAddress: string;
  analyticsSnippet: string | null;
  customHead: string | null;
  customBodyEnd: string | null;
}

export interface BusinessHour {
  day: string;
  open: string;
  close: string;
  closed: boolean;
  label?: string;
}

/** Fallbacks mirror the real business identity so the site renders sensibly
 *  even before the first migration has been seeded. */
const FALLBACK: ResolvedSettings = {
  businessName: 'S.E.S Mobile World',
  tagline: 'Wholesale Mobile Spare Parts, Accessories & Electronics',
  ownerName: 'Md. Saif',
  logoUrl: null,
  logoAltText: 'S.E.S Mobile World logo',
  faviconUrl: null,
  ogImageUrl: null,
  phone: '+918892399728',
  whatsappNumber: '918892399728',
  email: null,
  addressLine1: 'Behind Police Station, Bur Road',
  addressLine2: 'Opp. Aishwarya Medical',
  city: 'Bangarpet',
  state: 'Karnataka',
  pincode: '563114',
  country: 'India',
  googleMapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Behind+Police+Station%2C+Bur+Road%2C+Opp.+Aishwarya+Medical%2C+Bangarpet+-+563114%2C+Karnataka%2C+India',
  googleMapsEmbedUrl: '',
  gstin: '29HYBR57857HI2J',
  businessHours: [],
  currencyCode: 'INR',
  currencySymbol: '₹',
  retailerPricingEnabled: true,
  wholesaleLandingEnabled: true,
  showCostPriceToAdminOnly: true,
  allowGuestWishlist: true,
  requireApprovalForRetailer: true,
  enableReviews: true,
  enableAnalytics: true,
  enablePwa: true,
  maintenanceMode: false,
  maintenanceMessage: null,
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  twitterHandle: null,
  footerAbout: null,
  footerCopyright: null,
  socialLinks: [],
  siteUrl: 'http://localhost:3000',
  fullAddress: 'Behind Police Station, Bur Road, Opp. Aishwarya Medical, Bangarpet - 563114, Karnataka, India',
  analyticsSnippet: null,
  customHead: null,
  customBodyEnd: null,
};

function parseHours(value: unknown): BusinessHour[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const h = entry as Record<string, unknown>;
    if (typeof h.day !== 'string') return [];
    return [
      {
        day: h.day,
        open: typeof h.open === 'string' ? h.open : '10:00',
        close: typeof h.close === 'string' ? h.close : '20:00',
        closed: Boolean(h.closed),
        label: typeof h.label === 'string' ? h.label : undefined,
      },
    ];
  });
}

type SettingsRow = SiteSettings & { socialLinks: SocialLink[] };

function toResolved(row: SettingsRow | null, env: ReturnType<typeof getPublicEnv>): ResolvedSettings {
  if (!row) return { ...FALLBACK, siteUrl: env.siteUrl };

  return {
    businessName: row.businessName,
    tagline: row.tagline,
    ownerName: row.ownerName,
    logoUrl: row.logoUrl,
    logoAltText: row.logoAltText ?? `${row.businessName} logo`,
    faviconUrl: row.faviconUrl,
    ogImageUrl: row.ogImageUrl,
    phone: row.phone,
    whatsappNumber: row.whatsappNumber,
    email: row.email,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    googleMapsUrl: row.googleMapsUrl || FALLBACK.googleMapsUrl,
    googleMapsEmbedUrl: row.googleMapsEmbedUrl || env.mapsEmbedUrl,
    gstin: row.gstin,
    businessHours: parseHours(row.businessHours),
    currencyCode: row.currencyCode,
    currencySymbol: row.currencySymbol,
    retailerPricingEnabled: row.retailerPricingEnabled,
    wholesaleLandingEnabled: row.wholesaleLandingEnabled,
    showCostPriceToAdminOnly: row.showCostPriceToAdminOnly,
    allowGuestWishlist: row.allowGuestWishlist,
    requireApprovalForRetailer: row.requireApprovalForRetailer,
    enableReviews: row.enableReviews,
    enableAnalytics: row.enableAnalytics,
    enablePwa: row.enablePwa,
    maintenanceMode: row.maintenanceMode,
    maintenanceMessage: row.maintenanceMessage,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    seoKeywords: row.seoKeywords,
    twitterHandle: row.twitterHandle,
    footerAbout: row.footerAbout,
    footerCopyright: row.footerCopyright,
    socialLinks: row.socialLinks
      .filter((s) => s.isActive)
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ platform: s.platform, label: s.label, url: s.url, icon: s.icon })),
    siteUrl: env.siteUrl,
    fullAddress: [row.addressLine1, row.addressLine2, `${row.city} - ${row.pincode}`, `${row.state}, ${row.country}`]
      .filter(Boolean)
      .join(', '),
    analyticsSnippet: row.analyticsSnippet,
    customHead: row.customHead,
    customBodyEnd: row.customBodyEnd,
  };
}

/**
 * Site settings, memoised per request. If the settings row is missing (fresh
 * install before seeding) we fall back to safe defaults rather than 500-ing
 * the whole site.
 */
export const getSettings = cache(async (): Promise<ResolvedSettings> => {
  const env = getPublicEnv();
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      include: { socialLinks: true },
    });
    return toResolved(row, env);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[settings] falling back to defaults:', (error as Error).message);
    }
    return { ...FALLBACK, siteUrl: env.siteUrl };
  }
});

/** Settings limited to what non-admin server code needs. */
export async function getPricingSettings(): Promise<{
  retailerPricingEnabled: boolean;
  showCostPriceToAdminOnly: boolean;
}> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { retailerPricingEnabled: true, showCostPriceToAdminOnly: true },
    });
    return {
      retailerPricingEnabled: row?.retailerPricingEnabled ?? FALLBACK.retailerPricingEnabled,
      showCostPriceToAdminOnly: row?.showCostPriceToAdminOnly ?? FALLBACK.showCostPriceToAdminOnly,
    };
  } catch {
    return {
      retailerPricingEnabled: FALLBACK.retailerPricingEnabled,
      showCostPriceToAdminOnly: FALLBACK.showCostPriceToAdminOnly,
    };
  }
}

export { FALLBACK as FALLBACK_SETTINGS };
