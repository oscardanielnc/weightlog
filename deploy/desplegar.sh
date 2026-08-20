#!/usr/bin/env bash
# =============================================================================
#  Despliegue del sitio a la VM de Oracle Cloud.
#
#  Uso:  ./deploy/desplegar.sh usuario@ip-de-la-vm
#
#  Compila todo localmente y sincroniza la carpeta `sitio/` con el servidor.
#  La VM solo sirve archivos estáticos: no ejecuta Node ni nada del proyecto.
# =============================================================================
set -euo pipefail

DESTINO="${1:-}"
RUTA_REMOTA="${RUTA_REMOTA:-/var/www/control-weight}"

if [[ -z "$DESTINO" ]]; then
  echo "Uso: $0 usuario@servidor" >&2
  exit 1
fi

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$raiz"

echo "==> Verificando (linter, tipos y pruebas)"
npm run lint
npm run typecheck
npm test

echo "==> Compilando el sitio"
npm run build
npm run sitio

echo "==> Sincronizando con $DESTINO:$RUTA_REMOTA"
rsync -az --delete --checksum \
  --rsync-path="sudo rsync" \
  sitio/ "$DESTINO:$RUTA_REMOTA/"

echo "==> Recargando Nginx"
ssh "$DESTINO" 'sudo nginx -t && sudo systemctl reload nginx'

echo "==> Listo"
