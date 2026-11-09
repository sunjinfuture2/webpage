import type { Dependency, LinkType } from '../core/types';

export type RelationScope = 'all' | 'upstream' | 'downstream' | 'critical';
export function dependencyEndpoints(type: LinkType) {
  return { from: type === 'FS' || type === 'FF' ? 'finish' : 'start', to: type === 'FF' || type === 'SF' ? 'finish' : 'start' } as const;
}
export function scopedDependencies(dependencies: Dependency[], selectedId: string | null, scope: RelationScope, critical: Set<string>): Dependency[] {
  const active = dependencies.filter(e => e.active);
  if (scope === 'critical') return active.filter(e => critical.has(e.from) && critical.has(e.to));
  if (scope === 'all' || !selectedId) return active;
  const adjacency = new Map<string, Dependency[]>();
  for (const e of active) {
    const key = scope === 'upstream' ? e.to : e.from;
    if (!adjacency.has(key)) adjacency.set(key, []);
    adjacency.get(key)!.push(e);
  }
  const visited = new Set([selectedId]), edges = new Set<string>(), queue = [selectedId];
  for (let cursor = 0; cursor < queue.length; cursor++) for (const e of adjacency.get(queue[cursor]) || []) {
    edges.add(e.id);
    const next = scope === 'upstream' ? e.from : e.to;
    if (!visited.has(next)) { visited.add(next); queue.push(next); }
  }
  return active.filter(e => edges.has(e.id));
}

/** Both ends are the actual visible bar endpoints. Finish ports include the inclusive final day. */
export function connectorPath(x1: number, y1: number, x2: number, y2: number, type: LinkType): string {
  const ends = dependencyEndpoints(type), a = ends.from === 'finish' ? 1 : -1, b = ends.to === 'finish' ? 1 : -1;
  const stub = 12, sx = x1 + a * stub, tx = x2 + b * stub;
  let points: number[][];
  if (a === 1 && b === -1 && tx >= sx || a === -1 && b === 1 && tx <= sx) {
    const middle = (sx + tx) / 2;
    points = [[x1, y1], [middle, y1], [middle, y2], [x2, y2]];
  } else if (a === b) {
    const side = a > 0 ? Math.max(sx, tx) + 6 : Math.min(sx, tx) - 6;
    points = [[x1, y1], [side, y1], [side, y2], [x2, y2]];
  } else {
    const bendY = y1 + (y2 >= y1 ? 19 : -19);
    points = [[x1, y1], [sx, y1], [sx, bendY], [tx, bendY], [tx, y2], [x2, y2]];
  }
  let path = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1], p = points[i], after = points[i + 1];
    const r = Math.min(4, Math.abs(p[0] - before[0]) + Math.abs(p[1] - before[1]), Math.abs(after[0] - p[0]) + Math.abs(after[1] - p[1])) / 2;
    const entry = [p[0] - Math.sign(p[0] - before[0]) * r, p[1] - Math.sign(p[1] - before[1]) * r];
    const leave = [p[0] + Math.sign(after[0] - p[0]) * r, p[1] + Math.sign(after[1] - p[1]) * r];
    path += ` L${entry[0]},${entry[1]} Q${p[0]},${p[1]} ${leave[0]},${leave[1]}`;
  }
  const last = points.at(-1)!;
  return path + ` L${last[0]},${last[1]}`;
}
