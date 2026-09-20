import Link from 'next/link';
import { Suspense } from 'react';
import { ChartSkeleton } from '@/components/admin/Skeletons';
import { BarSeries, ChartFrame, Funnel, TimeSeries } from '@/components/charts/primitives';
import { Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { emailList } from '@/domain/email-lists';
import { MEASUREMENT_STATEMENT, REFUSED } from '@/domain/measurement';
import {
  AUDIENCE_WINDOWS,
  getAudienceReport,
  isAudienceWindow,
  type AudienceWindow,
} from '@/server/data/audience';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Audience',
  description: 'What PALMA counts.',
  path: '/admin/audience',
  noIndex: true,
});

/**
 * The audience page.
 *
 * Two things are on it that most dashboards leave off, and both are deliberate.
 *
 * The first is the statement at the top: PALMA counts pages, not people. That
 * is not a disclaimer, it is the specification — an operator reading these
 * figures needs to know what they do and do not mean before they read a single
 * one of them.
 *
 * The second is the list of figures PALMA cannot produce, set out with the
 * reason for each. A metric that is simply missing looks like an oversight, and
 * the next person to notice builds it. A metric that is missing with its reason
 * beside it is a decision that survives the person who made it.
 */
export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requirePermission('admin:view_analytics', '/admin/audience');
  const { window: raw } = await searchParams;
  const window = (isAudienceWindow(raw) ? Number(raw) : 30) as AudienceWindow;

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Command centre</span>
        <h1 className="text-4xl">Audience</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          What PALMA&rsquo;s own system can see about its own activity. Every figure below is either
          a counter PALMA incremented or a row it already holds for a reason of its own. Nothing
          here came from a third party, and nothing here describes a person.
        </p>
      </div>

      <div className="border-champagne-deep bg-stone/40 mt-8 border-l-2 p-6">
        <h2 className="palma-label text-taupe-deep">Traffic measurement</h2>
        <p className="font-display mt-3 text-xl leading-snug">{MEASUREMENT_STATEMENT}</p>
        <p className="text-taupe-deep mt-3 max-w-160 text-sm leading-relaxed">
          No cookie, no IP address, no hash of an IP address, no user-agent, no device identifier
          and no session, not stored and not derived. The consequence is in the last section of this
          page and is a decision rather than a gap.{' '}
          <Link href="/legal/cookies" className="palma-link text-ink">
            The cookies notice says the same thing publicly.
          </Link>
        </p>
      </div>

      <div className="border-stone-deep mt-10 flex flex-wrap items-center gap-2 border-b pb-5">
        <span className="palma-label text-taupe-deep mr-2">Window</span>
        {AUDIENCE_WINDOWS.map((days) => (
          <Link
            key={days}
            href={`/admin/audience?window=${days}`}
            className={cn(
              'palma-chip palma-label border px-3 py-1.5',
              days === window
                ? 'border-ink bg-ink text-ivory'
                : 'border-stone-deep text-taupe-deep hover:text-ink',
            )}
          >
            {days} days
          </Link>
        ))}
      </div>

      <Suspense fallback={<ChartSkeleton title="Reading" />}>
        <Report window={window} />
      </Suspense>
    </>
  );
}

async function Report({ window }: { window: AudienceWindow }) {
  const report = await getAudienceReport(window);
  const change = report.totalViews - report.previousViews;

  return (
    <>
      {/* ── Pages read ──────────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">Pages read</h2>

        {!report.counting ? (
          <Notice className="mt-6" title="Nothing counted yet">
            No page has been counted in this window. Counting begins the first time a public page is
            opened in a browser. It is the page itself that reports, so a crawler that never runs
            JavaScript is never counted, which is the correct behaviour and worth knowing when these
            figures look lower than a server log.
          </Notice>
        ) : null}

        <div className="border-stone-deep mt-8 grid gap-8 border-b pb-8 sm:grid-cols-3">
          <Figure label={`Views, last ${window} days`} value={report.totalViews} />
          <Figure
            label={`Previous ${window} days`}
            value={report.previousViews}
            note={
              report.previousViews > 0
                ? `${change >= 0 ? '+' : ''}${change} on the window before`
                : 'No earlier window to compare'
            }
          />
          <Figure
            label="Surfaces with traffic"
            value={report.surfaces.filter((row) => row.views > 0).length}
            note={`of ${report.surfaces.length}`}
          />
        </div>

        <div className="mt-8 grid gap-px sm:grid-cols-2">
          <ChartFrame
            title="Views by day"
            note="One row per page per day. Days, not timestamps. A timestamp is a trail."
            rows={report.byDay.map((day) => [day.label, day.values[0] ?? 0])}
            columns={['Day', 'Views']}
          >
            <TimeSeries
              points={report.byDay.map((day) => ({ label: day.label, values: day.values }))}
              series={['Views']}
            />
          </ChartFrame>

          <ChartFrame
            title="Views by surface"
            note="Which parts of the institution are being read."
            rows={report.surfaces.map((row) => [row.label, row.views])}
            columns={['Surface', 'Views']}
          >
            <BarSeries
              data={report.surfaces
                .filter((row) => row.views > 0)
                .map((row) => ({ label: row.label, value: row.views }))}
            />
          </ChartFrame>
        </div>

        <div className="border-stone-deep mt-6 overflow-x-auto border">
          <table className="w-full min-w-160 border-collapse text-left text-sm">
            <thead className="border-stone-deep border-b">
              <tr>
                {['Surface', 'Views', 'Before', 'Pages', 'What it covers'].map((column) => (
                  <th key={column} scope="col" className="palma-label text-taupe-deep p-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.surfaces.map((row) => (
                <tr key={row.key} className="border-stone-deep/50 border-b last:border-none">
                  <td className="font-display p-3 text-lg">{row.label}</td>
                  <td className="p-3 tabular-nums">{row.views}</td>
                  <td className="text-taupe-deep p-3 tabular-nums">{row.previous}</td>
                  <td className="text-taupe-deep p-3 tabular-nums">{row.pages}</td>
                  <td className="text-taupe-deep p-3 leading-relaxed">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {report.topPages.length > 0 ? (
          <div className="border-stone-deep mt-6 border p-6">
            <h3 className="palma-label text-taupe-deep">Most read</h3>
            <ol className="mt-4 flex flex-col">
              {report.topPages.map((page) => (
                <li
                  key={page.path}
                  className="border-stone-deep/50 flex items-baseline justify-between gap-6 border-b py-2.5 text-sm last:border-none"
                >
                  <Link
                    href={page.path}
                    className="palma-quiet-link text-taupe-deep hover:text-ink"
                  >
                    {page.path}
                  </Link>
                  <span className="tabular-nums">{page.views}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      {/* ── Searches ────────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          What people looked for
        </h2>

        <p className="text-taupe-deep mt-5 max-w-160 text-sm leading-relaxed">
          Terms typed into the Roll of Honour and the creator index. The term and the number of
          results, never who searched. Anything containing an address is discarded rather than
          counted, because that is the shape an accidental disclosure takes.
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <SearchTable
            title="Searched most"
            empty="No searches in this window."
            rows={report.searches}
          />
          <SearchTable
            title="Found nothing"
            note="PALMA being asked for something it does not hold. The most useful column on this page when a season is being designed."
            empty="Every search in this window found something."
            rows={report.emptySearches}
          />
        </div>
      </section>

      {/* ── The funnel ──────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          Nomination funnel
        </h2>

        <p className="text-taupe-deep mt-5 max-w-160 text-sm leading-relaxed">
          The audience discovers, PALMA evaluates, judges decide. Counted against the record rather
          than restated. Nomination volume is a discovery signal and nothing in the judging path
          reads it.
        </p>

        <div className="mt-8">
          <Funnel
            stages={report.funnel.map((stage) => ({ label: stage.label, value: stage.value }))}
          />
        </div>

        <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {report.funnel.map((stage) => (
            <div key={stage.label} className="border-stone-deep/60 border-t pt-4">
              <dt className="palma-label text-taupe-deep">{stage.label}</dt>
              <dd className="font-display mt-2 text-3xl leading-none tabular-nums">
                {stage.value}
              </dd>
              <dd className="text-taupe mt-2 text-sm leading-relaxed">{stage.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Everything else PALMA already holds ─────────────────────────── */}
      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          The institution, counted
        </h2>

        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div>
            <h3 className="palma-label text-taupe-deep border-stone-deep/60 border-b pb-3">
              Email subscribers
            </h3>
            <ul className="mt-4 flex flex-col">
              {report.subscribers.map((list) => (
                <li
                  key={list.key}
                  className="border-stone-deep/50 flex items-baseline justify-between gap-4 border-b py-3 text-sm last:border-none"
                >
                  <span className="text-taupe-deep">{emailList(list.key).name}</span>
                  <span className="tabular-nums">
                    {list.confirmed}
                    {list.pending > 0 ? (
                      <span className="text-taupe"> · {list.pending} unconfirmed</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-taupe mt-3 text-xs leading-relaxed">
              Confirmed means double opt-in completed. An unconfirmed address is not a subscriber
              and is never written to.
            </p>
          </div>

          <div>
            <h3 className="palma-label text-taupe-deep border-stone-deep/60 border-b pb-3">
              Verification lookups
            </h3>
            <p className="font-display mt-4 text-4xl leading-none tabular-nums">
              {report.verification.lookups}
            </p>
            <p className="text-taupe-deep mt-2 text-sm leading-relaxed">
              Across {report.verification.records} signed record
              {report.verification.records === 1 ? '' : 's'}. Somebody checking whether an honour is
              real, the closest thing PALMA has to a measure of the record being trusted.
            </p>
            <p className="text-taupe mt-3 text-xs leading-relaxed">
              Counted since the record was issued, not within this window. It has always been a
              counter with nobody attached.
            </p>
          </div>

          <div>
            <h3 className="palma-label text-taupe-deep border-stone-deep/60 border-b pb-3">
              Creator records
            </h3>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Row term="Claimed" value={report.creators.claimed} />
              <Row term="Unclaimed" value={report.creators.unclaimed} />
              <Row term="Claims awaiting a decision" value={report.creators.claimsAwaiting} />
            </dl>
          </div>
        </div>

        <div className="border-stone-deep mt-10 border-t pt-8">
          <div className="flex flex-wrap items-baseline gap-4">
            <h3 className="palma-label text-taupe-deep">Events</h3>
            <Badge variant={report.events.live ? 'olive' : 'muted'}>
              {report.events.live ? 'Ticketing live' : 'Ticketing off'}
            </Badge>
          </div>

          {report.events.planned === 0 ? (
            <p className="text-taupe-deep mt-4 max-w-160 text-sm leading-relaxed">
              No events exist yet.
            </p>
          ) : (
            <div className="border-stone-deep mt-5 overflow-x-auto border">
              <table className="w-full min-w-140 border-collapse text-left text-sm">
                <thead className="border-stone-deep border-b">
                  <tr>
                    {['Event', 'Status', 'Capacity', 'Ticket types'].map((column) => (
                      <th key={column} scope="col" className="palma-label text-taupe-deep p-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.events.events.map((event) => (
                    <tr key={event.name} className="border-stone-deep/50 border-b last:border-none">
                      <td className="p-3">{event.name}</td>
                      <td className="text-taupe-deep p-3">{event.status}</td>
                      <td className="p-3 tabular-nums">{event.capacity ?? '—'}</td>
                      <td className="p-3 tabular-nums">{event.ticketTypes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Notice className="mt-5" title="Registrations are not a figure PALMA has">
            There is no attendee record and no registration model. Ticketing is a commercial rail
            that has never been switched on, and a ticket type with a capacity is not a person who
            signed up. Event interest becomes countable when there is somewhere for somebody to
            register, and not before. Reporting capacity as interest would be inventing a number.
          </Notice>
        </div>
      </section>

      {/* ── What PALMA will not report ──────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          What PALMA cannot report, and why
        </h2>

        <p className="text-taupe-deep mt-5 max-w-160 text-sm leading-relaxed">
          These are not missing. Each one requires either identifying a visitor or taking a third
          party&rsquo;s tooling, and PALMA does neither. They are listed so that the absence reads
          as the decision it is.
        </p>

        <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {REFUSED.map((entry) => (
            <li key={entry.term} className="border-stone-deep/60 border-t pt-4">
              <span className="font-display block text-xl leading-tight">{entry.term}</span>
              <span className="text-taupe-deep mt-2 block text-sm leading-relaxed">
                {entry.why}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Figure({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="palma-stat">
      <span className="palma-label text-taupe-deep block">{label}</span>
      <span className="font-display mt-2 block text-4xl leading-none tabular-nums">{value}</span>
      {note ? <span className="text-taupe mt-2 block text-sm">{note}</span> : null}
    </div>
  );
}

function Row({ term, value }: { term: string; value: number }) {
  return (
    <div className="border-stone-deep/50 flex items-baseline justify-between gap-4 border-b pb-3 last:border-none">
      <dt className="text-taupe-deep">{term}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function SearchTable({
  title,
  note,
  empty,
  rows,
}: {
  title: string;
  note?: string;
  empty: string;
  rows: { term: string; scope: string; searches: number; results: number | null }[];
}) {
  return (
    <div>
      <h3 className="palma-label text-taupe-deep border-stone-deep/60 border-b pb-3">{title}</h3>
      {note ? <p className="text-taupe mt-3 text-xs leading-relaxed">{note}</p> : null}

      {rows.length === 0 ? (
        <p className="text-taupe-deep mt-4 text-sm">{empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {rows.map((row) => (
            <li
              key={`${row.scope}:${row.term}`}
              className="border-stone-deep/50 flex items-baseline justify-between gap-4 border-b py-2.5 text-sm last:border-none"
            >
              <span className="min-w-0 truncate">
                {row.term}
                <span className="text-taupe palma-label ml-2">{row.scope}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {row.searches}
                <span className="text-taupe"> · {row.results ?? '—'} found</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
