import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, MessageCircle, Phone, Store, Truck } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand, faqSchema } from '@/lib/seo';
import { whatsapp } from '@/lib/whatsapp';
import { FAQS } from '@/lib/faqs';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { SectionHeading } from '@/components/shared/section-heading';
import { StructuredData } from '@/components/shared/structured-data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'Frequently asked questions',
    description: `Answers about wholesale pricing, ordering, delivery, GST invoices and product compatibility at ${settings.businessName}.`,
    path: '/faq',
    brand: toSeoBrand(settings),
  });
}

export default async function FaqPage() {
  const settings = await getSettings();

  return (
    <div className="container py-8 lg:py-12">
      <Breadcrumbs items={[{ name: 'FAQ' }]} className="mb-6" />

      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue-50 px-3 py-1.5 text-xs font-semibold text-brand-blue-700 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
          <HelpCircle className="size-3.5" />
          Help centre
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The things customers and dealers ask most. If your question is not here, WhatsApp or call us — we answer
          quickly during business hours.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Accordion type="single" collapsible className="rounded-2xl border border-slate-200 bg-white px-5 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-white/10">
            <h2 className="text-sm font-semibold">Related pages</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/shipping">Shipping &amp; delivery</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/return-policy">Return policy</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/terms">Terms &amp; conditions</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/retailer">Wholesale programme</Link>
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-base font-semibold">Still need help?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Send us your requirement or question and we will reply on WhatsApp.
            </p>
            <Button
              block
              variant="whatsapp"
              className="mt-4"
              asChild
            >
              <a
                href={whatsapp.general({
                  whatsappNumber: settings.whatsappNumber,
                  siteUrl: settings.siteUrl,
                  businessName: settings.businessName,
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 size-4" />
                WhatsApp us
              </a>
            </Button>
            <a
              href={`tel:${settings.phone.replace(/\D/g, '')}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-medium transition hover:border-brand-blue-300 dark:border-white/10"
            >
              <Phone className="size-4 text-brand-blue-600" />
              {settings.phone}
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Store className="size-4 text-brand-orange-500" />
              Ordering as a dealer?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Register as a retailer to see wholesale prices and minimum order quantities.
            </p>
            <Button size="sm" className="mt-3" asChild>
              <Link href="/retailer/register">Apply for wholesale</Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="size-4 text-brand-blue-600" />
              Delivery
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Local delivery and dispatch to other locations — charges and timelines are confirmed with your
              quotation.
            </p>
          </div>
        </aside>
      </div>

      <section className="mt-14">
        <SectionHeading
          eyebrow="Good to know"
          title="How this website works"
          description="Everything here is built around a simple catalogue-and-enquiry flow — no online payment, no invented promises."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Browse & shortlist', body: 'Filter by category, brand or price and add products to your wishlist.' },
            { title: 'Send one message', body: 'Use the enquiry form, the WhatsApp button or your saved wishlist list.' },
            { title: 'We confirm the details', body: 'Availability, price, MOQ and delivery are confirmed before you pay.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 p-6 dark:border-white/10">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <StructuredData data={faqSchema(FAQS)} />
    </div>
  );
}
