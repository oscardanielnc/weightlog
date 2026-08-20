#!/usr/bin/env bash
# =============================================================================
#  Despliegue en la VM (Oracle Cloud, Oracle Linux + Docker).
#
#  Se ejecuta dentro de la máquina, en la raíz del repositorio clonado:
#      ./deploy/docker/desplegar-vm.sh
#
#  No instala Node en el servidor: la compilación ocurre en un contenedor
#  desechable, y lo que queda es Nginx sirviendo archivos estáticos.
#
#  Todo el cuerpo vive dentro de una función a propósito: bash lee el archivo
#  a medida que lo ejecuta, y aquí el propio script se actualiza con `git pull`
#  en su primer paso. Al estar dentro de una función, se analiza completo antes
#  de correr y el cambio recién se aplica en la siguiente ejecución.
# =============================================================================
set -euo pipefail

desplegar() {
  local raiz
  raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  cd "$raiz"

  echo "==> Actualizando el código"
  git pull --ff-only

  echo "==> Compilando el sitio en un contenedor de Node"
  docker run --rm \
    -v "$raiz":/proyecto:z -w /proyecto \
    -e npm_config_update_notifier=false \
    node:22-alpine \
    sh -c 'npm ci --no-audit --no-fund && npm run build && npm run sitio'

  echo "==> Levantando Nginx"
  cd deploy/docker
  # --force-recreate reaplica las etiquetas de SELinux y vuelve a montar la
  # carpeta del sitio: sin esto el contenedor puede quedarse con la anterior.
  docker compose up -d --force-recreate

  echo "==> Comprobando"
  sleep 3
  curl -fsS -o /dev/null -w "  raíz  %{http_code}\n" "http://127.0.0.1:${PUERTO:-8082}/"
  curl -fsS -o /dev/null -w "  app   %{http_code}\n" "http://127.0.0.1:${PUERTO:-8082}/app/"
  echo "==> Listo"
}

desplegar "$@"
