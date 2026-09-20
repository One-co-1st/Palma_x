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
import { RETENTION_RULES } from '@/domain/retention-schedule';
import { UNCLAIMED_RECORD_FIELDS, CLAIMED_RECORD_FIELDS } from '@/domain/record-minimalism';

export const metadata = buildMetadata({
  title: 'Privacy Notice',
  description:
    'What PALMA holds about creators, nominators and judges, and the hard limits on what it will hold about someone who never asked to be here.',
  path: '/legal/privacy',
});

/**
 * The privacy notice.
 *
 * The section that matters most is "Creators who have not claimed a record".
 * PALMA writes records about people before those people have agreed to
 * anything, which is lawful and ordinary for an awards body — and is also the
 * single place where an archive can quietly become surveillance. So the limits
 * are stated as rules rather than intentions, and the same rules are enforced
 * in `src/domain/record-minimalism.ts` with tests.
 */
export default function PrivacyPage() {
  const doc = legalDocument('privacy');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'Who is responsible',
      plainly: 'A company in England is the data controller, and you can write to a person there.',
      body: (
        <>
          <p>
            {ENTITY.name} is the data controller responsible for the personal data processed through
            PALMA
            {ENTITY.companyNumber ? `, company number ${ENTITY.companyNumber}` : ''}.
          </p>
          <p>
            Data protection enquiries, objections and requests:{' '}
            <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
              {CONTACTS.privacy}
            </a>
            . A person reads that inbox; there is no automated address at PALMA.
          </p>
          <p>
            {ENTITY.registeredOffice
              ? ENTITY.registeredOffice
              : 'The registered office and ICO registration number will be published here once the company is registered. They are absent because they do not yet exist, not because they are being withheld.'}
          </p>
        </>
      ),
    },
    {
      heading: 'The principle this notice is built on',
      plainly:
        'PALMA never collects information about a creator who has not claimed a record merely because it might be useful later.',
      body: (
        <>
          <p className="font-display text-ink text-xl leading-snug">
            PALMA never collects information about an unclaimed creator merely because it might be
            useful later.
          </p>
          <p>
            That is a rule, not an aspiration. It is why an unclaimed record holds four things and
            not fourteen, why a nominator&rsquo;s description of someone is never published, and why
            PALMA holds no identity documents at all.
          </p>
          <p>The architecture that follows from it:</p>
          <Clauses
            items={[
              <>
                An <strong>unclaimed record</strong> is kept to the minimum an awards archive needs
                to name a candidate.
              </>,
              <>
                A <strong>claimed record</strong> is controlled by the creator. They decide how they
                are described.
              </>,
              <>
                <strong>Sensitive information is never public</strong>, whatever its source.
              </>,
              <>
                <strong>Verification lives in a separate restricted system</strong> and never
                surfaces on a record.
              </>,
              <>
                <strong>Award history is an institutional record</strong> and is permanent.
              </>,
              <>
                An <strong>external link</strong> is published only where PALMA has a lawful and
                reasonable basis to publish it.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      heading: 'Creators who have not claimed a record',
      plainly:
        'If PALMA holds a record about you and you never asked for it, this is exactly what it contains, and you can have it taken down.',
      body: (
        <>
          <p>
            PALMA writes a creator record when someone is nominated, or when the editorial desk
            establishes that a creator belongs in the archive. That happens before the creator has
            agreed to anything, and often before they have heard of PALMA.
          </p>
          <p>
            <strong>The lawful basis is legitimate interests</strong> (UK GDPR Article 6(1)(f)): the
            legitimate interest of maintaining an accurate public record of achievement in an
            industry, balanced against the interests of the person named. PALMA is not relying on
            your consent, and does not pretend to have it.
          </p>
          <p>
            Because PALMA did not get the information from you, Article 14 applies. PALMA tells you
            how it got it, and what it holds, at{' '}
            <Link href="/legal/how-we-got-your-information" className="palma-link text-ink">
              how PALMA got your information
            </Link>
            , which is linked from every unclaimed record.
          </p>

          <p>An unclaimed record may contain only:</p>
          <LegalTable
            caption="An unclaimed creator record, the complete list"
            head={['Field', 'Why it is there', 'Source']}
            rows={UNCLAIMED_RECORD_FIELDS.map((field) => [field.label, field.why, field.source])}
          />

          <p>An unclaimed record will never contain:</p>
          <Clauses
            lettered
            items={[
              'a legal name, where the creator works under a different one;',
              'a city, address, or any location more precise than a country;',
              'a date of birth, age, or anything from which one could be inferred;',
              'a biography, characterisation or description written by anyone other than the creator;',
              'anything a nominator wrote about them. Nomination text is never published, and is not shown on the record;',
              'contact details of any kind;',
              'anything that reveals or implies health, sexuality, sex life, religion, politics, ethnicity, trade-union membership or biometric identity;',
              'anything inferred, guessed, scraped in bulk, or collected because it might be useful later.',
            ]}
          />

          <p>
            <strong>You can object, and PALMA will act on it.</strong> Under Article 21 you may
            object to processing based on legitimate interests. For an unclaimed record PALMA treats
            an objection from the person named as decisive: the record comes down, and PALMA keeps
            only a minimal note that it was removed and must not be recreated. You do not need an
            account, and you do not need to give a reason. Use{' '}
            <Link href="/creators" className="palma-link text-ink">
              the link on the record itself
            </Link>{' '}
            or write to{' '}
            <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
              {CONTACTS.privacy}
            </a>
            .
          </p>
          <p>
            The one exception is an honour already conferred. If PALMA has publicly recognised
            somebody, the record of that recognition is an institutional and archival record and is
            treated under section <em>Historical and archival records</em> below. Even then, the
            record is reduced to the achievement itself on request.
          </p>
        </>
      ),
    },
    {
      heading: 'What PALMA collects',
      plainly: 'Different things depending on what you do here, and less than you might expect.',
      body: (
        <>
          <p>
            <strong>Account information.</strong> Name, professional name, email address, a hashed
            password, account status, role and security information. PALMA cannot read your
            password; it is stored as a scrypt hash with a per-account salt.
          </p>
          <p>
            <strong>Claimed creator record.</strong> Professional name, pronouns, country, city,
            headline, biography, portrait, website and links. All supplied and controlled by the
            creator, plus the PALMA achievement history, which is not.
          </p>
          <p>
            <strong>Nomination information.</strong> The email address used to verify a nomination,
            the category, the creator nominated, the nomination text, the date and associated
            technical records.
          </p>
          <p>
            <strong>Verification information.</strong> A status, a provider reference, a timestamp
            and an integrity hash. Nothing else. See below.
          </p>
          <p>
            <strong>Judging and operational information.</strong> What is needed to run an award:
            conflicts of interest, assignments, scores, rationales, eligibility decisions, cases,
            appeals, audit events and enforcement decisions.
          </p>
          <p>
            <strong>Technical information.</strong> Device and browser information, security logs,
            authentication events and cookie information reasonably necessary for security, fraud
            prevention and operating the service. PALMA stores a keyed hash of an IP address rather
            than the address itself, and an address alone is never the basis for rejecting a
            nomination.
          </p>
        </>
      ),
    },
    {
      heading: 'Why PALMA processes it',
      plainly: 'To run the awards, keep the record accurate, and stop people gaming it.',
      body: (
        <>
          <p>PALMA processes personal data to:</p>
          <Clauses
            lettered
            items={[
              'operate and secure the PALMA service;',
              'create and administer accounts;',
              'process and validate nominations;',
              'verify email addresses;',
              'establish eligibility;',
              'administer creator claims and disputes;',
              'administer judging and conflicts of interest;',
              'publish legitimate PALMA award and creator records;',
              'maintain the PALMA Roll of Honour;',
              'investigate fraud, manipulation, impersonation and abuse;',
              'respond to reports and appeals;',
              'communicate operational information;',
              'maintain audit and institutional records;',
              'comply with legal obligations;',
              'establish, exercise or defend legal claims; and',
              'improve the security, reliability and functionality of the service.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'Lawful bases',
      plainly: 'Accepting the terms is not consent, and PALMA does not pretend otherwise.',
      body: (
        <>
          <LegalTable
            caption="The basis PALMA relies on, by activity"
            head={['Processing', 'Lawful basis']}
            rows={[
              ['Running an account you opened', 'Contract, UK GDPR Article 6(1)(b)'],
              [
                'Holding a record about an unclaimed creator',
                'Legitimate interests, Article 6(1)(f), assessed and balanced, with an unconditional right to object',
              ],
              [
                'Verifying and recording a nomination',
                'Legitimate interests. Running a fair award, and protecting it from manipulation',
              ],
              ['Age and identity assurance', 'Legal obligation and legitimate interests'],
              [
                'Publishing an honour that has been conferred',
                'Legitimate interests, and archiving in the public interest',
              ],
              ['Security, fraud prevention and audit', 'Legitimate interests and legal obligation'],
              ['The Gazette', 'Consent. Freely given, and withdrawable in one click'],
            ]}
          />
          <p>
            Where consent is relied upon it is asked for separately and is not bundled into
            acceptance of the Terms. Accepting the Terms is not consent to anything, and withdrawing
            a consent never costs you an account or a record.
          </p>
          <p>
            PALMA records a legitimate interests assessment for each activity relying on that basis,
            and will provide the relevant assessment on request.
          </p>
        </>
      ),
    },
    {
      heading: 'Sensitive and special category data',
      plainly:
        'PALMA does not want it, does not ask for it, and will not publish it, including where you have published it yourself.',
      body: (
        <>
          <p>
            PALMA recognises that information associated with creator participation may be sensitive
            and may, depending on the circumstances, reveal information falling within
            special-category data rules under Article 9, in particular data concerning sex life or
            sexual orientation.
          </p>
          <p>
            <strong>PALMA does not collect special-category data to build records.</strong> An
            unclaimed record is limited to the fields listed above precisely so that PALMA is not in
            the position of characterising somebody&rsquo;s work in a way that reveals protected
            information about them. A category a creator has been nominated in is a description of
            the work, and PALMA writes it as such.
          </p>
          <p>
            Where a creator chooses to describe themselves in their own claimed record, that is
            their decision and their words, and PALMA relies on their explicit consent (Article
            9(2)(a)) for publishing it. They can change or remove it at any time.
          </p>
          <p>
            PALMA will not collect or retain sensitive information merely because it is interesting
            or commercially useful. Where special-category data is processed, PALMA identifies the
            applicable Article 9 condition and applies additional safeguards. Where processing is
            likely to result in a high risk, PALMA carries out a data protection impact assessment
            before starting.
          </p>
        </>
      ),
    },
    {
      heading: 'Age and identity assurance',
      plainly: 'PALMA holds no identity documents. Four small facts, and nothing else.',
      body: (
        <>
          <p>
            PALMA creators must be 18 or over. Assurance is performed either by a specialist
            third-party provider, or, where no provider is contracted, by a PALMA moderator in a
            restricted workspace.
          </p>
          <p>The permanent record consists of exactly:</p>
          <Clauses
            lettered
            items={[
              'a status. Verified, or not;',
              'a provider reference;',
              'the date the check was completed; and',
              'an integrity hash binding the outcome to the case.',
            ]}
          />
          <p>
            Never a document, a facial image, a date of birth, an identity number or an address. A
            test in PALMA&rsquo;s codebase rejects an outcome carrying any of those, so this is
            enforced rather than promised.
          </p>
          <p>
            Where a manual exception requires PALMA to receive material temporarily, access is
            restricted to authorised personnel, processing is limited to the verification purpose,
            and <strong>the case cannot be closed while the material is still held</strong>. Closing
            is what triggers deletion, and the operator confirms the deletion on the same screen
            that records the outcome.
          </p>
          <p>Verification information is never published and never appears on a public record.</p>
        </>
      ),
    },
    {
      heading: 'What is public, and what never is',
      plainly: 'Something is not published just because PALMA holds it.',
      body: (
        <>
          <p>
            A claimed creator record may publish: {CLAIMED_RECORD_FIELDS.join(', ')}. Together with
            the PALMA achievement history.
          </p>
          <p>
            Information used internally for verification, judging, fraud prevention, security or
            case management is <strong>never</strong> published merely because it exists in
            PALMA&rsquo;s systems. That list includes: judging scores and rationales, panel
            deliberations, conflict declarations, internal notes about a creator, claim evidence,
            verification data, reports, nomination counts, nominator addresses and the audit log.
          </p>
          <p>
            Internal notes are a separate table with a separate permission and are never shown to
            the creator they concern or to the public.
          </p>
        </>
      ),
    },
    {
      heading: 'Nominator privacy',
      plainly: 'Nominating somebody does not put your name on anything.',
      body: (
        <>
          <p>Nominators do not need a PALMA account.</p>
          <p>
            A nominator&rsquo;s email address is used to verify and administer the nomination, and
            for security, fraud prevention and audit. PALMA will not publicly identify a nominator,
            and will not disclose to a creator who nominated them.
          </p>
          <p>
            PALMA does not publish nomination counts and does not rank creators or nominators by
            volume. A public tally would turn recognition into a popularity contest and invite
            exactly the manipulation the rest of this system exists to prevent.
          </p>
          <p>
            <strong>Nomination text is never published.</strong> It is written about a third party
            by somebody else, and publishing it would make PALMA the publisher of one person&rsquo;s
            characterisation of another. It goes to the panel and no further.
          </p>
        </>
      ),
    },
    {
      heading: 'Judging confidentiality',
      plainly: 'Scores and deliberations stay closed, to creators, sponsors and the public alike.',
      body: (
        <>
          <p>
            PALMA processes confidential information relating to judges, conflicts, deliberations,
            scoring, rationales and internal award decisions.
          </p>
          <p>
            Such information is restricted to authorised personnel and is not disclosed to creators,
            nominators, sponsors or the public unless PALMA determines that disclosure is
            appropriate or disclosure is legally required. Sponsors have no route to it under any
            arrangement.
          </p>
        </>
      ),
    },
    {
      heading: 'Fraud prevention and security',
      plainly: 'A machine may raise a flag. A person makes the decision.',
      body: (
        <>
          <p>
            PALMA analyses technical and behavioural signals to detect duplicate nominations,
            automated abuse, impersonation, account compromise and manipulation of the awards
            process.
          </p>
          <p>
            Automated signals are used as indicators for human review rather than as the sole basis
            for an adverse decision.{' '}
            <strong>An IP address alone is never the basis for rejecting a nomination</strong>: a
            household, a campus and a workplace share one, and so does a creator&rsquo;s audience
            arriving together.
          </p>
          <p>
            PALMA retains security and audit records for as long as reasonably necessary for
            security, fraud prevention, dispute resolution, legal compliance and institutional
            accountability.
          </p>
        </>
      ),
    },
    {
      heading: 'Who PALMA shares data with',
      plainly: 'Suppliers who need it to run the service. PALMA does not sell personal data.',
      body: (
        <>
          <p>PALMA may share personal data with:</p>
          <Clauses
            lettered
            items={[
              'age and identity assurance providers;',
              'hosting, database and infrastructure providers;',
              'email and communications providers;',
              'security, fraud-prevention and technical service providers;',
              'professional advisers;',
              'event, ticketing or payment providers where relevant;',
              'authorities or law-enforcement bodies where legally required or reasonably necessary; and',
              'a successor where PALMA is reorganised, sold, merged or transferred, subject to applicable law.',
            ]}
          />
          <p>
            <strong>PALMA does not sell personal data,</strong> and does not share it with
            advertisers or data brokers. Sponsorship buys visibility in the ceremony and on the
            site; it never buys access to creators, nominators or nomination data.
          </p>
        </>
      ),
    },
    {
      heading: 'International transfers',
      plainly: 'Some suppliers are outside the UK, under a lawful transfer mechanism.',
      body: (
        <p>
          Some service providers process personal data outside the United Kingdom. Where personal
          data is transferred internationally, PALMA relies on a lawful transfer mechanism, an
          adequacy decision, or the International Data Transfer Agreement or Addendum, and applies
          the safeguards required by applicable data protection law. Details of material categories
          of international processing are available on request.
        </p>
      ),
    },
    {
      heading: 'Retention',
      plainly: 'Periods that are actually enforced by a scheduled job, not just written down here.',
      body: (
        <>
          <p>
            PALMA applies retention periods according to the purpose for which information is
            processed. These are applied by a scheduled sweep rather than by hand, a period nobody
            enforces is a sentence, not a policy.
          </p>
          <LegalTable
            caption="Operational retention. Applied automatically"
            head={['What', 'Kept for']}
            rows={RETENTION_RULES.map((rule) => [rule.description, `${rule.days} days`])}
          />
          <p>
            Beyond that schedule, PALMA retains account and security records for the life of an
            account and a reasonable period after; nomination records for as long as reasonably
            necessary to administer the process, investigate abuse and defend disputes; award and
            PaROH records for archival purposes; and audit records for as long as necessary to
            demonstrate the integrity of PALMA&rsquo;s decisions.
          </p>
          <p>
            Temporary verification material is kept only for as long as reasonably necessary to
            complete the check, and is deleted when the case closes.
          </p>
        </>
      ),
    },
    {
      heading: 'Historical and archival records',
      plainly:
        'An award that could be deleted by the person who received it would not be an award.',
      body: (
        <>
          <p>
            PALMA retains public historical achievement records for archival and institutional
            purposes. Where legally permissible and reasonably necessary, that retention continues
            after an account is closed or a person ceases participating.
          </p>
          <p>
            Where a record has been corrected or revoked, PALMA retains the underlying audit trail
            so the historical integrity of the record can be demonstrated. Nothing is silently
            removed; a revoked honour reads <em>revoked</em> rather than disappearing.
          </p>
          <p>
            This is a genuine limit on erasure, and PALMA states it plainly rather than burying it.
            It applies to the fact of an honour, not to everything else: a person who wants their
            record reduced to the achievement itself, name, category, year, can have that.
          </p>
        </>
      ),
    },
    {
      heading: 'Cookies and page counting',
      plainly:
        'Only the cookies needed to sign you in and keep you safe. Pages are counted; people are not.',
      body: (
        <>
          <p>
            PALMA uses strictly necessary cookies for security, authentication and core
            functionality. They are listed in{' '}
            <Link href="/legal/cookies" className="palma-link text-ink">
              the cookie notice
            </Link>
            .
          </p>
          <p>
            PALMA keeps an aggregate count of how often each of its pages is opened, and of the
            terms typed into its search boxes. These counts hold no personal data: no IP address, no
            cookie, no device identifier, no user-agent and no session. None of them stored, and
            none of them derived and discarded. Because nothing identifies a reader, no part of this
            is personal data about you and there is no record of your visit to request, correct or
            erase. The mechanics are set out in{' '}
            <Link href="/legal/cookies" className="palma-link text-ink">
              the cookie notice
            </Link>
            .
          </p>
          <p>
            PALMA runs no advertising, no third-party analytics and no tracking technologies. If
            that ever changes, they will be used only with the required consent, a preference
            mechanism will be provided, and continuing to browse will not be treated as consent.
          </p>
        </>
      ),
    },
    {
      heading: 'Communications',
      plainly:
        'Decisions about you are sent whatever your settings say. The newsletter is separate, and optional.',
      body: (
        <>
          <p>
            Operational messages, a decision on your record, a security notice, a verification
            outcome, are sent because PALMA owes them to you. An account that could mute the news
            that its honour was revoked would not be being kept informed.
          </p>
          <p>
            Announcements you can switch off are switched off in your Dossier. The Gazette is
            separate again: consented, double opt-in, and one click to leave from any issue.
          </p>
          <p>
            Every address PALMA writes from accepts replies. There is no <code>noreply@</code>.
          </p>
        </>
      ),
    },
    {
      heading: 'Your rights',
      plainly: 'Access, correction, erasure, objection, and a regulator if PALMA gets it wrong.',
      body: (
        <>
          <p>Subject to the conditions and exemptions in law, you have the right to:</p>
          <Clauses
            lettered
            items={[
              'ask what PALMA holds about you, and get a copy;',
              'have inaccurate information corrected;',
              'ask for erasure;',
              'ask PALMA to restrict processing while a dispute is resolved;',
              'object to processing based on legitimate interests, including, decisively, an unclaimed record about you;',
              'receive data you gave PALMA in a portable form;',
              'withdraw consent where consent is the basis; and',
              'complain to the Information Commissioner’s Office.',
            ]}
          />
          <p>
            PALMA responds within one month. Write to{' '}
            <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
              {CONTACTS.privacy}
            </a>
            . You do not need an account to exercise any of these, and PALMA will not make you
            create one.
          </p>
          <p>
            You can complain to the ICO at{' '}
            <a href="https://ico.org.uk/make-a-complaint/" className="palma-link text-ink">
              ico.org.uk
            </a>{' '}
            at any time, including without contacting PALMA first.
          </p>
        </>
      ),
    },
    {
      heading: 'Closing an account',
      plainly:
        'Everything personal goes. The award record stays, and the record becomes unclaimed.',
      body: (
        <>
          <p>
            You can close your account from{' '}
            <Link href="/account" className="palma-link text-ink">
              your account page
            </Link>
            . Your sign-in, sessions, Dossier and preferences are deleted, and you are signed out
            everywhere.
          </p>
          <p>Closing an account does not necessarily require deletion of:</p>
          <Clauses
            lettered
            items={[
              'historical PALMA award records;',
              'legal or regulatory records;',
              'security and fraud-prevention records;',
              'audit records;',
              'records required to establish or defend legal claims; or',
              'information PALMA is otherwise lawfully permitted or required to retain.',
            ]}
          />
          <p>
            Where information does not need to remain identifiable, it is deleted or anonymised. The
            creator record itself returns to the unclaimed state described at the top of this notice
            . Minimal, and removable on request.
          </p>
        </>
      ),
    },
    {
      heading: 'Accuracy, security and breaches',
      plainly:
        'Role-based access, audited admin actions, and regulator notification if it goes wrong.',
      body: (
        <>
          <p>
            PALMA takes reasonable steps to keep personal data accurate and provides a route for
            creators to correct their public information. Correcting a factual detail does not alter
            a historical award decision or a judging record.
          </p>
          <p>
            Access to sensitive operational information is restricted by role-based access control,
            every privileged administrative action is written to an audit log, and the most
            consequential actions require two administrators to agree.
          </p>
          <p>
            Where required by law, PALMA assesses personal-data incidents, documents relevant
            breaches, notifies the ICO within 72 hours where the threshold is met, and notifies
            affected individuals where the risk to them is high.
          </p>
        </>
      ),
    },
    {
      heading: 'People under 18',
      plainly: 'PALMA is not for them, and will remove them if they get in.',
      body: (
        <p>
          PALMA is not intended for participation by people under 18. PALMA does not knowingly
          process children&rsquo;s personal data for participation in its awards. Where PALMA
          becomes aware that somebody under the applicable age has participated, it removes or
          restricts the relevant account, nomination or data, subject to applicable law. If you
          believe a person under 18 appears anywhere on PALMA, write to{' '}
          <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
            {CONTACTS.privacy}
          </a>{' '}
          and it will be treated as urgent.
        </p>
      ),
    },
    {
      heading: 'Changes to this notice',
      plainly: 'Versioned and dated, so you can see what changed and when.',
      body: (
        <>
          <p>
            PALMA updates this notice to reflect changes in law, technology, services, providers or
            processing activities. This is version {doc.version}, effective {doc.effective}.
          </p>
          <p>
            Where required by law, PALMA gives additional notice of material changes. A change that
            narrows what PALMA holds takes effect immediately; one that widens it is notified before
            it applies.
          </p>
        </>
      ),
    },
  ];

  return <LegalDocumentPage document={doc} sections={sections} />;
}
