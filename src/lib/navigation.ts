export type NavItem = {
  href: string;
  label: string;
  /** Labels whose casing is part of the name, such as PaROH. */
  preserveCase?: boolean;
};

/**
 * Seven destinations, not nine.
 *
 * Finalists and Winners are *states of a season*, not permanent places: they
 * live inside the Awards experience and are reached from the season rail. The
 * navigation names what PALMA is, rather than listing its database tables.
 *
 * THE PALMA is the exception that proves the rule and the reason the list is
 * seven rather than six. It is not a state of a season and not a category: it
 * is the institution's highest honour, permanent, and the one name PALMA wants
 * said out loud. A thing nobody can find in the navigation is a thing nobody
 * asks about.
 */
export const PUBLIC_NAV: NavItem[] = [
  { href: '/the-palma', label: 'THE PALMA', preserveCase: true },
  { href: '/awards', label: 'Awards' },
  { href: '/categories', label: 'Categories' },
  { href: '/nominate', label: 'Nominate' },
  { href: '/paroh', label: 'PaROH', preserveCase: true },
  { href: '/kulture', label: 'Kulture' },
  { href: '/about', label: 'About' },
];

/**
 * The footer, as a branching structure rather than four flat lists.
 *
 * A column is a trunk; a branch is a named group of destinations hanging off
 * it. This exists because "Institution" had eleven links in a single run while
 * its neighbours had four, which made the footer tall, ragged and hard to scan.
 * Splitting the long trunk into named branches lets the column sit two abreast,
 * so the same eleven destinations occupy roughly half the height and arrive
 * sorted rather than piled.
 *
 * It is also the right shape for this institution. The mark is a spine with
 * fronds coming off it, and the footer is drawn the same way: a rule down the
 * side of each branch with a short stub out to every item.
 */
export type FooterBranch = { title?: string; items: NavItem[] };
export const FOOTER_NAV: { title: string; branches: FooterBranch[] }[] = [
  {
    title: 'The Honours',
    branches: [
      {
        items: [
          { href: '/the-palma', label: 'THE PALMA' },
          { href: '/awards', label: 'Awards' },
          { href: '/categories', label: 'Categories' },
          { href: '/finalists', label: 'Finalists' },
          { href: '/winners', label: 'Winners' },
          { href: '/paroh', label: 'PALMA Roll of Honour' },
        ],
      },
    ],
  },
  {
    title: 'Take part',
    branches: [
      {
        items: [
          { href: '/nominate', label: 'Nominate a creator' },
          { href: '/creators', label: 'Creators' },
          { href: '/verify', label: 'Verify an honour' },
          { href: '/report', label: 'Report a concern' },
        ],
      },
    ],
  },
  {
    title: 'Institution',
    branches: [
      {
        title: 'About',
        items: [
          { href: '/about', label: 'About PALMA' },
          { href: '/about/judging', label: 'How judging works' },
          { href: '/about/judges', label: 'The panel' },
          { href: '/about/policy', label: 'Content policy' },
        ],
      },
      {
        title: 'Reading',
        items: [
          { href: '/kulture', label: 'Kulture' },
          { href: '/journal', label: 'The Journal' },
        ],
      },
      {
        title: 'Mailing lists',
        items: [
          { href: '/lists/awards', label: 'PALMA Awards' },
          { href: '/lists/journal', label: 'PALMA Journal' },
        ],
      },
      {
        title: 'Enquiries',
        items: [
          { href: '/about/sponsors', label: 'Partners' },
          { href: '/press', label: 'Press' },
          { href: '/contact', label: 'Contact' },
        ],
      },
    ],
  },
  {
    title: 'Account',
    branches: [
      {
        // The staff doors are not advertised. A judge, moderator or
        // administrator was told their path when they were invited, and
        // listing all four in the footer only tells everyone else where the
        // privileged entrances are.
        items: [
          { href: '/creator', label: 'Creators' },
          { href: '/humans.txt', label: 'humans.txt' },
        ],
      },
    ],
  },
];

/**
 * The legal register, rendered as a fourth footer row rather than inside a
 * column. A reader looking for the terms is not browsing; they want the list.
 */
export const LEGAL_NAV: NavItem[] = [
  { href: '/legal', label: 'Legal register' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/how-we-got-your-information', label: 'Where this came from' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/rules', label: 'Competition rules' },
  { href: '/legal/complaints', label: 'Complaints' },
  { href: '/legal/mark', label: 'Use of the mark' },
  { href: '/legal/accessibility', label: 'Accessibility' },
];
