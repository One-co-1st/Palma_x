'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { removePortrait, uploadPortrait, type PortraitState } from '@/server/actions/portrait';

const initial: PortraitState = { status: 'idle' };

export type PortraitStanding = {
  status: 'none' | 'published' | 'withdrawn';
  url: string | null;
  alt: string | null;
  withdrawnReason: string | null;
};

/**
 * Uploading a portrait.
 *
 * There is no review step, so the rule has to be visible before the file is
 * chosen rather than delivered afterwards as a refusal. It sits above the
 * picker, in the plainest words available, and it is the first thing on the
 * page: nobody has ever read a content policy they had to go looking for.
 *
 * The preview is the file the creator chose, drawn locally. What PALMA
 * publishes is a re-encoded square crop of it — so the preview is shown in the
 * same aspect the record uses, rather than letting somebody upload a tall
 * photograph and be surprised by the crop.
 */
export function PortraitForm({ standing, name }: { standing: PortraitStanding; name: string }) {
  const [state, action, pending] = useActionState(uploadPortrait, initial);
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Notice tone="warning" title="No nudes">
        Your portrait goes straight onto your record — nobody approves it first, so read this before
        you choose a file. It has to be safe for every audience: no nudity, nothing sexual, nothing
        explicit. PALMA honours adult creators and is not an adult site, and the difference is held
        here. Anything that crosses it is taken down and deleted, and doing it on purpose is grounds
        for losing the account.
      </Notice>

      {state.status !== 'idle' && state.message ? (
        <Notice
          tone={state.status === 'error' ? 'error' : 'ceremonial'}
          title={state.status === 'error' ? 'Not accepted' : 'Published'}
        >
          {state.message}
        </Notice>
      ) : null}

      {standing.status === 'withdrawn' && standing.withdrawnReason ? (
        <Notice tone="error" title="PALMA took this one down">
          {standing.withdrawnReason} The image was deleted. Upload a different one whenever you like
          — this note goes with it.
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-start gap-7">
        <div className="w-36 shrink-0">
          {preview ? (
            // A local object URL for a file the browser already holds: nothing
            // to optimise, and next/image cannot take a blob: source anyway.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="border-stone-deep aspect-square w-full border object-cover"
            />
          ) : (
            <EditorialImage
              name={name}
              src={standing.url}
              alt={standing.alt}
              ratio="square"
              sizes="9rem"
            />
          )}
          <p className="palma-label text-taupe mt-3 text-center">
            {preview
              ? 'Chosen'
              : standing.status === 'published'
                ? 'On your record'
                : 'PALMA plate'}
          </p>
        </div>

        <form action={action} className="flex min-w-60 flex-1 flex-col gap-5">
          <Field
            htmlFor="portrait"
            label="Choose an image"
            hint="JPEG, PNG, WebP or AVIF, at least 200×200, up to 8MB. PALMA crops it square."
          >
            <Input
              id="portrait"
              name="portrait"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onPick}
              className="file:palma-label file:border-stone-deep file:text-ink h-auto py-2.5 file:mr-4 file:border file:bg-transparent file:px-3 file:py-1.5"
            />
          </Field>

          <Field
            htmlFor="alt"
            label="Describe it"
            hint="For anyone who cannot see the image. “Ama in a studio, mid-laugh” is plenty."
          >
            <Input id="alt" name="alt" defaultValue={standing.alt ?? ''} maxLength={300} />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="md" disabled={pending}>
              {pending
                ? 'Publishing…'
                : standing.status === 'published'
                  ? 'Replace it'
                  : 'Publish it'}
            </Button>
            {standing.status !== 'none' ? (
              <Badge variant={standing.status === 'published' ? 'olive' : 'muted'}>
                {standing.status === 'published' ? 'On your record' : 'Taken down'}
              </Badge>
            ) : null}
          </div>
        </form>
      </div>

      {standing.status === 'published' ? (
        <form action={removePortrait}>
          <Button type="submit" variant="ghost" size="sm">
            Remove it from my record
          </Button>
        </form>
      ) : null}

      <p className="text-taupe text-xs leading-relaxed">
        PALMA does not store the file you send. It is decoded, stripped of every scrap of metadata,
        including the GPS coordinates a phone writes into a photograph, resized and re-encoded, and
        only that version is kept. Replacing a portrait replaces its address too, so nothing is left
        holding the old one.
      </p>
    </div>
  );
}
