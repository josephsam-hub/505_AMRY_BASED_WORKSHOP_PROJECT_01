import { apiRequest } from './client';

export interface HandoverRecord { id: string; tankId: string; status: string; handoverDate?: string; dispatchDate?: string; remarks?: string }
type HandoverRow = { id: string; tank_id: string; status: string; handover_date: string | null; dispatch_date: string | null; remarks: string | null };

function mapHandover(row: HandoverRow): HandoverRecord {
  return { id: row.id, tankId: row.tank_id, status: row.status.toLowerCase(), handoverDate: row.handover_date ?? undefined, dispatchDate: row.dispatch_date ?? undefined, remarks: row.remarks ?? undefined };
}

export const handoverService = {
  getHandoverRecords: async (assignedToMe = false) => (await apiRequest<HandoverRow[]>(`/api/handover${assignedToMe ? '?assignedToMe=true' : ''}`)).map(mapHandover),
  updateHandover: async (id: string, changes: Partial<HandoverRecord>) => mapHandover(await apiRequest<HandoverRow>(`/api/handover/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })),
};
