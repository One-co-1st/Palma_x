import { Container, Section } from '@/components/palma/layout';
import { Masthead } from '@/components/palma/Masthead';
import { ReportForm } from '@/components/account/ReportForm';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Report a concern',
  description:
    'Report impersonation, a fabricated achievement, explicit content or nomination manipulation to PALMA.',
  path: '/report',
});

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ creator?: string }>;
}) {
  const { creator } = await searchParams;

  return (
    <>
      <Masthead
        eyebrow={'Integrity'}
        title="Report a concern"
        standfirst="PALMA is only worth holding if it is hard to fake. If something here is wrong, tell us."
        meta={['Reviewed by a moderator', 'Never shown to the creator', 'Audited permanently']}
        size="compact"
      />

      <Section>
        <Container size="narrow">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ReportForm creatorSlug={creator} />
            </div>
            <aside className="flex flex-col gap-6 lg:col-span-2">
              <Notice title="What happens next">
                Reports go to a moderator, not to the creator. Every action taken is recorded
                against the entity it affects, and the audit trail is permanent.
              </Notice>
              <Notice title="Urgent harm">
                If someone is in immediate danger, contact your local emergency services first.
                PALMA is an awards institution and cannot respond at that speed.
              </Notice>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
