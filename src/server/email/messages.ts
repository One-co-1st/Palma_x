import 'server-only';
import { siteUrl } from '@/lib/env';
import { CODE_TTL_SECONDS } from '@/domain/verification-code';
import { dispatch, type DispatchResult } from './dispatch';
import { MAILBOXES } from './addresses';
import {
  action,
  aside,
  code as codeBlock,
  escapeHtml as e,
  facts,
  fallbackLink,
  label,
  lede,
  paragraph,
  plain,
  plate,
  quiet,
  rule,
  shell,
  steps,
} from './render';

/**
 * What PALMA says, and how it says it.
 *
 * Each message is written for its moment rather than poured into a shared
 * "notification" mould. A password reset is terse because the reader is
 * annoyed; a conferred honour is ceremonial because it is the only email from
 * us they will keep; a refused claim is careful because somebody is about to be
 * disappointed by an institution and deserves to know exactly why and what to
 * do next.
 *
 * Every one carries a real plain-text part. Stripping tags from the HTML
 * produces the kind of text part that proves nobody read it.
 */

const MINUTES = Math.round(CODE_TTL_SECONDS / 60);

/* ── the desk ───────────────────────────────────────────────────────────── */

export function sendWelcome(input: { to: string; userId: string; name: string }) {
  const firstName = input.name.split(' ')[0] || input.name;

  return dispatch({
    template: 'welcome',
    to: input.to,
    userId: input.userId,
    subject: 'Your PALMA account',
    html: shell({
      mailbox: 'concierge',
      preheader: 'What a PALMA account is, and the one thing it is not.',
      body: [
        lede(`Welcome, ${e(firstName)}.`),
        paragraph(
          'Your account is open. What it gives you is a way to hold your record, not a profile page you publish, but a place in an archive PALMA keeps.',
        ),
        rule(),
        label('The difference, since it matters'),
        paragraph(
          'PALMA writes a creator record the first time someone is nominated. It exists before you do anything, and it goes on existing whether or not you ever sign in. Claiming it means the institution accepts that the person behind the account is the person in the record. After a human has looked.',
        ),
        paragraph(
          'You decide how you are described. PALMA decides what it says happened. Nobody edits the history, including us, without it showing.',
        ),
        rule(),
        label('Where to start'),
        steps([
          'Search the archive for yourself. If a record exists, claim it. Most do.',
          'If none exists, start one: write it yourself, or give us the links and our editorial desk writes it from the work.',
          'Complete age and identity assurance. PALMA never receives or stores your documents; we keep only that the check happened.',
        ]),
        action({ href: `${siteUrl}/creator`, label: 'Open your portal' }),
        aside({
          title: 'What PALMA will never ask you for',
          body: 'Your password, a payment to be considered, or money to be nominated. Nobody at PALMA will ever ask for any of the three. A message that does is not from us.',
        }),
      ].join('\n'),
    }),
    text: plain([
      `Welcome, ${firstName}.`,
      '',
      'Your account is open. It gives you a way to hold your record, not a profile page you publish, but a place in an archive PALMA keeps.',
      '',
      'PALMA writes a creator record the first time someone is nominated. Claiming it means the institution accepts that the person behind the account is the person in the record, after a human has looked. You decide how you are described. PALMA decides what it says happened.',
      '',
      'Where to start:',
      '1. Search the archive for yourself and claim your record. Most exist already.',
      '2. If none exists, start one: write it yourself, or give us the links.',
      '3. Complete age and identity assurance. PALMA never stores your documents.',
      '',
      `${siteUrl}/creator`,
      '',
      'PALMA will never ask you for your password, a payment to be considered, or money to be nominated.',
    ]),
    dossier: {
      body: 'Your account was opened. Claim your record, or start one if the archive has none.',
      href: '/creator',
    },
  });
}

export function sendPasswordReset(input: { to: string; userId: string; url: string }) {
  return dispatch({
    template: 'password_reset',
    to: input.to,
    userId: input.userId,
    subject: 'Reset your PALMA password',
    html: shell({
      mailbox: 'security',
      preheader: 'One link, one hour, one use.',
      body: [
        lede('Reset your password.'),
        paragraph(
          'Someone asked to reset the password on the PALMA account for this address. If it was you, the link below sets a new one.',
        ),
        action({ href: input.url, label: 'Set a new password' }),
        fallbackLink(input.url),
        facts([
          ['Valid for', '1 hour'],
          ['Uses', 'Once'],
        ]),
        aside({
          title: 'If it was not you',
          body: `Nothing has changed and you do not need to do anything, the link expires on its own. If you are getting these and did not ask, reply to this message and a person will read it.`,
          tone: 'warning',
        }),
        quiet(
          'PALMA will never ask you for your password, and nobody here can read it. This link is the only way we can help you back in.',
        ),
      ].join('\n'),
    }),
    text: plain([
      'Reset your PALMA password.',
      '',
      'Someone asked to reset the password on the PALMA account for this address. If it was you, open this link:',
      '',
      input.url,
      '',
      'It is valid for one hour and works once.',
      '',
      'If it was not you, nothing has changed and the link expires on its own. If you keep getting these and did not ask, reply to this message.',
      '',
      'PALMA will never ask you for your password, and nobody here can read it.',
    ]),
  });
}

/**
 * The only way a staff account is ever created.
 *
 * There is no sign-up form for a judge, moderator or administrator — a super
 * administrator makes the account and this is what tells the person it
 * exists. The link sets their first password; until they open it the account
 * has no password anyone could enter, so it cannot be signed into by mistake
 * or by force.
 */
export function sendOperatorInvite(input: {
  to: string;
  userId: string;
  name: string;
  entranceTitle: string;
  entrancePath: string;
  invitedBy: string;
  url: string;
}) {
  const firstName = input.name.split(' ')[0] || input.name;

  return dispatch({
    template: 'operator_invite',
    to: input.to,
    userId: input.userId,
    subject: 'Set up your PALMA staff account',
    html: shell({
      mailbox: 'security',
      preheader: `${input.invitedBy} added you to PALMA, ${input.entranceTitle}.`,
      body: [
        lede(`Welcome to the desk, ${e(firstName)}.`),
        paragraph(
          `${e(input.invitedBy)} has given you a PALMA account with access to ${e(input.entranceTitle)}. The link below sets your password. Nobody at PALMA, including whoever invited you, can see or set it for you.`,
        ),
        action({ href: input.url, label: 'Set your password' }),
        fallbackLink(input.url),
        facts([
          ['Access', input.entranceTitle],
          ['Sign in at', `${input.entrancePath} once your password is set`],
          ['Valid for', '7 days'],
        ]),
        aside({
          title: 'Not expecting this',
          body: 'If you do not recognise PALMA or the person named above, ignore this message, the link expires on its own and no account will be usable without it.',
          tone: 'warning',
        }),
        quiet(
          'If this link expires before you use it, ask whoever invited you to send a new one from Users & roles. That page can reissue it at any time.',
        ),
      ].join('\n'),
    }),
    text: plain([
      `Welcome to the desk, ${firstName}.`,
      '',
      `${input.invitedBy} has given you a PALMA account with access to ${input.entranceTitle}. This link sets your password:`,
      '',
      input.url,
      '',
      `Sign in afterwards at ${input.entrancePath}. The link is valid for 7 days.`,
      '',
      'If you do not recognise PALMA or the person named above, ignore this message.',
    ]),
  });
}

export function sendPasswordChanged(input: { to: string; userId: string; when: Date }) {
  const when = input.when.toUTCString();

  return dispatch({
    template: 'password_changed',
    to: input.to,
    userId: input.userId,
    subject: 'Your PALMA password was changed',
    html: shell({
      mailbox: 'security',
      preheader: 'And what to do if it was not you.',
      body: [
        lede('Your password was changed.'),
        facts([
          ['Account', input.to],
          ['Changed', when],
        ]),
        paragraph(
          'Every other session was signed out at the same time, so anyone who was already signed in as you no longer is.',
        ),
        aside({
          title: 'If this was not you',
          body: `Reply to this message immediately. Do not use the reset link in any other email you have received. Reply to this one, which reaches ${MAILBOXES.security.address} directly.`,
          tone: 'warning',
        }),
      ].join('\n'),
    }),
    text: plain([
      'Your PALMA password was changed.',
      '',
      `Account: ${input.to}`,
      `Changed: ${when}`,
      '',
      'Every other session was signed out at the same time.',
      '',
      `If this was not you, reply to this message immediately. It reaches ${MAILBOXES.security.address} directly.`,
    ]),
    dossier: {
      body: `The password on this account was changed on ${when}, and every other session was signed out.`,
      href: '/account',
    },
  });
}

export function sendEmailChangeConfirm(input: {
  to: string;
  userId: string;
  url: string;
  currentEmail: string;
}) {
  return dispatch({
    template: 'email_change_confirm',
    to: input.to,
    userId: input.userId,
    subject: 'Confirm your new PALMA address',
    html: shell({
      mailbox: 'security',
      preheader: 'The change does not happen until you open this.',
      body: [
        lede('Confirm this address.'),
        paragraph(
          `The PALMA account currently at <strong>${e(input.currentEmail)}</strong> has asked to move here. Nothing changes until you confirm it.`,
        ),
        action({ href: input.url, label: 'Confirm the change' }),
        fallbackLink(input.url),
        quiet('The link is valid for 24 hours and works once.'),
        aside({
          title: 'If you were not expecting this',
          body: 'Ignore it. The account stays where it is, and we have told the old address that this was requested.',
        }),
      ].join('\n'),
    }),
    text: plain([
      'Confirm your new PALMA address.',
      '',
      `The PALMA account currently at ${input.currentEmail} has asked to move to this address. Nothing changes until you confirm it:`,
      '',
      input.url,
      '',
      'Valid for 24 hours, works once.',
      '',
      'If you were not expecting this, ignore it. The account stays where it is.',
    ]),
  });
}

export function sendEmailChangeNotice(input: { to: string; userId: string; newEmail: string }) {
  return dispatch({
    template: 'email_change_notice',
    to: input.to,
    userId: input.userId,
    subject: 'A change of address was requested on your PALMA account',
    html: shell({
      mailbox: 'security',
      preheader: 'Told to the old address on purpose.',
      body: [
        lede('Someone asked to move this account.'),
        facts([
          ['From', input.to],
          ['To', input.newEmail],
        ]),
        paragraph(
          'We are telling this address because losing an inbox should not quietly lose you the account. The change only completes when the new address confirms it.',
        ),
        aside({
          title: 'If this was not you',
          body: 'Reply now. We can stop the change before it completes, and a person will read your reply.',
          tone: 'warning',
        }),
      ].join('\n'),
    }),
    text: plain([
      'A change of address was requested on your PALMA account.',
      '',
      `From: ${input.to}`,
      `To: ${input.newEmail}`,
      '',
      'The change only completes when the new address confirms it.',
      '',
      'If this was not you, reply now. We can stop it before it completes.',
    ]),
    dossier: {
      body: `A change of address to ${input.newEmail} was requested on this account.`,
      href: '/account',
    },
  });
}

export function sendAccountClosed(input: { to: string; userId: string; heldRecord: boolean }) {
  return dispatch({
    template: 'account_closed',
    to: input.to,
    userId: input.userId,
    subject: 'Your PALMA account is closed',
    html: shell({
      mailbox: 'security',
      preheader: 'What is gone, and what PALMA keeps.',
      body: [
        lede('Your account is closed.'),
        paragraph('You are signed out everywhere and can no longer sign in.'),
        rule(),
        label('Gone'),
        paragraph(
          'Your sign-in, your sessions, your Dossier, your notification preferences, and the link between your account and any record you held.',
        ),
        label('Kept'),
        paragraph(
          input.heldRecord
            ? 'The creator record itself, and any honour on it. PALMA’s record of what happened is not a personal profile and does not belong to the account that held it, an award that could be deleted by the person who received it would not be worth receiving.'
            : 'PALMA’s audit log, which records that this account existed and was closed. It contains no personal detail beyond that.',
        ),
        quiet(
          'If you believe something in the record is wrong rather than merely unwanted, that is a correction, and you can still ask for one by replying to this message.',
        ),
      ].join('\n'),
    }),
    text: plain([
      'Your PALMA account is closed.',
      '',
      'Gone: your sign-in, sessions, Dossier, preferences, and the link between your account and any record you held.',
      '',
      input.heldRecord
        ? 'Kept: the creator record and any honour on it. PALMA’s record of what happened does not belong to the account that held it.'
        : 'Kept: the audit entry recording that this account existed and was closed.',
      '',
      'If something in the record is wrong rather than unwanted, reply to this message and ask for a correction.',
    ]),
  });
}

/* ── the record ─────────────────────────────────────────────────────────── */

export function sendClaimApproved(input: {
  to: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  slug: string;
}) {
  const url = `${siteUrl}/creators/${input.slug}`;

  return dispatch({
    template: 'claim_approved',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId,
    subject: `Your PALMA record is yours, ${input.creatorName}`,
    html: shell({
      mailbox: 'concierge',
      preheader: 'Reviewed by a person. Here is what it does and does not permit.',
      body: [
        plate({ eyebrow: 'Claim upheld', title: input.creatorName, meta: 'Held by your account' }),
        paragraph(
          'A moderator reviewed your claim and accepted it. The record you claimed is the same record it was a moment ago. It has not been replaced, duplicated or reset. It is simply yours to hold now.',
        ),
        action({ href: `${siteUrl}/creator`, label: 'Open your portal' }),
        rule(),
        label('What you can change'),
        paragraph(
          'How you are described: name, pronouns, country, city, headline, biography, portrait, website and the links to your work.',
        ),
        label('What nobody can change'),
        paragraph(
          'What happened: nominations, candidacies, shortlist and finalist places, honours, scores, verification history and the dates. Not you, and not us, without a correction that leaves a trace.',
        ),
        quiet(`Your public record: <a href="${url}" style="color:#4a5148;">${e(url)}</a>`),
      ].join('\n'),
    }),
    text: plain([
      `Your PALMA record is yours, ${input.creatorName}`,
      '',
      'A moderator reviewed your claim and accepted it. The record has not been replaced, duplicated or reset. It is the same record, now held by your account.',
      '',
      'You can change how you are described: name, pronouns, country, city, headline, biography, portrait, website and links.',
      '',
      'Nobody can change what happened: nominations, candidacies, shortlist and finalist places, honours, scores, verification history and dates.',
      '',
      `Your portal: ${siteUrl}/creator`,
      `Your public record: ${url}`,
    ]),
    dossier: {
      body: `Your claim on ${input.creatorName} was upheld. The record is held by your account.`,
      href: '/creator',
    },
  });
}

export function sendClaimRefused(input: {
  to: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  reason: string;
}) {
  return dispatch({
    template: 'claim_refused',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId,
    subject: `Your claim on ${input.creatorName} was not upheld`,
    html: shell({
      mailbox: 'concierge',
      preheader: 'The reason, and what you can do about it.',
      body: [
        lede('Your claim was not upheld.'),
        paragraph(
          `A moderator reviewed your claim on <strong>${e(input.creatorName)}</strong> and did not accept it.`,
        ),
        aside({ title: 'The reason given', body: e(input.reason) }),
        paragraph(
          'This is not a judgement about who you are. A claim is refused when the evidence in front of the desk did not establish control of the work, which is often a matter of what was submitted rather than who submitted it.',
        ),
        rule(),
        label('If you disagree'),
        steps([
          'Reply to this message with what the desk did not have. A link from a platform you plainly control settles most claims.',
          'If you believe the decision was wrong rather than incomplete, say so and it goes to a second reviewer who was not involved.',
        ]),
        quiet(
          'PALMA refuses claims in order to protect the person actually in the record. Nobody gets someone else’s name by asking confidently.',
        ),
      ].join('\n'),
    }),
    text: plain([
      `Your claim on ${input.creatorName} was not upheld.`,
      '',
      `Reason: ${input.reason}`,
      '',
      'A claim is refused when the evidence did not establish control of the work. Often a matter of what was submitted rather than who submitted it.',
      '',
      'If you disagree, reply with what the desk did not have. A link from a platform you plainly control settles most claims. If you believe the decision was wrong rather than incomplete, say so and a second reviewer looks.',
    ]),
    dossier: {
      body: `Your claim on ${input.creatorName} was not upheld. Reason: ${input.reason}`,
      href: '/creator/claim',
    },
  });
}

export function sendRecordPublished(input: {
  to: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  slug: string;
}) {
  const url = `${siteUrl}/creators/${input.slug}`;

  return dispatch({
    template: 'record_published',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId,
    subject: 'Your PALMA record is published',
    html: shell({
      mailbox: 'concierge',
      preheader: 'It is public, and here is where it lives.',
      body: [
        plate({ eyebrow: 'Published', title: input.creatorName }),
        paragraph(
          'A moderator checked your record against the work and published it. It is now part of the public archive.',
        ),
        action({ href: url, label: 'See your record' }),
        quiet(
          'Keep your links current, the desk reads the record from them, and a dead link is the usual reason a record falls out of date.',
        ),
      ].join('\n'),
    }),
    text: plain([
      'Your PALMA record is published.',
      '',
      `${input.creatorName}, ${url}`,
      '',
      'A moderator checked it against the work before publishing. Keep your links current: the desk reads the record from them.',
    ]),
    dossier: {
      body: `${input.creatorName} is published and part of the public archive.`,
      href: `/creators/${input.slug}`,
    },
  });
}

export function sendVerificationOutcome(input: {
  to: string;
  userId: string;
  creatorId: string;
  outcome: 'verified' | 'failed' | 'more_needed';
  note?: string | null;
}) {
  const copy = {
    verified: {
      subject: 'You are verified with PALMA',
      lede: 'Verification complete.',
      body: 'Age and identity assurance succeeded. Your record can now carry an honour, and your nomination link has been issued.',
    },
    failed: {
      subject: 'PALMA could not complete your verification',
      lede: 'Verification did not complete.',
      body: 'The check did not succeed. This is usually a problem with what was submitted rather than with you, and it can be started again.',
    },
    more_needed: {
      subject: 'PALMA needs one more thing to verify you',
      lede: 'One more thing.',
      body: 'Your check could not be settled with what was provided, and the desk needs something further before it can.',
    },
  }[input.outcome];

  return dispatch({
    template: 'verification_outcome',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId,
    subject: copy.subject,
    html: shell({
      mailbox: 'concierge',
      preheader: 'PALMA holds no document and never did.',
      body: [
        lede(copy.lede),
        paragraph(copy.body),
        input.note ? aside({ title: 'From the desk', body: e(input.note) }) : '',
        rule(),
        label('What PALMA holds'),
        paragraph(
          'That the check happened, when, and the provider’s reference. Never a document, a date of birth, an ID number or an address. Anything you submitted for review was deleted when the case was closed.',
        ),
        input.outcome === 'verified'
          ? action({ href: `${siteUrl}/creator`, label: 'Open your portal' })
          : action({ href: `${siteUrl}/creator`, label: 'Start it again' }),
      ]
        .filter(Boolean)
        .join('\n'),
    }),
    text: plain([
      copy.lede,
      '',
      copy.body,
      input.note ? `\nFrom the desk: ${input.note}` : null,
      '',
      'PALMA holds that the check happened, when, and the provider’s reference. Never a document, a date of birth, an ID number or an address. Anything submitted for review was deleted when the case closed.',
      '',
      `${siteUrl}/creator`,
    ]),
    dossier: {
      body: copy.body,
      href: '/creator',
    },
  });
}

/* ── the institution ────────────────────────────────────────────────────── */

export function sendHonourConferred(input: {
  to: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  kind: 'shortlist' | 'finalist' | 'winner' | 'the_palma';
  categoryName: string;
  year: number;
  verificationCode?: string | null;
}) {
  const kindCopy = {
    shortlist: {
      eyebrow: 'Shortlisted',
      subject: `You are on the PALMA ${input.year} shortlist`,
      lede: 'You have been shortlisted.',
      body: 'An independent panel read the case PALMA prepared and put you through. Nobody campaigned you here, the panel does not see nomination numbers, and PALMA does not publish them.',
    },
    finalist: {
      eyebrow: 'Finalist',
      subject: `You are a PALMA ${input.year} finalist`,
      lede: 'You are a finalist.',
      body: 'The panel has selected the finalists in your category, and you are among them. Whatever happens at the ceremony, this is now permanently on your record.',
    },
    winner: {
      // Not "The PALMA". That name now belongs to one honour a year, and a
      // category winner being told they have won THE PALMA is the exact
      // confusion the naming rules exist to prevent.
      eyebrow: 'Winner',
      subject: `You have won a PALMA: ${input.categoryName} ${input.year}`,
      lede: 'You have won.',
      body: 'The panel has conferred a PALMA in your category. It is on your record permanently, with a verification link anyone can check.',
    },
    the_palma: {
      eyebrow: 'THE PALMA',
      subject: `You have been awarded THE PALMA ${input.year}`,
      lede: 'You have been awarded THE PALMA.',
      body: 'One creator receives THE PALMA each year, and this year it is you. It was not nominated for and not campaigned for: the panel considered the whole record and named you. It is conferred once, so there is nothing above this and nothing after it.',
    },
  }[input.kind];

  return dispatch({
    template: 'honour_conferred',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId,
    subject: kindCopy.subject,
    html: shell({
      mailbox: 'laurels',
      preheader: `${input.categoryName} · PALMA ${input.year}`,
      body: [
        plate({
          eyebrow: kindCopy.eyebrow,
          title: input.creatorName,
          meta: `${input.categoryName} · PALMA ${input.year}`,
        }),
        lede(kindCopy.lede),
        paragraph(kindCopy.body),
        input.verificationCode
          ? [
              rule(),
              label('Verification'),
              paragraph(
                'Every PALMA honour carries a code. Anyone can check it, and it will still resolve years from now.',
              ),
              codeBlock(input.verificationCode),
              action({
                href: `${siteUrl}/verify/${input.verificationCode}`,
                label: 'Open the verification page',
                tone: 'olive',
              }),
            ].join('\n')
          : '',
        quiet(
          'You may state the honour you hold and use the PALMA mark to do it. Share cards are generated from the record itself, so they cannot misstate it.',
        ),
      ]
        .filter(Boolean)
        .join('\n'),
    }),
    text: plain([
      kindCopy.lede,
      '',
      `${input.creatorName}, ${input.categoryName}, PALMA ${input.year}`,
      '',
      kindCopy.body,
      input.verificationCode
        ? `\nVerification code: ${input.verificationCode}\n${siteUrl}/verify/${input.verificationCode}`
        : null,
      '',
      'You may state the honour you hold and use the PALMA mark to do it.',
    ]),
    dossier: {
      body: `${kindCopy.eyebrow}, ${input.categoryName}, PALMA ${input.year}.`,
      href: input.verificationCode ? `/verify/${input.verificationCode}` : '/creator',
    },
  });
}

export function sendHonourRevoked(input: {
  to: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  categoryName: string;
  year: number;
  reason: string;
}) {
  return dispatch({
    template: 'honour_revoked',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId,
    subject: `A PALMA honour on your record has been revoked`,
    html: shell({
      mailbox: 'concerns',
      preheader: 'The reason, and how to contest it.',
      body: [
        lede('An honour has been revoked.'),
        facts([
          ['Record', input.creatorName],
          ['Honour', `${input.categoryName}, PALMA ${input.year}`],
        ]),
        aside({ title: 'The reason given', body: e(input.reason), tone: 'warning' }),
        paragraph(
          'Nothing has been deleted. The honour, its achievement and its verification page remain and now read <em>revoked</em>, because an institution that quietly removes what it once said is not keeping a record.',
        ),
        rule(),
        label('If you contest this'),
        paragraph(
          'Reply to this message. A revocation is reviewed by an administrator who was not involved in it, and the review is recorded whichever way it goes.',
        ),
      ].join('\n'),
    }),
    text: plain([
      'A PALMA honour on your record has been revoked.',
      '',
      `Record: ${input.creatorName}`,
      `Honour: ${input.categoryName}, PALMA ${input.year}`,
      `Reason: ${input.reason}`,
      '',
      'Nothing has been deleted. The honour and its verification page remain and now read "revoked".',
      '',
      'If you contest this, reply to this message. A revocation is reviewed by an administrator who was not involved.',
    ]),
    dossier: {
      body: `The ${input.categoryName} honour (PALMA ${input.year}) was revoked. Reason: ${input.reason}`,
      href: '/creator',
    },
  });
}

export function sendCandidacyUpdate(input: {
  to: string;
  userId: string;
  creatorId: string;
  creatorName: string;
  categoryName: string;
  year: number;
  status: 'in_contention' | 'ineligible';
  reason?: string | null;
}) {
  const accepted = input.status === 'in_contention';

  return dispatch({
    template: 'candidacy_update',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId,
    subject: accepted
      ? `You are in contention, ${input.categoryName} ${input.year}`
      : `A candidacy of yours was ruled ineligible`,
    html: shell({
      mailbox: 'laurels',
      preheader: `${input.categoryName} · PALMA ${input.year}`,
      body: [
        lede(accepted ? 'You are in contention.' : 'A candidacy was ruled ineligible.'),
        facts([
          ['Category', input.categoryName],
          ['Season', `PALMA ${input.year}`],
        ]),
        accepted
          ? paragraph(
              'PALMA has screened the nominations and accepted your candidacy into the category. From here a panel judges the case the institution prepares, not a popularity contest, and not a submission you write.',
            )
          : paragraph(
              'PALMA has ruled this candidacy ineligible for the season. It does not affect anything else on your record.',
            ),
        input.reason ? aside({ title: 'Reason', body: e(input.reason) }) : '',
        quiet(
          'PALMA does not tell you how many nominations you have received. Volume decides nothing, and a running total would only invite you to campaign for one.',
        ),
      ]
        .filter(Boolean)
        .join('\n'),
    }),
    text: plain([
      accepted ? 'You are in contention.' : 'A candidacy was ruled ineligible.',
      '',
      `${input.categoryName}, PALMA ${input.year}`,
      '',
      accepted
        ? 'PALMA has screened the nominations and accepted your candidacy. A panel judges the case the institution prepares.'
        : 'PALMA has ruled this candidacy ineligible for the season. Nothing else on your record is affected.',
      input.reason ? `\nReason: ${input.reason}` : null,
      '',
      'PALMA does not tell you how many nominations you have received. Volume decides nothing.',
    ]),
    dossier: {
      body: accepted
        ? `Your candidacy in ${input.categoryName} (PALMA ${input.year}) is in contention.`
        : `Your candidacy in ${input.categoryName} (PALMA ${input.year}) was ruled ineligible.${input.reason ? ` Reason: ${input.reason}` : ''}`,
      href: '/creator',
    },
  });
}

export function sendPanelAssignment(input: {
  to: string;
  userId: string;
  judgeName: string;
  categoryName: string;
  year: number;
  caseCount: number;
}) {
  return dispatch({
    template: 'panel_assignment',
    to: input.to,
    userId: input.userId,
    subject: `You are seated on the ${input.categoryName} panel`,
    html: shell({
      mailbox: 'concierge',
      preheader: `${input.caseCount} case${input.caseCount === 1 ? '' : 's'} are waiting for you.`,
      body: [
        plate({
          eyebrow: 'Panel assignment',
          title: input.categoryName,
          meta: `PALMA ${input.year}`,
        }),
        paragraph(
          `You have been seated on this category and ${input.caseCount === 1 ? 'one case is' : `${input.caseCount} cases are`} waiting in the judging room.`,
        ),
        action({ href: `${siteUrl}/judge`, label: 'Open the judging room' }),
        rule(),
        label('Before you score'),
        steps([
          'Declare any conflict. Knowing someone is not disqualifying; not saying so is.',
          'Read the case PALMA prepared. You are not asked to research the creator yourself.',
          'Score independently. An assessment cannot be edited once submitted, and you will be shown it before it locks.',
        ]),
        aside({
          title: 'What you will not be shown',
          body: 'Nomination volume, other judges’ scores before you submit, or anything a sponsor has said. None of it is relevant, and the judging room does not carry it.',
        }),
      ].join('\n'),
    }),
    text: plain([
      `You are seated on the ${input.categoryName} panel, PALMA ${input.year}.`,
      '',
      `${input.caseCount === 1 ? 'One case is' : `${input.caseCount} cases are`} waiting in the judging room: ${siteUrl}/judge`,
      '',
      'Before you score: declare any conflict, read the case PALMA prepared, and score independently. An assessment cannot be edited once submitted.',
      '',
      'You will not be shown nomination volume, other judges’ scores before you submit, or anything from a sponsor.',
    ]),
    dossier: {
      body: `Seated on the ${input.categoryName} panel for PALMA ${input.year}. ${input.caseCount} case${input.caseCount === 1 ? '' : 's'} waiting.`,
      href: '/judge',
    },
  });
}

export function sendEnforcementNotice(input: {
  to: string;
  userId: string;
  creatorId?: string | null;
  headline: string;
  reason: string;
  restored?: boolean;
}) {
  return dispatch({
    template: 'enforcement_notice',
    to: input.to,
    userId: input.userId,
    creatorId: input.creatorId ?? null,
    subject: input.restored ? 'Your PALMA account has been restored' : input.headline,
    html: shell({
      mailbox: 'concerns',
      preheader: input.restored
        ? 'The restriction is lifted.'
        : 'What was done, why, and the appeal.',
      body: [
        lede(input.restored ? 'The restriction is lifted.' : input.headline),
        aside({
          title: input.restored ? 'Note' : 'The reason given',
          body: e(input.reason),
          tone: input.restored ? 'plain' : 'warning',
        }),
        input.restored
          ? paragraph('Your account works as it did before. Nothing on your record was altered.')
          : paragraph(
              'This concerns your account and any record it holds. PALMA’s record of what happened is unchanged. Enforcement restricts access, it does not rewrite history.',
            ),
        input.restored
          ? ''
          : [
              rule(),
              label('If you disagree'),
              paragraph(
                'Reply to this message. Appeals are read by an administrator who did not take the action, and the most consequential decisions here already require two administrators to agree before they take effect.',
              ),
            ].join('\n'),
      ]
        .filter(Boolean)
        .join('\n'),
    }),
    text: plain([
      input.restored ? 'Your PALMA account has been restored.' : input.headline,
      '',
      `${input.restored ? 'Note' : 'Reason'}: ${input.reason}`,
      '',
      input.restored
        ? 'Your account works as it did before. Nothing on your record was altered.'
        : 'Enforcement restricts access; it does not rewrite history. If you disagree, reply to this message. Appeals are read by an administrator who did not take the action.',
    ]),
    dossier: {
      body: input.restored
        ? `Your account was restored. ${input.reason}`
        : `${input.headline} Reason: ${input.reason}`,
      href: '/creator',
    },
  });
}

/* ── nominations ────────────────────────────────────────────────────────── */

export function sendNominationCode(input: {
  to: string;
  code: string;
  creatorName: string;
  categoryName: string;
}): Promise<DispatchResult> {
  return dispatch({
    template: 'nomination_code',
    to: input.to,
    subject: `${input.code} is your PALMA verification code`,
    html: shell({
      mailbox: 'concierge',
      preheader: `${input.code}. Expires in ${MINUTES} minutes.`,
      body: [
        lede('Confirm your nomination.'),
        paragraph(
          `Enter this code to put <strong>${e(input.creatorName)}</strong> forward for ${e(input.categoryName)}.`,
        ),
        codeBlock(input.code),
        facts([
          ['Expires in', `${MINUTES} minutes`],
          ['Uses', 'Once'],
        ]),
        quiet(
          'If you did not ask to nominate anyone, ignore this. Nothing has been recorded and no account has been created.',
        ),
      ].join('\n'),
    }),
    text: plain([
      `Your PALMA verification code is ${input.code}.`,
      '',
      `It confirms your nomination of ${input.creatorName} for ${input.categoryName}.`,
      `The code expires in ${MINUTES} minutes and can be used once.`,
      '',
      'If you did not ask to nominate anyone, ignore this email. Nothing has been recorded.',
    ]),
  });
}

export function sendNominationReceipt(input: {
  to: string;
  creatorName: string;
  categoryName: string;
  reference: string;
  year: number;
}): Promise<DispatchResult> {
  return dispatch({
    template: 'nomination_receipt',
    to: input.to,
    subject: 'Your PALMA nomination has been recorded',
    html: shell({
      mailbox: 'laurels',
      preheader: `${input.creatorName}, ${input.categoryName}, PALMA ${input.year}`,
      body: [
        plate({
          eyebrow: 'Nomination recorded',
          title: input.creatorName,
          meta: `${input.categoryName} · PALMA ${input.year}`,
        }),
        paragraph(
          'PALMA screens every nomination, gathers the evidence itself, and an independent panel judges what it finds.',
        ),
        aside({
          title: 'One thing worth knowing',
          body: 'Nomination numbers are not a leaderboard and do not decide the outcome. Nominating the same person again does not help them, and PALMA does not publish the totals.',
        }),
        facts([
          ['Reference', input.reference],
          ['Season', `PALMA ${input.year}`],
        ]),
        action({
          href: `${siteUrl}/awards/${input.year}`,
          label: 'Follow the season',
          tone: 'olive',
        }),
      ].join('\n'),
    }),
    text: plain([
      'Your nomination has been recorded.',
      '',
      `${input.creatorName}, ${input.categoryName}, PALMA ${input.year}`,
      `Reference ${input.reference}`,
      '',
      'PALMA screens every nomination, gathers the evidence itself, and an independent panel judges. Nomination numbers are not a leaderboard and do not decide the outcome.',
      '',
      `${siteUrl}/awards/${input.year}`,
    ]),
  });
}
