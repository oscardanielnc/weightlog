import { useState } from 'react';
import Registro from './screens/Registro';
import Calendario from './screens/Calendario';
import Progreso from './screens/Progreso';
import Ajustes from './screens/Ajustes';

/* Iconos de línea: se ven igual en todos los sistemas, a diferencia de los emoji. */
const iconos = {
  registro: (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3.5" width="18" height="17" rx="3.5" />
      <path d="M8 9a4.6 4.6 0 0 1 8 0" />
      <path d="M12 9.6V13" />
    </svg>
  ),
  calendario: (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  ),
  progreso: (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 16.5 9 11l3.5 3.5L20.5 6" />
      <path d="M20.5 10.5V6h-4.5" />
    </svg>
  ),
  ajustes: (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7.5h5M13 7.5h7M4 16.5h7M15 16.5h5" />
      <circle cx="11" cy="7.5" r="2.2" />
      <circle cx="13" cy="16.5" r="2.2" />
    </svg>
  ),
};

const PESTANAS = [
  { clave: 'registro', etiqueta: 'Registro', icono: iconos.registro, Vista: Registro },
  { clave: 'calendario', etiqueta: 'Calendario', icono: iconos.calendario, Vista: Calendario },
  { clave: 'progreso', etiqueta: 'Progreso', icono: iconos.progreso, Vista: Progreso },
  { clave: 'ajustes', etiqueta: 'Ajustes', icono: iconos.ajustes, Vista: Ajustes },
] as const;

export default function App() {
  const [activa, setActiva] = useState<string>('registro');
  const Vista = PESTANAS.find((p) => p.clave === activa)!.Vista;

  return (
    <div className="app">
      <main>
        <Vista />
      </main>
      <nav className="barra">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            className={p.clave === activa ? 'pestana activa' : 'pestana'}
            aria-current={p.clave === activa ? 'page' : undefined}
            onClick={() => setActiva(p.clave)}
          >
            {p.icono}
            {p.etiqueta}
          </button>
        ))}
      </nav>
    </div>
  );
}
