'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

/**
 * A submit button that knows its form is busy.
 *
 * `useFormStatus` reads the pending state of the form this button sits inside,
 * which means a plain server-action form gets the same feedback a
 * `useActionState` form gets from its own `pending` flag — without the page
 * having to become a client component to hold that state.
 *
 * Two things it fixes, and the second is the one that matters. It tells the
 * visitor the click landed, on a form whose action costs a server round trip;
 * and being disabled while pending, it stops the same action being fired three
 * times by somebody who thought the first two had failed.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending || undefined} {...props}>
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
