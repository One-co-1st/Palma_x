'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { subscribeToList, type SubscriptionState } from '@/server/actions/subscriptions';
import type { EmailListKey } from '@/domain/email-lists';

const initial: SubscriptionState = { status: 'idle' };

/**
 * Joining one list.
 *
 * The answer is the same whether the address is new, pending or already
 * subscribed — a form that says "you are already on this list" is a form that
 * tells a stranger who reads PALMA.
 *
 * Never pre-ticked, never bundled: this is its own deliberate act.
 */
export function SubscribeForm({
  type,
  source = 'site',
  compact = false,
  label = 'Subscribe',
}: {
  type: EmailListKey;
  source?: string;
  compact?: boolean;
  label?: string;
}) {
  const [state, action, pending] = useActionState(subscribeToList, initial);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Check your inbox">
        {state.message}
      </Notice>
    );
  }

  const id = `subscribe-${type}-${source}`;

  return (
    <form action={action} className={compact ? 'flex flex-col gap-3' : 'flex flex-col gap-5'}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="source" value={source} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error">{state.message}</Notice>
      ) : null}

      <div className={compact ? 'flex flex-wrap items-end gap-3' : 'flex flex-col gap-5'}>
        <div className={compact ? 'min-w-50 flex-1' : ''}>
          <Field htmlFor={id} label="Email" required>
            <Input
              id={id}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
        </div>
        <Button type="submit" size={compact ? 'sm' : 'md'} disabled={pending}>
          {pending ? 'Sending…' : label}
        </Button>
      </div>

      <p className="text-taupe text-xs leading-relaxed">
        Double opt-in: nothing is sent until you open the confirmation. One click to leave, in every
        message, and leaving one list leaves only that one.
      </p>
    </form>
  );
}
