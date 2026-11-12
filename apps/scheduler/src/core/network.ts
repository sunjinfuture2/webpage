import type { Dependency, Plan, ScheduleResult } from './types';
import { routeNetwork, type NetworkNode, type NetworkRoute } from './network-routing';
export { NETWORK_NODE_HEIGHT, NETWORK_NODE_WIDTH } from './network-routing';
export type { NetworkNode } from './network-routing';

export interface NetworkOptions {
  focusId: string;
  depth: number;
  direction: 'both' | 'before' | 'after';
  all: boolean;
  includeInactive: boolean;
  limit?: number;
}
export interface NetworkLayout {
  nodes: NetworkNode[];
  edges: Dependency[];
  routes: NetworkRoute[];
  crossingsBefore: number;
  crossingsAfter: number;
  width: number;
  height: number;
  relevantTotal: number;
  omittedNodes: number;
  hiddenEdges: number;
  totalEdges: number;
}

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
    // Keep the nearest connected context when the full graph exceeds the
    // display limit. This is undirected proximity, not an impact path.
    const queue = focusId ? [focusId] : [];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i], nextDistance = distance.get(id)! + 1;
      for (const next of [...before.get(id)!, ...after.get(id)!]) if (!distance.has(next)) {
        distance.set(next, nextDistance); queue.push(next);
      }
    }
    for (const t of plan.tasks) if (!distance.has(t.id)) distance.set(t.id, plan.tasks.length + 1);
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
  const edges = links.filter(e => visible.has(e.from) && visible.has(e.to)).sort((a, b) =>
    Number(b.from === focusId || b.to === focusId) - Number(a.from === focusId || a.to === focusId) || Number(b.active) - Number(a.active) || a.id.localeCompare(b.id)).slice(0, 600);
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
  const routed = routeNetwork(displayed, edges, level, distance);
  const touching = links.filter(e => distance.has(e.from) || distance.has(e.to));
  return { ...routed, edges,
    relevantTotal: relevant.length, omittedNodes: relevant.length - displayed.length,
    hiddenEdges: touching.length - edges.length, totalEdges: links.length };
}
