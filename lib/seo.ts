import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/slug';
import { normaliseWhatsappNumber, normalisePhone } from '@/lib/whatsapp';

/* ==========================================================================
 *  SEO: metadata builder + JSON-LD structured data
 *  Targets local search around Bangarpet / Karnataka without keyword stuffing.
 * ======================================================================== */

export interface SeoBrand {
  businessName: string;
  tagline: string;
  siteUrl: string;
  logoUrl: string | null;
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
  fullAddress: string;
  googleMapsUrl: string;
  gstin: string;
  businessHours: Array<{ day: string; open: string; close: string; closed: boolean }>;
  twitterHandle: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
}

/** Narrow the resolved settings row down to exactly what SEO needs. */
export function toSeoBrand(settings: {
  businessName: string;
  tagline: string;
  siteUrl: string;
  logoUrl: string | null;
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
  fullAddress: string;
  googleMapsUrl: string;
  gstin: string;
  businessHours: Array<{ day: string; open: string; close: string; closed: boolean }>;
  twitterHandle: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
}): SeoBrand {
  return {
    businessName: settings.businessName,
    tagline: settings.tagline,
    siteUrl: settings.siteUrl,
    logoUrl: settings.logoUrl,
    ogImageUrl: settings.ogImageUrl,
    phone: settings.phone,
    whatsappNumber: settings.whatsappNumber,
    email: settings.email,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    city: settings.city,
    state: settings.state,
    pincode: settings.pincode,
    country: settings.country,
    fullAddress: settings.fullAddress,
    googleMapsUrl: settings.googleMapsUrl,
    gstin: settings.gstin,
    businessHours: settings.businessHours,
    twitterHandle: settings.twitterHandle,
    socialLinks: settings.socialLinks,
  };
}

const LOCAL_TERMS = [
  'mobile accessories Bangarpet',
  'mobile spare parts Bangarpet',
  'mobile wholesale Bangarpet',
  'mobile repairing tools Bangarpet',
  'electronics wholesale Bangarpet',
  'mobile accessories wholesale Karnataka',
  'mobile spare parts wholesale',
];

interface BuildMetaInput {
  title: string;
  description: string;
  path: string;
  brand: SeoBrand;
  image?: string | null;
  type?: 'website' | 'article' | 'product';
  keywords?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  brand,
  image,
  type = 'website',
  keywords,
  publishedTime,
  modifiedTime,
  noIndex = false,
  noFollow = false,
}: BuildMetaInput): Metadata {
  const siteUrl = brand.siteUrl.replace(/\/$/, '');
  const url = absoluteUrl(path, siteUrl);
  const ogImage = absoluteUrl(image || brand.ogImageUrl || '/opengraph-image', siteUrl);
  const fullTitle = title.includes(brand.businessName) ? title : `${title} | ${brand.businessName}`;

  return {
    title: fullTitle,
    description: description.slice(0, 300),
    keywords: keywords?.split(',').map((k) => k.trim()).filter(Boolean),
    alternates: {
      canonical: url,
    },
    robots: {
      index: !noIndex,
      follow: !noFollow,
      googleBot: {
        index: !noIndex,
        follow: !noFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: type === 'product' ? 'website' : type,
      url,
      title: fullTitle,
      description: description.slice(0, 300),
      siteName: brand.businessName,
      locale: 'en_IN',
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: description.slice(0, 300),
      images: [ogImage],
      ...(brand.twitterHandle ? { site: brand.twitterHandle, creator: brand.twitterHandle } : {}),
    },
    other: {
      'geo.region': 'KA-13',
      'geo.placename': `${brand.city}, ${brand.state}`,
      'geo.position': '',
      'ICBM': `${brand.city}, ${brand.state}, India`,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  JSON-LD builders                                                          */
/* -------------------------------------------------------------------------- */

export function organizationSchema(brand: SeoBrand) {
  const sameAs = brand.socialLinks
    .filter((l) => l.platform !== 'whatsapp')
    .map((l) => l.url);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${brand.siteUrl.replace(/\/$/, '')}/#organization`,
    name: brand.businessName,
    legalName: brand.businessName,
    alternateName: 'S.E.S Mobile World',
    description: `${brand.businessName} — ${brand.tagline}. Wholesale and retail supplier of mobile accessories, mobile spare parts, repairing tools and electronics in ${brand.city}, ${brand.state}.`,
    url: brand.siteUrl,
    logo: brand.logoUrl ? absoluteUrl(brand.logoUrl, brand.siteUrl) : `${brand.siteUrl.replace(/\/$/, '')}/icon.svg`,
    image: brand.ogImageUrl ? absoluteUrl(brand.ogImageUrl, brand.siteUrl) : undefined,
    telephone: normalisePhone(brand.phone),
    email: brand.email ?? undefined,
    foundingDate: undefined, // deliberately omitted — no invented history
    vatID: brand.gstin,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${brand.addressLine1}, ${brand.addressLine2}`,
      addressLocality: brand.city,
      addressRegion: brand.state,
      postalCode: brand.pincode,
      addressCountry: 'IN',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: normalisePhone(brand.phone),
        contactType: 'sales',
        areaServed: 'IN',
        availableLanguage: ['en', 'kn', 'hi'],
        url: brand.siteUrl,
      },
      {
        '@type': 'ContactPoint',
        telephone: `+${normaliseWhatsappNumber(brand.whatsappNumber)}`,
        contactType: 'customer support',
        areaServed: 'IN',
        availableLanguage: ['en'],
      },
    ],
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

const DAY_MAP: Record<string, string> = {
  monday: 'Mo',
  tuesday: 'Tu',
  wednesday: 'We',
  thursday: 'Th',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'Su',
};

export function localBusinessSchema(brand: SeoBrand) {
  const siteUrl = brand.siteUrl.replace(/\/$/, '');

  const openingHours = brand.businessHours
    .filter((h) => !h.closed && DAY_MAP[h.day.toLowerCase()])
    .map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${DAY_MAP[h.day.toLowerCase()]}`,
      opens: h.open,
      closes: h.close,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': ['HardwareStore', 'Store'],
    '@id': `${siteUrl}/#localbusiness`,
    name: brand.businessName,
    description: `${brand.tagline}. Wholesale and retail supplier of mobile accessories, mobile spare parts, mobile repairing tools, electronics and gadgets in ${brand.city}, ${brand.state}.`,
    url: siteUrl,
    telephone: normalisePhone(brand.phone),
    email: brand.email ?? undefined,
    image: brand.ogImageUrl ? absoluteUrl(brand.ogImageUrl, siteUrl) : undefined,
    logo: brand.logoUrl ? absoluteUrl(brand.logoUrl, siteUrl) : `${siteUrl}/icon.svg`,
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Bank Transfer',
    vatID: brand.gstin,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${brand.addressLine1}, ${brand.addressLine2}`,
      addressLocality: brand.city,
      addressRegion: brand.state,
      postalCode: brand.pincode,
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      // Exact coordinates are set from Admin > Settings. Omitted until known
      // rather than approximated.
      latitude: undefined,
      longitude: undefined,
    },
    hasMap: brand.googleMapsUrl,
    areaServed: [
      { '@type': 'City', name: brand.city },
      { '@type': 'State', name: brand.state },
      { '@type': 'Country', name: 'India' },
    ],
    openingHoursSpecification: openingHours.length ? openingHours : undefined,
    sameAs: brand.socialLinks.filter((l) => l.platform !== 'whatsapp').map((l) => l.url),
    parentOrganization: { '@id': `${siteUrl}/#organization` },
    knowsAbout: [
      'mobile accessories',
      'mobile spare parts',
      'mobile repairing tools',
      'electronics wholesale',
      'mobile displays',
      'mobile batteries',
      'chargers and cables',
      'smart watches',
    ],
  };
}

export interface ProductSchemaInput {
  name: string;
  description: string;
  sku: string;
  imageUrls: string[];
  categoryName: string | null;
  brandName: string | null;
  brand: SeoBrand;
  price: number | null;
  mrp: number | null;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  ratingValue: number | null;
  reviewCount: number;
  url: string;
}

export function productSchema(input: ProductSchemaInput) {
  const siteUrl = input.brand.siteUrl.replace(/\/$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${input.url}#product`,
    name: input.name,
    description: input.description.slice(0, 1000),
    sku: input.sku,
    mpn: input.sku,
    category: input.categoryName ?? undefined,
    image: input.imageUrls.length ? input.imageUrls.map((u) => absoluteUrl(u, siteUrl)) : undefined,
    brand: input.brandName ? { '@type': 'Brand', name: input.brandName } : undefined,
    url: input.url,
    offers: {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: 'INR',
      price: input.price != null ? input.price.toFixed(2) : undefined,
      availability: `https://schema.org/${input.availability}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${siteUrl}/#organization` },
      ...(input.mrp != null && input.mrp > (input.price ?? 0)
        ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: input.mrp.toFixed(2), priceCurrency: 'INR' } }
        : {}),
    },
    ...(input.ratingValue != null && input.ratingValue > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: input.ratingValue.toFixed(1),
            reviewCount: Math.max(1, input.reviewCount),
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function itemListSchema(items: Array<{ name: string; url: string }>, name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url),
    })),
  };
}

export function websiteSchema(brand: SeoBrand) {
  const siteUrl = brand.siteUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: brand.businessName,
    description: brand.tagline,
    inLanguage: 'en-IN',
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/products?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function defaultKeywords(): string {
  return [...LOCAL_TERMS, 'S.E.S Mobile World', 'mobile accessories Bangarpet', 'mobile shop Bangarpet'].join(', ');
}

/** Normalises JSON-LD so Next.js can inject it without hydration warnings. */
export function serialiseSchema(schema: unknown): string {
  return JSON.stringify(schema, (_k, v) => (v === undefined ? null : v)).replace(/</g, '\\u003c');
}
