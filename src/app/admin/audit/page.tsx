import Link from 'next/link';
import { EmptyState } from '@/components/ui/feedback';
import { Table, TBody, THead } from '@/components/ui/table';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listAuditLog } from '@/server/data/admin';
import { AUDIT_ACTIONS } from '@/server/audit';
import { cn, titleCase } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'Audit log',
  description: 'The PALMA audit log.',
  path: '/admin/audit',
  noIndex: true,
});

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requirePermission('admin:view_audit_log', '/admin/audit');
  const { action } = await searchParams;
  const entries = await listAuditLog({ action, limit: 200 });

  return (
    <>
      <h1 className="text-3xl">Audit log</h1>
      <p className="text-taupe-deep mt-3 max-w-160 leading-relaxed">
        Append-only. Every action that changes the institutional record is written here with the
        actor, the entity, and the state before and after. Nothing in PALMA can be changed quietly.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/audit"
          className={cn(
            'palma-chip palma-label rounded-full border px-3.5 py-2',
            !action ? 'border-ink bg-ink text-ivory' : 'border-stone-deep text-taupe-deep',
          )}
        >
          All
        </Link>
        {AUDIT_ACTIONS.slice(0, 14).map((entry) => (
          <Link
            key={entry}
            href={`/admin/audit?action=${entry}`}
            className={cn(
              'palma-chip palma-label rounded-full border px-3.5 py-2',
              action === entry
                ? 'border-ink bg-ink text-ivory'
                : 'border-stone-deep text-taupe-deep',
            )}
          >
            {entry}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No entries"
          description="Nothing has been recorded yet."
        />
      ) : (
        <div className="mt-10">
          <Table>
            <THead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Actor</th>
                <th scope="col">Summary</th>
              </tr>
            </THead>
            <TBody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="text-taupe-deep whitespace-nowrap">
                    {new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="font-mono text-xs">{entry.action}</td>
                  <td className="text-taupe-deep">
                    {entry.entityType}
                    <span className="text-taupe block font-mono text-xs">{entry.entityId}</span>
                  </td>
                  <td className="text-taupe-deep">
                    {entry.actorLabel ?? 'System'}
                    {entry.actorRole ? (
                      <span className="text-taupe block text-xs">{titleCase(entry.actorRole)}</span>
                    ) : null}
                  </td>
                  <td>{entry.summary ?? '—'}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
