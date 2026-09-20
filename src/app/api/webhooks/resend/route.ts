import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { sql } from '@/server/db/sql';
import { suppress } from '@/server/email/suppression';
import { signatureIsValid } from '@/lib/webhook-signature';

export const dynamic = 'force-dynamic';

/**
 * What became of the message, told by the provider.
 *
 * Until this existed a delivery read "sent" the moment the provider accepted
 * it, and stayed that way for ever — so an address that had been bouncing for
 * months still looked like an address PALMA was successfully writing to. That
 * is the difference between a mail log and a delivery record.
 *
 * Point the provider here:
 *
 *   https://palmaawards.com/api/webhooks/resend
 *
 * and put its signing secret in RESEND_WEBHOOK_SECRET. Without the secret the
 * route refuses everything: an unauthenticated endpoint that can mark any
 * address undeliverable is a way to cut somebody off from their own account.
 */

type ResendEvent = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
};

export async function POST(request: Request): Promise<NextResponse> {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'No RESEND_WEBHOOK_SECRET is configured.' }, { status: 503 });
  }

  const id = request.headers.get('svix-id') ?? '';
  const timestamp = request.headers.get('svix-timestamp') ?? '';
  const header = request.headers.get('svix-signature') ?? '';
  const body = await request.text();

  if (!id || !timestamp || !header) {
    return NextResponse.json({ error: 'Unsigned.' }, { status: 401 });
  }

  // A replayed delivery from days ago must not resurrect a cleared suppression.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    return NextResponse.json({ error: 'Stale.' }, { status: 401 });
  }

  if (!signatureIsValid({ secret, id, timestamp, body, header })) {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return NextResponse.json({ error: 'Unreadable.' }, { status: 400 });
  }

  const providerId = event.data?.email_id;
  const recipients = Array.isArray(event.data?.to)
    ? event.data.to
    : event.data?.to
      ? [event.data.to]
      : [];

  const settledAt = new Date();
  const status = statusFor(event.type);

  if (providerId && status) {
    // updateMany rather than update: an event for a message this deployment
    // never sent is not an error, it is somebody else's message.
    await sql`
      update "EmailDelivery"
      set
        status = ${status},
        "settledAt" = ${settledAt},
        detail = case
          when ${status} in ('bounced', 'complained') then ${describe(event)}
          else detail
        end
      where "providerId" = ${providerId}
    `;
  }

  // Only the two that mean "stop writing here". A delivery or an open is news
  // about a message; these are news about an address.
  if (event.type === 'email.bounced' || event.type === 'email.complained') {
    const hard = event.data?.bounce?.type?.toLowerCase() === 'permanent';
    for (const address of recipients) {
      await suppress({
        email: address,
        reason:
          event.type === 'email.complained' ? 'complaint' : hard ? 'hard_bounce' : 'soft_bounce',
        detail: describe(event),
        deliveryId: providerId ?? null,
      });
    }
  }

  // Always 200 once the signature checks out. A provider that gets an error
  // retries, and retrying a bounce notification helps nobody.
  return NextResponse.json({ ok: true });
}

function statusFor(type: string | undefined): 'delivered' | 'bounced' | 'complained' | null {
  switch (type) {
    case 'email.delivered':
      return 'delivered';
    case 'email.bounced':
      return 'bounced';
    case 'email.complained':
      return 'complained';
    default:
      return null;
  }
}

function describe(event: ResendEvent): string {
  if (event.type === 'email.complained') return 'The recipient reported it as spam.';
  const bounce = event.data?.bounce;
  if (!bounce) return 'The provider could not deliver it.';
  return [bounce.type, bounce.subType, bounce.message].filter(Boolean).join(' · ').slice(0, 400);
}
