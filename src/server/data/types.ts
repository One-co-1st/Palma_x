import type { SeasonStage } from '@/domain/season';

export { HONOUR_KINDS, HONOUR_LABEL, type HonourKind } from '@/domain/honours';
import type { HonourKind } from '@/domain/honours';
export type HonourState = 'active' | 'revoked';
export type VerificationStatus =
  'unverified' | 'pending' | 'verified' | 'failed' | 'expired' | 'revoked';

export type SeasonView = {
  id: string;
  year: number;
  title: string;
  stage: SeasonStage;
  tagline: string | null;
  summary: string | null;
  nominationsOpenAt: string | null;
  nominationsCloseAt: string | null;
  shortlistAt: string | null;
  finalistsAt: string | null;
  ceremonyAt: string | null;
  isCurrent: boolean;
  categoryCount: number;
};

export type CategoryView = {
  id: string;
  slug: string;
  name: string;
  strapline: string | null;
  description: string;
  eligibility: string;
  judgingCriteria: string;
  isOpen: boolean;
  position: number;
  year: number;
  stage: SeasonStage;
  partner: { name: string; slug: string } | null;
};

export type CreatorSummary = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  headline: string | null;
  portraitUrl: string | null;
  portraitAlt: string | null;
  verificationStatus: VerificationStatus;
  honourCount: number;
  winCount: number;
};

export type HonourEntry = {
  id: string;
  kind: HonourKind;
  state: HonourState;
  year: number;
  categoryName: string;
  categorySlug: string;
  citation: string | null;
  announcedAt: string | null;
  code: string | null;
  position: number;
};

export type CreatorProfile = CreatorSummary & {
  pronouns: string | null;
  city: string | null;
  biography: string | null;
  websiteUrl: string | null;
  links: { label: string; url: string }[];
  record: HonourEntry[];
  isClaimed: boolean;
};

export type FinalistView = {
  position: number;
  creator: CreatorSummary;
  citation: string | null;
};

export type CategoryOutcome = {
  category: CategoryView;
  finalists: FinalistView[];
  winner: (FinalistView & { code: string | null }) | null;
};

/**
 * THE PALMA of a season.
 *
 * Its own type rather than a `CategoryOutcome` with a null category. A
 * laureate has a citation that is always present and never has finalists
 * behind it, and giving it a shape of its own means a surface cannot render it
 * through the category path by accident.
 */
export type PalmaLaureate = {
  year: number;
  creator: CreatorSummary;
  citation: string;
  code: string | null;
  announcedAt: string | null;
};

export type RollOfHonourEntry = {
  year: number;
  categoryName: string;
  categorySlug: string;
  creator: CreatorSummary;
  code: string | null;
  citation: string | null;
};

export type RollOfHonourYear = {
  year: number;
  title: string;
  /** THE PALMA of that year, held apart from the category winners below it. */
  laureate: PalmaLaureate | null;
  entries: RollOfHonourEntry[];
};

export type ArticleSummary = {
  slug: string;
  title: string;
  standfirst: string;
  category: string | null;
  categorySlug: string | null;
  authorName: string;
  publishedAt: string | null;
  readingMinutes: number;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
};

export type ArticleDetail = ArticleSummary & {
  body: string;
};

export type AchievementRecord = {
  code: string;
  kind: HonourKind;
  state: HonourState;
  year: number;
  categoryName: string;
  categorySlug: string;
  creatorName: string;
  /**
   * The slug as it was when the honour was sealed. Part of what the signature
   * covers, so it is read from the frozen copy on the Achievement row and
   * never from the live Creator — see the schema comment on the column.
   */
  creatorSlug: string;
  /**
   * Where that creator's record lives now, for linking to. The same string as
   * `creatorSlug` today and not guaranteed to stay so, which is the entire
   * reason they are two fields.
   */
  creatorProfileSlug: string;
  creatorCountry: string;
  citation: string | null;
  issuedAt: string;
  revokedAt: string | null;
  signature: string;
  /**
   * The keyless SHA-256 of the same canonical payload the signature covers.
   * Written at conferral and, until now, never read — it is what lets the
   * verify page tell an altered record apart from a server holding the wrong
   * signing key. See `/verify/[code]`.
   */
  payloadDigest: string;
};

export type SeasonStats = {
  nominations: number;
  underReview: number;
  eligible: number;
  judging: number;
  finalists: number;
  winners: number;
};

export type SponsorView = {
  slug: string;
  name: string;
  summary: string | null;
  websiteUrl: string | null;
  tier: 'headline' | 'category_partner' | 'supporting' | 'media';
  categoryName: string | null;
};

export type JudgeView = {
  id: string;
  displayName: string;
  title: string | null;
  organisation: string | null;
  biography: string | null;
  countryCode: string | null;
  /** Seasons this judge has sat for, newest first. */
  seasons: { year: number; isChair: boolean }[];
  isChair: boolean;
};
