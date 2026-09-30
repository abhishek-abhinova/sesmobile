# Deploying S.E.S Mobile World to Vercel

Repository: `https://github.com/abhishek-abhinova/sesmobile` (branch `main`)

The build does **not** need a reachable database — every page that reads data is
`force-dynamic` and `sitemap.xml` degrades gracefully — so the order below is
flexible. Attach the database before the first deploy if you can, because Prisma
migrations still have to be applied once.

---

## 1. Create the Postgres database (Vercel Postgres / Neon)

1. Vercel dashboard → **Storage** → **Create Database** → Neon (or
   <https://neon.tech> directly).
2. Copy the **pooled** connection string. It looks like:

   ```
   postgresql://USER:PASSWORD@HOST/DB?sslmode=require
   ```

   Use the pooled URL for `DATABASE_URL` (serverless), never the direct one.

## 2. Import the project

1. Vercel dashboard → **Add New…** → **Project** → import
   `abhishek-abhinova/sesmobile`.
2. Framework is detected as **Next.js**; leave the build command as
   `prisma generate && next build` (that is what `npm run build` runs).
3. Add the environment variables below (`.env` is never committed).

## 3. Environment variables

Required:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled URL from step 1 |
| `AUTH_SECRET` | 64+ random characters — `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` (no trailing slash) |
| `NEXT_PUBLIC_SITE_NAME` | `S.E.S Mobile World` |
| `ADMIN_EMAIL` | the admin login email |
| `SEED_ADMIN_PASSWORD` | a strong password for that admin account |

Already defaulted in code, so you only need to change them if you want to:
`NEXT_PUBLIC_WHATSAPP_NUMBER` (`918892399728`), `BUSINESS_PHONE` (`+918892399728`),
`BUSINESS_GSTIN` (`29HYBR57857HI2J`), `BUSINESS_OWNER` (`Md. Saif`),
`GOOGLE_MAPS_URL`, `GOOGLE_MAPS_EMBED_URL`, `NEXT_PUBLIC_AUTH_MAX_AGE_HOURS` (`168`),
`RATE_LIMIT_ENABLED` (`true`), `ANALYTICS_ENABLED` (`true`), `NEXT_PUBLIC_MEDIA_PROVIDER` (`local`).

Optional (leave empty to keep features off): `CLOUDINARY_*`, `S3_*`, `SMTP_*`,
`GOOGLE_ANALYTICS_ID`, `GOOGLE_TAG_MANAGER_ID`.

`.env.example` lists the full set.

## 4. Apply migrations

Run once, from your machine, against the production database:

```bash
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"   # PowerShell
npx prisma migrate deploy
```

To load the logo, banners and the 24 product photos as DRAFT products:

```bash
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
npm run db:seed
```

`npm run db:seed` is idempotent — it matches products by SKU, so re-running it
will not duplicate anything.

## 5. Deploy

Push to `main` (Vercel redeploys automatically) or hit **Deploy** in the
dashboard. Check the build log for `✓ Compiled successfully`.

## 6. After the first deploy

1. **Sign in** at `/login` with `ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. **Add the product details.** Admin → Products → each photo is a DRAFT with a
   SKU like `SES-WA0087`. Fill in name, price, brand, category and set the
   status to `ACTIVE`. For a spreadsheet workflow use
   `GET /api/admin/products/csv` (download) and `POST /api/admin/products/csv`
   with `{ "csv": "..." }` to validate/apply an edited file.
3. **Settings**: set the logo, business hours and social links (left empty
   rather than invented) at `/admin/settings` once those screens exist.
4. **Point the domain** at Vercel (Settings → Domains) and redeploy so
   `NEXT_PUBLIC_SITE_URL` and the sitemap are correct.

## Redeploying after changes

```bash
git add -A
git commit -m "describe the change"
git push
```

Vercel builds the new commit automatically. Database migrations are never run by
Vercel — run `npx prisma migrate deploy` yourself when you add one.

## Image pipeline

`source-images/` (git-ignored) holds the original phone photos. Run
`npm run images` to regenerate `public/images/**`, `app/icon.png` and
`app/apple-icon.png`, then commit the changed files. Those files are what Vercel
serves, so this is the only image step needed in CI.
