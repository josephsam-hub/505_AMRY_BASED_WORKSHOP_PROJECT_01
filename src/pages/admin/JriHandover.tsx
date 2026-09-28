import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FileCheck, CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import type { Defect, Inspection, JRIRecord, RoadTrial, Tank } from '../../models';
import { jriService } from '../../services/api/jriService';
import { handoverService, type HandoverRecord } from '../../services/api/handoverService';
import { roadTrialService } from '../../services/api/roadTrialService';
import { inspectionService } from '../../services/api/inspectionService';
import { defectService } from '../../services/api/defectService';
import { productionService } from '../../services/productionService';

type ReadinessStatus = 'cleared' | 'pending' | 'blocked' | 'na';

function ReadinessCell({ status, label }: { status: ReadinessStatus; label?: string }) {
  if (status === 'cleared') return (
    <div className="flex items-center gap-1" title={label}>
      <CheckCircle2 size={13} className="text-status-completed" />
      <span className="text-2xs text-status-completed">Cleared</span>
    </div>
  );
  if (status === 'blocked') return (
    <div className="flex items-center gap-1" title={label}>
      <XCircle size={13} className="text-status-critical" />
      <span className="text-2xs text-status-critical">Blocked</span>
    </div>
  );
  if (status === 'pending') return (
    <div className="flex items-center gap-1" title={label}>
      <Clock size={13} className="text-status-warning" />
      <span className="text-2xs text-status-warning">Pending</span>
    </div>
  );
  return <span className="text-2xs text-text-tertiary">—</span>;
}

function getReadiness(tankId: string, tanks: Tank[], roadTrials: RoadTrial[], inspections: Inspection[], jriRecords: JRIRecord[], handoverRecords: HandoverRecord[], defects: Defect[]) {
  const tank = tanks.find((t) => t.id === tankId);
  const roadTrial = roadTrials.find((r) => r.tankId === tankId);
  const finalInsp = inspections.find((i) => i.tankId === tankId && (i.name.includes('Final') || i.name.includes('Integration')));
  const jri = jriRecords.find((j) => j.tankId === tankId);
  const handover = handoverRecords.find((item) => item.tankId === tankId);
  const openDefects = defects.filter((d) => d.tankId === tankId && (d.status === 'open' || d.status === 'in-progress'));

  const roadTrialStatus: ReadinessStatus =
    !roadTrial ? 'na' :
    roadTrial.status === 'completed' ? 'cleared' :
    roadTrial.status === 'scheduled' ? 'pending' : 'pending';

  const finalInspStatus: ReadinessStatus =
    !finalInsp ? 'pending' :
    finalInsp.status === 'passed' ? 'cleared' :
    finalInsp.status === 'failed' ? 'blocked' : 'pending';

  const defectStatus: ReadinessStatus =
    openDefects.length === 0 ? 'cleared' :
    openDefects.some((d) => d.severity === 'critical') ? 'blocked' : 'pending';

  const jriStatus: ReadinessStatus =
    !jri ? 'pending' :
    jri.status === 'completed' ? 'cleared' :
    jri.status === 'scheduled' ? 'pending' : 'pending';

  const handoverStatus: ReadinessStatus =
    handover?.handoverDate ? 'cleared' :
    handover ? 'pending' : 'na';

  const overallBlocked = defectStatus === 'blocked' || finalInspStatus === 'blocked';
  const overallPending = roadTrialStatus === 'pending' || finalInspStatus === 'pending' || jriStatus === 'pending';

  const overall: ReadinessStatus =
    tank?.status === 'completed' ? 'cleared' :
    overallBlocked ? 'blocked' :
    overallPending ? 'pending' : 'cleared';

  return { roadTrialStatus, finalInspStatus, defectStatus, jriStatus, handoverStatus, overall, openDefects, handover };
}

export default function JriHandover() {
  const navigate = useNavigate();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [roadTrials, setRoadTrials] = useState<RoadTrial[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [jriRecords, setJriRecords] = useState<JRIRecord[]>([]);
  const [handoverRecords, setHandoverRecords] = useState<HandoverRecord[]>([]);

  useEffect(() => {
    void Promise.all([productionService.getTanks(), roadTrialService.getRoadTrials(), inspectionService.getInspections(), defectService.getDefects(), jriService.getJriRecords(), handoverService.getHandoverRecords()]).then(([nextTanks, nextRoadTrials, nextInspections, nextDefects, nextJri, nextHandover]) => {
      setTanks(nextTanks);
      setRoadTrials(nextRoadTrials);
      setInspections(nextInspections);
      setDefects(nextDefects);
      setJriRecords(nextJri);
      setHandoverRecords(nextHandover);
    });
  }, []);

  const stage6Tanks = tanks.filter((tank) => tank.currentStageId === 'S6' || tank.status === 'completed');

  const kpis = {
    readyForJri: stage6Tanks.filter((t) => {
      const r = getReadiness(t.id, tanks, roadTrials, inspections, jriRecords, handoverRecords, defects);
      return r.roadTrialStatus === 'cleared' && r.defectStatus === 'cleared' && r.jriStatus === 'pending';
    }).length,
    jriScheduled: jriRecords.filter((j) => j.status === 'scheduled').length,
    jriCleared: jriRecords.filter((j) => j.status === 'completed').length,
    handedOver: handoverRecords.filter((record) => record.handoverDate).length,
    dispatched: handoverRecords.filter((record) => record.dispatchDate).length,
  };

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">JRI & Handover</h1>
        <p className="page-subtitle">Final readiness gate — Joint Receiving Inspection and dispatch</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Ready for JRI" value={kpis.readyForJri} accent="active" icon={<FileCheck size={14} />} />
        <KpiCard label="JRI Scheduled" value={kpis.jriScheduled} accent="warning" />
        <KpiCard label="JRI Cleared" value={kpis.jriCleared} accent="completed" />
        <KpiCard label="Handed Over" value={kpis.handedOver} accent="completed" />
        <KpiCard label="Dispatched" value={kpis.dispatched} accent="completed" />
      </div>

      {/* Lifecycle pipeline label */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary overflow-x-auto py-1">
        {['Final Fitment', 'Final Inspection', 'Defects Cleared', 'JRI', 'Handover', 'Dispatch'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-text-secondary">{step}</span>
            {i < arr.length - 1 && <ArrowRight size={12} className="text-text-tertiary" />}
          </div>
        ))}
      </div>

      {/* Readiness matrix */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="table-header text-left py-2.5 px-3 w-24">Tank</th>
              <th className="table-header text-left py-2.5 px-3">OH Number</th>
              <th className="table-header text-left py-2.5 px-3">Road Trial</th>
              <th className="table-header text-left py-2.5 px-3">Final Insp.</th>
              <th className="table-header text-left py-2.5 px-3">Defects</th>
              <th className="table-header text-left py-2.5 px-3">JRI</th>
              <th className="table-header text-left py-2.5 px-3">Handover</th>
              <th className="table-header text-left py-2.5 px-3">Overall</th>
            </tr>
          </thead>
          <tbody>
            {stage6Tanks.map((tank) => {
              const r = getReadiness(tank.id, tanks, roadTrials, inspections, jriRecords, handoverRecords, defects);
              const jri = jriRecords.find((j) => j.tankId === tank.id);
              const handover = handoverRecords.find((record) => record.tankId === tank.id);

              return (
                <tr key={tank.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="table-cell">
                    <button
                      className="font-mono font-semibold text-text-primary hover:text-status-active transition-colors"
                      onClick={() => navigate(`/admin/tanks/${tank.id}`)}
                    >
                      T-{tank.tankNumber}
                    </button>
                  </td>
                  <td className="table-cell text-text-secondary">{tank.ohNumber}</td>
                  <td className="table-cell"><ReadinessCell status={r.roadTrialStatus} /></td>
                  <td className="table-cell"><ReadinessCell status={r.finalInspStatus} /></td>
                  <td className="table-cell">
                    {r.openDefects.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <ReadinessCell status={r.defectStatus} />
                        <span className="text-2xs text-text-tertiary">({r.openDefects.length})</span>
                      </div>
                    ) : (
                      <ReadinessCell status={r.defectStatus} />
                    )}
                  </td>
                  <td className="table-cell">
                    <div>
                      <ReadinessCell status={r.jriStatus} />
                      {jri?.scheduledDate && r.jriStatus !== 'cleared' && (
                        <div className="text-2xs text-text-tertiary mt-0.5">{formatDate(jri.scheduledDate)}</div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    {handover?.handoverDate ? (
                      <div>
                        <ReadinessCell status="cleared" />
                        <div className="text-2xs text-text-tertiary">{formatDate(handover.handoverDate)}</div>
                      </div>
                    ) : (
                      <ReadinessCell status={r.handoverStatus} />
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="tank" value={tank.status} size="sm" />
                      {r.overall === 'blocked' && r.openDefects.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={11} className="text-status-critical" />
                          <span className="text-2xs text-status-critical">{r.openDefects[0].id}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
