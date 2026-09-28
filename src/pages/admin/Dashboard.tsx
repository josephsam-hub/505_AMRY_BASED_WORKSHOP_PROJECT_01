import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, CheckCircle2, AlertTriangle, Clock, Activity, ClipboardCheck, Layers } from 'lucide-react';
import { productionService } from '../../services/productionService';
import { KpiCard } from '../../components/ui/KpiCard';
import { ProductionPulse } from '../../components/production/ProductionPulse';
import { ActiveBlockers } from '../../components/production/BlockerCard';
import { formatDateTime } from '../../utils/dateUtils';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import type { ActivityLog, Stage, Tank } from '../../models';
import { apiRequest } from '../../services/api/client';
import { resourceService } from '../../services/api/resourceService';

interface KpiSummary {
  total: number; completed: number; active: number;
  warning: number; critical: number; pending: number;
  openDefects: number; pendingInspections: number;
}

// Stage distribution bar
function StageDistribution({ fleet, stages }: Readonly<{ fleet: Tank[]; stages: Stage[] }>) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Stage Distribution</div>
      <div className="flex flex-col gap-2">
        {stages.map((stage) => {
          const count = fleet.filter((t) => t.currentStageId === stage.id).length;
          const pct = fleet.length > 0 ? Math.round((count / fleet.length) * 100) : 0;
          return (
            <div key={stage.id} className="flex items-center gap-3">
              <div className="w-5 text-2xs text-text-tertiary text-right flex-shrink-0">S{stage.number}</div>
              <div className="flex-1 h-4 bg-surface-3 rounded-sm overflow-hidden relative">
                <div
                  className="h-full bg-accent opacity-80 rounded-sm transition-all duration-slow"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-2xs text-text-secondary">
                  {stage.shortName}
                </span>
              </div>
              <div className="w-6 text-2xs text-text-secondary text-right tabular-nums flex-shrink-0">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Recent activity feed
function RecentActivity({ activity }: Readonly<{ activity: ActivityLog[] }>) {
  const recent = [...activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);
  return (
    <div className="card flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Recent Activity</span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {recent.map((log) => {
          const tankLabel = log.tankId ? `T-${String(log.tankId).replace('T-', '')}` : 'T-UNK';
          return (
            <div key={log.id} className="px-4 py-2.5 flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary">{tankLabel}</span>
                  <span className="text-xs text-text-primary truncate">{log.action}</span>
                </div>
                <div className="text-2xs text-text-tertiary mt-0.5">{formatDateTime(log.timestamp)} · {log.performedBy}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Fleet status donut using recharts
function FleetStatusChart({ kpi }: Readonly<{ kpi: KpiSummary }>) {
  const data = [
    { name: 'Completed', value: kpi.completed, fill: '#22C55E' },
    { name: 'Active', value: kpi.active, fill: '#3B82F6' },
    { name: 'At Risk', value: kpi.warning, fill: '#F59E0B' },
    { name: 'Critical', value: kpi.critical, fill: '#EF4444' },
    { name: 'Pending', value: kpi.pending, fill: '#4B5563' },
  ].filter((d) => d.value > 0);

  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Fleet Status</div>
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={2} />
              <Tooltip
                contentStyle={{ background: '#1A2235', border: '1px solid #2A3A52', borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: '#8FA3BF' }}
                itemStyle={{ color: '#E8EDF5' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                <span className="text-xs text-text-secondary">{d.name}</span>
              </div>
              <span className="text-xs font-medium text-text-primary tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [fleet, setFleet] = useState<Tank[]>([]);
  const [processCount, setProcessCount] = useState(0);
  const [dashboardStages, setDashboardStages] = useState<Stage[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      productionService.getKpiSummary(),
      productionService.getTanks(),
      apiRequest<Array<unknown>>('/api/processes'),
      resourceService.getStages(),
      apiRequest<Array<{ id: string; tank_id: string; process_id?: string; action: string; performed_by: string; timestamp: string; details?: string }>>('/api/activity'),
    ]).then(([summary, remoteFleet, remoteProcesses, remoteStages, remoteActivity]) => {
      setKpi(summary);
      setFleet(remoteFleet);
      setProcessCount(remoteProcesses.length);
      setDashboardStages(remoteStages);
      setActivity(remoteActivity.map((item) => ({ id: item.id, tankId: item.tank_id, processId: item.process_id, action: item.action, performedBy: item.performed_by, timestamp: item.timestamp, details: item.details })));
    }).catch((error: Error) => setLoadError(error.message));
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="page-title">Command Center</h1>
        <p className="page-subtitle">505 Base Workshop — Tank Overhaul Production Overview</p>
      </div>
      {loadError && <div className="card p-4 text-sm text-status-critical">Database unavailable: {loadError}</div>}

      {/* KPI row */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="col-span-2 md:col-span-2">
            <KpiCard label="Total Tanks" value={kpi.total} icon={<Crosshair size={14} />} sub="In production batch" />
          </div>
          <div className="col-span-1">
            <KpiCard label="Completed" value={kpi.completed} accent="completed" icon={<CheckCircle2 size={14} />} onClick={() => navigate('/admin/tanks')} />
          </div>
          <div className="col-span-1">
            <KpiCard label="Active" value={kpi.active} accent="active" icon={<Activity size={14} />} onClick={() => navigate('/admin/tanks')} />
          </div>
          <div className="col-span-1">
            <KpiCard label="At Risk" value={kpi.warning} accent="warning" icon={<Clock size={14} />} onClick={() => navigate('/admin/tanks')} />
          </div>
          <div className="col-span-1">
            <KpiCard label="Critical" value={kpi.critical} accent="critical" icon={<AlertTriangle size={14} />} onClick={() => navigate('/admin/tanks')} />
          </div>
          <div className="col-span-1">
            <KpiCard label="Open Defects" value={kpi.openDefects} accent="warning" icon={<AlertTriangle size={14} />} onClick={() => navigate('/admin/defects')} />
          </div>
          <div className="col-span-1">
            <KpiCard label="Pending Insp." value={kpi.pendingInspections} accent="active" icon={<ClipboardCheck size={14} />} onClick={() => navigate('/admin/inspections')} />
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <StageDistribution fleet={fleet} stages={dashboardStages} />
          {activity.length > 0 && <RecentActivity activity={activity} />}
          {activity.length === 0 && <div className="card p-4 text-sm text-text-tertiary">No verified activity records available.</div>}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <ProductionPulse />
          {kpi && <FleetStatusChart kpi={kpi} />}
          <ActiveBlockers />
        </div>
      </div>

      {/* Quick nav to key sections */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tank Fleet', sub: `${kpi?.total ?? 0} tanks`, icon: Crosshair, to: '/admin/tanks' },
          { label: 'PERT Workflow', sub: `${processCount} processes`, icon: Layers, to: '/admin/pert' },
          { label: 'Inspections', sub: 'Quality tracking', icon: ClipboardCheck, to: '/admin/inspections' },
          { label: 'Defects', sub: 'Open items', icon: AlertTriangle, to: '/admin/defects' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              className="card p-3 text-left hover:bg-surface-2 transition-colors duration-fast group"
              onClick={() => navigate(item.to)}
            >
              <Icon size={16} className="text-accent mb-2" />
              <div className="text-sm font-medium text-text-primary">{item.label}</div>
              <div className="text-xs text-text-tertiary">{item.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
