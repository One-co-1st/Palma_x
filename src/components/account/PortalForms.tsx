'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { COUNTRIES } from '@/lib/countries';
import {
  startVerification,
  updateCreatorLinks,
  updateCreatorProfile,
  updateNotificationPreferences,
  type CreatorState,
} from '@/server/actions/creator';

const initial: CreatorState = { status: 'idle' };

function Feedback({ state }: { state: CreatorState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>;
}

export function ProfileForm({
  defaults,
}: {
  defaults: {
    displayName: string;
    pronouns: string;
    countryCode: string;
    city: string;
    headline: string;
    biography: string;
    websiteUrl: string;
  };
}) {
  const [state, action, pending] = useActionState(updateCreatorProfile, initial);

  return (
    <form action={action} className="flex flex-col gap-6">
      <Feedback state={state} />

      <Field htmlFor="displayName" label="Display name" required>
        <Input id="displayName" name="displayName" defaultValue={defaults.displayName} required />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field htmlFor="pronouns" label="Pronouns">
          <Input id="pronouns" name="pronouns" defaultValue={defaults.pronouns} />
        </Field>
        <Field htmlFor="countryCode" label="Country" required>
          <Select id="countryCode" name="countryCode" defaultValue={defaults.countryCode || 'GB'}>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field htmlFor="city" label="City">
        <Input id="city" name="city" defaultValue={defaults.city} />
      </Field>

      <Field
        htmlFor="headline"
        label="Headline"
        hint="One line describing your work. Shown beneath your name in the record."
      >
        <Input id="headline" name="headline" defaultValue={defaults.headline} maxLength={160} />
      </Field>

      <Field htmlFor="biography" label="Biography" hint="Up to 2000 characters.">
        <Textarea
          id="biography"
          name="biography"
          defaultValue={defaults.biography}
          maxLength={2000}
        />
      </Field>

      <Field htmlFor="websiteUrl" label="Website">
        <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={defaults.websiteUrl} />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}

/**
 * Where the work lives.
 *
 * The whole set posts every time, so removing a row is deleting it — no
 * separate destructive action, and nothing to confirm twice.
 */
export function LinksForm({ defaults }: { defaults: { label: string; url: string }[] }) {
  const [state, action, pending] = useActionState(updateCreatorLinks, initial);
  const [rows, setRows] = React.useState(() =>
    (defaults.length > 0 ? defaults : [{ label: '', url: '' }]).map((row, index) => ({
      ...row,
      key: `${index}`,
    })),
  );
  const nextKey = React.useRef(rows.length);

  // Controlled, because removing a row from an uncontrolled list leaves the
  // browser's values behind and everything below shifts up by one.
  const set = (key: string, field: 'label' | 'url', value: string) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );

  return (
    <form action={action} className="flex flex-col gap-6">
      <Feedback state={state} />
      <input type="hidden" name="linkCount" value={rows.length} />

      {rows.map((row, index) => (
        <div key={row.key} className="border-stone-deep flex flex-col gap-4 border-b pb-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field htmlFor={`linkLabel${index}`} label="Platform" required>
              <Input
                id={`linkLabel${index}`}
                name={`linkLabel${index}`}
                value={row.label}
                onChange={(event) => set(row.key, 'label', event.target.value)}
                placeholder="YouTube"
                required
              />
            </Field>
            <Field htmlFor={`linkUrl${index}`} label="Link" required>
              <Input
                id={`linkUrl${index}`}
                name={`linkUrl${index}`}
                type="url"
                value={row.url}
                onChange={(event) => set(row.key, 'url', event.target.value)}
                placeholder="https://"
                required
              />
            </Field>
          </div>
          {rows.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="md" disabled={pending}>
          {pending ? 'Saving…' : 'Save links'}
        </Button>
        {rows.length < 6 ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              nextKey.current += 1;
              setRows((current) => [
                ...current,
                { label: '', url: '', key: `new-${nextKey.current}` },
              ]);
            }}
          >
            Add another
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function VerificationForm({ status }: { status: string }) {
  const [state, action, pending] = useActionState(startVerification, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Feedback state={state} />
      <p className="text-taupe-deep text-sm leading-relaxed">
        PALMA creators must be 18 or over. Age and identity assurance is carried out by a specialist
        third-party provider. PALMA never receives or stores your identity documents, only that the
        check succeeded, when, and the provider’s reference.
      </p>
      <Button
        type="submit"
        variant={status === 'verified' ? 'outline' : 'primary'}
        size="md"
        disabled={pending || status === 'verified'}
        className="self-start"
      >
        {status === 'verified'
          ? 'Verified'
          : pending
            ? 'Starting…'
            : status === 'pending'
              ? 'Resume verification'
              : 'Start verification'}
      </Button>
    </form>
  );
}

export function PreferencesForm({
  defaults,
}: {
  defaults: {
    seasonAnnouncements: boolean;
    nominationUpdates: boolean;
    honourAnnouncements: boolean;
    journalDigest: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateNotificationPreferences, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Feedback state={state} />

      <CheckboxField
        id="seasonAnnouncements"
        name="seasonAnnouncements"
        label="Season announcements"
        defaultChecked={defaults.seasonAnnouncements}
      />
      <CheckboxField
        id="nominationUpdates"
        name="nominationUpdates"
        label="Movement on a candidacy of mine"
        defaultChecked={defaults.nominationUpdates}
      />
      <CheckboxField
        id="honourAnnouncements"
        name="honourAnnouncements"
        label="Honours conferred on my record"
        defaultChecked={defaults.honourAnnouncements}
      />
      <CheckboxField
        id="journalDigest"
        name="journalDigest"
        label="The PALMA Journal digest"
        defaultChecked={defaults.journalDigest}
      />

      <Button type="submit" variant="outline" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : 'Save preferences'}
      </Button>
    </form>
  );
}
