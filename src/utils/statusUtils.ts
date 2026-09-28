import type { TankStatus, ProcessStatus, InspectionStatus, DefectSeverity, DefectStatus } from '../models';

export const tankStatusConfig: Record<TankStatus, { label: string; dotClass: string; badgeClass: string; textClass: string }> = {
  completed: {
    label: 'Completed',
    dotClass: 'bg-status-completed',
    badgeClass: 'bg-status-completed-bg border border-status-completed-border text-status-completed',
    textClass: 'text-status-completed',
  },
  active: {
    label: 'Active',
    dotClass: 'bg-status-active',
    badgeClass: 'bg-status-active-bg border border-status-active-border text-status-active',
    textClass: 'text-status-active',
  },
  warning: {
    label: 'At Risk',
    dotClass: 'bg-status-warning',
    badgeClass: 'bg-status-warning-bg border border-status-warning-border text-status-warning',
    textClass: 'text-status-warning',
  },
  critical: {
    label: 'Critical',
    dotClass: 'bg-status-critical',
    badgeClass: 'bg-status-critical-bg border border-status-critical-border text-status-critical',
    textClass: 'text-status-critical',
  },
  pending: {
    label: 'Pending',
    dotClass: 'bg-status-pending',
    badgeClass: 'bg-status-pending-bg border border-status-pending-border text-text-tertiary',
    textClass: 'text-text-tertiary',
  },
};

export const processStatusConfig: Record<ProcessStatus, { label: string; badgeClass: string }> = {
  completed: { label: 'Completed', badgeClass: 'bg-status-completed-bg border border-status-completed-border text-status-completed' },
  active: { label: 'In Progress', badgeClass: 'bg-status-active-bg border border-status-active-border text-status-active' },
  blocked: { label: 'Blocked', badgeClass: 'bg-status-critical-bg border border-status-critical-border text-status-critical' },
  pending: { label: 'Pending', badgeClass: 'bg-status-pending-bg border border-status-pending-border text-text-tertiary' },
  delayed: { label: 'Delayed', badgeClass: 'bg-status-warning-bg border border-status-warning-border text-status-warning' },
};

export const inspectionStatusConfig: Record<InspectionStatus, { label: string; badgeClass: string }> = {
  passed: { label: 'Passed', badgeClass: 'bg-status-completed-bg border border-status-completed-border text-status-completed' },
  failed: { label: 'Failed', badgeClass: 'bg-status-critical-bg border border-status-critical-border text-status-critical' },
  pending: { label: 'Pending', badgeClass: 'bg-status-pending-bg border border-status-pending-border text-text-tertiary' },
  'in-progress': { label: 'In Progress', badgeClass: 'bg-status-active-bg border border-status-active-border text-status-active' },
};

export const defectSeverityConfig: Record<DefectSeverity, { label: string; badgeClass: string }> = {
  critical: { label: 'Critical', badgeClass: 'bg-status-critical-bg border border-status-critical-border text-status-critical' },
  major: { label: 'Major', badgeClass: 'bg-status-warning-bg border border-status-warning-border text-status-warning' },
  minor: { label: 'Minor', badgeClass: 'bg-status-active-bg border border-status-active-border text-status-active' },
};

export const defectStatusConfig: Record<DefectStatus, { label: string; badgeClass: string }> = {
  open: { label: 'Open', badgeClass: 'bg-status-critical-bg border border-status-critical-border text-status-critical' },
  'in-progress': { label: 'In Progress', badgeClass: 'bg-status-warning-bg border border-status-warning-border text-status-warning' },
  resolved: { label: 'Resolved', badgeClass: 'bg-status-completed-bg border border-status-completed-border text-status-completed' },
  closed: { label: 'Closed', badgeClass: 'bg-status-pending-bg border border-status-pending-border text-text-tertiary' },
};

export function getProgressBarClass(progress: number): string {
  if (progress >= 100) return 'bg-status-completed';
  if (progress >= 70) return 'bg-status-active';
  if (progress >= 40) return 'bg-status-warning';
  return 'bg-status-critical';
}
