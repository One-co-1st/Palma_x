import 'server-only';
import { sql } from '@/server/db/sql';

/**
 * The Dossier.
 *
 * Everything PALMA has told this account, kept — decisions, honours, security
 * notices, the lot. It is written by `dispatch` whether or not the matching
 * email went out, so a muted channel or a bounced address never costs somebody
 * the knowledge that their honour was revoked.
 *
 * It is a record, not a feed. Nothing here is social: no likes, no comments,
 * no counts of who saw what. An entry appears because the institution did
 * something that concerns you.
 */

export type DossierEntry = {
  id: string;
  kind: string;
  subject: string;
  body: string;
  href: string | null;
  isImportant: boolean;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type Dossier = {
  entries: DossierEntry[];
  unread: number;
  /** Unread entries PALMA will not let an account dismiss without reading. */
  unreadImportant: number;
  archived: number;
};

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

export async function getDossier(
  userId: string,
  options: { archived?: boolean; take?: number } = {},
): Promise<Dossier> {
  const archived = options.archived ?? false;

  const [rows, [unread], [unreadImportant], [archivedCount]] = await Promise.all([
    sql<DossierEntry[]>`
      select
        id, kind, subject, body, href, "isImportant",
        ${isoTs('"readAt"')} as "readAt",
        ${isoTs('"archivedAt"')} as "archivedAt",
        ${isoTs('"createdAt"')} as "createdAt"
      from "Notification"
      where "userId" = ${userId}
        and ${archived ? sql`"archivedAt" is not null` : sql`"archivedAt" is null`}
      order by "createdAt" desc
      limit ${options.take ?? 100}
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Notification"
      where "userId" = ${userId} and "readAt" is null and "archivedAt" is null
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Notification"
      where "userId" = ${userId} and "readAt" is null and "archivedAt" is null
        and "isImportant" = true
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Notification"
      where "userId" = ${userId} and "archivedAt" is not null
    `,
  ]);

  return {
    entries: rows,
    unread: unread.count,
    unreadImportant: unreadImportant.count,
    archived: archivedCount.count,
  };
}

/**
 * The one number every surface shows.
 *
 * Deliberately two counts rather than one: an account with three unread
 * announcements and an unread revocation is not in the same position as an
 * account with four unread announcements, and a single badge cannot say so.
 */
export async function getDossierBadge(
  userId: string,
): Promise<{ unread: number; important: number }> {
  const [[unread], [important]] = await Promise.all([
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Notification"
      where "userId" = ${userId} and "readAt" is null and "archivedAt" is null
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Notification"
      where "userId" = ${userId} and "readAt" is null and "archivedAt" is null
        and "isImportant" = true
    `,
  ]);
  return { unread: unread.count, important: important.count };
}
