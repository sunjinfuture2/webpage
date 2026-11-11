import { describe, expect, it } from 'vitest';
import { changedScheduleTasks, phaseSummaries, searchTasks, traceTaskIds } from '../src/core/schedule-navigation';
import { calculate } from '../src/core/engine';
import { assertWorkspace } from '../src/core/storage';
import type { Dependency } from '../src/core/types';
import { plan, task, workspace } from './fixtures';

const link = (from: string, to: string, active = true): Dependency => ({ id: from + to, sourceId: from + to, from, to, type: 'FS', lag: 0, active, condition: '' });
describe('schedule navigation projections', () => {
  it('traces ancestors and descendants without pulling in siblings or inactive edges', () => {
    const edges = [link('A', 'B'), link('A', 'C'), link('B', 'D'), link('D', 'E'), link('B', 'F', false)];
    expect([...traceTaskIds('B', edges)].sort()).toEqual(['A', 'B', 'D', 'E']);
    expect([...traceTaskIds('B', edges, 'before')]).toEqual(['B', 'A']);
    expect([...traceTaskIds('B', edges, 'after')]).toEqual(['B', 'D', 'E']);
    expect([...traceTaskIds('B', edges, 'nearby')].sort()).toEqual(['A', 'B', 'D']);
  });
  it('stays finite on reconverging paths and malformed cycles', () => {
    expect(traceTaskIds('A', [link('A', 'B'), link('A', 'C'), link('B', 'D'), link('C', 'D'), link('D', 'A')]).size).toBe(4);
  });
  it('keeps real phase dates including support while excluding standby and completed tasks from remaining risk', () => {
    const p = plan(); p.tasks = [task('A'), { ...task('B','2030-01-01','2036-01-01'), status: '조건부 미발동' }, { ...task('C'), status: '완료' }];
    const r = calculate(p); r.tasks.A.slack = 19; r.tasks.B.slack = 0; r.tasks.C.slack = 0;
    r.tasks.B.criticality = r.tasks.C.criticality = 'critical';
    const original = JSON.stringify(p); const group = phaseSummaries(p.tasks, r)[0];
    expect(group.slack).toBe(19); expect(group.critical).toBe(0); expect(group.finish).toBe('2036-01-01');
    expect(group.conditional).toBe(1); expect(group.completed).toBe(1); expect(JSON.stringify(p)).toBe(original);
  });
  it('does not fabricate slack for phases outside the operation path', () => {
    const p = plan(), r = calculate(p); Object.values(r.tasks).forEach(t => t.slack = null);
    expect(phaseSummaries(p.tasks, r)[0].slack).toBeNull(); expect(phaseSummaries([], r)).toEqual([]);
  });
  it('orders phase numbers naturally and searches multiple words across task fields', () => {
    const p = plan(); p.tasks = [{ ...task('W10.1'), phase: 'W10', name: '설계 검토', primary: '김담당' }, { ...task('W2.1'), phase: 'W2', name: '설계 승인' }];
    expect(phaseSummaries(p.tasks, calculate(p)).map(g => g.id)).toEqual(['W2', 'W10']);
    expect(searchTasks(p.tasks, '설계 김담당').map(t => t.id)).toEqual(['W10.1']);
    expect(searchTasks(p.tasks, 'w2.1').map(t => t.id)).toEqual(['W2.1']);
  });
  it('detects start-only changes even when finish variance is zero', () => {
    const p = plan(), a = calculate(p), b = structuredClone(a); b.tasks.T1.start = '2030-01-11';
    expect(changedScheduleTasks(p, a, b).map(t => t.id)).toEqual(['T1']);
    expect(changedScheduleTasks(p, a, a)).toEqual([]);
  });
  it('accepts new overview preferences and still validates previous backups', () => {
    const w = workspace(); expect(() => assertWorkspace(w)).not.toThrow();
    w.preferences.view = 'overview'; expect(() => assertWorkspace(w)).not.toThrow();
  });
});
