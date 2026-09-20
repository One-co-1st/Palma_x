import { BadgeCheck, Award, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HONOUR_LABEL } from '@/domain/honours';
import type { HonourEntry, VerificationStatus } from '@/server/data/types';

export function VerificationBadge({
  status,
  className,
  tone = 'light',
}: {
  status: VerificationStatus;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  if (status !== 'verified') return null;
  return (
    <Badge
      variant={tone === 'dark' ? 'outlineIvory' : 'olive'}
      className={cn('gap-1.5', className)}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      Verified PALMA creator
    </Badge>
  );
}

export function AchievementBadge({
  kind,
  year,
  categoryName,
  times = 1,
  revoked = false,
  className,
}: {
  kind: HonourEntry['kind'];
  year?: number;
  categoryName?: string;
  /**
   * How many seasons the same honour has been conferred. Above one, the badge
   * collapses the repeats into a "2-time …" line rather than one row a year,
   * and the year is left to the per-season record.
   */
  times?: number;
  revoked?: boolean;
  className?: string;
}) {
  const Icon = kind === 'winner' ? Award : Medal;

  return (
    <span className={cn('flex items-start gap-3', className)}>
      <Icon
        className={cn(
          'mt-0.5 size-4.5 shrink-0',
          kind === 'winner' ? 'text-champagne-deep' : 'text-olive',
        )}
        aria-hidden="true"
      />
      <span className="flex flex-col gap-1">
        <span className="palma-label">{HONOUR_LABEL[kind]}</span>
        {categoryName ? (
          <span className={cn('text-ink text-[0.9375rem]', revoked && 'line-through opacity-60')}>
            {times > 1 ? `${times}-time ${categoryName}` : categoryName}
            {times <= 1 && year ? <span className="text-taupe-deep">, {year}</span> : null}
          </span>
        ) : null}
        {revoked ? <span className="palma-label text-red-800">Revoked</span> : null}
      </span>
    </span>
  );
}

export function HonourPill({ kind, year }: { kind: HonourEntry['kind']; year: number }) {
  return (
    <Badge variant={kind === 'winner' ? 'champagne' : 'default'}>
      {HONOUR_LABEL[kind]} · {year}
    </Badge>
  );
}

export { HONOUR_LABEL };
