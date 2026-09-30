import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';
import type { RetailerStatus, Role, User } from '@prisma/client';

const SESSION_COOKIE = 'ses_session';
const BCRYPT_ROUNDS = 12;

/* -------------------------------------------------------------------------- */
/*  Password hashing                                                          */
/* -------------------------------------------------------------------------- */

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Rejects passwords that are trivially guessable. Used on every write path. */
export function validatePasswordStrength(password: string): { ok: boolean; error?: string } {
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (password.length > 200) return { ok: false, error: 'Password must be under 200 characters.' };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    return { ok: false, error: 'Password must include at least 3 of: lowercase, uppercase, number, symbol.' };
  }
  const common = ['password', '12345678', 'qwerty', 'admin123', 'welcome1', 'ses12345'];
  if (common.some((c) => password.toLowerCase().includes(c))) {
    return { ok: false, error: 'This password is too common. Choose something less predictable.' };
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Token helpers                                                             */
/* -------------------------------------------------------------------------- */

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().AUTH_SECRET);
}

/** Exactly the claims we mint. Declared separately because `JWTPayload` carries
 *  an index signature, which would make `Omit<…, keyof JWTPayload>` collapse to
 *  `{}` and silently drop every field. */
export interface SessionTokenClaims {
  sub: string;
  sid: string;
  role: Role;
  retailerStatus: RetailerStatus;
  phone: string;
  name: string;
  email: string | null;
}

export type SessionClaims = JWTPayload & SessionTokenClaims;

export async function signAccessToken(claims: SessionTokenClaims): Promise<string> {
  const env = getServerEnv();
  return new SignJWT({
    role: claims.role,
    retailerStatus: claims.retailerStatus,
    phone: claims.phone,
    name: claims.name,
    email: claims.email,
    sid: claims.sid,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('ses-mobile-world')
    .setAudience('ses-web')
    .setExpirationTime(`${env.AUTH_TOKEN_TTL_HOURS}h`)
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'ses-mobile-world',
      audience: 'ses-web',
      algorithms: ['HS256'],
    });
    if (!payload.sub || typeof payload.sid !== 'string') return null;
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function sessionMaxAgeSeconds(): number {
  return getServerEnv().AUTH_TOKEN_TTL_HOURS * 3600;
}

export const sessionCookieOptions = (secure: boolean) =>
  ({
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: sessionMaxAgeSeconds(),
  });

/* -------------------------------------------------------------------------- */
/*  Session lifecycle                                                         */
/* -------------------------------------------------------------------------- */

export interface RequestContext {
  ip: string;
  userAgent: string;
  /** Untrusted, client-supplied identifier used to merge guest wishlists. */
  guestId?: string;
}

/** Extracts client IP, honouring one hop of reverse proxy (Nginx). */
export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  const ip = (forwarded?.split(',')[0] ?? h.get('x-real-ip') ?? '0.0.0.0').trim();
  return {
    ip,
    userAgent: h.get('user-agent')?.slice(0, 255) ?? '',
    guestId: h.get('x-guest-id') ?? undefined,
  };
}

export async function createSession(userId: string, ctx: RequestContext): Promise<string> {
  const token = await prisma.session.create({
    data: {
      userId,
      tokenHash: await hashTokenPlaceholder(),
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      expiresAt: new Date(Date.now() + sessionMaxAgeSeconds() * 1000),
    },
    select: { id: true },
  });

  // We store only a hash of the session id inside the token; the raw cookie value
  // itself is the signed JWT. The DB row anchors revocation.
  await prisma.session.update({
    where: { id: token.id },
    data: { tokenHash: await hashSessionMarker(userId, token.id) },
  });

  return token.id;
}

async function hashTokenPlaceholder(): Promise<string> {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function hashSessionMarker(userId: string, sessionId: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(`${userId}:${sessionId}:${getServerEnv().AUTH_SECRET}`).digest('hex');
}

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  retailerStatus: RetailerStatus;
  avatarUrl: string | null;
  isAdmin: boolean;
  isEditor: boolean;
  isRetailer: boolean;
  isApprovedRetailer: boolean;
  canSeeRetailerPricing: boolean;
  businessName?: string | null;
}

/**
 * Resolves the current user from the session cookie.
 *
 * Memoised per-request via React `cache` so a page that calls this in several
 * components only performs one database round-trip.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  // Revocation check — a logged-out or deleted session must not authenticate.
  const session = await prisma.session.findFirst({
    where: { id: claims.sid, userId: claims.sub, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
      deletedAt: true,
      retailerProfile: { select: { businessName: true } },
    },
  });

  if (!user || user.deletedAt) return null;
  if (user.role === 'RETAILER' && user.status !== 'APPROVED') {
    // Pending / rejected / suspended retailers authenticate but have no
    // wholesale visibility.
  }

  const isAdmin = user.role === 'ADMIN';
  const isEditor = user.role === 'EDITOR';
  const isRetailer = user.role === 'RETAILER';
  const isApprovedRetailer = isRetailer && user.status === 'APPROVED';

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    retailerStatus: user.status,
    avatarUrl: user.avatarUrl,
    isAdmin,
    isEditor,
    isRetailer,
    isApprovedRetailer,
    canSeeRetailerPricing: isApprovedRetailer || isEditor || isAdmin,
    businessName: user.retailerProfile?.businessName ?? null,
  };
});

/* -------------------------------------------------------------------------- */
/*  Authorisation helpers — server-side only, never trust the client          */
/* -------------------------------------------------------------------------- */

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('You must be signed in to do that.', 401);
  return user;
}

export async function requireApprovedRetailer(): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.canSeeRetailerPricing) {
    throw new AuthError('Retailer pricing requires an approved retailer account.', 403);
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new AuthError('Administrator access required.', 403);
  return user;
}

export async function requireStaff(): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.isAdmin && !user.isEditor) throw new AuthError('Staff access required.', 403);
  return user;
}

/** Convenience for route handlers: returns null instead of throwing. */
export async function getOptionalAdmin(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  return user && (user.isAdmin || user.isEditor) ? user : null;
}

/* -------------------------------------------------------------------------- */
/*  Cookies                                                                   */
/* -------------------------------------------------------------------------- */

export async function setSessionCookie(sessionId: string): Promise<void> {
  const token = await buildTokenForSession(sessionId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(isSecureRequest()));
}

async function buildTokenForSession(sessionId: string): Promise<string> {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { user: { select: { id: true, role: true, status: true, phone: true, name: true, email: true } } },
  });
  return signAccessToken({
    sub: session.user.id,
    sid: sessionId,
    role: session.user.role,
    retailerStatus: session.user.status,
    phone: session.user.phone,
    name: session.user.name,
    email: session.user.email,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions(isSecureRequest()), maxAge: 0 });
}

export function isSecureRequest(): boolean {
  return process.env.NODE_ENV === 'production';
}

export type { Role, RetailerStatus, User };
