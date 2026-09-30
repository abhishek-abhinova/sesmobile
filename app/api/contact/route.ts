import { prisma } from '@/lib/prisma';
import { getRequestContext, getCurrentUser } from '@/lib/auth';
import { withApi, jsonError, jsonOk, ErrorCodes, assertSameOrigin } from '@/lib/api';
import { contactFormSchema } from '@/lib/validators';
import { limitEnquiry } from '@/lib/rate-limit';
import { notifyEnquirySaved } from '@/lib/notifications';
import { logActivity } from '@/lib/activity';
import { track } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const data = contactFormSchema.parse(body);

  if (data.website) {
    return jsonOk({ success: true, reference: 'OK' }, undefined, 201);
  }

  const ctx = await getRequestContext();
  const limit = await limitEnquiry('contact', ctx.ip);
  if (!limit.success) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'You have sent several messages already. Please try again shortly, or call 88923 99728.', 429);
  }

  const user = await getCurrentUser();
  const reference = `MSG-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).toUpperCase().slice(2, 5)}`;

  const submission = await prisma.contactSubmission.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      customerType: data.customerType,
      subject: data.subject,
      message: data.message,
      userId: user?.id ?? null,
      ipAddress: ctx.ip === '0.0.0.0' ? null : ctx.ip,
      userAgent: ctx.userAgent || null,
    },
  });

  // Mirror into the Enquiries table so every lead lives in one place.
  await prisma.enquiry.create({
    data: {
      reference,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      userType: data.customerType,
      userId: user?.id ?? null,
      type: 'CONTACT',
      subject: data.subject,
      message: data.message,
      source: 'contact-form',
    },
  });

  void Promise.all([
    notifyEnquirySaved({
      id: submission.id,
      reference,
      name: data.name,
      phone: data.phone,
      productName: null,
      type: 'CONTACT',
      userType: data.customerType,
    }),
    track({ type: 'ENQUIRY', entityType: 'ContactSubmission', entityId: submission.id, userType: data.customerType, metadata: { subject: data.subject } }),
  ]).catch(() => undefined);

  await logActivity({ action: 'CREATE', entityType: 'ContactSubmission', entityId: submission.id, entityName: data.name, metadata: { subject: data.subject } });

  return jsonOk(
    {
      success: true,
      reference,
      message: 'Thank you. Your message has been received — we will get back to you shortly.',
    },
    undefined,
    201,
  );
});
