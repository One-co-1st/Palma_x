'use server';

import { redirect } from 'next/navigation';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { assertSameOrigin, createSession, destroySession, getSession } from '@/lib/auth/session';
import { registerSchema, signInSchema } from '@/lib/validation/account';
import {
  ENTRANCES,
  admits,
  entranceByKey,
  entranceForPath,
  entranceForRole,
  homeForRole,
} from '@/lib/auth/entrances';
import type { Role } from '@/lib/auth/rbac';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import { sendWelcome } from '@/server/email/messages';

export type AuthState = {
  status: 'idle' | 'error';
  message?: string;
  errors?: Record<string, string>;
  /** Set when the credentials were right but the door was wrong. */
  wrongDoor?: { path: string; title: string };
};

/**
 * Only relative, single-slash paths are honoured as post-sign-in targets, and
 * only ones this door actually leads to. A judge's `next` cannot carry them
 * into the creator portal, whatever the query string says.
 */
function safeNext(value: string | undefined | null, role: Role): string {
  const entrance = entranceForRole(role);
  // Moderators and administrators share a door and not a dashboard.
  const home = homeForRole(role);
  if (!value) return home;
  if (!value.startsWith('/') || value.startsWith('//')) return home;

  // The judging room and the admin surface are reachable only from their own
  // doors; anything else resolves to the home of the role that signed in.
  // A `next` cannot carry an account into somebody else's building.
  const target = entranceForPath(value);
  if (target.key !== entrance.key) return home;

  return value;
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.signIn);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many attempts. Try again shortly.' };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
    entrance: formData.get('entrance') ?? 'creator',
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check your details.', errors: fieldErrors(parsed.error) };
  }

  const [user] = await sql<
    {
      id: string;
      email: string;
      name: string;
      passwordHash: string;
      role: Role;
      isActive: boolean;
    }[]
  >`
    select id, email, name, "passwordHash", role, "isActive"
    from "User"
    where email = ${parsed.data.email}
    limit 1
  `;

  // One message for "no such account" and "wrong password": a sign-in form
  // should not tell an attacker which addresses are registered.
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid || !user.isActive) {
    return { status: 'error', message: 'Those details do not match an active PALMA account.' };
  }

  // The door. Each role signs in at its own entrance, and a correct password
  // at the wrong one creates no session — it only says where to go instead.
  // The role is read from the row already fetched above, so this costs nothing.
  const entrance = entranceByKey(parsed.data.entrance) ?? ENTRANCES.creator;
  const role = user.role as Role;

  if (!admits(entrance, role)) {
    const theirs = entranceForRole(role);
    await recordAudit({
      action: 'user.wrong_entrance',
      entityType: 'User',
      entityId: user.id,
      actor: { id: user.id, role, label: user.email },
      summary: `Signed in at ${entrance.path}, which does not admit ${role}`,
    });

    return {
      status: 'error',
      message: `This is the ${entrance.title.toLowerCase()} entrance, and it does not admit your account.`,
      wrongDoor: { path: theirs.path, title: theirs.title },
    };
  }

  await createSession(user.id);
  await recordAudit({
    action: 'user.signed_in',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role, label: user.email },
  });

  redirect(safeNext(parsed.data.next, role));
}

export async function register(_previous: AuthState, formData: FormData): Promise<AuthState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.register);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many sign-ups from this connection. Try again later.' };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    acceptTerms: formData.get('acceptTerms') === 'on',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check your details.',
      errors: fieldErrors(parsed.error),
    };
  }

  const [existing] = await sql<{ id: string }[]>`
    select id from "User" where email = ${parsed.data.email} limit 1
  `;
  if (existing) {
    // Do not confirm that the address is taken; tell them how to proceed either way.
    return {
      status: 'error',
      message: 'If that address can hold a PALMA account, sign in or reset your password instead.',
    };
  }

  const userId = createId();
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await withTransaction(async (tx) => {
    const [created] = await tx<{ id: string; email: string; name: string; role: Role }[]>`
      insert into "User" (id, name, email, "passwordHash", role)
      values (${userId}, ${parsed.data.name}, ${parsed.data.email}, ${passwordHash}, 'creator')
      returning id, email, name, role
    `;

    await tx`
      insert into "NotificationPreference" (id, "userId")
      values (${createId()}, ${userId})
    `;

    return created!;
  });

  await createSession(user.id);
  await recordAudit({
    action: 'user.registered',
    entityType: 'User',
    entityId: user.id,
    actor: { id: user.id, role: user.role, label: user.email },
  });

  // Written whatever the mail provider does. A failed welcome is an operator's
  // problem, not a reason to refuse somebody an account they just created.
  await sendWelcome({ to: user.email, userId: user.id, name: user.name });

  redirect('/creator');
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  if (session) {
    await recordAudit({
      action: 'user.signed_out',
      entityType: 'User',
      entityId: session.user.id,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    });
  }
  await destroySession();
  redirect('/');
}
