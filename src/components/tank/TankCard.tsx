import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Tank } from '../../models';
import { StatusBadge } from '../ui/StatusBadge';
import { stages } from '../../data/stages';
import { processes } from '../../data/processes';
import { getProgressBarClass } from '../../utils/statusUtils';
import { formatDate } from '../../utils/dateUtils';

interface Props { tank: Tank; }

export function TankCard({ tank }: Props) {
  const navigate = useNavigate();
  const stage = stages.find((s) => s.id === tank.currentStageId);
  const process = processes.find((p) => p.id === tank.currentProcessId);

  return (
    <div
      className="card p-3 cursor-pointer hover:bg-surface-2 transition-colors duration-fast group"
      onClick={() => navigate(`/admin/tanks/${tank.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-text-primary font-mono">T-{tank.tankNumber}</span>
            <StatusBadge type="tank" value={tank.status} size="sm" />
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">{tank.ohNumber}</div>
        </div>
        <ArrowRight size={13} className="text-text-tertiary group-hover:text-text-secondary mt-0.5 transition-colors" />
      </div>

      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Stage</span>
          <span className="text-xs text-text-secondary">{stage?.shortName ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Process</span>
          <span className="text-xs text-text-secondary truncate max-w-[120px] text-right">{process?.name ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Due</span>
          <span className="text-xs text-text-secondary">{formatDate(tank.plannedCompletion)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getProgressBarClass(tank.overallProgress)}`}
            style={{ width: `${tank.overallProgress}%` }}
          />
        </div>
        <span className="text-2xs text-text-tertiary tabular-nums w-7 text-right">{tank.overallProgress}%</span>
      </div>

      {tank.blockerReason && (
        <div className="mt-2 flex items-start gap-1.5 bg-status-critical-bg border border-status-critical-border rounded px-2 py-1.5">
          <AlertTriangle size={11} className="text-status-critical flex-shrink-0 mt-0.5" />
          <span className="text-2xs text-status-critical line-clamp-2">{tank.blockerReason}</span>
        </div>
      )}
    </div>
  );
}
