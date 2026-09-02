# Fuchitron — Brand & Logo Spec

**Last updated:** 2026-07-25  
**Status:** Living doc — derived from in-product styling and the icon fix shipped in `8ee8ca4`.

This is the canonical spec for the Fuchitron mark. The current `src/icons/logo.svg` is a placeholder that just happens to look right; any future "logo from zero" work must respect these rules.

---

## 1. Subject

The mark combines **two ideas** in a single full silhouette:

- A **football/soccer ball** (the sport).
- A **stopwatch/digital watch** (the scoreboard product).

When drawn from zero, both must read at a glance. The current SVG only draws the stopwatch and reads ambiguously as "timer"; a future redesign should pull the ball forward so the mark never gets mistaken for a generic clock app.

---

## 2. Style

- **Linear only — no fills.** Everything is outline/stroke. The mark is a wireframe, never a silhouette.
- **No rounded corners.** Where two strokes meet, the join is square (miter) so the linework reads as engineered, not toy-like.
- **No drop shadows, no glows, no gradients.** A single flat color on a single flat background.

---

## 3. Stroke

- **Width:** `~4% of canvas width` (so `~20 px` on the 500×500 viewBox, or `~7.7 px` at 192×192).
- **All strokes the same width.** Mixing thicknesses breaks the linework coherence — pick one and commit.
- **Stroke ends:** `square` (not `round`). Match the miter joins.
- **Color:** `#39FF14` (lime/fluo). Same as the in-app accents (`<a>` links, primary action button border).

---

## 4. Aesthetic register: LCD / 7-segment digital watch

The stopwatch face must read like an LCD screen with seven-segment digits, **not** like a mechanical analog dial. Implications:

- Numerals (if shown at all) are seven-segment glyphs, not roman/arabic numerals.
- Hands are absent or implied by 7-segment blocks, not drawn as arrows.
- A "tick" mark or two is fine for orientation, but no full clock-hand geometry.

If the redesign shows a numeric display, prefer `88:88` (the universal LCD-test pattern) so the face reads as "scoreboard" instead of "specific time."

---

## 5. Palette

| Role     | Hex       | Usage                                        |
| -------- | --------- | -------------------------------------------- |
| Foreground | `#39FF14` | All strokes / linework                     |
| Background | `#000000` | Full canvas, edge to edge (no transparent) |

**Why solid black background:** Android launcher composites PWA icons over its own surface color, so transparent icons end up looking washed-out and incomplete on white-ish launchers. Black background makes the lime linework pop on every launcher AND matches the in-app theme (theme color `#000000`, app body `#000`).

**Forbidden:** any other accent color in the mark. No white, no gray, no orange. If a new feature ever needs a second accent in-product, do not bleed it into the logo.

---

## 6. Canvas & safe zones

- **Square aspect ratio** at all sizes.
- **Edge clearance:** outermost stroke must sit at least `~8% of canvas width` inside the canvas edge, so the linework doesn't kiss the corner when cropped to a circle/squircle (Android adaptive icon).
- **Safe zone (maskable variants):** all linework must fit within the inner **80%** of the canvas (clock content scaled to ~60% of full canvas, centered with black padding all around). The current `icon-192-maskable.png` / `icon-512-maskable.png` follow this — keep that ratio when re-rendering.

---

## 7. Export rules

When generating icons:

| Variant              | Size       | Notes                                       |
| -------------------- | ---------- | ------------------------------------------- |
| Regular              | 192, 512   | Clock at native (full canvas)               |
| Maskable             | 192, 512   | Clock scaled to ~60% (115/307), black padded |
| OG image (`og-image.png`) | 1200×630 | For OpenGraph / Twitter cards, same style  |

Render command (from `src/icons/`):

```bash
# Regular
magick -background black -density 384 logo.svg -resize 192x192 PNG24:icon-192.png
magick -background black -density 384 logo.svg -resize 512x512 PNG24:icon-512.png

# Maskable (clock scaled to 60%, centered)
magick -background black -density 384 logo.svg -resize 115x115 -gravity center -extent 192x192 PNG24:icon-192-maskable.png
magick -background black -density 384 logo.svg -resize 307x307 -gravity center -extent 512x512 PNG24:icon-512-maskable.png

# OG
magick -background black -density 384 logo.svg -resize 1200x630 PNG24:og-image.png
```

---

## 8. Don'ts

- ❌ No gradient, glow, or drop shadow.
- ❌ No rounded line caps or rounded joins.
- ❌ No transparent background.
- ❌ No secondary colors in the mark.
- ❌ No filled shapes (the whole mark is linework).
- ❌ No literal photo of a ball / real watch photo — keep it graphic.
- ❌ No "Fuchitron" wordmark baked into the icon (the app name lives in the launcher's label).