CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  production_year INTEGER,
  page_count INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT REFERENCES users(id),
  checksum TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'VALIDATED', 'IMPORTED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS source_documents_checksum_idx
  ON source_documents (checksum) WHERE checksum IS NOT NULL;

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'VALIDATING', 'READY', 'IMPORTING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED')),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  ambiguous_rows INTEGER NOT NULL DEFAULT 0 CHECK (ambiguous_rows >= 0),
  inserted_rows INTEGER NOT NULL DEFAULT 0 CHECK (inserted_rows >= 0),
  updated_rows INTEGER NOT NULL DEFAULT 0 CHECK (updated_rows >= 0),
  skipped_rows INTEGER NOT NULL DEFAULT 0 CHECK (skipped_rows >= 0),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  created_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS source_production_rows (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE RESTRICT,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  source_row_number INTEGER NOT NULL CHECK (source_row_number > 0),
  raw_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('VALID', 'INVALID', 'AMBIGUOUS', 'DUPLICATE', 'SKIPPED')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_document_id, page_number, source_row_number)
);

CREATE TABLE IF NOT EXISTS source_stage_mappings (
  id TEXT PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE RESTRICT,
  source_name TEXT NOT NULL,
  canonical_stage_id TEXT REFERENCES stages(id),
  canonical_process_id TEXT REFERENCES processes(id),
  mapping_confidence TEXT NOT NULL CHECK (mapping_confidence IN ('HIGH', 'MEDIUM', 'LOW', 'UNMAPPED')),
  mapping_notes TEXT,
  UNIQUE (source_document_id, source_name)
);

ALTER TABLE tanks
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS production_year INTEGER,
  ADD COLUMN IF NOT EXISTS wcn TEXT,
  ADD COLUMN IF NOT EXISTS handover_date DATE;

ALTER TABLE tank_processes
  ADD COLUMN IF NOT EXISTS source_date_in DATE,
  ADD COLUMN IF NOT EXISTS source_date_out DATE,
  ADD COLUMN IF NOT EXISTS source_date_in_text TEXT,
  ADD COLUMN IF NOT EXISTS source_date_out_text TEXT,
  ADD COLUMN IF NOT EXISTS source_total_days INTEGER,
  ADD COLUMN IF NOT EXISTS calculated_days INTEGER,
  ADD COLUMN IF NOT EXISTS duration_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_row_id TEXT REFERENCES source_production_rows(id);

CREATE UNIQUE INDEX IF NOT EXISTS tanks_verified_identity_idx
  ON tanks (production_year, serial_number, oh_number, tank_number)
  WHERE production_year IS NOT NULL AND serial_number IS NOT NULL AND oh_number IS NOT NULL AND tank_number IS NOT NULL;
