import Link from 'next/link';
import { Container } from '@/components/palma/layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';
import { signOut } from '@/server/actions/auth';
import { CommandPalette } from './CommandPalette';
import { navFor, type AdminGroup } from '@/lib/admin-nav';
import type { Role } from '@/lib/auth/rbac';
import { cn } from '@/lib/utils';

export function AdminShell({
  role,
  userName,
  activeHref,
  title = 'Administration',
  nav,
  children,
}: {
  role: Role;
  userName: string;
  activeHref: string;
  title?: string;
  nav?: AdminGroup[];
  children: React.ReactNode;
}) {
  const groups = navFor(role, nav);

  return (
    <div className="bg-ivory min-h-dvh">
      <div className="on-ink border-ink bg-ink text-ivory border-b">
        <Container className="flex min-w-0 flex-wrap items-center justify-between gap-4 py-6">
          <div className="flex min-w-0 items-center gap-5">
            <Wordmark size="sm" />
            <span className="palma-label text-champagne shrink-0">{title}</span>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <CommandPalette groups={groups} />
            <span className="palma-label text-ivory/50 min-w-0 truncate">{userName}</span>
            <form action={signOut}>
              <Button type="submit" variant="quiet" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </Container>
      </div>

      <Container size="wide" className="py-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <nav aria-label="Administration" className="min-w-0 lg:col-span-3 xl:col-span-2">
            <div className="flex gap-8 overflow-x-auto pb-4 lg:flex-col lg:gap-6 lg:overflow-visible lg:pb-0">
              {groups.map((group) => (
                <div key={group.title} className="min-w-max lg:min-w-0">
                  <h2 className="palma-label text-taupe border-stone-deep border-b pb-2 text-[10px]">
                    {group.title}
                  </h2>
                  <ul className="mt-2.5 flex gap-4 lg:flex-col lg:gap-0.5">
                    {group.items.map((item) => {
                      const active =
                        activeHref === item.href ||
                        (item.href !== '/admin' && activeHref.startsWith(`${item.href}/`));
                      const Icon = item.icon;

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-2.5 rounded-sm py-1.5 text-sm whitespace-nowrap transition-colors lg:py-2 lg:pr-3 lg:-ml-2 lg:pl-2',
                              active
                                ? 'text-ink bg-stone/40 font-medium'
                                : 'text-taupe-deep hover:text-ink hover:bg-stone/20',
                            )}
                          >
                            {Icon ? (
                              <Icon
                                className={cn(
                                  'hidden size-4 shrink-0 lg:block',
                                  active ? 'text-ink' : 'text-taupe',
                                )}
                                strokeWidth={active ? 2 : 1.5}
                              />
                            ) : null}
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <main className="min-w-0 lg:col-span-9 xl:col-span-10">{children}</main>
        </div>
      </Container>
    </div>
  );
}
