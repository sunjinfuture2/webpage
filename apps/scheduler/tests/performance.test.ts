import { it, expect } from 'vitest';
import { calculate } from '../src/core/engine';
import type { Plan, Task } from '../src/core/types';
it('schedules a synthetic DAG of 5,000 tasks / 15,000 links without UI-only cached answers', () => {
  const tasks: Task[] = Array.from({ length: 5000 }, (_, i) => ({
    id: 'task-' + i, wbs: 'T' + i, phase: 'W1', phaseLabel: '성능 시험', name: '합성 업무 ' + i, order: i, kind: 'task',
    referenceStart: '2030-01-01', referenceFinish: '2030-01-01', plannedStart: '2030-01-01', plannedFinish: '2030-01-01',
    delay: 0, actualStart: null, actualFinish: null, remaining: null, progress: null, status: '계획', primary: null, secondary: null, headcount: null,
    roles: { A: '', R: '', C: '' }, criteria: '', conditions: '', evidence: '', sourceRow: null, sourceSheet: '합성 시험 전용',
  }));
  const plan: Plan = { id: 'performance', name: '시험 전용', statusDate: '2030-01-01', powerRoute: '9800', tasks, procurement: [], dependencies: [], createdAt: '', updatedAt: '' };
  for (let i = 1; i < tasks.length; i++) for (let j = 1; j <= Math.min(i, 3); j++) plan.dependencies.push({ id: 'edge-' + i + '-' + j, sourceId: '합성', from: tasks[i - j].id, to: tasks[i].id, type: 'FS', lag: 0, active: true, condition: '' });
  for (let i = 7; i < 13; i++) plan.dependencies.push({ id: 'extra-' + i, sourceId: '합성', from: tasks[0].id, to: tasks[i].id, type: 'FS', lag: 0, active: true, condition: '' });
  expect(plan.dependencies).toHaveLength(15000);
  const r = calculate(plan);
  expect(r.order).toHaveLength(5000);
  expect(r.criticalCount).toBe(5000);
  expect(r.issues).toHaveLength(0);
  expect(r.computedAtMs).toBeLessThan(1000);
  console.info('Synthetic 5000 / 15000 engine ms:', Math.round(r.computedAtMs));
});
