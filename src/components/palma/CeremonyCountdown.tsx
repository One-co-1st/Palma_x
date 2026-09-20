'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE } from '@/lib/motion';

/**
 * How long until THE PALMA.
 *
 * Rendered on the server as a whole number of days — a figure that cannot
 * disagree with itself on hydration — and upgraded after mount to days, hours
 * and minutes, which is the version that feels like something approaching.
 *
 * The distinction matters for more than correctness. The server figure is what
 * a reader with no JavaScript sees, what a crawler indexes, and what appears in
 * the fraction of a second before the bundle arrives. It has to be right on its
 * own.
 */
export function CeremonyCountdown({
  /** ISO timestamp of the next ceremony, computed on the server. */
  target,
  /** Whole days remaining, also computed on the server. */
  days,
  year,
}: {
  target: string;
  days: number;
  year: number;
}) {
  const reduced = useReducedMotion();
  const [live, setLive] = React.useState<{ d: number; h: number; m: number } | null>(null);
  // The server figure until the client has its own, then the live one — so the
  // day count and the hours beneath it never disagree by a day.
  const shownDays = live?.d ?? days;

  React.useEffect(() => {
    const at = new Date(target).getTime();

    function tick() {
      const remaining = at - Date.now();
      if (remaining <= 0) {
        setLive({ d: 0, h: 0, m: 0 });
        return;
      }
      setLive({
        d: Math.floor(remaining / 86_400_000),
        h: Math.floor((remaining % 86_400_000) / 3_600_000),
        m: Math.floor((remaining % 3_600_000) / 60_000),
      });
    }

    tick();
    // A minute is the smallest unit shown, so a minute is how often it needs
    // to run. A seconds display on a nine-month countdown is a gimmick.
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="flex flex-col gap-3">
      <span className="palma-label text-taupe">Until THE PALMA {year}</span>

      {/* Days carry the plate; hours and minutes sit under them as a second
          line. Three units set at the same size wrap into an untidy 2-and-1
          in a narrow plate, and a nine-month countdown does not need three
          units shouting at once anyway. */}
      <motion.div
        className="flex flex-col gap-1.5"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.slow, ease: EASE.ceremonial }}
      >
        <span className="flex items-baseline gap-2.5">
          <span className="font-display text-5xl leading-none tabular-nums">{shownDays}</span>
          <span className="palma-label text-taupe-deep">{shownDays === 1 ? 'day' : 'days'}</span>
        </span>

        {live ? (
          <span className="text-taupe text-sm tabular-nums">
            {live.h} {live.h === 1 ? 'hour' : 'hours'}, {live.m}{' '}
            {live.m === 1 ? 'minute' : 'minutes'}
          </span>
        ) : null}
      </motion.div>
    </div>
  );
}
