import type { Stage } from '../models';

// Source: Production document — 6 major stages, 144-day schedule
export const stages: Stage[] = [
  {
    id: 'S1',
    number: 1,
    name: 'Stripping, Washing & Degreasing',
    shortName: 'Stripping',
    activities: [
      'Stripping of all assemblies',
      'Washing of hull and components',
      'Degreasing',
      'Initial inspection',
      'Defect identification',
    ],
    plannedDurationDays: 18,
    color: 'text-purple-400',
  },
  {
    id: 'S2',
    number: 2,
    name: 'Reclamation & Painting',
    shortName: 'Reclamation',
    activities: [
      'Hull reclamation',
      'Component reclamation',
      'Shot blasting',
      'Primer application',
      'Painting',
      'Reclamation inspection',
    ],
    plannedDurationDays: 28,
    color: 'text-blue-400',
  },
  {
    id: 'S3',
    number: 3,
    name: 'Assembly',
    shortName: 'Assembly',
    activities: [
      'Engine assembly',
      'Transmission assembly',
      'Suspension assembly',
      'Hull assembly',
      'Running gear assembly',
      'Assembly inspection',
    ],
    plannedDurationDays: 35,
    color: 'text-cyan-400',
  },
  {
    id: 'S4',
    number: 4,
    name: 'Semi-Final Assembly & Fitment',
    shortName: 'Semi-Final',
    activities: [
      'Turret fitment',
      'Armament fitment',
      'Electrical fitment',
      'Communication fitment',
      'Semi-final inspection',
    ],
    plannedDurationDays: 28,
    color: 'text-amber-400',
  },
  {
    id: 'S5',
    number: 5,
    name: 'Integration & Static Testing',
    shortName: 'Integration',
    activities: [
      'System integration',
      'Static testing',
      'Electrical testing',
      'Armament testing',
      'Integration inspection',
    ],
    plannedDurationDays: 21,
    color: 'text-orange-400',
  },
  {
    id: 'S6',
    number: 6,
    name: 'Road Trial, Final Fitment, JRI & Handover',
    shortName: 'Road Trial & Handover',
    activities: [
      'Road trial',
      'Final fitment',
      'Joint Receiving Inspection (JRI)',
      'Defect rectification post-JRI',
      'Handover',
      'Dispatch',
    ],
    plannedDurationDays: 14,
    color: 'text-green-400',
  },
];

export const getStageById = (id: string): Stage | undefined =>
  stages.find((s) => s.id === id);

export const getStageByNumber = (n: number): Stage | undefined =>
  stages.find((s) => s.number === n);
