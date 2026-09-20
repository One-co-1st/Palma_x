import * as React from 'react';
import { cn } from '@/lib/utils';
import { PalmMark } from '@/components/brand/PalmMark';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-stone-deep flex flex-col items-center gap-4 border border-dashed px-6 py-16 text-center',
        className,
      )}
    >
      <PalmMark className="text-stone-deep h-8" />
      <div className="flex flex-col gap-2">
        <h3 className="text-xl">{title}</h3>
        {description ? (
          <p className="text-taupe-deep mx-auto max-w-100 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('bg-stone/60 motion-safe:animate-pulse', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function Notice({
  tone = 'neutral',
  title,
  children,
  className,
}: {
  tone?: 'neutral' | 'ceremonial' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: 'border-stone-deep bg-stone/25 text-ink',
    ceremonial: 'border-champagne-deep/60 bg-champagne/12 text-ink',
    warning: 'border-olive/40 bg-olive/8 text-olive',
    error: 'border-red-900/30 bg-red-900/5 text-red-900',
  } as const;

  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('border px-5 py-4 text-sm leading-relaxed', tones[tone], className)}
    >
      {title ? <p className="palma-label mb-2">{title}</p> : null}
      {children}
    </div>
  );
}
