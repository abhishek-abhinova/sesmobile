/**
 * Prisma CLI configuration.
 *
 * When a `prisma.config.ts` file is present, Prisma no longer auto-loads `.env`
 * files, so we do it here explicitly. This keeps `prisma migrate` working the
 * same way locally and on the VPS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const files = ['.env.local', '.env', '.env.production'];

  for (const file of files) {
    const fullPath = path.join(cwd, file);
    if (!fs.existsSync(fullPath)) continue;

    for (const rawLine of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      if (key in process.env) continue;

      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnvFiles();

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
