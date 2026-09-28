import type { Tank } from '../../models';
import { apiRequest } from './client';

type TankRow = Omit<Tank, 'tankNumber' | 'ohNumber' | 'currentStageId' | 'currentProcessId' | 'currentBayId' | 'assignedGangId' | 'overallProgress' | 'plannedStart' | 'plannedCompletion' | 'expectedCompletion' | 'actualCompletion' | 'delayDays' | 'blockerReason'> & {
  tank_number: string;
  oh_number: string;
  current_stage_id: string;
  current_process_id: string;
  bay_id: string | null;
  gang_id: string | null;
  progress: number;
  intake_date: string;
  planned_completion_date: string;
  expected_completion_date: string;
  actual_completion_date: string | null;
  planned_exit_date: string;
  expected_exit_date: string;
  actual_exit_date: string | null;
  delay_days?: number;
  blocker_reason?: string | null;
};

function mapStatus(status: string): Tank['status'] {
  const normalized = status.toLowerCase();
  if (normalized === 'in_progress') return 'active';
  if (normalized === 'delayed') return 'warning';
  if (normalized === 'blocked') return 'critical';
  return normalized as Tank['status'];
}

export function mapTank(row: TankRow): Tank {
  return {
    ...row,
    tankNumber: row.tank_number,
    ohNumber: row.oh_number,
    currentStageId: row.current_stage_id,
    currentProcessId: row.current_process_id,
    currentBayId: row.bay_id ?? undefined,
    assignedGangId: row.gang_id ?? undefined,
    overallProgress: Number(row.progress),
    status: mapStatus(row.status),
    plannedStart: row.intake_date,
    plannedCompletion: row.planned_completion_date,
    expectedCompletion: row.expected_completion_date,
    actualCompletion: row.actual_completion_date ?? undefined,
    delayDays: row.delay_days ?? 0,
    blockerReason: row.blocker_reason ?? undefined,
  };
}

export const tankService = {
  getTanks: async () => (await apiRequest<TankRow[]>('/api/tanks')).map(mapTank),
  getAssignedTanks: async () => (await apiRequest<TankRow[]>('/api/tanks?assignedToMe=true')).map(mapTank),
  getTankById: async (id: string) => mapTank(await apiRequest<TankRow>(`/api/tanks/${id}`)),
  updateTank: async (id: string, changes: Partial<Tank>) => mapTank(await apiRequest<TankRow>(`/api/tanks/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })),
};
