import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Building2 } from 'lucide-react';
import { apiMode } from '../../config/runtime';
import { resourceService } from '../../services/api/resourceService';
import { processService } from '../../services/api/processService';
import { productionService } from '../../services/productionService';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Bay } from '../../models';

const bayStatusConfig = {
  available:   { label: 'Available',   badge: 'bg-status-completed-bg border border-status-completed-border text-status-completed' },
  occupied:    { label: 'Occupied',    badge: 'bg-status-active-bg border border-status-active-border text-status-active' },
  maintenance: { label: 'Maintenance', badge: 'bg-status-warning-bg border border-status-warning-border text-status-warning' },
  blocked:     { label: 'Blocked',     badge: 'bg-status-critical-bg border border-status-critical-border text-status-critical' },
};

function BayCard({ bay, tanks, processes, onClick }: { bay: Bay; tanks: Awaited<ReturnType<typeof productionService.getTanks>>; processes: Awaited<ReturnType<typeof processService.getProcesses>>; onClick: () => void }) {
  const cfg = bayStatusConfig[bay.status];
  const currentTanks = tanks.filter((t) => bay.currentTankIds.includes(t.id));
  const process = processes.find((p) => p.id === bay.currentProcessId);

  return (
    <div
      className="card p-4 cursor-pointer hover:bg-surface-2 transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-base font-semibold text-text-primary">Bay {bay.number}</div>
          <div className="text-xs text-text-tertiary mt-0.5">{bay.name.split('—')[1]?.trim()}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${cfg.badge}`}>{cfg.label}</span>
      </div>

      {/* Utilization bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xs text-text-tertiary">Utilization</span>
          <span className="text-2xs text-text-secondary tabular-nums">{bay.currentTankIds.length}/{bay.capacity}</span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${bay.utilization >= 100 ? 'bg-status-warning' : bay.utilization > 0 ? 'bg-status-active' : 'bg-border'}`}
            style={{ width: `${bay.utilization}%` }}
          />
        </div>
      </div>

      {/* Current process */}
      {process && (
        <div className="text-xs text-text-secondary mb-2 truncate">{process.name}</div>
      )}

      {/* Tanks */}
      {currentTanks.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {currentTanks.map((t) => (
            <span key={t.id} className="text-2xs font-mono bg-surface-3 border border-border px-1.5 py-0.5 rounded-sm text-text-secondary">
              T-{t.tankNumber}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs text-text-tertiary">No tanks assigned</div>
      )}
    </div>
  );
}

function BayDrawer({ bay, tanks, processes, gangs, onClose }: { bay: Bay; tanks: Awaited<ReturnType<typeof productionService.getTanks>>; processes: Awaited<ReturnType<typeof processService.getProcesses>>; gangs: Awaited<ReturnType<typeof resourceService.getGangs>>; onClose: () => void }) {
  const navigate = useNavigate();
  const currentTanks = tanks.filter((t) => bay.currentTankIds.includes(t.id));
  const process = processes.find((p) => p.id === bay.currentProcessId);
  const gang = gangs.find((g) => g.assignedProcessIds.includes(bay.currentProcessId ?? ''));
  const cfg = bayStatusConfig[bay.status];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface-1 border-l border-border shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <div className="text-lg font-semibold text-text-primary">{bay.name}</div>
          <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${cfg.badge}`}>{cfg.label}</span>
        </div>
        <button className="btn-ghost px-1.5 py-1" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {[
          ['Capacity', `${bay.capacity} tanks`],
          ['Current Occupancy', `${bay.currentTankIds.length} / ${bay.capacity}`],
          ['Utilization', `${bay.utilization}%`],
          ['Current Process', process?.name ?? '—'],
          ['Assigned Gang', gang?.name ?? '—'],
        ].map(([label, value]) => (
          <div key={label as string} className="flex justify-between border-b border-border pb-2">
            <span className="text-xs text-text-tertiary">{label}</span>
            <span className="text-xs text-text-primary text-right">{value}</span>
          </div>
        ))}

        {currentTanks.length > 0 && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-2">Current Tanks</div>
            <div className="flex flex-col gap-2">
              {currentTanks.map((t) => (
                <button
                  key={t.id}
                  className="flex items-center justify-between p-2.5 bg-surface-2 rounded hover:bg-surface-3 transition-colors group"
                  onClick={() => navigate(`/admin/tanks/${t.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-text-primary">T-{t.tankNumber}</span>
                    <StatusBadge type="tank" value={t.status} size="sm" />
                  </div>
                  <ArrowRight size={13} className="text-text-tertiary group-hover:text-text-secondary" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Bays() {
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bays, setBays] = useState<Bay[]>([]);
  const [tanks, setTanks] = useState<Awaited<ReturnType<typeof productionService.getTanks>>>([]);
  const [processes, setProcesses] = useState<Awaited<ReturnType<typeof processService.getProcesses>>>([]);
  const [gangs, setGangs] = useState<Awaited<ReturnType<typeof resourceService.getGangs>>>([]);

  useEffect(() => {
    void Promise.all([resourceService.getBays(), productionService.getTanks(), processService.getProcesses(), resourceService.getGangs()]).then(([remoteBays, remoteTanks, remoteProcesses, remoteGangs]) => {
      setBays(remoteBays);
      setTanks(remoteTanks);
      setProcesses(remoteProcesses);
      setGangs(remoteGangs);
    });
  }, []);

  const filtered = bays.filter((b) => statusFilter === 'all' || b.status === statusFilter);
  const kpis = {
    total: bays.length,
    occupied: bays.filter((b) => b.status === 'occupied').length,
    available: bays.filter((b) => b.status === 'available').length,
    maintenance: bays.filter((b) => b.status === 'maintenance').length,
    blocked: bays.filter((b) => b.status === 'blocked').length,
    avgUtil: bays.length ? Math.round(bays.reduce((s, b) => s + b.utilization, 0) / bays.length) : 0,
  };

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Bay Management</h1>
        <p className="page-subtitle">Workshop bay allocation and utilization</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Total Bays" value={kpis.total} icon={<Building2 size={14} />} />
        <KpiCard label="Occupied" value={kpis.occupied} accent="active" />
        <KpiCard label="Available" value={kpis.available} accent="completed" />
        <KpiCard label="Maintenance" value={kpis.maintenance} accent="warning" />
        <KpiCard label="Blocked" value={kpis.blocked} accent="critical" />
        <KpiCard label="Avg Utilization" value={`${kpis.avgUtil}%`} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['all', 'occupied', 'available', 'maintenance', 'blocked'] as const).map((s) => (
          <button
            key={s}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${statusFilter === s ? 'bg-surface-3 border-border-strong text-text-primary' : 'border-border text-text-tertiary hover:border-border-strong'}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Bay grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((bay) => (
          <BayCard key={bay.id} bay={bay} tanks={tanks} processes={processes} onClick={() => setSelectedBay(bay)} />
        ))}
      </div>
      {apiMode && filtered.length === 0 && <div className="card p-8 text-center text-sm text-text-tertiary">No verified bay records available.</div>}

      {selectedBay && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedBay(null)} />
          <BayDrawer bay={selectedBay} tanks={tanks} processes={processes} gangs={gangs} onClose={() => setSelectedBay(null)} />
        </>
      )}
    </div>
  );
}
