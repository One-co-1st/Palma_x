import * as React from 'react';
import Link from 'next/link';
import { Container, Section } from './layout';
import { Masthead, MastheadPlate, PlateFact } from './Masthead';
import { Notice } from '@/components/ui/feedback';
import { formatDate } from '@/lib/format';
import { CONTACTS, LEGAL_DOCUMENTS, type LegalDocument as Doc } from '@/lib/legal';
import { roman, slugify } from '@/lib/utils';

/**
 * The legal document layout.
 *
 * Legal text is only useful if it can be navigated, cited and checked. Every
 * document therefore carries a version, an effective date, an honest status, a
 * numbered contents list, and a stable anchor on every clause — so a paragraph
 * can be linked to in a complaint or an email rather than described.
 *
 * Each section also opens with one plain sentence. A document nobody can read
 * is not a protection; it is a place to hide.
 */

export type LegalSection = {
  heading: string;
  /** One sentence, before the clauses, in the plainest available words. */
  plainly?: string;
  body: React.ReactNode;
};

export function LegalDocumentPage({
  document: doc,
  sections,
  intro,
}: {
  document: Doc;
  sections: LegalSection[];
  intro?: React.ReactNode;
}) {
  const anchors = sections.map((section) => ({
    id: slugify(section.heading),
    heading: section.heading,
  }));

  return (
    <>
      <Masthead
        tone="ivory"
        size="compact"
        eyebrow={
          <>
            <Link href="/legal" className="palma-link">
              Legal
            </Link>
            {' · '}
            {doc.shortTitle}
          </>
        }
        title={doc.title}
        standfirst={doc.plainly}
        meta={[
          `Version ${doc.version}`,
          `Effective ${formatDate(doc.effective)}`,
          doc.status === 'in-force' ? 'In force' : 'Superseded',
        ]}
        plate={
          <MastheadPlate tone="ivory" label="This document">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact tone="ivory" term="Version">
                {doc.version}
              </PlateFact>
              <PlateFact tone="ivory" term="Effective">
                {formatDate(doc.effective)}
              </PlateFact>
              <PlateFact tone="ivory" term="Status">
                {doc.status === 'in-force' ? 'In force' : 'Superseded'}
              </PlateFact>
              <PlateFact tone="ivory" term="Clauses">
                {sections.length}
              </PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section className="py-14 sm:py-18">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Contents. Sticky on desktop so a long document stays navigable. */}
            <nav
              aria-label={`${doc.title} contents`}
              className="min-w-0 lg:sticky lg:top-28 lg:col-span-4 lg:self-start"
            >
              <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                Contents
              </h2>
              <ol className="mt-4 flex flex-col">
                {anchors.map((anchor, index) => (
                  <li key={anchor.id}>
                    <a
                      href={`#${anchor.id}`}
                      className="palma-row group/card border-stone-deep/60 flex items-baseline gap-4 border-b py-3 last:border-none"
                    >
                      <span className="palma-numeral text-taupe w-10 shrink-0 text-right">
                        {roman(index + 1)}
                      </span>
                      <span className="palma-row-lead text-[0.9375rem] leading-snug">
                        {anchor.heading}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>

              <div className="border-stone-deep mt-8 border-t pt-6">
                <p className="text-taupe-deep text-sm leading-relaxed">
                  Questions about this document:{' '}
                  <a href={`mailto:${CONTACTS.general}`} className="palma-link text-ink">
                    {CONTACTS.general}
                  </a>
                </p>
              </div>
            </nav>

            {/* A grid item defaults to min-width:auto, so a wide LegalTable would
                stretch the track and scroll the whole page instead of itself. */}
            <div className="min-w-0 lg:col-span-8">
              {doc.status === 'superseded' ? (
                <Notice tone="warning" title="Superseded" className="mb-10">
                  A later version of this document is in force. This one is kept readable so that
                  the terms governing a past season can still be produced, an institution that
                  quietly rewrites its terms has no terms.{' '}
                  <Link href={`/legal/${doc.slug}`} className="palma-link text-ink">
                    Read the current version
                  </Link>
                  .
                </Notice>
              ) : null}

              {intro ? <div className="palma-prose mb-12 max-w-none">{intro}</div> : null}

              <div className="flex flex-col gap-14">
                {sections.map((section, index) => (
                  <section
                    key={section.heading}
                    id={slugify(section.heading)}
                    className="min-w-0 scroll-mt-28"
                  >
                    <div className="flex items-baseline gap-4 sm:gap-5">
                      <span
                        aria-hidden="true"
                        className="palma-numeral text-champagne-deep shrink-0 text-lg sm:text-xl"
                      >
                        {roman(index + 1)}
                      </span>
                      <h2 className="text-3xl leading-tight sm:text-4xl">{section.heading}</h2>
                    </div>

                    {/* Draws itself in when the clause comes into view. A
                        register should feel written rather than dumped. */}
                    <span aria-hidden="true" className="palma-clause-rule mt-5 block" />

                    {section.plainly ? (
                      <p className="border-olive/40 text-ink/85 font-display mt-6 border-l-2 pl-5 text-lg leading-snug">
                        {section.plainly}
                      </p>
                    ) : null}

                    <div className="palma-prose [&_p:first-of-type::first-letter]:leading-inherit mt-6 max-w-none [&_p:first-of-type::first-letter]:float-none [&_p:first-of-type::first-letter]:text-inherit">
                      {section.body}
                    </div>
                  </section>
                ))}
              </div>

              <div className="border-stone-deep mt-16 border-t pt-8">
                <h2 className="palma-label text-taupe-deep">The rest of the register</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {LEGAL_DOCUMENTS.filter((entry) => entry.slug !== doc.slug).map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        href={`/legal/${entry.slug}`}
                        className="palma-quiet-link text-taupe-deep hover:text-ink text-sm"
                      >
                        {entry.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

/**
 * A numbered clause list, which is how these documents are cited.
 *
 * `lettered` switches to (a), (b), (c) — the convention for a list of
 * conditions inside a clause, as against the clauses themselves.
 */
export function Clauses({
  items,
  lettered = false,
}: {
  items: React.ReactNode[];
  lettered?: boolean;
}) {
  return (
    <ol className="text-taupe-deep flex list-none flex-col gap-4 pl-0">
      {items.map((item, index) => (
        <li key={index} className="flex gap-4">
          <span
            className={
              lettered
                ? 'text-taupe shrink-0 pt-1 font-mono text-sm'
                : 'palma-numeral text-taupe w-8 shrink-0 pt-1 text-right text-sm'
            }
          >
            {lettered ? `(${String.fromCharCode(97 + index)})` : roman(index + 1)}
          </span>
          <span className="text-[1.0625rem] leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** A definition table — retention schedules, data categories, cookie lists. */
export function LegalTable({
  caption,
  head,
  rows,
}: {
  caption?: string;
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="border-stone-deep my-8 w-full overflow-x-auto border">
      <table className="w-full min-w-140 border-collapse text-left text-sm">
        {caption ? (
          <caption className="palma-label text-taupe-deep border-stone-deep border-b p-4 text-left">
            {caption}
          </caption>
        ) : null}
        <thead className="border-stone-deep border-b">
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="palma-label text-taupe-deep p-4">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-stone-deep/50 hover:bg-stone/25 border-b transition-colors last:border-none"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="text-ink/85 p-4 align-top leading-relaxed">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
