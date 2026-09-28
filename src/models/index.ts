// ─── Status Types ────────────────────────────────────────────────────────────

export type TankStatus = 'completed' | 'active' | 'warning' | 'critical' | 'pending';
export type ProcessStatus = 'completed' | 'active' | 'blocked' | 'pending' | 'delayed';
export type InspectionStatus = 'passed' | 'failed' | 'pending' | 'in-progress';
export type DefectSeverity = 'critical' | 'major' | 'minor';
export type DefectStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type BayStatus = 'available' | 'occupied' | 'maintenance' | 'blocked';
export type PathType = 'CRITICAL' | 'NON_CRITICAL';

// ─── Stage ───────────────────────────────────────────────────────────────────

export interface Stage {
  id: string;
  number: number;
  name: string;                // Full operational name from source document
  shortName: string;           // Display label
  activities: string[];        // Activity names within this stage
  plannedDurationDays: number;
  color: string;               // Tailwind color class for visual grouping
}

// ─── Process ─────────────────────────────────────────────────────────────────

export interface Process {
  id: string;
  processNumber: number;       // 1–31 as per PERT
  name: string;
  stageId: string;
  durationDays: number;
  predecessors: string[];      // process ids
  successors: string[];        // process ids
  pathType: PathType;
  // PERT layout hint (column/row for dagre fallback)
  pertColumn?: number;
  pertRow?: number;
}

// ─── Tank Process (instance of a process for a specific tank) ────────────────

export interface TankProcess {
  id: string;
  tankId: string;
  processId: string;
  status: ProcessStatus;
  plannedStart: string;        // ISO date string
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  bayId?: string;
  gangId?: string;
  remarks?: string;
  blockerReason?: string;
}

// ─── Tank ─────────────────────────────────────────────────────────────────────

export interface Tank {
  id: string;                  // e.g. 'T-668'
  tankNumber: string;          // e.g. '668'
  ohNumber: string;            // Overhaul number
  type: string;                // e.g. 'T-72', 'BMP'
  profile: string;             // e.g. 'Standard', 'Uparmoured'
  currentStageId: string;
  currentProcessId: string;
  currentBayId?: string;
  assignedGangId?: string;
  status: TankStatus;
  overallProgress: number;     // 0–100
  plannedStart: string;
  plannedCompletion: string;
  expectedCompletion: string;
  actualCompletion?: string;
  delayDays: number;
  blockerReason?: string;
  remarks?: string;
}

// ─── Bay ─────────────────────────────────────────────────────────────────────

export interface Bay {
  id: string;
  number: number;
  name: string;
  capacity: number;
  currentTankIds: string[];
  currentProcessId?: string;
  status: BayStatus;
  utilization: number;         // 0–100
}

// ─── Gang / Manpower ─────────────────────────────────────────────────────────

export interface Gang {
  id: string;
  name: string;
  specialty: string;           // e.g. 'Hull Reclamation', 'Engine Assembly'
  authorized: number;
  available: number;
  deployed: number;
  held: number;
  assignedTankIds: string[];
  assignedProcessIds: string[];
}

// ─── Inspection ───────────────────────────────────────────────────────────────

export interface Inspection {
  id: string;
  tankId: string;
  processId: string;
  stageId: string;
  name: string;                // e.g. 'Stripping Inspection', 'Hull Reclamation Inspection'
  status: InspectionStatus;
  scheduledDate: string;
  completedDate?: string;
  inspector?: string;
  remarks?: string;
  failureReasons?: string[];
}

// ─── Defect ───────────────────────────────────────────────────────────────────

export interface Defect {
  id: string;
  tankId: string;
  processId: string;
  stageId: string;
  category: string;            // e.g. 'Hull', 'Engine', 'Electrical', 'Armament'
  severity: DefectSeverity;
  description: string;
  assignedTo: string;          // gang or person name
  createdDate: string;
  targetDate: string;
  status: DefectStatus;
  resolution?: string;
  remarks?: string;
}

// ─── Road Trial ───────────────────────────────────────────────────────────────

export interface RoadTrial {
  id: string;
  tankId: string;
  scheduledDate: string;
  conductedDate?: string;
  status: 'scheduled' | 'completed' | 'failed' | 'pending';
  distance?: number;           // km
  result?: string;
  defectsFound?: string[];
  remarks?: string;
}

// ─── JRI Record ───────────────────────────────────────────────────────────────

export interface JRIRecord {
  id: string;
  tankId: string;
  scheduledDate: string;
  conductedDate?: string;
  status: 'scheduled' | 'completed' | 'pending';
  boardMembers?: string[];
  remarks?: string;
  handoverDate?: string;
  dispatchDate?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  tankId?: string;
  processId?: string;
  createdAt: string;
  read: boolean;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  tankId: string;
  processId?: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface ProcessUpdate {
  id: string;
  tankId: string;
  processId: string;
  previousStatus: ProcessStatus;
  currentStatus: ProcessStatus;
  progress: number;
  updatedBy: string;
  updatedAt: string;
  remarks?: string;
  delayReason?: string;
}

// ─── Production Pulse ─────────────────────────────────────────────────────────

export interface ProductionPulse {
  overall: number;
  schedule: number;
  resources: number;
  quality: number;
  processFlow: number;
  primaryBottleneck: string;
  calculatedAt: string;
}
