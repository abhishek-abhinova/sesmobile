import Link from 'next/link';
import { Store } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { formatDate, formatDateTime, formatPhone, timeAgo } from '@/lib/format';
import { whatsapp } from '@/lib/whatsapp';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { RetailerDecisionButtons } from '@/components/admin/retailer-decision-buttons';
import type { PageProps } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;

export default async function AdminRetailersPage({
  searchParams,
}: PageProps<{ status?: string; page?: string }>) {
  const settings = await getSettings();
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number(params.page ?? '1') || 1);

  const where: Prisma.RetailerProfileWhereInput = status ? { status } : {};

  const [retailers, total, statusCounts] = await Promise.all([
    prisma.retailerProfile.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        businessName: true,
        contactName: true,
        businessType: true,
        phone: true,
        whatsapp: true,
        email: true,
        city: true,
        state: true,
        gstin: true,
        status: true,
        categoriesInterested: true,
        notes: true,
        rejectionReason: true,
        totalEnquiries: true,
        createdAt: true,
        approvedAt: true,
      },
    }),
    prisma.retailerProfile.count({ where }),
    prisma.retailerProfile.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const all = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Retailers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approving a dealer unlocks wholesale pricing on the site immediately.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Chip href="/admin/retailers" active={!status}>
          All ({all})
        </Chip>
        {STATUSES.map((option) => (
          <Chip key={option} href={`/admin/retailers?status=${option}`} active={status === option}>
            {option.toLowerCase()} ({counts[option] ?? 0})
          </Chip>
        ))}
      </div>

      {retailers.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No retailer applications"
          description="Applications submitted from the wholesale page appear here for approval."
          action={{ href: '/retailer', label: 'View the wholesale page' }}
        />
      ) : (
        <ul className="space-y-3">
          {retailers.map((retailer) => (
            <li
              key={retailer.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={retailer.status} />
                    {retailer.gstin ? <Badge variant="outline">GSTIN {retailer.gstin}</Badge> : null}
                    {retailer.businessType ? (
                      <Badge variant="outline">{retailer.businessType.toLowerCase().replace(/_/g, ' ')}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-semibold">{retailer.businessName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {retailer.contactName} · {formatPhone(retailer.phone)}
                    {retailer.email ? ` · ${retailer.email}` : ''}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {retailer.city}, {retailer.state}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <RetailerDecisionButtons id={retailer.id} status={retailer.status} />
                  <a
                    href={whatsapp.contact(
                      {
                        whatsappNumber: settings.whatsappNumber,
                        siteUrl: settings.siteUrl,
                        businessName: settings.businessName,
                      },
                      retailer.businessName,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-blue-600 hover:underline"
                  >
                    WhatsApp them
                  </a>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs text-muted-foreground dark:border-white/5 sm:grid-cols-3">
                <div>
                  <dt className="font-medium">Applied</dt>
                  <dd>
                    {formatDate(retailer.createdAt)} · {timeAgo(retailer.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Approved</dt>
                  <dd>{retailer.approvedAt ? formatDateTime(retailer.approvedAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Enquiries</dt>
                  <dd>{retailer.totalEnquiries}</dd>
                </div>
              </dl>

              {retailer.categoriesInterested.length > 0 ? (
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {retailer.categoriesInterested.map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium dark:bg-white/5"
                    >
                      {category}
                    </span>
                  ))}
                </p>
              ) : null}

              {retailer.notes ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/[0.03]">{retailer.notes}</p>
              ) : null}

              {retailer.rejectionReason && retailer.status === 'REJECTED' ? (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  Rejected: {retailer.rejectionReason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/retailers"
          params={{ status }}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Need to reach a dealer by email instead?{' '}
        <Link href="/admin/enquiries" className="underline">
          Open enquiries
        </Link>{' '}
        to see every conversation in one place.
      </p>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
        active
          ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-500/15 dark:text-brand-blue-300'
          : 'border-slate-200 text-muted-foreground hover:border-brand-blue-300 dark:border-white/10'
      }`}
    >
      {children}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'default' | 'outline' | 'success' | 'warning' | 'destructive'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'destructive',
    SUSPENDED: 'destructive',
  };
  return <Badge variant={map[status] ?? 'outline'}>{status.toLowerCase()}</Badge>;
}
