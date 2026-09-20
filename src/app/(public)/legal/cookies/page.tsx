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
  title: 'Cookie Notice',
  description:
    'PALMA sets two cookies, both strictly necessary, and stores one display preference. Pages are counted in aggregate with no identifier of any kind. No third-party analytics, no advertising, no consent banner.',
  path: '/legal/cookies',
});

export default function CookiesPage() {
  const doc = legalDocument('cookies');
  if (!doc) notFound();

  const sections: LegalSection[] = [
    {
      heading: 'Why there is no banner',
      plainly:
        'Consent banners exist for tracking. PALMA does no tracking, so there is nothing to consent to.',
      body: (
        <>
          <p>
            Under the Privacy and Electronic Communications Regulations, consent is required to
            store information on, or read information from, your device where that storage is not
            strictly necessary. Analytics cookies, advertising, personalisation. PALMA sets none of
            those. Its page counting stores nothing on your device and reads nothing from it, so
            there is nothing to consent to and no banner to dismiss.
          </p>
          <p>
            This is not a loophole. It is a consequence of a decision made much earlier: PALMA has
            no advertising business, no growth-analytics practice and no third-party scripts. There
            is nothing following you around this site because nothing here was built to.
          </p>
        </>
      ),
    },
    {
      heading: 'Everything PALMA stores in your browser',
      plainly: 'Two cookies and one saved preference. That is the complete list.',
      body: (
        <>
          <LegalTable
            caption="Complete inventory"
            head={['Name', 'Kind', 'What it does', 'Lifetime']}
            rows={[
              [
                <code key="s">palma_session</code>,
                'Cookie. Strictly necessary',
                'Identifies a signed-in creator, judge or administrator. HttpOnly, so scripts cannot read it; SameSite=Lax; Secure in production. Set only after you sign in.',
                '14 days, or until you sign out',
              ],
              [
                <code key="c">palma_csrf</code>,
                'Cookie. Strictly necessary',
                'Carries a cross-site request forgery token, so a form submitted from another site cannot act as you. Readable by the page, because the page has to send it back.',
                '14 days, or until you sign out',
              ],
              [
                <code key="t">palma-theme</code>,
                'Local storage. Preference',
                'Remembers whether you chose Paper, Ink or Archive, so the site does not flash the wrong theme on the next visit. Never sent to the server.',
                'Until you clear it',
              ],
            ]}
          />
          <p>
            A visitor who never signs in is served no cookies at all. Reading the entire public
            archive, every honour, every creator, every season, requires nothing to be stored in
            your browser.
          </p>
        </>
      ),
    },
    {
      heading: 'How PALMA counts a page',
      plainly: 'It counts that a page was opened. It does not, and cannot, work out who opened it.',
      body: (
        <>
          <p>
            PALMA keeps a count of how many times each of its pages is opened. When a public page
            loads, it tells the server its own address, <code>/paroh</code>, say, and a number goes
            up by one. Terms typed into the Roll of Honour and the creator index are counted the
            same way, so that PALMA can see what people look for and do not find.
          </p>
          <p>That is the whole of it. The request carries a page address and nothing else:</p>
          <Clauses
            items={[
              'No cookie is set, read, or needed. Counting works identically whether or not you are signed in, and nothing is stored in your browser.',
              'Your IP address is not stored, not logged against the count, and not hashed into an identifier. Neither is your browser’s user-agent string.',
              'Nothing links one page view to another. PALMA cannot tell whether two views came from one person or two, on the same day or across a year.',
              'No profile is built, because there is nothing to build one from.',
            ]}
          />
          <p>
            The consequence is deliberate, and PALMA would rather state it than be thought to be
            hiding it:{' '}
            <strong>
              PALMA cannot report unique visitors, returning visitors, or where its traffic came
              from.
            </strong>{' '}
            Every one of those requires telling one reader from another, which requires holding
            something that identifies you. PALMA holds nothing that identifies you, so it does not
            produce those figures, not as an oversight, but because producing them is the thing it
            declined to do.
          </p>
          <p>
            Counts are kept as a total per page per day. There is no record of an individual visit
            anywhere in PALMA&rsquo;s systems to be subpoenaed, breached, sold or handed over,
            because no such record is ever created.
          </p>
        </>
      ),
    },
    {
      heading: 'What PALMA does not set',
      plainly: 'No third-party analytics, no pixels, no third-party anything.',
      body: (
        <Clauses
          items={[
            'No third-party analytics. No Google Analytics, no Plausible, Fathom or any other hosted service, and no data about you leaving PALMA for anyone else to hold.',
            'No advertising or conversion pixels. PALMA runs no advertising.',
            'No session recording, heatmaps or scroll tracking.',
            'No social embeds that set cookies. Links to a creator’s channels are ordinary links, and load nothing until you click them.',
            'No fingerprinting, and no attempt to identify a device across sessions or within one.',
            'No third-party fonts, scripts or tag managers. Everything the page loads is served from palmaawards.com.',
          ]}
        />
      ),
    },
    {
      heading: 'Turning them off',
      plainly: 'You can block all of it. Signing in stops working; reading does not.',
      body: (
        <>
          <p>
            Every browser lets you block or clear cookies and site data. Blocking PALMA&rsquo;s will
            not degrade the public site in any way, the archive, the seasons, the categories and the
            nomination form all work without them.
          </p>
          <p>
            Two things do break: you will not be able to stay signed in to a portal, and the site
            will forget your theme between visits. There is no way to sign in without a session
            cookie, because the session cookie is what being signed in means.
          </p>
        </>
      ),
    },
    {
      heading: 'Questions',
      plainly: 'Ask us.',
      body: (
        <p>
          Write to{' '}
          <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
            {CONTACTS.privacy}
          </a>
          . The wider picture, what PALMA holds on a server rather than in your browser, and for how
          long, is in the{' '}
          <Link href="/legal/privacy" className="palma-link text-ink">
            privacy notice
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
          This is the complete inventory of what PALMA stores in your browser. It is short enough to
          read in full, which is the point: a cookie notice that needs a summary has already failed.
        </p>
      }
    />
  );
}
