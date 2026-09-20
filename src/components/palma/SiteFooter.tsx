import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';
import { PalmMark } from '@/components/brand/PalmMark';
import { Container } from './layout';
import { FOOTER_NAV, LEGAL_NAV, type FooterBranch } from '@/lib/navigation';
import { ENTITY } from '@/lib/legal';

/**
 * The footer as a tree that opens rather than a list that runs on.
 *
 * Every trunk is a `<details>`. On a phone they start closed, so the footer is
 * five headings and a rule instead of a column of forty links, and a reader
 * opens the one branch they came for. From `sm` up they are forced open by CSS
 * and the summary marker is hidden, because a desktop footer has the room and
 * hiding links behind a click there costs a reader a scan they were going to
 * do with their eyes anyway.
 *
 * `<details>` is deliberate. It opens with no JavaScript, it is keyboard
 * operable and screen-reader announced without a line of ARIA, and it survives
 * the page being rendered on the server, which a state-driven accordion does
 * not. The footer is the last thing that should ship a hydration bundle.
 */
function Branch({ branch }: { branch: FooterBranch }) {
  return (
    <div className="flex flex-col gap-3">
      {branch.title ? (
        <h3 className="text-ivory/40 text-[0.6875rem] tracking-[0.14em] uppercase">
          {branch.title}
        </h3>
      ) : null}
      <ul className="border-ivory/15 flex flex-col gap-2.5 border-l pl-4">
        {branch.items.map((item) => (
          <li
            key={item.href}
            className="before:bg-ivory/20 relative before:absolute before:top-[0.6em] before:-left-4 before:h-px before:w-2.5 before:content-['']"
          >
            <Link
              href={item.href}
              className="palma-quiet-link text-ivory/65 hover:text-ivory text-sm"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="on-ink border-ink bg-ink text-ivory border-t">
      <Container className="py-14 sm:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-12">
          <div className="flex max-w-72 shrink-0 flex-col gap-5">
            <Wordmark size="md" descriptor />
            <p className="text-ivory/55 text-sm leading-relaxed">
              PALMA is the permanent record of achievement in the creator industry. The ceremony is
              one expression of it.
            </p>
            <PalmMark className="text-ivory/25 h-10" />
          </div>

          <div className="grid flex-1 gap-x-8 sm:grid-cols-2 sm:gap-y-9 lg:grid-cols-5">
            {FOOTER_NAV.map((group) => (
              <details
                key={group.title}
                className={`palma-branch border-ivory/12 group border-b sm:border-b-0 ${
                  group.branches.length > 1 ? 'sm:col-span-2' : ''
                }`}
              >
                <summary className="palma-label text-champagne flex cursor-pointer list-none items-center justify-between py-4 sm:cursor-default sm:py-0">
                  {group.title}
                  {/* A frond that turns down when the branch opens. Hidden from
                      sm up, where nothing is collapsed to signal. */}
                  <svg
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    className="text-ivory/40 h-3 w-3 transition-transform duration-200 group-open:rotate-90 sm:hidden"
                  >
                    <path
                      d="M4 2.5 8 6l-4 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </summary>

                {/* Two elements, not one. The outer wrapper is what the `sm`
                    rule forces back into flow, so it must stay a plain block;
                    the grid lives inside it and keeps its own display. Merging
                    them means the override and the grid fight, and the grid
                    loses. */}
                <div className="pt-1 pb-6 sm:pt-4 sm:pb-0">
                  <div
                    className={
                      group.branches.length > 1 ? 'grid gap-x-8 gap-y-6 sm:grid-cols-2' : ''
                    }
                  >
                    {group.branches.map((branch) => (
                      <Branch key={branch.title ?? branch.items[0]?.href} branch={branch} />
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* The register, set as a register.

            Nine links of very different lengths, which is why a wrapping row
            falls apart on a phone: it breaks three, three and three at
            whatever widths the labels happen to be, and the ragged right edge
            reads as an accident rather than a list. Two ruled columns give it
            a left edge, a right edge and an even rhythm, which is what a legal
            index looks like on paper. From `sm` the row has enough width to
            behave, so it goes back to flowing. */}
        <nav aria-label="Legal register" className="mt-10 sm:mt-12">
          <h2 className="palma-label text-champagne">The register</h2>
          <ul className="text-ivory/55 mt-4 grid grid-cols-2 gap-x-6 text-xs sm:mt-4 sm:flex sm:flex-wrap sm:gap-x-7 sm:gap-y-3">
            {LEGAL_NAV.map((item) => (
              <li key={item.href} className="border-ivory/10 border-t py-2.5 sm:border-0 sm:py-0">
                <Link href={item.href} className="palma-quiet-link hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-ivory/12 text-ivory/45 mt-7 flex flex-col gap-4 border-t pt-7 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} PALMA. The Creator Honours. {ENTITY.name}, United Kingdom.
          </p>
          <p className="text-ivory/35">
            Nominations are free. Honours cannot be bought. Scores are never published.
          </p>
        </div>
      </Container>
    </footer>
  );
}
