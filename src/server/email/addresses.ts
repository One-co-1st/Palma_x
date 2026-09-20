import 'server-only';
import { MAILBOX_ADDRESSES, MAILBOX_NAMES } from '@/domain/mailboxes';

/**
 * Who PALMA writes as.
 *
 * There is no noreply@. An institution that writes to you and refuses to be
 * written back to is issuing notices, not corresponding — and the one moment a
 * person most needs to reply is the moment something has gone wrong. Every
 * address below is a real inbox with someone behind it.
 *
 * Four voices, because they are four different relationships:
 *
 *   laurels    The institution speaking about the record — honours, seasons,
 *              results, the Gazette. Ceremonial. Never asks for anything.
 *   concierge  The desk. Accounts, claims, verification, records, the things a
 *              person is in the middle of doing. Helpful and specific.
 *   security   Account safety. Password resets, address changes, sessions. Cold
 *              and unambiguous by design: this voice never sells anything, so a
 *              message in it that reads like marketing is a forgery.
 *   concerns   Enforcement, complaints and appeals. Where a person goes when
 *              PALMA has done something to them and they disagree.
 */

export const MAILBOXES = {
  laurels: {
    key: 'laurels',
    address: MAILBOX_ADDRESSES.laurels,
    name: MAILBOX_NAMES.laurels,
    /** What this voice is for, shown in the template register. */
    purpose: 'The record itself. Honours, seasons, results, the Gazette.',
  },
  concierge: {
    key: 'concierge',
    address: MAILBOX_ADDRESSES.concierge,
    name: MAILBOX_NAMES.concierge,
    purpose: 'The desk. Accounts, claims, records, verification.',
  },
  security: {
    key: 'security',
    address: MAILBOX_ADDRESSES.security,
    name: MAILBOX_NAMES.security,
    purpose: 'Account safety. Passwords, addresses, sessions.',
  },
  concerns: {
    key: 'concerns',
    address: MAILBOX_ADDRESSES.concerns,
    name: MAILBOX_NAMES.concerns,
    purpose: 'Enforcement, complaints and appeals.',
  },
} as const;

export type MailboxKey = keyof typeof MAILBOXES;
export type Mailbox = (typeof MAILBOXES)[MailboxKey];

export const MAILBOX_LIST: Mailbox[] = Object.values(MAILBOXES);

/** `PALMA Concierge <concierge@palmaawards.com>` — what the provider wants. */
export function sender(key: MailboxKey): string {
  const mailbox = MAILBOXES[key];
  return `${mailbox.name} <${mailbox.address}>`;
}

/**
 * Where a reply goes.
 *
 * Usually the same mailbox that wrote. Security mail is the exception worth
 * stating: a person replying to "your password was changed" is very often a
 * person telling us it was not them, and that reply must reach the people who
 * can act on it rather than sit in an announcements folder.
 */
export function replyTo(key: MailboxKey): string {
  return MAILBOXES[key].address;
}
