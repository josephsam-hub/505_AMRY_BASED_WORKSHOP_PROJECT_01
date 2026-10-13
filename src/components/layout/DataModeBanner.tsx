import { useDataModeStore } from '../../store/useDataModeStore';

export function DataModeBanner() {
  const { mode, setMode } = useDataModeStore();

  if (mode === 'PRODUCTION') {
    return (
      <div
        className="flex items-center justify-between px-4 py-1.5 border-b flex-shrink-0"
        style={{ background: '#050D1A', borderColor: '#1A3A5C' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-active flex-shrink-0" style={{ boxShadow: '0 0 4px #3A7EC4' }} />
          <span className="text-2xs font-bold text-status-active uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>
            PRODUCTION MODE
          </span>
          <span className="text-2xs text-text-tertiary">·</span>
          <span className="text-2xs text-text-tertiary">Verified operational data — PostgreSQL</span>
        </div>
        <button
          className="text-2xs text-text-tertiary hover:text-text-secondary transition-colors px-2 py-0.5 rounded border border-border hover:border-border-strong"
          onClick={() => setMode('SIMULATION')}
          title="Switch to Simulation Mode"
        >
          Switch to Simulation
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 border-b flex-shrink-0"
      style={{ background: '#1A0E00', borderColor: '#5A3A00' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-status-warning flex-shrink-0" style={{ boxShadow: '0 0 4px #C4882A' }} />
        <span className="text-2xs font-bold text-status-warning uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>
          SIMULATION MODE
        </span>
        <span className="text-2xs text-text-tertiary">·</span>
        <span className="text-2xs text-text-tertiary">Synthetic demonstration data — not operational records</span>
      </div>
      <button
        className="text-2xs text-text-tertiary hover:text-text-secondary transition-colors px-2 py-0.5 rounded border border-border hover:border-border-strong"
        onClick={() => setMode('PRODUCTION')}
        title="Switch to Production Mode"
      >
        Switch to Production
      </button>
    </div>
  );
}
