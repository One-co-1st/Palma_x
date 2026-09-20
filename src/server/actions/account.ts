'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomToken, sha256, verifyPassword } from '@/lib/crypto';
import { siteUrl } from '@/lib/env';
import { assertSameOrigin, destroySession, getSession } from '@/lib/auth/session';
import type { Role } from '@/lib/auth/rbac';
import { changeEmailSchema, closeAccountSchema } from '@/lib/validation/account';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { enforceRateLimit, RATE_LIMITS } from '@/server/rate-limit';
import {
  sendAccountClosed,
  sendEmailChangeConfirm,
  sendEmailChangeNotice,
} from '@/server/email/messages';
import { clearSuppression } from '@/server/email/suppression';
import { CONTACTS } from '@/lib/legal';

/**
 * What a person can do to their own account without asking PALMA.
 *
 * The line this draws is the one the whole institution rests on: an account is
 * yours and you may leave, but the *record* is PALMA's and it stays. Closing
 * an account unlinks it from a creator record; it does not delete the record,
 * the honours on it, or the fact that they were conferred — an award somebody
 * can erase by clicking a button was never an award.
 */

export type AccountState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

/** 24 hours. A change of address is not urgent and the link is powerful. */
const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;

export async function requestEmailChange(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return { status: 'error', message: 'Sign in again.' };

  // Counted after the origin and session checks, not before, so a forged
  // cross-origin request cannot burn the budget of the account it is aimed at.
  // Limited even though the caller is signed in: the confirmation goes to the
  // address being claimed, so repeating this sends mail to somebody who has not
  // asked for it. Authentication says who is doing it, not how often.
  const limit = await enforceRateLimit(RATE_LIMITS.emailChange, session.user.id);
  if (!limit.allowed) {
    return {
      status: 'error',
      message: 'Too many address changes requested. Try again later.',
    };
  }

  const parsed = changeEmailSchema.safeParse({
    newEmail: formData.get('newEmail'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check the details.', errors: fieldErrors(parsed.error) };
  }

  const [user] = await sql<{ id: string; email: string; role: Role; passwordHash: string }[]>`
    select id, email, role, "passwordHash"
    from "User"
    where id = ${session.user.id}
    limit 1
  `;
  if (!user) return { status: 'error', message: 'Sign in again.' };

  // The session proves possession of a browser. The password proves it is the
  // account holder sitting at it, which is the thing that matters here.
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { status: 'error', message: 'That is not your password.' };
  }

  if (parsed.data.newEmail === user.email) {
    return { status: 'error', message: 'That is already your address.' };
  }

  const token = randomToken(32);

  await withTransaction(async (tx) => {
    // One live request at a time, so an older email stops working.
    await tx`
      update "EmailChangeRequest"
      set "cancelledAt" = ${new Date()}
      where "userId" = ${user.id} and "confirmedAt" is null and "cancelledAt" is null
    `;

    await tx`
      insert into "EmailChangeRequest" (id, "userId", "newEmail", "tokenHash", "expiresAt")
      values (
        ${createId()},
        ${user.id},
        ${parsed.data.newEmail},
        ${sha256(token)},
        ${new Date(Date.now() + EMAIL_CHANGE_TTL_MS)}
      )
    `;
  });

  // The new address is asked to confirm; the old one is told it was asked.
  // Losing an inbox should not silently lose somebody their account.
  await sendEmailChangeConfirm({
    to: parsed.data.newEmail,
    userId: user.id,
    url: `${siteUrl}/account/email/${token}`,
    currentEmail: user.email,
  });

  await sendEmailChangeNotice({
    to: user.email,
    userId: user.id,
    newEmail: parsed.data.newEmail,
  });

  await recordAudit({
    action: 'user.email_change_requested',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role: user.role, label: user.email },
    summary: `Change of address requested to ${parsed.data.newEmail}`,
  });

  return {
    status: 'success',
    message: `Confirm it from ${parsed.data.newEmail}. Nothing changes until you do, and we have told ${user.email} that this was asked for.`,
  };
}

/** Spending the confirmation. Called from the page, which owns the token. */
export async function confirmEmailChange(
  token: string,
): Promise<{ ok: boolean; email?: string; reason?: string }> {
  const [request] = await sql<
    {
      id: string;
      newEmail: string;
      confirmedAt: Date | null;
      cancelledAt: Date | null;
      expiresAt: Date;
      userId: string;
      userEmail: string;
      userRole: Role;
    }[]
  >`
    select
      r.id,
      r."newEmail",
      r."confirmedAt",
      r."cancelledAt",
      r."expiresAt",
      u.id as "userId",
      u.email as "userEmail",
      u.role as "userRole"
    from "EmailChangeRequest" r
    join "User" u on u.id = r."userId"
    where r."tokenHash" = ${sha256(token)}
    limit 1
  `;

  const usable =
    request && !request.confirmedAt && !request.cancelledAt && request.expiresAt > new Date();

  if (!usable) return { ok: false, reason: 'expired' };

  // Somebody may have registered the address in the meantime.
  const [taken] = await sql<{ id: string }[]>`
    select id from "User" where email = ${request.newEmail} limit 1
  `;
  if (taken && taken.id !== request.userId) {
    return { ok: false, reason: 'taken' };
  }

  const previous = request.userEmail;

  await withTransaction(async (tx) => {
    await tx`
      update "EmailChangeRequest"
      set "confirmedAt" = ${new Date()}
      where id = ${request.id}
    `;
    // The new address has just proved itself; the old one's proof is gone.
    await tx`
      update "User"
      set email = ${request.newEmail}, "emailVerifiedAt" = ${new Date()}, "updatedAt" = now()
      where id = ${request.userId}
    `;
  });

  // Confirming from the new address is proof it works.
  await clearSuppression(request.newEmail);

  await recordAudit({
    action: 'user.email_changed',
    entityType: 'User',
    entityId: request.userId,
    actor: { id: request.userId, role: request.userRole, label: request.newEmail },
    summary: `Address changed from ${previous}`,
    before: { email: previous },
    after: { email: request.newEmail },
  });

  return { ok: true, email: request.newEmail };
}

/**
 * Closing an account.
 *
 * Everything personal goes. The record does not, and the confirmation screen
 * says so before the button is pressed rather than in an email afterwards.
 */
export async function closeAccount(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return { status: 'error', message: 'Sign in again.' };

  const parsed = closeAccountSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check the details.', errors: fieldErrors(parsed.error) };
  }

  const [user] = await sql<
    {
      id: string;
      email: string;
      role: Role;
      passwordHash: string;
      creatorId: string | null;
      creatorDisplayName: string | null;
    }[]
  >`
    select
      u.id,
      u.email,
      u.role,
      u."passwordHash",
      c.id as "creatorId",
      c."displayName" as "creatorDisplayName"
    from "User" u
    left join "Creator" c on c."userId" = u.id
    where u.id = ${session.user.id}
    limit 1
  `;
  if (!user) return { status: 'error', message: 'Sign in again.' };

  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { status: 'error', message: 'That is not your password.' };
  }

  // An operator cannot close their own account from here. Removing the last
  // administrator by self-service is not a thing a system should allow, and
  // the route back is another administrator rather than a form.
  if (user.role !== 'creator') {
    return {
      status: 'error',
      message:
        'Accounts holding a PALMA role are closed by an administrator, not from here. Write to ' +
        CONTACTS.general +
        ' and it will be done.',
    };
  }

  const heldRecord = Boolean(user.creatorId);

  // Sent before the account goes, because afterwards there is no Dossier to
  // write to and no address on file to write from.
  await sendAccountClosed({ to: user.email, userId: user.id, heldRecord });

  await withTransaction(async (tx) => {
    if (user.creatorId) {
      // The record stays and becomes unclaimed — exactly the state it was in
      // before anybody claimed it, and claimable again by the right person.
      await tx`
        update "Creator"
        set "userId" = null, "isClaimed" = false, "referralEnabled" = false, "updatedAt" = now()
        where id = ${user.creatorId}
      `;
    }

    await tx`
      update "AuthSession"
      set "revokedAt" = ${new Date()}
      where "userId" = ${user.id} and "revokedAt" is null
    `;

    // Cascades take the Dossier, the preferences, the tokens and the sessions.
    // The audit log does not cascade: it records that this account existed.
    await tx`
      delete from "User" where id = ${user.id}
    `;
  });

  await recordAudit({
    action: 'user.account_closed',
    entityType: 'User',
    entityId: user.id,
    actor: { label: user.email },
    summary: heldRecord
      ? `Account closed at the holder's request. ${user.creatorDisplayName} is unclaimed again.`
      : 'Account closed at the holder’s request.',
  });

  await destroySession();
  redirect('/?closed=1');
}

/** Leaving one device signed in and evicting the rest. */
export async function revokeOtherSessions(): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  await sql`
    update "AuthSession"
    set "revokedAt" = ${new Date()}
    where "userId" = ${session.user.id} and "revokedAt" is null and id <> ${session.sessionId}
  `;

  await recordAudit({
    action: 'user.sessions_revoked',
    entityType: 'User',
    entityId: session.user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: 'Every other session signed out at the holder’s request',
  });

  revalidatePath('/account');
}
