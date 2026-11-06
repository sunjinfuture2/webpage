import type { Plan, Task, Dependency } from './types';
import { addDays } from './dates';
import { topology, validatePlan } from './engine';

export function validatedPlan(current: Plan, mutate: (draft: Plan) => void): Plan {
  const draft = structuredClone(current);
  mutate(draft);
  draft.updatedAt = new Date().toISOString();
  const error = validatePlan(draft).find(i => i.severity === 'error');
  if (error) throw new Error(error.message);
  topology(draft);
  return draft;
}
export function newTask(plan: Plan, phase = 'W1'): Task {
  const phaseLabel = plan.tasks.find(t => t.phase === phase)?.phaseLabel || phase;
  const max = Math.max(0, ...plan.tasks.filter(t => t.wbs.startsWith(phase + '.')).map(t => Number(t.wbs.split('.')[1]) || 0));
  return {
    id: crypto.randomUUID(), wbs: phase + '.' + (max + 1), phase, phaseLabel, name: '새 업무',
    order: Math.max(...plan.tasks.map(t => t.order)) + 1, kind: 'task',
    referenceStart: plan.statusDate, referenceFinish: addDays(plan.statusDate, 4),
    plannedStart: plan.statusDate, plannedFinish: addDays(plan.statusDate, 4),
    delay: 0, actualStart: null, actualFinish: null, remaining: null, progress: null,
    status: '계획', primary: null, secondary: null, headcount: null,
    roles: { A: '', R: '', C: '' }, criteria: '', conditions: '', evidence: '',
    sourceRow: null, sourceSheet: '사용자 추가',
  };
}
export function removeTasks(plan: Plan, ids: string[]) {
  const selected = new Set(ids);
  if (plan.tasks.some(t => selected.has(t.id) && t.wbs === 'W8.6')) throw new Error('운영개시 기준 업무 W8.6은 삭제할 수 없습니다.');
  if (plan.tasks.some(t => !selected.has(t.id) && t.finishRule && selected.has(t.finishRule.anchorId))) throw new Error('지원 기산 업무를 먼저 변경해주세요.');
  if (plan.procurement.some(x => [x.poTaskId, x.deliveryTaskId, x.installTaskId, x.satTaskId].some(id => selected.has(id)))) throw new Error('조달대장에 연결된 업무입니다. 이 릴리스에서는 연결을 보존합니다.');
  plan.tasks = plan.tasks.filter(t => !selected.has(t.id));
  plan.dependencies = plan.dependencies.filter(e => !selected.has(e.from) && !selected.has(e.to));
}
export function newDependency(from: string, to: string, type: Dependency['type'] = 'FS', lag = 0): Dependency {
  return { id: crypto.randomUUID(), sourceId: '사용자 연결', from, to, type, lag, active: true, condition: '' };
}
