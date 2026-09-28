import type { JRIRecord } from '../../models';
import { apiRequest } from './client';

type JriRow = { id: string; tank_id: string; scheduled_date: string; conducted_date: string | null; status: string; board_members: string[]; remarks: string | null; handover_date: string | null; dispatch_date: string | null };

function mapJri(row: JriRow): JRIRecord {
  return { id: row.id, tankId: row.tank_id, scheduledDate: row.scheduled_date, conductedDate: row.conducted_date ?? undefined, status: row.status.toLowerCase() as JRIRecord['status'], boardMembers: row.board_members, remarks: row.remarks ?? undefined, handoverDate: row.handover_date ?? undefined, dispatchDate: row.dispatch_date ?? undefined };
}

export const jriService = {
  getJriRecords: async (assignedToMe = false) => (await apiRequest<JriRow[]>(`/api/jri${assignedToMe ? '?assignedToMe=true' : ''}`)).map(mapJri),
  updateJri: async (id: string, changes: Partial<JRIRecord>) => mapJri(await apiRequest<JriRow>(`/api/jri/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })),
};
