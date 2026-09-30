import { prisma } from '@/lib/prisma';
import { withApi, jsonOk, jsonError, ErrorCodes, assertSameOrigin, paginate, notFound } from '@/lib/api';
import { getRequestContext, getCurrentUser, requireAdmin } from '@/lib/auth';
import { enquiryCreateSchema, bulkEnquiryCreateSchema, enquiryUpdateSchema } from '@/lib/validators';
import { limitEnquiry } from '@/lib/rate-limit';
import { notifyEnquirySaved } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';
import { track } from '@/lib/analytics';
import { normaliseWhatsappNumber } from '@/lib/whatsapp';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
}

/* -------------------------------------------------------------------------- */
/*  POST — single enquiry                                                     */
/* -------------------------------------------------------------------------- */

export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const data = enquiryCreateSchema.parse(body);

  // Honeypot: silently accept but do not store.
  if (data.website) {
    return jsonOk({ success: true, reference: reference('ENQ') });
  }

  const ctx = await getRequestContext();
  const limit = await limitEnquiry('enquiry', ctx.ip);
  if (!limit.success) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'You have sent several enquiries already. Please try again shortly, or call us on 88923 99728.', 429);
  }

  const user = await getCurrentUser();

  const ref = reference('ENQ');
  const enquiry = await prisma.enquiry.create({
    data: {
      reference: ref,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      userType: data.userType,
      userId: user?.id ?? null,
      productId: data.productId ?? null,
      productName: data.productName ?? null,
      sku: data.sku ?? null,
      type: data.type,
      subject: data.subject ?? null,
      message: data.message,
      priceShown: data.priceShown ?? null,
      priceTier: data.priceTier ?? null,
      quantity: data.quantity ?? null,
      pageUrl: data.pageUrl ?? null,
      source: data.source ?? 'website',
    },
  });

  if (data.productId) {
    void prisma.product.update({ where: { id: data.productId }, data: { enquiryCount: { increment: 1 } } }).catch(() => undefined);
  }
  if (user && data.userType === 'RETAILER') {
    void prisma.retailerProfile.updateMany({ where: { userId: user.id }, data: { lastEnquiryAt: new Date() } }).catch(() => undefined);
  }

  void Promise.all([
    notifyEnquirySaved({
      id: enquiry.id,
      reference: enquiry.reference,
      name: enquiry.name,
      phone: enquiry.phone,
      productName: enquiry.productName,
      type: enquiry.type,
      userType: enquiry.userType,
    }),
    track({ type: 'ENQUIRY', entityType: 'Enquiry', entityId: enquiry.id, userType: data.userType }),
  ]).catch((error) => console.error('[enquiry] post-save tasks failed:', error));

  return jsonOk({ success: true, reference: ref }, undefined, 201);
});

/* -------------------------------------------------------------------------- */
/*  GET — admin list                                                          */
/* -------------------------------------------------------------------------- */

const listSchema = z.object({
  status: z.enum(['ALL', 'NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'SPAM']).default('ALL'),
  type: z.enum(['ALL', 'PRODUCT', 'GENERAL', 'BULK', 'RETAILER', 'CONTACT', 'WHOLESALE', 'WISHLIST']).default('ALL'),
  userType: z.enum(['ALL', 'CUSTOMER', 'RETAILER', 'ADMIN', 'GUEST']).default('ALL'),
  q: z.string().max(120).optional(),
  from: z.string().max(30).optional(),
  to: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).max(5000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});

export const GET = withApi(async (req: Request) => {
  await requireAdmin();

  const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return jsonError(ErrorCodes.VALIDATION, 'Invalid filter values.', 422);
  const q = parsed.data;

  const where = {
    ...(q.status !== 'ALL' && { status: q.status }),
    ...(q.type !== 'ALL' && { type: q.type }),
    ...(q.userType !== 'ALL' && { userType: q.userType }),
    ...(q.q && {
      OR: [
        { name: { contains: q.q, mode: 'insensitive' as const } },
        { phone: { contains: q.q } },
        { email: { contains: q.q, mode: 'insensitive' as const } },
        { reference: { contains: q.q, mode: 'insensitive' as const } },
        { productName: { contains: q.q, mode: 'insensitive' as const } },
        { sku: { contains: q.q, mode: 'insensitive' as const } },
      ],
    }),
    ...((q.from || q.to) && {
      createdAt: {
        ...(q.from && { gte: new Date(q.from) }),
        ...(q.to && { lte: new Date(`${q.to}T23:59:59.999Z`) }),
      },
    }),
  };

  const orderBy =
    q.sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : q.sort === 'name'
        ? { name: 'asc' as const }
        : { createdAt: 'desc' as const };

  const [total, rows] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true,
        reference: true,
        name: true,
        phone: true,
        email: true,
        userType: true,
        productId: true,
        productName: true,
        sku: true,
        type: true,
        subject: true,
        message: true,
        priceShown: true,
        priceTier: true,
        quantity: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        contactedAt: true,
        closedAt: true,
      },
    }),
  ]);

  return jsonOk(
    paginate(
      rows.map((r) => ({ ...r, phone: normaliseWhatsappNumber(r.phone), priceShown: r.priceShown ? Number(r.priceShown) : null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), contactedAt: r.contactedAt?.toISOString() ?? null, closedAt: r.closedAt?.toISOString() ?? null })),
      total,
      q.page,
      q.pageSize,
    ),
  );
});

/* -------------------------------------------------------------------------- */
/*  PATCH — update status / notes                                             */
/* -------------------------------------------------------------------------- */

export const PATCH = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const data = enquiryUpdateSchema.parse(await req.json().catch(() => null));

  const existing = await prisma.enquiry.findUnique({ where: { id: data.id }, select: { id: true, status: true, name: true } });
  if (!existing) throw notFound('Enquiry');

  const enquiry = await prisma.enquiry.update({
    where: { id: data.id },
    data: {
      ...(data.status !== undefined && {
        status: data.status,
        contactedAt: data.status !== 'NEW' && !existing.status ? new Date() : undefined,
        closedAt: data.status === 'CLOSED' ? new Date() : undefined,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId || null }),
    },
  });

  await logActivity({
    action: 'UPDATE',
    entityType: 'Enquiry',
    entityId: enquiry.id,
    entityName: enquiry.name,
    user: admin,
    metadata: { status: data.status },
  });

  return jsonOk({ id: enquiry.id, status: enquiry.status });
});

/* -------------------------------------------------------------------------- */
/*  DELETE — bulk delete                                                      */
/* -------------------------------------------------------------------------- */

const deleteSchema = z.object({ ids: z.array(z.string().cuid()).min(1).max(500) });

export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { ids } = deleteSchema.parse(await req.json().catch(() => null));

  const { count } = await prisma.enquiry.deleteMany({ where: { id: { in: ids } } });
  await logActivity({ action: 'DELETE', entityType: 'Enquiry', user: admin, metadata: { count } });

  return jsonOk({ deleted: count });
});

/* -------------------------------------------------------------------------- */
/*  Bulk enquiry (wishlist / multi-product quote)                             */
/* -------------------------------------------------------------------------- */

export const PUT = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const data = bulkEnquiryCreateSchema.parse(body);

  if (data.website) return jsonOk({ success: true, reference: reference('BLK') });

  const ctx = await getRequestContext();
  const limit = await limitEnquiry('bulk', ctx.ip);
  if (!limit.success) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'Too many bulk enquiries. Please wait a moment or call us on 88923 99728.', 429);
  }

  const user = await getCurrentUser();
  const ref = reference('BLK');

  // Verify the product ids actually exist so we store clean names.
  const ids = data.items.map((i) => i.productId).filter((v): v is string => Boolean(v));
  const products = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, sku: true } })
    : [];
  const nameById = new Map(products.map((p) => [p.id, p]));

  const bulk = await prisma.bulkEnquiry.create({
    data: {
      reference: ref,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      userId: user?.id ?? null,
      userType: data.userTypeOverride ?? (user?.isRetailer ? ('RETAILER' as const) : user ? ('CUSTOMER' as const) : ('GUEST' as const)),
      message: data.message ?? null,
      itemCount: data.items.length,
      items: {
        create: data.items.map((item) => {
          const product = item.productId ? nameById.get(item.productId) : undefined;
          return {
            productId: item.productId ?? null,
            productName: product?.name ?? item.productName,
            sku: product?.sku ?? item.sku ?? null,
            quantity: item.quantity,
            priceShown: item.priceShown ?? null,
            priceTier: item.priceTier ?? null,
          };
        }),
      },
    },
  });

  // Also create a lead-level enquiry so it appears in the main Enquiries list.
  await prisma.enquiry.create({
    data: {
      reference: ref,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      userId: user?.id ?? null,
      userType: user?.isRetailer ? 'RETAILER' : user ? 'CUSTOMER' : 'GUEST',
      type: 'BULK',
      subject: `Bulk enquiry — ${data.items.length} product(s)`,
      message: data.message ?? `Requested a wholesale quote for ${data.items.length} product(s).`,
    },
  });

  if (ids.length) {
    void prisma.product.updateMany({ where: { id: { in: ids } }, data: { enquiryCount: { increment: 1 } } }).catch(() => undefined);
  }

  void Promise.all([
    notifyEnquirySaved({
      id: bulk.id,
      reference: bulk.reference,
      name: bulk.name,
      phone: bulk.phone,
      productName: `${data.items.length} product(s)`,
      type: 'BULK',
      userType: bulk.userType,
    }),
    track({ type: 'ENQUIRY', entityType: 'BulkEnquiry', entityId: bulk.id, userType: bulk.userType, metadata: { items: data.items.length } }),
  ]).catch(() => undefined);

  return jsonOk({ success: true, reference: ref, itemCount: data.items.length }, undefined, 201);
});
