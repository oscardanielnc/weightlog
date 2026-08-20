import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el sitio funciona igual en la raíz de un dominio propio
  // (VM de Oracle) que bajo /control-weight/ en GitHub Pages.
  base: './',
  build: {
    target: 'es2022',
    assetsDir: 'estaticos',
  },
});
