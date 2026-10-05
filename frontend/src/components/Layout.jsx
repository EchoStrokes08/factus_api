import './Layout.css';

const ENGINE_LABEL = { claude: 'IA conversacional', fallback: 'Asistente guiado' };

export function Layout({ children, engine }) {
  const [main, sidebar] = children;
  const engineLabel = engine ? ENGINE_LABEL[engine] || 'Asistente guiado' : 'se detecta al llamar';
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
          <p className={`engine-badge ${engine ? 'is-known' : ''}`} aria-live="polite">
            Motor: <strong>{engineLabel}</strong>
          </p>
        </header>
        {main}
      </main>
      <aside className="app-sidebar" aria-label="Documentos emitidos">
        {sidebar}
      </aside>
    </div>
  );
}
