import Link from 'next/link';
import { Container } from './layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';
import { signOut } from '@/server/actions/auth';
import { cn } from '@/lib/utils';

export type PortalNavItem = { href: string; label: string };

/**
 * The authenticated shell. Deliberately plainer than the public site: this is
 * an operational surface, not an editorial one.
 */
export function PortalShell({
  title,
  subtitle,
  nav,
  activeHref,
  userName,
  children,
}: {
  title: string;
  subtitle?: string;
  nav?: PortalNavItem[];
  activeHref?: string;
  userName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ivory min-h-dvh">
      <div className="on-ink border-ink bg-ink text-ivory border-b">
        <Container className="flex flex-col gap-6 py-10">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <Wordmark size="sm" />
              <span className="palma-label text-champagne">{title}</span>
            </div>
            {/* A long account email must not widen the page on a phone: the
                label truncates and the row wraps rather than pushing out. */}
            <div className="flex min-w-0 items-center gap-3">
              {userName ? (
                <span className="palma-label text-ivory/50 min-w-0 truncate">{userName}</span>
              ) : null}
              <form action={signOut}>
                <Button type="submit" variant="quiet" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>

          {subtitle ? <h1 className="text-3xl sm:text-4xl">{subtitle}</h1> : null}

          {nav && nav.length > 0 ? (
            <nav aria-label={`${title} sections`} className="-mb-10 overflow-x-auto">
              <ul className="flex gap-6">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={activeHref === item.href ? 'page' : undefined}
                      className={cn(
                        'palma-label inline-block border-b-2 pb-3 whitespace-nowrap transition-colors',
                        activeHref === item.href
                          ? 'border-champagne text-ivory'
                          : 'text-ivory/55 hover:text-ivory border-transparent',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </Container>
      </div>

      <Container className="py-12 sm:py-16">{children}</Container>
    </div>
  );
}
