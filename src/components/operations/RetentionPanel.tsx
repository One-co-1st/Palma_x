'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { runRetentionNow, type SettingsState } from '@/server/actions/settings';

const initial: SettingsState = { status: 'idle' };

export function RetentionPanel({
  rules,
  lastRun,
}: {
  rules: { key: string; description: string; days: number }[];
  lastRun: { at: string; summary: string } | null;
}) {
  const [state, action, pending] = useActionState(runRetentionNow, initial);

  return (
    <div className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice
          tone={state.status === 'error' ? 'error' : 'ceremonial'}
          title={state.status === 'error' ? 'Not run' : 'Swept'}
        >
          {state.message}
        </Notice>
      ) : null}

      <dl className="flex flex-col">
        {rules.map((rule) => (
          <div
            key={rule.key}
            className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3"
          >
            <dt className="text-taupe-deep max-w-120 text-sm leading-relaxed">
              {rule.description}
            </dt>
            <dd className="palma-label text-ink whitespace-nowrap">{rule.days} days</dd>
          </div>
        ))}
      </dl>

      <form action={action}>
        <Button type="submit" variant="outline" size="md" disabled={pending}>
          {pending ? 'Sweeping…' : 'Run the sweep now'}
        </Button>
      </form>

      <p className="text-taupe text-xs leading-relaxed">
        {lastRun
          ? `Last run ${new Date(lastRun.at).toISOString().replace('T', ' ').slice(0, 16)} UTC, ${lastRun.summary}`
          : 'The sweep has never run in this deployment.'}
      </p>
    </div>
  );
}
