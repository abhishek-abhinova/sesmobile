import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Heart,
  MessageCircle,
  Package,
  Star,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const [
    productCount,
    activeProductCount,
    categoryCount,
    brandCount,
    userCount,
    retailerCount,
    approvedRetailerCount,
    pendingRetailers,
    enquiryCount,
    newEnquiries,
    enquiriesToday,
    enquiriesThisWeek,
    reviewCount,
    pendingReviews,
    lowStock,
    outOfStock,
    recentEnquiries,
    recentUsers,
    recentActivity,
    topProducts,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.brand.count(),
    prisma.user.count(),
    prisma.retailerProfile.count(),
    prisma.retailerProfile.count({ where: { status: 'APPROVED' } }),
    prisma.retailerProfile.count({ where: { status: 'PENDING' } }),
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { status: 'NEW' } }),
    prisma.enquiry.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.enquiry.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.review.count(),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { status: 'ACTIVE', stockStatus: 'LOW_STOCK' } }),
    prisma.product.count({ where: { status: 'ACTIVE', stockStatus: 'OUT_OF_STOCK' } }),
    prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, reference: true, name: true, type: true, status: true, createdAt: true, userType: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, role: true, createdAt: true, phone: true },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, action: true, entityType: true, entityName: true, createdAt: true, userName: true },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ enquiryCount: 'desc' }, { viewCount: 'desc' }],
      take: 5,
      select: { id: true, name: true, slug: true, viewCount: true, enquiryCount: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(now)} · {enquiriesToday} enquir{enquiriesToday === 1 ? 'y' : 'ies'} today,{' '}
            {enquiriesThisWeek} in the last 7 days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href="/admin/retailers">
              {pendingRetailers > 0 ? `Review ${pendingRetailers} application${pendingRetailers === 1 ? '' : 's'}` : 'Retailer applications'}
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/enquiries">All enquiries</Link>
          </Button>
        </div>
      </header>

      {newEnquiries > 0 || pendingReviews > 0 || outOfStock > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {newEnquiries > 0 ? (
            <AlertCard
              href="/admin/enquiries?status=NEW"
              tone="blue"
              icon={FileText}
              title={`${newEnquiries} new ${newEnquiries === 1 ? 'enquiry' : 'enquiries'}`}
              body="Waiting for a first reply."
            />
          ) : null}
          {pendingRetailers > 0 ? (
            <AlertCard
              href="/admin/retailers?status=PENDING"
              tone="amber"
              icon={Store}
              title={`${pendingRetailers} retailer application${pendingRetailers === 1 ? '' : 's'}`}
              body="Wholesale access unlocks the moment you approve."
            />
          ) : null}
          {pendingReviews > 0 ? (
            <AlertCard
              href="/admin/reviews?status=PENDING"
              tone="purple"
              icon={Star}
              title={`${pendingReviews} review${pendingReviews === 1 ? '' : 's'} to moderate`}
              body="Reviews stay hidden until you publish them."
            />
          ) : null}
          {outOfStock > 0 ? (
            <AlertCard
              href="/admin/products?stock=OUT_OF_STOCK"
              tone="red"
              icon={AlertTriangle}
              title={`${outOfStock} product${outOfStock === 1 ? '' : 's'} out of stock`}
              body="Shown as unavailable on the site."
            />
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Package} label="Active products" value={formatNumber(activeProductCount)} note={`${productCount - activeProductCount} hidden/draft`} href="/admin/products" />
        <MetricCard icon={FileText} label="Enquiries (all time)" value={formatNumber(enquiryCount)} note={`${enquiriesThisWeek} in 7 days`} href="/admin/enquiries" />
        <MetricCard icon={Store} label="Approved retailers" value={formatNumber(approvedRetailerCount)} note={`${retailerCount} applications total`} href="/admin/retailers" />
        <MetricCard icon={Users} label="Registered users" value={formatNumber(userCount)} note="All-time signups" href="/admin/users" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="text-base font-semibold">Latest enquiries</h2>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/admin/enquiries">
                  View all
                  <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </header>
            {recentEnquiries.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No enquiries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted-foreground dark:border-white/10">
                    <tr>
                      <th className="px-5 py-3 font-medium">Reference</th>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {recentEnquiries.map((enquiry) => (
                      <tr key={enquiry.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs">{enquiry.reference}</td>
                        <td className="max-w-[14rem] truncate px-5 py-3 font-medium">{enquiry.name}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                          {enquiry.type.replace(/_/g, ' ').toLowerCase()}
                        </td>
                        <td className="px-5 py-3">
                          <EnquiryBadge status={enquiry.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                          {formatDateTime(enquiry.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
            <header className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="text-base font-semibold">Most engaged products</h2>
            </header>
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {topProducts.map((product, index) => (
                <li key={product.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-5 text-sm font-bold text-muted-foreground">{index + 1}</span>
                  <Link href={`/admin/products?q=${encodeURIComponent(product.name)}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand-blue-600">
                    {product.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="size-3.5" />
                      {formatNumber(product.viewCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" />
                      {formatNumber(product.enquiryCount)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-base font-semibold">Catalogue health</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Active products" value={formatNumber(activeProductCount)} />
              <Row label="Low stock" value={formatNumber(lowStock)} tone={lowStock > 0 ? 'amber' : undefined} />
              <Row label="Out of stock" value={formatNumber(outOfStock)} tone={outOfStock > 0 ? 'red' : undefined} />
              <Row label="Categories" value={formatNumber(categoryCount)} />
              <Row label="Brands" value={formatNumber(brandCount)} />
              <Row label="Reviews" value={formatNumber(reviewCount)} />
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-base font-semibold">Newest members</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.role.toLowerCase()} · {formatDate(user.createdAt)}
                    </span>
                  </span>
                  <Badge variant="outline">{user.role.toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <h2 className="text-base font-semibold">Recent activity</h2>
            {recentActivity.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-blue-500" />
                    <span className="min-w-0">
                      <span className="block truncate">
                        {entry.action.toLowerCase().replace(/_/g, ' ')}{' '}
                        <span className="text-muted-foreground">{entry.entityType?.toLowerCase() ?? 'item'}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {entry.entityName ?? '—'} · {formatDateTime(entry.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  href,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
  note?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-blue-300 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-brand-blue-600 group-hover:text-white dark:bg-white/5 dark:text-slate-300">
          <Icon className="size-4.5" />
        </span>
        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground/80">{note}</p> : null}
    </Link>
  );
}

function AlertCard({
  href,
  tone,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  tone: 'blue' | 'amber' | 'purple' | 'red';
  icon: typeof AlertTriangle;
  title: string;
  body: string;
}) {
  const tones: Record<string, string> = {
    blue: 'border-brand-blue-200 bg-brand-blue-50/60 dark:border-brand-blue-500/25 dark:bg-brand-blue-500/5',
    amber: 'border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/5',
    purple: 'border-violet-200 bg-violet-50/60 dark:border-violet-500/25 dark:bg-violet-500/5',
    red: 'border-red-200 bg-red-50/70 dark:border-red-500/25 dark:bg-red-500/5',
  };

  return (
    <Link href={href} className={`flex items-start gap-3 rounded-2xl border p-4 transition hover:shadow-soft ${tones[tone]}`}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
    </Link>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'red' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`font-semibold ${
          tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function EnquiryBadge({ status }: { status: string }) {
  const map: Record<string, 'default' | 'outline' | 'success' | 'warning' | 'destructive'> = {
    NEW: 'default',
    CONTACTED: 'success',
    CONVERTED: 'success',
    CLOSED: 'outline',
    SPAM: 'destructive',
  };
  return <Badge variant={map[status] ?? 'outline'}>{status.toLowerCase()}</Badge>;
}
