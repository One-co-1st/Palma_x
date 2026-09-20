'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import { ROLES, isInvitableRole, type Role } from '@/lib/auth/rbac';
import { entranceForRole } from '@/lib/auth/entrances';
import { hashPassword, randomToken } from '@/lib/crypto';
import { inviteOperatorSchema } from '@/lib/validation/account';
import { siteUrl } from '@/lib/env';
import { recordAudit } from '@/server/audit';
import {
  sendEnforcementNotice,
  sendOperatorInvite,
  sendPasswordReset,
} from '@/server/email/messages';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { issuePasswordSetToken } from '@/server/actions/password';
import { INVITE_TTL_MS, RESET_TTL_MS } from '@/domain/password-tokens';

export type PeopleState = { status: 'idle' | 'error' | 'success'; message?: string };

/**
 * Change an account's role.
 *
 * Three rules, and each exists because of a specific way this goes wrong:
 * nobody changes their own role, only a super administrator can make or unmake
 * one, and the before and after are both written to the audit log so a
 * privilege that appeared can always be traced to the person who granted it.
 */
export async function changeUserRole(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_users');
  } catch {
    return { status: 'error', message: 'You are not authorised to manage accounts.' };
  }

  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '') as Role;

  if (!ROLES.includes(role)) return { status: 'error', message: 'That is not a PALMA role.' };
  if (userId === session.user.id) {
    return { status: 'error', message: 'You cannot change your own role.' };
  }

  const [user] = await sql<{ id: string; email: string; role: Role }[]>`
    select id, email, role
    from "User"
    where id = ${userId}
    limit 1
  `;

  if (!user) return { status: 'error', message: 'That account does not exist.' };

  const involvesSuperAdmin = role === 'super_admin' || user.role === 'super_admin';
  if (involvesSuperAdmin && session.user.role !== 'super_admin') {
    return {
      status: 'error',
      message: 'Only a super administrator can grant or remove that role.',
    };
  }

  if (user.role === role)
    return { status: 'error', message: 'That is already the account’s role.' };

  await sql`
    update "User"
    set role = ${role}
    where id = ${user.id}
  `;

  await recordAudit({
    action: 'user.role_changed',
    entityType: 'User',
    entityId: user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${user.email}: ${user.role} → ${role}`,
    before: { role: user.role },
    after: { role },
  });

  revalidatePath('/admin/users');
  return { status: 'success', message: `${user.email} is now ${role.replace('_', ' ')}.` };
}

/**
 * Suspend or restore an account.
 *
 * Suspension is reversible and immediate: every session is revoked in the same
 * transaction, because an account that is suspended but still signed in
 * somewhere is not suspended.
 */
export async function setAccountState(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:enforce');
  } catch {
    return { status: 'error', message: 'You are not authorised to suspend accounts.' };
  }

  const userId = String(formData.get('userId') ?? '');
  const suspend = formData.get('suspend') === 'true';
  const reason = String(formData.get('reason') ?? '').trim();

  if (userId === session.user.id) {
    return { status: 'error', message: 'You cannot suspend your own account.' };
  }
  if (suspend && reason.length < 10) {
    return { status: 'error', message: 'A suspension has to carry a reason.' };
  }

  const [user] = await sql<{ id: string; email: string; role: Role; isActive: boolean }[]>`
    select id, email, role, "isActive"
    from "User"
    where id = ${userId}
    limit 1
  `;

  if (!user) return { status: 'error', message: 'That account does not exist.' };
  if (user.role === 'super_admin' && session.user.role !== 'super_admin') {
    return { status: 'error', message: 'Only a super administrator can do that.' };
  }

  await withTransaction(async (tx) => {
    await tx`
      update "User"
      set "isActive" = ${!suspend}
      where id = ${user.id}
    `;

    if (suspend) {
      await tx`
        update "AuthSession"
        set "revokedAt" = ${new Date()}
        where "userId" = ${user.id} and "revokedAt" is null
      `;

      await tx`
        insert into "ModerationAction" (id, "actorId", kind, "entityType", "entityId", rationale)
        values (
          ${createId()},
          ${session.user.id},
          'profile_suspended',
          'User',
          ${user.id},
          ${reason}
        )
      `;
    }
  });

  await recordAudit({
    action: suspend ? 'user.suspended' : 'user.restored',
    entityType: 'User',
    entityId: user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: suspend ? `${user.email} suspended: ${reason}` : `${user.email} restored`,
    before: { isActive: user.isActive },
    after: { isActive: !suspend },
  });

  // Enforcement is told to the person it lands on, with the reason and the
  // appeal. An account that is simply stopped working, with no explanation, is
  // how an institution turns a moderation decision into a grievance.
  await sendEnforcementNotice({
    to: user.email,
    userId: user.id,
    headline: suspend
      ? 'Your PALMA account has been suspended'
      : 'Your PALMA account has been restored',
    reason: suspend ? reason : 'The suspension has been lifted.',
    restored: !suspend,
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/enforcement');
  return {
    status: 'success',
    message: suspend
      ? `${user.email} suspended and signed out everywhere.`
      : `${user.email} restored.`,
  };
}

/** End every session an account holds, without suspending it. */
export async function revokeSessions(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_users');
  } catch {
    return { status: 'error', message: 'You are not authorised to do that.' };
  }

  const userId = String(formData.get('userId') ?? '');
  const [user] = await sql<{ email: string }[]>`
    select email
    from "User"
    where id = ${userId}
    limit 1
  `;
  if (!user) return { status: 'error', message: 'That account does not exist.' };

  const { count } = await sql`
    update "AuthSession"
    set "revokedAt" = ${new Date()}
    where "userId" = ${userId} and "revokedAt" is null
  `;

  await recordAudit({
    action: 'user.sessions_revoked',
    entityType: 'User',
    entityId: userId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${count} session${count === 1 ? '' : 's'} revoked for ${user.email}`,
  });

  revalidatePath('/admin/users');
  return { status: 'success', message: `Signed ${user.email} out of ${count} session(s).` };
}

/**
 * Propose an irreversible action.
 *
 * A permanent ban and the revocation of an honour are the two things PALMA
 * cannot take back cleanly, so neither is one person's decision made at speed.
 * This records the proposal and the reason; a *different* administrator
 * executes it.
 */
export async function proposeConsequentialAction(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:enforce');
  } catch {
    return { status: 'error', message: 'You are not authorised to propose that.' };
  }

  const kind = String(formData.get('kind') ?? '');
  const entityId = String(formData.get('entityId') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();

  if (kind !== 'account_ban' && kind !== 'honour_revocation') {
    return { status: 'error', message: 'Choose what is being proposed.' };
  }
  if (!entityId || !subject) return { status: 'error', message: 'Name what this concerns.' };
  if (reason.length < 20) {
    return { status: 'error', message: 'An irreversible action needs a reason of real substance.' };
  }

  const [proposal] = await sql<{ id: string }[]>`
    insert into "ConsequentialAction" (
      id, kind, "entityType", "entityId", subject, reason, "requestedById"
    )
    values (
      ${createId()},
      ${kind},
      ${kind === 'account_ban' ? 'User' : 'Honour'},
      ${entityId},
      ${subject},
      ${reason},
      ${session.user.id}
    )
    returning id
  `;

  await recordAudit({
    action: 'action.proposed',
    entityType: 'ConsequentialAction',
    entityId: proposal!.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${kind.replace('_', ' ')} proposed for ${subject}`,
    after: { reason },
  });

  revalidatePath('/admin/enforcement');
  return {
    status: 'success',
    message: 'Proposed. A second administrator has to approve it before anything happens.',
  };
}

/**
 * Approve and execute — or cancel — a proposal.
 *
 * The approver may not be the proposer. That is the whole mechanism, and it is
 * checked here rather than hidden in the interface.
 */
export async function decideConsequentialAction(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:enforce');
  } catch {
    return { status: 'error', message: 'You are not authorised to do that.' };
  }

  const id = String(formData.get('actionId') ?? '');
  const decision = String(formData.get('decision') ?? '');

  const [proposal] = await sql<
    {
      id: string;
      kind: string;
      entityId: string;
      subject: string;
      reason: string;
      requestedById: string;
      executedAt: Date | null;
      cancelledAt: Date | null;
    }[]
  >`
    select id, kind, "entityId", subject, reason, "requestedById", "executedAt", "cancelledAt"
    from "ConsequentialAction"
    where id = ${id}
    limit 1
  `;

  if (!proposal) return { status: 'error', message: 'That proposal does not exist.' };
  if (proposal.executedAt || proposal.cancelledAt) {
    return { status: 'error', message: 'That proposal has already been settled.' };
  }

  if (decision === 'cancel') {
    await sql`
      update "ConsequentialAction"
      set "cancelledAt" = ${new Date()}, "cancelledReason" = 'Cancelled before execution.'
      where id = ${id}
    `;

    await recordAudit({
      action: 'action.cancelled',
      entityType: 'ConsequentialAction',
      entityId: id,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      summary: `${proposal.kind.replace('_', ' ')} for ${proposal.subject} cancelled`,
    });

    revalidatePath('/admin/enforcement');
    return { status: 'success', message: 'Proposal cancelled. Nothing was done.' };
  }

  if (proposal.requestedById === session.user.id) {
    return {
      status: 'error',
      message:
        'You proposed this. A second administrator has to approve it. That is the point of the rule.',
    };
  }

  const now = new Date();

  await withTransaction(async (tx) => {
    if (proposal.kind === 'account_ban') {
      await tx`
        update "User"
        set "isActive" = false
        where id = ${proposal.entityId}
      `;
      await tx`
        update "AuthSession"
        set "revokedAt" = ${now}
        where "userId" = ${proposal.entityId} and "revokedAt" is null
      `;
      await tx`
        insert into "ModerationAction" (id, "actorId", kind, "entityType", "entityId", rationale)
        values (
          ${createId()},
          ${session.user.id},
          'creator_banned',
          'User',
          ${proposal.entityId},
          ${proposal.reason}
        )
      `;
    } else {
      await tx`
        update "Honour"
        set state = 'revoked', "revokedAt" = ${now}, "revokedReason" = ${proposal.reason}
        where id = ${proposal.entityId}
      `;
      await tx`
        update "Achievement"
        set state = 'revoked', "revokedAt" = ${now}
        where "honourId" = ${proposal.entityId}
      `;
      await tx`
        insert into "ModerationAction" (id, "actorId", kind, "entityType", "entityId", rationale)
        values (
          ${createId()},
          ${session.user.id},
          'honour_revoked',
          'Honour',
          ${proposal.entityId},
          ${proposal.reason}
        )
      `;
    }

    await tx`
      update "ConsequentialAction"
      set "approvedById" = ${session.user.id}, "approvedAt" = ${now}, "executedAt" = ${now}
      where id = ${id}
    `;
  });

  await recordAudit({
    action: 'action.approved',
    entityType: 'ConsequentialAction',
    entityId: id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${proposal.kind.replace('_', ' ')} for ${proposal.subject} executed on a second approval`,
    after: { reason: proposal.reason },
  });

  revalidatePath('/admin/enforcement');
  revalidatePath('/paroh');
  return { status: 'success', message: 'Approved and carried out. Both names are on the record.' };
}

/**
 * Bring a colleague onto the desk.
 *
 * The only way a judge, moderator or administrator account is ever created.
 * There has never been a sign-up form for one, and this does not add one — it
 * lets an administrator create the account directly, with a password nobody,
 * including the person creating it, ever sets or sees. What is emailed is a
 * single-use link that lets the invited person set their own first password;
 * until they do, the account exists but cannot be signed into by anyone.
 *
 * Inviting another super administrator is the one exception: that stays
 * reserved for a super administrator, checked below, the same way granting
 * the role to an existing account already is in `changeUserRole`.
 */
export async function inviteOperator(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_users');
  } catch {
    return { status: 'error', message: 'You are not authorised to invite anyone.' };
  }

  const parsed = inviteOperatorSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    judgeDisplayName: formData.get('judgeDisplayName'),
    judgeTitle: formData.get('judgeTitle'),
    judgeOrganisation: formData.get('judgeOrganisation'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check the details and try again.' };
  }

  const { name, email, role, judgeDisplayName, judgeTitle, judgeOrganisation } = parsed.data;

  // Belt and braces beside the schema: nothing reaches this point that is not
  // one of the four roles nobody can hold without being invited to it.
  if (!isInvitableRole(role)) {
    return { status: 'error', message: 'Choose what they will do at PALMA.' };
  }

  if (role === 'judge' && !judgeDisplayName?.trim()) {
    return { status: 'error', message: 'A judge needs the name shown on the panel page.' };
  }

  // An administrator runs the desk's roster, not the desk's ceiling: creating
  // a super administrator account is how the ceiling is reached, so it stays
  // reserved for someone who already stands on it — the same rule that
  // already keeps `changeUserRole` from letting an administrator grant the
  // role to an existing account.
  if (role === 'super_admin' && session.user.role !== 'super_admin') {
    return {
      status: 'error',
      message: 'Only a super administrator can invite another super administrator.',
    };
  }

  const [existing] = await sql<{ id: string }[]>`
    select id
    from "User"
    where email = ${email}
    limit 1
  `;
  if (existing) {
    // Unlike the public forms, this is an authenticated internal tool talking
    // to a super administrator — there is no stranger here to keep an address
    // secret from, so the plain answer is the more useful one.
    return { status: 'error', message: 'That address already has a PALMA account.' };
  }

  const { user, token } = await withTransaction(async (tx) => {
    // A password nobody will ever type. `hashPassword` runs on a value that
    // is thrown away immediately, so the stored hash matches no string
    // anyone will ever enter — the account is real from the moment it is
    // created, and unusable until the invite link sets a real one.
    const passwordHash = await hashPassword(randomToken(32));
    const userId = createId();

    const [created] = await tx<{ id: string; name: string; email: string; role: Role }[]>`
      insert into "User" (id, name, email, "passwordHash", role)
      values (${userId}, ${name}, ${email}, ${passwordHash}, ${role})
      returning id, name, email, role
    `;

    await tx`
      insert into "NotificationPreference" (id, "userId")
      values (${createId()}, ${userId})
    `;

    if (role === 'judge') {
      await tx`
        insert into "Judge" (id, "userId", "displayName", title, organisation)
        values (
          ${createId()},
          ${userId},
          ${judgeDisplayName!.trim()},
          ${judgeTitle?.trim() || null},
          ${judgeOrganisation?.trim() || null}
        )
      `;
    }

    const setToken = await issuePasswordSetToken(tx, userId, INVITE_TTL_MS);
    return { user: created!, token: setToken };
  });

  const entrance = entranceForRole(role);

  await sendOperatorInvite({
    to: user.email,
    userId: user.id,
    name: user.name,
    entranceTitle: entrance.title,
    entrancePath: entrance.path,
    invitedBy: session.user.email,
    url: `${siteUrl}/reset/${token}`,
  });

  await recordAudit({
    action: 'user.operator_invited',
    entityType: 'User',
    entityId: user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${session.user.email} invited ${email} to PALMA as ${role.replace('_', ' ')}`,
    after: { email, role },
  });

  revalidatePath('/admin/users');

  return {
    status: 'success',
    message: `Invited. ${email} has an account and a link to set their password. Nothing works until they open it.`,
  };
}

/**
 * Reissue a set-password link for an existing account.
 *
 * The only door back in for staff. A creator who forgets their password uses
 * the public page at /forgot; a judge, moderator or administrator cannot,
 * by design — see `canSelfServiceReset` — so when one is locked out, another
 * operator with this permission sends them a fresh link from here instead.
 * Restricted to non-creator accounts so it never becomes a second, unaudited
 * route to the same thing the public form already does properly.
 */
export async function issueOperatorPasswordReset(
  _previous: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_users');
  } catch {
    return { status: 'error', message: 'You are not authorised to do that.' };
  }

  const userId = String(formData.get('userId') ?? '');

  const [user] = await sql<{ id: string; email: string; role: Role; isActive: boolean }[]>`
    select id, email, role, "isActive"
    from "User"
    where id = ${userId}
    limit 1
  `;

  if (!user) return { status: 'error', message: 'That account does not exist.' };
  if (user.role === 'creator') {
    return {
      status: 'error',
      message: 'Creator accounts use the public forgotten-password page, not this.',
    };
  }
  if (!user.isActive) {
    return { status: 'error', message: 'That account is suspended. Restore it first.' };
  }
  if (user.role === 'super_admin' && session.user.role !== 'super_admin') {
    return { status: 'error', message: 'Only a super administrator can do that.' };
  }

  const token = await withTransaction((tx) => issuePasswordSetToken(tx, user.id, RESET_TTL_MS));

  await sendPasswordReset({ to: user.email, userId: user.id, url: `${siteUrl}/reset/${token}` });

  await recordAudit({
    action: 'user.operator_reset_issued',
    entityType: 'User',
    entityId: user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${session.user.email} issued a new password-set link to ${user.email}`,
  });

  revalidatePath('/admin/users');

  return { status: 'success', message: `A new link has been sent to ${user.email}.` };
}
