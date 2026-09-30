import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

/** Accepts 10-digit Indian numbers with optional +91 / 91 prefix. */
export const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Enter a 10-digit mobile number.')
  .max(20)
  .transform((v) => v.replace(/[^\d]/g, ''))
  .refine((v) => (v.length === 10 ? /^[6-9]/.test(v) : v.length === 12 && v.startsWith('91')), {
    message: 'Enter a valid Indian mobile number.',
  })
  .transform((v) => (v.length === 10 ? `91${v}` : v));

export const optionalPhoneSchema = phoneSchema.or(z.literal('')).optional();

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

export const optionalEmailSchema = z.union([emailSchema, z.literal('')]).optional();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200, 'Password is too long.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/[0-9]/, 'Include at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Include at least one symbol.');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Please enter your full name.')
  .max(120, 'Name is too long.');

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'GSTIN must be a valid 15-character GST number.',
  );

export const optionalGstinSchema = z.union([gstinSchema, z.literal('')]).optional();

/** Money input: accepts numbers or numeric strings, rejects negatives. */
export const moneySchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v : Number.parseFloat(v.replace(/[^0-9.]/g, ''))))
  .refine((v) => Number.isFinite(v), 'Enter a valid amount.')
  .refine((v) => v >= 0, 'Amount cannot be negative.')
  .refine((v) => v <= 10_000_000, 'Amount is unrealistically large.')
  .nullable()
  .optional();

export const idSchema = z.string().cuid('Invalid identifier.');

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.');

export const hexColorSchema = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional();

export const booleanFromQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0', 'on', 'off'])])
  .transform((v) => (typeof v === 'boolean' ? v : ['true', '1', 'on'].includes(v)));

/**
 * Query-string boolean. `z.coerce.boolean()` is unusable here because
 * `Boolean("false") === true`, which would invert every `?featured=false`
 * filter in the catalogue.
 */
export const optionalBooleanFromQuery = booleanFromQuery.optional();

/** Strips unknown keys, trims strings, and rejects prototype pollution keys. */
export const safeStringArray = z
  .array(z.string().trim().min(1).max(120))
  .max(50)
  .transform((arr) => Array.from(new Set(arr)));

/* -------------------------------------------------------------------------- */
/*  Auth                                                                      */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your mobile number or email.').max(190),
  password: z.string().min(1, 'Enter your password.').max(200),
  remember: z.boolean().optional().default(false),
});

export const customerRegisterSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const retailerRegisterSchema = z
  .object({
    contactName: nameSchema,
    businessName: z.string().trim().min(2, 'Enter your shop or business name.').max(160),
    businessType: z.enum([
      'MOBILE_SHOP',
      'MOBILE_REPAIR_SHOP',
      'ACCESSORIES_DEALER',
      'ELECTRONICS_DEALER',
      'ONLINE_RESELLER',
      'DISTRIBUTOR',
      'OTHER',
    ]),
    phone: phoneSchema,
    whatsapp: optionalPhoneSchema,
    email: optionalEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    shopAddress: z.string().trim().min(8, 'Enter your full shop address.').max(400),
    city: z.string().trim().min(2, 'Enter your city.').max(80),
    state: z.string().trim().min(2, 'Enter your state.').max(80),
    pincode: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'Enter a valid 6-digit PIN code.')
      .optional()
      .or(z.literal('')),
    gstin: optionalGstinSchema,
    categoriesInterested: safeStringArray.default([]),
    monthlyVolume: z.enum(['1_500', '500_2000', '2000_10000', '10000_PLUS']).optional(),
    notes: z.string().trim().max(1000).optional(),
    // Honeypot — bots fill hidden fields.
    website: z.string().max(0).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your registered mobile number or email.').max(190),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  name: nameSchema,
  email: optionalEmailSchema,
  phone: phoneSchema,
  avatarUrl: z.string().url().or(z.literal('')).optional(),
});

export const updateRetailerBusinessSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  businessType: z.string().trim().max(60).optional(),
  whatsapp: optionalPhoneSchema,
  shopAddress: z.string().trim().min(8).max(400),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a valid 6-digit PIN code.').optional().or(z.literal('')),
  gstin: optionalGstinSchema,
  categoriesInterested: safeStringArray.default([]),
});

/* -------------------------------------------------------------------------- */
/*  Catalogue (admin)                                                         */
/* -------------------------------------------------------------------------- */

const DISCOUNT_TYPES = ['NONE', 'PERCENTAGE', 'FIXED_AMOUNT'] as const;
const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON'] as const;
const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, 'Image URL is required.').max(2000),
  thumbnailUrl: z.string().max(2000).nullish(),
  blurDataUrl: z.string().max(2000).nullish(),
  alt: z.string().trim().max(200).nullish(),
  usage: z
    .enum(['PRODUCT_MAIN', 'PRODUCT_GALLERY', 'PRODUCT_PACKAGING', 'PRODUCT_SPEC', 'PROMOTIONAL'])
    .default('PRODUCT_GALLERY'),
  isPrimary: z.boolean().default(false),
  position: z.number().int().min(0).max(999).default(0),
});

const productBaseSchema = z.object({
    name: z.string().trim().min(2, 'Product name is required.').max(200),
    slug: slugSchema.optional(),
    sku: z
      .string()
      .trim()
      .min(2, 'SKU is required.')
      .max(60)
      .regex(/^[A-Za-z0-9._\-\/]+$/, 'SKU may contain letters, numbers, dot, dash, slash and underscore.'),
    shortDescription: z.string().trim().max(400).nullish(),
    description: z.string().max(20000).nullish(),
    mrp: moneySchema,
    costPrice: moneySchema,
    customerPrice: moneySchema,
    retailerPrice: moneySchema,
    showMrp: z.boolean().default(true),
    showCustomerPrice: z.boolean().default(true),
    showRetailerPrice: z.boolean().default(true),
    showDiscount: z.boolean().default(true),
    discountType: z.enum(DISCOUNT_TYPES).default('PERCENTAGE'),
    discountValue: moneySchema,
    brandId: z.string().cuid().nullish().or(z.literal('')),
    categoryId: z.string().cuid().nullish().or(z.literal('')),
    subcategoryId: z.string().cuid().nullish().or(z.literal('')),
    supportedModels: safeStringArray.default([]),
    status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
    stockStatus: z.enum(STOCK_STATUSES).default('IN_STOCK'),
    stockQuantity: z.coerce.number().int().min(0).max(1_000_000).default(0),
    lowStockThreshold: z.coerce.number().int().min(0).max(10_000).default(5),
    minimumOrderQty: z.coerce.number().int().min(1).max(10_000).default(1),
    minimumWholesaleQty: z.coerce.number().int().min(1).max(100_000).default(1),
    wholesaleOnly: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isNewArrival: z.boolean().default(true),
    isWholesaleDeal: z.boolean().default(false),
    badge: z.string().trim().max(40).nullish(),
    position: z.coerce.number().int().min(0).max(9999).default(0),
    seoTitle: z.string().trim().max(200).nullish(),
    seoDescription: z.string().trim().max(400).nullish(),
    seoKeywords: z.string().trim().max(500).nullish(),
    ogImageUrl: z.string().max(2000).nullish(),
    searchKeywords: z.string().trim().max(1000).nullish(),
    isDemo: z.boolean().default(false),
    images: z.array(productImageSchema).max(20).default([]),
});

function refineProductPricing(
  data: { mrp?: number | null; customerPrice?: number | null; retailerPrice?: number | null },
  ctx: z.RefinementCtx,
): void {
  if (data.mrp == null && data.customerPrice == null && data.retailerPrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customerPrice'],
      message: 'Set at least one of MRP, customer price or retailer price.',
    });
  }
  if (data.retailerPrice != null && data.customerPrice != null && data.retailerPrice > data.customerPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['retailerPrice'],
      message: 'Retailer price must be lower than the customer price.',
    });
  }
  if (data.mrp != null && data.customerPrice != null && data.customerPrice > data.mrp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mrp'],
      message: 'MRP cannot be lower than the customer price.',
    });
  }
}

export const productCreateSchema = productBaseSchema.superRefine(refineProductPricing);

export const productUpdateSchema = productBaseSchema
  .partial()
  .extend({ id: idSchema })
  .superRefine((data, ctx) => {
    // Only cross-check the price relationship when a partial update actually
    // supplies the fields involved.
    if (data.mrp == null && data.customerPrice == null && data.retailerPrice == null) return;
    refineProductPricing(data, ctx);
  });

export const bulkProductActionSchema = z.object({
  ids: z.array(idSchema).min(1, 'Select at least one product.').max(500),
  action: z.enum(['publish', 'unpublish', 'archive', 'delete', 'feature', 'unfeature', 'best_seller', 'clear_best_seller', 'new_arrival', 'clear_new_arrival', 'set_category', 'set_stock_status']),
  value: z.string().max(200).optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Category name is required.').max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).nullish(),
  shortDescription: z.string().trim().max(300).nullish(),
  icon: z.string().trim().max(60).nullish(),
  imageUrl: z.string().max(2000).nullish(),
  thumbnailUrl: z.string().max(2000).nullish(),
  parentId: z.string().cuid().nullish().or(z.literal('')),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  showInNav: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  seoTitle: z.string().trim().max(200).nullish(),
  seoDescription: z.string().trim().max(400).nullish(),
  seoKeywords: z.string().trim().max(500).nullish(),
  ogImageUrl: z.string().max(2000).nullish(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial().extend({ id: idSchema });

export const categoryReorderSchema = z.object({
  items: z.array(z.object({ id: idSchema, position: z.number().int().min(0) })).min(1),
});

export const brandCreateSchema = z.object({
  name: z.string().trim().min(1, 'Brand name is required.').max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).nullish(),
  logoUrl: z.string().max(2000).nullish(),
  website: z.string().url('Enter a valid URL.').nullish().or(z.literal('')),
  country: z.string().trim().max(80).nullish(),
  isPartner: z.boolean().default(false),
  isActive: z.boolean().default(true),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  seoTitle: z.string().trim().max(200).nullish(),
  seoDescription: z.string().trim().max(400).nullish(),
});

export const brandUpdateSchema = brandCreateSchema.partial().extend({ id: idSchema });

export const variantCreateSchema = z
  .object({
    productId: idSchema,
    name: z.string().trim().min(1).max(160),
    sku: z.string().trim().max(60).nullish(),
    optionKey: z.string().trim().max(60).nullish(),
    optionValue: z.string().trim().max(60).nullish(),
    mrp: moneySchema,
    customerPrice: moneySchema,
    retailerPrice: moneySchema,
    costPrice: moneySchema,
    stockQuantity: z.coerce.number().int().min(0).default(0),
    stockStatus: z.enum(STOCK_STATUSES).default('IN_STOCK'),
    position: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine((d) => d.sku == null || d.sku === '' || /^[A-Za-z0-9._\-\/]+$/.test(d.sku), {
    message: 'SKU may contain letters, numbers, dot, dash, slash and underscore.',
    path: ['sku'],
  });

/* -------------------------------------------------------------------------- */
/*  Enquiries / leads                                                         */
/* -------------------------------------------------------------------------- */

export const enquiryCreateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  userType: z.enum(['CUSTOMER', 'RETAILER', 'ADMIN', 'GUEST']).default('GUEST'),
  productId: idSchema.optional(),
  productName: z.string().trim().max(200).optional(),
  sku: z.string().trim().max(60).optional(),
  type: z.enum(['PRODUCT', 'GENERAL', 'BULK', 'RETAILER', 'CONTACT', 'WHOLESALE', 'WISHLIST']).default('GENERAL'),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(3, 'Please add a short message.').max(2000),
  priceShown: z.coerce.number().min(0).nullable().optional(),
  priceTier: z.enum(['retail', 'wholesale']).optional(),
  quantity: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  pageUrl: z.string().max(500).optional(),
  source: z.string().max(60).optional(),
  // Honeypot
  website: z.string().max(0).optional(),
});

export const bulkEnquiryCreateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  items: z
    .array(
      z.object({
        productId: idSchema.optional(),
        productName: z.string().trim().min(1).max(200),
        sku: z.string().trim().max(60).nullish(),
        quantity: z.coerce.number().int().min(1).max(100000).default(1),
        priceShown: z.coerce.number().min(0).nullish(),
        priceTier: z.enum(['retail', 'wholesale']).nullish(),
      }),
    )
    .min(1, 'Select at least one product.')
    .max(100),
  message: z.string().trim().max(2000).optional(),
  userTypeOverride: z.enum(['CUSTOMER', 'RETAILER', 'ADMIN', 'GUEST']).optional(),
  website: z.string().max(0).optional(),
});

export const contactFormSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  customerType: z.enum(['CUSTOMER', 'RETAILER', 'ADMIN', 'GUEST']).default('CUSTOMER'),
  subject: z.enum([
    'GENERAL',
    'PRODUCT_ENQUIRY',
    'WHOLESALE',
    'RETAILER_ONBOARDING',
    'ORDER_STATUS',
    'COMPLAINT',
    'OTHER',
  ]),
  message: z.string().trim().min(10, 'Please tell us a little more.').max(4000),
  website: z.string().max(0).optional(),
});

export const enquiryUpdateSchema = z.object({
  id: idSchema,
  status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'SPAM']).optional(),
  notes: z.string().max(5000).optional(),
  assignedToId: z.string().cuid().nullish().or(z.literal('')),
});

/* -------------------------------------------------------------------------- */
/*  Retailers                                                                 */
/* -------------------------------------------------------------------------- */

export const retailerUpdateSchema = z.object({
  id: idSchema,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  rejectionReason: z.string().max(1000).nullish(),
  notes: z.string().max(5000).nullish(),
  documentUrl: z.string().max(2000).nullish(),
});

/* -------------------------------------------------------------------------- */
/*  Reviews / CMS                                                             */
/* -------------------------------------------------------------------------- */

export const reviewCreateSchema = z.object({
  productId: idSchema,
  authorName: nameSchema,
  authorEmail: optionalEmailSchema,
  rating: z.coerce.number().int().min(1, 'Choose a rating.').max(5),
  title: z.string().trim().max(160).nullish(),
  body: z.string().trim().min(10, 'Please write at least 10 characters.').max(2000),
  // Honeypot
  website: z.string().max(0).optional(),
});

export const reviewModerateSchema = z.object({
  id: idSchema,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM']),
  adminReply: z.string().max(2000).nullish(),
});

export const bannerCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(300).nullish(),
  eyebrow: z.string().trim().max(60).nullish(),
  imageUrl: z.string().max(2000).nullish(),
  mobileImageUrl: z.string().max(2000).nullish(),
  ctaLabel: z.string().trim().max(60).nullish(),
  ctaUrl: z.string().trim().max(500).nullish(),
  secondaryCtaLabel: z.string().trim().max(60).nullish(),
  secondaryCtaUrl: z.string().trim().max(500).nullish(),
  position: z.enum(['HOME_HERO', 'HOME_MID', 'HOME_BOTTOM', 'CATEGORY']).default('HOME_HERO'),
  placement: z.enum(['FULL', 'CONTAINER', 'HALF', 'SIDEBAR']).default('FULL'),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  theme: z.enum(['dark', 'light']).default('dark'),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const bannerUpdateSchema = bannerCreateSchema.partial().extend({ id: idSchema });

export const faqCreateSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(5000),
  category: z.string().trim().max(60).default('GENERAL'),
  position: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  showInSchema: z.boolean().default(true),
});

export const faqUpdateSchema = faqCreateSchema.partial().extend({ id: idSchema });

export const testimonialCreateSchema = z.object({
  name: nameSchema,
  designation: z.string().trim().max(120).nullish(),
  businessName: z.string().trim().max(160).nullish(),
  city: z.string().trim().max(80).nullish(),
  avatarUrl: z.string().max(2000).nullish(),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  body: z.string().trim().min(10).max(2000),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  position: z.coerce.number().int().min(0).max(999).default(0),
});

export const testimonialUpdateSchema = testimonialCreateSchema.partial().extend({ id: idSchema });

export const pageCreateSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().max(500).nullish(),
  content: z.string().max(200000).default(''),
  coverImageUrl: z.string().max(2000).nullish(),
  template: z.enum(['RICH_TEXT', 'CUSTOM']).default('RICH_TEXT'),
  isPublished: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  seoTitle: z.string().trim().max(200).nullish(),
  seoDescription: z.string().trim().max(400).nullish(),
  seoKeywords: z.string().trim().max(500).nullish(),
  ogImageUrl: z.string().max(2000).nullish(),
});

export const pageUpdateSchema = pageCreateSchema.partial().extend({ id: idSchema });

export const couponCreateSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(24).regex(/^[A-Z0-9_-]+$/, 'Use letters, numbers, dash and underscore only.'),
  description: z.string().trim().max(300).nullish(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
  value: z.coerce.number().min(0, 'Enter a value.').max(1000000),
  minOrderValue: moneySchema,
  minQuantity: z.coerce.number().int().min(1).max(100000).nullish(),
  maxDiscount: moneySchema,
  usageLimit: z.coerce.number().int().min(1).max(1000000).nullish(),
  perUserLimit: z.coerce.number().int().min(1).max(10000).nullish(),
  startsAt: z.coerce.date().nullish(),
  expiresAt: z.coerce.date().nullish(),
  applicableTo: z.enum(['ALL', 'RETAILER', 'CUSTOMER']).default('ALL'),
  isActive: z.boolean().default(true),
});

/* -------------------------------------------------------------------------- */
/*  Settings                                                                  */
/* -------------------------------------------------------------------------- */

const businessHourSchema = z.object({
  day: z.string().min(2).max(20),
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM.'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM.'),
  closed: z.boolean().default(false),
  label: z.string().max(30).optional(),
});

const socialLinkSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'whatsapp', 'youtube', 'x', 'linkedin', 'telegram']),
  label: z.string().trim().min(1).max(60),
  url: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((v) => v.startsWith('http') || v.startsWith('https://wa.me'), 'Enter a valid URL.'),
  icon: z.string().max(40).nullish(),
  position: z.coerce.number().int().min(0).max(99).default(0),
  isActive: z.boolean().default(true),
});

export const settingsUpdateSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(200),
  ownerName: z.string().trim().max(120),
  logoUrl: z.string().max(2000).nullish(),
  logoAltText: z.string().max(200).nullish(),
  faviconUrl: z.string().max(2000).nullish(),
  ogImageUrl: z.string().max(2000).nullish(),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number.'),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, 'Enter digits only, e.g. 918892399728.'),
  email: optionalEmailSchema,
  alternatePhone: z.string().trim().max(20).nullish(),
  addressLine1: z.string().trim().max(200),
  addressLine2: z.string().trim().max(200).nullish(),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a valid PIN code.'),
  country: z.string().trim().max(80),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
  googleMapsUrl: z.string().max(1000).nullish(),
  googleMapsEmbedUrl: z.string().max(1000).nullish(),
  gstin: gstinSchema,
  businessHours: z.array(businessHourSchema).max(14).optional(),
  currencyCode: z.string().trim().length(3).default('INR'),
  currencySymbol: z.string().trim().min(1).max(4).default('₹'),
  retailerPricingEnabled: z.boolean().default(true),
  wholesaleLandingEnabled: z.boolean().default(true),
  showCostPriceToAdminOnly: z.boolean().default(true),
  allowGuestWishlist: z.boolean().default(true),
  requireApprovalForRetailer: z.boolean().default(true),
  enableReviews: z.boolean().default(true),
  enableAnalytics: z.boolean().default(true),
  enablePwa: z.boolean().default(true),
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().max(500).nullish(),
  seoTitle: z.string().trim().max(200).nullish(),
  seoDescription: z.string().trim().max(400).nullish(),
  seoKeywords: z.string().max(500).nullish(),
  twitterHandle: z.string().max(30).nullish(),
  footerAbout: z.string().max(1000).nullish(),
  footerCopyright: z.string().max(300).nullish(),
  socialLinks: z.array(socialLinkSchema).max(12).optional(),
  analyticsSnippet: z.string().max(20000).nullish(),
  customHead: z.string().max(20000).nullish(),
  customBodyEnd: z.string().max(20000).nullish(),
});

/* -------------------------------------------------------------------------- */
/*  Wishlist / media / analytics                                              */
/* -------------------------------------------------------------------------- */

export const wishlistToggleSchema = z.object({
  productId: idSchema,
});

export const wishlistRemoveSchema = z.object({
  productIds: z.array(idSchema).min(1).max(200),
});

export const mediaUploadMetaSchema = z.object({
  usage: z
    .enum([
      'PRODUCT_MAIN',
      'PRODUCT_GALLERY',
      'PRODUCT_PACKAGING',
      'PRODUCT_SPEC',
      'PROMOTIONAL',
      'CATEGORY',
      'BANNER',
      'BRAND',
      'BRAND_LOGO',
      'AVATAR',
      'GENERAL',
      'OG',
    ])
    .default('GENERAL'),
  alt: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  folder: z.string().trim().max(60).default('general'),
  productId: z.string().cuid().optional(),
});

export const trackEventSchema = z.object({
  type: z.enum([
    'PAGE_VIEW',
    'PRODUCT_VIEW',
    'CATEGORY_VIEW',
    'SEARCH',
    'WHATSAPP_CLICK',
    'CALL_CLICK',
    'ENQUIRY',
    'RETAILER_REGISTER',
    'PRODUCT_COMPARE',
  ]),
  entityType: z.string().max(40).optional(),
  entityId: z.string().max(64).optional(),
  path: z.string().max(500).optional(),
  query: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/* -------------------------------------------------------------------------- */
/*  CSV import                                                                */
/* -------------------------------------------------------------------------- */

export const CSV_COLUMNS = [
  'name',
  'sku',
  'brand',
  'category',
  'description',
  'mrp',
  'customer_price',
  'retailer_price',
  'stock',
  'status',
] as const;

export const csvRowSchema = z.object({
  name: z.string().trim().min(2, 'name is required').max(200),
  sku: z.string().trim().min(2, 'sku is required').max(60),
  brand: z.string().trim().max(120).default(''),
  category: z.string().trim().max(120).default(''),
  description: z.string().trim().max(2000).default(''),
  mrp: z.coerce.number().min(0).nullable().default(null),
  customer_price: z.coerce.number().min(0).nullable().default(null),
  retailer_price: z.coerce.number().min(0).nullable().default(null),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'COMING_SOON']).default('IN_STOCK'),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
