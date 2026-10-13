import { useCallback, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge, type NodeProps,
  Handle, Position, useReactFlow, ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, ArrowRight, AlertTriangle, ChevronDown } from 'lucide-react';
import { useState as useLocalState } from 'react';
import type { Bay, Gang, Process, Stage, Tank } from '../../models';
import { processService } from '../../services/api/processService';
import { resourceService } from '../../services/api/resourceService';
import { productionService } from '../../services/productionService';
import { computeLayout, detectOverlaps, NODE_W, NODE_H, LANE_HEADER_H } from '../../components/pert/pertLayout';

// ── Status derivation ────────────────────────────────────────────────────────
function getProcessStatus(
  processId: string,
  tanks: Tank[],
  processes: Process[]
): 'completed' | 'active' | 'blocked' | 'pending' | 'delayed' {
  const activeTanks = tanks.filter((t) => t.currentProcessId === processId);
  if (activeTanks.length === 0) {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return 'pending';
    const tanksPassedThis = tanks.filter((t) => {
      const cur = processes.find((p) => p.id === t.currentProcessId);
      return cur && cur.processNumber > proc.processNumber;
    });
    return tanksPassedThis.length > 0 ? 'completed' : 'pending';
  }
  if (activeTanks.some((t) => t.status === 'critical')) return 'blocked';
  if (activeTanks.some((t) => t.status === 'warning')) return 'delayed';
  return 'active';
}

// ── Visual config ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  completed: { bg: '#052E16', border: '#166534', text: '#22C55E', dot: '#22C55E' },
  active:    { bg: '#0C1A3A', border: '#1D4ED8', text: '#3B82F6', dot: '#3B82F6' },
  blocked:   { bg: '#2D0A0A', border: '#991B1B', text: '#EF4444', dot: '#EF4444' },
  delayed:   { bg: '#2D1A00', border: '#92400E', text: '#F59E0B', dot: '#F59E0B' },
  pending:   { bg: '#111827', border: '#2A3A52', text: '#5A7090', dot: '#4B5563' },
};

const STAGE_COLORS: Record<string, string> = {
  S1: '#7C3AED', S2: '#2563EB', S3: '#0891B2',
  S4: '#D97706', S5: '#EA580C', S6: '#16A34A',
};

// ── Stage Lane background node ───────────────────────────────────────────────
function StageLaneNode({ data }: NodeProps) {
  const d = data as { label: string; color: string; width: number; height: number };
  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        background: 'rgba(15,22,36,0.7)',
        border: `1px solid ${d.color}33`,
        borderTop: `2px solid ${d.color}`,
        borderRadius: 4,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: LANE_HEADER_H,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          borderBottom: `1px solid ${d.color}22`,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: d.color, letterSpacing: '0.1em', fontFamily: 'monospace' }}>
          {d.label}
        </span>
      </div>
    </div>
  );
}

// ── Process Node ─────────────────────────────────────────────────────────────
function ProcessNode({ data, selected }: NodeProps) {
  const d = data as { process: Process; status: string };
  const s = STATUS_STYLE[d.status] ?? STATUS_STYLE.pending;
  const stageColor = STAGE_COLORS[d.process.stageId] ?? '#4B5563';
  const isTerminal = d.process.successors.length === 0;

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${selected ? '#60A5FA' : s.border}`,
        borderLeft: `3px solid ${stageColor}`,
        borderRadius: 4,
        padding: '7px 10px',
        width: NODE_W,
        minHeight: NODE_H,
        boxShadow: selected ? `0 0 0 2px #60A5FA44` : '0 2px 8px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{ background: '#2A3A52', width: 8, height: 8, border: '1px solid #3A4F6A' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: '#5A7090', fontFamily: 'monospace', fontWeight: 600 }}>
          P{String(d.process.processNumber).padStart(2, '0')}
        </span>
        {d.process.pathType === 'CRITICAL' && (
          <span style={{ fontSize: 9, color: '#EF4444', marginLeft: 'auto', fontWeight: 700, letterSpacing: '0.05em' }}>
            CRIT
          </span>
        )}
        {isTerminal && (
          <span style={{ fontSize: 9, color: '#16A34A', marginLeft: d.process.pathType === 'CRITICAL' ? 4 : 'auto', fontWeight: 700 }}>
            END
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: s.text, fontWeight: 500, lineHeight: 1.35, wordBreak: 'break-word' }}>
        {d.process.name}
      </div>

      {!isTerminal && (
        <Handle
          type="source"
          position={Position.Right}
          id="source-right"
          style={{ background: '#2A3A52', width: 8, height: 8, border: '1px solid #3A4F6A' }}
        />
      )}
    </div>
  );
}

const nodeTypes = { processNode: ProcessNode, stageLane: StageLaneNode };

// ── Build React Flow nodes + edges from processes ────────────────────────────
function buildGraph(
  filterStage: string,
  filterStatus: string,
  criticalOnly: boolean,
  processes: Process[],
  stages: Stage[],
  tanks: Tank[]
): { nodes: Node[]; edges: Edge[] } {
  if (processes.length === 0 || stages.length === 0) return { nodes: [], edges: [] };

  // Compute layout for ALL processes first (so lane sizes are stable)
  const { nodes: layoutNodes, lanes } = computeLayout(processes, stages);

  // Overlap validation (dev only)
  if (import.meta.env.DEV) {
    const overlaps = detectOverlaps(layoutNodes);
    if (overlaps.length > 0) {
      console.warn(JSON.stringify({ event: 'pert_overlaps', count: overlaps.length }));
    } else {
      console.info(JSON.stringify({ event: 'pert_layout_clean', nodeCount: layoutNodes.length }));
    }
  }

  // Apply filters
  const filtered = processes.filter((p) => {
    if (filterStage !== 'all' && p.stageId !== filterStage) return false;
    const status = getProcessStatus(p.id, tanks, processes);
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    if (criticalOnly && p.pathType !== 'CRITICAL') return false;
    return true;
  });
  const filteredIds = new Set(filtered.map((p) => p.id));

  // Stage lane background nodes (only for visible stages)
  const laneNodes: Node[] = lanes
    .filter((lane) => filterStage === 'all' || lane.stageId === filterStage)
    .map((lane) => ({
      id: `lane-${lane.stageId}`,
      type: 'stageLane',
      position: { x: lane.x, y: lane.y },
      data: { label: lane.label, color: lane.color, width: lane.width, height: lane.height },
      selectable: false,
      draggable: false,
      zIndex: -1,
    }));

  // Process nodes
  const processNodes: Node[] = filtered.map((p) => {
    const layout = layoutNodes.find((n) => n.id === p.id);
    return {
      id: p.id,
      type: 'processNode',
      position: { x: layout?.x ?? 0, y: layout?.y ?? 0 },
      data: { process: p, status: getProcessStatus(p.id, tanks, processes) },
      zIndex: 1,
    };
  });

  // Edges — only between visible nodes
  const edges: Edge[] = [];
  const edgeIds = new Set<string>();

  filtered.forEach((p) => {
    p.successors.forEach((succId) => {
      if (!filteredIds.has(succId)) return;
      const edgeId = `${p.id}->${succId}`;
      if (edgeIds.has(edgeId)) return;
      edgeIds.add(edgeId);

      const isCritical = p.pathType === 'CRITICAL';
      const srcStatus = getProcessStatus(p.id, tanks, processes);

      const strokeColor =
        srcStatus === 'blocked' ? '#EF4444' :
        srcStatus === 'delayed' ? '#F59E0B' :
        srcStatus === 'completed' ? '#166534' :
        srcStatus === 'active' ? '#1D4ED8' :
        isCritical ? '#DC2626' : '#2A3A52';

      edges.push({
        id: edgeId,
        source: p.id,
        target: succId,
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor, width: 14, height: 14 },
        style: {
          stroke: strokeColor,
          strokeWidth: isCritical ? 2 : 1,
          strokeDasharray: isCritical ? undefined : '5 4',
          opacity: isCritical ? 1 : 0.6,
        },
        animated: srcStatus === 'active',
        zIndex: 2,
      });
    });
  });

  // Validate edges (dev only)
  if (import.meta.env.DEV) {
    const nodeIdSet = new Set([...laneNodes, ...processNodes].map((n) => n.id));
    let orphanEdges = 0;
    edges.forEach((e) => {
      if (!nodeIdSet.has(e.source) || !nodeIdSet.has(e.target)) {
        console.warn(JSON.stringify({ event: 'pert_orphan_edge', edgeId: e.id }));
        orphanEdges++;
      }
    });
    console.info(JSON.stringify({ event: 'pert_edges', total: edges.length, orphans: orphanEdges }));
  }

  return { nodes: [...laneNodes, ...processNodes], edges };
}

// ── Impact Analysis (Decision Support) ─────────────────────────────────────
function getDownstreamChain(procId: string, processes: Process[]): Process[] {
  const visited = new Set<string>();
  const chain: Process[] = [];
  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const p = processes.find((x) => x.id === id);
    if (!p) return;
    chain.push(p);
    p.successors.forEach(walk);
  };
  const start = processes.find((p) => p.id === procId);
  start?.successors.forEach(walk);
  return chain;
}

function ImpactAnalysis({
  proc, processes, tanks, navigate,
}: {
  proc: Process; processes: Process[]; tanks: Tank[];
  navigate: (to: string) => void;
}) {
  const [open, setOpen] = useLocalState(false);
  const downstream = getDownstreamChain(proc.id, processes);
  const affectedTanks = tanks.filter((t) => t.currentProcessId === proc.id);
  const delayedTanks = affectedTanks.filter((t) => t.delayDays > 0);
  const criticalTanks = affectedTanks.filter((t) => t.status === 'critical');
  const estimatedImpactDays = criticalTanks.length > 0 ? proc.durationDays : delayedTanks.length > 0 ? Math.ceil(proc.durationDays * 0.3) : 0;

  if (downstream.length === 0 && affectedTanks.length === 0) return null;

  return (
    <div className="border border-border rounded overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-2 hover:bg-surface-3 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={11} className="text-status-warning" />
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider" style={{ letterSpacing: '0.08em' }}>
            IMPACT ANALYSIS
          </span>
          <span className="text-2xs text-text-tertiary">Decision Support</span>
        </div>
        <ChevronDown size={12} className={`text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3 py-3 flex flex-col gap-3 bg-surface-1">
          <div className="text-2xs text-text-tertiary italic">
            Indicative analysis only. Not a confirmed operational forecast.
          </div>

          {estimatedImpactDays > 0 && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#261800', border: '1px solid #6A3E00' }}>
              <AlertTriangle size={11} className="text-status-warning flex-shrink-0" />
              <span className="text-xs text-status-warning font-bold">Estimated delay impact: +{estimatedImpactDays} day{estimatedImpactDays !== 1 ? 's' : ''}</span>
            </div>
          )}

          {downstream.length > 0 && (
            <div>
              <div className="text-2xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Downstream Processes ({downstream.length})</div>
              <div className="flex flex-col gap-0.5">
                {downstream.slice(0, 6).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="text-text-tertiary">{i === 0 ? '↓' : ' '}</span>
                    <span className="font-mono text-text-tertiary">P{String(p.processNumber).padStart(2, '0')}</span>
                    <span className="truncate">{p.name}</span>
                    {p.pathType === 'CRITICAL' && <span className="text-2xs text-status-critical font-bold ml-auto">CRIT</span>}
                  </div>
                ))}
                {downstream.length > 6 && (
                  <div className="text-2xs text-text-tertiary">+{downstream.length - 6} more processes</div>
                )}
              </div>
            </div>
          )}

          {affectedTanks.length > 0 && (
            <div>
              <div className="text-2xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Affected Tanks</div>
              <div className="flex flex-col gap-1">
                {affectedTanks.map((t) => (
                  <button
                    key={t.id}
                    className="flex items-center justify-between px-2 py-1.5 bg-surface-2 rounded hover:bg-surface-3 transition-colors group"
                    onClick={() => navigate(`/admin/tanks/${t.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        t.status === 'critical' ? 'bg-red-500' : t.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-xs font-mono text-text-primary">T-{t.tankNumber}</span>
                      {t.delayDays > 0 && <span className="text-xs text-amber-400">+{t.delayDays}d</span>}
                    </div>
                    <ArrowRight size={11} className="text-text-tertiary group-hover:text-text-secondary" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Process Detail Panel ─────────────────────────────────────────────────────
function ProcessDetailPanel({
  processId, processes, stages, tanks, bays, gangs, onClose,
}: {
  processId: string; processes: Process[]; stages: Stage[];
  tanks: Tank[]; bays: Bay[]; gangs: Gang[]; onClose: () => void;
}) {
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
    completed: 'text-green-400', active: 'text-blue-400',
    blocked: 'text-red-400', delayed: 'text-amber-400', pending: 'text-slate-500',
  };
  const statusLabels: Record<string, string> = {
    completed: 'Completed', active: 'In Progress',
    blocked: 'Blocked', delayed: 'Delayed', pending: 'Pending',
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-surface-1 border-l border-border flex flex-col z-10 shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <div className="text-xs text-text-tertiary font-mono">P{String(proc.processNumber).padStart(2, '0')}</div>
          <div className="text-sm font-semibold text-text-primary leading-tight">{proc.name}</div>
        </div>
        <button className="btn-ghost px-1.5 py-1" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-semibold ${statusColors[status]}`}>{statusLabels[status]}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border ${
            proc.pathType === 'CRITICAL'
              ? 'bg-red-950 border-red-800 text-red-400'
              : 'bg-surface-2 border-border text-text-tertiary'
          }`}>
            {proc.pathType === 'CRITICAL' ? 'Critical Path' : 'Non-Critical'}
          </span>
        </div>

        {[
          ['Stage', stage ? `S${stage.number} — ${stage.shortName}` : '—'],
          ['Duration', `${proc.durationDays} days`],
          ['Bay', bay?.name ?? 'No verified operational data'],
          ['Gang', gang?.name ?? 'No verified operational data'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-start border-b border-border pb-2">
            <span className="text-xs text-text-tertiary">{label}</span>
            <span className="text-xs text-text-primary text-right max-w-[160px]">{value}</span>
          </div>
        ))}

        {predecessorNames.length > 0 && (
          <div>
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 font-semibold">Predecessors</div>
            {predecessorNames.map((n, i) => (
              <div key={i} className="text-xs text-text-secondary py-0.5">← {n}</div>
            ))}
          </div>
        )}

        {successorNames.length > 0 && (
          <div>
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 font-semibold">Next Processes</div>
            {successorNames.map((n, i) => (
              <div key={i} className="text-xs text-text-secondary py-0.5">→ {n}</div>
            ))}
          </div>
        )}

        {proc.successors.length === 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-green-950 border border-green-800 rounded">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-xs text-green-400 font-semibold">Terminal Process — End of Workflow</span>
          </div>
        )}

        {affectedTanks.length > 0 ? (
          <div>
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1.5 font-semibold">
              Tanks on This Process ({affectedTanks.length})
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
                      t.status === 'critical' ? 'bg-red-500' :
                      t.status === 'warning' ? 'bg-amber-500' :
                      t.status === 'active' ? 'bg-blue-500' : 'bg-slate-500'
                    }`} />
                    <span className="text-xs font-mono text-text-primary">T-{t.tankNumber}</span>
                    {t.delayDays > 0 && <span className="text-xs text-amber-400">+{t.delayDays}d</span>}
                  </div>
                  <ArrowRight size={11} className="text-text-tertiary group-hover:text-text-secondary" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-tertiary italic">No verified operational data</div>
        )}

        {/* ── IMPACT ANALYSIS (Decision Support) ── */}
        <ImpactAnalysis proc={proc} processes={processes} tanks={tanks} navigate={navigate} />
      </div>
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-surface-1 border border-border rounded p-3 z-10 flex flex-col gap-1.5 pointer-events-none">
      <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1 font-semibold">Legend</div>
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
      <div className="border-t border-border mt-1 pt-1.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-red-600" />
          <span className="text-xs text-text-secondary">Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-px" style={{ borderTop: '1px dashed #3A4F6A' }} />
          <span className="text-xs text-text-secondary">Non-Critical</span>
        </div>
      </div>
    </div>
  );
}

// ── Inner PERT (needs ReactFlowProvider context) ──────────────────────────────
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
  const [loading, setLoading] = useState(true);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      processService.getProcesses(),
      resourceService.getStages(),
      productionService.getTanks(),
      resourceService.getBays(),
      resourceService.getGangs(),
    ]).then(([procs, stgs, tanks, bays, gangs]) => {
      setRemoteProcesses(procs);
      setRemoteStages(stgs);
      setRemoteTanks(tanks);
      setRemoteBays(bays);
      setRemoteGangs(gangs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Re-fit view when filters change
  useEffect(() => {
    if (!loading) {
      setTimeout(() => fitView({ padding: 0.08, duration: 300, minZoom: 0.25, maxZoom: 1.5 }), 50);
    }
  }, [filterStage, filterStatus, criticalOnly, loading, fitView]);

  const { nodes, edges } = useMemo(
    () => buildGraph(filterStage, filterStatus, criticalOnly, remoteProcesses, remoteStages, remoteTanks),
    [filterStage, filterStatus, criticalOnly, remoteProcesses, remoteStages, remoteTanks]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'stageLane') return;
    setSelectedProcess(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedProcess(null), []);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.08, duration: 400, minZoom: 0.2, maxZoom: 1.5 });
  }, [fitView]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-1 flex-shrink-0">
        <div>
          <h1 className="page-title">PERT / Workflow</h1>
          <p className="page-subtitle">31-process production workflow · Critical path highlighted</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="select-field w-36"
            value={filterStage}
            onChange={(e) => { setFilterStage(e.target.value); setSelectedProcess(null); }}
          >
            <option value="all">All Stages</option>
            {remoteStages.map((s) => (
              <option key={s.id} value={s.id}>S{s.number} — {s.shortName}</option>
            ))}
          </select>
          <select
            className="select-field w-32"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setSelectedProcess(null); }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="active">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="delayed">Delayed</option>
            <option value="pending">Pending</option>
          </select>
          <button
            className={`btn-ghost text-xs ${criticalOnly ? 'bg-red-950 border border-red-800 text-red-400' : ''}`}
            onClick={() => { setCriticalOnly((v) => !v); setSelectedProcess(null); }}
          >
            Critical Path Only
          </button>
          <button className="btn-ghost text-xs" onClick={handleFitView}>
            Fit View
          </button>
        </div>
      </div>

      {/* Stage color key */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-border bg-surface-2 flex-shrink-0 overflow-x-auto">
        {remoteStages.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: STAGE_COLORS[s.id] }} />
            <span className="text-xs text-text-secondary">S{s.number} {s.shortName}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-900 z-20">
            <span className="text-sm text-text-tertiary">Loading workflow…</span>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.08, minZoom: 0.2, maxZoom: 1.5 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background color="#1A2535" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'stageLane') return 'transparent';
              const status = (n.data as { status: string }).status;
              return STATUS_STYLE[status]?.dot ?? '#4B5563';
            }}
            maskColor="rgba(10,14,24,0.75)"
            style={{ background: '#0F1624', border: '1px solid #1E2D42' }}
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

// ── Export ────────────────────────────────────────────────────────────────────
export default function Pert() {
  return (
    <div className="h-full">
      <ReactFlowProvider>
        <PertInner />
      </ReactFlowProvider>
    </div>
  );
}
