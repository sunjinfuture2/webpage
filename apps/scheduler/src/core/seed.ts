import type { Plan, SeedArchive, Workspace, Task, Procurement } from './types';
import { isDay } from './dates';

export function planFromSource(source: SeedArchive): Plan {
  if (!source || !Array.isArray(source.tasks) || !Array.isArray(source.dependencies) || !isDay(source.statusDate)) throw new Error('지원하는 일정 원본 형식이 아닙니다.');
  const tasks: Task[] = source.tasks.map((t, i) => ({
    id: t.id, wbs: t.sourceWbs, phase: t.phaseCode, phaseLabel: t.sourcePhase, name: t.name,
    order: i, kind: t.kind, referenceStart: t.importedReference.start, referenceFinish: t.importedReference.finish,
    plannedStart: t.importedReference.start, plannedFinish: t.importedReference.finish,
    delay: t.extraDelayCalendarDays ?? 0, actualStart: t.actualStart, actualFinish: t.actualFinish,
    remaining: t.remainingCalendarDays, progress: t.sourceProgressFraction, status: t.sourceStatus,
    primary: t.primaryAssignee, secondary: t.secondaryAssignee, headcount: t.headcount,
    roles: t.roleResponsibilities, criteria: t.acceptanceCriteria, conditions: t.commitmentAndOriginalStatus || '',
    evidence: t.evidenceNote || '', sourceRow: t.provenance.row, sourceSheet: t.provenance.sheet,
  }));
  const byWbs = new Map(tasks.map(t => [t.wbs, t]));
  for (const [wbs, months] of [['W8.7', 6], ['W8.8', 72]] as const) {
    const t = byWbs.get(wbs), anchor = byWbs.get('W7.8');
    if (t && anchor) t.finishRule = { anchorId: anchor.id, months };
  }
  const procurement: Procurement[] = source.procurementPackages.map((r, i) => {
    const c = r.sourceCells;
    const sequence = String(c.O || '').match(/W\d+\.\d+/g) || [];
    return {
      id: String(c.A), name: String(c.B), poTaskId: byWbs.get(String(c.E))?.id || '',
      deliveryTaskId: byWbs.get(sequence[3])?.id || '', installTaskId: byWbs.get(sequence[4])?.id || '',
      satTaskId: byWbs.get(sequence[5])?.id || '', delay: Number(c.R || 0),
      leadWeeks: c.K === undefined || c.K === null || c.K === '' ? null : Number(c.K),
      trigger: String(c.V || '미확정'), triggerDate: c.W ? String(c.W).slice(0, 10) : null,
      transport: Number(c.X || 0), commitment: String(c.Z || '미확약'),
      supplier: String(c.M || ''), evidence: String(c.AA || ''), sourceIndex: i,
    };
  });
  return {
    id: 'base', name: '기본 계획', statusDate: source.statusDate, powerRoute: '9800', tasks, procurement,
    dependencies: source.dependencies.map(l => ({ id: l.id, sourceId: l.sourceId, from: l.predecessorId, to: l.successorId, type: l.type, lag: l.lag, active: l.activeInBaseScenario, condition: l.conditionNote || '' })),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}
function tasksPhases(source: SeedArchive) { return source.tasks.map(t => t.phaseCode); }

export function workspaceFromSource(source: SeedArchive): Workspace {
  return {
    schemaVersion: 1, projectId: 'pangyo-aidc', source, scenarios: [planFromSource(source)], activeId: 'base',
    preferences: { view: 'gantt', date: source.statusDate, scale: 'month', collapsed: [...new Set(tasksPhases(source))], masterTree: true, fitTimeline: true, showReference: true, showLinks: true, gridWidth: 640 },
    audit: [],
  };
}
