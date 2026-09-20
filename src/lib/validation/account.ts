import { z } from 'zod';
import { passwordSchema } from '@/lib/auth/password-policy';
import { INVITABLE_ROLES } from '@/lib/auth/rbac';

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  next: z.string().trim().max(500).optional(),
  /** Which door this attempt came through. Unknown values fall back to the creator door. */
  entrance: z.enum(['creator', 'judge', 'moderator', 'admin']).default('creator'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: passwordSchema,
  acceptTerms: z.literal(true, { message: 'Accept the PALMA terms to continue.' }),
});

export const creatorProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter a display name.').max(120),
  pronouns: z.string().trim().max(40).optional().or(z.literal('')),
  countryCode: z
    .string()
    .trim()
    .length(2, 'Select a country.')
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  headline: z.string().trim().max(160).optional().or(z.literal('')),
  biography: z.string().trim().max(2000).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('Enter a valid link.').max(400).optional().or(z.literal('')),
});

/**
 * Where the work lives.
 *
 * A creator gives these when they start a record and keeps them current
 * afterwards: they are what the editorial desk reads the record from, and a
 * dead link is worse than no link. Between one and six, same as the start
 * form — a record with none tells PALMA nothing.
 */
export const creatorLinksSchema = z.object({
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Name each link.').max(80),
        url: z.string().trim().url('Enter a valid link.').max(400),
      }),
    )
    .min(1, 'Keep at least one link to your work.')
    .max(6, 'Six links is the limit.'),
});

/**
 * Asking for a reset.
 *
 * The address is the whole form. Nothing here may reveal whether it has an
 * account — the response is identical either way, so this schema exists to
 * validate shape rather than to gate anything.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

/** Setting a new one. The token arrives from the path, not the form. */
export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20, 'That reset link is not valid.').max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Both passwords must match.',
  });

/**
 * Bringing a colleague onto the desk.
 *
 * No password field. Nothing here is ever entered by the person doing the
 * inviting — the invited person sets it themselves, from a link, which is the
 * whole point of the flow.
 */
export const inviteOperatorSchema = z.object({
  name: z.string().trim().min(2, 'Enter their name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  role: z.enum(INVITABLE_ROLES, { message: 'Choose what they will do at PALMA.' }),
  /** Only meaningful, and only required, when role is judge. */
  judgeDisplayName: z.string().trim().max(120).optional().or(z.literal('')),
  judgeTitle: z.string().trim().max(120).optional().or(z.literal('')),
  judgeOrganisation: z.string().trim().max(120).optional().or(z.literal('')),
});

/** Moving an account to a different address. The current password is required. */
export const changeEmailSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your current password.'),
});

/** Changing a password while signed in. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Both passwords must match.',
  });

/**
 * Closing an account.
 *
 * Typed confirmation rather than a checkbox: closing signs you out everywhere
 * and cannot be undone, and a box you tick by reflex is not a decision.
 */
export const closeAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password.'),
  confirm: z.literal('CLOSE', {
    message: 'Type CLOSE to confirm.',
  }),
});

export const notificationPreferenceSchema = z.object({
  seasonAnnouncements: z.boolean(),
  nominationUpdates: z.boolean(),
  honourAnnouncements: z.boolean(),
  journalDigest: z.boolean(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;
export type CreatorLinksInput = z.infer<typeof creatorLinksSchema>;
