import 'server-only';
import { prisma } from '@/lib/prisma';
import { getRequestContext, type AuthUser } from '@/lib/auth';
import type { ActivityAction, Prisma, Role } from '@prisma/client';

/**
 * Audit trail. Every privileged mutation records who did what, to which record.
 * Failures are logged but never block the operation.
 */

interface LogInput {
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Prisma.InputJsonValue;
  user?: AuthUser | { id: string; name: string; role: Role } | null;
}

export async function logActivity(input: LogInput): Promise<void> {
  try {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    try {
      const ctx = await getRequestContext();
      ipAddress = ctx.ip;
      userAgent = ctx.userAgent || undefined;
    } catch {
      // Not inside a request scope (e.g. seed / cron) — skip IP.
    }

    await prisma.activityLog.create({
      data: {
        userId: input.user?.id ?? null,
        userName: input.user?.name ?? null,
        userRole: input.user?.role ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        entityName: input.entityName ?? null,
        metadata: input.metadata,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('[audit] failed to write activity log:', (error as Error).message);
  }
}
