import Link from 'next/link';
import { MessageCircle, Phone, Truck, BadgeCheck, Store, PackageSearch } from 'lucide-react';
import { InlineSearch } from '@/components/search/inline-search';
import { whatsapp, buildCallUrl } from '@/lib/whatsapp';

export function HomeHero({
  businessName,
  city,
  tagline,
  whatsappNumber,
  phone,
  heroBanner,
}: {
  businessName: string;
  city: string;
  tagline: string;
  whatsappNumber: string;
  phone: string;
  heroBanner?: {
    title: string | null;
    subtitle: string | null;
    eyebrow: string | null;
    imageUrl: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  } | null;
}) {
  const title = heroBanner?.title ?? 'Mobile spare parts, wholesale and retail';
  const subtitle =
    heroBanner?.subtitle ??
    `Genuine display, battery, charging and back-cover assemblies for every popular brand — available at shop prices in ${city}.`;
  const eyebrow = heroBanner?.eyebrow ?? 'Trusted supplier since day one';

  return (
    <section className="relative isolate overflow-hidden bg-brand-gradient">
      {/* Decorative grid + glow, purely presentational. */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-slate bg-[size:48px_48px] opacity-[0.06]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[36rem] rounded-full bg-brand-blue-500/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-[28rem] rounded-full bg-brand-orange-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-blue-200 backdrop-blur">
            <BadgeCheck className="size-3.5" />
            {eyebrow}
          </p>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            {title}
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-base">{subtitle}</p>

          <div className="mt-7 max-w-xl">
            <InlineSearch />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={whatsapp.general({ whatsappNumber, businessName })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(37,211,102,0.65)] transition hover:bg-[#1eb959]"
            >
              <MessageCircle className="size-4" />
              Chat on WhatsApp
            </a>
            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <PackageSearch className="size-4" />
              Browse catalogue
            </Link>
            <a
              href={buildCallUrl(phone)}
              className="inline-flex h-12 items-center justify-center gap-2 px-1 text-sm font-semibold text-white/80 transition hover:text-white"
            >
              <Phone className="size-4" />
              Call the shop
            </a>
          </div>

          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-white/50">Retail &amp; wholesale</dt>
              <dd className="mt-1 text-sm font-semibold text-white">Same-day stock</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-white/50">Dealer support</dt>
              <dd className="mt-1 text-sm font-semibold text-white">Bulk enquiries</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-white/50">Billing</dt>
              <dd className="mt-1 text-sm font-semibold text-white">GST invoices</dd>
            </div>
          </dl>
        </div>

        {heroBanner?.imageUrl ? (
          <div className="relative hidden lg:block">
            <div className="overflow-hidden rounded-3xl border border-white/15 shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroBanner.imageUrl}
                alt={heroBanner.title ?? `${businessName} products`}
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-brand-navy-900/90 px-4 py-3 backdrop-blur">
              <Store className="size-5 text-brand-blue-300" />
              <div className="text-xs">
                <p className="font-semibold text-white">Visit the shop</p>
                <p className="text-white/60">{city}</p>
              </div>
            </div>
            <div className="absolute -right-4 top-8 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-brand-navy-900 shadow-lift">
              <Truck className="size-4 text-brand-orange-500" />
              Local delivery
            </div>
          </div>
        ) : (
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Displays', note: 'OLED & LCD assemblies', icon: 'display' },
                { title: 'Batteries', note: 'Original capacity', icon: 'battery' },
                { title: 'Chargers', note: 'Fast-charge modules', icon: 'charger' },
                { title: 'Back covers', note: 'Colour matched', icon: 'package' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur transition hover:bg-white/[0.1]"
                >
                  <p className="font-display text-base font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/55">{item.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-xs text-white/45">{tagline}</p>
          </div>
        )}
      </div>
    </section>
  );
}
