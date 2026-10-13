import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crosshair, CheckCircle2, AlertTriangle, Clock, Activity,
  ClipboardCheck, Layers, ArrowDown, Circle,
} from 'lucide-react';
import { productionService } from '../../services/productionService';
import { KpiCard } from '../../components/ui/KpiCard';
import { ActiveBlockers } from '../../components/production/BlockerCard';
import { formatDateTime } from '../../utils/dateUtils';
import type { ActivityLog, Stage, Tank } from '../../models';
import { apiRequest } from '../../services/api/client';
import { resourceService } from '../../services/api/resourceService';
import { ConnectionStatus } from '../../components/layout/ConnectionStatus';
import { useDataModeStore } from '../../store/useDataModeStore';
import { subscribeRealtime } from '../../services/realtime';

interface KpiSummary {
  total: number; completed: number; active: number;
  warning: number; critical: number; pending: number;
  openDefects: number; pendingInspections: number;
}

const STAGE_FLOW = [
  { id: 'S1', label: 'STRIPPING', sub: 'Wash & Degrease' },
  { id: 'S2', label: 'RECLAMATION', sub: 'Hull & Components' },
  { id: 'S3', label: 'ASSEMBLY', sub: 'Engine, Hull, Suspension' },
  { id: 'S4', label: 'SEMI-FINAL', sub: 'Turret & Fitment' },
  { id: 'S5', label: 'INTEGRATION', sub: 'Static Testing' },
  { id: 'S6', label: 'ROAD TRIAL & HANDOVER', sub: 'JRI & Dispatch' },
];

const STAGE_COLORS: Record<string, string> = {
  S1: '#6B5B9E', S2: '#2A6090', S3: '#1E7A7A',
  S4: '#8A6020', S5: '#8A4820', S6: '#2A7A40',
};

function ProductionFlow({ fleet, stages }: Readonly<{ fleet: Tank[]; stages: Stage[] }>) {
  const navigate = useNavigate();
  return (
    <div className="card p-4">
      <div className="text-2xs font-bold text-text-tertiary uppercase tracking-wider mb-4" style={{ letterSpacing: '0.12em' }}>
        PRODUCTION FLOW
      </div>
      <div className="flex flex-col gap-0">
        {STAGE_FLOW.map((sf, idx) => {
          const stage = stages.find((s) => s.id === sf.id);
          const count = fleet.filter((t) => t.currentStageId === sf.id).length;
          const critical = fleet.filter((t) => t.currentStageId === sf.id && t.status === 'critical').length;
          const warning = fleet.filter((t) => t.currentStageId === sf.id && t.status === 'warning').length;
          const color = STAGE_COLORS[sf.id] ?? '#4A7C59';
          const pct = fleet.length > 0 ? Math.round((count / fleet.length) * 100) : 0;

          return (
            <div key={sf.id}>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-surface-2 transition-colors group text-left"
                onClick={() => navigate('/admin/tanks')}
              >
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0"
                  style={{ background: color, minHeight: 32 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-text-primary" style={{ color }}>
                      S{idx + 1} — {sf.label}
                    </span>
                    {critical > 0 && (
                      <span className="text-2xs text-status-critical font-bold">⚠ {critical} CRITICAL</span>
                    )}
                    {warning > 0 && !critical && (
                      <span className="text-2xs text-status-warning font-bold">△ {warning} AT RISK</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
                    </div>
                    <span className="text-2xs text-text-tertiary w-12 text-right tabular-nums">
                      {count} tank{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-2xs text-text-tertiary mt-0.5">{stage?.shortName ?? sf.sub}</div>
                </div>
              </button>
              {idx < STAGE_FLOW.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown size={10} className="text-text-tertiary opacity-40" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveActivityFeed({ activity }: Readonly<{ activity: ActivityLog[] }>) {
  const recent = [...activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);

  return (
    <div className="card flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-status-active flex-shrink-0" style={{ boxShadow: '0 0 4px #3A7EC4' }} />
        <span className="text-2xs font-bold text-text-tertiary uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
          LIVE OPERATIONS
        </span>
      </div>
      {recent.length === 0 ? (
        <div className="px-4 py-5 text-xs text-text-tertiary">No verified activity records available.</div>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-y-auto" style={{ maxHeight: 280 }}>
          {recent.map((log) => {
            const tankLabel = log.tankId ? `T-${String(log.tankId).replace('T-', '')}` : '—';
            return (
              <div key={log.id} className="px-4 py-2.5 flex items-start gap-3">
                <div className="w-1 self-stretch rounded-full bg-accent flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-text-secondary">{tankLabel}</span>
                    <span className="text-xs text-text-primary truncate">{log.action}</span>
                  </div>
                  <div className="text-2xs text-text-tertiary mt-0.5">
                    {formatDateTime(log.timestamp)} · {log.performedBy}
                  </div>
                  {log.details && (
                    <div className="text-2xs text-text-tertiary mt-0.5 truncate">{log.details}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveProductionBoard({ fleet, stages }: Readonly<{ fleet: Tank[]; stages: Stage[] }>) {
  const navigate = useNavigate();
  const active = fleet
    .filter((t) => t.status !== 'completed' && t.status !== 'pending')
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, active: 2 };
      return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
    })
    .slice(0, 10);

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-2xs font-bold text-text-tertiary uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>
          LIVE PRODUCTION BOARD
        </span>
        <button className="text-2xs text-text-tertiary hover:text-text-secondary" onClick={() => navigate('/admin/tanks')}>
          View All →
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['TANK', 'STAGE', 'PROGRESS', 'STATUS', 'EXPECTED', 'DELAY'].map((h) => (
                <th key={h} className="table-header px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {active.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-4 text-xs text-text-tertiary text-center">No active tanks</td></tr>
            ) : active.map((t) => {
              const stage = stages.find((s) => s.id === t.currentStageId);
              const statusColor = t.status === 'critical' ? 'text-status-critical' : t.status === 'warning' ? 'text-status-warning' : 'text-status-active';
              return (
                <tr
                  key={t.id}
                  className="hover:bg-surface-2 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/tanks/${t.id}`)}
                >
                  <td className="px-3 py-2">
                    <span className="text-xs font-mono font-semibold text-text-primary">T-{t.tankNumber}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-text-secondary">{stage?.shortName ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${t.overallProgress}%`,
                            background: t.status === 'critical' ? '#C44040' : t.status === 'warning' ? '#C4882A' : '#3A7EC4',
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-text-secondary">{t.overallProgress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-semibold uppercase ${statusColor}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-text-secondary font-mono">{t.expectedCompletion}</span>
                  </td>
                  <td className="px-3 py-2">
                    {t.delayDays > 0 ? (
                      <span className="text-xs text-status-warning font-mono">+{t.delayDays}d</span>
                    ) : (
                      <span className="text-xs text-status-completed">On Plan</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [fleet, setFleet] = useState<Tank[]>([]);
  const [dashboardStages, setDashboardStages] = useState<Stage[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { mode } = useDataModeStore();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      productionService.getKpiSummary(),
      productionService.getTanks(),
      resourceService.getStages(),
      apiRequest<Array<{ id: string; tank_id: string; process_id?: string; action: string; performed_by: string; timestamp: string; details?: string }>>('/api/activity'),
    ]).then(([summary, remoteFleet, remoteStages, remoteActivity]) => {
      setKpi(summary);
      setFleet(remoteFleet);
      setDashboardStages(remoteStages);
      setActivity(remoteActivity.map((item) => ({
        id: item.id, tankId: item.tank_id, processId: item.process_id,
        action: item.action, performedBy: item.performed_by,
        timestamp: item.timestamp, details: item.details,
      })));
      setLoading(false);
    }).catch((error: Error) => { setLoadError(error.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime refresh on production events
  useEffect(() => {
    const unsubs = [
      subscribeRealtime('tank.updated', () => load()),
      subscribeRealtime('production.updated', () => load()),
      subscribeRealtime('activity.created', () => load()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [load]);

  const onPlan = fleet.filter((t) => t.status === 'active' && t.delayDays === 0).length;
  const atRisk = fleet.filter((t) => t.status === 'warning').length;
  const blocked = fleet.filter((t) => t.status === 'critical').length;

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Command Center Header */}
      <div
        className="rounded border border-border p-4 flex items-start justify-between"
        style={{ background: 'linear-gradient(135deg, #070A0E 0%, #0A0F0C 60%, #070A0E 100%)' }}
      >
        <div>
          <div className="text-2xs font-bold text-accent uppercase tracking-widest mb-1" style={{ letterSpacing: '0.2em' }}>
            505 BASE WORKSHOP
          </div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight leading-tight">
            DIGITAL TANK PRODUCTION COMMAND CENTER
          </h1>
          <p className="text-xs text-text-tertiary mt-1">Tank Overhaul Production Control · {fleet.length} tanks in batch</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ConnectionStatus />
          <div className="flex items-center gap-1.5 text-2xs text-text-tertiary">
            <Circle size={6} className={mode === 'PRODUCTION' ? 'text-status-active fill-status-active' : 'text-status-warning fill-status-warning'} />
            <span>{mode === 'PRODUCTION' ? 'PostgreSQL · Verified Data' : 'Simulation · Synthetic Data'}</span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="card p-3 text-xs text-status-critical border-status-critical-border bg-status-critical-bg">
          ⚠ Database unavailable: {loadError} — displaying simulation data
        </div>
      )}

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-3 animate-pulse h-16" />
          ))}
        </div>
      ) : kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="col-span-2">
            <KpiCard label="Total Tanks" value={kpi.total} icon={<Crosshair size={14} />} sub="In production batch" />
          </div>
          <KpiCard label="Completed" value={kpi.completed} accent="completed" icon={<CheckCircle2 size={14} />} onClick={() => navigate('/admin/tanks')} />
          <KpiCard label="Active" value={kpi.active} accent="active" icon={<Activity size={14} />} onClick={() => navigate('/admin/tanks')} />
          <KpiCard label="At Risk" value={kpi.warning} accent="warning" icon={<Clock size={14} />} onClick={() => navigate('/admin/tanks')} />
          <KpiCard label="Critical" value={kpi.critical} accent="critical" icon={<AlertTriangle size={14} />} onClick={() => navigate('/admin/tanks')} />
          <KpiCard label="Open Defects" value={kpi.openDefects} accent="warning" icon={<AlertTriangle size={14} />} onClick={() => navigate('/admin/defects')} />
          <KpiCard label="Pending Insp." value={kpi.pendingInspections} accent="active" icon={<ClipboardCheck size={14} />} onClick={() => navigate('/admin/inspections')} />
        </div>
      )}

      {/* Production Pulse row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ON PLAN', value: onPlan, color: '#4A9E6A', bg: '#0A2016', border: '#1A4A2A' },
          { label: 'AT RISK', value: atRisk, color: '#C4882A', bg: '#261800', border: '#6A3E00' },
          { label: 'BLOCKED', value: blocked, color: '#C44040', bg: '#260A0A', border: '#6A1A1A' },
          { label: 'PENDING', value: kpi?.pending ?? 0, color: '#445060', bg: '#111620', border: '#2A3545' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded border p-3 flex items-center gap-3"
            style={{ background: item.bg, borderColor: item.border }}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>{item.value}</div>
              <div className="text-2xs font-bold text-text-tertiary uppercase tracking-wider" style={{ letterSpacing: '0.1em' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Production Flow + Live Board */}
        <div className="flex flex-col gap-4">
          <ProductionFlow fleet={fleet} stages={dashboardStages} />
        </div>

        {/* Center: Live Production Board */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <LiveProductionBoard fleet={fleet} stages={dashboardStages} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LiveActivityFeed activity={activity} />
            <ActiveBlockers />
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tank Fleet', sub: `${kpi?.total ?? 0} tanks`, icon: Crosshair, to: '/admin/tanks' },
          { label: 'PERT Workflow', sub: '31 processes', icon: Layers, to: '/admin/pert' },
          { label: 'Inspections', sub: `${kpi?.pendingInspections ?? 0} pending`, icon: ClipboardCheck, to: '/admin/inspections' },
          { label: 'Defects', sub: `${kpi?.openDefects ?? 0} open`, icon: AlertTriangle, to: '/admin/defects' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              className="card p-3 text-left hover:bg-surface-2 transition-colors duration-fast group"
              onClick={() => navigate(item.to)}
            >
              <Icon size={15} className="text-accent mb-2" />
              <div className="text-sm font-medium text-text-primary">{item.label}</div>
              <div className="text-xs text-text-tertiary">{item.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
