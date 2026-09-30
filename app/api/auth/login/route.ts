import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { prisma as db } from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  getRequestContext,
  validatePasswordStrength,
  sessionMaxAgeSeconds,
} from '@/lib/auth';
import { limitLogin, recordLoginAttempt, countRecentFailures } from '@/lib/rate-limit';
import { withApi, jsonError, jsonOk, ErrorCodes, ApiError, assertSameOrigin } from '@/lib/api';
import { loginSchema, customerRegisterSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';
import { normaliseWhatsappNumber } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LoginResponse {
  ok: boolean;
  user: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: string;
    retailerStatus: string;
    businessName: string | null;
  } | null;
  redirectTo?: string;
}

async function respondFailure(req: Request, identifier: string, ip: string, reason: string, status = 401) {
  await recordLoginAttempt(identifier, ip, false, req.headers.get('user-agent') ?? undefined);
  return jsonError(ErrorCodes.UNAUTHORIZED, reason, status);
}

export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(ErrorCodes.VALIDATION, issue?.message ?? 'Invalid login details.', 422, {
      fieldErrors: { [issue?.path.join('.') ?? '_']: [issue?.message ?? 'Invalid'] },
    });
  }

  const { identifier, password } = parsed.data;
  const ctx = await getRequestContext();

  const limit = await limitLogin(identifier, ctx.ip);
  if (!limit.success) {
    return jsonError(
      ErrorCodes.RATE_LIMITED,
      `Too many attempts. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) or reset your password.`,
      429,
    );
  }

  // Durable lockout in the database, so it survives a restart.
  const recentFailures = await countRecentFailures(identifier, 15);
  if (recentFailures >= 8) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'Account temporarily locked. Please reset your password or try later.', 429);
  }

  const raw = identifier.trim();
  const isEmail = raw.includes('@');
  const phoneDigits = isEmail ? '' : normaliseWhatsappNumber(raw).replace(/\D/g, '').slice(-10);

  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: raw.toLowerCase() }
      : { OR: [{ phone: phoneDigits }, { phone: `91${phoneDigits}` }] },
    include: { retailerProfile: { select: { businessName: true, status: true } } },
  });

  // Uniform error message: never reveal whether an account exists.
  const GENERIC = 'Incorrect mobile number / email or password.';

  if (!user || user.deletedAt) {
    return respondFailure(req, identifier, ctx.ip, GENERIC);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: { increment: 1 },
        lockedUntil:
          user.failedLogins + 1 >= 8 ? new Date(Date.now() + 15 * 60_000) : null,
      },
    });
    return respondFailure(req, identifier, ctx.ip, GENERIC);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return jsonError(ErrorCodes.RATE_LIMITED, `Account locked. Try again in ${mins} minute(s).`, 423);
  }

  if (user.role === 'RETAILER' && user.retailerProfile?.status === 'SUSPENDED') {
    return jsonError(ErrorCodes.FORBIDDEN, 'This retailer account has been suspended. Please contact the business.', 403);
  }

  // Retailer applications that are not approved may still sign in, but they
  // will not see wholesale pricing (enforced server-side in lib/pricing).
  if (user.role === 'RETAILER' && user.retailerProfile?.status === 'REJECTED') {
    return jsonError(
      ErrorCodes.FORBIDDEN,
      'Your retailer application was not approved. You can still browse products and send enquiries.',
      403,
    );
  }

  const sessionId = await createSession(user.id, ctx);
  await setSessionCookie(sessionId);

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
  });
  await recordLoginAttempt(identifier, ctx.ip, true, req.headers.get('user-agent') ?? undefined);
  await logActivity({ action: 'LOGIN', user: { id: user.id, name: user.name, role: user.role }, metadata: { ip: ctx.ip } });

  const redirectTo = user.role === 'ADMIN' || user.role === 'EDITOR' ? '/admin' : user.role === 'RETAILER' ? '/retailer' : '/account';

  const response = NextResponse.json<LoginResponse>({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      retailerStatus: user.retailerProfile?.status ?? user.status,
      businessName: user.retailerProfile?.businessName ?? null,
    },
    redirectTo,
  });
  response.cookies.set('ses_session_max_age', String(sessionMaxAgeSeconds()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAgeSeconds(),
  });
  return response;
});

/* -------------------------------------------------------------------------- */
/*  Customer self-registration                                                */
/* -------------------------------------------------------------------------- */

export const PUT = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const parsed = customerRegisterSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return jsonError(ErrorCodes.VALIDATION, 'Please correct the highlighted fields.', 422, { fieldErrors });
  }

  const { name, email, password } = parsed.data;
  const phone = parsed.data.phone;

  if (email) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }, { AND: [{ role: 'RETAILER' }, { phone }] }] },
      select: { id: true, email: true, phone: true, role: true },
    });
    if (existing) {
      return jsonError(ErrorCodes.CONFLICT, 'An account already exists with that mobile number or email.', 409, {
        fieldErrors: {
          [existing.email === email ? 'email' : 'phone']: ['Already registered. Please sign in instead.'],
        },
      });
    }
  } else {
    const existing = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
    if (existing) {
      return jsonError(ErrorCodes.CONFLICT, 'An account already exists with that mobile number.', 409, {
        fieldErrors: { phone: ['Already registered. Please sign in instead.'] },
      });
    }
  }

  const strength = validatePasswordStrength(password);
  if (!strength.ok) {
    throw new ApiError(ErrorCodes.VALIDATION, strength.error ?? 'Weak password.', 422, { password: [strength.error ?? 'Weak password.'] });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email || null,
      phone,
      passwordHash: await hashPassword(password),
      role: 'CUSTOMER',
      status: 'APPROVED',
    },
  });

  const ctx = await getRequestContext();
  const sessionId = await createSession(user.id, ctx);
  await setSessionCookie(sessionId);
  await logActivity({ action: 'CREATE', entityType: 'User', entityId: user.id, entityName: user.name, user: { id: user.id, name: user.name, role: 'CUSTOMER' } });

  return jsonOk({ id: user.id, name: user.name, phone: user.phone, role: user.role }, undefined, 201);
});
