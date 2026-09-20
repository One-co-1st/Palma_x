'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { isCountable } from '@/domain/measurement';

/**
 * Tells PALMA a page was read.
 *
 * One `fetch` per page, carrying a pathname. It sets no cookie, reads no
 * storage, and sends nothing about the person reading — not a referrer, not a
 * screen size, not a timing. There is no state, so there is nothing to
 * correlate a second visit against even in principle.
 *
 * `keepalive` lets the request survive the reader navigating away immediately,
 * which is the difference between counting a page and counting only the pages
 * people stayed on.
 *
 * The signed-in surfaces are filtered before the request rather than after:
 * `isCountable` would reject `/admin` anyway, but an operator's browser should
 * not be announcing which internal page they are on at all, even to a handler
 * that would discard it.
 */
export function PageCounter() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (!pathname || !isCountable(pathname)) return;

    // Errors are swallowed on purpose. A counter that could interrupt a reader
    // — a failed request surfacing in the console of somebody reading the Roll
    // of Honour — would be a worse thing than an undercount.
    void fetch('/api/count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
