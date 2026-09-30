/**
 * Database seed.
 *
 * 1. Ensures the single `site_settings` row exists and points at the real logo.
 * 2. Imports every photo produced by `npm run images` as a product:
 *    - product photos  -> a DRAFT product with the photo attached as its
 *      primary image and a SKU derived from the file name. Names, prices,
 *      brands and categories are intentionally left empty so nothing is
 *      invented; fill them in Admin > Products > Bulk edit (or the CSV
 *      import) and the product goes live.
 *    - landscape shots -> banner records for the homepage hero.
 * 3. Registers every file in the media library.
 *
 * Safe to re-run: existing products/banners are matched by SKU/slug.
 * Run with: npm run db:seed
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, MediaUsage, MediaKind, BannerPlacement, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'public', 'images', 'manifest.json');
const LOGO = '/images/logo-256.webp';

type ManifestImage = {
  slug: string;
  file: string;
  kind: 'product' | 'banner';
  width?: number;
  height?: number;
  path: string;
  thumb?: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const humanName = (slug: string, index: number) =>
  `Photo ${String(index + 1).padStart(2, '0')} (${slug.replace('wa-', '#')}) - add name`;

async function readManifest(): Promise<ManifestImage[]> {
  try {
    const raw = await readFile(MANIFEST, 'utf8');
    const parsed = JSON.parse(raw) as { images?: ManifestImage[] };
    return Array.isArray(parsed.images) ? parsed.images : [];
  } catch {
    console.warn('No image manifest found - run `npm run images` first.');
    return [];
  }
}

async function fileSize(urlPath: string): Promise<number | undefined> {
  try {
    const info = await stat(path.join(ROOT, 'public', urlPath.replace(/^\//, '')));
    return info.size;
  } catch {
    return undefined;
  }
}

async function seedSettings() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: { logoUrl: LOGO, faviconUrl: '/icon.png', ogImageUrl: '/images/og-default.png' },
    create: {
      id: 'default',
      logoUrl: LOGO,
      faviconUrl: '/icon.png',
      ogImageUrl: '/images/og-default.png',
    },
  });
  console.log(`settings   logo -> ${settings.logoUrl}`);
  return settings;
}

async function seedProducts(images: ManifestImage[]) {
  const productImages = images.filter((image) => image.kind === 'product');

  for (const [index, image] of productImages.entries()) {
    const sku = `SES-WA${image.slug.replace('wa-', '')}`;
    const slug = `pending-${image.slug}`;
    const bytes = await fileSize(image.path);

    const product = await prisma.product.upsert({
      where: { sku },
      update: { ogImageUrl: image.path },
      create: {
        name: humanName(image.slug, index),
        slug,
        sku,
        shortDescription: 'Add a short description in Admin > Bulk edit.',
        status: ProductStatus.DRAFT,
        isNewArrival: false,
        stockQuantity: 0,
        position: index,
        ogImageUrl: image.path,
        searchKeywords: 'pending, photo, add details',
        seoDescription: 'Add SEO description in Admin > Bulk edit.',
      },
    });

    const existing = await prisma.productImage.findFirst({ where: { productId: product.id } });
    if (!existing) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: image.path,
          thumbnailUrl: image.thumb ?? null,
          alt: product.name,
          isPrimary: true,
          width: image.width ?? null,
          height: image.height ?? null,
          bytes: bytes ?? null,
        },
      });
    }

    await prisma.mediaAsset.upsert({
      where: { id: `seed-${image.slug}` },
      update: {},
      create: {
        id: `seed-${image.slug}`,
        filename: path.basename(image.path),
        originalName: image.file,
        url: image.path,
        thumbnailUrl: image.thumb ?? null,
        mimeType: 'image/webp',
        kind: MediaKind.IMAGE,
        usage: MediaUsage.PRODUCT_MAIN,
        width: image.width ?? null,
        height: image.height ?? null,
        bytes: bytes ?? 0,
        folder: 'products',
        productId: product.id,
        tags: ['phone-photo', 'pending-details'],
        isOptimized: true,
      },
    });

    console.log(`product    ${sku.padEnd(10)} ${image.path} (DRAFT)`);
  }

  return productImages.length;
}

async function seedBanners(images: ManifestImage[]) {
  const banners = images.filter((image) => image.kind === 'banner');
  const slots = ['HOME_HERO', 'HOME_MID', 'HOME_BOTTOM'] as const;

  for (const [index, image] of banners.entries()) {
    const slug = `seed-banner-${image.slug}`;
    const existing = await prisma.banner.findFirst({ where: { imageUrl: image.path } });
    if (existing) {
      console.log(`banner     ${image.path} (already present)`);
      continue;
    }

    await prisma.banner.create({
      data: {
        title: 'S.E.S Mobile World',
        subtitle: 'Wholesale mobile spare parts, accessories and electronics',
        imageUrl: image.path,
        position: slots[index] ?? 'HOME_MID',
        placement: BannerPlacement.FULL,
        ctaLabel: 'Browse products',
        ctaUrl: '/products',
        secondaryCtaLabel: 'Become a retailer',
        secondaryCtaUrl: '/retailer/register',
        sortOrder: index,
        isActive: index === 0,
      },
    });
    console.log(`banner     ${image.path} -> ${slug}`);
  }

  return banners.length;
}

async function main() {
  const images = await readManifest();
  await seedSettings();
  const products = await seedProducts(images);
  const banners = await seedBanners(images);

  console.log(
    `\nSeed complete. ${products} draft products and ${banners} banner(s) ready.`,
    '\nNext: Admin > Products > Bulk edit - add name, price, brand and category, then set the product to Active.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
