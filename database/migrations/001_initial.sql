CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_roles (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE, PRIMARY KEY (user_id, role_id));
CREATE TABLE IF NOT EXISTS tank_profiles (id BIGSERIAL PRIMARY KEY, type TEXT NOT NULL, profile TEXT NOT NULL, UNIQUE(type, profile));
CREATE TABLE IF NOT EXISTS stages (id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, short_name TEXT NOT NULL, planned_duration_days INTEGER NOT NULL DEFAULT 0, color TEXT);
CREATE TABLE IF NOT EXISTS processes (id TEXT PRIMARY KEY, process_number INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, stage_id TEXT NOT NULL REFERENCES stages(id), duration_days INTEGER NOT NULL DEFAULT 0, sequence INTEGER NOT NULL, path_type TEXT NOT NULL DEFAULT 'NON_CRITICAL');
CREATE TABLE IF NOT EXISTS process_dependencies (process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE, predecessor_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE, PRIMARY KEY (process_id, predecessor_id));
CREATE TABLE IF NOT EXISTS bays (id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL, utilization INTEGER NOT NULL DEFAULT 0, current_process_id TEXT REFERENCES processes(id));
CREATE TABLE IF NOT EXISTS gangs (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, specialty TEXT NOT NULL, authorized INTEGER NOT NULL DEFAULT 0, available INTEGER NOT NULL DEFAULT 0, deployed INTEGER NOT NULL DEFAULT 0, held INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS personnel (id TEXT PRIMARY KEY, name TEXT NOT NULL, specialty TEXT, active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS gang_members (gang_id TEXT NOT NULL REFERENCES gangs(id) ON DELETE CASCADE, personnel_id TEXT NOT NULL REFERENCES personnel(id) ON DELETE CASCADE, PRIMARY KEY (gang_id, personnel_id));
CREATE TABLE IF NOT EXISTS tanks (
  id TEXT PRIMARY KEY, tank_number TEXT NOT NULL UNIQUE, oh_number TEXT NOT NULL UNIQUE, tank_profile_id BIGINT REFERENCES tank_profiles(id), type TEXT NOT NULL, profile TEXT NOT NULL,
  intake_date DATE NOT NULL, planned_completion_date DATE, expected_completion_date DATE, actual_completion_date DATE,
  planned_exit_date DATE, expected_exit_date DATE, actual_exit_date DATE,
  current_stage_id TEXT REFERENCES stages(id), current_process_id TEXT REFERENCES processes(id), bay_id TEXT REFERENCES bays(id), gang_id TEXT REFERENCES gangs(id),
  progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100), status TEXT NOT NULL DEFAULT 'PENDING', blocker_reason TEXT, remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS tank_processes (
  id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, process_id TEXT NOT NULL REFERENCES processes(id), status TEXT NOT NULL, planned_start DATE, planned_end DATE, actual_start DATE, actual_end DATE, progress NUMERIC(5,2) NOT NULL DEFAULT 0, delay_days INTEGER NOT NULL DEFAULT 0, remarks TEXT, started_by TEXT REFERENCES users(id), completed_by TEXT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tank_id, process_id)
);
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, process_id TEXT NOT NULL REFERENCES processes(id), stage_id TEXT NOT NULL REFERENCES stages(id), name TEXT NOT NULL, status TEXT NOT NULL, scheduled_date DATE NOT NULL, completed_date DATE, inspector TEXT, remarks TEXT, failure_reasons TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS defects (
  id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, process_id TEXT NOT NULL REFERENCES processes(id), stage_id TEXT NOT NULL REFERENCES stages(id), category TEXT NOT NULL, severity TEXT NOT NULL, description TEXT NOT NULL, assigned_to TEXT NOT NULL, created_date DATE NOT NULL, target_date DATE NOT NULL, status TEXT NOT NULL, resolution TEXT, remarks TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS defect_updates (id TEXT PRIMARY KEY, defect_id TEXT NOT NULL REFERENCES defects(id) ON DELETE CASCADE, status TEXT, remarks TEXT, updated_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS road_trials (id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, scheduled_date DATE NOT NULL, conducted_date DATE, status TEXT NOT NULL, distance NUMERIC(8,2), result TEXT, defects_found TEXT[] NOT NULL DEFAULT '{}', remarks TEXT);
CREATE TABLE IF NOT EXISTS jri_records (id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, scheduled_date DATE NOT NULL, conducted_date DATE, status TEXT NOT NULL, board_members TEXT[] NOT NULL DEFAULT '{}', remarks TEXT, handover_date DATE, dispatch_date DATE);
CREATE TABLE IF NOT EXISTS handover_records (id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, status TEXT NOT NULL, handover_date DATE, dispatch_date DATE, remarks TEXT);
CREATE TABLE IF NOT EXISTS production_updates (id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, process_id TEXT NOT NULL REFERENCES processes(id), previous_status TEXT, current_status TEXT NOT NULL, progress NUMERIC(5,2) NOT NULL, updated_by TEXT, remarks TEXT, delay_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, tank_id TEXT REFERENCES tanks(id) ON DELETE CASCADE, process_id TEXT REFERENCES processes(id), read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, tank_id TEXT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, process_id TEXT REFERENCES processes(id), action TEXT NOT NULL, performed_by TEXT NOT NULL, details TEXT, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS tanks_status_idx ON tanks(status);
CREATE INDEX IF NOT EXISTS tanks_gang_idx ON tanks(gang_id);
CREATE INDEX IF NOT EXISTS inspections_status_idx ON inspections(status);
CREATE INDEX IF NOT EXISTS defects_status_idx ON defects(status);
