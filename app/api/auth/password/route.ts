import { createHash, randomBytes } from 'node:crypto';
import { withApi, jsonError, jsonOk, ErrorCodes, assertSameOrigin } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validators';
import { validatePasswordStrength } from '@/lib/auth';
import { sendMail, renderPasswordResetMail } from '@/lib/mail';
import { getSettings } from '@/lib/settings';
import { getRequestContext } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { notifySecurityEvent } from '@/lib/notifications';
import { limitMutation } from '@/lib/rate-limit';
import { normaliseWhatsappNumber } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Step 1 — request a reset link.
 * Always responds identically whether or not the account exists, so the
 * endpoint cannot be used to enumerate registered customers.
 */
export const POST = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(ErrorCodes.VALIDATION, 'Enter your registered mobile number or email.', 422);
  }

  const ctx = await getRequestContext();
  const limit = await limitMutation(`pwd-reset:${ctx.ip}`, 5, 15 * 60_000);
  if (!limit.success) {
    return jsonError(ErrorCodes.RATE_LIMITED, 'Too many reset attempts. Please try again later.', 429);
  }

  const raw = parsed.data.identifier.trim();
  const isEmail = raw.includes('@');
  const phone = isEmail ? '' : normaliseWhatsappNumber(raw);

  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: raw.toLowerCase() }
      : { OR: [{ phone: phone.slice(-10) }, { phone }] },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  if (user && user.email) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    // Replace any outstanding tokens so only the newest link works.
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      }),
    ]);

    const settings = await getSettings();
    const resetUrl = `${settings.siteUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: `Reset your ${settings.businessName} password`,
      html: renderPasswordResetMail({
        businessName: settings.businessName,
        name: user.name,
        resetUrl,
        ipHint: ctx.ip,
      }),
    });

    await logActivity({ action: 'PASSWORD_RESET_REQUEST', entityType: 'User', entityId: user.id, entityName: user.name, metadata: { ip: ctx.ip } });
    await notifySecurityEvent('Password reset requested', `Account: ${user.name} (${user.role})`, ctx.ip);
  }

  return jsonOk({
    success: true,
    message: 'If that account exists, we have emailed a password reset link.',
  });
});

/** Step 2 — consume the token and set a new password. */
export const PUT = withApi(async (req: Request) => {
  assertSameOrigin(req);

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(ErrorCodes.VALIDATION, 'This reset link is invalid or has expired.', 422);
  }

  const { hashPassword } = await import('@/lib/auth');
  const strength = validatePasswordStrength(parsed.data.password);
  if (!strength.ok) {
    return jsonError(ErrorCodes.VALIDATION, strength.error ?? 'Password too weak.', 422, {
      fieldErrors: { password: [strength.error ?? 'Password too weak.'] },
    });
  }

  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(parsed.data.token), usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  });

  if (!record) {
    return jsonError(ErrorCodes.VALIDATION, 'This reset link is invalid or has expired. Please request a new one.', 422);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password), failedLogins: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Revoke every existing session — a password reset must log out all devices.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: record.userId }, select: { name: true, role: true } });
  if (user) {
    await logActivity({ action: 'PASSWORD_RESET', entityType: 'User', entityId: record.userId, entityName: user.name, user: { id: record.userId, name: user.name, role: user.role } });
  }

  return jsonOk({ success: true, message: 'Password updated. Please sign in with your new password.' });
});
