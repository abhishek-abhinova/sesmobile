import Link from 'next/link';
import { Inbox, Search } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { formatCurrency, formatDateTime, formatPhone, timeAgo } from '@/lib/format';
import { whatsapp } from '@/lib/whatsapp';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { EnquiryNotesForm, EnquiryStatusSelect } from '@/components/admin/enquiry-actions';
import type { PageProps } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

const STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'SPAM'] as const;
const TYPES = ['PRODUCT', 'GENERAL', 'BULK', 'WISHLIST', 'WHOLESALE', 'RETAILER', 'CONTACT'] as const;

export default async function AdminEnquiriesPage({
  searchParams,
}: PageProps<{ status?: string; type?: string; q?: string; page?: string }>) {
  const settings = await getSettings();
  const params = await searchParams;

  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : undefined;
  const type = TYPES.includes(params.type as (typeof TYPES)[number])
    ? (params.type as (typeof TYPES)[number])
    : undefined;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page ?? '1') || 1);

  const where: Prisma.EnquiryWhereInput = {
    ...(status && { status }),
    ...(type && { type }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
        { productName: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [enquiries, total, statusCounts] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        name: true,
        phone: true,
        email: true,
        type: true,
        status: true,
        userType: true,
        subject: true,
        message: true,
        productName: true,
        quantity: true,
        priceShown: true,
        priceTier: true,
        notes: true,
        createdAt: true,
        contactedAt: true,
      },
    }),
    prisma.enquiry.count({ where }),
    prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = { status, type, q, page: undefined, ...params };
    for (const [key, value] of Object.entries(merged)) if (value) search.set(key, value);
    const qs = search.toString();
    return qs ? `/admin/enquiries?${qs}` : '/admin/enquiries';
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Enquiries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} matching {total === 1 ? 'enquiry' : 'enquiries'}
          </p>
        </div>
        <form className="flex gap-2" action="/admin/enquiries" method="get">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search name, phone, reference…"
              className="h-10 w-64 rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25 dark:border-white/15 dark:bg-white/[0.04]"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </header>

      <div className="flex flex-wrap gap-2">
        <FilterChip href={buildHref({ status: undefined, page: undefined })} active={!status}>
          All ({Object.values(counts).reduce((sum, n) => sum + n, 0)})
        </FilterChip>
        {STATUSES.map((option) => (
          <FilterChip key={option} href={buildHref({ status: option, page: undefined })} active={status === option}>
            {option.toLowerCase()} ({counts[option] ?? 0})
          </FilterChip>
        ))}
        <span className="mx-1 hidden w-px bg-slate-200 sm:block dark:bg-white/10" />
        {TYPES.map((option) => (
          <FilterChip
            key={option}
            href={buildHref({ type: type === option ? undefined : option, page: undefined })}
            active={type === option}
          >
            {option.toLowerCase()}
          </FilterChip>
        ))}
      </div>

      {enquiries.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No enquiries found"
          description="Try a different filter, or wait for the first one to come in from the site."
          action={{ href: '/admin/enquiries', label: 'Clear filters' }}
        />
      ) : (
        <ul className="space-y-3">
          {enquiries.map((enquiry) => (
            <li
              key={enquiry.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{enquiry.reference}</span>
                    <Badge variant="outline">{enquiry.type.toLowerCase()}</Badge>
                    {enquiry.userType !== 'GUEST' ? <Badge variant="outline">{enquiry.userType.toLowerCase()}</Badge> : null}
                    {enquiry.priceTier === 'retailer' ? <Badge variant="success">Dealer price shown</Badge> : null}
                  </div>
                  <p className="mt-2 text-base font-semibold">
                    {enquiry.name}
                    {enquiry.subject ? <span className="font-normal text-muted-foreground"> — {enquiry.subject}</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPhone(enquiry.phone)}
                    {enquiry.email ? ` · ${enquiry.email}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <EnquiryStatusSelect id={enquiry.id} status={enquiry.status} />
                </div>
              </div>

              {enquiry.productName ? (
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Product:</span>{' '}
                  {enquiry.productName}
                  {enquiry.quantity ? ` × ${enquiry.quantity}` : ''}
                  {enquiry.priceShown ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · shown at {formatCurrency(Number(enquiry.priceShown))}
                    </span>
                  ) : null}
                </p>
              ) : null}

              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed dark:bg-white/[0.03]">
                {enquiry.message}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <EnquiryNotesForm id={enquiry.id} notes={enquiry.notes} />
                <div className="text-xs text-muted-foreground sm:text-right">
                  <p>
                    Received {formatDateTime(enquiry.createdAt)} · {timeAgo(enquiry.createdAt)}
                  </p>
                  {enquiry.contactedAt ? <p>Contacted {formatDateTime(enquiry.contactedAt)}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                    <Button size="sm" variant="whatsapp" asChild>
                      <a
                        href={whatsapp.contact(
                          {
                            whatsappNumber: settings.whatsappNumber,
                            siteUrl: settings.siteUrl,
                            businessName: settings.businessName,
                          },
                          enquiry.name,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${enquiry.phone.replace(/\D/g, '')}`}>Call</a>
                    </Button>
                    {enquiry.productName ? (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href="/admin/products">Open catalogue</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} basePath="/admin/enquiries" params={{ status, type, q }} />
      ) : null}
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
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
