import type { Bay, Gang, Stage } from '../../models';
import { apiRequest } from './client';

type StageRow = { id: string; number: number; name: string; short_name: string; planned_duration_days: number; color: string | null };
type BayRow = { id: string; number: number; name: string; capacity: number; status: Bay['status']; utilization: number; current_process_id: string | null };
type GangRow = { id: string; name: string; specialty: string; authorized: number; available: number; deployed: number; held: number };

export const resourceService = {
  getStages: async (): Promise<Stage[]> => (await apiRequest<StageRow[]>('/api/stages')).map((stage) => ({
    id: stage.id,
    number: stage.number,
    name: stage.name,
    shortName: stage.short_name,
    activities: [],
    plannedDurationDays: stage.planned_duration_days,
    color: stage.color ?? '',
  })),
  getBays: async (): Promise<Bay[]> => (await apiRequest<BayRow[]>('/api/bays')).map((bay) => ({
    id: bay.id,
    number: bay.number,
    name: bay.name,
    capacity: bay.capacity,
    currentTankIds: [],
    currentProcessId: bay.current_process_id ?? undefined,
    status: bay.status,
    utilization: bay.utilization,
  })),
  getGangs: async (): Promise<Gang[]> => (await apiRequest<GangRow[]>('/api/gangs')).map((gang) => ({
    id: gang.id,
    name: gang.name,
    specialty: gang.specialty,
    authorized: gang.authorized,
    available: gang.available,
    deployed: gang.deployed,
    held: gang.held,
    assignedTankIds: [],
    assignedProcessIds: [],
  })),
};
