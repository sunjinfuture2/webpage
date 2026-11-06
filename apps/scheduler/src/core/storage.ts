import { openDB } from 'idb';
import type { Workspace } from './types';
import { calculate } from './engine';
import { isDay } from './dates';

export interface SavedWorkspace { revision: number; workspace: Workspace }
const database = () => openDB('sunjin-schedule-v1', 1, {
  upgrade(db) { db.createObjectStore('workspaces'); db.createObjectStore('settings'); },
});
export async function readWorkspace(requestedId?: string | null): Promise<SavedWorkspace | undefined> {
  const db = await database();
  if (requestedId) {
    const requested = await db.get('workspaces', requestedId);
    if (requested) return requested;
  }
  const key = await db.get('settings', 'lastProject') || 'pangyo-aidc';
  return db.get('workspaces', key);
}
export async function readWorkspaceById(id: string): Promise<SavedWorkspace | undefined> {
  return (await database()).get('workspaces', id);
}
export async function listWorkspaces(): Promise<Array<{ id: string; file: string; updatedAt: string }>> {
  const records = await (await database()).getAll('workspaces') as SavedWorkspace[];
  return records.map(({ workspace: w }) => ({ id: w.projectId, file: w.source.sourceFile, updatedAt: w.scenarios.find(s => s.id === w.activeId)?.updatedAt || '' }));
}
export async function writeWorkspace(workspace: Workspace, expectedRevision: number): Promise<number> {
  const db = await database();
  const tx = db.transaction(['workspaces', 'settings'], 'readwrite');
  const previous = await tx.objectStore('workspaces').get(workspace.projectId) as SavedWorkspace | undefined;
  if ((previous?.revision || 0) !== expectedRevision) {
    tx.abort();
    await tx.done.catch(() => {});
    throw new Error('다른 탭에서 이 작업공간을 수정했습니다. 백업을 내보낸 후 새로고침해주세요.');
  }
  const revision = expectedRevision + 1;
  await tx.objectStore('workspaces').put({ workspace, revision }, workspace.projectId);
  await tx.objectStore('settings').put(workspace.projectId, 'lastProject');
  await tx.done;
  return revision;
}
export function assertWorkspace(value: unknown): asserts value is Workspace {
  const w = value as Workspace;
  if (!w || w.schemaVersion !== 1 || typeof w.projectId !== 'string' || !Array.isArray(w.scenarios) || !w.scenarios.length || w.scenarios.length > 50) throw new Error('지원하는 SUNJIN 일정 백업(v1)이 아닙니다.');
  if (!w.source || typeof w.source.sourceFile !== 'string' || !Array.isArray(w.source.tasks) || !Array.isArray(w.source.dependencies)) throw new Error('원본 출처 데이터가 없는 백업입니다.');
  for (const name of ['gates', 'procurementPackages', 'commitmentReviews', 'assumptionsAndReferences', 'responsibilityBoundaries', 'sourceMappings', 'nvisScheduleReview', 'offtakers'] as const) {
    if (!Array.isArray(w.source[name]) || w.source[name].some(r => !r || !r.fields || !r.sourceCells || !r.provenance)) throw new Error('업무대장 원본 형식을 확인해주세요: ' + name);
  }
  const ids = new Set<string>();
  for (const p of w.scenarios) {
    if (!p?.id || typeof p.name !== 'string' || ids.has(p.id) || !Array.isArray(p.dependencies) || !Array.isArray(p.procurement)) throw new Error('시나리오 구조를 확인해주세요.');
    ids.add(p.id);
    calculate(p);
    for (const t of p.tasks) if (!t.roles || !Number.isFinite(t.order) || typeof t.criteria !== 'string' || typeof t.evidence !== 'string' || typeof t.conditions !== 'string') throw new Error('업무 속성 형식을 확인해주세요.');
  }
  if (!ids.has(w.activeId) || !w.preferences || !Array.isArray(w.preferences.collapsed) || !Array.isArray(w.audit)) throw new Error('작업공간 상태를 확인해주세요.');
  if (!['gantt', 'calendar', 'tasks', 'procurement', 'gates', 'scenarios', 'evidence'].includes(w.preferences.view) || !['week', 'month', 'quarter', 'year'].includes(w.preferences.scale) || !Number.isFinite(w.preferences.gridWidth) || w.preferences.gridWidth < 300 || w.preferences.gridWidth > 1200) throw new Error('보기 설정을 확인해주세요.');
  if (!isDay(w.preferences.date) || w.preferences.collapsed.some(x => typeof x !== 'string') || (w.preferences.calendarMode !== undefined && !['month', 'week'].includes(w.preferences.calendarMode))) throw new Error('보기 날짜와 달력 설정을 확인해주세요.');
}
