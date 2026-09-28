import type { ActivityLog } from '../../models';
import { apiRequest } from './client';

type ActivityRow = { id: string; tank_id: string; process_id?: string; action: string; performed_by: string; timestamp: string; details?: string };

export const activityService = {
  getActivity: async () => (await apiRequest<ActivityRow[]>('/api/activity')).map((row): ActivityLog => ({ id: row.id, tankId: row.tank_id, processId: row.process_id, action: row.action, performedBy: row.performed_by, timestamp: row.timestamp, details: row.details })),
  getAssignedActivity: async () => (await apiRequest<ActivityRow[]>('/api/activity?assignedToMe=true')).map((row): ActivityLog => ({ id: row.id, tankId: row.tank_id, processId: row.process_id, action: row.action, performedBy: row.performed_by, timestamp: row.timestamp, details: row.details })),
};