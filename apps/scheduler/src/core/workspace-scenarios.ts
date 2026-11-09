import type { PortfolioBundle, Workspace } from './types';

/** Activate a scenario while keeping its connected plans and links independent. */
export function switchWorkspaceScenario(workspace: Workspace, id: string): Workspace {
  if (!workspace.scenarios.some(p => p.id === id)) throw new Error('전환할 시나리오를 찾을 수 없습니다.');
  if (id === workspace.activeId) return workspace;
  const parked: Record<string, PortfolioBundle | null> = Object.assign(Object.create(null), workspace.scenarioPortfolios || {});
  parked[workspace.activeId] = workspace.portfolio ? structuredClone(workspace.portfolio) : null;
  // Older v1 workspaces share only one bundle; initialize a missing scenario from that bundle once.
  const selected = Object.prototype.hasOwnProperty.call(parked, id) ? parked[id] : workspace.portfolio || null;
  delete parked[id];
  const next: Workspace = { ...workspace, activeId: id, scenarioPortfolios: parked };
  if (selected) next.portfolio = structuredClone(selected);
  else delete next.portfolio;
  return next;
}
