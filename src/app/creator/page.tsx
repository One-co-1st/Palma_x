import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Stat } from '@/components/ui/stat';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, THead } from '@/components/ui/table';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { CopyLink } from '@/components/palma/CopyLink';
import { buildMetadata, absoluteUrl } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { titleCase } from '@/lib/utils';
import { isStaff } from '@/lib/auth/rbac';
import { CREATOR_NAV } from '@/lib/creator-nav';
import {
  Award,
  Trophy,
  ShieldCheck,
  Globe,
  User,
  Link as LinkIcon,
  Inbox,
  Mail,
  Scale,
  Settings,
  Search,
  PenLine,
  ExternalLink,
  Eye,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator portal',
  description: 'Manage your PALMA creator record.',
  path: '/creator',
  noIndex: true,
});

export default async function PortalPage() {
  const session = await requireSession('/creator');
  const portal = await getCreatorPortal(session.user.id);

  if (!portal) {
    return (
      <PortalShell title="PALMA Portal" userName={session.user.name}>
        <Notice tone="warning" title="Account not found">
          This account could not be loaded. Sign out and in again, or contact PALMA.
        </Notice>
      </PortalShell>
    );
  }

  const verified = portal.verification.status === 'verified';

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle={portal.displayName ?? session.user.name}
      userName={session.user.email}
      nav={CREATOR_NAV}
      activeHref="/creator"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Award,
            label: 'PALMA honours',
            value: portal.achievements.length,
          },
          {
            icon: Trophy,
            label: 'Candidacies',
            value: portal.candidacies.length,
          },
          {
            icon: ShieldCheck,
            label: 'Verification',
            value: titleCase(portal.verification.status),
          },
          {
            icon: Globe,
            label: 'Profile',
            value: portal.isPublished ? 'Published' : 'Unpublished',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="border-stone-deep flex items-start gap-4 border p-5"
          >
            <span className="bg-stone/30 flex size-10 shrink-0 items-center justify-center rounded-sm">
              <item.icon className="text-taupe-deep size-5" strokeWidth={1.5} />
            </span>
            <Stat label={item.label} value={item.value} />
          </div>
        ))}
      </div>

      {!portal.hasProfile ? (
        <section className="border-stone-deep mt-12 border">
          <div className="border-stone-deep border-b p-8">
            <div className="flex items-center gap-2.5 mb-3">
              <User className="text-taupe size-4" strokeWidth={1.5} />
              <span className="palma-label text-taupe-deep">No record yet</span>
            </div>
            <h2 className="font-display text-3xl leading-tight">
              PALMA has not written a record for you, or you have not claimed it.
            </h2>
            <p className="text-taupe-deep mt-4 max-w-160 leading-relaxed">
              A record is usually written the first time a creator is nominated, so one may already
              exist. If it does not, you can start one: either write it yourself, or give PALMA the
              links and let the editorial desk write it from the work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2">
            <div className="border-stone-deep flex flex-col gap-3 border-r p-6">
              <div className="flex items-center gap-2 mb-1">
                <Search className="text-champagne-deep size-4" strokeWidth={1.5} />
                <span className="palma-label text-champagne-deep">If it already exists</span>
              </div>
              <p className="text-taupe-deep text-sm leading-relaxed">
                Search the archive and claim it. PALMA reviews every claim by hand before the record
                is treated as yours.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-auto self-start">
                <Link href="/creator/claim">Claim a record</Link>
              </Button>
            </div>

            <div className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 mb-1">
                <PenLine className="text-champagne-deep size-4" strokeWidth={1.5} />
                <span className="palma-label text-champagne-deep">If it does not</span>
              </div>
              <p className="text-taupe-deep text-sm leading-relaxed">
                Start one. Write it yourself or ask PALMA to write it from your links. Either way a
                moderator checks it before it is published.
              </p>
              <Button asChild size="sm" className="mt-auto self-start">
                <Link href="/creator/start">Start a record</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {portal.hasProfile && !portal.isPublished ? (
        <Notice className="mt-10" tone="ceremonial" title="Your record is with PALMA">
          It is held by your account and waiting on a moderator. Nothing is public until they
          publish it, and you can keep editing it in the meantime.
        </Notice>
      ) : null}

      <div className="mt-14 grid gap-14 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-7">
          <section>
            <div className="border-stone-deep flex items-center gap-2.5 border-b pb-4 mb-2">
              <Award className="text-taupe size-4" strokeWidth={1.5} />
              <h2 className="palma-label text-taupe-deep">Your PALMA record</h2>
            </div>
            {portal.achievements.length === 0 ? (
              <EmptyState
                title="No honours yet"
                description="Honours appear here the moment they are conferred, each with its permanent verification link."
              />
            ) : (
              <ul className="flex flex-col">
                {portal.achievements.map((achievement) => (
                  <li
                    key={achievement.code}
                    className="palma-row group border-stone-deep flex flex-wrap items-center justify-between gap-4 border-b py-5 transition-colors hover:bg-stone/10"
                  >
                    <span className="flex items-center gap-3">
                      <Trophy
                        className={achievement.state === 'revoked' ? 'text-taupe size-5' : 'text-champagne-deep size-5'}
                        strokeWidth={1.5}
                      />
                      <span className="flex flex-col gap-1">
                        <span className="font-display text-lg">{achievement.categoryName}</span>
                        <span className="palma-label text-taupe-deep">
                          {titleCase(achievement.kind)} · {achievement.year}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      {achievement.state === 'revoked' ? (
                        <Badge variant="muted">Revoked</Badge>
                      ) : (
                        <CopyLink
                          value={absoluteUrl(`/verify/${achievement.code}`)}
                          label="Copy verification link"
                        />
                      )}
                      <Link
                        href={`/verify/${achievement.code}`}
                        className="palma-label text-olive hover:text-ink flex items-center gap-1"
                      >
                        <Eye className="size-3.5" />
                        View
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="border-stone-deep flex items-center gap-2.5 border-b pb-4 mb-2">
              <Trophy className="text-taupe size-4" strokeWidth={1.5} />
              <h2 className="palma-label text-taupe-deep">Where you are in contention</h2>
            </div>
            {portal.candidacies.length === 0 ? (
              <EmptyState
                title="No candidacies yet"
                description="A candidacy is created the first time someone nominates you in a category. Share your nomination link to let your audience put you forward."
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Category</th>
                    <th scope="col">Season</th>
                    <th scope="col">Status</th>
                  </tr>
                </THead>
                <TBody>
                  {portal.candidacies.map((candidacy) => (
                    <tr key={candidacy.id}>
                      <td className="font-mono text-xs tracking-wider">{candidacy.reference}</td>
                      <td className="font-display text-lg">{candidacy.categoryName}</td>
                      <td className="text-taupe-deep">{candidacy.year}</td>
                      <td>
                        <Badge variant={candidacy.status === 'winner' ? 'champagne' : 'default'}>
                          {titleCase(candidacy.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
            <p className="text-taupe-deep mt-5 text-sm leading-relaxed">
              PALMA does not show you how many nominations you have received. Nomination numbers do
              not decide outcomes, and a running total would only invite you to campaign for one.
            </p>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-8 lg:col-span-5">
          {portal.profile ? (
            <div className="border-stone-deep group border p-7 transition-colors hover:bg-stone/10">
              <div className="flex items-center gap-2.5 mb-4">
                <User className="text-taupe size-4" strokeWidth={1.5} />
                <h2 className="palma-label text-taupe-deep">Your profile</h2>
              </div>
              <p className="text-taupe-deep mb-5 text-sm leading-relaxed">
                Your portrait, your details and the links the editorial desk reads your record from.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/creator/profile">
                  <PenLine className="mr-1.5 size-3.5" />
                  Edit your profile
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="border-stone-deep border p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="text-taupe size-4" strokeWidth={1.5} />
                <h2 className="palma-label text-taupe-deep">Verification</h2>
              </div>
              <Badge variant={verified ? 'olive' : 'default'}>
                {titleCase(portal.verification.status)}
              </Badge>
            </div>
            <p className="text-taupe-deep mt-4 mb-5 text-sm leading-relaxed">
              PALMA confers nothing on an unverified record.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/creator/verification">
                {verified ? 'View verification' : 'Complete verification'}
              </Link>
            </Button>
          </div>

          <div className="border-stone-deep border p-7">
            <div className="flex items-center gap-2.5 mb-5">
              <LinkIcon className="text-taupe size-4" strokeWidth={1.5} />
              <h2 className="palma-label text-taupe-deep">Your links</h2>
            </div>
            <p className="text-taupe-deep mb-5 text-sm leading-relaxed">
              The link you share to be nominated, and the permanent one that proves what you hold.
              They do opposite jobs.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/creator/share">
                <ExternalLink className="mr-1.5 size-3.5" />
                Open your links
              </Link>
            </Button>
          </div>

          <div className="border-stone-deep border">
            <div className="p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Inbox className="text-taupe size-4" strokeWidth={1.5} />
                  <h2 className="palma-label text-taupe-deep">Your Dossier</h2>
                </div>
                {portal.dossier.unread > 0 ? (
                  <Badge variant={portal.dossier.important > 0 ? 'champagne' : 'default'}>
                    {portal.dossier.unread} unread
                  </Badge>
                ) : null}
              </div>
              <p className="text-taupe-deep mt-4 text-sm leading-relaxed">
                Everything PALMA has told you, kept. Decisions on your record, honours, and changes to
                your account. Entries are written whether or not the email reached you.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dossier">Open your Dossier</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/account">
                    <Settings className="mr-1.5 size-3.5" />
                    Account & security
                  </Link>
                </Button>
              </div>
            </div>

            <div className="border-stone-deep border-t p-7">
              <div className="flex items-center gap-2.5 mb-3">
                <Mail className="text-taupe size-4" strokeWidth={1.5} />
                <h3 className="palma-label text-taupe-deep">What reaches your inbox</h3>
              </div>
              <p className="text-taupe mb-5 text-xs leading-relaxed">
                Which announcements PALMA sends, and which of the five lists you are on. Decisions
                about your record, and anything concerning the safety of your account, are sent
                regardless, an institution you can mute is not keeping you informed.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/account/email-preferences">Choose what reaches you</Link>
              </Button>
            </div>
          </div>

          {session.user.judgeId ? (
            <div className="border-stone-deep border p-7">
              <div className="flex items-center gap-2.5 mb-3">
                <Scale className="text-taupe size-4" strokeWidth={1.5} />
                <h2 className="palma-label text-taupe-deep">Judging</h2>
              </div>
              <p className="text-taupe-deep mb-4 text-sm">
                You are seated on a PALMA panel this season.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/judge">Open the judge portal</Link>
              </Button>
            </div>
          ) : null}

          {isStaff(session.user.role) ? (
            <div className="border-stone-deep border p-7">
              <div className="flex items-center gap-2.5 mb-3">
                <Settings className="text-taupe size-4" strokeWidth={1.5} />
                <h2 className="palma-label text-taupe-deep">Administration</h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">Open the admin portal</Link>
              </Button>
            </div>
          ) : null}
        </aside>
      </div>
    </PortalShell>
  );
}
