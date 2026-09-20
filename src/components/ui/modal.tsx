'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

export function ModalContent({
  className,
  title,
  description,
  children,
  side = 'centre',
}: {
  className?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** `drawer` slides from the right on desktop and the bottom on mobile. */
  side?: 'centre' | 'drawer';
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bg-ink/45 data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in fixed inset-0 z-50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'border-stone-deep bg-ivory-bright fixed z-50 flex max-h-[90dvh] flex-col overflow-y-auto border shadow-[0_40px_120px_-60px_rgba(22,23,25,0.8)] focus:outline-none',
          side === 'centre'
            ? 'top-1/2 left-1/2 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2'
            : 'inset-x-0 bottom-0 w-full sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(28rem,90vw)]',
          className,
        )}
      >
        <div className="border-stone-deep flex items-start justify-between gap-6 border-b px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <DialogPrimitive.Title className="text-xl leading-tight">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-taupe-deep text-sm">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="text-taupe-deep hover:text-ink -mr-1 shrink-0 p-1 transition-colors"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="px-6 py-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
