/**
 * PALMA's five lists.
 *
 * Declared here so the preference centre, the footer, the admin audiences and
 * the campaign targeting all read the same definition. The distinction that
 * matters most is not between the lists but between *all of them* and the
 * transactional mail in `src/server/email/register.ts`:
 *
 *   Essential mail is sent because PALMA owes it to you — a decision on your
 *   record, a security notice, something you asked for thirty seconds ago. It
 *   is not a subscription and there is nothing to opt into.
 *
 *   These five are subscriptions. Each is separately opt-in, separately opt-out,
 *   never pre-ticked, and never bundled into accepting the Terms. Leaving one
 *   leaves exactly one: somebody who no longer wants partner offers has not
 *   asked to stop being told who won.
 */

export type EmailListKey = 'awards' | 'journal' | 'events' | 'opportunities' | 'partner_offers';

export type EmailList = {
  key: EmailListKey;
  name: string;
  /** The sentence beside the checkbox. Written for the reader, not the lawyer. */
  description: string;
  /** How often, honestly. A schedule PALMA cannot keep is a promise it breaks. */
  cadence: string;
  /**
   * Whether this list carries commercial content. Partner offers do, and say
   * so on their face; nothing else may have a partner message folded into it.
   */
  commercial: boolean;
  /**
   * The feature that has to be live before PALMA offers this list at all.
   * Null means the list stands on its own.
   */
  requiresFeature: 'creator_opportunities' | 'partner_offers' | null;
};

export const EMAIL_LISTS = {
  awards: {
    key: 'awards',
    name: 'PALMA Awards',
    description:
      'When nominations open and close, when a shortlist is read, when the panel confers, and the season in review.',
    cadence: 'A handful of times a season.',
    commercial: false,
    requiresFeature: null,
  },
  journal: {
    key: 'journal',
    name: 'PALMA Journal',
    description:
      'Editorial: interviews, creator profiles, the stories behind the work, and what PALMA is thinking while it judges.',
    cadence: 'When there is something worth reading. Never to fill a schedule.',
    commercial: false,
    requiresFeature: null,
  },
  events: {
    key: 'events',
    name: 'PALMA Events',
    description:
      'Ceremony announcements, ticket releases, invitations and what you need to know on the night.',
    cadence: 'Only when there is an event.',
    commercial: false,
    requiresFeature: null,
  },
  opportunities: {
    key: 'opportunities',
    name: 'PALMA Opportunities',
    description:
      'Selected opportunities for creators: collaborations, applications, programmes. Curated, never a feed.',
    cadence: 'Occasional, and only when something is genuinely worth passing on.',
    commercial: false,
    requiresFeature: 'creator_opportunities',
  },
  partner_offers: {
    key: 'partner_offers',
    name: 'PALMA Partner Offers',
    description:
      'Commercial messages from PALMA partners. Separate on purpose: subscribing to anything else never puts you here.',
    cadence: 'Rare, and clearly marked as a partner message.',
    commercial: true,
    requiresFeature: 'partner_offers',
  },
} as const satisfies Record<EmailListKey, EmailList>;

export const EMAIL_LIST_ORDER: EmailListKey[] = [
  'awards',
  'journal',
  'events',
  'opportunities',
  'partner_offers',
];

export const EMAIL_LIST_VALUES: EmailList[] = EMAIL_LIST_ORDER.map((key) => EMAIL_LISTS[key]);

export function emailList(key: EmailListKey): EmailList {
  return EMAIL_LISTS[key];
}

export function isEmailListKey(value: string): value is EmailListKey {
  return Object.prototype.hasOwnProperty.call(EMAIL_LISTS, value);
}

/**
 * The consent text version.
 *
 * Bumped whenever the wording beside a checkbox materially changes, and stored
 * against each subscription — because the obligation is to be able to show what
 * somebody agreed to, not merely that they ticked something once.
 */
export const CONSENT_VERSION = '2026-09-01';
