import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Crosshair, Layers, GitBranch, Building2, ClipboardCheck, AlertTriangle, BarChart3, Settings, Gauge, Car, FileCheck, Users, X, ShieldCheck } from 'lucide-react';
import { tanks as defaultTanks } from '../../data/tanks';
import { processes as defaultProcesses } from '../../data/processes';
import { useDataModeStore } from '../../store/useDataModeStore';
import { simulationRepository } from '../../services/simulation/simulationStore';

interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  to: string;
  category: string;
}

const PAGES: PaletteItem[] = [
  { id: 'cmd-dashboard', label: 'Command Center', sub: 'Admin dashboard', icon: <Layers size={13} />, to: '/admin', category: 'PAGE' },
  { id: 'cmd-fleet', label: 'Tank Fleet', sub: 'All tanks', icon: <Crosshair size={13} />, to: '/admin/tanks', category: 'PAGE' },
  { id: 'cmd-plan', label: 'Production Plan', sub: 'Gantt schedule', icon: <Gauge size={13} />, to: '/admin/production-plan', category: 'PAGE' },
  { id: 'cmd-pert', label: 'PERT / Workflow', sub: '31-process workflow', icon: <GitBranch size={13} />, to: '/admin/pert', category: 'PAGE' },
  { id: 'cmd-floor', label: 'Workshop Floor', sub: 'Floor & bays overview', icon: <Layers size={13} />, to: '/admin/workshop-floor', category: 'PAGE' },
  { id: 'cmd-bays', label: 'Bay Management', sub: 'Bay allocations', icon: <Building2 size={13} />, to: '/admin/bays', category: 'PAGE' },
  { id: 'cmd-manpower', label: 'Manpower & Gangs', sub: 'Resource management', icon: <Users size={13} />, to: '/admin/manpower', category: 'PAGE' },
  { id: 'cmd-inspections', label: 'Inspections', sub: 'Quality tracking', icon: <ClipboardCheck size={13} />, to: '/admin/inspections', category: 'PAGE' },
  { id: 'cmd-defects', label: 'Defects', sub: 'Open items', icon: <AlertTriangle size={13} />, to: '/admin/defects', category: 'PAGE' },
  { id: 'cmd-road', label: 'Road Trials', sub: 'Trial records', icon: <Car size={13} />, to: '/admin/road-trials', category: 'PAGE' },
  { id: 'cmd-jri', label: 'JRI & Handover', sub: 'Final stage', icon: <FileCheck size={13} />, to: '/admin/jri-handover', category: 'PAGE' },
  { id: 'cmd-quality', label: 'Data Provenance', sub: 'Source quality audit', icon: <ShieldCheck size={13} />, to: '/admin/data-quality', category: 'PAGE' },
  { id: 'cmd-reports', label: 'Reports', sub: 'Production reports', icon: <BarChart3 size={13} />, to: '/admin/reports', category: 'PAGE' },
  { id: 'cmd-updates', label: 'Process Updates', sub: 'Workstation updates', icon: <GitBranch size={13} />, to: '/workspace/process-updates', category: 'PAGE' },
  { id: 'cmd-settings', label: 'Administration', sub: 'Settings', icon: <Settings size={13} />, to: '/admin/settings', category: 'PAGE' },
];

function buildItems(query: string, mode: string): PaletteItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return PAGES.slice(0, 8);

  const results: PaletteItem[] = [];

  // Tanks (retrieved from reactive simulation repository or default dataset)
  const availableTanks = mode === 'SIMULATION' ? simulationRepository.getState().tanks : defaultTanks;
  const availableProcesses = mode === 'SIMULATION' ? simulationRepository.getState().processes : defaultProcesses;

  availableTanks.forEach((t) => {
    if (
      t.tankNumber.includes(q) ||
      t.ohNumber.toLowerCase().includes(q) ||
      `t-${t.tankNumber}`.includes(q)
    ) {
      results.push({
        id: t.id,
        label: `T-${t.tankNumber}`,
        sub: `${t.ohNumber} · ${t.type} · ${t.status}`,
        icon: <Crosshair size={13} />,
        to: `/admin/tanks/${t.id}`,
        category: 'TANK',
      });
    }
  });

  // Processes
  availableProcesses.forEach((p) => {
    if (p.name.toLowerCase().includes(q) || `p${p.processNumber}`.includes(q)) {
      results.push({
        id: p.id,
        label: `P${String(p.processNumber).padStart(2, '0')} — ${p.name}`,
        sub: `Stage ${p.stageId} · ${p.pathType === 'CRITICAL' ? 'Critical Path' : 'Non-Critical'}`,
        icon: <GitBranch size={13} />,
        to: '/admin/pert',
        category: 'PROCESS',
      });
    }
  });

  // Pages
  PAGES.forEach((page) => {
    if (page.label.toLowerCase().includes(q) || (page.sub ?? '').toLowerCase().includes(q)) {
      results.push(page);
    }
  });

  return results.slice(0, 12);
}

export function openCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workshop:open-command-palette'));
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { mode } = useDataModeStore();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelected(0);
  }, []);

  const go = useCallback((item: PaletteItem) => {
    navigate(item.to);
    close();
  }, [navigate, close]);

  useEffect(() => {
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener('workshop:open-command-palette', handleOpenEvent);
    return () => window.removeEventListener('workshop:open-command-palette', handleOpenEvent);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const items = buildItems(query, mode);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && items[selected]) go(items[selected]);
  };

  if (!open) return null;

  const grouped = items.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(5,10,18,0.85)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-xl rounded border border-border shadow-lg overflow-hidden"
        style={{ background: '#0D1117' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={14} className="text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
            placeholder="Search tanks, processes, pages…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button onClick={close} className="text-text-tertiary hover:text-text-secondary">
            <X size={13} />
          </button>
          <kbd className="text-2xs text-text-tertiary border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-text-tertiary">No results found</div>
          )}
          {Object.entries(grouped).map(([category, groupItems]) => (
            <div key={category}>
              <div className="px-4 py-1.5 text-2xs font-bold text-text-tertiary uppercase tracking-widest" style={{ letterSpacing: '0.12em' }}>
                {category}
              </div>
              {groupItems.map((item) => {
                const idx = items.indexOf(item);
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === selected ? 'bg-surface-3' : 'hover:bg-surface-2'}`}
                    onClick={() => go(item)}
                    onMouseEnter={() => setSelected(idx)}
                  >
                    <span className="text-text-tertiary flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{item.label}</div>
                      {item.sub && <div className="text-2xs text-text-tertiary truncate">{item.sub}</div>}
                    </div>
                    {idx === selected && (
                      <kbd className="text-2xs text-text-tertiary border border-border rounded px-1.5 py-0.5 flex-shrink-0">↵</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4">
          <span className="text-2xs text-text-tertiary">↑↓ navigate</span>
          <span className="text-2xs text-text-tertiary">↵ open</span>
          <span className="text-2xs text-text-tertiary">ESC close</span>
          <span className="text-2xs text-text-tertiary ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
