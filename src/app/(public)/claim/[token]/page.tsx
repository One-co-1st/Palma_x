import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { PalmMark } from '@/components/brand/PalmMark';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { ClaimRequestForm } from '@/components/account/ClaimRequestForm';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { sha256 } from '@/lib/crypto';
import { creatorForInvitationToken } from '@/server/data/operations';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Claim your PALMA profile',
  description: 'Claim the PALMA record PALMA has created for you.',
  path: '/claim',
  noIndex: true,
});

/**
 * The invitation landing.
 *
 * PALMA often writes a record before the creator knows PALMA exists. This is
 * the door that invitation opens — it identifies the record, and nothing else:
 * the token proves PALMA sent the link, not that the holder is the creator.
 * Review still decides that.
 */
export default async function ClaimInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [session, creator] = await Promise.all([
    getSession(),
    creatorForInvitationToken(sha256(token)),
  ]);

  return (
    <Section tone="stone" className="relative overflow-hidden py-16 sm:py-24">
      <PalmMark
        className="text-ink pointer-events-none absolute -top-10 -right-24 -z-10 h-96 opacity-[0.04] sm:-right-16 sm:h-[34rem]"
        aria-hidden="true"
      />

      <Container size="narrow">
        <div className="mx-auto flex max-w-140 flex-col gap-10">
          <div className="flex flex-col gap-5">
            <Wordmark size="md" descriptor />
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="bg-olive inline-block size-2 rounded-full" />
              <span className="palma-label text-olive">An invitation from PALMA</span>
            </span>
            <h1 className="text-4xl leading-tight sm:text-5xl">
              {creator ? creator.displayName : 'This invitation has expired'}
            </h1>
            <span aria-hidden="true" className="bg-stone-deep block h-px w-full" />
          </div>

          {!creator ? (
            <>
              <Notice tone="warning" title="Nothing to claim here">
                This link has been used, has expired, or the record it pointed at is already held.
                Invitations last 30 days and work once.
              </Notice>
              <p className="text-taupe-deep text-sm leading-relaxed">
                If you believe a PALMA record is yours, you can still ask for it from your account.{' '}
                <Link href="/creator/claim" className="palma-link text-ink">
                  Claim a profile
                </Link>
                , or write to concierge@palmaawards.com.
              </p>
            </>
          ) : (
            <>
              <p className="text-taupe-deep leading-relaxed">
                PALMA has created a record for <strong>{creator.displayName}</strong>. It exists
                because the work does, a record is written the first time a creator is nominated,
                not when they sign up. Claiming it lets you manage how you are described.
              </p>

              <div className="border-stone-deep bg-ivory border p-7 sm:p-9">
                {session ? (
                  <ClaimRequestForm
                    creatorSlug={creator.slug}
                    creatorName={creator.displayName}
                    token={token}
                  />
                ) : (
                  <div className="flex flex-col gap-5">
                    <h2 className="font-display text-2xl">First, your PALMA account</h2>
                    <p className="text-taupe-deep text-sm leading-relaxed">
                      Claiming needs an account so PALMA knows who to link the record to. It takes a
                      name, an email and a password. There is no long registration.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild size="md">
                        <Link href={`/register?next=/claim/${token}`}>Create an account</Link>
                      </Button>
                      <Button asChild variant="outline" size="md">
                        <Link href={`/sign-in?next=/claim/${token}`}>I already have one</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-stone-deep border-t pt-6">
                <h2 className="palma-label text-taupe-deep mb-4">What happens next</h2>
                <ol className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
                  <li>1. You submit the claim. Nothing on the public record changes.</li>
                  <li>2. PALMA completes age and identity assurance if it has not already.</li>
                  <li>3. A person reviews the claim and decides. Every decision is audited.</li>
                  <li>4. On approval, your account is linked to this existing record.</li>
                </ol>
                <p className="text-taupe mt-5 text-xs leading-relaxed">
                  Claiming lets you manage your presentation. PALMA&rsquo;s record of nominations,
                  finalists, winners and judging stays PALMA&rsquo;s. It is the archive, and it is
                  not editable by the people it is about.
                </p>
              </div>
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
