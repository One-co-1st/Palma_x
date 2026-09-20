import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<'div'> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'border-stone-deep/60 bg-ivory-bright relative border',
        interactive &&
          'hover:border-ink/30 transition-[transform,border-color,box-shadow] duration-300 ease-(--ease-ceremonial) hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-32px_rgba(22,23,25,0.55)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-6 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-xl leading-tight', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'border-stone-deep/50 flex items-center justify-between gap-3 border-t p-6',
        className,
      )}
      {...props}
    />
  );
}
