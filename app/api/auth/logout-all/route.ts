import { withApi, jsonError, jsonOk, ErrorCodes, assertSameOrigin } from '@/lib/api';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Revokes every session for the current user. */
export const DELETE = withApi(async (req: Request) => {
  assertSameOrigin(req);
  const user = await getCurrentUser();
  if (!user) return jsonError(ErrorCodes.UNAUTHORIZED, 'Not signed in.', 401);

  const { count } = await prisma.session.deleteMany({ where: { userId: user.id } });
  await clearSessionCookie();
  await logActivity({
    action: 'LOGOUT_ALL',
    user,
    metadata: { sessionsRevoked: count },
  });

  return jsonOk({ success: true, sessionsRevoked: count });
});
