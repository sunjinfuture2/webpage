import { describe, expect, it } from 'vitest';
import { buildNetworkLayout, NETWORK_NODE_HEIGHT as H, NETWORK_NODE_WIDTH as W } from '../src/core/network';
import { calculate } from '../src/core/engine';
import type { Dependency } from '../src/core/types';
import { plan, task } from './fixtures';

const edge = (id: string, from: string, to: string, type: Dependency['type'] = 'FS', active = true): Dependency => ({ id, sourceId: id, from, to, type, lag: 0, active, condition: '' });
const options = { focusId: 'A', direction: 'both' as const, depth: 4, all: true, includeInactive: true };
function noCardIntersections(graph: ReturnType<typeof buildNetworkLayout>) {
  for (const route of graph.routes) {
    expect(route.path).not.toMatch(/NaN|Infinity/);
    for (const point of route.points) { expect(point.x).toBeGreaterThanOrEqual(0); expect(point.y).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(graph.width); expect(point.y).toBeLessThanOrEqual(graph.height); }
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      expect(a.x === b.x || a.y === b.y).toBe(true);
      for (const node of graph.nodes) {
        const hits = a.x === b.x
          ? a.x > node.x && a.x < node.x + W && Math.max(a.y, b.y) > node.y && Math.min(a.y, b.y) < node.y + H
          : a.y > node.y && a.y < node.y + H && Math.max(a.x, b.x) > node.x && Math.min(a.x, b.x) < node.x + W;
        expect(hits, `${route.edgeId} passes through ${node.task.id}`).toBe(false);
      }
    }
  }
}
describe('readable network routing', () => {
  it('reduces an avoidable crossing while keeping source data unchanged', () => {
    const p = plan(); p.tasks = ['A', 'B', 'C', 'D'].map((id, order) => ({ ...task(id), order }));
    p.dependencies = [edge('ad', 'A', 'D'), edge('bc', 'B', 'C')];
    const original = JSON.stringify(p), graph = buildNetworkLayout(p, calculate(p), options);
    expect(graph.crossingsBefore).toBe(1); expect(graph.crossingsAfter).toBe(0);
    expect(JSON.stringify(p)).toBe(original); noCardIntersections(graph);
  });
  it('reserves empty slots for long edges and routes inactive backwards edges outside cards', () => {
    const p = plan(); p.tasks = ['A', 'B', 'C', 'D', 'E'].map((id, order) => ({ ...task(id), order }));
    p.dependencies = [edge('ab', 'A', 'B'), edge('bc', 'B', 'C'), edge('cd', 'C', 'D'), edge('ad', 'A', 'D', 'SS'), edge('bd', 'B', 'D', 'FF'), edge('ae', 'A', 'E'), edge('da', 'D', 'A', 'SF', false)];
    const graph = buildNetworkLayout(p, calculate(p), options);
    expect(graph.routes).toHaveLength(p.dependencies.length);
    expect(graph.routes.find(e => e.edgeId === 'da')!.outside).toBe(true);
    expect(graph.crossingsAfter).toBeLessThanOrEqual(graph.crossingsBefore);
    noCardIntersections(graph);
  });
  it('uses distinct routes and ports for all four relationship types between the same cards', () => {
    const p = plan(); p.tasks = [task('A'), task('B')];
    p.dependencies = (['FS', 'SS', 'FF', 'SF'] as const).map(type => edge(type, 'A', 'B', type));
    const graph = buildNetworkLayout(p, calculate(p), options);
    expect(new Set(graph.routes.map(e => e.path)).size).toBe(4);
    expect(new Set(graph.routes.map(e => e.points[0].y)).size).toBe(4);
    expect(graph.edges.map(e => e.type).sort()).toEqual(['FF', 'FS', 'SF', 'SS']); noCardIntersections(graph);
  });
  it('is deterministic and keeps split/merge branches clear of cards', () => {
    const p = plan(); p.tasks = Array.from({ length: 22 }, (_, i) => ({ ...task('T' + i), order: i }));
    p.dependencies = p.tasks.slice(1, -1).flatMap(t => [edge('from-' + t.id, 'T0', t.id), edge('to-' + t.id, t.id, 'T21')]);
    const result = calculate(p), graph = buildNetworkLayout(p, result, { ...options, focusId: 'T0' });
    expect(buildNetworkLayout(p, result, { ...options, focusId: 'T0' })).toEqual(graph); noCardIntersections(graph);
  });
});
