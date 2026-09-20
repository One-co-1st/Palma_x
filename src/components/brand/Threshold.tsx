/**
 * The threshold.
 *
 * Two ink panels covering the page, which part from the centreline to reveal
 * it. Open sesame.
 *
 * **It is pure CSS, and that is the whole point.** A loading screen that waits
 * for JavaScript is not fast, it is a delay wearing a costume: the page would
 * have been readable sooner without it. This is in the server-rendered markup,
 * animates from the first paint, and never blocks anything. The page is fully
 * laid out underneath the entire time; the panels are a covering that leaves,
 * not a screen that has to finish before content can start.
 *
 * It carried the palm mark in the centre for one version, and should not have.
 * The mark sat exactly over the hero wordmark for the whole entrance, which
 * read as a small gold blemish on the letterform rather than as a seal. Two
 * panels parting is the stronger gesture and the faster one: nothing to strike,
 * nothing to fade, nothing landing on top of the page it is revealing.
 *
 * It runs on a page load, which is to say when somebody arrives at PALMA. It
 * does not run on navigation between pages: `template.tsx` handles those, and a
 * curtain on every click would be theatre rather than an entrance.
 *
 * Under `prefers-reduced-motion` it is removed entirely rather than shortened.
 * A curtain nobody asked for is exactly the thing that setting means.
 */
export function Threshold() {
  return (
    <div className="palma-threshold" aria-hidden="true">
      <span className="palma-threshold-leaf" data-side="left" />
      <span className="palma-threshold-leaf" data-side="right" />
    </div>
  );
}
