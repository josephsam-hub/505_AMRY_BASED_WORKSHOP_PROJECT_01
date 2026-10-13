import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Layers, AlertTriangle, ClipboardCheck, Clock, Activity } from 'lucide-react';
import { TankJourney } from '../../components/tank/TankJourney';
import { TankTwin } from '../../components/tank/TankTwin';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { getProgressBarClass } from '../../utils/statusUtils';
import { productionService } from '../../services/productionService';
import type { ActivityLog, Bay, Defect, Gang, Inspection, Process, Stage, Tank } from '../../models';
import { inspectionService } from '../../services/api/inspectionService';
import { defectService } from '../../services/api/defectService';
import { activityService } from '../../services/api/activityService';
import { processService } from '../../services/api/processService';
import { resourceService } from '../../services/api/resourceService';
import { useDataModeStore } from '../../store/useDataModeStore';

type Tab = 'overview' | 'production' | 'inspections' | 'defects' | 'timeline';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'OVERVIEW',    icon: <Layers size={12} /> },
  { id: 'production',  label: 'PRODUCTION',  icon: <Activity size={12} /> },
  { id: 'inspections', label: 'INSPECTIONS', icon: <ClipboardCheck size={12} /> },
  { id: 'defects',     label: 'DEFECTS',     icon: <AlertTriangle size={12} /> },
  { id: 'timeline',    label: 'TIMELINE',    icon: <Clock size={12} /> },
];

function InfoRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-tertiary w-40 flex-shrink-0">{label}</span>
      <span className="text-xs text-text-primary text-right">{value}</span>
    </div>
  );
}

export default function TankDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [tank, setTank] = useState<Tank | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailStages, setDetailStages] = useState<Stage[]>([]);
  const [detailProcesses, setDetailProcesses] = useState<Process[]>([]);
  const [detailBays, setDetailBays] = useState<Bay[]>([]);
  const [detailGangs, setDetailGangs] = useState<Gang[]>([]);
  const [tankDefects, setTankDefects] = useState<Defect[]>([]);
  const [tankInspections, setTankInspections] = useState<Inspection[]>([]);
  const [tankActivity, setTankActivity] = useState<ActivityLog[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const { mode } = useDataModeStore();

  useEffect(() => {
    if (!id) return;
    productionService.getTankById(id).then(setTank).catch((e: Error) => setLoadError(e.message));
  }, [id]);

  useEffect(() => {
    if (!tank) return;
    void Promise.all([
      inspectionService.getInspections(),
      defectService.getDefects(),
      activityService.getActivity(),
      processService.getProcesses(),
      resourceService.getStages(),
      resourceService.getBays(),
      resourceService.getGangs(),
    ]).then(([inspections, defects, activity, processes, stages, bays, gangs]) => {
      setTankInspections(inspections.filter((i) => i.tankId === tank.id));
      setTankDefects(defects.filter((d) => d.tankId === tank.id));
      setTankActivity(activity.filter((a) => a.tankId === tank.id));
      setDetailProcesses(processes);
      setDetailStages(stages);
      setDetailBays(bays);
      setDetailGangs(gangs);
    }).catch((e: Error) => setLoadError(e.message));
  }, [tank]);

  if (loadError) return <div className="p-6 text-status-critical text-sm">Database unavailable: {loadError}</div>;
  if (!tank) return (
    <div className="p-6 flex flex-col gap-3">
      {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse" />)}
    </div>
  );

  const stage = detailStages.find((s) => s.id === tank.currentStageId);
  const process = detailProcesses.find((p) => p.id === tank.currentProcessId);
  const bay = tank.currentBayId ? detailBays.find((b) => b.id === tank.currentBayId) : null;
  const gang = tank.assignedGangId ? detailGangs.find((g) => g.id === tank.assignedGangId) : null;
  const openDefects = tankDefects.filter((d) => d.status === 'open' || d.status === 'in-progress');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-1 flex-shrink-0">
        <button className="btn-ghost mb-3 -ml-1 text-xs" onClick={() => navigate('/admin/tanks')}>
          <ArrowLeft size={13} /> Back to Fleet
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary font-mono">T-{tank.tankNumber}</h1>
              <StatusBadge type="tank" value={tank.status} />
              {mode === 'SIMULATION' && (
                <span className="text-2xs font-bold text-status-warning border border-status-warning-border bg-status-warning-bg px-1.5 py-0.5 rounded uppercase tracking-wider">
                  SIMULATION
                </span>
              )}
            </div>
            <div className="text-sm text-text-secondary mt-1">{tank.ohNumber} · {tank.type} · {tank.profile}</div>
            {tank.blockerReason && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-status-critical">
                <AlertTriangle size={12} />
                <span>{tank.blockerReason}</span>
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-bold tabular-nums text-text-primary">{tank.overallProgress}%</div>
            <div className="text-xs text-text-tertiary">Overall Progress</div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressBarClass(tank.overallProgress)}`}
            style={{ width: `${tank.overallProgress}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-6 border-b border-border bg-surface-1 flex-shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
            style={{ letterSpacing: '0.1em' }}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
            {t.id === 'defects' && openDefects.length > 0 && (
              <span className="ml-1 text-2xs text-status-critical font-bold">{openDefects.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">
            <TankTwin
              tank={tank}
              processes={detailProcesses}
              stages={detailStages}
              defects={tankDefects}
              inspections={tankInspections}
              selectedArea={selectedArea}
              onAreaClick={setSelectedArea}
            />

            <div className="flex flex-col gap-4">
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={13} className="text-accent" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Identity & Schedule</span>
                </div>
                <InfoRow label="Tank Number" value={<span className="font-mono">T-{tank.tankNumber}</span>} />
                <InfoRow label="OH Number" value={tank.ohNumber} />
                <InfoRow label="Type / Profile" value={`${tank.type} · ${tank.profile}`} />
                <InfoRow label="Planned Start" value={formatDate(tank.plannedStart)} />
                <InfoRow label="Planned Completion" value={formatDate(tank.plannedCompletion)} />
                <InfoRow label="Expected Completion" value={
                  <span className={tank.delayDays > 0 ? 'text-status-warning' : 'text-text-primary'}>
                    {formatDate(tank.expectedCompletion)}
                    {tank.delayDays > 0 && ` (+${tank.delayDays}d)`}
                  </span>
                } />
                {tank.actualCompletion && (
                  <InfoRow label="Actual Completion" value={<span className="text-status-completed">{formatDate(tank.actualCompletion)}</span>} />
                )}
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={13} className="text-accent" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Current Assignment</span>
                </div>
                <InfoRow label="Stage" value={`S${stage?.number} — ${stage?.shortName ?? '—'}`} />
                <InfoRow label="Process" value={process?.name ?? '—'} />
                <InfoRow label="Process #" value={process ? `P${String(process.processNumber).padStart(2, '0')}` : '—'} />
                <InfoRow label="Path Type" value={
                  process?.pathType === 'CRITICAL'
                    ? <span className="text-status-critical text-xs font-medium">Critical Path</span>
                    : <span className="text-text-secondary text-xs">Non-Critical</span>
                } />
                <InfoRow label="Bay" value={bay?.name ?? <span className="text-text-tertiary">Not allocated</span>} />
                <InfoRow label="Gang" value={gang?.name ?? <span className="text-text-tertiary">Not assigned</span>} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Inspections', value: tankInspections.length, sub: `${tankInspections.filter((i) => i.status === 'passed').length} passed` },
                  { label: 'Defects', value: tankDefects.length, sub: `${openDefects.length} open` },
                  { label: 'Activity', value: tankActivity.length, sub: 'log entries' },
                ].map((s) => (
                  <div key={s.label} className="card p-3 text-center">
                    <div className="text-xl font-bold tabular-nums text-text-primary">{s.value}</div>
                    <div className="text-2xs font-bold text-text-tertiary uppercase tracking-wider">{s.label}</div>
                    <div className="text-2xs text-text-tertiary">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <TankJourney tank={tank} />
            </div>
          </div>
        )}

        {/* ── PRODUCTION ── */}
        {tab === 'production' && (
          <div className="max-w-3xl flex flex-col gap-4">
            <div className="card">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Current Stage Processes</span>
              </div>
              <div className="divide-y divide-border">
                {detailProcesses.filter((p) => p.stageId === tank.currentStageId).map((p) => {
                  const isCurrent = p.id === tank.currentProcessId;
                  const curStageNum = parseInt(tank.currentStageId.replace('S', ''), 10);
                  const procStageNum = parseInt(p.stageId.replace('S', ''), 10);
                  const isDone = procStageNum < curStageNum;
                  return (
                    <div key={p.id} className={`px-4 py-3 flex items-center gap-3 ${isCurrent ? 'bg-surface-2' : ''}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDone ? 'bg-status-completed' : isCurrent ? 'bg-status-active' : 'bg-surface-3'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-text-tertiary">P{String(p.processNumber).padStart(2, '0')}</span>
                          <span className="text-sm text-text-primary">{p.name}</span>
                          {isCurrent && <span className="text-2xs text-status-active font-bold">CURRENT</span>}
                          {p.pathType === 'CRITICAL' && <span className="text-2xs text-status-critical font-bold">CRIT</span>}
                        </div>
                        <div className="text-2xs text-text-tertiary mt-0.5">{p.durationDays} days planned</div>
                      </div>
                      <span className={`text-xs font-semibold ${isDone ? 'text-status-completed' : isCurrent ? 'text-status-active' : 'text-text-tertiary'}`}>
                        {isDone ? 'COMPLETE' : isCurrent ? `${tank.overallProgress}%` : 'PENDING'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── INSPECTIONS ── */}
        {tab === 'inspections' && (
          <div className="max-w-3xl">
            <div className="card">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <ClipboardCheck size={13} className="text-accent" />
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Inspections</span>
                <span className="ml-auto text-2xs text-text-tertiary">{tankInspections.length} records</span>
              </div>
              {tankInspections.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-text-tertiary font-mono">
                  {mode === 'PRODUCTION' ? 'NO VERIFIED INSPECTION DATA' : 'No inspection records for this tank.'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tankInspections.map((insp) => (
                    <div key={insp.id} className="px-4 py-3 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary">{insp.name}</div>
                        <div className="text-xs text-text-tertiary mt-0.5">
                          {formatDate(insp.scheduledDate)}{insp.inspector && ` · ${insp.inspector}`}
                        </div>
                        {insp.remarks && <div className="text-xs text-text-secondary mt-1">{insp.remarks}</div>}
                        {insp.failureReasons && insp.failureReasons.length > 0 && (
                          <ul className="mt-1 list-disc list-inside">
                            {insp.failureReasons.map((r) => <li key={r} className="text-xs text-status-critical">{r}</li>)}
                          </ul>
                        )}
                      </div>
                      <StatusBadge type="inspection" value={insp.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DEFECTS ── */}
        {tab === 'defects' && (
          <div className="max-w-3xl">
            <div className="card">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <AlertTriangle size={13} className="text-status-warning" />
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Defects</span>
                <span className="ml-auto text-2xs text-text-tertiary">{tankDefects.length} total · {openDefects.length} open</span>
              </div>
              {tankDefects.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-text-tertiary font-mono">
                  {mode === 'PRODUCTION' ? 'NO VERIFIED DEFECT DATA' : 'No defect records for this tank.'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tankDefects.map((d) => (
                    <div key={d.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-text-tertiary">{d.id}</span>
                          <span className="text-sm text-text-primary">{d.category}</span>
                          <StatusBadge type="defect-severity" value={d.severity} size="sm" />
                        </div>
                        <StatusBadge type="defect-status" value={d.status} size="sm" />
                      </div>
                      <div className="text-xs text-text-secondary">{d.description}</div>
                      <div className="flex items-center gap-4 mt-1.5 text-2xs text-text-tertiary">
                        <span>Assigned: {d.assignedTo}</span>
                        <span>Target: {formatDate(d.targetDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TIMELINE ── */}
        {tab === 'timeline' && (
          <div className="max-w-3xl">
            <div className="card">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Clock size={13} className="text-accent" />
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Activity Timeline</span>
                <span className="ml-auto text-2xs text-text-tertiary">{tankActivity.length} entries</span>
              </div>
              {tankActivity.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-text-tertiary font-mono">
                  {mode === 'PRODUCTION' ? 'NO VERIFIED TIMELINE DATA' : 'No activity recorded for this tank.'}
                </div>
              ) : (
                <div className="px-4 py-3 flex flex-col gap-3">
                  {tankActivity.map((log, idx) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
                        {idx < tankActivity.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-4" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="text-sm text-text-primary">{log.action}</div>
                        <div className="text-xs text-text-tertiary mt-0.5">{formatDateTime(log.timestamp)} · {log.performedBy}</div>
                        {log.details && <div className="text-xs text-text-secondary mt-1">{log.details}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
