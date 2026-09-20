'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { searchAdmin } from '@/server/actions/search';
import type { SearchHit } from '@/server/data/people';
import type { AdminGroup } from '@/lib/admin-nav';
import { cn } from '@/lib/utils';

/**
 * The command palette.
 *
 * ⌘K from anywhere in the back office. It searches the institution — creators,
 * accounts, claims, cases, honours, the audit log — and falls back to the
 * sidebar's own destinations when nothing matches, so the palette is never a
 * dead end.
 *
 * Every result is a real row: the palette is possible at all because there is
 * one record per thing, so one query reaches all of it.
 */

type Entry = { kind: string; title: string; detail: string; href: string };

export function CommandPalette({ groups }: { groups: AdminGroup[] }) {
  const router = useRouter();
  const reduced = useReducedMotion();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [active, setActive] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // The sidebar's destinations, always available as a fallback.
  const destinations = React.useMemo<Entry[]>(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({
          kind: 'Go to',
          title: item.label,
          detail: group.title,
          href: item.href,
        })),
      ),
    [groups],
  );

  const matchingDestinations = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return destinations;
    return destinations.filter(
      (entry) =>
        entry.title.toLowerCase().includes(term) || entry.detail.toLowerCase().includes(term),
    );
  }, [destinations, query]);

  const entries: Entry[] = React.useMemo(
    () => [...matchingDestinations, ...hits],
    [matchingDestinations, hits],
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  React.useEffect(() => {
    if (open) {
      setActive(0);
      // The dialog mounts before the input exists on the first frame.
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
    setQuery('');
    setHits([]);
    return undefined;
  }, [open]);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return undefined;
    }

    // Debounced, because every keystroke is a database query and a person
    // types faster than PostgreSQL should be asked to answer.
    const id = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchAdmin(term);
        setHits(result.hits);
        setActive(0);
      });
    }, 180);

    return () => window.clearTimeout(id);
  }, [query]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(entries.length - 1, current + 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const entry = entries[active];
      if (entry) go(entry.href);
    }
  }

  React.useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: -8, scale: 0.99 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, scale: 0.99 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-ivory/20 text-ivory/50 hover:border-ivory/40 hover:text-ivory hidden items-center gap-3 border px-3 py-1.5 text-xs transition-colors sm:flex"
      >
        <span>Search PALMA</span>
        <kbd className="border-ivory/20 rounded-[2px] border px-1.5 py-0.5 font-sans text-[0.625rem]">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setOpen(false)}
              className="bg-ink/55 absolute inset-0 backdrop-blur-[2px]"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search PALMA"
              className="border-stone-deep bg-ivory relative w-full max-w-2xl border shadow-2xl"
              {...motionProps}
            >
              <div className="border-stone-deep flex items-center gap-3 border-b px-5">
                <span aria-hidden="true" className="text-taupe text-sm">
                  ⌘
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="A name, an email, a reference, a verification code…"
                  aria-label="Search PALMA"
                  className="text-ink placeholder:text-taupe h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] focus:outline-none"
                />
                {pending ? (
                  <span className="palma-label text-taupe motion-safe:animate-pulse">…</span>
                ) : null}
              </div>

              <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
                {entries.length === 0 ? (
                  <li className="text-taupe px-5 py-8 text-center text-sm">
                    {query.trim().length < 2
                      ? 'Type at least two characters.'
                      : `Nothing matches “${query.trim()}”.`}
                  </li>
                ) : (
                  entries.map((entry, index) => (
                    <li key={`${entry.href}-${entry.title}-${index}`}>
                      <button
                        type="button"
                        data-active={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(entry.href)}
                        className={cn(
                          'flex w-full items-baseline gap-4 px-5 py-2.5 text-left transition-colors',
                          index === active ? 'bg-stone/50' : 'hover:bg-stone/30',
                        )}
                      >
                        <span className="palma-label text-taupe w-24 shrink-0 truncate">
                          {entry.kind}
                        </span>
                        <span className="font-display min-w-0 flex-1 truncate text-[0.9375rem]">
                          {entry.title}
                        </span>
                        <span className="text-taupe-deep hidden max-w-[45%] min-w-0 truncate text-xs sm:block">
                          {entry.detail}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="border-stone-deep text-taupe flex flex-wrap items-center gap-x-5 gap-y-1 border-t px-5 py-2.5 text-[0.6875rem]">
                <span>↑↓ to move</span>
                <span>↵ to open</span>
                <span>esc to close</span>
                <span className="ml-auto">One record, one history</span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
