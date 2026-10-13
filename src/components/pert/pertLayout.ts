import type { Process } from '../../models';

// Node dimensions — must match the rendered ProcessNode size
export const NODE_W = 180;
export const NODE_H = 64;

// Spacing between node boundaries
const H_GAP = 120; // horizontal gap between node right edge and next node left edge
const V_GAP = 48;  // vertical gap between node bottom edge and next node top edge

// Stage lane header height
export const LANE_HEADER_H = 32;
export const LANE_PADDING_TOP = 16;
export const LANE_PADDING_BOTTOM = 24;

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  stageId: string;
}

export interface StageLane {
  stageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

const STAGE_COLORS: Record<string, string> = {
  S1: '#7C3AED',
  S2: '#2563EB',
  S3: '#0891B2',
  S4: '#D97706',
  S5: '#EA580C',
  S6: '#16A34A',
};

/**
 * Assign column slots within a stage using longest-path layering.
 * Returns a map of processId → column index (0-based within stage).
 */
function assignColumns(procs: Process[]): Map<string, number> {
  const col = new Map<string, number>();
  const ids = new Set(procs.map((p) => p.id));

  // BFS from roots
  const inDegree = new Map<string, number>();
  procs.forEach((p) => inDegree.set(p.id, 0));
  procs.forEach((p) => {
    p.successors.forEach((sid) => {
      if (ids.has(sid)) inDegree.set(sid, (inDegree.get(sid) ?? 0) + 1);
    });
  });

  const queue = procs.filter((p) => (inDegree.get(p.id) ?? 0) === 0);
  queue.forEach((p) => col.set(p.id, 0));

  const visited = new Set<string>();
  while (queue.length > 0) {
    queue.sort((a, b) => a.processNumber - b.processNumber);
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    const myCol = col.get(node.id) ?? 0;
    node.successors.forEach((sid) => {
      if (!ids.has(sid)) return;
      const existing = col.get(sid) ?? 0;
      col.set(sid, Math.max(existing, myCol + 1));
      const deg = (inDegree.get(sid) ?? 1) - 1;
      inDegree.set(sid, deg);
      if (deg === 0) {
        const succ = procs.find((p) => p.id === sid);
        if (succ) queue.push(succ);
      }
    });
  }

  // Ensure all assigned
  procs.forEach((p) => {
    if (!col.has(p.id)) col.set(p.id, 0);
  });

  return col;
}

/**
 * Main layout function.
 * Returns per-node positions and stage lane rectangles.
 */
export function computeLayout(
  processes: Process[],
  stages: Array<{ id: string; shortName: string; number: number }>
): { nodes: LayoutNode[]; lanes: StageLane[] } {
  const stageOrder = [...stages].sort((a, b) => a.number - b.number);

  const nodes: LayoutNode[] = [];
  const lanes: StageLane[] = [];

  let currentX = 0;

  stageOrder.forEach((stage) => {
    const stageProcs = processes
      .filter((p) => p.stageId === stage.id)
      .sort((a, b) => a.processNumber - b.processNumber);

    if (stageProcs.length === 0) return;

    // Assign sub-columns within stage
    const colMap = assignColumns(stageProcs);
    const maxCol = Math.max(...Array.from(colMap.values()));
    const numCols = maxCol + 1;

    // Group by column
    const byCol = new Map<number, Process[]>();
    stageProcs.forEach((p) => {
      const c = colMap.get(p.id) ?? 0;
      if (!byCol.has(c)) byCol.set(c, []);
      byCol.get(c)!.push(p);
    });

    // Sort each column by processNumber
    byCol.forEach((procs) => procs.sort((a, b) => a.processNumber - b.processNumber));

    // Max rows in any column
    const maxRows = Math.max(...Array.from(byCol.values()).map((arr) => arr.length));

    const laneContentH = maxRows * NODE_H + (maxRows - 1) * V_GAP;
    const laneH = LANE_HEADER_H + LANE_PADDING_TOP + laneContentH + LANE_PADDING_BOTTOM;
    const laneW = numCols * NODE_W + (numCols - 1) * H_GAP + 48; // 24px padding each side

    lanes.push({
      stageId: stage.id,
      x: currentX,
      y: 0,
      width: laneW,
      height: laneH,
      label: `S${stage.number} ${stage.shortName.toUpperCase()}`,
      color: STAGE_COLORS[stage.id] ?? '#4B5563',
    });

    // Position nodes within lane
    byCol.forEach((procs, colIdx) => {
      const nodeX = currentX + 24 + colIdx * (NODE_W + H_GAP);
      procs.forEach((p, rowIdx) => {
        const nodeY = LANE_HEADER_H + LANE_PADDING_TOP + rowIdx * (NODE_H + V_GAP);
        nodes.push({ id: p.id, x: nodeX, y: nodeY, stageId: stage.id });
      });
    });

    currentX += laneW + 8; // 8px gap between lanes
  });

  return { nodes, lanes };
}

/**
 * Dev-only: detect overlapping node rectangles.
 * Returns array of overlap descriptions.
 */
export function detectOverlaps(nodes: LayoutNode[]): string[] {
  const overlaps: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const aRight = a.x + NODE_W;
      const aBottom = a.y + NODE_H;
      const bRight = b.x + NODE_W;
      const bBottom = b.y + NODE_H;
      if (aRight > b.x && a.x < bRight && aBottom > b.y && a.y < bBottom) {
        overlaps.push(`OVERLAP: ${a.id} ↔ ${b.id}`);
      }
    }
  }
  return overlaps;
}
