import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { apiMode } from '../../config/runtime';
import { resourceService } from '../../services/api/resourceService';
import { processService } from '../../services/api/processService';
import { productionService } from '../../services/productionService';
import { personnelService } from '../../services/api/personnelService';
import type { Gang, Process, Tank } from '../../models';
import { KpiCard } from '../../components/ui/KpiCard';

function StrengthBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 text-xs text-text-tertiary flex-shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-6 text-xs text-text-secondary text-right tabular-nums">{value}</div>
    </div>
  );
}

function GangCard({ gang, tanks, processes }: { gang: Gang; tanks: Tank[]; processes: Process[] }) {
  const navigate = useNavigate();
  const utilization = gang.authorized > 0 ? Math.round((gang.deployed / gang.authorized) * 100) : 0;
  const assignedTanks = tanks.filter((t) => gang.assignedTankIds.includes(t.id));
  const assignedProcs = processes.filter((p) => gang.assignedProcessIds.includes(p.id));
  const isUnderstrength = gang.held > 0 || gang.available < gang.authorized * 0.8;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-text-primary">{gang.name}</div>
          <div className="text-xs text-text-tertiary mt-0.5">{gang.specialty}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold tabular-nums ${utilization >= 90 ? 'text-status-active' : utilization >= 70 ? 'text-status-warning' : 'text-status-critical'}`}>
            {utilization}%
          </div>
          <div className="text-2xs text-text-tertiary">Utilization</div>
        </div>
      </div>

      {isUnderstrength && (
        <div className="flex items-center gap-1.5 bg-status-warning-bg border border-status-warning-border rounded px-2 py-1.5">
          <AlertTriangle size={11} className="text-status-warning flex-shrink-0" />
          <span className="text-2xs text-status-warning">
            {gang.held > 0 ? `${gang.held} personnel held` : 'Below optimal strength'}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <StrengthBar label="Authorized" value={gang.authorized} max={gang.authorized} color="bg-border-strong" />
        <StrengthBar label="Deployed" value={gang.deployed} max={gang.authorized} color="bg-status-active" />
        <StrengthBar label="Available" value={gang.available} max={gang.authorized} color="bg-status-completed" />
        {gang.held > 0 && (
          <StrengthBar label="Held" value={gang.held} max={gang.authorized} color="bg-status-warning" />
        )}
      </div>

      {/* Assigned tanks */}
      {assignedTanks.length > 0 && (
        <div>
          <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">Assigned Tanks</div>
          <div className="flex flex-wrap gap-1">
            {assignedTanks.map((t) => (
              <button
                key={t.id}
                className="flex items-center gap-1 text-2xs font-mono bg-surface-2 border border-border px-1.5 py-0.5 rounded-sm hover:bg-surface-3 transition-colors"
                onClick={() => navigate(`/admin/tanks/${t.id}`)}
              >
                T-{t.tankNumber}
                <div className={`w-1 h-1 rounded-full ${
                  t.status === 'critical' ? 'bg-status-critical' :
                  t.status === 'warning' ? 'bg-status-warning' :
                  t.status === 'active' ? 'bg-status-active' : 'bg-status-pending'
                }`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assigned processes */}
      {assignedProcs.length > 0 && (
        <div>
          <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">Assigned Processes</div>
          <div className="flex flex-col gap-0.5">
            {assignedProcs.slice(0, 3).map((p) => (
              <div key={p.id} className="text-xs text-text-secondary">
                P{String(p.processNumber).padStart(2,'0')} — {p.name}
              </div>
            ))}
            {assignedProcs.length > 3 && (
              <div className="text-2xs text-text-tertiary">+{assignedProcs.length - 3} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Manpower() {
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  useEffect(() => {
    void Promise.all([resourceService.getGangs(), productionService.getTanks(), processService.getProcesses(), personnelService.getPersonnel()]).then(([remoteGangs, remoteTanks, remoteProcesses]) => {
      setGangs(remoteGangs);
      setTanks(remoteTanks);
      setProcesses(remoteProcesses);
    });
  }, []);
  const totalAuth = gangs.reduce((s, g) => s + g.authorized, 0);
  const totalAvail = gangs.reduce((s, g) => s + g.available, 0);
  const totalDeployed = gangs.reduce((s, g) => s + g.deployed, 0);
  const totalHeld = gangs.reduce((s, g) => s + g.held, 0);
  const overallUtil = Math.round((totalDeployed / totalAuth) * 100);

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Manpower & Gangs</h1>
        <p className="page-subtitle">{gangs.length} gangs · Workshop strength overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Authorized" value={totalAuth} icon={<Users size={14} />} />
        <KpiCard label="Available" value={totalAvail} accent="completed" />
        <KpiCard label="Deployed" value={totalDeployed} accent="active" />
        <KpiCard label="Held" value={totalHeld} accent={totalHeld > 0 ? 'warning' : 'default'} />
        <KpiCard label="Utilization" value={`${overallUtil}%`} accent={overallUtil >= 85 ? 'active' : 'warning'} />
      </div>

      {/* Gang cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {gangs.map((gang) => (
          <GangCard key={gang.id} gang={gang} tanks={tanks} processes={processes} />
        ))}
      </div>
      {apiMode && gangs.length === 0 && <div className="card p-8 text-center text-sm text-text-tertiary">No verified manpower records available.</div>}
    </div>
  );
}
