import { renderShareCard, SHARE_CARD_SIZE } from '@/lib/share-card';
import { getCreator } from '@/server/data/queries';
import { pluralise } from '@/lib/utils';

export const alt = 'PALMA creator record';
export const size = SHARE_CARD_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await getCreator(slug);

  if (!creator) {
    return renderShareCard({ eyebrow: 'The Creator Honours', name: 'PALMA' });
  }

  const wins = creator.record.filter(
    (entry) => entry.kind === 'winner' && entry.state === 'active',
  );
  const latest = creator.record[0];

  return renderShareCard({
    eyebrow:
      wins.length > 0
        ? `${wins.length} PALMA ${pluralise(wins.length, 'honour')}`
        : 'In the record',
    name: creator.displayName,
    line: latest ? `${latest.categoryName}, PALMA ${latest.year}` : (creator.headline ?? undefined),
    footer: 'palmaawards.com',
  });
}
