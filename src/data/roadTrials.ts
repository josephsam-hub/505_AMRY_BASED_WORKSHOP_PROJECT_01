import type { RoadTrial } from '../models';

export const roadTrials: RoadTrial[] = [
  {
    id: 'RT-001', tankId: 'T-601',
    scheduledDate: '2024-05-18', conductedDate: '2024-05-18',
    status: 'completed', distance: 52,
    result: 'All systems nominal. Engine, transmission, suspension performed within spec.',
    remarks: 'Passed first attempt.',
  },
  {
    id: 'RT-002', tankId: 'T-602',
    scheduledDate: '2024-05-28', conductedDate: '2024-05-30',
    status: 'completed', distance: 50,
    result: 'Passed. Minor oil seepage noted and rectified before final fitment.',
    remarks: 'Passed after minor rectification.',
  },
  {
    id: 'RT-003', tankId: 'T-610',
    scheduledDate: '2024-06-03', conductedDate: '2024-06-03',
    status: 'completed', distance: 55,
    result: 'All systems nominal.',
    remarks: 'Passed first attempt.',
  },
  {
    id: 'RT-004', tankId: 'T-615',
    scheduledDate: '2024-06-10', conductedDate: '2024-06-10',
    status: 'completed', distance: 50,
    result: 'Passed.',
    remarks: 'Passed first attempt.',
  },
  {
    id: 'RT-005', tankId: 'T-620',
    scheduledDate: '2024-06-20', conductedDate: '2024-06-20',
    status: 'completed', distance: 50,
    result: 'Passed.',
    remarks: 'Passed first attempt.',
  },
  {
    id: 'RT-006', tankId: 'T-636',
    scheduledDate: '2024-07-07', conductedDate: '2024-07-07',
    status: 'completed', distance: 28,
    result: 'Trial in progress — 28 km completed of 50 km target.',
    remarks: 'Road trial ongoing. Expected completion 09 Jul.',
  },
  {
    id: 'RT-007', tankId: 'T-623',
    scheduledDate: '2024-06-30', conductedDate: '2024-07-01',
    status: 'completed', distance: 50,
    result: 'Passed. Minor engine oil seepage detected — defect D-033 raised.',
    defectsFound: ['D-033'],
    remarks: 'Passed with minor defect. Defect under rectification.',
  },
  {
    id: 'RT-008', tankId: 'T-640',
    scheduledDate: '2024-08-05',
    status: 'scheduled',
    remarks: 'Scheduled pending integration inspection clearance.',
  },
  {
    id: 'RT-009', tankId: 'T-641',
    scheduledDate: '2024-08-10',
    status: 'pending',
    remarks: 'Pending system integration completion.',
  },
];

export const getRoadTrialByTank = (tankId: string): RoadTrial | undefined =>
  roadTrials.find((r) => r.tankId === tankId);

export const getRoadTrialsByStatus = (status: RoadTrial['status']): RoadTrial[] =>
  roadTrials.filter((r) => r.status === status);
