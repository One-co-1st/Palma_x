'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { BadgeCheck } from 'lucide-react';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { CopyLink } from './CopyLink';
import { DURATION, EASE } from '@/lib/motion';
import { isThePalma, type HonourKind } from '@/domain/honours';

export type CredentialHonour = {
  id: string;
  kind: HonourKind;
  label: string;
  what: string;
  year: number;
  code: string | null;
  revoked: boolean;
};

/**
 * The credential.
 *
 * One address per person, not per honour. A creator who has won three times
 * should not be managing three links, and the one they hand out has to keep
 * working as they win more, so this shows the most recent honour and lets a
 * reader step back through the rest without leaving the page or changing the
 * address.
 *
 * Minimal on purpose. A person arriving here has been sent by a bio or a press
 * kit and is answering one question — is this true — so the page is the name,
 * the honour, the year and the seal. The reasoning lives on the record; this is
 * the proof.
 *
 * The motion is the point of arrival rather than decoration: the seal strikes
 * once, and switching honours re-strikes it. Under `prefers-reduced-motion`
 * everything is simply present, which `useReducedMotion` handles by reading
 * the same query the rest of the site respects.
 */
export function Credential({
  name,
  honours,
  shareUrl,
  profileHref,
}: {
  name: string;
  honours: CredentialHonour[];
  shareUrl: string;
  profileHref: string;
}) {
  const [index, setIndex] = React.useState(0);
  const current = honours[index];

  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  if (!current) return null;

  const move = reduced
    ? ({ duration: 0 } as const)
    : ({ duration: DURATION.slow, ease: EASE.ceremonial } as const);

  return (
    <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="flex flex-col gap-8 lg:col-span-7">
        {/* The name never moves. It is the one thing on the page that is true
            regardless of which honour is being shown. */}
        <h1 className="font-display text-[clamp(2.5rem,10vw,6.5rem)] leading-[0.9] tracking-tight">
          {name}
        </h1>

        <div className="border-champagne/25 border-t pt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -10 }}
              transition={move}
              className="flex flex-col gap-3"
            >
              <span className="palma-label text-champagne text-[0.8125rem] tracking-[0.3em]">
                {current.label}
              </span>
              <span className="font-display text-ivory/85 text-2xl leading-tight sm:text-3xl">
                {isThePalma(current.kind) ? `PALMA ${current.year}` : current.what}
              </span>
              <span className="text-ivory/45 text-sm tracking-[0.18em] uppercase tabular-nums">
                {isThePalma(current.kind) ? 'Conferred on a career' : `PALMA ${current.year}`}
              </span>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-col gap-5">
            {current.revoked ? (
              <p className="text-ivory/60 text-sm leading-relaxed">
                This honour was revoked. The record is kept rather than removed.
              </p>
            ) : (
              <p className="palma-label text-champagne inline-flex items-center gap-2">
                <BadgeCheck className="size-4" aria-hidden="true" />
                Verified by PALMA
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <CopyLink value={shareUrl} label="Copy link" variant="quiet" />
              {current.code ? (
                <Link
                  href={`/verify/${current.code}`}
                  className="text-ivory/40 hover:text-champagne font-mono text-xs tracking-wider transition-colors"
                >
                  {current.code}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {/* Everything else they hold. Only rendered when there is more than
            one, because a list of one is furniture. */}
        {honours.length > 1 ? (
          <nav aria-label="Other honours" className="border-ivory/12 border-t pt-6">
            <h2 className="palma-label text-ivory/35 text-[0.6875rem] tracking-[0.2em]">
              {honours.length} honours
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {honours.map((honour, position) => {
                const active = position === index;
                return (
                  <li key={honour.id} className="border-ivory/12 border-t">
                    <button
                      type="button"
                      onClick={() => setIndex(position)}
                      aria-current={active ? 'true' : undefined}
                      className={`group/h flex w-full items-baseline justify-between gap-4 py-3 text-left text-sm transition-colors ${
                        active ? 'text-ivory' : 'text-ivory/50 hover:text-ivory/80'
                      }`}
                    >
                      <span className="truncate">
                        {isThePalma(honour.kind) ? 'THE PALMA' : honour.what}
                      </span>
                      <span className="text-ivory/35 shrink-0 tabular-nums">{honour.year}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        <Link
          href={profileHref}
          className="palma-quiet-link text-ivory/45 hover:text-ivory self-start text-sm"
        >
          The full record
        </Link>
      </div>

      {/* Re-struck on every change, which is what makes switching feel like
          the seal being applied rather than a tab being clicked. */}
      <div className="flex justify-center lg:col-span-5 lg:justify-end">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={reduced ? false : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 1.04 }}
            transition={move}
          >
            <PalmaSeal
              legend={`PALMA ${current.year}`}
              sublegend="THE CREATOR HONOURS"
              centre={
                isThePalma(current.kind)
                  ? 'Laureate'
                  : current.kind === 'winner'
                    ? 'Winner'
                    : 'Finalist'
              }
              className={`h-48 w-48 sm:h-56 sm:w-56 ${
                current.revoked ? 'text-ivory/20' : 'text-champagne/90'
              }`}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
