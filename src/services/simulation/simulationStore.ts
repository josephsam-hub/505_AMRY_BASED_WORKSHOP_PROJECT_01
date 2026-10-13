import type {
  ActivityLog, Bay, Defect, Gang, Inspection,
  JRIRecord, Notification, Process, ProcessUpdate, RoadTrial, Stage, Tank
} from '../../models';
import { activityLogs as seedActivity, notifications as seedNotifications } from '../../data/activity';
import { bays as seedBays } from '../../data/bays';
import { defects as seedDefects } from '../../data/defects';
import { gangs as seedGangs } from '../../data/gangs';
import { inspections as seedInspections } from '../../data/inspections';
import { jriRecords as seedJri } from '../../data/jri';
import { processes as seedProcesses } from '../../data/processes';
import { roadTrials as seedRoadTrials } from '../../data/roadTrials';
import { stages as seedStages } from '../../data/stages';
import { tanks as seedTanks } from '../../data/tanks';

export interface SimulationState {
  tanks: Tank[];
  bays: Bay[];
  gangs: Gang[];
  stages: Stage[];
  processes: Process[];
  inspections: Inspection[];
  defects: Defect[];
  roadTrials: RoadTrial[];
  jriRecords: JRIRecord[];
  handoverRecords: Array<{
    id: string;
    tankId: string;
    status: string;
    handoverDate?: string;
    dispatchDate?: string;
    remarks?: string;
  }>;
  activityLogs: ActivityLog[];
  notifications: Notification[];
  processUpdates: ProcessUpdate[];
}

const STORAGE_KEY = 'workshop_simulation_state_v1';

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

function initializeState(): SimulationState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tanks) && parsed.tanks.length > 0) {
        return parsed as SimulationState;
      }
    }
  } catch {
    // sessionStorage not accessible
  }

  // Generate initial handover records from completed tanks
  const initialHandovers = seedTanks
    .filter((t) => t.status === 'completed' || t.currentStageId === 'S6')
    .map((t) => ({
      id: `HO-${t.id}`,
      tankId: t.id,
      status: t.status === 'completed' ? 'DISPATCHED' : 'PENDING',
      handoverDate: t.actualCompletion ?? t.expectedCompletion,
      dispatchDate: t.status === 'completed' ? t.actualCompletion : undefined,
      remarks: t.remarks ?? 'Standard handover protocol completed.',
    }));

  return {
    tanks: clone(seedTanks),
    bays: clone(seedBays),
    gangs: clone(seedGangs),
    stages: clone(seedStages),
    processes: clone(seedProcesses),
    inspections: clone(seedInspections),
    defects: clone(seedDefects),
    roadTrials: clone(seedRoadTrials),
    jriRecords: clone(seedJri),
    handoverRecords: initialHandovers,
    activityLogs: clone(seedActivity),
    notifications: clone(seedNotifications),
    processUpdates: [],
  };
}

class SimulationRepository {
  private state: SimulationState;

  constructor() {
    this.state = initializeState();
    this.persist();
  }

  private persist() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable
    }
  }

  private notify(eventName: string, payload: Record<string, unknown> = {}) {
    this.persist();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workshop:refresh', { detail: { eventName, payload } }));
    }
  }

  public getState(): SimulationState {
    return this.state;
  }

  public reset() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.state = initializeState();
    this.notify('simulation.reset');
  }

  // ── Tanks ─────────────────────────────────────────────────────────────
  public getTanks(filters?: { status?: string; gangId?: string; assignedToMe?: boolean; userGangIds?: string[] }): Tank[] {
    let list = this.state.tanks;
    if (filters?.assignedToMe && filters.userGangIds) {
      list = list.filter((t) => t.assignedGangId && filters.userGangIds?.includes(t.assignedGangId));
    }
    if (filters?.status) {
      list = list.filter((t) => t.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.gangId) {
      list = list.filter((t) => t.assignedGangId === filters.gangId);
    }
    return clone(list);
  }

  public getTankById(id: string): Tank | undefined {
    const tank = this.state.tanks.find((t) => t.id === id || t.tankNumber === id);
    return tank ? clone(tank) : undefined;
  }

  public updateTank(id: string, patch: Partial<Tank>): Tank {
    const idx = this.state.tanks.findIndex((t) => t.id === id || t.tankNumber === id);
    if (idx === -1) throw new Error(`Tank not found: ${id}`);

    const existing = this.state.tanks[idx];
    const updated: Tank = {
      ...existing,
      ...patch,
      overallProgress: patch.overallProgress !== undefined ? Math.min(100, Math.max(0, patch.overallProgress)) : existing.overallProgress,
    };

    if (updated.overallProgress === 100 && updated.currentProcessId === 'P31') {
      updated.status = 'completed';
      updated.actualCompletion = new Date().toISOString().split('T')[0];
    }

    this.state.tanks[idx] = updated;

    this.addActivityLog({
      tankId: updated.id,
      action: 'Tank updated',
      performedBy: 'Operator',
      details: Object.keys(patch).join(', '),
    });

    this.notify('tank.updated', { tankId: updated.id, changes: patch });
    return clone(updated);
  }

  // ── Process Updates ───────────────────────────────────────────────────
  public updateProcess(params: {
    tankId: string;
    processId: string;
    progress: number;
    status: string;
    remarks?: string;
    delayReason?: string;
    updatedBy?: string;
  }): ProcessUpdate {
    const tank = this.state.tanks.find((t) => t.id === params.tankId || t.tankNumber === params.tankId);
    if (!tank) throw new Error(`Tank not found: ${params.tankId}`);

    const proc = this.state.processes.find((p) => p.id === params.processId);
    if (!proc) throw new Error(`Process not found: ${params.processId}`);

    const prevStatus = (tank.status === 'critical' ? 'blocked' : tank.status === 'warning' ? 'delayed' : 'active') as any;
    const normStatus = params.status.toLowerCase();

    // Update tank current process and progress
    const numericProgress = Math.min(100, Math.max(0, Number(params.progress)));
    tank.currentProcessId = proc.id;
    tank.currentStageId = proc.stageId;
    tank.overallProgress = Math.round(((proc.processNumber - 1) / this.state.processes.length) * 100 + (numericProgress / this.state.processes.length));

    if (normStatus === 'blocked' || normStatus === 'critical') {
      tank.status = 'critical';
      tank.blockerReason = params.delayReason ?? params.remarks ?? 'Process blocked';
    } else if (normStatus === 'delayed' || normStatus === 'warning') {
      tank.status = 'warning';
      tank.delayDays = (tank.delayDays || 0) + 1;
    } else if (numericProgress >= 100 && proc.processNumber === 31) {
      tank.status = 'completed';
      tank.overallProgress = 100;
      tank.actualCompletion = new Date().toISOString().split('T')[0];
    } else {
      tank.status = 'active';
      if (tank.blockerReason && !params.delayReason) {
        tank.blockerReason = undefined;
      }
    }

    const updateRecord: ProcessUpdate = {
      id: `PU-${Date.now()}`,
      tankId: tank.id,
      processId: proc.id,
      previousStatus: prevStatus,
      currentStatus: normStatus as any,
      progress: numericProgress,
      updatedBy: params.updatedBy ?? 'Authorized Operator',
      updatedAt: new Date().toISOString(),
      remarks: params.remarks,
      delayReason: params.delayReason,
    };

    this.state.processUpdates.unshift(updateRecord);

    this.addActivityLog({
      tankId: tank.id,
      processId: proc.id,
      action: `Process P${String(proc.processNumber).padStart(2, '0')} updated: ${params.status}`,
      performedBy: params.updatedBy ?? 'Operator',
      details: params.remarks ?? params.delayReason,
    });

    this.notify('production.updated', { tankId: tank.id, processId: proc.id });
    return clone(updateRecord);
  }

  // ── Inspections ───────────────────────────────────────────────────────
  public getInspections(filters?: { tankId?: string; assignedToMe?: boolean; userGangIds?: string[] }): Inspection[] {
    let list = this.state.inspections;
    if (filters?.tankId) {
      list = list.filter((i) => i.tankId === filters.tankId);
    }
    if (filters?.assignedToMe && filters.userGangIds) {
      const myTankIds = new Set(this.state.tanks.filter((t) => t.assignedGangId && filters.userGangIds?.includes(t.assignedGangId)).map((t) => t.id));
      list = list.filter((i) => myTankIds.has(i.tankId));
    }
    return clone(list);
  }

  public requestInspection(params: {
    tankId: string;
    processId: string;
    stageId: string;
    name: string;
    scheduledDate: string;
  }): Inspection {
    const inspection: Inspection = {
      id: `INSP-${Date.now()}`,
      tankId: params.tankId,
      processId: params.processId,
      stageId: params.stageId,
      name: params.name,
      status: 'pending',
      scheduledDate: params.scheduledDate,
      failureReasons: [],
    };

    this.state.inspections.unshift(inspection);

    this.addNotification({
      type: 'info',
      title: 'Inspection Requested',
      message: `Inspection "${params.name}" scheduled for T-${params.tankId.replace('T-', '')}`,
      tankId: params.tankId,
      processId: params.processId,
    });

    this.addActivityLog({
      tankId: params.tankId,
      processId: params.processId,
      action: 'Inspection requested',
      performedBy: 'QC Team',
      details: params.name,
    });

    this.notify('inspection.created', { inspectionId: inspection.id, tankId: params.tankId });
    return clone(inspection);
  }

  public recordInspection(id: string, patch: {
    status: 'passed' | 'failed';
    inspector?: string;
    remarks?: string;
    completedDate?: string;
  }): Inspection {
    const idx = this.state.inspections.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Inspection not found: ${id}`);

    const existing = this.state.inspections[idx];
    const completedDate = patch.completedDate ?? new Date().toISOString().split('T')[0];

    const updated: Inspection = {
      ...existing,
      status: patch.status,
      inspector: patch.inspector ?? 'QC Inspector',
      remarks: patch.remarks,
      completedDate,
    };

    this.state.inspections[idx] = updated;

    // If failed, auto-generate defect and critical alert
    if (patch.status === 'failed') {
      const defectId = `DEF-${Date.now()}`;
      const defect: Defect = {
        id: defectId,
        tankId: existing.tankId,
        processId: existing.processId,
        stageId: existing.stageId,
        category: 'Quality Inspection',
        severity: 'major',
        description: `Inspection "${existing.name}" failed: ${patch.remarks ?? 'Non-compliance detected in QA checklist'}`,
        assignedTo: 'QC / Gang Lead',
        createdDate: completedDate,
        targetDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'open',
      };
      this.state.defects.unshift(defect);

      // Flag tank warning
      const tank = this.state.tanks.find((t) => t.id === existing.tankId);
      if (tank && tank.status !== 'critical') {
        tank.status = 'warning';
        tank.blockerReason = `Inspection failed: ${existing.name}`;
      }

      this.addNotification({
        type: 'alert',
        title: 'Inspection Failed',
        message: `T-${existing.tankId.replace('T-', '')} inspection "${existing.name}" failed. Defect ${defectId} logged.`,
        tankId: existing.tankId,
      });

      this.addActivityLog({
        tankId: existing.tankId,
        processId: existing.processId,
        action: 'Inspection failed — Defect logged',
        performedBy: patch.inspector ?? 'QC Inspector',
        details: defectId,
      });

      this.notify('inspection.failed', { inspectionId: id, tankId: existing.tankId, defectId });
    } else {
      this.addNotification({
        type: 'success',
        title: 'Inspection Passed',
        message: `T-${existing.tankId.replace('T-', '')} inspection "${existing.name}" cleared.`,
        tankId: existing.tankId,
      });

      this.addActivityLog({
        tankId: existing.tankId,
        processId: existing.processId,
        action: 'Inspection passed',
        performedBy: patch.inspector ?? 'QC Inspector',
        details: patch.remarks,
      });

      this.notify('inspection.updated', { inspectionId: id, tankId: existing.tankId });
    }

    return clone(updated);
  }

  // ── Defects ───────────────────────────────────────────────────────────
  public getDefects(filters?: { tankId?: string; assignedToMe?: boolean; userGangIds?: string[] }): Defect[] {
    let list = this.state.defects;
    if (filters?.tankId) {
      list = list.filter((d) => d.tankId === filters.tankId);
    }
    if (filters?.assignedToMe && filters.userGangIds) {
      const myTankIds = new Set(this.state.tanks.filter((t) => t.assignedGangId && filters.userGangIds?.includes(t.assignedGangId)).map((t) => t.id));
      list = list.filter((d) => myTankIds.has(d.tankId));
    }
    return clone(list);
  }

  public reportDefect(params: {
    tankId: string;
    processId: string;
    stageId: string;
    category: string;
    severity: 'critical' | 'major' | 'minor';
    description: string;
    assignedTo: string;
    targetDate: string;
  }): Defect {
    const defect: Defect = {
      id: `DEF-${Date.now()}`,
      tankId: params.tankId,
      processId: params.processId,
      stageId: params.stageId,
      category: params.category,
      severity: params.severity,
      description: params.description,
      assignedTo: params.assignedTo,
      createdDate: new Date().toISOString().split('T')[0],
      targetDate: params.targetDate,
      status: 'open',
    };

    this.state.defects.unshift(defect);

    // If critical defect, flag tank
    const tank = this.state.tanks.find((t) => t.id === params.tankId);
    if (tank && params.severity === 'critical') {
      tank.status = 'critical';
      tank.blockerReason = `Critical Defect: ${params.description}`;
    }

    this.addNotification({
      type: params.severity === 'critical' ? 'alert' : 'warning',
      title: `New Defect Logged (${params.severity.toUpperCase()})`,
      message: `T-${params.tankId.replace('T-', '')}: ${params.description}`,
      tankId: params.tankId,
      processId: params.processId,
    });

    this.addActivityLog({
      tankId: params.tankId,
      processId: params.processId,
      action: `Defect logged (${params.severity})`,
      performedBy: 'Technician',
      details: params.description,
    });

    this.notify('defect.created', { defectId: defect.id, tankId: params.tankId });
    return clone(defect);
  }

  public updateDefect(id: string, patch: {
    status?: 'open' | 'in-progress' | 'resolved' | 'closed';
    resolution?: string;
    remarks?: string;
  }): Defect {
    const idx = this.state.defects.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error(`Defect not found: ${id}`);

    const updated: Defect = {
      ...this.state.defects[idx],
      ...patch,
    };
    this.state.defects[idx] = updated;

    // Check if tank has remaining critical defects
    const tank = this.state.tanks.find((t) => t.id === updated.tankId);
    if (tank && (updated.status === 'closed' || updated.status === 'resolved')) {
      const remainingCritical = this.state.defects.filter((d) => d.tankId === tank.id && d.severity === 'critical' && d.status !== 'closed' && d.status !== 'resolved');
      if (remainingCritical.length === 0 && tank.status === 'critical') {
        tank.status = 'active';
        tank.blockerReason = undefined;
      }
    }

    this.addActivityLog({
      tankId: updated.tankId,
      processId: updated.processId,
      action: `Defect ${updated.id} marked ${updated.status}`,
      performedBy: 'QC Lead',
      details: patch.resolution ?? patch.remarks,
    });

    this.notify(updated.status === 'closed' ? 'defect.closed' : 'defect.updated', { defectId: id, tankId: updated.tankId, status: updated.status });
    return clone(updated);
  }

  // ── Bays & Floor ──────────────────────────────────────────────────────
  public getBays(): Bay[] {
    return clone(this.state.bays);
  }

  public assignBay(tankId: string, bayId: string): { tank: Tank; bay: Bay } {
    const tank = this.state.tanks.find((t) => t.id === tankId);
    if (!tank) throw new Error(`Tank not found: ${tankId}`);

    const bay = this.state.bays.find((b) => b.id === bayId);
    if (!bay) throw new Error(`Bay not found: ${bayId}`);

    // Remove tank from old bay
    this.state.bays.forEach((b) => {
      b.currentTankIds = b.currentTankIds.filter((id) => id !== tankId);
      b.utilization = b.capacity > 0 ? Math.round((b.currentTankIds.length / b.capacity) * 100) : 0;
      b.status = b.currentTankIds.length > 0 ? 'occupied' : 'available';
    });

    // Add to new bay
    if (!bay.currentTankIds.includes(tankId)) {
      bay.currentTankIds.push(tankId);
    }
    bay.utilization = Math.round((bay.currentTankIds.length / bay.capacity) * 100);
    bay.status = 'occupied';
    tank.currentBayId = bay.id;

    this.addActivityLog({
      tankId,
      action: `Assigned to ${bay.name}`,
      performedBy: 'Workshop Supervisor',
    });

    this.notify('assignment.updated', { tankId, bayId });
    return { tank: clone(tank), bay: clone(bay) };
  }

  public assignGang(tankId: string, gangId: string): Tank {
    const tank = this.state.tanks.find((t) => t.id === tankId);
    if (!tank) throw new Error(`Tank not found: ${tankId}`);

    const gang = this.state.gangs.find((g) => g.id === gangId);
    if (!gang) throw new Error(`Gang not found: ${gangId}`);

    tank.assignedGangId = gang.id;
    if (!gang.assignedTankIds.includes(tankId)) {
      gang.assignedTankIds.push(tankId);
    }

    this.addActivityLog({
      tankId,
      action: `Assigned to ${gang.name}`,
      performedBy: 'Supervisor',
    });

    this.notify('assignment.updated', { tankId, gangId });
    return clone(tank);
  }

  // ── Road Trials & JRI ─────────────────────────────────────────────────
  public getRoadTrials(): RoadTrial[] {
    return clone(this.state.roadTrials);
  }

  public updateRoadTrial(id: string, patch: Partial<RoadTrial>): RoadTrial {
    const idx = this.state.roadTrials.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Road trial record not found: ${id}`);
    const updated = { ...this.state.roadTrials[idx], ...patch };
    this.state.roadTrials[idx] = updated;
    this.notify('road_trial.updated', { roadTrialId: id, tankId: updated.tankId });
    return clone(updated);
  }

  public getJriRecords(): JRIRecord[] {
    return clone(this.state.jriRecords);
  }

  public updateJri(id: string, patch: Partial<JRIRecord>): JRIRecord {
    const idx = this.state.jriRecords.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`JRI record not found: ${id}`);
    const updated = { ...this.state.jriRecords[idx], ...patch };
    this.state.jriRecords[idx] = updated;
    this.notify('jri.updated', { jriId: id, tankId: updated.tankId });
    return clone(updated);
  }

  // ── Notifications & Activity ──────────────────────────────────────────
  public getNotifications(): Notification[] {
    return clone(this.state.notifications);
  }

  public addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const n: Notification = {
      id: `NOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    };
    this.state.notifications.unshift(n);
    this.notify('notification.created', { id: n.id });
    return clone(n);
  }

  public markNotificationRead(id: string) {
    const n = this.state.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      this.notify('notification.updated', { id });
    }
  }

  public markAllNotificationsRead() {
    this.state.notifications.forEach((n) => { n.read = true; });
    this.notify('notification.updated', { all: true });
  }

  public getActivityLogs(tankId?: string): ActivityLog[] {
    if (tankId) {
      return clone(this.state.activityLogs.filter((a) => a.tankId === tankId));
    }
    return clone(this.state.activityLogs);
  }

  public addActivityLog(entry: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const act: ActivityLog = {
      id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.state.activityLogs.unshift(act);
    this.notify('activity.created', { id: act.id, tankId: act.tankId });
    return clone(act);
  }
}

// Singleton repository
export const simulationRepository = new SimulationRepository();
