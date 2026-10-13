import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { env } from './config/env.js';
import { query, withTransaction } from './db/pool.js';
import { authenticateRequest, requireRole, createToken } from './middleware/auth.js';
import { emitOperationalEvent } from './realtime/events.js';

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(authenticateRequest);
const requireOperationalRole = requireRole('ADMIN', 'USER');

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

app.get('/api/health', async (_request, response) => {
  try {
    await query('SELECT 1');
    response.json({ status: 'ok', database: 'connected', serverTime: new Date().toISOString(), version: env.APP_VERSION });
  } catch {
    response.status(503).json({ status: 'degraded', database: 'disconnected', serverTime: new Date().toISOString(), version: env.APP_VERSION });
  }
});

app.get('/api/data-quality', async (_request, response) => {
  const result = await query(`SELECT d.id, d.document_name, d.document_type, d.status AS document_status,
    b.id AS batch_id, b.status AS batch_status, b.total_rows, b.valid_rows, b.invalid_rows,
    b.ambiguous_rows, b.inserted_rows, b.updated_rows, b.skipped_rows, b.error_count,
    COUNT(r.id)::int AS persisted_source_rows,
    COUNT(r.id) FILTER (WHERE r.validation_status = 'VALID')::int AS persisted_valid_rows,
    COUNT(r.id) FILTER (WHERE r.validation_status = 'AMBIGUOUS')::int AS persisted_ambiguous_rows,
    COUNT(r.id) FILTER (WHERE jsonb_array_length(r.validation_warnings) > 0)::int AS warning_rows
    FROM source_documents d
    LEFT JOIN import_batches b ON b.source_document_id = d.id
    LEFT JOIN source_production_rows r ON r.source_document_id = d.id
    GROUP BY d.id, d.document_name, d.document_type, d.status, b.id, b.status, b.total_rows, b.valid_rows,
      b.invalid_rows, b.ambiguous_rows, b.inserted_rows, b.updated_rows, b.skipped_rows, b.error_count
    ORDER BY d.created_at DESC`);
  response.json(result.rows);
});

app.post('/api/auth/login', (request, response) => {
  const { username, role } = request.body ?? {};
  const requestedRole = (role ?? (username === 'admin' ? 'admin' : 'user')).toLowerCase();
  const authUser = requestedRole === 'admin'
    ? { id: 'USR-ADMIN', roles: ['ADMIN', 'USER'], gangIds: ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10'] }
    : { id: 'USR-GANG-GH', roles: ['USER'], gangIds: ['G07', 'G08'] };
  const token = createToken(authUser);
  response.json({ token, user: authUser });
});

app.get('/api/auth/context', (request, response) => {
  if (!request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  response.json({ id: request.user.id, roles: request.user.roles, gangIds: request.user.gangIds });
});

app.get('/api/tanks', async (request, response) => {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (request.query.assignedToMe === 'true') {
    if (!request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    if (request.user.gangIds.length === 0) filters.push('FALSE');
    else { values.push(request.user.gangIds); filters.push(`t.gang_id = ANY($${values.length}::text[])`); }
  }
  if (request.query.status) { values.push(request.query.status); filters.push(`t.status = $${values.length}`); }
  if (request.query.gangId) { values.push(request.query.gangId); filters.push(`t.gang_id = $${values.length}`); }
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await query(`SELECT t.*, s.number AS stage_number, s.short_name AS stage_name, p.name AS process_name FROM tanks t LEFT JOIN stages s ON s.id = t.current_stage_id LEFT JOIN processes p ON p.id = t.current_process_id ${whereClause} ORDER BY t.tank_number`, values);
  response.json(result.rows);
});

app.get('/api/tanks/:id', async (request, response) => {
  const result = await query('SELECT * FROM tanks WHERE id = $1 OR tank_number = $1', [request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Tank not found' });
  response.json(result.rows[0]);
});

app.post('/api/tanks', requireOperationalRole, async (request, response) => {
  const { id, tankNumber, ohNumber, profile, type, intakeDate, plannedCompletionDate, expectedCompletionDate, currentStageId, currentProcessId } = request.body;
  if (!id || !tankNumber || !ohNumber || !profile || !type || !intakeDate || !currentStageId || !currentProcessId) return response.status(400).json({ error: 'Missing required tank fields' });
  const result = await query('INSERT INTO tanks (id, tank_number, oh_number, profile, type, intake_date, planned_completion_date, expected_completion_date, planned_exit_date, expected_exit_date, current_stage_id, current_process_id, progress, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$7,$8,$9,$10,0,\'IN_PROGRESS\') RETURNING *', [id, tankNumber, ohNumber, profile, type, intakeDate, plannedCompletionDate, expectedCompletionDate, currentStageId, currentProcessId]);
  emitOperationalEvent('tank.updated', { tankId: id, processId: currentProcessId, action: 'created' });
  response.status(201).json(result.rows[0]);
});

app.patch('/api/tanks/:id', requireOperationalRole, async (request, response) => {
  const allowed = new Set(['planned_completion_date', 'expected_completion_date', 'actual_completion_date', 'planned_exit_date', 'expected_exit_date', 'actual_exit_date', 'current_stage_id', 'current_process_id', 'bay_id', 'gang_id', 'progress', 'status']);
  const updates = Object.entries(request.body as Record<string, unknown>).filter(([key]) => allowed.has(key));
  if (!updates.length) return response.status(400).json({ error: 'No editable fields supplied' });
  const values = updates.map(([, value]) => value);
  values.push(request.params.id);
  const setClause = updates.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  const result = await query(`UPDATE tanks SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values);
  if (!result.rowCount) return response.status(404).json({ error: 'Tank not found' });
  const tank = result.rows[0] as { id: string; current_process_id: string; status: string; progress: number };
  emitOperationalEvent('tank.updated', { tankId: tank.id, processId: tank.current_process_id });
  if (updates.some(([key]) => key === 'status')) emitOperationalEvent('tank.status_changed', { tankId: tank.id, status: tank.status });
  if (updates.some(([key]) => key === 'progress')) emitOperationalEvent('tank.progress_changed', { tankId: tank.id, progress: tank.progress });
  response.json(result.rows[0]);
});

app.get('/api/processes', async (_request, response) => response.json((await query(`SELECT p.*, s.number AS stage_number, s.short_name AS stage_name,
  COALESCE((SELECT json_agg(pd.predecessor_id ORDER BY pd.predecessor_id) FROM process_dependencies pd WHERE pd.process_id = p.id), '[]'::json) AS predecessors,
  COALESCE((SELECT json_agg(sd.process_id ORDER BY sd.process_id) FROM process_dependencies sd WHERE sd.predecessor_id = p.id), '[]'::json) AS successors
  FROM processes p JOIN stages s ON s.id = p.stage_id ORDER BY p.process_number`)).rows));
app.get('/api/processes/:id', async (request, response) => {
  const result = await query('SELECT * FROM processes WHERE id = $1', [request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Process not found' });
  response.json(result.rows[0]);
});
app.get('/api/tanks/:id/processes', async (request, response) => {
  if (request.query.assignedToMe === 'true') {
    if (!request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    if (request.user.gangIds.length === 0) return response.json([]);
    return response.json((await query('SELECT tp.*, p.name, p.process_number FROM tank_processes tp JOIN processes p ON p.id = tp.process_id JOIN tanks t ON t.id = tp.tank_id WHERE tp.tank_id = $1 AND t.gang_id = ANY($2::text[]) ORDER BY p.process_number', [request.params.id, request.user.gangIds])).rows);
  }
  response.json((await query('SELECT tp.*, p.name, p.process_number FROM tank_processes tp JOIN processes p ON p.id = tp.process_id WHERE tp.tank_id = $1 ORDER BY p.process_number', [request.params.id])).rows);
});
app.patch('/api/tank-processes/:id', requireOperationalRole, async (request, response) => {
  const result = await query('UPDATE tank_processes SET status = COALESCE($1,status), progress = COALESCE($2,progress), remarks = COALESCE($3,remarks), updated_at = NOW() WHERE id = $4 RETURNING *', [request.body.status?.toUpperCase(), request.body.progress, request.body.remarks, request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Tank process not found' });
  const tankProcess = result.rows[0] as { tank_id: string; process_id: string; status: string; progress: number };
  emitOperationalEvent('process.updated', { tankId: tankProcess.tank_id, processId: tankProcess.process_id, status: tankProcess.status, progress: tankProcess.progress });
  response.json(result.rows[0]);
});
app.get('/api/bays', async (_request, response) => response.json((await query(`
  SELECT b.*,
    COALESCE(json_agg(t.id) FILTER (WHERE t.id IS NOT NULL), '[]'::json) AS current_tank_ids,
    COUNT(t.id)::int AS occupied_count
  FROM bays b
  LEFT JOIN tanks t ON t.bay_id = b.id
  GROUP BY b.id
  ORDER BY b.number
`)).rows));
app.get('/api/stages', async (_request, response) => response.json((await query('SELECT * FROM stages ORDER BY number')).rows));
app.get('/api/bays/:id', async (request, response) => response.json((await query('SELECT * FROM bays WHERE id = $1', [request.params.id])).rows[0] ?? null));
app.get('/api/gangs', async (_request, response) => response.json((await query('SELECT * FROM gangs ORDER BY name')).rows));
app.get('/api/personnel', async (_request, response) => response.json((await query('SELECT * FROM personnel ORDER BY name')).rows));

app.get('/api/inspections', async (request, response) => {
  const assignedOnly = request.query.assignedToMe === 'true';
  if (assignedOnly && !request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  const values: unknown[] = [];
  const assignment = assignedOnly
    ? request.user?.gangIds.length
      ? (values.push(request.user.gangIds), 'AND t.gang_id = ANY($1::text[])')
      : 'AND FALSE'
    : '';
  response.json((await query(`SELECT i.* FROM inspections i JOIN tanks t ON t.id = i.tank_id WHERE TRUE ${assignment} ORDER BY i.scheduled_date`, values)).rows);
});
app.get('/api/inspections/:id', async (request, response) => response.json((await query('SELECT * FROM inspections WHERE id = $1', [request.params.id])).rows[0] ?? null));
app.post('/api/inspections', requireOperationalRole, async (request, response) => {
  const { id, tankId, processId, stageId, name, scheduledDate } = request.body;
  const result = await query('INSERT INTO inspections (id, tank_id, process_id, stage_id, name, scheduled_date, status) VALUES ($1,$2,$3,$4,$5,$6,\'PENDING\') RETURNING *', [id, tankId, processId, stageId, name, scheduledDate]);
  emitOperationalEvent('inspection.created', { tankId, processId, inspectionId: id });
  response.status(201).json(result.rows[0]);
});
app.patch('/api/inspections/:id', requireOperationalRole, async (request, response) => {
  const { status, inspector, remarks, completedDate } = request.body;
  if (status === 'FAILED') {
    const result = await withTransaction(async (client) => {
      const inspection = await client.query('UPDATE inspections SET status = $1, inspector = COALESCE($2, inspector), remarks = COALESCE($3, remarks), completed_date = COALESCE($4, CURRENT_DATE), updated_at = NOW() WHERE id = $5 RETURNING *', [status, inspector, remarks, completedDate, request.params.id]);
      if (!inspection.rowCount) throw new Error('Inspection not found');
      const inspectionRow = inspection.rows[0] as { tank_id: string; process_id: string; stage_id: string };
      const defectId = `DEF-${Date.now()}`;
      await client.query('INSERT INTO defects (id, tank_id, process_id, stage_id, category, severity, description, assigned_to, created_date, target_date, status) VALUES ($1,$2,$3,$4,\'Inspection\',\'MAJOR\',\'Inspection failed; corrective action required\',\'QC\',CURRENT_DATE,CURRENT_DATE + 7,\'OPEN\')', [defectId, inspectionRow.tank_id, inspectionRow.process_id, inspectionRow.stage_id]);
      await client.query('INSERT INTO activity_logs (id, tank_id, process_id, action, performed_by, details) VALUES ($1,$2,$3,\'Inspection failed\',$4,$5)', [`ACT-${Date.now()}`, inspectionRow.tank_id, inspectionRow.process_id, request.user?.id ?? 'system', defectId]);
      await client.query('INSERT INTO notifications (id, type, title, message, tank_id, created_at) VALUES ($1,\'ALERT\',\'Inspection failed\',$2,$3,NOW())', [`NOT-${Date.now()}`, `Inspection ${request.params.id} failed; defect ${defectId} created.`, inspectionRow.tank_id]);
      return inspection.rows[0];
    });
    const inspection = result as { id: string; tank_id: string; process_id: string };
    emitOperationalEvent('inspection.failed', { inspectionId: inspection.id, tankId: inspection.tank_id, processId: inspection.process_id });
    emitOperationalEvent('defect.created', { tankId: inspection.tank_id, processId: inspection.process_id });
    return response.json(result);
  }
  const result = await query('UPDATE inspections SET status = COALESCE($1, status), inspector = COALESCE($2, inspector), remarks = COALESCE($3, remarks), completed_date = COALESCE($4, completed_date), updated_at = NOW() WHERE id = $5 RETURNING *', [status, inspector, remarks, completedDate, request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Inspection not found' });
  const inspection = result.rows[0] as { id: string; tank_id: string; process_id: string };
  emitOperationalEvent('inspection.updated', { inspectionId: inspection.id, tankId: inspection.tank_id, processId: inspection.process_id });
  response.json(result.rows[0]);
});

app.get('/api/defects', async (request, response) => {
  const assignedOnly = request.query.assignedToMe === 'true';
  if (assignedOnly && !request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  const values: unknown[] = [];
  const assignment = assignedOnly
    ? request.user?.gangIds.length
      ? (values.push(request.user.gangIds), 'AND t.gang_id = ANY($1::text[])')
      : 'AND FALSE'
    : '';
  response.json((await query(`SELECT d.* FROM defects d JOIN tanks t ON t.id = d.tank_id WHERE TRUE ${assignment} ORDER BY d.created_date DESC`, values)).rows);
});
app.get('/api/defects/:id', async (request, response) => response.json((await query('SELECT * FROM defects WHERE id = $1', [request.params.id])).rows[0] ?? null));
app.post('/api/defects', requireOperationalRole, async (request, response) => {
  const { id, tankId, processId, stageId, category, severity, description, assignedTo, targetDate } = request.body;
  const result = await query('INSERT INTO defects (id, tank_id, process_id, stage_id, category, severity, description, assigned_to, created_date, target_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,$9,\'OPEN\') RETURNING *', [id, tankId, processId, stageId, category, severity, description, assignedTo, targetDate]);
  emitOperationalEvent('defect.created', { defectId: id, tankId, processId });
  response.status(201).json(result.rows[0]);
});
app.patch('/api/defects/:id', requireOperationalRole, async (request, response) => {
  const result = await query('UPDATE defects SET status = COALESCE($1,status), resolution = COALESCE($2,resolution), remarks = COALESCE($3,remarks), updated_at = NOW() WHERE id = $4 RETURNING *', [request.body.status, request.body.resolution, request.body.remarks, request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Defect not found' });
  const defect = result.rows[0] as { id: string; tank_id: string; process_id: string; status: string };
  emitOperationalEvent(defect.status === 'CLOSED' ? 'defect.closed' : 'defect.updated', { defectId: defect.id, tankId: defect.tank_id, processId: defect.process_id, status: defect.status });
  response.json(result.rows[0]);
});
app.get('/api/road-trials', async (request, response) => {
  const assignedOnly = request.query.assignedToMe === 'true';
  if (assignedOnly && !request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  const values: unknown[] = [];
  const assignment = assignedOnly
    ? request.user?.gangIds.length
      ? (values.push(request.user.gangIds), 'AND t.gang_id = ANY($1::text[])')
      : 'AND FALSE'
    : '';
  response.json((await query(`SELECT r.* FROM road_trials r JOIN tanks t ON t.id = r.tank_id WHERE TRUE ${assignment} ORDER BY r.scheduled_date`, values)).rows);
});
app.patch('/api/road-trials/:id', requireOperationalRole, async (request, response) => {
  const result = await query('UPDATE road_trials SET status = COALESCE($1,status), conducted_date = COALESCE($2,conducted_date), distance = COALESCE($3,distance), result = COALESCE($4,result), remarks = COALESCE($5,remarks) WHERE id = $6 RETURNING *', [request.body.status?.toUpperCase(), request.body.conductedDate, request.body.distance, request.body.result, request.body.remarks, request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Road trial not found' });
  const roadTrial = result.rows[0] as { tank_id: string };
  emitOperationalEvent('road_trial.updated', { tankId: roadTrial.tank_id, roadTrialId: request.params.id });
  response.json(result.rows[0]);
});
app.get('/api/jri', async (request, response) => {
  const assignedOnly = request.query.assignedToMe === 'true';
  if (assignedOnly && !request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  const values: unknown[] = [];
  const assignment = assignedOnly
    ? request.user?.gangIds.length
      ? (values.push(request.user.gangIds), 'AND t.gang_id = ANY($1::text[])')
      : 'AND FALSE'
    : '';
  response.json((await query(`SELECT j.* FROM jri_records j JOIN tanks t ON t.id = j.tank_id WHERE TRUE ${assignment} ORDER BY j.scheduled_date`, values)).rows);
});
app.get('/api/handover', async (request, response) => {
  const assignedOnly = request.query.assignedToMe === 'true';
  if (assignedOnly && !request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  const values: unknown[] = [];
  const assignment = assignedOnly
    ? request.user?.gangIds.length
      ? (values.push(request.user.gangIds), 'AND t.gang_id = ANY($1::text[])')
      : 'AND FALSE'
    : '';
  response.json((await query(`SELECT h.* FROM handover_records h JOIN tanks t ON t.id = h.tank_id WHERE TRUE ${assignment} ORDER BY h.handover_date NULLS LAST`, values)).rows);
});
app.patch('/api/handover/:id', requireOperationalRole, async (request, response) => {
  const result = await query('UPDATE handover_records SET status = COALESCE($1,status), handover_date = COALESCE($2,handover_date), dispatch_date = COALESCE($3,dispatch_date), remarks = COALESCE($4,remarks) WHERE id = $5 RETURNING *', [request.body.status?.toUpperCase(), request.body.handoverDate, request.body.dispatchDate, request.body.remarks, request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Handover record not found' });
  const handover = result.rows[0] as { tank_id: string };
  emitOperationalEvent('handover.updated', { tankId: handover.tank_id, handoverId: request.params.id });
  response.json(result.rows[0]);
});
app.patch('/api/jri/:id', requireOperationalRole, async (request, response) => {
  const result = await query('UPDATE jri_records SET status = COALESCE($1,status), conducted_date = COALESCE($2,conducted_date), remarks = COALESCE($3,remarks), handover_date = COALESCE($4,handover_date), dispatch_date = COALESCE($5,dispatch_date) WHERE id = $6 RETURNING *', [request.body.status?.toUpperCase(), request.body.conductedDate, request.body.remarks, request.body.handoverDate, request.body.dispatchDate, request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'JRI record not found' });
  const jri = result.rows[0] as { tank_id: string };
  emitOperationalEvent('jri.updated', { tankId: jri.tank_id, jriId: request.params.id });
  response.json(result.rows[0]);
});

app.post('/api/process-updates', requireOperationalRole, async (request, response) => {
  const { tankId, processId, progress, status, remarks, delayReason } = request.body;
  const numericProgress = asNumber(progress);
  if (!tankId || !processId || numericProgress === undefined || !status) return response.status(400).json({ error: 'Missing process update fields' });
  const result = await withTransaction(async (client) => {
    const tankProcess = await client.query('UPDATE tank_processes SET status = $1, progress = $2, remarks = $3, delay_days = CASE WHEN $4::text IS NULL OR $4::text = \'\' THEN delay_days ELSE delay_days + 1 END, updated_at = NOW() WHERE tank_id = $5 AND process_id = $6 RETURNING *', [status.toUpperCase(), numericProgress, remarks ?? null, delayReason ?? null, tankId, processId]);
    if (!tankProcess.rowCount) throw new Error('Tank process not found');
    const normalizedStatus = status.toUpperCase();
    let tankStatus = normalizedStatus;
    if (normalizedStatus === 'BLOCKED') tankStatus = 'CRITICAL';
    if (normalizedStatus === 'DELAYED') tankStatus = 'WARNING';
    const tank = await client.query('UPDATE tanks SET current_process_id = $1, progress = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *', [processId, numericProgress, tankStatus, tankId]);
    await client.query('INSERT INTO production_updates (id, tank_id, process_id, previous_status, current_status, progress, updated_by, remarks, delay_reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [`PU-${Date.now()}`, tankId, processId, tankProcess.rows[0].status, status.toUpperCase(), numericProgress, request.user?.id ?? 'system', remarks ?? null, delayReason ?? null]);
    await client.query('INSERT INTO activity_logs (id, tank_id, process_id, action, performed_by, details) VALUES ($1,$2,$3,\'Process updated\',$4,$5)', [`ACT-${Date.now()}`, tankId, processId, request.user?.id ?? 'system', remarks ?? delayReason ?? null]);
    return tank.rows[0];
  });
  emitOperationalEvent('production.updated', { tankId, processId, status: status.toUpperCase(), progress: numericProgress });
  emitOperationalEvent('activity.created', { tankId, processId, action: 'Process updated' });
  response.status(201).json(result);
});

app.get('/api/production-updates', async (request, response) => {
  const assignedOnly = request.query.assignedToMe === 'true';
  if (assignedOnly && !request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  const values: unknown[] = [];
  const assignment = assignedOnly
    ? request.user?.gangIds.length
      ? (values.push(request.user.gangIds), 'AND t.gang_id = ANY($1::text[])')
      : 'AND FALSE'
    : '';
  response.json((await query(`SELECT u.* FROM production_updates u JOIN tanks t ON t.id = u.tank_id WHERE TRUE ${assignment} ORDER BY u.created_at DESC`, values)).rows);
});

app.get('/api/notifications', async (request, response) => response.json((await query('SELECT * FROM notifications WHERE user_id IS NULL OR user_id = $1 ORDER BY created_at DESC', [request.user?.id ?? null])).rows));
app.patch('/api/notifications/:id/read', requireOperationalRole, async (request, response) => response.json((await query('UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *', [request.params.id])).rows[0] ?? null));
app.patch('/api/notifications/read-all', requireOperationalRole, async (request, response) => { await query('UPDATE notifications SET read = TRUE WHERE user_id IS NULL OR user_id = $1', [request.user?.id ?? null]); response.status(204).send(); });
app.get('/api/activity', async (request, response) => {
  const assignedOnly = request.query.assignedToMe === 'true';
  if (assignedOnly && !request.user) return response.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  const values: unknown[] = [];
  const assignment = assignedOnly
    ? request.user?.gangIds.length
      ? (values.push(request.user.gangIds), 'AND t.gang_id = ANY($1::text[])')
      : 'AND FALSE'
    : '';
  response.json((await query(`SELECT a.* FROM activity_logs a JOIN tanks t ON t.id = a.tank_id WHERE TRUE ${assignment} ORDER BY a.timestamp DESC`, values)).rows);
});
app.get('/api/reports/production', async (_request, response) => response.json((await query('SELECT status, COUNT(*)::int AS count, ROUND(AVG(progress))::int AS average_progress FROM tanks GROUP BY status ORDER BY status')).rows));
app.get('/api/reports/defects', async (_request, response) => response.json((await query('SELECT severity, status, COUNT(*)::int AS count FROM defects GROUP BY severity, status ORDER BY severity, status')).rows));
app.get('/api/reports/inspections', async (_request, response) => response.json((await query('SELECT status, COUNT(*)::int AS count FROM inspections GROUP BY status ORDER BY status')).rows));

app.use((error: Error, _request: Request, response: Response, _next: unknown) => {
  // Structured error log — never interpolate user input directly
  console.error(JSON.stringify({ event: 'server_error', message: error.message, stack: error.stack?.split('\n')[0] }));
  response.status(500).json({ error: 'Workshop server error' });
});
