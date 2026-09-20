'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { slugify } from '@/lib/utils';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import {
  disclosureFor,
  MAX_VERDICT,
  MIN_VERDICT,
  publishObjections,
  type EntryDraft,
} from '@/domain/product-library';

/**
 * Writing the Product Library.
 *
 * **Two actions, and they do not overlap.** `saveProduct` writes the editorial
 * fields and cannot touch the sponsor. `setProductSponsor` records the sponsor
 * and cannot touch a verdict. That is the firewall as code rather than as a
 * promise: there is no code path in this file through which a sponsorship
 * reaches an opinion, so the rule holds even if somebody forgets it.
 *
 * Both are the desk's, not administration's. A verdict is editorial work, and
 * the people who write verdicts own them.
 */

export type ProductState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; objections?: string[] };

const lines = (value: FormDataEntryValue | null): string[] =>
  String(value ?? '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

/** Create or update an entry. Editorial fields only. */
export async function saveProduct(
  _previous: ProductState,
  formData: FormData,
): Promise<ProductState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('kulture:manage_products');
  } catch {
    return { status: 'error', message: 'You are not authorised to edit the Product Library.' };
  }

  const id = String(formData.get('id') ?? '').trim() || null;
  const rawVerdict = String(formData.get('verdict') ?? '').trim();
  const verdict = rawVerdict === '' ? null : Number(rawVerdict);

  const draft: EntryDraft = {
    name: String(formData.get('name') ?? '').trim(),
    brand: String(formData.get('brand') ?? '').trim(),
    category: String(formData.get('category') ?? '').trim(),
    verdict,
    bestFor: String(formData.get('bestFor') ?? '').trim(),
    strengths: lines(formData.get('strengths')),
    limitations: lines(formData.get('limitations')),
    review: String(formData.get('review') ?? '').trim(),
    externalUrl: String(formData.get('externalUrl') ?? '').trim() || null,
    // Present on the draft shape but never written here. The sponsor is set by
    // the other action, and passing it through this one would be the hole.
    sponsorId: null,
  };

  const wantsPublish = formData.get('publish') === 'on';
  const objections = publishObjections(draft);

  // A draft may be incomplete; a published entry may not.
  if (wantsPublish && objections.length > 0) {
    return {
      status: 'error',
      message: 'This cannot be published yet.',
      objections,
    };
  }

  if (!draft.name || !draft.brand) {
    return { status: 'error', message: 'A name and a brand are needed even for a draft.' };
  }

  if (
    verdict !== null &&
    (!Number.isFinite(verdict) || verdict < MIN_VERDICT || verdict > MAX_VERDICT)
  ) {
    return {
      status: 'error',
      message: `A verdict is a number from ${MIN_VERDICT} to ${MAX_VERDICT}.`,
    };
  }

  // Stored in tenths so the column stays an integer and no rounding creeps in.
  const verdictTenths = verdict === null ? null : Math.round(verdict * 10);

  const data = {
    name: draft.name,
    brand: draft.brand,
    category: draft.category,
    verdict: verdictTenths,
    bestFor: draft.bestFor,
    strengths: draft.strengths,
    limitations: draft.limitations,
    review: draft.review,
    testedBy: String(formData.get('testedBy') ?? '').trim() || null,
    externalUrl: draft.externalUrl,
    isPublished: wantsPublish,
    publishedAt: wantsPublish ? new Date() : null,
    updatedById: session.user.id,
  };

  const entry = id
    ? (
        await sql<{ id: string }[]>`
          update "ProductEntry"
          set
            name = ${data.name},
            brand = ${data.brand},
            category = ${data.category},
            verdict = ${data.verdict},
            "bestFor" = ${data.bestFor},
            strengths = ${data.strengths},
            limitations = ${data.limitations},
            review = ${data.review},
            "testedBy" = ${data.testedBy},
            "externalUrl" = ${data.externalUrl},
            "isPublished" = ${data.isPublished},
            "publishedAt" = ${data.publishedAt},
            "updatedById" = ${data.updatedById}
          where id = ${id}
          returning id
        `
      )[0]
    : (
        await sql<{ id: string }[]>`
          insert into "ProductEntry" (
            id, slug, name, brand, category, verdict, "bestFor", strengths, limitations,
            review, "testedBy", "externalUrl", "isPublished", "publishedAt", "createdById", "updatedById"
          ) values (
            ${createId()},
            ${`${slugify(draft.brand)}-${slugify(draft.name)}`.slice(0, 80)},
            ${data.name},
            ${data.brand},
            ${data.category},
            ${data.verdict},
            ${data.bestFor},
            ${data.strengths},
            ${data.limitations},
            ${data.review},
            ${data.testedBy},
            ${data.externalUrl},
            ${data.isPublished},
            ${data.publishedAt},
            ${session.user.id},
            ${data.updatedById}
          )
          returning id
        `
      )[0];

  if (!entry) {
    return { status: 'error', message: 'The Library entry could not be written.' };
  }

  await recordAudit({
    action: id ? 'product.updated' : 'product.created',
    entityType: 'ProductEntry',
    entityId: entry.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${wantsPublish ? 'Published' : 'Saved'} ${draft.brand} ${draft.name}`,
    after: { verdict: draft.verdict, published: wantsPublish },
  });

  revalidatePath('/portal/kulture');
  revalidatePath('/kulture/products');

  return {
    status: 'success',
    message: wantsPublish ? 'Published to the Library.' : 'Saved as a draft.',
  };
}

/**
 * Record or clear a sponsorship.
 *
 * Writes three columns and no others. The disclosure is composed from the
 * sponsor's name rather than typed, so it reads identically on every sponsored
 * entry and an editor cannot soften it.
 */
export async function setProductSponsor(
  _previous: ProductState,
  formData: FormData,
): Promise<ProductState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('kulture:manage_products');
  } catch {
    return { status: 'error', message: 'You are not authorised to edit the Product Library.' };
  }

  const id = String(formData.get('id') ?? '').trim();
  const sponsorId = String(formData.get('sponsorId') ?? '').trim() || null;
  if (!id) return { status: 'error', message: 'No entry named.' };

  const sponsor = sponsorId
    ? (
        await sql<{ name: string }[]>`
          select name from "Sponsor" where id = ${sponsorId} limit 1
        `
      )[0]
    : null;

  if (sponsorId && !sponsor) {
    return { status: 'error', message: 'That partner does not exist.' };
  }

  await sql`
    update "ProductEntry"
    set
      "sponsorId" = ${sponsorId},
      "sponsorDisclosure" = ${disclosureFor(sponsor?.name ?? null)},
      "sponsoredAt" = ${sponsorId ? new Date() : null},
      "updatedById" = ${session.user.id}
    where id = ${id}
  `;

  await recordAudit({
    action: sponsorId ? 'product.sponsored' : 'product.sponsorship_cleared',
    entityType: 'ProductEntry',
    entityId: id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: sponsorId
      ? `Recorded ${sponsor?.name} as partner on a Library entry. The verdict was not touched.`
      : 'Cleared the partner on a Library entry.',
  });

  revalidatePath('/portal/kulture');
  revalidatePath('/kulture/products');

  return { status: 'success', message: sponsorId ? 'Partner recorded.' : 'Partner cleared.' };
}
