import { apiRequest } from './client';

export const reportService = {
  getProduction: () => apiRequest('/api/reports/production'),
  getDefects: () => apiRequest('/api/reports/defects'),
  getInspections: () => apiRequest('/api/reports/inspections'),
};
