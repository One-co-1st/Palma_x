import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'palma-badge-live palma-label inline-flex items-center gap-1.5 border px-2.5 py-1.5 leading-none',
  {
    variants: {
      variant: {
        default: 'border-stone-deep/70 bg-transparent text-taupe-deep',
        ink: 'border-ink/15 bg-ink text-ivory',
        olive: 'border-olive/25 bg-olive/10 text-olive',
        champagne: 'border-champagne-deep/50 bg-champagne/15 text-ink',
        /** The ceremonial badge on an ink surface: ink text would disappear. */
        champagneDark: 'border-champagne-deep/70 bg-champagne/12 text-champagne',
        outlineIvory: 'border-ivory/30 bg-transparent text-ivory/80',
        muted: 'border-transparent bg-stone/50 text-taupe-deep',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** A pill is a badge with a softer, rounded register — used for filters. */
export function Pill({
  className,
  active = false,
  ...props
}: React.ComponentProps<'span'> & { active?: boolean }) {
  return (
    <span
      className={cn(
        'palma-chip palma-label inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2',
        active
          ? 'border-ink bg-ink text-ivory'
          : 'border-stone-deep/70 text-taupe-deep hover:border-ink/40 hover:text-ink',
        className,
      )}
      {...props}
    />
  );
}

export { badgeVariants };
