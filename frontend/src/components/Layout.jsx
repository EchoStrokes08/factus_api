import './Layout.css';

const ENGINE_LABEL = { claude: 'IA conversacional', fallback: 'Asistente guiado' };
const shortDate = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' });
const count = new Intl.NumberFormat('es-CO');

export function Layout({ children, engine, system }) {
  const [main, sidebar] = children;
  const mockMode = system?.health?.mockMode;

  return (
    <div className="app-shell">
      <main className="app-main">
        <header className="app-header">
          <div className="app-brand">
            <h1 className="app-wordmark">
              Factus <span>Voz</span>
            </h1>
            <p className="app-tagline">Factura y anula hablando con el agente</p>
          </div>

          <ul className="app-status" aria-label="Estado del sistema">
            <li className={`status-chip ${engine ? 'is-known' : ''}`} aria-live="polite">
              Motor <strong>{engine ? ENGINE_LABEL[engine] ?? 'Asistente guiado' : 'se detecta al llamar'}</strong>
            </li>
            {mockMode != null && (
              <li className={`status-chip ${mockMode ? 'is-mock' : 'is-live'}`}>
                {mockMode ? 'Modo simulado' : 'Factus sandbox'}
              </li>
            )}
            <RangeChip ranges={system?.ranges} error={system?.rangesError} />
          </ul>
        </header>
        {main}
      </main>
      <aside className="app-sidebar" aria-label="Documentos emitidos">
        {sidebar}
      </aside>
    </div>
  );
}

/** Rango DIAN que se esta usando, tal como lo reporta GET /v2/numbering-ranges. */
function RangeChip({ ranges, error }) {
  if (error) {
    return (
      <li className="status-chip is-error" title={error}>
        Sin rango de numeración
      </li>
    );
  }
  const range = ranges?.bill;
  if (!range) return null;

  const until = range.end_date ? shortDate.format(new Date(`${range.end_date.slice(0, 10)}T12:00:00`)) : null;
  const detail = [
    `Rango ${range.prefix} (id ${range.id})`,
    range.resolution_number && `resolución ${range.resolution_number}`,
    range.remaining != null && `${count.format(range.remaining)} folios libres`,
    until && `vigente hasta ${until}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="status-chip is-range" title={detail}>
      Rango <span className="serial">{range.prefix}</span>
      {range.remaining != null && (
        <span className="status-sub">
          <span className="serial">{count.format(range.remaining)}</span> libres
        </span>
      )}
      {until && <span className="status-sub">hasta {until}</span>}
    </li>
  );
}
