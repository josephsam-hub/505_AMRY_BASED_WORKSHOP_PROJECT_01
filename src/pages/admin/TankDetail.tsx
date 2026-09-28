import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Layers, AlertTriangle, ClipboardCheck, Clock } from 'lucide-react';
import { TankJourney } from '../../components/tank/TankJourney';
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

function InfoRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-tertiary w-36 flex-shrink-0">{label}</span>
      <span className="text-xs text-text-primary text-right">{value}</span>
    </div>
  );
}

export default function TankDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tank, setTank] = useState<Tank | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailStages, setDetailStages] = useState<Stage[]>([]);
  const [detailProcesses, setDetailProcesses] = useState<Process[]>([]);
  const [detailBays, setDetailBays] = useState<Bay[]>([]);
  const [detailGangs, setDetailGangs] = useState<Gang[]>([]);
  const [tankDefects, setTankDefects] = useState<Defect[]>([]);
  const [tankInspections, setTankInspections] = useState<Inspection[]>([]);
  const [tankActivity, setTankActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (!id) return;
    productionService.getTankById(id).then(setTank).catch((error: Error) => setLoadError(error.message));
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
      setTankInspections(inspections.filter((item) => item.tankId === tank.id));
      setTankDefects(defects.filter((item) => item.tankId === tank.id));
      setTankActivity(activity.filter((item) => item.tankId === tank.id));
      setDetailProcesses(processes);
      setDetailStages(stages);
      setDetailBays(bays);
      setDetailGangs(gangs);
    }).catch((error: Error) => setLoadError(error.message));
  }, [tank]);

  if (loadError) return <div className="p-6 text-status-critical">Database unavailable: {loadError}</div>;
  if (!tank) return <div className="p-6 text-text-secondary">Loading tank record...</div>;

  const stage = detailStages.find((s) => s.id === tank.currentStageId);
  const process = detailProcesses.find((p) => p.id === tank.currentProcessId);
  const bay = tank.currentBayId ? detailBays.find((b) => b.id === tank.currentBayId) : null;
  const gang = tank.assignedGangId ? detailGangs.find((g) => g.id === tank.assignedGangId) : null;

  return (
    <div className="p-6 flex flex-col gap-5 max-w-5xl">
      {/* Back + header */}
      <div>
        <button className="btn-ghost mb-3 -ml-1" onClick={() => navigate('/admin/tanks')}>
          <ArrowLeft size={14} /> Back to Fleet
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary font-mono">T-{tank.tankNumber}</h1>
              <StatusBadge type="tank" value={tank.status} />
            </div>
            <div className="text-sm text-text-secondary mt-1">{tank.ohNumber} · {tank.type} · {tank.profile}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums text-text-primary">{tank.overallProgress}%</div>
            <div className="text-xs text-text-tertiary">Overall Progress</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressBarClass(tank.overallProgress)}`}
            style={{ width: `${tank.overallProgress}%` }}
          />
        </div>
      </div>

      {/* Tank Journey */}
      <TankJourney tank={tank} />

      {/* Identity + Location grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identity */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Identity & Schedule</span>
          </div>
          <InfoRow label="Tank Number" value={<span className="font-mono">T-{tank.tankNumber}</span>} />
          <InfoRow label="OH Number" value={tank.ohNumber} />
          <InfoRow label="Type" value={tank.type} />
          <InfoRow label="Profile" value={tank.profile} />
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

        {/* Current location */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Current Location & Assignment</span>
          </div>
          <InfoRow label="Current Stage" value={`Stage ${stage?.number} — ${stage?.shortName}`} />
          <InfoRow label="Current Process" value={process?.name ?? '—'} />
          <InfoRow label="Process #" value={process ? `P${String(process.processNumber).padStart(2, '0')}` : '—'} />
          <InfoRow label="Path Type" value={
            process?.pathType === 'CRITICAL'
              ? <span className="text-status-critical text-xs font-medium">Critical Path</span>
              : <span className="text-text-secondary text-xs">Non-Critical</span>
          } />
          <InfoRow label="Bay" value={bay?.name ?? <span className="text-text-tertiary">Not allocated</span>} />
          <InfoRow label="Gang" value={gang?.name ?? <span className="text-text-tertiary">Not assigned</span>} />

          {tank.blockerReason && (
            <div className="mt-3 flex items-start gap-2 bg-status-critical-bg border border-status-critical-border rounded p-2.5">
              <AlertTriangle size={13} className="text-status-critical flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-status-critical mb-0.5">Blocker</div>
                <div className="text-xs text-status-critical">{tank.blockerReason}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspections */}
      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <ClipboardCheck size={13} className="text-accent" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Inspections</span>
          <span className="ml-auto text-2xs text-text-tertiary">{tankInspections.length} records</span>
        </div>
        {tankInspections.length === 0 ? (
          <div className="px-4 py-5 text-sm text-text-tertiary">No inspection records.</div>
        ) : (
          <div className="divide-y divide-border">
                      {tankInspections.map((insp) => (
              <div key={insp.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">{insp.name}</div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {formatDate(insp.scheduledDate)}
                    {insp.inspector && ` · ${insp.inspector}`}
                  </div>
                  {insp.remarks && <div className="text-xs text-text-secondary mt-1">{insp.remarks}</div>}
                  {insp.failureReasons && insp.failureReasons.length > 0 && (
                    <ul className="mt-1 list-disc list-inside">
                      {insp.failureReasons.map((reason) => (
                        <li key={reason} className="text-xs text-status-critical">{reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <StatusBadge type="inspection" value={insp.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Defects */}
      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <AlertTriangle size={13} className="text-status-warning" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Defects</span>
          <span className="ml-auto text-2xs text-text-tertiary">{tankDefects.length} records</span>
        </div>
        {tankDefects.length === 0 ? (
          <div className="px-4 py-5 text-sm text-text-tertiary">No defect records.</div>
        ) : (
          <div className="divide-y divide-border">
            {tankDefects.map((d) => (
              <div key={d.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
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
                {d.remarks && <div className="text-xs text-text-tertiary mt-1">{d.remarks}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Clock size={13} className="text-accent" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Activity Timeline</span>
        </div>
        {tankActivity.length === 0 ? (
          <div className="px-4 py-5 text-sm text-text-tertiary">No activity recorded.</div>
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

      {/* Remarks */}
      {tank.remarks && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Remarks</div>
          <p className="text-sm text-text-secondary">{tank.remarks}</p>
        </div>
      )}
    </div>
  );
}
