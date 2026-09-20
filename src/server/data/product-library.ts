import 'server-only';
import { sql } from '@/server/db/sql';
import { disclosureFor, productCategory } from '@/domain/product-library';

/**
 * Reading the Product Library.
 *
 * Two shapes, and the difference between them is the firewall.
 *
 * `PublicEntry` carries the verdict and the disclosure line. `DeskEntry` adds
 * the draft state and the sponsor's identity for the editor working on it.
 * Neither ever hands a sponsor a route to an editorial field, because the write
 * path does not accept one.
 */

export type PublicEntry = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  categoryLabel: string;
  /** Out of ten, to one decimal. Stored in tenths so it stays an integer. */
  verdict: number | null;
  bestFor: string;
  strengths: string[];
  limitations: string[];
  review: string;
  testedBy: string | null;
  externalUrl: string | null;
  /** Composed by PALMA, never typed by an editor or a partner. */
  disclosure: string | null;
  publishedAt: string | null;
};

export type DeskEntry = PublicEntry & {
  id: string;
  isPublished: boolean;
  sponsorId: string | null;
  sponsorName: string | null;
  updatedAt: string;
};

type Row = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  verdict: number | null;
  bestFor: string;
  strengths: string[];
  limitations: string[];
  review: string;
  testedBy: string | null;
  externalUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
  sponsorId: string | null;
  sponsorName: string | null;
};

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

function shape(row: Row): DeskEntry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: row.category,
    categoryLabel: productCategory(row.category)?.label ?? row.category,
    verdict: row.verdict === null ? null : row.verdict / 10,
    bestFor: row.bestFor,
    strengths: row.strengths,
    limitations: row.limitations,
    review: row.review,
    testedBy: row.testedBy,
    externalUrl: row.externalUrl,
    // Always composed, never read from the database, so an edit to the stored
    // text cannot soften what a reader is told.
    disclosure: disclosureFor(row.sponsorName),
    publishedAt: row.publishedAt,
    isPublished: row.isPublished,
    sponsorId: row.sponsorId,
    sponsorName: row.sponsorName,
    updatedAt: row.updatedAt,
  };
}

const FROM = sql`
  from "ProductEntry" p
  left join "Sponsor" s on s.id = p."sponsorId"
`;

const selectColumns = sql`
  select
    p.id,
    p.slug,
    p.name,
    p.brand,
    p.category,
    p.verdict,
    p."bestFor",
    p.strengths,
    p.limitations,
    p.review,
    p."testedBy",
    p."externalUrl",
    p."isPublished",
    ${isoTs('p."publishedAt"')} as "publishedAt",
    ${isoTs('p."updatedAt"')} as "updatedAt",
    p."sponsorId",
    s.name as "sponsorName"
  ${FROM}
`;

/** What the public sees. Published entries only, best verdict first. */
export async function listPublishedProducts(category?: string): Promise<PublicEntry[]> {
  const rows = await sql<Row[]>`
    ${selectColumns}
    where p."isPublished" = true
    ${category ? sql`and p.category = ${category}` : sql``}
    order by p.verdict desc, p.name asc
    limit 200
  `;
  return rows.map(shape);
}

export async function getProduct(slug: string): Promise<PublicEntry | null> {
  const [row] = await sql<Row[]>`
    ${selectColumns}
    where p.slug = ${slug}
    limit 1
  `;
  return row && row.isPublished ? shape(row) : null;
}

/** Everything, drafts included, for the desk. */
export async function listDeskProducts(): Promise<DeskEntry[]> {
  const rows = await sql<Row[]>`
    ${selectColumns}
    order by p."isPublished" asc, p."updatedAt" desc
    limit 300
  `;
  return rows.map(shape);
}

export async function getDeskProduct(id: string): Promise<DeskEntry | null> {
  const [row] = await sql<Row[]>`
    ${selectColumns}
    where p.id = ${id}
    limit 1
  `;
  return row ? shape(row) : null;
}
