import { z } from 'zod';
import { CODE_PATTERN, normaliseCode } from '@/domain/verification-code';
import { MAX_REASON_LENGTH, MIN_REASON_LENGTH, REASON_PATTERN } from '@/domain/nomination';

/**
 * What PALMA asks a nominator for: a creator, a category, a sentence, and an
 * email address. Nothing else — no account, no evidence, no attachments.
 */
export const nominationDraftSchema = z.object({
  creatorSlug: z.string().trim().min(1, 'Choose the creator you are nominating.').max(120),
  categorySlug: z.string().trim().min(1, 'Choose a category.').max(120),
  reason: z
    .string()
    .trim()
    .min(MIN_REASON_LENGTH, `Tell us why in at least ${MIN_REASON_LENGTH} characters.`)
    .max(MAX_REASON_LENGTH, `Keep it under ${MAX_REASON_LENGTH} characters.`)
    .refine((value) => REASON_PATTERN.test(value), {
      message: 'Use words, full stops and commas only.',
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter an email address we can send a code to.')
    .max(200),
  /** Present when the nomination arrived through a creator's own link. */
  referralSlug: z.string().trim().max(120).optional().or(z.literal('')),
  // Anti-automation fields. Never shown to a person.
  website: z.string().max(0).optional(),
  formRenderedAt: z.coerce.number().int().nonnegative().optional(),
});

export const verifyCodeSchema = z.object({
  nominationId: z.string().trim().min(1),
  // One definition of what a code looks like, in the domain, used by the
  // minting, the normalising and the checking alike.
  code: z
    .string()
    .trim()
    .transform(normaliseCode)
    .pipe(z.string().regex(CODE_PATTERN, 'Enter the code from your email, like PM5617.')),
});

export const submitNominationSchema = z.object({
  nominationId: z.string().trim().min(1),
});

export type NominationDraftInput = z.infer<typeof nominationDraftSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
