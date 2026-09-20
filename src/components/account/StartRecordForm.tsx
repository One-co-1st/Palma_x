'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Field, Input, Label, Select, Textarea } from '@/components/ui/form';
import { COUNTRIES } from '@/lib/countries';
import { startCreatorRecord, type ClaimState } from '@/server/actions/claims';
import { cn } from '@/lib/utils';

const initial: ClaimState = { status: 'idle' };

/**
 * No record yet.
 *
 * Two routes, and the honest difference between them is who writes the words.
 * Neither publishes anything: both produce a record held by this account and
 * waiting on a moderator, because a profile anyone can publish about
 * themselves is a directory, not an archive.
 */
export function StartRecordForm() {
  const [state, action, pending] = useActionState(startCreatorRecord, initial);
  const [route, setRoute] = React.useState<'create' | 'request'>('create');
  const [links, setLinks] = React.useState(1);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Record started">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="linkCount" value={links} />
      <input type="hidden" name="route" value={route} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Not started">
          {state.message}
        </Notice>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="palma-label text-taupe-deep mb-2">How should PALMA do this?</legend>

        {(
          [
            {
              value: 'create',
              label: 'I will write it',
              detail:
                'You supply the headline and biography. PALMA reviews the copy, checks the links, and publishes it.',
            },
            {
              value: 'request',
              label: 'PALMA writes it',
              detail:
                'You give us the links. Our editorial desk writes the record from the work itself, the way it does for creators who have never heard of us.',
            },
          ] as const
        ).map((option) => (
          <label
            key={option.value}
            className={cn(
              'border-stone-deep flex cursor-pointer gap-3 border p-4 transition-colors',
              route === option.value ? 'border-ink bg-stone/30' : 'hover:border-ink',
            )}
          >
            <input
              type="radio"
              name="route-choice"
              value={option.value}
              checked={route === option.value}
              onChange={() => setRoute(option.value)}
              className="accent-olive mt-1"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-lg">{option.label}</span>
              <span className="text-taupe-deep text-sm leading-relaxed">{option.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field
        htmlFor="displayName"
        label="The name you work under"
        required
        error={state.errors?.displayName}
      >
        <Input id="displayName" name="displayName" required maxLength={120} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field htmlFor="countryCode" label="Country" required error={state.errors?.countryCode}>
          <Select id="countryCode" name="countryCode" defaultValue="GB">
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="city" label="City">
          <Input id="city" name="city" maxLength={80} />
        </Field>
        <Field htmlFor="pronouns" label="Pronouns">
          <Input id="pronouns" name="pronouns" maxLength={40} placeholder="she/her" />
        </Field>
      </div>

      {route === 'create' ? (
        <>
          <Field
            htmlFor="headline"
            label="Headline"
            hint="One line. What you are known for, not a job title."
          >
            <Input id="headline" name="headline" maxLength={160} />
          </Field>

          <Field htmlFor="biography" label="Biography">
            <Textarea id="biography" name="biography" className="min-h-36" maxLength={2000} />
          </Field>
        </>
      ) : (
        <Notice title="PALMA will write the copy">
          Leave the words to us. Give the links below and our desk writes the record from the work,
          which is how every other record in the archive was made.
        </Notice>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="palma-label text-taupe-deep mb-1">
          Where is the work? <span className="text-champagne-deep">*</span>
        </legend>
        <p className="text-taupe-deep -mt-2 text-sm leading-relaxed">
          Channels, sites, profiles, press. This is where PALMA looks, a record with nothing behind
          it cannot be checked, and an unverifiable record is worse than none.
        </p>

        {Array.from({ length: links }, (_, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`linkLabel${index}`}>Label</Label>
              <Input id={`linkLabel${index}`} name={`linkLabel${index}`} maxLength={80} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor={`linkUrl${index}`}>Link</Label>
              <Input id={`linkUrl${index}`} name={`linkUrl${index}`} type="url" />
            </div>
          </div>
        ))}

        {links < 6 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setLinks((current) => Math.min(6, current + 1))}
          >
            Add another link
          </Button>
        ) : null}
      </fieldset>

      <Field htmlFor="note" label="Anything PALMA should know (optional)">
        <Textarea id="note" name="note" className="min-h-24" maxLength={1000} />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? 'Sending…' : route === 'create' ? 'Start my record' : 'Request a record'}
      </Button>

      <p className="text-taupe text-xs leading-relaxed">
        Nothing is published until a moderator has checked it. Age and identity assurance is a
        separate step, and it happens once the record exists, no honour is conferred without it.
      </p>
    </form>
  );
}
