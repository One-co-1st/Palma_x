import 'server-only';
import { cookies, headers } from 'next/headers';
import { constantTimeEquals, hashIdentifier, hmac, randomToken, sha256 } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import type { Role } from './rbac';

export const SESSION_COOKIE = 'palma_session';
export const CSRF_COOKIE = 'palma_csrf';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  creatorId: string | null;
  creatorSlug: string | null;
  judgeId: string | null;
};

export type ActiveSession = {
  sessionId: string;
  user: SessionUser;
  csrfToken: string;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

async function requestMeta() {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? '';
  return {
    userAgent: headerList.get('user-agent')?.slice(0, 255) ?? null,
    ipHash: ip ? hashIdentifier(ip, signingSecret()) : null,
  };
}

export function csrfTokenFor(csrfSecret: string): string {
  return hmac(signingSecret(), csrfSecret);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken(32);
  const csrfSecret = randomToken(24);
  const meta = await requestMeta();
  const sessionId = createId();

  await withTransaction(async (tx) => {
    await tx`
      insert into "AuthSession" (id, "userId", "tokenHash", "csrfSecret", "userAgent", "ipHash", "expiresAt")
      values (
        ${sessionId},
        ${userId},
        ${sha256(token)},
        ${csrfSecret},
        ${meta.userAgent},
        ${meta.ipHash},
        ${new Date(Date.now() + SESSION_TTL_SECONDS * 1000)}
      )
    `;

    await tx`
      update "User" set "lastLoginAt" = ${new Date()} where id = ${userId}
    `;
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
  // Readable by the client so forms can echo it back (double-submit pattern).
  jar.set(CSRF_COOKIE, csrfTokenFor(csrfSecret), {
    ...cookieOptions(SESSION_TTL_SECONDS),
    httpOnly: false,
  });

  return sessionId;
}

export async function getSession(): Promise<ActiveSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  type SessionRow = {
    sessionId: string;
    csrfSecret: string;
    expiresAt: Date;
    revokedAt: Date | null;
    userId: string;
    email: string;
    name: string;
    role: Role;
    isActive: boolean;
    creatorId: string | null;
    creatorSlug: string | null;
    judgeId: string | null;
  };

  const [record] = await sql<SessionRow[]>`
    select
      s.id as "sessionId",
      s."csrfSecret",
      s."expiresAt",
      s."revokedAt",
      u.id as "userId",
      u.email,
      u.name,
      u.role,
      u."isActive",
      c.id as "creatorId",
      c.slug as "creatorSlug",
      j.id as "judgeId"
    from "AuthSession" s
    join "User" u on u.id = s."userId"
    left join "Creator" c on c."userId" = u.id
    left join "Judge" j on j."userId" = u.id
    where s."tokenHash" = ${sha256(token)}
    limit 1
  `;

  if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) return null;
  if (!record.isActive) return null;

  return {
    sessionId: record.sessionId,
    csrfToken: csrfTokenFor(record.csrfSecret),
    user: {
      id: record.userId,
      email: record.email,
      name: record.name,
      role: record.role,
      creatorId: record.creatorId,
      creatorSlug: record.creatorSlug,
      judgeId: record.judgeId,
    },
  };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await sql`
      update "AuthSession"
      set "revokedAt" = ${new Date()}
      where "tokenHash" = ${sha256(token)}
    `.catch(() => undefined);
  }

  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

/**
 * Double-submit CSRF verification for anything that is not a Server Action.
 * Server Actions additionally carry Next.js' own origin checks.
 */
export async function assertCsrf(submitted: string | null | undefined): Promise<void> {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!submitted || !cookieToken || !constantTimeEquals(submitted, cookieToken)) {
    throw new Error('This request could not be verified. Please reload the page and try again.');
  }
}

/** Rejects cross-origin form posts even where a CSRF cookie is absent. */
export async function assertSameOrigin(): Promise<void> {
  const headerList = await headers();
  const origin = headerList.get('origin');
  if (!origin) return;
  const host = headerList.get('host');
  if (!host) throw new Error('Malformed request.');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error('Malformed request origin.');
  }
  if (originHost !== host) throw new Error('Cross-origin request refused.');
}
