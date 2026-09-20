'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import {
  assignPlacement,
  decidePlacement,
  type CommercialState,
} from '@/server/actions/commercial-sb';
import { PLACEMENT_LIST, placement as placementRule, type Placement } from '@/domain/sponsorship';
import { Send, Loader2 } from 'lucide-react';

const initial: CommercialState = { status: 'idle' };

export function PlacementForm({
  sponsors,
  seasons,
  categories,
  articles,
  events,
}: {
  sponsors: { id: string; name: string }[];
  seasons: { id: string; title: string; year: number }[];
  categories: { id: string; name: string; awardYearId: string }[];
  articles: { id: string; title: string }[];
  events: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(assignPlacement, initial);
  const [kind, setKind] = React.useState<Placement>('category');
  const [season, setSeason] = React.useState(seasons[0]?.id ?? '');

  const rule = placementRule(kind);
  const seasonCategories = categories.filter((category) => category.awardYearId === season);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status !== 'idle' && state.message ? (
        <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field htmlFor="sponsorId" label="Sponsor" required>
          <Select id="sponsorId" name="sponsorId" required defaultValue="">
            <option value="" disabled>
              Choose a sponsor
            </option>
            {sponsors.map((sponsor) => (
              <option key={sponsor.id} value={sponsor.id}>
                {sponsor.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="awardYearId" label="Season" required>
          <Select
            id="awardYearId"
            name="awardYearId"
            required
            value={season}
            onChange={(event) => setSeason(event.target.value)}
          >
            {seasons.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        htmlFor="placement"
        label="What they funded"
        required
        hint="Association follows the thing they funded, and goes nowhere else."
      >
        <Select
          id="placement"
          name="placement"
          value={kind}
          onChange={(event) => setKind(event.target.value as Placement)}
        >
          {PLACEMENT_LIST.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="border-stone-deep/60 -mt-2 flex items-start gap-2 rounded-sm bg-stone/15 px-4 py-3">
        <span className="text-taupe-deep text-xs leading-relaxed">
          {rule.buys} Appears on: {rule.appearsOn.join('; ').toLowerCase()}.
        </span>
      </div>

      {kind === 'category' ? (
        <Field htmlFor="categoryId" label="Category" required>
          <Select id="categoryId" name="categoryId" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {seasonCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="categoryId" value="" />
      )}

      {kind === 'editorial' ? (
        <Field htmlFor="articleId" label="Article" required>
          <Select id="articleId" name="articleId" required defaultValue="">
            <option value="" disabled>
              Choose an article
            </option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="articleId" value="" />
      )}

      {kind === 'event' ? (
        <Field htmlFor="eventId" label="Event" required>
          <Select id="eventId" name="eventId" required defaultValue="">
            <option value="" disabled>
              Choose an event
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="eventId" value="" />
      )}

      <Field
        htmlFor="attribution"
        label="How it reads"
        hint={`Leave blank for \u201c${rule.attribution} [Sponsor]\u201d. The desk chooses the register, not the sponsor.`}
      >
        <Input id="attribution" name="attribution" maxLength={60} placeholder={rule.attribution} />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Proposing\u2026
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" />
            Propose this placement
          </>
        )}
      </Button>
    </form>
  );
}

export function PlacementDecision({
  sponsorshipId,
  name,
  approved = false,
}: {
  sponsorshipId: string;
  name: string;
  approved?: boolean;
}) {
  const [state, action, pending] = useActionState(decidePlacement, initial);

  if (state.status === 'success') {
    return <span className="palma-label text-olive">{state.message}</span>;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="sponsorshipId" value={sponsorshipId} />

      {state.status === 'error' && state.message ? (
        <span className="palma-label text-champagne-deep">{state.message}</span>
      ) : null}

      {approved ? null : (
        <Button type="submit" name="decision" value="approve" size="sm" disabled={pending}>
          {pending ? 'Saving\u2026' : 'Approve'}
        </Button>
      )}
      <Button
        type="submit"
        name="decision"
        value="remove"
        variant="ghost"
        size="sm"
        disabled={pending}
      >
        {approved ? `Remove ${name}` : 'Decline'}
      </Button>
    </form>
  );
}
