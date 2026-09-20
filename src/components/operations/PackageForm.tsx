'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Textarea } from '@/components/ui/form';
import { Select } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { savePackage, type CommercialState } from '@/server/actions/commercial';

const initial: CommercialState = { status: 'idle' };

/**
 * What PALMA offers, and what it costs.
 *
 * Prices live here rather than in code, because a commercial decision should
 * not need a deployment. Benefits are checked on the way in: anything
 * describing judging, scores, or the selection of a finalist or winner is
 * refused outright, because the moment such a line exists in a package it will
 * eventually be read aloud in a sales meeting.
 */
export function PackageForm({ packages }: { packages: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(savePackage, initial);
  const [editing, setEditing] = React.useState('');

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>
      ) : null}

      <Field htmlFor="packageId" label="Which package">
        <Select
          id="packageId"
          name="packageId"
          value={editing}
          onChange={(event) => setEditing(event.target.value)}
        >
          <option value="">New package</option>
          {packages.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field htmlFor="name" label="Name" required>
        <Input id="name" name="name" required maxLength={120} placeholder="Category Partner" />
      </Field>

      <Field htmlFor="description" label="Description">
        <Textarea id="description" name="description" className="min-h-20" maxLength={1000} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field htmlFor="price" label="Price" required hint="In pounds.">
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            step={100}
            defaultValue={0}
            required
          />
        </Field>
        <Field htmlFor="currency" label="Currency">
          <Input id="currency" name="currency" maxLength={3} defaultValue="GBP" />
        </Field>
        <Field htmlFor="duration" label="Duration">
          <Input id="duration" name="duration" maxLength={80} placeholder="One season" />
        </Field>
      </div>

      <Field
        htmlFor="benefits"
        label="Benefits"
        hint="One per line. Visibility, association, hospitality, editorial presence, never any part of a decision."
      >
        <Textarea
          id="benefits"
          name="benefits"
          className="min-h-32"
          maxLength={2000}
          placeholder={
            'Category association on the season page\nAward-night visibility\nWinner announcement association\nApproved digital assets'
          }
        />
      </Field>

      <Field htmlFor="maxQuantity" label="How many available" hint="Blank for unlimited.">
        <Input id="maxQuantity" name="maxQuantity" type="number" min={0} max={1000} />
      </Field>

      <CheckboxField
        id="isAvailable"
        name="isAvailable"
        label="Available to sell"
        description="Appears in the inventory. Nothing is offered publicly until the matching feature is also switched on."
      />

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : editing ? 'Update package' : 'Create package'}
      </Button>
    </form>
  );
}
