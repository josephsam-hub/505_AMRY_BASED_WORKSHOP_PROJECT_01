import type { Inspection, InspectionStatus } from '../../models';
import { apiRequest } from './client';

type InspectionRow = Omit<Inspection, 'tankId' | 'processId' | 'stageId' | 'scheduledDate' | 'completedDate' | 'failureReasons'> & {
  tank_id: string;
  process_id: string;
  stage_id: string;
  scheduled_date: string;
  completed_date: string | null;
  failure_reasons: string[];
  status: string;
};

function mapInspection(row: InspectionRow): Inspection {
  return { ...row, tankId: row.tank_id, processId: row.process_id, stageId: row.stage_id, scheduledDate: row.scheduled_date, completedDate: row.completed_date ?? undefined, failureReasons: row.failure_reasons, status: row.status.toLowerCase() as InspectionStatus };
}

export const inspectionService = {
  getInspections: async () => (await apiRequest<InspectionRow[]>('/api/inspections')).map(mapInspection),
  getAssignedInspections: async () => (await apiRequest<InspectionRow[]>('/api/inspections?assignedToMe=true')).map(mapInspection),
  getInspectionById: async (id: string) => mapInspection(await apiRequest<InspectionRow>(`/api/inspections/${id}`)),
  updateInspection: async (id: string, changes: { status?: InspectionStatus; inspector?: string; remarks?: string; completedDate?: string }) => mapInspection(await apiRequest<InspectionRow>(`/api/inspections/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })),
};
