import { describe, expect, it } from 'vitest';
import { parseCreatorImport, splitLine, labelFor } from '@/domain/creator-import';

const isValidCountry = (code: string) => ['GB', 'IE', 'NG', 'GH', 'US'].includes(code);
const parse = (text: string) => parseCreatorImport(text, { isValidCountry });

/**
 * The importer exists so an archive can be preset for claiming. What matters
 * is that it never guesses: a line it cannot read is reported with its number
 * rather than half-written.
 */
describe('reading a pasted list', () => {
  it('takes a tab-separated paste from a spreadsheet', () => {
    const plan = parse('Ama Mensah\tGH\tAccra\tDocumentary shorts\thttps://youtube.com/@ama');
    expect(plan.problems).toEqual([]);
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({
      displayName: 'Ama Mensah',
      countryCode: 'GH',
      city: 'Accra',
      headline: 'Documentary shorts',
    });
    expect(plan.rows[0]!.links).toEqual([{ label: 'YouTube', url: 'https://youtube.com/@ama' }]);
  });

  it('takes commas, and keeps a comma inside a quoted headline', () => {
    const plan = parse('Ruairi Doyle,IE,Cork,"Audio essays, mostly"');
    expect(plan.problems).toEqual([]);
    expect(plan.rows[0]?.headline).toBe('Audio essays, mostly');
  });

  it('skips the header row people paste with the data', () => {
    const plan = parse('name,country\nAma Mensah,GH');
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]?.displayName).toBe('Ama Mensah');
  });

  it('ignores blank lines and comments', () => {
    const plan = parse('# the shortlist\n\nAma Mensah,GH\n\n');
    expect(plan.rows).toHaveLength(1);
    expect(plan.problems).toEqual([]);
  });

  it('defaults a missing country rather than refusing the row', () => {
    const plan = parse('Ama Mensah');
    expect(plan.rows[0]?.countryCode).toBe('GB');
  });

  it('refuses a country it does not recognise, naming the line', () => {
    const plan = parse('Ama Mensah,Ghana');
    expect(plan.rows).toEqual([]);
    expect(plan.problems[0]?.line).toBe(1);
    expect(plan.problems[0]?.detail).toContain('Ghana');
  });

  it('refuses a link that is not a link rather than dropping it', () => {
    const plan = parse('Ama Mensah,GH,,,not-a-url');
    expect(plan.rows).toEqual([]);
    expect(plan.problems[0]?.detail).toContain('not-a-url');
  });

  it('refuses a non-web scheme', () => {
    const plan = parse('Ama Mensah,GH,,,javascript:alert(1)');
    expect(plan.rows).toEqual([]);
    expect(plan.problems).toHaveLength(1);
  });

  it('reports a name that appears twice in the same paste', () => {
    const plan = parse('Ama Mensah,GH\nAma Mensah,GH');
    expect(plan.rows).toHaveLength(1);
    expect(plan.problems[0]?.detail).toContain('line 1');
  });

  it('caps the links it will take from one row', () => {
    const many = Array.from({ length: 9 }, (_, index) => `https://example.com/${index}`).join(' ');
    const plan = parse(`Ama Mensah,GH,,,${many}`);
    expect(plan.rows[0]?.links).toHaveLength(6);
  });

  it('refuses a list longer than the importer will take', () => {
    const rows = Array.from({ length: 501 }, (_, index) => `Creator ${index},GB`).join('\n');
    const plan = parse(rows);
    expect(plan.problems.some((problem) => problem.line === 0)).toBe(true);
  });
});

describe('splitting a line', () => {
  it('prefers tabs, so a comma in a headline is safe', () => {
    expect(splitLine('a\tb, still b\tc')).toEqual(['a', 'b, still b', 'c']);
  });

  it('handles a doubled quote inside a quoted field', () => {
    expect(splitLine('a,"say ""hi""",c')).toEqual(['a', 'say "hi"', 'c']);
  });
});

describe('naming a link', () => {
  it('recognises the platforms creators actually use', () => {
    expect(labelFor(new URL('https://www.youtube.com/@x'))).toBe('YouTube');
    expect(labelFor(new URL('https://x.com/x'))).toBe('X');
  });

  it('falls back to the host rather than inventing a name', () => {
    expect(labelFor(new URL('https://ama-mensah.co.uk/work'))).toBe('ama-mensah.co.uk');
  });
});
