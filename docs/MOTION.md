# PALMA — motion and interaction language

Tailwind is not a design system, and a component library is not an interaction
language. This document is the language: what moves, how far, how fast, and —
more often — what deliberately does not move at all.

Nothing is animated because it can be. Every behaviour below exists to do one
of three jobs: **acknowledge** (I have seen your cursor), **orient** (this is
where you are, this is what changed), or **honour** (this moment is the point
of the institution).

---

## 1. The layers, and what each one is for

```
                        TYPOGRAPHY
                    editorial hierarchy
                             │
            ┌────────────────┴────────────────┐
            │                                 │
          CSS                              MOTION
   hover · focus · press                entrances · exits
   rules that draw                      layout · gestures
   metadata that surfaces               page transitions
   the whole interaction                       │
   language, at zero                           │
   hydration cost                            GSAP
            │                          ScrollTrigger
            │                          season choreography
            │                          the ink fill
            │                                 │
            └────────────────┬────────────────┘
                             │
                        THREE.JS
                      the PALMA trophy
                    winner moments only
                             │
                             ↓
                      ILLUSION LAYER
              ink fill · pointer depth
                  (three uses, total)
```

**Each layer has a job, and the cheapest layer that can do a job gets it.**

| Layer    | Owns                                                                        | Why not a layer above                                                                                                                 |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| CSS      | Hover, focus, press, rules, surfacing metadata                              | A hover state that needs JavaScript costs hydration, breaks `:focus-visible`, and needs a wrapper element that distorts layout        |
| Motion   | Entrances, exits, staggered groups, shared-element layout, page transitions | CSS cannot do exit animations or move one element between two positions in a list                                                     |
| GSAP     | Scroll-linked choreography, scrubbed timelines                              | Motion's scroll support is fine for simple reveals; a four-beat pinned sequence with a drawing spine is what ScrollTrigger exists for |
| Three.js | The trophy                                                                  | It is an object, not an effect                                                                                                        |

This ordering is why the shared JavaScript bundle is ~103 kB with all four
layers in the codebase. GSAP and Three.js are **not in any route's first load**;
they are fetched when a choreographed section or a winner page actually mounts,
and never at all under `prefers-reduced-motion`.

---

## 2. Tokens

All of it comes from `src/lib/motion/tokens.ts`, mirrored into CSS custom
properties for the CSS layer. Do not write a duration or a curve inline.

### Duration

| Token        | Seconds | Used for                                        |
| ------------ | ------- | ----------------------------------------------- |
| `instant`    | 0.12    | Press. Felt, not seen                           |
| `quick`      | 0.22    | Hover and focus                                 |
| `base`       | 0.38    | The default for anything entering in place      |
| `slow`       | 0.64    | Editorial reveals — a card, a row, an image     |
| `ceremonial` | 0.9     | Page and section entrances                      |
| `rite`       | 1.4     | The winner reveal. Used twice on the whole site |

### Easing

One family. `--ease-ceremonial` — `cubic-bezier(0.16, 1, 0.3, 1)` — is the house
curve: a firm start that **settles rather than bounces**. That single choice is
most of why the site feels composed instead of springy.

Exceptions, each with a stated reason: `editorial` (a touch faster, for text),
`exit` (accelerates away — exits should not linger), `tactile` (the only curve
with overshoot, only for press).

### Travel

PALMA moves things **a little**. Large travel reads as a web page performing;
small travel reads as a printed page being set.

`hairline` 2px · `near` 4px · `step` 8px · `rise` 18px · `enter` 36px

---

## 3. The behaviours

### Button

```
rest    flat · rule at zero width
hover   lifts 4px · rule draws from the leading edge
focus   identical to hover, plus the ring
press   settles 1px into the page
```

No scale, no shadow, no colour jump. The movement _is_ the feedback.

### Link

`.palma-link` — the underline travels in from the leading edge on approach, and
retreats to the **trailing** edge on leave, so the gesture reads as completed
rather than undone. A two-line rule that no one will consciously notice and
everyone will feel.

### Label

`.palma-label-interactive` — tracking opens from `0.14em` to `0.18em`. The
smallest gesture in the system.

### Card

Four movements, one easing, one gesture:

- the image pushes in 3%
- a rule travels the width of the title
- the arrow advances 8px
- the honour line surfaces from nothing

It does not float, it does not lift off the page, it does not acquire a shadow.
It **acknowledges** the reader. Space for surfacing metadata is reserved
(`min-h-7`) so nothing below it moves.

### Navigation

Desktop: one rule, shared across the whole bar, that **travels** between items
as attention moves — a single `layoutId` rather than eight independent
underlines. The navigation is one object that follows you.

Mobile: the panel is choreographed, not toggled. Display type arrives in
sequence at `STAGGER.tight`, which is the same editorial gesture used everywhere
else on the site, at menu scale.

### Page transition

`src/app/template.tsx` — a short rise and settle. Deliberately quiet: no wipes,
no curtains, no page-turning. PALMA moves you somewhere by being composed. The
ceremony is spent on the winner reveal; everything else gets out of the way.

### Season choreography

The one place where scrolling **is** the content. Four beats stacked vertically,
a spine that draws down through them as the reader descends, each beat resolving
as the spine reaches it, and Winners arriving at display scale as an event.

Rules that keep it from becoming a showreel:

- The section never pins longer than its own height. The reader is never held.
- Every beat is fully legible before it animates. **No information is carried by
  the animation.**
- With GSAP absent, the markup is a complete static season rail.

### Winner reveal

The only sequence permitted to be theatrical, and even then it is a sequence of
stills: season → category → pause → name → seal, at `rite` duration. It ends
with the trophy.

### Illusion layer

Three uses on the entire site.

- **Ink fill** (`InkFill`) — outline type that fills with ink as the reader
  passes. On the Roll of Honour, where the idea is _the record being written_.
  The unfilled state is legible; this is a heading, not a puzzle.
- **Pointer depth** (`DepthLayer` / `DepthItem`) — layers lean at different
  rates against a tilting parent. Enough to read as dimensional, nowhere near
  enough to read as parallax. Disabled on coarse pointers.

The rule: **the illusion should feel like discovering something**, not like a
section performing. If it appears on a third page, it has become a house style
and stops working.

### The trophy

Built procedurally from the same geometry as the printed mark — a spine, four
pairs of tapered blades, a crown, a plinth. Nothing is loaded from a file, so
the trophy can never drift from the mark on the certificate.

Gated four ways: imported only when on screen, never under reduced motion,
stopped when scrolled away or the tab is hidden, and silently replaced by the
engraved seal if WebGL is unavailable. **The seal fallback is not a degraded
experience** — it is the printed form of the same object, and a winner page
built only from it would still be right.

---

## 4. Reduced motion

`prefers-reduced-motion` is not a toggle that makes things faster. It is a
different, complete design.

- Motion keeps **opacity** (which carries meaning: this is new, this is gone)
  and drops every **transform** (which carries only flourish). `MotionConfig`
  sets this once, globally.
- GSAP and Three.js are **never loaded**. Not loaded and skipped — never
  fetched.
- Anything that hides content until it is approached is simply present. A reader
  who asked for less motion still gets the metadata, the ink fill at 100%, and
  the full season rail.
- The winner reveal becomes a still, complete composition. It loses nothing but
  its timing.

This is verified in the browser, not assumed: the QA pass asserts that zero
heavy chunks are requested, that season metadata is visible, and that the Roll
of Honour heading is fully inked.

---

## 5. Typography accents

Two faces carry the site — Fraunces for display, Inter for everything
functional. A third, **Amatic SC**, is the hand in the margin: used on the
homepage beneath the Roll of Honour, and once on a PaROH class page. Twice.

It is deliberately not available as a general utility. Used everywhere it is a
gimmick; used twice in the right places, people remember it.

---

## 6. Adding something new

1. **Which job is it doing** — acknowledge, orient, or honour? If none, stop.
2. **Which is the cheapest layer that can do it?** Start at CSS and only move up
   when the layer below genuinely cannot.
3. **Use the tokens.** A new duration or curve needs a written reason.
4. **Does it still work without the animation?** If the static state is wrong or
   incomplete, the design is wrong, not the animation.
5. **What does it cost the reader on a phone** who came to check a verification
   code?

> Every component should pass this test: does this make PALMA feel more like an
> institution, or more like another website? If an animation exists only because
> it looks cool — remove it.
