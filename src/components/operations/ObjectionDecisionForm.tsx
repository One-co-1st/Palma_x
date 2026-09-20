'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { decideObjection, type ObjectionState } from '@/server/actions/objection';

const initial: ObjectionState = { status: 'idle' };

export function ObjectionDecisionForm({
  objectionId,
  name,
  hasHonours,
}: {
  objectionId: string;
  name: string;
  hasHonours: boolean;
}) {
  const [state, action, pending] = useActionState(decideObjection, initial);
  const [decision, setDecision] = React.useState<'uphold' | 'refuse'>('uphold');

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Settled">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="objectionId" value={objectionId} />
      <input type="hidden" name="decision" value={decision} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Not settled">
          {state.message}
        </Notice>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="palma-label text-taupe-deep mb-2">The decision</legend>

        {(
          [
            {
              value: 'uphold' as const,
              label: hasHonours ? 'Reduce to the honour' : 'Remove the record',
              detail: hasHonours
                ? 'The conferred honour stays; every descriptive field and link is deleted. The record becomes a name, a category and a year.'
                : 'The record is deleted. Nothing was conferred, so PALMA has no institutional reason to hold it.',
            },
            {
              value: 'refuse' as const,
              label: 'Refuse',
              detail:
                'Only where PALMA has a reason that would survive being read back to them by a regulator. Requires a written explanation, which is sent to them.',
            },
          ] as const
        ).map((option) => (
          <label
            key={option.value}
            className={`border-stone-deep flex cursor-pointer gap-3 border p-4 transition-colors ${
              decision === option.value ? 'border-ink bg-stone/30' : 'hover:border-ink'
            }`}
          >
            <input
              type="radio"
              name="decision-choice"
              value={option.value}
              checked={decision === option.value}
              onChange={() => setDecision(option.value)}
              className="accent-olive mt-1"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-base">{option.label}</span>
              <span className="text-taupe-deep text-sm leading-relaxed">{option.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field
        htmlFor={`note-${objectionId}`}
        label={decision === 'refuse' ? 'Why PALMA is refusing' : 'Anything to record'}
        required={decision === 'refuse'}
        hint={
          decision === 'refuse'
            ? 'At least 30 characters. Write it as though they will read it, because they will.'
            : 'Optional. Kept with the decision.'
        }
      >
        <Textarea id={`note-${objectionId}`} name="note" className="min-h-24" maxLength={2000} />
      </Field>

      <Button
        type="submit"
        size="md"
        variant={decision === 'refuse' ? 'outline' : 'primary'}
        disabled={pending}
        className="self-start"
      >
        {pending
          ? 'Settling…'
          : decision === 'refuse'
            ? 'Refuse the objection'
            : hasHonours
              ? `Reduce ${name} to the honour`
              : `Remove ${name}`}
      </Button>
    </form>
  );
}
