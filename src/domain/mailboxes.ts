/**
 * The four addresses PALMA writes from and can be written to.
 *
 * One list, and deliberately not inside `server/email`. Two things need these
 * strings and only one of them is the mailer: the mailer builds a From header,
 * and the legal register, the contact page and the well-known files print them
 * for a reader. Those lived as two hardcoded copies of the same four addresses,
 * which is one rename away from a legal page inviting people to write to an
 * inbox nobody reads.
 *
 * There is no noreply@. An institution that writes to you and refuses to be
 * written back to is issuing notices, not corresponding, and the moment a
 * person most needs to reply is the moment something has gone wrong.
 */

export const MAILBOX_KEYS = ['laurels', 'concierge', 'security', 'concerns'] as const;
export type MailboxKey = (typeof MAILBOX_KEYS)[number];

/** The domain every PALMA address sits on. Stated once. */
export const MAIL_DOMAIN = 'palmaawards.com';

export const MAILBOX_ADDRESSES: Record<MailboxKey, string> = {
  laurels: `laurels@${MAIL_DOMAIN}`,
  concierge: `concierge@${MAIL_DOMAIN}`,
  security: `security@${MAIL_DOMAIN}`,
  concerns: `concerns@${MAIL_DOMAIN}`,
};

/** The display name each voice signs with. */
export const MAILBOX_NAMES: Record<MailboxKey, string> = {
  laurels: 'PALMA',
  concierge: 'PALMA Concierge',
  security: 'PALMA Security',
  concerns: 'PALMA',
};

export function mailbox(key: MailboxKey): string {
  return MAILBOX_ADDRESSES[key];
}
