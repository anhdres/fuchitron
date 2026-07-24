# Fuchitron ⚽

A scoreboard and timer for amateur football. Mobile-first, PWA, multilingual.

🌐 [fuchitron.app](https://fuchitron.app) · [fuchitron.vercel.app](https://fuchitron.vercel.app)

## Repo structure

```
fuchitron/
├── src/              ← WHAT GETS DEPLOYED. ONLY app + assets the app needs.
│   ├── index.html
│   ├── live.html
│   ├── spectate.html
│   ├── app.js
│   ├── styles.css
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
└── .github/
    └── workflows/    ← GitHub Actions (heartbeat, etc.)
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

## Spectator link

`live.html` and `spectate.html` let anyone follow a match in real time via a
shared link. The host creates a spectate link from the share dialog, the URL
looks like `https://fuchitron.app/live/XXXXXX` (or the short form `/s/XXXXXX`).

State is synced to Supabase (matches table). The spectator polls every 3s
and renders score, clock, period, and goal timeline.

A GitHub Actions workflow (`.github/workflows/supabase-heartbeat.yml`) pings
the Supabase project every 3 days to keep it warm on the free tier (Supabase
pauses idle projects after 7 days).

## Contributing

1. Make the change in `src/`.
2. Run `bash scripts/check-hygiene.sh` before committing.
3. Commit and push to `main`.

## License

UNLICENSED — personal project.
