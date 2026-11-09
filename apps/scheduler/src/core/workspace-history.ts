import type { Workspace } from './types';

export interface WorkspaceCommand { before: Workspace; after: Workspace }
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Replay only this command's changes, preserving edits made in other scenarios. */
export function restoreWorkspaceCommand(current: Workspace, command: WorkspaceCommand, direction: 'undo' | 'redo'): Workspace {
  const expected = direction === 'undo' ? command.after : command.before;
  const target = direction === 'undo' ? command.before : command.after;
  if (current.projectId !== expected.projectId) throw new Error('다른 작업공간의 변경 이력은 적용할 수 없습니다.');
  const before = new Map(command.before.scenarios.map(p => [p.id, p]));
  const after = new Map(command.after.scenarios.map(p => [p.id, p]));
  const changed = new Set([...before.keys(), ...after.keys()].filter(id => !equal(before.get(id), after.get(id))));
  for (const id of changed) {
    if (!equal(current.scenarios.find(p => p.id === id), expected.scenarios.find(p => p.id === id))) throw new Error('이 업무 계획이 다른 변경으로 갱신됐습니다. 최근 변경한 시나리오에서 먼저 실행취소해주세요.');
  }
  const portfolioChanged = !equal(command.before.portfolio, command.after.portfolio);
  if (portfolioChanged && !equal(current.portfolio, expected.portfolio)) throw new Error('연결 프로젝트가 다른 시나리오에서 변경됐습니다. 최근 변경한 시나리오에서 먼저 실행취소해주세요.');
  const sourceChanged = !equal(command.before.source, command.after.source);
  if (sourceChanged && !equal(current.source, expected.source)) throw new Error('원본 출처가 변경되어 이력을 적용할 수 없습니다.');
  const targetPlans = new Map(target.scenarios.map(p => [p.id, p]));
  const scenarios = current.scenarios.filter(p => !changed.has(p.id) || targetPlans.has(p.id)).map(p => changed.has(p.id) ? targetPlans.get(p.id)! : p);
  for (const p of target.scenarios) if (changed.has(p.id) && !scenarios.some(s => s.id === p.id)) scenarios.push(p);
  const result: Workspace = {
    ...current, scenarios,
    activeId: scenarios.some(p => p.id === current.activeId) ? current.activeId : target.activeId,
    source: sourceChanged ? target.source : current.source,
  };
  if (portfolioChanged) {
    if (target.portfolio === undefined) delete result.portfolio;
    else result.portfolio = target.portfolio;
  }
  return result;
}
