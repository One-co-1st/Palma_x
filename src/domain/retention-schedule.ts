/**
 * The retention schedule, stated once.
 *
 * It lives in the domain rather than in the service that applies it, so the
 * privacy notice and the sweep read the same list. A published period that
 * differs from the one the job enforces is worse than no published period.
 */

export type RetentionRule = {
  key: string;
  /** What it removes, in the operator's words — and the reader's. */
  description: string;
  days: number;
};

export const RETENTION_RULES: RetentionRule[] = [
  {
    key: 'auth_sessions',
    description: 'Expired and revoked sign-in sessions.',
    days: 30,
  },
  {
    key: 'password_resets',
    description: 'Spent and expired password reset links.',
    days: 7,
  },
  {
    key: 'email_changes',
    description: 'Completed, cancelled and expired address-change requests.',
    days: 30,
  },
  {
    key: 'rate_limits',
    description: 'Rate-limit counters whose window has closed.',
    days: 2,
  },
  {
    key: 'subscriptions_left',
    description:
      'Addresses that unsubscribed from a PALMA list. Kept briefly to honour the unsubscribe, then removed entirely.',
    days: 90,
  },
  {
    key: 'email_deliveries',
    description:
      'Delivery records for messages that were sent successfully. Failures are kept longer, because they are the ones somebody still has to act on.',
    days: 180,
  },
  {
    key: 'email_deliveries_failed',
    description: 'Delivery records for messages that failed or bounced.',
    days: 365,
  },
  {
    key: 'dossier_archived',
    description:
      'Filed Dossier entries that are not consequential. Anything marked consequential is kept, because it is the notice that PALMA did something to you.',
    days: 730,
  },
];

export function retentionDays(key: string): number {
  return RETENTION_RULES.find((rule) => rule.key === key)?.days ?? 365;
}
