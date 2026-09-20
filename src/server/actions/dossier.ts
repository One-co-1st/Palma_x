'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin, getSession } from '@/lib/auth/session';
import { sql } from '@/server/db/sql';

/**
 * Reading and filing.
 *
 * Every one of these is scoped by `userId` in the `where` clause rather than
 * checked after the fetch — an entry belonging to somebody else must not be
 * reachable by id, and the safest way to guarantee that is never to select it.
 */

export type DossierState = { status: 'idle' | 'error' | 'success'; message?: string };

export async function markDossierEntryRead(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await sql`
    update "Notification"
    set "readAt" = ${new Date()}
    where id = ${id} and "userId" = ${session.user.id} and "readAt" is null
  `;

  revalidatePath('/creator/dossier');
}

export async function markAllDossierRead(): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  await sql`
    update "Notification"
    set "readAt" = ${new Date()}
    where "userId" = ${session.user.id} and "readAt" is null and "archivedAt" is null
  `;

  revalidatePath('/creator/dossier');
}

/**
 * Filing an entry away.
 *
 * Archiving is not deleting: the entry stays, and the archive is one click
 * from the front of the Dossier. PALMA does not offer a way to destroy a
 * notice that it did something to you — that would make the Dossier a place
 * where inconvenient history goes missing.
 *
 * An unread important entry cannot be archived. Reading it first is the point.
 */
export async function archiveDossierEntry(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await sql`
    update "Notification"
    set "archivedAt" = ${new Date()}, "readAt" = ${new Date()}
    where id = ${id}
      and "userId" = ${session.user.id}
      and "archivedAt" is null
      and not ("isImportant" = true and "readAt" is null)
  `;

  revalidatePath('/creator/dossier');
}

export async function restoreDossierEntry(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await sql`
    update "Notification"
    set "archivedAt" = null
    where id = ${id} and "userId" = ${session.user.id} and "archivedAt" is not null
  `;

  revalidatePath('/creator/dossier');
}
