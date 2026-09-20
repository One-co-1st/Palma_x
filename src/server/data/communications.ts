import 'server-only';
import { sql } from '@/server/db/sql';
import { TEMPLATE_LIST, type TemplateMeta } from '@/server/email/register';
import { MAILBOX_LIST, type Mailbox } from '@/server/email/addresses';
import { env } from '@/lib/env';
import { EMAIL_LIST_ORDER, emailList } from '@/domain/email-lists';
import { featureLive } from '@/server/features';

/**
 * What PALMA has said, and what it is able to say.
 *
 * An institution that cannot answer "did we tell them?" has not told them. The
 * delivery record exists for that question and this is what reads it.
 */

export type DeliveryRow = {
  id: string;
  template: string;
  templateName: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  detail: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type TemplateRow = TemplateMeta & {
  /** How many have gone out, ever. */
  sent: number;
  failed: number;
  suppressed: number;
  lastSentAt: string | null;
};

export type SuppressedRow = {
  id: string;
  email: string;
  reason: string;
  detail: string | null;
  createdAt: string;
};

export type CommunicationsOverview = {
  /** Is there a provider at all? Everything below is theatre without one. */
  provider: {
    configured: boolean;
    from: string;
    /** The domain PALMA writes as, which the provider has to have verified. */
    domain: string;
    /** Set while the real domain is still being verified. */
    sandboxFrom: string | null;
    /** Whether the provider can tell us what became of a message. */
    webhookConfigured: boolean;
  };
  /** Addresses PALMA has stopped writing to. */
  suppressed: SuppressedRow[];
  mailboxes: Mailbox[];
  totals: {
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    failed: number;
    suppressed: number;
    queued: number;
  };
  /** Failures first — they are the only rows anybody needs to act on. */
  failures: DeliveryRow[];
  recent: DeliveryRow[];
  templates: TemplateRow[];
  /** Subscriber counts per list, which is how campaigns are targeted. */
  lists: {
    key: string;
    confirmed: number;
    pending: number;
    unsubscribed: number;
    lastIssueAt: string | null;
  }[];
  /** Whether each list is open, which depends on its feature being live. */
  listAvailability: Record<string, boolean>;
  /** The same, shaped for the composer. */
  listsForSending: { key: string; confirmed: number; available: boolean }[];
  /** Active sponsors, for attributing a partner message. */
  activeSponsors: { id: string; name: string }[];
};

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

type DeliveryRecord = {
  id: string;
  template: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  detail: string | null;
  createdAt: string;
  sentAt: string | null;
};

const DELIVERY_COLUMNS = sql`
  id, template, "from", "to", subject, status, detail,
  ${isoTs('"createdAt"')} as "createdAt",
  ${isoTs('"sentAt"')} as "sentAt"
`;

function shape(row: DeliveryRecord): DeliveryRow {
  return {
    id: row.id,
    template: row.template,
    templateName: TEMPLATE_LIST.find((entry) => entry.key === row.template)?.name ?? row.template,
    from: row.from,
    to: row.to,
    subject: row.subject,
    status: row.status,
    detail: row.detail,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
  };
}

export async function getCommunicationsOverview(): Promise<CommunicationsOverview> {
  const [
    byStatus,
    failures,
    recent,
    byTemplate,
    lastPerTemplate,
    listCounts,
    lastIssue,
    suppressedRows,
    activeSponsors,
  ] = await Promise.all([
    sql<{ status: string; count: number }[]>`
      select status, count(*)::int as count
      from "EmailDelivery"
      group by status
    `,
    // Bounces sit with failures: both mean somebody was not told.
    sql<DeliveryRecord[]>`
      select ${DELIVERY_COLUMNS}
      from "EmailDelivery"
      where status in ('failed', 'bounced')
      order by "createdAt" desc
      limit 25
    `,
    sql<DeliveryRecord[]>`
      select ${DELIVERY_COLUMNS}
      from "EmailDelivery"
      order by "createdAt" desc
      limit 60
    `,
    sql<{ template: string; status: string; count: number }[]>`
      select template, status, count(*)::int as count
      from "EmailDelivery"
      group by template, status
    `,
    sql<{ template: string; lastSentAt: string | null }[]>`
      select template, ${isoTs('max("sentAt")')} as "lastSentAt"
      from "EmailDelivery"
      where status in ('sent', 'delivered')
      group by template
    `,
    sql<{ type: string; status: string; count: number }[]>`
      select type, status, count(*)::int as count
      from "EmailSubscription"
      group by type, status
    `,
    sql<{ type: string; lastSentAt: string | null }[]>`
      select type, ${isoTs('max("sentAt")')} as "lastSentAt"
      from "Dispatch"
      group by type
    `,
    sql<SuppressedRow[]>`
      select id, email, reason, detail, ${isoTs('"createdAt"')} as "createdAt"
      from "SuppressedAddress"
      where "clearedAt" is null
      order by "createdAt" desc
      limit 50
    `,
    sql<{ id: string; name: string }[]>`
      select id, name
      from "Sponsor"
      where status = 'active'
      order by name asc
    `,
  ]);

  // A list whose feature is switched off is not open, and the composer must
  // not offer it. Lists that stand on their own are always open.
  const availability = await Promise.all(
    EMAIL_LIST_ORDER.map(async (key) => {
      const required = emailList(key).requiresFeature;
      return [key, required ? await featureLive(required) : true] as const;
    }),
  );
  const listAvailability: Record<string, boolean> = Object.fromEntries(availability);

  const count = (rows: { status: string; count: number }[], status: string) =>
    rows.find((row) => row.status === status)?.count ?? 0;

  const templateCount = (key: string, status: string) =>
    byTemplate.find((row) => row.template === key && row.status === status)?.count ?? 0;

  const listCount = (type: string, status: string) =>
    listCounts.find((row) => row.type === type && row.status === status)?.count ?? 0;

  return {
    provider: {
      configured: Boolean(env.RESEND_API_KEY),
      from: env.EMAIL_FROM,
      domain: env.EMAIL_FROM.match(/@([^>\s]+)/)?.[1] ?? 'palmaawards.com',
      sandboxFrom: env.EMAIL_SANDBOX_FROM ?? null,
      webhookConfigured: Boolean(env.RESEND_WEBHOOK_SECRET),
    },
    suppressed: suppressedRows,
    mailboxes: MAILBOX_LIST,
    totals: {
      sent: count(byStatus, 'sent'),
      delivered: count(byStatus, 'delivered'),
      bounced: count(byStatus, 'bounced'),
      complained: count(byStatus, 'complained'),
      failed: count(byStatus, 'failed'),
      suppressed: count(byStatus, 'suppressed'),
      queued: count(byStatus, 'queued'),
    },
    failures: failures.map(shape),
    recent: recent.map(shape),
    templates: TEMPLATE_LIST.map((meta) => ({
      ...meta,
      sent: templateCount(meta.key, 'sent') + templateCount(meta.key, 'delivered'),
      failed: templateCount(meta.key, 'failed') + templateCount(meta.key, 'bounced'),
      suppressed: templateCount(meta.key, 'suppressed'),
      lastSentAt:
        lastPerTemplate.find((row) => row.template === meta.key)?.lastSentAt ?? null,
    })),
    listAvailability,
    listsForSending: EMAIL_LIST_ORDER.map((key) => ({
      key,
      confirmed: listCount(key, 'confirmed'),
      available: listAvailability[key] ?? true,
    })),
    activeSponsors,
    lists: EMAIL_LIST_ORDER.map((key) => ({
      key,
      confirmed: listCount(key, 'confirmed'),
      pending: listCount(key, 'pending'),
      unsubscribed: listCount(key, 'unsubscribed'),
      lastIssueAt: lastIssue.find((row) => row.type === key)?.lastSentAt ?? null,
    })),
  };
}
