import type { Dependency, Issue, Plan, ScheduleResult, Task, TaskResult } from './types';
import { addMonths, dayNumber, fromDay, isDay } from './dates';

const integer = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n);
const nonnegative = (n: unknown) => integer(n) && (n as number) >= 0;

export function validatePlan(p: Plan): Issue[] {
  const issues: Issue[] = [];
  const error = (code: string, message: string, taskId?: string) => issues.push({ severity: 'error', code, message, taskId });
  if (!isDay(p.statusDate)) error('status-date', '상태일을 확인해주세요.');
  if (!Array.isArray(p.tasks) || p.tasks.length === 0 || p.tasks.length > 10000) return [{ severity: 'error', code: 'tasks', message: '업무는 1~10,000개여야 합니다.' }];
  const ids = new Set<string>(), wbs = new Set<string>();
  for (const t of p.tasks) {
    if (!t.id || ids.has(t.id) || !t.wbs || wbs.has(t.wbs)) error('duplicate', '업무 ID와 WBS는 중복될 수 없습니다.', t.id);
    ids.add(t.id); wbs.add(t.wbs);
    if (!t.name?.trim() || !t.phase) error('name', t.wbs + ': 업무명과 단계가 필요합니다.', t.id);
    if (!['task', 'milestone'].includes(t.kind)) error('kind', t.wbs + ': 작업유형을 확인해주세요.', t.id);
    if (t.finishRule && t.kind !== 'task') error('support-kind', t.wbs + ': 월 기준 지원기간은 일반 작업으로 유지해주세요.', t.id);
    if (![t.plannedStart, t.plannedFinish, t.referenceStart, t.referenceFinish].every(isDay)) error('date', t.wbs + ': 유효한 시작/완료일이 필요합니다.', t.id);
    else if (t.plannedFinish < t.plannedStart) error('range', t.wbs + ': 완료일이 시작일보다 빠릅니다.', t.id);
    else if (t.kind === 'milestone' && t.plannedFinish !== t.plannedStart) error('milestone', t.wbs + ': 마일스톤의 시작/완료일은 같아야 합니다.', t.id);
    if (!nonnegative(t.delay) || t.delay > 36500) error('delay', t.wbs + ': 추가지연은 0~36,500 정수일입니다.', t.id);
    if (t.remaining !== null && !nonnegative(t.remaining)) error('remaining', t.wbs + ': 잔여기간은 0 이상의 정수입니다.', t.id);
    if (t.progress !== null && (typeof t.progress !== 'number' || !Number.isFinite(t.progress) || t.progress < 0 || t.progress > 1)) error('progress', t.wbs + ': 진척률은 0~100% 또는 공란입니다.', t.id);
    if (t.headcount !== null && !nonnegative(t.headcount)) error('headcount', t.wbs + ': 투입인원을 확인해주세요.', t.id);
    if ((t.actualStart && !isDay(t.actualStart)) || (t.actualFinish && !isDay(t.actualFinish))) error('actual', t.wbs + ': 실제일을 확인해주세요.', t.id);
    if (t.actualFinish && !t.actualStart) error('actual-start', t.wbs + ': 실제 완료에는 실제 시작일이 필요합니다.', t.id);
    if (t.actualStart && t.actualFinish && t.actualFinish < t.actualStart) error('actual-order', t.wbs + ': 실제 완료일이 시작일보다 빠릅니다.', t.id);
    if (t.actualStart && !t.actualFinish && t.remaining === null) issues.push({ severity: 'warning', code: 'remaining-needed', taskId: t.id, message: t.wbs + ': 착수 업무의 잔여기간을 입력해주세요.' });
    if (t.status === '완료' && !t.actualFinish) issues.push({ severity: 'warning', code: 'finish-needed', taskId: t.id, message: t.wbs + ': 완료 상태의 실제 완료일이 없습니다.' });
  }
  const edgeIds = new Set<string>(), tuples = new Set<string>();
  for (const e of p.dependencies || []) {
    const key = [e.from, e.to, e.type].join(':');
    if (edgeIds.has(e.id) || tuples.has(key)) error('duplicate-link', '같은 선행·후행·유형의 관계가 중복됩니다.');
    edgeIds.add(e.id); tuples.add(key);
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) error('link-reference', e.sourceId + ': 선후행 업무를 확인해주세요.');
    if (!['FS', 'SS', 'FF', 'SF'].includes(e.type) || !integer(e.lag) || Math.abs(e.lag) > 36500) error('link-value', e.sourceId + ': 관계 유형과 정수 간격을 확인해주세요.');
  }
  for (const t of p.tasks) if (t.finishRule && (!ids.has(t.finishRule.anchorId) || t.finishRule.anchorId === t.id || !nonnegative(t.finishRule.months))) error('finish-rule', t.wbs + ': 지원 기산 업무를 확인해주세요.', t.id);
  const pkgIds = new Set<string>();
  for (const x of p.procurement || []) {
    if (pkgIds.has(x.id)) error('package-id', '조달 패키지 ID가 중복됩니다.');
    pkgIds.add(x.id);
    if (![x.poTaskId, x.deliveryTaskId, x.installTaskId, x.satTaskId].every(id => ids.has(id))) error('package-reference', x.name + ': 조달 연결 업무가 없습니다.');
    if (!nonnegative(x.delay) || !nonnegative(x.transport) || (x.leadWeeks !== null && (!Number.isFinite(x.leadWeeks) || x.leadWeeks < 0 || x.leadWeeks > 5200))) error('package-value', x.name + ': 지연·납기·운송일을 확인해주세요.');
    if (x.triggerDate && !isDay(x.triggerDate)) error('trigger-date', x.name + ': 기산조건 충족일을 확인해주세요.');
  }
  return issues;
}
export function topology(p: Plan): { order: string[]; incoming: Map<string, Dependency[]>; outgoing: Map<string, Dependency[]> } {
  const incoming = new Map(p.tasks.map(t => [t.id, [] as Dependency[]]));
  const outgoing = new Map(p.tasks.map(t => [t.id, [] as Dependency[]]));
  const degree = new Map(p.tasks.map(t => [t.id, 0]));
  const schedulingEdges = p.dependencies.filter(e => e.active);
  for (const t of p.tasks) if (t.finishRule && !schedulingEdges.some(e => e.from === t.finishRule!.anchorId && e.to === t.id)) {
    schedulingEdges.push({ id: 'rule:' + t.id, sourceId: '지원 기산', from: t.finishRule.anchorId, to: t.id, type: 'FS', lag: 0, active: true, condition: '' });
  }
  // Lead-time constraints also introduce a PO -> delivery scheduling edge.
  for (const x of p.procurement) if (x.leadWeeks !== null && (x.trigger === 'PO 발행' || x.triggerDate)) {
    schedulingEdges.push({ id: 'lead:' + x.id, sourceId: x.id, from: x.poTaskId, to: x.deliveryTaskId, type: 'SF', lag: Math.ceil(x.leadWeeks * 7) + x.transport, active: true, condition: '' });
  }
  for (const e of schedulingEdges) {
    incoming.get(e.to)!.push(e); outgoing.get(e.from)!.push(e);
    degree.set(e.to, degree.get(e.to)! + 1);
  }
  const queue = p.tasks.filter(t => degree.get(t.id) === 0).map(t => t.id);
  const order: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]; order.push(id);
    for (const e of outgoing.get(id)!) { degree.set(e.to, degree.get(e.to)! - 1); if (degree.get(e.to) === 0) queue.push(e.to); }
  }
  if (order.length !== p.tasks.length) throw new Error('순환 관계가 있습니다. 선후행 경로를 확인해주세요. 변경을 적용하지 않았습니다.');
  return { order, incoming, outgoing };
}
function offset(t: Task, status: number) {
  if (t.actualStart && t.actualFinish) return Math.max(0, dayNumber(t.actualFinish) - dayNumber(t.actualStart));
  if (t.remaining !== null) return (t.actualStart ? Math.max(0, status - dayNumber(t.actualStart)) : 0) + Math.max(0, t.remaining - 1);
  return t.kind === 'milestone' ? 0 : dayNumber(t.plannedFinish) - dayNumber(t.plannedStart);
}
export interface CalculateContext { statusDates?: Record<string, string> }
export function calculate(p: Plan, context: CalculateContext = {}): ScheduleResult {
  const begin = performance.now();
  const issues = validatePlan(p);
  const invalid = issues.find(i => i.severity === 'error');
  if (invalid) throw new Error(invalid.message);
  const { order, incoming, outgoing } = topology(p);
  const byId = new Map(p.tasks.map(t => [t.id, t]));
  const start: Record<string, number> = {}, finish: Record<string, number> = {}, spans: Record<string, number> = {}, drivers: Record<string, string[]> = {};
  const deliveries: Record<string, string | null> = {};
  const poDelays = new Map(p.procurement.map(x => [x.poTaskId, x.delay]));
  const packageByDelivery = new Map(p.procurement.map(x => [x.deliveryTaskId, x]));
  for (const id of order) {
    const status = dayNumber(context.statusDates?.[id] ?? p.statusDate);
    const t = byId.get(id)!, span = offset(t, status); spans[id] = span;
    const floors: Array<{ value: number; cause: string }> = [
      { value: dayNumber(t.plannedStart) + t.delay + (poDelays.get(id) || 0), cause: t.delay || poDelays.get(id) ? '추가지연·PO' : '관리 시작일' },
      { value: t.remaining !== null ? status : dayNumber(t.plannedStart), cause: '상태일·잔여기간' },
    ];
    for (const e of incoming.get(id)!) {
      if (e.id.startsWith('lead:')) continue;
      const required = e.type === 'FS' ? finish[e.from] + 1 + e.lag : e.type === 'SS' ? start[e.from] + e.lag : e.type === 'FF' ? finish[e.from] + e.lag - span : start[e.from] + e.lag - span;
      floors.push({ value: required, cause: e.id });
    }
    const pkg = packageByDelivery.get(id);
    if (pkg) {
      let delivery: number | null = null;
      if (pkg.leadWeeks !== null && (pkg.trigger === 'PO 발행' || pkg.triggerDate)) {
        const origin = pkg.trigger === 'PO 발행' ? start[pkg.poTaskId] : Math.max(start[pkg.poTaskId], dayNumber(pkg.triggerDate!));
        delivery = origin + Math.ceil(pkg.leadWeeks * 7) + pkg.transport;
        floors.push({ value: delivery - span, cause: '납기:' + pkg.id });
      }
      deliveries[pkg.id] = delivery === null ? null : fromDay(delivery);
    }
    const earliest = Math.max(...floors.map(f => f.value));
    start[id] = t.actualStart ? dayNumber(t.actualStart) : earliest;
    drivers[id] = floors.filter(f => f.value === earliest).map(f => f.cause);
    finish[id] = t.actualFinish ? dayNumber(t.actualFinish) : t.finishRule ? dayNumber(addMonths(fromDay(finish[t.finishRule.anchorId]), t.finishRule.months)) : start[id] + span;
  }
  const anchor = p.tasks.find(t => t.wbs === 'W8.6') || p.tasks.reduce((a, b) => finish[a.id] > finish[b.id] ? a : b);
  const target = dayNumber(anchor.referenceFinish), operationDelay = finish[anchor.id] - target;
  const ancestors = new Set([anchor.id]), stack = [anchor.id];
  while (stack.length) for (const e of incoming.get(stack.pop()!)!) if (!ancestors.has(e.from)) { ancestors.add(e.from); stack.push(e.from); }
  const latest: Record<string, number> = { [anchor.id]: Math.max(target, finish[anchor.id]) - spans[anchor.id] };
  for (const id of [...order].reverse()) {
    if (!ancestors.has(id) || id === anchor.id) continue;
    const bounds = outgoing.get(id)!.filter(e => latest[e.to] !== undefined).map(e => {
      const weight = e.type === 'FS' ? spans[id] + 1 + e.lag : e.type === 'SS' ? e.lag : e.type === 'FF' ? spans[id] - spans[e.to] + e.lag : e.lag - spans[e.to];
      return latest[e.to] - weight;
    });
    if (bounds.length) latest[id] = Math.min(...bounds);
  }
  for (const e of p.dependencies.filter(e => e.active)) {
    const gap = e.type === 'FS' ? start[e.to] - finish[e.from] - 1 - e.lag : e.type === 'SS' ? start[e.to] - start[e.from] - e.lag : e.type === 'FF' ? finish[e.to] - finish[e.from] - e.lag : finish[e.to] - start[e.from] - e.lag;
    if (gap < 0) issues.push({ severity: 'warning', code: 'relationship-violation', linkId: e.id, taskId: e.to, message: byId.get(e.to)!.wbs + ': ' + e.sourceId + ' 관계를 실제일이 ' + Math.abs(gap) + '일 위반합니다.' });
  }
  if (p.powerRoute === '5000') issues.push({ severity: 'warning', code: 'power-route', message: '5,000kW 축소안은 IT부하·BOQ·사업성·일정 재승인 전입니다. 기본 경로 날짜를 유효한 예측으로 사용할 수 없습니다.' });
  const tasks: Record<string, TaskResult> = {};
  for (const t of p.tasks) {
    const slack = latest[t.id] === undefined ? null : latest[t.id] - start[t.id];
    tasks[t.id] = {
      id: t.id, start: fromDay(start[t.id]), finish: fromDay(finish[t.id]),
      duration: t.kind === 'milestone' ? 0 : finish[t.id] - start[t.id] + 1,
      slack, targetSlack: slack === null ? null : slack - operationDelay,
      criticality: slack === null ? 'outside' : slack <= 0 ? 'critical' : slack <= 14 ? 'near' : 'normal',
      delta: finish[t.id] - dayNumber(t.referenceFinish), drivers: drivers[t.id],
    };
  }
  return {
    planId: p.id, planVersion: p.updatedAt,
    tasks, order, operationDate: fromDay(finish[anchor.id]), operationDelay, operationValid: p.powerRoute === '9800',
    criticalCount: Object.values(tasks).filter(t => t.criticality === 'critical').length,
    nearCount: Object.values(tasks).filter(t => t.criticality === 'near').length,
    changedCount: Object.values(tasks).filter(t => t.delta !== 0).length,
    issues, computedAtMs: performance.now() - begin, deliveries,
  };
}
