import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock, MessageCircle, Facebook, Instagram, Youtube, Linkedin, Send, ExternalLink } from 'lucide-react';
import { whatsapp } from '@/lib/whatsapp';
import type { ContactInfo } from '@/components/layout/types';

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

function Twitter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const ICONS: Record<string, IconType> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  telegram: Send,
  x: Twitter,
  whatsapp: MessageCircle,
};

export function SiteFooter({
  settings,
  pages,
}: {
  settings: ContactInfo & {
    logoUrl?: string | null;
    tagline?: string;
    email?: string | null;
    footerAbout?: string | null;
    footerCopyright?: string | null;
    socialLinks?: Array<{ platform: string; label: string; url: string; icon: string | null }>;
    businessHours?: Array<{ day: string; open: string; close: string; closed: boolean }>;
    googleMapsUrl?: string;
  };
  pages: Array<{ id: string; title: string; slug: string }>;
}) {
  const about =
    settings.footerAbout ??
    `${settings.businessName} supplies mobile spare parts, accessories, repairing tools and electronics to customers and retailers across ${settings.city}, ${settings.state} and nearby towns.`;

  return (
    <footer className="surface-dark-soft mt-16 text-white/80 no-print">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo-256.webp"
              alt={settings.businessName}
              width={40}
              height={40}
              className="size-10 rounded-xl bg-white/5 object-contain"
            />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-extrabold tracking-tight text-white">S.E.S Mobile</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-300">World</span>
            </span>
          </div>

          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">{about}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {(settings.socialLinks ?? []).map((link) => {
              const Icon = ICONS[link.platform] ?? ExternalLink;
              return (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="grid size-9 place-items-center rounded-lg bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white [&>svg]:size-4"
                >
                  <Icon />
                </a>
              );
            })}
            <a
              href={whatsapp.general({ whatsappNumber: settings.whatsappNumber, businessName: settings.businessName })}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="grid size-9 place-items-center rounded-lg bg-[#25D366]/15 text-[#25D366] transition hover:bg-[#25D366]/25"
            >
              <MessageCircle className="size-4" />
            </a>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white">Shop</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: '/products', label: 'All products' },
              { href: '/products?sort=newest', label: 'New arrivals' },
              { href: '/products?featured=true', label: 'Featured' },
              { href: '/products?bestSeller=true', label: 'Best sellers' },
              { href: '/categories', label: 'All categories' },
              { href: '/retailer', label: 'Wholesale / retailer pricing' },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white">Company</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: '/about', label: 'About us' },
              { href: '/contact', label: 'Contact' },
              { href: '/faq', label: 'FAQ' },
              { href: '/retailer/register', label: 'Become a retailer' },
              { href: '/wishlist', label: 'My wishlist' },
              { href: '/login', label: 'Sign in' },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
            {pages.map((page) => (
              <li key={page.id}>
                <Link href={`/p/${page.slug}`} className="transition hover:text-white">
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-4">
          <h3 className="text-sm font-semibold text-white">Visit or call us</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-blue-300" />
              <a
                href={settings.googleMapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="leading-relaxed transition hover:text-white"
              >
                {settings.address}
              </a>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-blue-300" />
              <a href={`tel:${settings.phone}`} className="transition hover:text-white">
                {settings.phone}
              </a>
            </li>
            {settings.email ? (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-blue-300" />
                <a href={`mailto:${settings.email}`} className="transition hover:text-white">
                  {settings.email}
                </a>
              </li>
            ) : null}
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-blue-300" />
              <span>
                GSTIN <span className="text-white">{settings.gstin}</span>
                {(settings.businessHours ?? []).length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 text-white/60">
                    {(settings.businessHours ?? []).map((hour) => (
                      <li key={hour.day}>
                        {hour.day}: {hour.closed ? 'Closed' : `${hour.open} – ${hour.close}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="mt-1 block text-white/60">Call or WhatsApp for current timings.</span>
                )}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/55 sm:flex-row">
          <p>
            {settings.footerCopyright ??
              `© ${new Date().getFullYear()} ${settings.businessName}. All rights reserved.`}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/shipping" className="hover:text-white">
              Shipping
            </Link>
            <Link href="/return-policy" className="hover:text-white">
              Returns
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
