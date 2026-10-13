import { io, type Socket } from 'socket.io-client';
import { apiMode, runtimeConfig } from '../config/runtime';
import { getDataMode } from '../config/dataMode';
import { getAuthToken } from './api/client';
import { useAppStore } from '../store/useAppStore';

export type RealtimeStatus = 'connected' | 'reconnecting' | 'offline';
export type OperationalEventName =
  | 'tank.updated'
  | 'tank.status_changed'
  | 'tank.progress_changed'
  | 'process.updated'
  | 'process.started'
  | 'process.completed'
  | 'process.delayed'
  | 'inspection.created'
  | 'inspection.updated'
  | 'inspection.failed'
  | 'defect.created'
  | 'defect.updated'
  | 'defect.closed'
  | 'production.updated'
  | 'assignment.created'
  | 'assignment.updated'
  | 'road_trial.updated'
  | 'jri.updated'
  | 'handover.updated'
  | 'notification.created'
  | 'activity.created';

type Listener = (payload: Record<string, unknown>) => void;

let socket: Socket | null = null;
let status: RealtimeStatus = getDataMode() === 'SIMULATION' ? 'connected' : (apiMode ? 'reconnecting' : 'offline');
const statusListeners = new Set<(nextStatus: RealtimeStatus) => void>();
const eventListeners = new Map<OperationalEventName, Set<Listener>>();

function setStatus(nextStatus: RealtimeStatus) {
  status = nextStatus;
  statusListeners.forEach((listener) => listener(status));
}

// Window custom event listener for local simulation broadcasts
if (typeof window !== 'undefined') {
  window.addEventListener('workshop:refresh', (e: Event) => {
    const detail = (e as CustomEvent).detail as { eventName: OperationalEventName; payload: Record<string, unknown> } | undefined;
    if (detail?.eventName) {
      const listeners = eventListeners.get(detail.eventName);
      listeners?.forEach((l) => l(detail.payload ?? {}));
    }
  });
}

function connect() {
  const mode = getDataMode();
  if (mode === 'SIMULATION') {
    setStatus('connected');
    return;
  }

  if (!apiMode || socket) return;

  const role = useAppStore.getState().role;
  const token = getAuthToken();

  socket = io(runtimeConfig.apiUrl, {
    auth: {
      token,
      role,
      roles: role === 'admin' ? ['ADMIN', 'USER'] : ['USER'],
      gangIds: role === 'admin'
        ? ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10']
        : ['G07', 'G08'],
    },
    withCredentials: true,
    autoConnect: true,
  });

  socket.on('connect', () => setStatus('connected'));
  socket.on('disconnect', () => setStatus('offline'));
  socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));
  socket.io.on('reconnect', () => setStatus('connected'));

  socket.onAny((eventName: string, payload: Record<string, unknown>) => {
    const listeners = eventListeners.get(eventName as OperationalEventName);
    listeners?.forEach((listener) => listener(payload));
    window.dispatchEvent(new CustomEvent('workshop:refresh', { detail: { eventName, payload } }));
  });
}

export function startRealtime() {
  connect();
}

export function getRealtimeStatus() {
  return status;
}

export function subscribeRealtimeStatus(listener: (nextStatus: RealtimeStatus) => void) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function subscribeRealtime(eventName: OperationalEventName, listener: Listener) {
  const listeners = eventListeners.get(eventName) ?? new Set<Listener>();
  listeners.add(listener);
  eventListeners.set(eventName, listeners);
  connect();
  return () => {
    listeners.delete(listener);
  };
}
