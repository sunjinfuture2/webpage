import { describe, expect, it } from 'vitest';
import { calculate } from '../src/core/engine';
import { buildNetworkLayout } from '../src/core/network';
import { plan, task } from './fixtures';

describe('network projection keeps schedule data intact', () => {
  it('finds predecessors and successors, including the four relationship types', () => {
    const p = plan(); p.tasks.push({ ...task('T3'), order: 2 }, { ...task('T4'), order: 3 }, { ...task('T5'), order: 4 });
    p.dependencies = [
      { id: 'one', sourceId: '', from: 'T1', to: 'T2', type: 'FS', lag: 0, active: true, condition: '' },
      { id: 'two', sourceId: '', from: 'T2', to: 'T3', type: 'SS', lag: 0, active: true, condition: '' },
      { id: 'three', sourceId: '', from: 'T3', to: 'T4', type: 'FF', lag: 0, active: true, condition: '' },
      { id: 'four', sourceId: '', from: 'T4', to: 'T5', type: 'SF', lag: 0, active: true, condition: '' },
    ];
    const before = JSON.stringify(p), r = calculate(p);
    const graph = buildNetworkLayout(p, r, { focusId: 'T3', direction: 'both', depth: 1, all: false, includeInactive: false });
    expect(graph.nodes.map(n => n.task.id).sort()).toEqual(['T2', 'T3', 'T4']);
    expect(graph.edges.map(e => e.type).sort()).toEqual(['FF', 'SS']);
    expect(graph.hiddenEdges).toBe(2);
    expect(JSON.stringify(p)).toBe(before);
    for (const e of graph.edges) expect(graph.nodes.find(n => n.task.id === e.to)!.x).toBeGreaterThan(graph.nodes.find(n => n.task.id === e.from)!.x);
  });
  it('keeps conditional cycles out of active layer ordering', () => {
    const p = plan();
    p.dependencies = [
      { id: 'active', sourceId: '', from: 'T1', to: 'T2', type: 'FS', lag: 0, active: true, condition: '' },
      { id: 'conditional', sourceId: '', from: 'T2', to: 'T1', type: 'FF', lag: 0, active: false, condition: '검토 중' },
    ];
    const r = calculate(p), options = { focusId: 'T1', direction: 'both' as const, depth: 2, all: true, includeInactive: false };
    expect(buildNetworkLayout(p, r, options).edges).toHaveLength(1);
    const graph = buildNetworkLayout(p, r, { ...options, includeInactive: true });
    expect(graph.edges).toHaveLength(2);
    expect(graph.nodes.find(n => n.task.id === 'T2')!.level).toBe(1);
  });
  it('does not mislabel an upstream task’s other successor as a downstream effect', () => {
    const p = plan(); p.tasks.push({ ...task('T3'), order: 2 });
    p.dependencies = [
      { id: 'focused', sourceId: '', from: 'T1', to: 'T2', type: 'FS', lag: 0, active: true, condition: '' },
      { id: 'sibling', sourceId: '', from: 'T1', to: 'T3', type: 'FS', lag: 0, active: true, condition: '' },
    ];
    const graph = buildNetworkLayout(p, calculate(p), { focusId: 'T2', direction: 'both', depth: 3, all: false, includeInactive: false });
    expect(graph.nodes.map(n => n.task.id).sort()).toEqual(['T1', 'T2']);
    expect(graph.hiddenEdges).toBe(1);
  });
  it('bounds visible nodes while reporting omissions and retaining the focus', () => {
    const p = plan(); p.tasks = Array.from({ length: 200 }, (_, i) => ({ ...task('T' + i), order: i }));
    p.dependencies = p.tasks.slice(1).map((t, i) => ({ id: 'edge-' + i, sourceId: '', from: p.tasks[i].id, to: t.id, type: 'FS', lag: 0, active: true, condition: '' }));
    const graph = buildNetworkLayout(p, calculate(p), { focusId: 'T180', direction: 'both', depth: 2, all: true, includeInactive: false, limit: 20 });
    expect(graph.nodes).toHaveLength(20); expect(graph.relevantTotal).toBe(200); expect(graph.omittedNodes).toBe(180);
    expect(graph.nodes.some(n => n.task.id === 'T180')).toBe(true);
    expect(graph.nodes.some(n => n.task.id === 'T179')).toBe(true);
    expect(graph.nodes.some(n => n.task.id === 'T181')).toBe(true);
    expect(graph.nodes.every(n => Math.abs(n.task.order - 180) <= 10)).toBe(true);
    expect(graph.edges).toHaveLength(19);
    expect(p.tasks).toHaveLength(200); expect(p.dependencies).toHaveLength(199);
  });
});
