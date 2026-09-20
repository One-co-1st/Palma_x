import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import { CONTACTS, ENTITY, icoStatus, LEGAL_DOCUMENTS } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Legal',
  description:
    'The PALMA legal register: terms, privacy, cookies, competition rules, complaints, use of the mark and accessibility, each versioned and dated.',
  path: '/legal',
});

export default function LegalIndexPage() {
  const inForce = LEGAL_DOCUMENTS.filter((entry) => entry.status === 'in-force').length;
  // The register's own currency: the date of the most recent amendment to
  // anything in it, which is the one fact a reader checks before relying on it.
  const lastRevised = LEGAL_DOCUMENTS.reduce(
    (latest, entry) => (entry.effective > latest ? entry.effective : latest),
    LEGAL_DOCUMENTS[0]?.effective ?? '',
  );

  return (
    <>
      <Masthead
        eyebrow="The institution"
        title="The legal register"
        titleLines={['The legal', 'register']}
        standfirst="Every document PALMA is bound by, in one place, each carrying a version, an effective date and the clause numbering it is cited by."
        meta={[`${LEGAL_DOCUMENTS.length} documents`, `${inForce} in force`, 'Versioned in public']}
        plate={
          <MastheadPlate label="The register">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Documents">{LEGAL_DOCUMENTS.length}</PlateFact>
              <PlateFact term="In force">{inForce}</PlateFact>
              <PlateFact term="Last revised">{formatDate(lastRevised)}</PlateFact>
              <PlateFact term="Jurisdiction">{ENTITY.jurisdiction}</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="palma-prose">
                  <p>
                    These documents are kept in version control rather than in a database, and that
                    is deliberate. The database is PALMA&rsquo;s record of what happened, who was
                    nominated, who judged, who won. A legal document is a different kind of object:
                    it has to be diffable, attributable to a commit, and impossible to change
                    quietly. Every amendment to anything below carries an author and a date.
                  </p>
                  <p>
                    Every document below is in force as written. When one is replaced, the version
                    it replaces is not deleted: it stays at its own address marked{' '}
                    <em>superseded</em>, so the terms that governed a past season can still be
                    produced. An institution that quietly rewrites its terms has no terms.
                  </p>
                </div>
              </Reveal>
            </div>

            <aside className="lg:col-span-5">
              <Reveal>
                <div className="border-stone-deep border p-7">
                  <h2 className="palma-label text-taupe-deep mb-5">The entity</h2>
                  <dl className="flex flex-col gap-4 text-sm">
                    <div className="border-stone-deep/60 flex justify-between gap-6 border-b pb-3">
                      <dt className="text-taupe-deep">Registered name</dt>
                      <dd className="text-right">{ENTITY.name}</dd>
                    </div>
                    <div className="border-stone-deep/60 flex justify-between gap-6 border-b pb-3">
                      <dt className="text-taupe-deep">Trading as</dt>
                      <dd className="text-right">{ENTITY.tradingAs}</dd>
                    </div>
                    <div className="border-stone-deep/60 flex justify-between gap-6 border-b pb-3">
                      <dt className="text-taupe-deep">Jurisdiction</dt>
                      <dd className="text-right">{ENTITY.jurisdiction}</dd>
                    </div>
                    <div className="border-stone-deep/60 flex justify-between gap-6 border-b pb-3">
                      <dt className="text-taupe-deep">Company number</dt>
                      <dd className="text-taupe text-right">
                        {ENTITY.companyNumber ?? 'Not yet registered'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-taupe-deep">ICO registration</dt>
                      <dd className="text-taupe text-right">{icoStatus(ENTITY)}</dd>
                    </div>
                  </dl>
                  <p className="text-taupe mt-6 text-xs leading-relaxed">
                    Registration details are shown as unregistered where they are unregistered. They
                    will appear here, unchanged in form, the day they exist.
                  </p>
                </div>
              </Reveal>
            </aside>
          </div>
        </Container>
      </Section>

      <Section tone="stone" className="py-16 sm:py-20">
        <Container>
          <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
            The documents
          </h2>

          <RevealGroup className="flex flex-col">
            {LEGAL_DOCUMENTS.map((entry, index) => (
              <RevealItem key={entry.slug}>
                <Link
                  href={`/legal/${entry.slug}`}
                  className="palma-row group/card border-stone-deep grid gap-4 border-b py-7 sm:grid-cols-12 sm:items-baseline sm:gap-8"
                >
                  <span className="palma-label text-taupe sm:col-span-1">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="sm:col-span-4">
                    <span className="palma-row-lead font-display block text-2xl leading-tight">
                      {entry.title}
                    </span>
                    <span className="palma-label text-taupe mt-2 block">
                      v{entry.version} · {formatDate(entry.effective)}
                    </span>
                  </span>

                  <span className="text-taupe-deep text-sm leading-relaxed sm:col-span-5">
                    {entry.summary}
                  </span>

                  <span className="sm:col-span-2 sm:text-right">
                    <span
                      className={
                        entry.status === 'in-force'
                          ? 'palma-label text-olive'
                          : 'palma-label text-taupe'
                      }
                    >
                      {entry.status === 'in-force' ? 'In force' : 'Superseded'}
                    </span>
                  </span>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </Section>

      <Section className="py-16 sm:py-20">
        <Container>
          <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
            Who to write to
          </h2>

          <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['General and legal', CONTACTS.general],
              ['Data protection', CONTACTS.privacy],
              ['Security disclosure', CONTACTS.security],
              ['Integrity and appeals', CONTACTS.integrity],
              ['Accessibility barriers', CONTACTS.accessibility],
              ['Press', CONTACTS.press],
            ].map(([label, address]) => (
              <li key={address} className="border-stone-deep/60 border-b pb-4">
                <span className="palma-label text-taupe-deep block">{label}</span>
                <a href={`mailto:${address}`} className="palma-link text-ink mt-2 inline-block">
                  {address}
                </a>
              </li>
            ))}
          </ul>

          <p className="text-taupe mt-10 max-w-160 text-sm leading-relaxed">
            PALMA answers correspondence about the register within ten working days. Data subject
            requests are answered within one month, as UK GDPR requires. Requests to alter the
            public record of a conferred honour are handled under{' '}
            <Link href="/legal/complaints" className="palma-link text-ink">
              Complaints and Appeals
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
