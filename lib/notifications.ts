import 'server-only';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { sendMail, renderEnquiryMail, renderRetailerMail } from '@/lib/mail';
import type { EnquiryType, UserType } from '@prisma/client';

/**
 * Notification fan-out.
 *
 * Notifications are always persisted (so the admin bell works offline / across
 * restarts). Email is best-effort: SMTP failures are logged, never surfaced to
 * the visitor, because a mail outage must not break an enquiry submission.
 */

export type NotificationKind =
  | 'NEW_ENQUIRY'
  | 'NEW_RETAILER'
  | 'RETAILER_APPROVED'
  | 'RETAILER_REJECTED'
  | 'LOW_STOCK'
  | 'NEW_REVIEW'
  | 'CONTACT_FORM'
  | 'BULK_ENQUIRY'
  | 'PRODUCT_CREATED'
  | 'SYSTEM'
  | 'SECURITY';

interface NotifyInput {
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  entityId?: string;
  entityType?: string;
  /** When present, an email is also sent to this address. */
  emailTo?: string | null;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        type: input.kind,
        title: input.title,
        body: input.body,
        link: input.link,
        priority: input.priority ?? 'NORMAL',
        entityId: input.entityId,
        entityType: input.entityType,
      },
    });
  } catch (error) {
    console.error('[notify] failed to persist notification:', (error as Error).message);
  }

  if (!input.emailTo) return;

  try {
    const settings = await getSettings();
    await sendMail({
      to: input.emailTo,
      subject: `[${settings.businessName}] ${input.title}`,
      html: renderEnquiryMail({
        businessName: settings.businessName,
        title: input.title,
        body: input.body ?? '',
        link: input.link ? `${settings.siteUrl.replace(/\/$/, '')}${input.link}` : undefined,
      }),
    });
  } catch (error) {
    console.error('[notify] email delivery failed (non-fatal):', (error as Error).message);
  }
}

export async function notifyEnquirySaved(enquiry: {
  id: string;
  reference: string;
  name: string;
  phone: string;
  productName: string | null;
  type: EnquiryType;
  userType: UserType;
}): Promise<void> {
  const isBulk = enquiry.type === 'BULK';
  const kind: NotificationKind =
    enquiry.type === 'CONTACT' ? 'CONTACT_FORM' : isBulk ? 'BULK_ENQUIRY' : 'NEW_ENQUIRY';

  const label =
    enquiry.userType === 'RETAILER' ? 'Retailer enquiry' : enquiry.userType === 'CUSTOMER' ? 'Customer enquiry' : 'Website enquiry';

  await notify({
    kind,
    title: `${label} · ${enquiry.name}`,
    body: [
      `Reference: ${enquiry.reference}`,
      `Phone: ${enquiry.phone}`,
      enquiry.productName ? `Product: ${enquiry.productName}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    link: `/admin/enquiries?highlight=${enquiry.id}`,
    priority: enquiry.userType === 'RETAILER' || isBulk ? 'HIGH' : 'NORMAL',
    entityId: enquiry.id,
    entityType: 'Enquiry',
    emailTo: process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || null,
  });
}

export async function notifyRetailerRegistration(input: {
  userId: string;
  businessName: string;
  contactName: string;
  phone: string;
  city: string;
}): Promise<void> {
  await notify({
    kind: 'NEW_RETAILER',
    title: `New retailer application · ${input.businessName}`,
    body: [
      `Contact: ${input.contactName}`,
      `Phone: ${input.phone}`,
      `City: ${input.city}`,
      'The application is awaiting your approval.',
    ].join('\n'),
    link: '/admin/retailers?status=PENDING',
    priority: 'HIGH',
    entityId: input.userId,
    entityType: 'RetailerProfile',
    emailTo: process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || null,
  });
}

export async function notifyRetailerDecision(input: {
  userId: string;
  businessName: string;
  email: string | null;
  approved: boolean;
  reason?: string | null;
}): Promise<void> {
  await notify({
    kind: input.approved ? 'RETAILER_APPROVED' : 'RETAILER_REJECTED',
    title: `Retailer ${input.approved ? 'approved' : 'rejected'} · ${input.businessName}`,
    body: input.approved
      ? `${input.businessName} can now see wholesale pricing.`
      : `${input.businessName} was rejected.${input.reason ? ` Reason: ${input.reason}` : ''}`,
    link: '/admin/retailers',
    entityId: input.userId,
    entityType: 'RetailerProfile',
  });

  if (input.email) {
    try {
      const settings = await getSettings();
      await sendMail({
        to: input.email,
        subject: `Your retailer application — ${input.approved ? 'approved' : 'under review'}`,
        html: renderRetailerMail({
          businessName: settings.businessName,
          applicantName: input.businessName,
          approved: input.approved,
          reason: input.reason ?? null,
          loginUrl: `${settings.siteUrl.replace(/\/$/, '')}/login`,
        }),
      });
    } catch (error) {
      console.error('[notify] retailer decision email failed (non-fatal):', (error as Error).message);
    }
  }
}

export async function notifyLowStock(products: Array<{ id: string; name: string; sku: string; stockQuantity: number }>): Promise<void> {
  if (products.length === 0) return;
  const lines = products.slice(0, 25).map((p) => `• ${p.name} (${p.sku}) — ${p.stockQuantity} left`);
  await notify({
    kind: 'LOW_STOCK',
    title: `${products.length} product${products.length === 1 ? '' : 's'} low on stock`,
    body: lines.join('\n'),
    link: '/admin/products?stock=LOW_STOCK',
    priority: products.length > 10 ? 'HIGH' : 'NORMAL',
    entityType: 'Product',
  });
}

export async function notifyNewReview(review: { id: string; productName: string; rating: number; authorName: string }): Promise<void> {
  await notify({
    kind: 'NEW_REVIEW',
    title: `New ${review.rating}★ review on ${review.productName}`,
    body: `${review.authorName} left a review awaiting moderation.`,
    link: '/admin/reviews?status=PENDING',
    entityId: review.id,
    entityType: 'Review',
  });
}

export async function notifySecurityEvent(title: string, body: string, ip?: string): Promise<void> {
  await notify({
    kind: 'SECURITY',
    title,
    body: [body, ip ? `IP: ${ip}` : null].filter(Boolean).join('\n'),
    link: '/admin/activity?action=SECURITY',
    priority: 'HIGH',
    entityType: 'Security',
  });
}
