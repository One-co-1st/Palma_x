/**
 * How long a password-setting link lives.
 *
 * These are plain numbers, and they live here rather than beside the actions
 * that use them because `src/server/actions/password.ts` carries a
 * `'use server'` directive. Every export of such a file becomes a callable
 * server action, and Next refuses at build time to turn a number into one —
 * so a constant exported from there does not merely sit unused, it breaks
 * every server action on any page that pulls that module into its bundle.
 * The upload form two routes away stops working because of a number.
 */

/** One hour. Long enough to find the email, short enough to matter. */
export const RESET_TTL_MS = 60 * 60 * 1000;

/** Seven days. Nobody invited to the desk sees the email in the same hour. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
