// Weighted progress of a group of tasks (owner's request, 2026-11-19: importance + milestone + duration taken together).
//   progress = sum(weight x achievement) / sum(weight)
//   weight      = sqrt(duration in days; a milestone counts as a two-week task) x importance (high 1.5, mid 1, low 0.7) x 1.5 for a milestone
//   achievement = 1 when finished; the entered progress; else, once started, the share of the duration that has passed (0.1 to 0.9); else 0
// Tasks that are conditional and not triggered ("조건부 미발동") are left out.
import type { Day, Plan, ScheduleResult, Task } from './core/types';
import { dayNumber } from './core/dates';

export type Priority = 'high' | 'mid' | 'low';
export const PRI_FACTOR: Record<Priority, number> = { high: 1.5, mid: 1, low: 0.7 };
export const MILESTONE_FACTOR = 1.5, MILESTONE_DAYS = 14;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Importance used until a member sets one: tasks on or near the path to the operation date count as high, tasks outside it as low. */
export function defaultPriority(result: ScheduleResult, id: string): Priority {
  const c = result.tasks[id]?.criticality;
  return c === 'critical' || c === 'near' ? 'high' : c === 'outside' ? 'low' : 'mid';
}
export const isDone = (t: Task) => !!t.actualFinish || t.status === '완료';
export const isStarted = (t: Task) => !!t.actualStart || t.status === '진행';
export const isExcluded = (t: Task) => t.status === '조건부 미발동';
export function achievement(t: Task, result: ScheduleResult, today: Day): number {
  if (isDone(t)) return 1;
  if (typeof t.progress === 'number') return clamp(t.progress, 0, 1);
  if (!isStarted(t)) return 0;
  const r = result.tasks[t.id]; if (!r) return 0;
  const duration = Math.max(1, r.duration || 1);
  if (t.actualStart && t.remaining !== null) return clamp(1 - t.remaining / duration, 0.05, 0.95);
  const elapsed = dayNumber(today) - dayNumber(t.actualStart || r.start) + 1;
  return clamp(elapsed / duration, 0.1, 0.9);
}
export function weight(t: Task, result: ScheduleResult, priority: Priority): number {
  const r = result.tasks[t.id];
  const days = t.kind === 'milestone' ? MILESTONE_DAYS : Math.max(1, r?.duration || 1);
  return Math.sqrt(days) * PRI_FACTOR[priority] * (t.kind === 'milestone' ? MILESTONE_FACTOR : 1);
}
export interface Progress { pct: number; done: number; total: number; started: number; weightDone: number; weightTotal: number }
export function progressOf(tasks: Task[], result: ScheduleResult, priorityOf: (id: string) => Priority | undefined, today: Day): Progress {
  let weightDone = 0, weightTotal = 0, done = 0, total = 0, started = 0;
  for (const t of tasks) {
    if (isExcluded(t)) continue;
    const w = weight(t, result, priorityOf(t.id) || defaultPriority(result, t.id)), a = achievement(t, result, today);
    weightTotal += w; weightDone += w * a; total++; if (a >= 1) done++; else if (a > 0) started++;
  }
  return { pct: weightTotal ? weightDone / weightTotal : 0, done, total, started, weightDone, weightTotal };
}
