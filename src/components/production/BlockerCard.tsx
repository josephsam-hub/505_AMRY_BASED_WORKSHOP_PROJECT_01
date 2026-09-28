import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { productionService, type Blocker } from '../../services/productionService';
import { processService } from '../../services/api/processService';
import type { Process } from '../../models';

export function ActiveBlockers() {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    productionService.getActiveBlockers().then(setBlockers);
    processService.getProcesses().then(setProcesses);
  }, []);

  const getProcessName = (processId: string) =>
    processes.find((p) => p.id === processId)?.name ?? processId;

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-status-critical" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Active Blockers</span>
        </div>
        <span className="text-2xs text-text-tertiary">{blockers.length} active</span>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {blockers.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-text-tertiary">No active blockers.</div>
        )}
        {blockers.map((b) => (
          <button
            key={b.tankId}
            className="flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors duration-fast group"
            onClick={() => navigate(`/admin/tanks/${b.tankId}`)}
          >
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.severity === 'critical' ? 'bg-status-critical' : 'bg-status-warning'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold ${b.severity === 'critical' ? 'text-status-critical' : 'text-status-warning'}`}>
                  {b.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                </span>
                <span className="text-xs font-mono text-text-primary">T-{b.tankNumber}</span>
              </div>
              <div className="text-xs text-text-secondary truncate">{getProcessName(b.processName)}</div>
              <div className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{b.reason}</div>
            </div>
            <ArrowRight size={13} className="text-text-tertiary group-hover:text-text-secondary flex-shrink-0 mt-1 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
