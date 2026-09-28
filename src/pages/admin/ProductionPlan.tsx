import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import { productionService } from '../../services/productionService';
import { resourceService } from '../../services/api/resourceService';
import type { Tank, Stage } from '../../models';

const DAY_PX = 4; // pixels per day

function dayOffset(dateStr: string, planStart: Date) {
  return Math.max(0, differenceInDays(parseISO(dateStr), planStart));
}

function dayWidth(startStr: string, endStr: string) {
  return Math.max(4, differenceInDays(parseISO(endStr), parseISO(startStr)) * DAY_PX);
}

// Generate month markers
function getMonthMarkers(planStart: Date, planEnd: Date) {
  const markers: { label: string; offset: number }[] = [];
  let d = planStart;
  while (d <= planEnd) {
    markers.push({ label: format(d, 'MMM yyyy'), offset: differenceInDays(d, planStart) * DAY_PX });
    d = addDays(d, 30);
  }
  return markers;
}

const STAGE_COLORS: Record<string, string> = {
  S1: '#7C3AED', S2: '#2563EB', S3: '#0891B2',
  S4: '#D97706', S5: '#EA580C', S6: '#16A34A',
};

function GanttBar({ tank, planStart, totalDays }: { tank: Tank; planStart: Date; totalDays: number }) {
  const navigate = useNavigate();
  const plannedLeft = dayOffset(tank.plannedStart, planStart) * DAY_PX;
  const plannedWidth = dayWidth(tank.plannedStart, tank.plannedCompletion);
  const stageColor = STAGE_COLORS[tank.currentStageId] ?? '#4B5563';
  const hasDelay = tank.delayDays > 0;
  const expectedWidth = dayWidth(tank.plannedStart, tank.expectedCompletion);

  return (
    <div className="relative h-7 flex items-center" style={{ minWidth: totalDays * DAY_PX }}>
      {/* Planned bar */}
      <div
        className="absolute h-4 rounded-sm opacity-30 cursor-pointer"
        style={{ left: plannedLeft, width: plannedWidth, background: stageColor }}
        title={`Planned: ${tank.plannedStart} → ${tank.plannedCompletion}`}
        onClick={() => navigate(`/admin/tanks/${tank.id}`)}
      />
      {/* Actual/expected bar */}
      <div
        className="absolute h-4 rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
        style={{
          left: plannedLeft,
          width: hasDelay ? expectedWidth : plannedWidth,
          background: stageColor,
          opacity: tank.status === 'completed' ? 1 : 0.75,
        }}
        title={`Expected: ${tank.plannedStart} → ${tank.expectedCompletion}${hasDelay ? ` (+${tank.delayDays}d delay)` : ''}`}
        onClick={() => navigate(`/admin/tanks/${tank.id}`)}
      />
      {/* Delay extension */}
      {hasDelay && (
        <div
          className="absolute h-4 rounded-r-sm"
          style={{
            left: plannedLeft + plannedWidth,
            width: (expectedWidth - plannedWidth),
            background: '#EF4444',
            opacity: 0.7,
          }}
          title={`Delay: +${tank.delayDays} days`}
        />
      )}
      {/* Progress fill */}
      {tank.status !== 'pending' && (
        <div
          className="absolute h-4 rounded-sm pointer-events-none"
          style={{
            left: plannedLeft,
            width: (plannedWidth * tank.overallProgress) / 100,
            background: stageColor,
            opacity: 0.95,
          }}
        />
      )}
    </div>
  );
}

export default function ProductionPlan() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planTanks, setPlanTanks] = useState<Tank[]>([]);
  const [planStages, setPlanStages] = useState<Stage[]>([]);
  const scheduleTanks = useMemo(() => planTanks.filter((tank) => tank.plannedStart && tank.expectedCompletion), [planTanks]);
  const planStart = useMemo(() => scheduleTanks.length ? parseISO(scheduleTanks.reduce((earliest, tank) => tank.plannedStart < earliest ? tank.plannedStart : earliest, scheduleTanks[0].plannedStart)) : null, [scheduleTanks]);
  const planEnd = useMemo(() => scheduleTanks.length ? parseISO(scheduleTanks.reduce((latest, tank) => tank.expectedCompletion > latest ? tank.expectedCompletion : latest, scheduleTanks[0].expectedCompletion)) : null, [scheduleTanks]);
  const totalDays = planStart && planEnd ? Math.max(1, differenceInDays(planEnd, planStart)) : 0;
  const monthMarkers = useMemo(() => planStart && planEnd ? getMonthMarkers(planStart, planEnd) : [], [planStart, planEnd]);
  const todayOffset = planStart && planEnd ? Math.min(Math.max(0, differenceInDays(new Date(), planStart)) * DAY_PX, totalDays * DAY_PX) : 0;

  useEffect(() => {
    void Promise.all([
      productionService.getTanks(),
      resourceService.getStages(),
    ]).then(([remoteTanks, remoteStages]) => {
      setPlanTanks(remoteTanks);
      setPlanStages(remoteStages);
    });
  }, []);

  const filtered = useMemo(() => planTanks.filter((t) => {
    const matchSearch = !search || t.tankNumber.includes(search) || t.ohNumber.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || t.currentStageId === stageFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStage && matchStatus;
  }), [planTanks, search, stageFilter, statusFilter]);

  const totalWidth = totalDays * DAY_PX;
  const ROW_H = 36;
  const LABEL_W = 320;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-1 flex-shrink-0">
        <h1 className="page-title">Production Plan</h1>
        <p className="page-subtitle">Production schedule · {filtered.length} verified tanks shown</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-base-800 flex-shrink-0 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input className="input-field pl-8 w-40" placeholder="Search tank..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-field w-36" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">All Stages</option>
          {planStages.map((s) => <option key={s.id} value={s.id}>Stage {s.number} — {s.shortName}</option>)}
        </select>
        <select className="select-field w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          {['completed','active','warning','critical','pending'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {/* Legend */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-1.5"><div className="w-8 h-2.5 rounded-sm bg-accent opacity-40" /><span className="text-2xs text-text-tertiary">Planned</span></div>
          <div className="flex items-center gap-1.5"><div className="w-8 h-2.5 rounded-sm bg-accent" /><span className="text-2xs text-text-tertiary">Actual/Expected</span></div>
          <div className="flex items-center gap-1.5"><div className="w-8 h-2.5 rounded-sm bg-status-critical opacity-70" /><span className="text-2xs text-text-tertiary">Delay</span></div>
          <div className="flex items-center gap-1.5"><div className="w-px h-4 bg-status-warning" /><span className="text-2xs text-text-tertiary">Today</span></div>
        </div>
      </div>

      {/* Gantt body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Fixed label column */}
        <div className="flex-shrink-0 border-r border-border bg-surface-1" style={{ width: LABEL_W }}>
          {/* Header row */}
          <div className="flex items-center px-3 border-b border-border" style={{ height: ROW_H }}>
            <span className="table-header">Tank</span>
            <span className="table-header ml-auto">Status</span>
          </div>
          {/* Tank rows */}
          <div className="overflow-y-auto" style={{ height: `calc(100% - ${ROW_H}px)` }}>
            {filtered.map((tank) => {
              const stage = planStages.find((s) => s.id === tank.currentStageId);
              return (
                <div
                  key={tank.id}
                  className="flex items-center px-3 border-b border-border cursor-pointer hover:bg-surface-2 transition-colors group"
                  style={{ height: ROW_H }}
                  onClick={() => navigate(`/admin/tanks/${tank.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-semibold text-text-primary">T-{tank.tankNumber}</span>
                      {tank.delayDays > 0 && <span className="text-2xs text-status-warning">+{tank.delayDays}d</span>}
                    </div>
                    <div className="text-2xs text-text-tertiary truncate">{stage?.shortName}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge type="tank" value={tank.status} size="sm" />
                    <ChevronRight size={11} className="text-text-tertiary group-hover:text-text-secondary" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 || !planStart || !planEnd ? <div className="absolute inset-x-0 top-24 text-center text-sm text-text-tertiary">No verified tank production schedule available.</div> : null}

        {/* Scrollable timeline */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={scrollRef}>
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Month header */}
            <div className="relative border-b border-border bg-surface-1" style={{ height: ROW_H }}>
              {monthMarkers.map((m) => (
                <div key={m.label} className="absolute top-0 flex flex-col" style={{ left: m.offset }}>
                  <div className="h-full border-l border-border pl-1 flex items-center">
                    <span className="text-2xs text-text-tertiary whitespace-nowrap">{m.label}</span>
                  </div>
                </div>
              ))}
              {/* Today marker in header */}
              <div className="absolute top-0 bottom-0 w-px bg-status-warning z-10" style={{ left: todayOffset }}>
                <span className="absolute -top-0 left-1 text-2xs text-status-warning whitespace-nowrap">Today</span>
              </div>
            </div>

            {/* Tank rows */}
            <div className="overflow-y-auto" style={{ height: `calc(100vh - 220px)` }}>
              {filtered.map((tank) => (
                <div
                  key={tank.id}
                  className="relative border-b border-border hover:bg-surface-2 transition-colors"
                  style={{ height: ROW_H }}
                >
                  {/* Grid lines */}
                  {monthMarkers.map((m) => (
                    <div key={m.label} className="absolute top-0 bottom-0 w-px bg-border opacity-30" style={{ left: m.offset }} />
                  ))}
                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 w-px bg-status-warning opacity-60 z-10" style={{ left: todayOffset }} />
                  {/* Gantt bar */}
                  <div className="absolute inset-0 flex items-center px-0">
                    {planStart && <GanttBar tank={tank} planStart={planStart} totalDays={totalDays} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
