'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { recordAudit } from '@/server/audit';
import { SETTINGS, getVerificationConfig, setSetting } from '@/server/settings';
import { runRetentionSweep } from '@/server/services/retention';
import { clearSuppression } from '@/server/email/suppression';

export type SettingsState = { status: 'idle' | 'error' | 'success'; message?: string };

/**
 * Switching who verifies.
 *
 * The panel offers `automatic` only when a provider is named and keyed, so
 * this refuses the combination rather than accepting it and quietly falling
 * back — an administrator who thinks automatic assurance is running when it is
 * not is worse off than one who was told no.
 */
export async function setVerificationMode(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_system');
  } catch {
    return { status: 'error', message: 'You are not authorised to change system settings.' };
  }

  const wanted = String(formData.get('mode') ?? '');
  if (wanted !== 'manual' && wanted !== 'automatic') {
    return { status: 'error', message: 'Choose manual or automatic.' };
  }

  const config = await getVerificationConfig();

  if (wanted === 'automatic' && !config.automaticAvailable) {
    return {
      status: 'error',
      message: config.hasApiKey
        ? 'No provider is named. Set AGE_VERIFICATION_PROVIDER to the provider’s key and restart.'
        : 'No provider key is configured. Set AGE_VERIFICATION_API_KEY and restart, then switch.',
    };
  }

  if (wanted === config.mode) {
    return { status: 'success', message: `Already set to ${wanted}.` };
  }

  await setSetting(SETTINGS.verificationMode, wanted, session.user.id);

  await recordAudit({
    action: 'settings.changed',
    entityType: 'SystemSetting',
    entityId: SETTINGS.verificationMode,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Age assurance switched to ${wanted}`,
    before: { mode: config.mode },
    after: { mode: wanted, provider: wanted === 'automatic' ? config.provider : 'palma_manual' },
  });

  revalidatePath('/admin/settings');
  revalidatePath('/admin/health');
  revalidatePath('/portal/verification');

  return {
    status: 'success',
    message:
      wanted === 'automatic'
        ? `Automatic assurance is live through ${config.provider}. Cases it cannot settle still come to the desk.`
        : 'Age assurance is back with the moderation desk. Existing verified records are unchanged.',
  };
}

/**
 * Running the sweep by hand.
 *
 * The scheduler is the normal route; this exists because the first question an
 * operator asks about a retention job is "what would it actually delete?", and
 * the honest way to answer is to let them run it and read the result.
 */
export async function runRetentionNow(
  _previous: SettingsState,
  _formData: FormData,
): Promise<SettingsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_system');
  } catch {
    return { status: 'error', message: 'You are not authorised to run the retention sweep.' };
  }

  const result = await runRetentionSweep({
    id: session.user.id,
    role: session.user.role,
    label: session.user.email,
  });

  revalidatePath('/admin/settings');
  revalidatePath('/admin/health');

  const detail = Object.entries(result.removed)
    .filter(([, count]) => count > 0)
    .map(([rule, count]) => `${rule.replace(/_/g, ' ')} ${count}`)
    .join(', ');

  return {
    status: 'success',
    message:
      result.total === 0
        ? 'Swept. Nothing was old enough to remove, which is the usual result of running it twice.'
        : `Swept ${result.total} row${result.total === 1 ? '' : 's'}: ${detail}.`,
  };
}

/**
 * Letting a suppressed address back in.
 *
 * Somebody whose mailbox was full, or who changed provider, should not be cut
 * off from their own account for ever because of one bounce in March.
 */
export async function clearSuppressedAddress(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:view_communications');
  } catch {
    return { status: 'error', message: 'You are not authorised to change the suppression list.' };
  }

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!email) return { status: 'error', message: 'No address given.' };

  await clearSuppression(email, session.user.id);

  await recordAudit({
    action: 'settings.changed',
    entityType: 'SuppressedAddress',
    entityId: email,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${email} taken off the suppression list`,
  });

  revalidatePath('/admin/communications');
  return { status: 'success', message: `PALMA will write to ${email} again.` };
}
