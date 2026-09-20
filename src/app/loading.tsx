import { Container, Section } from '@/components/palma/layout';
import { Skeleton } from '@/components/ui/feedback';

/**
 * The page is coming.
 *
 * Every public route reads from PostgreSQL, so a navigation costs a server
 * round trip. Without a boundary like this one the App Router holds the *old*
 * page on screen for the whole of it: nothing moves, the click appears to have
 * missed, and the visitor presses the button again — which is precisely what
 * people were doing on the slower pages.
 *
 * This is the nearest boundary for any segment that does not declare its own,
 * so a single file covers the whole site. The header and footer stay put and
 * only the page body is replaced, which makes the transition read as loading
 * rather than as a reload.
 *
 * Deliberately plain. A fake reproduction of each page's layout is more work
 * to keep true than it is worth, and a skeleton that stops matching its page
 * is worse than one that never claimed to.
 */
export default function Loading() {
  return (
    <Section className="py-20 sm:py-28">
      <Container>
        <div className="flex flex-col gap-6" role="status" aria-label="Loading">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-12 w-full max-w-160" />
          <Skeleton className="h-12 w-full max-w-120" />

          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-3.5 w-full max-w-140" />
            <Skeleton className="h-3.5 w-full max-w-130" />
            <Skeleton className="h-3.5 w-full max-w-100" />
          </div>

          <span className="sr-only">Loading</span>
        </div>
      </Container>
    </Section>
  );
}
