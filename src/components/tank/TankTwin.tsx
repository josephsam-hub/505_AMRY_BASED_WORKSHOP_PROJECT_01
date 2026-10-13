import type { Defect, Inspection, Process, Stage, Tank } from '../../models';
import { StatusBadge } from '../ui/StatusBadge';

interface TwinArea {
  id: string;
  label: string;
  stageIds: string[];
  processIds: string[];
  x: number; y: number; w: number; h: number;
}

const TWIN_AREAS: TwinArea[] = [
  { id: 'hull',       label: 'HULL',         stageIds: ['S1','S2','S3'], processIds: ['P05','P06','P08','P11','P14','P16'], x: 10, y: 35, w: 80, h: 30 },
  { id: 'turret',     label: 'TURRET',       stageIds: ['S4'],           processIds: ['P18','P19'],                         x: 25, y: 10, w: 50, h: 22 },
  { id: 'engine',     label: 'ENGINE',       stageIds: ['S2','S3'],      processIds: ['P09','P12','P15'],                   x: 60, y: 38, w: 28, h: 24 },
  { id: 'electrical', label: 'ELECTRICAL',   stageIds: ['S4','S5'],      processIds: ['P20','P23'],                         x: 10, y: 68, w: 40, h: 18 },
  { id: 'armament',   label: 'ARMAMENT',     stageIds: ['S4','S5'],      processIds: ['P19','P24'],                         x: 52, y: 68, w: 38, h: 18 },
  { id: 'integration',label: 'INTEGRATION',  stageIds: ['S5'],           processIds: ['P22','P25'],                         x: 10, y: 88, w: 80, h: 10 },
];

function getAreaStatus(
  area: TwinArea,
  tank: Tank,
  _processes: Process[],
  defects: Defect[],
  inspections: Inspection[]
): { status: string; progress: number; defectCount: number; inspectionStatus: string } {
  const curProcNum = parseInt((tank.currentProcessId || 'P01').replace('P', ''), 10) || 1;
  const areaProcNums = area.processIds.map((p) => parseInt(p.replace('P', ''), 10));
  const minProcNum = Math.min(...areaProcNums);
  const maxProcNum = Math.max(...areaProcNums);

  let status = 'pending';
  let progress = 0;

  if (tank.status === 'completed' || curProcNum > maxProcNum) {
    status = 'completed';
    progress = 100;
  } else if (curProcNum < minProcNum) {
    status = 'pending';
    progress = 0;
  } else {
    // Within this component's active process span
    status = tank.status === 'critical' ? 'blocked' : tank.status === 'warning' ? 'delayed' : 'active';
    const totalAreaProcs = areaProcNums.length;
    const completedInArea = areaProcNums.filter((n) => n < curProcNum).length;
    progress = Math.min(99, Math.max(10, Math.round(((completedInArea + 0.5) / totalAreaProcs) * 100)));
  }

  // Defect filtering with case & separator normalization
  const areaDefects = defects.filter((d) => {
    const s = (d.status || '').toLowerCase().replace('-', '_');
    return area.processIds.includes(d.processId) && (s === 'open' || s === 'in_progress');
  });

  // Inspection filtering with status normalization
  const areaInspections = inspections.filter((i) => area.processIds.includes(i.processId));
  const latestInspection = areaInspections.sort((a, b) => (b.scheduledDate || '').localeCompare(a.scheduledDate || ''))[0];
  const inspectionStatus = (latestInspection?.status || 'none').toLowerCase();

  return {
    status,
    progress,
    defectCount: areaDefects.length,
    inspectionStatus,
  };
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  completed: { fill: '#0A2016', stroke: '#1A4A2A', text: '#4A9E6A' },
  active:    { fill: '#0A1830', stroke: '#1A4070', text: '#3A7EC4' },
  blocked:   { fill: '#260A0A', stroke: '#6A1A1A', text: '#C44040' },
  delayed:   { fill: '#261800', stroke: '#6A3E00', text: '#C4882A' },
  pending:   { fill: '#111620', stroke: '#2A3545', text: '#445060' },
};

interface TankTwinProps {
  tank: Tank;
  processes: Process[];
  stages: Stage[];
  defects: Defect[];
  inspections: Inspection[];
  onAreaClick?: (areaId: string) => void;
  selectedArea?: string | null;
}

export function TankTwin({ tank, processes, defects, inspections, onAreaClick, selectedArea }: TankTwinProps) {
  return (
    <div className="card p-4">
      <div className="text-2xs font-bold text-text-tertiary uppercase tracking-wider mb-3" style={{ letterSpacing: '0.12em' }}>
        DIGITAL TWIN — T-{tank.tankNumber}
      </div>

      {/* SVG schematic */}
      <div className="relative w-full" style={{ paddingBottom: '40%' }}>
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          style={{ background: '#070A0E', borderRadius: 4, border: '1px solid #1A2535' }}
        >
          {/* Tank silhouette outline */}
          <rect x="8" y="33" width="84" height="34" rx="2" fill="#0A0D12" stroke="#1A2535" strokeWidth="0.5" />
          <rect x="23" y="8" width="54" height="24" rx="2" fill="#0A0D12" stroke="#1A2535" strokeWidth="0.5" />
          {/* Gun barrel */}
          <rect x="77" y="18" width="18" height="3" rx="1" fill="#0D1117" stroke="#1A2535" strokeWidth="0.3" />
          {/* Tracks */}
          <rect x="6" y="62" width="88" height="8" rx="3" fill="#0A0D12" stroke="#1A2535" strokeWidth="0.5" />
          <rect x="6" y="30" width="88" height="8" rx="3" fill="#0A0D12" stroke="#1A2535" strokeWidth="0.5" />

          {/* Area overlays */}
          {TWIN_AREAS.map((area) => {
            const { status, progress, defectCount, inspectionStatus } = getAreaStatus(area, tank, processes, defects, inspections);
            const colors = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
            const isSelected = selectedArea === area.id;

            return (
              <g key={area.id} onClick={() => onAreaClick?.(area.id)} style={{ cursor: 'pointer' }}>
                <rect
                  x={area.x} y={area.y} width={area.w} height={area.h}
                  rx="1.5"
                  fill={colors.fill}
                  stroke={isSelected ? '#60A5FA' : colors.stroke}
                  strokeWidth={isSelected ? 1 : 0.5}
                  opacity={0.9}
                />
                {/* Progress fill */}
                {progress > 0 && (
                  <rect
                    x={area.x} y={area.y + area.h - 2}
                    width={(area.w * progress) / 100} height={2}
                    rx="1"
                    fill={colors.text}
                    opacity={0.8}
                  />
                )}
                {/* Label */}
                <text
                  x={area.x + area.w / 2} y={area.y + area.h / 2 - 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="3.5" fontWeight="700" fill={colors.text}
                  fontFamily="monospace" letterSpacing="0.3"
                >
                  {area.label}
                </text>
                <text
                  x={area.x + area.w / 2} y={area.y + area.h / 2 + 3.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="3" fill={colors.text} opacity={0.7}
                  fontFamily="monospace"
                >
                  {status === 'completed' ? '✓ COMPLETE' : status === 'pending' ? 'PENDING' : `${progress}%`}
                </text>
                {/* Defect indicator */}
                {defectCount > 0 && (
                  <circle cx={area.x + area.w - 3} cy={area.y + 3} r="2.5" fill="#C44040" opacity={0.9} />
                )}
                {/* Inspection indicator */}
                {inspectionStatus === 'failed' && (
                  <circle cx={area.x + 3} cy={area.y + 3} r="2.5" fill="#C4882A" opacity={0.9} />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Area legend */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {TWIN_AREAS.map((area) => {
          const { status, defectCount, inspectionStatus } = getAreaStatus(area, tank, processes, defects, inspections);
          const colors = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
          return (
            <button
              key={area.id}
              className={`text-left px-2 py-1.5 rounded border transition-colors ${selectedArea === area.id ? 'border-status-active bg-surface-3' : 'border-border hover:bg-surface-2'}`}
              onClick={() => onAreaClick?.(area.id)}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors.text }} />
                <span className="text-2xs font-bold text-text-secondary">{area.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge type="tank" value={status as 'active' | 'completed' | 'warning' | 'critical' | 'pending'} size="sm" />
                {defectCount > 0 && <span className="text-2xs text-status-critical font-bold">{defectCount}D</span>}
                {inspectionStatus === 'failed' && <span className="text-2xs text-status-warning font-bold">INSP FAIL</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
