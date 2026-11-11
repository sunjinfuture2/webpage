import type { Dependency, Plan, ScheduleResult, Task } from './types';

/** A view projection only. Never changes dates, dependencies or task status. */
export function phaseSummaries(tasks: Task[], result: ScheduleResult) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) if (result.tasks[task.id]) {
    if (!groups.has(task.phase)) groups.set(task.phase, []);
    groups.get(task.phase)!.push(task);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([id, items]) => {
    const dates = items.map(t => result.tasks[t.id]);
    const remaining = items.filter(t => !t.actualFinish && t.status !== '완료' && t.status !== '조건부 미발동');
    const slacks = remaining.flatMap(t => result.tasks[t.id].slack === null ? [] : [result.tasks[t.id].slack!]);
    return { id, label: items[0].phaseLabel, tasks: items,
      start: dates.map(t => t.start).sort()[0], finish: dates.map(t => t.finish).sort().at(-1)!,
      slack: slacks.length ? Math.min(...slacks) : null,
      critical: remaining.filter(t => result.tasks[t.id].criticality === 'critical').length,
      near: remaining.filter(t => result.tasks[t.id].criticality === 'near').length,
      completed: items.filter(t => t.actualFinish || t.status === '완료').length,
      conditional: items.filter(t => t.status === '조건부 미발동').length,
    };
  });
}

/** Trace each direction independently: a predecessor's other children are not effects. */
export function traceTaskIds(focusId: string, dependencies: Dependency[], direction: 'nearby' | 'both' | 'before' | 'after' = 'both') {
  if (direction === 'nearby') return new Set([focusId, ...dependencies.filter(e => e.active && (e.from === focusId || e.to === focusId)).flatMap(e => [e.from, e.to])]);
  const before = new Map<string, string[]>(), after = new Map<string, string[]>();
  for (const edge of dependencies) if (edge.active) {
    if (!before.has(edge.to)) before.set(edge.to, []);
    if (!after.has(edge.from)) after.set(edge.from, []);
    before.get(edge.to)!.push(edge.from);
    after.get(edge.from)!.push(edge.to);
  }
  const result = new Set([focusId]);
  for (const adjacency of direction === 'both' ? [before, after] : [direction === 'before' ? before : after]) {
    const seen = new Set([focusId]), queue = [focusId];
    for (let i = 0; i < queue.length; i++) for (const next of adjacency.get(queue[i]) || []) if (!seen.has(next)) {
      seen.add(next); result.add(next); queue.push(next);
    }
  }
  return result;
}

export function changedScheduleTasks(plan: Plan, before: ScheduleResult, after: ScheduleResult) {
  return plan.tasks.filter(task => {
    const a = before.tasks[task.id], b = after.tasks[task.id];
    return a && b && (a.start !== b.start || a.finish !== b.finish);
  });
}

export function searchTasks(tasks: Task[], query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return tasks.filter(t => terms.every(term => [t.wbs, t.name, t.primary || '', t.phaseLabel, t.roles.R].join(' ').toLocaleLowerCase().includes(term)))
    .sort((a, b) => Number(b.wbs.toLowerCase() === query.trim().toLowerCase()) - Number(a.wbs.toLowerCase() === query.trim().toLowerCase()) || a.order - b.order);
}
