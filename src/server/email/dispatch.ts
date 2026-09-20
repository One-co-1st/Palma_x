import 'server-only';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import { sender, replyTo } from './addresses';
import { sendEmail } from './resend';
import { TEMPLATES, templateMeta, type TemplateKey } from './register';
import { isSuppressed } from './suppression';

/**
 * The one way PALMA sends anything.
 *
 * No action calls the provider directly. Everything goes through here, which
 * buys three things worth having:
 *
 *   1. A delivery record exists before the provider is called, so a message
 *      that failed is as visible in /admin/communications as one that arrived.
 *      An institution that cannot say whether it told someone has not told them.
 *   2. Preferences are enforced in one place rather than at fifteen call sites,
 *      where the fifteenth will forget.
 *   3. The Dossier entry is written whether or not the email went. An account
 *      that muted a channel, or whose address bounced, can still find out what
 *      happened by looking.
 *
 * This function does not throw. A conferred honour must not be rolled back
 * because a mail server was slow; the failure is recorded and the caller is
 * told, and it is the operator's problem rather than the creator's.
 */

export type DispatchInput = {
  template: TemplateKey;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Who it concerns. Used for the preference check and the Dossier entry. */
  userId?: string | null;
  creatorId?: string | null;
  /** What the Dossier says, when the template declares one. */
  dossier?: { body: string; href?: string | null };
  /** Present only on list mail. */
  unsubscribeUrl?: string;
};

export type DispatchResult = {
  status: 'sent' | 'failed' | 'suppressed';
  detail?: string;
};

export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const meta = templateMeta(input.template);
  const from = sender(meta.mailbox);

  try {
    const suppression = await suppressedBecause(input.userId ?? null, input.template, input.to);

    const [delivery] = await sql<{ id: string }[]>`
      insert into "EmailDelivery" (
        id, template, "from", "to", subject, status, detail, "userId", "creatorId"
      ) values (
        ${createId()},
        ${meta.key},
        ${from},
        ${input.to},
        ${input.subject},
        ${suppression ? 'suppressed' : 'queued'},
        ${suppression},
        ${input.userId ?? null},
        ${input.creatorId ?? null}
      )
      returning id
    `;

    // The Dossier is written either way — that is the point of it.
    if (meta.dossier && input.userId && input.dossier) {
      await sql`
        insert into "Notification" (
          id, "userId", kind, subject, body, href, "isImportant", "sentAt"
        ) values (
          ${createId()},
          ${input.userId},
          ${meta.key},
          ${input.subject},
          ${input.dossier.body},
          ${input.dossier.href ?? null},
          ${meta.important ?? false},
          ${suppression ? null : new Date()}
        )
      `;
    }

    if (suppression) return { status: 'suppressed', detail: suppression };

    const result = await sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: replyTo(meta.mailbox),
      from,
      unsubscribeUrl: input.unsubscribeUrl,
    });

    if (!delivery) throw new Error('Email delivery insert returned no row.');

    if (!result.ok) {
      await sql`
        update "EmailDelivery"
        set status = 'failed', detail = ${result.error}
        where id = ${delivery.id}
      `;
      return { status: 'failed', detail: result.error };
    }

    // No provider configured in this environment: the message was written and
    // logged but nobody received it, and the record must not claim otherwise.
    if (!result.delivered) {
      await sql`
        update "EmailDelivery"
        set status = 'suppressed', detail = 'No mail provider is configured in this environment.'
        where id = ${delivery.id}
      `;
      return { status: 'suppressed', detail: 'No mail provider is configured.' };
    }

    await sql`
      update "EmailDelivery"
      set
        status = 'sent',
        "providerId" = ${result.id},
        "sentAt" = ${new Date()},
        detail = ${result.sandboxed
          ? 'Sent through the sandbox sender: the real domain is not yet verified with the provider.'
          : null}
      where id = ${delivery.id}
    `;

    return { status: 'sent' };
  } catch (error) {
    console.error('[palma:email] dispatch failed', meta.key, error);
    return { status: 'failed', detail: 'The message could not be recorded or sent.' };
  }
}

/**
 * Why this message is not going, or null if it is.
 *
 * Only news can be suppressed. A template gated `always` is never checked
 * against a preference, so there is no way to arrive here holding a security
 * notice and a muted switch.
 */
async function suppressedBecause(
  userId: string | null,
  template: TemplateKey,
  to: string,
): Promise<string | null> {
  // An address the provider has told us is dead stops everything, including
  // mail PALMA would otherwise owe the account. There is no point posting to a
  // letterbox that has been returning envelopes for a month, and continuing to
  // is how a sending domain's reputation is destroyed for everybody else. The
  // Dossier entry is still written, so the account can read it when they get
  // back in.
  const blocked = await isSuppressed(to);
  if (blocked) {
    return blocked.reason === 'complaint'
      ? 'The recipient reported PALMA mail as spam, so this address is suppressed.'
      : `The provider could not deliver to this address (${blocked.reason.replace('_', ' ')}), so it is suppressed.`;
  }

  const gate = TEMPLATES[template].gate;
  if (gate === 'always') return null;

  if (gate === 'subscription') {
    // List mail is gated by the subscription, checked by whatever assembles
    // the audience. Nothing reaches this function that was not on a list.
    return null;
  }

  if (!userId) return null;

  const preferenceGate = gate as
    | 'seasonAnnouncements'
    | 'nominationUpdates'
    | 'honourAnnouncements'
    | 'journalDigest';

  let wanted: boolean | undefined;
  if (preferenceGate === 'seasonAnnouncements') {
    const [prefs] = await sql<{ seasonAnnouncements: boolean }[]>`
      select "seasonAnnouncements" from "NotificationPreference" where "userId" = ${userId} limit 1
    `;
    wanted = prefs?.seasonAnnouncements;
  } else if (preferenceGate === 'nominationUpdates') {
    const [prefs] = await sql<{ nominationUpdates: boolean }[]>`
      select "nominationUpdates" from "NotificationPreference" where "userId" = ${userId} limit 1
    `;
    wanted = prefs?.nominationUpdates;
  } else if (preferenceGate === 'honourAnnouncements') {
    const [prefs] = await sql<{ honourAnnouncements: boolean }[]>`
      select "honourAnnouncements" from "NotificationPreference" where "userId" = ${userId} limit 1
    `;
    wanted = prefs?.honourAnnouncements;
  } else {
    const [prefs] = await sql<{ journalDigest: boolean }[]>`
      select "journalDigest" from "NotificationPreference" where "userId" = ${userId} limit 1
    `;
    wanted = prefs?.journalDigest;
  }

  // No row means the defaults, and every default except the Journal is on.
  return wanted === false ? `The recipient has switched off ${gate} in their Dossier.` : null;
}
