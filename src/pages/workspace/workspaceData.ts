import { useEffect, useState } from 'react';
import { tankService } from '../../services/api/tankService';
import { processService } from '../../services/api/processService';
import { inspectionService } from '../../services/api/inspectionService';
import { defectService } from '../../services/api/defectService';
import { resourceService } from '../../services/api/resourceService';
import { activityService } from '../../services/api/activityService';
import type { ActivityLog, Bay, Defect, Gang, Inspection, Process, ProcessUpdate, Stage, Tank } from '../../models';

export const CURRENT_USER = { name: 'Authenticated user' };

interface WorkspaceData {
  tanks: Tank[];
  inspections: Inspection[];
  defects: Defect[];
  processes: Process[];
  stages: Stage[];
  bays: Bay[];
  gangs: Gang[];
  updates: ProcessUpdate[];
  activity: ActivityLog[];
}

const emptyWorkspace: WorkspaceData = {
  tanks: [],
  inspections: [],
  defects: [],
  processes: [],
  stages: [],
  bays: [],
  gangs: [],
  updates: [],
  activity: [],
};

export function useWorkspaceData() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(emptyWorkspace);

  useEffect(() => {
    let mounted = true;
    const load = () => void Promise.all([
        tankService.getAssignedTanks().catch(() => []),
        inspectionService.getAssignedInspections().catch(() => []),
        defectService.getAssignedDefects().catch(() => []),
        processService.getProcesses().catch(() => []),
        processService.getProductionUpdates(true).catch(() => []),
        resourceService.getStages().catch(() => []),
        resourceService.getBays().catch(() => []),
        resourceService.getGangs().catch(() => []),
        activityService.getAssignedActivity().catch(() => []),
      ]).then(([tanks, inspections, defects, processes, updates, stages, bays, gangs, activity]) => {
        if (mounted) setWorkspace({ tanks, inspections, defects, processes, stages, bays, gangs, updates, activity });
      });
    load();
    window.addEventListener('workshop:refresh', load);
    return () => {
      mounted = false;
      window.removeEventListener('workshop:refresh', load);
    };
  }, []);

  return workspace;
}

export function tankLabel(tankId: string) {
  return tankId.replace('T-', '');
}