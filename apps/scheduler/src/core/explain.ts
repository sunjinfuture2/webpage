import type { Plan, ScheduleResult } from './types';
export interface PathStep { taskId: string; wbs: string; name: string; start: string; finish: string; cause: string }
/** A representative binding path; there may be multiple simultaneous drivers. */
export function drivingPath(plan: Plan, result: ScheduleResult, anchorId?: string): PathStep[] {
  const byId = new Map(plan.tasks.map(t => [t.id, t]));
  const steps: PathStep[] = [], visited = new Set<string>();
  let id = anchorId || plan.tasks.find(t => t.wbs === 'W8.6')?.id;
  while (id && byId.has(id) && !visited.has(id) && steps.length < 80) {
    visited.add(id);
    const t = byId.get(id)!, r = result.tasks[id];
    if (!r) break;
    const candidates = plan.dependencies.filter(e => e.active && r.drivers.includes(e.id));
    candidates.sort((a, b) => (result.tasks[b.from]?.delta || 0) - (result.tasks[a.from]?.delta || 0));
    const edge = candidates[0], pkg = plan.procurement.find(x => x.poTaskId === id);
    const extra = t.delay + (pkg?.delay || 0);
    const cause = t.actualStart ? '실제일 고정' : edge ? edge.type + (edge.lag ? ' +' + edge.lag + '일' : '') : extra ? '추가지연·PO ' + extra + '일' : r.drivers.join(' · ');
    steps.push({ taskId: id, wbs: t.wbs, name: t.name, start: r.start, finish: r.finish, cause });
    id = t.actualStart ? undefined : edge?.from;
  }
  return steps.reverse();
}
