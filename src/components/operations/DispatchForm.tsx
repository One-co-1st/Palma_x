'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { sendDispatch, type DispatchState } from '@/server/actions/dispatches';
import { EMAIL_LIST_VALUES } from '@/domain/email-lists';

const initial: DispatchState = { status: 'idle' };

/**
 * Writing to a list.
 *
 * Plain prose rather than a rich editor: the letterhead does the design, and a
 * composer that lets an operator paste arbitrary markup into mail sent to the
 * whole list is one that will eventually send broken HTML to the whole list.
 *
 * The audience is a list, chosen explicitly, with its subscriber count beside
 * it. There is no segment builder on purpose — the moment an interface can
 * assemble an audience out of anything but consent, it will eventually
 * assemble one that includes somebody who opted out.
 */
export function DispatchForm({
  lists,
  sponsors,
}: {
  lists: { key: string; confirmed: number; available: boolean }[];
  sponsors: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(sendDispatch, initial);
  const [type, setType] = React.useState('awards');

  const chosen = lists.find((list) => list.key === type);
  const meta = EMAIL_LIST_VALUES.find((list) => list.key === type);
  const isPartner = type === 'partner_offers';

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice
          tone={state.status === 'error' ? 'error' : 'ceremonial'}
          title={state.status === 'error' ? 'Not sent' : 'Sent'}
        >
          {state.message}
        </Notice>
      ) : null}

      <Field
        htmlFor="type"
        label="Which list"
        required
        hint="Targeting is by list, always. Nobody who has not subscribed to this one receives it."
      >
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {EMAIL_LIST_VALUES.map((list) => {
            const row = lists.find((entry) => entry.key === list.key);
            return (
              <option key={list.key} value={list.key} disabled={!row?.available}>
                {list.name}, {row?.confirmed ?? 0} subscriber{row?.confirmed === 1 ? '' : 's'}
                {row?.available ? '' : ' (switched off)'}
              </option>
            );
          })}
        </Select>
      </Field>

      {meta ? <p className="text-taupe -mt-2 text-xs leading-relaxed">{meta.cadence}</p> : null}

      <Notice tone="warning" title="This cannot be recalled">
        Confirming sends to <strong>{chosen?.confirmed ?? 0}</strong> confirmed subscriber
        {chosen?.confirmed === 1 ? '' : 's'} immediately. There is no draft, no schedule and no
        undo. It is also published to the public archive for that list.
      </Notice>

      {isPartner ? (
        <Field
          htmlFor="sponsorId"
          label="On behalf of"
          hint="A partner message declares itself in the subject line and above the first paragraph. It can only ever go to this list."
        >
          <Select id="sponsorId" name="sponsorId" defaultValue="">
            <option value="">PALMA, not a partner</option>
            {sponsors.map((sponsor) => (
              <option key={sponsor.id} value={sponsor.id}>
                {sponsor.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="sponsorId" value="" />
      )}

      <Field htmlFor="subject" label="Subject" required>
        <Input id="subject" name="subject" required maxLength={160} />
      </Field>

      <Field
        htmlFor="standfirst"
        label="Standfirst"
        required
        hint="The line under the title, and the inbox preview. One sentence."
      >
        <Textarea id="standfirst" name="standfirst" className="min-h-20" maxLength={400} required />
      </Field>

      <Field
        htmlFor="body"
        label="The message"
        required
        hint="Plain prose. A blank line starts a new paragraph; everything else is escaped."
      >
        <Textarea id="body" name="body" className="min-h-64" maxLength={20000} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
        <Field htmlFor="linkLabel" label="Button label">
          <Input id="linkLabel" name="linkLabel" maxLength={60} placeholder="Read the Journal" />
        </Field>
        <Field htmlFor="linkUrl" label="Button link">
          <Input id="linkUrl" name="linkUrl" type="url" placeholder="https://" />
        </Field>
      </div>

      <Field htmlFor="confirm" label="Type SEND to confirm" required>
        <Input id="confirm" name="confirm" required autoComplete="off" placeholder="SEND" />
      </Field>

      <Button
        type="submit"
        size="md"
        disabled={pending || !chosen?.available || (chosen?.confirmed ?? 0) === 0}
        className="self-start"
      >
        {pending ? 'Sending…' : `Send to ${chosen?.confirmed ?? 0}`}
      </Button>
    </form>
  );
}
