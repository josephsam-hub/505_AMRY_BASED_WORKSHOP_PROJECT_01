import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { stages } from '../../data/stages';
import type { Tank } from '../../models';

interface Props {
  tank: Tank;
}

type StageState = 'completed' | 'active' | 'blocked' | 'pending';

function getStageState(tank: Tank, stageId: string): StageState {
  const stageNum = stages.find((s) => s.id === stageId)?.number ?? 0;
  const currentNum = stages.find((s) => s.id === tank.currentStageId)?.number ?? 0;

  if (stageNum < currentNum) return 'completed';
  if (stageNum === currentNum) {
    if (tank.status === 'critical') return 'blocked';
    return 'active';
  }
  return 'pending';
}

const stateConfig = {
  completed: { icon: CheckCircle2, iconClass: 'text-status-completed', labelClass: 'text-status-completed', lineClass: 'bg-status-completed' },
  active: { icon: Loader2, iconClass: 'text-status-active animate-spin', labelClass: 'text-status-active', lineClass: 'bg-status-active' },
  blocked: { icon: AlertCircle, iconClass: 'text-status-critical', labelClass: 'text-status-critical', lineClass: 'bg-status-critical' },
  pending: { icon: Circle, iconClass: 'text-text-tertiary', labelClass: 'text-text-tertiary', lineClass: 'bg-border' },
};

export function TankJourney({ tank }: Props) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Tank Journey</div>
      <div className="flex items-start gap-0">
        {stages.map((stage, idx) => {
          const state = getStageState(tank, stage.id);
          const cfg = stateConfig[state];
          const Icon = cfg.icon;
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.id} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <Icon size={18} className={cfg.iconClass} />
                <div className="text-center mt-1.5 px-1">
                  <div className={`text-2xs font-medium leading-tight ${cfg.labelClass}`}>
                    Stage {stage.number}
                  </div>
                  <div className={`text-2xs leading-tight mt-0.5 ${state === 'pending' ? 'text-text-tertiary' : 'text-text-secondary'}`}>
                    {stage.shortName}
                  </div>
                </div>
              </div>
              {!isLast && (
                <div className={`flex-1 h-px mt-2.5 mx-1 ${cfg.lineClass}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
