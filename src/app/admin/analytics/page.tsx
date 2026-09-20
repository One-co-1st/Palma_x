import { Suspense } from 'react';
import { ChartSkeleton } from '@/components/admin/Skeletons';
import {
  BarSeries,
  ChartFrame,
  Composition,
  Funnel,
  TimeSeries,
} from '@/components/charts/primitives';
import { PeriodFilter } from '@/components/admin/PeriodFilter';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import {
  compareSeasons,
  getAwardsAnalytics,
  getCategoryMomentum,
  getCreatorAnalytics,
  getNominationAnalytics,
  getOperationalAnalytics,
  isPeriod,
  PERIOD_LABEL,
  type Period,
} from '@/server/data/command-centre';
import { DIRECTION_LABEL, type Direction } from '@/domain/momentum';
import { countryName } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Analytics',
  description: 'PALMA analytics.',
  path: '/admin/analytics',
  noIndex: true,
});

/**
 * Each section counts its own figures and streams in when they land, rather
 * than the page waiting on the slowest query in it. The skeletons are shaped
 * like the charts, so nothing reflows when the data arrives.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requirePermission('admin:view_analytics', '/admin/analytics');
  const { period: raw } = await searchParams;
  const period = isPeriod(raw) ? raw : '30d';

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Command centre</span>
        <h1 className="text-4xl">Analytics</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Counted live against PostgreSQL. There is no reporting copy to drift from the pages these
          figures summarise. Every chart can be read as a table, because a number somebody intends
          to quote should be readable exactly.
        </p>
      </div>

      <div className="border-stone-deep mt-10 border-b pb-5">
        <PeriodFilter period={period} basePath="/admin/analytics" />
      </div>

      <Suspense fallback={<ChartSkeleton title="Season by season" />}>
        <SeasonSection />
      </Suspense>

      <Suspense fallback={<ChartSkeleton title="Nominations" />}>
        <NominationSection period={period} />
      </Suspense>

      <Suspense fallback={<ChartSkeleton title="Category momentum" />}>
        <MomentumSection period={period} />
      </Suspense>

      <Suspense fallback={<ChartSkeleton title="Creators" />}>
        <CreatorSection />
      </Suspense>

      <Suspense fallback={<ChartSkeleton title="Awards" />}>
        <AwardsSection />
      </Suspense>

      <Suspense fallback={<ChartSkeleton title="Operations" />}>
        <OperationsSection />
      </Suspense>
    </>
  );
}

async function SeasonSection() {
  const seasons = await compareSeasons();
  return (
    <>
      {/* ── Seasons ─────────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          Season by season
        </h2>

        <div className="mt-8 grid gap-px sm:grid-cols-2">
          <ChartFrame
            title="Nominations per season"
            note="Counted nominations only. Volume is a measure of reach, not of quality, no part of judging reads it."
            rows={seasons.map((season) => [String(season.year), season.nominations])}
            columns={['Season', 'Nominations']}
          >
            <BarSeries
              data={seasons.map((season) => ({
                label: String(season.year),
                value: season.nominations,
              }))}
            />
          </ChartFrame>

          <ChartFrame
            title="Creators considered per season"
            note="Distinct creators with at least one candidacy."
            legend={[
              { label: 'New to PALMA', colour: 'var(--palma-chart-1)' },
              { label: 'Returning', colour: 'var(--palma-chart-2)' },
            ]}
            rows={seasons.map((season) => [
              String(season.year),
              season.newCreators,
              season.returningCreators,
            ])}
            columns={['Season', 'New', 'Returning']}
          >
            <TimeSeries
              points={seasons.map((season) => ({
                label: String(season.year),
                values: [season.newCreators, season.returningCreators],
              }))}
              series={['New', 'Returning']}
            />
          </ChartFrame>
        </div>

        <div className="border-stone-deep mt-6 overflow-x-auto border">
          <table className="w-full min-w-160 border-collapse text-left text-sm">
            <thead className="border-stone-deep border-b">
              <tr>
                {[
                  'Season',
                  'Stage',
                  'Categories',
                  'Nominations',
                  'Candidacies',
                  'Finalists',
                  'Winners',
                ].map((column) => (
                  <th key={column} scope="col" className="palma-label text-taupe-deep p-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr key={season.year} className="border-stone-deep/50 border-b last:border-none">
                  <td className="font-display p-3 text-lg">{season.year}</td>
                  <td className="text-taupe-deep p-3">{titleCase(season.stage)}</td>
                  <td className="p-3 tabular-nums">{season.categories}</td>
                  <td className="p-3 tabular-nums">{season.nominations}</td>
                  <td className="p-3 tabular-nums">{season.candidacies}</td>
                  <td className="p-3 tabular-nums">{season.finalists}</td>
                  <td className="p-3 tabular-nums">{season.winners}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

async function NominationSection({ period }: { period: Period }) {
  const nominations = await getNominationAnalytics(period);
  return (
    <>
      {/* ── Nominations ─────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          Nominations, {PERIOD_LABEL[period].toLowerCase()}
        </h2>

        <div className="mt-8 grid gap-px lg:grid-cols-2">
          <ChartFrame
            className="lg:col-span-2"
            title="Nomination activity by day"
            note="Organic arrivals against those that came through a creator's own referral link. Both are legitimate; PALMA expects creators to ask."
            legend={[
              { label: 'Organic', colour: 'var(--palma-chart-1)' },
              { label: 'Referral', colour: 'var(--palma-chart-2)' },
            ]}
            rows={nominations.byDay.map((day) => [
              day.label,
              day.values[0] ?? 0,
              day.values[1] ?? 0,
            ])}
            columns={['Day', 'Organic', 'Referral']}
          >
            <TimeSeries points={nominations.byDay} series={['Organic', 'Referral']} height={200} />
          </ChartFrame>

          <ChartFrame
            title="How nominations arrive"
            rows={nominations.bySource.map((entry) => [entry.label, entry.value])}
            columns={['Source', 'Nominations']}
          >
            <Composition parts={nominations.bySource} />
          </ChartFrame>

          <ChartFrame
            title="What happens to them"
            note="A nomination counts only once its email address is verified."
            rows={nominations.byStatus.map((entry) => [entry.label, entry.value])}
            columns={['Status', 'Nominations']}
          >
            <Composition parts={nominations.byStatus} />
          </ChartFrame>

          <ChartFrame
            title="Through the nomination flow"
            note="Ordinal, so the colour carries the order. Percentages are of the stage above."
            rows={nominations.funnel.map((stage) => [stage.label, stage.value])}
            columns={['Stage', 'Count']}
          >
            <Funnel stages={nominations.funnel} />
          </ChartFrame>

          <ChartFrame
            title="Nominations by category"
            note="Never shown to a judge, and never published as a leaderboard."
            rows={nominations.byCategory.map((entry) => [entry.label, entry.value])}
            columns={['Category', 'Nominations']}
          >
            <BarSeries data={nominations.byCategory} />
          </ChartFrame>
        </div>

        <Notice className="mt-6" title="Integrity">
          {nominations.integrityFlagged} candidac
          {nominations.integrityFlagged === 1 ? 'y is' : 'ies are'} flagged for review, and{' '}
          {nominations.duplicatesRefused} nomination
          {nominations.duplicatesRefused === 1 ? ' was' : 's were'} rejected in this period. A flag
          is a prompt for a person to look, never an automatic rejection, and a shared network is
          never a reason on its own.
        </Notice>
      </section>
    </>
  );
}

/**
 * Category momentum.
 *
 * The section that answers "what do people actually like", and the one most
 * likely to be misread — so each row carries a sentence saying what it means
 * as well as the figures it means it from. A category surging on one creator's
 * audience and a category surging across the whole field produce the same
 * arrow, and the difference between them is the entire finding.
 */
async function MomentumSection({ period }: { period: Period }) {
  const report = await getCategoryMomentum(period);

  if (!report.window || report.rows.length === 0) {
    return (
      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          Category momentum
        </h2>
        <Notice className="mt-6" title="No season running">
          Momentum compares a window of nominations against the window before it. There is no
          current season with categories to compare.
        </Notice>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
        Category momentum
      </h2>

      <p className="text-taupe-deep mt-5 max-w-200 text-sm leading-relaxed">
        The last {report.window.days} days against the {report.window.days} before them, for the{' '}
        {report.seasonYear} season. Ordered by what moved, not by what is biggest, a large category
        that did exactly what it did last month is the least interesting row here.
      </p>

      <Notice tone="warning" className="mt-6" title="Internal instrument">
        Nomination counts are never published, never ranked in public and decide no outcome. These
        figures exist to design next season&rsquo;s categories, which to keep, split or retire, and
        nothing in the judging path reads them. A count is only honest while nobody can see it.
      </Notice>

      <div className="border-stone-deep mt-6 overflow-x-auto border">
        <table className="w-full min-w-200 border-collapse text-left text-sm">
          <thead className="border-stone-deep border-b">
            <tr>
              {['Category', 'Window', 'Before', 'Change', 'Field', 'Nominators', 'Reading'].map(
                (column) => (
                  <th key={column} scope="col" className="palma-label text-taupe-deep p-3">
                    {column}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.categoryId} className="border-stone-deep/50 border-b last:border-none">
                <td className="p-3">
                  <span className="font-display block text-lg leading-tight">{row.name}</span>
                  <MomentumMark direction={row.direction} />
                </td>
                <td className="p-3 tabular-nums">{row.current}</td>
                <td className="text-taupe-deep p-3 tabular-nums">{row.previous}</td>
                <td className="p-3 tabular-nums">
                  <span
                    className={
                      row.change > 0 ? 'text-olive' : row.change < 0 ? 'text-red-800' : 'text-taupe'
                    }
                  >
                    {row.change > 0 ? '+' : ''}
                    {row.change}
                  </span>
                  {row.previous > 0 ? (
                    <span className="text-taupe block text-xs tabular-nums">
                      {row.trend > 0 ? '+' : ''}
                      {Math.round(row.trend * 100)}%
                    </span>
                  ) : null}
                </td>
                <td className="p-3 tabular-nums">
                  {row.candidacies === 0 ? (
                    <span className="text-taupe">, </span>
                  ) : (
                    <>
                      {row.effective.toFixed(1)}
                      <span className="text-taupe"> / {row.candidacies}</span>
                      <span className="text-taupe block text-xs">
                        top {Math.round(row.topShare * 100)}%
                      </span>
                    </>
                  )}
                </td>
                <td className="p-3 tabular-nums">
                  {row.nominators}
                  {row.current > 0 ? (
                    <span className="text-taupe block text-xs">
                      {row.reach.toFixed(2)} per nomination
                    </span>
                  ) : null}
                </td>
                <td className="text-taupe-deep max-w-100 p-3 leading-relaxed">{row.reading}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The direction, as a word rather than a coloured arrow nobody can read. */
function MomentumMark({ direction }: { direction: Direction }) {
  const tone: Record<Direction, string> = {
    surging: 'text-olive',
    rising: 'text-olive',
    steady: 'text-taupe-deep',
    cooling: 'text-red-800',
    quiet: 'text-taupe',
  };

  return (
    <span className={`palma-label mt-1.5 block ${tone[direction]}`}>
      {DIRECTION_LABEL[direction]}
    </span>
  );
}

async function CreatorSection() {
  const creators = await getCreatorAnalytics();
  return (
    <>
      {/* ── Creators ────────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">Creators</h2>

        <div className="mt-8 grid gap-px lg:grid-cols-2">
          <ChartFrame
            title="Claimed and unclaimed"
            note="A record exists before its creator has an account. Unclaimed is the normal state of a young archive, not a backlog."
            rows={creators.claimed.map((entry) => [entry.label, entry.value])}
            columns={['State', 'Records']}
          >
            <Composition parts={creators.claimed} />
          </ChartFrame>

          <ChartFrame
            title="Verification status"
            rows={creators.verification.map((entry) => [titleCase(entry.label), entry.value])}
            columns={['Status', 'Creators']}
          >
            <BarSeries
              data={creators.verification.map((entry) => ({
                label: titleCase(entry.label),
                value: entry.value,
              }))}
            />
          </ChartFrame>

          <ChartFrame
            title="Where creators are"
            rows={creators.byCountry.map((entry) => [countryName(entry.label), entry.value])}
            columns={['Country', 'Creators']}
          >
            <BarSeries
              data={creators.byCountry.map((entry) => ({
                label: countryName(entry.label),
                value: entry.value,
              }))}
            />
          </ChartFrame>

          <ChartFrame
            title="Honours held"
            rows={creators.honoursHeld.map((entry) => [entry.label, entry.value])}
            columns={['Record', 'Creators']}
          >
            <Composition parts={creators.honoursHeld} />
          </ChartFrame>
        </div>
      </section>
    </>
  );
}

async function AwardsSection() {
  const awards = await getAwardsAnalytics();
  return (
    <>
      {/* ── Awards ──────────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">Awards</h2>

        <div className="mt-8 grid gap-px lg:grid-cols-2">
          <ChartFrame
            title="Candidacy to honour"
            note="Across every season PALMA has run."
            rows={awards.conversion.map((entry) => [entry.label, entry.value])}
            columns={['Stage', 'Count']}
          >
            <Funnel stages={awards.conversion} />
          </ChartFrame>

          <ChartFrame
            title="Category participation"
            rows={awards.participation.map((entry) => [entry.label, entry.value])}
            columns={['Category', 'Candidacies']}
          >
            <BarSeries data={awards.participation} />
          </ChartFrame>

          <ChartFrame
            title="Winners by category"
            rows={awards.winnersByCategory.map((entry) => [entry.label, entry.value])}
            columns={['Category', 'Winners']}
          >
            <BarSeries data={awards.winnersByCategory} />
          </ChartFrame>

          <ChartFrame
            title="First-time and repeat winners"
            note="A creator holding more than one PALMA across any season."
            rows={[
              ['First-time', awards.firstTimeWinners],
              ['Repeat', awards.repeatWinners],
            ]}
            columns={['Winner', 'Creators']}
          >
            <Composition
              parts={[
                { label: 'First-time winners', value: awards.firstTimeWinners },
                { label: 'Repeat winners', value: awards.repeatWinners },
              ]}
            />
          </ChartFrame>
        </div>
      </section>
    </>
  );
}

async function OperationsSection() {
  const operations = await getOperationalAnalytics();
  return (
    <>
      {/* ── Operations ──────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">Operations</h2>

        <div className="mt-8 grid gap-px lg:grid-cols-2">
          <ChartFrame
            title="Claim outcomes"
            note={
              operations.averageClaimReviewHours === null
                ? 'No claim has been decided yet.'
                : `Average time to a decision: ${operations.averageClaimReviewHours} hours.`
            }
            rows={operations.claimOutcomes.map((entry) => [titleCase(entry.label), entry.value])}
            columns={['Outcome', 'Claims']}
          >
            <BarSeries
              data={operations.claimOutcomes.map((entry) => ({
                label: titleCase(entry.label),
                value: entry.value,
              }))}
            />
          </ChartFrame>

          <ChartFrame
            title="Verification cases"
            note={
              operations.averageVerificationHours === null
                ? 'No case has been decided yet.'
                : `Average turnaround: ${operations.averageVerificationHours} hours.`
            }
            rows={operations.verificationOutcomes.map((entry) => [
              titleCase(entry.label),
              entry.value,
            ])}
            columns={['Status', 'Cases']}
          >
            <BarSeries
              data={operations.verificationOutcomes.map((entry) => ({
                label: titleCase(entry.label),
                value: entry.value,
              }))}
            />
          </ChartFrame>

          <ChartFrame
            title="Staff workload"
            note="Audited actions per account. A measure of who is carrying the queues, not of who is doing well."
            rows={operations.staffWorkload.map((entry) => [entry.label, entry.value])}
            columns={['Account', 'Audited actions']}
          >
            <BarSeries data={operations.staffWorkload} />
          </ChartFrame>

          <ChartFrame
            title="Enforcement actions"
            rows={operations.enforcement.map((entry) => [titleCase(entry.label), entry.value])}
            columns={['Action', 'Count']}
          >
            {operations.enforcement.length === 0 ? (
              <p className="text-taupe py-6 text-center text-sm">
                No enforcement action has been taken.
              </p>
            ) : (
              <BarSeries
                data={operations.enforcement.map((entry) => ({
                  label: titleCase(entry.label),
                  value: entry.value,
                }))}
              />
            )}
          </ChartFrame>
        </div>
      </section>
    </>
  );
}
