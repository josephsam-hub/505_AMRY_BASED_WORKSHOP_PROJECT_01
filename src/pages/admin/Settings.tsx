import { Settings as SettingsIcon, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Administration</h1>
        <p className="page-subtitle">Persisted administration settings are not recorded in the source system.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">System Configuration</span>
          </div>

          <div className="text-sm text-text-tertiary">No persisted configuration is available.</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Production Settings</span>
          </div>

          <div className="text-sm text-text-tertiary">No persisted production thresholds are available.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Status Definitions</span>
          </div>
          <div className="space-y-2 text-sm text-text-secondary">
            <div><span className="font-medium text-text-primary">Completed</span> — officially cleared and dispatched.</div>
            <div><span className="font-medium text-text-primary">Active</span> — tank is progressing in the current phase.</div>
            <div><span className="font-medium text-text-primary">Warning</span> — schedule risk or procedural delay.</div>
            <div><span className="font-medium text-text-primary">Critical</span> — blocker or unresolved quality issue.</div>
            <div><span className="font-medium text-text-primary">Pending</span> — waiting for allocation or next gate.</div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users size={13} className="text-accent" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">User Role Preview</span>
          </div>
          <div className="space-y-3">
            {[
              ['Production Controller', 'Monitors bay load, process flow and delay risk.'],
              ['Quality Officer', 'Approves inspections and gates defect clearance.'],
              ['Bay Supervisor', 'Manages gang allocation and equipment readiness.'],
              ['Handover Board', 'Approves JRI and dispatch readiness.'],
            ].map(([role, desc]) => (
              <div key={role} className="border border-border rounded p-3 bg-surface-2">
                <div className="text-sm font-medium text-text-primary">{role}</div>
                <div className="text-xs text-text-secondary mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
