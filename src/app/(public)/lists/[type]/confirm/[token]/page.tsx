import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { emailList, isEmailListKey } from '@/domain/email-lists';
import { confirmSubscription } from '@/server/actions/subscriptions';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Subscription confirmed',
  description: 'Confirm a PALMA subscription.',
  path: '/lists',
  noIndex: true,
});

export default async function ConfirmListPage({
  params,
}: {
  params: Promise<{ type: string; token: string }>;
}) {
  const { type, token } = await params;
  if (!isEmailListKey(type)) notFound();

  const list = emailList(type);
  const result = await confirmSubscription(type, token);

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-120 flex-col gap-8">
          {result.ok ? (
            <>
              <span className="palma-label text-champagne-deep">{list.name}</span>
              <h1 className="text-4xl leading-tight">You are on the list.</h1>
              <p className="text-taupe-deep leading-relaxed">
                {result.email} is confirmed. {list.cadence} Every message carries a one-click way
                out, and leaving this list leaves only this one.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/journal">Read the Journal</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/account/email-preferences">Manage your subscriptions</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl leading-tight">That link is not valid.</h1>
              <Notice tone="warning" title="Nothing has changed">
                A confirmation link is replaced whenever the address is entered again, so this one
                may simply be an older copy. Enter your address again and PALMA will send a fresh
                one.
              </Notice>
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
