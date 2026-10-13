import { useState } from 'react';
import { Settings, Info } from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border pb-3">{title}</div>
      {children}
    </div>
  );
}

function ConfigRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1">
        <div className="text-sm text-text-primary">{label}</div>
        {description && <div className="text-xs text-text-tertiary mt-0.5">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`relative w-10 h-5 rounded-full transition-colors duration-fast ${value ? 'bg-accent' : 'bg-surface-3 border border-border'}`}
      onClick={() => onChange(!value)}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-fast ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

const STATUS_DEFINITIONS = [
  { status: 'Completed', color: 'bg-status-completed', description: 'All processes finished, JRI cleared, dispatched.' },
  { status: 'Active', color: 'bg-status-active', description: 'Currently in production, on schedule.' },
  { status: 'At Risk', color: 'bg-status-warning', description: 'Delay accumulating, intervention may be required.' },
  { status: 'Critical', color: 'bg-status-critical', description: 'Blocked — production halted, immediate action required.' },
  { status: 'Pending', color: 'bg-status-pending', description: 'Not yet started, awaiting bay/gang allocation.' },
];

const ROLES = [
  { role: 'Admin / Command Center', access: 'Full system visibility — all tanks, all stages, all reports, all configuration.' },
  { role: 'User / Workstation', access: 'Assigned tanks and processes only — task-level operational view.' },
];

export default function Administration() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  return (
    <div className="p-6 flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="page-title">Administration</h1>
        <p className="page-subtitle">System configuration and operational settings</p>
      </div>

      <div className="flex items-start gap-2 p-3 bg-surface-2 border border-border rounded text-xs text-text-tertiary">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        Session-only configuration — changes apply to the current session and are not persisted to the database.
      </div>

      <Section title="System Configuration">
        <ConfigRow label="Notifications" description="Show alert banners for critical events">
          <Toggle value={notifEnabled} onChange={setNotifEnabled} />
        </ConfigRow>
        <ConfigRow label="Auto Refresh" description="Periodically refresh dashboard data">
          <Toggle value={autoRefresh} onChange={setAutoRefresh} />
        </ConfigRow>
      </Section>

      <Section title="Production Settings">
        <ConfigRow label="Workshop Name" description="Displayed in header and reports">
          <input className="input-field w-48" defaultValue="505 Base Workshop" readOnly />
        </ConfigRow>
        <ConfigRow label="Data Source" description="Primary operational data source">
          <span className="text-xs text-text-secondary">Workshop PostgreSQL</span>
        </ConfigRow>
      </Section>

      <Section title="Status Definitions">
        <div className="flex flex-col gap-3">
          {STATUS_DEFINITIONS.map((s) => (
            <div key={s.status} className="flex items-start gap-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${s.color}`} />
              <div>
                <div className="text-sm font-medium text-text-primary">{s.status}</div>
                <div className="text-xs text-text-tertiary">{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="User Role Preview">
        <div className="flex flex-col gap-3">
          {ROLES.map((r) => (
            <div key={r.role} className="p-3 bg-surface-2 rounded border border-border">
              <div className="text-sm font-medium text-text-primary mb-1">{r.role}</div>
              <div className="text-xs text-text-secondary">{r.access}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-text-tertiary flex items-center gap-1.5">
          <Settings size={11} />
          Switch roles using the role selector in the top-right header.
        </div>
      </Section>
    </div>
  );
}
