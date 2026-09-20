import { z } from 'zod';

export const gazetteSubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  /** Where the subscription came from, for the operator's view of the list. */
  source: z.string().trim().max(40).default('site'),
});

/** Composing an issue. Sent to confirmed subscribers, and to nobody else. */
export const gazetteIssueSchema = z.object({
  subject: z.string().trim().min(8, 'Give the issue a subject of at least 8 characters.').max(160),
  standfirst: z
    .string()
    .trim()
    .min(20, 'The standfirst is what the reader sees first. Write at least 20 characters.')
    .max(400),
  body: z
    .string()
    .trim()
    .min(80, 'An issue with nothing in it is not an issue. Write at least 80 characters.')
    .max(20000),
  /** Optional single call to action. */
  linkLabel: z.string().trim().max(60).optional().or(z.literal('')),
  linkUrl: z.string().trim().url('Enter a valid link.').max(400).optional().or(z.literal('')),
  /** Typed confirmation — sending to a list cannot be undone. */
  confirm: z.literal('SEND', { message: 'Type SEND to confirm.' }),
});

export type GazetteIssueInput = z.infer<typeof gazetteIssueSchema>;
