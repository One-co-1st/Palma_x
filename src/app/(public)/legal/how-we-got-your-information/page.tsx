import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clauses,
  LegalDocumentPage,
  LegalTable,
  type LegalSection,
} from '@/components/palma/LegalDocument';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS, ENTITY, legalDocument } from '@/lib/legal';
import { UNCLAIMED_RECORD_FIELDS } from '@/domain/record-minimalism';

export const metadata = buildMetadata({
  title: 'How PALMA got your information',
  description:
    'PALMA writes creator records before creators have accounts. This is where that information came from, and how to have the record removed.',
  path: '/legal/how-we-got-your-information',
});

/**
 * The Article 14 notice.
 *
 * UK GDPR Article 14 applies whenever personal data is obtained from somewhere
 * other than the person it concerns — which is every unclaimed PALMA record.
 * It requires PALMA to tell that person what it holds, where it came from, why,
 * and what they can do about it.
 *
 * Most organisations discharge this with a paragraph nobody finds. PALMA links
 * it from every unclaimed record, because a notice nobody reads has not
 * notified anybody.
 */
export default function HowWeGotYourInformationPage() {
  const doc = legalDocument('how-we-got-your-information');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'Why you are reading this',
      plainly: 'PALMA has written a record about you, and you never gave PALMA anything.',
      body: (
        <>
          <p>
            PALMA is an awards body. It writes a record about a creator when somebody nominates
            them, or when the editorial desk establishes that a creator belongs in the archive of
            their industry. Both of those happen before the creator has an account, and usually
            before they have heard of PALMA.
          </p>
          <p>
            That means PALMA obtained information about you from somewhere other than you, and UK
            GDPR Article 14 requires PALMA to tell you so. This page is that notice. It is linked
            from every record PALMA holds that nobody has claimed.
          </p>
          <p>
            The controller is {ENTITY.name}, incorporated in {ENTITY.jurisdiction}. Write to{' '}
            <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
              {CONTACTS.privacy}
            </a>{' '}
            and a person replies.
          </p>
        </>
      ),
    },
    {
      heading: 'Everything PALMA holds',
      plainly: 'Four things. There is no second file.',
      body: (
        <>
          <LegalTable
            caption="An unclaimed creator record, the complete list"
            head={['Field', 'Why an awards archive needs it', 'Where it came from']}
            rows={UNCLAIMED_RECORD_FIELDS.map((field) => [field.label, field.why, field.source])}
          />
          <p>
            That is the whole record. PALMA does not hold, and will not add, a city, an address, a
            date of birth, an age, contact details, a legal name where you work under another one, a
            biography written by anyone but you, or anything a nominator wrote about you.
          </p>
          <p className="font-display text-ink text-lg leading-snug">
            PALMA never collects information about an unclaimed creator merely because it might be
            useful later.
          </p>
          <p>
            That is a rule enforced in PALMA&rsquo;s code, not a statement of intent: the routes
            that write an unclaimed record strip anything beyond the list above before storing it,
            and a test fails if that changes.
          </p>
        </>
      ),
    },
    {
      heading: 'Where it came from',
      plainly: 'Your own public professional presence, a nomination, or editorial research.',
      body: (
        <>
          <Clauses
            items={[
              <>
                <strong>Your own public work.</strong> A link you published on a platform you
                control, and the name you publish it under. This is the main source, and it is the
                reason PALMA considers the information appropriate to publish at all.
              </>,
              <>
                <strong>A nomination.</strong> Somebody put your name forward. PALMA takes the name
                and the category from it.{' '}
                <strong>It does not take what they wrote about you</strong>. Nomination text goes to
                the panel and is never published, never shown on your record, and never disclosed to
                you or anyone else as a description of you.
              </>,
              <>
                <strong>Editorial research by PALMA.</strong> Checking that a creator exists, works
                under the name given, and is the person the nomination meant. Done by a person, from
                sources the creator published themselves.
              </>,
            ]}
          />
          <p>
            PALMA does not buy data, does not scrape platforms in bulk, and does not use data
            brokers or enrichment services. If a field could not be justified in one sentence in the
            table above, it is not collected.
          </p>
        </>
      ),
    },
    {
      heading: 'The lawful basis, honestly',
      plainly:
        'Legitimate interests. Not your consent, PALMA does not have it and does not claim to.',
      body: (
        <>
          <p>
            PALMA relies on <strong>legitimate interests</strong>, UK GDPR Article 6(1)(f): the
            interest of maintaining an accurate public record of achievement in an industry,
            balanced against your interests and rights.
          </p>
          <p>
            PALMA is <em>not</em> relying on your consent. Consent you never gave is not consent,
            and an organisation that claims it is making a legal error and an ethical one.
          </p>
          <p>
            The balance works because the record is minimal, because it is drawn from what you
            published yourself, because nothing sensitive is in it, and because you can end it. If
            that last part stopped being true, the basis would stop holding, which is why the
            objection route below exists as a page rather than an inbox.
          </p>
        </>
      ),
    },
    {
      heading: 'How to make it stop',
      plainly: 'Say so. For an unclaimed record, the answer is normally yes.',
      body: (
        <>
          <p>
            Under Article 21 you may object to processing based on legitimate interests. For an
            unclaimed record PALMA treats an objection from the person named as decisive: the record
            comes down.
          </p>
          <p>
            There is a link on every unclaimed record, <em>ask PALMA to remove it</em>, and it needs
            no account and no reason. PALMA keeps only a minimal note that the record was removed
            and must not be recreated, which exists so that a later nomination does not quietly put
            you back.
          </p>
          <p>
            You may also ask for a copy of what PALMA holds, ask for a correction, or complain to
            the Information Commissioner&rsquo;s Office at{' '}
            <a href="https://ico.org.uk/make-a-complaint/" className="palma-link text-ink">
              ico.org.uk
            </a>{' '}
            , at any time, including without contacting PALMA first.
          </p>
          <p>
            The one thing PALMA will normally keep is an honour it has already conferred. That is
            explained, with the limits on it, in the{' '}
            <Link href="/legal/privacy" className="palma-link text-ink">
              privacy notice
            </Link>
            . Even then the record can be reduced to the achievement itself, a name, a category, a
            year.
          </p>
        </>
      ),
    },
    {
      heading: 'Why PALMA does it this way at all',
      plainly: 'An archive that only lists volunteers is not a record of an industry.',
      body: (
        <>
          <p>
            An awards body that could only name people who had signed up would not be recording an
            industry; it would be recording its own mailing list. The people most worth recognising
            are frequently the people not paying attention to awards.
          </p>
          <p>
            That is a real justification, and it is also exactly the argument every organisation
            makes just before it starts hoarding. So PALMA accepts the constraint that goes with it:
            the record stays minimal, it comes down on request, and none of it depends on anybody
            trusting PALMA&rsquo;s good intentions.
          </p>
        </>
      ),
    },
  ];

  return <LegalDocumentPage document={doc} sections={sections} />;
}
