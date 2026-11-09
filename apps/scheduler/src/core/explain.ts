import type { Plan, ScheduleResult, Workspace } from './types';
import type { PortfolioLink, PortfolioResult, PortfolioTaskRef } from './portfolio';
import { taskKey } from './portfolio';
import { portfolioProjects } from './portfolio-workspace';
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
    const cause = t.actualStart ? '실제일 고정' : edge ? edge.type + (edge.lag ? ' ' + (edge.lag > 0 ? '+' : '') + edge.lag + '일' : '') : extra ? '추가지연·PO ' + extra + '일' : r.drivers.join(' · ');
    steps.push({ taskId: id, wbs: t.wbs, name: t.name, start: r.start, finish: r.finish, cause });
    id = t.actualStart ? undefined : edge?.from;
  }
  return steps.reverse();
}

export interface ExternalDriver extends PortfolioTaskRef { projectName: string; wbs: string; name: string; type: string; lag: number }
export function externalRelationsFor(workspace: Workspace, taskId: string): PortfolioLink[] {
  return (workspace.portfolio?.links || []).filter(edge => edge.from.projectId === workspace.projectId && edge.from.taskId === taskId || edge.to.projectId === workspace.projectId && edge.to.taskId === taskId);
}
export function resolveExternalDriver(workspace: Workspace, driverId: string): ExternalDriver | undefined {
  if (!driverId.startsWith('external:')) return;
  const edge = workspace.portfolio?.links.find(link => link.id === driverId.slice('external:'.length));
  if (!edge) return;
  const project = portfolioProjects(workspace).find(project => project.id === edge.from.projectId);
  const task = project?.plan.tasks.find(task => task.id === edge.from.taskId);
  if (!project || !task) return;
  return { ...edge.from, projectName: project.name, wbs: task.wbs, name: task.name, type: edge.type, lag: edge.lag };
}

export interface ConnectedPathStep extends PathStep { projectId: string; projectName: string }
/** A representative binding path may cross project boundaries; return readable local task identifiers. */
export function connectedDrivingPath(workspace: Workspace, portfolio: PortfolioResult): ConnectedPathStep[] {
  const projects = portfolioProjects(workspace), primary = projects[0], result = portfolio.projects[primary.id];
  const anchor = primary.plan.tasks.find(task => task.wbs === 'W8.6') || primary.plan.tasks.reduce((a, b) => result.tasks[a.id].finish > result.tasks[b.id].finish ? a : b);
  const path = drivingPath(portfolio.plan, portfolio.combined, taskKey({ projectId: primary.id, taskId: anchor.id }));
  return path.map(step => {
    const ref = portfolio.refs[step.taskId], project = projects.find(project => project.id === ref.projectId)!;
    const task = project.plan.tasks.find(task => task.id === ref.taskId)!;
    return { ...step, taskId: task.id, wbs: task.wbs, projectId: ref.projectId, projectName: project.name };
  });
}
