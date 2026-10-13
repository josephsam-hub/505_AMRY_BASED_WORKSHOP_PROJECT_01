import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../services/api/client';
import { productionService } from '../../services/productionService';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import type { Tank } from '../../models';

interface RoadTrialRow { id: string; tank_id: string; status: string; conducted_date?: string }
interface InspectionRow { id: string; tank_id: string; name: string; status: string; scheduled_date: string }
interface DefectRow { id: string; tank_id: string; severity: string; status: string }
interface JriRow { id: string; tank_id: string; status: string; scheduled_date: string; conducted_date?: string; handover_date?: string; dispatch_date?: string }

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

function getReadiness(
  tankId: string,
  roadTrials: RoadTrialRow[],
  inspections: InspectionRow[],
  defects: DefectRow[],
  jriRecords: JriRow[]
) {
  const roadTrial = roadTrials.find((r) => r.tank_id === tankId);
  const finalInsp = inspections.find((i) => i.tank_id === tankId && (i.name.includes('Final') || i.name.includes('Integration') || i.name.includes('Road')));
  const jri = jriRecords.find((j) => j.tank_id === tankId);
  const openDefects = defects.filter((d) => d.tank_id === tankId && (d.status === 'OPEN' || d.status === 'IN_PROGRESS'));

  const roadTrialStatus: ReadinessStatus =
    !roadTrial ? 'na' :
    roadTrial.status === 'COMPLETED' ? 'cleared' : 'pending';

  const finalInspStatus: ReadinessStatus =
    !finalInsp ? 'pending' :
    finalInsp.status === 'PASSED' ? 'cleared' :
    finalInsp.status === 'FAILED' ? 'blocked' : 'pending';

  const defectStatus: ReadinessStatus =
    openDefects.length === 0 ? 'cleared' :
    openDefects.some((d) => d.severity === 'CRITICAL') ? 'blocked' : 'pending';

  const jriStatus: ReadinessStatus =
    !jri ? 'pending' :
    jri.status === 'COMPLETED' ? 'cleared' : 'pending';

  const handoverStatus: ReadinessStatus =
    jri?.handover_date ? 'cleared' :
    jri?.status === 'COMPLETED' ? 'pending' : 'na';

  return { roadTrialStatus, finalInspStatus, defectStatus, jriStatus, handoverStatus, openDefects, jri };
}

export default function JriHandover() {
  const navigate = useNavigate();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [roadTrials, setRoadTrials] = useState<RoadTrialRow[]>([]);
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [jriRecords, setJriRecords] = useState<JriRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productionService.getTanks(),
      apiRequest<RoadTrialRow[]>('/api/road-trials'),
      apiRequest<InspectionRow[]>('/api/inspections'),
      apiRequest<DefectRow[]>('/api/defects'),
      apiRequest<JriRow[]>('/api/jri'),
    ]).then(([t, rt, insp, def, jri]) => {
      setTanks(t);
      setRoadTrials(rt);
      setInspections(insp);
      setDefects(def);
      setJriRecords(jri);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Only show Stage 6 tanks and completed tanks
  const stage6Tanks = tanks.filter((t) => t.currentStageId === 'S6' || t.status === 'completed');

  const kpis = {
    readyForJri: stage6Tanks.filter((t) => {
      const r = getReadiness(t.id, roadTrials, inspections, defects, jriRecords);
      return r.roadTrialStatus === 'cleared' && r.defectStatus === 'cleared' && r.jriStatus === 'pending';
    }).length,
    jriScheduled: jriRecords.filter((j) => j.status === 'SCHEDULED').length,
    jriCleared: jriRecords.filter((j) => j.status === 'COMPLETED').length,
    handedOver: jriRecords.filter((j) => !!j.handover_date).length,
    dispatched: jriRecords.filter((j) => !!j.dispatch_date).length,
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

      <div className="flex items-center gap-2 text-xs text-text-tertiary overflow-x-auto py-1 flex-shrink-0">
        {['Road Trial', 'Final Inspection', 'Defects Cleared', 'JRI', 'Handover', 'Dispatch'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-text-secondary">{step}</span>
            {i < arr.length - 1 && <ArrowRight size={12} className="text-text-tertiary" />}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-text-tertiary">Loading JRI data…</div>
      ) : stage6Tanks.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-sm font-semibold text-text-secondary uppercase tracking-wider">NO STAGE 6 TANKS</div>
          <div className="text-xs text-text-tertiary mt-2">No tanks are currently in Stage 6 or completed.</div>
          <div className="text-2xs text-text-tertiary mt-1 opacity-60">Source: Workshop PostgreSQL</div>
        </div>
      ) : (
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
                const r = getReadiness(tank.id, roadTrials, inspections, defects, jriRecords);
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
                      <div className="flex items-center gap-1">
                        <ReadinessCell status={r.defectStatus} />
                        {r.openDefects.length > 0 && (
                          <span className="text-2xs text-text-tertiary">({r.openDefects.length})</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <ReadinessCell status={r.jriStatus} />
                        {r.jri?.scheduled_date && r.jriStatus !== 'cleared' && (
                          <div className="text-2xs text-text-tertiary mt-0.5">{formatDate(r.jri.scheduled_date)}</div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {r.jri?.handover_date ? (
                        <div>
                          <ReadinessCell status="cleared" />
                          <div className="text-2xs text-text-tertiary">{formatDate(r.jri.handover_date)}</div>
                        </div>
                      ) : (
                        <ReadinessCell status={r.handoverStatus} />
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <StatusBadge type="tank" value={tank.status} size="sm" />
                        {r.defectStatus === 'blocked' && r.openDefects.length > 0 && (
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
      )}
    </div>
  );
}
