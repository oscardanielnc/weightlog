import { useRef, useState } from 'react';
import { borrarTodo, exportarJson, importarJson, totalRegistros } from '../lib/db';
import { CORTES, rangoIdeal, pesoParaImc } from '../lib/imc';
import { fechaLima } from '../lib/lima';
import { useConsulta, useDatos } from '../estado/hooks';
import Cabecera from '../componentes/Cabecera';

const EST_MIN = 1.0;
const EST_MAX = 2.5;

export default function Ajustes() {
  const { estatura, setEstatura } = useDatos();
  const [texto, setTexto] = useState(estatura.toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  const total = useConsulta(totalRegistros);
  const [idealMin, idealMax] = rangoIdeal(estatura);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(texto.replace(',', '.'));
    if (!Number.isFinite(n) || n < EST_MIN || n > EST_MAX) {
      setError(`La estatura debe estar entre ${EST_MIN.toFixed(2)} y ${EST_MAX.toFixed(2)} m`);
      return;
    }
    setError(null);
    setEstatura(Math.round(n * 100) / 100);
    setAviso('Estatura actualizada');
    window.setTimeout(() => setAviso(null), 2500);
  }

  function exportar() {
    const blob = new Blob([exportarJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peso-respaldo-${fechaLima()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      const r = importarJson(await archivo.text());
      setAviso(`Importados ${r.insertados} registros (${r.omitidos} omitidos por duplicados)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo');
    }
    if (archivoRef.current) archivoRef.current.value = '';
  }

  return (
    <div className="pantalla">
      <Cabecera
        titulo="Ajustes"
        sub={`${total} ${total === 1 ? 'registro guardado' : 'registros guardados'}`}
      />

      <form className="tarjeta" onSubmit={guardar}>
        <h2>Estatura</h2>
        <div className="campo-peso pequeno">
          <input
            type="text"
            inputMode="decimal"
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setError(null); }}
            aria-label="Estatura en metros"
          />
          <span className="unidad">m</span>
          <button type="submit" className="primario compacto">Guardar</button>
        </div>
        <p className="sutil">Rango ideal (IMC 18.5–25): <strong>{idealMin.toFixed(1)} – {idealMax.toFixed(1)} kg</strong></p>
      </form>

      <section className="tarjeta">
        <h2>Cómo se colorea el calendario</h2>
        <ul className="lista tabla-rangos">
          <Rango zona="rojo" texto={`IMC menor a ${CORTES.rojoBajo}`} kg={`menos de ${pesoParaImc(CORTES.rojoBajo, estatura).toFixed(1)} kg`} />
          <Rango zona="ambar" texto={`IMC ${CORTES.rojoBajo} – ${CORTES.ambarBajo}`} kg={`${pesoParaImc(CORTES.rojoBajo, estatura).toFixed(1)} – ${pesoParaImc(CORTES.ambarBajo, estatura).toFixed(1)} kg`} />
          <Rango zona="verde" texto={`IMC ${CORTES.ambarBajo} – ${CORTES.ambarAlto}`} kg={`${pesoParaImc(CORTES.ambarBajo, estatura).toFixed(1)} – ${pesoParaImc(CORTES.ambarAlto, estatura).toFixed(1)} kg`} />
          <Rango zona="ambar" texto={`IMC ${CORTES.ambarAlto} – ${CORTES.rojoAlto}`} kg={`${pesoParaImc(CORTES.ambarAlto, estatura).toFixed(1)} – ${pesoParaImc(CORTES.rojoAlto, estatura).toFixed(1)} kg`} />
          <Rango zona="rojo" texto={`IMC ${CORTES.rojoAlto} o más`} kg={`${pesoParaImc(CORTES.rojoAlto, estatura).toFixed(1)} kg o más`} />
        </ul>
        <p className="sutil">Si un día tiene varias pesadas, se usa el promedio aritmético del día (hora de Perú).</p>
      </section>

      <section className="tarjeta">
        <h2>Respaldo</h2>
        <div className="acciones">
          <button className="secundario" onClick={exportar}>Exportar JSON</button>
          <button className="secundario" onClick={() => archivoRef.current?.click()}>Importar JSON</button>
        </div>
        <input ref={archivoRef} type="file" accept="application/json,.json" hidden onChange={importar} />
        <p className="sutil">Todo se guarda solo en este dispositivo. Exporta antes de cambiar de celular.</p>
      </section>

      <section className="tarjeta">
        <h2>Zona peligrosa</h2>
        {confirmando ? (
          <div className="acciones">
            <button
              className="peligro-solido"
              onClick={() => {
                borrarTodo();
                setConfirmando(false);
                setAviso('Se borraron todos los registros');
              }}
            >
              Sí, borrar {total} registros
            </button>
            <button className="secundario" onClick={() => setConfirmando(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="secundario" onClick={() => setConfirmando(true)} disabled={total === 0}>
            Borrar todos los registros
          </button>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      {aviso && <p className="aviso">{aviso}</p>}
    </div>
  );
}

function Rango({ zona, texto, kg }: { zona: string; texto: string; kg: string }) {
  return (
    <li>
      <span><i className={`punto zona-${zona}`} /> {texto}</span>
      <span className="sutil">{kg}</span>
    </li>
  );
}
