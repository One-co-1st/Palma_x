import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { confirmEmailChange } from '@/server/actions/account';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Confirm your address',
  description: 'Confirm a change of address on your PALMA account.',
  path: '/account',
  noIndex: true,
});

export default async function ConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await confirmEmailChange(token);

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-120 flex-col gap-8">
          <Wordmark size="md" descriptor />

          {result.ok ? (
            <>
              <h1 className="text-4xl leading-tight">Your address is changed.</h1>
              <p className="text-taupe-deep leading-relaxed">
                Your PALMA account now signs in with <strong>{result.email}</strong>. Everything
                else is untouched, your record, your Dossier and your sessions are as they were.
              </p>
              <Button asChild className="self-start">
                <Link href="/account">Back to your account</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-4xl leading-tight">That link did not work.</h1>
              <Notice tone="warning" title="Nothing has changed">
                {result.reason === 'taken'
                  ? 'That address now belongs to another PALMA account. Your account is untouched. Choose a different address from your account page.'
                  : 'A confirmation link lasts 24 hours, works once, and is cancelled when a newer one is requested. Start again from your account page.'}
              </Notice>
              <Link href="/account" className="palma-link text-ink self-start">
                Your account
              </Link>
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
