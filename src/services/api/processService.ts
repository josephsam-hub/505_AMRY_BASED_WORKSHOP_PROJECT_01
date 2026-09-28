import type { Process, ProcessStatus, ProcessUpdate } from '../../models';
import { apiRequest } from './client';

type ProcessRow = {
  id: string;
  process_number: number;
  name: string;
  stage_id: string;
  duration_days: number;
  path_type: Process['pathType'];
  predecessors: string[];
  successors: string[];
};

function mapProcess(row: ProcessRow): Process {
  return {
    id: row.id,
    processNumber: row.process_number,
    name: row.name,
    stageId: row.stage_id,
    durationDays: row.duration_days,
    predecessors: row.predecessors ?? [],
    successors: row.successors ?? [],
    pathType: row.path_type,
  };
}

export const processService = {
  getProcesses: async () => (await apiRequest<ProcessRow[]>('/api/processes')).map(mapProcess),
  getProcessById: async (id: string) => mapProcess(await apiRequest<ProcessRow>(`/api/processes/${id}`)),
  getTankProcesses: (tankId: string) => apiRequest<Array<{ id: string; tank_id: string; process_id: string; status: ProcessStatus; progress: number }>>(`/api/tanks/${tankId}/processes`),
  getAssignedTankProcesses: (tankId: string) => apiRequest<Array<{ id: string; tank_id: string; process_id: string; status: ProcessStatus; progress: number }>>(`/api/tanks/${tankId}/processes?assignedToMe=true`),
  getProductionUpdates: async (assignedToMe = false): Promise<ProcessUpdate[]> => {
    const rows = await apiRequest<Array<{ id: string; tank_id: string; process_id: string; previous_status: string; current_status: string; progress: number; updated_by: string | null; remarks: string | null; delay_reason: string | null; created_at: string }>>(`/api/production-updates${assignedToMe ? '?assignedToMe=true' : ''}`);
    return rows.map((row) => ({ id: row.id, tankId: row.tank_id, processId: row.process_id, previousStatus: row.previous_status.toLowerCase() as ProcessStatus, currentStatus: row.current_status.toLowerCase() as ProcessStatus, progress: Number(row.progress), updatedBy: row.updated_by ?? 'system', updatedAt: row.created_at, remarks: row.remarks ?? undefined, delayReason: row.delay_reason ?? undefined }));
  },
  updateProcess: (id: string, changes: { status?: ProcessStatus; progress?: number; remarks?: string }) => apiRequest(`/api/tank-processes/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  createUpdate: (update: { tankId: string; processId: string; progress: number; status: ProcessStatus; remarks?: string; delayReason?: string }) => apiRequest('/api/process-updates', { method: 'POST', body: JSON.stringify(update) }),
};
