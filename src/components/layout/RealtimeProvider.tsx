import { useEffect, type ReactNode } from 'react';
import { startRealtime } from '../../services/realtime';

export function RealtimeProvider({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    startRealtime();
  }, []);

  return children;
}
