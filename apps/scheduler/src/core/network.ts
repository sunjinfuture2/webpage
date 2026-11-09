import type { Dependency, Plan, ScheduleResult, Task } from './types';

export interface NetworkOptions {
  focusId: string;
  depth: number;
  direction: 'both' | 'before' | 'after';
  all: boolean;
  includeInactive: boolean;
  limit?: number;
}
export interface NetworkNode { task: Task; x: number; y: number; level: number; distance: number }
export interface NetworkLayout {
  nodes: NetworkNode[];
  edges: Dependency[];
  width: number;
  height: number;
  relevantTotal: number;
  omittedNodes: number;
  hiddenEdges: number;
  totalEdges: number;
}
export const NETWORK_NODE_WIDTH = 236, NETWORK_NODE_HEIGHT = 118;
const COLUMN = 318, ROW = 162, PAD = 56;

/** A bounded rendering projection. It never drops or rewrites plan relationships. */
export function buildNetworkLayout(plan: Plan, result: ScheduleResult, options: NetworkOptions): NetworkLayout {
  const byId = new Map(plan.tasks.map(t => [t.id, t]));
  const links = plan.dependencies.filter(e => (e.active || options.includeInactive) && byId.has(e.from) && byId.has(e.to));
  const before = new Map<string, string[]>(), after = new Map<string, string[]>();
  for (const t of plan.tasks) { before.set(t.id, []); after.set(t.id, []); }
  for (const e of links) { before.get(e.to)!.push(e.from); after.get(e.from)!.push(e.to); }
  const focusId = byId.has(options.focusId) ? options.focusId : plan.tasks[0]?.id;
  const distance = new Map<string, number>();
  if (focusId) distance.set(focusId, 0);
  if (options.all) {
    for (const t of plan.tasks) if (!distance.has(t.id)) distance.set(t.id, 1);
  } else {
    // Traverse upstream and downstream independently. An upstream task's other
    // successors are siblings, not downstream effects of the focused task.
    const walk = (adjacency: Map<string, string[]>) => {
      const seen = new Map<string, number>(), queue = focusId ? [focusId] : [];
      if (focusId) seen.set(focusId, 0);
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i], depth = seen.get(id)!;
        if (depth >= options.depth) continue;
        for (const next of adjacency.get(id)!) if (!seen.has(next)) {
          seen.set(next, depth + 1); queue.push(next);
          distance.set(next, Math.min(distance.get(next) ?? Infinity, depth + 1));
        }
      }
    };
    if (options.direction !== 'after') walk(before);
    if (options.direction !== 'before') walk(after);
  }
  const relevant = plan.tasks.filter(t => distance.has(t.id)).sort((a, b) =>
    distance.get(a.id)! - distance.get(b.id)! ||
    Number(result.tasks[b.id]?.criticality === 'critical') - Number(result.tasks[a.id]?.criticality === 'critical') ||
    a.order - b.order || a.id.localeCompare(b.id));
  const displayed = relevant.slice(0, Math.max(1, options.limit ?? 120));
  const visible = new Set(displayed.map(t => t.id));
  const edges = links.filter(e => visible.has(e.from) && visible.has(e.to));
  // Conditional links remain visible but cannot change active graph ordering.
  const incoming = new Map(displayed.map(t => [t.id, 0]));
  const outgoing = new Map(displayed.map(t => [t.id, [] as string[]]));
  for (const e of edges) if (e.active) { incoming.set(e.to, incoming.get(e.to)! + 1); outgoing.get(e.from)!.push(e.to); }
  const queue = displayed.filter(t => incoming.get(t.id) === 0).map(t => t.id);
  const level = new Map(displayed.map(t => [t.id, 0]));
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const next of outgoing.get(id)!) {
      level.set(next, Math.max(level.get(next)!, level.get(id)! + 1));
      incoming.set(next, incoming.get(next)! - 1);
      if (incoming.get(next) === 0) queue.push(next);
    }
  }
  const columns = new Map<number, Task[]>();
  for (const task of displayed) {
    const l = level.get(task.id)!;
    if (!columns.has(l)) columns.set(l, []);
    columns.get(l)!.push(task);
  }
  const maxRows = Math.max(1, ...[...columns.values()].map(c => c.length));
  const nodes: NetworkNode[] = [];
  for (const [l, column] of columns) {
    column.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const top = PAD + (maxRows - column.length) * ROW / 2;
    column.forEach((task, i) => nodes.push({ task, x: PAD + l * COLUMN, y: top + i * ROW, level: l, distance: distance.get(task.id)! }));
  }
  const maxLevel = Math.max(0, ...level.values());
  const touching = links.filter(e => distance.has(e.from) || distance.has(e.to));
  return { nodes, edges, width: PAD * 2 + maxLevel * COLUMN + NETWORK_NODE_WIDTH,
    height: PAD * 2 + (maxRows - 1) * ROW + NETWORK_NODE_HEIGHT,
    relevantTotal: relevant.length, omittedNodes: relevant.length - displayed.length,
    hiddenEdges: touching.length - edges.length, totalEdges: links.length };
}
