/** Header compacto pegajoso, idéntico en las cuatro pantallas. */
export default function Cabecera({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <header className="cabecera">
      <div className="marca">
        <b>Mi Peso</b>
        <span className="pill-local">
          <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"
               fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
          Solo en este equipo
        </span>
      </div>
      <h1>{titulo}</h1>
      <p className="sutil">{sub}</p>
    </header>
  );
}
