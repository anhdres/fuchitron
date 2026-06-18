# ⚽ Fuchitron — Marcador amateur mobile-first

**Status:** Live ✅ (auto-deploy activo desde 2026-06-17)  
**URL primaria:** [fuchitron.app](https://fuchitron.app)  
**URL Vercel:** [fuchitron.vercel.app](https://fuchitron.vercel.app)  
**Repo:** [anhdres/fuchitron](https://github.com/anhdres/fuchitron) (linkeado en Vercel ✅)  
**Vercel project:** `lavadero/fuchitron` (`prj_buOScXCL0MVeBxAgafKI7KswI6n8`, team `lavadero`, `rootDirectory: "src"`)  
**Cuenta Vercel:** `anhdr3s`  
**Código local:** `~/.openclaw/workspace/projects/Fuchitron/src/`  
**Git local:** repo independiente en `projects/Fuchitron/.git`, remote `origin` → `anhdres/fuchitron`

**Relacionado:** [[Futsudoro/futsudoro]] — otro proyecto side con estética japonesa

---

## Workflow Vercel ↔ GitHub (2026-06-17)

- Vercel project `fuchitron` está linkeado a `anhdres/fuchitron` (production branch: `main`)
- Push a `main` desde `ishiroca` (colaborador) → Vercel auto-deploya
- Mismo flujo que [[Futsudoro]] y [[Cathy]]
- Token Vercel en `~/.openclaw/openclaw.json` (scope: lavadero team)
- `gh auth status` ya está con `ishiroca` (keyring, scope: gist + read:org + repo + workflow)

**Checklist por cambio:**
1. Editar en `src/`
2. `git add -A && git commit -m "..."`
3. `git push origin main` (auto-deploy en Vercel)
4. Verificar deploy en `https://vercel.com/lavadero/fuchitron` (o Vercel CLI: `vercel ls`)
5. Anotar el cambio en este archivo con fecha + deploy URL

## Update 2026-06-17 (recuperar source live + activar auto-deploy)

- El local `codex/` era más viejo que el último production deploy live (`dpl_2uFcrk8dPChD3irF1kfqx1E7oGiy`, commit `2710da5e`).
- Recuperé el árbol live via Vercel API `/v8/deployments/{id}/files/{uid}` (v6 está deprecada, v8 retorna base64 — decodificar antes de guardar).
- Reemplacé `codex/` por `src/` con todo el source:
  - `index.html`, `app.js`, `styles.css`, `i18n.js`
  - `live.html` (spectator view) + `spectate.html` (redirect a /live/)
  - `sw.js` + `manifest.json` + `icons/` (PWA)
  - `vercel.json` con rewrites `/s/:code` y `/live/:code`
  - `FEATURES.md`, `backup.sh`
- Configuré Vercel project con `rootDirectory: "src"` para que el auto-deploy desde GitHub sirva los archivos desde `src/`.
- Repo `anhdres/fuchitron` ya estaba linkeado a Vercel — solo faltaba pushear código.
- `assets/` (logos AI) queda en el repo como fuente de diseño, fuera del rootDirectory (no se deploya).
- Vercel había deployado antes el mismo árbol vía CLI (`source: "cli"` en metadata) — por eso el production deploy tenía SHA `2710da5e` desde GitHub pero los archivos en `src/`.

**Primer auto-deploy desde GitHub ✅**
- Push a `main` desde `ishiroca` → deploy `dpl_xxx` con SHA `e4ef1c5b` (mismo commit que el push).
- Smoke tests post-deploy:
  - `https://fuchitron.app/` → 200, `<title>Fuchitron — Marcador de fútbol amateur en tiempo real</title>`
  - `https://fuchitron.app/live/TESTCODE` → 200 (vercel.json rewrite → `/live.html?code=TESTCODE`)
  - `https://fuchitron.app/s/TESTCODE` → 200 (rewrite → `/spectate.html?code=TESTCODE` → redirect a `/live/`)
  - `/icons/icon-192.png` → 200 image/png
  - `/manifest.json` → 200 application/json
  - `/src/live.html` → 404 (esperado, src/ no se expone por rootDirectory)
  - `/vercel.json` → 404 (esperado, no se expone)


---

## Idea general
App para anotar goles + tiempo de partidos de fútbol amateur y compartir resultados en WhatsApp o como imagen.
Pensada para uso real en cancha y feedback de chicos (~13 años), con estética más "FIFA/broadcast".

## Scope actual (v1)
- Local vs Visitante
- Marcador grande y claro
- Gol por equipo
- Timeline con minuto y periodo
- Borrado de goles desde timeline + deshacer último
- Tiempo por periodos (1T/2T)
- Duración configurable por tiempo
- Tiempo extra visual tipo `+1`, `+2`
- Share: WhatsApp, copiar texto, copiar imagen (si browser soporta), descargar imagen
- Personalización de colores de camiseta (paleta cerrada)
- Animación de gol + vibración (sin sonido)

## Decisiones de UI que funcionaron
- Priorizar utilidad arriba de branding
- Marcador horizontal y números muy grandes
- Dos bloques principales (Local y Visitante) con identidad color propia
- Botones de gol fuera de las cards para evitar taps accidentales/ruido visual
- Timeline legible para corregir errores de carga

## Lo que no funcionó (iteraciones)
- Header/tagline muy dominante al inicio: restaba foco al marcador
- En mobile, cards apiladas confundían lectura del score
- Controles de borrar en el área del marcador eran innecesarios (mejor timeline)

## Aprendizajes
- Para este tipo de app: primero legibilidad + velocidad de operación, después branding
- En mobile chico (<360px), layout debe simplificarse automáticamente
- Los efectos visuales (flash/pop) suman si no interfieren la carga rápida

## Tipografías y estilo
- Título: Google Font **Geo** (sobre fondo, sin card)
- Equipos + marcador: **Anton SC**
- Fondo: textura de césped infinita

## Paleta de camisetas acordada
- Blanco — `#FFFFFF`
- Rojo clásico — `#C8102E`
- Azul profundo — `#0033A0`
- Negro — `#111111`
- Verde césped — `#00843D`
- Amarillo intenso — `#FFD100`
- Celeste — `#6EC1E4`
- Granate / bordó — `#800020`
- Naranja vibrante — `#FF6A00`
- Violeta — `#5A2D81`

## Operativa Vercel (importante)
A pedido de Andrés: **todo cambio deployado en Vercel debe quedar espejado localmente con notas**.

Checklist por proyecto:
1. Código actualizado en carpeta local
2. Deploy a Vercel
3. Nota en este archivo: qué se cambió / qué funcionó / qué no
4. Si aplica, actualizar memoria diaria y MEMORY.md con decisiones duraderas

## Update 2026-03-18 (modo "andate al carajo")
- Se guardó backup local previo en `fuchitron/backups/20260318-183640/` (`index.html`, `styles.css`, `app.js`).
- Se aplicó una skin "FIFA night" más extrema:
  - más contraste, neón suave y glow por equipo
  - score más grande y pesado visualmente
  - botones de gol con color por equipo y look broadcast
  - paneles con profundidad/sombras internas
  - banner de gol y flash mantienen feedback arcade
- Deploy actualizado a producción: `https://fuchitron.vercel.app`.

## Update 2026-03-19 (adaptación Stitch sunlight)
- Se adoptó visualmente la propuesta de Stitch en `fuchitron/index.html` + `styles.css`, manteniendo la lógica original de `app.js`.
- Cambios principales:
  - header fijo negro con branding alto contraste
  - bloque LIVE + cronómetro gigante + overtime verde
  - scoreboard en 2 paneles con separador VS y bordes fuertes
  - botones de gol extragrandes (mínimo 44x44 táctil en acciones críticas)
  - timeline más contrastada + botón de borrar tipo “X” con área táctil amplia
  - barra inferior atenuada (menos protagonismo que el marcador)
- Ajustes de robustez:
  - se corrigió el separador central a “VS” (evitando typo)
  - `applyTeamColors()` ahora conserva fondo negro y solo aplica color en bordes/acciones, para no perder legibilidad al sol con paletas personalizadas.
- Resultado: diseño mucho más cercano a Stitch sin romper usabilidad de cancha ni features existentes.
- Backup local de esta iteración: `fuchitron/backups/20260319-085934/`.
- Deploy a producción completado (alias): `https://fuchitron.vercel.app`.
- URL de deployment puntual: `https://fuchitron-hf66zxxx1-andres-projects-615bc726.vercel.app`.

## Update 2026-03-19 (opción WebApp/PWA)
- Se agregó opción de instalación como WebApp dentro de la sección de compartir (`Instalar WebApp`).
- Implementado `beforeinstallprompt` en `app.js` para Android/Chrome (prompt nativo cuando está disponible).
- Se agregó hint específico para iPhone/Safari: “Compartir → Agregar a pantalla de inicio”.
- Se registró `sw.js` (cache básico offline de archivos core).
- `manifest.json` actualizado con colores y íconos (`icons/icon-192.png`, `icons/icon-512.png`).
- Reemplazo de ícono PWA: se dejó de usar `rocky.png` y se recortó la pelota del logo enviado por Andrés como ícono oficial de app.
- Backup de este cambio: `fuchitron/backups/20260319-091029/`.
- Deploy actualizado en producción: `https://fuchitron.vercel.app` (`https://fuchitron-hqaofklwy-andres-projects-615bc726.vercel.app`).

## Update 2026-03-19 (ajustes de usabilidad pedidos por Andrés)
- LIVE: ahora muestra solo “EN VIVO” + punto latiendo **solo mientras el reloj corre**. Antes del arranque no se muestra cartel.
- Fix timer: `Reiniciar tiempo` ahora vuelve correctamente a `1T` (resuelto bug de quedarse en `2T`).
- Se eliminó la barra inferior (no aportaba función en esta etapa).
- Nombres por defecto: si no se customiza, el campo de nombre en la tarjeta queda vacío (ya no duplica “LOCAL/VISITANTE”).
- Botones de gol: se quitó el signo `+` del texto (queda el ícono de sumar como indicador).
- Copys localizados en español argentino (botones y títulos principales).
- Se agregó bloque de referencias de tiempo esperado:
  - Comienzo del partido: 0'
  - Final del primer tiempo: `N' (+/-)`
  - Final del partido: `2N' (+/-)`
  (N = duración por tiempo configurada)
- Backup: `fuchitron/backups/20260319-092621/`.
- Deploy: `https://fuchitron.vercel.app` (`https://fuchitron-qnu2241va-andres-projects-615bc726.vercel.app`).

## Update 2026-03-26 (confirm dialogs + "Resultado parcial" + fix Vercel)
- Backup: `backups/20260326-000100-app.js`
- `nextPeriod()` ahora tiene popup de confirmación para terminar 1T y terminar partido ( igual que reset)
- "EN VIVO" → "RESULTADO PARCIAL" (index.html + app.js canvas share)
- Fix deploy Vercel: proyecto era "app" en vez de "fuchitron". ID correcto: `prj_buOScXCL0MVeBxAgafKI7KswI6n8`. Configurar `.vercel/project.json` con este ID para deploys correctos.
- Deploy: `https://fuchitron.vercel.app` ✅

## Update 2026-03-19 (gradientes por equipo + simplificación paleta)
- Scoreboard y botones de gol ahora usan gradiente basado en color principal de cada equipo (look más cercano a la referencia compartida).
- Se eliminaron los colores secundarios de la UI y del panel de ajustes (quedó 1 color por equipo).
- Se movieron las etiquetas `LOCAL` / `VISITANTE` arriba de cada tarjeta de score.
- Se sumaron 4 colores nuevos en paleta: rosa, marrón, celeste claro, turquesa.
- Backup: `fuchitron/backups/20260319-095145/`.
- Deploy: `https://fuchitron.vercel.app` (`https://fuchitron-n4cdkbdi5-andres-projects-615bc726.vercel.app`).
