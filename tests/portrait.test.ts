import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  portraitPath,
  preparePortrait,
} from '@/server/services/portrait';

async function image(width: number, height: number, options: { exif?: boolean } = {}) {
  let pipeline = sharp({
    create: { width, height, channels: 3, background: { r: 74, g: 81, b: 72 } },
  }).jpeg({ quality: 90 });

  if (options.exif) {
    pipeline = pipeline.withMetadata({
      exif: { IFD0: { Artist: 'Someone', Copyright: 'Somewhere' } },
    });
  }

  const buffer = await pipeline.toBuffer();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * A portrait is the one thing a creator sends PALMA that is a file rather than
 * text, which makes it the one place where metadata, decompression bombs and
 * polyglot files arrive. These assert the handling rather than trust it.
 */
describe('preparing a portrait', () => {
  it('throws away the metadata that came with the file', async () => {
    const source = await image(900, 1200, { exif: true });
    // The source really does carry EXIF, or this test proves nothing.
    expect((await sharp(Buffer.from(source)).metadata()).exif).toBeTruthy();

    const result = await preparePortrait({ bytes: source, declaredType: 'image/jpeg' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = await sharp(Buffer.from(result.portrait.data)).metadata();
    expect(stored.exif, 'EXIF survived — a phone photo carries GPS').toBeUndefined();
    expect(stored.xmp).toBeUndefined();
    expect(stored.icc).toBeUndefined();
  });

  it('produces a square, whatever shape arrived', async () => {
    for (const [width, height] of [
      [900, 1200],
      [1600, 1600],
      [3000, 1000],
      [240, 300],
    ] as const) {
      const result = await preparePortrait({
        bytes: await image(width, height),
        declaredType: 'image/jpeg',
      });
      expect(result.ok, `${width}×${height} was refused`).toBe(true);
      if (!result.ok) continue;
      expect(result.portrait.width, `${width}×${height} came out oblong`).toBe(
        result.portrait.height,
      );
    }
  });

  it('never upscales a small portrait into a blurry large one', async () => {
    const result = await preparePortrait({
      bytes: await image(240, 300),
      declaredType: 'image/jpeg',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.portrait.width).toBe(240);
  });

  it('re-encodes everything to one format', async () => {
    const result = await preparePortrait({
      bytes: await image(800, 800),
      declaredType: 'image/jpeg',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.portrait.contentType).toBe('image/webp');
  });

  it('refuses an image too small to render', async () => {
    const result = await preparePortrait({
      bytes: await image(120, 120),
      declaredType: 'image/jpeg',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('200');
  });

  it('refuses a type PALMA does not take', async () => {
    const result = await preparePortrait({
      bytes: await image(800, 800),
      declaredType: 'image/svg+xml',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses something that is not an image at all', async () => {
    const bytes = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
    const result = await preparePortrait({
      bytes: bytes.buffer.slice(0) as ArrayBuffer,
      // Claiming to be a PNG does not make it one.
      declaredType: 'image/png',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses an empty file', async () => {
    const result = await preparePortrait({
      bytes: new ArrayBuffer(0),
      declaredType: 'image/jpeg',
    });
    expect(result.ok).toBe(false);
  });

  it('gives every stored portrait a checksum of its own bytes', async () => {
    const one = await preparePortrait({
      bytes: await image(800, 800),
      declaredType: 'image/jpeg',
    });
    const two = await preparePortrait({
      bytes: await image(600, 600),
      declaredType: 'image/jpeg',
    });
    expect(one.ok && two.ok).toBe(true);
    if (!one.ok || !two.ok) return;
    expect(one.portrait.checksum).not.toBe(two.portrait.checksum);
    expect(one.portrait.checksum).toHaveLength(16);
  });
});

describe('the serving path', () => {
  it('carries the checksum, so a replaced portrait is a different URL', () => {
    expect(portraitPath('maya-rivers', 'abc123')).toBe('/creators/maya-rivers/portrait/abc123');
    expect(portraitPath('maya-rivers', 'abc123')).not.toBe(portraitPath('maya-rivers', 'def456'));
  });
});

describe('the limits PALMA publishes', () => {
  it('takes the formats a browser actually produces', () => {
    expect(ACCEPTED_UPLOAD_TYPES).toContain('image/jpeg');
    expect(ACCEPTED_UPLOAD_TYPES).toContain('image/png');
    expect(ACCEPTED_UPLOAD_TYPES).toContain('image/webp');
    expect(ACCEPTED_UPLOAD_TYPES).toContain('image/avif');
  });

  it('never takes a vector, which is a document that can run', () => {
    expect(ACCEPTED_UPLOAD_TYPES as readonly string[]).not.toContain('image/svg+xml');
  });

  it('is generous enough for a phone photograph', () => {
    expect(MAX_UPLOAD_BYTES).toBeGreaterThanOrEqual(4 * 1024 * 1024);
  });
});
