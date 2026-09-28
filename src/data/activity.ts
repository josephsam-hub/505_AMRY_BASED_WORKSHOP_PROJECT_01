import type { ActivityLog, Notification } from '../models';

export const activityLogs: ActivityLog[] = [
  { id: 'AL-001', tankId: 'T-636', processId: 'P26', action: 'Road trial commenced', performedBy: 'Gang K', timestamp: '2024-07-07T08:30:00', details: 'Road trial started. Distance target: 50 km.' },
  { id: 'AL-002', tankId: 'T-623', processId: 'P28', action: 'Final fitment started', performedBy: 'Gang K', timestamp: '2024-07-06T09:00:00', details: 'Final fitment commenced after road trial completion.' },
  { id: 'AL-003', tankId: 'T-642', processId: 'P24', action: 'Armament static test FAILED', performedBy: 'Insp. Kapoor', timestamp: '2024-07-01T14:00:00', details: 'Elevation mechanism binding. Defect D-042 raised.' },
  { id: 'AL-004', tankId: 'T-640', processId: 'P25', action: 'Integration inspection rescheduled', performedBy: 'Insp. Verma', timestamp: '2024-07-02T10:00:00', details: 'Rescheduled to 10 Jul due to QC officer unavailability.' },
  { id: 'AL-005', tankId: 'T-651', processId: 'P02', action: 'Production halted — critical defect', performedBy: 'Workshop OC', timestamp: '2024-07-05T11:00:00', details: 'Hull torsion bar bracket cracked. Spare part requisitioned. Defect D-051 raised.' },
  { id: 'AL-006', tankId: 'T-646', processId: 'P16', action: 'Manpower shortage reported', performedBy: 'Gang F Supervisor', timestamp: '2024-07-03T08:00:00', details: '4 personnel held for other duties. Hull assembly delayed.' },
  { id: 'AL-007', tankId: 'T-643', processId: 'P20', action: 'Electrical fitment commenced', performedBy: 'Gang H', timestamp: '2024-07-04T09:00:00', details: 'Electrical and communication fitment started.' },
  { id: 'AL-008', tankId: 'T-641', processId: 'P22', action: 'System integration commenced', performedBy: 'Gang J', timestamp: '2024-07-05T09:00:00', details: 'System integration started.' },
];

export const notifications: Notification[] = [
  { id: 'N-001', type: 'alert', title: 'Critical Defect — T-651', message: 'Hull torsion bar bracket cracked. Production halted. Spare part on order.', tankId: 'T-651', createdAt: '2024-07-05T11:00:00', read: false },
  { id: 'N-002', type: 'alert', title: 'Armament Test Failed — T-642', message: 'Static test failure on armament elevation. Defect D-042 raised.', tankId: 'T-642', processId: 'P24', createdAt: '2024-07-01T14:00:00', read: false },
  { id: 'N-003', type: 'warning', title: 'Inspection Delayed — T-640', message: 'Integration inspection rescheduled to 10 Jul. 8-day delay accumulating.', tankId: 'T-640', processId: 'P25', createdAt: '2024-07-02T10:00:00', read: false },
  { id: 'N-004', type: 'warning', title: 'Manpower Shortage — Gang F', message: 'Gang F at 60% strength. T-646 hull assembly delayed 14 days.', tankId: 'T-646', createdAt: '2024-07-03T08:00:00', read: true },
  { id: 'N-005', type: 'warning', title: 'Spares Awaited — T-644', message: 'Communication fitment delayed. Radio set mounting bracket spares on order.', tankId: 'T-644', createdAt: '2024-07-02T12:00:00', read: true },
  { id: 'N-006', type: 'info', title: 'Road Trial Started — T-636', message: 'T-636 road trial commenced. 50 km target.', tankId: 'T-636', processId: 'P26', createdAt: '2024-07-07T08:30:00', read: true },
  { id: 'N-007', type: 'success', title: 'T-620 Dispatched', message: 'Tank 620 successfully handed over and dispatched.', tankId: 'T-620', createdAt: '2024-06-28T16:00:00', read: true },
];

export const getActivityLogsByTank = (tankId: string): ActivityLog[] =>
  activityLogs.filter((a) => a.tankId === tankId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export const getUnreadNotifications = (): Notification[] =>
  notifications.filter((n) => !n.read);
