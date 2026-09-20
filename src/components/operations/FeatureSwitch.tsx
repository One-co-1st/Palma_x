'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { setFeature, type CommercialState } from '@/server/actions/commercial';

const initial: CommercialState = { status: 'idle' };

/**
 * One switch.
 *
 * Turning something on asks for a reason, because the audit entry is the point:
 * an institution should be able to say when it started selling a thing and who
 * decided. Turning something off does not — stopping is always allowed and
 * never needs justifying.
 */
export function FeatureSwitch({
  featureKey,
  name,
  seasonAware,
  seasons,
  state,
  overrides,
}: {
  featureKey: string;
  name: string;
  seasonAware: boolean;
  seasons: { id: string; year: number; title: string }[];
  state: { enabled: boolean; launchAt: string | null; endAt: string | null };
  overrides: { awardYearId: string; title: string; enabled: boolean }[];
}) {
  const [result, action, pending] = useActionState(setFeature, initial);
  const [scope, setScope] = React.useState('');
  const [turningOn, setTurningOn] = React.useState(false);

  const scoped = overrides.find((row) => row.awardYearId === scope);
  const current = scope ? (scoped?.enabled ?? false) : state.enabled;

  return (
    <div className="flex flex-col gap-5">
      {result.status !== 'idle' && result.message ? (
        <Notice tone={result.status === 'error' ? 'error' : 'ceremonial'}>{result.message}</Notice>
      ) : null}

      {overrides.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="palma-label text-taupe-deep">Season overrides:</span>
          {overrides.map((row) => (
            <Badge key={row.awardYearId} variant={row.enabled ? 'olive' : 'muted'}>
              {row.title} {row.enabled ? 'on' : 'off'}
            </Badge>
          ))}
        </div>
      ) : null}

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="key" value={featureKey} />
        <input type="hidden" name="enabled" value={String(!current)} />

        {seasonAware ? (
          <Field
            htmlFor={`scope-${featureKey}`}
            label="Applies to"
            hint="A season setting beats the global one, including when it switches something off that is globally on. Historical seasons must be able to say “not here”."
          >
            <Select
              id={`scope-${featureKey}`}
              name="awardYearId"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="">Every season (global default)</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="awardYearId" value="" />
        )}

        {turningOn && !current ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                htmlFor={`launch-${featureKey}`}
                label="Not before"
                hint="Optional. Leave blank to start now."
              >
                <Input id={`launch-${featureKey}`} name="launchAt" type="date" />
              </Field>
              <Field
                htmlFor={`end-${featureKey}`}
                label="Ends"
                hint="Optional. After this it reads as off however the switch is set."
              >
                <Input id={`end-${featureKey}`} name="endAt" type="date" />
              </Field>
            </div>

            <Field
              htmlFor={`reason-${featureKey}`}
              label="Why now"
              required
              hint="Recorded in the audit log with your name, against the moment PALMA started selling this. One line."
            >
              <Input
                id={`reason-${featureKey}`}
                name="reason"
                maxLength={400}
                minLength={10}
                required
              />
            </Field>
          </>
        ) : (
          <>
            <input type="hidden" name="launchAt" value={state.launchAt?.slice(0, 10) ?? ''} />
            <input type="hidden" name="endAt" value={state.endAt?.slice(0, 10) ?? ''} />
            <input type="hidden" name="reason" value="" />
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {current ? (
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              {pending ? 'Saving…' : `Turn ${name} off${scope ? ' for this season' : ''}`}
            </Button>
          ) : turningOn ? (
            <>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? 'Saving…' : `Turn ${name} on`}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTurningOn(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={() => setTurningOn(true)}>
              Turn {name} on
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
