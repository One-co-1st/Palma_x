'use client';

import * as React from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { CreatorSearch, type CreatorOption } from './CreatorSearch';
import {
  requestNominationCode,
  submitNomination,
  verifyNominationCode,
} from '@/server/actions/nomination';
import { initialNominationState, type NominationState } from '@/lib/nomination-state';
import {
  disallowedReasonCharacters,
  MAX_REASON_LENGTH,
  MIN_REASON_LENGTH,
} from '@/domain/nomination';
import { refreshConstraintMessage } from '@/lib/constraint-message';
import { cn } from '@/lib/utils';

type CategoryOption = { slug: string; name: string; strapline: string | null };

/**
 * The nomination form.
 *
 * Audience nominates, PALMA judges. Someone should be able to arrive, name a
 * creator, say why, confirm their email and leave — in under a minute, without
 * an account, an upload or an essay.
 */
/**
 * The character rule for a nomination reason, applied to the live field.
 *
 * Kept outside the component because it is attached to two events and reads
 * nothing but the field it is given.
 */
function checkReasonCharacters(event: React.FormEvent<HTMLTextAreaElement>) {
  const field = event.currentTarget;
  const stray = disallowedReasonCharacters(field.value);
  if (stray.length) {
    field.setCustomValidity(
      `Words, full stops and commas only. Remove ${stray
        .map((character) => `"${character}"`)
        .join(' ')}.`,
    );
  } else {
    // Hand it back, or clearing the character complaint would also clear the
    // one about length that the shared field had just set.
    refreshConstraintMessage(field);
  }
}

export function NominateForm({
  categories,
  creator,
  referralSlug,
}: {
  categories: CategoryOption[];
  /** Pre-selected when the nomination arrives through a creator's own link. */
  creator?: CreatorOption;
  referralSlug?: string;
}) {
  const [selected, setSelected] = React.useState<CreatorOption | null>(creator ?? null);
  const [categorySlug, setCategorySlug] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [renderedAt] = React.useState(() => Date.now());

  const [state, setState] = React.useState<NominationState>(initialNominationState);

  const [detailsState, requestCode, requesting] = useActionState(
    requestNominationCode,
    initialNominationState,
  );
  const [verifyState, verifyCode, verifying] = useActionState(
    verifyNominationCode,
    initialNominationState,
  );
  const [submitState, submit, submitting] = useActionState(
    submitNomination,
    initialNominationState,
  );

  // Whichever action last reported drives the visible step.
  React.useEffect(() => {
    if (detailsState !== initialNominationState) setState(detailsState);
  }, [detailsState]);
  React.useEffect(() => {
    if (verifyState !== initialNominationState) {
      setState((current) => ({
        ...verifyState,
        nominationId: verifyState.nominationId ?? current.nominationId,
      }));
    }
  }, [verifyState]);
  React.useEffect(() => {
    if (submitState !== initialNominationState) setState(submitState);
  }, [submitState]);

  const verified =
    state.step === 'verify' && state.status === 'success' && !state.message?.includes('sent');
  const errors = state.errors ?? {};

  if (state.step === 'done' && state.status === 'success') {
    return (
      <div className="border-stone-deep bg-ivory-bright flex flex-col items-center gap-8 border px-6 py-16 text-center">
        <PalmaSeal className="text-olive h-36 w-36" sublegend="NOMINATION RECORDED" />
        <div className="flex max-w-130 flex-col gap-4">
          <h2 className="text-4xl">Thank you</h2>
          <p className="text-taupe-deep leading-relaxed">
            Your nomination of <strong className="text-ink">{state.creatorName}</strong> for{' '}
            {state.categoryName} has been recorded.
          </p>
          <p className="text-taupe-deep text-sm leading-relaxed">
            PALMA screens every nomination, gathers the evidence itself, and an independent panel
            judges. Nomination numbers are not a leaderboard and do not decide the outcome.
          </p>
          <p className="font-mono text-sm tracking-[0.14em]">{state.reference}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="sm">
            <Link href="/nominate">Nominate someone else</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/categories">See the categories</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* ── Details ─────────────────────────────────────────────────────── */}
      <form action={requestCode} className="flex flex-col gap-8">
        <input type="hidden" name="creatorSlug" value={selected?.slug ?? ''} />
        <input type="hidden" name="categorySlug" value={categorySlug} />
        <input type="hidden" name="referralSlug" value={referralSlug ?? ''} />
        <input type="hidden" name="formRenderedAt" value={renderedAt} />

        <div aria-hidden="true" className="sr-only">
          <label htmlFor="nominate-website">Leave this field empty</label>
          <input id="nominate-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {state.step === 'details' && state.status === 'error' && state.message ? (
          <Notice tone="error" title="Not yet">
            {state.message}
          </Notice>
        ) : null}

        <fieldset disabled={state.step !== 'details'} className="flex flex-col gap-8">
          <legend className="sr-only">Your nomination</legend>

          {creator ? (
            <div className="border-olive/40 bg-olive/5 flex flex-col gap-1 border px-5 py-4">
              <span className="palma-label text-taupe-deep">Nominating</span>
              <span className="font-display text-2xl leading-tight">{creator.displayName}</span>
            </div>
          ) : (
            <Field
              htmlFor="creator-search"
              label="Who are you nominating?"
              required
              error={errors.creatorSlug}
            >
              <CreatorSearch
                selected={selected}
                onSelect={setSelected}
                error={errors.creatorSlug}
              />
            </Field>
          )}

          <fieldset className="flex flex-col gap-3">
            <legend className="palma-label text-taupe-deep mb-1">
              Which PALMA? <span className="text-champagne-deep">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.slug}
                  className={cn(
                    'palma-label cursor-pointer rounded-full border px-4 py-2.5 transition-colors',
                    categorySlug === category.slug
                      ? 'border-ink bg-ink text-ivory'
                      : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="category-choice"
                    value={category.slug}
                    checked={categorySlug === category.slug}
                    onChange={() => setCategorySlug(category.slug)}
                    className="sr-only"
                  />
                  {category.name}
                </label>
              ))}
            </div>
            {errors.categorySlug ? (
              <p role="alert" className="text-[0.8125rem] font-medium text-red-800">
                {errors.categorySlug}
              </p>
            ) : null}
          </fieldset>

          <Field
            htmlFor="reason"
            label="Why should they be considered?"
            required
            hint="A sentence or two is plenty. PALMA does the investigating, no links, files or evidence needed."
            error={errors.reason}
          >
            <Textarea
              id="reason"
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              // A textarea takes no `pattern` attribute, so the character rule
              // is checked here and handed to the browser as a custom message.
              // Named characters rather than a rule, because "use words only"
              // leaves somebody hunting the one bracket they pasted in.
              //
              // On both events, and that matters: the shared field clears the
              // custom message and recomputes on `invalid`, which is exactly
              // when a form is being submitted, so a rule applied only on
              // `input` would be wiped at the moment it needed to hold.
              onInput={checkReasonCharacters}
              onInvalid={checkReasonCharacters}
              minLength={MIN_REASON_LENGTH}
              maxLength={MAX_REASON_LENGTH}
              className="min-h-28"
              required
            />
          </Field>

          <Field
            htmlFor="email"
            label="Your email"
            required
            hint="Used once, to confirm you are a person. No account, no password, no marketing."
            error={errors.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            className="self-start"
            disabled={requesting || !selected || !categorySlug}
          >
            {requesting ? 'Sending code…' : 'Send verification code'}
          </Button>
        </fieldset>
      </form>

      {/* ── Verify, then submit ─────────────────────────────────────────── */}
      {state.step === 'verify' ? (
        <div className="border-stone-deep flex flex-col gap-8 border-t pt-10">
          <form action={verifyCode} className="flex flex-col gap-5">
            <input type="hidden" name="nominationId" value={state.nominationId ?? ''} />

            <div className="flex flex-col gap-2">
              <h2 className="text-2xl">Confirm your email</h2>
              <p className="text-taupe-deep text-sm leading-relaxed">
                {verified
                  ? 'Email verified. Submit your nomination below.'
                  : `Enter the code sent to ${state.email ?? 'your inbox'}.`}
              </p>
            </div>

            {state.status === 'error' && state.message ? (
              <Notice tone="error">{state.message}</Notice>
            ) : null}

            {state.codeNotDelivered ? (
              <Notice tone="warning" title="Development mode">
                No RESEND_API_KEY is configured, so the code was written to the server log instead
                of being emailed.
              </Notice>
            ) : null}

            {!verified ? (
              <div className="flex flex-wrap items-end gap-3">
                <Field htmlFor="code" label="Verification code" className="w-full sm:w-56">
                  <Input
                    id="code"
                    name="code"
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={8}
                    placeholder="PM5617"
                    required
                    className="font-mono text-lg tracking-[0.4em] uppercase"
                  />
                </Field>
                <Button type="submit" size="md" variant="outline" disabled={verifying}>
                  {verifying ? 'Checking…' : 'Verify'}
                </Button>
              </div>
            ) : (
              <Notice tone="ceremonial">Email verified.</Notice>
            )}
          </form>

          <form action={submit}>
            <input type="hidden" name="nominationId" value={state.nominationId ?? ''} />
            <Button type="submit" size="lg" disabled={!verified || submitting}>
              {submitting ? 'Submitting…' : 'Submit nomination'}
            </Button>
            {!verified ? (
              <p className="text-taupe mt-3 text-xs">
                Submission unlocks once your email is verified.
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
