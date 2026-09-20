import { Container, Section } from '@/components/palma/layout';
import { Reveal } from '@/components/palma/Reveal';
import { Wordmark } from '@/components/brand/Wordmark';
import { ResetPasswordForm } from '@/components/account/AuthForms';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { sha256 } from '@/lib/crypto';
import { sql } from '@/server/db/sql';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Set a new password',
  description: 'Set a new password on your PALMA account.',
  path: '/reset',
  noIndex: true,
});

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Checked here only to say something useful before the form is filled in.
  // The action checks it again — this page proves nothing to the server.
  const recordRows = await sql<{ usedAt: string | null; expiresAt: string }[]>`
    SELECT
      to_char("usedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "usedAt",
      to_char("expiresAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "expiresAt"
    FROM "PasswordResetToken"
    WHERE "tokenHash" = ${sha256(token)}
    LIMIT 1
  `;
  const record = recordRows[0] ?? null;

  const usable = Boolean(record && !record.usedAt && new Date(record.expiresAt) > new Date());

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-110 flex-col gap-10">
          <Reveal className="flex flex-col gap-4">
            <Wordmark size="md" descriptor />
            <h1 className="text-4xl">Set a new password</h1>
            {usable ? (
              <p className="text-taupe-deep leading-relaxed">
                Setting it signs out every other session on this account, including anyone else who
                was signed in as you.
              </p>
            ) : null}
          </Reveal>

          <Reveal delay={80}>
            {usable ? (
              <ResetPasswordForm token={token} />
            ) : (
              <Notice tone="warning" title="This link is no longer valid">
                A reset link lasts an hour and works once, and asking for a new one cancels the old.
                Start again from the{' '}
                <a href="/forgot" className="palma-link text-ink">
                  forgotten password
                </a>{' '}
                page, or ask whoever invited you for a fresh one.
              </Notice>
            )}
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
