'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { containsExplicitLanguage } from '@/domain/content-policy';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { MAX_UPLOAD_BYTES, portraitPath, preparePortrait } from '@/server/services/portrait';
import { deletePortrait, putPortrait } from '@/server/services/portrait-storage';

/**
 * A creator's portrait.
 *
 * A portrait is a *claimed-record* field. PALMA does not find a picture of an
 * unclaimed creator and put it on their record — the only way one exists is
 * that the person in it uploaded it, from their own account.
 *
 * It goes live on upload. There used to be a queue: every headshot waited for
 * a moderator, because PALMA is deliberately SFW and an upload is the one
 * route by which explicit imagery could arrive. The queue was the wrong shape
 * for the risk. Everyone uploading is a verified creator putting a photograph
 * of themselves on a record that carries their name, so the queue made all of
 * them wait for the rare bad one, and a creator who could not see their own
 * face on their own record for three days reasonably concluded the upload had
 * failed.
 *
 * What replaces it is stated up front and acted on after: the rule is on the
 * form, in words, before the file is chosen — no nudity, nothing explicit —
 * and `withdrawPortrait` below lets the desk take one down, which deletes the
 * bytes. So the control did not disappear; it stopped being a turnstile.
 */

export type PortraitState = { status: 'idle' | 'error' | 'success'; message?: string };

export async function uploadPortrait(
  _previous: PortraitState,
  formData: FormData,
): Promise<PortraitState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:update_own_profile');
  } catch {
    return { status: 'error', message: 'You are not authorised to change this record.' };
  }

  if (!session.user.creatorId) {
    return { status: 'error', message: 'Claim or start a record before adding a portrait.' };
  }

  const file = formData.get('portrait');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Choose an image.' };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      status: 'error',
      message: `That image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
    };
  }

  const alt = String(formData.get('alt') ?? '').trim();
  if (alt.length > 300) {
    return { status: 'error', message: 'Keep the description under 300 characters.' };
  }
  if (alt && containsExplicitLanguage(alt)) {
    return {
      status: 'error',
      message: 'PALMA records stay suitable for every audience. Edit the description.',
    };
  }

  const prepared = await preparePortrait({
    bytes: await file.arrayBuffer(),
    declaredType: file.type,
  });

  if (!prepared.ok) {
    return { status: 'error', message: prepared.reason };
  }

  const creatorId = session.user.creatorId;
  const { portrait } = prepared;

  // The slug is the first segment of the serving path, so it is read from the
  // record rather than taken from the session, which was written at sign-in
  // and may predate a rename.
  const [creator] = await sql<{ slug: string }[]>`
    select slug from "Creator" where id = ${creatorId} limit 1
  `;

  if (!creator) {
    return { status: 'error', message: 'That record could not be found.' };
  }

  // Out to object storage first, if it is configured. A failed upload must
  // leave the record exactly as it was, so this happens before the
  // transaction rather than inside it: a database row pointing at an object
  // that is not there would serve a blank portrait for ever.
  let storageKey: string | null;
  try {
    storageKey = await putPortrait({
      creatorId,
      checksum: portrait.checksum,
      data: portrait.data,
      contentType: portrait.contentType,
    });
  } catch {
    return {
      status: 'error',
      message: 'PALMA could not store that image just now. Nothing has changed, try again shortly.',
    };
  }

  const [previous] = await sql<{ storageKey: string | null }[]>`
    select "storageKey" from "CreatorPortrait" where "creatorId" = ${creatorId} limit 1
  `;
  const previousKey = previous?.storageKey ?? null;

  const stored = {
    // Exactly one of the two: the bytes go to the column only when there is
    // nowhere better for them to be.
    data: storageKey ? null : portrait.data,
    storageKey,
    contentType: portrait.contentType,
    width: portrait.width,
    height: portrait.height,
    byteSize: portrait.byteSize,
    checksum: portrait.checksum,
    alt: alt || null,
    status: 'published' as const,
  };

  await withTransaction(async (tx) => {
    await tx`
      insert into "CreatorPortrait" (
        id, "creatorId", data, "storageKey", "contentType",
        width, height, "byteSize", checksum, alt, status, "updatedAt"
      )
      values (
        ${createId()}, ${creatorId}, ${stored.data}, ${stored.storageKey}, ${stored.contentType},
        ${stored.width}, ${stored.height}, ${stored.byteSize}, ${stored.checksum}, ${stored.alt}, ${stored.status}, ${new Date()}
      )
      on conflict ("creatorId") do update set
        data = excluded.data,
        "storageKey" = excluded."storageKey",
        "contentType" = excluded."contentType",
        width = excluded.width,
        height = excluded.height,
        "byteSize" = excluded."byteSize",
        checksum = excluded.checksum,
        alt = excluded.alt,
        status = excluded.status,
        "withdrawnAt" = null,
        "withdrawnById" = null,
        "withdrawnReason" = null
    `;

    // This is the line that makes it public: the serving path carries the
    // checksum, so replacing a portrait is a different URL and no cache
    // anywhere is left holding the old one.
    await tx`
      update "Creator"
      set "portraitUrl" = ${portraitPath(creator.slug, portrait.checksum)},
          "portraitAlt" = ${alt || null}
      where id = ${creatorId}
    `;
  });

  // Only now, with the new key committed: an object deleted before the
  // transaction succeeded would have been deleted out from under a record
  // still pointing at it.
  if (previousKey && previousKey !== storageKey) await deletePortrait(previousKey);

  await recordAudit({
    action: 'creator.portrait_published',
    entityType: 'Creator',
    entityId: creatorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Portrait published (${Math.round(portrait.byteSize / 1024)}KB, ${portrait.width}×${portrait.height})`,
  });

  revalidatePath('/creator');
  revalidatePath('/creator/profile');
  revalidatePath('/portal/portraits');
  revalidatePath('/creators');
  revalidatePath(`/creators/${creator.slug}`);
  revalidatePath(`/nominate/${creator.slug}`);

  return {
    status: 'success',
    message:
      'It is on your record now. PALMA re-encoded it and discarded every scrap of metadata that came with it, including the location a phone writes into a photograph.',
  };
}

/** Taking it down again. The creator's own decision, and immediate. */
export async function removePortrait(): Promise<void> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:update_own_profile');
  } catch {
    return;
  }
  if (!session.user.creatorId) return;

  const creatorId = session.user.creatorId;

  const [existing] = await sql<{ storageKey: string | null }[]>`
    select "storageKey" from "CreatorPortrait" where "creatorId" = ${creatorId} limit 1
  `;

  await withTransaction(async (tx) => {
    await tx`delete from "CreatorPortrait" where "creatorId" = ${creatorId}`;
    await tx`
      update "Creator"
      set "portraitUrl" = null, "portraitAlt" = null
      where id = ${creatorId}
    `;
  });

  // The row is what decides whether anything is served, so it goes first and
  // the object follows. A failure here leaves an orphan in the bucket, which
  // is a tidying job; the other order would leave the record pointing at
  // nothing, which is a broken page.
  if (existing?.storageKey) await deletePortrait(existing.storageKey);

  await recordAudit({
    action: 'creator.portrait_removed',
    entityType: 'Creator',
    entityId: creatorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: 'Portrait removed by the creator',
  });

  revalidatePath('/creator');
  if (session.user.creatorSlug) revalidatePath(`/creators/${session.user.creatorSlug}`);
}

type WithdrawPortraitRow = {
  id: string;
  status: string;
  storageKey: string | null;
  creatorId: string;
  creatorSlug: string;
  creatorDisplayName: string;
};

/**
 * Taking one down.
 *
 * The desk's half of a portrait system with no queue in it. Nothing waits on
 * this and most portraits never meet it, but it is what makes publishing on
 * upload defensible rather than merely convenient: an unsuitable image is
 * removed the moment somebody reports or notices it, and the bytes go with it.
 *
 * A reason is required because the creator is told what it says. "Refused" on
 * its own, with no account of why, is how an institution loses an argument it
 * was right about.
 */
export async function withdrawPortrait(
  _previous: PortraitState,
  formData: FormData,
): Promise<PortraitState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:edit_creator');
  } catch {
    return { status: 'error', message: 'You are not authorised to take a portrait down.' };
  }

  const portraitId = String(formData.get('portraitId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (reason.length < 10) {
    return {
      status: 'error',
      message: 'A withdrawal has to carry a reason. The creator is told what it says.',
    };
  }

  const [portrait] = await sql<WithdrawPortraitRow[]>`
    select
      p.id,
      p.status,
      p."storageKey",
      c.id as "creatorId",
      c.slug as "creatorSlug",
      c."displayName" as "creatorDisplayName"
    from "CreatorPortrait" p
    join "Creator" c on c.id = p."creatorId"
    where p.id = ${portraitId}
    limit 1
  `;

  if (!portrait) return { status: 'error', message: 'That portrait does not exist.' };
  if (portrait.status === 'withdrawn') {
    return { status: 'error', message: 'That portrait is already down.' };
  }

  await withTransaction(async (tx) => {
    // The bytes go with the decision. PALMA does not keep a copy of an image
    // it has taken off a record, and the row survives only to hold the reason
    // the creator was given.
    await tx`
      update "CreatorPortrait"
      set status = 'withdrawn',
          "withdrawnAt" = ${new Date()},
          "withdrawnById" = ${session.user.id},
          "withdrawnReason" = ${reason},
          data = null,
          "storageKey" = null,
          "byteSize" = 0
      where id = ${portrait.id}
    `;
    await tx`
      update "Creator"
      set "portraitUrl" = null, "portraitAlt" = null
      where id = ${portrait.creatorId}
    `;
  });

  // Clearing the key is what stops it being served; this is what stops it
  // existing. If the bucket call fails the portrait is already unreachable,
  // and the orphan is a tidying job rather than a portrait still on a record.
  if (portrait.storageKey) await deletePortrait(portrait.storageKey);

  await recordAudit({
    action: 'creator.portrait_withdrawn',
    entityType: 'Creator',
    entityId: portrait.creatorId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Portrait for ${portrait.creatorDisplayName} taken down: ${reason}`,
  });

  revalidatePath('/portal/portraits');
  revalidatePath('/creator');
  revalidatePath('/creator/profile');
  revalidatePath('/creators');
  revalidatePath(`/creators/${portrait.creatorSlug}`);
  revalidatePath(`/nominate/${portrait.creatorSlug}`);

  return { status: 'success', message: 'Taken down, and the image deleted.' };
}
