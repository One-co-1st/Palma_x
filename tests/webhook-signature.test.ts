import { describe, expect, it } from 'vitest';
import { signPayload, signatureIsValid } from '@/lib/webhook-signature';

const SECRET = 'whsec_' + Buffer.from('a-webhook-signing-secret').toString('base64');
const ID = 'msg_2abc';
const TIMESTAMP = '1700000000';
const BODY = JSON.stringify({ type: 'email.bounced', data: { email_id: 'e1' } });

/**
 * This guards an endpoint that can mark any address undeliverable, so a forged
 * event would be a way to cut somebody off from their own account. These are
 * the ways somebody would try.
 */
describe('the provider webhook signature', () => {
  it('accepts one PALMA would have produced', () => {
    const header = signPayload(SECRET, ID, TIMESTAMP, BODY);
    expect(
      signatureIsValid({ secret: SECRET, id: ID, timestamp: TIMESTAMP, body: BODY, header }),
    ).toBe(true);
  });

  it('accepts either signature while a secret is being rotated', () => {
    const other = 'whsec_' + Buffer.from('the-next-secret').toString('base64');
    const header = `${signPayload(other, ID, TIMESTAMP, BODY)} ${signPayload(SECRET, ID, TIMESTAMP, BODY)}`;
    expect(
      signatureIsValid({ secret: SECRET, id: ID, timestamp: TIMESTAMP, body: BODY, header }),
    ).toBe(true);
  });

  it('refuses a body that was edited after signing', () => {
    const header = signPayload(SECRET, ID, TIMESTAMP, BODY);
    const tampered = JSON.stringify({ type: 'email.bounced', data: { email_id: 'e2' } });
    expect(
      signatureIsValid({ secret: SECRET, id: ID, timestamp: TIMESTAMP, body: tampered, header }),
    ).toBe(false);
  });

  it('refuses a signature bound to a different message id or timestamp', () => {
    const header = signPayload(SECRET, ID, TIMESTAMP, BODY);
    expect(
      signatureIsValid({
        secret: SECRET,
        id: 'msg_other',
        timestamp: TIMESTAMP,
        body: BODY,
        header,
      }),
    ).toBe(false);
    expect(
      signatureIsValid({ secret: SECRET, id: ID, timestamp: '1700000001', body: BODY, header }),
    ).toBe(false);
  });

  it('refuses a signature made with another secret', () => {
    const header = signPayload(
      'whsec_' + Buffer.from('wrong').toString('base64'),
      ID,
      TIMESTAMP,
      BODY,
    );
    expect(
      signatureIsValid({ secret: SECRET, id: ID, timestamp: TIMESTAMP, body: BODY, header }),
    ).toBe(false);
  });

  it('refuses nonsense rather than throwing', () => {
    for (const header of ['', 'garbage', 'v1,', 'v1,!!!not-base64!!!', 'v2,abc']) {
      expect(
        signatureIsValid({ secret: SECRET, id: ID, timestamp: TIMESTAMP, body: BODY, header }),
      ).toBe(false);
    }
  });

  it('refuses an empty secret', () => {
    const header = signPayload(SECRET, ID, TIMESTAMP, BODY);
    expect(signatureIsValid({ secret: '', id: ID, timestamp: TIMESTAMP, body: BODY, header })).toBe(
      false,
    );
  });
});
