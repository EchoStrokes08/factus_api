import { useState } from 'react';
import { Layout } from './components/Layout.jsx';
import { CallScreen } from './features/voiceAgent/CallScreen.jsx';
import { HistoryPanel } from './features/documents/HistoryPanel.jsx';

export default function App() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <Layout>
      <CallScreen onActivity={() => setRefreshSignal((value) => value + 1)} />
      <HistoryPanel refreshSignal={refreshSignal} />
    </Layout>
  );
}
