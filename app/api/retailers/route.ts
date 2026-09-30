import { prisma } from '@/lib/prisma';
import { requireAdmin, getCurrentUser } from '@/lib/auth';
import { withApi, jsonOk, jsonError, ErrorCodes, assertSameOrigin, paginate, notFound } from '@/lib/api';
import { retailerUpdateSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';
import { notifyRetailerDecision } from '@/lib/notifications';
import { limitMutation } from '@/lib/rate-limit';
import { z } from 'zod';
import { sendMail, renderRetailerMail } from '@/lib/mail';
import { getSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listSchema = z.object({
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).default('ALL'),
  q: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  hasGstin: z
    .enum(['true', 'false', 'all'])
    .default('all')
    .transform((v) => (v === 'all' ? undefined : v === 'true')),
  sort: z.enum(['newest', 'oldest', 'name', 'business']).default('newest'),
  page: z.coerce.number().int().min(1).max(5000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Retailer management — admin only. Retailers may read their own record. */
export const GET = withApi(async (req: Request) => {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return jsonError(ErrorCodes.FORBIDDEN, 'Administrator access required.', 403);

  const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return jsonError(ErrorCodes.VALIDATION, 'Invalid filter values.', 422);
  const q = parsed.data;

  const where = {
    ...(q.status !== 'ALL' && { status: q.status }),
    ...(q.city && { city: { contains: q.city, mode: 'insensitive' as const } }),
    ...(q.state && { state: { contains: q.state, mode: 'insensitive' as const } }),
    ...(q.hasGstin !== undefined && { gstin: q.hasGstin ? { not: null } : null }),
    ...(q.q && {
      OR: [
        { businessName: { contains: q.q, mode: 'insensitive' as const } },
        { contactName: { contains: q.q, mode: 'insensitive' as const } },
        { phone: { contains: q.q } },
        { email: { contains: q.q, mode: 'insensitive' as const } },
        { gstin: { contains: q.q, mode: 'insensitive' as const } },
        { city: { contains: q.q, mode: 'insensitive' as const } },
      ],
    }),
  };

  const orderBy =
    q.sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : q.sort === 'name'
        ? { contactName: 'asc' as const }
        : q.sort === 'business'
          ? { businessName: 'asc' as const }
          : { createdAt: 'desc' as const };

  const [total, rows, counts] = await Promise.all([
    prisma.retailerProfile.count({ where }),
    prisma.retailerProfile.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        userId: true,
        businessName: true,
        contactName: true,
        businessType: true,
        phone: true,
        whatsapp: true,
        email: true,
        shopAddress: true,
        city: true,
        state: true,
        pincode: true,
        gstin: true,
        categoriesInterested: true,
        monthlyVolume: true,
        status: true,
        approvedAt: true,
        rejectionReason: true,
        notes: true,
        documentUrl: true,
        lastEnquiryAt: true,
        totalEnquiries: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { lastLoginAt: true, createdAt: true, avatarUrl: true } },
      },
    }),
    prisma.retailerProfile.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const summary = {
    all: counts.reduce((sum, c) => sum + c._count._all, 0),
    pending: counts.find((c) => c.status === 'PENDING')?._count._all ?? 0,
    approved: counts.find((c) => c.status === 'APPROVED')?._count._all ?? 0,
    rejected: counts.find((c) => c.status === 'REJECTED')?._count._all ?? 0,
    suspended: counts.find((c) => c.status === 'SUSPENDED')?._count._all ?? 0,
  };

  return jsonOk(
    paginate(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        approvedAt: r.approvedAt?.toISOString() ?? null,
        lastEnquiryAt: r.lastEnquiryAt?.toISOString() ?? null,
        lastLoginAt: r.user.lastLoginAt?.toISOString() ?? null,
        user: { lastLoginAt: r.user.lastLoginAt?.toISOString() ?? null, registeredAt: r.user.createdAt.toISOString(), avatarUrl: r.user.avatarUrl },
      })),
      total,
      q.page,
      q.pageSize,
    ),
    { summary },
  );
});

/** Approve / reject / suspend a retailer. */
export const PATCH = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return jsonError(ErrorCodes.FORBIDDEN, 'Administrator access required.', 403);

  const limit = await limitMutation(`retailer-status:${admin.id}`, 60, 60_000);
  if (!limit.success) return jsonError(ErrorCodes.RATE_LIMITED, 'Slow down a moment.', 429);

  const data = retailerUpdateSchema.parse(await req.json().catch(() => null));

  const profile = await prisma.retailerProfile.findUnique({
    where: { id: data.id },
    select: { id: true, userId: true, businessName: true, status: true, email: true, contactName: true },
  });
  if (!profile) throw notFound('Retailer');

  if (data.status === 'REJECTED' && !data.rejectionReason) {
    return jsonError(ErrorCodes.VALIDATION, 'Please add a reason so the applicant understands the decision.', 422, {
      fieldErrors: { rejectionReason: ['A reason is required when rejecting.'] },
    });
  }

  const nextStatus = data.status ?? profile.status;
  const approved = nextStatus === 'APPROVED';

  const updated = await prisma.$transaction([
    prisma.retailerProfile.update({
      where: { id: data.id },
      data: {
        ...(data.status !== undefined && {
          status: data.status,
          approvedAt: approved ? new Date() : null,
          approvedById: approved ? admin.id : null,
          rejectionReason: data.status === 'APPROVED' ? null : (data.rejectionReason ?? null),
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.documentUrl !== undefined && { documentUrl: data.documentUrl }),
      },
    }),
    prisma.user.update({
      where: { id: profile.userId },
      data: { status: nextStatus },
    }),
  ]);

  // Suspending a retailer must immediately kill their active sessions so they
  // lose wholesale access without waiting for a token to expire.
  if (data.status === 'SUSPENDED' || data.status === 'REJECTED') {
    await prisma.session.deleteMany({ where: { userId: profile.userId } });
  }

  if (data.status && data.status !== profile.status) {
    void notifyRetailerDecision({
      userId: profile.userId,
      businessName: profile.businessName,
      email: profile.email,
      approved,
      reason: data.rejectionReason,
    }).catch(() => undefined);

    await logActivity({
      action: data.status === 'APPROVED' ? 'APPROVE' : data.status === 'REJECTED' ? 'REJECT' : 'SUSPEND',
      entityType: 'RetailerProfile',
      entityId: data.id,
      entityName: profile.businessName,
      user: admin,
      metadata: { from: profile.status, to: data.status },
    });
  }

  return jsonOk({ id: updated[0].id, status: updated[0].status, approvedAt: updated[0].approvedAt });
});

/** Bulk approve pending applications. */
export const PUT = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();

  const { ids } = z.object({ ids: z.array(z.string().cuid()).min(1).max(200) }).parse(await req.json().catch(() => null));

  const profiles = await prisma.retailerProfile.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, businessName: true, email: true, contactName: true },
  });

  if (profiles.length === 0) throw notFound('Retailers');

  await prisma.$transaction([
    prisma.retailerProfile.updateMany({
      where: { id: { in: ids } },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedById: admin.id, rejectionReason: null },
    }),
    prisma.user.updateMany({
      where: { id: { in: profiles.map((p) => p.userId) } },
      data: { status: 'APPROVED' },
    }),
  ]);

  const settings = await getSettings();
  for (const p of profiles) {
    if (p.email) {
      void sendMail({
        to: p.email,
        subject: `Your retailer application — approved`,
        html: renderRetailerMail({
          businessName: settings.businessName,
          applicantName: p.businessName,
          approved: true,
          reason: null,
          loginUrl: `${settings.siteUrl.replace(/\/$/, '')}/login`,
        }),
      }).catch(() => undefined);
    }
  }

  await logActivity({ action: 'APPROVE', entityType: 'RetailerProfile', user: admin, metadata: { bulk: true, count: profiles.length } });

  return jsonOk({ approved: profiles.length });
});

export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError(ErrorCodes.VALIDATION, 'Retailer id is required.', 422);

  const profile = await prisma.retailerProfile.findUnique({ where: { id }, select: { id: true, userId: true, businessName: true } });
  if (!profile) throw notFound('Retailer');

  await prisma.$transaction([
    prisma.retailerProfile.delete({ where: { id } }),
    prisma.session.deleteMany({ where: { userId: profile.userId } }),
    prisma.user.update({ where: { id: profile.userId }, data: { role: 'CUSTOMER', status: 'APPROVED' } }),
  ]);

  await logActivity({ action: 'DELETE', entityType: 'RetailerProfile', entityId: id, entityName: profile.businessName });

  return jsonOk({ success: true, note: 'Retailer profile removed; the sign-in account was converted to a standard customer.' });
});
