import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table
        className={cn('w-full min-w-150 border-collapse text-left text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn(
        'border-stone-deep [&_th]:palma-label [&_th]:text-taupe-deep border-b [&_th]:py-3',
        className,
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      className={cn('[&_tr]:border-stone-deep/50 [&_td]:py-3.5 [&_tr]:border-b', className)}
      {...props}
    />
  );
}
