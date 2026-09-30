'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2, MessageCircle, Send, Minus, Plus, PackageSearch, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { ProductImage } from '@/components/shared/product-image';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { whatsapp } from '@/lib/whatsapp';
import { formatCurrency } from '@/lib/format';

export function WishlistView({
  businessName,
  whatsappNumber,
  siteUrl,
  isAuthenticated,
}: {
  businessName: string;
  whatsappNumber: string;
  siteUrl: string;
  isAuthenticated: boolean;
}) {
  const { items, remove, clear, setQuantity, ready } = useWishlist();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const context = { businessName, whatsappNumber, siteUrl };

  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const whatsappBulkHref = whatsapp.bulk(
    items.map((item) => ({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      price: item.retailerPrice ?? item.price,
      url: `/product/${item.slug}`,
    })),
    context,
    { name: name.trim() || undefined, note: note.trim() || undefined },
  );

  function copyList() {
    const text = items
      .map((item, index) => `${index + 1}. ${item.name} (${item.sku}) × ${item.quantity}`)
      .join('\n');
    void navigator.clipboard?.writeText(`${businessName} enquiry\n\n${text}`);
    toast.success('Product list copied');
  }

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: { name?: string; phone?: string } = {};
    if (name.trim().length < 2) next.name = 'Please enter your name.';
    if (phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone number.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          type: 'BULK',
          message:
            note.trim() ||
            `I would like wholesale pricing for ${items.length} product(s) (${totalUnits} units total).`,
          source: 'wishlist',
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: { message?: string } } | null;

      if (!res.ok || !json?.ok) {
        toast.error(json && !json.ok ? (json.error?.message ?? undefined) : undefined);
        return;
      }

      toast.success('Bulk enquiry sent', {
        description: 'We will reply with wholesale pricing shortly.',
      });
      setQuoteOpen(false);
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        description="Tap the heart on any product to save it here. Your wishlist works even without an account, and syncs automatically when you sign in."
        action={{ href: '/products', label: 'Browse products' }}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'product' : 'products'} · {totalUnits} units
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={copyList} icon={<Copy className="size-3.5" />}>
              Copy list
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clear();
                toast('Wishlist cleared');
              }}
              icon={<Trash2 className="size-3.5" />}
            >
              Clear
            </Button>
          </div>
        </div>

        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <Link href={`/product/${item.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-white/5">
                <ProductImage src={item.imageUrl} alt={item.name} className="size-full p-1.5" sizes="80px" />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/product/${item.slug}`}
                  className="line-clamp-2 text-sm font-semibold transition hover:text-brand-blue-600"
                >
                  {item.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">SKU: {item.sku}</p>
                <p className="mt-1 text-sm font-bold text-brand-navy-900 dark:text-white">
                  {formatCurrency(item.retailerPrice ?? item.price)}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-8 items-center rounded-lg border border-slate-200 dark:border-white/15">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      className="grid h-full w-7 place-items-center text-muted-foreground transition hover:text-brand-blue-600"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <input
                      value={item.quantity}
                      onChange={(event) =>
                        setQuantity(item.productId, Number.parseInt(event.target.value || '1', 10) || 1)
                      }
                      inputMode="numeric"
                      aria-label={`Quantity for ${item.name}`}
                      className="h-full w-9 border-0 bg-transparent text-center text-xs font-semibold focus-visible:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      className="grid h-full w-7 place-items-center text-muted-foreground transition hover:text-brand-blue-600"
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    className="text-xs font-medium text-muted-foreground transition hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {!item.inStock ? (
                <p className="self-start rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-500 dark:bg-white/10">
                  Out of stock
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="text-base font-semibold">Get wholesale pricing</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Send this list to us and we will reply with availability and dealer prices.
          </p>

          <div className="mt-4 space-y-2.5">
            <Button variant="whatsapp" block asChild>
              <a href={whatsappBulkHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> WhatsApp this list
              </a>
            </Button>
            <Button block onClick={() => setQuoteOpen(true)} icon={<Send className="size-4" />}>
              Request a quote
            </Button>
            {!isAuthenticated ? (
              <p className="pt-1 text-center text-xs text-muted-foreground">
                <Link href="/login?next=/wishlist" className="font-semibold text-brand-blue-600 hover:underline">
                  Sign in
                </Link>{' '}
                to keep your wishlist on all devices.
              </p>
            ) : null}
          </div>

          <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs text-muted-foreground dark:border-white/10">
            <li className="flex gap-2">
              <PackageSearch className="mt-0.5 size-3.5 shrink-0" />
              Quantities are editable — set your real requirement before sending.
            </li>
            <li className="flex gap-2">
              <Share2 className="mt-0.5 size-3.5 shrink-0" />
              Use &ldquo;Copy list&rdquo; to paste it into WhatsApp or an email.
            </li>
          </ul>
        </div>
      </aside>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent>
          <form onSubmit={submitQuote} noValidate>
            <DialogHeader>
              <DialogTitle>Request wholesale pricing</DialogTitle>
              <DialogDescription>
                {items.length} products · {totalUnits} units. We will reply on WhatsApp or by phone.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/[0.04]">
              {items.map((item) => (
                <p key={item.productId} className="flex justify-between gap-3">
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 font-semibold">× {item.quantity}</span>
                </p>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="bulk-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="bulk-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  className="mt-1.5"
                  placeholder="Your name"
                />
                {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
              </div>
              <div>
                <label htmlFor="bulk-phone" className="text-sm font-medium">
                  Phone
                </label>
                <Input
                  id="bulk-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  inputMode="tel"
                  aria-invalid={Boolean(errors.phone)}
                  className="mt-1.5"
                  placeholder="10-digit mobile"
                />
                {errors.phone ? <p className="mt-1 text-xs text-red-600">{errors.phone}</p> : null}
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="bulk-note" className="text-sm font-medium">
                Message (optional)
              </label>
              <Textarea
                id="bulk-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="mt-1.5"
                placeholder="Delivery city, preferred brand, or anything else we should know."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuoteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} icon={<Send className="size-4" />}>
                Send request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
