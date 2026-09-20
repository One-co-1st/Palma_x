import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Where a portrait's bytes go.
 *
 * The R2 calls themselves cannot be tested here — there is no bucket to reach
 * and a mock of the S3 client would only assert that this file calls the
 * methods this file calls. What is worth pinning down is the decision in front
 * of them, because that decision is what keeps a promise: PALMA tells a
 * creator that a withdrawn portrait is deleted, and a half-configured bucket
 * is precisely the state where an upload succeeds and the matching delete
 * cannot, leaving an image PALMA believes it has removed.
 *
 * So: all four settings or none, and nothing in between counts as configured.
 */

const KEYS = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const;

const FULL: Record<(typeof KEYS)[number], string> = {
  R2_ACCOUNT_ID: 'ad2b6bd38d951c12957cf638100c4ee5',
  R2_BUCKET: '44palma',
  R2_ACCESS_KEY_ID: 'test-key-id',
  R2_SECRET_ACCESS_KEY: 'test-secret',
};

async function storageWith(env: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(env)) process.env[key] = value;

  // The module caches its decision, which is correct at runtime and wrong for
  // a test that wants to ask the question more than once.
  vi.resetModules();
  return import('@/server/services/portrait-storage');
}

const original = { ...process.env };

beforeEach(() => vi.resetModules());
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
  for (const key of KEYS) if (original[key]) process.env[key] = original[key];
});

describe('portrait storage', () => {
  it('uses the database when nothing is configured', async () => {
    const { portraitStorage, putPortrait } = await storageWith({});
    expect(portraitStorage().kind).toBe('database');

    // Null means "put it in the column", and it must not have tried to reach
    // a bucket to find that out.
    await expect(
      putPortrait({
        creatorId: 'c1',
        checksum: 'abc123',
        data: new Uint8Array([1, 2, 3]),
        contentType: 'image/webp',
      }),
    ).resolves.toBeNull();
  });

  it('uses R2 only when all four settings are present', async () => {
    const { portraitStorage } = await storageWith(FULL);
    expect(portraitStorage().kind).toBe('r2');
  });

  for (const missing of KEYS) {
    it(`falls back to the database when ${missing} is missing`, async () => {
      const partial = { ...FULL };
      delete (partial as Record<string, string>)[missing];
      const { portraitStorage } = await storageWith(partial);
      expect(portraitStorage().kind).toBe('database');
    });
  }

  it('deleting reports success when there is no bucket to delete from', async () => {
    // The caller takes the record down regardless, but it must not be told a
    // deletion failed when there was never an object.
    const { deletePortrait } = await storageWith({});
    await expect(deletePortrait('portraits/c1/abc.webp')).resolves.toBe(true);
  });

  it('reading returns nothing rather than throwing when unconfigured', async () => {
    const { getPortrait } = await storageWith({});
    await expect(getPortrait('portraits/c1/abc.webp')).resolves.toBeNull();
  });

  it('keys a portrait by creator and checksum, so a replacement is a new object', async () => {
    const { portraitObjectKey } = await storageWith({});
    const first = portraitObjectKey('creator-1', 'aaaaaaaaaaaaaaaa');
    const second = portraitObjectKey('creator-1', 'bbbbbbbbbbbbbbbb');

    expect(first).toBe('portraits/creator-1/aaaaaaaaaaaaaaaa.webp');
    expect(second).not.toBe(first);
  });

  it('names the storage in use, for the operator-facing places that say so', async () => {
    const off = await storageWith({});
    expect(off.portraitStorageLabel()).toBe('the PALMA database');

    const on = await storageWith(FULL);
    expect(on.portraitStorageLabel()).toBe('Cloudflare R2');
  });
});
