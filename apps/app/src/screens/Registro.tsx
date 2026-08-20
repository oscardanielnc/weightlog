import { useState } from 'react';
import {
  actualizarRegistro, agregarRegistro, borrarRegistro,
  registrosRecientes, resumenDiario, type Registro as Fila,
} from '../lib/db';
import { fechaLima, fechaLarga, horaCorta } from '../lib/lima';
import { etiquetaImc, imc, rangoIdeal, zonaDeImc } from '../lib/imc';
import { useConsulta, useDatos } from '../estado/hooks';

const PESO_MIN = 20;
const PESO_MAX = 300;

const diaMes = (fecha: string) => `${fecha.slice(8)}/${fecha.slice(5, 7)}`;

export default function Registro() {
  const { estatura } = useDatos();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editando, setEditando] = useState<Fila | null>(null);

  const recientes = useConsulta(() => registrosRecientes(12));
  const dias = useConsulta(resumenDiario);

  const hoy = fechaLima();
  const diaHoy = dias.find((d) => d.fecha === hoy);
  const previo = [...dias].reverse().find((d) => d.fecha < hoy);
  const [idealMin, idealMax] = rangoIdeal(estatura);

  function validar(valor: string): number | null {
    const n = Number(valor.replace(',', '.'));
    if (!valor.trim() || !Number.isFinite(n)) { setError('Ingresa un peso válido'); return null; }
    if (n < PESO_MIN || n > PESO_MAX) { setError(`El peso debe estar entre ${PESO_MIN} y ${PESO_MAX} kg`); return null; }
    return Math.round(n * 10) / 10;
  }

  function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const peso = validar(texto);
    if (peso === null) return;
    if (editando) {
      actualizarRegistro(editando.id, peso, editando.ts_utc);
      setEditando(null);
      setAviso('Registro actualizado');
    } else {
      agregarRegistro(peso);
      setAviso(`Registrado ${peso.toFixed(1)} kg`);
    }
    setTexto('');
    window.setTimeout(() => setAviso(null), 2500);
  }

  function eliminar(fila: Fila) {
    borrarRegistro(fila.id);
    if (editando?.id === fila.id) { setEditando(null); setTexto(''); }
  }

  return (
    <div className="pantalla">
      <header className="cabecera">
        <h1>Mi peso</h1>
        <p className="sutil">{fechaLarga(hoy)}</p>
      </header>

      <form className="tarjeta captura" onSubmit={registrar}>
        <label htmlFor="peso">{editando ? `Editando registro de ${horaCorta(editando.hora_lima)}` : 'Peso de ahora'}</label>
        <div className="campo-peso">
          <input
            id="peso"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="00.0"
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setError(null); }}
          />
          <span className="unidad">kg</span>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <button type="submit" className="primario">{editando ? 'Guardar cambios' : 'Registrar'}</button>
          {editando && (
            <button type="button" className="secundario" onClick={() => { setEditando(null); setTexto(''); setError(null); }}>
              Cancelar
            </button>
          )}
        </div>
        {aviso && <p className="aviso">{aviso}</p>}
      </form>

      {diaHoy ? (
        <ResumenHoy promedio={diaHoy.promedio} conteo={diaHoy.conteo} estatura={estatura} previo={previo?.promedio} />
      ) : (
        <div className="tarjeta vacio">
          <p>Aún no registras tu peso hoy.</p>
          <p className="sutil">Rango ideal para {estatura.toFixed(2)} m: {idealMin.toFixed(1)} – {idealMax.toFixed(1)} kg</p>
        </div>
      )}

      <section className="tarjeta">
        <h2>Últimos registros</h2>
        {recientes.length === 0 && <p className="sutil">Todavía no hay registros.</p>}
        <ul className="lista">
          {recientes.map((r) => (
            <li key={r.id} className={editando?.id === r.id ? 'activo' : undefined}>
              <div>
                <strong>{r.peso_kg.toFixed(1)} kg</strong>
                <span className="sutil"> · {r.fecha_lima === hoy ? 'hoy' : diaMes(r.fecha_lima)} {horaCorta(r.hora_lima)}</span>
              </div>
              <div className="fila-botones">
                <button className="icono" aria-label="Editar" onClick={() => { setEditando(r); setTexto(String(r.peso_kg)); setError(null); }}>✎</button>
                <button className="icono peligro" aria-label="Borrar" onClick={() => eliminar(r)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ResumenHoy({ promedio, conteo, estatura, previo }: {
  promedio: number; conteo: number; estatura: number; previo?: number;
}) {
  const valor = imc(promedio, estatura);
  const zona = zonaDeImc(valor);
  const delta = previo === undefined ? null : promedio - previo;
  return (
    <section className={`tarjeta resumen zona-${zona}`}>
      <div className="resumen-peso">
        <span className="numero">{promedio.toFixed(1)}</span>
        <span className="unidad">kg</span>
        {conteo > 1 && <span className="sutil"> promedio de {conteo} pesadas</span>}
      </div>
      <div className="resumen-imc">
        <span className={`chip zona-${zona}`}>IMC {valor.toFixed(1)} · {etiquetaImc(valor)}</span>
        {delta !== null && (
          <span className="sutil">
            {delta === 0 ? 'igual que el día anterior'
              : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} kg vs. día anterior`}
          </span>
        )}
      </div>
    </section>
  );
}
