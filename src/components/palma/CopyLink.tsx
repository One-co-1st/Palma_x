'use client';

import * as React from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CopyLink({
  value,
  label = 'Copy verification link',
  variant = 'outline',
}: {
  value: string;
  label?: string;
  variant?: 'outline' | 'quiet' | 'ghost';
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard permission denied — the link is always visible as text too.
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant={variant} size="sm" onClick={copy} aria-live="polite">
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

/**
 * The same thing, at the size of a piece of punctuation.
 *
 * `CopyLink` is a button with a label, which is right when copying is the
 * point of the moment. Most links on the site are not that: they are printed
 * as text, beside other text, and a full button next to each one would turn a
 * record into a control panel. This is the mark a reader can reach for when
 * they want the address, and ignore the rest of the time.
 */
export function CopyMark({
  value,
  label = 'Copy this link',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Denied, or an insecure origin. The address is printed as text
          // beside this, so there is always another way to take it.
          setCopied(false);
        }
      }}
      // Announced on demand rather than narrated: the icon swap is for the eye,
      // and the label carries the state for everyone else.
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className={cn(
        'text-taupe hover:text-ink focus-visible:outline-olive inline-flex size-6 shrink-0 items-center justify-center align-middle transition-colors focus-visible:outline-2',
        className,
      )}
    >
      {copied ? (
        <Check className="text-olive size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
