'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Checkbox, Field, Input, Label, Select, Textarea } from '@/components/ui/form';
import { COUNTRIES } from '@/lib/countries';
import { REASON_LABEL, VERIFICATION_CASE_REASONS } from '@/domain/verification-case';
import { decideClaim, issueClaimInvitation, type ClaimState } from '@/server/actions/claims';
import {
  addInternalNote,
  decideVerificationCase,
  openVerificationCase,
  saveCreatorRecord,
  type OperationsState,
} from '@/server/actions/operations';

const idle: ClaimState & OperationsState = { status: 'idle' };

function Feedback({ state }: { state: { status: string; message?: string } }) {
  if (state.status === 'idle' || !state.message) return null;
  return <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>;
}

/**
 * The claim decision.
 *
 * Four outcomes, and approval is separated from the rest by a confirmation
 * line, because it is the only one that hands a record to a person.
 */
export function ClaimDecisionForm({
  claimId,
  blocked,
  canDecide,
}: {
  claimId: string;
  blocked: string | null;
  canDecide: boolean;
}) {
  const [state, action, pending] = useActionState(decideClaim, idle);
  const [decision, setDecision] = React.useState('request_information');

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Decision recorded">
        {state.message}
      </Notice>
    );
  }

  const needsNote = decision === 'reject';

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="claimId" value={claimId} />
      <Feedback state={state} />

      {blocked ? (
        <Notice tone="warning" title="Approval is blocked">
          {blocked}
        </Notice>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="palma-label text-taupe-deep mb-2">Decision</legend>

        {[
          {
            value: 'approve',
            label: 'Approve claim',
            detail: 'Links this account to the record and unlocks the creator dashboard.',
            disabled: Boolean(blocked) || !canDecide,
          },
          {
            value: 'request_information',
            label: 'Request more information',
            detail: 'Keeps the claim open and tells the claimant what is missing.',
            disabled: false,
          },
          {
            value: 'reject',
            label: 'Reject claim',
            detail: 'Settles the claim. A reason is required and is recorded.',
            disabled: !canDecide,
          },
          {
            value: 'escalate',
            label: 'Escalate',
            detail: 'Hands the case to an administrator without deciding it.',
            disabled: false,
          },
        ].map((option) => (
          <label
            key={option.value}
            className={
              'border-stone-deep flex cursor-pointer gap-3 border p-4 transition-colors ' +
              (option.disabled
                ? 'cursor-not-allowed opacity-45'
                : decision === option.value
                  ? 'border-ink bg-stone/30'
                  : 'hover:border-ink')
            }
          >
            <input
              type="radio"
              name="decision"
              value={option.value}
              checked={decision === option.value}
              disabled={option.disabled}
              onChange={(event) => setDecision(event.target.value)}
              className="accent-olive mt-1"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-lg">{option.label}</span>
              <span className="text-taupe-deep text-sm leading-relaxed">{option.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">
          Note {needsNote ? <span className="text-champagne-deep">*</span> : '(optional)'}
        </Label>
        <Textarea
          id="note"
          name="note"
          className="min-h-28"
          maxLength={2000}
          required={needsNote}
        />
        <p className="text-taupe text-xs leading-relaxed">
          Recorded against the claim and written to the audit log with your name.
        </p>
      </div>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Recording…' : 'Record decision'}
      </Button>

      {!canDecide ? (
        <p className="text-taupe text-xs leading-relaxed">
          You may review and escalate. Approving or rejecting a claim is a moderator or
          administrator decision.
        </p>
      ) : null}
    </form>
  );
}

/** The verification case decision, with the media lifecycle made explicit. */
export function VerificationDecisionForm({
  caseId,
  mediaHeld,
}: {
  caseId: string;
  mediaHeld: boolean;
}) {
  const [state, action, pending] = useActionState(decideVerificationCase, idle);
  const [outcome, setOutcome] = React.useState('verified');
  const [deleted, setDeleted] = React.useState(false);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Case closed">
        {state.message}
      </Notice>
    );
  }

  const closing = outcome !== 'request_information';

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="caseId" value={caseId} />
      <Feedback state={state} />

      <Field htmlFor="outcome" label="Outcome" required>
        <Select
          id="outcome"
          name="outcome"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
        >
          <option value="verified">Verified, 18 or over, requirement met</option>
          <option value="refused">Refused, requirement not met</option>
          <option value="request_information">Request more information</option>
          <option value="abandoned">Abandoned, no response</option>
        </Select>
      </Field>

      <Field
        htmlFor="providerReference"
        label="Provider reference"
        hint="The provider’s opaque reference, if there is one. Never a document number."
      >
        <Input id="providerReference" name="providerReference" maxLength={200} />
      </Field>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" className="min-h-24" maxLength={2000} />
      </div>

      {mediaHeld && closing ? (
        <div className="border-olive/50 bg-olive/5 flex flex-col gap-3 border p-5">
          <span className="palma-label text-olive">Privacy lifecycle</span>
          <p className="text-taupe-deep text-sm leading-relaxed">
            Media was received for this case. It must be destroyed in the restricted workspace as
            part of closing, PALMA does not keep documents, and a closed case with media still held
            has nothing left to prompt anyone to remove it.
          </p>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox
              name="mediaDeleted"
              checked={deleted}
              onChange={(event) => setDeleted(event.target.checked)}
            />
            <span>I have deleted the submitted media from the verification workspace.</span>
          </label>
        </div>
      ) : null}

      <Button
        type="submit"
        size="md"
        disabled={pending || (mediaHeld && closing && !deleted)}
        className="self-start"
      >
        {pending ? 'Recording…' : closing ? 'Close case' : 'Request information'}
      </Button>

      <p className="text-taupe text-xs leading-relaxed">
        PALMA keeps a status, a provider reference and a result hash. Not a document, not a date of
        birth, not an address.
      </p>
    </form>
  );
}

export function OpenVerificationCaseForm({ creatorId }: { creatorId: string }) {
  const [state, action, pending] = useActionState(openVerificationCase, idle);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="creatorId" value={creatorId} />
      <Feedback state={state} />

      <Field htmlFor="reason" label="Why this needs a person" required>
        <Select id="reason" name="reason" defaultValue="result_requires_review">
          {VERIFICATION_CASE_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REASON_LABEL[reason]}
            </option>
          ))}
        </Select>
      </Field>

      <label className="text-taupe-deep flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox name="mediaReceived" />
        <span>Media has been received into the restricted workspace for this case.</span>
      </label>

      <Button type="submit" variant="outline" size="md" disabled={pending} className="self-start">
        {pending ? 'Opening…' : 'Open verification case'}
      </Button>
    </form>
  );
}

/**
 * The creator record.
 *
 * Everything on this form is public. Internal observations go in a note, which
 * is a separate form, a separate table and a separate audience — the two are
 * never mixed on one screen by accident.
 */
export function CreatorRecordForm({
  creator,
}: {
  creator?: {
    id: string;
    displayName: string;
    countryCode: string;
    city: string | null;
    headline: string | null;
    biography: string | null;
    websiteUrl: string | null;
    isPublished: boolean;
  };
}) {
  const [state, action, pending] = useActionState(saveCreatorRecord, idle);

  return (
    <form action={action} className="flex flex-col gap-5">
      {creator ? <input type="hidden" name="creatorId" value={creator.id} /> : null}
      <Feedback state={state} />

      <div className="border-champagne-deep/50 bg-champagne/10 border px-4 py-3">
        <span className="palma-label text-champagne-deep">Public information</span>
        <p className="text-taupe-deep mt-1 text-xs leading-relaxed">
          Everything below appears on the public record.
        </p>
      </div>

      <Field htmlFor="displayName" label="Display name" required error={state.errors?.displayName}>
        <Input id="displayName" name="displayName" defaultValue={creator?.displayName} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="countryCode" label="Country" required error={state.errors?.countryCode}>
          <Select id="countryCode" name="countryCode" defaultValue={creator?.countryCode ?? 'GB'}>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="city" label="City">
          <Input id="city" name="city" defaultValue={creator?.city ?? ''} maxLength={80} />
        </Field>
      </div>

      <Field htmlFor="headline" label="Headline" hint="One line. What this creator is known for.">
        <Input
          id="headline"
          name="headline"
          defaultValue={creator?.headline ?? ''}
          maxLength={160}
        />
      </Field>

      <Field htmlFor="biography" label="Biography">
        <Textarea
          id="biography"
          name="biography"
          className="min-h-40"
          defaultValue={creator?.biography ?? ''}
          maxLength={2000}
        />
      </Field>

      <Field htmlFor="websiteUrl" label="Website" error={state.errors?.websiteUrl}>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          defaultValue={creator?.websiteUrl ?? ''}
        />
      </Field>

      <label className="text-taupe-deep flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox name="isPublished" defaultChecked={creator?.isPublished ?? false} />
        <span>Published. Visible on the public site and in the archive.</span>
      </label>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : creator ? 'Save record' : 'Create record'}
      </Button>
    </form>
  );
}

export function InternalNoteForm({ creatorId }: { creatorId: string }) {
  const [state, action, pending] = useActionState(addInternalNote, idle);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="creatorId" value={creatorId} />
      <Feedback state={state} />

      <Textarea
        name="body"
        className="min-h-28"
        maxLength={2000}
        placeholder="Staff only. Never published, never shown to the creator."
        aria-label="Internal note"
      />

      <Button type="submit" variant="outline" size="md" disabled={pending} className="self-start">
        {pending ? 'Adding…' : 'Add internal note'}
      </Button>
    </form>
  );
}

/** The invitation. The token is shown once, here, and never stored in the clear. */
export function InvitationForm({ creatorId }: { creatorId: string }) {
  const [state, action, pending] = useActionState(issueClaimInvitation, idle);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="creatorId" value={creatorId} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error">{state.message}</Notice>
      ) : null}

      {state.status === 'success' && state.message ? (
        <Notice tone="ceremonial" title="Invitation issued. Copy it now">
          <code className="mt-2 block text-sm break-all">palmaawards.com{state.message}</code>
          <span className="mt-2 block text-xs">
            Shown once. PALMA stores only a hash of this link, so it cannot be read back out of the
            database. It expires in 30 days and can be used once.
          </span>
        </Notice>
      ) : (
        <Button type="submit" variant="outline" size="md" disabled={pending} className="self-start">
          {pending ? 'Issuing…' : 'Issue claim invitation'}
        </Button>
      )}
    </form>
  );
}
