import type { Dependency, Task } from './types';

export const NETWORK_NODE_WIDTH = 236, NETWORK_NODE_HEIGHT = 118;
const ROW = 178, LANE = 10, VIRTUAL_BUDGET = 3500;
export interface NetworkNode { task: Task; x: number; y: number; level: number; distance: number }
export interface Point { x: number; y: number }
export interface NetworkRoute { edgeId: string; points: Point[]; path: string; labelX: number; labelY: number; outside: boolean }
interface Vertex { id: string; level: number; task?: Task; y: number }
interface Segment { edgeId: string; from: string; to: string; level: number; lane: number; sy: number; ty: number }

function crossings(layers: string[][], segments: Segment[]) {
  const order = new Map(layers.flatMap(layer => layer.map((id, i) => [id, i] as const)));
  let total = 0;
  for (let rank = 0; rank < layers.length - 1; rank++) {
    const edges = segments.filter(s => s.level === rank).sort((a, b) => order.get(a.from)! - order.get(b.from)!);
    const tree = new Array(layers[rank + 1].length + 2).fill(0);
    const sum = (index: number) => { let value = 0; for (let i = index; i > 0; i -= i & -i) value += tree[i]; return value; };
    let inserted = 0;
    for (let i = 0; i < edges.length;) {
      let end = i + 1;
      while (end < edges.length && edges[end].from === edges[i].from) end++;
      for (let j = i; j < end; j++) total += inserted - sum(order.get(edges[j].to)! + 1);
      for (let j = i; j < end; j++) { for (let k = order.get(edges[j].to)! + 1; k < tree.length; k += k & -k) tree[k]++; inserted++; }
      i = end;
    }
  }
  return total;
}

function reduceCrossings(layers: string[][], segments: Segment[]) {
  const incoming = new Map<string, string[]>(), outgoing = new Map<string, string[]>();
  for (const s of segments) {
    if (!incoming.has(s.to)) incoming.set(s.to, []);
    if (!outgoing.has(s.from)) outgoing.set(s.from, []);
    incoming.get(s.to)!.push(s.from); outgoing.get(s.from)!.push(s.to);
  }
  const before = crossings(layers, segments);
  let best = layers.map(l => [...l]), score = before;
  for (let sweep = 0; sweep < 8; sweep++) {
    const forward = sweep % 2 === 0, adjacent = forward ? incoming : outgoing;
    for (let k = 0; k < layers.length; k++) {
      const rank = forward ? k : layers.length - 1 - k, neighbor = layers[rank + (forward ? -1 : 1)];
      if (!neighbor) continue;
      const positions = new Map(neighbor.map((id, i) => [id, i / Math.max(1, neighbor.length - 1)]));
      const old = new Map(layers[rank].map((id, i) => [id, i]));
      const barycenter = (id: string) => {
        const values = (adjacent.get(id) || []).flatMap(n => positions.has(n) ? [positions.get(n)!] : []);
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : old.get(id)! / Math.max(1, layers[rank].length - 1);
      };
      const centers = new Map(layers[rank].map(id => [id, barycenter(id)]));
      layers[rank].sort((a, b) => centers.get(a)! - centers.get(b)! || old.get(a)! - old.get(b)!);
    }
    const next = crossings(layers, segments);
    if (next < score) { best = layers.map(l => [...l]); score = next; }
  }
  return { layers: best, before, after: score };
}

function cleanPoints(points: Point[]) {
  const result: Point[] = [];
  for (const p of points) {
    const last = result.at(-1), prev = result.at(-2);
    if (last && last.x === p.x && last.y === p.y) continue;
    if (prev && last && (prev.x === last.x && last.x === p.x || prev.y === last.y && last.y === p.y)) result.pop();
    result.push(p);
  }
  return result;
}

export function roundedRoute(points: Point[]) {
  if (!points.length) return '';
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const r = Math.min(5, (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / 2, (Math.abs(c.x - b.x) + Math.abs(c.y - b.y)) / 2);
    path += ` L${b.x - Math.sign(b.x - a.x) * r},${b.y - Math.sign(b.y - a.y) * r} Q${b.x},${b.y} ${b.x + Math.sign(c.x - b.x) * r},${b.y + Math.sign(c.y - b.y) * r}`;
  }
  const last = points.at(-1)!;
  return path + ` L${last.x},${last.y}`;
}

/** Layered graph routing. All card edges show predecessor→successor flow;
 * FS/SS/FF/SF remain explicit relation metadata, not card-side coordinates.
 * Virtual slots reserve empty passage through intervening columns.
 */
export function routeNetwork(tasks: Task[], edges: Dependency[], level: Map<string, number>, distance: Map<string, number>) {
  const maxLevel = Math.max(0, ...level.values());
  const layers = Array.from({ length: maxLevel + 1 }, () => [] as string[]);
  const vertices = new Map<string, Vertex>();
  const key = (id: string) => 'task:' + id;
  for (const task of [...tasks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
    const id = key(task.id), rank = level.get(task.id)!;
    vertices.set(id, { id, level: rank, task, y: 0 }); layers[rank].push(id);
  }
  const segments: Segment[] = [], outside: Dependency[] = [];
  const chains = new Map<string, string[]>();
  let virtualCount = 0;
  for (const edge of [...edges].sort((a, b) => a.id.localeCompare(b.id))) {
    const start = level.get(edge.from)!, finish = level.get(edge.to)!;
    if (finish <= start || virtualCount + finish - start - 1 > VIRTUAL_BUDGET) { outside.push(edge); continue; }
    const chain = [key(edge.from)];
    for (let rank = start + 1; rank < finish; rank++) {
      const id = `route:${edge.id}:${rank}`;
      vertices.set(id, { id, level: rank, y: 0 }); layers[rank].push(id); chain.push(id); virtualCount++;
    }
    chain.push(key(edge.to)); chains.set(edge.id, chain);
    chain.slice(1).forEach((id, i) => segments.push({ edgeId: edge.id, from: chain[i], to: id, level: start + i, lane: 0, sy: 0, ty: 0 }));
  }
  const active = new Set(edges.filter(e => e.active).map(e => e.id));
  const ordering = reduceCrossings(layers, segments.filter(s => active.has(s.edgeId)));
  const slots = Math.max(1, ...ordering.layers.map(l => l.length));
  const pad = Math.max(60, 48 + outside.length * LANE);
  for (const layer of ordering.layers) layer.forEach((id, i) => { vertices.get(id)!.y = pad + (slots - layer.length) * ROW / 2 + i * ROW; });
  // Separate ports preserve the identity of parallel relationships.
  const output = new Map<string, Dependency[]>(), input = new Map<string, Dependency[]>();
  for (const edge of edges) {
    if (!output.has(edge.from)) output.set(edge.from, []);
    if (!input.has(edge.to)) input.set(edge.to, []);
    output.get(edge.from)!.push(edge); input.get(edge.to)!.push(edge);
  }
  const fromY = new Map<string, number>(), toY = new Map<string, number>();
  for (const [map, isOutput] of [[output, true], [input, false]] as const) for (const [id, links] of map) {
    links.sort((a, b) => vertices.get(key(isOutput ? a.to : a.from))!.y - vertices.get(key(isOutput ? b.to : b.from))!.y || a.id.localeCompare(b.id));
    links.forEach((edge, i) => (isOutput ? fromY : toY).set(edge.id, vertices.get(key(id))!.y + 20 + (NETWORK_NODE_HEIGHT - 40) * (i + 1) / (links.length + 1)));
  }
  for (const s of segments) {
    const a = vertices.get(s.from)!, b = vertices.get(s.to)!;
    s.sy = a.task ? fromY.get(s.edgeId)! : a.y + NETWORK_NODE_HEIGHT / 2;
    s.ty = b.task ? toY.get(s.edgeId)! : b.y + NETWORK_NODE_HEIGHT / 2;
  }
  // Interval coloring gives overlapping vertical trunks different lanes.
  const laneCounts = new Map<number, number>();
  for (let rank = 0; rank <= maxLevel; rank++) {
    const laneEnds: number[] = [];
    const group = segments.filter(s => s.level === rank).sort((a, b) => Math.min(a.sy, a.ty) - Math.min(b.sy, b.ty) || Math.max(a.sy, a.ty) - Math.max(b.sy, b.ty) || a.edgeId.localeCompare(b.edgeId));
    for (const segment of group) {
      const low = Math.min(segment.sy, segment.ty), high = Math.max(segment.sy, segment.ty);
      let lane = laneEnds.findIndex(end => end + 8 < low);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = high; segment.lane = lane;
    }
    laneCounts.set(rank, laneEnds.length);
  }
  const outerLanes = new Map<string, { from: number; to: number }>();
  for (const edge of outside) {
    const a = level.get(edge.from)!, b = level.get(edge.to)! - 1;
    const from = laneCounts.get(a) || 0; laneCounts.set(a, from + 1);
    const to = laneCounts.get(b) || 0; laneCounts.set(b, to + 1);
    outerLanes.set(edge.id, { from, to });
  }
  const gapWidth = (rank: number) => Math.max(96, 40 + (laneCounts.get(rank) || 0) * LANE);
  const xs = [pad];
  for (let rank = 1; rank <= maxLevel; rank++) xs.push(xs[rank - 1] + NETWORK_NODE_WIDTH + gapWidth(rank - 1));
  const pointAt = (id: string, side: 'from' | 'to', edgeId: string): Point => {
    const vertex = vertices.get(id)!;
    return { x: xs[vertex.level] + (vertex.task ? side === 'from' ? NETWORK_NODE_WIDTH : 0 : NETWORK_NODE_WIDTH / 2), y: vertex.task ? (side === 'from' ? fromY : toY).get(edgeId)! : vertex.y + NETWORK_NODE_HEIGHT / 2 };
  };
  const routes: NetworkRoute[] = [];
  for (const [edgeId, chain] of chains) {
    const points: Point[] = [], ownSegments = segments.filter(s => s.edgeId === edgeId);
    for (const s of ownSegments) {
      const a = pointAt(s.from, 'from', edgeId), b = pointAt(s.to, 'to', edgeId), x = xs[s.level] + NETWORK_NODE_WIDTH + 18 + s.lane * LANE;
      points.push(a, { x, y: a.y }, { x, y: b.y }, b);
    }
    const route = cleanPoints(points), middle = ownSegments[Math.floor(ownSegments.length / 2)];
    routes.push({ edgeId, points: route, path: roundedRoute(route), outside: false, labelX: xs[middle.level] + NETWORK_NODE_WIDTH + gapWidth(middle.level) / 2, labelY: (middle.sy + middle.ty) / 2 - 8 });
  }
  outside.forEach((edge, i) => {
    const a = pointAt(key(edge.from), 'from', edge.id), b = pointAt(key(edge.to), 'to', edge.id), lanes = outerLanes.get(edge.id)!;
    const leftRank = level.get(edge.to)! - 1;
    const sx = a.x + 18 + lanes.from * LANE;
    const tx = leftRank < 0 ? pad - 18 - lanes.to * LANE : xs[leftRank] + NETWORK_NODE_WIDTH + 18 + lanes.to * LANE;
    const top = 24 + i * LANE;
    const points = cleanPoints([a, { x: sx, y: a.y }, { x: sx, y: top }, { x: tx, y: top }, { x: tx, y: b.y }, b]);
    routes.push({ edgeId: edge.id, points, path: roundedRoute(points), outside: true, labelX: (sx + tx) / 2, labelY: top - 6 });
  });
  const nodes: NetworkNode[] = tasks.map(task => { const vertex = vertices.get(key(task.id))!; return { task, x: xs[vertex.level], y: vertex.y, level: vertex.level, distance: distance.get(task.id)! }; });
  return { nodes, routes, width: xs[maxLevel] + NETWORK_NODE_WIDTH + gapWidth(maxLevel) + 24,
    height: pad * 2 + (slots - 1) * ROW + NETWORK_NODE_HEIGHT,
    crossingsBefore: ordering.before, crossingsAfter: ordering.after, virtualCount };
}
