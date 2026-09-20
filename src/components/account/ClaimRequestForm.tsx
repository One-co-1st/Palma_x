'use client';

import * as React from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Field, Input, Label, Textarea } from '@/components/ui/form';
import { requestProfileClaim, type ClaimState } from '@/server/actions/claims';

const initial: ClaimState = { status: 'idle' };

/**
 * The claim request.
 *
 * Short, because a long form is a barrier to the person who genuinely owns the
 * identity and no barrier at all to someone impersonating them. What stops
 * impersonation is review, not form length.
 */
export function ClaimRequestForm({
  creatorSlug,
  creatorName,
  token,
}: {
  creatorSlug?: string;
  creatorName?: string;
  token?: string;
}) {
  const [state, action, pending] = useActionState(requestProfileClaim, initial);
  const [links, setLinks] = React.useState(1);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Claim submitted">
        {state.message}
        <span className="mt-3 block text-sm">
          You do not hold the profile yet. Nothing on the public record changes while PALMA reviews,
          and you will hear from us by email.
        </span>
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {token ? <input type="hidden" name="token" value={token} /> : null}
      <input type="hidden" name="linkCount" value={links} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Claim not submitted">
          {state.message}
        </Notice>
      ) : null}

      {creatorSlug && creatorName ? (
        <div className="border-stone-deep bg-stone/25 border p-5">
          <span className="palma-label text-taupe-deep">Claiming</span>
          <p className="font-display mt-1 text-2xl">{creatorName}</p>
          <p className="text-taupe mt-1 text-xs">/creators/{creatorSlug}</p>
          <input type="hidden" name="creator" value={creatorSlug} />
        </div>
      ) : (
        <Field
          htmlFor="creator"
          label="Profile address"
          required
          hint="The last part of the PALMA profile link, for example maya-rivers."
          error={state.errors?.creator}
        >
          <Input id="creator" name="creator" defaultValue={creatorSlug} required />
        </Field>
      )}

      <Field
        htmlFor="contactEmail"
        label="Contact email"
        hint="Where PALMA writes about this claim. Defaults to your account email."
        error={state.errors?.contactEmail}
      >
        <Input id="contactEmail" name="contactEmail" type="email" />
      </Field>

      <Field
        htmlFor="claimedIdentity"
        label="Who are you, and why is this record yours?"
        required
        hint="A few sentences. The name you work under, what you make, and where."
        error={state.errors?.claimedIdentity}
      >
        <Textarea id="claimedIdentity" name="claimedIdentity" className="min-h-36" required />
      </Field>

      <fieldset className="flex flex-col gap-4">
        <legend className="palma-label text-taupe-deep mb-1">Evidence of control</legend>
        <p className="text-taupe-deep -mt-2 text-sm leading-relaxed">
          Links to channels, sites or profiles you control under this identity. PALMA checks them;
          they are never published.
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

        {links < 4 ? (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="self-start"
            onClick={() => setLinks((current) => Math.min(4, current + 1))}
          >
            Add another link
          </Button>
        ) : null}
      </fieldset>

      <Field htmlFor="supportingNote" label="Anything else (optional)">
        <Textarea id="supportingNote" name="supportingNote" className="min-h-24" />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Submitting…' : 'Submit claim request'}
      </Button>

      <p className="text-taupe text-xs leading-relaxed">
        A claim is a request, not an entitlement. PALMA reviews every one by hand, and approval is
        what links your account to the record. Claiming a profile you do not hold is impersonation
        and ends eligibility. See the{' '}
        <Link href="/legal/terms" className="palma-link text-ink">
          terms
        </Link>
        .
      </p>
    </form>
  );
}
