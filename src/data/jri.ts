import type { JRIRecord } from '../models';

export const jriRecords: JRIRecord[] = [
  {
    id: 'JRI-001', tankId: 'T-601',
    scheduledDate: '2024-05-20', conductedDate: '2024-05-20',
    status: 'completed',
    boardMembers: ['Col. Mehta', 'Lt Col. Rao', 'Maj. Singh'],
    remarks: 'All parameters met. Tank cleared for handover.',
    handoverDate: '2024-05-22', dispatchDate: '2024-05-22',
  },
  {
    id: 'JRI-002', tankId: 'T-602',
    scheduledDate: '2024-06-02', conductedDate: '2024-06-03',
    status: 'completed',
    boardMembers: ['Col. Mehta', 'Lt Col. Rao', 'Maj. Singh'],
    remarks: 'Cleared. Minor remarks addressed.',
    handoverDate: '2024-06-05', dispatchDate: '2024-06-05',
  },
  {
    id: 'JRI-003', tankId: 'T-610',
    scheduledDate: '2024-06-06', conductedDate: '2024-06-07',
    status: 'completed',
    boardMembers: ['Col. Mehta', 'Lt Col. Rao'],
    remarks: 'Cleared.',
    handoverDate: '2024-06-10', dispatchDate: '2024-06-10',
  },
  {
    id: 'JRI-004', tankId: 'T-615',
    scheduledDate: '2024-06-14', conductedDate: '2024-06-14',
    status: 'completed',
    boardMembers: ['Col. Mehta', 'Lt Col. Rao', 'Maj. Singh'],
    remarks: 'Cleared.',
    handoverDate: '2024-06-18', dispatchDate: '2024-06-18',
  },
  {
    id: 'JRI-005', tankId: 'T-620',
    scheduledDate: '2024-06-24', conductedDate: '2024-06-25',
    status: 'completed',
    boardMembers: ['Col. Mehta', 'Lt Col. Rao'],
    remarks: 'Cleared.',
    handoverDate: '2024-06-28', dispatchDate: '2024-06-28',
  },
  {
    id: 'JRI-006', tankId: 'T-623',
    scheduledDate: '2024-07-12',
    status: 'scheduled',
    boardMembers: ['Col. Mehta', 'Lt Col. Rao', 'Maj. Singh'],
    remarks: 'Scheduled pending final fitment completion and defect D-033 resolution.',
  },
  {
    id: 'JRI-007', tankId: 'T-636',
    scheduledDate: '2024-07-15',
    status: 'pending',
    remarks: 'Pending road trial completion.',
  },
];

export const getJRIByTank = (tankId: string): JRIRecord | undefined =>
  jriRecords.find((j) => j.tankId === tankId);

export const getJRIByStatus = (status: JRIRecord['status']): JRIRecord[] =>
  jriRecords.filter((j) => j.status === status);
