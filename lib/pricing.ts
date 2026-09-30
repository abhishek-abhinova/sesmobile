import 'server-only';
import type { Product, ProductImage, Category, Brand } from '@prisma/client';
import { calculateDiscountPercent } from '@/lib/format';
import type { AuthUser } from '@/lib/auth';

/* ==========================================================================
 *  PRICING VISIBILITY CONTROL  —  SINGLE SOURCE OF TRUTH
 * --------------------------------------------------------------------------
 *  Retailer (wholesale) prices and cost prices must NEVER reach an unauthorised
 *  client. This module is the only place that decides what price fields are
 *  allowed onto a serialised payload, and it is server-only.
 *
 *  Rules:
 *   1. `retailerPrice` is emitted only when the viewer is an APPROVED retailer
 *      (or admin/editor), AND the product's `showRetailerPrice` flag is on.
 *   2. `costPrice` is emitted only to ADMIN, AND only when the site setting
 *      `showCostPriceToAdminOnly` is on. It is never exposed to editors.
 *   3. `mrp` / `customerPrice` respect the per-product toggle flags.
 *   4. The field is *omitted entirely* (not nulled) when hidden, so it cannot be
 *      inferred from JSON shape.
 *   5. Nothing in `components/` may import from Prisma types at the client
 *      boundary — public components consume `PublicProduct` only.
 * ======================================================================== */

export type PriceTier = 'retail' | 'wholesale';

export interface PublicPriceBlock {
  mrp: number | null;
  customerPrice: number | null;
  retailerPrice?: number;
  costPrice?: number;
  effectivePrice: number | null;
  discountPercent: number;
  savingsAmount: number;
  showMrp: boolean;
  showCustomerPrice: boolean;
  showRetailerPrice: boolean;
  showDiscount: boolean;
  discountType: string;
  discountValue: number | null;
  wholesaleAvailable: boolean;
  minimumWholesaleQty: number;
  minimumOrderQty: number;
  /** Which tier the visitor is being shown. */
  tier: PriceTier;
}

export interface PublicProductImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  blurDataUrl: string | null;
  alt: string | null;
  usage: string;
  isPrimary: boolean;
  position: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  status: string;
  stockStatus: string;
  stockQuantity: number;
  lowStockThreshold: number;
  minimumOrderQty: number;
  minimumWholesaleQty: number;
  wholesaleOnly: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isWholesaleDeal: boolean;
  badge: string | null;
  isDemo: boolean;
  supportedModels: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  viewCount: number;
  wishlistCount: number;
  brand: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  category: { id: string; name: string; slug: string; icon: string | null; imageUrl: string | null } | null;
  subcategory: { id: string; name: string; slug: string } | null;
  images: PublicProductImage[];
  primaryImage: PublicProductImage | null;
  price: PublicPriceBlock;
  seo: { title: string | null; description: string | null; keywords: string | null; ogImageUrl: string | null };
}

/** The Prisma row shape this module accepts. */
export type PriceableProduct = Pick<
  Product,
  | 'id' | 'mrp' | 'costPrice' | 'customerPrice' | 'retailerPrice'
  | 'showMrp' | 'showCustomerPrice' | 'showRetailerPrice' | 'showDiscount'
  | 'discountType' | 'discountValue' | 'minimumOrderQty' | 'minimumWholesaleQty' | 'wholesaleOnly'
  | 'lowStockThreshold' | 'brandId' | 'categoryId' | 'subcategoryId'
> & { stockStatus: Product['stockStatus']; stockQuantity: number };

export interface PricingOptions {
  viewer: AuthUser | null;
  siteSettings: {
    retailerPricingEnabled: boolean;
    /** When false, cost price is never emitted — not even to an admin. */
    showCostPriceToAdminOnly: boolean;
  };
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function canViewRetailerPrice(
  viewer: AuthUser | null,
  siteSettings: { retailerPricingEnabled: boolean },
): boolean {
  if (!siteSettings.retailerPricingEnabled) return false;
  if (!viewer) return false;
  return viewer.isAdmin || viewer.isEditor || viewer.isApprovedRetailer;
}

export function canViewCostPrice(viewer: AuthUser | null): boolean {
  return Boolean(viewer?.isAdmin);
}

/**
 * Builds the price block for a single product.
 * This is the ONLY function permitted to read `retailerPrice` / `costPrice`.
 */
export function buildPriceBlock(
  product: PriceableProduct,
  { viewer, siteSettings }: PricingOptions,
): PublicPriceBlock {
  const mrp = num(product.mrp);
  const customerPrice = num(product.customerPrice);
  const retailerPrice = num(product.retailerPrice);
  const costPrice = num(product.costPrice);

  const maySeeRetailer = canViewRetailerPrice(viewer, siteSettings) && product.showRetailerPrice;
  const maySeeCost = canViewCostPrice(viewer) && siteSettings.showCostPriceToAdminOnly;

  const tier: PriceTier = maySeeRetailer ? 'wholesale' : 'retail';

  // Effective price = the price the viewer actually pays.
  const effectivePrice =
    tier === 'wholesale' && retailerPrice !== null
      ? retailerPrice
      : product.showCustomerPrice
        ? customerPrice
        : null;

  // Discount is always measured against the price the viewer sees.
  const discountPercent =
    mrp && effectivePrice !== null && effectivePrice < mrp ? calculateDiscountPercent(mrp, effectivePrice) : 0;

  const savingsAmount =
    mrp && effectivePrice !== null && effectivePrice < mrp ? Math.round((mrp - effectivePrice) * 100) / 100 : 0;

  const block: PublicPriceBlock = {
    // MRP / customer price respect their per-product toggles.
    mrp: product.showMrp ? mrp : null,
    customerPrice: product.showCustomerPrice ? customerPrice : null,
    effectivePrice,
    discountPercent,
    savingsAmount,
    showMrp: product.showMrp,
    showCustomerPrice: product.showCustomerPrice,
    // The `show` flags themselves leak only whether a wholesale price exists,
    // which is safe (and needed for the "Retailer price available" badge).
    showRetailerPrice: maySeeRetailer,
    showDiscount: product.showDiscount,
    discountType: product.discountType,
    discountValue: num(product.discountValue),
    wholesaleAvailable: retailerPrice !== null && (viewer?.isApprovedRetailer || viewer?.isAdmin || viewer?.isEditor || false),
    minimumWholesaleQty: product.minimumWholesaleQty,
    minimumOrderQty: product.minimumOrderQty,
    tier,
  };

  if (maySeeRetailer && retailerPrice !== null) {
    block.retailerPrice = retailerPrice;
  }
  if (maySeeCost && costPrice !== null) {
    block.costPrice = costPrice;
  }

  return block;
}

/* -------------------------------------------------------------------------- */
/*  Serialisers                                                               */
/* -------------------------------------------------------------------------- */

export interface ProductWithRelations extends PriceableProduct {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  status: string;
  lowStockThreshold: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isWholesaleDeal: boolean;
  badge: string | null;
  isDemo: boolean;
  supportedModels: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  viewCount: number;
  wishlistCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
  searchKeywords: string | null;
  discountPercent?: number | null;
  brand?: Pick<Brand, 'id' | 'name' | 'slug' | 'logoUrl'> | null;
  category?: Pick<Category, 'id' | 'name' | 'slug' | 'icon' | 'imageUrl'> | null;
  subcategory?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  images?: Array<
    Pick<ProductImage, 'id' | 'url' | 'thumbnailUrl' | 'blurDataUrl' | 'alt' | 'usage' | 'isPrimary' | 'position'>
  >;
}

export function serialiseImage(
  image: Pick<ProductImage, 'id' | 'url' | 'thumbnailUrl' | 'blurDataUrl' | 'alt' | 'usage' | 'isPrimary' | 'position'>,
): PublicProductImage {
  return {
    id: image.id,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl,
    blurDataUrl: image.blurDataUrl,
    alt: image.alt,
    usage: image.usage,
    isPrimary: image.isPrimary,
    position: image.position,
  };
}

export function serialiseProduct(
  product: ProductWithRelations,
  options: PricingOptions,
): PublicProduct {
  const images = (product.images ?? [])
    .slice()
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)
    .map(serialiseImage);

  const primaryImage = images.find((i) => i.isPrimary) ?? images[0] ?? null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    status: product.status,
    stockStatus: product.stockStatus,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    minimumOrderQty: product.minimumOrderQty,
    minimumWholesaleQty: product.minimumWholesaleQty,
    wholesaleOnly: product.wholesaleOnly,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    isWholesaleDeal: product.isWholesaleDeal,
    badge: product.badge,
    isDemo: product.isDemo,
    supportedModels: product.supportedModels ?? [],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    publishedAt: product.publishedAt ? product.publishedAt.toISOString() : null,
    viewCount: product.viewCount,
    wishlistCount: product.wishlistCount,
    brand: product.brand
      ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug, logoUrl: product.brand.logoUrl }
      : null,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          icon: product.category.icon,
          imageUrl: product.category.imageUrl,
        }
      : null,
    subcategory: product.subcategory
      ? { id: product.subcategory.id, name: product.subcategory.name, slug: product.subcategory.slug }
      : null,
    images,
    primaryImage,
    price: buildPriceBlock(product, options),
    seo: {
      title: product.seoTitle,
      description: product.seoDescription,
      keywords: product.seoKeywords,
      ogImageUrl: product.ogImageUrl,
    },
  };
}

export function serialiseProducts(
  products: ProductWithRelations[],
  options: PricingOptions,
): PublicProduct[] {
  return products.map((p) => serialiseProduct(p, options));
}

/**
 * The Prisma `select` used when fetching products destined for the public
 * website. Note that `retailerPrice` / `costPrice` ARE selected, because the
 * server needs them to build the correct price block — they are stripped by
 * `buildPriceBlock`, never sent to the browser.
 */
export const publicProductSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  shortDescription: true,
  description: true,
  status: true,
  stockStatus: true,
  stockQuantity: true,
  lowStockThreshold: true,
  minimumOrderQty: true,
  minimumWholesaleQty: true,
  wholesaleOnly: true,
  isFeatured: true,
  isBestSeller: true,
  isNewArrival: true,
  isWholesaleDeal: true,
  badge: true,
  isDemo: true,
  supportedModels: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  viewCount: true,
  wishlistCount: true,
  mrp: true,
  costPrice: true,
  customerPrice: true,
  retailerPrice: true,
  showMrp: true,
  showCustomerPrice: true,
  showRetailerPrice: true,
  showDiscount: true,
  discountType: true,
  discountValue: true,
  brandId: true,
  categoryId: true,
  subcategoryId: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  ogImageUrl: true,
  searchKeywords: true,
  brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
  category: { select: { id: true, name: true, slug: true, icon: true, imageUrl: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
  images: {
    select: {
      id: true,
      url: true,
      thumbnailUrl: true,
      blurDataUrl: true,
      alt: true,
      usage: true,
      isPrimary: true,
      position: true,
    },
    orderBy: { position: 'asc' },
  },
} as const;

/** Removes wholesale/cost fields from an already-serialised product. */
export function redactForGuest<T extends { price: PublicPriceBlock }>(product: T): T {
  const { retailerPrice, costPrice, ...rest } = product.price;
  void retailerPrice;
  void costPrice;
  return { ...product, price: { ...rest, showRetailerPrice: false, tier: 'retail' } };
}
