import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, BarChart3, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../services/api/client';
import { resourceService } from '../../services/api/resourceService';
import { productionService } from '../../services/productionService';
import type { Tank, Stage } from '../../models';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#181E2A', border: '1px solid #263040', borderRadius: 4, fontSize: 12 },
  labelStyle: { color: '#8A9BB5' },
  itemStyle: { color: '#DDE4EE' },
};

const STAGE_COLORS: Record<string, string> = {
  S1: '#6B5B9E', S2: '#2A6090', S3: '#1E7A7A',
  S4: '#8A6020', S5: '#8A4820', S6: '#2A7A40',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#4A9E6A', IN_PROGRESS: '#3A7EC4', WARNING: '#C4882A',
  CRITICAL: '#C44040', PENDING: '#445060',
};

interface ProductionRow { status: string; count: number; average_progress: number }
interface DefectRow { severity: string; status: string; count: number }
interface InspectionRow { status: string; count: number }
interface GangRow { id: string; name: string; authorized: number; deployed: number; held: number }

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="text-2xs font-bold text-text-tertiary uppercase tracking-wider mb-3" style={{ letterSpacing: '0.1em' }}>
      {title}
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${accent ?? 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-xs text-text-tertiary">{message}</div>
  );
}

export default function Reports() {
  const [prodRows, setProdRows] = useState<ProductionRow[]>([]);
  const [defectRows, setDefectRows] = useState<DefectRow[]>([]);
  const [inspRows, setInspRows] = useState<InspectionRow[]>([]);
  const [gangs, setGangs] = useState<GangRow[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest<ProductionRow[]>('/api/reports/production'),
      apiRequest<DefectRow[]>('/api/reports/defects'),
      apiRequest<InspectionRow[]>('/api/reports/inspections'),
      apiRequest<GangRow[]>('/api/gangs'),
      productionService.getTanks(),
      resourceService.getStages(),
    ]).then(([prod, def, insp, g, t, s]) => {
      setProdRows(prod);
      setDefectRows(def);
      setInspRows(insp);
      setGangs(g);
      setTanks(t);
      setStages(s);
      setLoading(false);
    }).catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  // Derived data — all from API
  const totalTanks = prodRows.reduce((s, r) => s + r.count, 0);
  const completedCount = prodRows.find((r) => r.status === 'COMPLETED')?.count ?? 0;
  const activeCount = prodRows.find((r) => r.status === 'IN_PROGRESS')?.count ?? 0;
  const warningCount = prodRows.find((r) => r.status === 'WARNING')?.count ?? 0;
  const criticalCount = prodRows.find((r) => r.status === 'CRITICAL')?.count ?? 0;
  const pendingCount = prodRows.find((r) => r.status === 'PENDING')?.count ?? 0;
  const avgProgress = prodRows.find((r) => r.status === 'IN_PROGRESS')?.average_progress ?? 0;

  const totalInsp = inspRows.reduce((s, r) => s + r.count, 0);
  const passedInsp = inspRows.find((r) => r.status === 'PASSED')?.count ?? 0;
  const failedInsp = inspRows.find((r) => r.status === 'FAILED')?.count ?? 0;
  const pendingInsp = inspRows.find((r) => r.status === 'PENDING')?.count ?? 0;
  const passRate = totalInsp > 0 ? Math.round((passedInsp / (passedInsp + failedInsp || 1)) * 100) : 0;

  const openDefects = defectRows.filter((d) => d.status === 'OPEN' || d.status === 'IN_PROGRESS').reduce((s, r) => s + r.count, 0);
  const criticalDefects = defectRows.filter((d) => d.severity === 'CRITICAL').reduce((s, r) => s + r.count, 0);

  const totalAuthorized = gangs.reduce((s, g) => s + g.authorized, 0);
  const totalDeployed = gangs.reduce((s, g) => s + g.deployed, 0);
  const totalHeld = gangs.reduce((s, g) => s + g.held, 0);

  // Chart data
  const statusChartData = prodRows
    .filter((r) => r.count > 0)
    .map((r) => ({ name: r.status.replace('_', ' '), value: r.count, color: STATUS_COLORS[r.status] ?? '#445060' }));

  const stageDistData = stages.map((s) => ({
    name: `S${s.number}`,
    label: s.shortName,
    count: tanks.filter((t) => t.currentStageId === s.id).length,
    color: STAGE_COLORS[s.id] ?? '#445060',
  }));

  const defectSeverityData = ['CRITICAL', 'MAJOR', 'MINOR'].map((sev) => ({
    name: sev.charAt(0) + sev.slice(1).toLowerCase(),
    value: defectRows.filter((d) => d.severity === sev).reduce((s, r) => s + r.count, 0),
    color: sev === 'CRITICAL' ? '#C44040' : sev === 'MAJOR' ? '#C4882A' : '#3A7EC4',
  })).filter((d) => d.value > 0);

  const delayByStageData = stages.map((s) => ({
    name: `S${s.number}`,
    delayed: tanks.filter((t) => t.currentStageId === s.id && t.delayDays > 0).length,
    onTime: tanks.filter((t) => t.currentStageId === s.id && t.delayDays === 0 && t.status !== 'pending').length,
  }));

  function exportCSV() {
    if (tanks.length === 0) return;
    const headers = ['Tank', 'OH Number', 'Type', 'Profile', 'Stage', 'Status', 'Progress', 'Delay Days', 'Planned Completion'];
    const rows = tanks.map((t) => {
      const stage = stages.find((s) => s.id === t.currentStageId);
      return [t.tankNumber, t.ohNumber, t.type, t.profile, stage?.shortName ?? '', t.status, t.overallProgress, t.delayDays, t.plannedCompletion ?? ''];
    });
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '505_workshop_production_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <span className="text-sm text-text-tertiary">Loading report data…</span>
    </div>
  );

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Production summary — Workshop PostgreSQL</p>
        </div>
        <button className="btn-primary" onClick={exportCSV} disabled={tanks.length === 0}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {error && (
        <div className="card p-3 flex items-center gap-2 text-xs text-status-critical bg-status-critical-bg border-status-critical-border">
          <AlertCircle size={13} /> Database error: {error}
        </div>
      )}

      {totalTanks === 0 && !error && (
        <div className="card p-8 text-center">
          <div className="text-sm font-semibold text-text-secondary uppercase tracking-wider">NO PRODUCTION DATA</div>
          <div className="text-xs text-text-tertiary mt-2">No verified tank production records are currently available.</div>
          <div className="text-2xs text-text-tertiary mt-1 opacity-60">Source: Workshop PostgreSQL</div>
        </div>
      )}

      {totalTanks > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <SectionTitle title="Production Summary" />
              <StatRow label="Total Tanks" value={totalTanks} />
              <StatRow label="Completed" value={completedCount} accent="text-status-completed" />
              <StatRow label="Active" value={activeCount} accent="text-status-active" />
              <StatRow label="At Risk" value={warningCount} accent="text-status-warning" />
              <StatRow label="Critical" value={criticalCount} accent="text-status-critical" />
              <StatRow label="Pending" value={pendingCount} />
              <StatRow label="Avg Progress (active)" value={activeCount > 0 ? `${Math.round(avgProgress)}%` : '—'} />
            </div>

            <div className="card p-4">
              <SectionTitle title="Quality Summary" />
              <StatRow label="Total Inspections" value={totalInsp} />
              <StatRow label="Passed" value={passedInsp} accent="text-status-completed" />
              <StatRow label="Failed" value={failedInsp} accent="text-status-critical" />
              <StatRow label="Pending" value={pendingInsp} />
              <StatRow label="Pass Rate" value={totalInsp > 0 ? `${passRate}%` : '—'} accent={passRate >= 80 ? 'text-status-completed' : 'text-status-warning'} />
              <StatRow label="Open Defects" value={openDefects} accent={openDefects > 0 ? 'text-status-warning' : 'text-text-primary'} />
              <StatRow label="Critical Defects" value={criticalDefects} accent={criticalDefects > 0 ? 'text-status-critical' : 'text-text-primary'} />
            </div>

            <div className="card p-4">
              <SectionTitle title="Resource Summary" />
              {gangs.length === 0 ? (
                <div className="text-xs text-text-tertiary py-2">No verified gang records.</div>
              ) : gangs.slice(0, 5).map((g) => (
                <StatRow
                  key={g.id}
                  label={g.name.split('—')[0].trim()}
                  value={g.authorized > 0 ? `${Math.round((g.deployed / g.authorized) * 100)}%` : '—'}
                  accent={g.held > 0 ? 'text-status-warning' : 'text-status-active'}
                />
              ))}
              <StatRow label="Total Authorized" value={totalAuthorized} />
              <StatRow label="Total Deployed" value={totalDeployed} accent="text-status-active" />
              <StatRow label="Total Held" value={totalHeld} accent={totalHeld > 0 ? 'text-status-warning' : 'text-text-primary'} />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <SectionTitle title="Tank Status Distribution" />
              {statusChartData.length === 0 ? <EmptyChart message="No status data available." /> : (
                <div className="flex items-center gap-4">
                  <div style={{ width: 140, height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                          {statusChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {statusChartData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-text-secondary">{d.name}</span>
                        <span className="text-xs font-semibold text-text-primary ml-auto tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card p-4">
              <SectionTitle title="Stage Distribution" />
              {stageDistData.every((d) => d.count === 0) ? <EmptyChart message="No tanks in production." /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stageDistData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#526070', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#526070', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v, _n, p) => [v, p.payload.label]} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {stageDistData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <SectionTitle title="Delay Analysis by Stage" />
              {delayByStageData.every((d) => d.delayed === 0 && d.onTime === 0) ? <EmptyChart message="No delay data available." /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={delayByStageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#526070', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#526070', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="onTime" name="On Time" fill="#3A7EC4" radius={[2, 2, 0, 0]} stackId="a" />
                    <Bar dataKey="delayed" name="Delayed" fill="#C44040" radius={[2, 2, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-4">
              <SectionTitle title="Defects by Severity" />
              {defectSeverityData.length === 0 ? <EmptyChart message="No defect records available." /> : (
                <div className="flex items-center gap-4">
                  <div style={{ width: 120, height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={defectSeverityData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                          {defectSeverityData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {defectSeverityData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-text-secondary">{d.name}</span>
                        <span className="text-xs font-semibold text-text-primary ml-2 tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 p-3 bg-surface-2 border border-border rounded text-xs text-text-tertiary">
        <BarChart3 size={13} className="text-accent flex-shrink-0" />
        All data sourced from Workshop PostgreSQL. Export CSV downloads the current verified tank dataset.
      </div>
    </div>
  );
}
