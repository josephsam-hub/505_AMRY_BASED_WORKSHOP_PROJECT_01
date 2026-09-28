import { useMemo, useState, useEffect } from 'react';
import { Download, Filter, Gauge, AlertTriangle, ClipboardCheck, Users, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { KpiCard } from '../../components/ui/KpiCard';
import type { Bay, Defect, Gang, Inspection, Stage, Tank } from '../../models';
import { productionService } from '../../services/productionService';
import { defectService } from '../../services/api/defectService';
import { inspectionService } from '../../services/api/inspectionService';
import { resourceService } from '../../services/api/resourceService';
import { apiMode } from '../../config/runtime';

const stageColors: Record<string, string> = {
  S1: '#7C3AED',
  S2: '#2563EB',
  S3: '#0891B2',
  S4: '#D97706',
  S5: '#EA580C',
  S6: '#16A34A',
};

const pieColors = ['#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];

export default function Reports() {
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    void Promise.all([productionService.getTanks(), defectService.getDefects(), inspectionService.getInspections(), resourceService.getGangs(), resourceService.getBays(), resourceService.getStages()]).then(([nextTanks, nextDefects, nextInspections, nextGangs, nextBays, nextStages]) => {
      setTanks(nextTanks);
      setDefects(nextDefects);
      setInspections(nextInspections);
      setGangs(nextGangs);
      setBays(nextBays);
      setStages(nextStages);
    });
  }, []);

  const filteredTanks = useMemo(() => tanks.filter((tank) => {
    const matchStage = stageFilter === 'all' || tank.currentStageId === stageFilter;
    const matchStatus = statusFilter === 'all' || tank.status === statusFilter;
    return matchStage && matchStatus;
  }), [tanks, stageFilter, statusFilter]);

  const stagePerformance = stages.map((stage) => {
    const stageTanks = filteredTanks.filter((t) => t.currentStageId === stage.id);
    const avgProgress = stageTanks.length
      ? Math.round(stageTanks.reduce((sum, t) => sum + t.overallProgress, 0) / stageTanks.length)
      : 0;
    const active = stageTanks.filter((t) => t.status === 'active' || t.status === 'warning' || t.status === 'critical').length;
    const delayed = stageTanks.filter((t) => t.delayDays > 0).length;
    return {
      stage: stage.shortName,
      progress: avgProgress,
      active,
      delayed,
      fill: stageColors[stage.id] ?? '#4B5563',
    };
  });

  const defectChart = [
    { name: 'Critical', value: defects.filter((d) => d.severity === 'critical').length },
    { name: 'Major', value: defects.filter((d) => d.severity === 'major').length },
    { name: 'Minor', value: defects.filter((d) => d.severity === 'minor').length },
  ];

  const inspectionSummary = [
    { name: 'Passed', value: inspections.filter((i) => i.status === 'passed').length },
    { name: 'Pending', value: inspections.filter((i) => i.status === 'pending').length },
    { name: 'In Progress', value: inspections.filter((i) => i.status === 'in-progress').length },
    { name: 'Failed', value: inspections.filter((i) => i.status === 'failed').length },
  ];

  const bayUtilization = bays.map((bay) => ({
    bay: `B${bay.number}`,
    utilization: bay.utilization,
  }));

  const manpowerUtilization = gangs.map((gang) => ({
    gang: gang.name.split(' — ')[0],
    deployed: gang.deployed,
    authorized: gang.authorized,
    utilization: gang.authorized > 0 ? Math.round((gang.deployed / gang.authorized) * 100) : 0,
  }));

  const completionTrend: { name: string; completed: number }[] = [];

  const kpis = {
    totalTanks: filteredTanks.length,
    active: filteredTanks.filter((t) => t.status === 'active').length,
    completed: filteredTanks.filter((t) => t.status === 'completed').length,
    critical: filteredTanks.filter((t) => t.status === 'critical').length,
    avgProgress: filteredTanks.length
      ? Math.round(filteredTanks.reduce((sum, t) => sum + t.overallProgress, 0) / filteredTanks.length)
      : 0,
    delayed: filteredTanks.filter((t) => t.delayDays > 0).length,
  };

  const exportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Tanks', String(filteredTanks.length)],
      ['Completed', String(kpis.completed)],
      ['Critical', String(kpis.critical)],
      ['Delayed', String(kpis.delayed)],
      ['Open Defects', String(defects.filter((d) => d.status === 'open').length)],
      ['Pending Inspections', String(inspections.filter((i) => i.status === 'pending').length)],
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tank-production-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Production performance, quality and resource reporting</p>
        </div>
        <button className="btn-primary" onClick={exportReport}>
          <Download size={13} /> Export Report
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 border border-border rounded px-2 py-1.5 bg-surface-1">
          <Filter size={12} className="text-text-tertiary" />
          <select className="select-field w-32 bg-transparent border-0 px-0 py-0" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">All stages</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>Stage {stage.number}</option>
            ))}
          </select>
        </div>
        <select className="select-field w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="warning">At Risk</option>
          <option value="critical">Critical</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Tank Fleet" value={kpis.totalTanks} icon={<Gauge size={14} />} />
        <KpiCard label="Active" value={kpis.active} accent="active" />
        <KpiCard label="Completed" value={kpis.completed} accent="completed" />
        <KpiCard label="Critical" value={kpis.critical} accent="critical" />
        <KpiCard label="Avg Progress" value={`${kpis.avgProgress}%`} accent="warning" />
        <KpiCard label="Delayed" value={kpis.delayed} accent="warning" />
      </div>
      {apiMode && tanks.length === 0 && <div className="card p-5 text-sm text-text-tertiary">No verified production data available for reporting.</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Tank Completion Trend</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionTrend}>
                <CartesianGrid stroke="#2A3A52" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8FA3BF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8FA3BF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="completed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} className="text-status-warning" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Defect Summary</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={defectChart} innerRadius={34} outerRadius={60} dataKey="value" nameKey="name" paddingAngle={2}>
                  {defectChart.map((entry, idx) => (
                    <Cell key={entry.name} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Gauge size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Stage Performance</span>
          </div>
          <div className="divide-y divide-border">
            {stagePerformance.map((item) => (
              <div key={item.stage} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{item.stage}</span>
                  <span className="text-xs text-text-tertiary">{item.progress}% avg</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.progress}%`, background: item.fill }} />
                </div>
                <div className="mt-2 flex items-center gap-4 text-2xs text-text-tertiary">
                  <span>Active: {item.active}</span>
                  <span>Delayed: {item.delayed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <ClipboardCheck size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Inspection Summary</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {inspectionSummary.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm text-text-secondary">
                  <span>{item.name}</span>
                  <span className="font-semibold text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Manpower Utilization</span>
          </div>
          <div className="space-y-3">
            {manpowerUtilization.map((item) => (
              <div key={item.gang}>
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                  <span>{item.gang}</span>
                  <span>{item.utilization}%</span>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-status-active" style={{ width: `${item.utilization}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Bay Utilization</span>
          </div>
          <div className="space-y-3">
            {bayUtilization.map((item) => (
              <div key={item.bay}>
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                  <span>{item.bay}</span>
                  <span>{item.utilization}%</span>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-status-warning" style={{ width: `${item.utilization}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
