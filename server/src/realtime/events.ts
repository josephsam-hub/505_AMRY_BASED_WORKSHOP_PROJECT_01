import { EventEmitter } from 'node:events';

export const operationalEventNames = [
  'tank.updated',
  'tank.status_changed',
  'tank.progress_changed',
  'process.updated',
  'process.started',
  'process.completed',
  'process.delayed',
  'inspection.created',
  'inspection.updated',
  'inspection.failed',
  'defect.created',
  'defect.updated',
  'defect.closed',
  'production.updated',
  'assignment.created',
  'assignment.updated',
  'road_trial.updated',
  'jri.updated',
  'handover.updated',
  'notification.created',
  'activity.created',
] as const;

export type OperationalEventName = typeof operationalEventNames[number];
export type OperationalEvent = { name: OperationalEventName; payload: Record<string, unknown> };

export const operationalEvents = new EventEmitter();

export function emitOperationalEvent(name: OperationalEventName, payload: Record<string, unknown>) {
  operationalEvents.emit('event', { name, payload } satisfies OperationalEvent);
}
