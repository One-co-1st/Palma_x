import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clauses, LegalDocumentPage, type LegalSection } from '@/components/palma/LegalDocument';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS, ENTITY, legalDocument } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description:
    'The terms on which PALMA accepts nominations, confers honours and maintains the permanent record.',
  path: '/legal/terms',
});

/**
 * The terms.
 *
 * Every clause carries a `plainly` line above it. Legal text that nobody can
 * read is not a protection, it is a place to hide — and a person deciding
 * whether to nominate somebody should not need a solicitor to find out what
 * they are agreeing to.
 */
export default function TermsPage() {
  const doc = legalDocument('terms');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'Nature of the PALMA service',
      plainly: 'PALMA is an awards body and an archive. It is not a platform, a shop or a network.',
      body: (
        <>
          <p>
            PALMA, The Creator Honours is operated by {ENTITY.name}, a company incorporated in{' '}
            {ENTITY.jurisdiction}
            {ENTITY.companyNumber ? ` under number ${ENTITY.companyNumber}` : ''}. In these Terms,
            &ldquo;PALMA&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean that company, and
            &ldquo;you&rdquo; means anyone using palmaawards.com or taking part in a PALMA season.
          </p>
          <p>
            PALMA is an independent recognition, awards and archival platform operated for the
            purpose of recognising achievement within creator culture.
          </p>
          <p>
            PALMA does not provide, sell, facilitate, arrange, broker or advertise sexual services,
            escort services, sexual transactions or access to explicit adult content.
          </p>
          <p>
            PALMA profiles, nominations, judging materials, award records and editorial content must
            remain within the content standards published by PALMA.
          </p>
          <p>
            PALMA is not responsible for content, services or conduct occurring on third-party
            websites or platforms linked from a PALMA profile.
          </p>
          <p>
            By nominating a creator, claiming a creator record, sitting on a panel, or otherwise
            using the site, you accept these Terms. If you do not accept them, do not use the site.
            Nothing here removes rights you have as a consumer under the laws of{' '}
            {ENTITY.jurisdiction}.
          </p>
        </>
      ),
    },
    {
      heading: 'Eligibility',
      plainly: 'Creators must be 18 or over, and PALMA may check.',
      body: (
        <>
          <p>
            Participation in PALMA may be subject to eligibility requirements published for the
            relevant award year, category or programme.
          </p>
          <p>
            Unless PALMA expressly states otherwise, creators participating in PALMA must be at
            least 18 years old.
          </p>
          <p>
            PALMA may require age, identity, eligibility or other verification where reasonably
            necessary to protect the integrity of the awards.
          </p>
          <p>
            PALMA may refuse, suspend, restrict or remove participation where eligibility cannot
            reasonably be established or where information supplied is materially false, misleading,
            incomplete or fraudulent.
          </p>
        </>
      ),
    },
    {
      heading: 'Nominations',
      plainly:
        'A nomination puts a name in front of a panel. It is not a vote, and the number of them decides nothing.',
      body: (
        <>
          <p>
            A nomination is a submission for consideration and is not a vote for a winner.
            Submitting a nomination does not guarantee that a creator will be shortlisted, selected
            as a finalist or receive an award.
          </p>
          <p>
            PALMA may establish nomination limits, category-specific eligibility requirements,
            validation requirements, closing dates and other procedural rules.
          </p>
          <p>
            PALMA may reject, remove, consolidate or disregard nominations where they are duplicate,
            fraudulent, abusive, automated, manipulated, materially misleading, submitted in breach
            of the rules, or otherwise incapable of contributing fairly to the nomination process.
          </p>
          <p>
            PALMA may use reasonable technical and administrative measures to detect attempted
            manipulation, including rate limiting, duplicate detection, anti-bot measures, email
            verification and anomaly detection. PALMA may investigate suspicious activity and may
            withhold or disregard affected nominations where PALMA reasonably considers that doing
            so is necessary to preserve award integrity.
          </p>
          <p>
            No nomination volume, referral activity, audience size, follower count, popularity
            metric or promotional activity creates an entitlement to become a finalist or winner.
            PALMA does not publish nomination counts, and a large audience nominating sincerely is
            not manipulation, but neither is it a claim on an outcome.
          </p>
        </>
      ),
    },
    {
      heading: 'Nomination limits',
      plainly:
        'One nomination per person, per creator, per category. Nominating twice adds nothing.',
      body: (
        <>
          <p>
            Unless a category-specific rule provides otherwise, a person may submit no more than one
            valid nomination for the same creator in the same category during the applicable
            nomination period.
          </p>
          <p>
            The same person may nominate different creators and may nominate the same creator in
            different eligible categories, subject to the applicable rules.
          </p>
          <p>
            PALMA&rsquo;s technical records and validation systems may be used to determine whether
            a nomination has already been submitted or whether an attempt constitutes duplication or
            abuse.
          </p>
        </>
      ),
    },
    {
      heading: 'Email verification',
      plainly: 'A nomination is not recorded until the code in your inbox is entered.',
      body: (
        <>
          <p>
            Where PALMA requires email verification, a nomination is not validly submitted until the
            required verification process has been successfully completed.
          </p>
          <p>
            PALMA may require a one-time verification code or equivalent verification mechanism.
          </p>
          <p>PALMA is entitled to reject submissions that cannot be successfully verified.</p>
        </>
      ),
    },
    {
      heading: 'Judging',
      plainly: 'An independent panel decides, in private, against published criteria.',
      body: (
        <>
          <p>
            PALMA judges awards according to the criteria, methodology and category rules published
            or made available for the relevant award year. Those criteria are published at{' '}
            <Link href="/about/judging" className="palma-link text-ink">
              /about/judging
            </Link>{' '}
            before a season opens.
          </p>
          <p>
            PALMA may appoint judges, panels or other authorised decision-makers and may replace or
            reassign them where necessary.
          </p>
          <p>
            Judges must disclose material conflicts of interest and must not participate in matters
            where PALMA determines that their independence may reasonably be compromised.
          </p>
          <p>
            Judging information may be confidential. Nominees, creators, nominators, sponsors and
            the public are not entitled to access confidential judging materials, individual judge
            deliberations, internal scores, conflict records or internal fraud-detection information
            except where PALMA expressly decides otherwise or disclosure is required by law.
          </p>
          <p>
            PALMA may use a panel, weighted scoring methodology, moderation process, tie-breaking
            procedure or other judging mechanism appropriate to the relevant award.
          </p>
          <p>
            PALMA may correct an administrative or procedural error where reasonably necessary. Any
            such correction is recorded in PALMA&rsquo;s audit records, including who made it and
            what it changed.
          </p>
        </>
      ),
    },
    {
      heading: 'Finalists and winners',
      plainly: 'Recognition is conferred at PALMA’s discretion. Nothing earns it automatically.',
      body: (
        <>
          <p>
            Finalist and winner status is awarded at PALMA&rsquo;s discretion in accordance with the
            applicable rules and judging methodology.
          </p>
          <p>
            A finalist or winner is not entitled to receive an award merely because they have
            received nominations, publicity, audience support or previous recognition.
          </p>
          <p>
            PALMA may withhold an award where it reasonably determines that eligibility, integrity
            or procedural requirements have not been satisfied.
          </p>
          <p>
            PALMA may declare a category void, defer an award, decline to select a winner or modify
            the presentation of an award where circumstances reasonably require it.
          </p>
        </>
      ),
    },
    {
      heading: 'Revocation of recognition',
      plainly:
        'An honour obtained improperly can be revoked. Nothing is deleted. The record says it was revoked.',
      body: (
        <>
          <p>
            PALMA may revoke or suspend a nomination, finalist status, award or related public
            recognition where PALMA reasonably determines that:
          </p>
          <Clauses
            lettered
            items={[
              'eligibility requirements were not satisfied;',
              'materially false or misleading information was supplied;',
              'fraud, manipulation or material procedural abuse occurred;',
              'an identity or creator claim was improperly established;',
              'the award was obtained through conduct materially inconsistent with PALMA’s rules;',
              'a serious conflict or undisclosed circumstance materially affected the award process; or',
              'continued recognition would materially undermine the integrity of PALMA.',
            ]}
          />
          <p>
            Before revocation, PALMA may provide the affected person with an opportunity to respond
            where reasonably practicable.
          </p>
          <p>
            A revocation decision and its reason are recorded internally and, where appropriate,
            reflected in the public PALMA record. Revocation does not automatically require PALMA to
            delete historical records necessary to preserve an accurate institutional history: the
            honour, its achievement and its verification page remain, and read <em>revoked</em>.
          </p>
        </>
      ),
    },
    {
      heading: 'The PALMA Roll of Honour',
      plainly: 'The record of what happened is permanent, and outlives an account.',
      body: (
        <>
          <p>
            PALMA&rsquo;s historical records, including finalist and winner records, form part of
            the PALMA Roll of Honour (&ldquo;PaROH&rdquo;).
          </p>
          <p>
            Historical achievement records may be retained after an account is closed or a creator
            ceases participating. An award that could be erased by the person who received it would
            not be worth receiving.
          </p>
          <p>
            Where a historical record is corrected, amended or revoked, PALMA may retain the
            original record, correction history and relevant audit information where reasonably
            necessary to preserve an accurate historical record, comply with law, prevent fraud or
            document institutional decisions.
          </p>
        </>
      ),
    },
    {
      heading: 'Creator records and claims',
      plainly:
        'PALMA may write a record before a creator has an account. Claiming it means a person checked.',
      body: (
        <>
          <p>
            A creator record may be created by PALMA before it is claimed by a creator or authorised
            representative. Where PALMA holds a record about a creator who has not claimed it, that
            record is kept to the minimum described in the{' '}
            <Link href="/legal/privacy" className="palma-link text-ink">
              privacy notice
            </Link>
            , and the creator may ask for it to be removed.
          </p>
          <p>
            Submitting a claim does not automatically establish control over a creator record. PALMA
            may require information reasonably necessary to establish that a claimant is the
            relevant creator or an authorised representative, and may consider competing or
            conflicting claims relating to the same record.
          </p>
          <p>Only an approved claim creates authorised account control over the relevant record.</p>
          <p>
            PALMA may reject a claim, request additional information, place a claim under review,
            restrict a record, suspend access or investigate a dispute where reasonably necessary.
          </p>
          <p>
            PALMA may correct, revoke or transfer control where a previous claim was approved in
            error or where a later claim establishes that the existing controller was not properly
            authorised.
          </p>
          <p>
            A claimed record lets the creator decide how they are described. It does not let anyone
            alter what PALMA says happened.
          </p>
        </>
      ),
    },
    {
      heading: 'User conduct',
      plainly:
        'Do not impersonate, manipulate, harass, or send us things we have said we will not take.',
      body: (
        <>
          <p>You must not:</p>
          <Clauses
            lettered
            items={[
              'impersonate another person;',
              'submit false or misleading information;',
              'manipulate nominations, awards or verification systems;',
              'submit malicious, defamatory, threatening, harassing or abusive material;',
              'publish or submit another person’s private information without lawful authority;',
              'submit intimate images, non-consensual intimate imagery or sexually explicit media to PALMA;',
              'upload malware, malicious code or material intended to compromise the service;',
              'interfere with PALMA’s security, authentication, verification or judging systems;',
              'attempt to obtain confidential information to which you are not authorised; or',
              'use PALMA to facilitate unlawful activity.',
            ]}
          />
          <p>PALMA may restrict or terminate access where these rules are breached.</p>
        </>
      ),
    },
    {
      heading: 'Intellectual property',
      plainly: 'PALMA’s name, marks and record are ours. Your work stays yours.',
      body: (
        <>
          <p>
            PALMA and its licensors retain all intellectual property rights in the PALMA name,
            branding, logos, award marks, website, software, editorial material, visual identity,
            databases, archival presentation and other PALMA materials except where expressly stated
            otherwise.
          </p>
          <p>
            You must not reproduce, modify, commercially exploit, scrape, reverse engineer, frame,
            mirror or distribute PALMA materials except as permitted by law or with PALMA&rsquo;s
            written permission. Use of the PALMA mark by a holder of an honour is governed by{' '}
            <Link href="/legal/mark" className="palma-link text-ink">
              use of the mark
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      heading: 'Submitted material',
      plainly:
        'You keep ownership of what you send us. You give us permission to publish it as part of the record.',
      body: (
        <>
          <p>
            Where you submit text, photographs, biographical information, logos or other material to
            PALMA, you confirm that you have the right to provide that material and that its use by
            PALMA as contemplated by these Terms will not knowingly infringe another person&rsquo;s
            rights.
          </p>
          <p>
            You grant PALMA a non-exclusive, worldwide, royalty-free licence to host, reproduce,
            display, adapt for formatting, publish and distribute submitted material solely to
            operate, administer, promote and document PALMA and its awards, subject to the
            applicable privacy notice and any agreed restrictions.
          </p>
          <p>
            This licence does not transfer ownership of your underlying intellectual property to
            PALMA.
          </p>
          <p>
            PALMA may remove or decline to publish submitted material at its discretion where
            reasonably necessary to comply with law, protect individuals, maintain editorial
            standards or protect PALMA.
          </p>
        </>
      ),
    },
    {
      heading: 'Publicity and award recognition',
      plainly: 'PALMA names its finalists and winners publicly. That is what an award is.',
      body: (
        <>
          <p>
            By participating in PALMA, you acknowledge that PALMA may publicly identify finalists
            and winners and may display relevant award information, including creator name or
            professional name, category, award year, finalist or winner status and other information
            legitimately published as part of the PALMA record.
          </p>
          <p>
            Where a creator has uploaded a profile image, PALMA may use that image in connection
            with the creator&rsquo;s PALMA record, awards, editorial coverage, announcements and
            archival presentation subject to the applicable permissions.
          </p>
          <p>
            No provision of these Terms requires you to grant PALMA ownership of your name, stage
            name, likeness or intellectual property.
          </p>
        </>
      ),
    },
    {
      heading: 'Sponsor independence',
      plainly: 'Sponsors buy visibility. They cannot buy an outcome, and they never see a score.',
      body: (
        <>
          <p>
            Sponsors and commercial partners may receive the benefits expressly agreed in their
            sponsorship or partnership arrangements. Sponsorship does not give a sponsor the right
            to:
          </p>
          <Clauses
            lettered
            items={[
              'determine a finalist or winner;',
              'access confidential judging scores or deliberations;',
              'direct judges;',
              'alter judging criteria after the relevant process has commenced;',
              'require favourable recognition; or',
              'obtain confidential creator, claimant or nomination information except as separately authorised and lawful.',
            ]}
          />
          <p>
            PALMA identifies sponsored categories, presentations or editorial placements where
            required for transparency. Sponsor relationships are separate from judging decisions,
            and that separation is enforced in PALMA&rsquo;s systems as well as in this document.
          </p>
        </>
      ),
    },
    {
      heading: 'Third-party links and services',
      plainly:
        'A link from PALMA is not an endorsement, and we do not control what is on the other end.',
      body: (
        <>
          <p>
            PALMA may link to third-party websites, platforms, verification providers, social
            networks, ticketing providers, payment providers, analytics providers or other services.
          </p>
          <p>
            PALMA does not control third-party services and is not responsible for their
            availability, content, privacy practices, terms, security or conduct.
          </p>
          <p>
            Your use of a third-party service is subject to that provider&rsquo;s own terms and
            privacy information.
          </p>
        </>
      ),
    },
    {
      heading: 'Availability and changes',
      plainly: 'The site may change or go down. Season rules do not change after a season opens.',
      body: (
        <>
          <p>PALMA does not guarantee uninterrupted or error-free operation of the website.</p>
          <p>
            PALMA may modify, suspend or discontinue any feature, category, award process, page,
            service or event where reasonably necessary for operational, legal, security, commercial
            or institutional reasons.
          </p>
          <p>
            PALMA may update award dates, category structures, judging arrangements or procedural
            requirements subject to applicable published rules and the need to preserve fairness.
            The rules that decide a season are fixed when that season opens.
          </p>
        </>
      ),
    },
    {
      heading: 'Disclaimers',
      plainly: 'An honour is recognition. It is not a guarantee of work, money or audience.',
      body: (
        <>
          <p>
            PALMA provides the service on an &ldquo;as available&rdquo; basis except where
            applicable law provides otherwise.
          </p>
          <p>
            PALMA does not guarantee that participation will result in publicity, employment,
            commercial opportunities, increased followers, income, sponsorship or other personal or
            professional benefit.
          </p>
          <p>PALMA does not guarantee that information submitted by third parties is accurate.</p>
          <p>
            A PALMA recognition is an award of recognition and does not constitute a factual
            certification of every statement made about a creator or their work.
          </p>
        </>
      ),
    },
    {
      heading: 'Liability',
      plainly: 'We do not limit anything the law says we cannot limit.',
      body: (
        <>
          <p>
            Nothing in these Terms excludes or limits liability to the extent that such liability
            cannot lawfully be excluded or limited.
          </p>
          <p>
            Nothing in these Terms excludes or limits liability for death or personal injury caused
            by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot
            lawfully be excluded or restricted.
          </p>
          <p>
            Subject to the preceding paragraph and applicable law, PALMA shall not be liable for
            indirect, consequential or purely economic losses except where such exclusion is
            prohibited by law.
          </p>
          <p>
            Nothing in these Terms removes or restricts statutory rights that apply to consumers.
          </p>
        </>
      ),
    },
    {
      heading: 'Indemnity',
      plainly: 'If you break these terms and it costs us, you cover the reasonable cost.',
      body: (
        <p>
          To the extent permitted by law, you agree to reimburse PALMA for reasonable losses,
          liabilities, costs and expenses arising directly from your material breach of these Terms,
          unlawful conduct, fraudulent activity or infringement of third-party rights, except to the
          extent caused by PALMA&rsquo;s own breach, negligence or unlawful conduct.
        </p>
      ),
    },
    {
      heading: 'Investigations and legal compliance',
      plainly: 'We keep and disclose records where the law requires it, or to protect someone.',
      body: (
        <p>
          PALMA may preserve records, restrict access and disclose information where PALMA
          reasonably believes this is necessary to comply with law, respond to a lawful request,
          investigate suspected fraud or abuse, protect an individual, protect the integrity of
          PALMA, or establish or defend legal rights.
        </p>
      ),
    },
    {
      heading: 'Appeals and complaints',
      plainly:
        'There is a route to challenge a decision, and it goes to someone who was not involved.',
      body: (
        <>
          <p>
            PALMA operates internal procedures for appeals, complaints, eligibility disputes, claim
            disputes, moderation decisions and award-process concerns. They are set out in{' '}
            <Link href="/legal/complaints" className="palma-link text-ink">
              complaints and appeals
            </Link>
            .
          </p>
          <p>
            Unless PALMA expressly provides an appeal right for a particular matter, PALMA&rsquo;s
            procedural decision shall be treated as final subject to applicable law.
          </p>
          <p>
            Where an appeal process is available, the applicable procedure and deadline will be
            published or communicated to the affected person.
          </p>
        </>
      ),
    },
    {
      heading: 'Governing law',
      plainly: 'English law, English courts, without taking away consumer rights you have at home.',
      body: (
        <>
          <p>
            These Terms and any non-contractual obligations arising from them are governed by the
            laws of England and Wales, unless applicable mandatory law requires otherwise.
          </p>
          <p>
            The courts of England and Wales shall have jurisdiction, subject to any mandatory rights
            or jurisdiction available to consumers under applicable law.
          </p>
        </>
      ),
    },
    {
      heading: 'Changes to these Terms',
      plainly: 'We keep every version, so the rules that governed a past season can be produced.',
      body: (
        <>
          <p>PALMA may update these Terms from time to time.</p>
          <p>
            Material changes may be notified through the website, account notifications or other
            reasonable means where appropriate.
          </p>
          <p>
            The version applicable to a particular award process is recorded by PALMA so that the
            applicable rules can be established retrospectively. This document is version{' '}
            {doc.version}.
          </p>
        </>
      ),
    },
    {
      heading: 'Severability, waiver and entire agreement',
      plainly: 'If one clause fails, the rest stands.',
      body: (
        <>
          <p>
            If any provision of these Terms is found to be unlawful, invalid or unenforceable, that
            provision shall be interpreted or amended to the minimum extent necessary to make it
            lawful where possible, and the remaining provisions shall continue in effect.
          </p>
          <p>
            A failure by PALMA to enforce any provision of these Terms does not constitute a waiver
            of PALMA&rsquo;s right to enforce that provision later.
          </p>
          <p>
            These Terms, together with the applicable award rules, privacy notice and any expressly
            incorporated policies or agreements, constitute the applicable agreement governing use
            of the PALMA service, subject to mandatory legal rights.
          </p>
          <p>
            Questions about this document:{' '}
            <a href={`mailto:${CONTACTS.general}`} className="palma-link text-ink">
              {CONTACTS.general}
            </a>
            .
          </p>
        </>
      ),
    },
  ];

  return <LegalDocumentPage document={doc} sections={sections} />;
}
