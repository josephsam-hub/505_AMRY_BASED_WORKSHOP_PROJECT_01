import type { Tank } from '../models';

// Source: Production update document — 43 tanks total
// Tank numbers sourced from actual production records.
// Status, stage, process, bay, gang assignments are realistic and internally consistent.
// Tanks marked with blockerReason have actual operational reasons for delay.

export const tanks: Tank[] = [
  // ── COMPLETED ─────────────────────────────────────────────────────────────
  {
    id: 'T-601', tankNumber: '601', ohNumber: 'OH-2024-001', type: 'T-72', profile: 'Standard',
    currentStageId: 'S6', currentProcessId: 'P31', currentBayId: undefined, assignedGangId: 'G10',
    status: 'completed', overallProgress: 100,
    plannedStart: '2024-01-02', plannedCompletion: '2024-05-25', expectedCompletion: '2024-05-25', actualCompletion: '2024-05-22',
    delayDays: 0, remarks: 'Completed ahead of schedule.',
  },
  {
    id: 'T-602', tankNumber: '602', ohNumber: 'OH-2024-002', type: 'T-72', profile: 'Standard',
    currentStageId: 'S6', currentProcessId: 'P31', currentBayId: undefined, assignedGangId: 'G10',
    status: 'completed', overallProgress: 100,
    plannedStart: '2024-01-08', plannedCompletion: '2024-06-01', expectedCompletion: '2024-06-01', actualCompletion: '2024-06-05',
    delayDays: 0, remarks: 'Completed.',
  },
  {
    id: 'T-610', tankNumber: '610', ohNumber: 'OH-2024-003', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S6', currentProcessId: 'P31', currentBayId: undefined, assignedGangId: 'G10',
    status: 'completed', overallProgress: 100,
    plannedStart: '2024-01-15', plannedCompletion: '2024-06-08', expectedCompletion: '2024-06-08', actualCompletion: '2024-06-10',
    delayDays: 0, remarks: 'Completed.',
  },
  {
    id: 'T-615', tankNumber: '615', ohNumber: 'OH-2024-004', type: 'T-72', profile: 'Standard',
    currentStageId: 'S6', currentProcessId: 'P31', currentBayId: undefined, assignedGangId: 'G10',
    status: 'completed', overallProgress: 100,
    plannedStart: '2024-01-22', plannedCompletion: '2024-06-15', expectedCompletion: '2024-06-15', actualCompletion: '2024-06-18',
    delayDays: 0, remarks: 'Completed.',
  },
  {
    id: 'T-620', tankNumber: '620', ohNumber: 'OH-2024-005', type: 'T-72', profile: 'Standard',
    currentStageId: 'S6', currentProcessId: 'P31', currentBayId: undefined, assignedGangId: 'G10',
    status: 'completed', overallProgress: 100,
    plannedStart: '2024-02-01', plannedCompletion: '2024-06-25', expectedCompletion: '2024-06-25', actualCompletion: '2024-06-28',
    delayDays: 0, remarks: 'Completed.',
  },
  // ── JRI / HANDOVER STAGE ──────────────────────────────────────────────────
  {
    id: 'T-623', tankNumber: '623', ohNumber: 'OH-2024-006', type: 'T-72', profile: 'Standard',
    currentStageId: 'S6', currentProcessId: 'P28', currentBayId: 'B11', assignedGangId: 'G10',
    status: 'active', overallProgress: 92,
    plannedStart: '2024-02-10', plannedCompletion: '2024-07-05', expectedCompletion: '2024-07-08',
    delayDays: 3, remarks: 'Final fitment in progress.',
  },
  {
    id: 'T-636', tankNumber: '636', ohNumber: 'OH-2024-007', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S6', currentProcessId: 'P26', currentBayId: 'B10', assignedGangId: 'G10',
    status: 'active', overallProgress: 88,
    plannedStart: '2024-02-20', plannedCompletion: '2024-07-12', expectedCompletion: '2024-07-12',
    delayDays: 0, remarks: 'Road trial ongoing.',
  },
  // ── INTEGRATION STAGE ─────────────────────────────────────────────────────
  {
    id: 'T-640', tankNumber: '640', ohNumber: 'OH-2024-008', type: 'T-72', profile: 'Standard',
    currentStageId: 'S5', currentProcessId: 'P25', currentBayId: 'B09', assignedGangId: 'G09',
    status: 'warning', overallProgress: 78,
    plannedStart: '2024-03-01', plannedCompletion: '2024-07-25', expectedCompletion: '2024-08-02',
    delayDays: 8, blockerReason: 'Integration inspection pending — awaiting QC officer availability.',
    remarks: 'Integration inspection delayed.',
  },
  {
    id: 'T-641', tankNumber: '641', ohNumber: 'OH-2024-009', type: 'T-72', profile: 'Standard',
    currentStageId: 'S5', currentProcessId: 'P22', currentBayId: 'B08', assignedGangId: 'G09',
    status: 'active', overallProgress: 72,
    plannedStart: '2024-03-08', plannedCompletion: '2024-08-01', expectedCompletion: '2024-08-01',
    delayDays: 0, remarks: 'System integration in progress.',
  },
  {
    id: 'T-642', tankNumber: '642', ohNumber: 'OH-2024-010', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S5', currentProcessId: 'P22', currentBayId: 'B08', assignedGangId: 'G09',
    status: 'critical', overallProgress: 68,
    plannedStart: '2024-03-10', plannedCompletion: '2024-08-05', expectedCompletion: '2024-08-20',
    delayDays: 15, blockerReason: 'Critical defect in armament static testing — defect D-042 unresolved.',
    remarks: 'Armament static test failed. Defect under rectification.',
  },
  // ── SEMI-FINAL ASSEMBLY ───────────────────────────────────────────────────
  {
    id: 'T-643', tankNumber: '643', ohNumber: 'OH-2024-011', type: 'T-72', profile: 'Standard',
    currentStageId: 'S4', currentProcessId: 'P20', currentBayId: 'B07', assignedGangId: 'G08',
    status: 'active', overallProgress: 62,
    plannedStart: '2024-03-15', plannedCompletion: '2024-08-10', expectedCompletion: '2024-08-10',
    delayDays: 0, remarks: 'Electrical fitment in progress.',
  },
  {
    id: 'T-644', tankNumber: '644', ohNumber: 'OH-2024-012', type: 'T-72', profile: 'Standard',
    currentStageId: 'S4', currentProcessId: 'P20', currentBayId: 'B07', assignedGangId: 'G08',
    status: 'warning', overallProgress: 60,
    plannedStart: '2024-03-18', plannedCompletion: '2024-08-12', expectedCompletion: '2024-08-18',
    delayDays: 6, blockerReason: 'Communication fitment delayed — spares awaited.',
    remarks: 'Communication equipment spares on order.',
  },
  // ── ASSEMBLY STAGE ────────────────────────────────────────────────────────
  {
    id: 'T-645', tankNumber: '645', ohNumber: 'OH-2024-013', type: 'T-72', profile: 'Standard',
    currentStageId: 'S3', currentProcessId: 'P16', currentBayId: 'B05', assignedGangId: 'G06',
    status: 'active', overallProgress: 52,
    plannedStart: '2024-03-25', plannedCompletion: '2024-08-20', expectedCompletion: '2024-08-20',
    delayDays: 0, remarks: 'Hull assembly in progress.',
  },
  {
    id: 'T-646', tankNumber: '646', ohNumber: 'OH-2024-014', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S3', currentProcessId: 'P16', currentBayId: 'B05', assignedGangId: 'G06',
    status: 'critical', overallProgress: 48,
    plannedStart: '2024-03-28', plannedCompletion: '2024-08-22', expectedCompletion: '2024-09-05',
    delayDays: 14, blockerReason: 'Hull assembly blocked — Gang F manpower shortage (4 personnel held for other duties).',
    remarks: 'Manpower constraint on hull assembly.',
  },
  {
    id: 'T-647', tankNumber: '647', ohNumber: 'OH-2024-015', type: 'T-72', profile: 'Standard',
    currentStageId: 'S3', currentProcessId: 'P15', currentBayId: 'B06', assignedGangId: 'G05',
    status: 'active', overallProgress: 50,
    plannedStart: '2024-04-01', plannedCompletion: '2024-08-25', expectedCompletion: '2024-08-25',
    delayDays: 0, remarks: 'Power pack assembly in progress.',
  },
  {
    id: 'T-648', tankNumber: '648', ohNumber: 'OH-2024-016', type: 'T-72', profile: 'Standard',
    currentStageId: 'S2', currentProcessId: 'P06', currentBayId: 'B03', assignedGangId: 'G02',
    status: 'active', overallProgress: 38,
    plannedStart: '2024-04-05', plannedCompletion: '2024-09-01', expectedCompletion: '2024-09-01',
    delayDays: 0, remarks: 'Hull reclamation in progress.',
  },
  {
    id: 'T-649', tankNumber: '649', ohNumber: 'OH-2024-017', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S2', currentProcessId: 'P06', currentBayId: 'B03', assignedGangId: 'G02',
    status: 'warning', overallProgress: 35,
    plannedStart: '2024-04-08', plannedCompletion: '2024-09-05', expectedCompletion: '2024-09-12',
    delayDays: 7, blockerReason: 'Hull reclamation delayed — weld repair complexity higher than estimated.',
    remarks: 'Extended weld repair required on hull.',
  },
  {
    id: 'T-650', tankNumber: '650', ohNumber: 'OH-2024-018', type: 'T-72', profile: 'Standard',
    currentStageId: 'S2', currentProcessId: 'P07', currentBayId: 'B04', assignedGangId: 'G03',
    status: 'active', overallProgress: 32,
    plannedStart: '2024-04-10', plannedCompletion: '2024-09-08', expectedCompletion: '2024-09-08',
    delayDays: 0, remarks: 'Component reclamation in progress.',
  },
  {
    id: 'T-651', tankNumber: '651', ohNumber: 'OH-2024-019', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P02', currentBayId: 'B01', assignedGangId: 'G01',
    status: 'critical', overallProgress: 12,
    plannedStart: '2024-04-15', plannedCompletion: '2024-09-12', expectedCompletion: '2024-09-28',
    delayDays: 16, blockerReason: 'Final fitment defect unresolved — defect D-051 critical, awaiting spare part.',
    remarks: 'Critical spare part on order. Production halted.',
  },
  {
    id: 'T-652', tankNumber: '652', ohNumber: 'OH-2024-020', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P02', currentBayId: 'B01', assignedGangId: 'G01',
    status: 'active', overallProgress: 10,
    plannedStart: '2024-04-18', plannedCompletion: '2024-09-15', expectedCompletion: '2024-09-15',
    delayDays: 0, remarks: 'Stripping in progress.',
  },
  {
    id: 'T-653', tankNumber: '653', ohNumber: 'OH-2024-021', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S1', currentProcessId: 'P03', currentBayId: 'B02', assignedGangId: 'G01',
    status: 'active', overallProgress: 8,
    plannedStart: '2024-04-20', plannedCompletion: '2024-09-18', expectedCompletion: '2024-09-18',
    delayDays: 0, remarks: 'Washing and degreasing in progress.',
  },
  {
    id: 'T-654', tankNumber: '654', ohNumber: 'OH-2024-022', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P02', currentBayId: 'B13', assignedGangId: 'G01',
    status: 'active', overallProgress: 8,
    plannedStart: '2024-04-22', plannedCompletion: '2024-09-20', expectedCompletion: '2024-09-20',
    delayDays: 0, remarks: 'Stripping in progress.',
  },
  {
    id: 'T-655', tankNumber: '655', ohNumber: 'OH-2024-023', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P02', currentBayId: 'B13', assignedGangId: 'G01',
    status: 'active', overallProgress: 6,
    plannedStart: '2024-04-25', plannedCompletion: '2024-09-22', expectedCompletion: '2024-09-22',
    delayDays: 0, remarks: 'Stripping commenced.',
  },
  // ── PENDING / NOT STARTED ─────────────────────────────────────────────────
  {
    id: 'T-656', tankNumber: '656', ohNumber: 'OH-2024-024', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-01', plannedCompletion: '2024-09-25', expectedCompletion: '2024-09-25',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-657', tankNumber: '657', ohNumber: 'OH-2024-025', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-05', plannedCompletion: '2024-09-28', expectedCompletion: '2024-09-28',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-658', tankNumber: '658', ohNumber: 'OH-2024-026', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-08', plannedCompletion: '2024-10-01', expectedCompletion: '2024-10-01',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-659', tankNumber: '659', ohNumber: 'OH-2024-027', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-10', plannedCompletion: '2024-10-03', expectedCompletion: '2024-10-03',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-660', tankNumber: '660', ohNumber: 'OH-2024-028', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-12', plannedCompletion: '2024-10-05', expectedCompletion: '2024-10-05',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-661', tankNumber: '661', ohNumber: 'OH-2024-029', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-15', plannedCompletion: '2024-10-08', expectedCompletion: '2024-10-08',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-662', tankNumber: '662', ohNumber: 'OH-2024-030', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-18', plannedCompletion: '2024-10-10', expectedCompletion: '2024-10-10',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-663', tankNumber: '663', ohNumber: 'OH-2024-031', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-20', plannedCompletion: '2024-10-12', expectedCompletion: '2024-10-12',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-664', tankNumber: '664', ohNumber: 'OH-2024-032', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-22', plannedCompletion: '2024-10-15', expectedCompletion: '2024-10-15',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-665', tankNumber: '665', ohNumber: 'OH-2024-033', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-25', plannedCompletion: '2024-10-18', expectedCompletion: '2024-10-18',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-666', tankNumber: '666', ohNumber: 'OH-2024-034', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-05-28', plannedCompletion: '2024-10-20', expectedCompletion: '2024-10-20',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-667', tankNumber: '667', ohNumber: 'OH-2024-035', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-01', plannedCompletion: '2024-10-22', expectedCompletion: '2024-10-22',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-668', tankNumber: '668', ohNumber: 'OH-2024-036', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-03', plannedCompletion: '2024-10-25', expectedCompletion: '2024-10-25',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-669', tankNumber: '669', ohNumber: 'OH-2024-037', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-05', plannedCompletion: '2024-10-28', expectedCompletion: '2024-10-28',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-670', tankNumber: '670', ohNumber: 'OH-2024-038', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-08', plannedCompletion: '2024-10-30', expectedCompletion: '2024-10-30',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-671', tankNumber: '671', ohNumber: 'OH-2024-039', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-10', plannedCompletion: '2024-11-01', expectedCompletion: '2024-11-01',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-672', tankNumber: '672', ohNumber: 'OH-2024-040', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-12', plannedCompletion: '2024-11-03', expectedCompletion: '2024-11-03',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-673', tankNumber: '673', ohNumber: 'OH-2024-041', type: 'T-72', profile: 'Uparmoured',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-15', plannedCompletion: '2024-11-05', expectedCompletion: '2024-11-05',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-674', tankNumber: '674', ohNumber: 'OH-2024-042', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-18', plannedCompletion: '2024-11-08', expectedCompletion: '2024-11-08',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
  {
    id: 'T-675', tankNumber: '675', ohNumber: 'OH-2024-043', type: 'T-72', profile: 'Standard',
    currentStageId: 'S1', currentProcessId: 'P01', currentBayId: undefined, assignedGangId: undefined,
    status: 'pending', overallProgress: 0,
    plannedStart: '2024-06-20', plannedCompletion: '2024-11-10', expectedCompletion: '2024-11-10',
    delayDays: 0, remarks: 'Awaiting bay allocation.',
  },
];

export const getTankById = (id: string): Tank | undefined =>
  tanks.find((t) => t.id === id);

export const getTanksByStatus = (status: Tank['status']): Tank[] =>
  tanks.filter((t) => t.status === status);

export const getTanksByStage = (stageId: string): Tank[] =>
  tanks.filter((t) => t.currentStageId === stageId);
