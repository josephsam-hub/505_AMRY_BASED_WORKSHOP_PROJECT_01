import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  accent?: 'default' | 'completed' | 'active' | 'warning' | 'critical' | 'pending';
  onClick?: () => void;
}

const accentBorder: Record<string, string> = {
  default: 'border-border',
  completed: 'border-status-completed',
  active: 'border-status-active',
  warning: 'border-status-warning',
  critical: 'border-status-critical',
  pending: 'border-status-pending',
};

const accentValue: Record<string, string> = {
  default: 'text-text-primary',
  completed: 'text-status-completed',
  active: 'text-status-active',
  warning: 'text-status-warning',
  critical: 'text-status-critical',
  pending: 'text-text-tertiary',
};

export function KpiCard({ label, value, sub, icon, accent = 'default', onClick }: Props) {
  return (
    <div
      className={`card border-l-2 ${accentBorder[accent]} p-4 flex flex-col gap-2 ${onClick ? 'cursor-pointer hover:bg-surface-2 transition-colors duration-fast' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        {icon && <span className="text-text-tertiary">{icon}</span>}
      </div>
      <div className={`kpi-value ${accentValue[accent]}`}>{value}</div>
      {sub && <div className="text-xs text-text-tertiary">{sub}</div>}
    </div>
  );
}
