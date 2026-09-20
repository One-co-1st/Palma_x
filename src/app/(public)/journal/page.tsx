import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Masthead } from '@/components/palma/Masthead';
import { EmptyState } from '@/components/ui/feedback';
import { Reveal } from '@/components/palma/Reveal';
import { buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { listArticleCategories, listArticles } from '@/server/data/queries';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'Journal',
  description:
    'The PALMA Journal: interviews, essays, category explainers and announcements on the industry PALMA recognises.',
  path: '/journal',
});

type Props = { searchParams: Promise<{ category?: string }> };

export default async function JournalPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const [articles, categories] = await Promise.all([
    listArticles({ category }),
    listArticleCategories(),
  ]);

  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      <Masthead
        eyebrow={'The PALMA Journal'}
        title="Journal"
        standfirst="Writing on the creator industry, the people in it, and the standards PALMA holds them to."
        meta={['Interviews', 'Essays', 'Category explainers', 'Announcements']}
        size="compact"
      />

      <div className="border-stone-deep bg-ivory border-b">
        <Container className="flex flex-wrap items-center gap-2 py-5">
          <Link
            href="/journal"
            data-active={!category}
            className={cn(
              'palma-chip palma-label rounded-full border px-3.5 py-2',
              !category
                ? 'border-ink bg-ink text-ivory'
                : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
            )}
          >
            All
          </Link>
          {categories.map((entry) => (
            <Link
              key={entry.slug}
              href={`/journal?category=${entry.slug}`}
              data-active={category === entry.slug}
              className={cn(
                'palma-chip palma-label rounded-full border px-3.5 py-2',
                category === entry.slug
                  ? 'border-ink bg-ink text-ivory'
                  : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
              )}
            >
              {entry.name}
            </Link>
          ))}
        </Container>
      </div>

      <Section>
        <Container>
          {articles.length === 0 ? (
            <EmptyState title="Nothing published here yet" />
          ) : (
            <>
              {lead ? (
                <Link
                  href={`/journal/${lead.slug}`}
                  className="group/card border-stone-deep flex flex-col gap-6 border-b pb-16"
                >
                  <span className="palma-label text-taupe-deep">
                    {lead.category ?? 'Journal'} · {formatDate(lead.publishedAt)} ·{' '}
                    {lead.readingMinutes} min read
                  </span>
                  <h2 className="palma-pigment-title max-w-220 text-4xl leading-[1.03] sm:text-6xl">
                    {lead.title}
                  </h2>
                  <span
                    aria-hidden="true"
                    className="palma-card-rule bg-olive/50 block h-px w-full max-w-md"
                  />
                  <p className="text-taupe-deep max-w-160 text-lg leading-relaxed">
                    {lead.standfirst}
                  </p>
                  <span className="palma-label text-olive">{lead.authorName}</span>
                </Link>
              ) : null}

              <div className="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article, index) => (
                  <Reveal key={article.slug} delay={index * 60}>
                    <Link
                      href={`/journal/${article.slug}`}
                      className="group/card border-stone-deep flex h-full flex-col gap-4 border-t pt-6"
                    >
                      <span className="palma-label text-taupe-deep">
                        {article.category ?? 'Journal'}
                      </span>
                      <h3 className="palma-pigment-title text-2xl leading-tight">
                        {article.title}
                      </h3>
                      <span
                        aria-hidden="true"
                        className="palma-card-rule bg-olive/50 block h-px w-full"
                      />
                      <p className="text-taupe-deep line-clamp-3 text-sm leading-relaxed">
                        {article.standfirst}
                      </p>
                      <span className="palma-label text-taupe mt-auto pt-2">
                        {formatDate(article.publishedAt)} · {article.readingMinutes} min
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
