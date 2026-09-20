'use server';

import { hashPassword, randomToken, sha256, verifyPassword } from '@/lib/crypto';
import { assertSameOrigin, getSession } from '@/lib/auth/session';
import { canSelfServiceReset, type Role } from '@/lib/auth/rbac';
import { homeForRole } from '@/lib/auth/entrances';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validation/account';
import { fieldErrors } from '@/lib/validation/nomination';
import { siteUrl } from '@/lib/env';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction, type TransactionSql } from '@/server/db/sql';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import { sendPasswordChanged, sendPasswordReset } from '@/server/email/messages';
import { clearSuppression } from '@/server/email/suppression';
import { RESET_TTL_MS } from '@/domain/password-tokens';

/**
 * Getting back in.
 *
 * The thing this flow must never do is tell a stranger whether an address has
 * a PALMA account. So the answer is the same sentence every time, whether we
 * sent an email or did nothing at all — and the work happens on the other side
 * of that identical response.
 *
 * That same sentence now also covers a second silent case: the address
 * belongs to an account, but it is staff. See `canSelfServiceReset` — a
 * public form that mints a password-setting link for any address on request
 * is the wrong door for an account with `admin:manage_users` behind it, and
 * the visitor asking must not be able to tell the difference between "no
 * account" and "an account this form will not touch."
 */

export type PasswordState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
  /** Where to sign in next, once a password has actually been set. */
  signInPath?: string;
};

const SAME_ANSWER =
  'If that address has a PALMA account, a reset link is on its way. It is valid for one hour.';

/**
 * Mint a fresh, single-use link that lets whoever holds it set a password —
 * the first one, on an invited staff account, or a replacement on any
 * account.
 *
 * The three callers of this — a creator's own request, a super administrator
 * inviting a colleague, and a super administrator reissuing a stuck
 * colleague's link — all need the identical guarantee: exactly one live link
 * per account, so a forwarded or intercepted older email stops working the
 * moment a new one is asked for. One function holds that guarantee rather
 * than three copies of a transaction agreeing to behave the same way.
 */
export async function issuePasswordSetToken(
  tx: TransactionSql,
  userId: string,
  ttlMs: number,
): Promise<string> {
  const token = randomToken(32);
  const now = new Date();

  await tx`
    update "PasswordResetToken"
    set "usedAt" = ${now}
    where "userId" = ${userId} and "usedAt" is null and "expiresAt" > ${now}
  `;

  await tx`
    insert into "PasswordResetToken" (id, "userId", "tokenHash", "expiresAt")
    values (${createId()}, ${userId}, ${sha256(token)}, ${new Date(Date.now() + ttlMs)})
  `;

  return token;
}

export async function requestPasswordReset(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.passwordReset);
  if (!limit.allowed) {
    // Even this is phrased not to confirm anything about the address.
    return {
      status: 'error',
      message: 'Too many requests from this connection. Try again shortly.',
    };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  const [user] = await sql<{ id: string; email: string; role: Role; isActive: boolean }[]>`
    select id, email, role, "isActive"
    from "User"
    where email = ${parsed.data.email}
    limit 1
  `;

  // A closed account gets the same answer as a missing one, and no email.
  // So does a staff account — see the note above the type. Nothing in the
  // response, the timing, or the audit log may let a caller tell that case
  // apart from "no such address."
  if (user && user.isActive && canSelfServiceReset(user.role)) {
    const token = await withTransaction((tx) => issuePasswordSetToken(tx, user.id, RESET_TTL_MS));

    await sendPasswordReset({
      to: user.email,
      userId: user.id,
      url: `${siteUrl}/reset/${token}`,
    });

    await recordAudit({
      action: 'user.password_reset_requested',
      entityType: 'User',
      entityId: user.id,
      actor: { id: user.id, role: user.role, label: user.email },
      summary: 'A password reset link was issued.',
    });
  }

  return { status: 'success', message: SAME_ANSWER };
}

/**
 * Spending the token.
 *
 * Setting a new password revokes every session, which is the whole point: if
 * somebody else was signed in as this account, this is the moment they stop
 * being. The token is burned in the same transaction, so a link cannot be
 * replayed even by the person who legitimately used it.
 */
export async function resetPassword(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.passwordResetSubmit);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many attempts. Try again shortly.' };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the password and try again.',
      errors: fieldErrors(parsed.error),
    };
  }

  const [record] = await sql<
    {
      id: string;
      usedAt: Date | null;
      expiresAt: Date;
      userId: string;
      userEmail: string;
      userRole: Role;
      userIsActive: boolean;
    }[]
  >`
    select
      t.id,
      t."usedAt",
      t."expiresAt",
      u.id as "userId",
      u.email as "userEmail",
      u.role as "userRole",
      u."isActive" as "userIsActive"
    from "PasswordResetToken" t
    join "User" u on u.id = t."userId"
    where t."tokenHash" = ${sha256(parsed.data.token)}
    limit 1
  `;

  const usable = record && !record.usedAt && record.expiresAt > new Date() && record.userIsActive;

  if (!usable) {
    return {
      status: 'error',
      message: 'That link has expired or has already been used. Ask for a new one.',
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await withTransaction(async (tx) => {
    await tx`
      update "PasswordResetToken"
      set "usedAt" = ${new Date()}
      where id = ${record.id}
    `;
    await tx`
      update "User"
      set "passwordHash" = ${passwordHash}, "updatedAt" = now()
      where id = ${record.userId}
    `;
    await tx`
      update "AuthSession"
      set "revokedAt" = ${new Date()}
      where "userId" = ${record.userId} and "revokedAt" is null
    `;
  });

  // Spending the link is proof the address received it, so an old bounce
  // should not go on blocking mail to somebody who is plainly reading it.
  await clearSuppression(record.userEmail);

  await sendPasswordChanged({
    to: record.userEmail,
    userId: record.userId,
    when: new Date(),
  });

  await recordAudit({
    action: 'user.password_reset',
    entityType: 'User',
    entityId: record.userId,
    actor: { id: record.userId, role: record.userRole, label: record.userEmail },
    summary: 'Password reset from a link. Every session was revoked.',
  });

  // Redemption is role-agnostic on purpose: this same link and this same
  // action are what a staff invitation uses to set its first password, so a
  // judge or moderator has to be able to finish here too. Only the sign-in
  // destination differs, and it is decided from the account's real role
  // rather than assumed — a link opened by an operator must not land them on
  // the creator door.
  return {
    status: 'success',
    message: 'Your password is set and every other session has been signed out. Sign in below.',
    signInPath: homeForRole(record.userRole),
  };
}

/**
 * Changing it while signed in.
 *
 * The current password is required even though the session already proves
 * possession — a borrowed, unlocked laptop proves possession too, and this is
 * the one control that stops it becoming a stolen account.
 */
export async function changePassword(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return { status: 'error', message: 'Sign in again.' };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the details.',
      errors: fieldErrors(parsed.error),
    };
  }

  const [user] = await sql<{ id: string; email: string; role: Role; passwordHash: string }[]>`
    select id, email, role, "passwordHash"
    from "User"
    where id = ${session.user.id}
    limit 1
  `;
  if (!user) return { status: 'error', message: 'Sign in again.' };

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { status: 'error', message: 'That is not your current password.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();

  await withTransaction(async (tx) => {
    await tx`
      update "User"
      set "passwordHash" = ${passwordHash}, "updatedAt" = now()
      where id = ${user.id}
    `;
    // Every session but this one. Changing a password should evict everybody
    // else without also evicting the person doing it.
    await tx`
      update "AuthSession"
      set "revokedAt" = ${now}
      where "userId" = ${user.id} and "revokedAt" is null and id <> ${session.sessionId}
    `;
  });

  await sendPasswordChanged({ to: user.email, userId: user.id, when: now });

  await recordAudit({
    action: 'user.password_changed',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role: user.role, label: user.email },
    summary: 'Password changed from the account page. Other sessions revoked.',
  });

  return {
    status: 'success',
    message: 'Your password is changed, and every other session has been signed out.',
  };
}
