/**
 * PALMA's commercial rails.
 *
 * The catalogue lives here, in code. The *state* — on, off, when, for which
 * season — lives in the database. That split is deliberate: the set of things
 * PALMA is capable of selling should be readable in one file and impossible to
 * invent by inserting a row, while whether any of them is running today is an
 * operator's decision rather than a deployment.
 *
 * The principle every entry below is arranged around:
 *
 *     Never sell PALMA recognition. Sell the ecosystem around it.
 *
 * Nothing here can reach a nomination, a score, a finalist or a winner. That
 * is not a convention — `OUTCOME_PERMISSIONS` in `src/lib/auth/rbac.ts` names
 * the decisions that are off-limits to commercial roles, and a test asserts
 * the lists stay disjoint.
 *
 * Everything ships off. Build the rails now; turn the trains on when PALMA is
 * ready.
 */

export type FeatureKey =
  | 'category_sponsorship'
  | 'partner_programme'
  | 'event_ticketing'
  | 'vip_hospitality'
  | 'winner_kits'
  | 'physical_awards'
  | 'award_mark_licensing'
  | 'sponsored_editorial'
  | 'creator_opportunities'
  | 'partner_offers'
  | 'palma_insights'
  | 'product_library';

export type Feature = {
  key: FeatureKey;
  name: string;
  /** What it is, for the administrator deciding whether to switch it on. */
  purpose: string;
  /**
   * What PALMA must have in place first. Shown beside the switch, because a
   * feature turned on before its prerequisite is how a public page ends up
   * advertising something that does not exist.
   */
  requires: string;
  /** The group it sits in on the settings page. */
  group: 'Sponsorship' | 'Events' | 'Recognition' | 'Editorial & community' | 'Insight';
  /**
   * Whether the setting can differ by season. Sponsorship can — 2028 may be
   * sponsored while 2027 stays as it was. Account-level things cannot.
   */
  seasonAware: boolean;
  /**
   * Turning it on changes what the public sees, so it is never a quiet switch.
   */
  publicFacing: boolean;
};

export const FEATURES = {
  category_sponsorship: {
    key: 'category_sponsorship',
    name: 'Category sponsorship',
    purpose:
      'Lets a category carry “presented by”. The sponsor buys the association and nothing else, not eligibility, not weighting, not judging, not selection.',
    requires: 'At least one active sponsor with a signed agreement, and an approved association.',
    group: 'Sponsorship',
    seasonAware: true,
    publicFacing: true,
  },
  partner_programme: {
    key: 'partner_programme',
    name: 'Partner programme',
    purpose:
      'Institutional partnership above the category level: site visibility, event presence, selected editorial association.',
    requires: 'Published packages, and a partner page to send people to.',
    group: 'Sponsorship',
    seasonAware: true,
    publicFacing: true,
  },
  event_ticketing: {
    key: 'event_ticketing',
    name: 'Event ticketing',
    purpose:
      'Public ticket sales for a PALMA event. General admission, premium, and the tables companies buy for clients.',
    requires:
      'A confirmed event with a venue and a date, and a payment provider. PALMA has neither yet, and this stays off until it does.',
    group: 'Events',
    seasonAware: true,
    publicFacing: true,
  },
  vip_hospitality: {
    key: 'vip_hospitality',
    name: 'VIP and hospitality',
    purpose: 'Premium seating, tables and sponsor hospitality against a confirmed event.',
    requires: 'Event ticketing, and an event whose seating plan actually exists.',
    group: 'Events',
    seasonAware: true,
    publicFacing: true,
  },
  winner_kits: {
    key: 'winner_kits',
    name: 'Winner kits',
    purpose:
      'Commemorative products offered to somebody who has already won. The recognition itself stays free, always.',
    requires: 'Winners in the current season, and something to actually send them.',
    group: 'Recognition',
    seasonAware: true,
    publicFacing: true,
  },
  physical_awards: {
    key: 'physical_awards',
    name: 'Physical awards',
    purpose: 'Tracking the manufacture and delivery of trophies against conferred honours.',
    requires: 'A manufacturer. Do not promise a trophy because the data model exists.',
    group: 'Recognition',
    seasonAware: true,
    publicFacing: false,
  },
  award_mark_licensing: {
    key: 'award_mark_licensing',
    name: 'Award mark licensing',
    purpose:
      'Formal permission to use the PALMA mark, granted against a real achievement, which is what eventually stops fabricated badges.',
    requires: 'A registered mark, and licence terms written by a solicitor.',
    group: 'Recognition',
    seasonAware: false,
    publicFacing: true,
  },
  product_library: {
    key: 'product_library',
    name: 'Product Library',
    purpose:
      'A short, curated list of products genuinely relevant to creators, each with a PALMA verdict, its strengths and its limitations. Sponsorship only: no affiliate links and no commission, and a sponsor cannot move a verdict.',
    requires:
      'Twenty or thirty products somebody has actually used, and an editor with time to keep them honest. A catalogue nobody looked at is worse than no library.',
    group: 'Editorial & community',
    seasonAware: false,
    publicFacing: true,
  },
  sponsored_editorial: {
    key: 'sponsored_editorial',
    name: 'Sponsored editorial',
    purpose:
      'Partner content in the Journal, labelled on its face. A sponsor never publishes: an editor approves and the association is recorded.',
    requires: 'An editorial policy on labelling, and a partner worth running.',
    group: 'Editorial & community',
    seasonAware: false,
    publicFacing: true,
  },
  creator_opportunities: {
    key: 'creator_opportunities',
    name: 'Creator opportunities',
    purpose:
      'Curated opportunities passed to creators who asked for them. Not a marketplace, and PALMA brokers nothing.',
    requires: 'Enough genuine opportunities that the list is worth opening. One is not enough.',
    group: 'Editorial & community',
    seasonAware: false,
    publicFacing: true,
  },
  partner_offers: {
    key: 'partner_offers',
    name: 'Partner offers',
    purpose:
      'Commercial messages from partners, to people who separately opted in to exactly that. Never folded into an awards email.',
    requires: 'The partner programme, and subscribers who chose this list specifically.',
    group: 'Editorial & community',
    seasonAware: false,
    publicFacing: true,
  },
  palma_insights: {
    key: 'palma_insights',
    name: 'PALMA insights',
    purpose:
      'Aggregate, non-identifying reports on creator culture. Trends and distributions, never a database of people.',
    requires:
      'Enough seasons that an aggregate is meaningful, and a disclosure review before anything is published.',
    group: 'Insight',
    seasonAware: false,
    publicFacing: true,
  },
} as const satisfies Record<FeatureKey, Feature>;

export const FEATURE_LIST: Feature[] = Object.values(FEATURES);

export const FEATURE_GROUPS = [
  'Sponsorship',
  'Events',
  'Recognition',
  'Editorial & community',
  'Insight',
] as const;

/** Widened accessor — `as const satisfies` narrows each entry to its own shape. */
export function feature(key: FeatureKey): Feature {
  return FEATURES[key];
}

export function isFeatureKey(value: string): value is FeatureKey {
  return Object.prototype.hasOwnProperty.call(FEATURES, value);
}

export type FeatureState = {
  enabled: boolean;
  launchAt: string | null;
  endAt: string | null;
  config: Record<string, unknown> | null;
};

/**
 * Is this feature live right now?
 *
 * Three things have to agree: it is enabled, the window has opened, and the
 * window has not closed. A window that has expired reads as off however the
 * switch is set — an operator who scheduled an end date meant it.
 */
export function isLive(state: FeatureState | null | undefined, now: Date = new Date()): boolean {
  if (!state?.enabled) return false;
  if (state.launchAt && new Date(state.launchAt) > now) return false;
  if (state.endAt && new Date(state.endAt) <= now) return false;
  return true;
}

/**
 * Resolve one feature from a global setting and an optional season setting.
 *
 * A season-scoped row wins outright — including when it switches something
 * *off* that is globally on. Historical seasons must be able to say "not here"
 * regardless of what PALMA sells today.
 */
export function resolveFeature(input: {
  global: FeatureState | null;
  season: FeatureState | null;
  seasonAware: boolean;
}): FeatureState {
  const fallback: FeatureState = { enabled: false, launchAt: null, endAt: null, config: null };
  if (input.seasonAware && input.season) return input.season;
  return input.global ?? fallback;
}
