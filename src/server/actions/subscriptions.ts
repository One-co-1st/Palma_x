'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { randomToken, sha256 } from '@/lib/crypto';
import { siteUrl, signingSecret } from '@/lib/env';
import { assertSameOrigin, getSession } from '@/lib/auth/session';
import { readUnsubscribeToken, unsubscribeToken } from '@/lib/gazette-token';
import {
  CONSENT_VERSION,
  emailList,
  isEmailListKey,
  type EmailListKey,
} from '@/domain/email-lists';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import { featureLive } from '@/server/features';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import { sendListConfirm, sendListWelcome } from '@/server/email/lists';
import { clearSuppression } from '@/server/email/suppression';

/**
 * Joining and leaving a PALMA list.
 *
 * Double opt-in without exception for anyone who is not signed in: single
 * opt-in means anybody can sign up anybody, which is how a mailing list
 * becomes a way to harass somebody with a newsletter.
 *
 * Nothing here is ever pre-ticked, bundled into the Terms, or turned on as a
 * side effect of doing something else. A person who registers an account, is
 * nominated, claims a record or completes verification has subscribed to
 * nothing.
 */

export type SubscriptionState = { status: 'idle' | 'error' | 'success'; message?: string };

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  type: z.string().refine(isEmailListKey, 'Unknown list.'),
  source: z.string().trim().max(40).default('site'),
});

const SAME_ANSWER =
  'Check your inbox. If this address can join, a confirmation is on its way. Nothing is sent until you open it.';

type SubscriptionStatus = 'pending' | 'confirmed' | 'unsubscribed';

/** A list PALMA is not running yet is not a list anybody can join. */
async function listIsOffered(type: EmailListKey): Promise<boolean> {
  const required = emailList(type).requiresFeature;
  if (!required) return true;
  return featureLive(required);
}

export async function subscribeToList(
  _previous: SubscriptionState,
  formData: FormData,
): Promise<SubscriptionState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.subscribe);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many requests from this connection. Try again later.' };
  }

  const parsed = subscribeSchema.safeParse({
    email: formData.get('email'),
    type: formData.get('type'),
    source: formData.get('source') ?? 'site',
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  const type = parsed.data.type as EmailListKey;

  if (!(await listIsOffered(type))) {
    return { status: 'error', message: 'That list is not open yet.' };
  }

  const email = parsed.data.email;
  const [existing] = await sql<{ id: string; status: SubscriptionStatus }[]>`
    select id, status
    from "EmailSubscription"
    where email = ${email} and type = ${type}
    limit 1
  `;

  // Already confirmed: the same answer, and no second email. Re-confirming an
  // existing subscriber is a way to mail somebody who did not ask twice.
  if (existing?.status === 'confirmed') {
    return { status: 'success', message: SAME_ANSWER };
  }

  const token = randomToken(24);
  const now = new Date();

  if (existing) {
    await sql`
      update "EmailSubscription"
      set
        "tokenHash" = ${sha256(token)},
        status = 'pending',
        source = ${parsed.data.source},
        "unsubscribedAt" = null,
        "consentVersion" = ${CONSENT_VERSION},
        "consentAt" = ${now},
        "updatedAt" = now()
      where id = ${existing.id}
    `;
  } else {
    await sql`
      insert into "EmailSubscription" (id, email, type, "tokenHash", source, "consentVersion", "consentAt")
      values (${createId()}, ${email}, ${type}, ${sha256(token)}, ${parsed.data.source}, ${CONSENT_VERSION}, ${now})
    `;
  }

  await sendListConfirm({
    to: email,
    type,
    url: `${siteUrl}/lists/${type}/confirm/${token}`,
  });

  await recordAudit({
    action: 'subscription.requested',
    entityType: 'EmailSubscription',
    entityId: `${type}:${email}`,
    summary: `Confirmation requested for ${emailList(type).name} (${parsed.data.source})`,
  });

  return { status: 'success', message: SAME_ANSWER };
}

/** Opening the confirmation. Called from the page, which owns the token. */
export async function confirmSubscription(
  type: string,
  token: string,
): Promise<{ ok: boolean; email?: string; list?: EmailListKey }> {
  if (!isEmailListKey(type)) return { ok: false };

  const [subscription] = await sql<
    { id: string; email: string; status: SubscriptionStatus; type: string }[]
  >`
    select id, email, status, type
    from "EmailSubscription"
    where "tokenHash" = ${sha256(token)}
    limit 1
  `;

  if (!subscription || subscription.type !== type) return { ok: false };

  if (subscription.status !== 'confirmed') {
    await sql`
      update "EmailSubscription"
      set status = 'confirmed', "confirmedAt" = ${new Date()}, "unsubscribedAt" = null, "updatedAt" = now()
      where id = ${subscription.id}
    `;

    // They opened it, so the address works whatever it did before.
    await clearSuppression(subscription.email);

    await sendListWelcome({
      to: subscription.email,
      type,
      unsubscribeUrl: `${siteUrl}/lists/${type}/leave/${unsubscribeToken(signingSecret(), subscription.id)}`,
    });

    await recordAudit({
      action: 'subscription.confirmed',
      entityType: 'EmailSubscription',
      entityId: `${type}:${subscription.email}`,
      summary: `Confirmed ${emailList(type).name}`,
    });
  }

  return { ok: true, email: subscription.email, list: type };
}

/**
 * Leaving one list.
 *
 * One click, no sign-in, no confirmation screen, no survey — and critically,
 * one list. Unsubscribing from partner offers must not quietly remove somebody
 * from the announcement that they won.
 */
export async function leaveList(
  type: string,
  token: string,
): Promise<{ ok: boolean; email?: string; list?: EmailListKey }> {
  if (!isEmailListKey(type)) return { ok: false };

  const id = readUnsubscribeToken(signingSecret(), token);
  if (!id) return { ok: false };

  const [subscription] = await sql<
    { id: string; email: string; status: SubscriptionStatus; type: string }[]
  >`
    select id, email, status, type
    from "EmailSubscription"
    where id = ${id}
    limit 1
  `;

  if (!subscription || subscription.type !== type) return { ok: false };

  if (subscription.status !== 'unsubscribed') {
    await sql`
      update "EmailSubscription"
      set status = 'unsubscribed', "unsubscribedAt" = ${new Date()}, "updatedAt" = now()
      where id = ${subscription.id}
    `;

    await recordAudit({
      action: 'subscription.unsubscribed',
      entityType: 'EmailSubscription',
      entityId: `${type}:${subscription.email}`,
      summary: `Left ${emailList(type).name} from an email footer`,
    });
  }

  return { ok: true, email: subscription.email, list: type };
}

/**
 * Setting preferences from inside the account.
 *
 * No confirmation email: the address is already proven by the fact that they
 * signed in with it, and pretending a double opt-in happened when it did not
 * would be theatre. The subscription records that it came from the account.
 */
export async function saveEmailPreferences(
  _previous: SubscriptionState,
  formData: FormData,
): Promise<SubscriptionState> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return { status: 'error', message: 'Sign in again.' };

  const email = session.user.email;
  const now = new Date();
  const changed: string[] = [];

  for (const key of ['awards', 'journal', 'events', 'opportunities', 'partner_offers'] as const) {
    // A list PALMA is not running cannot be joined, but an existing
    // subscription to it can always be left.
    const wanted = formData.get(key) === 'on';
    if (wanted && !(await listIsOffered(key))) continue;

    const [existing] = await sql<{ id: string; status: SubscriptionStatus }[]>`
      select id, status
      from "EmailSubscription"
      where email = ${email} and type = ${key}
      limit 1
    `;

    const currently = existing?.status === 'confirmed';
    if (currently === wanted) continue;

    changed.push(`${key}=${wanted ? 'on' : 'off'}`);

    if (!wanted) {
      if (existing) {
        await sql`
          update "EmailSubscription"
          set status = 'unsubscribed', "unsubscribedAt" = ${now}, "updatedAt" = now()
          where id = ${existing.id}
        `;
      }
      continue;
    }

    const token = randomToken(24);
    const consent = {
      consentVersion: CONSENT_VERSION,
      consentAt: now,
      source: 'preference-centre',
      userId: session.user.id,
    };

    if (existing) {
      await sql`
        update "EmailSubscription"
        set
          status = 'confirmed',
          "confirmedAt" = ${now},
          "unsubscribedAt" = null,
          "consentVersion" = ${consent.consentVersion},
          "consentAt" = ${consent.consentAt},
          source = ${consent.source},
          "userId" = ${consent.userId},
          "updatedAt" = now()
        where id = ${existing.id}
      `;
    } else {
      await sql`
        insert into "EmailSubscription" (
          id, email, type, "tokenHash", status, "confirmedAt",
          "consentVersion", "consentAt", source, "userId"
        )
        values (
          ${createId()}, ${email}, ${key}, ${sha256(token)}, 'confirmed', ${now},
          ${consent.consentVersion}, ${consent.consentAt}, ${consent.source}, ${consent.userId}
        )
      `;
    }
  }

  if (changed.length > 0) {
    await recordAudit({
      action: 'subscription.preferences_changed',
      entityType: 'User',
      entityId: session.user.id,
      actor: { id: session.user.id, role: session.user.role, label: email },
      summary: `Email preferences changed: ${changed.join(', ')}`,
    });
  }

  revalidatePath('/account/email-preferences');
  revalidatePath('/creator');

  return {
    status: 'success',
    message: changed.length === 0 ? 'Nothing changed.' : 'Saved. It takes effect on the next send.',
  };
}

/** Leaving everything at once, from the preference centre. */
export async function leaveEverything(): Promise<void> {
  await assertSameOrigin();

  const session = await getSession();
  if (!session) return;

  await sql`
    update "EmailSubscription"
    set status = 'unsubscribed', "unsubscribedAt" = ${new Date()}, "updatedAt" = now()
    where email = ${session.user.email} and status <> 'unsubscribed'
  `;

  await recordAudit({
    action: 'subscription.unsubscribed',
    entityType: 'User',
    entityId: session.user.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: 'Left every PALMA list from the preference centre',
  });

  revalidatePath('/account/email-preferences');
  revalidatePath('/creator');
}
