'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { objectToRecord, type ObjectionState } from '@/server/actions/objection';

const initial: ObjectionState = { status: 'idle' };

export function ObjectionForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState(objectToRecord, initial);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Received">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="creatorSlug" value={slug} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Not sent">
          {state.message}
        </Notice>
      ) : null}

      <Field
        htmlFor="contactEmail"
        label="Where PALMA should reply"
        required
        hint="The only thing this form collects. It is used to answer you and nothing else."
      >
        <Input id="contactEmail" name="contactEmail" type="email" required autoComplete="email" />
      </Field>

      <Field
        htmlFor="note"
        label="Anything you want to add"
        hint="Optional. You do not have to explain why you would rather not be listed."
      >
        <Textarea id="note" name="note" className="min-h-28" maxLength={2000} />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Sending…' : `Ask PALMA to remove ${name}`}
      </Button>
    </form>
  );
}
