import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { emailList, isEmailListKey } from '@/domain/email-lists';
import { leaveList } from '@/server/actions/subscriptions';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Unsubscribed',
  description: 'Leave a PALMA list.',
  path: '/lists',
  noIndex: true,
});

/**
 * Leaving happens on load, deliberately.
 *
 * No confirmation screen and no "are you sure": somebody who clicked
 * unsubscribe has already decided, and the extra step is how a mailing list
 * gets reported as spam instead.
 *
 * And it leaves exactly one list. Removing somebody from everything because
 * they tired of one thing is the same failure in the other direction.
 */
export default async function LeaveListPage({
  params,
}: {
  params: Promise<{ type: string; token: string }>;
}) {
  const { type, token } = await params;
  if (!isEmailListKey(type)) notFound();

  const list = emailList(type);
  const result = await leaveList(type, token);

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-120 flex-col gap-8">
          <span className="palma-label text-taupe-deep">{list.name}</span>
          <h1 className="text-4xl leading-tight">
            {result.ok ? 'Done. That list has stopped.' : 'That link is not valid.'}
          </h1>

          {result.ok ? (
            <>
              <p className="text-taupe-deep leading-relaxed">
                {result.email} has been removed from {list.name}.
              </p>
              <Notice title="Only that one">
                Your other PALMA subscriptions are untouched, and decisions about your own record
                still reach you. Those are not a newsletter.{' '}
                <Link href="/account/email-preferences" className="palma-link text-ink">
                  Manage all of them
                </Link>
                , or{' '}
                <Link href="/account/email-preferences" className="palma-link text-ink">
                  leave everything
                </Link>{' '}
                in one click if that is what you meant.
              </Notice>
            </>
          ) : (
            <Notice tone="warning" title="Nothing has changed">
              PALMA could not match that link to a subscription. If you are still receiving
              messages, reply to any of them and a person will remove you by hand.
            </Notice>
          )}

          <Link href="/" className="palma-link text-ink self-start">
            Back to PALMA
          </Link>
        </div>
      </Container>
    </Section>
  );
}
