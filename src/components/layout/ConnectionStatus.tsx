import { useEffect, useState } from 'react';
import { Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import { getRealtimeStatus, subscribeRealtimeStatus, type RealtimeStatus } from '../../services/realtime';

const labels: Record<RealtimeStatus, string> = {
  connected: 'Connected',
  offline: 'Realtime disconnected',
  reconnecting: 'Reconnecting...',
};

export function ConnectionStatus() {
  const [state, setState] = useState<RealtimeStatus>(getRealtimeStatus());

  useEffect(() => {
    const unsubscribe = subscribeRealtimeStatus(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  const Icon = state === 'connected' ? Cloud : state === 'offline' ? CloudOff : LoaderCircle;
  const tone = state === 'connected'
    ? 'text-status-completed'
    : state === 'offline'
      ? 'text-status-critical'
      : 'text-status-warning';

  return (
    <div className={`inline-flex items-center gap-1.5 text-2xs ${tone}`} title="Workshop server connection">
      <Icon size={13} className={state === 'reconnecting' ? 'animate-spin' : undefined} />
      <span>{labels[state]}</span>
    </div>
  );
}
