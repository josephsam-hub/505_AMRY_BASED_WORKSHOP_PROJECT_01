import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ClipboardCheck, Clock, ArrowRight, ListTodo } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import { getProgressBarClass } from '../../utils/statusUtils';
import { useWorkspaceData } from './workspaceData';
import { useAppStore } from '../../store/useAppStore';

function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-accent" />
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-2xs text-text-tertiary">{count} items</span>
      )}
    </div>
  );
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const { tanks: myTanks, defects: myDefects, inspections: myInspections, processes, stages } = useWorkspaceData();
  const notifications = useAppStore((state) => state.notifications);
  const myNotifications = notifications.filter((notification) => !notification.read);
  const myTasks = myTanks.map((tank) => ({ tank, process: processes.find((process) => process.id === tank.currentProcessId), stage: stages.find((stage) => stage.id === tank.currentStageId) }));
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">MY WORKSTATION — EXECUTION</h1>
          <p className="page-subtitle">{today} · Gang G — Semi-Final Assembly / Gang H — Electrical</p>
        </div>

        {/* Quick Execution Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn-secondary text-xs font-bold uppercase tracking-wider"
            onClick={() => navigate('/workspace/process-updates')}
          >
            Start Process
          </button>
          <button
            className="btn-primary text-xs font-bold uppercase tracking-wider"
            onClick={() => navigate('/workspace/process-updates')}
          >
            Update Progress
          </button>
          <button
            className="btn-secondary text-xs font-bold uppercase tracking-wider"
            onClick={() => navigate('/workspace/inspections')}
          >
            Request Inspection
          </button>
          <button
            className="btn-danger text-xs font-bold uppercase tracking-wider"
            onClick={() => navigate('/workspace/defects')}
          >
            Report Defect
          </button>
          <button
            className="btn-success text-xs font-bold uppercase tracking-wider"
            onClick={() => navigate('/workspace/process-updates')}
          >
            Complete Process
          </button>
        </div>
      </div>

      {/* Alerts banner */}
      {myNotifications.length > 0 && (
        <div className="bg-status-warning-bg border border-status-warning-border rounded p-3 flex items-start gap-3">
          <AlertTriangle size={14} className="text-status-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-status-warning mb-1">{myNotifications.length} unread alert{myNotifications.length > 1 ? 's' : ''}</div>
            {myNotifications.slice(0, 2).map((n) => (
              <div key={n.id} className="text-xs text-text-secondary">{n.title}</div>
            ))}
          </div>
          <button className="btn-ghost text-xs" onClick={() => navigate('/workspace/notifications')}>
            View all <ArrowRight size={11} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Today's tasks + My Tanks */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Today's Tasks */}
          <div className="card p-4 cursor-pointer" onClick={() => navigate('/workspace/tasks')}>
            <SectionHeader icon={ListTodo} title="Today's Tasks" count={myTasks.length} />
            <div className="flex flex-col gap-3">
              {myTasks.map(({ tank, process, stage }) => (
                <div
                  key={tank.id}
                  className="flex items-start gap-3 p-3 bg-surface-2 rounded cursor-pointer hover:bg-surface-3 transition-colors group"
                  onClick={() => navigate(`/admin/tanks/${tank.id}`)}
                >
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${tank.status === 'critical' ? 'bg-status-critical' : tank.status === 'warning' ? 'bg-status-warning' : 'bg-status-active'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold font-mono text-text-primary">T-{tank.tankNumber}</span>
                      <StatusBadge type="tank" value={tank.status} size="sm" />
                    </div>
                    <div className="text-xs text-text-secondary">{process?.name ?? '—'}</div>
                    <div className="text-2xs text-text-tertiary mt-0.5">Stage {stage?.number} — {stage?.shortName}</div>
                    {tank.blockerReason && (
                      <div className="mt-1.5 text-xs text-status-warning flex items-center gap-1">
                        <AlertTriangle size={11} /> {tank.blockerReason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs tabular-nums text-text-secondary">{tank.overallProgress}%</span>
                    <div className="w-16 h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getProgressBarClass(tank.overallProgress)}`} style={{ width: `${tank.overallProgress}%` }} />
                    </div>
                    <ArrowRight size={12} className="text-text-tertiary group-hover:text-text-secondary mt-1 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* My Tanks detail */}
          <div className="card p-4 cursor-pointer" onClick={() => navigate('/workspace/tanks')}>
            <SectionHeader icon={CheckCircle2} title="My Assigned Tanks" count={myTanks.length} />
            <div className="divide-y divide-border">
              {myTanks.map((tank) => {
                const proc = processes.find((p) => p.id === tank.currentProcessId);
                return (
                  <div
                    key={tank.id}
                    className="py-3 flex items-center gap-4 cursor-pointer hover:bg-surface-2 -mx-4 px-4 transition-colors"
                    onClick={() => navigate(`/admin/tanks/${tank.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-text-primary">T-{tank.tankNumber}</span>
                        <span className="text-xs text-text-tertiary">{tank.ohNumber}</span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5 truncate">{proc?.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-text-tertiary">Due</div>
                        <div className="text-xs text-text-secondary">{formatDate(tank.plannedCompletion)}</div>
                      </div>
                      <StatusBadge type="tank" value={tank.status} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Inspections + Defects */}
        <div className="flex flex-col gap-5">

          {/* Pending Inspections */}
          <div className="card p-4 cursor-pointer" onClick={() => navigate('/workspace/inspections')}>
            <SectionHeader icon={ClipboardCheck} title="Pending Inspections" count={myInspections.length} />
            {myInspections.length === 0 ? (
              <div className="text-sm text-text-tertiary py-2">No pending inspections.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {myInspections.map((insp) => (
                  <div key={insp.id} className="p-2.5 bg-surface-2 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-text-secondary">T-{myTanks.find((tank) => tank.id === insp.tankId)?.tankNumber}</span>
                      <StatusBadge type="inspection" value={insp.status} size="sm" />
                    </div>
                    <div className="text-xs text-text-primary">{insp.name}</div>
                    <div className="text-2xs text-text-tertiary mt-0.5">Scheduled: {formatDate(insp.scheduledDate)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Defects */}
          <div className="card p-4 cursor-pointer" onClick={() => navigate('/workspace/defects')}>
            <SectionHeader icon={AlertTriangle} title="Open Defects" count={myDefects.length} />
            {myDefects.length === 0 ? (
              <div className="text-sm text-text-tertiary py-2">No open defects.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {myDefects.map((d) => (
                  <div key={d.id} className="p-2.5 bg-surface-2 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-text-tertiary">{d.id}</span>
                      <StatusBadge type="defect-severity" value={d.severity} size="sm" />
                    </div>
                    <div className="text-xs text-text-primary">{d.category}</div>
                    <div className="text-2xs text-text-secondary mt-0.5 line-clamp-2">{d.description}</div>
                    <div className="flex items-center gap-1 mt-1 text-2xs text-text-tertiary">
                      <Clock size={10} /> Target: {formatDate(d.targetDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
