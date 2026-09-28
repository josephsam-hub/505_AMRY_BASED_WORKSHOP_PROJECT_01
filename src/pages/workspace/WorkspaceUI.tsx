import { X, Search, ArrowRight, MapPin, Users, Activity, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Tank } from '../../models';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getProgressBarClass } from '../../utils/statusUtils';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { useWorkspaceData } from './workspaceData';

export function WorkspacePage({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return <div className="p-4 md:p-6 max-w-[1500px] mx-auto flex flex-col gap-5">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><h1 className="page-title uppercase">{title}</h1><p className="page-subtitle">{subtitle}</p></div>
      {action}
    </div>
    {children}
  </div>;
}

export function SummaryStrip({ items }: { items: { label: string; value: number | string; tone?: string }[] }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border rounded-md overflow-hidden">
    {items.map((item) => <div key={item.label} className="bg-surface-1 px-3 py-3"><div className={`text-xl font-bold tabular-nums ${item.tone ?? 'text-text-primary'}`}>{item.value}</div><div className="text-2xs uppercase tracking-wider text-text-tertiary mt-1">{item.label}</div></div>)}
  </div>;
}

export function Toolbar({ search, onSearch, children }: { search?: string; onSearch?: (value: string) => void; children?: ReactNode }) {
  return <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
    {onSearch && <div className="relative flex-1 max-w-md"><Search size={14} className="absolute left-3 top-2.5 text-text-tertiary" /><input value={search} onChange={(event) => onSearch(event.target.value)} className="input-field pl-9" placeholder="Search tanks, OH numbers..." /></div>}
    {children}
  </div>;
}

export function TankRow({ tank, nextAction, onClick }: { tank: Tank; nextAction?: string; onClick?: () => void }) {
  const navigate = useNavigate();
  const { processes, stages, bays, gangs } = useWorkspaceData();
  const process = processes.find((item) => item.id === tank.currentProcessId);
  const stage = stages.find((item) => item.id === tank.currentStageId);
  const bay = bays.find((item) => item.id === tank.currentBayId);
  const gang = gangs.find((item) => item.id === tank.assignedGangId);
  return <div className="card p-3 hover:border-border-strong transition-colors cursor-pointer" onClick={onClick ?? (() => navigate(`/admin/tanks/${tank.id}`))}>
    <div className="flex items-start gap-3">
      <div className={`w-1 self-stretch rounded-sm flex-shrink-0 ${tank.status === 'critical' ? 'bg-status-critical' : tank.status === 'warning' ? 'bg-status-warning' : tank.status === 'completed' ? 'bg-status-completed' : 'bg-status-active'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono font-semibold text-text-primary">T-{tank.tankNumber}</span><span className="text-2xs text-text-tertiary">{tank.ohNumber}</span><StatusBadge type="tank" value={tank.status} size="sm" /></div>
        <div className="text-sm text-text-primary mt-2 truncate">{process?.name ?? 'Process unavailable'}</div>
        <div className="text-2xs text-text-tertiary mt-0.5">Stage {stage?.number} — {stage?.shortName} · {tank.type} / {tank.profile}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-2xs text-text-secondary"><span className="inline-flex items-center gap-1"><MapPin size={10} />{bay?.name ?? 'No bay'}</span><span className="inline-flex items-center gap-1"><Users size={10} />{gang?.name ?? 'Unassigned'}</span></div>
      </div>
      <div className="w-24 sm:w-32 flex-shrink-0 text-right"><div className="text-lg font-semibold tabular-nums text-text-primary">{tank.overallProgress}%</div><div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mt-1"><div className={`h-full ${getProgressBarClass(tank.overallProgress)}`} style={{ width: `${tank.overallProgress}%` }} /></div><div className="text-2xs text-text-tertiary mt-2">{nextAction ?? 'Open tank'} <ArrowRight size={10} className="inline" /></div></div>
    </div>
  </div>;
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onMouseDown={onClose}><aside className="h-full w-full max-w-lg bg-surface-1 border-l border-border shadow-lg overflow-y-auto" onMouseDown={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-surface-1"><h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary">{title}</h2><button className="btn-ghost px-2" onClick={onClose} aria-label="Close"><X size={16} /></button></div><div className="p-5">{children}</div></aside></div>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onMouseDown={onClose}><div className="w-full max-w-lg card-elevated shadow-lg" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary">{title}</h2><button className="btn-ghost px-2" onClick={onClose} aria-label="Close"><X size={16} /></button></div><div className="p-5">{children}</div></div></div>;
}

export function DetailRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return <div className="divide-y divide-border">{rows.map((row) => <div key={row.label} className="flex items-start justify-between gap-4 py-2.5"><span className="text-xs text-text-tertiary">{row.label}</span><span className="text-xs text-text-primary text-right">{row.value}</span></div>)}</div>;
}

export function UpdateMeta({ timestamp }: { timestamp: string }) {
  return <span className="inline-flex items-center gap-1 text-2xs text-text-tertiary"><Clock3 size={10} />{formatDateTime(timestamp)}</span>;
}

export { formatDate };
export { Activity };
