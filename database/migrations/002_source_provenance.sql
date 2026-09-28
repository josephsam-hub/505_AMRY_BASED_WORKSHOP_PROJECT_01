ALTER TABLE tanks
  ADD COLUMN IF NOT EXISTS source_document TEXT,
  ADD COLUMN IF NOT EXISTS source_page INTEGER,
  ADD COLUMN IF NOT EXISTS source_row INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS tanks_source_location_idx
  ON tanks (source_document, source_page, source_row)
  WHERE source_document IS NOT NULL AND source_page IS NOT NULL AND source_row IS NOT NULL;

CREATE TABLE IF NOT EXISTS source_schedule_rows (
  source_document TEXT NOT NULL,
  source_page INTEGER NOT NULL,
  source_row INTEGER NOT NULL,
  serial_number TEXT,
  qw_number TEXT,
  tank_number TEXT,
  job_date DATE,
  processes JSONB NOT NULL DEFAULT '{}'::jsonb,
  import_status TEXT NOT NULL,
  import_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_document, source_page, source_row)
);

CREATE TABLE IF NOT EXISTS source_data_quality_reports (
  id TEXT PRIMARY KEY,
  source_document TEXT NOT NULL,
  source_page INTEGER NOT NULL,
  total_source_rows INTEGER NOT NULL,
  successfully_extracted_rows INTEGER NOT NULL,
  imported_rows INTEGER NOT NULL,
  unreadable_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  skipped_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
