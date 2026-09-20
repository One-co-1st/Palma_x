import { ThePalmaDesk } from '@/components/operations/ThePalmaDesk';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';

export const metadata = buildMetadata({
  title: 'THE PALMA',
  description: 'Confer the institution’s highest honour.',
  path: '/admin/the-palma',
  noIndex: true,
});

/** Administration's door to the desk. The screen itself is shared. */
export default async function AdminThePalmaPage() {
  await requirePermission('honours:confer_the_palma', '/admin/the-palma');
  return <ThePalmaDesk />;
}
