import type { PortfolioLink } from './portfolio';

export type Day = string;
export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';
export type View = 'overview' | 'gantt' | 'calendar' | 'tasks' | 'procurement' | 'gates' | 'scenarios' | 'evidence' | 'network' | 'portfolio';
export type SourceRecord = {
  provenance: { fileSha256: string; sheet: string; row: number };
  fields: Record<string, string | number | null>;
  sourceCells: Record<string, string | number | null>;
};
export interface SeedArchive {
  schemaVersion: string;
  sourceFile: string;
  sourceSha256: string;
  statusDate: Day;
  tasks: SeedTask[];
  dependencies: Array<{ id: string; sourceId: string; predecessorId: string; successorId: string; type: LinkType; lag: number; activeInBaseScenario: boolean; conditionNote: string }>;
  procurementPackages: SourceRecord[];
  gates: SourceRecord[];
  responsibilityBoundaries: SourceRecord[];
  assumptionsAndReferences: SourceRecord[];
  sourceMappings: SourceRecord[];
  nvisScheduleReview: SourceRecord[];
  offtakers: SourceRecord[];
  commitmentReviews: SourceRecord[];
  sourceProjectSummary: Array<{ row: number; values: Record<string, unknown>; raw: Record<string, unknown> }>;
}
export interface SeedTask {
  id: string; sourceWbs: string; sourcePhase: string; phaseCode: string; name: string;
  kind: 'task' | 'milestone';
  importedReference: { start: Day; finish: Day; durationCalendarDays: number };
  importedForecast: { start: Day; finish: Day; operationTotalSlackCalendarDays: number | null };
  roleResponsibilities: { A: string; R: string; C: string };
  primaryAssignee: string | null; secondaryAssignee: string | null; headcount: number | null;
  sourceProgressFraction: number | null; sourceStatus: string;
  acceptanceCriteria: string; extraDelayCalendarDays: number | null;
  actualStart: Day | null; actualFinish: Day | null; remainingCalendarDays: number | null;
  commitmentAndOriginalStatus: string; evidenceNote: string | null; sourceCalendarCondition: string;
  provenance: SourceRecord['provenance'];
  sourceCells: SourceRecord['sourceCells']; sourceFormulas: Record<string, string>;
}
export interface Task {
  id: string; wbs: string; phase: string; phaseLabel: string; name: string;
  order: number; kind: 'task' | 'milestone';
  referenceStart: Day; referenceFinish: Day; plannedStart: Day; plannedFinish: Day;
  delay: number; actualStart: Day | null; actualFinish: Day | null; remaining: number | null;
  progress: number | null; status: string; primary: string | null; secondary: string | null;
  headcount: number | null; roles: { A: string; R: string; C: string };
  criteria: string; conditions: string; evidence: string;
  sourceRow: number | null; sourceSheet: string;
  finishRule?: { anchorId: string; months: number };
}
export interface Dependency {
  id: string; sourceId: string; from: string; to: string; type: LinkType;
  lag: number; active: boolean; condition: string;
}
export interface Procurement {
  id: string; name: string; poTaskId: string; deliveryTaskId: string; installTaskId: string; satTaskId: string;
  delay: number; leadWeeks: number | null; trigger: string; triggerDate: Day | null;
  transport: number; commitment: string; supplier: string; evidence: string; sourceIndex: number;
}
export interface Plan {
  id: string; name: string; statusDate: Day; powerRoute: '9800' | '5000';
  tasks: Task[]; dependencies: Dependency[]; procurement: Procurement[];
  createdAt: string; updatedAt: string;
}
export interface Preferences {
  view: View; date: Day; scale: 'week' | 'month' | 'quarter' | 'year';
  collapsed: string[]; showReference: boolean; showLinks: boolean; gridWidth: number;
  calendarMode?: 'month' | 'week';
}
export interface PortfolioBundle {
  schemaVersion: 1;
  projects: Array<{ id: string; name: string; workspace: Workspace }>;
  links: PortfolioLink[];
}
export interface Workspace {
  schemaVersion: 1; projectId: string; source: SeedArchive;
  scenarios: Plan[]; activeId: string; preferences: Preferences;
  audit: Array<{ at: string; scenarioId: string; label: string }>;
  /** Optional extension: old v1 backups remain valid; imported projects are owned snapshots. */
  portfolio?: PortfolioBundle;
  /** Inactive scenario snapshots. The active scenario always uses portfolio above. */
  scenarioPortfolios?: Record<string, PortfolioBundle | null>;
}
export interface Issue { severity: 'error' | 'warning'; code: string; message: string; taskId?: string; linkId?: string }
export interface TaskResult {
  id: string; start: Day; finish: Day; duration: number; slack: number | null; targetSlack: number | null;
  criticality: 'critical' | 'near' | 'normal' | 'outside'; delta: number;
  drivers: string[];
}
export interface ScheduleResult {
  planId: string; planVersion: string;
  tasks: Record<string, TaskResult>; order: string[];
  operationDate: Day; operationDelay: number; operationValid: boolean;
  criticalCount: number; nearCount: number; changedCount: number;
  issues: Issue[]; computedAtMs: number;
  deliveries: Record<string, Day | null>;
}
