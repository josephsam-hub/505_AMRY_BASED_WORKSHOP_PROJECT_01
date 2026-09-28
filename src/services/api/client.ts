import { activityLogs, notifications } from '../../data/activity';
import { bays } from '../../data/bays';
import { defects } from '../../data/defects';
import { gangs } from '../../data/gangs';
import { inspections } from '../../data/inspections';
import { jriRecords } from '../../data/jri';
import { processes } from '../../data/processes';
import { roadTrials } from '../../data/roadTrials';
import { stages } from '../../data/stages';
import { tanks } from '../../data/tanks';
import { apiEndpoint, runtimeConfig } from '../../config/runtime';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function normalizePath(path: string) {
  return path.split('?')[0].replace(/\/$/, '');
}

function toSnakeTankRow(tank: (typeof tanks)[number]) {
  return {
    id: tank.id,
    tank_number: tank.tankNumber,
    oh_number: tank.ohNumber,
    type: tank.type,
    profile: tank.profile,
    current_stage_id: tank.currentStageId,
    current_process_id: tank.currentProcessId,
    bay_id: tank.currentBayId ?? null,
    gang_id: tank.assignedGangId ?? null,
    status: tank.status,
    progress: tank.overallProgress,
    intake_date: tank.plannedStart,
    planned_completion_date: tank.plannedCompletion,
    expected_completion_date: tank.expectedCompletion,
    actual_completion_date: tank.actualCompletion ?? null,
    planned_exit_date: tank.plannedCompletion,
    expected_exit_date: tank.expectedCompletion,
    actual_exit_date: null,
    delay_days: tank.delayDays,
    blocker_reason: tank.blockerReason ?? null,
  };
}

function toSnakeProcessRow(process: (typeof processes)[number]) {
  return {
    id: process.id,
    process_number: process.processNumber,
    name: process.name,
    stage_id: process.stageId,
    duration_days: process.durationDays,
    path_type: process.pathType,
    predecessors: process.predecessors,
    successors: process.successors,
  };
}

function toSnakeInspectionRow(inspection: (typeof inspections)[number]) {
  return {
    id: inspection.id,
    tank_id: inspection.tankId,
    process_id: inspection.processId,
    stage_id: inspection.stageId,
    name: inspection.name,
    scheduled_date: inspection.scheduledDate,
    completed_date: inspection.completedDate ?? null,
    status: inspection.status.toUpperCase(),
    inspector: inspection.inspector ?? null,
    remarks: inspection.remarks ?? null,
    failure_reasons: inspection.failureReasons ?? [],
  };
}

function toSnakeDefectRow(defect: (typeof defects)[number]) {
  return {
    id: defect.id,
    tank_id: defect.tankId,
    process_id: defect.processId,
    stage_id: defect.stageId,
    category: defect.category,
    severity: defect.severity.toUpperCase(),
    description: defect.description,
    assigned_to: defect.assignedTo,
    created_date: defect.createdDate,
    target_date: defect.targetDate,
    status: defect.status.toUpperCase(),
    resolution: defect.resolution ?? null,
    remarks: defect.remarks ?? null,
  };
}

function toSnakeActivityRow(activity: (typeof activityLogs)[number]) {
  return {
    id: activity.id,
    tank_id: activity.tankId,
    process_id: activity.processId ?? null,
    action: activity.action,
    performed_by: activity.performedBy,
    timestamp: activity.timestamp,
    details: activity.details ?? null,
  };
}

function toSnakeNotificationRow(notification: (typeof notifications)[number]) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    tank_id: notification.tankId ?? null,
    process_id: notification.processId ?? null,
    created_at: notification.createdAt,
    read: notification.read,
  };
}

function toSnakeStageRow(stage: (typeof stages)[number]) {
  return {
    id: stage.id,
    number: stage.number,
    name: stage.name,
    short_name: stage.shortName,
    planned_duration_days: stage.plannedDurationDays,
    color: stage.color,
  };
}

function toSnakeBayRow(bay: (typeof bays)[number]) {
  return {
    id: bay.id,
    number: bay.number,
    name: bay.name,
    capacity: bay.capacity,
    status: bay.status,
    utilization: bay.utilization,
    current_process_id: bay.currentProcessId ?? null,
  };
}

function toSnakeGangRow(gang: (typeof gangs)[number]) {
  return {
    id: gang.id,
    name: gang.name,
    specialty: gang.specialty,
    authorized: gang.authorized,
    available: gang.available,
    deployed: gang.deployed,
    held: gang.held,
  };
}

function toSnakeRoadTrialRow(trial: (typeof roadTrials)[number]) {
  return {
    id: trial.id,
    tank_id: trial.tankId,
    scheduled_date: trial.scheduledDate,
    conducted_date: trial.conductedDate ?? null,
    status: trial.status.toUpperCase(),
    distance: trial.distance ?? null,
    result: trial.result ?? null,
    remarks: trial.remarks ?? null,
  };
}

function toSnakeJriRow(jri: (typeof jriRecords)[number]) {
  return {
    id: jri.id,
    tank_id: jri.tankId,
    scheduled_date: jri.scheduledDate,
    conducted_date: jri.conductedDate ?? null,
    status: jri.status.toUpperCase(),
    board_members: jri.boardMembers ?? [],
    remarks: jri.remarks ?? null,
    handover_date: jri.handoverDate ?? null,
    dispatch_date: jri.dispatchDate ?? null,
  };
}

function getMockFallback(path: string) {
  const route = normalizePath(path);
  const id = route.split('/').filter(Boolean).at(-1) ?? '';

  const datasetMap: Record<string, unknown> = {
    '/api/tanks': tanks.map(toSnakeTankRow),
    '/api/processes': processes.map(toSnakeProcessRow),
    '/api/stages': stages.map(toSnakeStageRow),
    '/api/bays': bays.map(toSnakeBayRow),
    '/api/gangs': gangs.map(toSnakeGangRow),
    '/api/inspections': inspections.map(toSnakeInspectionRow),
    '/api/defects': defects.map(toSnakeDefectRow),
    '/api/road-trials': roadTrials.map(toSnakeRoadTrialRow),
    '/api/jri': jriRecords.map(toSnakeJriRow),
    '/api/activity': activityLogs.map(toSnakeActivityRow),
    '/api/notifications': notifications.map(toSnakeNotificationRow),
    '/api/production-updates': [],
    '/api/personnel': [],
    '/api/health': { status: 'ok', database: 'mock', serverTime: new Date().toISOString(), version: 'mock' },
  };

  if (route.startsWith('/api/tanks/')) return tanks.find((tank) => tank.id === id || tank.tankNumber === id) ? toSnakeTankRow(tanks.find((tank) => tank.id === id || tank.tankNumber === id)!) : null;
  if (route.startsWith('/api/processes/')) return processes.find((process) => process.id === id) ? toSnakeProcessRow(processes.find((process) => process.id === id)!) : null;
  if (route.startsWith('/api/inspections/')) return inspections.find((inspection) => inspection.id === id) ? toSnakeInspectionRow(inspections.find((inspection) => inspection.id === id)!) : null;
  if (route.startsWith('/api/defects/')) return defects.find((defect) => defect.id === id) ? toSnakeDefectRow(defects.find((defect) => defect.id === id)!) : null;
  if (route.startsWith('/api/road-trials/')) return roadTrials.find((trial) => trial.id === id) ? toSnakeRoadTrialRow(roadTrials.find((trial) => trial.id === id)!) : null;
  if (route.startsWith('/api/jri/')) return jriRecords.find((record) => record.id === id) ? toSnakeJriRow(jriRecords.find((record) => record.id === id)!) : null;
  if (route.startsWith('/api/notifications/')) return notifications.find((notification) => notification.id === id) ? toSnakeNotificationRow(notifications.find((notification) => notification.id === id)!) : null;
  if (route.startsWith('/api/activity/')) return activityLogs.find((activity) => activity.id === id) ? toSnakeActivityRow(activityLogs.find((activity) => activity.id === id)!) : null;
  if (route.startsWith('/api/reports/')) {
    if (route === '/api/reports/production') return [{ status: 'completed', count: tanks.filter((tank) => tank.status === 'completed').length, average_progress: 100 }];
    if (route === '/api/reports/defects') return [{ severity: 'critical', status: 'open', count: defects.filter((defect) => defect.severity === 'critical').length }];
    if (route === '/api/reports/inspections') return [{ status: 'passed', count: inspections.filter((inspection) => inspection.status === 'passed').length }];
  }

  return datasetMap[route] ?? [];
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const fallback = getMockFallback(path);

  if (!runtimeConfig.apiUrl) {
    return fallback as T;
  }

  try {
    const response = await fetch(apiEndpoint(path), {
      ...init,
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (response.status === 404 || response.status === 503) return fallback as T;
      throw new ApiError(body?.error ?? `Workshop server returned ${response.status}`, response.status);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError || error instanceof ApiError) {
      return fallback as T;
    }
    throw error;
  }
}
