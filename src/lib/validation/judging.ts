import { z } from 'zod';
import { MAX_SCORE, MIN_SCORE, SCORING_CRITERIA, type CriterionKey } from '@/domain/judging';
import { CONFLICT_KINDS } from '@/domain/conflicts';

const criterion = z.coerce.number().int().min(MIN_SCORE).max(MAX_SCORE);

/**
 * The criteria, as a Zod shape.
 *
 * Derived from `SCORING_CRITERIA` rather than listed again. The criteria and
 * their weights are a decision the institution revisits between seasons, and
 * every place that restates them by hand is a place that will be missed when
 * they change — as four of them were the first time.
 */
const criteria = Object.fromEntries(SCORING_CRITERIA.map((entry) => [entry.key, criterion])) as {
  [K in CriterionKey]: typeof criterion;
};

export const scoreSchema = z.object({
  assignmentId: z.string().trim().min(1),
  ...criteria,
  // Length is checked in words by the domain; the cap here is a guard against
  // an oversized payload, not the editorial rule.
  remarks: z.string().trim().min(1).max(6000),
  conflictDeclared: z.boolean().default(false),
});

export const conflictSchema = z.object({
  candidacyId: z.string().trim().min(1),
  kind: z.enum(CONFLICT_KINDS.map((entry) => entry.key) as [string, ...string[]]),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const scoreCorrectionSchema = z.object({
  scoreId: z.string().trim().min(1),
  ...criteria,
  correctionNote: z
    .string()
    .trim()
    .min(20, 'A correction must be explained in at least 20 characters.')
    .max(1000),
});

export type ScoreInput = z.infer<typeof scoreSchema>;
