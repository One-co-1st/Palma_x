import { describe, expect, it } from 'vitest';
import { createId } from '@/server/db/ids';

describe('createId', () => {
  it('mints unique url-safe string ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) {
      expect(id).toMatch(/^c[a-z0-9_-]+$/i);
      expect(id.length).toBeGreaterThanOrEqual(16);
      expect(id.length).toBeLessThanOrEqual(25);
    }
  });
});
