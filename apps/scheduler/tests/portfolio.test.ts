import { describe, expect, it } from 'vitest';
import { calculate } from '../src/core/engine';
import { addDays } from '../src/core/dates';
import { calculatePortfolio, comparePortfolio, PortfolioCycleError, taskKey } from '../src/core/portfolio';
import type { PortfolioLink, PortfolioProject } from '../src/core/portfolio';
import type { LinkType } from '../src/core/types';
import { plan, task } from './fixtures';

const project = (id: string, start = '2030-01-01', finish = '2030-01-02'): PortfolioProject => ({
  id, name: '합성 프로젝트 ' + id, plan: { ...plan(), tasks: [task('T1', start, finish)] },
});
const link = (from = 'A', to = 'B', type: LinkType = 'FS', lag = 0, id = 'bridge'): PortfolioLink => ({
  id, from: { projectId: from, taskId: 'T1' }, to: { projectId: to, taskId: 'T1' }, type, lag, active: true,
});

describe('cross-project calendar scheduling', () => {
  it('keeps independent project calendars, task IDs, versions and results', () => {
    const a = project('A'), b = project('B');
    a.plan.statusDate = '2030-01-10'; b.plan.statusDate = '2030-02-10';
    a.plan.tasks[0].remaining = 2; b.plan.tasks[0].remaining = 3;
    const result = calculatePortfolio([a, b], []);
    expect(result.projects.A.tasks).toEqual(calculate(a.plan).tasks);
    expect(result.projects.B.tasks).toEqual(calculate(b.plan).tasks);
    expect(result.projects.A.planId).toBe(a.plan.id);
    expect(result.projects.B.planVersion).toBe(b.plan.updatedAt);
    expect(result.projects.B.tasks.T1.finish).toBe('2030-02-12');
    expect(Object.keys(result.combined.tasks)).toHaveLength(2);
  });

  it.each<[LinkType, number, string, string]>([
    ['FS', 0, '2030-01-13', '2030-01-14'],
    ['FS', -2, '2030-01-11', '2030-01-12'],
    ['SS', 2, '2030-01-12', '2030-01-13'],
    ['FF', 2, '2030-01-13', '2030-01-14'],
    ['SF', -2, '2030-01-07', '2030-01-08'],
  ])('propagates %s lag %s across a project boundary', (type, lag, start, finish) => {
    const result = calculatePortfolio([project('A', '2030-01-10', '2030-01-12'), project('B')], [link('A', 'B', type, lag)]);
    expect(result.projects.B.tasks.T1.start).toBe(start);
    expect(result.projects.B.tasks.T1.finish).toBe(finish);
    expect(result.projects.B.tasks.T1.drivers).toContain('external:bridge');
  });

  it('compares actual propagated changes and preserves unrelated projects and original input', () => {
    const projects = [project('A', '2030-01-09', '2030-01-10'), project('B'), project('C')], links = [link()];
    const original = JSON.stringify(projects), before = calculatePortfolio(projects, links), next = structuredClone(projects);
    next[0].plan.tasks[0].delay = 4;
    const after = calculatePortfolio(next, links), diff = comparePortfolio(before, after);
    expect(after.projects.B.tasks.T1.start).toBe('2030-01-15');
    expect(after.projects.B.tasks.T1.finish).toBe('2030-01-16');
    expect(after.projects.C.tasks).toEqual(before.projects.C.tasks);
    expect(diff.changedProjects).toBe(2); expect(diff.changedTasks).toBe(2);
    expect(diff.projects.find(p => p.projectId === 'B')?.delay).toBe(4);
    expect(diff.changes.find(t => t.projectId === 'B')?.finishDelta).toBe(4);
    expect(JSON.stringify(projects)).toBe(original);
  });

  it('absorbs delay before a successor floor and only moves when the buffer is consumed', () => {
    const projects = [project('A', '2030-01-09', '2030-01-10'), project('B', '2030-01-20', '2030-01-22')];
    const before = calculatePortfolio(projects, [link()]);
    projects[0].plan.tasks[0].delay = 3;
    const absorbed = calculatePortfolio(projects, [link()]);
    expect(absorbed.projects.B.tasks.T1.start).toBe('2030-01-20');
    expect(comparePortfolio(before, absorbed).changes.filter(t => t.projectId === 'B')).toHaveLength(0);
    projects[0].plan.tasks[0].delay = 12;
    const delayed = calculatePortfolio(projects, [link()]);
    expect(delayed.projects.B.tasks.T1.start).toBe('2030-01-23');
    expect(comparePortfolio(before, delayed).projects.find(p => p.projectId === 'B')?.delay).toBe(3);
  });

  it('retains fixed actuals and maps violation references back to local task/link IDs', () => {
    const a = project('A', '2030-01-10', '2030-01-12'), b = project('B');
    b.plan.tasks[0].actualStart = '2030-01-01'; b.plan.tasks[0].actualFinish = '2030-01-02';
    const result = calculatePortfolio([a, b], [link()]);
    expect(result.projects.B.tasks.T1.start).toBe('2030-01-01');
    expect(result.projects.B.issues.find(i => i.code === 'relationship-violation')).toMatchObject({ taskId: 'T1', linkId: 'external:bridge' });
  });

  it('rejects cycles spanning internal and external relationships without mutating input', () => {
    const a = project('A'), b = project('B');
    a.plan.tasks.push({ ...task('T2'), order: 1 });
    a.plan.dependencies.push({ id: 'inside', sourceId: 'inside', from: 'T1', to: 'T2', type: 'FS', lag: 0, active: true, condition: '' });
    const links = [link(), link('B', 'A', 'SS', 0, 'reverse')];
    links[0].from.taskId = 'T2';
    const snapshot = JSON.stringify([a, b, links]);
    expect(() => calculatePortfolio([a, b], links)).toThrow('순환');
    try { calculatePortfolio([a, b], links); }
    catch (error) { expect(error).toBeInstanceOf(PortfolioCycleError); expect((error as PortfolioCycleError).cycle).toHaveLength(4); }
    expect(JSON.stringify([a, b, links])).toBe(snapshot);
  });

  it('ignores inactive external edges for dates and cycle detection', () => {
    const forward = link(), reverse = { ...link('B', 'A', 'FS', 0, 'reverse'), active: false };
    const result = calculatePortfolio([project('A'), project('B')], [forward, reverse]);
    expect(result.projects.B.tasks.T1.start).toBe('2030-01-03');
    expect(result.edges.filter(e => e.external)).toHaveLength(2);
  });

  it('prevents collisions for duplicate local task IDs and delimiter-containing identifiers', () => {
    const a = project('x'), b = project('x:y');
    a.plan.tasks[0].id = 'y:z'; b.plan.tasks[0].id = 'z';
    expect(taskKey({ projectId: a.id, taskId: 'y:z' })).not.toBe(taskKey({ projectId: b.id, taskId: 'z' }));
    expect(Object.keys(calculatePortfolio([a, b], []).combined.tasks)).toHaveLength(2);
  });

  it('handles imported project IDs that match JavaScript object property names', () => {
    const result = calculatePortfolio([project('__proto__'), project('constructor')], []);
    expect(Object.keys(result.projects)).toHaveLength(2);
    expect(result.projects.__proto__.tasks.T1.finish).toBe('2030-01-02');
    expect(result.names.constructor).toBe('합성 프로젝트 constructor');
  });

  it('preserves month-anchored support rules when an external predecessor shifts their anchor', () => {
    const a = project('A', '2030-01-31', '2030-01-31'), b = project('B', '2030-01-01', '2030-01-01');
    a.plan.tasks[0].kind = 'milestone'; b.plan.tasks[0].kind = 'milestone';
    b.plan.tasks.push({ ...task('support', '2030-01-02', '2030-07-01'), finishRule: { anchorId: 'T1', months: 6 }, order: 1 });
    const result = calculatePortfolio([a, b], [link()]);
    expect(result.projects.B.tasks.T1.finish).toBe('2030-02-01');
    expect(result.projects.B.tasks.support.finish).toBe('2030-08-01');
    expect(b.plan.tasks[1].finishRule?.anchorId).toBe('T1');
  });

  it('preserves procurement lead floors, package IDs and delivery results across projects', () => {
    const a = project('A', '2030-01-10', '2030-01-10'), b = project('B', '2030-01-01', '2030-01-01');
    b.plan.tasks.push(task('delivery'), task('install'), task('sat'));
    b.plan.procurement.push({ id: 'pkg', name: '합성 설비', poTaskId: 'T1', deliveryTaskId: 'delivery', installTaskId: 'install', satTaskId: 'sat', delay: 0, leadWeeks: 2,
      trigger: 'PO 발행', triggerDate: null, transport: 0, commitment: '미확약', supplier: '', evidence: '', sourceIndex: 0 });
    const result = calculatePortfolio([a, b], [link()]);
    expect(result.projects.B.tasks.T1.start).toBe('2030-01-11');
    expect(result.projects.B.deliveries.pkg).toBe('2030-01-25');
    expect(result.projects.B.tasks.delivery.finish).toBe('2030-01-25');
    expect(result.projects.B.tasks.delivery.drivers).toContain('납기:pkg');
  });

  it('propagates invalid forecast conditions only through the actual dependency ancestry', () => {
    const a = project('A'), b = project('B'), c = project('C'); a.plan.powerRoute = '5000';
    const result = calculatePortfolio([a, b, c], [link()]);
    expect(result.projects.A.operationValid).toBe(false);
    expect(result.projects.B.operationValid).toBe(false);
    expect(result.projects.B.issues.some(i => i.code === 'external-prediction')).toBe(true);
    expect(result.projects.C.operationValid).toBe(true);
  });

  it('rejects duplicate, missing, same-project and invalid-lag links', () => {
    const projects = [project('A'), project('B')];
    expect(() => calculatePortfolio(projects, [link(), { ...link(), id: 'duplicate' }])).toThrow('중복');
    expect(() => calculatePortfolio(projects, [link('A', 'missing')])).toThrow('찾을 수');
    expect(() => calculatePortfolio(projects, [link('A', 'A')])).toThrow('서로 다른');
    expect(() => calculatePortfolio(projects, [link('A', 'B', 'FS', 0.5)])).toThrow('정수');
  });

  it('supports long cross-project chains and leaves task durations unchanged', () => {
    const projects = Array.from({ length: 25 }, (_, i) => project('P' + i));
    const links = projects.slice(1).map((p, i) => link(projects[i].id, p.id, 'FS', 0, 'chain-' + i));
    const result = calculatePortfolio(projects, links);
    expect(result.projects.P24.tasks.T1.finish).toBe(addDays('2030-01-02', 48));
    expect(result.projects.P24.tasks.T1.duration).toBe(2);
  });
});

it('uses latest START rather than latest FINISH for a non-milestone completion anchor', () => {
  const p = project('A', '2030-01-01', '2030-01-03').plan;
  expect(calculate(p).tasks.T1.slack).toBe(0);
  expect(calculatePortfolio([{ id: 'A', name: '합성', plan: p }], []).projects.A.tasks.T1.slack).toBe(0);
});

it('calculates a synthetic portfolio of 5,000 tasks and 15,000 cross-project links', () => {
  const projects = Array.from({ length: 5 }, (_, i) => ({ ...project('P' + i), plan: { ...plan(), tasks: [] as ReturnType<typeof task>[] } }));
  const refs = Array.from({ length: 5000 }, (_, i) => {
    const p = projects[i % 5], id = 'T' + Math.floor(i / 5);
    p.plan.tasks.push({ ...task(id, '2030-01-01', '2030-01-01'), order: i });
    return { projectId: p.id, taskId: id };
  });
  const links: PortfolioLink[] = [];
  for (let i = 1; i < refs.length; i++) for (let gap = 1; gap <= Math.min(i, 3); gap++) links.push({ id: 'edge-' + i + '-' + gap, from: refs[i - gap], to: refs[i], type: 'FS', lag: 0, active: true });
  for (const i of [7, 8, 9, 11, 12, 13]) links.push({ id: 'extra-' + i, from: refs[0], to: refs[i], type: 'FS', lag: 0, active: true });
  expect(links).toHaveLength(15000);
  const result = calculatePortfolio(projects, links);
  expect(result.combined.order).toHaveLength(5000);
  expect(result.projects.P4.tasks.T999.finish).toBe(addDays('2030-01-01', 4999));
  expect(result.combined.criticalCount).toBe(5000);
  expect(result.combined.computedAtMs).toBeLessThan(1500);
  console.info('Synthetic portfolio 5000 tasks / 15000 cross-project links ms:', Math.round(result.combined.computedAtMs));
});
