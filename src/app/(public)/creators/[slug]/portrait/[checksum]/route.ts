import { NextResponse } from 'next/server';
import { sql } from '@/server/db/sql';
import { getPortrait } from '@/server/services/portrait-storage';

/**
 * Serving a portrait.
 *
 * The checksum is in the path rather than a query string, which buys two
 * things: the URL is immutable, so it can be cached for a year by anything
 * that sees it; and replacing a portrait produces a different URL, so no cache
 * anywhere is left holding an image the creator has taken down.
 *
 * A withdrawn portrait is never served, and in practice cannot be: withdrawing
 * one deletes the bytes, so the row it leaves behind holds a reason and
 * nothing renderable.
 *
 * The bytes come from R2 when R2 is configured and from the database column
 * when it is not, and the reader cannot tell which — deliberately. This route
 * staying in front of the bucket is what lets PALMA refuse to serve a
 * withdrawn portrait even in the case where the delete against R2 failed: the
 * database row decides, and the bucket is only where the bytes happen to sit.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; checksum: string }> },
): Promise<NextResponse> {
  const { slug, checksum } = await params;

  const [portrait] = await sql<
    { data: Uint8Array | null; storageKey: string | null; contentType: string; byteSize: number }[]
  >`
    select p.data, p."storageKey", p."contentType", p."byteSize"
    from "CreatorPortrait" p
    join "Creator" c on c.id = p."creatorId"
    where p.status = 'published'
      and p.checksum = ${checksum}
      and c.slug = ${slug}
      and c."isPublished" = true
    limit 1
  `;

  // A mismatched checksum is a stale URL rather than an error worth explaining.
  if (!portrait || portrait.byteSize === 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const bytes = portrait.storageKey ? await getPortrait(portrait.storageKey) : portrait.data;

  // The row says there are bytes and there are not: an object storage outage,
  // or a key that no longer resolves. Not found is the honest answer, and it
  // is not cached, so the image returns when the bucket does.
  if (!bytes) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': portrait.contentType,
      'Content-Length': String(bytes.byteLength),
      // Immutable: the checksum is part of the path, so these bytes can never
      // change at this URL.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
