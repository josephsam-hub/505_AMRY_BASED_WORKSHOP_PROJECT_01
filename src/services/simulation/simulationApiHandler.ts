import { simulationRepository } from './simulationStore';
import type { Defect, Inspection, Tank } from '../../models';

function normalizePath(path: string) {
  return path.split('?')[0].replace(/\/$/, '');
}

function parseQuery(path: string): Record<string, string> {
  const queryPart = path.split('?')[1];
  if (!queryPart) return {};
  const params: Record<string, string> = {};
  queryPart.split('&').forEach((pair) => {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  });
  return params;
}

function toSnakeTankRow(tank: Tank) {
  return {
    id: tank.id,
    tank_number: tank.tankNumber,
    oh_number: tank.ohNumber,
    type: tank.type,
    profile: tank.profile,
    current_stage_id: tank.currentStageId,
    current_process_id: tank.currentProcessId,
    bay_id: tank.currentBayId ?? null,
    gang_id: tank.assignedGangId ?? null,
    status: tank.status,
    progress: tank.overallProgress,
    intake_date: tank.plannedStart,
    planned_completion_date: tank.plannedCompletion,
    expected_completion_date: tank.expectedCompletion,
    actual_completion_date: tank.actualCompletion ?? null,
    planned_exit_date: tank.plannedCompletion,
    expected_exit_date: tank.expectedCompletion,
    actual_exit_date: null,
    delay_days: tank.delayDays,
    blocker_reason: tank.blockerReason ?? null,
  };
}

function toSnakeInspectionRow(i: Inspection) {
  return {
    id: i.id,
    tank_id: i.tankId,
    process_id: i.processId,
    stage_id: i.stageId,
    name: i.name,
    scheduled_date: i.scheduledDate,
    completed_date: i.completedDate ?? null,
    status: (i.status ?? 'PENDING').toUpperCase(),
    inspector: i.inspector ?? null,
    remarks: i.remarks ?? null,
    failure_reasons: i.failureReasons ?? [],
  };
}

function toSnakeDefectRow(d: Defect) {
  return {
    id: d.id,
    tank_id: d.tankId,
    process_id: d.processId,
    stage_id: d.stageId,
    category: d.category,
    severity: (d.severity ?? 'MINOR').toUpperCase(),
    description: d.description,
    assigned_to: d.assignedTo,
    created_date: d.createdDate,
    target_date: d.targetDate,
    status: (d.status ?? 'OPEN').toUpperCase().replace('-', '_'),
    resolution: d.resolution ?? null,
    remarks: d.remarks ?? null,
  };
}

export async function handleSimulationApiRequest<T>(
  path: string,
  init?: RequestInit,
  currentUserRole: 'admin' | 'user' = 'admin'
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const route = normalizePath(path);
  const query = parseQuery(path);
  const body = init?.body ? JSON.parse(init.body as string) : {};

  // Context gang IDs for current simulated user
  const userGangIds = currentUserRole === 'admin'
    ? ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10']
    : ['G07', 'G08']; // Gang G & Gang H

  // ── Health & Auth ──────────────────────────────────────────────────────────
  if (route === '/api/health') {
    return {
      status: 'ok',
      database: 'simulation',
      serverTime: new Date().toISOString(),
      version: '0.1.0-sim',
    } as T;
  }

  if (route === '/api/auth/context') {
    return {
      id: currentUserRole === 'admin' ? 'USR-ADMIN' : 'USR-GANG-GH',
      roles: currentUserRole === 'admin' ? ['ADMIN', 'USER'] : ['USER'],
      gangIds: userGangIds,
    } as T;
  }

  if (route === '/api/auth/login' && method === 'POST') {
    const role = body.role ?? 'admin';
    return {
      token: `sim-token-${role}`,
      user: {
        id: role === 'admin' ? 'USR-ADMIN' : 'USR-GANG-GH',
        roles: role === 'admin' ? ['ADMIN', 'USER'] : ['USER'],
        gangIds: role === 'admin' ? ['G01','G02','G03','G04','G05','G06','G07','G08','G09','G10'] : ['G07', 'G08'],
      },
    } as T;
  }

  // ── Tanks ──────────────────────────────────────────────────────────────────
  if (route === '/api/tanks') {
    if (method === 'GET') {
      const assignedToMe = query.assignedToMe === 'true';
      const status = query.status;
      const gangId = query.gangId;
      const tanks = simulationRepository.getTanks({
        assignedToMe,
        userGangIds,
        status,
        gangId,
      });
      return tanks.map(toSnakeTankRow) as T;
    }
    if (method === 'POST') {
      const created = simulationRepository.updateTank(body.id ?? `T-${Date.now()}`, body);
      return toSnakeTankRow(created) as T;
    }
  }

  if (route.startsWith('/api/tanks/')) {
    const parts = route.split('/');
    const tankId = parts[3];

    // Sub-route: /api/tanks/:id/processes
    if (parts[4] === 'processes') {
      const state = simulationRepository.getState();
      const tank = state.tanks.find((t) => t.id === tankId);
      const curProc = state.processes.find((p) => p.id === tank?.currentProcessId);
      const curNum = curProc?.processNumber ?? 1;

      return state.processes.map((p) => ({
        id: `TP-${tankId}-${p.id}`,
        tank_id: tankId,
        process_id: p.id,
        name: p.name,
        process_number: p.processNumber,
        status: p.processNumber < curNum ? 'COMPLETED' : p.processNumber === curNum ? 'IN_PROGRESS' : 'PENDING',
        progress: p.processNumber < curNum ? 100 : p.processNumber === curNum ? (tank?.overallProgress ?? 50) : 0,
        remarks: p.processNumber === curNum ? tank?.remarks ?? null : null,
      })) as T;
    }

    // Individual tank GET or PATCH
    if (method === 'GET') {
      const tank = simulationRepository.getTankById(tankId);
      if (!tank) return null as T;
      return toSnakeTankRow(tank) as T;
    }

    if (method === 'PATCH') {
      const patch: Partial<Tank> = {};
      if (body.bay_id !== undefined) patch.currentBayId = body.bay_id ?? undefined;
      if (body.gang_id !== undefined) patch.assignedGangId = body.gang_id ?? undefined;
      if (body.progress !== undefined) patch.overallProgress = Number(body.progress);
      if (body.status !== undefined) patch.status = body.status.toLowerCase();
      if (body.current_stage_id !== undefined) patch.currentStageId = body.current_stage_id;
      if (body.current_process_id !== undefined) patch.currentProcessId = body.current_process_id;
      if (body.planned_completion_date) patch.plannedCompletion = body.planned_completion_date;
      if (body.expected_completion_date) patch.expectedCompletion = body.expected_completion_date;

      const updated = simulationRepository.updateTank(tankId, patch);
      return toSnakeTankRow(updated) as T;
    }
  }

  // ── Processes ──────────────────────────────────────────────────────────────
  if (route === '/api/processes') {
    const state = simulationRepository.getState();
    return state.processes.map((p) => ({
      id: p.id,
      process_number: p.processNumber,
      name: p.name,
      stage_id: p.stageId,
      duration_days: p.durationDays,
      path_type: p.pathType,
      predecessors: p.predecessors,
      successors: p.successors,
    })) as T;
  }

  if (route.startsWith('/api/processes/')) {
    const id = route.split('/')[3];
    const proc = simulationRepository.getState().processes.find((p) => p.id === id);
    if (!proc) return null as T;
    return {
      id: proc.id,
      process_number: proc.processNumber,
      name: proc.name,
      stage_id: proc.stageId,
      duration_days: proc.durationDays,
      path_type: proc.pathType,
      predecessors: proc.predecessors,
      successors: proc.successors,
    } as T;
  }

  // ── Stages ─────────────────────────────────────────────────────────────────
  if (route === '/api/stages') {
    const stages = simulationRepository.getState().stages;
    return stages.map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
      short_name: s.shortName,
      planned_duration_days: s.plannedDurationDays,
      color: s.color,
    })) as T;
  }

  // ── Bays ───────────────────────────────────────────────────────────────────
  if (route === '/api/bays') {
    const bays = simulationRepository.getBays();
    return bays.map((b) => ({
      id: b.id,
      number: b.number,
      name: b.name,
      capacity: b.capacity,
      status: b.status,
      utilization: b.utilization,
      current_process_id: b.currentProcessId ?? null,
      current_tank_ids: b.currentTankIds,
      occupied_count: b.currentTankIds.length,
    })) as T;
  }

  if (route.startsWith('/api/bays/')) {
    const id = route.split('/')[3];
    const bay = simulationRepository.getBays().find((b) => b.id === id);
    if (!bay) return null as T;
    return {
      id: bay.id,
      number: bay.number,
      name: bay.name,
      capacity: bay.capacity,
      status: bay.status,
      utilization: bay.utilization,
      current_process_id: bay.currentProcessId ?? null,
      current_tank_ids: bay.currentTankIds,
      occupied_count: bay.currentTankIds.length,
    } as T;
  }

  // ── Gangs & Personnel ──────────────────────────────────────────────────────
  if (route === '/api/gangs') {
    const gangs = simulationRepository.getState().gangs;
    return gangs.map((g) => ({
      id: g.id,
      name: g.name,
      specialty: g.specialty,
      authorized: g.authorized,
      available: g.available,
      deployed: g.deployed,
      held: g.held,
    })) as T;
  }

  if (route === '/api/personnel') {
    return [
      { id: 'PERS-1', name: 'Subedar M. Singh', specialty: 'Hull Reclamation', active: true },
      { id: 'PERS-2', name: 'Havildar R. Kumar', specialty: 'Engine Assembly', active: true },
      { id: 'PERS-3', name: 'Naik S. Sharma', specialty: 'Electrical Systems', active: true },
      { id: 'PERS-4', name: 'Lance Naik A. Patel', specialty: 'Armament Fitting', active: true },
      { id: 'PERS-5', name: 'CFN V. Rao', specialty: 'Transmission', active: true },
    ] as T;
  }

  // ── Inspections ────────────────────────────────────────────────────────────
  if (route === '/api/inspections') {
    if (method === 'GET') {
      const assignedToMe = query.assignedToMe === 'true';
      const inspections = simulationRepository.getInspections({
        assignedToMe,
        userGangIds,
      });
      return inspections.map(toSnakeInspectionRow) as T;
    }
    if (method === 'POST') {
      const created = simulationRepository.requestInspection({
        tankId: body.tankId ?? body.tank_id,
        processId: body.processId ?? body.process_id,
        stageId: body.stageId ?? body.stage_id,
        name: body.name,
        scheduledDate: body.scheduledDate ?? body.scheduled_date ?? new Date().toISOString().split('T')[0],
      });
      return toSnakeInspectionRow(created) as T;
    }
  }

  if (route.startsWith('/api/inspections/')) {
    const id = route.split('/')[3];
    if (method === 'GET') {
      const insp = simulationRepository.getState().inspections.find((i) => i.id === id);
      return insp ? (toSnakeInspectionRow(insp) as T) : (null as T);
    }
    if (method === 'PATCH') {
      const updated = simulationRepository.recordInspection(id, {
        status: (body.status ?? '').toLowerCase() === 'failed' ? 'failed' : 'passed',
        inspector: body.inspector,
        remarks: body.remarks,
        completedDate: body.completedDate ?? body.completed_date,
      });
      return toSnakeInspectionRow(updated) as T;
    }
  }

  // ── Defects ────────────────────────────────────────────────────────────────
  if (route === '/api/defects') {
    if (method === 'GET') {
      const assignedToMe = query.assignedToMe === 'true';
      const defects = simulationRepository.getDefects({
        assignedToMe,
        userGangIds,
      });
      return defects.map(toSnakeDefectRow) as T;
    }
    if (method === 'POST') {
      const created = simulationRepository.reportDefect({
        tankId: body.tankId ?? body.tank_id,
        processId: body.processId ?? body.process_id,
        stageId: body.stageId ?? body.stage_id,
        category: body.category ?? 'Mechanical',
        severity: (body.severity ?? 'major').toLowerCase() as any,
        description: body.description,
        assignedTo: body.assignedTo ?? body.assigned_to ?? 'Duty Gang',
        targetDate: body.targetDate ?? body.target_date ?? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });
      return toSnakeDefectRow(created) as T;
    }
  }

  if (route.startsWith('/api/defects/')) {
    const id = route.split('/')[3];
    if (method === 'GET') {
      const def = simulationRepository.getState().defects.find((d) => d.id === id);
      return def ? (toSnakeDefectRow(def) as T) : (null as T);
    }
    if (method === 'PATCH') {
      let statusNorm = (body.status ?? '').toLowerCase();
      if (statusNorm === 'in_progress') statusNorm = 'in-progress';
      const updated = simulationRepository.updateDefect(id, {
        status: statusNorm as any,
        resolution: body.resolution,
        remarks: body.remarks,
      });
      return toSnakeDefectRow(updated) as T;
    }
  }

  // ── Process Updates ────────────────────────────────────────────────────────
  if (route === '/api/process-updates' && method === 'POST') {
    const update = simulationRepository.updateProcess({
      tankId: body.tankId ?? body.tank_id,
      processId: body.processId ?? body.process_id,
      progress: Number(body.progress ?? 0),
      status: body.status ?? 'active',
      remarks: body.remarks,
      delayReason: body.delayReason ?? body.delay_reason,
      updatedBy: currentUserRole === 'admin' ? 'Command Controller' : 'Gang Lead',
    });
    return update as T;
  }

  if (route === '/api/production-updates') {
    return simulationRepository.getState().processUpdates as T;
  }

  // ── Road Trials, JRI, Handover ─────────────────────────────────────────────
  if (route === '/api/road-trials') {
    if (method === 'GET') {
      return simulationRepository.getRoadTrials().map((r) => ({
        id: r.id,
        tank_id: r.tankId,
        scheduled_date: r.scheduledDate,
        conducted_date: r.conductedDate ?? null,
        status: (r.status ?? 'SCHEDULED').toUpperCase(),
        distance: r.distance ?? null,
        result: r.result ?? null,
        remarks: r.remarks ?? null,
      })) as T;
    }
  }

  if (route.startsWith('/api/road-trials/') && method === 'PATCH') {
    const id = route.split('/')[3];
    const updated = simulationRepository.updateRoadTrial(id, {
      status: (body.status ?? '').toLowerCase() as any,
      conductedDate: body.conductedDate ?? body.conducted_date,
      distance: body.distance ? Number(body.distance) : undefined,
      result: body.result,
      remarks: body.remarks,
    });
    return {
      id: updated.id,
      tank_id: updated.tankId,
      scheduled_date: updated.scheduledDate,
      conducted_date: updated.conductedDate ?? null,
      status: (updated.status ?? 'SCHEDULED').toUpperCase(),
      distance: updated.distance ?? null,
      result: updated.result ?? null,
      remarks: updated.remarks ?? null,
    } as T;
  }

  if (route === '/api/jri') {
    if (method === 'GET') {
      return simulationRepository.getJriRecords().map((j) => ({
        id: j.id,
        tank_id: j.tankId,
        scheduled_date: j.scheduledDate,
        conducted_date: j.conductedDate ?? null,
        status: (j.status ?? 'SCHEDULED').toUpperCase(),
        board_members: j.boardMembers ?? [],
        remarks: j.remarks ?? null,
        handover_date: j.handoverDate ?? null,
        dispatch_date: j.dispatchDate ?? null,
      })) as T;
    }
  }

  if (route.startsWith('/api/jri/') && method === 'PATCH') {
    const id = route.split('/')[3];
    const updated = simulationRepository.updateJri(id, {
      status: (body.status ?? '').toLowerCase() as any,
      conductedDate: body.conductedDate ?? body.conducted_date,
      remarks: body.remarks,
      handoverDate: body.handoverDate ?? body.handover_date,
      dispatchDate: body.dispatchDate ?? body.dispatch_date,
    });
    return {
      id: updated.id,
      tank_id: updated.tankId,
      scheduled_date: updated.scheduledDate,
      conducted_date: updated.conductedDate ?? null,
      status: (updated.status ?? 'SCHEDULED').toUpperCase(),
      board_members: updated.boardMembers ?? [],
      remarks: updated.remarks ?? null,
      handover_date: updated.handoverDate ?? null,
      dispatch_date: updated.dispatchDate ?? null,
    } as T;
  }

  if (route === '/api/handover') {
    if (method === 'GET') {
      return simulationRepository.getState().handoverRecords.map((h) => ({
        id: h.id,
        tank_id: h.tankId,
        status: h.status.toUpperCase(),
        handover_date: h.handoverDate ?? null,
        dispatch_date: h.dispatchDate ?? null,
        remarks: h.remarks ?? null,
      })) as T;
    }
  }

  if (route.startsWith('/api/handover/') && method === 'PATCH') {
    const id = route.split('/')[3];
    const rec = simulationRepository.getState().handoverRecords.find((h) => h.id === id);
    if (rec) {
      if (body.status) rec.status = body.status;
      if (body.handoverDate) rec.handoverDate = body.handoverDate;
      if (body.dispatchDate) rec.dispatchDate = body.dispatchDate;
      if (body.remarks) rec.remarks = body.remarks;
    }
    return rec as T;
  }

  // ── Activity & Notifications ───────────────────────────────────────────────
  if (route === '/api/activity') {
    const logs = simulationRepository.getActivityLogs(query.tankId);
    return logs.map((l) => ({
      id: l.id,
      tank_id: l.tankId,
      process_id: l.processId ?? null,
      action: l.action,
      performed_by: l.performedBy,
      timestamp: l.timestamp,
      details: l.details ?? null,
    })) as T;
  }

  if (route === '/api/notifications') {
    return simulationRepository.getNotifications().map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      tank_id: n.tankId ?? null,
      process_id: n.processId ?? null,
      created_at: n.createdAt,
      read: n.read,
    })) as T;
  }

  if (route.startsWith('/api/notifications/') && route.endsWith('/read') && method === 'PATCH') {
    const id = route.split('/')[3];
    simulationRepository.markNotificationRead(id);
    return { success: true } as T;
  }

  if (route === '/api/notifications/read-all' && method === 'PATCH') {
    simulationRepository.markAllNotificationsRead();
    return undefined as T;
  }

  // ── Data Quality ───────────────────────────────────────────────────────────
  if (route === '/api/data-quality') {
    return [
      {
        id: 'DOC-real-data.pdf',
        document_name: 'real-data.pdf',
        document_type: 'SCANNED_PRODUCTION_SCHEDULE',
        document_status: 'VALIDATED',
        batch_id: 'BATCH-real-data.pdf-1',
        batch_status: 'COMPLETED_WITH_WARNINGS',
        total_rows: 41,
        valid_rows: 0,
        invalid_rows: 0,
        ambiguous_rows: 41,
        inserted_rows: 0,
        updated_rows: 0,
        skipped_rows: 41,
        error_count: 0,
        persisted_source_rows: 41,
        persisted_valid_rows: 0,
        persisted_ambiguous_rows: 41,
        warning_rows: 41,
      },
    ] as T;
  }

  // ── Reports ────────────────────────────────────────────────────────────────
  if (route === '/api/reports/production') {
    const state = simulationRepository.getState();
    const statuses = ['completed', 'active', 'warning', 'critical', 'pending'];
    return statuses.map((status) => {
      const match = state.tanks.filter((t) => t.status === status);
      const avgProg = match.length > 0 ? Math.round(match.reduce((s, t) => s + t.overallProgress, 0) / match.length) : 0;
      return { status, count: match.length, average_progress: avgProg };
    }) as T;
  }

  if (route === '/api/reports/defects') {
    const state = simulationRepository.getState();
    return [
      { severity: 'CRITICAL', status: 'OPEN', count: state.defects.filter((d) => d.severity === 'critical' && d.status === 'open').length },
      { severity: 'MAJOR', status: 'OPEN', count: state.defects.filter((d) => d.severity === 'major' && d.status === 'open').length },
      { severity: 'MINOR', status: 'OPEN', count: state.defects.filter((d) => d.severity === 'minor' && d.status === 'open').length },
      { severity: 'MAJOR', status: 'RESOLVED', count: state.defects.filter((d) => d.status === 'resolved' || d.status === 'closed').length },
    ] as T;
  }

  if (route === '/api/reports/inspections') {
    const state = simulationRepository.getState();
    return [
      { status: 'PASSED', count: state.inspections.filter((i) => i.status === 'passed').length },
      { status: 'FAILED', count: state.inspections.filter((i) => i.status === 'failed').length },
      { status: 'PENDING', count: state.inspections.filter((i) => i.status === 'pending').length },
    ] as T;
  }

  return [] as unknown as T;
}
