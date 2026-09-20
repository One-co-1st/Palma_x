'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import {
  leaveEverything,
  saveEmailPreferences,
  type SubscriptionState,
} from '@/server/actions/subscriptions';

const initial: SubscriptionState = { status: 'idle' };

export type PreferenceList = {
  key: string;
  name: string;
  description: string;
  cadence: string;
  commercial: boolean;
  subscribed: boolean;
  available: boolean;
};

/**
 * Five checkboxes, never pre-ticked.
 *
 * `defaultChecked` reflects what the person actually chose before, which is
 * not the same thing as a default — a box that arrives ticked for somebody who
 * never ticked it is the dark pattern this whole page exists to avoid.
 */
export function EmailPreferencesForm({ lists }: { lists: PreferenceList[] }) {
  const [state, action, pending] = useActionState(saveEmailPreferences, initial);

  return (
    <div className="flex flex-col gap-8">
      {state.status !== 'idle' && state.message ? (
        <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>
      ) : null}

      <form action={action} className="flex flex-col gap-6">
        {lists.map((list) => (
          <div
            key={list.key}
            className={`border-stone-deep border p-5 ${list.available ? '' : 'opacity-60'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CheckboxField
                id={list.key}
                name={list.key}
                label={list.name}
                defaultChecked={list.subscribed}
                disabled={!list.available && !list.subscribed}
              />
              {list.commercial ? <Badge variant="muted">Commercial</Badge> : null}
            </div>

            <p className="text-taupe-deep mt-3 text-sm leading-relaxed">{list.description}</p>
            <p className="text-taupe mt-2 text-xs leading-relaxed">
              {list.available
                ? list.cadence
                : 'Not open yet. PALMA would rather run no list than a thin one.'}
            </p>
          </div>
        ))}

        <Button type="submit" size="md" disabled={pending} className="self-start">
          {pending ? 'Saving…' : 'Save preferences'}
        </Button>
      </form>

      <form action={leaveEverything} className="border-stone-deep border-t pt-6">
        <p className="text-taupe-deep mb-4 text-sm leading-relaxed">
          Want none of it? One click, no confirmation screen. Decisions about your own record still
          reach you. Those are not a subscription.
        </p>
        <Button type="submit" variant="ghost" size="sm">
          Leave every PALMA list
        </Button>
      </form>
    </div>
  );
}
