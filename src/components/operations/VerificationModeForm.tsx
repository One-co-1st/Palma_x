'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { setVerificationMode, type SettingsState } from '@/server/actions/settings';
import { cn } from '@/lib/utils';

const initial: SettingsState = { status: 'idle' };

/**
 * Who performs age assurance.
 *
 * Two radios and a save, because that is genuinely the whole of it: the
 * provider and its key live in the environment, and this switch only decides
 * whether to use them. Plug in a key, restart, come back, switch.
 */
export function VerificationModeForm({
  mode,
  provider,
  automaticAvailable,
  hasApiKey,
}: {
  mode: 'manual' | 'automatic';
  provider: string;
  automaticAvailable: boolean;
  hasApiKey: boolean;
}) {
  const [state, action, pending] = useActionState(setVerificationMode, initial);

  const options = [
    {
      value: 'manual' as const,
      label: 'The moderation desk',
      detail:
        'A moderator settles every case by hand at /portal/verification. PALMA records that the check happened, never what was in it, and deletes any submitted media when the case closes.',
      available: true,
    },
    {
      value: 'automatic' as const,
      label: 'A third-party provider',
      detail: automaticAvailable
        ? `Creators are handed to ${provider}'s hosted flow. PALMA never receives a document. Cases the provider cannot settle are referred back to the desk.`
        : hasApiKey
          ? 'A key is configured but no provider is named. Set AGE_VERIFICATION_PROVIDER and restart.'
          : 'Not available yet: no provider key is configured. Set AGE_VERIFICATION_API_KEY in the environment, restart, and this becomes selectable. Nothing else changes.',
      available: automaticAvailable,
    },
  ];

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice
          tone={state.status === 'error' ? 'error' : 'ceremonial'}
          title={state.status === 'error' ? 'Not changed' : 'Saved'}
        >
          {state.message}
        </Notice>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Who performs age and identity assurance</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'border-stone-deep flex gap-3 border p-5 transition-colors',
              option.available ? 'hover:border-ink cursor-pointer' : 'opacity-60',
            )}
          >
            <input
              type="radio"
              name="mode"
              value={option.value}
              defaultChecked={mode === option.value}
              disabled={!option.available}
              className="accent-olive mt-1"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-lg">{option.label}</span>
              <span className="text-taupe-deep text-sm leading-relaxed">{option.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : 'Save the mode'}
      </Button>
    </form>
  );
}
