import 'server-only';
import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';
import { createHash } from 'node:crypto';

/**
 * Preparing a portrait.
 *
 * PALMA never stores the file that was uploaded. It decodes it, throws away
 * everything that is not pixels, resizes it and re-encodes it — and the
 * original is never written to disk or to the database.
 *
 * The metadata is the part that matters. A photograph taken on a phone carries
 * GPS coordinates, a device serial, a timestamp and sometimes the owner's name.
 * A creator uploading a headshot is not consenting to publish where they live,
 * and PALMA has just finished writing a privacy notice promising it holds no
 * location finer than a country. Sharp discards metadata unless you ask for it
 * back, so the important line in this file is the one that is absent:
 * `.withMetadata()` is never called, anywhere, for any reason.
 *
 * Re-encoding also settles the security question. A polyglot file that is
 * valid image and valid script does not survive being decoded to a pixel
 * buffer and written out again as WebP.
 */

/** What a browser may send. Anything else is refused rather than sniffed. */
export const ACCEPTED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

/** Generous for a phone photograph, small enough that a mistake is cheap. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** The largest PALMA renders a portrait, doubled for high-density screens. */
const MAX_EDGE = 1024;

/** A portrait smaller than this cannot be rendered without looking broken. */
const MIN_EDGE = 200;

export type PreparedPortrait = {
  /**
   * The `bytea` column takes a `Uint8Array<ArrayBuffer>`. A Node Buffer is
   * backed by `ArrayBufferLike`, which could in principle be a
   * SharedArrayBuffer, so it is copied into a plain one rather than cast.
   */
  data: Uint8Array<ArrayBuffer>;
  contentType: string;
  width: number;
  height: number;
  byteSize: number;
  checksum: string;
};

export type PrepareResult =
  { ok: true; portrait: PreparedPortrait } | { ok: false; reason: string };

export async function preparePortrait(input: {
  bytes: ArrayBuffer;
  declaredType: string;
}): Promise<PrepareResult> {
  if (input.bytes.byteLength === 0) {
    return { ok: false, reason: 'That file is empty.' };
  }

  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `That image is ${Math.round(input.bytes.byteLength / 1024 / 1024)}MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
    };
  }

  if (!(ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(input.declaredType)) {
    return { ok: false, reason: 'PALMA takes JPEG, PNG, WebP and AVIF images.' };
  }

  const source = Buffer.from(input.bytes);

  let pipeline: Sharp;
  let metadata: Metadata;

  try {
    // `limitInputPixels` refuses a decompression bomb: a small file that
    // decodes to a gigapixel buffer and takes the server down with it.
    pipeline = sharp(source, { limitInputPixels: 40_000_000, animated: false });
    metadata = await pipeline.metadata();
  } catch {
    return { ok: false, reason: 'PALMA could not read that as an image.' };
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width < MIN_EDGE || height < MIN_EDGE) {
    return {
      ok: false,
      reason: `That image is ${width}×${height}. A portrait needs to be at least ${MIN_EDGE}×${MIN_EDGE}.`,
    };
  }

  // The declared type is a claim by the browser; this is what it actually is.
  if (!metadata.format || !['jpeg', 'png', 'webp', 'avif'].includes(metadata.format)) {
    return { ok: false, reason: 'That file is not one of the image formats PALMA takes.' };
  }

  // A square, and genuinely square: the edge is the largest that neither
  // upscales nor exceeds what PALMA renders. Asking for 1024×1024 with
  // `withoutEnlargement` quietly returns 900×1024 for a 900×1200 source, which
  // then looks correct only because CSS crops it — and looks wrong the moment
  // anyone uses the file anywhere else.
  //
  // A record is a set of portraits at one size. A page of mixed crops is a
  // directory.
  const edge = Math.min(MAX_EDGE, width, height);

  let data: Buffer;
  try {
    data = await pipeline
      // Orientation first: apply the EXIF rotation tag, then let it go with
      // the rest of the metadata rather than shipping a sideways portrait.
      .rotate()
      .resize(edge, edge, {
        fit: 'cover',
        position: sharp.strategy.attention,
      })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
  } catch {
    return { ok: false, reason: 'PALMA could not process that image.' };
  }

  const finished = await sharp(data).metadata();

  return {
    ok: true,
    portrait: {
      data: toBytes(data),
      contentType: 'image/webp',
      width: finished.width ?? MAX_EDGE,
      height: finished.height ?? MAX_EDGE,
      byteSize: data.byteLength,
      checksum: createHash('sha256').update(data).digest('hex').slice(0, 16),
    },
  };
}

/** Copy into a plain ArrayBuffer, which is what the bytea column wants. */
function toBytes(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(buffer.byteLength));
  out.set(buffer);
  return out;
}

/** Where an approved portrait is served from, versioned by its checksum. */
export function portraitPath(slug: string, checksum: string): string {
  return `/creators/${slug}/portrait/${checksum}`;
}
