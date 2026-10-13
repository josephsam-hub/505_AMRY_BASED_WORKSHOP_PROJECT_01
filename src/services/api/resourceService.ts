import type { Bay, Gang, Stage } from '../../models';
import { apiRequest } from './client';

type StageRow = { id: string; number: number; name: string; short_name: string; planned_duration_days: number; color: string | null };
type BayRow = { id: string; number: number; name: string; capacity: number; status: Bay['status']; utilization: number; current_process_id: string | null; current_tank_ids: string[] | null; occupied_count: number | null };

function deriveBayStatus(row: BayRow): Bay['status'] {
  // If DB status is maintenance or blocked, trust it
  if (row.status === 'maintenance' || row.status === 'blocked') return row.status;
  // Otherwise derive from actual tank occupancy
  const occupied = row.occupied_count ?? 0;
  return occupied > 0 ? 'occupied' : 'available';
}
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
  getBays: async (): Promise<Bay[]> => {
    const rows = await apiRequest<BayRow[]>('/api/bays');
    // Deduplicate by bay.id
    const seen = new Set<string>();
    const unique = rows.filter((bay) => {
      if (seen.has(bay.id)) {
        // Structured log — no user-controlled interpolation
        console.warn(JSON.stringify({ event: 'duplicate_bay', bayId: bay.id })); return false;
      }
      seen.add(bay.id); return true;
    });
    return unique.map((bay) => {
      const tankIds: string[] = Array.isArray(bay.current_tank_ids) ? bay.current_tank_ids.filter(Boolean) : [];
      const occupiedCount = tankIds.length;
      const utilization = bay.capacity > 0 ? Math.round((occupiedCount / bay.capacity) * 100) : 0;
      return {
        id: bay.id,
        number: bay.number,
        name: bay.name,
        capacity: bay.capacity,
        currentTankIds: tankIds,
        currentProcessId: bay.current_process_id ?? undefined,
        status: deriveBayStatus({ ...bay, occupied_count: occupiedCount }),
        utilization,
      };
    });
  },
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
