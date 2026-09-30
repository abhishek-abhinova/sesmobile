/**
 * Isomorphic public type surface.
 *
 * `lib/pricing.ts` is `server-only` (it is the security boundary that decides
 * whether `retailerPrice` / `costPrice` may leave the server). Client components
 * still need the *shape* of a public product, so this module re-exports those
 * types with `export type`, which is fully erased at build time — no server code
 * is ever pulled into the browser bundle.
 */
export type {
  PublicProduct,
  PublicProductImage,
  PublicPriceBlock,
  PriceTier,
} from '@/lib/pricing';

export interface ReviewSummary {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerified: boolean;
  adminReply: string | null;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewSummaryBlock {
  average: number | null;
  count: number;
  distribution: { rating: number; count: number }[];
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  position: number;
  productCount?: number;
  children?: PublicCategory[];
}

export interface PublicBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount?: number;
}

export interface NavCategory {
  name: string;
  slug: string;
  children: { name: string; slug: string }[];
}

export interface ProductRef {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  priceTier?: 'retail' | 'wholesale';
  minimumQuantity?: number;
}

/**
 * Next.js 15 delivers `searchParams` and `params` as promises, so every page
 * that reads either must await it.
 */
export type RouteSearchParams = Record<string, string | string[] | undefined>;

export interface PageProps<T extends RouteSearchParams = RouteSearchParams> {
  searchParams: Promise<T>;
  params: Promise<RouteSearchParams>;
}
