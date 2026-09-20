import { redirect } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { RegisterForm } from '@/components/account/AuthForms';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';

export const metadata = buildMetadata({
  title: 'Create an account',
  description: 'Create a PALMA account to claim a creator profile and track nominations.',
  path: '/register',
  noIndex: true,
});

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect('/creator');

  return (
    <Section className="py-20">
      <Container size="narrow">
        <div className="mx-auto flex max-w-110 flex-col gap-10">
          <div className="flex flex-col gap-4">
            <Wordmark size="md" descriptor />
            <h1 className="text-4xl">Create an account</h1>
            <p className="text-taupe-deep leading-relaxed">
              An account lets you claim a creator profile, complete verification and follow a
              nomination through the season.
            </p>
          </div>

          <RegisterForm />
        </div>
      </Container>
    </Section>
  );
}
