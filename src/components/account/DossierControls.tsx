'use client';

import { Button } from '@/components/ui/button';
import {
  archiveDossierEntry,
  markAllDossierRead,
  markDossierEntryRead,
  restoreDossierEntry,
} from '@/server/actions/dossier';

/**
 * Plain forms rather than fetch handlers, so the Dossier works before it
 * hydrates. A page whose only job is to tell you what happened should not
 * depend on JavaScript to do it.
 */

export function MarkAllRead() {
  return (
    <form action={markAllDossierRead}>
      <Button type="submit" variant="ghost" size="sm">
        Mark all as read
      </Button>
    </form>
  );
}

export function DossierEntryControls({
  id,
  archived,
  unread,
  important,
}: {
  id: string;
  archived: boolean;
  unread: boolean;
  important: boolean;
}) {
  if (archived) {
    return (
      <form action={restoreDossierEntry}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" size="sm">
          Restore
        </Button>
      </form>
    );
  }

  // A consequential entry nobody has read yet cannot be filed away. Reading it
  // is the point, and the button says so rather than failing silently.
  const lockedShut = important && unread;

  return (
    <span className="flex flex-wrap items-center gap-3">
      {unread ? (
        <form action={markDossierEntryRead}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm">
            Mark as read
          </Button>
        </form>
      ) : null}

      <form action={archiveDossierEntry}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" size="sm" disabled={lockedShut}>
          {lockedShut ? 'Read it first' : 'File it away'}
        </Button>
      </form>
    </span>
  );
}
