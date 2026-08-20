import { useMemo, useState } from 'react';
import { resumenDiario, type DiaResumen } from '../lib/db';
import { diasEntre, fechaLima } from '../lib/lima';
import { imc, rangoIdeal, zonaDeImc, etiquetaImc } from '../lib/imc';
import { useConsulta, useDatos } from '../estado/hooks';

const RANGOS = [
  { clave: '7', etiqueta: '7 días', dias: 7 },
  { clave: '30', etiqueta: '30 días', dias: 30 },
  { clave: '90', etiqueta: '90 días', dias: 90 },
  { clave: 'todo', etiqueta: 'Todo', dias: Infinity },
] as const;

export default function Progreso() {
  const { estatura } = useDatos();
  const [rango, setRango] = useState<string>('30');

  const todos = useConsulta(resumenDiario);
  const dias = RANGOS.find((r) => r.clave === rango)!.dias;
  const hoy = fechaLima();
  const datos = useMemo(
    () => (dias === Infinity ? todos : todos.filter((d) => diasEntre(d.fecha, hoy) < dias)),
    [todos, dias, hoy],
  );

  const primero = datos[0];
  const ultimo = datos[datos.length - 1];
  const cambio = primero && ultimo ? ultimo.promedio - primero.promedio : null;
  const valorImc = ultimo ? imc(ultimo.promedio, estatura) : null;

  return (
    <div className="pantalla">
      <header className="cabecera">
        <h1>Progreso</h1>
        <p className="sutil">Promedio diario de peso</p>
      </header>

      <div className="filtros" role="group" aria-label="Rango de tiempo">
        {RANGOS.map((r) => (
          <button
            key={r.clave}
            className={r.clave === rango ? 'filtro activo' : 'filtro'}
            onClick={() => setRango(r.clave)}
          >
            {r.etiqueta}
          </button>
        ))}
      </div>

      <section className="tarjeta">
        {datos.length === 0 ? (
          <p className="sutil">No hay registros en este rango.</p>
        ) : (
          <Grafico datos={datos} estatura={estatura} />
        )}
      </section>

      {ultimo && valorImc !== null && (
        <section className="tarjeta metricas">
          <div>
            <span className="sutil">Último promedio</span>
            <strong>{ultimo.promedio.toFixed(1)} kg</strong>
          </div>
          <div>
            <span className="sutil">Cambio en el rango</span>
            <strong className={!cambio ? undefined : cambio < 0 ? 'baja' : 'sube'}>
              {cambio === null ? '—' : `${cambio > 0 ? '+' : ''}${cambio.toFixed(1)} kg`}
            </strong>
          </div>
          <div>
            <span className="sutil">Días con registro</span>
            <strong>{datos.length}</strong>
          </div>
          <div>
            <span className="sutil">IMC actual</span>
            <strong className={`texto-zona-${zonaDeImc(valorImc)}`}>
              {valorImc.toFixed(1)} · {etiquetaImc(valorImc)}
            </strong>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- gráfico ---------- */

const W = 340;
const H = 210;
const PAD = { arriba: 12, derecha: 12, abajo: 26, izquierda: 34 };
const TRAZO = W - PAD.izquierda - PAD.derecha;
const ALTO = H - PAD.arriba - PAD.abajo;

const ddmm = (fecha: string) => `${fecha.slice(8)}/${fecha.slice(5, 7)}`;

function Grafico({ datos, estatura }: { datos: DiaResumen[]; estatura: number }) {
  const [activo, setActivo] = useState<number | null>(null);
  const [idealMin, idealMax] = rangoIdeal(estatura);

  const geo = useMemo(() => {
    const base = datos[0].fecha;
    const xs = datos.map((d) => diasEntre(base, d.fecha));
    const spanX = Math.max(1, xs[xs.length - 1]);

    const pesos = datos.map((d) => d.promedio);
    let yMin = Math.min(...pesos);
    let yMax = Math.max(...pesos);
    const margen = Math.max(0.8, (yMax - yMin) * 0.18);
    yMin -= margen;
    yMax += margen;

    const px = (i: number) => PAD.izquierda + (xs[i] / spanX) * TRAZO;
    const py = (p: number) => PAD.arriba + (1 - (p - yMin) / (yMax - yMin)) * ALTO;
    const puntos = datos.map((d, i) => ({ x: px(i), y: py(d.promedio), dia: d }));

    // Tendencia por mínimos cuadrados sobre (día, peso).
    const n = datos.length;
    const mediaX = xs.reduce((a, b) => a + b, 0) / n;
    const mediaY = pesos.reduce((a, b) => a + b, 0) / n;
    const sxy = xs.reduce((s, x, i) => s + (x - mediaX) * (pesos[i] - mediaY), 0);
    const sxx = xs.reduce((s, x) => s + (x - mediaX) ** 2, 0);
    const pendiente = sxx === 0 ? 0 : sxy / sxx;
    const tendencia = n >= 3
      ? {
          x1: px(0), y1: py(mediaY + pendiente * (xs[0] - mediaX)),
          x2: px(n - 1), y2: py(mediaY + pendiente * (xs[n - 1] - mediaX)),
        }
      : null;

    const ticks = Array.from({ length: 4 }, (_, k) => yMin + ((yMax - yMin) * k) / 3);
    const banda = {
      y1: py(Math.min(yMax, idealMax)),
      y2: py(Math.max(yMin, idealMin)),
      visible: idealMin < yMax && idealMax > yMin,
    };
    return { puntos, tendencia, ticks, banda, py };
  }, [datos, idealMin, idealMax]);

  const ultimoPunto = geo.puntos[geo.puntos.length - 1];
  const linea = geo.puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${linea} L${ultimoPunto.x.toFixed(1)},${H - PAD.abajo} L${geo.puntos[0].x.toFixed(1)},${H - PAD.abajo} Z`;

  function alSenalar(e: React.PointerEvent<SVGSVGElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - caja.left) / caja.width) * W;
    let mejor = 0;
    geo.puntos.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(geo.puntos[mejor].x - x)) mejor = i;
    });
    setActivo(mejor);
  }

  const sel = activo === null ? null : geo.puntos[activo];

  return (
    <figure className="grafico">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Peso promedio diario del ${datos[0].fecha} al ${datos[datos.length - 1].fecha}`}
        onPointerDown={alSenalar}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'mouse') alSenalar(e); }}
        onPointerLeave={() => setActivo(null)}
      >
        {geo.banda.visible && (
          <rect
            className="banda-ideal"
            x={PAD.izquierda}
            y={geo.banda.y1}
            width={TRAZO}
            height={Math.max(0, geo.banda.y2 - geo.banda.y1)}
          />
        )}

        {geo.ticks.map((t, i) => (
          <g key={i}>
            <line className="reja" x1={PAD.izquierda} x2={W - PAD.derecha} y1={geo.py(t)} y2={geo.py(t)} />
            <text className="eje" x={PAD.izquierda - 6} y={geo.py(t) + 3} textAnchor="end">{t.toFixed(1)}</text>
          </g>
        ))}

        <path className="area" d={area} />
        {geo.tendencia && (
          <line
            className="tendencia"
            x1={geo.tendencia.x1}
            y1={geo.tendencia.y1}
            x2={geo.tendencia.x2}
            y2={geo.tendencia.y2}
          />
        )}
        <path className="linea" d={linea} />

        {geo.puntos.length <= 60 && geo.puntos.map((p, i) => (
          <circle key={i} className="punto-dato" cx={p.x} cy={p.y} r={3} />
        ))}

        {sel && (
          <g>
            <line className="cruz" x1={sel.x} x2={sel.x} y1={PAD.arriba} y2={H - PAD.abajo} />
            <circle className="punto-activo" cx={sel.x} cy={sel.y} r={5} />
          </g>
        )}

        <text className="eje" x={PAD.izquierda} y={H - 8} textAnchor="start">{ddmm(datos[0].fecha)}</text>
        {datos.length > 1 && (
          <text className="eje" x={W - PAD.derecha} y={H - 8} textAnchor="end">
            {ddmm(datos[datos.length - 1].fecha)}
          </text>
        )}
      </svg>

      <figcaption>
        {sel ? (
          <span>
            <strong>{sel.dia.promedio.toFixed(1)} kg</strong> · {ddmm(sel.dia.fecha)}
            {sel.dia.conteo > 1 && <span className="sutil"> (promedio de {sel.dia.conteo})</span>}
            <span className="sutil"> · IMC {imc(sel.dia.promedio, estatura).toFixed(1)}</span>
          </span>
        ) : (
          <span className="sutil">
            La franja verde es tu rango ideal ({idealMin.toFixed(1)}–{idealMax.toFixed(1)} kg).
            Toca el gráfico para ver un día.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
