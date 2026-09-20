import { renderShareCard, SHARE_CARD_SIZE } from '@/lib/share-card';

export const alt = 'PALMA, The Creator Honours';
export const size = SHARE_CARD_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return renderShareCard({
    eyebrow: 'The Creator Honours',
    name: 'PALMA',
    line: 'Recognising the people shaping creator culture.',
    footer: 'palmaawards.com',
  });
}
