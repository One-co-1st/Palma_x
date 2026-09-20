# The PALMA mark

These files are served publicly at `palmaawards.com/brand/…` and are linked
from the press page. They are the institution's mark, and there is one of it.

| File                         | Use                                                |
| ---------------------------- | -------------------------------------------------- |
| `palma-mark-on-ink.png`      | Primary. Champagne on ink, 1024 × 1024.            |
| `palma-mark-on-ink.jpg`      | The same, for anything that will not take a PNG.   |
| `palma-mark-on-ivory.png`    | Ink on ivory, for light grounds.                   |
| `palma-mark-transparent.png` | Champagne, no background, for placing on your own. |
| `palma-favicon-512.png`      | Heavier stroke so it survives at small sizes.      |
| `palma-mark-on-ink.svg`      | Vector. Use this wherever vector is possible.      |
| `palma-mark-on-ivory.svg`    | Vector, ink on ivory.                              |

## These are exports, not the source

The mark is drawn in `src/components/brand/geometry.ts`, and everything that
renders it reads those paths: the site, the seal, the favicon route, the
home-screen icon. **Editing a file in this folder changes nothing anywhere
else.** If the mark ever changes, change the geometry and re-export, or the
files here will quietly stop matching the site they came from, which is
precisely the problem this folder exists downstream of.

## The rule the mark obeys

Open strokes, never closed leaf shapes. Do not recolour it, stretch it, rotate
it, outline it, add a gradient to it, or set it on a background that leaves the
champagne on ivory at low contrast. At small sizes use the heavier stroke.
