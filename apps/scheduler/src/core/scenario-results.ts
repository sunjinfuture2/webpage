import type { Plan, ScheduleResult, Workspace } from './types';
import type { PortfolioResult } from './portfolio';
import { calculatePortfolio } from './portfolio';
import { calculate } from './engine';
import { portfolioProjects } from './portfolio-workspace';
import { switchWorkspaceScenario } from './workspace-scenarios';

export interface WorkspaceScenarioResult {
  plan: Plan; result: ScheduleResult | null; portfolio: PortfolioResult | null; error: string;
}

/** Scenario cards and comparisons use the same connected calculations as the master schedule. */
export function calculateWorkspaceScenarios(workspace: Workspace): Map<string, WorkspaceScenarioResult> {
  const results = new Map<string, WorkspaceScenarioResult>();
  for (const plan of workspace.scenarios) {
    try {
      const selected = switchWorkspaceScenario(workspace, plan.id);
      const portfolio = selected.portfolio ? calculatePortfolio(portfolioProjects(selected), selected.portfolio.links) : null;
      results.set(plan.id, { plan, portfolio, result: portfolio?.projects[selected.projectId] || calculate(plan), error: '' });
    } catch (error) {
      results.set(plan.id, { plan, portfolio: null, result: null, error: error instanceof Error ? error.message : '이 시나리오의 연결 일정을 계산하지 못했습니다.' });
    }
  }
  return results;
}
