'use client';

import { useState } from 'react';
import { MapPin, Phone, MessageCircle, Mail, Clock, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { whatsapp } from '@/lib/whatsapp';

const SUBJECTS = [
  { value: 'GENERAL', label: 'General question' },
  { value: 'PRODUCT_ENQUIRY', label: 'Product enquiry' },
  { value: 'WHOLESALE', label: 'Wholesale / bulk pricing' },
  { value: 'RETAILER_ONBOARDING', label: 'Become a retailer' },
  { value: 'ORDER_STATUS', label: 'Order status' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'OTHER', label: 'Something else' },
] as const;

const CUSTOMER_TYPES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'RETAILER', label: 'Retailer / shop owner' },
  { value: 'GUEST', label: 'Just browsing' },
] as const;

export function ContactForm({
  businessName,
  whatsappNumber,
  siteUrl,
  defaults,
}: {
  businessName: string;
  whatsappNumber: string;
  siteUrl: string;
  defaults?: { subject?: string; name?: string; email?: string };
}) {
  const [name, setName] = useState(defaults?.name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(defaults?.email ?? '');
  const [customerType, setCustomerType] = useState<string>('CUSTOMER');
  const [subject, setSubject] = useState<string>(
    SUBJECTS.some((s) => s.value === defaults?.subject) ? (defaults?.subject as string) : 'GENERAL',
  );
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Please enter your name.';
    if (phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone number.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    if (message.trim().length < 10) next.message = 'Please tell us a little more (10 characters minimum).';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          customerType,
          subject,
          message: message.trim(),
          website,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: { message?: string; fieldErrors?: Record<string, string[]> } }
        | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        if (failure?.fieldErrors) {
          setErrors(
            Object.fromEntries(Object.entries(failure.fieldErrors).map(([key, value]) => [key, value[0] ?? ''])),
          );
        }
        toast.error(failure?.message ?? 'We could not send your message. Please try WhatsApp instead.');
        return;
      }

      setDone(true);
    } catch {
      toast.error('We could not send your message. Please try WhatsApp instead.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <h2 className="mt-4 text-lg font-semibold">Message sent</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Thank you, {name.trim().split(' ')[0]}. We usually reply the same working day. Need it faster? Message us on
          WhatsApp.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="whatsapp" asChild>
            <a href={whatsapp.general({ whatsappNumber, businessName, siteUrl })} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> WhatsApp us
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDone(false);
              setMessage('');
            }}
          >
            Send another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">
            <span className="text-brand-orange-500" aria-hidden="true">
              *
            </span>{' '}
            Name
          </Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className="mt-1.5"
            placeholder="Your name"
          />
          {errors.name ? <ErrorText>{errors.name}</ErrorText> : null}
        </div>

        <div>
          <Label htmlFor="contact-phone">
            <span className="text-brand-orange-500" aria-hidden="true">
              *
            </span>{' '}
            Phone
          </Label>
          <Input
            id="contact-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            className="mt-1.5"
            placeholder="10-digit mobile"
          />
          {errors.phone ? <ErrorText>{errors.phone}</ErrorText> : null}
        </div>

        <div>
          <Label htmlFor="contact-email">Email (optional)</Label>
          <Input
            id="contact-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className="mt-1.5"
            placeholder="you@example.com"
          />
          {errors.email ? <ErrorText>{errors.email}</ErrorText> : null}
        </div>

        <div>
          <Label htmlFor="contact-subject">Reason</Label>
          <select
            id="contact-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-foreground focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25 dark:border-white/15 dark:bg-white/[0.04]"
          >
            {SUBJECTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-sm font-medium text-foreground/85">I am a</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {CUSTOMER_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCustomerType(option.value)}
              aria-pressed={customerType === option.value}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                customerType === option.value
                  ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-500/15 dark:text-brand-blue-300'
                  : 'border-slate-200 text-muted-foreground hover:border-brand-blue-300 dark:border-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="contact-message">
          <span className="text-brand-orange-500" aria-hidden="true">
            *
          </span>{' '}
          Message
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          maxLength={4000}
          aria-invalid={Boolean(errors.message)}
          className="mt-1.5"
          placeholder="Tell us what you need — model name, quantity and your city."
        />
        {errors.message ? <ErrorText>{errors.message}</ErrorText> : null}
      </div>

      {/* Honeypot */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" loading={pending} icon={<Send className="size-4" />}>
          Send message
        </Button>
        <a
          href={whatsapp.contact({ whatsappNumber, businessName, siteUrl }, subject)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#128C4A] hover:underline"
        >
          <MessageCircle className="size-4" />
          Prefer WhatsApp?
        </a>
      </div>
    </form>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{children}</p>;
}

export function ContactDetails({
  address,
  city,
  phone,
  whatsappNumber,
  email,
  businessHours,
  mapsUrl,
}: {
  address: string;
  city: string;
  phone: string;
  whatsappNumber: string;
  email: string | null;
  businessHours: Array<{ day: string; open: string; close: string; closed: boolean }>;
  mapsUrl: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-base font-semibold">Visit or call us</h2>
        <ul className="mt-4 space-y-3.5 text-sm">
          <li className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="leading-relaxed transition hover:text-brand-blue-600"
            >
              {address}
            </a>
          </li>
          <li className="flex gap-3">
            <Phone className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
            <a href={`tel:${phone}`} className="transition hover:text-brand-blue-600">
              {phone}
            </a>
          </li>
          <li className="flex gap-3">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-[#25D366]" />
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-brand-blue-600"
            >
              WhatsApp
            </a>
          </li>
          {email ? (
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
              <a href={`mailto:${email}`} className="transition hover:text-brand-blue-600">
                {email}
              </a>
            </li>
          ) : null}
          <li className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-brand-blue-600" />
            <span>
              {businessHours.length > 0 ? (
                <ul className="space-y-0.5">
                  {businessHours.map((hour) => (
                    <li key={hour.day}>
                      <span className="text-muted-foreground">{hour.day}: </span>
                      {hour.closed ? 'Closed' : `${hour.open} – ${hour.close}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">Call or WhatsApp for current timings.</span>
              )}
            </span>
          </li>
        </ul>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <iframe
          title={`Map to our shop in ${city}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(`${address}, ${city}`)}&output=embed`}
          className="h-64 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
