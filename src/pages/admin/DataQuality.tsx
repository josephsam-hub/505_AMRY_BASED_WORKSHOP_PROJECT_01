import { useEffect, useState } from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { dataQualityService, type DataQualityReport } from '../../services/api/dataQualityService';

export default function DataQuality() {
  const [reports, setReports] = useState<DataQualityReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void dataQualityService.getReports().then(setReports).catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="page-title">Data Quality</h1>
        <p className="page-subtitle">Source validation and import integrity</p>
      </div>
      {error && <div className="card p-4 text-sm text-status-critical">Database unavailable: {error}</div>}
      {reports.length === 0 && !error && <div className="card p-6 text-sm text-text-tertiary">No source documents recorded.</div>}
      {reports.map((report) => (
        <section className="card p-4" key={report.id}>
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{report.document_name}</h2>
              <div className="text-2xs text-text-tertiary">{report.batch_status ?? report.document_status}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              ['Source rows', report.total_rows],
              ['Valid', report.valid_rows],
              ['Invalid', report.invalid_rows],
              ['Ambiguous', report.ambiguous_rows],
              ['Imported', report.inserted_rows],
              ['Skipped', report.skipped_rows],
              ['Warnings', report.warning_rows],
              ['Errors', report.error_count],
            ].map(([label, value]) => (
              <div key={label} className="border border-border rounded p-3">
                <div className="text-2xs text-text-tertiary uppercase tracking-wider">{label}</div>
                <div className="text-xl font-semibold text-text-primary tabular-nums mt-1">{value}</div>
              </div>
            ))}
          </div>
          {report.ambiguous_rows > 0 && <div className="mt-4 flex items-center gap-2 text-xs text-status-warning"><AlertTriangle size={13} /> Unresolved source identity or date values remain ambiguous and were not imported.</div>}
        </section>
      ))}
    </div>
  );
}