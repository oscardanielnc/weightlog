import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Política de seguridad de contenido de la aplicación.
 *
 * Todo el código y los datos son del propio origen: no hay CDN, analítica ni
 * ninguna llamada de red. `wasm-unsafe-eval` es el único permiso extra y lo
 * necesita SQLite compilado a WebAssembly (sql.js).
 *
 * Se inyecta solo en la compilación de producción porque el servidor de
 * desarrollo de Vite usa scripts en línea para el recambio en caliente.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  // `frame-ancestors` solo tiene efecto como cabecera HTTP: la sirve Nginx
  // (deploy/nginx/seguridad.conf). Ponerla aquí solo genera un aviso.
].join('; ');

function politicaDeSeguridad(): Plugin {
  return {
    name: 'csp-en-produccion',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        ),
    },
  };
}

export default defineConfig({
  // Rutas relativas: la misma compilación sirve para la PWA, para el subdirectorio
  // /app/ del sitio y para el APK (Capacitor la empaqueta como archivos locales).
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  plugins: [
    react(),
    politicaDeSeguridad(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'sql-wasm.wasm'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Sin red que consultar: todo se sirve desde la caché precargada.
        navigateFallback: 'index.html',
      },
      manifest: {
        id: 'pe.oscar.mipeso',
        name: 'Mi Peso — registro de peso e IMC',
        short_name: 'Mi Peso',
        description: 'Registro personal de peso e IMC, guardado solo en este dispositivo.',
        lang: 'es-PE',
        dir: 'ltr',
        categories: ['health', 'lifestyle', 'productivity'],
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#12151a',
        theme_color: '#3f6cd4',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
