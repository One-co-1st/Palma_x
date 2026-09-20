import 'server-only';
import { env } from '@/lib/env';

/**
 * The wire.
 *
 * A thin, dependency-free client over the Resend REST API rather than another
 * package in the tree. Nothing in the application calls this directly — every
 * message goes through `dispatch`, which records it first. This file's only
 * job is to hand a finished message to the provider and report honestly what
 * happened to it.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Which voice is writing: `PALMA Concierge <concierge@palmaawards.com>`. */
  from?: string;
  /** Shown to the recipient's client as the address a reply would go to. */
  replyTo?: string;
  /**
   * Gazette mail only. Gmail and Outlook put a one-click unsubscribe beside the
   * sender when these headers are present, and a reader who can leave in one
   * click is a reader who does not report you as spam instead.
   */
  unsubscribeUrl?: string;
};

export type EmailResult =
  | {
      ok: true;
      id: string | null;
      delivered: boolean;
      /** True when it went out from the sandbox sender rather than as PALMA. */
      sandboxed?: boolean;
    }
  | { ok: false; error: string };

const ENDPOINT = 'https://api.resend.com/emails';

/**
 * Sending while the domain is still being verified.
 *
 * A provider will not let you send as `laurels@palmaawards.com` until the DNS
 * records prove you own palmaawards.com — correctly, since otherwise anyone
 * could. That leaves a real gap between "the key works" and "PALMA can write to
 * people", and during it every message fails on an error about DNS.
 *
 * `EMAIL_SANDBOX_FROM` bridges it: messages go out from a provider-supplied
 * address while the real reply-to is preserved, so the whole pipeline can be
 * exercised for real. Two deliberate properties — it is opt-in by environment
 * variable, and it announces itself in the message rather than quietly
 * impersonating the institution. A test email that looks exactly like the real
 * thing is how a test email ends up forwarded to a creator.
 *
 * Unset it the moment the domain verifies. Nothing else changes.
 */
function sandboxNotice(intendedFrom: string): string {
  return [
    '',
    ', , , ',
    `Sent through PALMA's sandbox sender because the palmaawards.com domain is`,
    `not yet verified with the mail provider. In production this message comes`,
    `from ${intendedFrom}.`,
  ].join('\n');
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) {
    // Development without a key: the message is logged, never silently dropped,
    // and the caller is told it was not delivered.
    if (env.NODE_ENV === 'production') {
      return { ok: false, error: 'RESEND_API_KEY is not configured.' };
    }
    console.info(
      `\n[palma:email] (not sent, no RESEND_API_KEY)\n  from: ${message.from || env.EMAIL_FROM}\n  to: ${message.to}\n  subject: ${message.subject}\n  ${message.text.replace(/\n/g, '\n  ')}\n`,
    );
    return { ok: true, id: null, delivered: false };
  }

  const intendedFrom = message.from || env.EMAIL_FROM;
  const sandboxed = Boolean(env.EMAIL_SANDBOX_FROM);
  const from = env.EMAIL_SANDBOX_FROM || intendedFrom;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: sandboxed ? `[PALMA sandbox] ${message.subject}` : message.subject,
        text: sandboxed ? message.text + sandboxNotice(intendedFrom) : message.text,
        ...(message.html ? { html: message.html } : {}),
        // The reply address is the real mailbox even in the sandbox: a person
        // who replies to a test message should still reach a person.
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.unsubscribeUrl
          ? {
              headers: {
                'List-Unsubscribe': `<${message.unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }
          : {}),
      }),
      // A nomination should not hang on a slow provider.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => '');
      console.error('[palma:email] Resend rejected the message', response.status, raw);
      return { ok: false, error: explain(response.status, raw, intendedFrom) };
    }

    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body.id ?? null, delivered: true, sandboxed };
  } catch (error) {
    console.error('[palma:email] Resend request failed', error);
    return { ok: false, error: 'The provider could not be reached.' };
  }
}

/**
 * Turn the provider's refusal into something an operator can act on.
 *
 * "The provider refused the message (403)" tells nobody anything. The two
 * refusals that actually happen in practice — an unverified sending domain and
 * a bad key — each have exactly one fix, and the delivery record should name
 * it rather than make somebody go and read a log.
 */
export function explain(status: number, raw: string, intendedFrom: string): string {
  let message = '';
  try {
    message = (JSON.parse(raw) as { message?: string }).message ?? '';
  } catch {
    message = raw.slice(0, 200);
  }

  if (/domain is not verified/i.test(message)) {
    const domain = intendedFrom.match(/@([^>\s]+)/)?.[1] ?? 'the sending domain';
    return `${domain} is not verified with the mail provider, so it will not send as ${intendedFrom}. Add the domain and its DNS records at the provider, or set EMAIL_SANDBOX_FROM to send from a provider address meanwhile.`;
  }

  if (status === 401 || status === 403) {
    return message
      ? `The provider refused the key: ${message}`
      : 'The provider refused the API key.';
  }

  if (status === 422) {
    return message ? `The provider rejected the message: ${message}` : 'The message was malformed.';
  }

  if (status === 429) {
    return 'The provider is rate-limiting PALMA. The message was not sent.';
  }

  return message
    ? `The provider refused the message (${status}): ${message}`
    : `The provider refused the message (${status}).`;
}
