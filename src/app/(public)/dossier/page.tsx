import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { DossierEntryControls, MarkAllRead } from '@/components/account/DossierControls';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { homeForRole } from '@/lib/auth/entrances';
import { getDossier } from '@/server/data/dossier';
import { TEMPLATES, type TemplateKey } from '@/server/email/register';
import { formatShortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Your Dossier',
  description: 'Everything PALMA has told you, kept.',
  path: '/dossier',
  noIndex: true,
});

/**
 * One Dossier, every role.
 *
 * This is the one authenticated page that is deliberately not behind a role
 * surface. It asks only "is there a session", never "what is this person" —
 * which makes it the cheapest page on the site and means the link in every
 * email footer resolves for a judge, a moderator and a creator alike.
 */
export default async function DossierPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireSession('/dossier');
  const { view } = await searchParams;
  const archived = view === 'archived';

  const dossier = await getDossier(session.user.id, { archived });
  const home = homeForRole(session.user.role);

  return (
    <PortalShell title="PALMA Dossier" subtitle="Your Dossier" userName={session.user.email}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Everything PALMA has told you, kept. Entries are written whether or not the email reached
          you, so a muted channel or a full inbox never costs you the record of a decision.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={home}>Back to your portal</Link>
        </Button>
      </div>

      <div className="border-stone-deep mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-b pb-5">
        <Link
          href="/dossier"
          className={`palma-label ${archived ? 'text-taupe-deep hover:text-ink' : 'text-ink'}`}
        >
          Current {dossier.unread > 0 && !archived ? `· ${dossier.unread} unread` : ''}
        </Link>
        <Link
          href="/dossier?view=archived"
          className={`palma-label ${archived ? 'text-ink' : 'text-taupe-deep hover:text-ink'}`}
        >
          Filed {dossier.archived > 0 ? `· ${dossier.archived}` : ''}
        </Link>
        {!archived && dossier.unread > 0 ? (
          <span className="ml-auto">
            <MarkAllRead />
          </span>
        ) : null}
      </div>

      {dossier.unreadImportant > 0 && !archived ? (
        <Notice className="mt-8" tone="warning" title="Unread and consequential">
          {dossier.unreadImportant === 1
            ? 'One entry concerns a decision about you or the safety of your account.'
            : `${dossier.unreadImportant} entries concern decisions about you or the safety of your account.`}{' '}
          These cannot be filed away unread.
        </Notice>
      ) : null}

      <div className="mt-10">
        {dossier.entries.length === 0 ? (
          <EmptyState
            title={archived ? 'Nothing filed' : 'Nothing yet'}
            description={
              archived
                ? 'Entries you file away are kept here. Nothing in the Dossier is ever deleted.'
                : 'PALMA writes here when something happens that concerns you, a decision on your record, an honour, a change to your account.'
            }
          />
        ) : (
          <ul className="flex flex-col">
            {dossier.entries.map((entry) => {
              const meta = TEMPLATES[entry.kind as TemplateKey];
              const unread = !entry.readAt;

              return (
                <li
                  key={entry.id}
                  className={`border-stone-deep flex flex-col gap-3 border-b py-6 ${
                    unread ? '' : 'opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {unread ? <Badge variant="champagne">Unread</Badge> : null}
                    {entry.isImportant ? <Badge variant="muted">Consequential</Badge> : null}
                    <span className="palma-label text-taupe-deep">
                      {meta?.name ?? 'Notice'} · {formatShortDate(entry.createdAt)}
                    </span>
                  </div>

                  <h2 className="font-display text-xl leading-snug">{entry.subject}</h2>
                  <p className="text-taupe-deep max-w-160 text-sm leading-relaxed">{entry.body}</p>

                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    {entry.href ? (
                      <Link href={entry.href} className="palma-label text-olive hover:text-ink">
                        Open
                      </Link>
                    ) : null}
                    <DossierEntryControls
                      id={entry.id}
                      archived={Boolean(entry.archivedAt)}
                      unread={unread}
                      important={entry.isImportant}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-taupe mt-12 max-w-160 text-xs leading-relaxed">
        Filing an entry away does not delete it, PALMA does not offer a way to destroy the notice
        that it did something to you. Choose which announcements reach your inbox in your portal
        under Dossier preferences.
      </p>
    </PortalShell>
  );
}
