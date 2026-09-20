'use client';

import * as React from 'react';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/form';
import { countryName } from '@/lib/format';
import { cn } from '@/lib/utils';

export type CreatorOption = {
  slug: string;
  displayName: string;
  countryCode: string;
  headline: string | null;
  verified: boolean;
};

/**
 * Creator lookup. A combobox rather than a dropdown, because PALMA expects the
 * record to grow past the point where a list is useful.
 */
export function CreatorSearch({
  selected,
  onSelect,
  error,
}: {
  selected: CreatorOption | null;
  onSelect: (creator: CreatorOption | null) => void;
  error?: string;
}) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<CreatorOption[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  React.useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/creators/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { creators?: CreatorOption[] };
        setResults(body.creators ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        // Aborted or offline — the field simply shows nothing.
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selected]);

  if (selected) {
    return (
      <div className="border-olive/40 bg-olive/5 flex items-center justify-between gap-4 border px-4 py-3.5">
        <span className="flex items-center gap-3">
          <Check className="text-olive size-4 shrink-0" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="font-display text-lg leading-tight">{selected.displayName}</span>
            <span className="palma-label text-taupe-deep">{countryName(selected.countryCode)}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery('');
          }}
          className="text-taupe-deep hover:text-ink p-1 transition-colors"
        >
          <span className="sr-only">Choose a different creator</span>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="text-taupe pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="creator-search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder="Search by name"
          aria-invalid={error ? true : undefined}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (!open || results.length === 0) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => (index + 1) % results.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (index - 1 + results.length) % results.length);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const choice = results[active];
              if (choice) {
                onSelect(choice);
                setOpen(false);
              }
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="pl-10"
        />
      </div>

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="border-stone-deep bg-ivory-bright absolute z-20 mt-1 max-h-72 w-full overflow-y-auto border shadow-[0_24px_60px_-40px_rgba(22,23,25,0.6)]"
        >
          {results.map((creator, index) => (
            <li key={creator.slug} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  onSelect(creator);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors',
                  index === active ? 'bg-stone/50' : 'hover:bg-stone/30',
                )}
              >
                <span className="font-display text-lg leading-tight">{creator.displayName}</span>
                <span className="palma-label text-taupe-deep">
                  {countryName(creator.countryCode)}
                  {creator.verified ? ' · Verified' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {loading ? (
        <p className="text-taupe mt-2 text-xs" role="status">
          Searching…
        </p>
      ) : null}

      {!loading && open && query.trim().length >= 2 && results.length === 0 ? (
        <p className="text-taupe-deep mt-2 text-xs">
          No creator in the PALMA record matches that. They may not have a profile yet.
        </p>
      ) : null}
    </div>
  );
}
