import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Two-digit ordinal used throughout the editorial layouts: 01, 02, 03… */
export function ordinal(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/**
 * Roman numerals, for the legal register.
 *
 * An institution that keeps a permanent record numbers its clauses the way a
 * statute does. It is also quietly practical: "clause XIV" cannot be confused
 * with a date, a version or a paragraph count the way "14" can, and a citation
 * in a complaint stays unambiguous.
 *
 * Capped at the numbers a document actually reaches; nothing here needs to
 * express 4,000.
 */
export function roman(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';

  const table: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let remaining = Math.floor(value);
  let out = '';

  for (const [amount, numeral] of table) {
    while (remaining >= amount) {
      out += numeral;
      remaining -= amount;
    }
  }

  return out;
}
