import { z } from 'zod';

const link = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().url('Enter a valid link.').max(400),
});

export const claimRequestSchema = z.object({
  creator: z.string().trim().min(1, 'Choose the profile to claim.'),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  claimedIdentity: z
    .string()
    .trim()
    .min(40, 'Tell PALMA who you are and why this record is yours, at least 40 characters.')
    .max(1500),
  supportingNote: z.string().trim().max(1500).optional().or(z.literal('')),
  /** Up to four links offered as evidence of control. Never published. */
  links: z.array(link).max(4).default([]),
  token: z.string().trim().max(200).optional().or(z.literal('')),
});

export const claimDecisionSchema = z.object({
  claimId: z.string().trim().min(1),
  decision: z.enum(['approve', 'request_information', 'reject', 'escalate']),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const creatorRecordSchema = z.object({
  creatorId: z.string().trim().optional().or(z.literal('')),
  displayName: z.string().trim().min(2, 'Enter a display name.').max(120),
  countryCode: z
    .string()
    .trim()
    .length(2, 'Select a country.')
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  headline: z.string().trim().max(160).optional().or(z.literal('')),
  biography: z.string().trim().max(2000).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('Enter a valid link.').max(400).optional().or(z.literal('')),
  isPublished: z.boolean().default(false),
});

export const internalNoteSchema = z.object({
  creatorId: z.string().trim().min(1),
  body: z.string().trim().min(3, 'Write the note.').max(2000),
});

export const verificationCaseSchema = z.object({
  creatorId: z.string().trim().min(1),
  reason: z.enum([
    'provider_unavailable',
    'provider_exception',
    'result_requires_review',
    'reverification_due',
  ]),
  mediaReceived: z.boolean().default(false),
});

export const verificationDecisionSchema = z.object({
  caseId: z.string().trim().min(1),
  outcome: z.enum(['verified', 'refused', 'abandoned', 'request_information']),
  providerReference: z.string().trim().max(200).optional().or(z.literal('')),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
  /** The operator confirms the workspace copy has been destroyed. */
  mediaDeleted: z.boolean().default(false),
});

/**
 * A creator PALMA has never written a record for.
 *
 * Two routes, and the difference is who writes the words: `create` means the
 * creator supplies them, `request` means they supply the links and PALMA's
 * editorial desk writes from those. Both produce the same thing — an
 * unpublished creator record held by that account — because two shapes of the
 * same object is how an archive starts disagreeing with itself.
 */
export const newRecordSchema = z.object({
  route: z.enum(['create', 'request']),
  displayName: z.string().trim().min(2, 'Enter the name you work under.').max(120),
  countryCode: z
    .string()
    .trim()
    .length(2, 'Select a country.')
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  pronouns: z.string().trim().max(40).optional().or(z.literal('')),
  headline: z.string().trim().max(160).optional().or(z.literal('')),
  biography: z.string().trim().max(2000).optional().or(z.literal('')),
  /** Where PALMA should look. Required on both routes: a record with no links
   *  behind it cannot be checked, and an unverifiable record is worse than
   *  none. */
  links: z.array(link).min(1, 'Give PALMA at least one link to the work.').max(6),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
});
