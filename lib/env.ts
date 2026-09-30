import { z } from 'zod';

/**
 * Validated, lazily-evaluated server environment.
 *
 * Nothing here is bundled to the client, so secrets stay server-side.
 * `serverEnv` is only imported from route handlers / server components.
 */

const requiredString = (fallback: string) =>
  z.string().min(1).default(fallback);

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const intish = (fallback: number) =>
  z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'number' ? v : Number.parseInt(v, 10) || fallback));

const schema = z.object({
  DATABASE_URL: requiredString('postgresql://localhost:5432/ses?schema=public'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('S.E.S Mobile World'),

  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  AUTH_TOKEN_TTL_HOURS: intish(168),
  NEXT_PUBLIC_AUTH_MAX_AGE_HOURS: intish(168),
  ADMIN_EMAIL: z.string().default('owner@sesmobileworld.in'),
  SEED_ADMIN_PASSWORD: z.string().default(''),

  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().default('918892399728'),
  BUSINESS_PHONE: z.string().default('+918892399728'),
  BUSINESS_GSTIN: z.string().default('29HYBR57857HI2J'),
  BUSINESS_OWNER: z.string().default('Md. Saif'),
  GOOGLE_MAPS_URL: z.string().default(''),
  GOOGLE_MAPS_EMBED_URL: z.string().default(''),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_FOLDER: z.string().default('ses-mobile-world'),
  NEXT_PUBLIC_MEDIA_PROVIDER: z.enum(['local', 'cloudinary', 's3']).default('local'),
  MAX_UPLOAD_SIZE_MB: intish(8),

  SMTP_ENABLED: boolish.default(false),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: intish(587),
  SMTP_SECURE: boolish.default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('S.E.S Mobile World'),
  SMTP_FROM_EMAIL: z.string().default('no-reply@sesmobileworld.in'),
  ADMIN_NOTIFY_EMAIL: z.string().default(''),
  RETAILER_NOTIFY_EMAIL: z.string().default(''),

  RATE_LIMIT_ENABLED: boolish.default(true),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: intish(5),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: intish(15),
  ENQUIRY_RATE_LIMIT_MAX_ATTEMPTS: intish(10),
  ENQUIRY_RATE_LIMIT_WINDOW_MINUTES: intish(10),

  ANALYTICS_ENABLED: boolish.default(true),
  ANALYTICS_RETENTION_DAYS: intish(365),

  GOOGLE_ANALYTICS_ID: z.string().default(''),
  GOOGLE_TAG_MANAGER_ID: z.string().default(''),

  DISABLE_INDEXING: boolish.default(false),
  TRUST_PROXY: intish(1),
});

let cached: z.infer<typeof schema> | null = null;

export function getServerEnv() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid server environment configuration:\n${issues}\n\n` +
        'Copy .env.example to .env and fill in the required values.',
    );
  }
  cached = parsed.data;
  return cached;
}

/** Non-throwing variant for places that must boot even with partial config. */
export function getPublicEnv() {
  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? 'S.E.S Mobile World',
    whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '918892399728').replace(/\D/g, ''),
    mapsEmbedUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ?? process.env.GOOGLE_MAPS_EMBED_URL ?? '',
    authMaxAgeHours: Number.parseInt(process.env.NEXT_PUBLIC_AUTH_MAX_AGE_HOURS ?? '168', 10),
  };
}

export const env = new Proxy({} as z.infer<typeof schema>, {
  get(_target, prop: string) {
    return getServerEnv()[prop as keyof z.infer<typeof schema>];
  },
});
