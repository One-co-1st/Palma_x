import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { ObjectionForm } from '@/components/palma/ObjectionForm';
import { buildMetadata } from '@/lib/seo';
import { sql } from '@/server/db/sql';
import { CONTACTS } from '@/lib/legal';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Ask PALMA to remove a record',
  description: 'Object to a PALMA record written about you without your involvement.',
  path: '/creators',
  noIndex: true,
});

/**
 * Article 21, as a page rather than a paragraph.
 *
 * A right somebody has to read a privacy notice to discover, and then write an
 * email to exercise, is a right most people never use. This is the same route,
 * one click from the record itself.
 */
export default async function ObjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const creatorRows = await sql<
    {
      id: string;
      slug: string;
      displayName: string;
      countryCode: string;
      userId: string | null;
      isPublished: boolean;
      honourCount: number;
    }[]
  >`
    SELECT
      c."id",
      c."slug",
      c."displayName",
      c."countryCode",
      c."userId",
      c."isPublished",
      (
        SELECT count(*)::int
        FROM "Honour" h
        WHERE h."creatorId" = c."id" AND h."state" = 'active'
      ) AS "honourCount"
    FROM "Creator" c
    WHERE c."slug" = ${slug}
    LIMIT 1
  `;
  const creatorRow = creatorRows[0];

  if (!creatorRow || !creatorRow.isPublished) notFound();

  const links = await sql<{ id: string; label: string; url: string }[]>`
    SELECT "id", "label", "url"
    FROM "CreatorLink"
    WHERE "creatorId" = ${creatorRow.id}
    ORDER BY "position" ASC
  `;

  const creator = { ...creatorRow, links };

  const held = Boolean(creator.userId);
  const hasHonours = creator.honourCount > 0;

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-140 flex-col gap-9">
          <div className="flex flex-col gap-5">
            <Link
              href={`/creators/${creator.slug}`}
              className="palma-label text-taupe-deep hover:text-ink"
            >
              ← {creator.displayName}
            </Link>
            <h1 className="text-4xl leading-tight">Ask PALMA to remove this record</h1>
            <p className="text-taupe-deep leading-relaxed">
              PALMA wrote this record without asking you. That is lawful, an awards archive has a
              legitimate interest in keeping an accurate record of its industry, but it is not
              something you agreed to, and you can object.
            </p>
          </div>

          {held ? (
            <div className="border-stone-deep border p-7">
              <h2 className="palma-label text-taupe-deep mb-3">This record is already held</h2>
              <p className="text-taupe-deep text-sm leading-relaxed">
                An account holds this record and controls how it is described. If it is yours, sign
                in and edit or close it. If you believe it is held by the wrong person, write to{' '}
                <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
                  {CONTACTS.privacy}
                </a>{' '}
                and PALMA will investigate, a record held by the wrong person is the most serious
                thing that can go wrong here.
              </p>
            </div>
          ) : (
            <>
              <div className="border-stone-deep border p-7">
                <h2 className="palma-label text-taupe-deep mb-4">What PALMA holds about you</h2>
                <p className="text-taupe-deep mb-5 text-sm leading-relaxed">
                  All of it. There is no second file.
                </p>
                <dl className="flex flex-col">
                  <div className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3">
                    <dt className="text-taupe-deep text-sm">Name</dt>
                    <dd className="text-sm">{creator.displayName}</dd>
                  </div>
                  <div className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3">
                    <dt className="text-taupe-deep text-sm">Country</dt>
                    <dd className="text-sm">{creator.countryCode}</dd>
                  </div>
                  <div className="border-stone-deep/60 flex flex-col gap-1 border-b py-3">
                    <dt className="text-taupe-deep text-sm">Links you published yourself</dt>
                    <dd className="text-sm">
                      {creator.links.length === 0 ? (
                        <span className="text-taupe">None</span>
                      ) : (
                        <ul className="mt-1 flex flex-col gap-1">
                          {creator.links.map((link) => (
                            <li key={link.id} className="break-all">
                              {link.label}, {link.url}
                            </li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                    <dt className="text-taupe-deep text-sm">PALMA honours</dt>
                    <dd className="text-sm">{hasHonours ? creator.honourCount : 'None'}</dd>
                  </div>
                </dl>
                <p className="text-taupe mt-5 text-xs leading-relaxed">
                  No city, no age, no biography, no contact details, and nothing anyone wrote about
                  you in a nomination, PALMA does not collect information about an unclaimed creator
                  because it might be useful later. The full rule is in the{' '}
                  <Link href="/legal/privacy" className="palma-link text-taupe-deep">
                    privacy notice
                  </Link>
                  .
                </p>
              </div>

              {hasHonours ? (
                <div className="border-champagne-deep/60 bg-champagne/10 border p-7">
                  <h2 className="palma-label text-champagne-deep mb-3">One thing to know first</h2>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    PALMA has conferred an honour on this record. The fact of a conferred honour is
                    an institutional and archival record, and PALMA will normally keep it, an award
                    that could be erased by the person who received it would not be worth receiving.
                  </p>
                  <p className="text-taupe-deep mt-3 text-sm leading-relaxed">
                    What PALMA <em>can</em> do is reduce the record to the achievement itself: the
                    name, the category and the year, and nothing else. Say so below and that is what
                    will happen.
                  </p>
                </div>
              ) : null}

              <ObjectionForm slug={creator.slug} name={creator.displayName} />

              <p className="text-taupe text-xs leading-relaxed">
                PALMA does not ask you to prove who you are to raise this, because requiring proof
                would mean collecting more about you in order to hold less. If the request is
                unusual, a record with honours, or a name several people use, a person may write
                back and ask. You can also go straight to{' '}
                <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-taupe-deep">
                  {CONTACTS.privacy}
                </a>
                , or complain to the ICO at any time without contacting PALMA first.
              </p>
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
