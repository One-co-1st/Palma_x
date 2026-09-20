'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { withdrawPortrait, type PortraitState } from '@/server/actions/portrait';

const initial: PortraitState = { status: 'idle' };

/**
 * Taking a portrait down.
 *
 * Deliberately two clicks with a sentence in between. Portraits publish on
 * upload now, so this is not one half of a decision the desk was going to make
 * anyway — it is an intervention in something already public, and the reason
 * goes to the creator. A single red button here would be too easy.
 */
export function PortraitWithdrawForm({ portraitId, name }: { portraitId: string; name: string }) {
  const [state, action, pending] = useActionState(withdrawPortrait, initial);
  const [confirming, setConfirming] = React.useState(false);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Taken down">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="border-stone-deep flex flex-col gap-4 border-t pt-5">
      <input type="hidden" name="portraitId" value={portraitId} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error">{state.message}</Notice>
      ) : null}

      {confirming ? (
        <>
          <Input
            name="reason"
            placeholder="Why it cannot stay up. The creator is told this."
            maxLength={300}
            minLength={10}
            required
            autoFocus
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? 'Taking it down…' : 'Take down and delete'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Leave it up
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
          Take {name}’s portrait down
        </Button>
      )}
    </form>
  );
}
