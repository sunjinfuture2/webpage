import type { Workspace, Plan } from './types';
import type { PortfolioProject } from './portfolio';

export function projectName(w: Workspace): string {
  return w.source.sourceFile.replace(/\.(xlsx|json)$/i, '').replace(/_/g, ' ');
}
export function portfolioProjects(w: Workspace, override?: Plan): PortfolioProject[] {
  const primary = override || w.scenarios.find(p => p.id === w.activeId)!;
  return [{ id: w.projectId, name: projectName(w), plan: primary }, ...(w.portfolio?.projects || []).map(p => ({ id: p.id, name: p.name, plan: p.workspace.scenarios.find(s => s.id === p.workspace.activeId)! }))];
}
export function portfolioSignature(w: Workspace): string {
  return JSON.stringify([w.activeId, w.scenarios.map(p => [p.id, p.updatedAt]), w.portfolio]);
}
