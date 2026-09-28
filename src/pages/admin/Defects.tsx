import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, AlertTriangle, Search } from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { formatDate } from '../../utils/dateUtils';
import type { Defect, Inspection, Process, Stage, Tank } from '../../models';
import { defectService } from '../../services/api/defectService';
import { inspectionService } from '../../services/api/inspectionService';
import { processService } from '../../services/api/processService';
import { resourceService } from '../../services/api/resourceService';
import { productionService } from '../../services/productionService';
import { apiMode } from '../../config/runtime';

function DefectDrawer({ defect, inspections, tanks, stages, processes, onClose }: { defect: Defect; inspections: Inspection[]; tanks: Tank[]; stages: Stage[]; processes: Process[]; onClose: () => void }) {
  const navigate = useNavigate();
  const tank = tanks.find((t) => t.id === defect.tankId);
  const process = processes.find((p) => p.id === defect.processId);
  const stage = stages.find((s) => s.id === defect.stageId);
  const relatedInspection = inspections.find((i) => i.tankId === defect.tankId && i.processId === defect.processId);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface-1 border-l border-border shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <div className="text-xs text-text-tertiary font-mono">{defect.id}</div>
          <div className="text-sm font-semibold text-text-primary">{defect.category} Defect</div>
        </div>
        <button className="btn-ghost px-1.5 py-1" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <StatusBadge type="defect-severity" value={defect.severity} />
          <StatusBadge type="defect-status" value={defect.status} />
        </div>

        <div className="p-3 bg-surface-2 rounded text-xs text-text-secondary leading-relaxed">
          {defect.description}
        </div>

        {[
          ['Tank', tank ? `T-${tank.tankNumber} (${tank.ohNumber})` : '—'],
          ['Stage', stage ? `Stage ${stage.number} — ${stage.shortName}` : '—'],
          ['Process', process?.name ?? '—'],
          ['Assigned To', defect.assignedTo],
          ['Created', formatDate(defect.createdDate)],
          ['Target Date', formatDate(defect.targetDate)],
        ].map(([label, value]) => (
          <div key={label as string} className="flex justify-between border-b border-border pb-2">
            <span className="text-xs text-text-tertiary">{label}</span>
            <span className="text-xs text-text-primary text-right max-w-[200px]">{value}</span>
          </div>
        ))}

        {defect.resolution && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1">Resolution</div>
            <p className="text-xs text-status-completed">{defect.resolution}</p>
          </div>
        )}

        {defect.remarks && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1">Remarks</div>
            <p className="text-xs text-text-secondary">{defect.remarks}</p>
          </div>
        )}

        {relatedInspection && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">Related Inspection</div>
            <div className="p-2 bg-surface-2 rounded flex items-center justify-between">
              <div>
                <div className="text-xs text-text-primary">{relatedInspection.name}</div>
                <div className="text-2xs text-text-tertiary">{formatDate(relatedInspection.scheduledDate)}</div>
              </div>
              <StatusBadge type="inspection" value={relatedInspection.status} size="sm" />
            </div>
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

export default function Defects() {
  const [selected, setSelected] = useState<Defect | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [remoteDefects, setRemoteDefects] = useState<Defect[]>([]);
  const [remoteInspections, setRemoteInspections] = useState<Inspection[]>([]);
  const [remoteTanks, setRemoteTanks] = useState<Tank[]>([]);
  const [remoteStages, setRemoteStages] = useState<Stage[]>([]);
  const [remoteProcesses, setRemoteProcesses] = useState<Process[]>([]);

  useEffect(() => {
    void Promise.all([defectService.getDefects(), inspectionService.getInspections(), productionService.getTanks(), resourceService.getStages(), processService.getProcesses()]).then(([nextDefects, nextInspections, nextTanks, nextStages, nextProcesses]) => {
      setRemoteDefects(nextDefects);
      setRemoteInspections(nextInspections);
      setRemoteTanks(nextTanks);
      setRemoteStages(nextStages);
      setRemoteProcesses(nextProcesses);
    });
  }, []);

  const filtered = useMemo(() => remoteDefects.filter((d) => {
    const tank = remoteTanks.find((t) => t.id === d.tankId);
    const matchSearch = !search || d.id.toLowerCase().includes(search.toLowerCase()) || tank?.tankNumber.includes(search) || d.category.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === 'all' || d.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchSeverity && matchStatus;
  }), [remoteDefects, remoteTanks, search, severityFilter, statusFilter]);

  const kpis = {
    open: remoteDefects.filter((d) => d.status === 'open').length,
    inProgress: remoteDefects.filter((d) => d.status === 'in-progress').length,
    critical: remoteDefects.filter((d) => d.severity === 'critical').length,
    major: remoteDefects.filter((d) => d.severity === 'major').length,
    minor: remoteDefects.filter((d) => d.severity === 'minor').length,
    resolved: remoteDefects.filter((d) => d.status === 'resolved' || d.status === 'closed').length,
  };

  const columns: Column<Defect>[] = [
    { key: 'id', header: 'Defect ID', width: 'w-20', render: (d) => <span className="font-mono text-text-tertiary">{d.id}</span> },
    { key: 'tank', header: 'Tank', width: 'w-20', render: (d) => {
      const t = remoteTanks.find((t) => t.id === d.tankId);
      return <span className="font-mono font-semibold text-text-primary">T-{t?.tankNumber}</span>;
    }},
    { key: 'category', header: 'Category', render: (d) => <span className="text-text-primary">{d.category}</span> },
    { key: 'severity', header: 'Severity', width: 'w-24', render: (d) => <StatusBadge type="defect-severity" value={d.severity} size="sm" /> },
    { key: 'desc', header: 'Description', render: (d) => <span className="text-text-secondary text-xs line-clamp-1">{d.description}</span> },
    { key: 'assigned', header: 'Assigned To', render: (d) => <span className="text-text-secondary text-xs">{d.assignedTo}</span> },
    { key: 'target', header: 'Target Date', render: (d) => <span className="text-text-secondary text-xs">{formatDate(d.targetDate)}</span> },
    { key: 'status', header: 'Status', width: 'w-28', render: (d) => <StatusBadge type="defect-status" value={d.status} size="sm" /> },
  ];

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Defect Control Center</h1>
        <p className="page-subtitle">Active defects preventing tank progression</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Open" value={kpis.open} accent="critical" icon={<AlertTriangle size={14} />} />
        <KpiCard label="In Progress" value={kpis.inProgress} accent="warning" />
        <KpiCard label="Critical" value={kpis.critical} accent="critical" />
        <KpiCard label="Major" value={kpis.major} accent="warning" />
        <KpiCard label="Minor" value={kpis.minor} accent="active" />
        <KpiCard label="Resolved" value={kpis.resolved} accent="completed" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input className="input-field pl-8 w-44" placeholder="Search defect / tank..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-field w-32" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>
        <select className="select-field w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <span className="ml-auto text-xs text-text-tertiary">{filtered.length} records</span>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(d) => d.id}
          onRowClick={(d) => setSelected(d)}
          emptyMessage="No defects match the current filters."
        />
      </div>
      {apiMode && remoteDefects.length === 0 && <div className="card p-5 text-sm text-text-tertiary">No verified defect records available.</div>}

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
          <DefectDrawer defect={selected} inspections={remoteInspections} tanks={remoteTanks} stages={remoteStages} processes={remoteProcesses} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
