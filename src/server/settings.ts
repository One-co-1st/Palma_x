import 'server-only';
import { env } from '@/lib/env';
import { sql } from '@/server/db/sql';

/**
 * Settings an administrator throws at runtime.
 *
 * Deliberately tiny, and deliberately not a key-value store for everything: a
 * setting belongs here only if an operator should be able to change it without
 * a deployment, and if being wrong about it is recoverable. Secrets never do —
 * a key in the database is a key in every backup of it, so API keys stay in
 * the environment and this table only decides whether to use them.
 */

export const SETTINGS = {
  /** Who performs age and identity assurance: 'manual' or 'automatic'. */
  verificationMode: 'verification.mode',
} as const;

export type VerificationMode = 'manual' | 'automatic';

export type VerificationConfig = {
  mode: VerificationMode;
  /** What the environment offers, whatever the switch says. */
  provider: string;
  hasApiKey: boolean;
  /** Whether 'automatic' can actually be selected right now. */
  automaticAvailable: boolean;
  /** The mode in force, after reconciling the switch with reality. */
  effective: VerificationMode;
  updatedAt: string | null;
  updatedBy: string | null;
};

async function readSetting(
  key: string,
): Promise<{ value: string; updatedAt: Date; updatedById: string | null } | null> {
  const [row] = await sql<{ value: string; updatedAt: Date; updatedById: string | null }[]>`
    select value, "updatedAt", "updatedById"
    from "SystemSetting"
    where key = ${key}
    limit 1
  `;
  return row ?? null;
}

/**
 * The verification configuration.
 *
 * The switch and the environment are two different facts and this keeps them
 * separate. An administrator may select `automatic`, but if no provider key is
 * configured the *effective* mode is still manual — and the panel says so
 * rather than quietly recording assurance nobody performed.
 */
export async function getVerificationConfig(): Promise<VerificationConfig> {
  const row = await readSetting(SETTINGS.verificationMode);
  const mode: VerificationMode = row?.value === 'automatic' ? 'automatic' : 'manual';

  const provider = env.AGE_VERIFICATION_PROVIDER;
  const hasApiKey = Boolean(env.AGE_VERIFICATION_API_KEY);
  // A provider is real when it is named *and* keyed. 'stub' is neither.
  const automaticAvailable = provider !== 'stub' && hasApiKey;

  let updatedBy: string | null = null;
  if (row?.updatedById) {
    const [actor] = await sql<{ email: string }[]>`
      select email from "User" where id = ${row.updatedById} limit 1
    `;
    updatedBy = actor?.email ?? null;
  }

  return {
    mode,
    provider,
    hasApiKey,
    automaticAvailable,
    effective: mode === 'automatic' && automaticAvailable ? 'automatic' : 'manual',
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy,
  };
}

export async function setSetting(key: string, value: string, actorId: string): Promise<void> {
  await sql`
    insert into "SystemSetting" (key, value, "updatedById")
    values (${key}, ${value}, ${actorId})
    on conflict (key) do update set
      value = excluded.value,
      "updatedById" = excluded."updatedById"
  `;
}

/**
 * Which provider string to stamp on a verification row right now.
 *
 * Read at the moment a check starts, so a row always records who actually
 * decided it. Rows verified by a moderator keep saying so for ever — the
 * history is not rewritten when a provider is later contracted.
 */
export async function currentVerificationProvider(): Promise<string> {
  const config = await getVerificationConfig();
  return config.effective === 'automatic' ? config.provider : 'palma_manual';
}
