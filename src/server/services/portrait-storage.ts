import 'server-only';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Where a portrait's bytes live.
 *
 * PALMA kept them in Postgres, in a `Bytes` column. That is a perfectly good
 * answer for a few hundred records and a bad one at any scale: a 1024×1024
 * WebP is around 120KB, so ten thousand creators is a gigabyte and a half
 * sitting inside every database backup, restored every time anyone restores,
 * paid for at database prices rather than object-storage prices. Images are
 * the one thing in PALMA that is large, immutable and never queried.
 *
 * Cloudflare R2 holds them now, when it is configured. When it is not — a
 * fresh checkout, a test run, a contributor without credentials — the database
 * column still works exactly as before, and nothing about the application
 * changes. That is deliberate: object storage is an operational improvement,
 * not a prerequisite for running PALMA.
 *
 * R2 is addressed over the S3 API. The bucket is private and stays private:
 * portraits continue to be served through PALMA's own route, which is what
 * keeps the promise that a withdrawn portrait is gone enforceable in one
 * place. If a delete against R2 ever fails, the record still refuses to serve
 * it, and a publicly addressable bucket URL could not have made that promise.
 */

export type PortraitStorage =
  { kind: 'r2'; bucket: string; client: S3Client } | { kind: 'database' };

let cached: PortraitStorage | null = null;

/**
 * Configured only when every piece is present.
 *
 * Half-configured storage is worse than none: an upload that writes to R2 and
 * a delete that cannot reach it leaves an image PALMA believes it has removed.
 */
export function portraitStorage(): PortraitStorage {
  if (cached) return cached;

  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    cached = { kind: 'database' };
    return cached;
  }

  cached = {
    kind: 'r2',
    bucket,
    client: new S3Client({
      // R2 is single-region by design and ignores the region, but the S3
      // client refuses to sign without one.
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };

  return cached;
}

/**
 * The object's name.
 *
 * The checksum is in it, so replacing a portrait writes a new object rather
 * than overwriting one — the same reason it is in the serving path. Nothing
 * downstream is ever left holding a URL whose bytes changed underneath it.
 */
export function portraitObjectKey(creatorId: string, checksum: string): string {
  return `portraits/${creatorId}/${checksum}.webp`;
}

/**
 * Store the bytes, and say where they went.
 *
 * Returns the key when R2 took them, or null when they belong in the database
 * column instead. The caller writes one or the other and never both.
 */
export async function putPortrait(input: {
  creatorId: string;
  checksum: string;
  data: Uint8Array;
  contentType: string;
}): Promise<string | null> {
  const storage = portraitStorage();
  if (storage.kind === 'database') return null;

  const key = portraitObjectKey(input.creatorId, input.checksum);

  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: input.data,
      ContentType: input.contentType,
      // Immutable by construction: the key contains the checksum.
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return key;
}

/** Read them back for the serving route. Null when the object is not there. */
export async function getPortrait(key: string): Promise<Uint8Array | null> {
  const storage = portraitStorage();
  if (storage.kind === 'database') return null;

  try {
    const result = await storage.client.send(
      new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
    if (!result.Body) return null;
    return await result.Body.transformToByteArray();
  } catch {
    // A missing object is a 404 to the reader, not an error worth explaining.
    return null;
  }
}

/**
 * Remove them.
 *
 * Reports whether it succeeded, and the caller does not let a failure stop the
 * record being taken down: a portrait that is unreachable through PALMA but
 * still sitting in a private bucket is a mess to clean up later, whereas one
 * left on a public record because a network call failed is a broken promise
 * now. The database row is the thing that decides what is served.
 */
export async function deletePortrait(key: string): Promise<boolean> {
  const storage = portraitStorage();
  if (storage.kind === 'database') return true;

  try {
    await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** For the operator-facing places that should say which one is in use. */
export function portraitStorageLabel(): string {
  return portraitStorage().kind === 'r2' ? 'Cloudflare R2' : 'the PALMA database';
}
