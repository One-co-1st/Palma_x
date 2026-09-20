'use client';

import { useActionState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { clearSuppressedAddress, type SettingsState } from '@/server/actions/settings';

const initial: SettingsState = { status: 'idle' };

const REASON: Record<string, string> = {
  hard_bounce: 'No such mailbox',
  soft_bounce: 'Kept failing',
  complaint: 'Reported as spam',
};

export function SuppressionList({
  rows,
}: {
  rows: { id: string; email: string; reason: string; detail: string | null; createdAt: string }[];
}) {
  const [state, action] = useActionState(clearSuppressedAddress, initial);

  if (rows.length === 0) {
    return (
      <p className="text-taupe-deep text-sm leading-relaxed">
        No addresses are suppressed. PALMA is writing to everybody it has reason to write to.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {state.status !== 'idle' && state.message ? (
        <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>
      ) : null}

      <ul className="border-stone-deep flex flex-col border-t">
        {rows.map((row) => (
          <li
            key={row.id}
            className="border-stone-deep/60 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b py-4"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-mono text-sm break-all">{row.email}</span>
              {row.detail ? (
                <span className="text-taupe text-xs leading-relaxed">{row.detail}</span>
              ) : null}
            </span>
            <span className="flex flex-wrap items-center gap-3">
              <Badge variant={row.reason === 'complaint' ? 'champagne' : 'muted'}>
                {REASON[row.reason] ?? row.reason}
              </Badge>
              <form action={action}>
                <input type="hidden" name="email" value={row.email} />
                <Button type="submit" variant="ghost" size="sm">
                  Write to them again
                </Button>
              </form>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-taupe text-xs leading-relaxed">
        Suppression governs one thing: whether an envelope is worth posting. It blocks no account,
        refuses no claim and touches no record. An address clears itself the moment its holder
        proves it works, by spending a reset link, confirming a subscription, or confirming a change
        of address.
      </p>
    </div>
  );
}
