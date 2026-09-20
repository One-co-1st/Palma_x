'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, Label } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import {
  advanceSeason,
  assignJudges,
  decideThePalmaAction,
  proposeThePalmaAction,
  confirmFinalists,
  confirmWinner,
  reviewCandidacy,
  type AdminState,
} from '@/server/actions/admin';
import { SEASON_STAGES, STAGE_LABEL, type SeasonStage } from '@/domain/season';

const initial: AdminState = { status: 'idle' };

function Feedback({ state }: { state: AdminState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>;
}

export function ReviewForm({ candidacyId, status }: { candidacyId: string; status: string }) {
  const [state, action, pending] = useActionState(reviewCandidacy, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="candidacyId" value={candidacyId} />
      <Feedback state={state} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`decision-${candidacyId}`}>Decision</Label>
          <Select id={`decision-${candidacyId}`} name="decision" defaultValue={status}>
            <option value="eligible">Eligible</option>
            <option value="under_review">Keep under review</option>
            <option value="ineligible">Ineligible</option>
            <option value="withdrawn">Withdrawn</option>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`note-${candidacyId}`}>Reason (required unless eligible)</Label>
          <Input id={`note-${candidacyId}`} name="note" maxLength={500} />
        </div>
        <Button type="submit" size="md" variant="outline" disabled={pending}>
          {pending ? 'Saving…' : 'Record decision'}
        </Button>
      </div>
    </form>
  );
}

export function AssignJudgesForm({
  categoryId,
  categoryName,
  eligibleCount,
  assignedCount,
}: {
  categoryId: string;
  categoryName: string;
  eligibleCount: number;
  assignedCount: number;
}) {
  const [state, action, pending] = useActionState(assignJudges, initial);

  return (
    <form action={action} className="border-stone-deep flex flex-col gap-3 border p-6">
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-display text-xl">{categoryName}</span>
          <span className="palma-label text-taupe-deep">
            {eligibleCount} eligible · {assignedCount} assignments
          </span>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? 'Assigning…' : 'Assign panel'}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function FinalistForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState(confirmFinalists, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="categoryId" value={categoryId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Conferring…' : 'Confirm finalists'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function WinnerForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState(confirmWinner, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`citation-${categoryId}`}>Citation</Label>
        <Textarea
          id={`citation-${categoryId}`}
          name="citation"
          className="min-h-20"
          maxLength={400}
          placeholder="For a body of work that set the standard of the season."
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Conferring…' : 'Confer the PALMA'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function AdvanceSeasonForm({ year, stage }: { year: number; stage: SeasonStage }) {
  const [state, action, pending] = useActionState(advanceSeason, initial);
  const index = SEASON_STAGES.indexOf(stage);
  const next = SEASON_STAGES[index + 1];

  if (!next) {
    return (
      <p className="text-taupe-deep text-sm">This season is archived. There is no next stage.</p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="stage" value={next} />
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-taupe-deep text-sm">
          Current stage: <strong className="text-ink">{STAGE_LABEL[stage]}</strong>
        </span>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? 'Advancing…' : `Advance to ${STAGE_LABEL[next]}`}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/**
 * Conferring THE PALMA.
 *
 * Deliberately unlike every other form in this file. There is no ranking to
 * accept and no proposal to confirm: a creator is named from the whole record
 * and a citation is written by hand.
 *
 * So the form asks for the recipient's name to be typed back before it will
 * submit. Not a modal and not an "are you sure", which people click through.
 * Writing the name is a deliberate act, and it is the same standard the
 * citation itself is held to. This happens once a year.
 */
export function ThePalmaForm({
  seasons,
  creators,
}: {
  seasons: { id: string; title: string }[];
  creators: { id: string; displayName: string }[];
}) {
  const [state, action, pending] = useActionState(proposeThePalmaAction, initial);
  const [creatorId, setCreatorId] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const chosen = creators.find((creator) => creator.id === creatorId);
  const confirmed = Boolean(chosen) && confirmation.trim() === chosen?.displayName;

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="the-palma-season">Season</Label>
        <Select id="the-palma-season" name="awardYearId" required defaultValue="">
          <option value="" disabled>
            Choose a season
          </option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="the-palma-creator">Recipient</Label>
        <Select
          id="the-palma-creator"
          name="creatorId"
          required
          value={creatorId}
          onChange={(event) => setCreatorId(event.target.value)}
        >
          <option value="" disabled>
            Choose a creator
          </option>
          {creators.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.displayName}
            </option>
          ))}
        </Select>
        <p className="text-taupe-deep text-xs leading-relaxed">
          Any creator on the record, whether or not they were nominated this season. THE PALMA is
          not drawn from the finalists.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="the-palma-citation">Citation</Label>
        <Textarea
          id="the-palma-citation"
          name="citation"
          className="min-h-32"
          minLength={120}
          maxLength={600}
          required
          placeholder="What the panel decided, and why. At least 120 characters."
        />
        <p className="text-taupe-deep text-xs leading-relaxed">
          Published with the honour. It must not call THE PALMA a lifetime achievement award, and it
          must not call it an award for anything.
        </p>
      </div>

      <div className="border-stone-deep flex flex-col gap-2 border-t pt-6">
        <Label htmlFor="the-palma-confirm">Type the recipient&rsquo;s name to confirm</Label>
        <Input
          id="the-palma-confirm"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={chosen?.displayName ?? 'Choose a recipient first'}
          disabled={!chosen}
          autoComplete="off"
        />
        <p className="text-taupe-deep text-xs leading-relaxed">
          One a year, never shared and never repeated. Proposing does not confer it: a second person
          has to sign it off, and it cannot be the person who proposed it.
        </p>
      </div>

      <Button type="submit" size="md" disabled={pending || !confirmed}>
        {pending ? 'Proposing…' : 'Propose THE PALMA'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

/**
 * The second signature.
 *
 * Two buttons and no fields. Everything that could be argued about was written
 * at the desk when the proposal was made; this is the moment somebody who did
 * not write it agrees with it, which is the only thing a two-person rule is
 * asking for.
 */
export function ThePalmaDecision({
  actionId,
  subject,
  proposedBy,
}: {
  actionId: string;
  subject: string;
  proposedBy: string;
}) {
  const [state, action, pending] = useActionState(decideThePalmaAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="actionId" value={actionId} />
      <p className="text-taupe-deep text-xs">
        Proposed by {proposedBy}. They cannot confer it themselves.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="confer" size="sm" disabled={pending}>
          {pending ? 'Conferring…' : `Confer ${subject}`}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="decline"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          Decline
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
