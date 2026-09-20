import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { SubscribeForm } from '@/components/palma/SubscribeForm';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { emailList, isEmailListKey } from '@/domain/email-lists';
import { sql } from '@/server/db/sql';
import { formatDate } from '@/lib/format';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = await params;
  const issueRows = await sql<{ subject: string; standfirst: string }[]>`
    SELECT "subject", "standfirst"
    FROM "Dispatch"
    WHERE "slug" = ${slug}
    LIMIT 1
  `;
  const issue = issueRows[0] ?? null;

  if (!issue) {
    return buildMetadata({
      title: 'PALMA communications',
      description: 'PALMA’s letters.',
      path: `/lists/${type}`,
    });
  }

  return buildMetadata({
    title: issue.subject,
    description: issue.standfirst.slice(0, 200),
    path: `/lists/${type}/${slug}`,
  });
}

/** An issue, kept — the same words that went out, on a page anybody can read. */
export default async function IssuePage({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = await params;
  if (!isEmailListKey(type)) notFound();

  const issueRows = await sql<
    {
      type: string;
      number: number;
      subject: string;
      standfirst: string;
      body: string;
      linkLabel: string | null;
      linkUrl: string | null;
      sponsorId: string | null;
      sentAt: string;
    }[]
  >`
    SELECT
      "type",
      "number",
      "subject",
      "standfirst",
      "body",
      "linkLabel",
      "linkUrl",
      "sponsorId",
      to_char("sentAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "sentAt"
    FROM "Dispatch"
    WHERE "slug" = ${slug}
    LIMIT 1
  `;
  const issue = issueRows[0] ?? null;
  if (!issue || issue.type !== type) notFound();

  const list = emailList(type);
  const sponsorRows = issue.sponsorId
    ? await sql<{ name: string; websiteUrl: string | null }[]>`
        SELECT "name", "websiteUrl"
        FROM "Sponsor"
        WHERE "id" = ${issue.sponsorId}
        LIMIT 1
      `
    : [];
  const sponsor = sponsorRows[0] ?? null;

  const paragraphs = issue.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <Section className="py-20">
      <Container size="narrow">
        <article className="mx-auto flex max-w-140 flex-col gap-8">
          <Link href={`/lists/${type}`} className="palma-label text-taupe-deep hover:text-ink">
            ← {list.name}
          </Link>

          {sponsor ? (
            <Notice tone="warning" title="A PALMA partner message">
              Sent on behalf of <strong>{sponsor.name}</strong> to people who subscribed to partner
              offers. PALMA did not judge, endorse or verify what it says, and no partner has any
              part in the awards.
            </Notice>
          ) : null}

          <header className="flex flex-col gap-5">
            <span className="palma-label text-champagne-deep">
              No. {issue.number} · {formatDate(issue.sentAt)}
            </span>
            <h1 className="text-5xl leading-tight">{issue.subject}</h1>
            <p className="text-taupe-deep text-lg leading-relaxed italic">{issue.standfirst}</p>
          </header>

          <div className="border-stone-deep flex flex-col gap-5 border-t pt-8 leading-relaxed">
            {paragraphs.map((block, index) => (
              <p key={index}>{block}</p>
            ))}
          </div>

          {issue.linkUrl && issue.linkLabel ? (
            <p>
              <a
                href={issue.linkUrl}
                className="palma-link text-ink"
                rel="noreferrer noopener"
                target="_blank"
              >
                {issue.linkLabel}
              </a>
            </p>
          ) : null}

          <aside className="border-stone-deep mt-6 border-t pt-9">
            <h2 className="palma-label text-taupe-deep mb-4">Get the next one</h2>
            <SubscribeForm type={list.key} source="issue" compact label="Subscribe" />
          </aside>
        </article>
      </Container>
    </Section>
  );
}
