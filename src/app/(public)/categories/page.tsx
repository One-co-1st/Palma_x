import { Container, Section } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { CategoryCard } from '@/components/palma/CategoryCard';
import { Reveal } from '@/components/palma/Reveal';
import { buildMetadata } from '@/lib/seo';
import { SCORING_CRITERIA } from '@/domain/judging';
import { getCurrentSeason, listCategories } from '@/server/data/queries';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'Categories',
  description:
    'Every PALMA category, with its eligibility rules and judging criteria set out in full. The twelve Creator PALMAs contested in The Creator Honours.',
  path: '/categories',
});

export default async function CategoriesPage() {
  const season = await getCurrentSeason();
  const categories = await listCategories(season.year);

  return (
    <>
      <Masthead
        eyebrow={`${season.title} · Categories`}
        title="The categories"
        titleLines={['The', 'categories']}
        figure={season.year}
        standfirst="Twelve Creator PALMAs. Each with published eligibility rules, published judging criteria, and a panel briefed to discount audience size."
        meta={[
          `${categories.length} contested`,
          `${SCORING_CRITERIA.length} weighted criteria, ten points each`,
          'Audience size is not one of them',
        ]}
        plate={
          <MastheadPlate label="The rule that governs all twelve">
            <p className="text-ivory/75 text-sm leading-relaxed">
              A category publishes its eligibility and its judging criteria before nominations open,
              and neither changes mid-season.
            </p>
            <dl className="border-ivory/15 grid grid-cols-2 gap-4 border-t pt-4">
              <PlateFact term="Judges">3 minimum</PlateFact>
              <PlateFact term="Finalists">4 each</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section>
        <Container>
          {/* The stagger is by row rather than by card. On a phone the grid is
              one column, so staggering per card would make the twelfth arrive
              two seconds after the first; per row, the delay resets as the
              reader moves down the page and every card arrives promptly. */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Reveal key={category.slug} delay={(index % 3) * 70}>
                <CategoryCard category={category} index={index} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
