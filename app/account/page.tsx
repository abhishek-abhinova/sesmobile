import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  FileText,
  Heart,
  LogOut,
  Package,
  Phone,
  ShieldCheck,
  Store,
  User,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { whatsapp } from '@/lib/whatsapp';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'My account',
    description: `Your ${settings.businessName} account: wishlist, enquiries and contact details.`,
    path: '/account',
    brand: toSeoBrand(settings),
    noIndex: true,
  });
}

const ENQUIRY_LABELS: Record<string, string> = {
  PRODUCT: 'Product enquiry',
  BULK: 'Wholesale / bulk',
  GENERAL: 'General',
  SUPPORT: 'Support',
};

export default async function AccountPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  if (!user) redirect('/login?next=/account');

  if (user.isAdmin || user.isEditor) redirect('/admin');
  if (user.isRetailer) redirect('/retailer');

  const [wishlistCount, enquiries, recentlyViewed] = await Promise.all([
    prisma.wishlistItem.count({ where: { userId: user.id } }),
    prisma.enquiry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        reference: true,
        type: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { lastViewedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const openEnquiries = enquiries.filter((enquiry) => enquiry.status === 'NEW').length;

  return (
    <div className="container py-6 lg:py-10">
      <Breadcrumbs items={[{ name: 'My account' }]} className="mb-4" />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
            <User className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Hello, {user.name.split(' ')[0]}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {user.phone}
              {user.email ? ` · ${user.email}` : ''}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/auth/logout">
            <LogOut className="mr-2 size-4" />
            Sign out
          </a>
        </Button>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile href="/wishlist" icon={Heart} label="Saved products" value={String(wishlistCount)} />
        <StatTile href="#enquiries" icon={FileText} label="Enquiries sent" value={String(enquiries.length)} />
        <StatTile href="#enquiries" icon={Package} label="Awaiting reply" value={String(openEnquiries)} />
        <StatTile href="/contact" icon={Phone} label="Need help?" value="Contact" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section id="enquiries" className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <FileText className="size-4 text-brand-blue-600" />
                My enquiries
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/products">
                  New enquiry
                  <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </header>

            {enquiries.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={FileText}
                  title="No enquiries yet"
                  description="When you send a product or wholesale enquiry it will appear here with its reference number."
                  action={{ href: '/products', label: 'Browse products' }}
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-white/10">
                {enquiries.map((enquiry) => (
                  <li key={enquiry.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{enquiry.subject || ENQUIRY_LABELS[enquiry.type] || 'Enquiry'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{enquiry.reference}</span> · {formatDate(enquiry.createdAt)} ·{' '}
                        {ENQUIRY_LABELS[enquiry.type] ?? enquiry.type}
                      </p>
                    </div>
                    <StatusBadge status={enquiry.status} />
                  </li>
                ))}
              </ul>
            )}

            <footer className="border-t border-slate-200 px-5 py-4 dark:border-white/10">
              <p className="text-xs text-muted-foreground">
                Need to add more items?{' '}
                <Link href="/wishlist" className="font-medium text-brand-blue-600 hover:underline">
                  Open your wishlist
                </Link>{' '}
                and send everything in one message.
              </p>
            </footer>
          </div>

          {recentlyViewed.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
              <header className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <h2 className="text-base font-semibold">Recently viewed</h2>
              </header>
              <ul className="divide-y divide-slate-200 dark:divide-white/10">
                {recentlyViewed.map(({ id, product }) => (
                  <li key={id}>
                    <Link
                      href={`/product/${product.slug}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    >
                      <span className="truncate text-sm">{product.name}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-base font-semibold">Account status</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Type" value="Customer" />
              <Row label="Status" value="Active" />
              <Row label="Wholesale prices" value="Not enabled" />
            </dl>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.04]">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Store className="size-4 text-brand-orange-500" />
                Run a shop?
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Apply for a dealer account to unlock wholesale pricing and MOQ ordering.
              </p>
              <Button size="sm" className="mt-3" asChild>
                <Link href="/retailer/register">Apply for wholesale</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-base font-semibold">Quick actions</h2>
            <div className="mt-4 space-y-2">
              <ActionLink href="/wishlist" icon={Heart}>
                View wishlist ({wishlistCount})
              </ActionLink>
              <ActionLink href="/products" icon={Package}>
                Browse catalogue
              </ActionLink>
              <ActionLink href="/contact" icon={Bell}>
                Contact us
              </ActionLink>
              <a
                href={whatsapp.general({
                  whatsappNumber: settings.whatsappNumber,
                  siteUrl: settings.siteUrl,
                  businessName: settings.businessName,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-[#25D366]/30 bg-[#25D366]/5 px-3.5 py-2.5 text-sm font-medium transition hover:bg-[#25D366]/10"
              >
                <Phone className="size-4 text-[#25D366]" />
                WhatsApp {settings.businessName}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-emerald-500" />
              Your data
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              We only use your details to answer your enquiries and manage your account. See our{' '}
              <Link href="/privacy" className="underline">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof Heart;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-brand-blue-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-brand-blue-500/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue-50 text-brand-blue-600 transition group-hover:bg-brand-blue-600 group-hover:text-white dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight">{value}</span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ActionLink({ href, icon: Icon, children }: { href: string; icon: typeof Heart; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-medium transition hover:border-brand-blue-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'outline' | 'success' | 'warning' | 'destructive' }> = {
    NEW: { label: 'Received', variant: 'default' },
    CONTACTED: { label: 'We replied', variant: 'success' },
    CONVERTED: { label: 'Order placed', variant: 'success' },
    CLOSED: { label: 'Closed', variant: 'outline' },
    SPAM: { label: 'Spam', variant: 'destructive' },
  };
  const meta = map[status] ?? { label: status.replace(/_/g, ' '), variant: 'outline' as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
