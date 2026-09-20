import 'server-only';
import { sql } from '@/server/db/sql';
import { FEATURE_LIST } from '@/domain/features';
import { featureStates } from '@/server/features';

/**
 * The commercial overview.
 *
 * Deliberately not a revenue dashboard yet. PALMA has sold nothing, and a
 * dashboard reporting £0 across seven headings is theatre — so this reports
 * what actually exists: the pipeline, the inventory, and which rails are live.
 *
 * Revenue reporting arrives when there is revenue, and it will read from
 * agreements rather than from a number somebody typed.
 */

export type BusinessOverview = {
  features: { key: string; name: string; group: string; live: boolean }[];
  liveCount: number;
  sponsors: {
    total: number;
    prospects: number;
    active: number;
    signed: number;
    expiringSoon: number;
  };
  packages: { total: number; available: number };
  /** What could be sold, and whether it currently is. */
  inventory: {
    kind: string;
    label: string;
    detail: string;
    state: 'available' | 'taken' | 'off';
  }[];
  subscribers: { key: string; confirmed: number }[];
};

export async function getBusinessOverview(): Promise<BusinessOverview> {
  const soon = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const [
    states,
    sponsorCounts,
    [signed],
    [expiring],
    [packages],
    [availablePackages],
    [season],
    lists,
  ] = await Promise.all([
    featureStates(),
    sql<{ status: string; count: number }[]>`
      select status, count(*)::int as count
      from "Sponsor"
      group by status
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Sponsor"
      where "agreementStatus" = 'signed'
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Sponsor"
      where status = 'active' and "endsAt" is not null and "endsAt" <= ${soon}
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count from "SponsorshipPackage"
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count from "SponsorshipPackage" where "isAvailable" = true
    `,
    sql<{ id: string; title: string }[]>`
      select id, title from "AwardYear" where "isCurrent" = true limit 1
    `,
    sql<{ type: string; count: number }[]>`
      select type, count(*)::int as count
      from "EmailSubscription"
      where status = 'confirmed'
      group by type
    `,
  ]);

  const sponsorCount = (status: string) =>
    sponsorCounts.find((row) => row.status === status)?.count ?? 0;

  const features = FEATURE_LIST.map((entry) => ({
    key: entry.key,
    name: entry.name,
    group: entry.group,
    live: states.find((state) => state.key === entry.key)?.live ?? false,
  }));

  const sponsorshipLive = features.find((f) => f.key === 'category_sponsorship')?.live ?? false;

  // Inventory is derived, never hard-coded into a page component: what is for
  // sale is a function of what exists and what is switched on.
  const categories = season
    ? await sql<{ id: string; name: string; sponsorName: string | null }[]>`
        select
          c.id,
          c.name,
          (
            select s.name
            from "Sponsorship" sp
            join "Sponsor" s on s.id = sp."sponsorId"
            where sp."categoryId" = c.id and sp."isApproved" = true
            limit 1
          ) as "sponsorName"
        from "Category" c
        where c."awardYearId" = ${season.id}
        order by c.name asc
      `
    : [];

  const inventory: BusinessOverview['inventory'] = [
    ...categories.map((category) => {
      const taken = category.sponsorName ?? undefined;
      return {
        kind: 'Category sponsorship',
        label: category.name,
        detail: season?.title ?? '',
        state: (!sponsorshipLive ? 'off' : taken ? 'taken' : 'available') as
          'available' | 'taken' | 'off',
      };
    }),
    {
      kind: 'Event',
      label: 'Ceremony partnership',
      detail: 'No event is confirmed.',
      state: (features.find((f) => f.key === 'event_ticketing')?.live ? 'available' : 'off') as
        'available' | 'off',
    },
    {
      kind: 'Journal',
      label: 'Partner feature',
      detail: 'Labelled partner content in the Journal.',
      state: (features.find((f) => f.key === 'sponsored_editorial')?.live ? 'available' : 'off') as
        'available' | 'off',
    },
    {
      kind: 'Newsletter',
      label: 'Partner offer',
      detail: `${lists.find((row) => row.type === 'partner_offers')?.count ?? 0} subscribers`,
      state: (features.find((f) => f.key === 'partner_offers')?.live ? 'available' : 'off') as
        'available' | 'off',
    },
  ];

  return {
    features,
    liveCount: features.filter((entry) => entry.live).length,
    sponsors: {
      total: sponsorCounts.reduce((sum, row) => sum + row.count, 0),
      prospects: sponsorCount('prospect'),
      active: sponsorCount('active'),
      signed: signed.count,
      expiringSoon: expiring.count,
    },
    packages: { total: packages.count, available: availablePackages.count },
    inventory,
    subscribers: lists.map((row) => ({ key: row.type, confirmed: row.count })),
  };
}
