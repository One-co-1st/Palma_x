import { NextResponse } from 'next/server';
import { constantTimeEquals } from '@/lib/crypto';
import { env } from '@/lib/env';
import { runRetentionSweep } from '@/server/services/retention';

export const dynamic = 'force-dynamic';

/**
 * The scheduled sweep.
 *
 * Guarded by a shared secret in the Authorization header rather than by a
 * session, because a scheduler has no session. Without `CRON_SECRET` set the
 * route refuses everything — an unauthenticated endpoint that deletes rows is
 * worse than no endpoint at all, so this fails closed.
 *
 * Point any scheduler at it daily:
 *
 *   curl -fsS -X POST https://palmaawards.com/api/cron/retention \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'No CRON_SECRET is configured. The sweep cannot be triggered remotely.' },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const offered = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!offered || !constantTimeEquals(offered, secret)) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }

  const result = await runRetentionSweep({ label: 'scheduler' });

  return NextResponse.json(result);
}
