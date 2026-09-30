'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Phone,
  Heart,
  Check,
  Package,
  Truck,
  ShieldCheck,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Info,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductImage } from '@/components/shared/product-image';
import { PriceBlock } from '@/components/product/price-block';
import { EnquiryDialog } from '@/components/forms/enquiry-dialog';
import { ReviewForm } from '@/components/forms/review-form';
import { StarRating } from '@/components/shared/star-rating';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { whatsapp, buildCallUrl } from '@/lib/whatsapp';
import { formatCurrency, formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PublicProduct, ReviewSummary } from '@/lib/types';

export function ProductDetailView({
  product,
  reviews,
  related,
  reviewsEnabled,
  businessName,
  whatsappNumber,
  phone,
  siteUrl,
}: {
  product: PublicProduct;
  reviews: ReviewSummary[];
  related: PublicProduct[];
  reviewsEnabled: boolean;
  businessName: string;
  whatsappNumber: string;
  phone: string;
  siteUrl: string;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(product.minimumOrderQty || 1);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(product.id);

  const images = useMemo(
    () => (product.images.length > 0 ? product.images : product.primaryImage ? [product.primaryImage] : []),
    [product.images, product.primaryImage],
  );

  const outOfStock = product.stockStatus === 'OUT_OF_STOCK';
  const context = { businessName, whatsappNumber, siteUrl };
  const tierLabel = product.price.tier === 'wholesale' ? 'Wholesale price' : 'Price';

  const shareUrl = `${siteUrl.replace(/\/$/, '')}/product/${product.slug}`;

  function copyLink() {
    void navigator.clipboard?.writeText(shareUrl);
    toast.success('Link copied');
  }

  return (
    <div className="container py-6 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* ---------------- Gallery ---------------- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <ProductImage
              src={images[activeImage]?.url}
              alt={images[activeImage]?.alt ?? product.name}
              className="aspect-square w-full"
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
            />

            {product.badge ? (
              <Badge className="absolute left-6 top-6 bg-brand-orange-500">{product.badge}</Badge>
            ) : null}

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-soft transition hover:bg-white"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-soft transition hover:bg-white"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={cn(
                    'size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition',
                    index === activeImage ? 'border-brand-blue-500' : 'border-transparent hover:border-slate-300',
                  )}
                >
                  <ProductImage src={image.url} alt="" className="size-full" sizes="64px" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* ---------------- Buy box ---------------- */}
        <div>
          <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-muted-foreground">
            <Link href="/products" className="hover:text-brand-blue-600">
              Products
            </Link>
            {product.category ? (
              <>
                {' / '}
                <Link href={`/category/${product.category.slug}`} className="hover:text-brand-blue-600">
                  {product.category.name}
                </Link>
              </>
            ) : null}
            {product.subcategory ? (
              <>
                {' / '}
                <Link href={`/category/${product.subcategory.slug}`} className="hover:text-brand-blue-600">
                  {product.subcategory.name}
                </Link>
              </>
            ) : null}
          </nav>

          {product.brand ? (
            <Link
              href={`/products?brand=${encodeURIComponent(product.brand.slug)}`}
              className="text-xs font-semibold uppercase tracking-wider text-brand-blue-600 dark:text-brand-blue-400"
            >
              {product.brand.name}
            </Link>
          ) : null}

          <h1 className="mt-1.5 text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            SKU: <span className="font-medium text-foreground">{product.sku}</span>
            {product.supportedModels.length > 0 ? (
              <>
                {' · '}
                Fits: {product.supportedModels.join(', ')}
              </>
            ) : null}
          </p>

          {product.shortDescription ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.shortDescription}</p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tierLabel}</span>
              {product.price.showRetailerPrice ? (
                <Badge className="bg-brand-navy-900 dark:bg-brand-blue-600">Wholesale available</Badge>
              ) : null}
            </div>

            <PriceBlock price={product.price} size="lg" className="mt-2" />

            {product.price.wholesaleAvailable && product.price.minimumWholesaleQty > 1 ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5" /> Minimum wholesale quantity: {product.price.minimumWholesaleQty}
              </p>
            ) : null}

            <div className="mt-4 flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 font-semibold',
                  outOfStock ? 'text-slate-500' : product.stockStatus === 'LOW_STOCK' ? 'text-amber-600' : 'text-emerald-600',
                )}
              >
                {outOfStock ? null : <Check className="size-4" />}
                {product.stockStatus === 'IN_STOCK'
                  ? product.stockQuantity > 0
                    ? `In stock (${product.stockQuantity} available)`
                    : 'In stock'
                  : product.stockStatus === 'LOW_STOCK'
                    ? `Only ${product.stockQuantity} left`
                    : product.stockStatus === 'COMING_SOON'
                      ? 'Coming soon'
                      : 'Out of stock'}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white dark:border-white/15 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="grid h-full w-10 place-items-center text-lg text-muted-foreground transition hover:text-brand-blue-600"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value || '1', 10) || 1))}
                  inputMode="numeric"
                  aria-label="Quantity"
                  className="h-full w-12 border-0 bg-transparent text-center text-sm font-semibold focus-visible:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="grid h-full w-10 place-items-center text-lg text-muted-foreground transition hover:text-brand-blue-600"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <Button variant="whatsapp" size="lg" asChild>
                <a
                  href={whatsapp.product(
                    {
                      name: product.name,
                      sku: product.sku,
                      slug: product.slug,
                      price: product.price.effectivePrice,
                      priceLabel: `${tierLabel} seen`,
                      tier: product.price.tier,
                      quantity,
                      url: `/product/${product.slug}`,
                    },
                    context,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" /> WhatsApp enquiry
                </a>
              </Button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="default" size="lg" onClick={() => setEnquiryOpen(true)}>
                Request a quote
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href={buildCallUrl(phone)}>
                  <Phone className="size-4" /> Call the shop
                </a>
              </Button>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                variant={saved ? 'accent' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() =>
                  toggle({
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    sku: product.sku,
                    imageUrl: product.primaryImage?.thumbnailUrl ?? product.primaryImage?.url ?? null,
                    price: product.price.effectivePrice,
                    ...(product.price.retailerPrice !== undefined ? { retailerPrice: product.price.retailerPrice } : {}),
                    inStock: !outOfStock,
                  })
                }
              >
                <Heart className={cn('size-4', saved && 'fill-current')} />
                {saved ? 'Saved to wishlist' : 'Save to wishlist'}
              </Button>
              <Button variant="ghost" size="sm" onClick={copyLink} aria-label="Copy product link">
                <Copy className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${product.name} — ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on WhatsApp"
                >
                  <Share2 className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          <ul className="mt-5 grid gap-2.5 text-[13px] text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-brand-blue-600" /> Genuine quality parts
            </li>
            <li className="flex items-center gap-2">
              <Package className="size-4 text-brand-blue-600" /> Bulk / wholesale quantities
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-brand-blue-600" /> Local pickup in {product.category ? 'Bangarpet' : 'Bangarpet'}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brand-blue-600" /> GST billing available
            </li>
          </ul>
        </div>
      </div>

      {/* ---------------- Tabs ---------------- */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="shipping">Shipping &amp; returns</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="pt-6">
            {product.description ? (
              <div className="prose-ses max-w-3xl" dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No detailed description has been published for this product yet. Message us on WhatsApp and we will share
                full details, photos and pricing.
              </p>
            )}
          </TabsContent>

          <TabsContent value="specs" className="pt-6">
            <dl className="max-w-2xl divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm dark:divide-white/10 dark:border-white/10">
              <Row label="SKU" value={product.sku} />
              <Row label="Brand" value={product.brand?.name ?? '—'} />
              <Row label="Category" value={product.category?.name ?? '—'} />
              {product.subcategory ? <Row label="Subcategory" value={product.subcategory.name} /> : null}
              <Row label="Supported models" value={product.supportedModels.length ? product.supportedModels.join(', ') : '—'} />
              <Row label="Minimum order quantity" value={String(product.minimumOrderQty)} />
              {product.price.retailerPrice != null ? (
                <Row label="Minimum wholesale quantity" value={String(product.minimumWholesaleQty)} />
              ) : null}
              <Row label="Availability" value={product.stockStatus.replace(/_/g, ' ').toLowerCase()} />
            </dl>
          </TabsContent>

          <TabsContent value="reviews" className="pt-6">
            {reviewsEnabled ? (
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No reviews yet. If you have used this product, tell other customers about it.
                    </p>
                  ) : (
                    <ul className="space-y-5">
                      {reviews.map((review) => (
                        <li key={review.id} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                          <div className="flex flex-wrap items-center gap-2">
                            <StarRating rating={review.rating} size="sm" />
                            <span className="text-sm font-semibold">{review.authorName}</span>
                            {review.isVerified ? <Badge variant="success">Verified buyer</Badge> : null}
                            <span className="ml-auto text-xs text-muted-foreground">{timeAgo(review.createdAt)}</span>
                          </div>
                          {review.title ? <p className="mt-2 text-sm font-semibold">{review.title}</p> : null}
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
                          {review.adminReply ? (
                            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-white/5">
                              <span className="font-semibold">S.E.S Mobile World:</span> {review.adminReply}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                    <h3 className="text-sm font-semibold">Write a review</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reviews are checked by our team before they appear.
                    </p>
                    <div className="mt-4">
                      <ReviewForm productId={product.id} productName={product.name} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Reviews are currently turned off.</p>
            )}
          </TabsContent>

          <TabsContent value="shipping" className="pt-6">
            <div className="prose-ses max-w-3xl text-sm">
              <p>
                This is an enquiry-only website — ordering is currently confirmed on WhatsApp or by phone. Share the
                product name and quantity you need and we will confirm availability, pricing and delivery.
              </p>
              <ul>
                <li>Local pickup is available from our shop in {product.category ? 'Bangarpet' : 'Bangarpet'}.</li>
                <li>Delivery timelines and shipping charges are confirmed on WhatsApp based on quantity and distance.</li>
                <li>GST invoices are provided for all business orders.</li>
                <li>Warranty and replacement terms are shared in writing with your quotation.</li>
              </ul>
              <p className="text-muted-foreground">Last updated: {formatDateTime(product.updatedAt)}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {related.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-5 text-xl font-bold">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/product/${item.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lift dark:border-white/10 dark:bg-white/[0.03]"
              >
                <ProductImage
                  src={item.primaryImage?.url}
                  alt={item.name}
                  className="aspect-square p-3"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
                <div className="p-3">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug group-hover:text-brand-blue-600">{item.name}</p>
                  <p className="mt-1 text-sm font-bold text-brand-navy-900 dark:text-white">
                    {item.price.effectivePrice != null ? formatCurrency(item.price.effectivePrice) : 'On request'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <EnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          slug: product.slug,
          price: product.price.effectivePrice,
          priceTier: product.price.tier === 'wholesale' ? 'wholesale' : 'retail',
          minimumQuantity: product.minimumOrderQty,
        }}
        quantity={quantity}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-48 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium">{value}</dd>
    </div>
  );
}
