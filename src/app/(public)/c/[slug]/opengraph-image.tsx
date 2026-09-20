import { HONOUR_STANDING, isThePalma } from '@/domain/honours';
import { renderShareCard, SHARE_CARD_SIZE } from '@/lib/share-card';
import { getCreator } from '@/server/data/queries';

export const size = SHARE_CARD_SIZE;
export const contentType = 'image/png';
export const alt = 'A verified PALMA record';

/** What the one link unfurls into: the most recent honour they hold. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  const active = (creator?.record ?? []).filter((entry) => entry.state === 'active');

  if (!creator || active.length === 0) {
    return renderShareCard({
      eyebrow: 'PALMA',
      name: 'Not in the record',
      line: 'No honour held.',
    });
  }

  const latest = [...active].sort(
    (a, b) => b.year - a.year || HONOUR_STANDING[b.kind] - HONOUR_STANDING[a.kind],
  )[0]!;

  const others = active.length - 1;

  return renderShareCard({
    eyebrow: isThePalma(latest.kind)
      ? `${latest.year} Laureate`
      : `${latest.year} ${latest.kind === 'winner' ? 'Winner' : 'Finalist'}`,
    name: creator.displayName,
    line: isThePalma(latest.kind) ? 'THE PALMA' : latest.categoryName,
    footer: others > 0 ? `and ${others} more ${others === 1 ? 'honour' : 'honours'}` : undefined,
  });
}
