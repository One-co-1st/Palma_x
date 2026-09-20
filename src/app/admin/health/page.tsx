import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getSystemHealth, STATE_LABEL, type ServiceState } from '@/server/data/system-health';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'System health',
  description: 'PALMA infrastructure.',
  path: '/admin/health',
  noIndex: true,
});

const TONE: Record<ServiceState, string> = {
  operational: 'text-olive',
  degraded: 'text-champagne-deep',
  down: 'text-red-900',
  not_configured: 'text-taupe',
};

function Dot({ state }: { state: ServiceState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-1.5 inline-block size-2 shrink-0 rounded-full',
        state === 'operational' && 'bg-olive',
        state === 'degraded' && 'bg-champagne-deep',
        state === 'down' && 'bg-red-900',
        state === 'not_configured' && 'bg-stone-deep',
      )}
    />
  );
}

export default async function SystemHealthPage() {
  await requirePermission('admin:manage_system', '/admin/health');
  const health = await getSystemHealth();

  const worst = health.services.some((service) => service.state === 'down')
    ? 'down'
    : health.services.some((service) => service.state === 'degraded')
      ? 'degraded'
      : health.services.some((service) => service.state === 'not_configured')
        ? 'not_configured'
        : 'operational';

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">System</span>
        <h1 className="text-4xl">Health</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Every check here either measures something real or says plainly that it is not wired up. A
          green tick against a service PALMA cannot actually reach is worse than no panel, because
          it gets believed.
        </p>
        <p className={cn('palma-label mt-2', TONE[worst])}>
          {worst === 'operational'
            ? 'All services operational'
            : `Attention required, ${STATE_LABEL[worst].toLowerCase()}`}
          <span className="text-taupe ml-3 font-normal normal-case">
            checked {new Date(health.checkedAt).toISOString().slice(11, 19)} UTC
          </span>
        </p>
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-7">
          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Infrastructure
            </h2>
            <ul className="flex flex-col">
              {health.services.map((service) => (
                <li
                  key={service.name}
                  className="border-stone-deep/60 flex gap-4 border-b py-4 last:border-none"
                >
                  <Dot state={service.state} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="font-display text-lg">{service.name}</span>
                      <span className={cn('palma-label', TONE[service.state])}>
                        {STATE_LABEL[service.state]}
                      </span>
                      {service.latencyMs !== undefined ? (
                        <span className="text-taupe text-xs tabular-nums">
                          {service.latencyMs} ms
                        </span>
                      ) : null}
                    </div>
                    <p className="text-taupe-deep text-sm leading-relaxed">{service.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Background work
            </h2>
            <ul className="flex flex-col">
              {health.jobs.map((job) => (
                <li
                  key={job.name}
                  className="border-stone-deep/60 flex gap-4 border-b py-4 last:border-none"
                >
                  <Dot state={job.state} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="font-display text-lg">{job.name}</span>
                      <span className={cn('palma-label', TONE[job.state])}>
                        {STATE_LABEL[job.state]}
                      </span>
                    </div>
                    <p className="text-taupe-deep text-sm leading-relaxed">{job.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-14 lg:col-span-5">
          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Stored rows
            </h2>
            <dl className="flex flex-col">
              {health.storage.map((entry) => (
                <div
                  key={entry.table}
                  className="border-stone-deep/60 flex items-baseline justify-between gap-4 border-b py-2.5 text-sm last:border-none"
                >
                  <dt className="text-taupe-deep font-mono text-xs">{entry.table}</dt>
                  <dd className="tabular-nums">
                    {new Intl.NumberFormat('en-GB').format(entry.rows)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Consequential events
            </h2>
            {health.recentFailures.length === 0 ? (
              <p className="text-taupe mt-5 text-sm leading-relaxed">
                No rejections, refusals or revocations recorded.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {health.recentFailures.map((entry, index) => (
                  <li
                    key={`${entry.action}-${index}`}
                    className="border-stone-deep/60 flex flex-col gap-1 border-b py-3 last:border-none"
                  >
                    <span className="palma-label text-taupe-deep">
                      {entry.action.replace(/[._]/g, ' ')}
                    </span>
                    <span className="text-taupe-deep text-sm leading-relaxed">
                      {entry.summary ?? '—'}
                    </span>
                    <span className="text-taupe text-xs">{formatDate(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
