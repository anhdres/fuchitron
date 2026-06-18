# Fuchitron ⚽

Marcador y cronómetro para fútbol amateur. Mobile-first, PWA, multi-idioma.

🌐 [fuchitron.app](https://fuchitron.app) · [fuchitron.vercel.app](https://fuchitron.vercel.app)

## Estructura del repo

```
fuchitron/
├── src/              ← LO QUE SE DEPLIEGA. SOLO app + assets que la app necesita.
│   ├── index.html
│   ├── live.html
│   ├── spectate.html
│   ├── app.js
│   ├── styles.css
│   ├── i18n.js
│   ├── sw.js
│   ├── manifest.json
│   ├── vercel.json
│   └── icons/        ← solo los íconos referenciados por manifest.json / index.html
└── docs/             ← work docs internos (NO se despliegan)
    ├── NOTES.md
    └── FEATURES.md
└── scripts/          ← scripts operativos (NO se despliegan)
    └── backup.sh
└── .githooks/        ← pre-commit hygiene check
```

**Regla de oro:** cualquier archivo nuevo dentro de `src/` debe ser estrictamente
necesario para que la app funcione en producción. Si es para nuestro uso interno
(docs, scripts, pruebas, variantes), va en `docs/` o `scripts/` — o no se commitea.

## Deploy

Push a `main` → Vercel auto-deploya desde `src/`.

```bash
git add -A
git commit -m "..."
git push origin main
```

## i18n

Idiomas soportados: `es`, `en`, `de`, `pt`, `fr`, `it`, `zh`. Source: `src/i18n.js`.

## PWA

`manifest.json` + `sw.js` permiten instalar en mobile y funcionar offline.

## Spectator link

`live.html` y `spectate.html` permiten seguir partidos en tiempo real vía link.