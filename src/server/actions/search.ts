'use server';

import { authorise } from '@/lib/auth/guards';
import { searchEverything, type SearchHit } from '@/server/data/people';

export type PaletteResult = { hits: SearchHit[] };

/**
 * The command palette's query.
 *
 * Authorised on every keystroke rather than once when the palette opened: a
 * session can end, or a role can be taken away, while a dialog is sitting open
 * on somebody's screen.
 */
export async function searchAdmin(query: string): Promise<PaletteResult> {
  try {
    await authorise('creators:view_records');
  } catch {
    return { hits: [] };
  }

  return { hits: (await searchEverything(query)).slice(0, 12) };
}
