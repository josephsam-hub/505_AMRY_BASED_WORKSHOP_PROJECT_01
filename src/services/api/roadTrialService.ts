import type { RoadTrial } from '../../models';
import { apiRequest } from './client';

type RoadTrialRow = { id: string; tank_id: string; scheduled_date: string; conducted_date: string | null; status: string; distance: number | null; result: string | null; defects_found: string[]; remarks: string | null };

function mapRoadTrial(row: RoadTrialRow): RoadTrial {
  return { id: row.id, tankId: row.tank_id, scheduledDate: row.scheduled_date, conductedDate: row.conducted_date ?? undefined, status: row.status.toLowerCase() as RoadTrial['status'], distance: row.distance ?? undefined, result: row.result ?? undefined, defectsFound: row.defects_found, remarks: row.remarks ?? undefined };
}

export const roadTrialService = {
  getRoadTrials: async (assignedToMe = false) => (await apiRequest<RoadTrialRow[]>(`/api/road-trials${assignedToMe ? '?assignedToMe=true' : ''}`)).map(mapRoadTrial),
  updateRoadTrial: async (id: string, changes: Partial<RoadTrial>) => mapRoadTrial(await apiRequest<RoadTrialRow>(`/api/road-trials/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })),
};
