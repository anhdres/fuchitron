#!/usr/bin/env bash
# Fuchitron — repo hygiene check
# Runs as pre-commit hook + can be invoked manually: ./scripts/check-hygiene.sh
#
# Reglas:
# 1. CERO archivos de trabajo / docs / scripts dentro de src/
# 2. CERO assets basura (backup/test/new/old/final/copy/temp/og/rendered/etc.) en src/
# 3. CERO fuentes editables (ai/fig/sketch/psd/xd) en repo
# 4. CERO work docs sensibles en el repo
#
# Exit 0 = OK, exit 1 = bloquear el commit

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
ERRORS=0

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yel()   { printf '\033[33m%s\033[0m\n' "$*"; }

fail() {
  red "  ✗ $*"
  ERRORS=$((ERRORS+1))
}

# ─── 1. Stage actual (lo que se va a commitear) ──────────────────────
# Si hay un commit en curso usamos los staged files; si no, los tracked + unstaged
STAGED=$(git diff --cached --name-only --diff-filter=ACMRT 2>/dev/null || true)
if [ -z "$STAGED" ]; then
  # modo manual: revisar todo lo trackeado
  STAGED=$(git ls-files)
fi

if [ -z "$STAGED" ]; then
  green "✓ Repo vacío, nada que revisar"
  exit 0
fi

yel "→ Revisando $(echo "$STAGED" | wc -l | tr -d ' ') archivos staged/tracked..."

# ─── 2. Bloquear work docs dentro de src/ ───────────────────────────
yel "  [1/4] Work docs en src/"
DOCS_PATTERN='\.md$|\.markdown$|\.txt$|\.rst$|^docs?/.*|notes?/|CHANGELOG|HISTORY|TODO'
while IFS= read -r f; do
  case "$f" in
    src/*)
      if echo "$f" | grep -Eq "$DOCS_PATTERN"; then
        fail "src/ contiene work doc: $f  → mover a docs/ o eliminar"
      fi
      ;;
  esac
done <<< "$STAGED"

# ─── 3. Bloquear scripts dentro de src/ ─────────────────────────────
yel "  [2/4] Scripts ejecutables en src/"
while IFS= read -r f; do
  case "$f" in
    src/*.sh|src/*.py|src/*.rb|src/*.js.map)
      fail "src/ contiene script operativo: $f  → mover a scripts/ o eliminar"
      ;;
  esac
done <<< "$STAGED"

# ─── 4. Bloquear variants / backups / test en assets ────────────────
yel "  [3/4] Asset variants / backups / tests (sólo extensiones de asset)"
# Limitar a extensiones de imagen/asset: png, jpg, jpeg, gif, svg, webp, ico, pdf, mp4, mp3, wav
ASSET_EXT='\.(png|jpe?g|gif|svg|webp|ico|bmp|tiff?|pdf|mp[34]|wav|ogg)$'
VARIANT_NAME='(backup|test|new|old|final|temp|tmp|copy|og|rendered|rsng|t2|v[0-9]+)'
while IFS= read -r f; do
  base=$(basename "$f")
  if echo "$base" | grep -Eiq -- "$ASSET_EXT" && \
     echo "$base" | grep -Eiq -- "$VARIANT_NAME"; then
    fail "asset variant detectado: $f  → usar el canónico o eliminar"
  fi
done <<< "$STAGED"

# ─── 5. Bloquear fuentes editables ──────────────────────────────────
yel "  [4/4] Fuentes editables (AI/FIG/Sketch/PSD)"
SRC_RE='(^|/)(.+/)?[^/]+\.(ai|fig|sketch|afdesign|afphoto|psd|xd)$'
while IFS= read -r f; do
  if echo "$f" | grep -Eq -- "$SRC_RE"; then
    fail "fuente editable en repo: $f  → mover fuera del repo (.gitignore ya la ignora si está en root)"
  fi
done <<< "$STAGED"

# ─── Veredicto ──────────────────────────────────────────────────────
echo
if [ $ERRORS -gt 0 ]; then
  red "✗ Hygiene check FALLÓ: $ERRORS problemas"
  echo
  yel "  Recordá: src/ es SOLO para la app y lo que necesita para correr."
  yel "  Work docs → docs/"
  yel "  Scripts ops → scripts/"
  yel "  Assets basura → eliminar"
  exit 1
fi

green "✓ Hygiene check OK — podés commitear"
exit 0