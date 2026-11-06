import type { Plan, SeedArchive, Task, Workspace } from '../src/core/types';

// Synthetic data only; no source documents are included in the repository.
export function task(id: string, start = '2030-01-01', finish = '2030-01-02'): Task {
  return {
    id, wbs: id, phase: 'W1', phaseLabel: '시험 단계', name: '합성 업무 ' + id,
    order: 0, kind: 'task', referenceStart: start, referenceFinish: finish,
    plannedStart: start, plannedFinish: finish, delay: 0, actualStart: null, actualFinish: null,
    remaining: null, progress: null, status: '계획', primary: null, secondary: null, headcount: null,
    roles: { A: '', R: '', C: '' }, criteria: '', conditions: '', evidence: '', sourceRow: null, sourceSheet: '합성 시험',
  };
}
export function plan(): Plan {
  return {
    id: 'synthetic', name: '합성 시험 계획', statusDate: '2030-01-01', powerRoute: '9800',
    tasks: [task('T1', '2030-01-10', '2030-01-12'), { ...task('T2'), order: 1 }],
    dependencies: [], procurement: [], createdAt: '2030-01-01T00:00:00Z', updatedAt: '2030-01-01T00:00:00Z',
  };
}
export function workspace(): Workspace {
  const p = plan();
  const source: SeedArchive = {
    schemaVersion: 'synthetic-test', sourceFile: 'synthetic.xlsx', sourceSha256: 'synthetic-fixture', statusDate: p.statusDate,
    tasks: p.tasks.map((t, i) => ({
      id: t.id, sourceWbs: t.wbs, sourcePhase: t.phaseLabel, phaseCode: t.phase, name: t.name, kind: t.kind,
      importedReference: { start: t.referenceStart, finish: t.referenceFinish, durationCalendarDays: i === 0 ? 3 : 2 },
      importedForecast: { start: t.plannedStart, finish: t.plannedFinish, operationTotalSlackCalendarDays: null },
      roleResponsibilities: t.roles, primaryAssignee: null, secondaryAssignee: null, headcount: null,
      sourceProgressFraction: null, sourceStatus: t.status, acceptanceCriteria: '', extraDelayCalendarDays: null,
      actualStart: null, actualFinish: null, remainingCalendarDays: null, commitmentAndOriginalStatus: '',
      evidenceNote: null, sourceCalendarCondition: '', provenance: { fileSha256: 'synthetic-fixture', sheet: '합성 시험', row: i + 1 },
      sourceCells: {}, sourceFormulas: {},
    })),
    dependencies: [], procurementPackages: [], gates: [], responsibilityBoundaries: [], assumptionsAndReferences: [],
    sourceMappings: [], nvisScheduleReview: [], offtakers: [], commitmentReviews: [], sourceProjectSummary: [],
  };
  return { schemaVersion: 1, projectId: 'synthetic-workspace', source, scenarios: [p], activeId: p.id,
    preferences: { view: 'gantt', date: p.statusDate, scale: 'month', collapsed: [], showReference: true, showLinks: false, gridWidth: 640 }, audit: [] };
}
