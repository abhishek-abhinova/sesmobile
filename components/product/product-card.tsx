'use client';

import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/shared/product-image';
import { PriceBlock } from '@/components/product/price-block';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { useTilt } from '@/hooks/use-tilt';
import { cn } from '@/lib/utils';
import { whatsapp } from '@/lib/whatsapp';
import type { PublicProduct } from '@/lib/pricing';

const OUT_OF_STOCK = { label: 'Out of stock', className: 'bg-slate-600' } as const;
const STOCK_BADGE: Record<string, { label: string; className: string }> = {
  IN_STOCK: { label: 'In stock', className: 'bg-emerald-600' },
  LOW_STOCK: { label: 'Low stock', className: 'bg-amber-500' },
  OUT_OF_STOCK: OUT_OF_STOCK,
  COMING_SOON: { label: 'Coming soon', className: 'bg-brand-blue-600' },
};

export function ProductCard({
  product,
  currencySymbol = '₹',
  className,
  priority = false,
}: {
  product: PublicProduct;
  currencySymbol?: string;
  className?: string;
  priority?: boolean;
}) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(product.id);
  const tiltRef = useTilt<HTMLElement>({ max: 5, disabled: product.primaryImage == null });

  const stock = STOCK_BADGE[product.stockStatus] ?? OUT_OF_STOCK;
  const image = product.primaryImage;

  return (
    <article
      ref={tiltRef}
      className={cn(
        'tilt-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow duration-300 hover:shadow-lift dark:border-white/10 dark:bg-white/[0.03]',
        className,
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-white/[0.04] dark:to-transparent"
      >
        <ProductImage
          src={image?.url}
          alt={image?.alt ?? product.name}
          className="size-full"
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.badge ? (
            <Badge className="bg-brand-orange-500">{product.badge}</Badge>
          ) : product.isNewArrival ? (
            <Badge className="bg-brand-blue-600">New</Badge>
          ) : product.isBestSeller ? (
            <Badge className="bg-brand-navy-900 dark:bg-brand-blue-600">Best seller</Badge>
          ) : null}
          {product.isDemo ? (
            <Badge variant="outline" className="border-slate-300 bg-white/90 text-[10px] text-slate-600 dark:border-white/20 dark:bg-black/40 dark:text-slate-200">
              Sample
            </Badge>
          ) : null}
        </div>
      </Link>

      <button
        type="button"
        onClick={() =>
          toggle({
            productId: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            imageUrl: image?.thumbnailUrl ?? image?.url ?? null,
            price: product.price.effectivePrice,
            ...(product.price.retailerPrice !== undefined ? { retailerPrice: product.price.retailerPrice } : {}),
            inStock: product.stockStatus === 'IN_STOCK' || product.stockStatus === 'LOW_STOCK',
          })
        }
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        aria-pressed={saved}
        className={cn(
          'absolute right-2.5 top-2.5 z-10 grid size-9 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-soft backdrop-blur transition hover:text-brand-orange-500 dark:border-white/15 dark:bg-brand-navy-900/90 dark:text-slate-300',
          saved && 'border-brand-orange-300 text-brand-orange-500',
        )}
      >
        <Heart className={cn('size-4', saved && 'fill-current')} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        {product.brand ? (
          <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wider text-brand-blue-600 dark:text-brand-blue-400">
            {product.brand.name}
          </p>
        ) : null}

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          <Link href={`/product/${product.slug}`} className="transition hover:text-brand-blue-600">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1 text-[11px] text-muted-foreground">SKU: {product.sku}</p>

        {product.supportedModels.length > 0 ? (
          <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">
            Fits: {product.supportedModels.slice(0, 3).join(', ')}
            {product.supportedModels.length > 3 ? ` +${product.supportedModels.length - 3}` : ''}
          </p>
        ) : null}

        <div className="mt-3">
          <PriceBlock price={product.price} currencySymbol={currencySymbol} size="sm" showTier={false} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
          <Badge className={cn('text-[10px]', stock.className)}>{stock.label}</Badge>
          <a
            href={whatsapp.product(
              {
                name: product.name,
                sku: product.sku,
                slug: product.slug,
                price: product.price.effectivePrice,
                priceLabel: product.price.tier === 'wholesale' ? 'Wholesale price seen' : 'Price seen',
                tier: product.price.tier,
                url: `/product/${product.slug}`,
              },
              { businessName: 'S.E.S Mobile World' },
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Enquire about ${product.name} on WhatsApp`}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#128C4A] transition hover:underline"
          >
            <MessageCircle className="size-4" /> Enquire
          </a>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  currencySymbol,
  className,
  columns = 4,
}: {
  products: PublicProduct[];
  currencySymbol?: string;
  className?: string;
  columns?: 3 | 4 | 5;
}) {
  const gridClass =
    columns === 5
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
      : columns === 3
        ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={cn('grid gap-4 sm:gap-5', gridClass, className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} currencySymbol={currencySymbol} priority={index < 4} />
      ))}
    </div>
  );
}
