import { apiRequest } from './client';

export interface DataQualityReport {
  id: string;
  document_name: string;
  document_type: string;
  document_status: string;
  batch_id: string | null;
  batch_status: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  ambiguous_rows: number;
  inserted_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_count: number;
  persisted_source_rows: number;
  persisted_valid_rows: number;
  persisted_ambiguous_rows: number;
  warning_rows: number;
}

export const dataQualityService = {
  getReports: () => apiRequest<DataQualityReport[]>('/api/data-quality'),
};