'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { isValidCountryCode } from '@/lib/countries';
import { slugify } from '@/lib/utils';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { MAX_IMPORT_ROWS, parseCreatorImport, type ImportRow } from '@/domain/creator-import';
import { linkIsPublishableUnclaimed } from '@/domain/record-minimalism';

/**
 * Presetting the archive.
 *
 * PALMA's records exist before their creators do — that is the whole premise
 * of the claim flow — and writing them one at a time stops being possible at
 * about thirty. This takes a pasted list and writes unclaimed, unpublished
 * records ready to be claimed.
 *
 * Three deliberate constraints. Nothing is published: an imported record is a
 * stub the editorial desk still has to finish, and a bulk route that could
 * publish would be a bulk route that eventually publishes something nobody
 * read. Nothing is overwritten: a name already in the archive is reported and
 * skipped, because "import" must never be a way to quietly rewrite a record
 * somebody holds.
 *
 * And nothing beyond the minimum is stored. A bulk importer is exactly where
 * "we may as well capture the city while we are here" happens, so the city and
 * the headline are dropped on the way in — see `record-minimalism`. PALMA does
 * not collect information about an unclaimed creator because it might be
 * useful later.
 */

export type ImportState = {
  status: 'idle' | 'error' | 'preview' | 'success';
  message?: string;
  preview?: {
    rows: {
      line: number;
      displayName: string;
      countryCode: string;
      links: number;
      exists: boolean;
      /** Columns the minimalism rule drops before writing. */
      dropped: string[];
    }[];
    problems: { line: number; detail: string }[];
    writable: number;
  };
};

async function plan(text: string) {
  const parsed = parseCreatorImport(text, { isValidCountry: isValidCountryCode });

  // Which of these already exist, by the slug they would take.
  const slugs = parsed.rows.map((row) => slugify(row.displayName));
  const existing = slugs.length
    ? await sql<{ slug: string }[]>`
        select slug
        from "Creator"
        where slug in ${sql(slugs)}
      `
    : [];
  const taken = new Set(existing.map((row) => row.slug));

  return { parsed, taken };
}

export async function previewCreatorImport(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await assertSameOrigin();

  try {
    await authorise('editorial:import_creators');
  } catch {
    return { status: 'error', message: 'You are not authorised to import records.' };
  }

  const text = String(formData.get('rows') ?? '');
  if (!text.trim()) {
    return { status: 'error', message: 'Paste a list first.' };
  }

  const { parsed, taken } = await plan(text);

  if (parsed.rows.length === 0) {
    return {
      status: 'error',
      message: 'Nothing readable in that list.',
      preview: { rows: [], problems: parsed.problems, writable: 0 },
    };
  }

  const rows = parsed.rows.map((row) => ({
    line: row.line,
    displayName: row.displayName,
    countryCode: row.countryCode,
    links: row.links.filter((link) => linkIsPublishableUnclaimed(link.url)).length,
    exists: taken.has(slugify(row.displayName)),
    // Shown in the preview so the operator sees what is being dropped and why,
    // rather than discovering later that a column silently vanished.
    dropped: [row.city ? 'city' : null, row.headline ? 'headline' : null].filter(
      Boolean,
    ) as string[],
  }));

  const writable = rows.filter((row) => !row.exists).length;

  return {
    status: 'preview',
    message:
      writable === 0
        ? 'Every name in that list is already in the archive. Nothing would be written.'
        : `${writable} record${writable === 1 ? '' : 's'} would be created, unclaimed and unpublished.`,
    preview: { rows, problems: parsed.problems, writable },
  };
}

export async function commitCreatorImport(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:import_creators');
  } catch {
    return { status: 'error', message: 'You are not authorised to import records.' };
  }

  const text = String(formData.get('rows') ?? '');
  if (!text.trim()) return { status: 'error', message: 'Paste a list first.' };

  if (String(formData.get('confirm') ?? '') !== 'IMPORT') {
    return { status: 'error', message: 'Type IMPORT to confirm.' };
  }

  const { parsed, taken } = await plan(text);

  if (parsed.rows.length === 0) {
    return { status: 'error', message: 'Nothing readable in that list.' };
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    return {
      status: 'error',
      message: `That is more than ${MAX_IMPORT_ROWS} rows. Split the list.`,
    };
  }

  const writable = parsed.rows.filter((row) => !taken.has(slugify(row.displayName)));

  if (writable.length === 0) {
    return { status: 'error', message: 'Every name in that list is already in the archive.' };
  }

  // Slugs are claimed as we go, so two new names that slugify the same way
  // inside one import do not collide with each other either.
  const claimed = new Set(taken);
  let written = 0;

  for (const row of writable) {
    const slug = await uniqueSlug(row, claimed);
    claimed.add(slug);

    // Name, country, links. Nothing else, however much the paste contained.
    const links = row.links.filter((link) => linkIsPublishableUnclaimed(link.url));

    const creatorId = createId();
    await withTransaction(async (tx) => {
      await tx`
        insert into "Creator" (id, slug, "displayName", "countryCode", "isPublished", "isClaimed")
        values (${creatorId}, ${slug}, ${row.displayName}, ${row.countryCode}, false, false)
      `;

      await tx`
        insert into "CreatorVerification" (id, "creatorId", status)
        values (${createId()}, ${creatorId}, 'unverified')
      `;

      if (links.length > 0) {
        await tx`
          insert into "CreatorLink" ${sql(
            links.map((link, position) => ({
              id: createId(),
              creatorId,
              label: link.label,
              url: link.url,
              position,
            })),
          )}
        `;
      }

      await tx`
        insert into "CreatorNote" (id, "creatorId", "authorId", body)
        values (
          ${createId()},
          ${creatorId},
          ${session.user.id},
          ${`Imported in bulk by ${session.user.email}. Unclaimed stub: name, country and links only. Anything further about this creator waits until they claim the record or PALMA has a reason beyond convenience.`}
        )
      `;
    });

    written += 1;
  }

  await recordAudit({
    action: 'creators.imported',
    entityType: 'Creator',
    entityId: 'bulk',
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${written} record(s) imported, unclaimed and unpublished`,
    after: { written, skipped: parsed.rows.length - writable.length },
  });

  revalidatePath('/portal/creators');

  const skipped = parsed.rows.length - writable.length;

  return {
    status: 'success',
    message: `${written} record${written === 1 ? '' : 's'} created, unclaimed and unpublished.${
      skipped > 0
        ? ` ${skipped} already existed and ${skipped === 1 ? 'was' : 'were'} left alone.`
        : ''
    }`,
  };
}

async function uniqueSlug(row: ImportRow, claimed: Set<string>): Promise<string> {
  const base = slugify(row.displayName);
  let slug = base;

  for (let attempt = 2; ; attempt += 1) {
    if (!claimed.has(slug)) {
      const [existing] = await sql<{ id: string }[]>`
        select id
        from "Creator"
        where slug = ${slug}
        limit 1
      `;
      if (!existing) {
        return slug;
      }
    }
    slug = `${base}-${attempt}`;
  }
}
