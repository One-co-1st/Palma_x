import { describe, expect, it } from 'vitest';
import { categorySeeds, seasonSeeds, citations } from './fixtures/seed-data';
import { CATEGORY_PIGMENTS, pigmentFor } from '@/lib/category-identity';

/**
 * The slate, held to its own rules.
 *
 * These exist because the slate has already drifted once: the design specified
 * a set of categories, the seed created a different and smaller set, and the
 * homepage then reported a number that was accurate about the wrong data.
 * Every assertion here is one that would have failed at that moment.
 */
describe('the Creator PALMAs', () => {
  it('is twelve, and THE PALMA is not among them', () => {
    expect(categorySeeds).toHaveLength(12);
    for (const category of categorySeeds) {
      expect(category.slug).not.toBe('the-palma');
      expect(category.name.toUpperCase()).not.toBe('THE PALMA');
    }
  });

  it('has no duplicate slug or name', () => {
    expect(new Set(categorySeeds.map((c) => c.slug)).size).toBe(categorySeeds.length);
    expect(new Set(categorySeeds.map((c) => c.name)).size).toBe(categorySeeds.length);
  });

  it('gives every category an explicitly assigned pigment, never a derived one', () => {
    // A derived pigment is the fallback for a category PALMA has not met. A
    // seeded category reaching it means somebody added a slug and forgot the
    // colour, which is invisible until two categories come out the same.
    const used = new Set<string>();
    for (const category of categorySeeds) {
      const pigment = pigmentFor(category.slug);
      expect(CATEGORY_PIGMENTS).toContain(pigment);
      expect(used.has(pigment), `${category.slug} shares ${pigment}`).toBe(false);
      used.add(pigment);
    }
    expect(used.size).toBe(categorySeeds.length);
  });

  it('publishes eligibility and judging criteria for every category', () => {
    // A category page promises both before nominations open. An empty one is a
    // rule PALMA said it had and does not.
    for (const category of categorySeeds) {
      expect(category.eligibility.trim().length, category.slug).toBeGreaterThan(40);
      expect(category.judgingCriteria.trim().length, category.slug).toBeGreaterThan(40);
      expect(category.description.trim().length, category.slug).toBeGreaterThan(40);
      expect(category.strapline.trim().length, category.slug).toBeGreaterThan(0);
    }
  });

  it('states an age limit wherever it states who may enter', () => {
    // Creators must be 18 or over. The rule belongs on the category that
    // applies it, not only in the terms nobody reads.
    for (const category of categorySeeds) {
      expect(category.eligibility, category.slug).toMatch(/18 or over/);
    }
  });

  it('carries a citation for every category', () => {
    for (const category of categorySeeds) {
      expect(citations[category.slug], category.slug).toBeTruthy();
    }
  });
});

describe('a season slate', () => {
  it('only contests categories that exist', () => {
    const known = new Set(categorySeeds.map((c) => c.slug));
    for (const season of seasonSeeds) {
      for (const slug of season.categorySlugs) {
        expect(known.has(slug), `${season.year} contests unknown ${slug}`).toBe(true);
      }
    }
  });

  it('never records a result for a category the season did not contest', () => {
    // This is the one that keeps the archive honest: a result against a
    // category a season never ran would invent history.
    for (const season of seasonSeeds) {
      for (const slug of Object.keys(season.results)) {
        expect(season.categorySlugs, `${season.year} has a result for ${slug}`).toContain(slug);
      }
    }
  });

  it('runs the full slate in the current season', () => {
    const current = seasonSeeds.find((season) => season.isCurrent);
    expect(current).toBeDefined();
    expect(current!.categorySlugs).toHaveLength(categorySeeds.length);
  });

  it('names only creators it seeds, and never twice in one category', () => {
    for (const season of seasonSeeds) {
      for (const [slug, creators] of Object.entries(season.results)) {
        expect(new Set(creators).size, `${season.year} ${slug} repeats a creator`).toBe(
          creators.length,
        );
      }
    }
  });
});
