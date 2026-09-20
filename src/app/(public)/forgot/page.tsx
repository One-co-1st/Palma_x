import { redirect } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Reveal } from '@/components/palma/Reveal';
import { Wordmark } from '@/components/brand/Wordmark';
import { ForgotPasswordForm } from '@/components/account/AuthForms';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { homeForRole } from '@/lib/auth/entrances';
import { CONTACTS } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Forgotten password',
  description: 'Ask PALMA for a link to set a new password on a creator account.',
  path: '/forgot',
  noIndex: true,
});

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect(homeForRole(session.user.role));

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-110 flex-col gap-10">
          <Reveal className="flex flex-col gap-4">
            <Wordmark size="md" descriptor />
            <h1 className="text-4xl">Forgotten your password</h1>
            <p className="text-taupe-deep leading-relaxed">
              Give us the address on your creator account and we will send a link that sets a new
              password. It is valid for one hour and works once.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <ForgotPasswordForm />
          </Reveal>

          <Reveal
            delay={160}
            className="border-stone-deep text-taupe-deep border-t pt-6 text-sm leading-relaxed"
          >
            <p>
              PALMA will never ask you for your password, and nobody here can read it. If you no
              longer have access to the address on your account, write to{' '}
              <a href={`mailto:${CONTACTS.security}`} className="palma-link text-ink">
                {CONTACTS.security}
              </a>{' '}
              from wherever you can, a person will read it.
            </p>
            <p className="mt-4">
              This page is for creator accounts. Judges, moderators and administrators do not set a
              password here, if you hold one of those accounts and are locked out, ask the
              administrator who invited you for a new link. Once signed in, everyone changes their
              password from their own account settings.
            </p>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
