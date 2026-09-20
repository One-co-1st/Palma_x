import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { PalmMark } from '@/components/brand/PalmMark';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { JsonLd, articleJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import { getArticle, listArticles } from '@/server/data/queries';

export const revalidate = 900;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await listArticles({ limit: 100 });
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    return buildMetadata({
      title: 'Journal',
      description: '',
      path: `/journal/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: article.title,
    description: article.standfirst,
    path: `/journal/${article.slug}`,
    type: 'article',
    publishedTime: article.publishedAt,
  });
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const related = (await listArticles({ limit: 4 }))
    .filter((entry) => entry.slug !== article.slug)
    .slice(0, 3);

  const paragraphs = article.body.split('\n\n').filter(Boolean);

  return (
    <>
      <article>
        <header className="border-stone-deep bg-ivory border-b">
          <Container size="narrow" className="py-16 sm:py-24">
            <Reveal variant="enter" className="flex flex-col gap-6">
              <Link
                href={
                  article.categorySlug ? `/journal?category=${article.categorySlug}` : '/journal'
                }
                className="palma-label text-olive transition-opacity hover:opacity-70"
              >
                {article.category ?? 'Journal'}
              </Link>
              <h1 className="text-4xl leading-[1.05] sm:text-6xl">{article.title}</h1>
              <p className="font-display text-taupe-deep max-w-140 text-xl leading-snug sm:text-2xl">
                {article.standfirst}
              </p>
              <div className="border-stone-deep flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-6">
                <span className="palma-label text-ink">{article.authorName}</span>
                <span className="palma-label text-taupe-deep">
                  {formatDate(article.publishedAt)}
                </span>
                <span className="palma-label text-taupe-deep">
                  {article.readingMinutes} min read
                </span>
              </div>
            </Reveal>
          </Container>
        </header>

        <Container size="narrow" className="py-16 sm:py-20">
          <Reveal className="palma-prose max-w-160">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </Reveal>

          <Reveal className="border-stone-deep mt-16 flex items-center gap-6 border-t pt-10">
            <PalmMark className="text-stone-deep h-8" />
            <p className="text-taupe-deep text-sm leading-relaxed">
              The PALMA Journal is published by PALMA, The Creator Honours.
            </p>
          </Reveal>
        </Container>
      </article>

      {related.length > 0 ? (
        <Section tone="stone" className="py-16 sm:py-20">
          <Container>
            <h2 className="palma-label text-taupe-deep mb-10">More from the Journal</h2>
            <RevealGroup className="grid gap-10 sm:grid-cols-3">
              {related.map((entry) => (
                <RevealItem key={entry.slug}>
                  <Link
                    href={`/journal/${entry.slug}`}
                    className="group border-stone-deep flex flex-col gap-3 border-t pt-5"
                  >
                    <span className="palma-label text-taupe-deep">
                      {entry.category ?? 'Journal'}
                    </span>
                    <h3 className="group-hover:text-olive text-xl leading-tight transition-colors">
                      {entry.title}
                    </h3>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </Section>
      ) : null}

      <JsonLd
        data={[
          articleJsonLd({
            title: article.title,
            description: article.standfirst,
            path: `/journal/${article.slug}`,
            authorName: article.authorName,
            publishedAt: article.publishedAt,
          }),
          breadcrumbJsonLd([
            { name: 'Journal', path: '/journal' },
            { name: article.title, path: `/journal/${article.slug}` },
          ]),
        ]}
      />
    </>
  );
}
