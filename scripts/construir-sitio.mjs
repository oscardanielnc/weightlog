/**
 * Arma el sitio completo que se publica: el sitio de producto en la raíz y la
 * aplicación instalable colgando de /app/.
 *
 *   sitio/
 *     index.html          <- apps/landing/dist
 *     estaticos/...
 *     app/                <- apps/app/dist (PWA con service worker)
 *
 * Se usa igual en GitHub Pages y en la VM de Oracle, así que lo que se prueba
 * en local es exactamente lo que se despliega.
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'sitio');

async function existe(ruta) {
  try {
    await stat(ruta);
    return true;
  } catch {
    return false;
  }
}

async function copiar(origen, hacia) {
  if (!(await existe(origen))) {
    throw new Error(`Falta ${origen}. Ejecuta "npm run build" antes de armar el sitio.`);
  }
  await cp(origen, hacia, { recursive: true });
}

await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });

await copiar(join(raiz, 'apps', 'landing', 'dist'), destino);
await copiar(join(raiz, 'apps', 'app', 'dist'), join(destino, 'app'));

console.log(`sitio listo en ${destino}`);
