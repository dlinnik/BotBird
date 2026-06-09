import { useEffect, useState } from 'react';
import type { HostMessage, WidgetAuth } from '../types';

export function useHostAuth(): WidgetAuth | null {
  const [auth, setAuth] = useState<WidgetAuth | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent<HostMessage>) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'birdbot:init') {
        setAuth({
          token: data.token,
          context: data.context ?? {},
        });
        return;
      }

      if (data.type === 'birdbot:context') {
        setAuth((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            context: data.context ?? {},
          };
        });
      }
    };

    window.addEventListener('message', handler);
    window.parent.postMessage({ type: 'birdbot:ready' }, '*');

    return () => window.removeEventListener('message', handler);
  }, []);

  return auth;
}
