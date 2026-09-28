import type { ProductionPulse, Tank } from '../models';
import { tankService } from './api/tankService';
import { apiRequest } from './api/client';

export interface Blocker {
  tankId: string;
  tankNumber: string;
  processName: string;
  reason: string;
  severity: 'critical' | 'warning';
}

export const productionService = {
  async getTanks() { return tankService.getTanks(); },

  async getTankById(id: string) { return tankService.getTankById(id); },

  async getProductionPulse(): Promise<ProductionPulse> {
    const [remoteTanks, remoteInspections, remoteGangs] = await Promise.all([
      tankService.getTanks(),
      apiRequest<Array<{ status: string }>>('/api/inspections'),
      apiRequest<Array<{ authorized: number; deployed: number }>>('/api/gangs'),
    ]);
    const total = remoteTanks.length;
    if (total === 0) return { overall: 0, schedule: 0, resources: 0, quality: 0, processFlow: 0, primaryBottleneck: 'No verified production records available.', calculatedAt: new Date().toISOString() };
    const delayedTanks = remoteTanks.filter((tank) => tank.delayDays > 0).length;
    const completedInspections = remoteInspections.filter((inspection) => inspection.status === 'PASSED' || inspection.status === 'FAILED');
    const passed = remoteInspections.filter((inspection) => inspection.status === 'PASSED').length;
    const schedule = Math.round(100 - (delayedTanks / total) * 100 * 0.6);
    const authorized = remoteGangs.reduce((sum, gang) => sum + gang.authorized, 0);
    const deployed = remoteGangs.reduce((sum, gang) => sum + gang.deployed, 0);
    const resources = authorized ? Math.round((deployed / authorized) * 100) : 0;
    const quality = completedInspections.length ? Math.round((passed / completedInspections.length) * 100) : 0;
    const critical = remoteTanks.filter((tank) => tank.status === 'critical').length;
    const warning = remoteTanks.filter((tank) => tank.status === 'warning').length;
    const processFlow = Math.round(100 - ((critical * 2 + warning) / total) * 100 * 0.5);
    return { overall: Math.round(schedule * 0.3 + resources * 0.25 + quality * 0.25 + processFlow * 0.2), schedule, resources, quality, processFlow, primaryBottleneck: 'Calculated from workshop server data.', calculatedAt: new Date().toISOString() };
  },

  async getActiveBlockers(): Promise<Blocker[]> {
    const remoteTanks = await tankService.getTanks();
    return remoteTanks.filter((tank) => (tank.status === 'critical' || tank.status === 'warning') && tank.blockerReason).map((tank): Blocker => ({ tankId: tank.id, tankNumber: tank.tankNumber, processName: tank.currentProcessId, reason: tank.blockerReason ?? '', severity: tank.status === 'critical' ? 'critical' : 'warning' })).sort((a, _b) => (a.severity === 'critical' ? -1 : 1));
  },

  async getKpiSummary() {
    const [remoteTanks, remoteDefects, remoteInspections] = await Promise.all([tankService.getTanks(), apiRequest<Array<{ status: string }>>('/api/defects'), apiRequest<Array<{ status: string }>>('/api/inspections')]);
    const total = remoteTanks.length;
    const byStatus = (s: Tank['status']) => remoteTanks.filter((t) => t.status === s).length;
    return {
      total,
      completed: byStatus('completed'),
      active: byStatus('active'),
      warning: byStatus('warning'),
      critical: byStatus('critical'),
      pending: byStatus('pending'),
      openDefects: remoteDefects.filter((d) => d.status === 'OPEN' || d.status === 'IN_PROGRESS').length,
      pendingInspections: remoteInspections.filter((i) => i.status === 'PENDING').length,
    };
  },
};
