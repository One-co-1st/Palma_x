/**
 * The one slot a creator record always shows.
 *
 * Everything else a creator adds is freeform: a label and an address, in
 * whatever order they like. This one is different because it is the first
 * question a reader arrives with — where do I watch — and a record that
 * answers it only for the creators who happened to fill it in is a record
 * that looks broken on everybody else.
 *
 * So it is always present. When a creator has given it, it is a link; when
 * they have not, PALMA says so plainly, in its own voice, rather than leaving
 * a gap the reader has to interpret.
 */

export type CreatorSlot = {
  key: 'channel';
  /** What the slot is called on the record. */
  label: string;
  /**
   * Labels a creator might have used for this slot, lower-cased. The match is
   * deliberately generous: creators write "Channel", "The series", "Videos",
   * and none of them is wrong.
   */
  aliases: string[];
  /** What PALMA says when the slot is empty. Light, never mocking. */
  empty: string;
};

export const CREATOR_SLOTS: readonly CreatorSlot[] = [
  {
    key: 'channel',
    label: 'Channel',
    aliases: ['channel', 'the series', 'video', 'videos', 'stream', 'watch', 'youtube'],
    empty: 'No channel on file. PALMA has looked, and found a very tidy nothing.',
  },
];

export type SlotLink = { label: string; url: string };

/**
 * Whether a link still points at the placeholder the record was seeded with.
 *
 * A record PALMA wrote before its creator claimed it carries `example.com`
 * addresses as placeholders. Sending a reader there answers nothing, so the
 * Channel slot links to PALMA's own holding page for the address instead;
 * any real, creator-supplied link still goes where the creator pointed it.
 */
export function isPlaceholderUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'example.com' || host.endsWith('.example.com');
  } catch {
    return false;
  }
}

/**
 * Fill the slot from whatever the creator actually provided, and report the
 * links that belong to something else so the record can still show them.
 */
export function fillCreatorSlots(links: readonly SlotLink[]): {
  slots: { slot: CreatorSlot; link: SlotLink | null }[];
  rest: SlotLink[];
} {
  const claimed = new Set<string>();

  const slots = CREATOR_SLOTS.map((slot) => {
    const link =
      links.find(
        (entry) =>
          !claimed.has(entry.url) && slot.aliases.includes(entry.label.trim().toLowerCase()),
      ) ?? null;
    if (link) claimed.add(link.url);
    return { slot, link };
  });

  return { slots, rest: links.filter((entry) => !claimed.has(entry.url)) };
}
