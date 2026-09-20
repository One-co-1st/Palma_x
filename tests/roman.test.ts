import { describe, expect, it } from 'vitest';
import { roman } from '@/lib/utils';

describe('roman numerals', () => {
  it('numbers the clauses a legal document actually reaches', () => {
    expect(roman(1)).toBe('I');
    expect(roman(4)).toBe('IV');
    expect(roman(9)).toBe('IX');
    expect(roman(14)).toBe('XIV');
    expect(roman(19)).toBe('XIX');
    expect(roman(27)).toBe('XXVII');
    expect(roman(40)).toBe('XL');
  });

  it('returns nothing rather than nonsense for a bad index', () => {
    expect(roman(0)).toBe('');
    expect(roman(-3)).toBe('');
    expect(roman(Number.NaN)).toBe('');
  });
});
