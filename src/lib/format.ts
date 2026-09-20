const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const NUMBER = new Intl.NumberFormat('en-GB');

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return DATE.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return SHORT_DATE.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

const REGION = new Intl.DisplayNames(['en-GB'], { type: 'region' });

export function countryName(code: string | null | undefined): string {
  if (!code) return '—';
  try {
    return REGION.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
