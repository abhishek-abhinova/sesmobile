import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BadgePercent, Boxes, FileText, MessageCircle, ShieldCheck, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { whatsapp } from '@/lib/whatsapp';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/shared/section-heading';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'Wholesale mobile spares & accessories',
    description: `Dealer and wholesale supply of mobile spare parts, accessories and electronics from ${settings.businessName}, ${settings.city}. Apply for dealer pricing.`,
    path: '/retailer',
    brand: toSeoBrand(settings),
  });
}

const BENEFITS: Array<{ icon: LucideIcon; title: string; body: (city: string) => string }> = [
  {
    icon: BadgePercent,
    title: 'Dealer pricing on the catalogue',
    body: () => 'Once approved, wholesale rates replace retail pricing across every product page and in the dealer list.',
  },
  {
    icon: Boxes,
    title: 'Minimum order quantities shown upfront',
    body: () => 'Each product lists its MOQ, so you can build a basket that is worth the trip or the freight.',
  },
  {
    icon: FileText,
    title: 'GST invoicing for your business',
    body: () => 'Share your GSTIN during the application and we invoice your purchases against it.',
  },
  {
    icon: MessageCircle,
    title: 'Order over WhatsApp',
    body: () => 'Send your requirement as a list or use the enquiry form — we reply with availability and totals.',
  },
  {
    icon: Truck,
    title: 'Pickup from our store',
    body: (city) => `Collect in person at our store in ${city}, or tell us how you want the goods handed over.`,
  },
  {
    icon: ShieldCheck,
    title: 'One account, kept in sync',
    body: () => 'Your wishlist, enquiries and contact details stay saved so reordering takes seconds.',
  },
];

const STEPS = [
  {
    title: 'Apply online',
    body: 'Fill the application with your shop details, GSTIN (optional) and the categories you deal in.',
  },
  {
    title: 'We verify',
    body: 'We confirm your details, then activate your dealer account.',
  },
  {
    title: 'Browse & order',
    body: 'Sign in to see wholesale pricing, build your list and send the order.',
  },
];

export default async function RetailerLandingPage() {
  const settings = await getSettings();
  if (!settings.wholesaleLandingEnabled) notFound();

  const whatsappHref = whatsapp.retailer(
    { whatsappNumber: settings.whatsappNumber, siteUrl: settings.siteUrl, businessName: settings.businessName },
    settings.businessName,
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-900 dark:border-white/10">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(37,99,235,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(249,115,22,0.30), transparent 45%)',
          }}
          aria-hidden="true"
        />
        <div className="container relative py-14 lg:py-20">
          <Breadcrumbs items={[{ name: 'Wholesale' }]} className="mb-8" />
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-orange-300">
              <BadgePercent className="size-3.5" />
              Dealer programme
            </span>
            <h1 className="mt-5 font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              Wholesale mobile spares, accessories &amp; electronics
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {settings.businessName} supplies retailers, repair shops and resellers across India. Apply once and your
              account unlocks dealer pricing, MOQ guidance and GST invoicing on the full catalogue.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/retailer/register">
                  Apply for wholesale
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 size-4" />
                  Ask a question
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-14 lg:py-20">
        <SectionHeading
          eyebrow="What dealers get"
          title="Everything you need to run your counter"
          description="A wholesale account is more than a discount — it is the whole ordering workflow in one place."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
                <benefit.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold">{benefit.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{benefit.body(settings.city)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-14 dark:border-white/10 dark:bg-white/[0.02] lg:py-20">
        <div className="container">
          <SectionHeading eyebrow="How it works" title="Three steps to your first wholesale order" align="center" />
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-blue-600 font-display text-lg font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container py-14 lg:py-20">
        <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-12 text-center sm:px-12 dark:border dark-white/10">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Ready to stock up?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            The application takes a couple of minutes. Have your shop address, mobile number and GSTIN ready if you
            have one.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/retailer/register">Start the application</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                Chat on WhatsApp
              </a>
            </Button>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            {settings.businessName} &middot; {settings.city} &middot; {settings.phone}
          </p>
        </div>
      </section>
    </>
  );
}
