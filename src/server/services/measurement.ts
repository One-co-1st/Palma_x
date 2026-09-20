import 'server-only';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import { dayOf, isCountable, normalisePath, normaliseTerm, surfaceOf } from '@/domain/measurement';

/**
 * Writing a count.
 *
 * Two functions, both of which take a string and increment an integer. There is
 * no third argument carrying a visitor, because there is no visitor: whatever
 * the caller knows about who made the request, it does not pass it here and
 * this file could not store it if it did.
 *
 * Both are best-effort. A counter is a vanity figure for the institution's own
 * use — nothing in the judging path reads one — so a failed increment must
 * never turn into a failed page. They swallow their errors deliberately, which
 * is the opposite of the rule everywhere else in this codebase and is the
 * reason it is written down here.
 */

/** Record one request for a page. Returns whether it was countable at all. */
export async function countPage(rawPath: string): Promise<boolean> {
  const path = normalisePath(rawPath);
  if (!path || !isCountable(path)) return false;

  const day = dayOf();
  const surface = surfaceOf(path);

  try {
    // Postgres does this atomically, so two simultaneous requests for the same
    // page on the same day increment to two rather than racing to one.
    await sql`
      insert into "PageCount" (id, path, day, surface, count)
      values (${createId()}, ${path}, ${day}, ${surface}, 1)
      on conflict (path, day) do update set
        count = "PageCount".count + 1
    `;
    return true;
  } catch (error) {
    console.error('[palma:measurement] could not count a page view', error);
    return false;
  }
}

/** Record one search, and what it found. */
export async function countSearch(
  scope: string,
  rawTerm: string,
  results: number,
): Promise<boolean> {
  const term = normaliseTerm(rawTerm);
  if (!term) return false;

  const day = dayOf();

  try {
    await sql`
      insert into "SearchCount" (id, scope, term, day, count, results)
      values (${createId()}, ${scope}, ${term}, ${day}, 1, ${results})
      on conflict (scope, term, day) do update set
        count = "SearchCount".count + 1,
        results = excluded.results
    `;
    return true;
  } catch (error) {
    console.error('[palma:measurement] could not count a search', error);
    return false;
  }
}
