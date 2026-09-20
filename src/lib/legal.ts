/**
 * The PALMA legal register.
 *
 * These documents live in git rather than in the database, deliberately. The
 * database is the source of truth for the *record* — who was nominated, who
 * judged, who won. A legal document is different: it has to be diffable,
 * reviewable, attributable to a commit, and impossible to change without that
 * change being visible. Version control is the right store for it.
 *
 * Every document carries a version and an effective date, so a clause can be
 * cited in a complaint and the version that governed a past season can be
 * produced. `superseded` exists for when a document is replaced: the old text
 * stays readable at its own version rather than disappearing, because an
 * institution that quietly rewrites its terms has no terms.
 */

import { mailbox } from '@/domain/mailboxes';

export type LegalStatus = 'in-force' | 'superseded';

export type LegalDocument = {
  slug: string;
  title: string;
  /** Used in navigation and breadcrumbs. */
  shortTitle: string;
  /** One sentence, for the register and for search results. */
  summary: string;
  /** What this document is *for*, in the plainest words available. */
  plainly: string;
  version: string;
  effective: string;
  status: LegalStatus;
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    shortTitle: 'Terms',
    summary:
      'The terms on which PALMA accepts nominations, confers honours and maintains the record.',
    plainly:
      'What you agree to by using PALMA, what PALMA agrees to, and what happens when either of us gets it wrong.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'privacy',
    title: 'Privacy Notice',
    shortTitle: 'Privacy',
    summary:
      'What personal data PALMA holds, why, for how long, and the things it has deliberately chosen not to hold.',
    plainly:
      'What we know about you, why we know it, how long we keep it, and how to make us stop.',
    version: '1.1',
    effective: '2026-09-14',
    status: 'in-force',
  },
  {
    slug: 'how-we-got-your-information',
    title: 'How PALMA got your information',
    shortTitle: 'Where this came from',
    summary:
      'The Article 14 notice: what PALMA holds about a creator who never gave it anything, where each field came from, and how to have the record removed.',
    plainly:
      'We wrote a record about you without asking. Here is everything in it, where we got it, and how to make it go away.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'cookies',
    title: 'Cookie Notice',
    shortTitle: 'Cookies',
    summary:
      'The two cookies PALMA sets, both strictly necessary, the single preference it stores, how pages are counted without identifying anyone, and why there is no consent banner.',
    plainly:
      'We set two cookies and remember one preference. We count pages, never people. None of it watches you, which is why there is no banner.',
    version: '1.1',
    effective: '2026-09-14',
    status: 'in-force',
  },
  {
    slug: 'rules',
    title: 'Competition Rules',
    shortTitle: 'Rules',
    summary:
      'The rules of a PALMA season: eligibility, nomination, screening, judging, selection and announcement.',
    plainly: 'How a PALMA is actually decided, start to finish.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'complaints',
    title: 'Complaints and Appeals',
    shortTitle: 'Complaints',
    summary:
      'How to challenge a decision, report a concern about the record, or complain about PALMA itself.',
    plainly: 'How to tell us we got it wrong, and what we have to do about it.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'mark',
    title: 'Use of the PALMA Mark',
    shortTitle: 'The mark',
    summary:
      'How finalists, winners, sponsors and the press may use the PALMA name, mark and seal, and how they may not.',
    plainly: 'You won one. Here is exactly what you are allowed to say and show.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
  {
    slug: 'accessibility',
    title: 'Accessibility Statement',
    shortTitle: 'Accessibility',
    summary:
      'What PALMA has built to WCAG 2.2 AA, what is known to fall short, and how to tell us about a barrier.',
    plainly: 'What works, what does not yet, and how to report something that stops you.',
    version: '1.0',
    effective: '2026-09-01',
    status: 'in-force',
  },
];

export function legalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}

/**
 * Addresses printed across the legal register and the contact page.
 *
 * These collapse onto the four mailboxes PALMA actually reads (see
 * `src/server/email/addresses.ts`). Seven published addresses where three are
 * aspirational is worse than four that are staffed: a person writing to an
 * inbox nobody opens has been refused without being told so. The keys stay
 * distinct because the *reason* someone is writing still differs, and the page
 * should name it.
 *
 * There is no noreply@ here either. Every address PALMA prints accepts replies.
 */
/**
 * Where to write about what.
 *
 * Seven reasons, four inboxes, and not a single address typed out here: they
 * come from `domain/mailboxes`, which the mailer reads too. This used to be a
 * second hardcoded copy of the same four strings, and a copy is a rename away
 * from a legal page inviting people to write somewhere nobody reads.
 */
export const CONTACTS = {
  /** The desk: accounts, records, claims, anything in progress. */
  general: mailbox('concierge'),
  /** Data protection, complaints and appeals. */
  privacy: mailbox('concerns'),
  /** Vulnerabilities and account safety. */
  security: mailbox('security'),
  /** Integrity of the record — forged verification, manipulated nominations. */
  integrity: mailbox('concerns'),
  press: mailbox('concierge'),
  partnerships: mailbox('concierge'),
  accessibility: mailbox('concierge'),
} as const;

export const ENTITY = {
  name: 'Palma Awards Ltd',
  tradingAs: 'PALMA',
  jurisdiction: 'England and Wales',
  /** Placeholders until the company is registered. Marked as such on the page. */
  companyNumber: null as string | null,
  registeredOffice: null as string | null,
  /**
   * ICO data-protection registration.
   *
   * Two fields because there are three states and one field can only carry
   * two. `icoRegistered` is the fact; `icoRegistration` is the ZA reference,
   * which arrives with the confirmation. Registered-but-reference-not-yet-
   * recorded is a real state, and the register says exactly that rather than
   * claiming an application is still pending after it has been granted.
   */
  icoRegistered: true,
  icoRegistration: null as string | null,
  /**
   * The parent, recorded and not published.
   *
   * PALMA is a One Cō Ltd company. That is true, it is kept here so the
   * institution knows its own ownership, and it is shown on the settings
   * screen behind a login. It is deliberately absent from every public
   * surface: the footer, the legal register, the metadata, the JSON-LD,
   * `llms.txt` and the well-known files.
   *
   * Nothing requires it to be there. UK law makes the *operator* identifiable,
   * which is `name` above, and the data controller identifiable, which is the
   * same company. A parent company is not a required disclosure, so naming it
   * was a choice and not naming it is equally a choice.
   *
   * Be clear about what this does and does not achieve: it keeps the link off
   * PALMA's own pages, and it does nothing to Companies House, which publishes
   * officers and persons of significant control for every company on its own
   * register regardless of what a website says.
   */
  parent: {
    name: 'One Cō Ltd',
    companyNumber: null as string | null,
    published: false,
  },
} as const;

/**
 * How the ICO registration reads on the register, at each of its three stages.
 */
export function icoStatus(entity: {
  icoRegistered: boolean;
  icoRegistration: string | null;
}): string {
  if (entity.icoRegistration) return entity.icoRegistration;
  return entity.icoRegistered ? 'Registered; reference to follow' : 'Application pending';
}
