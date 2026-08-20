import { useState } from 'react';
import Registro from './screens/Registro';
import Calendario from './screens/Calendario';
import Progreso from './screens/Progreso';
import Ajustes from './screens/Ajustes';

const PESTANAS = [
  { clave: 'registro', etiqueta: 'Registro', icono: '⚖️', Vista: Registro },
  { clave: 'calendario', etiqueta: 'Calendario', icono: '🗓️', Vista: Calendario },
  { clave: 'progreso', etiqueta: 'Progreso', icono: '📈', Vista: Progreso },
  { clave: 'ajustes', etiqueta: 'Ajustes', icono: '⚙️', Vista: Ajustes },
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
            <span aria-hidden="true">{p.icono}</span>
            {p.etiqueta}
          </button>
        ))}
      </nav>
    </div>
  );
}
