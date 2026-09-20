import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clauses,
  LegalDocumentPage,
  LegalTable,
  type LegalSection,
} from '@/components/palma/LegalDocument';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS, legalDocument } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Accessibility Statement',
  description:
    'PALMA targets WCAG 2.2 AA. What has been built to that standard, what is known to fall short, and how to report a barrier.',
  path: '/legal/accessibility',
});

export default function AccessibilityPage() {
  const doc = legalDocument('accessibility');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'The commitment',
      plainly: 'WCAG 2.2 AA, and an honest list of where we are not there yet.',
      body: (
        <>
          <p>
            PALMA targets WCAG 2.2 Level AA across the whole public site and all four portals. The
            archive is meant to be readable by anyone, permanently; a record that some people cannot
            read is not a public record.
          </p>
          <p>
            This statement says what has been done, what has been tested, and, in its own section
            below, what is known not to meet the standard yet. A statement that lists only successes
            is marketing.
          </p>
        </>
      ),
    },
    {
      heading: 'What has been built in',
      plainly: 'Keyboard, contrast, motion, structure, and no traps.',
      body: (
        <Clauses
          items={[
            'Every interactive element is reachable and operable by keyboard, in a logical order, with a visible focus ring that does not rely on colour alone. There are no keyboard traps.',
            'A skip link leads to the main content on every page.',
            'Text meets a contrast ratio of at least 4.5:1 against its background in all three themes, and each category pigment is paired with a darkened tone used wherever the pigment would carry text.',
            'Every animation is behind prefers-reduced-motion. With it set, content is shown in place rather than hidden until approached, and the heavy visual layers are never downloaded at all.',
            'Headings are hierarchical and used for structure, not size. Landmarks are real elements, and every region has a name.',
            'Forms have real labels, errors named in text, and validation messages associated with their field rather than announced loosely.',
            'Colour never carries meaning alone. Every state, open, closed, verified, revoked, is also words.',
            'The three themes, including a high-contrast ink theme, are chosen by the reader and remembered without an account.',
            'Text reflows to 320px without a horizontal scrollbar, and to 400% zoom without loss of content.',
          ]}
        />
      ),
    },
    {
      heading: 'Known shortfalls',
      plainly: 'These do not meet the standard yet. Here they are, with dates.',
      body: (
        <>
          <LegalTable
            caption="Open accessibility issues"
            head={['Where', 'The problem', 'Status']}
            rows={[
              [
                'The trophy on the winner reveal',
                'The three-dimensional trophy is decorative and hidden from assistive technology, but it has no textual description of the object itself.',
                'A described alternative is planned before the first ceremony.',
              ],
              [
                'Long archive tables',
                'The Roll of Honour filters update results without an explicit live-region announcement of how many entries matched.',
                'Being fixed.',
              ],
              [
                'The seal',
                'The engraved seal is an image of text at small sizes. It is always accompanied by the same information in real text, but the seal itself does not scale as text.',
                'Accepted for now, mitigated by the adjacent text.',
              ],
              [
                'Third-party age assurance',
                'The verification step is performed by an external provider whose interface PALMA does not control and has not audited.',
                'Provider’s own conformance is being requested before launch.',
              ],
            ]}
          />
          <p>
            No full independent audit has been carried out yet. The claims above are based on
            PALMA&rsquo;s own testing. Keyboard traversal, screen-reader passes, automated checks,
            and rendering at 320, 390, 768 and 1440 pixels in every theme. An external audit is
            planned before the first ceremony, and its findings will be published here whatever they
            say.
          </p>
        </>
      ),
    },
    {
      heading: 'Reporting a barrier',
      plainly: 'Tell us what stopped you. We will answer, and we will say when it is fixed.',
      body: (
        <>
          <p>
            Write to{' '}
            <a href={`mailto:${CONTACTS.accessibility}`} className="palma-link text-ink">
              {CONTACTS.accessibility}
            </a>
            . Tell us the page, what you were trying to do, what stopped you, and what you are using
            , a screen reader and its version, a browser, a magnifier, keyboard only. Any of that
            helps; none of it is required.
          </p>
          <Clauses
            items={[
              'PALMA acknowledges within 5 working days.',
              'PALMA gives a substantive answer within 20 working days, including whether it will fix the issue and by when.',
              'If something blocks you from nominating while a season is open, say so, PALMA will take the nomination another way rather than let a barrier cost a creator their entry.',
              'Confirmed barriers are added to the table above, publicly, until they are fixed.',
            ]}
          />
          <p>
            If you are not satisfied with the response, the escalation route is the complaints
            procedure in{' '}
            <Link href="/legal/complaints" className="palma-link text-ink">
              Complaints and Appeals
            </Link>
            . In the United Kingdom you may also contact the Equality Advisory and Support Service.
          </p>
        </>
      ),
    },
    {
      heading: 'How this statement is maintained',
      plainly: 'Reviewed every season, and updated when something changes.',
      body: (
        <p>
          This statement is reviewed at the start of every season and whenever a substantial change
          ships. It carries a version and an effective date at the top of the page, and it is kept
          in version control with the rest of the site, so an amendment to it has an author and a
          date like any other change.
        </p>
      ),
    },
  ];

  return (
    <LegalDocumentPage
      document={doc}
      sections={sections}
      intro={
        <p>
          PALMA is a permanent public archive. The test of one is not how it looks to the people who
          built it, but whether someone reading it with a screen reader in ten years can still find
          out who won.
        </p>
      }
    />
  );
}
