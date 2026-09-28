import type { Defect, DefectStatus } from '../../models';
import { apiRequest } from './client';

type DefectRow = Omit<Defect, 'tankId' | 'processId' | 'stageId' | 'assignedTo' | 'createdDate' | 'targetDate'> & {
  tank_id: string;
  process_id: string;
  stage_id: string;
  assigned_to: string;
  created_date: string;
  target_date: string;
  status: string;
};

function mapDefect(row: DefectRow): Defect {
  return { ...row, tankId: row.tank_id, processId: row.process_id, stageId: row.stage_id, assignedTo: row.assigned_to, createdDate: row.created_date, targetDate: row.target_date, status: row.status.toLowerCase() as DefectStatus };
}

export const defectService = {
  getDefects: async () => (await apiRequest<DefectRow[]>('/api/defects')).map(mapDefect),
  getAssignedDefects: async () => (await apiRequest<DefectRow[]>('/api/defects?assignedToMe=true')).map(mapDefect),
  getDefectById: async (id: string) => mapDefect(await apiRequest<DefectRow>(`/api/defects/${id}`)),
  createDefect: async (defect: Partial<Defect>) => mapDefect(await apiRequest<DefectRow>('/api/defects', { method: 'POST', body: JSON.stringify(defect) })),
  updateDefect: async (id: string, changes: { status?: DefectStatus; resolution?: string; remarks?: string }) => mapDefect(await apiRequest<DefectRow>(`/api/defects/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })),
};
