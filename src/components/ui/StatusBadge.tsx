import type { TankStatus, ProcessStatus, InspectionStatus, DefectSeverity, DefectStatus } from '../../models';
import { tankStatusConfig, processStatusConfig, inspectionStatusConfig, defectSeverityConfig, defectStatusConfig } from '../../utils/statusUtils';

interface Props {
  type: 'tank' | 'process' | 'inspection' | 'defect-severity' | 'defect-status';
  value: TankStatus | ProcessStatus | InspectionStatus | DefectSeverity | DefectStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ type, value, size = 'md' }: Props) {
  let badgeClass = '';

  if (type === 'tank') badgeClass = tankStatusConfig[value as TankStatus]?.badgeClass ?? '';
  else if (type === 'process') badgeClass = processStatusConfig[value as ProcessStatus]?.badgeClass ?? '';
  else if (type === 'inspection') badgeClass = inspectionStatusConfig[value as InspectionStatus]?.badgeClass ?? '';
  else if (type === 'defect-severity') badgeClass = defectSeverityConfig[value as DefectSeverity]?.badgeClass ?? '';
  else if (type === 'defect-status') badgeClass = defectStatusConfig[value as DefectStatus]?.badgeClass ?? '';

  let label = '';
  if (type === 'tank') label = tankStatusConfig[value as TankStatus]?.label ?? value;
  else if (type === 'process') label = processStatusConfig[value as ProcessStatus]?.label ?? value;
  else if (type === 'inspection') label = inspectionStatusConfig[value as InspectionStatus]?.label ?? value;
  else if (type === 'defect-severity') label = defectSeverityConfig[value as DefectSeverity]?.label ?? value;
  else if (type === 'defect-status') label = defectStatusConfig[value as DefectStatus]?.label ?? value;

  const sizeClass = size === 'sm' ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className={`inline-flex items-center font-medium rounded-sm ${sizeClass} ${badgeClass}`}>
      {label}
    </span>
  );
}
