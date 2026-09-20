import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { Table, TBody, THead } from '@/components/ui/table';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { DispatchForm } from '@/components/operations/DispatchForm';
import { SuppressionList } from '@/components/operations/SuppressionList';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { getCommunicationsOverview } from '@/server/data/communications';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { EMAIL_LIST_VALUES } from '@/domain/email-lists';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Communications',
  description: 'What PALMA has sent, to whom, and what became of it.',
  path: '/admin/communications',
  noIndex: true,
});

const STATUS_TONE: Record<string, 'olive' | 'muted' | 'champagne' | 'default'> = {
  delivered: 'olive',
  sent: 'olive',
  bounced: 'champagne',
  complained: 'champagne',
  failed: 'champagne',
  suppressed: 'muted',
  queued: 'default',
};

export default async function CommunicationsPage() {
  const session = await requirePermission('admin:view_communications', '/admin/communications');
  const overview = await getCommunicationsOverview();
  const maySend = can(session.user.role, 'communications:send_list');

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Communications</span>
        <h1 className="text-4xl">What PALMA has said</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Every message is recorded before the provider is called, so one that failed is as visible
          here as one that arrived. An institution that cannot say whether it told someone has not
          told them.
        </p>
      </div>

      {!overview.provider.configured ? (
        <Notice className="mt-8" tone="warning" title="No mail provider is configured">
          <code className="font-mono text-xs">RESEND_API_KEY</code> is unset in this environment.
          Messages are written to the record and logged, and nobody receives them, the rows below
          read <em>suppressed</em> rather than sent, which is the truth rather than a green tick.
        </Notice>
      ) : null}

      {overview.provider.sandboxFrom ? (
        <Notice className="mt-8" tone="warning" title="Sending through a sandbox address">
          <code className="font-mono text-xs">{overview.provider.domain}</code> is not yet verified
          with the provider, so every message goes out from{' '}
          <code className="font-mono text-xs">{overview.provider.sandboxFrom}</code>, carries a
          <em> [PALMA sandbox]</em> subject and says so in its body. Replies still reach the real
          mailbox. Verify the domain at the provider and unset{' '}
          <code className="font-mono text-xs">EMAIL_SANDBOX_FROM</code>. Nothing else changes.
        </Notice>
      ) : null}

      {overview.provider.configured && !overview.provider.webhookConfigured ? (
        <Notice className="mt-8" tone="warning" title="PALMA cannot hear back from the provider">
          <code className="font-mono text-xs">RESEND_WEBHOOK_SECRET</code> is unset, so nothing
          points at <code className="font-mono text-xs">/api/webhooks/resend</code>. A message is
          recorded as <em>sent</em> the moment the provider accepts it and stays that way for ever,
          a bounce three days later is never heard, and a dead address goes on looking like one
          PALMA is successfully writing to.
        </Notice>
      ) : null}

      <div className="border-stone-deep mt-10 grid gap-10 border-b pb-10 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Accepted" value={overview.totals.sent + overview.totals.delivered} />
        <Stat label="Confirmed delivered" value={overview.totals.delivered} />
        <Stat label="Bounced" value={overview.totals.bounced + overview.totals.complained} />
        <Stat label="Failed" value={overview.totals.failed} />
        <Stat label="Not sent" value={overview.totals.suppressed} />
      </div>

      {overview.failures.length > 0 ? (
        <section className="mt-14">
          <h2 className="palma-label text-taupe-deep mb-2">Not delivered</h2>
          <p className="text-taupe mb-6 max-w-160 text-xs leading-relaxed">
            The only rows here anybody needs to act on. A failed message was never delivered, and
            the person it concerned does not know what it said, though the Dossier entry was written
            regardless, so they can still find out by looking.
          </p>
          <Table>
            <THead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Template</th>
                <th scope="col">To</th>
                <th scope="col">Why</th>
              </tr>
            </THead>
            <TBody>
              {overview.failures.map((row) => (
                <tr key={row.id}>
                  <td className="text-taupe-deep whitespace-nowrap">
                    {formatShortDate(row.createdAt)}
                  </td>
                  <td className="font-display text-base">{row.templateName}</td>
                  <td className="font-mono text-xs break-all">{row.to}</td>
                  <td className="text-taupe-deep text-sm">{row.detail ?? '—'}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </section>
      ) : null}

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-2">Addresses PALMA has stopped writing to</h2>
        <p className="text-taupe mb-6 max-w-160 text-xs leading-relaxed">
          An address goes on this list when the provider says it bounced, or its holder reported
          PALMA as spam. Continuing to write to a dead address is how a sending domain&rsquo;s
          reputation is destroyed, which ends with PALMA&rsquo;s mail in everybody&rsquo;s spam
          folder, so the first job of a bounce is to stop the next message.
        </p>
        <div className="max-w-160">
          <SuppressionList rows={overview.suppressed} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-2">The template register</h2>
        <p className="text-taupe mb-6 max-w-160 text-xs leading-relaxed">
          Every message PALMA is capable of sending. A template marked <em>always</em> is a security
          notice, a decision about somebody&rsquo;s own record, or something they asked for seconds
          ago. Those are sent whatever the recipient&rsquo;s preferences say, because an account
          that can mute the news that its honour was revoked is not being kept informed.
        </p>
        <Table>
          <THead>
            <tr>
              <th scope="col">Template</th>
              <th scope="col">From</th>
              <th scope="col">Gate</th>
              <th scope="col">Sent</th>
              <th scope="col">Last</th>
            </tr>
          </THead>
          <TBody>
            {overview.templates.map((template) => (
              <tr key={template.key}>
                <td>
                  <span className="font-display text-base">{template.name}</span>
                  <span className="text-taupe mt-1 block max-w-100 text-xs leading-relaxed">
                    {template.purpose}
                  </span>
                </td>
                <td className="text-taupe-deep font-mono text-xs break-all">{template.mailbox}</td>
                <td>
                  <Badge variant={template.gate === 'always' ? 'olive' : 'muted'}>
                    {template.gate === 'always' ? 'Always' : 'Optional'}
                  </Badge>
                </td>
                <td className="text-taupe-deep">
                  {template.sent}
                  {template.failed > 0 ? (
                    <span className="text-champagne-deep"> · {template.failed} failed</span>
                  ) : null}
                </td>
                <td className="text-taupe-deep whitespace-nowrap">
                  {template.lastSentAt ? formatShortDate(template.lastSentAt) : '—'}
                </td>
              </tr>
            ))}
          </TBody>
        </Table>
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-2">The lists</h2>
        <p className="text-taupe mb-6 max-w-160 text-xs leading-relaxed">
          Five lists, each separately opt-in and separately opt-out. A campaign is targeted at one
          of them and only one: there is no segment builder, because the moment an interface can
          assemble an audience out of anything but consent, it will eventually assemble one that
          includes somebody who opted out.
        </p>

        <Table>
          <THead>
            <tr>
              <th scope="col">List</th>
              <th scope="col">Subscribers</th>
              <th scope="col">Awaiting</th>
              <th scope="col">Left</th>
              <th scope="col">Last sent</th>
              <th scope="col">State</th>
            </tr>
          </THead>
          <TBody>
            {overview.lists.map((row) => {
              const meta = EMAIL_LIST_VALUES.find((entry) => entry.key === row.key);
              const available = overview.listAvailability[row.key] ?? true;
              return (
                <tr key={row.key}>
                  <td>
                    <span className="font-display text-base">{meta?.name ?? row.key}</span>
                    <span className="text-taupe mt-1 block max-w-100 text-xs leading-relaxed">
                      {meta?.description}
                    </span>
                  </td>
                  <td className="text-taupe-deep">{row.confirmed}</td>
                  <td className="text-taupe-deep">{row.pending}</td>
                  <td className="text-taupe-deep">{row.unsubscribed}</td>
                  <td className="text-taupe-deep whitespace-nowrap">
                    {row.lastIssueAt ? formatShortDate(row.lastIssueAt) : '—'}
                  </td>
                  <td>
                    <Badge variant={available ? 'olive' : 'muted'}>
                      {available ? 'Open' : 'Switched off'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </TBody>
        </Table>

        {maySend ? (
          <div className="mt-10 max-w-160">
            <h3 className="palma-label text-taupe-deep mb-5">Write to a list</h3>
            <DispatchForm lists={overview.listsForSending} sponsors={overview.activeSponsors} />
          </div>
        ) : (
          <p className="text-taupe mt-6 text-sm">
            Writing to a list is a super administrator&rsquo;s action.
          </p>
        )}
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">Recent</h2>
        {overview.recent.length === 0 ? (
          <EmptyState
            title="Nothing sent yet"
            description="Messages appear here the moment PALMA writes one, whether or not it reaches anybody."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Template</th>
                <th scope="col">To</th>
                <th scope="col">Status</th>
              </tr>
            </THead>
            <TBody>
              {overview.recent.map((row) => (
                <tr key={row.id}>
                  <td className="text-taupe-deep whitespace-nowrap">
                    {formatShortDate(row.createdAt)}
                  </td>
                  <td className="font-display text-base">{row.templateName}</td>
                  <td className="font-mono text-xs break-all">{row.to}</td>
                  <td>
                    <Badge variant={STATUS_TONE[row.status] ?? 'default'}>
                      {titleCase(row.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">The mailboxes</h2>
        <dl className="flex flex-col">
          {overview.mailboxes.map((mailbox) => (
            <div
              key={mailbox.key}
              className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-4"
            >
              <dt className="font-mono text-sm break-all">{mailbox.address}</dt>
              <dd className="text-taupe-deep max-w-100 text-sm">{mailbox.purpose}</dd>
            </div>
          ))}
        </dl>
        <p className="text-taupe mt-5 max-w-160 text-xs leading-relaxed">
          There is no noreply@. Every address PALMA writes from accepts replies, and the one moment
          a person most needs to reply is the moment something has gone wrong.
        </p>
      </section>
    </>
  );
}
