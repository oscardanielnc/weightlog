import { useMemo, useState } from 'react';
import { registrosDelDia, resumenDiario } from '../lib/db';
import { fechaLarga, fechaLima, horaCorta, nombreMes } from '../lib/lima';
import { etiquetaImc, imc, zonaDeImc } from '../lib/imc';
import { useConsulta, useDatos } from '../estado/hooks';

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function Calendario() {
  const { estatura } = useDatos();
  const hoy = fechaLima();
  const [ancla, setAncla] = useState(() => {
    const [a, m] = hoy.split('-').map(Number);
    return { anio: a, mes: m - 1 };
  });
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const porFecha = useConsulta(() => {
    const mapa = new Map<string, { promedio: number; conteo: number }>();
    for (const d of resumenDiario()) mapa.set(d.fecha, { promedio: d.promedio, conteo: d.conteo });
    return mapa;
  });

  const celdas = useMemo(() => {
    const { anio, mes } = ancla;
    const primero = new Date(Date.UTC(anio, mes, 1)).getUTCDay();      // 0 = domingo
    const relleno = (primero + 6) % 7;                                  // semana inicia lunes
    const total = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array<string | null>(relleno).fill(null);
    for (let d = 1; d <= total; d++) out.push(`${anio}-${pad(mes + 1)}-${pad(d)}`);
    return out;
  }, [ancla]);

  const mover = (delta: number) => {
    setSeleccion(null);
    setAncla(({ anio, mes }) => {
      const m = mes + delta;
      return { anio: anio + Math.floor(m / 12), mes: ((m % 12) + 12) % 12 };
    });
  };

  const conteoMes = celdas.filter((f) => f && porFecha.has(f)).length;

  return (
    <div className="pantalla">
      <header className="cabecera">
        <h1>Calendario</h1>
        <p className="sutil">{conteoMes} {conteoMes === 1 ? 'día registrado' : 'días registrados'} este mes</p>
      </header>

      <div className="tarjeta">
        <div className="nav-mes">
          <button className="icono" aria-label="Mes anterior" onClick={() => mover(-1)}>‹</button>
          <strong>{nombreMes(ancla.mes)} {ancla.anio}</strong>
          <button className="icono" aria-label="Mes siguiente" onClick={() => mover(1)}>›</button>
        </div>

        <div className="grid-cal encabezado">
          {DIAS_SEMANA.map((d, i) => <span key={i} className="sutil">{d}</span>)}
        </div>

        <div className="grid-cal">
          {celdas.map((fecha, i) => {
            if (!fecha) return <span key={`v${i}`} />;
            const dato = porFecha.get(fecha);
            const zona = dato ? zonaDeImc(imc(dato.promedio, estatura)) : 'sin';
            const clases = ['dia', `zona-${zona}`];
            if (fecha === hoy) clases.push('hoy');
            if (fecha === seleccion) clases.push('sel');
            return (
              <button
                key={fecha}
                className={clases.join(' ')}
                onClick={() => setSeleccion(fecha === seleccion ? null : fecha)}
                title={dato ? `${dato.promedio.toFixed(1)} kg` : 'Sin registros'}
              >
                {Number(fecha.slice(8))}
              </button>
            );
          })}
        </div>

        <div className="leyenda">
          <span><i className="punto zona-verde" /> Ideal</span>
          <span><i className="punto zona-ambar" /> Aceptable</span>
          <span><i className="punto zona-rojo" /> Fuera de rango</span>
          <span><i className="punto zona-sin" /> Sin registro</span>
        </div>
      </div>

      {seleccion && <DetalleDia fecha={seleccion} estatura={estatura} />}
    </div>
  );
}

function DetalleDia({ fecha, estatura }: { fecha: string; estatura: number }) {
  const registros = useConsulta(() => registrosDelDia(fecha));
  if (registros.length === 0) {
    return (
      <section className="tarjeta">
        <h2>{fechaLarga(fecha)}</h2>
        <p className="sutil">Sin registros este día.</p>
      </section>
    );
  }
  const promedio = registros.reduce((s, r) => s + r.peso_kg, 0) / registros.length;
  const valor = imc(promedio, estatura);
  const zona = zonaDeImc(valor);
  return (
    <section className="tarjeta">
      <h2>{fechaLarga(fecha)}</h2>
      <p className="resumen-peso">
        <span className="numero">{promedio.toFixed(1)}</span><span className="unidad">kg</span>
        {registros.length > 1 && <span className="sutil"> promedio de {registros.length}</span>}
      </p>
      <p><span className={`chip zona-${zona}`}>IMC {valor.toFixed(1)} · {etiquetaImc(valor)}</span></p>
      <ul className="lista">
        {registros.map((r) => (
          <li key={r.id}>
            <span>{horaCorta(r.hora_lima)}</span>
            <strong>{r.peso_kg.toFixed(1)} kg</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
