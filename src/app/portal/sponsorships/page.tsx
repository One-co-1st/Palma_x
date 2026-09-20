import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { PlacementForm, PlacementDecision } from '@/components/operations/PlacementForms';
import { buildMetadata } from '@/lib/seo';
import { PLACEMENT_LIST, placement as placementRule, type Placement } from '@/domain/sponsorship';
import { supabaseAdmin } from '@/server/db/supabase';
import { formatShortDate } from '@/lib/format';
import {
  Layers,
  Clock,
  CheckCircle2,
  Sparkles,
  Megaphone,
  CalendarDays,
  Newspaper,
  PartyPopper,
  Crown,
  Info,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Sponsor placements',
  description: 'Where a sponsor\u2019s name appears, and where it does not.',
  path: '/portal/sponsorships',
  noIndex: true,
});

type SponsorshipRow = {
  id: string;
  placement: string;
  isApproved: boolean;
  approvedAt: string | null;
  attribution: string | null;
  Sponsor: { name: string } | null;
  Category: { name: string } | null;
  Article: { title: string } | null;
  PalmaEvent: { name: string } | null;
  AwardYear: { title: string } | null;
};

const PLACEMENT_ICONS: Record<string, typeof Crown> = {
  category: Megaphone,
  event: PartyPopper,
  editorial: Newspaper,
  principal: Crown,
};

async function loadFeatureStates() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('FeatureSetting')
    .select('key, enabled, launchAt, endAt')
    .is('awardYearId', null);

  const gateFor: Record<string, string> = {
    category: 'category_sponsorship',
    principal: 'partner_programme',
    editorial: 'sponsored_editorial',
    event: 'event_ticketing',
  };

  return (key: string) => {
    const featureKey = gateFor[key];
    const row = data?.find((r) => r.key === featureKey);
    if (!row) return false;
    if (!row.enabled) return false;
    const now = new Date();
    if (row.launchAt && new Date(row.launchAt) > now) return false;
    if (row.endAt && new Date(row.endAt) <= now) return false;
    return true;
  };
}

export default async function SponsorshipsPage() {
  const sb = supabaseAdmin();

  const [
    { data: placements },
    { data: sponsors },
    { data: seasons },
    { data: categories },
    { data: articles },
    { data: events },
    isFeatureLive,
  ] = await Promise.all([
    sb
      .from('Sponsorship')
      .select(
        'id, placement, isApproved, approvedAt, attribution, Sponsor(name), Category(name), Article(title), PalmaEvent(name), AwardYear(title)',
      )
      .order('isApproved', { ascending: true })
      .order('createdAt', { ascending: false }),
    sb
      .from('Sponsor')
      .select('id, name')
      .eq('status', 'active')
      .eq('agreementStatus', 'signed')
      .order('name'),
    sb
      .from('AwardYear')
      .select('id, title, year')
      .order('year', { ascending: false })
      .limit(5),
    sb.from('Category').select('id, name, awardYearId').order('name'),
    sb.from('Article').select('id, title').order('createdAt', { ascending: false }).limit(50),
    sb.from('PalmaEvent').select('id, name').order('name'),
    loadFeatureStates(),
  ]);

  const rows = (placements ?? []) as unknown as SponsorshipRow[];
  const waiting = rows.filter((row) => !row.isApproved);
  const live = rows.filter((row) => row.isApproved);

  const mayApprove = true;

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Layers className="text-taupe size-4" strokeWidth={1.5} />
          <span className="palma-label text-taupe-deep">The record</span>
        </div>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">Sponsor placements</h1>
        <p className="text-taupe-deep max-w-160 text-lg leading-relaxed">
          Association follows the thing they funded. A category partner appears on that category and
          the honours conferred in it, not on the Journal, not on the ceremony, not across the site.
        </p>
      </header>

      <div className="border-stone-deep mt-8 flex items-start gap-3 border px-5 py-4">
        <Info className="text-taupe mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
        <p className="text-taupe-deep text-sm leading-relaxed">
          A placement buys the association and nothing else. It cannot touch nomination eligibility,
          weighting, judging, assignment, scores or selection. You propose a placement here; an
          administrator approves it, so no single person can put a logo on a public page alone.
        </p>
      </div>

      <section className="mt-14">
        <div className="border-stone-deep flex items-center gap-2.5 border-b pb-3 mb-8">
          <Sparkles className="text-taupe size-4" strokeWidth={1.5} />
          <h2 className="palma-label text-taupe-deep">How each placement renders</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {PLACEMENT_LIST.map((rule) => {
            const featureLive = isFeatureLive(rule.key);
            const Icon = PLACEMENT_ICONS[rule.key] ?? Layers;
            return (
              <div
                key={rule.key}
                className="border-stone-deep group border transition-colors hover:bg-stone/10"
              >
                <div className="flex items-start gap-4 p-6">
                  <span className="bg-stone/30 flex size-10 shrink-0 items-center justify-center rounded-sm">
                    <Icon className="text-taupe-deep size-5" strokeWidth={1.5} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-display text-lg">{rule.name}</h3>
                      <Badge variant={featureLive ? 'olive' : 'muted'}>
                        {featureLive ? 'Live' : 'Switched off'}
                      </Badge>
                    </div>
                    <p className="text-taupe-deep text-sm leading-relaxed">{rule.buys}</p>
                  </div>
                </div>
                <div className="border-stone-deep/60 border-t px-6 py-4">
                  <p className="palma-label text-champagne-deep">
                    &ldquo;{rule.attribution} [Sponsor]&rdquo;
                  </p>
                  <ul className="text-taupe mt-3 flex flex-col gap-1.5 text-xs leading-relaxed">
                    {rule.appearsOn.map((where) => (
                      <li key={where} className="flex items-center gap-2">
                        <span className="bg-taupe/30 inline-block size-1 shrink-0 rounded-full" />
                        {where}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <div className="border-stone-deep flex items-center justify-between gap-4 border-b pb-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Clock className="text-taupe size-4" strokeWidth={1.5} />
            <h2 className="palma-label text-taupe-deep">
              Waiting for approval
            </h2>
          </div>
          {waiting.length > 0 ? (
            <Badge variant="default">{waiting.length} pending</Badge>
          ) : null}
        </div>

        {waiting.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Nothing waiting"
            description="A placement proposed here appears nowhere public until an administrator approves it."
          />
        ) : (
          <ul className="flex flex-col">
            {waiting.map((row) => {
              const rule = placementRule(row.placement as Placement);
              const Icon = PLACEMENT_ICONS[row.placement] ?? Layers;
              const target =
                row.Category?.name ??
                row.Article?.title ??
                row.PalmaEvent?.name ??
                row.AwardYear?.title ??
                '';
              return (
                <li
                  key={row.id}
                  className="palma-row group border-stone-deep flex flex-wrap items-center justify-between gap-4 border-b py-6 transition-colors hover:bg-stone/10"
                >
                  <span className="flex items-center gap-4">
                    <span className="bg-champagne/20 flex size-10 shrink-0 items-center justify-center rounded-sm">
                      <Icon className="text-champagne-deep size-5" strokeWidth={1.5} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-display text-lg">
                        {row.Sponsor?.name ?? 'Unknown sponsor'}
                      </span>
                      <span className="palma-label text-taupe-deep">
                        {rule.name} &middot; {target}
                      </span>
                    </span>
                  </span>
                  {mayApprove ? (
                    <PlacementDecision
                      sponsorshipId={row.id}
                      name={row.Sponsor?.name ?? 'sponsor'}
                    />
                  ) : (
                    <Badge variant="muted">With administration</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <div className="border-stone-deep flex items-center gap-2.5 border-b pb-3 mb-2">
          <CheckCircle2 className="text-taupe size-4" strokeWidth={1.5} />
          <h2 className="palma-label text-taupe-deep">Live placements</h2>
        </div>
        {live.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="No sponsor appears anywhere"
            description="PALMA is running unsponsored, which is the correct configuration for a first season."
          />
        ) : (
          <ul className="flex flex-col">
            {live.map((row) => {
              const rule = placementRule(row.placement as Placement);
              const featureLive = isFeatureLive(row.placement);
              const Icon = PLACEMENT_ICONS[row.placement] ?? Layers;
              const target =
                row.Category?.name ??
                row.Article?.title ??
                row.PalmaEvent?.name ??
                row.AwardYear?.title ??
                '';
              return (
                <li
                  key={row.id}
                  className="palma-row group border-stone-deep flex flex-wrap items-center justify-between gap-4 border-b py-6 transition-colors hover:bg-stone/10"
                >
                  <span className="flex items-center gap-4">
                    <span className="bg-olive/10 flex size-10 shrink-0 items-center justify-center rounded-sm">
                      <Icon className="text-olive size-5" strokeWidth={1.5} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-display text-lg">
                        {row.Sponsor?.name ?? 'Unknown sponsor'}
                      </span>
                      <span className="palma-label text-taupe-deep">
                        {rule.name} &middot; {target}
                        {row.approvedAt
                          ? ` \u00b7 approved ${formatShortDate(row.approvedAt)}`
                          : ''}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge variant={featureLive ? 'olive' : 'muted'}>
                      {featureLive ? 'Showing' : 'Held \u2014 feature off'}
                    </Badge>
                    {mayApprove ? (
                      <PlacementDecision
                        sponsorshipId={row.id}
                        name={row.Sponsor?.name ?? 'sponsor'}
                        approved
                      />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14 max-w-160">
        <div className="border-stone-deep flex items-center gap-2.5 border-b pb-3 mb-6">
          <CalendarDays className="text-taupe size-4" strokeWidth={1.5} />
          <h2 className="palma-label text-taupe-deep">Propose a placement</h2>
        </div>
        <p className="text-taupe mb-8 text-sm leading-relaxed">
          Only sponsors administration has already marked active with a signed agreement appear
          here. A placement against a conversation is a logo PALMA cannot support.
        </p>

        {(sponsors ?? []).length === 0 ? (
          <Notice tone="warning" title="No sponsor is ready to be placed">
            A sponsor has to be active with a signed agreement first, which is{' '}
            <Link href="/admin/business" className="palma-link text-ink">
              administration&rsquo;s side
            </Link>
            .
          </Notice>
        ) : (
          <PlacementForm
            sponsors={sponsors ?? []}
            seasons={seasons ?? []}
            categories={categories ?? []}
            articles={articles ?? []}
            events={events ?? []}
          />
        )}
      </section>
    </>
  );
}
