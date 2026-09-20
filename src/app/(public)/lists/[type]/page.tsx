import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { SubscribeForm } from '@/components/palma/SubscribeForm';
import { buildMetadata } from '@/lib/seo';
import { emailList, isEmailListKey, EMAIL_LIST_VALUES } from '@/domain/email-lists';
import { sql } from '@/server/db/sql';
import { featureLive } from '@/server/features';
import { formatDate } from '@/lib/format';

export const revalidate = 3600;

export async function generateStaticParams() {
  return EMAIL_LIST_VALUES.map((list) => ({ type: list.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isEmailListKey(type)) {
    return buildMetadata({ title: 'PALMA', description: 'PALMA.', path: '/lists' });
  }
  const list = emailList(type);
  return buildMetadata({
    title: list.name,
    description: list.description,
    path: `/lists/${type}`,
  });
}

/**
 * One list, and everything it has sent.
 *
 * Issues used to exist only in other people's inboxes, which meant a reader
 * who joined today could not read the last one. An institution that keeps a
 * permanent record of everybody else's achievements can keep its own letters.
 */
export default async function ListPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isEmailListKey(type)) notFound();

  const list = emailList(type);

  // A list whose feature is off is not offered, and its page says so rather
  // than inviting somebody to join something that does not run.
  const offered = list.requiresFeature ? await featureLive(list.requiresFeature) : true;

  const issues = await sql<
    {
      id: string;
      number: number;
      slug: string;
      subject: string;
      standfirst: string;
      sentAt: string;
      sponsorId: string | null;
    }[]
  >`
    SELECT
      "id",
      "number",
      "slug",
      "subject",
      "standfirst",
      to_char("sentAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "sentAt",
      "sponsorId"
    FROM "Dispatch"
    WHERE "type" = ${type}
    ORDER BY "number" DESC
    LIMIT 20
  `;

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-140 flex-col gap-10">
          <div className="flex flex-col gap-5">
            <span className="palma-label text-champagne-deep">PALMA communications</span>
            <h1 className="text-5xl leading-tight">{list.name}</h1>
            <p className="text-taupe-deep text-lg leading-relaxed">{list.description}</p>
          </div>

          <div className="border-stone-deep border-y py-9">
            {offered ? (
              <SubscribeForm type={list.key} source={`list-${list.key}`} label="Subscribe" />
            ) : (
              <p className="text-taupe-deep leading-relaxed">
                This list is not open yet. It will be when there is enough worth sending to justify
                it, PALMA would rather run no list than a thin one.
              </p>
            )}
          </div>

          {issues.length > 0 ? (
            <section>
              <h2 className="palma-label text-taupe-deep mb-6">Past issues</h2>
              <ul className="flex flex-col">
                {issues.map((issue) => (
                  <li key={issue.id} className="border-stone-deep border-b py-6 first:border-t">
                    <Link
                      href={`/lists/${type}/${issue.slug}`}
                      className="group flex flex-col gap-2"
                    >
                      <span className="palma-label text-taupe-deep">
                        No. {issue.number} · {formatDate(issue.sentAt)}
                        {issue.sponsorId ? ' · Partner message' : ''}
                      </span>
                      <span className="font-display group-hover:text-olive text-2xl leading-snug transition-colors">
                        {issue.subject}
                      </span>
                      <span className="text-taupe-deep text-sm leading-relaxed">
                        {issue.standfirst}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="palma-label text-taupe-deep mb-3">How often</h2>
              <p className="text-taupe-deep leading-relaxed">{list.cadence}</p>
            </div>

            <div>
              <h2 className="palma-label text-taupe-deep mb-3">Leaving</h2>
              <p className="text-taupe-deep leading-relaxed">
                One click in any message. No sign-in, no confirmation screen, no survey about why,
                and it leaves this list only. Every PALMA subscription is separate, and you can{' '}
                <Link href="/account/email-preferences" className="palma-link text-ink">
                  manage all of them
                </Link>{' '}
                in one place.
              </p>
            </div>

            <div>
              <h2 className="palma-label text-taupe-deep mb-3">The other lists</h2>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {EMAIL_LIST_VALUES.filter((entry) => entry.key !== list.key).map((entry) => (
                  <li key={entry.key}>
                    <Link
                      href={`/lists/${entry.key}`}
                      className="palma-link text-taupe-deep text-sm"
                    >
                      {entry.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
