import { calculate, topology, validatePlan } from './engine';
import { dayNumber, diffDays } from './dates';
import type { Dependency, Issue, LinkType, Plan, ScheduleResult, TaskResult } from './types';

export interface PortfolioTaskRef { projectId: string; taskId: string }
export interface PortfolioProject { id: string; name: string; plan: Plan }
export interface PortfolioLink {
  id: string; from: PortfolioTaskRef; to: PortfolioTaskRef;
  type: LinkType; lag: number; active: boolean;
}
export interface PortfolioEdge extends Dependency {
  external: boolean; originalId: string; fromRef: PortfolioTaskRef; toRef: PortfolioTaskRef;
}
export interface PortfolioResult {
  projects: Record<string, ScheduleResult>; combined: ScheduleResult; plan: Plan;
  refs: Record<string, PortfolioTaskRef>; edges: PortfolioEdge[]; names: Record<string, string>;
}
export interface PortfolioChange {
  projectId: string; taskId: string; name: string; wbs: string;
  before: { start: string; finish: string }; after: { start: string; finish: string };
  startDelta: number; finishDelta: number;
}
export interface PortfolioProjectChange {
  projectId: string; name: string; beforeDate: string; afterDate: string; delay: number; changedTasks: number;
}
export interface PortfolioComparison {
  changes: PortfolioChange[]; projects: PortfolioProjectChange[]; changedProjects: number; changedTasks: number;
}
export class PortfolioCycleError extends Error {
  constructor(message: string, public readonly cycle: PortfolioTaskRef[]) { super(message); this.name = 'PortfolioCycleError'; }
}

// Tuple encoding avoids delimiter collisions and keeps task IDs stable within each imported project.
export const taskKey = (ref: PortfolioTaskRef) => JSON.stringify([ref.projectId, ref.taskId]);
const internalKey = (projectId: string, id: string) => JSON.stringify(['internal', projectId, id]);
const externalKey = (id: string) => JSON.stringify(['external', id]);

/** An immutable portfolio calculation. Each project supplies one explicit scenario/revision. */
export function calculatePortfolio(projects: PortfolioProject[], links: PortfolioLink[]): PortfolioResult {
  const begin = performance.now();
  if (!Array.isArray(projects) || !projects.length) throw new Error('연결할 프로젝트를 먼저 선택해주세요.');
  const projectById = new Map<string, PortfolioProject>(), refs: Record<string, PortfolioTaskRef> = {};
  const names: Record<string, string> = Object.create(null), statusDates: Record<string, string> = {};
  const edges: PortfolioEdge[] = [], originalTaskByKey = new Map<string, Plan['tasks'][number]>();
  for (const project of projects) {
    if (typeof project.id !== 'string' || !project.id.trim() || projectById.has(project.id)) throw new Error('프로젝트 ID는 비어 있거나 중복될 수 없습니다.');
    const invalid = validatePlan(project.plan).find(i => i.severity === 'error');
    if (invalid) throw new Error(project.name + ': ' + invalid.message);
    projectById.set(project.id, project); names[project.id] = project.name;
    for (const task of project.plan.tasks) {
      const ref = { projectId: project.id, taskId: task.id }, key = taskKey(ref);
      refs[key] = ref; originalTaskByKey.set(key, task); statusDates[key] = project.plan.statusDate;
    }
  }
  const key = (projectId: string, taskId: string) => taskKey({ projectId, taskId });
  const tasks = projects.flatMap(project => project.plan.tasks.map(task => ({
    ...task, id: key(project.id, task.id), wbs: JSON.stringify([project.id, task.wbs]),
    roles: { ...task.roles },
    ...(task.finishRule ? { finishRule: { ...task.finishRule, anchorId: key(project.id, task.finishRule.anchorId) } } : {}),
  })));
  for (const project of projects) for (const edge of project.plan.dependencies) {
    edges.push({ ...edge, id: internalKey(project.id, edge.id), from: key(project.id, edge.from), to: key(project.id, edge.to),
      external: false, originalId: edge.id, fromRef: { projectId: project.id, taskId: edge.from }, toRef: { projectId: project.id, taskId: edge.to } });
  }
  const linkIds = new Set<string>(), tuples = new Set<string>();
  for (const link of links) {
    if (!link?.id || linkIds.has(link.id)) throw new Error('프로젝트 연결 ID는 비어 있거나 중복될 수 없습니다.');
    linkIds.add(link.id);
    if (!link.from || !link.to || !refs[taskKey(link.from)] || !refs[taskKey(link.to)]) throw new Error('연결 대상 프로젝트 또는 업무를 찾을 수 없습니다. 프로젝트와 시나리오를 다시 선택해주세요.');
    if (link.from.projectId === link.to.projectId) throw new Error('프로젝트 연결은 서로 다른 프로젝트의 업무를 선택해주세요.');
    if (!['FS', 'SS', 'FF', 'SF'].includes(link.type) || !Number.isSafeInteger(link.lag) || Math.abs(link.lag) > 36500 || typeof link.active !== 'boolean') throw new Error('관계 유형·정수 간격·적용 상태를 확인해주세요.');
    const tuple = JSON.stringify([taskKey(link.from), taskKey(link.to), link.type]);
    if (tuples.has(tuple)) throw new Error('같은 프로젝트 업무·관계 유형이 중복됩니다.');
    tuples.add(tuple);
    edges.push({ id: externalKey(link.id), sourceId: link.id, from: taskKey(link.from), to: taskKey(link.to), type: link.type,
      lag: link.lag, active: link.active, condition: '프로젝트 간 연결', external: true, originalId: link.id,
      fromRef: { ...link.from }, toRef: { ...link.to } });
  }
  const merged: Plan = {
    id: 'portfolio', name: '연결 프로젝트', statusDate: projects[0].plan.statusDate, powerRoute: '9800', tasks,
    dependencies: edges.map(({ external: _external, originalId: _original, fromRef: _from, toRef: _to, ...edge }) => edge),
    procurement: projects.flatMap(project => project.plan.procurement.map(pkg => ({ ...pkg,
      id: internalKey(project.id, pkg.id), poTaskId: key(project.id, pkg.poTaskId), deliveryTaskId: key(project.id, pkg.deliveryTaskId),
      installTaskId: key(project.id, pkg.installTaskId), satTaskId: key(project.id, pkg.satTaskId),
    }))),
    createdAt: '', updatedAt: JSON.stringify(projects.map(p => [p.id, p.plan.id, p.plan.updatedAt])),
  };
  // Includes internal support-period and procurement edges, so cross-project cycles cannot escape validation.
  try { topology(merged); }
  catch (error) {
    if (error instanceof Error && error.message.includes('순환')) {
      const cycle = findCycle(merged).map(id => refs[id]);
      const path = cycle.slice(0, 7).map(ref => names[ref.projectId] + ' / ' + originalTaskByKey.get(taskKey(ref))!.wbs).join(' → ');
      throw new PortfolioCycleError('프로젝트 순환 관계: ' + path + (cycle.length > 7 ? ' → …' : '') + '. 연결을 적용하지 않았습니다.', cycle);
    }
    throw error;
  }
  const calculated = calculate(merged, { statusDates });
  const graph = topology(merged), edgeById = new Map(edges.map(e => [e.id, e]));
  const anchors = new Map(projects.map(project => {
    const anchor = project.plan.tasks.find(t => t.wbs === 'W8.6') || project.plan.tasks.reduce((a, b) => calculated.tasks[key(project.id, a.id)].finish > calculated.tasks[key(project.id, b.id)].finish ? a : b);
    return [project.id, key(project.id, anchor.id)];
  }));
  const results: Record<string, ScheduleResult> = Object.create(null);
  for (const project of projects) {
    const selected = resultAtAnchor(calculated, merged, graph, anchors.get(project.id)!);
    const inputProjects = new Set([...ancestorsFor(graph, anchors.get(project.id)!)].map(id => refs[id].projectId));
    const invalidInputs = [...inputProjects].filter(id => projectById.get(id)!.plan.powerRoute === '5000');
    const ownKeys = new Set(project.plan.tasks.map(t => key(project.id, t.id)));
    const ownTasks: Record<string, TaskResult> = Object.create(null);
    for (const id of ownKeys) {
      const localId = refs[id].taskId, value = selected.tasks[id];
      ownTasks[localId] = { ...value, id: localId, drivers: value.drivers.map(cause => {
        const edge = edgeById.get(cause);
        if (edge) return edge.external ? 'external:' + edge.originalId : edge.originalId;
        if (cause.startsWith('납기:')) {
          const pkg = project.plan.procurement.find(pkg => cause === '납기:' + internalKey(project.id, pkg.id));
          if (pkg) return '납기:' + pkg.id;
        }
        return cause;
      }) };
    }
    const issues: Issue[] = calculated.issues.filter(issue => !issue.taskId || ownKeys.has(issue.taskId)).map(issue => {
      const mapped = { ...issue };
      if (issue.taskId) {
        mapped.taskId = refs[issue.taskId].taskId;
        const original = originalTaskByKey.get(issue.taskId)!;
        mapped.message = mapped.message.replace(tasks.find(t => t.id === issue.taskId)!.wbs, original.wbs);
      }
      const edge = issue.linkId ? edgeById.get(issue.linkId) : undefined;
      if (edge) mapped.linkId = edge.external ? 'external:' + edge.originalId : edge.originalId;
      return mapped;
    });
    if (project.plan.powerRoute === '5000') issues.push({ severity: 'warning', code: 'power-route', message: '5,000kW 축소안의 재승인 전입니다. 기본 경로 날짜는 유효한 운영 예측으로 사용할 수 없습니다.' });
    if (invalidInputs.some(id => id !== project.id)) issues.push({ severity: 'warning', code: 'external-prediction', message: '연결된 프로젝트의 예측 적용 조건이 충족되지 않았습니다. 재승인 전 참고 계산입니다.' });
    const deliveries: Record<string, string | null> = Object.create(null);
    for (const pkg of project.plan.procurement) deliveries[pkg.id] = calculated.deliveries[internalKey(project.id, pkg.id)];
    results[project.id] = { ...selected, planId: project.plan.id, planVersion: project.plan.updatedAt, tasks: ownTasks,
      order: calculated.order.filter(id => ownKeys.has(id)).map(id => refs[id].taskId), deliveries, issues,
      operationValid: invalidInputs.length === 0,
      criticalCount: Object.values(ownTasks).filter(t => t.criticality === 'critical').length,
      nearCount: Object.values(ownTasks).filter(t => t.criticality === 'near').length,
      changedCount: Object.values(ownTasks).filter(t => t.delta !== 0).length,
    };
  }
  const finalAnchor = [...anchors.values()].reduce((a, b) => calculated.tasks[a].finish > calculated.tasks[b].finish ? a : b);
  const combined = resultAtAnchor(calculated, merged, graph, finalAnchor);
  combined.computedAtMs = performance.now() - begin;
  combined.operationValid = projects.every(p => p.plan.powerRoute === '9800');
  return { projects: results, combined, plan: merged, refs, edges, names };
}

/** Backward pass for one explicitly selected finish anchor; all external ancestors remain in scope. */
function resultAtAnchor(result: ScheduleResult, plan: Plan, graph: ReturnType<typeof topology>, anchorId: string): ScheduleResult {
  const byId = new Map(plan.tasks.map(t => [t.id, t]));
  const operationDate = result.tasks[anchorId].finish;
  const operationDelay = diffDays(operationDate, byId.get(anchorId)!.referenceFinish);
  const ancestors = ancestorsFor(graph, anchorId);
  const span = (id: string) => Math.max(0, diffDays(result.tasks[id].finish, result.tasks[id].start));
  const latest: Record<string, number> = { [anchorId]: Math.max(dayNumber(byId.get(anchorId)!.referenceFinish), dayNumber(operationDate)) - span(anchorId) };
  for (const id of [...result.order].reverse()) {
    if (id === anchorId || !ancestors.has(id)) continue;
    const bounds = graph.outgoing.get(id)!.filter(edge => latest[edge.to] !== undefined).map(edge => {
      const weight = edge.type === 'FS' ? span(id) + 1 + edge.lag : edge.type === 'SS' ? edge.lag : edge.type === 'FF' ? span(id) - span(edge.to) + edge.lag : edge.lag - span(edge.to);
      return latest[edge.to] - weight;
    });
    if (bounds.length) latest[id] = Math.min(...bounds);
  }
  const tasks: Record<string, TaskResult> = {};
  for (const [id, task] of Object.entries(result.tasks)) {
    const slack = latest[id] === undefined ? null : latest[id] - dayNumber(task.start);
    tasks[id] = { ...task, slack, targetSlack: slack === null ? null : slack - operationDelay,
      criticality: slack === null ? 'outside' : slack <= 0 ? 'critical' : slack <= 14 ? 'near' : 'normal' };
  }
  return { ...result, tasks, operationDate, operationDelay,
    criticalCount: Object.values(tasks).filter(t => t.criticality === 'critical').length,
    nearCount: Object.values(tasks).filter(t => t.criticality === 'near').length };
}

function ancestorsFor(graph: ReturnType<typeof topology>, anchorId: string): Set<string> {
  const ancestors = new Set([anchorId]), stack = [anchorId];
  while (stack.length) for (const edge of graph.incoming.get(stack.pop()!)!) if (!ancestors.has(edge.from)) { ancestors.add(edge.from); stack.push(edge.from); }
  return ancestors;
}

// Iterative DFS also handles large portfolios without recursion depth limits.
function findCycle(plan: Plan): string[] {
  const outgoing = new Map(plan.tasks.map(task => [task.id, [] as string[]]));
  for (const edge of plan.dependencies) if (edge.active) outgoing.get(edge.from)!.push(edge.to);
  for (const task of plan.tasks) if (task.finishRule) outgoing.get(task.finishRule.anchorId)!.push(task.id);
  for (const pkg of plan.procurement) if (pkg.leadWeeks !== null && (pkg.trigger === 'PO 발행' || pkg.triggerDate)) outgoing.get(pkg.poTaskId)!.push(pkg.deliveryTaskId);
  const colors = new Map<string, number>();
  for (const task of plan.tasks) {
    if (colors.has(task.id)) continue;
    const stack = [{ id: task.id, cursor: 0 }]; colors.set(task.id, 1);
    while (stack.length) {
      const frame = stack[stack.length - 1], next = outgoing.get(frame.id)!;
      if (frame.cursor >= next.length) { colors.set(frame.id, 2); stack.pop(); continue; }
      const target = next[frame.cursor++];
      if (colors.get(target) === 1) { const index = stack.findIndex(f => f.id === target); return [...stack.slice(index).map(f => f.id), target]; }
      if (!colors.has(target)) { colors.set(target, 1); stack.push({ id: target, cursor: 0 }); }
    }
  }
  return [];
}

export function comparePortfolio(before: PortfolioResult, after: PortfolioResult): PortfolioComparison {
  const changes: PortfolioChange[] = [];
  for (const task of after.plan.tasks) {
    const ref = after.refs[task.id], previous = before.projects[ref.projectId]?.tasks[ref.taskId], next = after.projects[ref.projectId]?.tasks[ref.taskId];
    if (!previous || !next || previous.start === next.start && previous.finish === next.finish) continue;
    changes.push({ ...ref, name: task.name, wbs: JSON.parse(task.wbs)[1],
      before: { start: previous.start, finish: previous.finish }, after: { start: next.start, finish: next.finish },
      startDelta: diffDays(next.start, previous.start), finishDelta: diffDays(next.finish, previous.finish) });
  }
  const projects = Object.keys(after.projects).filter(id => before.projects[id]).map(projectId => ({
    projectId, name: after.names[projectId], beforeDate: before.projects[projectId].operationDate, afterDate: after.projects[projectId].operationDate,
    delay: diffDays(after.projects[projectId].operationDate, before.projects[projectId].operationDate), changedTasks: changes.filter(c => c.projectId === projectId).length,
  }));
  return { changes, projects, changedProjects: projects.filter(p => p.changedTasks > 0).length, changedTasks: changes.length };
}
