'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Label, Select, Textarea } from '@/components/ui/form';
import {
  contribution,
  formatPoints,
  MAX_SCORE,
  MAX_TOTAL,
  RATIONALE_MAX_WORDS,
  RATIONALE_MIN_WORDS,
  SCORING_CRITERIA,
  countWords,
} from '@/domain/judging';
import { CONFLICT_KINDS } from '@/domain/conflicts';
import {
  confirmNoConflict,
  declareConflict,
  submitScore,
  type JudgingState,
} from '@/server/actions/judging';
import { cn } from '@/lib/utils';

/**
 * The judging room.
 *
 * Four movements, in a fixed order, because the order is the safeguard:
 * conflict first, then assessment, then a review the judge has to pass
 * through, then the lock. A judge cannot reach the scale without declaring,
 * and cannot submit without reading back what they are about to record.
 *
 * Nothing here shows how many people nominated this creator. That number is
 * not fetched, not passed and not held in this component.
 */

const initial: JudgingState = { status: 'idle' };

type Step = 'conflict' | 'assess' | 'review';

export function JudgingRoom({
  assignmentId,
  candidacyId,
  candidateName,
  alreadyScored,
  conflictDeclared,
  inProgress,
}: {
  assignmentId: string;
  candidacyId: string;
  candidateName: string;
  alreadyScored: boolean;
  conflictDeclared: boolean;
  inProgress: boolean;
}) {
  const [step, setStep] = React.useState<Step>(inProgress ? 'assess' : 'conflict');
  const [scores, setScores] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(SCORING_CRITERIA.map((criterion) => [criterion.key, 5])),
  );
  const [rationale, setRationale] = React.useState('');
  const [state, action, pending] = useActionState(submitScore, initial);
  const reduced = useReducedMotion();

  // The weighted total, exactly as the server will compute it. A running
  // figure that disagrees with the recorded one is worse than no running
  // figure: a judge would calibrate against a number that is not their score.
  const total = SCORING_CRITERIA.reduce(
    (sum, criterion) => sum + contribution(criterion, scores[criterion.key] ?? 0),
    0,
  );
  const mean =
    SCORING_CRITERIA.reduce((sum, criterion) => sum + (scores[criterion.key] ?? 0), 0) /
    SCORING_CRITERIA.length;
  const words = countWords(rationale);
  const rationaleReady = words >= RATIONALE_MIN_WORDS && words <= RATIONALE_MAX_WORDS;

  if (alreadyScored || state.status === 'success') {
    return <Recorded candidateName={candidateName} reduced={Boolean(reduced)} />;
  }

  if (conflictDeclared) {
    return (
      <Notice tone="warning" title="Conflict declared">
        You have been removed from this candidacy. An administrator will reassign it. You cannot see
        this case again.
      </Notice>
    );
  }

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="flex flex-col gap-8">
      <StepRail step={step} />

      <AnimatePresence mode="wait" initial={false}>
        {step === 'conflict' ? (
          <motion.div key="conflict" {...motionProps}>
            <ConflictGate
              assignmentId={assignmentId}
              candidacyId={candidacyId}
              candidateName={candidateName}
              onCleared={() => setStep('assess')}
            />
          </motion.div>
        ) : null}

        {step === 'assess' ? (
          <motion.div key="assess" {...motionProps} className="flex flex-col gap-10">
            <fieldset className="flex flex-col gap-9">
              <legend className="palma-label text-taupe-deep mb-2">Assessment criteria</legend>

              {SCORING_CRITERIA.map((criterion) => (
                <CriterionField
                  key={criterion.key}
                  criterion={criterion}
                  value={scores[criterion.key] ?? 0}
                  onChange={(value) =>
                    setScores((current) => ({ ...current, [criterion.key]: value }))
                  }
                />
              ))}
            </fieldset>

            <div className="border-stone-deep flex items-baseline justify-between border-t pt-6">
              <span className="palma-label text-taupe-deep">Running total</span>
              <span className="font-display text-4xl tabular-nums">
                {formatPoints(total)}
                <span className="text-taupe-deep text-lg">/{formatPoints(MAX_TOTAL)}</span>
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <Label htmlFor="remarks">Your rationale</Label>
                <span
                  className={cn(
                    'palma-label tabular-nums',
                    rationaleReady ? 'text-olive' : 'text-taupe',
                  )}
                >
                  {words} / {RATIONALE_MIN_WORDS}–{RATIONALE_MAX_WORDS} words
                </span>
              </div>
              <p className="text-taupe-deep text-sm leading-relaxed">
                What supports your assessment? Short reasoning, not an essay, an argument a stranger
                reading this case afterwards could follow.
              </p>
              <Textarea
                id="remarks"
                name="remarks"
                className="min-h-48"
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
              />
              <p className="text-taupe text-xs leading-relaxed">
                Your rationale is seen by the chair and authorised administrators only. It is never
                shown to the creator, the nominator, sponsors or the public.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="button"
                size="lg"
                disabled={!rationaleReady}
                onClick={() => setStep('review')}
              >
                Review assessment
              </Button>
              {!rationaleReady ? (
                <span className="text-taupe text-xs">
                  {words < RATIONALE_MIN_WORDS
                    ? `${RATIONALE_MIN_WORDS - words} more words needed.`
                    : `${words - RATIONALE_MAX_WORDS} words over.`}
                </span>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {step === 'review' ? (
          <motion.div key="review" {...motionProps}>
            <form action={action} className="flex flex-col gap-8">
              <input type="hidden" name="assignmentId" value={assignmentId} />
              {SCORING_CRITERIA.map((criterion) => (
                <input
                  key={criterion.key}
                  type="hidden"
                  name={criterion.key}
                  value={scores[criterion.key] ?? 0}
                />
              ))}
              <input type="hidden" name="remarks" value={rationale} />

              {state.status === 'error' && state.message ? (
                <Notice tone="error" title="Not recorded">
                  {state.message}
                </Notice>
              ) : null}

              <div className="border-stone-deep border">
                <div className="border-stone-deep border-b p-6">
                  <span className="palma-label text-taupe-deep">Your assessment</span>
                  <p className="font-display mt-2 text-3xl leading-tight">{candidateName}</p>
                </div>

                <dl className="flex flex-col">
                  {SCORING_CRITERIA.map((criterion) => (
                    <div
                      key={criterion.key}
                      className="border-stone-deep/50 flex items-baseline justify-between gap-6 border-b px-6 py-4"
                    >
                      <dt className="text-taupe-deep text-sm">
                        {criterion.label}
                        <span className="text-taupe palma-label ml-2">{criterion.weight}%</span>
                      </dt>
                      <dd className="font-display text-xl tabular-nums">
                        {scores[criterion.key]}
                        <span className="text-taupe text-sm"> / {MAX_SCORE}</span>
                        <span className="text-taupe ml-2 text-sm">
                          → {formatPoints(contribution(criterion, scores[criterion.key] ?? 0))}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="bg-stone/25 flex items-baseline justify-between gap-6 px-6 py-5">
                  <span className="palma-label text-taupe-deep">Overall</span>
                  <span className="font-display text-3xl tabular-nums">
                    {formatPoints(total)}
                    <span className="text-taupe-deep text-base">/{formatPoints(MAX_TOTAL)}</span>
                    <span className="text-taupe ml-3 text-base">
                      mean {mean.toFixed(1)}/{MAX_SCORE}
                    </span>
                  </span>
                </div>
              </div>

              <div className="border-stone-deep border p-6">
                <span className="palma-label text-taupe-deep">Your rationale</span>
                <p className="text-ink/85 mt-3 text-sm leading-relaxed whitespace-pre-line">
                  {rationale}
                </p>
              </div>

              <Notice tone="ceremonial" title="This becomes part of the record">
                Your assessment will be recorded as part of the official PALMA judging record for{' '}
                {candidateName}. It cannot be edited after submission.
              </Notice>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setStep('assess')}
                  disabled={pending}
                >
                  ← Back to assessment
                </Button>
                <Button type="submit" size="lg" disabled={pending}>
                  {pending ? 'Recording…' : 'Submit assessment'}
                </Button>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StepRail({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'conflict', label: 'Conflict check' },
    { key: 'assess', label: 'Assessment' },
    { key: 'review', label: 'Review' },
  ];
  const index = steps.findIndex((entry) => entry.key === step);

  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2">
      {steps.map((entry, position) => (
        <li key={entry.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'inline-block size-1.5 rounded-full transition-colors',
              position < index
                ? 'bg-olive'
                : position === index
                  ? 'bg-champagne-deep'
                  : 'bg-stone-deep',
            )}
          />
          <span
            className={cn(
              'palma-label transition-colors',
              position === index ? 'text-ink' : 'text-taupe',
            )}
            aria-current={position === index ? 'step' : undefined}
          >
            {entry.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CriterionField({
  criterion,
  value,
  onChange,
}: {
  criterion: (typeof SCORING_CRITERIA)[number];
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const guidanceId = `${criterion.key}-guidance`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-6">
        <span className="flex items-baseline gap-2">
          <span id={`${criterion.key}-label`} className="font-display text-xl">
            {criterion.label}
          </span>
          <span className="palma-label text-champagne-deep">{criterion.weight}%</span>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={guidanceId}
            className="border-stone-deep text-taupe-deep hover:border-ink hover:text-ink inline-flex size-4.5 items-center justify-center rounded-full border text-[0.625rem] leading-none transition-colors"
          >
            i<span className="sr-only">What PALMA means by {criterion.label}</span>
          </button>
        </span>
        <span className="font-display text-2xl tabular-nums">
          {value}
          <span className="text-taupe-deep text-base">/{MAX_SCORE}</span>
        </span>
      </div>

      <p className="text-taupe-deep text-sm leading-relaxed">{criterion.description}</p>

      {open ? (
        <p
          id={guidanceId}
          className="border-olive/40 text-ink/85 border-l-2 pl-4 text-sm leading-relaxed"
        >
          {criterion.guidance}
        </p>
      ) : null}

      <div
        role="radiogroup"
        aria-labelledby={`${criterion.key}-label`}
        className="flex flex-wrap gap-1.5"
      >
        {Array.from({ length: MAX_SCORE + 1 }, (_, score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            onClick={() => onChange(score)}
            className={cn(
              'border-stone-deep h-10 min-w-10 flex-1 border text-sm tabular-nums transition-[background-color,color,border-color]',
              value === score
                ? 'border-ink bg-ink text-ivory'
                : 'text-taupe-deep hover:border-ink hover:text-ink',
            )}
          >
            {score}
          </button>
        ))}
      </div>

      <div className="text-taupe flex justify-between text-xs">
        <span>0, not evidenced</span>
        <span>{MAX_SCORE}, exceptional</span>
      </div>
    </div>
  );
}

function ConflictGate({
  assignmentId,
  candidacyId,
  candidateName,
  onCleared,
}: {
  assignmentId: string;
  candidacyId: string;
  candidateName: string;
  onCleared: () => void;
}) {
  const [declaring, setDeclaring] = React.useState(false);
  const [clearState, clearAction, clearing] = useActionState(confirmNoConflict, initial);
  const [conflictState, conflictAction, declaringPending] = useActionState(
    declareConflict,
    initial,
  );

  React.useEffect(() => {
    if (clearState.status === 'success') onCleared();
  }, [clearState.status, onCleared]);

  if (conflictState.status === 'success') {
    return (
      <Notice tone="warning" title="Conflict declared">
        {conflictState.message}
      </Notice>
    );
  }

  return (
    <div className="border-stone-deep flex flex-col gap-6 border p-7">
      <div className="flex items-start gap-4">
        <ShieldAlert className="text-olive mt-1 size-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl leading-tight">
            Do you have a conflict of interest with {candidateName}?
          </h2>
          <p className="text-taupe-deep text-sm leading-relaxed">
            Any relationship at all. Personal, professional, financial, or work you have been paid
            for. Declaring removes this candidate from your assignments immediately. You do not have
            to decide whether it matters; that is the chair&rsquo;s call, not yours.
          </p>
        </div>
      </div>

      {clearState.status === 'error' && clearState.message ? (
        <Notice tone="error">{clearState.message}</Notice>
      ) : null}
      {conflictState.status === 'error' && conflictState.message ? (
        <Notice tone="error">{conflictState.message}</Notice>
      ) : null}

      {declaring ? (
        <form action={conflictAction} className="flex flex-col gap-4">
          <input type="hidden" name="candidacyId" value={candidacyId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="kind">Nature of the conflict</Label>
            <Select id="kind" name="kind" defaultValue="personal_relationship">
              {CONFLICT_KINDS.map((kind) => (
                <option key={kind.key} value={kind.key}>
                  {kind.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note for the chair (optional)</Label>
            <Textarea id="note" name="note" className="min-h-20" maxLength={1000} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="outline" size="md" disabled={declaringPending}>
              {declaringPending ? 'Declaring…' : 'Declare conflict'}
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="md"
              onClick={() => setDeclaring(false)}
              disabled={declaringPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <form action={clearAction}>
              <input type="hidden" name="assignmentId" value={assignmentId} />
              <Button type="submit" size="md" disabled={clearing}>
                {clearing ? 'Opening…' : 'No conflict'}
              </Button>
            </form>
            <Button type="button" variant="outline" size="md" onClick={() => setDeclaring(true)}>
              Declare conflict
            </Button>
          </div>
          <p className="text-taupe text-xs">
            Confirming no conflict opens the assessment and is written to the audit log.
          </p>
        </div>
      )}
    </div>
  );
}

/** The lock. A quiet, deliberate moment — not a celebration. */
function Recorded({ candidateName, reduced }: { candidateName: string; reduced: boolean }) {
  return (
    <div className="border-stone-deep flex flex-col items-start gap-5 border p-8">
      <motion.span
        aria-hidden="true"
        className="border-olive text-olive inline-flex size-11 items-center justify-center rounded-full border"
        initial={reduced ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Check className="size-5" />
      </motion.span>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl leading-tight">Recorded</h2>
        <p className="text-taupe-deep text-sm leading-relaxed">
          Your assessment of {candidateName} has been securely recorded as part of the official
          PALMA judging record.
        </p>
      </div>

      <p className="text-taupe border-stone-deep flex items-start gap-2 border-t pt-5 text-xs leading-relaxed">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          This assessment cannot be edited. If PALMA needs a correction it goes through a controlled
          administrative process, with the state before and after written to the audit log.
        </span>
      </p>
    </div>
  );
}
