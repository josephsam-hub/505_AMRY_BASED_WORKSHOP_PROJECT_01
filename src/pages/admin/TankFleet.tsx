import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable, type Column } from '../../components/ui/DataTable';
import type { Process, Stage, Tank } from '../../models';
import { formatDate } from '../../utils/dateUtils';
import { getProgressBarClass } from '../../utils/statusUtils';
import { productionService } from '../../services/productionService';
import { processService } from '../../services/api/processService';
import { resourceService } from '../../services/api/resourceService';

const STATUS_OPTIONS = ['all', 'completed', 'active', 'warning', 'critical', 'pending'] as const;

export default function TankFleet() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [fleet, setFleet] = useState<Tank[]>([]);
  const [fleetStages, setFleetStages] = useState<Stage[]>([]);
  const [fleetProcesses, setFleetProcesses] = useState<Process[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      productionService.getTanks(),
      resourceService.getStages(),
      processService.getProcesses(),
    ]).then(([remoteFleet, remoteStages, remoteProcesses]) => {
      setFleet(remoteFleet);
      setFleetStages(remoteStages);
      setFleetProcesses(remoteProcesses);
    }).catch((error: Error) => setLoadError(error.message));
  }, []);

  const filtered = useMemo(() => {
    return fleet.filter((t) => {
      const matchSearch =
        !search ||
        t.tankNumber.includes(search) ||
        t.ohNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.type.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchStage = stageFilter === 'all' || t.currentStageId === stageFilter;
      return matchSearch && matchStatus && matchStage;
    });
  }, [fleet, search, statusFilter, stageFilter]);

  const columns: Column<Tank>[] = [
    {
      key: 'tank', header: 'Tank', width: 'w-24',
      render: (t) => <span className="font-mono font-semibold text-text-primary">T-{t.tankNumber}</span>,
    },
    {
      key: 'oh', header: 'OH Number', width: 'w-32',
      render: (t) => <span className="text-text-secondary">{t.ohNumber}</span>,
    },
    {
      key: 'type', header: 'Type / Profile',
      render: (t) => <span className="text-text-secondary">{t.type} · {t.profile}</span>,
    },
    {
      key: 'stage', header: 'Stage',
      render: (t) => <span className="text-text-secondary">{fleetStages.find(s => s.id === t.currentStageId)?.shortName ?? '—'}</span>,
    },
    {
      key: 'process', header: 'Current Process',
      render: (t) => <span className="text-text-secondary text-xs">{fleetProcesses.find(p => p.id === t.currentProcessId)?.name ?? '—'}</span>,
    },
    {
      key: 'progress', header: 'Progress', width: 'w-32',
      render: (t) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${getProgressBarClass(t.overallProgress)}`} style={{ width: `${t.overallProgress}%` }} />
          </div>
          <span className="text-xs tabular-nums text-text-tertiary w-7 text-right">{t.overallProgress}%</span>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-24',
      render: (t) => <StatusBadge type="tank" value={t.status} size="sm" />,
    },
    {
      key: 'delay', header: 'Delay', width: 'w-16',
      render: (t) => t.delayDays > 0
        ? <span className="text-xs text-status-warning tabular-nums">+{t.delayDays}d</span>
        : <span className="text-xs text-text-tertiary">—</span>,
    },
    {
      key: 'due', header: 'Planned Completion',
      render: (t) => <span className="text-xs text-text-secondary">{formatDate(t.plannedCompletion)}</span>,
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-4">
      <div>
        <h1 className="page-title">Tank Fleet</h1>
        <p className="page-subtitle">{fleet.length} tanks in production batch · {filtered.length} shown</p>
      </div>

      {loadError && <div className="card p-4 text-sm text-status-critical">Database unavailable: {loadError}</div>}
      {!loadError && fleet.length === 0 && <div className="card p-4 text-sm text-text-secondary">No tank records are currently available from PostgreSQL.</div>}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            className="input-field pl-8 w-48"
            placeholder="Search tank / OH..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter size={13} className="text-text-tertiary" />
          <select className="select-field w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <select className="select-field w-40" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">All Stages</option>
          {fleetStages.map((s) => (
            <option key={s.id} value={s.id}>Stage {s.number} — {s.shortName}</option>
          ))}
        </select>

        {/* Status summary pills */}
        <div className="flex items-center gap-2 ml-auto">
          {(['completed', 'active', 'warning', 'critical', 'pending'] as const).map((s) => {
            const count = fleet.filter((t) => t.status === s).length;
            return (
              <button
                key={s}
                className={`text-2xs px-2 py-0.5 rounded-sm border transition-colors ${statusFilter === s ? 'bg-surface-3 border-border-strong text-text-primary' : 'border-border text-text-tertiary hover:border-border-strong'}`}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              >
                {count} {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(t) => t.id}
          onRowClick={(t) => navigate(`/admin/tanks/${t.id}`)}
          emptyMessage="No tanks match the current filters."
        />
      </div>
    </div>
  );
}
