'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { siteUrl, signingSecret } from '@/lib/env';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { unsubscribeToken } from '@/lib/gazette-token';
import { slugify } from '@/lib/utils';
import { emailList, isEmailListKey, type EmailListKey } from '@/domain/email-lists';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import { featureLive } from '@/server/features';
import { sendDispatchIssue } from '@/server/email/lists';

/**
 * Sending to a list.
 *
 * Targeting is by list and only by list. There is no audience builder, no
 * segment, no "everyone who has ever given us an address" — because the moment
 * an interface can assemble an audience out of anything other than consent, it
 * will eventually assemble one that includes somebody who opted out.
 *
 * One message per subscriber rather than one BCC: a single mail to hundreds of
 * addresses leaks the whole list to every recipient, and each person's
 * unsubscribe link has to be their own.
 */

export type DispatchState = { status: 'idle' | 'error' | 'success'; message?: string };

const issueSchema = z.object({
  type: z.string().refine(isEmailListKey, 'Choose a list.'),
  subject: z.string().trim().min(8, 'Give it a subject of at least 8 characters.').max(160),
  standfirst: z
    .string()
    .trim()
    .min(20, 'The standfirst is what the reader sees first. Write at least 20 characters.')
    .max(400),
  body: z
    .string()
    .trim()
    .min(80, 'A message with nothing in it is not a message. Write at least 80 characters.')
    .max(20000),
  linkLabel: z.string().trim().max(60).optional().or(z.literal('')),
  linkUrl: z.string().trim().url('Enter a valid link.').max(400).optional().or(z.literal('')),
  sponsorId: z.string().trim().max(40).optional().or(z.literal('')),
  confirm: z.literal('SEND', { message: 'Type SEND to confirm.' }),
});

export async function sendDispatch(
  _previous: DispatchState,
  formData: FormData,
): Promise<DispatchState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('communications:send_list');
  } catch {
    return { status: 'error', message: 'You are not authorised to write to a PALMA list.' };
  }

  const parsed = issueSchema.safeParse({
    type: formData.get('type'),
    subject: formData.get('subject'),
    standfirst: formData.get('standfirst'),
    body: formData.get('body'),
    linkLabel: formData.get('linkLabel') ?? '',
    linkUrl: formData.get('linkUrl') ?? '',
    sponsorId: formData.get('sponsorId') ?? '',
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the message.' };
  }

  const type = parsed.data.type as EmailListKey;
  const list = emailList(type);

  if (list.requiresFeature && !(await featureLive(list.requiresFeature))) {
    return {
      status: 'error',
      message: `${list.name} is switched off. Enable it in Settings before sending to it.`,
    };
  }

  // A partner message may only go to the list people joined for exactly that,
  // and only when the partner programme is running. This is the rule that
  // stops commercial content leaking into an awards announcement.
  const sponsorId = parsed.data.sponsorId || null;
  if (sponsorId && type !== 'partner_offers') {
    return {
      status: 'error',
      message:
        'A partner message can only go to PALMA Partner Offers. Folding commercial content into another list is exactly what that list exists to prevent.',
    };
  }

  let sponsorName: string | null = null;
  if (sponsorId) {
    const [sponsor] = await sql<{ name: string; status: string }[]>`
      select name, status from "Sponsor" where id = ${sponsorId} limit 1
    `;
    if (!sponsor) return { status: 'error', message: 'That sponsor does not exist.' };
    if (sponsor.status !== 'active') {
      return { status: 'error', message: 'That sponsor is not active.' };
    }
    sponsorName = sponsor.name;
  }

  const subscribers = await sql<{ id: string; email: string }[]>`
    select id, email
    from "EmailSubscription"
    where type = ${type} and status = 'confirmed'
  `;

  if (subscribers.length === 0) {
    return { status: 'error', message: `Nobody has confirmed a ${list.name} subscription yet.` };
  }

  const [previous] = await sql<{ number: number }[]>`
    select number
    from "Dispatch"
    where type = ${type}
    order by number desc
    limit 1
  `;
  const number = (previous?.number ?? 0) + 1;

  const [issue] = await sql<{ id: string }[]>`
    insert into "Dispatch" (
      id, type, number, slug, subject, standfirst, body, "linkLabel", "linkUrl", "sponsorId", "sentById"
    ) values (
      ${createId()},
      ${type},
      ${number},
      ${`${type}-${number}-${slugify(parsed.data.subject).slice(0, 60)}`},
      ${parsed.data.subject},
      ${parsed.data.standfirst},
      ${parsed.data.body},
      ${parsed.data.linkLabel || null},
      ${parsed.data.linkUrl || null},
      ${sponsorId},
      ${session.user.id}
    )
    returning id
  `;

  if (!issue) return { status: 'error', message: 'The dispatch could not be recorded.' };

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    const result = await sendDispatchIssue({
      to: subscriber.email,
      type,
      unsubscribeUrl: `${siteUrl}/lists/${type}/leave/${unsubscribeToken(signingSecret(), subscriber.id)}`,
      subject: parsed.data.subject,
      standfirst: parsed.data.standfirst,
      body: parsed.data.body,
      linkLabel: parsed.data.linkLabel || null,
      linkUrl: parsed.data.linkUrl || null,
      sponsorName,
    });

    if (result.status === 'sent') sent += 1;
    else failed += 1;
  }

  await sql`
    update "Dispatch"
    set "sentCount" = ${sent}, "failedCount" = ${failed}
    where id = ${issue.id}
  `;

  await recordAudit({
    action: 'dispatch.sent',
    entityType: 'Dispatch',
    entityId: issue.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${list.name} No. ${number}, “${parsed.data.subject}”, ${sent} sent, ${failed} not delivered${sponsorName ? ` (partner: ${sponsorName})` : ''}`,
  });

  revalidatePath('/admin/communications');
  revalidatePath(`/lists/${type}`);

  return {
    status: 'success',
    message:
      failed === 0
        ? `${list.name} No. ${number} sent to ${sent} subscriber${sent === 1 ? '' : 's'}, and published to the archive.`
        : `${list.name} No. ${number} sent to ${sent}; ${failed} did not go. It is in the archive either way.`,
  };
}
