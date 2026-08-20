import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ProveedorDatos } from './estado/ProveedorDatos';
import './index.css';

registerSW({ immediate: true });

// En desarrollo expone la capa de datos para poder inspeccionarla desde la consola.
if (import.meta.env.DEV) {
  void import('./lib/db').then((m) => Object.assign(window, { db: m }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorDatos>
      <App />
    </ProveedorDatos>
  </StrictMode>,
);
