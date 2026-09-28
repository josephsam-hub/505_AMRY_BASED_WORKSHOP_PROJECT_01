import { useCallback, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge, type NodeProps,
  Handle, Position, useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, ArrowRight } from 'lucide-react';
import type { Bay, Gang, Process, Stage, Tank } from '../../models';
import { processService } from '../../services/api/processService';
import { resourceService } from '../../services/api/resourceService';
import { productionService } from '../../services/productionService';

// ─── Derive process status from tank data ────────────────────────────────────
function getProcessStatus(processId: string, tanks: Tank[], processes: Process[]): 'completed' | 'active' | 'blocked' | 'pending' | 'delayed' {
  const activeTanks = tanks.filter((t) => t.currentProcessId === processId);
  if (activeTanks.length === 0) {
    // Check if any tank has passed this process
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return 'pending';
    const procNum = proc.processNumber;
    const tanksPassedThis = tanks.filter((t) => {
      const cur = processes.find((p) => p.id === t.currentProcessId);
      return cur && cur.processNumber > procNum;
    });
    return tanksPassedThis.length > 0 ? 'completed' : 'pending';
  }
  const hasCritical = activeTanks.some((t) => t.status === 'critical');
  const hasWarning = activeTanks.some((t) => t.status === 'warning');
  if (hasCritical) return 'blocked';
  if (hasWarning) return 'delayed';
  return 'active';
}

// ─── Node colors ─────────────────────────────────────────────────────────────
const statusStyle: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  completed: { bg: '#052E16', border: '#166534', text: '#22C55E', dot: '#22C55E' },
  active:    { bg: '#0C1A3A', border: '#1D4ED8', text: '#3B82F6', dot: '#3B82F6' },
  blocked:   { bg: '#2D0A0A', border: '#991B1B', text: '#EF4444', dot: '#EF4444' },
  delayed:   { bg: '#2D1A00', border: '#92400E', text: '#F59E0B', dot: '#F59E0B' },
  pending:   { bg: '#111827', border: '#2A3A52', text: '#5A7090', dot: '#4B5563' },
};

const stageColors: Record<string, string> = {
  S1: '#7C3AED', S2: '#2563EB', S3: '#0891B2',
  S4: '#D97706', S5: '#EA580C', S6: '#16A34A',
};

// ─── Custom Process Node ──────────────────────────────────────────────────────
function ProcessNode({ data, selected }: NodeProps) {
  const d = data as { process: Process; status: string };
  const s = statusStyle[d.status] ?? statusStyle.pending;
  const stageColor = stageColors[d.process.stageId] ?? '#4B5563';

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${selected ? '#1D6FA4' : s.border}`,
        borderLeft: `3px solid ${stageColor}`,
        borderRadius: 4,
        padding: '6px 10px',
        minWidth: 160,
        maxWidth: 180,
        boxShadow: selected ? '0 0 0 2px #1D6FA4' : '0 2px 6px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#2A3A52', width: 6, height: 6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: '#5A7090', fontFamily: 'monospace' }}>
          P{String(d.process.processNumber).padStart(2, '0')}
        </span>
        {d.process.pathType === 'CRITICAL' && (
          <span style={{ fontSize: 9, color: '#EF4444', marginLeft: 'auto', fontWeight: 600 }}>CRIT</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: s.text, fontWeight: 500, lineHeight: 1.3 }}>
        {d.process.name}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#2A3A52', width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = { processNode: ProcessNode };

// ─── Build nodes and edges ────────────────────────────────────────────────────
const COL_W = 220;
const ROW_H = 110;

function buildGraph(filterStage: string, filterStatus: string, criticalOnly: boolean, processes: Process[], tanks: Tank[]) {
  const filtered = processes.filter((p) => {
    if (filterStage !== 'all' && p.stageId !== filterStage) return false;
    const status = getProcessStatus(p.id, tanks, processes);
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    if (criticalOnly && p.pathType !== 'CRITICAL') return false;
    return true;
  });

  const filteredIds = new Set(filtered.map((p) => p.id));

  const nodes: Node[] = filtered.map((p) => ({
    id: p.id,
    type: 'processNode',
    position: { x: (p.pertColumn ?? 0) * COL_W, y: (p.pertRow ?? 0) * ROW_H },
    data: { process: p, status: getProcessStatus(p.id, tanks, processes) },
  }));

  const edges: Edge[] = [];
  filtered.forEach((p) => {
    p.successors.forEach((succId) => {
      if (!filteredIds.has(succId)) return;
      const isCritical = p.pathType === 'CRITICAL';
      edges.push({
        id: `${p.id}-${succId}`,
        source: p.id,
        target: succId,
        style: {
          stroke: isCritical ? '#EF4444' : '#2A3A52',
          strokeWidth: isCritical ? 1.5 : 1,
          strokeDasharray: isCritical ? undefined : '4 3',
        },
        animated: getProcessStatus(p.id, tanks, processes) === 'active',
      });
    });
  });

  return { nodes, edges };
}

// ─── Process Detail Panel ─────────────────────────────────────────────────────
function ProcessDetailPanel({ processId, processes, stages, tanks, bays, gangs, onClose }: { processId: string; processes: Process[]; stages: Stage[]; tanks: Tank[]; bays: Bay[]; gangs: Gang[]; onClose: () => void }) {
  const navigate = useNavigate();
  const proc = processes.find((p) => p.id === processId);
  if (!proc) return null;

  const stage = stages.find((s) => s.id === proc.stageId);
  const status = getProcessStatus(proc.id, tanks, processes);
  const affectedTanks = tanks.filter((t) => t.currentProcessId === proc.id);
  const bay = bays.find((b) => b.currentProcessId === proc.id);
  const gang = gangs.find((g) => g.assignedProcessIds.includes(proc.id));
  const predecessorNames = proc.predecessors.map((id) => processes.find((p) => p.id === id)?.name ?? id);
  const successorNames = proc.successors.map((id) => processes.find((p) => p.id === id)?.name ?? id);

  const statusColors: Record<string, string> = {
    completed: 'text-status-completed', active: 'text-status-active',
    blocked: 'text-status-critical', delayed: 'text-status-warning', pending: 'text-text-tertiary',
  };
  const statusLabels: Record<string, string> = {
    completed: 'Completed', active: 'In Progress', blocked: 'Blocked', delayed: 'Delayed', pending: 'Pending',
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-surface-1 border-l border-border flex flex-col z-10 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <div className="text-xs text-text-tertiary font-mono">P{String(proc.processNumber).padStart(2, '0')}</div>
          <div className="text-sm font-semibold text-text-primary leading-tight">{proc.name}</div>
        </div>
        <button className="btn-ghost px-1.5 py-1" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {/* Status + path */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${statusColors[status]}`}>{statusLabels[status]}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-sm border ${proc.pathType === 'CRITICAL' ? 'bg-status-critical-bg border-status-critical-border text-status-critical' : 'bg-surface-2 border-border text-text-tertiary'}`}>
            {proc.pathType === 'CRITICAL' ? 'Critical Path' : 'Non-Critical'}
          </span>
        </div>

        {/* Info rows */}
        {[
          ['Stage', `Stage ${stage?.number} — ${stage?.shortName}`],
          ['Duration', `${proc.durationDays} days`],
          ['Bay', bay?.name ?? '—'],
          ['Gang', gang?.name ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-start border-b border-border pb-2">
            <span className="text-xs text-text-tertiary">{label}</span>
            <span className="text-xs text-text-primary text-right max-w-[160px]">{value}</span>
          </div>
        ))}

        {/* Dependencies */}
        {predecessorNames.length > 0 && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">Predecessors</div>
            {predecessorNames.map((n, i) => (
              <div key={i} className="text-xs text-text-secondary py-0.5">← {n}</div>
            ))}
          </div>
        )}
        {successorNames.length > 0 && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">Next Processes</div>
            {successorNames.map((n, i) => (
              <div key={i} className="text-xs text-text-secondary py-0.5">→ {n}</div>
            ))}
          </div>
        )}

        {/* Affected tanks */}
        {affectedTanks.length > 0 && (
          <div>
            <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1.5">
              Tanks Currently on This Process ({affectedTanks.length})
            </div>
            <div className="flex flex-col gap-1">
              {affectedTanks.map((t) => (
                <button
                  key={t.id}
                  className="flex items-center justify-between px-2 py-1.5 bg-surface-2 rounded hover:bg-surface-3 transition-colors group"
                  onClick={() => navigate(`/admin/tanks/${t.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      t.status === 'critical' ? 'bg-status-critical' :
                      t.status === 'warning' ? 'bg-status-warning' :
                      t.status === 'active' ? 'bg-status-active' : 'bg-status-pending'
                    }`} />
                    <span className="text-xs font-mono text-text-primary">T-{t.tankNumber}</span>
                    {t.delayDays > 0 && (
                      <span className="text-2xs text-status-warning">+{t.delayDays}d</span>
                    )}
                  </div>
                  <ArrowRight size={11} className="text-text-tertiary group-hover:text-text-secondary" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-surface-1 border border-border rounded p-3 z-10 flex flex-col gap-1.5">
      <div className="text-2xs text-text-tertiary uppercase tracking-wider mb-1">Legend</div>
      {[
        { color: '#22C55E', label: 'Completed' },
        { color: '#3B82F6', label: 'In Progress' },
        { color: '#EF4444', label: 'Blocked' },
        { color: '#F59E0B', label: 'Delayed' },
        { color: '#4B5563', label: 'Pending' },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
          <span className="text-xs text-text-secondary">{item.label}</span>
        </div>
      ))}
      <div className="border-t border-border mt-1 pt-1.5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-px bg-red-500" />
          <span className="text-xs text-text-secondary">Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-px bg-border-strong" style={{ borderTop: '1px dashed #3A4F6A' }} />
          <span className="text-xs text-text-secondary">Non-Critical</span>
        </div>
      </div>
    </div>
  );
}

// ─── Inner PERT component (needs ReactFlowProvider context) ───────────────────
function PertInner() {
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [remoteProcesses, setRemoteProcesses] = useState<Process[]>([]);
  const [remoteStages, setRemoteStages] = useState<Stage[]>([]);
  const [remoteTanks, setRemoteTanks] = useState<Tank[]>([]);
  const [remoteBays, setRemoteBays] = useState<Bay[]>([]);
  const [remoteGangs, setRemoteGangs] = useState<Gang[]>([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    void Promise.all([processService.getProcesses(), resourceService.getStages(), productionService.getTanks(), resourceService.getBays(), resourceService.getGangs()]).then(([nextProcesses, nextStages, nextTanks, nextBays, nextGangs]) => {
      setRemoteProcesses(nextProcesses);
      setRemoteStages(nextStages);
      setRemoteTanks(nextTanks);
      setRemoteBays(nextBays);
      setRemoteGangs(nextGangs);
    });
  }, []);

  const { nodes, edges } = useMemo(
    () => buildGraph(filterStage, filterStatus, criticalOnly, remoteProcesses, remoteTanks),
    [filterStage, filterStatus, criticalOnly, remoteProcesses, remoteTanks]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedProcess(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedProcess(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-1 flex-shrink-0">
        <div>
          <h1 className="page-title">PERT / Workflow</h1>
          <p className="page-subtitle">31-process production workflow · Critical path highlighted</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="select-field w-36" value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
            <option value="all">All Stages</option>
            {remoteStages.map((s) => <option key={s.id} value={s.id}>Stage {s.number} — {s.shortName}</option>)}
          </select>
          <select className="select-field w-32" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="active">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="delayed">Delayed</option>
            <option value="pending">Pending</option>
          </select>
          <button
            className={`btn-ghost text-xs ${criticalOnly ? 'bg-status-critical-bg border border-status-critical-border text-status-critical' : ''}`}
            onClick={() => setCriticalOnly((v) => !v)}
          >
            Critical Path Only
          </button>
          <button className="btn-ghost text-xs" onClick={() => fitView({ padding: 0.1, duration: 300 })}>
            Fit View
          </button>
        </div>
      </div>

      {/* Stage color key */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-border bg-base-800 flex-shrink-0 overflow-x-auto">
        {remoteStages.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: stageColors[s.id] }} />
            <span className="text-2xs text-text-secondary">S{s.number} {s.shortName}</span>
          </div>
        ))}
      </div>

      {/* Flow canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1E2D42" gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const status = (n.data as { status: string }).status;
              return statusStyle[status]?.dot ?? '#4B5563';
            }}
            maskColor="rgba(11,15,26,0.7)"
          />
        </ReactFlow>
        <Legend />
        {selectedProcess && (
          <ProcessDetailPanel
            processId={selectedProcess}
            processes={remoteProcesses}
            stages={remoteStages}
            tanks={remoteTanks}
            bays={remoteBays}
            gangs={remoteGangs}
            onClose={() => setSelectedProcess(null)}
          />
        )}
      </div>
    </div>
  );
}

export default function Pert() {
  return (
    <div className="h-full">
      <ReactFlowProvider>
        <PertInner />
      </ReactFlowProvider>
    </div>
  );
}
