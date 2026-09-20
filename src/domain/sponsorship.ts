/**
 * Where a sponsor's name appears, and where it does not.
 *
 * The architecture in one line: **association follows the thing they funded.**
 *
 *   Category sponsor   → that category, and the finalist and winner pages
 *                        beneath it.
 *   Event sponsor      → that event.
 *   Editorial sponsor  → that article, labelled as partner content.
 *   Principal partner  → the institution: the partners page, the season page,
 *                        the ceremony.
 *
 * Nothing bleeds. Buying a category does not put a logo on the Journal, and
 * buying the Journal does not put one on a category. That restraint is what
 * keeps the site worth sponsoring: a page covered in logos is worth less to
 * every logo on it.
 *
 * And the attribution appears *beside* the thing, never in place of it. The
 * category is the headline; the sponsor is a line under it in small type.
 */

export type Placement = 'category' | 'event' | 'editorial' | 'principal';

export type PlacementRule = {
  key: Placement;
  name: string;
  /** What a sponsor is buying, in the words a salesperson would use. */
  buys: string;
  /** Where the attribution renders. */
  appearsOn: string[];
  /** The default wording. The desk can override it; the sponsor cannot. */
  attribution: string;
  /** Which column on Sponsorship must be set. Null for principal. */
  target: 'categoryId' | 'eventId' | 'articleId' | null;
};

export const PLACEMENTS = {
  category: {
    key: 'category',
    name: 'Category partner',
    buys: 'One category for one season, and the honours conferred in it.',
    appearsOn: [
      'The category page',
      'The finalists page, beside that category',
      'The winner page for that category',
      'The season page, in the partners row',
    ],
    attribution: 'Presented by',
    target: 'categoryId',
  },
  event: {
    key: 'event',
    name: 'Event partner',
    buys: 'One PALMA event: the announcement, the night itself, and its page.',
    appearsOn: ['The event page', 'Event communications', 'On-night materials'],
    attribution: 'In partnership with',
    target: 'eventId',
  },
  editorial: {
    key: 'editorial',
    name: 'Editorial partner',
    buys: 'One Journal article, labelled as partner content on its face.',
    appearsOn: ['The article itself, labelled', 'The Journal index, labelled'],
    attribution: 'Partner feature with',
    target: 'articleId',
  },
  principal: {
    key: 'principal',
    name: 'Principal partner',
    buys: 'Association with PALMA itself, across the season.',
    appearsOn: ['The partners page', 'The season page', 'The ceremony'],
    attribution: 'Principal partner',
    target: null,
  },
} as const satisfies Record<Placement, PlacementRule>;

export const PLACEMENT_LIST: PlacementRule[] = Object.values(PLACEMENTS);

export function placement(key: Placement): PlacementRule {
  return PLACEMENTS[key];
}

export function isPlacement(value: string): value is Placement {
  return Object.prototype.hasOwnProperty.call(PLACEMENTS, value);
}

/**
 * Is this placement pointing at the right kind of thing?
 *
 * A category placement with no category, or an editorial placement carrying an
 * event, is a mistake somebody will otherwise discover when a logo appears in
 * the wrong place on the night.
 */
export function placementTargetIsValid(input: {
  placement: Placement;
  categoryId?: string | null;
  eventId?: string | null;
  articleId?: string | null;
}): boolean {
  const required = PLACEMENTS[input.placement].target;

  const set = [
    input.categoryId ? 'categoryId' : null,
    input.eventId ? 'eventId' : null,
    input.articleId ? 'articleId' : null,
  ].filter(Boolean);

  if (required === null) return set.length === 0;
  return set.length === 1 && set[0] === required;
}

/**
 * What the public is told, given a placement and a sponsor.
 *
 * Deliberately one short line rather than a block. The thing being sponsored
 * is the headline; this sits under it in small type, and a reader who does not
 * care can ignore it entirely.
 */
export function attributionFor(input: {
  placement: Placement;
  sponsorName: string;
  override?: string | null;
}): string {
  const prefix = input.override?.trim() || PLACEMENTS[input.placement].attribution;
  return `${prefix} ${input.sponsorName}`;
}

/**
 * Whether an attribution may be shown at all.
 *
 * Four things have to be true, and every one of them has bitten somebody
 * somewhere: the feature is on, the association is approved, the sponsor
 * relationship is live, and the window is open. A sponsorship that has expired
 * quietly keeps its logo up otherwise.
 */
export function attributionIsVisible(input: {
  featureLive: boolean;
  isApproved: boolean;
  sponsorIsActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  now?: Date;
}): boolean {
  if (!input.featureLive || !input.isApproved || !input.sponsorIsActive) return false;

  const now = input.now ?? new Date();
  if (input.startsAt && new Date(input.startsAt) > now) return false;
  if (input.endsAt && new Date(input.endsAt) <= now) return false;

  return true;
}
