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
import { MAX_SCORE, MAX_TOTAL, SCORING_CRITERIA, formatPoints } from '@/domain/judging';
import { DEFAULT_FINALIST_COUNT, MIN_JUDGES_PER_CANDIDACY } from '@/domain/selection';
import { MAX_REASON_LENGTH, MIN_REASON_LENGTH } from '@/domain/nomination';
import { CODE_LENGTH, CODE_TTL_SECONDS, MAX_ATTEMPTS } from '@/domain/verification-code';

export const metadata = buildMetadata({
  title: 'Competition Rules',
  description:
    'The rules of a PALMA season: eligibility, nomination, screening, judging, selection, announcement and disqualification.',
  path: '/legal/rules',
});

export default function RulesPage() {
  const doc = legalDocument('rules');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'The shape of a season',
      plainly: 'Four public beats, and every date is published before nominations open.',
      body: (
        <>
          <p>
            A PALMA season runs the same way each year. Nominations open, nominations close, a
            shortlist is screened, a panel judges, finalists are announced, and winners are
            announced. Every one of those dates is published before the season opens, and PALMA does
            not move a closing date to accommodate a campaign.
          </p>
          <Clauses
            items={[
              'Nominations open. Anyone may nominate, free, for as long as the window is open.',
              'Nominations close. Nothing submitted after the published closing time is counted, including submissions begun before it.',
              'Screening. Every nomination is reviewed by a person for eligibility and integrity before it reaches a judge.',
              'Judging. Eligible candidacies are scored independently by the panel.',
              'Finalists announced. The top-ranked candidacies in each category are published.',
              'Winners announced. The honour is conferred, entered in the Roll of Honour, and given a verification record.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'Eligibility',
      plainly: 'Adults, real published work, inside the season window.',
      body: (
        <Clauses
          items={[
            'A creator must be 18 or over at the time the work was published and at the time the honour is conferred.',
            'The work must have been publicly available during the season’s eligibility window, which is stated on each category page.',
            'The work must be the creator’s own. Work made by a team may be nominated where the nominated creator was materially responsible for it.',
            'A creator may be nominated in more than one category, and may hold honours in more than one season.',
            'A creator whose work falls outside the PALMA content policy is not eligible, in any category, at any time.',
            'Judges, PALMA staff and their immediate families are not eligible in any season in which they serve.',
          ]}
        />
      ),
    },
    {
      heading: 'Nominating',
      plainly:
        'Audience nominates, PALMA judges. One nomination each, and numbers do not decide anything.',
      body: (
        <>
          <p>
            The division is the whole design of PALMA:{' '}
            <strong>the audience identifies, PALMA investigates and judges</strong>. A nomination
            tells the panel where to look. It does not tell the panel what to conclude.
          </p>
          <Clauses
            items={[
              `A nomination is a category, a creator, and a reason of between ${MIN_REASON_LENGTH} and ${MAX_REASON_LENGTH} characters. No account, no upload, no evidence bundle.`,
              `Before a nomination can be submitted, the email address given must be confirmed with a ${CODE_LENGTH}-digit code, valid for ${CODE_TTL_SECONDS / 60} minutes, with ${MAX_ATTEMPTS} attempts.`,
              'One valid nomination per person, per creator, per category, per season. The database enforces it; a second attempt is refused rather than silently discarded.',
              'A creator may nominate themselves, and may share a referral link asking their audience to nominate them. Both are entirely legitimate.',
              'Nomination counts are never published as a leaderboard, and are never a judging criterion. A creator with four hundred nominations does not start ahead of a creator with four.',
            ]}
          />
        </>
      ),
    },
    {
      heading: 'Integrity of nominations',
      plainly:
        'Mobilising your audience is fine. Faking people is not. A shared network is never the reason on its own.',
      body: (
        <>
          <p>
            PALMA expects creators to ask their audiences to nominate them. That is a real signal
            about a real following, and screening is calibrated to permit it. What screening looks
            for is the manufacture of people who do not exist.
          </p>
          <LegalTable
            caption="How signals are treated"
            head={['Signal', 'Treatment']}
            rows={[
              [
                'Many nominations arriving quickly after a creator posts a link',
                'Expected. No action.',
              ],
              [
                'Several nominations sharing a network, a household, a campus, an office, a mobile carrier, a VPN',
                'Not a basis for rejection on its own, ever. Shared networks are ordinary life.',
              ],
              [
                'Addresses that fold to the same person once aliases and dots are normalised',
                'Counted once, as one nomination.',
              ],
              [
                'Disposable or throwaway address domains',
                'Flagged for a person to look at. Not rejected automatically.',
              ],
              [
                'Identical or near-identical reasons submitted repeatedly',
                'Flagged for review of the candidacy, not of the individual nominator.',
              ],
              [
                'A hidden form field completed',
                'Rejected outright. Only an automated submitter fills in a field a person cannot see.',
              ],
              [
                'Verified evidence of purchased or automated submissions',
                'Nominations voided and the candidacy disqualified.',
              ],
            ]}
          />
          <p>
            The governing principle is that flagging is not rejecting. Almost every signal above
            results in a human being looking at a candidacy, and a human deciding. PALMA would
            rather review a hundred legitimate campaigns than reject one real audience.
          </p>
        </>
      ),
    },
    {
      heading: 'Screening',
      plainly: 'A person checks every nomination before a judge ever sees it.',
      body: (
        <Clauses
          items={[
            'Screening confirms the creator exists, is eligible, is 18 or over, and that the work cited is real and within the window.',
            'Screening removes nominations that breach the content policy, cite another person’s work, or are plainly fabricated.',
            'Where nominations for one creator are combined, they form a single candidacy, the unit that is judged. Judges score candidacies, never nomination counts.',
            'A screening decision may be appealed by the creator concerned under Complaints and Appeals.',
          ]}
        />
      ),
    },
    {
      heading: 'Judging',
      plainly: `Six weighted criteria, ${MAX_SCORE} points each, at least ${MIN_JUDGES_PER_CANDIDACY} judges, audience size explicitly excluded.`,
      body: (
        <>
          <LegalTable
            caption={`Scoring. Six weighted criteria, marked out of ${formatPoints(MAX_TOTAL)}`}
            head={['Criterion', 'What it measures', 'Scored', 'Weight']}
            rows={SCORING_CRITERIA.map((criterion) => [
              criterion.label,
              criterion.description,
              `/${MAX_SCORE}`,
              `${criterion.weight}%`,
            ])}
          />
          <Clauses
            items={[
              `Every eligible candidacy is scored independently by at least ${MIN_JUDGES_PER_CANDIDACY} judges.`,
              'The criteria and their weights are published before a season opens and do not change during it. The weights above are the whole of the weighting: there is no undisclosed adjustment.',
              'Nomination volume is a discovery signal. It determines who PALMA investigates; it does not determine any outcome, and nothing in the judging path reads it.',
              'Judges are briefed in writing to discount audience size, follower count and view count. None is a criterion, and none will become one.',
              'Where four or more judges have scored a candidacy, the highest and lowest scores are removed before ranking, so one outlier cannot decide a PALMA.',
              'A submitted score is immutable. A correction is made by a new, audited entry, never by editing the original.',
              'Judges declare conflicts of interest and are recused from any candidacy they have declared against. A recused judge cannot see that candidacy at all.',
              'Scores, remarks and deliberations are confidential, permanently. They are not shown to nominees, sponsors, the press, or the public.',
            ]}
          />
          <p>
            The criteria and their weighting are published in full at{' '}
            <Link href="/about/judging" className="palma-link text-ink">
              /about/judging
            </Link>{' '}
            before each season opens.
          </p>
        </>
      ),
    },
    {
      heading: 'Selection and announcement',
      plainly:
        'The ranking is a recommendation. A named human confirms it, and the log records that they did.',
      body: (
        <Clauses
          items={[
            `The top ${DEFAULT_FINALIST_COUNT} ranked candidacies in each category are proposed as finalists.`,
            'A proposal is never automatic. Confirming a shortlist, a finalist list or a winner is a human act by an authorised administrator, written to the audit log with the state before and after.',
            'Where a category receives too few eligible candidacies to judge credibly, PALMA may decline to confer an honour in that category. It will say so publicly rather than lower the standard.',
            'Winners are announced at the ceremony and entered into the Roll of Honour the same day, each with a verification record that can be checked by anyone, without an account.',
            'PALMA does not notify losing finalists privately in advance, and does not disclose rankings below first place.',
          ]}
        />
      ),
    },
    {
      heading: 'Disqualification',
      plainly:
        'Cheating removes you from the season, and we will say that a disqualification happened.',
      body: (
        <>
          <p>
            PALMA may disqualify a candidacy, at any point up to and including announcement, where:
          </p>
          <Clauses
            items={[
              'nominations were purchased, automated, or submitted from addresses that do not belong to real people;',
              'the creator or a person acting for them attempted to contact, influence or induce a judge;',
              'evidence was fabricated, or work was claimed that is not the creator’s own;',
              'the creator is found to be under 18, or verification is found to have been falsified; or',
              'the creator’s conduct breaches the content policy.',
            ]}
          />
          <p>
            The creator is told what the finding is and has ten working days to respond, except
            where a safeguarding or legal obligation requires PALMA to act immediately. A
            disqualification after announcement is a revocation, and the Roll of Honour records it
            as such rather than removing the entry.
          </p>
        </>
      ),
    },
    {
      heading: 'Sponsors',
      plainly: 'Sponsors fund the ceremony. They have no part in any of the above.',
      body: (
        <>
          <Clauses
            items={[
              'A sponsor cannot nominate on behalf of anyone, see a score, meet a judge through PALMA, or receive advance notice of an outcome.',
              'A category partner’s name appears on the category page. That is the entire extent of its involvement in that category.',
              'PALMA refuses sponsorship that is conditional on an outcome, a shortlist place, or access to judging material, and will say publicly that it refused if asked.',
              'Where a sponsor has a commercial relationship with a nominee, that is disclosed on the category page.',
            ]}
          />
          <p>
            The full position, including the editorial independence statement, is at{' '}
            <Link href="/about/sponsors" className="palma-link text-ink">
              /about/sponsors
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      heading: 'Changes and questions',
      plainly: 'Rules do not change mid-season. Ask us anything.',
      body: (
        <p>
          These rules carry a version and an effective date. A change never applies to a season
          already open, the rules a season opened under are the rules it is judged under. Questions
          about a season&rsquo;s conduct go to{' '}
          <a href={`mailto:${CONTACTS.integrity}`} className="palma-link text-ink">
            {CONTACTS.integrity}
          </a>
          , and challenges go through{' '}
          <Link href="/legal/complaints" className="palma-link text-ink">
            Complaints and Appeals
          </Link>
          .
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
          These are the rules a PALMA season runs by, published in full and in advance. They exist
          so that a decision can be checked against something written down, rather than explained
          afterwards.
        </p>
      }
    />
  );
}
