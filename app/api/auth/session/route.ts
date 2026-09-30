import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withApi, jsonOk } from '@/lib/api';
import { getCurrentUser, clearSessionCookie, sessionCookieName, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns the current session. Safe to call unauthenticated. */
export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user) return jsonOk({ user: null, authenticated: false });

  return jsonOk({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      retailerStatus: user.retailerStatus,
      avatarUrl: user.avatarUrl,
      businessName: user.businessName,
      isAdmin: user.isAdmin,
      isRetailer: user.isRetailer,
      isApprovedRetailer: user.isApprovedRetailer,
      // The browser is told the capability, but the server re-checks on every
      // read. Never rely on this flag for authorisation.
      canViewRetailerPricing: user.canSeeRetailerPricing,
    },
    authenticated: true,
  });
});

export const DELETE = withApi(async () => {
  const user = await getCurrentUser();
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;

  if (user && token) {
    const { verifyAccessToken } = await import('@/lib/auth');
    const claims = await verifyAccessToken(token);
    if (claims?.sid) {
      await prisma.session.deleteMany({ where: { id: claims.sid, userId: user.id } });
    }
    await logActivity({ action: 'LOGOUT', user });
  }

  await clearSessionCookie();
  store.delete('ses_session_max_age');
  return jsonOk({ success: true });
});

/** Live session checks used by the admin shell. Requires staff role. */
export const HEAD = withApi(async () => {
  await requireAdmin();
  return new NextResponse(null, { status: 204 });
});
