import type { MailboxKey } from './addresses';

/**
 * The template register.
 *
 * Every message PALMA is capable of sending is declared here, once. An
 * administrator can read this list and know the complete set — which matters
 * more than it sounds: the question "does PALMA email people about X?" should
 * have an answer someone can look up rather than grep for.
 *
 * `gate` is the honest part. A template gated by a preference is news, and a
 * person may switch it off. A template gated by `always` is one of three
 * things — a security notice, a decision about that person's own record, or
 * something they asked for in the last thirty seconds — and PALMA sends it
 * regardless, because an account that can mute the news that its honour was
 * revoked is not being kept informed, it is being managed.
 */

export type PreferenceGate =
  | 'always'
  | 'seasonAnnouncements'
  | 'nominationUpdates'
  | 'honourAnnouncements'
  | 'journalDigest'
  /** Gated by the subscription itself rather than by a preference row. */
  | 'subscription';

export type TemplateMeta = {
  key: string;
  /** What an operator calls it. */
  name: string;
  mailbox: MailboxKey;
  /** Why it exists, in a sentence, for /admin/communications. */
  purpose: string;
  gate: PreferenceGate;
  /** Whether it also lands in the recipient's Dossier. */
  dossier: boolean;
  /** Dossier entries PALMA will not let an account dismiss unread. */
  important?: boolean;
};

export const TEMPLATES = {
  /* ── the desk ─────────────────────────────────────────────────────────── */
  welcome: {
    key: 'welcome',
    name: 'Welcome',
    mailbox: 'concierge',
    purpose: 'Sent once, when an account is created. Explains what a PALMA account is and is not.',
    gate: 'always',
    dossier: true,
  },
  password_reset: {
    key: 'password_reset',
    name: 'Password reset',
    mailbox: 'security',
    purpose: 'A single-use link, valid for one hour. Sent only when the address has an account.',
    gate: 'always',
    dossier: false,
  },
  operator_invite: {
    key: 'operator_invite',
    name: 'Staff invitation',
    mailbox: 'security',
    purpose:
      'Sent when a super administrator creates a judge, moderator or administrator account. The only way a staff account is ever created.',
    gate: 'always',
    dossier: false,
  },
  password_changed: {
    key: 'password_changed',
    name: 'Password changed',
    mailbox: 'security',
    purpose: 'Confirms a password change and tells the account what to do if it was not them.',
    gate: 'always',
    dossier: true,
    important: true,
  },
  email_change_confirm: {
    key: 'email_change_confirm',
    name: 'Confirm a new address',
    mailbox: 'security',
    purpose: 'Sent to the proposed address. The change does not happen until it is opened.',
    gate: 'always',
    dossier: false,
  },
  email_change_notice: {
    key: 'email_change_notice',
    name: 'Address change notice',
    mailbox: 'security',
    purpose: 'Sent to the old address, so losing an inbox does not silently lose the account.',
    gate: 'always',
    dossier: true,
    important: true,
  },
  account_closed: {
    key: 'account_closed',
    name: 'Account closed',
    mailbox: 'security',
    purpose: 'Confirms closure and states plainly what PALMA keeps and why.',
    gate: 'always',
    dossier: false,
  },

  /* ── the record ───────────────────────────────────────────────────────── */
  claim_approved: {
    key: 'claim_approved',
    name: 'Claim approved',
    mailbox: 'concierge',
    purpose: 'The record is now held by this account, and what that does and does not permit.',
    gate: 'always',
    dossier: true,
    important: true,
  },
  claim_refused: {
    key: 'claim_refused',
    name: 'Claim refused',
    mailbox: 'concierge',
    purpose: 'A claim was not upheld, with the reason and the route to appeal.',
    gate: 'always',
    dossier: true,
    important: true,
  },
  record_published: {
    key: 'record_published',
    name: 'Record published',
    mailbox: 'concierge',
    purpose: 'A creator record is now public, with the link to it.',
    gate: 'always',
    dossier: true,
  },
  verification_outcome: {
    key: 'verification_outcome',
    name: 'Verification outcome',
    mailbox: 'concierge',
    purpose: 'Age and identity assurance succeeded, failed or needs more. Never quotes a document.',
    gate: 'always',
    dossier: true,
    important: true,
  },

  /* ── the institution ──────────────────────────────────────────────────── */
  honour_conferred: {
    key: 'honour_conferred',
    name: 'Honour conferred',
    mailbox: 'laurels',
    purpose: 'A shortlist place, a finalist place or a PALMA, with its verification code.',
    gate: 'honourAnnouncements',
    dossier: true,
    important: true,
  },
  honour_revoked: {
    key: 'honour_revoked',
    name: 'Honour revoked',
    mailbox: 'concerns',
    purpose: 'An honour has been revoked, with the written reason and the appeal route.',
    gate: 'always',
    dossier: true,
    important: true,
  },
  candidacy_update: {
    key: 'candidacy_update',
    name: 'Candidacy update',
    mailbox: 'laurels',
    purpose: 'A candidacy has moved. Accepted into contention, or ruled ineligible.',
    gate: 'nominationUpdates',
    dossier: true,
  },
  panel_assignment: {
    key: 'panel_assignment',
    name: 'Panel assignment',
    mailbox: 'concierge',
    purpose: 'A judge has been seated on a category and has cases waiting.',
    gate: 'always',
    dossier: true,
    important: true,
  },
  enforcement_notice: {
    key: 'enforcement_notice',
    name: 'Enforcement notice',
    mailbox: 'concerns',
    purpose: 'An account or record has been suspended, restored or otherwise acted upon.',
    gate: 'always',
    dossier: true,
    important: true,
  },

  /* ── nominations ──────────────────────────────────────────────────────── */
  nomination_code: {
    key: 'nomination_code',
    name: 'Nomination code',
    mailbox: 'concierge',
    purpose: 'The one-time code that confirms a nomination. Expires in minutes, used once.',
    gate: 'always',
    dossier: false,
  },
  nomination_receipt: {
    key: 'nomination_receipt',
    name: 'Nomination receipt',
    mailbox: 'laurels',
    purpose: 'Confirms a nomination was recorded, and states that volume decides nothing.',
    gate: 'always',
    dossier: false,
  },

  /* ── the lists ────────────────────────────────────────────────────────── */
  list_confirm: {
    key: 'list_confirm',
    name: 'List. Confirm subscription',
    mailbox: 'laurels',
    purpose: 'Double opt-in. Nothing is sent to an address that has not opened this.',
    gate: 'always',
    dossier: false,
  },
  list_welcome: {
    key: 'list_welcome',
    name: 'List. Welcome',
    mailbox: 'laurels',
    purpose: 'Confirms a subscription and says what the list is, how often, and how to leave.',
    gate: 'always',
    dossier: false,
  },
  list_issue: {
    key: 'list_issue',
    name: 'List. Issue',
    mailbox: 'laurels',
    purpose:
      'An issue sent to confirmed subscribers of one list. Targeting is by list, always, never a merged audience.',
    gate: 'subscription',
    dossier: false,
  },
} as const satisfies Record<string, TemplateMeta>;

export type TemplateKey = keyof typeof TEMPLATES;

export const TEMPLATE_LIST: TemplateMeta[] = Object.values(TEMPLATES);

/**
 * The register keeps `as const` so template keys stay literal, which means each
 * entry's type is its own shape and the optional fields vanish from the union.
 * This widens one back to `TemplateMeta` for code that reads it generically.
 */
export function templateMeta(key: TemplateKey): TemplateMeta {
  return TEMPLATES[key];
}

/** Templates a person may switch off, and templates PALMA owes them anyway. */
export function isSuppressible(key: TemplateKey): boolean {
  return TEMPLATES[key].gate !== 'always';
}
