'use client';

import { useEffect } from 'react';
import { Container, Section } from '@/components/palma/layout';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[palma] unhandled error', error);
  }, [error]);

  return (
    <Section className="py-28">
      <Container className="flex flex-col items-center gap-8 text-center">
        <PalmMark className="text-stone-deep h-12" />
        <div className="flex max-w-140 flex-col gap-4">
          <span className="palma-label text-taupe-deep">Something went wrong</span>
          <h1 className="text-4xl sm:text-5xl">The record is intact</h1>
          <p className="text-taupe-deep leading-relaxed">
            This page could not be rendered. Nothing has been changed, PALMA does not alter the
            record on a failed request.
          </p>
          {error.digest ? (
            <p className="text-taupe font-mono text-xs">Reference {error.digest}</p>
          ) : null}
        </div>
        <Button type="button" size="sm" onClick={reset}>
          Try again
        </Button>
      </Container>
    </Section>
  );
}
