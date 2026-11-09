import { describe, expect, it } from 'vitest';
import { connectorPath, dependencyEndpoints, scopedDependencies } from '../src/components/ganttGeometry';
import type { Dependency, LinkType } from '../src/core/types';

const edge = (id: string, from: string, to: string, active = true): Dependency => ({ id, from, to, active, sourceId: id, type: 'FS', lag: 0, condition: '' });
describe('Gantt relationship semantics', () => {
  it.each<[LinkType, string, string]>([['FS', 'finish', 'start'], ['SS', 'start', 'start'], ['FF', 'finish', 'finish'], ['SF', 'start', 'finish']])('%s uses the matching bar ends', (type, from, to) => {
    expect(dependencyEndpoints(type)).toEqual({ from, to });
    const path = connectorPath(120, 17, 260, 93, type);
    expect(path.startsWith('M120,17')).toBe(true);
    expect(path.endsWith('L260,93')).toBe(true);
    expect(path).not.toMatch(/NaN|Infinity/);
  });
  it('traces a transitive branch in the requested direction and excludes inactive links', () => {
    const edges = [edge('ab', 'A', 'B'), edge('bc', 'B', 'C'), edge('bd', 'B', 'D'), edge('de', 'D', 'E', false), edge('xy', 'X', 'Y')];
    expect(scopedDependencies(edges, 'C', 'upstream', new Set()).map(e => e.id)).toEqual(['ab', 'bc']);
    expect(scopedDependencies(edges, 'B', 'downstream', new Set()).map(e => e.id)).toEqual(['bc', 'bd']);
    expect(scopedDependencies(edges, null, 'critical', new Set(['A', 'B'])).map(e => e.id)).toEqual(['ab']);
    expect(scopedDependencies(edges, 'A', 'all', new Set())).toHaveLength(4);
  });
  it('only follows connectivity once even when given an invalid cyclic draft', () => {
    expect(scopedDependencies([edge('ab', 'A', 'B'), edge('ba', 'B', 'A')], 'A', 'downstream', new Set())).toHaveLength(2);
  });
});
