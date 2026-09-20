'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { REPORT_REASONS } from '@/lib/validation/integrity';
import { fileReport, type ReportState } from '@/server/actions/report';

const initial: ReportState = { status: 'idle' };

export function ReportForm({ creatorSlug }: { creatorSlug?: string }) {
  const [state, action, pending] = useActionState(fileReport, initial);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Report received">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Report not sent">
          {state.message}
        </Notice>
      ) : null}

      <div aria-hidden="true" className="sr-only">
        <label htmlFor="report-website">Leave this field empty</label>
        <input id="report-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Field htmlFor="reason" label="What are you reporting?" required>
        <Select id="reason" name="reason" defaultValue="impersonation">
          {REPORT_REASONS.map((reason) => (
            <option key={reason.key} value={reason.key}>
              {reason.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        htmlFor="detail"
        label="What have you seen?"
        required
        hint="Be specific. Where you saw it, when, and what is wrong."
      >
        <Textarea id="detail" name="detail" required minLength={30} maxLength={2000} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          htmlFor="creatorSlug"
          label="Creator profile"
          hint="The last part of their PALMA link, if you have it."
        >
          <Input id="creatorSlug" name="creatorSlug" defaultValue={creatorSlug} />
        </Field>
        <Field htmlFor="candidacyReference" label="Candidacy reference">
          <Input id="candidacyReference" name="candidacyReference" placeholder="PC-2027-0042" />
        </Field>
      </div>

      <Field
        htmlFor="contactEmail"
        label="Your email"
        hint="Optional. Only used to tell you the outcome."
      >
        <Input id="contactEmail" name="contactEmail" type="email" />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Sending…' : 'Send report'}
      </Button>
    </form>
  );
}
