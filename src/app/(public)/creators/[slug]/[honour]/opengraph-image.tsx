import { isThePalma } from '@/domain/honours';
import { renderShareCard, SHARE_CARD_SIZE } from '@/lib/share-card';
import { getCreatorAchievement } from '@/server/data/queries';

export const size = SHARE_CARD_SIZE;
export const contentType = 'image/png';
export const alt = 'A verified PALMA achievement';

/**
 * What the link unfurls into.
 *
 * This is the point of the quotable address: pasted into a DM, a bio or a
 * press email, it has to arrive as the honour rather than as a URL. Same card
 * the verification page uses, from the same record.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; honour: string }>;
}) {
  const { slug, honour: honourSlug } = await params;
  const found = await getCreatorAchievement(slug, honourSlug);

  if (!found) {
    return renderShareCard({
      eyebrow: 'PALMA',
      name: 'Not in the record',
      line: 'No such honour.',
    });
  }

  const { creator, honour } = found;

  if (honour.state === 'revoked') {
    return renderShareCard({
      eyebrow: `${honour.year} Revoked`,
      name: creator.displayName,
      line: 'This honour was revoked.',
      footer: honour.code ?? undefined,
    });
  }

  return renderShareCard({
    eyebrow: isThePalma(honour.kind)
      ? `${honour.year} Laureate`
      : `${honour.year} ${honour.kind === 'winner' ? 'Winner' : 'Finalist'}`,
    name: creator.displayName,
    line: isThePalma(honour.kind) ? 'THE PALMA' : honour.categoryName,
    footer: honour.code ?? undefined,
  });
}
