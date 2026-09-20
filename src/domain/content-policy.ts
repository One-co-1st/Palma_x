/**
 * PALMA content policy, enforced in code.
 *
 * PALMA recognises achievement. It does not host explicit material, and it does
 * not broker services. Evidence may *point* to an external platform where a
 * creator's work lives; PALMA never publishes that material itself.
 */

export const PROHIBITED_CONTENT = [
  'pornographic uploads',
  'explicit sexual images or video',
  'sexual services advertising',
  'escort or brokerage transactions',
  'child sexual abuse material',
  'non-consensual intimate imagery',
  'threats, blackmail or extortion',
  'doxxing or stalking',
  'impersonation',
  'fraud',
  'hate-based abuse',
  'otherwise illegal content',
] as const;

/** Uploads are restricted to profile portraiture and editorial imagery. */
export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type UploadCheck = { ok: true } | { ok: false; reason: string };

export function checkUpload(file: { type: string; size: number }): UploadCheck {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'Only JPEG, PNG, WebP or AVIF images may be uploaded.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'Images must be 8MB or smaller.' };
  }
  return { ok: true };
}

const BLOCKED_URL_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

export type EvidenceLinkCheck =
  { ok: true; url: string; host: string } | { ok: false; reason: string };

/**
 * Evidence links are references for authorised judges. They are normalised,
 * scheme-restricted, and never rendered to the public.
 */
export function checkEvidenceLink(raw: string): EvidenceLinkCheck {
  const value = raw.trim();
  if (!value) return { ok: false, reason: 'Enter a link.' };

  const lowered = value.toLowerCase();
  if (BLOCKED_URL_SCHEMES.some((scheme) => lowered.startsWith(scheme))) {
    return { ok: false, reason: 'That link type is not permitted.' };
  }

  let url: URL;
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    return { ok: false, reason: 'Enter a valid link, including the domain.' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'Links must use http or https.' };
  }

  if (url.username || url.password) {
    return { ok: false, reason: 'Links must not contain credentials.' };
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!host.includes('.')) {
    return { ok: false, reason: 'Enter a valid domain.' };
  }

  return { ok: true, url: url.toString(), host };
}

/**
 * Public surfaces of PALMA stay SFW. This does not moderate meaning — a human
 * does that — it stops the most obvious policy breaches reaching a page.
 */
const EXPLICIT_TERMS = [
  'porn',
  'xxx',
  'nsfw',
  'escort',
  'onlyfan$',
  'sexcam',
  'camgirl',
  'camboy',
  'fetish content for sale',
];

export function containsExplicitLanguage(value: string): boolean {
  const lowered = value.toLowerCase();
  return EXPLICIT_TERMS.some((term) => lowered.includes(term));
}
