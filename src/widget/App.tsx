import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { useHostAuth } from './hooks/useHostAuth';
import { WidgetShell } from './components/WidgetShell';

const App: React.FC = () => {
  const auth = useHostAuth();
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      if (event.data?.type === 'birdbot:panel-state') {
        setPanelOpen(Boolean(event.data.open));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!auth) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin tip="Ожидание авторизации..." />
      </div>
    );
  }

  return <WidgetShell auth={auth} panelOpen={panelOpen} />;
};

export default App;
