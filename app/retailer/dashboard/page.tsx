import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  BadgeIndianRupee,
  Clock,
  FileText,
  Heart,
  LogOut,
  MessageCircle,
  Package,
  Phone,
  Store,
  XCircle,
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
    title: 'Retailer dashboard',
    description: `Wholesale catalogue, pricing and enquiry history for approved ${settings.businessName} dealers.`,
    path: '/retailer/dashboard',
    brand: toSeoBrand(settings),
    noIndex: true,
  });
}

export default async function RetailerDashboardPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

  if (!user) redirect('/login?next=/retailer/dashboard');
  if (user.isAdmin || user.isEditor) redirect('/admin');
  if (!user.isRetailer) redirect('/retailer/register');

  const [profile, enquiries, wishlistCount] = await Promise.all([
    prisma.retailerProfile.findUnique({ where: { userId: user.id } }),
    prisma.enquiry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, reference: true, type: true, subject: true, status: true, createdAt: true },
    }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
  ]);

  const approved = user.isApprovedRetailer;
  const pending = user.retailerStatus === 'PENDING';
  const rejected = user.retailerStatus === 'REJECTED' || user.retailerStatus === 'SUSPENDED';

  return (
    <div className="container py-6 lg:py-10">
      <Breadcrumbs items={[{ name: 'Wholesale', href: '/retailer' }, { name: 'Dashboard' }]} className="mb-4" />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-orange-50 text-brand-orange-500 dark:bg-brand-orange-500/10">
            <Store className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{user.businessName ?? 'Dealer account'}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{profile?.city ?? user.phone}</span>
              {approved ? (
                <Badge className="bg-emerald-600">
                  <BadgeCheck className="mr-1 size-3" />
                  Wholesale pricing active
                </Badge>
              ) : pending ? (
                <Badge variant="warning">
                  <Clock className="mr-1 size-3" />
                  Awaiting approval
                </Badge>
              ) : null}
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

      {rejected && profile?.rejectionReason ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
          <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Account not active</p>
            <p className="mt-1 text-sm text-red-600/90 dark:text-red-300/80">{profile.rejectionReason}</p>
            <p className="mt-2 text-xs text-red-600/80 dark:text-red-300/70">
              Reply to us on WhatsApp if you think this is a mistake.
            </p>
          </div>
        </div>
      ) : null}

      {pending ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Application under review</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-700/90 dark:text-amber-300/80">
              We are verifying your details. Wholesale pricing unlocks automatically once your account is approved — we
              will message you on WhatsApp. You can browse the catalogue meanwhile.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="sm" variant="outline" asChild>
                <Link href="/products">Browse the catalogue</Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
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
                  Ask about my application
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {approved ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile href="/products" icon={BadgeIndianRupee} label="Wholesale pricing" value="Active" />
            <Tile href="/products?sort=newest" icon={Package} label="New arrivals" value="View" />
            <Tile href="/wishlist" icon={Heart} label="Order list" value={String(wishlistCount)} />
            <Tile href="#enquiries" icon={FileText} label="My enquiries" value={String(enquiries.length)} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <section id="enquiries" className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
                <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <FileText className="size-4 text-brand-blue-600" />
                    Enquiry &amp; quote history
                  </h2>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/wishlist">
                      Send a new list
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </header>

                {enquiries.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      icon={FileText}
                      title="Nothing sent yet"
                      description="Add products to your wishlist and send the list — we reply with wholesale pricing and availability."
                      action={{ href: '/products', label: 'Browse catalogue' }}
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-white/10">
                    {enquiries.map((enquiry) => (
                      <li key={enquiry.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{enquiry.subject ?? 'Enquiry'}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono">{enquiry.reference}</span> · {formatDate(enquiry.createdAt)}
                          </p>
                        </div>
                        <EnquiryStatus status={enquiry.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
                <h2 className="text-base font-semibold">How to order</h2>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-blue-600 text-[11px] font-bold text-white">
                      1
                    </span>
                    Add products to your wishlist and set quantities.
                  </li>
                  <li className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-blue-600 text-[11px] font-bold text-white">
                      2
                    </span>
                    Send the list as one message or use the bulk enquiry form.
                  </li>
                  <li className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-blue-600 text-[11px] font-bold text-white">
                      3
                    </span>
                    We confirm stock, MOQ and totals, then share the invoice.
                  </li>
                </ol>
                <Button className="mt-5" block asChild>
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
                    Order on WhatsApp
                  </a>
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
                <h2 className="text-base font-semibold">Your dealer details</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <DetailRow label="Contact" value={profile?.contactName ?? user.name} />
                  <DetailRow label="Phone" value={profile?.phone ?? user.phone} />
                  <DetailRow label="WhatsApp" value={profile?.whatsapp ?? '—'} />
                  <DetailRow label="Email" value={profile?.email ?? user.email ?? '—'} />
                  <DetailRow label="GSTIN" value={profile?.gstin ?? 'Not provided'} />
                  <DetailRow label="Type" value={prettyType(profile?.businessType)} />
                  <DetailRow label="Address" value={profile?.shopAddress ?? '—'} />
                  <DetailRow
                    label="Approved"
                    value={profile?.approvedAt ? formatDate(profile.approvedAt) : 'Pending'}
                  />
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Need any of these changed? WhatsApp us and we will update your account.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
                <h2 className="text-sm font-semibold">Your dealer contact</h2>
                <p className="mt-2 text-sm font-medium">{settings.businessName}</p>
                <a
                  href={`tel:${settings.phone.replace(/\D/g, '')}`}
                  className="mt-1.5 flex items-center gap-2 text-sm text-brand-blue-600 hover:underline"
                >
                  <Phone className="size-3.5" />
                  {settings.phone}
                </a>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {settings.addressLine1}
                  {settings.addressLine2 ? `, ${settings.addressLine2}` : ''}, {settings.city} {settings.pincode}
                </p>
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}

function prettyType(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function Tile({
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
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-orange-50 text-brand-orange-500 transition group-hover:bg-brand-orange-500 group-hover:text-white dark:bg-brand-orange-500/10">
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight">{value}</span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function EnquiryStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'outline' | 'success' | 'warning' | 'destructive' }> = {
    NEW: { label: 'Received', variant: 'default' },
    CONTACTED: { label: 'Replied', variant: 'success' },
    CONVERTED: { label: 'Ordered', variant: 'success' },
    CLOSED: { label: 'Closed', variant: 'outline' },
    SPAM: { label: 'Spam', variant: 'destructive' },
  };
  const meta = map[status] ?? { label: status.replace(/_/g, ' '), variant: 'outline' as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
