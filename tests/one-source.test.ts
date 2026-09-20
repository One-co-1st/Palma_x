import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MAILBOX_ADDRESSES, MAILBOX_KEYS, MAIL_DOMAIN, mailbox } from '@/domain/mailboxes';
import { CONTACTS } from '@/lib/legal';
import { CHAMPAGNE, INK, IVORY } from '@/components/brand/geometry';
import { CATEGORY_PIGMENTS } from '@/lib/category-identity';

const here = fileURLToPath(new URL('.', import.meta.url));
const read = (file: string) => readFileSync(join(here, '..', file), 'utf8');

/**
 * One source of truth, enforced rather than intended.
 *
 * Every rule here is one that had already been broken once. A fact stated in
 * two places is not duplication, it is a future contradiction with a delay on
 * it: the second copy is always the one nobody remembers to change.
 */
describe('the mailboxes', () => {
  it('are written once and read everywhere', () => {
    // CONTACTS is display, MAILBOXES is dispatch. They used to be two hardcoded
    // copies of the same four strings.
    for (const value of Object.values(CONTACTS)) {
      expect(Object.values(MAILBOX_ADDRESSES)).toContain(value);
    }
  });

  it('never invents a fifth inbox', () => {
    expect(MAILBOX_KEYS).toHaveLength(4);
    for (const key of MAILBOX_KEYS) {
      expect(mailbox(key)).toBe(`${key}@${MAIL_DOMAIN}`);
    }
  });

  it('has no noreply address anywhere', () => {
    // A standing rule: PALMA writes from inboxes that can be written back to.
    for (const address of Object.values(MAILBOX_ADDRESSES)) {
      expect(address).not.toMatch(/no-?reply/i);
    }
  });

  it('is not retyped in the files that send or display it', () => {
    const files = [
      'src/lib/legal.ts',
      'src/server/email/messages.ts',
      'src/server/actions/objection.ts',
      'src/server/actions/account.ts',
    ];
    for (const file of files) {
      const body = read(file);
      for (const key of MAILBOX_KEYS) {
        expect(body, `${file} retypes ${key}@`).not.toContain(`${key}@${MAIL_DOMAIN}`);
      }
    }
  });
});

describe('the brand colours', () => {
  it('are defined once, in the geometry the mark is drawn from', () => {
    expect(INK).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(IVORY).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(CHAMPAGNE).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(new Set([INK, IVORY, CHAMPAGNE]).size).toBe(3);
  });

  it('are not restated by the share card', () => {
    // The share card is the version of PALMA that travels, so a shade of drift
    // there is the drift most people would see.
    const body = read('src/lib/share-card.tsx');
    expect(body).not.toMatch(/const\s+(INK|IVORY|CHAMPAGNE)\s*=/);
    expect(body).toContain("from '@/components/brand/geometry'");
  });

  it('gives the CSS tokens the same values the generated images use', () => {
    const css = read('src/app/globals.css');
    expect(css.toLowerCase()).toContain(INK.toLowerCase());
    expect(css.toLowerCase()).toContain(CHAMPAGNE.toLowerCase());
  });
});

describe('the palm geometry', () => {
  it('is drawn from one file, never inlined again', () => {
    // The mark had drifted into four different palms once. Anything that draws
    // it reads geometry.ts; a second copy of the path data is the regression.
    const spine = 'M24 53V9';
    const offenders = [
      'src/app/not-found.tsx',
      'src/components/palma/TheLaureate.tsx',
      'src/components/palma/SiteFooter.tsx',
      'src/lib/share-card.tsx',
    ].filter((file) => read(file).includes(spine));
    expect(offenders).toEqual([]);
  });
});

describe('the category pigments', () => {
  it('has one entry per Creator PALMA, with no duplicates', () => {
    expect(new Set(CATEGORY_PIGMENTS).size).toBe(CATEGORY_PIGMENTS.length);
    expect(CATEGORY_PIGMENTS).toHaveLength(12);
  });

  it('has a CSS token defined for every pigment it names', () => {
    // A pigment named here without a token renders as nothing at all.
    const css = read('src/app/globals.css');
    for (const pigment of CATEGORY_PIGMENTS) {
      expect(css, `--color-${pigment}`).toContain(`--color-${pigment}:`);
      expect(css, `--color-${pigment}-ink`).toContain(`--color-${pigment}-ink:`);
    }
  });
});
