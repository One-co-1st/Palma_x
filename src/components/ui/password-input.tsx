'use client';

import * as React from 'react';
import { LampDesk } from 'lucide-react';
import { Input } from '@/components/ui/form';
import { cn } from '@/lib/utils';

/**
 * A password field with a desk lamp on it.
 *
 * The usual control for this is an eye, which is the wrong idea twice over: it
 * says somebody is watching, and a struck-through eye asks the reader to work
 * out that a crossed-out watcher means hidden. A lamp says the true thing
 * instead. The password is not being spied on, it is being lit so you can read
 * what you typed, and a lamp that is off is simply a lamp that is off.
 *
 * So the state is carried by the object rather than by a slash through it:
 * lit and upright while the characters are showing, tilted away and unlit
 * while they are not.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [lit, setLit] = React.useState(false);

  return (
    <div className="relative">
      <Input {...props} type={lit ? 'text' : 'password'} className={cn('pr-12', className)} />

      <button
        type="button"
        onClick={() => setLit((on) => !on)}
        // The field is what matters here; the lamp is reachable but does not
        // sit between the password and the submit button on the way through.
        tabIndex={-1}
        aria-pressed={lit}
        aria-label={lit ? 'Hide the password' : 'Show the password'}
        title={lit ? 'Hide the password' : 'Show the password'}
        className="text-taupe hover:text-taupe-deep focus-visible:outline-olive absolute inset-y-0 right-0 flex w-12 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
      >
        <LampDesk
          aria-hidden="true"
          className={cn(
            'size-5 transition-[transform,color] duration-300 ease-(--ease-ceremonial)',
            lit ? 'text-champagne-deep rotate-0' : '-rotate-45',
          )}
        />
      </button>
    </div>
  );
}
