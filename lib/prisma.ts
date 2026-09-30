import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton.
 *
 * Next.js dev server hot-reloads modules, which would otherwise open a new
 * connection pool on every reload until Postgres refuses new connections.
 * Stashing the client on `globalThis` prevents that.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
