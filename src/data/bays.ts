import type { Bay } from '../models';

export const bays: Bay[] = [
  { id: 'B01', number: 1, name: 'Bay 1 — Stripping', capacity: 3, currentTankIds: ['T-651', 'T-652'], currentProcessId: 'P02', status: 'occupied', utilization: 67 },
  { id: 'B02', number: 2, name: 'Bay 2 — Washing', capacity: 3, currentTankIds: ['T-653'], currentProcessId: 'P03', status: 'occupied', utilization: 33 },
  { id: 'B03', number: 3, name: 'Bay 3 — Reclamation', capacity: 2, currentTankIds: ['T-648', 'T-649'], currentProcessId: 'P06', status: 'occupied', utilization: 100 },
  { id: 'B04', number: 4, name: 'Bay 4 — Reclamation', capacity: 2, currentTankIds: ['T-650'], currentProcessId: 'P07', status: 'occupied', utilization: 50 },
  { id: 'B05', number: 5, name: 'Bay 5 — Assembly', capacity: 2, currentTankIds: ['T-645', 'T-646'], currentProcessId: 'P16', status: 'occupied', utilization: 100 },
  { id: 'B06', number: 6, name: 'Bay 6 — Assembly', capacity: 2, currentTankIds: ['T-647'], currentProcessId: 'P15', status: 'occupied', utilization: 50 },
  { id: 'B07', number: 7, name: 'Bay 7 — Semi-Final', capacity: 2, currentTankIds: ['T-643', 'T-644'], currentProcessId: 'P20', status: 'occupied', utilization: 100 },
  { id: 'B08', number: 8, name: 'Bay 8 — Integration', capacity: 2, currentTankIds: ['T-641'], currentProcessId: 'P22', status: 'occupied', utilization: 50 },
  { id: 'B09', number: 9, name: 'Bay 9 — Integration', capacity: 2, currentTankIds: ['T-640'], currentProcessId: 'P25', status: 'occupied', utilization: 50 },
  { id: 'B10', number: 10, name: 'Bay 10 — Road Trial', capacity: 1, currentTankIds: ['T-636'], currentProcessId: 'P26', status: 'occupied', utilization: 100 },
  { id: 'B11', number: 11, name: 'Bay 11 — Final Fitment', capacity: 2, currentTankIds: ['T-623'], currentProcessId: 'P28', status: 'occupied', utilization: 50 },
  { id: 'B12', number: 12, name: 'Bay 12 — JRI / Dispatch', capacity: 2, currentTankIds: [], status: 'available', utilization: 0 },
  { id: 'B13', number: 13, name: 'Bay 13 — Overflow', capacity: 3, currentTankIds: ['T-654', 'T-655'], currentProcessId: 'P02', status: 'occupied', utilization: 67 },
  { id: 'B14', number: 14, name: 'Bay 14 — Maintenance', capacity: 2, currentTankIds: [], status: 'maintenance', utilization: 0 },
];

export const getBayById = (id: string): Bay | undefined =>
  bays.find((b) => b.id === id);
