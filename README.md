# Fuchitron ⚽

A scoreboard and timer for amateur football. Mobile-first, PWA, multilingual.

🌐 [fuchitron.app](https://fuchitron.app) · [fuchitron.vercel.app](https://fuchitron.vercel.app)

## Repo structure

```
fuchitron/
├── src/              ← WHAT GETS DEPLOYED. ONLY app + assets the app needs.
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── fonts.css
│   ├── fonts/        ← self-hosted fonts, including the icon subset
│   ├── i18n.js
│   ├── sw.js
│   ├── manifest.json
│   ├── vercel.json
│   └── icons/        ← only icons referenced by manifest.json / index.html
└── docs/             ← internal work docs (NOT deployed)
    ├── NOTES.md
    ├── FEATURES.md
    └── AUDIT-*.md
└── scripts/          ← operational scripts (NOT deployed)
    └── backup.sh
└── .githooks/        ← pre-commit hygiene check
```

**Golden rule:** any new file inside `src/` must be strictly required for the
app to run in production. If it's for our internal use (docs, scripts, tests,
asset variants), it goes in `docs/` or `scripts/` — or it doesn't get committed.

The `scripts/check-hygiene.sh` script (run as a pre-commit hook) enforces this.

## Deploy

Push to `main` → Vercel auto-deploys from `src/`.

```bash
git add -A
git commit -m "..."
git push origin main
```

The Vercel project (`lavadero/fuchitron`, `prj_buOScXCL0MVeBxAgafKI7KswI6n8`)
is linked to this GitHub repo. Each push triggers a production deploy.

## i18n

Supported languages: `es`, `en`, `de`, `pt`, `fr`, `it`, `zh`. Source of truth:
`src/i18n.js`. URL parameter `?lang=<code>` overrides the auto-detect.

## PWA

`manifest.json` + `sw.js` allow installing on mobile and working offline.
The service worker caches core assets and uses a `CACHE_VERSION` constant —
bump it on each deploy to bust stale caches.

## Offline-first match data

Scores, goals, settings, and the timer anchor are kept on the device under
`fuchitron_v4`. The key is retained so existing matches survive upgrades.
Stored data is validated; runtime handles are not serialized. Open tabs
synchronize edits through storage events. This is a local scoreboard, not a
multi-user database: simultaneous edits in separate tabs are not transactional.

The former remote spectator feature and Supabase heartbeat were retired in
October 2026. Legacy spectator URLs redirect to the scoreboard. Sharing text
and images still works without any backend.

Typography and the Material Symbols subset are self-hosted and precached.
Licenses are in `docs/font-licenses/`. Service-worker updates wait for the
user to choose **Update now** or close all old tabs. The cached shell keeps
HTML, CSS, fonts and JavaScript on the same release, including offline.
When changing shell assets, bump both `CACHE_NAME` in `src/sw.js` and the
asset query version in `src/index.html` (the latter also bypasses pre-v12 caches).

## Verification

The regression scripts require Node.js and Playwright Core with Chrome. They
use isolated profiles and never touch a user's browser data.

```bash
python3 -m http.server 8766 --bind 127.0.0.1 --directory src
# In another terminal:
PLAYWRIGHT_MODULE=/path/to/playwright-core node scripts/audit-regressions.cjs
PLAYWRIGHT_MODULE=/path/to/playwright-core node scripts/audit-pwa.cjs
```

Set `OLD_SRC` to a previous release's `src/` directory to include the v11→v12
upgrade regression. Results and screenshots go to `AUDIT_OUTPUT` (defaults to
`/tmp/fuchitron-audit-20261017`). `BASE_URL` overrides the regression server URL;
`AUDIT_FILTER` runs matching named cases only. The PWA suite starts its own
local server, including a simulated next release.

## Contributing

1. Make the change in `src/`.
2. Run `bash scripts/check-hygiene.sh` before committing.
3. Commit and push to `main`.

## License

UNLICENSED — personal project.
