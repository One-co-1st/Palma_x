import 'server-only';
import { siteUrl } from '@/lib/env';
import { emailList, type EmailListKey } from '@/domain/email-lists';
import { dispatch } from './dispatch';
import {
  action,
  aside,
  escapeHtml as e,
  lede,
  paragraph,
  plain,
  plate,
  quiet,
  rule,
  shell,
} from './render';

/**
 * PALMA's lists.
 *
 * These are the only messages nobody is owed, which is why they are the only
 * ones carrying a one-click way out in the header as well as the footer, and
 * the only ones gated by a subscription rather than by a decision.
 *
 * A partner message says so on its face. It is never folded into an awards
 * email, never disguised as an announcement, and only ever reaches somebody
 * who subscribed to exactly that.
 */

export function sendListConfirm(input: { to: string; type: EmailListKey; url: string }) {
  const list = emailList(input.type);

  return dispatch({
    template: 'list_confirm',
    to: input.to,
    subject: `Confirm your ${list.name} subscription`,
    html: shell({
      mailbox: 'laurels',
      preheader: 'One click, and nothing until then.',
      body: [
        lede('Confirm your subscription.'),
        paragraph(
          `Someone asked for <strong>${e(list.name)}</strong> to come to this address. Nothing will be sent until you confirm it.`,
        ),
        quiet(e(list.description)),
        action({ href: input.url, label: 'Confirm the subscription' }),
        quiet(
          'If it was not you, ignore this. The address goes no further, and you will not hear from us again.',
        ),
      ].join('\n'),
    }),
    text: plain([
      `Confirm your ${list.name} subscription.`,
      '',
      `Someone asked for ${list.name} to come to this address. Nothing is sent until you confirm:`,
      '',
      input.url,
      '',
      'If it was not you, ignore this. The address goes no further.',
    ]),
  });
}

export function sendListWelcome(input: { to: string; type: EmailListKey; unsubscribeUrl: string }) {
  const list = emailList(input.type);

  return dispatch({
    template: 'list_welcome',
    to: input.to,
    unsubscribeUrl: input.unsubscribeUrl,
    subject: `You are on ${list.name}`,
    html: shell({
      mailbox: 'laurels',
      preheader: 'What it is, how often, and how to leave.',
      unsubscribeUrl: input.unsubscribeUrl,
      body: [
        plate({ eyebrow: list.name, title: 'You are on the list' }),
        paragraph(e(list.description)),
        rule(),
        paragraph(`<strong>How often:</strong> ${e(list.cadence)}`),
        aside({
          title: 'What it will never be',
          body: list.commercial
            ? 'Anything other than what you subscribed to. Partner messages stay here and are labelled; they are never folded into an announcement about the awards.'
            : 'A leaderboard, a plea for nominations, or a way for a sponsor to reach you. Nomination numbers are not published, and sponsorship buys no part of this letter.',
        }),
        quiet(
          `Leaving this list leaves exactly this one, every other PALMA subscription is separate. <a href="${siteUrl}/account/email-preferences" style="color:#4a5148;">Manage them all</a>.`,
        ),
      ].join('\n'),
    }),
    text: plain([
      `You are on ${list.name}.`,
      '',
      list.description,
      '',
      `How often: ${list.cadence}`,
      '',
      `Leave at any time: ${input.unsubscribeUrl}`,
      `Manage every PALMA subscription: ${siteUrl}/account/email-preferences`,
    ]),
  });
}

/**
 * An issue.
 *
 * The composer writes prose, not markup. Blank lines become paragraphs and
 * everything else is escaped — an issue must not be able to inject markup into
 * the letterhead, however much the desk is trusted.
 */
export function sendDispatchIssue(input: {
  to: string;
  type: EmailListKey;
  unsubscribeUrl: string;
  subject: string;
  standfirst: string;
  body: string;
  linkLabel?: string | null;
  linkUrl?: string | null;
  /** Set on a partner message, which must declare itself before the first line. */
  sponsorName?: string | null;
}) {
  const list = emailList(input.type);

  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraph(e(block).replace(/\n/g, '<br>')))
    .join('\n');

  return dispatch({
    template: 'list_issue',
    to: input.to,
    unsubscribeUrl: input.unsubscribeUrl,
    // A commercial message says so in the subject line, not in the small print
    // at the bottom that nobody reads.
    subject: input.sponsorName ? `[Partner] ${input.subject}` : input.subject,
    html: shell({
      mailbox: 'laurels',
      preheader: input.standfirst.slice(0, 160),
      unsubscribeUrl: input.unsubscribeUrl,
      body: [
        input.sponsorName
          ? aside({
              title: 'A PALMA partner message',
              body: `Sent on behalf of <strong>${e(input.sponsorName)}</strong> to people who subscribed to ${e(list.name)}. PALMA did not judge, endorse or verify what it says, and no partner has any part in the awards.`,
            })
          : '',
        lede(e(input.subject)),
        paragraph(`<em>${e(input.standfirst)}</em>`),
        rule(),
        paragraphs,
        input.linkUrl && input.linkLabel
          ? action({ href: input.linkUrl, label: input.linkLabel, tone: 'olive' })
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    }),
    text: plain([
      input.sponsorName ? `A PALMA partner message, on behalf of ${input.sponsorName}.` : null,
      input.sponsorName ? '' : null,
      input.subject,
      '',
      input.standfirst,
      '',
      input.body,
      input.linkUrl ? `\n${input.linkLabel ?? 'Read more'}: ${input.linkUrl}` : null,
      '',
      `Leave ${list.name}: ${input.unsubscribeUrl}`,
      `Manage every PALMA subscription: ${siteUrl}/account/email-preferences`,
    ]),
  });
}
