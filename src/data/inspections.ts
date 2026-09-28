import type { Inspection } from '../models';

export const inspections: Inspection[] = [
  { id: 'I-001', tankId: 'T-623', processId: 'P17', stageId: 'S3', name: 'Assembly Inspection', status: 'passed', scheduledDate: '2024-06-20', completedDate: '2024-06-20', inspector: 'Insp. Sharma', remarks: 'All assembly checks passed.' },
  { id: 'I-002', tankId: 'T-623', processId: 'P21', stageId: 'S4', name: 'Semi-Final Inspection', status: 'passed', scheduledDate: '2024-06-28', completedDate: '2024-06-28', inspector: 'Insp. Sharma', remarks: 'Passed. Minor remarks on cable routing — rectified.' },
  { id: 'I-003', tankId: 'T-636', processId: 'P25', stageId: 'S5', name: 'Integration Inspection', status: 'passed', scheduledDate: '2024-07-01', completedDate: '2024-07-01', inspector: 'Insp. Verma', remarks: 'All integration checks passed.' },
  { id: 'I-004', tankId: 'T-640', processId: 'P25', stageId: 'S5', name: 'Integration Inspection', status: 'pending', scheduledDate: '2024-07-10', inspector: 'Insp. Verma', remarks: 'Rescheduled from 02 Jul due to QC officer unavailability.' },
  { id: 'I-005', tankId: 'T-641', processId: 'P17', stageId: 'S3', name: 'Assembly Inspection', status: 'passed', scheduledDate: '2024-07-02', completedDate: '2024-07-02', inspector: 'Insp. Sharma', remarks: 'Passed.' },
  { id: 'I-006', tankId: 'T-642', processId: 'P24', stageId: 'S5', name: 'Armament Static Test', status: 'failed', scheduledDate: '2024-07-01', completedDate: '2024-07-01', inspector: 'Insp. Kapoor', failureReasons: ['Elevation mechanism binding', 'Drive gear worn beyond tolerance'], remarks: 'Failed. Defect D-042 raised.' },
  { id: 'I-007', tankId: 'T-643', processId: 'P17', stageId: 'S3', name: 'Assembly Inspection', status: 'passed', scheduledDate: '2024-07-03', completedDate: '2024-07-03', inspector: 'Insp. Sharma', remarks: 'Passed.' },
  { id: 'I-008', tankId: 'T-645', processId: 'P17', stageId: 'S3', name: 'Assembly Inspection', status: 'in-progress', scheduledDate: '2024-07-08', inspector: 'Insp. Sharma', remarks: 'Inspection scheduled.' },
  { id: 'I-009', tankId: 'T-648', processId: 'P06', stageId: 'S2', name: 'Hull Reclamation Inspection', status: 'pending', scheduledDate: '2024-07-15', inspector: 'Insp. Verma', remarks: 'Pending completion of reclamation.' },
  { id: 'I-010', tankId: 'T-649', processId: 'P06', stageId: 'S2', name: 'Hull Reclamation Inspection', status: 'pending', scheduledDate: '2024-07-18', inspector: 'Insp. Verma', remarks: 'Pending weld repair completion.' },
];

export const getInspectionsByTank = (tankId: string): Inspection[] =>
  inspections.filter((i) => i.tankId === tankId);

export const getPendingInspections = (): Inspection[] =>
  inspections.filter((i) => i.status === 'pending' || i.status === 'in-progress');
