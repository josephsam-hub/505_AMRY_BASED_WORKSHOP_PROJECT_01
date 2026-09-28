import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Car, ArrowRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { formatDate } from '../../utils/dateUtils';
import type { Defect, RoadTrial, Tank } from '../../models';
import { roadTrialService } from '../../services/api/roadTrialService';
import { defectService } from '../../services/api/defectService';
import { productionService } from '../../services/productionService';
import { apiMode } from '../../config/runtime';

const trialStatusConfig = {
  completed:  { label: 'Completed',  badge: 'bg-status-completed-bg border border-status-completed-border text-status-completed', icon: CheckCircle2 },
  scheduled:  { label: 'Scheduled',  badge: 'bg-status-active-bg border border-status-active-border text-status-active', icon: Clock },
  pending:    { label: 'Pending',    badge: 'bg-status-pending-bg border border-status-pending-border text-text-tertiary', icon: Clock },
  failed:     { label: 'Failed',     badge: 'bg-status-critical-bg border border-status-critical-border text-status-critical', icon: AlertTriangle },
};

export default function RoadTrials() {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<RoadTrial[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);

  useEffect(() => {
    void Promise.all([roadTrialService.getRoadTrials(), productionService.getTanks(), defectService.getDefects()]).then(([nextTrials, nextTanks, nextDefects]) => {
      setTrials(nextTrials);
      setTanks(nextTanks);
      setDefects(nextDefects);
    });
  }, []);

  const kpis = {
    total: trials.length,
    completed: trials.filter((r) => r.status === 'completed').length,
    scheduled: trials.filter((r) => r.status === 'scheduled').length,
    pending: trials.filter((r) => r.status === 'pending').length,
    failed: trials.filter((r) => r.status === 'failed').length,
  };

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Road Trials</h1>
        <p className="page-subtitle">Tank road trial scheduling, progress and results</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total" value={kpis.total} icon={<Car size={14} />} />
        <KpiCard label="Completed" value={kpis.completed} accent="completed" />
        <KpiCard label="Scheduled" value={kpis.scheduled} accent="active" />
        <KpiCard label="Pending" value={kpis.pending} accent="pending" />
        <KpiCard label="Failed" value={kpis.failed} accent="critical" />
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Road Trial Records</span>
        </div>
        <div className="divide-y divide-border">
          {trials.map((trial) => {
            const tank = tanks.find((t) => t.id === trial.tankId);
            const cfg = trialStatusConfig[trial.status] ?? trialStatusConfig.pending;
            const StatusIcon = cfg.icon;
            const trialDefects = (trial.defectsFound ?? []).map((id) => defects.find((d) => d.id === id)).filter(Boolean);

            return (
              <div key={trial.id} className="px-4 py-4 flex items-start gap-4">
                <StatusIcon size={16} className={`flex-shrink-0 mt-0.5 ${
                  trial.status === 'completed' ? 'text-status-completed' :
                  trial.status === 'failed' ? 'text-status-critical' :
                  trial.status === 'scheduled' ? 'text-status-active' : 'text-text-tertiary'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      className="text-sm font-mono font-semibold text-text-primary hover:text-status-active transition-colors"
                      onClick={() => navigate(`/admin/tanks/${trial.tankId}`)}
                    >
                      T-{tank?.tankNumber}
                    </button>
                    <span className="text-xs text-text-tertiary font-mono">{trial.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${cfg.badge}`}>{cfg.label}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-tertiary mb-1">
                    <span>Scheduled: {formatDate(trial.scheduledDate)}</span>
                    {trial.conductedDate && <span>Conducted: {formatDate(trial.conductedDate)}</span>}
                    {trial.distance && <span>Distance: {trial.distance} km</span>}
                  </div>

                  {trial.result && (
                    <div className="text-xs text-text-secondary">{trial.result}</div>
                  )}

                  {trialDefects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {trialDefects.map((d) => d && (
                        <span key={d.id} className="text-2xs font-mono bg-status-critical-bg border border-status-critical-border text-status-critical px-1.5 py-0.5 rounded-sm">
                          {d.id} — {d.category}
                        </span>
                      ))}
                    </div>
                  )}

                  {trial.remarks && (
                    <div className="text-xs text-text-tertiary mt-1">{trial.remarks}</div>
                  )}
                </div>

                <button
                  className="btn-ghost px-2 py-1 flex-shrink-0"
                  onClick={() => navigate(`/admin/tanks/${trial.tankId}`)}
                  title="Open Tank Detail"
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
        {apiMode && trials.length === 0 && <div className="p-8 text-center text-sm text-text-tertiary">No verified road-trial records available.</div>}
      </div>
    </div>
  );
}
