// Schedule engine for the WorkSpace project pages. The calculation itself is the SUNJIN Schedule app's core (schedule/core,
// copied unchanged from apps/scheduler/src/core); this file only exposes it, together with the override model, to the page.
import { calculate, topology, validatePlan } from './core/engine';
import { newDependency, newTask, removeTasks, validatedPlan } from './core/commands';
import { planFromSource, workspaceFromSource } from './core/seed';
import { buildNetworkLayout, NETWORK_NODE_HEIGHT, NETWORK_NODE_WIDTH } from './core/network';
import { drivingPath } from './core/explain';
import { relationshipGap, relationshipNames, relationshipSentence } from './core/dependency-labels';
import { addDays, addMonths, dayNumber, diffDays, fromDay, isDay, today } from './core/dates';
import { applyOverrides, diffPlans, isPlanKey, overrideChanges } from './overlay';
import { achievement, defaultPriority, isDone, isExcluded, isStarted, MILESTONE_DAYS, MILESTONE_FACTOR, PRI_FACTOR, progressOf, weight } from './progress';

const api = {
  version: 1,
  planFromSource, workspaceFromSource, calculate, validatePlan, topology, validatedPlan, newTask, newDependency, removeTasks,
  applyOverrides, diffPlans, overrideChanges, isPlanKey,
  network: buildNetworkLayout, NODE_W: NETWORK_NODE_WIDTH, NODE_H: NETWORK_NODE_HEIGHT, drivingPath,
  relationshipNames, relationshipSentence, relationshipGap,
  dates: { addDays, addMonths, dayNumber, diffDays, fromDay, isDay, today },
  progress: { of: progressOf, achievement, weight, defaultPriority, isDone, isStarted, isExcluded, PRI_FACTOR, MILESTONE_FACTOR, MILESTONE_DAYS },
};
export type ScheduleApi = typeof api;
(globalThis as any).AIDCSchedule = api;
