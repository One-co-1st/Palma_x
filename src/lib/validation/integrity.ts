import { z } from 'zod';

export const REPORT_REASONS = [
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'fabricated_achievement', label: 'Fabricated achievement' },
  { key: 'explicit_content', label: 'Explicit content' },
  { key: 'harassment', label: 'Harassment or abuse' },
  { key: 'ineligible_creator', label: 'Ineligible creator' },
  { key: 'vote_manipulation', label: 'Nomination manipulation' },
  { key: 'other', label: 'Something else' },
] as const;

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS.map((entry) => entry.key) as [string, ...string[]]),
  detail: z
    .string()
    .trim()
    .min(30, 'Tell us what you have seen, in at least 30 characters.')
    .max(2000),
  creatorSlug: z.string().trim().max(120).optional().or(z.literal('')),
  candidacyReference: z.string().trim().max(40).optional().or(z.literal('')),
  contactEmail: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal('')),
  website: z.string().max(0).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
