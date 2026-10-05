import './Layout.css';

export function Layout({ children }) {
  const [main, sidebar] = children;
  return (
    <div className="app-shell">
      <div className="app-main">
        <header className="app-header">
          <h1>Factus Voz</h1>
          <span>Factura y anula hablando con el agente</span>
        </header>
        {main}
      </div>
      <aside className="app-sidebar">{sidebar}</aside>
    </div>
  );
}
