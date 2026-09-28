import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, ClipboardCheck, Search } from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { formatDate } from '../../utils/dateUtils';
import type { Defect, Inspection, Process, Stage, Tank } from '../../models';
import { inspectionService } from '../../services/api/inspectionService';
import { defectService } from '../../services/api/defectService';
import { processService } from '../../services/api/processService';
import { resourceService } from '../../services/api/resourceService';
import { productionService } from '../../services/productionService';
import { apiMode } from '../../config/runtime';

function InspectionDrawer({ inspection, defects, tanks, stages, processes, onClose }: { inspection: Inspection; defects: Defect[]; tanks: Tank[]; stages: Stage[]; processes: Process[]; onClose: () => void }) {
  const navigate = useNavigate();
  const tank = tanks.find((t) => t.id === inspection.tankId);
  const process = processes.find((p) => p.id === inspection.processId);
  const stage = stages.find((s) => s.id === inspection.stageId);
  const relatedDefects = defects.filter((d) => d.tankId === inspection.tankId && d.processId === inspection.processId);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface-1 border-l border-border shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <div className="text-xs text-text-tertiary font-mono">{inspection.id}</div>
          <div className="text-sm font-semibold text-text-primary">{inspection.name}</div>
        </div>
        <button className="btn-ghost px-1.5 py-1" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <StatusBadge type="inspection" value={inspection.status} />
        </div>

        {[
          ['Tank', tank ? `T-${tank.tankNumber} (${tank.ohNumber})` : '—'],
          ['Stage', stage ? `Stage ${stage.number} — ${stage.shortName}` : '—'],
          ['Process', process?.name ?? '—'],
          ['Inspector', inspection.inspector ?? '—'],
          ['Scheduled', formatDate(inspection.scheduledDate)],
          ['Completed', inspection.completedDate ? formatDate(inspection.completedDate) : '—'],
        ].map(([label, value]) => (
          <div key={label as string} className="flex justify-between border-b border-border pb-2">
            <span className="text-xs text-text-tertiary">{label}</span>
            <span className="text-xs text-text-primary text-right max-w-[200px]">{value}</span>
          </div>
        ))}

        {inspection.remarks && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1">Remarks</div>
            <p className="text-xs text-text-secondary">{inspection.remarks}</p>
          </div>
        )}

        {inspection.failureReasons && inspection.failureReasons.length > 0 && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">Failure Reasons</div>
            {inspection.failureReasons.map((r, i) => (
              <div key={i} className="text-xs text-status-critical py-0.5">• {r}</div>
            ))}
          </div>
        )}

        {relatedDefects.length > 0 && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">Related Defects</div>
            {relatedDefects.map((d) => (
              <div key={d.id} className="p-2 bg-surface-2 rounded mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-tertiary">{d.id}</span>
                  <StatusBadge type="defect-severity" value={d.severity} size="sm" />
                </div>
                <div className="text-xs text-text-secondary mt-0.5">{d.description}</div>
              </div>
            ))}
          </div>
        )}

        {tank && (
          <button
            className="btn-primary w-full justify-center mt-2"
            onClick={() => navigate(`/admin/tanks/${tank.id}`)}
          >
            Open Tank T-{tank.tankNumber} <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Inspections() {
  const [selected, setSelected] = useState<Inspection | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [remoteInspections, setRemoteInspections] = useState<Inspection[]>([]);
  const [remoteDefects, setRemoteDefects] = useState<Defect[]>([]);
  const [remoteTanks, setRemoteTanks] = useState<Tank[]>([]);
  const [remoteStages, setRemoteStages] = useState<Stage[]>([]);
  const [remoteProcesses, setRemoteProcesses] = useState<Process[]>([]);

  useEffect(() => {
    void Promise.all([inspectionService.getInspections(), defectService.getDefects(), productionService.getTanks(), resourceService.getStages(), processService.getProcesses()]).then(([nextInspections, nextDefects, nextTanks, nextStages, nextProcesses]) => {
      setRemoteInspections(nextInspections);
      setRemoteDefects(nextDefects);
      setRemoteTanks(nextTanks);
      setRemoteStages(nextStages);
      setRemoteProcesses(nextProcesses);
    });
  }, []);

  const filtered = useMemo(() => remoteInspections.filter((i) => {
    const tank = remoteTanks.find((t) => t.id === i.tankId);
    const matchSearch = !search || i.tankId.includes(search) || tank?.tankNumber.includes(search) || i.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchStage = stageFilter === 'all' || i.stageId === stageFilter;
    return matchSearch && matchStatus && matchStage;
  }), [remoteInspections, remoteTanks, search, statusFilter, stageFilter]);

  const kpis = {
    pending: remoteInspections.filter((i) => i.status === 'pending').length,
    inProgress: remoteInspections.filter((i) => i.status === 'in-progress').length,
    passed: remoteInspections.filter((i) => i.status === 'passed').length,
    failed: remoteInspections.filter((i) => i.status === 'failed').length,
  };

  const columns: Column<Inspection>[] = [
    { key: 'id', header: 'ID', width: 'w-20', render: (i) => <span className="font-mono text-text-tertiary">{i.id}</span> },
    { key: 'tank', header: 'Tank', width: 'w-20', render: (i) => {
      const t = remoteTanks.find((t) => t.id === i.tankId);
      return <span className="font-mono font-semibold text-text-primary">T-{t?.tankNumber}</span>;
    }},
    { key: 'name', header: 'Inspection Type', render: (i) => <span className="text-text-primary">{i.name}</span> },
    { key: 'stage', header: 'Stage', render: (i) => {
      const s = remoteStages.find((s) => s.id === i.stageId);
      return <span className="text-text-secondary text-xs">{s?.shortName}</span>;
    }},
    { key: 'inspector', header: 'Inspector', render: (i) => <span className="text-text-secondary">{i.inspector ?? '—'}</span> },
    { key: 'scheduled', header: 'Scheduled', render: (i) => <span className="text-text-secondary">{formatDate(i.scheduledDate)}</span> },
    { key: 'completed', header: 'Completed', render: (i) => <span className="text-text-secondary">{i.completedDate ? formatDate(i.completedDate) : '—'}</span> },
    { key: 'status', header: 'Status', width: 'w-28', render: (i) => <StatusBadge type="inspection" value={i.status} size="sm" /> },
  ];

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Inspections</h1>
        <p className="page-subtitle">Quality inspection tracking across all tanks and processes</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Pending" value={kpis.pending} accent="pending" icon={<ClipboardCheck size={14} />} />
        <KpiCard label="In Progress" value={kpis.inProgress} accent="active" />
        <KpiCard label="Passed" value={kpis.passed} accent="completed" />
        <KpiCard label="Failed" value={kpis.failed} accent="critical" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input className="input-field pl-8 w-44" placeholder="Search tank / type..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-field w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
        <select className="select-field w-36" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">All Stages</option>
          {remoteStages.map((s) => <option key={s.id} value={s.id}>Stage {s.number} — {s.shortName}</option>)}
        </select>
        <span className="ml-auto text-xs text-text-tertiary">{filtered.length} records</span>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(i) => i.id}
          onRowClick={(i) => setSelected(i)}
          emptyMessage="No inspections match the current filters."
        />
      </div>
      {apiMode && remoteInspections.length === 0 && <div className="card p-5 text-sm text-text-tertiary">No verified inspection records available.</div>}

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
          <InspectionDrawer inspection={selected} defects={remoteDefects} tanks={remoteTanks} stages={remoteStages} processes={remoteProcesses} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
