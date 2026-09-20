'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { saveSponsor, type CommercialState } from '@/server/actions/commercial';

const initial: CommercialState = { status: 'idle' };

/**
 * A sponsor record.
 *
 * Almost everything here is internal. A sponsor becomes publicly visible only
 * when the relationship is active *and* the agreement is signed — a
 * conversation with a brand is not a partnership, and a logo on the site
 * before a signature is a claim PALMA cannot support.
 */
export function SponsorForm({ sponsors }: { sponsors: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveSponsor, initial);
  const [editing, setEditing] = React.useState('');

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>
      ) : null}

      <Field htmlFor="sponsorId" label="Which sponsor">
        <Select
          id="sponsorId"
          name="sponsorId"
          value={editing}
          onChange={(event) => setEditing(event.target.value)}
        >
          <option value="">New sponsor</option>
          {sponsors.map((sponsor) => (
            <option key={sponsor.id} value={sponsor.id}>
              {sponsor.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="name" label="Name shown publicly" required>
          <Input id="name" name="name" required maxLength={120} />
        </Field>
        <Field htmlFor="legalName" label="Legal name" hint="Internal.">
          <Input id="legalName" name="legalName" maxLength={160} />
        </Field>
      </div>

      <Field htmlFor="websiteUrl" label="Website">
        <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://" />
      </Field>

      <Field
        htmlFor="summary"
        label="Public description"
        hint="One or two sentences, if they appear on the site."
      >
        <Textarea id="summary" name="summary" className="min-h-20" maxLength={600} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="status"
          label="Relationship"
          required
          hint="Only “active” with a signed agreement appears publicly."
        >
          <Select id="status" name="status" defaultValue="prospect">
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
          </Select>
        </Field>
        <Field htmlFor="agreementStatus" label="Agreement" required>
          <Select id="agreementStatus" name="agreementStatus" defaultValue="none">
            <option value="none">None</option>
            <option value="drafted">Drafted</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="expired">Expired</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="contactName" label="Contact" hint="Internal.">
          <Input id="contactName" name="contactName" maxLength={120} />
        </Field>
        <Field htmlFor="contactEmail" label="Contact email" hint="Internal.">
          <Input id="contactEmail" name="contactEmail" type="email" maxLength={200} />
        </Field>
      </div>

      <Field
        htmlFor="internalNotes"
        label="Internal notes"
        hint="Never public, never shown to the sponsor. The commercial equivalent of an editorial note."
      >
        <Textarea id="internalNotes" name="internalNotes" className="min-h-24" maxLength={4000} />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : editing ? 'Update sponsor' : 'Create sponsor'}
      </Button>
    </form>
  );
}
