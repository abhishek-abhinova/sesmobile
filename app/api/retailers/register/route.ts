import { hashPassword, getRequestContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withApi, jsonError, jsonOk, ErrorCodes, assertSameOrigin } from '@/lib/api';
import { retailerRegisterSchema } from '@/lib/validators';
import { limitMutation } from '@/lib/rate-limit';
import { notifyRetailerRegistration } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';
import { track } from '@/lib/analytics';
import { getSettings } from '@/lib/settings';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Approved retailers are able to browse the wholesale catalogue. */
export const GET = withApi(async () => {
  const settings = await getSettings();
  const categories = await prisma.category.findMany({
    where: { isActive: true, showInNav: true },
    select: { id: true, name: true, slug: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });

  return jsonOk({
    retailerPricingEnabled: settings.retailerPricingEnabled,
    requireApproval: settings.requireApprovalForRetailer,
    categories,
  });
});

export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const data = retailerRegisterSchema.parse(body);

  // Honeypot
  if (data.website) {
    return jsonOk({ success: true, message: 'Thank you. Your application has been received.' }, undefined, 201);
  }

  const ctx = await getRequestContext();
  const limit = await limitMutation(`retailer-register:${ctx.ip}`, 5, 60 * 60_000);
  if (!limit.success) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'Too many applications from this device. Please try again later or call us on 88923 99728.', 429);
  }

  const phone = data.phone;
  const whatsapp = data.whatsapp || phone;

  const duplicateChecks: Prisma.UserWhereInput[] = [{ phone }];
  if (data.email) duplicateChecks.push({ email: data.email });

  const existing = await prisma.user.findFirst({
    where: { OR: duplicateChecks },
    select: { id: true, role: true, email: true, retailerProfile: { select: { status: true, businessName: true } } },
  });

  if (existing) {
    if (existing.role === 'RETAILER' && existing.retailerProfile) {
      const message =
        existing.retailerProfile.status === 'PENDING'
          ? 'Your application is already under review. We will contact you shortly.'
          : 'You already have a retailer account. Please sign in instead.';
      return jsonError(ErrorCodes.CONFLICT, message, 409, { fieldErrors: { phone: [message] } });
    }
    // Point the user at whichever field actually collides.
    const emailClash = Boolean(data.email) && existing.email === data.email;
    return jsonError(
      ErrorCodes.CONFLICT,
      'An account already exists with that mobile number or email. Please sign in instead.',
      409,
      { fieldErrors: { [emailClash ? 'email' : 'phone']: ['Already registered. Please sign in instead.'] } },
    );
  }

  const settings = await getSettings();
  const status = settings.requireApprovalForRetailer ? ('PENDING' as const) : ('APPROVED' as const);

  const user = await prisma.user.create({
    data: {
      name: data.contactName,
      email: data.email || null,
      phone,
      passwordHash: await hashPassword(data.password),
      role: 'RETAILER',
      status,
      retailerProfile: {
        create: {
          businessName: data.businessName,
          contactName: data.contactName,
          businessType: data.businessType,
          phone,
          whatsapp,
          email: data.email || null,
          shopAddress: data.shopAddress,
          city: data.city,
          state: data.state,
          pincode: data.pincode || null,
          gstin: data.gstin || null,
          categoriesInterested: data.categoriesInterested,
          monthlyVolume: data.monthlyVolume ?? null,
          notes: data.notes ?? null,
          status,
          approvedAt: status === 'APPROVED' ? new Date() : null,
        },
      },
    },
    include: { retailerProfile: true },
  });

  await logActivity({
    action: 'CREATE',
    entityType: 'RetailerProfile',
    entityId: user.retailerProfile?.id ?? user.id,
    entityName: data.businessName,
    metadata: { status, city: data.city, gstin: data.gstin ?? null },
  });

  void Promise.all([
    notifyRetailerRegistration({
      userId: user.id,
      businessName: data.businessName,
      contactName: data.contactName,
      phone,
      city: data.city,
    }),
    track({ type: 'RETAILER_REGISTER', entityType: 'User', entityId: user.id, userType: 'RETAILER' }),
  ]).catch(() => undefined);

  return jsonOk(
    {
      success: true,
      status,
      message:
        status === 'PENDING'
          ? 'Thank you. Your retailer application has been received and is awaiting approval. We will contact you on WhatsApp shortly.'
          : 'Welcome! Your retailer account is active. Sign in to view wholesale pricing.',
    },
    undefined,
    201,
  );
});
