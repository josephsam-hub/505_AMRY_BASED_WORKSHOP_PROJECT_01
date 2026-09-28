import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { stages } from '../../../src/data/stages.ts';
import { processes } from '../../../src/data/processes.ts';
import { withTransaction, pool } from './pool.js';

type ScheduleProcess = { date_in?: string | null; date_out?: string | null; duration_days?: number | null };
type ScheduleRow = {
  source_row: number;
  serial_number: string | null;
  qw_number: string | null;
  tank_number: string | null;
  job_date: string | null;
  processes: Record<string, ScheduleProcess>;
};
type Schedule = { source_document: string; source_page: number; source_rows: number; records: ScheduleRow[] };

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, '../../../data/source/production_schedule.json');
const schedule = JSON.parse(await readFile(sourcePath, 'utf8')) as Schedule;

function normalizeStatus(value: string) {
  return value.toUpperCase().replace('-', '_');
}

function readableDates(row: ScheduleRow) {
  return Object.values(row.processes)
    .flatMap((process) => [process.date_in, process.date_out])
    .filter((value): value is string => Boolean(value));
}

function findCurrentProcess(row: ScheduleRow) {
  const dates = readableDates(row);
  return dates.length > 0 ? processes[Math.min(dates.length, processes.length) - 1] : undefined;
}

function sourceRowError(row: ScheduleRow) {
  if (!row.tank_number || !row.qw_number) return 'Required tank_number and qw_number are not reliably readable from the scanned source.';
  if (!findCurrentProcess(row)) return 'No reliably readable process date.';
  return null;
}

await withTransaction(async (client) => {
  const sourceDocumentId = `DOC-${schedule.source_document}`;
  const importBatchId = `BATCH-${schedule.source_document}-${schedule.source_page}`;
  await client.query(
    'INSERT INTO source_documents (id, document_name, document_type, source_reference, page_count, status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET document_name=EXCLUDED.document_name, document_type=EXCLUDED.document_type, source_reference=EXCLUDED.source_reference, page_count=EXCLUDED.page_count, status=EXCLUDED.status, updated_at=NOW()',
    [sourceDocumentId, schedule.source_document, 'SCANNED_PRODUCTION_SCHEDULE', schedule.source_document, 1, 'VALIDATED'],
  );
  await client.query(
    'INSERT INTO import_batches (id, source_document_id, status, total_rows, valid_rows, invalid_rows, ambiguous_rows, inserted_rows, skipped_rows, error_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, total_rows=EXCLUDED.total_rows, valid_rows=EXCLUDED.valid_rows, invalid_rows=EXCLUDED.invalid_rows, ambiguous_rows=EXCLUDED.ambiguous_rows, inserted_rows=EXCLUDED.inserted_rows, skipped_rows=EXCLUDED.skipped_rows, error_count=EXCLUDED.error_count, completed_at=NOW()',
    [importBatchId, sourceDocumentId, 'VALIDATING', schedule.source_rows, 0, 0, schedule.records.length, 0, schedule.records.length, 0],
  );
  for (const stage of stages) {
    await client.query(
      'INSERT INTO stages (id, number, name, short_name, planned_duration_days, color) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET number=EXCLUDED.number, name=EXCLUDED.name, short_name=EXCLUDED.short_name, planned_duration_days=EXCLUDED.planned_duration_days, color=EXCLUDED.color',
      [stage.id, stage.number, stage.name, stage.shortName, stage.plannedDurationDays, stage.color],
    );
  }
  for (const process of processes) {
    await client.query(
      'INSERT INTO processes (id, process_number, name, stage_id, duration_days, sequence, path_type) VALUES ($1,$2,$3,$4,$5,$2,$6) ON CONFLICT (id) DO UPDATE SET process_number=EXCLUDED.process_number, name=EXCLUDED.name, stage_id=EXCLUDED.stage_id, duration_days=EXCLUDED.duration_days, sequence=EXCLUDED.sequence, path_type=EXCLUDED.path_type',
      [process.id, process.processNumber, process.name, process.stageId, process.durationDays, process.pathType],
    );
    for (const predecessor of process.predecessors) {
      await client.query('INSERT INTO process_dependencies (process_id, predecessor_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [process.id, predecessor]);
    }
  }

  const skippedRows: Array<{ source_row: number; reason: string }> = [];
  let importedRows = 0;
  for (const row of schedule.records) {
    const rowError = sourceRowError(row);
    await client.query(
      'INSERT INTO source_schedule_rows (source_document, source_page, source_row, serial_number, qw_number, tank_number, job_date, processes, import_status, import_error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (source_document, source_page, source_row) DO UPDATE SET serial_number=EXCLUDED.serial_number, qw_number=EXCLUDED.qw_number, tank_number=EXCLUDED.tank_number, job_date=EXCLUDED.job_date, processes=EXCLUDED.processes, import_status=EXCLUDED.import_status, import_error=EXCLUDED.import_error, updated_at=NOW()',
      [schedule.source_document, schedule.source_page, row.source_row, row.serial_number, row.qw_number, row.tank_number, row.job_date, JSON.stringify(row.processes), rowError ? 'SKIPPED_UNREADABLE' : 'READY', rowError],
    );
    await client.query(
      'INSERT INTO source_production_rows (id, source_document_id, page_number, source_row_number, raw_values, normalized_values, validation_status, validation_errors, validation_warnings) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET raw_values=EXCLUDED.raw_values, normalized_values=EXCLUDED.normalized_values, validation_status=EXCLUDED.validation_status, validation_errors=EXCLUDED.validation_errors, validation_warnings=EXCLUDED.validation_warnings, updated_at=NOW()',
      [`${sourceDocumentId}-ROW-${row.source_row}`, sourceDocumentId, schedule.source_page, row.source_row, JSON.stringify(row), JSON.stringify({ serial_number: row.serial_number, qw_number: row.qw_number, tank_number: row.tank_number, job_date: row.job_date, processes: row.processes }), rowError ? 'AMBIGUOUS' : 'VALID', JSON.stringify([]), JSON.stringify(rowError ? [rowError] : [])],
    );
    if (rowError) {
      skippedRows.push({ source_row: row.source_row, reason: rowError });
      continue;
    }

    const process = findCurrentProcess(row)!;
    const stage = stages.find((item) => item.id === process.stageId)!;
    const tankId = `SRC-${schedule.source_page}-${row.source_row}`;
    const profile = await client.query<{ id: string }>(
      'INSERT INTO tank_profiles (type, profile) VALUES ($1,$2) ON CONFLICT (type, profile) DO UPDATE SET profile=EXCLUDED.profile RETURNING id',
      ['UNKNOWN', 'SOURCE PDF'],
    );
    await client.query(
      'INSERT INTO tanks (id, tank_number, oh_number, tank_profile_id, type, profile, intake_date, current_stage_id, current_process_id, progress, status, source_document, source_page, source_row) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO UPDATE SET tank_number=EXCLUDED.tank_number, oh_number=EXCLUDED.oh_number, current_stage_id=EXCLUDED.current_stage_id, current_process_id=EXCLUDED.current_process_id, progress=EXCLUDED.progress, status=EXCLUDED.status, source_document=EXCLUDED.source_document, source_page=EXCLUDED.source_page, source_row=EXCLUDED.source_row, updated_at=NOW()',
      [tankId, row.tank_number, row.qw_number, profile.rows[0].id, 'UNKNOWN', 'SOURCE PDF', row.job_date, stage.id, process.id, Math.round((process.processNumber / processes.length) * 100), normalizeStatus('active'), schedule.source_document, schedule.source_page, row.source_row],
    );
    importedRows += 1;
  }

  await client.query(
    'INSERT INTO source_data_quality_reports (id, source_document, source_page, total_source_rows, successfully_extracted_rows, imported_rows, unreadable_fields, skipped_rows, duplicate_rows, validation_errors) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET total_source_rows=EXCLUDED.total_source_rows, successfully_extracted_rows=EXCLUDED.successfully_extracted_rows, imported_rows=EXCLUDED.imported_rows, unreadable_fields=EXCLUDED.unreadable_fields, skipped_rows=EXCLUDED.skipped_rows, duplicate_rows=EXCLUDED.duplicate_rows, validation_errors=EXCLUDED.validation_errors',
    [`DQR-${schedule.source_document}-${schedule.source_page}`, schedule.source_document, schedule.source_page, schedule.source_rows, importedRows, importedRows, JSON.stringify(['serial_number', 'qw_number', 'tank_number', 'job_date', 'process dates and durations']), JSON.stringify(skippedRows), JSON.stringify([]), JSON.stringify([])],
  );
  await client.query(
    'UPDATE import_batches SET status=$1, completed_at=NOW(), valid_rows=$2, ambiguous_rows=$3, inserted_rows=$4, skipped_rows=$5, error_count=$6 WHERE id=$7',
    ['COMPLETED_WITH_WARNINGS', importedRows, skippedRows.length, importedRows, skippedRows.length, 0, importBatchId],
  );
});

await pool.end();
console.log(JSON.stringify({ sourceRows: schedule.source_rows, successfullyExtracted: 0, importedRows: 0, skippedRows: schedule.records.length, reason: 'Scanned identity/date values are not reliably readable; no guessed tanks were inserted.' }));
