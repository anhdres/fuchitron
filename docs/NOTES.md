# ⚽ Fuchitron — Amateur football scoreboard, mobile-first

**Status:** Live ✅ (auto-deploy active since 2026-06-17)  
**Primary URL:** [fuchitron.app](https://fuchitron.app)  
**Vercel URL:** [fuchitron.vercel.app](https://fuchitron.vercel.app)  
**Repo:** [anhdres/fuchitron](https://github.com/anhdres/fuchitron) (linked to Vercel ✅)  
**Vercel project:** `lavadero/fuchitron` (`prj_buOScXCL0MVeBxAgafKI7KswI6n8`, team `lavadero`, `rootDirectory: "src"`)  
**Vercel account:** `anhdr3s`  
**Local source:** `~/.openclaw/workspace/projects/Fuchitron/src/`  
**Local git:** independent repo at `projects/Fuchitron/.git`, remote `origin` → `anhdres/fuchitron`

**Related:** [[Futsudoro/futsudoro]] — another side project with a Japanese aesthetic.

---

## Vercel ↔ GitHub workflow (2026-06-17)

- The Vercel project `fuchitron` is linked to `anhdres/fuchitron` (production branch: `main`)
- Push to `main` from `ishiroca` (collaborator) → Vercel auto-deploys
- Same flow as [[Futsudoro]] and [[Cathy]]
- Vercel token stored in `~/.openclaw/openclaw.json` (scope: `lavadero` team)
- `gh auth status` is set up with `ishiroca` (keyring, scope: gist + read:org + repo + workflow)

**Checklist per change:**
1. Edit in `src/`
2. `git add -A && git commit -m "..."`
3. `git push origin main` (auto-deploy to Vercel)
4. Verify the deploy at `https://vercel.com/lavadero/fuchitron` (or via CLI: `vercel ls`)
5. Log the change in this file with date + deploy URL

## Update 2026-06-17 (recover live source + enable auto-deploy)

- The local `codex/` was older than the last production deploy (`dpl_2uFcrk8dPChD3irF1kfqx1E7oGiy`, commit `2710da5e`).
- Recovered the live tree via the Vercel API `/v8/deployments/{id}/files/{uid}` (v6 is deprecated; v8 returns base64 — decode before saving).
- Replaced `codex/` with `src/` containing the full source:
  - `index.html`, `app.js`, `styles.css`, `i18n.js`
  - `live.html` (spectator view) + `spectate.html` (redirects to `/live/`)
  - `sw.js` + `manifest.json` + `icons/` (PWA)
  - `vercel.json` with rewrites `/s/:code` and `/live/:code`
  - `FEATURES.md`, `backup.sh`
- Configured the Vercel project with `rootDirectory: "src"` so the GitHub auto-deploy serves from `src/`.
- Repo `anhdres/fuchitron` was already linked to Vercel — just needed a code push.
- `assets/` (AI logos) stays in the repo as design source, outside `rootDirectory` (not deployed).
- Vercel had previously deployed the same tree via CLI (`source: "cli"` in metadata) — that's why the production deploy had SHA `2710da5e` from GitHub but the source files were in `src/`.

**First auto-deploy from GitHub ✅**
- Push to `main` from `ishiroca` → deploy with SHA `e4ef1c5b` (same as the push).
- Post-deploy smoke tests:
  - `https://fuchitron.app/` → 200, `<title>Fuchitron — Marcador de fútbol amateur en tiempo real</title>`
  - `https://fuchitron.app/live/TESTCODE` → 200 (vercel.json rewrite → `/live.html`)
  - `https://fuchitron.app/s/TESTCODE` → 200 (rewrite → `/spectate.html` → redirect to `/live/`)
  - `/icons/icon-192.png` → 200 image/png
  - `/manifest.json` → 200 application/json
  - `/src/live.html` → 404 (expected, `src/` is not exposed by `rootDirectory`)
  - `/vercel.json` → 404 (expected, not exposed)

---

## General idea

App for tracking goals + time in amateur football matches and sharing results on WhatsApp or as an image. Designed for real on-field use and feedback from ~13-year-olds, with a "FIFA/broadcast" aesthetic.

## Current scope (v1)

- Home vs Away
- Large, clear scoreboard
- Goal by team
- Timeline with minute and period
- Delete goals from timeline + undo last
- Time per period (1st/2nd)
- Configurable period duration
- Overtime indicator (`+1`, `+2`, etc.)
- Share: WhatsApp, copy text, copy image (if browser supports), download image
- Team shirt color customization (closed palette)
- Goal animation + vibration (no sound)
- 7-language UI (es/en/de/pt/fr/it/zh)
- PWA install + offline support
- Real-time spectator sharing via unique link

## UI decisions that worked

- Prioritize utility over branding
- Horizontal scoreboard with very large numbers
- Two main blocks (Home and Away) with their own color identity
- Goal buttons outside the cards to avoid accidental taps and visual noise
- Readable timeline for correcting data-entry errors
- Use Space Grotesk for clock and score numbers (broadcast feel)
- Use Lexend for body text (clean, high-legibility)

## What didn't work (iterations)

- A dominant header/tagline at the start: stole focus from the scoreboard
- Stacked cards on mobile confused the score read
- Delete controls in the scoreboard area were unnecessary (the timeline is better)
- Layout that broke down to a single column below 360px made the score look strange on small phones

## Learnings

- For this kind of app: readability + operation speed first, branding second
- On small phones (<360px), keep the 2-column scoreboard and scale the numbers down
- Visual effects (flash/pop) add value as long as they don't slow down cold start

## Typography and style

- Title / hero: **Geo** (over background, no card)
- Team names + score: **Space Grotesk** (broadcast)
- Body text: **Lexend** (clean, highly legible)
- Goal banner: **Anton SC** (bold display)
- Background: grass-texture gradient

## Team shirt color palette (agreed)

- White — `#FFFFFF`
- Classic red — `#C8102E`
- Deep blue — `#0033A0`
- Black — `#111111`
- Grass green — `#00843D`
- Intense yellow — `#FFD100`
- Sky blue — `#6EC1E4`
- Maroon / wine — `#800020`
- Vibrant orange — `#FF6A00`
- Violet — `#5A2D81`

## Vercel ops (important)

Per request from Andrés: **every change deployed to Vercel must be mirrored locally with notes**.

Checklist per project:
1. Code updated in the local folder
2. Deployed to Vercel
3. Note in this file: what changed / what worked / what didn't
4. If relevant, update `memory/` and `MEMORY.md` with durable decisions

## Vercel rewrite gotcha (learned 2026-07-23)

The `vercel.json` rewrites initially used:

```json
{ "source": "/live/:code", "destination": "/live.html?code=***" }
```

Vercel does **not** substitute the `***` in the destination — it passes the literal string. So `live.html` always received `code=***` and showed "No match code provided." even when the URL was correct.

**Fix:** drop the query string from the destination and have the JS read the code from the path:

```json
{ "source": "/live/:code", "destination": "/live.html" }
```

```js
// live.html
function getMatchCode() {
  const fromQuery = new URLSearchParams(window.location.search).get('code');
  if (fromQuery) return fromQuery;
  const match = window.location.pathname.match(/\/live\/([A-Z0-9]+)/i);
  return match ? match[1] : null;
}
```

Same pattern for `/s/:code` → `/spectate.html`.

Also: links from HTML served under a rewrite must use **absolute paths** (e.g. `/styles.css`), not relative (`styles.css`). From `/live/CODE` the browser would otherwise request `/live/styles.css` and 404.

## Update 2026-07-23 (polish pass + new Supabase project + spectator)

This was a major session. Full audit at `docs/AUDIT-2026-07-23.md`. Summary of what shipped:

**Critical fixes:**
- C1: timer no longer drifts on reload (recomputes from `matchStartTS`)
- C4: spectate button + alerts are now i18n-aware in 7 languages
- C5: reuses existing `spectateCode` instead of creating orphans in Supabase
- C6: SW cache now includes `/live/`, `/s/`, `i18n.js`, `og-image.png`, `logo.svg`

**Polish (Bloque B):**
- M1: <360px layout keeps the 2-column scoreboard (no more grid collapse)
- M5: snackbar with 5-second undo when deleting a goal
- a11y: `aria-live` on scores, `aria-label` on goal-deletion buttons, `aria-hidden` on the goal banner, `safe-area-inset-top` on the topbar for iPhone notch

**Spectator (rebuilt):**
- Path-based code reading in `live.html` and `spectate.html`
- Timeline rendered from the `goals` array in the payload (not just score)
- `period_minutes` now flows from the host to the spectator (no more hardcoded 45)
- Live clock computed from `match_start_ts` (not stale `half_seconds`)
- 7-language localization with `?lang=` URL parameter

**Supabase rotation:**
- Old project `mbczsqzbgwimbelpglks` was paused (free tier, 7-day idle timeout).
- New project `jorehxhrnpggvsgdnrpk` is now in use.
- Old anon key is rotated; new publishable key is `sb_publishable_…` (in `src/app.js` and `src/live.html`).
- SQL schema for the `matches` table is created in the new project (see the deploy message for the script).

**Spectate button:** copies a clean URL only (no `?lang=`, no `🔥 Follow this match live:` prefix). Just `https://fuchitron.app/live/XXXXXX`.

**Differentiated states in live.html:**
- No code in URL → "No se proporcionó código de partido" (the original message)
- Code provided but no match in DB → after 2 failed polls, "Partido no encontrado" with a hint to ask the host for a new link

**Supabase heartbeat:** added `.github/workflows/supabase-heartbeat.yml` to keep the project warm. Pings every 3 days. Needs a `SUPABASE_ANON_KEY` repository secret (same key as in the code).

## Update 2026-03-18 ("andate al carajo" mode)

- Local backup saved in `fuchitron/backups/20260318-183640/` (`index.html`, `styles.css`, `app.js`).
- Applied an extreme "FIFA night" skin:
  - more contrast, soft neon glow per team
  - bigger, visually heavier score
  - goal buttons with team colors and broadcast look
  - panels with depth and inner shadows
  - goal banner and flash keep the arcade feedback
- Production deploy: `https://fuchitron.vercel.app`.

## Update 2026-03-19 (Stitch sunlight adaptation)

- Adopted the Stitch proposal visually in `fuchitron/index.html` + `styles.css`, keeping the original `app.js` logic.
- Main changes:
  - fixed black header with high-contrast branding
  - LIVE block + giant timer + green overtime
  - scoreboard in 2 panels with VS separator and strong borders
  - extra-large goal buttons (minimum 44×44 touch target on critical actions)
  - higher-contrast timeline + "X" delete button with a generous touch area
  - dimmed bottom bar (less prominence than the scoreboard)
- Robustness tweaks:
  - fixed the central separator to "VS" (avoiding a typo)
  - `applyTeamColors()` now keeps the black background and only applies color in borders/actions, so custom palettes don't lose legibility in sunlight
- Result: a design much closer to Stitch without breaking on-field usability or existing features.
- Local backup of this iteration: `fuchitron/backups/20260319-085934/`.
- Production deploy (alias): `https://fuchitron.vercel.app`.
- Specific deploy URL: `https://fuchitron-hf66zxxx1-andres-projects-615bc726.vercel.app`.

## Update 2026-03-19 (WebApp/PWA option)

- Added install-as-WebApp option inside the share section (`Instalar WebApp`).
- Implemented `beforeinstallprompt` in `app.js` for Android/Chrome (native prompt when available).
- Added a specific hint for iPhone/Safari: "Share → Add to Home Screen".
- Registered `sw.js` (basic offline cache of core files).
- Updated `manifest.json` with colors and icons (`icons/icon-192.png`, `icons/icon-512.png`).
- PWA icon: stopped using `rocky.png` and cropped the ball from the logo Andrés sent as the official app icon.
- Backup: `fuchitron/backups/20260319-091029/`.
- Production deploy: `https://fuchitron.vercel.app` (`https://fuchitron-hqaofklwy-andres-projects-615bc726.vercel.app`).

## Update 2026-03-19 (usability tweaks requested by Andrés)

- LIVE: now shows just "EN VIVO" + a pulsing dot **only while the clock is running**. No banner before kickoff.
- Timer fix: `Reset timer` now correctly goes back to `1T` (fixed a bug where it stayed in `2T`).
- Removed the bottom bar (didn't add function at this stage).
- Default names: if not customized, the name field on the card stays empty (no more "HOME/AWAY" duplication).
- Goal buttons: removed the `+` from the text (the add icon stays as the indicator).
- Copy localized to Argentine Spanish (buttons and main titles).
- Added a block of expected time references:
  - Kickoff: 0'
  - End of 1st half: `N' (+/-)`
  - End of match: `2N' (+/-)`
  (N = configured period duration)
- Backup: `fuchitron/backups/20260319-092621/`.
- Deploy: `https://fuchitron.vercel.app` (`https://fuchitron-qnu2241va-andres-projects-615bc726.vercel.app`).

## Update 2026-03-26 (confirm dialogs + "Resultado parcial" + Vercel fix)

- Backup: `backups/20260326-000100-app.js`
- `nextPeriod()` now has confirm popups for ending 1T and ending the match (same as reset)
- "EN VIVO" → "RESULTADO PARCIAL" (index.html + app.js canvas share)
- Vercel deploy fix: project was "app" instead of "fuchitron". Correct ID: `prj_buOScXCL0MVeBxAgafKI7KswI6n8`. Set `.vercel/project.json` with this ID for correct deploys.
- Deploy: `https://fuchitron.vercel.app` ✅

## Update 2026-03-19 (per-team gradients + palette simplification)

- Scoreboard and goal buttons now use a gradient based on the team's primary color (closer to the shared reference).
- Removed secondary colors from the UI and settings panel (one color per team).
- Moved the `HOME` / `AWAY` labels above each score card.
- Added 4 new colors to the palette: pink, brown, light sky blue, turquoise.
- Backup: `fuchitron/backups/20260319-095145/`.
- Deploy: `https://fuchitron.vercel.app` (`https://fuchitron-n4cdkbdi5-andres-projects-615bc726.vercel.app`).
