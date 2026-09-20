import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { EmailPreferencesForm } from '@/components/account/EmailPreferencesForm';
import { PreferencesForm } from '@/components/account/PortalForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { homeForRole } from '@/lib/auth/entrances';
import { EMAIL_LIST_ORDER, emailList } from '@/domain/email-lists';
import { TEMPLATE_LIST } from '@/server/email/register';
import { sql } from '@/server/db/sql';
import { featureLive } from '@/server/features';
import { CONTACTS } from '@/lib/legal';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Email preferences',
  description: 'Choose which PALMA emails reach you.',
  path: '/account/email-preferences',
  noIndex: true,
});

/**
 * The preference centre.
 *
 * Two halves, and the distinction between them is the whole point.
 *
 * Above the rule: mail PALMA owes you. A decision on your own record, a
 * security notice, something you asked for thirty seconds ago. There is no
 * switch beside these because an account that could mute the news that its
 * honour was revoked is not being kept informed, it is being managed.
 *
 * Between them: the announcements. Mail PALMA would send you about your own
 * record and the season around it, which you can switch off one at a time.
 * These used to be a panel on the creator portal, two pages away from the
 * subscriptions they are constantly confused with, which meant nobody could
 * answer "what does PALMA send me" without visiting both.
 *
 * Below: five subscriptions, each opt-in on its own, none pre-ticked, and
 * leaving one leaving exactly one.
 */
export default async function EmailPreferencesPage() {
  const session = await requireSession('/account/email-preferences');

  const [subscriptions, prefRows] = await Promise.all([
    sql<
      {
        type: string;
        status: string;
        confirmedAt: string | null;
        consentAt: string | null;
        source: string;
      }[]
    >`
      SELECT
        "type",
        "status",
        to_char("confirmedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "confirmedAt",
        to_char("consentAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "consentAt",
        "source"
      FROM "EmailSubscription"
      WHERE "email" = ${session.user.email}
    `,
    sql<
      {
        seasonAnnouncements: boolean;
        nominationUpdates: boolean;
        honourAnnouncements: boolean;
        journalDigest: boolean;
      }[]
    >`
      SELECT
        "seasonAnnouncements",
        "nominationUpdates",
        "honourAnnouncements",
        "journalDigest"
      FROM "NotificationPreference"
      WHERE "userId" = ${session.user.id}
      LIMIT 1
    `,
  ]);
  const prefs = prefRows[0] ?? null;

  // An account that has never touched these has no row, and the defaults are
  // the ones the portal used: on, except the digest, which is a publication
  // rather than news about you.
  const announcements = {
    seasonAnnouncements: prefs?.seasonAnnouncements ?? true,
    nominationUpdates: prefs?.nominationUpdates ?? true,
    honourAnnouncements: prefs?.honourAnnouncements ?? true,
    journalDigest: prefs?.journalDigest ?? false,
  };

  const availability = await Promise.all(
    EMAIL_LIST_ORDER.map(async (key) => {
      const required = emailList(key).requiresFeature;
      return [key, required ? await featureLive(required) : true] as const;
    }),
  );

  const lists = EMAIL_LIST_ORDER.map((key) => {
    const row = subscriptions.find((entry) => entry.type === key);
    return {
      ...emailList(key),
      subscribed: row?.status === 'confirmed',
      available: availability.find(([listKey]) => listKey === key)?.[1] ?? true,
      since: row?.confirmedAt ?? null,
      source: row?.source ?? null,
    };
  });

  const essential = TEMPLATE_LIST.filter((template) => template.gate === 'always');

  return (
    <PortalShell title="PALMA Account" subtitle="Email preferences" userName={session.user.email}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          What PALMA sends to <strong>{session.user.email}</strong>, and what it does not.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/account">Your account</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={homeForRole(session.user.role)}>Your portal</Link>
          </Button>
        </div>
      </div>

      <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-7">
          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Essential PALMA communications</h2>
            <p className="text-taupe-deep mb-6 max-w-140 text-sm leading-relaxed">
              These are not a subscription and there is nothing here to switch off. PALMA sends them
              because it owes them to you, a decision about your own record, or something concerning
              the safety of your account. An institution you can mute is not keeping you informed.
            </p>

            <ul className="border-stone-deep flex flex-col border-t">
              {essential.map((template) => (
                <li
                  key={template.key}
                  className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3"
                >
                  <span className="text-sm">{template.name}</span>
                  <span className="palma-label text-taupe">Always</span>
                </li>
              ))}
            </ul>

            <p className="text-taupe mt-5 text-xs leading-relaxed">
              Closing your account stops all of them.{' '}
              <Link href="/account" className="palma-link text-taupe-deep">
                You can do that here
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Announcements about you</h2>
            <p className="text-taupe-deep mb-8 max-w-140 text-sm leading-relaxed">
              News, rather than decisions. Switching one off is only ever a choice not to hear about
              it early, anything PALMA actually decides about your record still reaches you through
              the list above and is written into your Dossier either way.
            </p>

            <PreferencesForm defaults={announcements} />
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Your subscriptions</h2>
            <p className="text-taupe-deep mb-8 max-w-140 text-sm leading-relaxed">
              Five lists, each separately chosen. Nothing here was switched on by registering,
              nominating, claiming a record or accepting the Terms, and leaving one leaves exactly
              one.
            </p>

            <EmailPreferencesForm lists={lists} />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-10 lg:col-span-5">
          <section className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">What PALMA records</h2>
            <p className="text-taupe-deep text-sm leading-relaxed">
              For each subscription: what you agreed to, when, and where from. PALMA has to be able
              to demonstrate that rather than simply assert it, and you are entitled to see the same
              record.
            </p>

            <dl className="mt-5 flex flex-col">
              {lists
                .filter((list) => list.subscribed)
                .map((list) => (
                  <div
                    key={list.key}
                    className="border-stone-deep/60 flex flex-col gap-1 border-b py-3"
                  >
                    <dt className="text-sm">{list.name}</dt>
                    <dd className="text-taupe text-xs">
                      Since {list.since ? new Date(list.since).toISOString().slice(0, 10) : '—'}
                      {list.source ? ` · from the ${list.source.replace(/-/g, ' ')}` : ''}
                    </dd>
                  </div>
                ))}
              {lists.every((list) => !list.subscribed) ? (
                <p className="text-taupe text-sm">You are on none of them.</p>
              ) : null}
            </dl>
          </section>

          <Notice title="Partner offers are separate on purpose">
            Subscribing to anything else never puts you on the partner list, and a partner message
            is never folded into an awards announcement. When one does arrive it says so in the
            subject line.
          </Notice>

          <section className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">Anything else</h2>
            <p className="text-taupe-deep text-sm leading-relaxed">
              If PALMA is writing to you and you cannot work out how to stop it, write to{' '}
              <a href={`mailto:${CONTACTS.privacy}`} className="palma-link text-ink">
                {CONTACTS.privacy}
              </a>{' '}
              and a person will sort it out. That is a failure on our side, not yours.
            </p>
          </section>
        </aside>
      </div>
    </PortalShell>
  );
}
