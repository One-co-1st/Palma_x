import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTACTS, ENTITY, icoStatus, LEGAL_DOCUMENTS, legalDocument } from '@/lib/legal';
import { LEGAL_NAV } from '@/lib/navigation';

/**
 * The register is the source of truth for the legal layer: the index page, the
 * sitemap, llms.txt and the footer all read from it. That only holds if every
 * registered document actually has a page behind it — a link in the footer to
 * a 404 is worse than no link at all.
 */

const appRoot = fileURLToPath(new URL('../src/app/(public)', import.meta.url));

describe('the legal register', () => {
  it('has a page for every registered document', () => {
    for (const entry of LEGAL_DOCUMENTS) {
      expect(
        existsSync(`${appRoot}/legal/${entry.slug}/page.tsx`),
        `no page for /legal/${entry.slug}`,
      ).toBe(true);
    }
  });

  it('has an index page', () => {
    expect(existsSync(`${appRoot}/legal/page.tsx`)).toBe(true);
  });

  it('links every document from the footer register', () => {
    for (const entry of LEGAL_DOCUMENTS) {
      expect(
        LEGAL_NAV.some((item) => item.href === `/legal/${entry.slug}`),
        `${entry.slug} is not in LEGAL_NAV`,
      ).toBe(true);
    }
  });

  it('points every footer register link at a registered document', () => {
    for (const item of LEGAL_NAV) {
      if (item.href === '/legal') continue;
      const slug = item.href.replace('/legal/', '');
      expect(legalDocument(slug), `${item.href} is not in the register`).toBeDefined();
    }
  });

  it('gives every document a unique slug, a version and an effective date', () => {
    const slugs = new Set<string>();
    for (const entry of LEGAL_DOCUMENTS) {
      expect(slugs.has(entry.slug), `duplicate slug ${entry.slug}`).toBe(false);
      slugs.add(entry.slug);

      expect(entry.version).toMatch(/^\d+\.\d+$/);
      expect(entry.effective).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(entry.effective).getTime())).toBe(false);
    }
  });

  it('states a status honestly rather than leaving it implied', () => {
    for (const entry of LEGAL_DOCUMENTS) {
      expect(['in-force', 'draft']).toContain(entry.status);
    }
  });

  it('uses the palmaawards.com domain for every published address', () => {
    for (const address of Object.values(CONTACTS)) {
      expect(address.endsWith('@palmaawards.com'), address).toBe(true);
    }
  });
});

/**
 * The parent company, and where it may not appear.
 *
 * PALMA is a One Cō Ltd company. It is recorded so the institution knows its
 * own ownership and shown on the settings screen behind a login, and it is
 * deliberately absent from everything a visitor or a crawler can read.
 *
 * These assertions read the public files on disk, because the point is not
 * what a constant says but what is actually served.
 */
describe('the parent company', () => {
  it('is recorded, with its spelling held', () => {
    // "One Co Ltd" is a different company name, and the macron is the kind of
    // character a keyboard or a spellchecker quietly flattens.
    expect(ENTITY.parent.name).toBe('One Cō Ltd');
    expect(ENTITY.parent.name).toContain('\u014d');
    expect(ENTITY.parent.name).not.toBe(ENTITY.name);
  });

  it('is marked as not published', () => {
    expect(ENTITY.parent.published).toBe(false);
  });

  it('appears in no public file that is served as-is', () => {
    const here = fileURLToPath(new URL('.', import.meta.url));
    for (const file of ['../public/humans.txt', '../public/.well-known/palma.txt']) {
      const path = join(here, file);
      expect(existsSync(path), file).toBe(true);
      const body = readFileSync(path, 'utf8');
      expect(body, file).not.toContain('One Cō');
      expect(body, file).not.toContain('One Co Ltd');
    }
  });

  it('appears in no page or route that renders it', () => {
    // The surfaces that used to carry it. A reference to ENTITY.parent in any
    // of these means it is being published again.
    const here = fileURLToPath(new URL('.', import.meta.url));
    const surfaces = [
      '../src/components/palma/SiteFooter.tsx',
      '../src/app/layout.tsx',
      '../src/lib/seo.tsx',
      '../src/app/llms.txt/route.ts',
      '../src/app/(public)/legal/page.tsx',
    ];
    for (const file of surfaces) {
      const body = readFileSync(join(here, file), 'utf8');
      expect(body, file).not.toContain('ENTITY.parent');
      expect(body, file).not.toContain('One Cō');
    }
  });
});

describe('the ICO registration', () => {
  it('is registered', () => {
    expect(ENTITY.icoRegistered).toBe(true);
  });

  it('says registered rather than pending while the reference is outstanding', () => {
    // The wrong thing here is not a blank. It is the register still saying an
    // application is pending after it has been granted.
    expect(icoStatus(ENTITY)).toBe('Registered; reference to follow');
    expect(icoStatus(ENTITY)).not.toMatch(/pending/i);
  });

  it('shows the reference once there is one', () => {
    expect(icoStatus({ icoRegistered: true, icoRegistration: 'ZA123456' })).toBe('ZA123456');
  });

  it('still says pending where nothing has been applied for', () => {
    expect(icoStatus({ icoRegistered: false, icoRegistration: null })).toBe('Application pending');
  });
});
