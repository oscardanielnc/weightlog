#!/usr/bin/env bash
# =============================================================================
#  Despliegue en la VM (Oracle Cloud, Oracle Linux + Docker).
#
#  Se ejecuta dentro de la máquina, en la raíz del repositorio clonado:
#      ./deploy/docker/desplegar-vm.sh
#
#  No instala Node en el servidor: la compilación ocurre en un contenedor
#  desechable, y lo que queda es Nginx sirviendo archivos estáticos.
# =============================================================================
set -euo pipefail

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
# --force-recreate vuelve a aplicar las etiquetas de SELinux a los montajes.
docker compose up -d --force-recreate

echo "==> Comprobando"
sleep 2
curl -sI "http://127.0.0.1:${PUERTO:-8082}/" | head -1
curl -sI "http://127.0.0.1:${PUERTO:-8082}/app/" | head -1
echo "==> Listo"
