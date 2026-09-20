import { NextResponse } from 'next/server';
import { listCreators } from '@/server/data/queries';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Creator lookup for the nomination form.
 *
 * Public and deliberately thin: it returns only what is already published on a
 * creator's profile page, and nothing that could be mined — no counts, no
 * verification detail beyond the badge the profile already shows.
 */
export async function GET(request: Request) {
  const limit = await enforceRateLimit(RATE_LIMITS.creatorSearch);
  if (!limit.allowed) {
    return NextResponse.json(
      { creators: [], error: 'Too many searches. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) return NextResponse.json({ creators: [] });

  const creators = await listCreators({ query: query.slice(0, 80), limit: 8 });

  return NextResponse.json(
    {
      creators: creators.map((creator) => ({
        slug: creator.slug,
        displayName: creator.displayName,
        countryCode: creator.countryCode,
        headline: creator.headline,
        verified: creator.verificationStatus === 'verified',
      })),
    },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}
