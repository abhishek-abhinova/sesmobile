import 'server-only';
import { prisma } from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import { Prisma } from '@prisma/client';

/**
 * Privacy-conscious analytics.
 *
 * We deliberately store NO IP addresses, no raw user agents, and no free-form
 * personal data. Sessions are anonymous rotating ids. This satisfies the
 * "do not expose personal information unnecessarily" requirement while still
 * powering the admin dashboard.
 */

export type EventType =
  | 'PAGE_VIEW'
  | 'PRODUCT_VIEW'
  | 'CATEGORY_VIEW'
  | 'SEARCH'
  | 'WHATSAPP_CLICK'
  | 'CALL_CLICK'
  | 'ENQUIRY'
  | 'RETAILER_REGISTER'
  | 'PRODUCT_COMPARE';

export interface TrackInput {
  type: EventType;
  entityType?: string;
  entityId?: string;
  path?: string;
  query?: string;
  userType?: 'CUSTOMER' | 'RETAILER' | 'ADMIN' | 'GUEST';
  sessionId?: string;
  referrer?: string;
  device?: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  metadata?: Record<string, string | number | boolean>;
}

function coerceDevice(value?: string): TrackInput['device'] {
  if (value && ['mobile', 'tablet', 'desktop', 'bot'].includes(value)) {
    return value as TrackInput['device'];
  }
  return undefined;
}

export async function track(input: TrackInput): Promise<void> {
  let enabled = true;
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { enableAnalytics: true },
    });
    enabled = row?.enableAnalytics ?? true;
  } catch {
    // Settings unavailable (e.g. first boot) — default to enabled.
  }
  if (!enabled && process.env.ANALYTICS_ENABLED !== 'true') return;
  if (!enabled) return;

  try {
    await prisma.analyticsEvent.create({
      data: {
        type: input.type,
        entityType: input.entityType ?? null,
        entityId: input.entityId ? input.entityId.slice(0, 64) : null,
        path: input.path?.slice(0, 500) ?? null,
        query: input.query?.slice(0, 200) ?? null,
        userType: input.userType ?? 'GUEST',
        sessionId: input.sessionId?.slice(0, 64) ?? null,
        referrer: input.referrer?.slice(0, 500) ?? null,
        device: coerceDevice(input.device) ?? 'unknown',
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error('[analytics] failed to record event:', (error as Error).message);
  }
}

/* -------------------------------------------------------------------------- */
/*  Aggregations used by the admin dashboard                                  */
/* -------------------------------------------------------------------------- */

export interface DashboardRange {
  from: Date;
  to: Date;
}

export function rangeFromDays(days: number): DashboardRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function getEventTotals(range: DashboardRange) {
  const grouped = await prisma.analyticsEvent.groupBy({
    by: ['type'],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: { _all: true },
  });

  const totals: Record<string, number> = {};
  for (const row of grouped) totals[row.type] = row._count._all;
  return totals;
}

export async function getDailySeries(range: DashboardRange, type?: EventType) {
  const rows = await prisma.$queryRaw<Array<{ day: Date; type: string; count: bigint }>>`
    SELECT date_trunc('day', "createdAt") AS day, type, COUNT(*)::bigint AS count
    FROM analytics_events
    WHERE "createdAt" >= ${range.from}
      AND "createdAt" <= ${range.to}
      ${type ? Prisma.sql`AND type = ${type}` : Prisma.empty}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `;

  return rows.map((r) => ({
    day: new Date(r.day).toISOString().slice(0, 10),
    type: r.type,
    count: Number(r.count),
  }));
}

export async function getTopProducts(limit = 10) {
  const [byViews, byEnquiries, byWhatsapp] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, viewCount: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
      orderBy: { viewCount: 'desc' },
      take: limit,
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, enquiryCount: true },
      orderBy: { enquiryCount: 'desc' },
      take: limit,
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, whatsappClickCount: true },
      orderBy: { whatsappClickCount: 'desc' },
      take: limit,
    }),
  ]);

  return { byViews, byEnquiries, byWhatsapp };
}

export async function getPopularCategories(limit = 8) {
  const grouped = await prisma.analyticsEvent.groupBy({
    by: ['entityId'],
    where: { type: 'CATEGORY_VIEW', entityId: { not: null }, createdAt: { gte: rangeFromDays(90).from } },
    _count: { _all: true },
    orderBy: { _count: { entityId: 'desc' } },
    take: limit,
  });

  if (grouped.length === 0) {
    const byProducts = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
      orderBy: { products: { _count: 'desc' } },
      take: limit,
    });
    return byProducts.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products }));
  }

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((g) => g.entityId as string) } },
    select: { id: true, name: true, slug: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  return grouped.flatMap((g) => {
    const c = byId.get(g.entityId as string);
    return c ? [{ id: c.id, name: c.name, slug: c.slug, count: g._count._all }] : [];
  });
}

export async function getTopSearches(limit = 12, days = 60) {
  const rows = await prisma.searchQuery.groupBy({
    by: ['normalised'],
    where: { createdAt: { gte: rangeFromDays(days).from } },
    _count: { _all: true },
    orderBy: { _count: { normalised: 'desc' } },
    take: limit,
  });
  return rows.map((r) => ({ query: r.normalised, count: r._count._all }));
}

export async function purgeOldAnalytics(): Promise<number> {
  const days = getServerEnv().ANALYTICS_RETENTION_DAYS;
  if (days <= 0) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { count } = await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
