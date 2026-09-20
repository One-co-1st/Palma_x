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
  title: 'Complaints and Appeals',
  description:
    'How to challenge a PALMA decision, report a concern about the record, or complain about the institution itself, with the timescales PALMA holds itself to.',
  path: '/legal/complaints',
});

export default function ComplaintsPage() {
  const doc = legalDocument('complaints');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'What this covers',
      plainly: 'Four different things go to four different places. Find yours first.',
      body: (
        <>
          <LegalTable
            caption="Route finder"
            head={['If you want to…', 'Use']}
            rows={[
              [
                'report abusive, illegal or policy-breaching content or conduct',
                <>
                  the{' '}
                  <Link key="r" href="/report" className="palma-link text-ink">
                    report form
                  </Link>
                </>,
              ],
              [
                'challenge a decision about your own nomination, candidacy or honour',
                'the appeal route below',
              ],
              [
                'correct something factually wrong in the public record',
                'a correction request below',
              ],
              [
                'complain about PALMA, its conduct, its staff, its handling of you',
                'the complaint route below',
              ],
              [
                'exercise a data protection right',
                <>
                  <a key="p" href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
                    {CONTACTS.privacy}
                  </a>
                </>,
              ],
            ]}
          />
          <p>
            If something is urgent, a credible threat to a person, or material that is illegal, do
            not wait for any of this. Use the report form, which is monitored, and contact the
            police. PALMA reports child sexual abuse material and credible threats to life to the
            relevant authorities immediately, without notifying the person who submitted it.
          </p>
        </>
      ),
    },
    {
      heading: 'Appealing a decision',
      plainly: 'One appeal, reviewed by someone who was not part of the original decision.',
      body: (
        <>
          <p>A creator may appeal a decision that directly concerns them, namely:</p>
          <Clauses
            items={[
              'a nomination or candidacy ruled ineligible at screening;',
              'a disqualification from a season;',
              'the revocation of an honour; or',
              'a refusal to make a correction to their own record.',
            ]}
          />
          <p>
            Appeals are not available against a judging outcome. Losing is not a ground of appeal,
            and PALMA will not re-score a category because a result was disappointing. What is
            appealable is a <em>process</em> failure: a rule applied wrongly, a fact relied on that
            was untrue, or a conflict of interest that should have been declared.
          </p>
          <Clauses
            items={[
              `Write to ${CONTACTS.integrity} within 28 days of being told the decision.`,
              'Say what the decision was, which of the grounds above applies, and what you say the correct outcome is.',
              'The appeal is reviewed by someone who took no part in the original decision. Where the original decision was the chair’s, the review goes outside the panel.',
              'PALMA acknowledges within 5 working days and decides within 20 working days, or tells you why it needs longer.',
              'The outcome is given in writing with reasons. There is one appeal, and the appeal decision is final.',
            ]}
          />
          <p>
            An appeal that succeeds after an announcement is corrected publicly. PALMA does not
            quietly re-edit a season; the Roll of Honour shows the correction and its date.
          </p>
        </>
      ),
    },
    {
      heading: 'Correcting the record',
      plainly: 'Tell us what is wrong and what is right. We fix it and log that we fixed it.',
      body: (
        <>
          <p>
            Anyone may ask for a correction to the public record, a misspelled name, a wrong
            country, a broken link, a mis-stated category. Write to{' '}
            <a href={`mailto:${CONTACTS.general}`} className="palma-link text-ink">
              {CONTACTS.general}
            </a>{' '}
            saying what is wrong and what it should say.
          </p>
          <Clauses
            items={[
              'Corrections to a creator’s own details are made on request from that creator, once identity is confirmed.',
              'Corrections that change the meaning of an honour, the category, the season, the recipient, require the same scrutiny as conferring it, and are decided by an administrator, not by a request.',
              'Every correction is written to the audit log with the state before and after it, and by whom. Nothing on PALMA is edited silently.',
              'PALMA corrects; it does not delete. Where an entry was wrong, the record shows that it was corrected rather than pretending it always read this way.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'Complaining about PALMA',
      plainly: 'Three stages, each with a named timescale, ending outside PALMA if it has to.',
      body: (
        <>
          <LegalTable
            caption="Complaints procedure"
            head={['Stage', 'Who handles it', 'Timescale']}
            rows={[
              [
                'Stage one. First response',
                'The team responsible for the area complained about',
                'Acknowledged in 5 working days, answered in 20',
              ],
              [
                'Stage two. Review',
                'A director not involved in stage one',
                'Requested within 28 days of the stage one answer; decided in 20 working days',
              ],
              [
                'Stage three. External',
                'The relevant external body: the ICO for data protection, a court otherwise',
                'No PALMA timescale. It is not PALMA’s process',
              ],
            ]}
          />
          <p>
            Write to{' '}
            <a href={`mailto:${CONTACTS.general}`} className="palma-link text-ink">
              {CONTACTS.general}
            </a>
            , or to{' '}
            <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
              {CONTACTS.privacy}
            </a>{' '}
            if the complaint is about personal data. You are never required to exhaust PALMA&rsquo;s
            stages before going to the ICO, PALMA would prefer the chance to fix it first, but that
            is a preference, not a condition.
          </p>
        </>
      ),
    },
    {
      heading: 'What PALMA will not do',
      plainly: 'We will not use process to make a complaint go away.',
      body: (
        <Clauses
          items={[
            'PALMA will not make settlement of a complaint conditional on silence about it.',
            'PALMA will not withdraw or withhold an honour because someone complained.',
            'PALMA will not disclose a complainant’s identity to the person complained about, except where the law requires it or where the complaint cannot be investigated without it, in which case you are asked first.',
            'PALMA will not refuse to investigate because a complaint is anonymous, though an anonymous complaint limits what it can conclude and what it can tell you.',
            'PALMA will not publish judging material in response to a complaint. Confidentiality of the panel survives any dispute.',
          ]}
        />
      ),
    },
    {
      heading: 'Vexatious and repeated contact',
      plainly: 'We answer once. After that we may stop, and we will tell you we have.',
      body: (
        <p>
          Where a complaint has been through both stages and is then re-sent without new
          information, PALMA may decide not to correspond further. If it does, it says so
          explicitly, gives its reasons, and confirms the external routes still open to you. It will
          not simply stop replying.
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
          An institution that cannot be challenged is not trustworthy, it is merely unaccountable.
          This document sets out every route for disagreeing with PALMA, the timescales it holds
          itself to, and the things it undertakes never to do to someone who complains.
        </p>
      }
    />
  );
}
