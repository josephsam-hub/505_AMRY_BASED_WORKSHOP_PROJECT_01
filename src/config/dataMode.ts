// Data Mode: PRODUCTION uses PostgreSQL verified data only.
// SIMULATION uses deterministic synthetic data for demonstration.
// These modes must never be mixed.

export type DataMode = 'PRODUCTION' | 'SIMULATION';

const STORAGE_KEY = 'workshop_data_mode';

export function getDataMode(): DataMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'SIMULATION' || stored === 'PRODUCTION') return stored;
  } catch {
    // storage unavailable
  }
  return 'PRODUCTION';
}

export function setDataMode(mode: DataMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // storage unavailable
  }
}
