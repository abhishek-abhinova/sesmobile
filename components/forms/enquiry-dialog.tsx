'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { whatsapp } from '@/lib/whatsapp';
import type { ProductRef } from '@/lib/types';

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
}

export type EnquiryType = 'PRODUCT' | 'GENERAL' | 'BULK' | 'RETAILER' | 'WHOLESALE' | 'WISHLIST' | 'CONTACT';

export function EnquiryDialog({
  open,
  onOpenChange,
  product,
  quantity: initialQuantity = 1,
  type = 'PRODUCT',
  subject,
  className,
  trigger,
  businessName,
  whatsappNumber,
  siteUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductRef | null;
  quantity?: number;
  type?: EnquiryType;
  subject?: string;
  className?: string;
  trigger?: React.ReactNode;
  businessName?: string;
  whatsappNumber?: string;
  siteUrl?: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const context = { businessName, whatsappNumber, siteUrl };
  const minQty = product?.minimumQuantity ?? 1;

  function validate(): boolean {
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = 'Please enter your name.';
    if (phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone number.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    if (message.trim().length < 3) next.message = 'Please add a short message.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setPending(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          message: message.trim(),
          type,
          ...(product ? { productId: product.id, productName: product.name, sku: product.sku } : {}),
          ...(product?.price != null ? { priceShown: product.price, priceTier: product.priceTier ?? 'retail' } : {}),
          quantity,
          subject,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          source: 'website',
          website,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; data?: { message?: string } }
        | { ok: false; error?: { message?: string; fieldErrors?: Record<string, string[]> } }
        | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        if (failure?.fieldErrors) {
          setErrors({
            name: failure.fieldErrors.name?.[0],
            phone: failure.fieldErrors.phone?.[0],
            email: failure.fieldErrors.email?.[0],
            message: failure.fieldErrors.message?.[0],
          });
        }
        toast.error(failure?.message ?? 'We could not send your enquiry. Please try WhatsApp instead.');
        return;
      }

      setDone(true);
      setMessage('');
      router.refresh();
    } catch {
      toast.error('We could not send your enquiry. Please try WhatsApp instead.');
    } finally {
      setPending(false);
    }
  }

  const whatsappHref = whatsapp.product(
    {
      name: product?.name ?? subject ?? 'your enquiry',
      sku: product?.sku ?? null,
      price: product?.price ?? null,
      priceLabel: product?.price != null ? 'Price I saw' : undefined,
      tier: product?.priceTier ?? 'retail',
      quantity: product ? quantity : undefined,
      url: product?.slug ? `/product/${product.slug}` : null,
    },
    context,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setDone(false);
          setErrors({});
        }
      }}
    >
      {trigger}
      <DialogContent size="lg" className={className}>
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h2 className="mt-4 text-lg font-semibold">Enquiry received</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Thank you, {name.trim().split(' ')[0]}. Our team will get back to you shortly. For an instant reply,
              message us on WhatsApp.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="whatsapp" asChild>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> Continue on WhatsApp
                </a>
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>{product ? `Enquire about ${product.name}` : (subject ?? 'Send an enquiry')}</DialogTitle>
              <DialogDescription>
                Share your requirement and we will respond with availability and pricing. No payment is taken online.
              </DialogDescription>
            </DialogHeader>

            {product ? (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-white/[0.04]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  {product.sku ? <p className="text-xs text-muted-foreground">SKU: {product.sku}</p> : null}
                </div>
                {product.price != null ? (
                  <p className="text-sm font-bold text-brand-navy-900 dark:text-white">
                    {`₹${product.price.toLocaleString('en-IN')}`}
                  </p>
                ) : null}
              </div>
            ) : null}

            {product ? (
              <div className="mb-4">
                <Label htmlFor="enquiry-qty">
                  Quantity{minQty > 1 ? ` (minimum ${minQty})` : ''}
                </Label>
                <div className="mt-1.5 flex h-11 w-36 items-center rounded-lg border border-slate-300 dark:border-white/15">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
                    className="grid h-full w-10 place-items-center text-lg text-muted-foreground transition hover:text-brand-blue-600"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    id="enquiry-qty"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(minQty, Number.parseInt(e.target.value || '1', 10) || 1))}
                    inputMode="numeric"
                    className="h-full w-14 border-0 bg-transparent text-center text-sm font-semibold focus-visible:ring-0"
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
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="enquiry-name">
                  <RequiredMark /> Your name
                </Label>
                <Input
                  id="enquiry-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  placeholder="e.g. Ramesh Kumar"
                  className="mt-1.5"
                />
                {errors.name ? <FieldError>{errors.name}</FieldError> : null}
              </div>

              <div>
                <Label htmlFor="enquiry-phone">
                  <RequiredMark /> Phone / WhatsApp
                </Label>
                <Input
                  id="enquiry-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  placeholder="10-digit mobile number"
                  className="mt-1.5"
                />
                {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="enquiry-email">Email (optional)</Label>
              <Input
                id="enquiry-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                placeholder="you@example.com"
                className="mt-1.5"
              />
              {errors.email ? <FieldError>{errors.email}</FieldError> : null}
            </div>

            <div className="mt-4">
              <Label htmlFor="enquiry-message">
                <RequiredMark /> Message
              </Label>
              <Textarea
                id="enquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={Boolean(errors.message)}
                placeholder="Tell us the quantity you need, your city and your preferred delivery time."
                className="mt-1.5"
              />
              {errors.message ? <FieldError>{errors.message}</FieldError> : null}
            </div>

            {/* Honeypot — hidden from humans, catches naive bots. */}
            <div className="absolute left-[-9999px]" aria-hidden="true">
              <label htmlFor="enquiry-website">Website</label>
              <input
                id="enquiry-website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="ghost" size="sm" asChild>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> WhatsApp instead
                </a>
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={pending} icon={<Send className="size-4" />}>
                  Send enquiry
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RequiredMark() {
  return (
    <span className="text-brand-orange-500" aria-hidden="true">
      *
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{children}</p>;
}
