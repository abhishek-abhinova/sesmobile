/**
 * WhatsApp + tel: integration.
 *
 * WhatsApp is the primary conversion channel for S.E.S Mobile World, so every
 * message is pre-composed and encoded here to keep the flow consistent.
 * This module is isomorphic (no server-only imports) so client components can
 * build the same URLs the server would.
 */

const DEFAULT_WHATSAPP = '918892399728';
const DEFAULT_PHONE = '+918892399728';

export function normaliseWhatsappNumber(value: string | null | undefined): string {
  const raw = (value ?? '').replace(/\D/g, '');
  if (!raw) return DEFAULT_WHATSAPP;
  // Strip leading 00 and add 91 if a bare 10-digit Indian number was supplied.
  const trimmed = raw.replace(/^00/, '');
  if (trimmed.length === 10) return `91${trimmed}`;
  return trimmed;
}

export function normalisePhone(value: string | null | undefined): string {
  const raw = (value ?? '').replace(/[^\d+]/g, '');
  if (!raw) return DEFAULT_PHONE;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}

export interface WhatsAppProductContext {
  name: string;
  sku?: string | null;
  slug?: string | null;
  price?: number | null;
  priceLabel?: string;
  tier?: 'retail' | 'wholesale';
  quantity?: number | null;
  url?: string | null;
}

export interface WhatsAppContext {
  whatsappNumber?: string | null;
  siteUrl?: string | null;
  businessName?: string | null;
}

const ctxNumber = (c: WhatsAppContext) => normaliseWhatsappNumber(c.whatsappNumber);

export function buildWhatsAppUrl(message: string, ctx: WhatsAppContext = {}): string {
  return `https://wa.me/${ctxNumber(ctx)}?text=${encodeURIComponent(message)}`;
}

export function buildCallUrl(phone: string | null | undefined): string {
  return `tel:${normalisePhone(phone)}`;
}

const siteName = (c: WhatsAppContext) => c.businessName ?? 'S.E.S Mobile World';

/** Generic greeting used by the floating button and header CTA. */
export function generalEnquiryMessage(ctx: WhatsAppContext = {}): string {
  return [
    `Hello ${siteName(ctx)},`,
    'I would like to know more about your wholesale and retail products.',
    'Please share your product catalogue and pricing.',
  ].join('\n');
}

/** Product-specific enquiry, auto-filled with the fields the user can see. */
export function productEnquiryMessage(
  product: WhatsAppProductContext,
  ctx: WhatsAppContext = {},
): string {
  const lines = [
    `Hello ${siteName(ctx)}, I am interested in:`,
    '',
    `Product: ${product.name}`,
  ];

  if (product.sku) lines.push(`SKU: ${product.sku}`);
  if (product.quantity && product.quantity > 0) lines.push(`Quantity: ${product.quantity}`);
  if (product.price != null && product.priceLabel) {
    lines.push(`${product.priceLabel}: ₹${product.price}`);
  }

  lines.push('', 'Please share availability and details.');

  if (product.url && ctx.siteUrl) {
    lines.push('', `Link: ${ctx.siteUrl.replace(/\/$/, '')}${product.url}`);
  }

  return lines.join('\n');
}

export interface BulkItem extends WhatsAppProductContext {
  quantity: number;
}

/** Multi-product enquiry generated from the wishlist / bulk enquiry cart. */
export function bulkEnquiryMessage(
  items: BulkItem[],
  ctx: WhatsAppContext = {},
  extra?: { name?: string; note?: string },
): string {
  const header = [
    `Hello ${siteName(ctx)},`,
    'I would like a wholesale quote for the following products:',
    '',
  ];

  const body = items.map((item, index) => {
    const parts = [`${index + 1}. ${item.name}`];
    if (item.sku) parts.push(`   SKU: ${item.sku}`);
    const qty = item.quantity > 0 ? `   Qty: ${item.quantity}` : null;
    if (qty) parts.push(qty);
    return parts.join('\n');
  });

  const footer = [
    '',
    extra?.name ? `Name: ${extra.name}` : null,
    extra?.note ? `Note: ${extra.note}` : null,
    '',
    'Please share the best wholesale pricing and availability.',
  ].filter((line): line is string => line !== null);

  return [...header, ...body, ...footer].join('\n');
}

export function retailerEnquiryMessage(ctx: WhatsAppContext = {}, businessName?: string): string {
  return [
    `Hello ${siteName(ctx)},`,
    '',
    'I run a mobile accessories / spare parts business and I am interested in becoming a retail partner.',
    businessName ? `Business: ${businessName}` : null,
    '',
    'Please share your retailer (wholesale) pricing, minimum order quantity and dealer terms.',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

export function contactMessage(
  ctx: WhatsAppContext = {},
  subject?: string,
): string {
  return [
    `Hello ${siteName(ctx)},`,
    subject ? `Regarding: ${subject}` : null,
    '',
    'I have a question about your products.',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

/** Full click-through URLs. */
export const whatsapp = {
  general: (ctx?: WhatsAppContext) => buildWhatsAppUrl(generalEnquiryMessage(ctx), ctx),
  product: (p: WhatsAppProductContext, ctx?: WhatsAppContext) =>
    buildWhatsAppUrl(productEnquiryMessage(p, ctx), ctx),
  bulk: (items: BulkItem[], ctx?: WhatsAppContext, extra?: { name?: string; note?: string }) =>
    buildWhatsAppUrl(bulkEnquiryMessage(items, ctx, extra), ctx),
  retailer: (ctx?: WhatsAppContext, businessName?: string) =>
    buildWhatsAppUrl(retailerEnquiryMessage(ctx, businessName), ctx),
  contact: (ctx?: WhatsAppContext, subject?: string) =>
    buildWhatsAppUrl(contactMessage(ctx, subject), ctx),
};
