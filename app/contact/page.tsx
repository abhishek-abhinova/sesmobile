import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand, faqSchema } from '@/lib/seo';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ContactForm, ContactDetails } from '@/components/forms/contact-form';
import { StructuredData } from '@/components/shared/structured-data';
import { FAQS } from '@/lib/faqs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return buildMetadata({
    title: `Contact ${settings.businessName}`,
    description: `Call, WhatsApp or visit ${settings.businessName} in ${settings.city} for mobile spare parts, wholesale pricing and product enquiries.`,
    path: '/contact',
    brand: toSeoBrand(settings),
  });
}

export default async function ContactPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

  const mapsUrl =
    settings.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.fullAddress}, ${settings.city}`)}`;

  return (
    <div className="container py-6 lg:py-10">
      <StructuredData data={faqSchema(FAQS)} id="schema-faq" />
      <Breadcrumbs items={[{ name: 'Contact' }]} className="mb-4" />

      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Talk to {settings.businessName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tell us the part you need, the quantity and your city. For the fastest reply, WhatsApp is best — we usually
          answer within minutes during shop hours.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:gap-8">
        <div>
          <ContactForm
            businessName={settings.businessName}
            whatsappNumber={settings.whatsappNumber}
            siteUrl={settings.siteUrl}
            defaults={{
              name: user?.name ?? '',
              email: user?.email ?? '',
            }}
          />

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Common questions</h2>
            <div className="mt-4 space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                    {faq.question}
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <ContactDetails
          address={settings.fullAddress}
          city={settings.city}
          phone={settings.phone}
          whatsappNumber={settings.whatsappNumber}
          email={settings.email}
          businessHours={settings.businessHours}
          mapsUrl={mapsUrl}
        />
      </div>
    </div>
  );
}
