import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Not permitted',
  description: 'You do not have access to that part of PALMA.',
  path: '/forbidden',
  noIndex: true,
});

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ permission?: string }>;
}) {
  const [{ permission }, session] = await Promise.all([searchParams, getSession()]);

  return (
    <Section className="py-28">
      <Container className="flex flex-col items-center gap-8 text-center">
        <PalmMark className="text-stone-deep h-12" />
        <div className="flex max-w-140 flex-col gap-4">
          <span className="palma-label text-taupe-deep">Not permitted</span>
          <h1 className="text-4xl sm:text-5xl">That is not yours to open</h1>
          <p className="text-taupe-deep leading-relaxed">
            {session
              ? `Your account holds the ${titleCase(session.user.role)} role, which does not carry this permission. Roles in PALMA are deliberately narrow: judges cannot administer, administrators cannot score.`
              : 'You are not signed in to an account that carries this permission.'}
          </p>
          {permission ? (
            <p className="text-taupe font-mono text-xs">Required: {permission}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="sm">
            <Link href="/creator">Your portal</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/">Back to PALMA</Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
