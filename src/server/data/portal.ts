import 'server-only';
import { canIssueReferralLink, referralPath } from '@/domain/nomination';
import { sql } from '@/server/db/sql';
import { getDossierBadge } from './dossier';

export type PortalCandidacy = {
  id: string;
  reference: string;
  categoryName: string;
  year: number;
  status: string;
};

export type PortalAchievement = {
  code: string;
  kind: string;
  year: number;
  categoryName: string;
  state: string;
};

/** The fields a creator writes about themselves, editable whether or not the
 *  record is published. The public query refuses unpublished records, which is
 *  right for the public and wrong for the person waiting on a moderator. */
export type PortalProfile = {
  displayName: string;
  pronouns: string;
  countryCode: string;
  city: string;
  headline: string;
  biography: string;
  websiteUrl: string;
};

export type PortalLink = {
  id: string;
  label: string;
  url: string;
};

export type CreatorPortal = {
  hasProfile: boolean;
  creatorSlug: string | null;
  displayName: string | null;
  isPublished: boolean;
  /** Null only when the account holds no record at all. */
  profile: PortalProfile | null;
  /** Where the work lives. The editorial desk reads these. */
  links: PortalLink[];
  verification: {
    status: string;
    provider: string | null;
    verifiedAt: string | null;
    expiresAt: string | null;
  };
  candidacies: PortalCandidacy[];
  /** The creator's own nomination link, once it has been issued. */
  referralPath: string | null;
  achievements: PortalAchievement[];
  preferences: {
    seasonAnnouncements: boolean;
    nominationUpdates: boolean;
    honourAnnouncements: boolean;
    journalDigest: boolean;
  };
  /** What is waiting in the Dossier, for the badge on the portal. */
  dossier: { unread: number; important: number };
  /** Which PALMA lists this account's address is confirmed on. */
  subscriptions: string[];
  /** Where the creator's portrait has got to. */
  portrait: {
    status: 'none' | 'published' | 'withdrawn';
    url: string | null;
    alt: string | null;
    withdrawnReason: string | null;
  };
};

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

type PortalRow = {
  email: string;
  creatorId: string | null;
  creatorSlug: string | null;
  displayName: string | null;
  pronouns: string | null;
  countryCode: string | null;
  city: string | null;
  headline: string | null;
  biography: string | null;
  websiteUrl: string | null;
  portraitUrl: string | null;
  portraitAlt: string | null;
  isPublished: boolean | null;
  isSuspended: boolean | null;
  creatorUserId: string | null;
  verificationStatus: string | null;
  verificationProvider: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  portraitStatus: string | null;
  portraitAltText: string | null;
  withdrawnReason: string | null;
  seasonAnnouncements: boolean | null;
  nominationUpdates: boolean | null;
  honourAnnouncements: boolean | null;
  journalDigest: boolean | null;
  links: { id: string; label: string; url: string }[];
  achievements: { code: string; kind: string; year: number; categoryName: string; state: string }[];
  candidacies: { id: string; reference: string; categoryName: string; year: number; status: string }[];
};

export async function getCreatorPortal(userId: string): Promise<CreatorPortal | null> {
  const rows = await sql<PortalRow[]>`
    select
      u.email,
      c.id as "creatorId",
      c.slug as "creatorSlug",
      c."displayName",
      c.pronouns,
      c."countryCode",
      c.city,
      c.headline,
      c.biography,
      c."websiteUrl",
      c."portraitUrl",
      c."portraitAlt",
      c."isPublished",
      c."isSuspended",
      c."userId" as "creatorUserId",
      v.status as "verificationStatus",
      v.provider as "verificationProvider",
      ${isoTs('v."verifiedAt"')} as "verifiedAt",
      ${isoTs('v."expiresAt"')} as "expiresAt",
      p.status as "portraitStatus",
      p.alt as "portraitAltText",
      p."withdrawnReason" as "withdrawnReason",
      np."seasonAnnouncements" as "seasonAnnouncements",
      np."nominationUpdates" as "nominationUpdates",
      np."honourAnnouncements" as "honourAnnouncements",
      np."journalDigest" as "journalDigest",
      (select coalesce(
          json_agg(json_build_object('id', l.id, 'label', l.label, 'url', l.url)
            order by l.position asc),
          '[]'::json)
        from "CreatorLink" l
        where l."creatorId" = c.id) as "links",
      (select coalesce(
          json_agg(json_build_object(
            'code', a.code,
            'kind', a.kind,
            'year', a.year,
            'categoryName', a."categoryName",
            'state', a.state)
            order by a."issuedAt" desc),
          '[]'::json)
        from "Achievement" a
        where a."creatorId" = c.id) as "achievements",
      (select coalesce(
          json_agg(json_build_object(
            'id', cd.id,
            'reference', cd.reference,
            'categoryName', cat.name,
            'year', ay.year,
            'status', cd.status)
            order by cd."createdAt" desc),
          '[]'::json)
        from (
          select * from "Candidacy" cd0
          where cd0."creatorId" = c.id
          order by cd0."createdAt" desc
          limit 50
        ) cd
        join "Category" cat on cat.id = cd."categoryId"
        join "AwardYear" ay on ay.id = cd."awardYearId") as "candidacies"
    from "User" u
    left join "NotificationPreference" np on np."userId" = u.id
    left join "Creator" c on c."userId" = u.id
    left join "CreatorVerification" v on v."creatorId" = c.id
    left join "CreatorPortrait" p on p."creatorId" = c.id
    where u.id = ${userId}
    limit 1
  `;

  const user = rows[0];
  if (!user) return null;

  const [dossier, subscriptions] = await Promise.all([
    getDossierBadge(userId),
    sql<{ type: string }[]>`
      select type
      from "EmailSubscription"
      where email = ${user.email} and status = 'confirmed'
    `,
  ]);

  const hasProfile = user.creatorId !== null;

  return {
    hasProfile,
    creatorSlug: user.creatorSlug,
    displayName: user.displayName,
    isPublished: user.isPublished ?? false,
    profile: hasProfile
      ? {
          displayName: user.displayName!,
          pronouns: user.pronouns ?? '',
          countryCode: user.countryCode!,
          city: user.city ?? '',
          headline: user.headline ?? '',
          biography: user.biography ?? '',
          websiteUrl: user.websiteUrl ?? '',
        }
      : null,
    links: user.links.map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
    })),
    verification: {
      status: user.verificationStatus ?? 'unverified',
      provider: user.verificationProvider,
      verifiedAt: user.verifiedAt,
      expiresAt: user.expiresAt,
    },
    candidacies: user.candidacies.map((candidacy) => ({
      id: candidacy.id,
      reference: candidacy.reference,
      categoryName: candidacy.categoryName,
      year: candidacy.year,
      status: candidacy.status,
    })),
    referralPath:
      hasProfile &&
      canIssueReferralLink({
        isClaimed: user.creatorUserId !== null,
        isSuspended: user.isSuspended ?? false,
        verificationStatus: user.verificationStatus ?? 'unverified',
      })
        ? referralPath(user.creatorSlug!)
        : null,
    achievements: user.achievements.map((achievement) => ({
      code: achievement.code,
      kind: achievement.kind,
      year: achievement.year,
      categoryName: achievement.categoryName,
      state: achievement.state,
    })),
    preferences: {
      seasonAnnouncements: user.seasonAnnouncements ?? true,
      nominationUpdates: user.nominationUpdates ?? true,
      honourAnnouncements: user.honourAnnouncements ?? true,
      journalDigest: user.journalDigest ?? false,
    },
    dossier,
    subscriptions: subscriptions.map((row) => row.type),
    portrait: {
      status: (user.portraitStatus ?? 'none') as 'none' | 'published' | 'withdrawn',
      url: user.portraitUrl,
      alt: user.portraitAltText ?? user.portraitAlt,
      withdrawnReason: user.withdrawnReason,
    },
  };
}
