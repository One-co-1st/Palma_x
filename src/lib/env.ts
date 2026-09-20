import { z } from 'zod';

/**
 * Environment validation.
 *
 * PostgreSQL is not optional. PALMA reads every public page from the database,
 * so `DATABASE_URL` is required everywhere — including at build time, where the
 * season, categories, creators and Journal are read to generate static pages.
 */
/** localhost, in the spellings a config file actually contains. */
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional().default(''),
  /** Unpooled connection used only by SQL migrations. Defaults to DATABASE_URL locally. */
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://palmaawards.com'),
  EMAIL_FROM: z.string().default('PALMA <laurels@palmaawards.com>'),
  RESEND_API_KEY: z.string().optional(),
  /**
   * A provider-supplied sender, used while the real domain is still being
   * verified. Set it and every message goes out from here, announcing itself;
   * unset it and PALMA writes as itself. See src/server/email/resend.ts.
   */
  EMAIL_SANDBOX_FROM: z.string().optional(),
  /** Signing secret for the provider's delivery webhook. Unset = route refuses. */
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  AGE_VERIFICATION_PROVIDER: z.string().default('stub'),
  AGE_VERIFICATION_API_KEY: z.string().optional(),
  /** Shared secret for the scheduled retention sweep. Unset = route refuses all. */
  CRON_SECRET: z.string().optional(),

  /**
   * Cloudflare R2, for creator portraits.
   *
   * All four or none. Set them and portrait bytes go to the bucket; leave any
   * one unset and they stay in the database column, which still works. Half a
   * configuration is the dangerous state — an upload that reaches R2 and a
   * delete that cannot would leave an image PALMA believes it removed — so
   * `portraitStorage()` treats anything short of all four as none.
   *
   * The bucket stays private. Portraits are served through PALMA's own route,
   * which is what keeps "withdrawn means gone" enforceable in one place.
   */
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
});

function read() {
  const parsed = schema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    DIRECT_URL: process.env.DIRECT_URL || undefined,
    AUTH_SECRET: process.env.AUTH_SECRET || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_SANDBOX_FROM: process.env.EMAIL_SANDBOX_FROM || undefined,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET || undefined,
    AGE_VERIFICATION_PROVIDER: process.env.AGE_VERIFICATION_PROVIDER || undefined,
    AGE_VERIFICATION_API_KEY: process.env.AGE_VERIFICATION_API_KEY || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || undefined,
    R2_BUCKET: process.env.R2_BUCKET || undefined,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || undefined,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || undefined,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const value = parsed.data;

  if (value.NODE_ENV === 'production' && !value.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required in production.');
  }

  /**
   * A production site that thinks it lives on localhost is a broken site that
   * looks fine.
   *
   * NEXT_PUBLIC_SITE_URL is not decoration. It is the absolute address written
   * into every share link a creator copies, every link in every email PALMA
   * sends, every canonical tag, the sitemap, and the Open Graph card on a
   * winner's honour. Leave it at its development value and all of those point
   * at the reader's own machine — a creator puts their record link in a press
   * kit and it goes nowhere, an email arrives with a sign-in link that only
   * works for the person who sent it. None of it errors. It just quietly
   * doesn't work, for everybody, for as long as nobody notices.
   *
   * A running production server therefore refuses to start. A production
   * *build* only warns, because building locally to check that the thing
   * compiles is an ordinary thing to do and the machine doing it is not the
   * machine that will serve it.
   */
  if (value.NODE_ENV === 'production' && LOOPBACK.test(value.NEXT_PUBLIC_SITE_URL)) {
    const complaint =
      `NEXT_PUBLIC_SITE_URL is ${value.NEXT_PUBLIC_SITE_URL}, which is this machine. ` +
      'Set it to the address the public actually visits, e.g. https://palmaawards.com — ' +
      'it is written into every share link, every email and every canonical URL.';

    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn(`\n  ⚠ ${complaint}\n`);
    } else {
      throw new Error(complaint);
    }
  }

  /**
   * Half-configured object storage is the one state worth complaining about.
   *
   * None of the four set is a deliberate choice and works. All four is the
   * intended setup. Two or three is somebody who thought they had turned R2 on
   * and has not, and would find out when a portrait quietly went to the
   * database instead — or, worse, would never find out at all.
   */
  const r2 = [
    value.R2_ACCOUNT_ID,
    value.R2_BUCKET,
    value.R2_ACCESS_KEY_ID,
    value.R2_SECRET_ACCESS_KEY,
  ];
  const set = r2.filter(Boolean).length;
  if (set > 0 && set < 4) {
    console.warn(
      `\n  ⚠ ${set} of the 4 R2 settings are present, so portraits are going to the database.\n` +
        '    R2 needs R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.\n',
    );
  }

  return value;
}

export const env = read();

/** Signing key for sessions and verification records. */
export function signingSecret(): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production.');
  // Deterministic development fallback — never used when AUTH_SECRET is set.
  return 'palma-development-signing-secret-do-not-use-in-production';
}

export const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

/** Pooled application connection string. */
export function databaseUrl(): string {
  return env.DATABASE_URL;
}

/** Unpooled migration connection string; identical locally, direct port in hosted Postgres. */
export function directDatabaseUrl(): string {
  return env.DIRECT_URL || env.DATABASE_URL;
}
