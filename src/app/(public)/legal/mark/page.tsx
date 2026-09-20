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

export const metadata = buildMetadata({
  title: 'Use of the PALMA Mark',
  description:
    'How finalists, winners, sponsors and the press may use the PALMA name, wordmark and seal, with the exact wording that is permitted.',
  path: '/legal/mark',
});

export default function MarkPage() {
  const doc = legalDocument('mark');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'The short version',
      plainly:
        'Say exactly what you won, with the season and category. Do not imply anything more.',
      body: (
        <>
          <p>
            An honour is a fact about specific work in a specific category in a specific season.
            Every permitted use of the PALMA mark follows from that single idea. State the fact
            fully and you are almost certainly within these rules; shorten it in a way that inflates
            it and you are almost certainly not.
          </p>
          <LegalTable
            caption="The test, applied"
            head={['Permitted', 'Not permitted']}
            rows={[
              ['PALMA 2027 Winner, Best Independent Creator', 'PALMA Winner'],
              [
                'PALMA 2027 Finalist, Creator of the Year',
                'PALMA Creator of the Year (if you were a finalist)',
              ],
              [
                'Honoured by PALMA, The Creator Honours, 2027',
                'PALMA-approved · PALMA-endorsed · Official PALMA Creator',
              ],
              ['Nominated for a PALMA, 2027', 'PALMA-nominated Best New Creator, 2025–2027'],
              [
                'Three-time PALMA finalist',
                'Award-winning, per PALMA (where no honour was conferred)',
              ],
            ]}
          />
        </>
      ),
    },
    {
      heading: 'What PALMA owns',
      plainly: 'The name, the wordmark, the palm mark and the seal.',
      body: (
        <>
          <p>
            The PALMA name, the wordmark, the descriptor &ldquo;The Creator Honours&rdquo;, the palm
            mark and the honour seal are owned by {ENTITY.name}. They are licensed to recipients on
            the terms below, and to nobody else.
          </p>
          <p>
            The Roll of Honour and the name &ldquo;PaROH&rdquo; are likewise PALMA&rsquo;s. Anyone
            may link to a PaROH entry, that is what it is for, but nobody may present a copy of the
            archive as an authoritative record.
          </p>
        </>
      ),
    },
    {
      heading: 'If you hold an honour',
      plainly: 'You may say so anywhere, for good, as long as you say which one and when.',
      body: (
        <>
          <Clauses
            items={[
              'You may state the honour you hold on your channels, your site, your press materials, your show notes, your business cards and your CV. There is no fee and no expiry.',
              'Always include the season year and the category. "PALMA 2027 Winner, Best Independent Creator" is the pattern.',
              'You may use the seal supplied to you in the creator portal, at the supplied proportions, in ink, ivory or champagne, with clear space around it of at least the height of the mark itself.',
              'You may link the seal to your entry in the Roll of Honour. PALMA would prefer that you did, because it makes the claim checkable.',
              'A finalist may say "finalist". A shortlisted creator may say "shortlisted". Neither may say "winner", and PALMA will ask for a correction where they do.',
            ]}
          />
          <p>
            Do not alter the mark: no recolouring outside the stated palette, no stretching,
            rotating, outlining, adding effects, embedding it in another logo, or reproducing it
            below a legible size. Do not use it as your own avatar, channel art or product branding.
          </p>
        </>
      ),
    },
    {
      heading: 'If you were nominated',
      plainly: 'You may mention it, plainly, once. A nomination is not an honour.',
      body: (
        <p>
          Anyone can be nominated, because anyone can nominate. You may say you were nominated in a
          given season and category, and PALMA is glad you are pleased about it. You may not use the
          seal, may not say &ldquo;award-winning&rdquo;, and may not present a nomination as a
          shortlisting or a finalist place. Nomination counts are not published and may not be
          quoted as a figure attributed to PALMA.
        </p>
      ),
    },
    {
      heading: 'If you are a sponsor',
      plainly: 'You may say you support PALMA. You may never imply you influence it.',
      body: (
        <Clauses
          items={[
            'A sponsor may use the agreed lockup in the agreed tier wording, "Headline Partner, PALMA 2027", "Category Partner, Best New Creator, PALMA 2027".',
            'A sponsor may not use the honour seal, which belongs to recipients.',
            'A sponsor may not describe itself as selecting, endorsing, presenting or approving any creator, shortlist or winner, because it does none of those things.',
            'A sponsor may not use a recipient’s name or likeness in its own marketing without that recipient’s separate permission. PALMA does not grant it and cannot.',
            'Sponsorship materials that imply influence over an outcome are withdrawn, and PALMA reserves the right to say publicly that it withdrew them.',
          ]}
        />
      ),
    },
    {
      heading: 'If you are press',
      plainly: 'Use the name and the assets freely, and please check claims against the record.',
      body: (
        <p>
          Journalists may use the PALMA name, wordmark and supplied imagery to report on the
          honours, without permission and without a licence. The press kit, logos, the mark, the
          seal, approved photography and the correct wording, is at{' '}
          <Link href="/press" className="palma-link text-ink">
            /press
          </Link>
          . Every claim about an honour can be checked against the Roll of Honour or at{' '}
          <Link href="/verify" className="palma-link text-ink">
            /verify
          </Link>
          , and PALMA would rather you checked than asked.
        </p>
      ),
    },
    {
      heading: 'Revocation and misuse',
      plainly: 'If the honour goes, the right to use the mark goes with it.',
      body: (
        <>
          <Clauses
            items={[
              'Where an honour is revoked, the licence to use the mark in connection with it ends on the date of revocation, and all use must stop within 30 days.',
              'Where the mark is used in a way these rules do not permit, PALMA will ask for a correction before it does anything else. Most misuse is a mistake about wording, not bad faith.',
              'Where misuse is deliberate, claiming an honour that was never conferred, forging a seal, or presenting a fabricated verification code, PALMA will say publicly that the claim is false, and will take the legal steps available to it.',
            ]}
          />
          <p>
            Anyone can check a claim. Every honour carries a verification code, and entering it at{' '}
            <Link href="/verify" className="palma-link text-ink">
              /verify
            </Link>{' '}
            returns the honour, the season, the category and its current state, including whether it
            was revoked. That is deliberately public: the best protection for an honour is that
            forging one is trivially detectable.
          </p>
        </>
      ),
    },
    {
      heading: 'Asking',
      plainly: 'For anything not covered here, write to us. We answer quickly.',
      body: (
        <p>
          For a use these rules do not cover, merchandise, broadcast, an unusual lockup, a
          translation of the wording, write to{' '}
          <a href={`mailto:${CONTACTS.press}`} className="palma-link text-ink">
            {CONTACTS.press}
          </a>
          . Sponsorship questions go to{' '}
          <a href={`mailto:${CONTACTS.partnerships}`} className="palma-link text-ink">
            {CONTACTS.partnerships}
          </a>
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
          An honour is only worth holding if it cannot be counterfeited or quietly inflated. These
          rules exist to protect the people who actually won one, by making sure that what the mark
          claims is exactly what the record says.
        </p>
      }
    />
  );
}
