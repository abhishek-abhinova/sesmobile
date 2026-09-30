import Link from 'next/link';
import { MessageCircle, ArrowRight, Percent, Boxes, HandCoins } from 'lucide-react';
import { whatsapp } from '@/lib/whatsapp';

const POINTS = [
  { icon: Percent, title: 'Dealer pricing', body: 'A separate wholesale price list, visible only to approved retailers.' },
  { icon: Boxes, title: 'Bulk quantities', body: 'Per-product minimum order quantities so you can plan your stock.' },
  { icon: HandCoins, title: 'Flexible terms', body: 'Talk to us directly about payment and delivery for regular orders.' },
];

export function RetailerCta({
  businessName,
  whatsappNumber,
  siteUrl,
  city,
}: {
  businessName: string;
  whatsappNumber: string;
  siteUrl: string;
  city: string;
}) {
  return (
    <section className="container py-14 lg:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-brand-navy-900">
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-brand-blue-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="grid gap-10 p-8 sm:p-10 lg:grid-cols-2 lg:items-center lg:p-14">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue-300">
              For retailers &amp; distributors
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              Buy at dealer prices, straight from the shop in {city}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65">
              Create a free account, send us your requirement list, and we will share wholesale pricing, availability
              and delivery options for {businessName}.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/retailer/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-blue-500 px-6 text-sm font-semibold text-white transition hover:bg-brand-blue-400"
              >
                Become a retailer
                <ArrowRight className="size-4" />
              </Link>
              <a
                href={whatsapp.retailer({ whatsappNumber, businessName, siteUrl })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <MessageCircle className="size-4" />
                Ask on WhatsApp
              </a>
            </div>
          </div>

          <ul className="grid gap-3">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-blue-300">
                  <Icon className="size-5" strokeWidth={1.7} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/55">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
