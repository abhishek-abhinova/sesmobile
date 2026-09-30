/**
 * Image pipeline.
 *
 * Takes the raw WhatsApp/phone photos in `source-images/` and produces
 * optimised, web-ready derivatives in `public/images/`:
 *
 *   public/images/logo-<size>.webp   square logo (transparent where possible)
 *   app/icon.png, app/apple-icon.png site icons
 *   public/images/products/<sku>.webp product image (max edge 1400, q82)
 *   public/images/products/<sku>-thumb.webp
 *   public/images/banners/<file>.webp  landscape shots, max edge 1920
 *
 * Run with:  npm run images
 */
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'source-images');
const outDir = path.join(root, 'public', 'images');
const productDir = path.join(outDir, 'products');
const bannerDir = path.join(outDir, 'banners');
const appDir = path.join(root, 'app');

const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

/** WhatsApp filenames are timestamps; the SKU is the stable product identity. */
function productSlug(file) {
  const base = path.basename(file, path.extname(file));
  const m = base.match(/WA(\d{4})/i);
  return m ? `wa-${m[1].toLowerCase()}` : base.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Very light "is this mostly opaque?" test so the logo can keep transparency. */
async function trimTransparentEdges(input, tolerance = 24) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let top = 0;
  let left = 0;
  let right = width - 1;
  let bottom = height - 1;

  const rowEmpty = (y) => {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] > tolerance) return false;
    }
    return true;
  };
  const colEmpty = (x) => {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] > tolerance) return false;
    }
    return true;
  };

  while (top < bottom && rowEmpty(top)) top++;
  while (bottom > top && rowEmpty(bottom)) bottom--;
  while (left < right && colEmpty(left)) left++;
  while (right > left && colEmpty(right)) right--;

  if (top === 0 && left === 0 && right === width - 1 && bottom === height - 1) {
    return { buffer: input, trimmed: false };
  }

  return {
    buffer: await sharp(input)
      .extract({
        left,
        top,
        width: Math.max(1, right - left + 1),
        height: Math.max(1, bottom - top + 1),
      })
      .png()
      .toBuffer(),
    trimmed: true,
  };
}

async function buildLogo(file) {
  const input = path.join(srcDir, file);
  const { buffer, trimmed } = await trimTransparentEdges(input);

  for (const size of [512, 256, 128]) {
    await sharp(buffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(path.join(outDir, `logo-${size}.webp`));
  }

  await sharp(buffer).resize(512, 512, { fit: 'contain' }).png().toFile(path.join(appDir, 'icon.png'));
  await sharp(buffer).resize(180, 180, { fit: 'contain' }).png().toFile(path.join(appDir, 'apple-icon.png'));
  await sharp(buffer).resize(180, 180, { fit: 'cover' }).png().toFile(path.join(outDir, 'og-default.png'));

  return { trimmed };
}

async function main() {
  await mkdir(productDir, { recursive: true });
  await mkdir(bannerDir, { recursive: true });

  const files = (await readdir(srcDir)).filter((f) => IMAGE_RE.test(f));
  if (files.length === 0) {
    console.log('No source images found in source-images/');
    return;
  }

  const manifest = [];
  const seen = new Set();

  for (const file of files.sort()) {
    const input = path.join(srcDir, file);
    const isLogo = /logo/i.test(file);

    if (isLogo) {
      const info = await buildLogo(file);
      console.log(`logo        ${file} -> logo-*.webp, app/icon.png${info.trimmed ? ' (trimmed)' : ''}`);
      continue;
    }

    let slug = productSlug(file);
    // WhatsApp sometimes re-sends a photo as "NAME(1).jpg" — same picture,
    // so it must not become a second catalogue product.
    if (seen.has(slug)) {
      console.log(`  ${file} is a duplicate of ${slug} — skipped`);
      continue;
    }
    seen.add(slug);

    const meta = await sharp(input).metadata();
    const landscape = (meta.width ?? 0) / (meta.height ?? 1) > 1.2;

    if (landscape) {
      const out = path.join(bannerDir, `${slug}.webp`);
      await sharp(input).resize(1920, 1920, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(out);
      manifest.push({ slug, file, kind: 'banner', width: meta.width, height: meta.height, path: `/images/banners/${slug}.webp` });
      console.log(`banner      ${file} -> ${path.relative(root, out)}`);
      continue;
    }

    const main = path.join(productDir, `${slug}.webp`);
    const thumb = path.join(productDir, `${slug}-thumb.webp`);
    await sharp(input).rotate().resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(main);
    await sharp(input).rotate().resize(400, 400, { fit: 'cover' }).webp({ quality: 80 }).toFile(thumb);

    manifest.push({
      slug,
      file,
      kind: 'product',
      width: meta.width,
      height: meta.height,
      path: `/images/products/${slug}.webp`,
      thumb: `/images/products/${slug}-thumb.webp`,
    });
    console.log(`product     ${file} -> ${path.relative(root, main)}`);
  }

  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), images: manifest }, null, 2));

  const logoStat = await stat(path.join(outDir, 'logo-512.webp')).catch(() => null);
  console.log(
    `\n${manifest.length} images processed.${logoStat ? ` logo-512.webp ${Math.round(logoStat.size / 1024)} kB.` : ''}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
