import { ThePalmaDesk } from '@/components/operations/ThePalmaDesk';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';

export const metadata = buildMetadata({
  title: 'THE PALMA',
  description: 'Confer the institution’s highest honour.',
  path: '/portal/the-palma',
  noIndex: true,
});

/**
 * The desk's door, and the one that matters.
 *
 * Recording the panel's decision is operational work and it belongs where the
 * rest of the record is kept, beside creators, claims and Kulture.
 */
export default async function PortalThePalmaPage() {
  await requirePermission('honours:propose_the_palma', '/portal/the-palma');
  return <ThePalmaDesk />;
}
