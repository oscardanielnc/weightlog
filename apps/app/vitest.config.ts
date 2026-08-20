import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // La lógica probada (fechas, IMC y SQLite) no necesita DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/almacenamiento.ts', 'src/lib/db.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
