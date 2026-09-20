import { SiteHeader } from '@/components/palma/SiteHeader';
import { SiteFooter } from '@/components/palma/SiteFooter';
import { PageCounter } from '@/components/palma/PageCounter';
import { Threshold } from '@/components/brand/Threshold';

/**
 * The public site's furniture.
 *
 * This layout is deliberately separate from the root layout: the root must
 * stay static so Next/Vercel can cache the public record, while admin,
 * moderation, judging and creator surfaces keep their own dynamic shells.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="palma-label focus:bg-ink focus:text-ivory sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      {/* Parts on arrival. Pure CSS, in the markup, gone in 820ms. */}
      <Threshold />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {/* Counts the page. Sets nothing, stores nothing, sends nothing about
          the reader. See src/domain/measurement.ts. */}
      <PageCounter />
    </>
  );
}
