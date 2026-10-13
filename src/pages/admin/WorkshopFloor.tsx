import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, AlertTriangle, Users, Crosshair } from 'lucide-react';
import { resourceService } from '../../services/api/resourceService';
import { productionService } from '../../services/productionService';
import type { Bay, Gang, Tank } from '../../models';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useDataModeStore } from '../../store/useDataModeStore';

function BayCard({ bay, tanks, gangs }: { bay: Bay; tanks: Tank[]; gangs: Gang[] }) {
  const navigate = useNavigate();
  const bayTanks = tanks.filter((t) => t.currentBayId === bay.id);
  const bayGangs = gangs.filter((g) => bayTanks.some((t) => t.assignedGangId === g.id));
  const isOccupied = bayTanks.length > 0;
  const hasCritical = bayTanks.some((t) => t.status === 'critical');
  const hasWarning = bayTanks.some((t) => t.status === 'warning');

  const borderColor = hasCritical
    ? '#6A1A1A'
    : hasWarning
    ? '#6A3E00'
    : isOccupied
    ? '#1A4070'
    : '#1C2535';

  const headerBg = hasCritical
    ? '#260A0A'
    : hasWarning
    ? '#261800'
    : isOccupied
    ? '#0A1830'
    : '#111620';

  return (
    <div
      className="rounded flex flex-col overflow-hidden"
      style={{ border: `1px solid ${borderColor}`, background: '#0A0D12' }}
    >
      {/* Bay header */}
      <div
        className="px-3 py-2 flex items-center justify-between flex-shrink-0"
        style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-2">
          <Building2 size={12} className="text-text-tertiary" />
          <span className="text-xs font-bold text-text-primary font-mono">{bay.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasCritical && <AlertTriangle size={11} className="text-status-critical" />}
          <span className={`text-2xs font-bold uppercase ${isOccupied ? (hasCritical ? 'text-status-critical' : hasWarning ? 'text-status-warning' : 'text-status-active') : 'text-text-tertiary'}`}>
            {isOccupied ? (hasCritical ? 'CRITICAL' : hasWarning ? 'AT RISK' : 'OCCUPIED') : 'AVAILABLE'}
          </span>
        </div>
      </div>

      {/* Bay content */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        {!isOccupied ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <span className="text-xs text-text-tertiary">AVAILABLE</span>
          </div>
        ) : (
          bayTanks.map((tank) => {
            const gang = gangs.find((g) => g.id === tank.assignedGangId);
            return (
              <button
                key={tank.id}
                className="w-full text-left rounded p-2.5 hover:bg-surface-3 transition-colors"
                style={{ background: '#111620', border: '1px solid #1C2535' }}
                onClick={() => navigate(`/admin/tanks/${tank.id}`)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Crosshair size={11} className="text-text-tertiary" />
                    <span className="text-sm font-bold font-mono text-text-primary">T-{tank.tankNumber}</span>
                  </div>
                  <StatusBadge type="tank" value={tank.status} size="sm" />
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-surface-3 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${tank.overallProgress}%`,
                      background: tank.status === 'critical' ? '#C44040' : tank.status === 'warning' ? '#C4882A' : '#3A7EC4',
                    }}
                  />
                </div>

                <div className="text-2xs text-text-tertiary">{tank.overallProgress}% complete</div>

                {tank.blockerReason && (
                  <div className="mt-1.5 flex items-start gap-1 text-2xs text-status-critical">
                    <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" />
                    <span className="truncate">{tank.blockerReason}</span>
                  </div>
                )}

                {gang && (
                  <div className="mt-1.5 flex items-center gap-1 text-2xs text-text-tertiary">
                    <Users size={9} />
                    <span>{gang.name}</span>
                  </div>
                )}
              </button>
            );
          })
        )}

        {/* Utilization */}
        <div className="mt-auto pt-2 border-t border-border flex items-center justify-between">
          <span className="text-2xs text-text-tertiary">Utilization</span>
          <span className="text-2xs font-mono text-text-secondary">{bay.utilization}%</span>
        </div>
        {bayGangs.length > 0 && (
          <div className="flex items-center gap-1 text-2xs text-text-tertiary">
            <Users size={9} />
            <span>{bayGangs.map((g) => g.name).join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkshopFloor() {
  const [bays, setBays] = useState<Bay[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { mode } = useDataModeStore();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      resourceService.getBays(),
      productionService.getTanks(),
      resourceService.getGangs(),
    ]).then(([b, t, g]) => {
      setBays(b);
      setTanks(t);
      setGangs(g);
      setLoading(false);
    }).catch((e: Error) => {
      setLoadError(e.message);
      setLoading(false);
    });
  }, []);

  const occupied = bays.filter((b) => tanks.some((t) => t.currentBayId === b.id)).length;
  const available = bays.length - occupied;
  const critical = tanks.filter((t) => t.status === 'critical' && t.currentBayId).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-1 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">WORKSHOP FLOOR</h1>
            <p className="page-subtitle">
              {bays.length} bays · {occupied} occupied · {available} available
              {critical > 0 && <span className="text-status-critical ml-2">· {critical} critical</span>}
            </p>
          </div>
          {mode === 'SIMULATION' && (
            <span className="text-2xs font-bold text-status-warning border border-status-warning-border bg-status-warning-bg px-2 py-1 rounded uppercase tracking-wider">
              SIMULATION DATA
            </span>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-6 px-6 py-2.5 border-b border-border bg-base-800 flex-shrink-0">
        {[
          { label: 'TOTAL BAYS', value: bays.length, color: 'text-text-primary' },
          { label: 'OCCUPIED', value: occupied, color: 'text-status-active' },
          { label: 'AVAILABLE', value: available, color: 'text-status-completed' },
          { label: 'CRITICAL', value: critical, color: 'text-status-critical' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</span>
            <span className="text-2xs text-text-tertiary uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Floor grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loadError && (
          <div className="card p-3 text-xs text-status-critical border-status-critical-border bg-status-critical-bg mb-4">
            ⚠ {mode === 'PRODUCTION' ? `Database unavailable: ${loadError}` : 'Using simulation data'}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card h-40 animate-pulse" />
            ))}
          </div>
        ) : bays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 size={32} className="text-text-tertiary mb-3 opacity-40" />
            <div className="text-sm font-bold text-text-secondary uppercase tracking-wider">NO VERIFIED BAY DATA</div>
            <div className="text-xs text-text-tertiary mt-1 max-w-xs">
              {mode === 'PRODUCTION'
                ? 'No bay records are currently available from the database.'
                : 'No simulation bay data available.'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {bays.map((bay) => (
              <BayCard key={bay.id} bay={bay} tanks={tanks} gangs={gangs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
