import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/env';
import { countPage } from '@/server/services/measurement';
import { enforceRateLimit, RATE_LIMITS } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * The counter.
 *
 * A public page tells PALMA it was rendered. That is the entire protocol: one
 * pathname in, an integer incremented, nothing back.
 *
 * **Why an endpoint at all, rather than counting during the render.** Public
 * pages are cached — most revalidate hourly — so a page read a thousand times
 * in an hour renders once. Counting on render would report the cache, not the
 * readership, and a figure that is wrong in a way nobody can see is worse than
 * no figure.
 *
 * **What this endpoint is not given.** The body carries a pathname and nothing
 * else. This handler reads no cookie, no IP address, no user-agent, and sets
 * nothing in the browser. It could not identify a visitor if it were asked to,
 * which is the design rather than an accident of it.
 *
 * **Why it is safe to leave unauthenticated.** It has to be — the callers are
 * anonymous readers, and it is rate-limited so that being open is not the same
 * as being unbounded. Two properties make that acceptable. The path is checked
 * against the shapes of pages that actually exist, so this is not a way to
 * write arbitrary rows into PALMA's database. And the numbers decide nothing:
 * no honour, no shortlist, no ranking and no payment reads a page counter, so
 * inflating one buys a vandal a wrong number on an internal dashboard and
 * nothing else. It is guarded proportionately, not as if it were a vote.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Same-origin only. Not a security boundary — an origin header is trivially
  // forged by anything that is not a browser — but it costs nothing and turns
  // away the casual case of somebody else's page pointing at this one.
  const origin = request.headers.get('origin');
  if (origin && origin !== siteUrl) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let path: unknown;
  try {
    const body: unknown = await request.json();
    path = (body as { path?: unknown } | null)?.path;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof path !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Bounded, generously. The figures decide nothing, so this is not protecting
  // a result; it is protecting the database from an unauthenticated write path
  // with no ceiling. A reader will never reach it. A script will, and gets a
  // 429 with a Retry-After rather than an open tap.
  const limit = await enforceRateLimit(RATE_LIMITS.pageCount);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const counted = await countPage(path);

  // 204 rather than a body: there is nothing for the page to do with the
  // answer, and a response with no content cannot be mistaken for a tracking
  // pixel handing something back.
  return counted
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ ok: false }, { status: 400 });
}
