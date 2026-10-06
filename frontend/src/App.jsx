import { useCallback, useEffect, useState } from 'react';
import { backendClient } from './api/backendClient.js';
import { Layout } from './components/Layout.jsx';
import { CallScreen } from './features/voiceAgent/CallScreen.jsx';
import { HistoryPanel } from './features/documents/HistoryPanel.jsx';

export default function App() {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [engine, setEngine] = useState(null);
  const [system, setSystem] = useState({ health: null, ranges: null, rangesError: null });

  // Estado del backend y rango de numeracion activo: se reconsulta tras cada
  // documento emitido para que el folio "libres" del encabezado sea real.
  const loadSystem = useCallback(async () => {
    const [health, ranges] = await Promise.allSettled([backendClient.getHealth(), backendClient.getNumberingRanges()]);
    setSystem({
      health: health.status === 'fulfilled' ? health.value : null,
      ranges: ranges.status === 'fulfilled' ? ranges.value : null,
      rangesError: ranges.status === 'rejected' ? ranges.reason.message : null,
    });
  }, []);

  useEffect(() => {
    loadSystem();
  }, [loadSystem, refreshSignal]);

  const notifyActivity = useCallback(() => setRefreshSignal((value) => value + 1), []);

  return (
    <Layout engine={engine ?? system.health?.agentEngine} system={system}>
      <CallScreen onActivity={notifyActivity} onEngine={setEngine} />
      <HistoryPanel
        refreshSignal={refreshSignal}
        onActivity={notifyActivity}
        factusMock={system.health?.mockMode}
        factusPayMock={system.health?.factusPayMockMode}
      />
    </Layout>
  );
}
