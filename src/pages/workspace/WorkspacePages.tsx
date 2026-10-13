import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { useWorkspaceData } from './workspaceData';
import { useAppStore } from '../../store/useAppStore';

// ── Shared empty state ────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-6 text-center">
      <div className="text-sm text-text-tertiary">{message}</div>
      <div className="text-2xs text-text-tertiary mt-1 opacity-60">Source: Workshop PostgreSQL</div>
    </div>
  );
}

// ── My Tanks ──────────────────────────────────────────────────────────────────
export function MyTanks() {
  const navigate = useNavigate();
  const { tanks, processes, stages } = useWorkspaceData();

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">My Tanks</h1>
        <p className="page-subtitle">{tanks.length} tanks assigned to your account</p>
      </div>
      {tanks.length === 0 ? (
        <div className="card"><EmptyState message="No verified tank assignments available." /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {tanks.map((tank) => {
            const proc = processes.find((p) => p.id === tank.currentProcessId);
            const stage = stages.find((s) => s.id === tank.currentStageId);
            return (
              <div
                key={tank.id}
                className="card p-4 cursor-pointer hover:bg-surface-2 transition-colors group"
                onClick={() => navigate(`/admin/tanks/${tank.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold font-mono text-text-primary">T-{tank.tankNumber}</span>
                      <StatusBadge type="tank" value={tank.status} />
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">{tank.ohNumber} · {tank.type} · {tank.profile}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums text-text-primary">{tank.overallProgress}%</div>
                    <div className="text-2xs text-text-tertiary">Progress</div>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-status-active" style={{ width: `${tank.overallProgress}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-text-tertiary">Stage: </span><span className="text-text-secondary">{stage?.shortName ?? '—'}</span></div>
                  <div><span className="text-text-tertiary">Process: </span><span className="text-text-secondary truncate">{proc?.name ?? '—'}</span></div>
                  <div><span className="text-text-tertiary">Due: </span><span className="text-text-secondary">{formatDate(tank.plannedCompletion)}</span></div>
                  {tank.delayDays > 0 && <div><span className="text-status-warning">+{tank.delayDays}d delay</span></div>}
                </div>
                {tank.blockerReason && (
                  <div className="mt-3 flex items-start gap-1.5 bg-status-critical-bg border border-status-critical-border rounded px-2 py-1.5">
                    <AlertTriangle size={11} className="text-status-critical flex-shrink-0 mt-0.5" />
                    <span className="text-2xs text-status-critical">{tank.blockerReason}</span>
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <ArrowRight size={13} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Today's Tasks ─────────────────────────────────────────────────────────────
export function Tasks() {
  const navigate = useNavigate();
  const { tanks, processes, stages } = useWorkspaceData();
  const tasks = tanks.map((t) => ({
    tank: t,
    process: processes.find((p) => p.id === t.currentProcessId),
    stage: stages.find((s) => s.id === t.currentStageId),
  }));
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Today's Tasks</h1>
        <p className="page-subtitle">{today}</p>
      </div>
      {tasks.length === 0 ? (
        <div className="card"><EmptyState message="No active task assignments available." /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map(({ tank, process, stage }) => (
            <div
              key={tank.id}
              className="card p-4 cursor-pointer hover:bg-surface-2 transition-colors"
              onClick={() => navigate(`/admin/tanks/${tank.id}`)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-1 self-stretch rounded-full ${tank.status === 'critical' ? 'bg-status-critical' : tank.status === 'warning' ? 'bg-status-warning' : 'bg-status-active'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-text-primary">T-{tank.tankNumber}</span>
                    <StatusBadge type="tank" value={tank.status} size="sm" />
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">{process?.name ?? '—'}</div>
                  <div className="text-2xs text-text-tertiary">Stage {stage?.number} — {stage?.shortName}</div>
                </div>
                <ArrowRight size={13} className="text-text-tertiary" />
              </div>
              {tank.blockerReason && (
                <div className="flex items-start gap-1.5 bg-status-warning-bg border border-status-warning-border rounded px-2 py-1.5 ml-4">
                  <AlertTriangle size={11} className="text-status-warning flex-shrink-0 mt-0.5" />
                  <span className="text-2xs text-status-warning">{tank.blockerReason}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Process Updates ───────────────────────────────────────────────────────────
export function ProcessUpdates() {
  const navigate = useNavigate();
  const { tanks, processes, updates } = useWorkspaceData();

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Process Updates</h1>
        <p className="page-subtitle">Current process status for your assigned tanks</p>
      </div>
      {tanks.length === 0 ? (
        <div className="card"><EmptyState message="No verified process update records available." /></div>
      ) : (
        <div className="card divide-y divide-border">
          {tanks.map((tank) => {
            const proc = processes.find((p) => p.id === tank.currentProcessId);
            const predecessors = (proc?.predecessors ?? []).map((id) => processes.find((p) => p.id === id));
            const successors = (proc?.successors ?? []).map((id) => processes.find((p) => p.id === id));
            const latestUpdate = updates.filter((u) => u.tankId === tank.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
            return (
              <div key={tank.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    className="font-mono font-semibold text-text-primary hover:text-status-active transition-colors"
                    onClick={() => navigate(`/admin/tanks/${tank.id}`)}
                  >
                    T-{tank.tankNumber}
                  </button>
                  <StatusBadge type="tank" value={tank.status} size="sm" />
                </div>
                <div className="text-sm text-text-primary mb-1">{proc?.name ?? '—'}</div>
                <div className="text-xs text-text-tertiary mb-3">
                  P{String(proc?.processNumber ?? 0).padStart(2, '0')} · {proc?.durationDays} days · {proc?.pathType === 'CRITICAL' ? 'Critical Path' : 'Non-Critical'}
                </div>
                {predecessors.length > 0 && (
                  <div className="text-xs text-text-tertiary mb-1">← Preceded by: {predecessors.map((p) => p?.name).join(', ')}</div>
                )}
                {successors.length > 0 && (
                  <div className="text-xs text-text-tertiary">→ Followed by: {successors.map((p) => p?.name).join(', ')}</div>
                )}
                {latestUpdate && (
                  <div className="mt-2 text-2xs text-text-tertiary">
                    Last update: {formatDateTime(latestUpdate.updatedAt)} · {latestUpdate.updatedBy}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { inspectionService } from '../../services/api/inspectionService';
import { defectService } from '../../services/api/defectService';
import { Plus, Check, X } from 'lucide-react';

// ── User Inspections ──────────────────────────────────────────────────────────
export function UserInspections() {
  const navigate = useNavigate();
  const { inspections, tanks } = useWorkspaceData();
  const [modalOpen, setModalOpen] = useState(false);
  const [tankId, setTankId] = useState('');
  const [name, setName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedTank = tanks.find((t) => t.id === tankId);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankId || !name) return;
    try {
      await inspectionService.createInspection({
        tankId,
        processId: selectedTank?.currentProcessId ?? 'P01',
        stageId: selectedTank?.currentStageId ?? 'S1',
        name,
        scheduledDate,
      });
      setModalOpen(false);
      setName('');
      window.dispatchEvent(new CustomEvent('workshop:refresh', { detail: { eventName: 'inspection.created' } }));
    } catch (err) {
      console.error('Failed to request inspection:', err);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'passed' | 'failed') => {
    try {
      await inspectionService.updateInspection(id, {
        status,
        inspector: 'QC Duty Officer',
        remarks: status === 'passed' ? 'All inspection criteria satisfied' : 'Checklist non-compliance detected',
      });
      window.dispatchEvent(new CustomEvent('workshop:refresh', { detail: { eventName: 'inspection.updated' } }));
    } catch (err) {
      console.error('Failed to update inspection:', err);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inspections</h1>
          <p className="page-subtitle">Inspection records for your assigned tanks</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Request Inspection
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card p-5 max-w-md w-full flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Request Inspection</span>
              <button className="btn-ghost px-1.5 py-1" onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleRequest} className="flex flex-col gap-3">
              <div>
                <label className="text-2xs text-text-tertiary uppercase font-bold block mb-1">Select Tank</label>
                <select className="select-field w-full" value={tankId} onChange={(e) => setTankId(e.target.value)} required>
                  <option value="">-- Choose Tank --</option>
                  {tanks.map((t) => <option key={t.id} value={t.id}>T-{t.tankNumber} ({t.ohNumber})</option>)}
                </select>
              </div>
              <div>
                <label className="text-2xs text-text-tertiary uppercase font-bold block mb-1">Inspection Title</label>
                <input className="input-field w-full" placeholder="e.g. Semi-Final Quality Clearance" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="text-2xs text-text-tertiary uppercase font-bold block mb-1">Scheduled Date</label>
                <input type="date" className="input-field w-full" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card divide-y divide-border">
        {inspections.length === 0 ? (
          <EmptyState message="No verified inspection records available." />
        ) : inspections.map((insp) => {
          const tank = tanks.find((t) => t.id === insp.tankId);
          return (
            <div key={insp.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    className="font-mono text-sm font-semibold text-text-primary hover:text-status-active transition-colors"
                    onClick={() => navigate(`/admin/tanks/${insp.tankId}`)}
                  >
                    T-{tank?.tankNumber ?? insp.tankId}
                  </button>
                  <span className="text-xs text-text-secondary">{insp.name}</span>
                </div>
                <div className="text-xs text-text-tertiary">
                  Scheduled: {formatDate(insp.scheduledDate)}{insp.inspector && ` · ${insp.inspector}`}
                </div>
                {insp.remarks && <div className="text-xs text-text-secondary mt-1">{insp.remarks}</div>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge type="inspection" value={insp.status} size="sm" />
                {insp.status === 'pending' && (
                  <div className="flex items-center gap-1 ml-2">
                    <button className="btn-success px-2 py-1 text-2xs font-bold" onClick={() => handleStatusUpdate(insp.id, 'passed')} title="Pass Inspection">
                      <Check size={11} className="inline mr-0.5" /> Pass
                    </button>
                    <button className="btn-danger px-2 py-1 text-2xs font-bold" onClick={() => handleStatusUpdate(insp.id, 'failed')} title="Fail Inspection">
                      <X size={11} className="inline mr-0.5" /> Fail
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── User Defects ──────────────────────────────────────────────────────────────
export function UserDefects() {
  const navigate = useNavigate();
  const { defects, tanks } = useWorkspaceData();
  const [modalOpen, setModalOpen] = useState(false);
  const [tankId, setTankId] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mechanical');
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor'>('major');

  const selectedTank = tanks.find((t) => t.id === tankId);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankId || !description) return;
    try {
      await defectService.createDefect({
        tankId,
        processId: selectedTank?.currentProcessId ?? 'P01',
        stageId: selectedTank?.currentStageId ?? 'S1',
        category,
        severity,
        description,
        assignedTo: 'Assigned Gang Lead',
        targetDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });
      setModalOpen(false);
      setDescription('');
      window.dispatchEvent(new CustomEvent('workshop:refresh', { detail: { eventName: 'defect.created' } }));
    } catch (err) {
      console.error('Failed to report defect:', err);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: any) => {
    try {
      await defectService.updateDefect(id, {
        status: nextStatus,
        remarks: `Updated to ${nextStatus} by Workstation operator`,
      });
      window.dispatchEvent(new CustomEvent('workshop:refresh', { detail: { eventName: 'defect.updated' } }));
    } catch (err) {
      console.error('Failed to update defect status:', err);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Defects</h1>
          <p className="page-subtitle">Defects on your assigned tanks</p>
        </div>
        <button className="btn-danger flex items-center gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Report Defect
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card p-5 max-w-md w-full flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Report New Defect</span>
              <button className="btn-ghost px-1.5 py-1" onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleReport} className="flex flex-col gap-3">
              <div>
                <label className="text-2xs text-text-tertiary uppercase font-bold block mb-1">Select Tank</label>
                <select className="select-field w-full" value={tankId} onChange={(e) => setTankId(e.target.value)} required>
                  <option value="">-- Choose Tank --</option>
                  {tanks.map((t) => <option key={t.id} value={t.id}>T-{t.tankNumber} ({t.ohNumber})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-text-tertiary uppercase font-bold block mb-1">Category</label>
                  <select className="select-field w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Hull">Hull / Structure</option>
                    <option value="Armament">Armament</option>
                    <option value="Transmission">Transmission</option>
                  </select>
                </div>
                <div>
                  <label className="text-2xs text-text-tertiary uppercase font-bold block mb-1">Severity</label>
                  <select className="select-field w-full" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-2xs text-text-tertiary uppercase font-bold block mb-1">Defect Description</label>
                <textarea className="input-field w-full min-h-20" placeholder="Detail observed malfunction or damage..." value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-danger">Log Defect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card divide-y divide-border">
        {defects.length === 0 ? (
          <EmptyState message="No verified defect records available." />
        ) : defects.map((d) => {
          const tank = tanks.find((t) => t.id === d.tankId);
          return (
            <div key={d.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-tertiary">{d.id}</span>
                    <button
                      className="font-mono text-sm font-semibold text-text-primary hover:text-status-active transition-colors"
                      onClick={() => navigate(`/admin/tanks/${d.tankId}`)}
                    >
                      T-{tank?.tankNumber ?? d.tankId}
                    </button>
                    <StatusBadge type="defect-severity" value={d.severity} size="sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge type="defect-status" value={d.status} size="sm" />
                    {d.status === 'open' && (
                      <button className="btn-secondary px-2 py-0.5 text-2xs" onClick={() => handleStatusChange(d.id, 'in-progress')}>
                        Start Rectification
                      </button>
                    )}
                    {d.status === 'in-progress' && (
                      <button className="btn-success px-2 py-0.5 text-2xs font-bold" onClick={() => handleStatusChange(d.id, 'resolved')}>
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-text-secondary">{d.description}</div>
                <div className="flex items-center gap-3 mt-1.5 text-2xs text-text-tertiary">
                  <span><Clock size={10} className="inline mr-1" />Target: {formatDate(d.targetDate)}</span>
                  <span>Assigned: {d.assignedTo}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function UserNotifications() {
  const navigate = useNavigate();
  const notifications = useAppStore((state) => state.notifications);
  const markAllRead = useAppStore((state) => state.markAllRead);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);

  const typeIcon: Record<string, React.ReactNode> = {
    alert: <AlertTriangle size={14} className="text-status-critical" />,
    warning: <AlertTriangle size={14} className="text-status-warning" />,
    info: <Bell size={14} className="text-status-active" />,
    success: <CheckCircle2 size={14} className="text-status-completed" />,
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-secondary text-xs" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>
      <div className="card divide-y divide-border">
        {notifications.length === 0 ? (
          <EmptyState message="No notifications available." />
        ) : notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex items-start gap-3 transition-colors ${!n.read ? 'bg-surface-2 cursor-pointer' : ''}`}
            onClick={() => !n.read && markNotificationRead(n.id)}
          >
            <div className="flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? typeIcon.info}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-text-primary">{n.title}</span>
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-status-active flex-shrink-0" />}
              </div>
              <div className="text-xs text-text-secondary">{n.message}</div>
              <div className="text-2xs text-text-tertiary mt-1">{formatDateTime(n.createdAt)}</div>
            </div>
            {n.tankId && (
              <button className="btn-ghost px-2 py-1 flex-shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/admin/tanks/${n.tankId}`); }}>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── My Reports ────────────────────────────────────────────────────────────────
export function UserReports() {
  const { tanks, defects } = useWorkspaceData();

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">My Reports</h1>
        <p className="page-subtitle">Summary for your assigned tanks</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">My Tank Summary</div>
          {tanks.length === 0 ? (
            <div className="text-sm text-text-tertiary">No verified tank assignments.</div>
          ) : tanks.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-xs font-mono text-text-primary">T-{t.tankNumber}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-status-active" style={{ width: `${t.overallProgress}%` }} />
                </div>
                <span className="text-xs tabular-nums text-text-secondary w-8 text-right">{t.overallProgress}%</span>
                <StatusBadge type="tank" value={t.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">My Defect Summary</div>
          {defects.length === 0 ? (
            <div className="text-sm text-text-tertiary">No verified defect records.</div>
          ) : defects.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-xs font-mono text-text-tertiary">{d.id}</span>
              <div className="flex items-center gap-2">
                <StatusBadge type="defect-severity" value={d.severity} size="sm" />
                <StatusBadge type="defect-status" value={d.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
