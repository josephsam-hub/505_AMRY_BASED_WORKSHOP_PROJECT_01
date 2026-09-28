import { useEffect, useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { productionService } from '../../services/productionService';
import type { ProductionPulse as PulseData } from '../../models';

function PulseBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-text-secondary flex-shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-slow ${color}`} style={{ width: `${value}%` }} />
      </div>
      <div className="w-8 text-xs text-text-secondary text-right tabular-nums">{value}%</div>
    </div>
  );
}

function getPulseColor(v: number) {
  if (v >= 85) return 'bg-status-completed';
  if (v >= 70) return 'bg-status-active';
  if (v >= 55) return 'bg-status-warning';
  return 'bg-status-critical';
}

function getPulseTextColor(v: number) {
  if (v >= 85) return 'text-status-completed';
  if (v >= 70) return 'text-status-active';
  if (v >= 55) return 'text-status-warning';
  return 'text-status-critical';
}

export function ProductionPulse() {
  const [pulse, setPulse] = useState<PulseData | null>(null);

  useEffect(() => {
    productionService.getProductionPulse().then(setPulse);
  }, []);

  if (!pulse) return (
    <div className="card p-4 animate-pulse">
      <div className="h-4 bg-surface-3 rounded w-32 mb-3" />
      <div className="h-8 bg-surface-3 rounded w-16" />
    </div>
  );

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Production Pulse</span>
        </div>
        <span className="text-2xs text-text-tertiary">Database</span>
      </div>

      <div className="flex items-end gap-3">
        <div className={`text-4xl font-bold tabular-nums ${getPulseTextColor(pulse.overall)}`}>
          {pulse.overall}%
        </div>
        <div className="pb-1">
          <div className="text-xs text-text-tertiary">Overall Health</div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <PulseBar label="Schedule" value={pulse.schedule} color={getPulseColor(pulse.schedule)} />
        <PulseBar label="Resources" value={pulse.resources} color={getPulseColor(pulse.resources)} />
        <PulseBar label="Quality" value={pulse.quality} color={getPulseColor(pulse.quality)} />
        <PulseBar label="Process Flow" value={pulse.processFlow} color={getPulseColor(pulse.processFlow)} />
      </div>

      <div className="border-t border-border pt-3 flex items-start gap-2">
        <AlertCircle size={13} className="text-status-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">{pulse.primaryBottleneck}</p>
      </div>
    </div>
  );
}
