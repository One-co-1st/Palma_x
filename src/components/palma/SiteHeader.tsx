'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';
import { ThemeSwitch } from './ThemeSwitch';
import { Button } from '@/components/ui/button';
import { Container } from './layout';
import { PUBLIC_NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { DURATION, EASE, STAGGER } from '@/lib/motion';

/**
 * Navigation behaviour.
 *
 * Desktop: a rule sits under the active item and *travels* between items as
 * the reader moves across the bar — one shared element rather than eight
 * independent underlines, so the navigation reads as a single object that
 * follows attention.
 *
 * Mobile: the panel is choreographed rather than toggled. It opens as a
 * column of display type arriving in sequence, which is the same editorial
 * gesture used everywhere else on the site, at menu scale.
 */
export function SiteHeader({ accountHref = '/creator' }: { accountHref?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [condensed, setCondensed] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);

  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const marked = hovered ?? PUBLIC_NAV.find((item) => isActive(item.href))?.href ?? null;

  return (
    <header
      className={cn(
        // `pt-[env(safe-area-inset-top)]` is what makes the header the top of
        // the page on a notched phone: the bar runs under the status bar and
        // pushes its own contents clear of it, rather than the document
        // starting below the notch and leaving a strip above the header.
        'sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] transition-colors duration-300',
        condensed || open
          ? 'border-stone-deep bg-ivory/92 backdrop-blur-md'
          : 'bg-ivory border-transparent',
      )}
    >
      <Container className="flex h-18 items-center justify-between gap-8">
        <Wordmark size="sm" />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7" onMouseLeave={() => setHovered(null)}>
            {PUBLIC_NAV.map((item) => (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  onMouseEnter={() => setHovered(item.href)}
                  onFocus={() => setHovered(item.href)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'block py-2 transition-colors duration-200',
                    item.preserveCase ? 'palma-label-brand' : 'palma-label',
                    isActive(item.href) || hovered === item.href
                      ? 'text-ink'
                      : 'text-taupe-deep hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>

                {/* One rule, shared across the bar. Motion's layout animation
                    moves it between items rather than cross-fading eight. */}
                {marked === item.href ? (
                  <motion.span
                    layoutId="palma-nav-rule"
                    aria-hidden="true"
                    className="bg-ink absolute -bottom-px left-0 h-px w-full"
                    transition={{ duration: DURATION.base, ease: EASE.ceremonial }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeSwitch className="hidden lg:block" />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/nominate">Nominate</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="hidden lg:inline-flex">
            <Link href={accountHref}>Account</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="palma-mobile-nav"
            className="text-ink -mr-2 p-2 lg:hidden"
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="palma-mobile-nav"
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: DURATION.quick, ease: EASE.exit },
            }}
            transition={{ duration: DURATION.slow, ease: EASE.ceremonial }}
            className="border-stone-deep bg-ivory overflow-hidden border-t lg:hidden"
          >
            <Container className="py-8">
              <motion.nav
                aria-label="Primary, mobile"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: STAGGER.tight, delayChildren: 0.06 } },
                }}
              >
                <ul className="flex flex-col">
                  {PUBLIC_NAV.map((item) => (
                    <motion.li
                      key={item.href}
                      variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: DURATION.base, ease: EASE.editorial },
                        },
                      }}
                      className="border-stone-deep/60 border-b last:border-none"
                    >
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        className={cn(
                          'font-display flex items-center justify-between py-4 text-2xl',
                          isActive(item.href) ? 'text-ink' : 'text-taupe-deep',
                        )}
                      >
                        {item.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.nav>

              <div className="mt-8 flex flex-col gap-3">
                <Button asChild size="md">
                  <Link href="/nominate">Nominate a creator</Link>
                </Button>
                <Button asChild size="md" variant="outline">
                  <Link href={accountHref}>Account</Link>
                </Button>
                <div className="border-stone-deep mt-2 flex items-center justify-between border-t pt-4">
                  <span className="palma-label text-taupe-deep">Theme</span>
                  <ThemeSwitch />
                </div>
              </div>
            </Container>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
