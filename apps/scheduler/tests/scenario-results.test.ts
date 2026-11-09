import { describe, expect, it } from 'vitest';
import { calculate } from '../src/core/engine';
import { calculatePortfolio } from '../src/core/portfolio';
import { portfolioProjects } from '../src/core/portfolio-workspace';
import { calculateWorkspaceScenarios } from '../src/core/scenario-results';
import { connectedDrivingPath, drivingPath, externalRelationsFor, resolveExternalDriver } from '../src/core/explain';
import { workspace } from './fixtures';
import type { Workspace } from '../src/core/types';

function connectedWorkspace(): Workspace {
  const root = workspace(), foreign = workspace(); foreign.projectId = 'linked'; foreign.source.sourceFile = '합성 설계.xlsx';
  foreign.scenarios[0].tasks[0].plannedStart = '2030-01-20'; foreign.scenarios[0].tasks[0].plannedFinish = '2030-01-22';
  root.portfolio = { schemaVersion: 1, projects: [{ id: 'linked', name: '합성 설계 프로젝트', workspace: foreign }], links: [{
    id: 'bridge', from: { projectId: 'linked', taskId: 'T1' }, to: { projectId: root.projectId, taskId: 'T1' }, type: 'FS', lag: 0, active: true,
  }] };
  return root;
}

describe('scenario and explanation consistency across connected views', () => {
  it('uses the connected forecast in scenario cards instead of the unconnected local result', () => {
    const w = connectedWorkspace(), result = calculateWorkspaceScenarios(w).get(w.activeId)!;
    expect(calculate(w.scenarios[0]).operationDate).toBe('2030-01-12');
    expect(result.result!.operationDate).toBe('2030-01-25');
    expect(result.result!.tasks).toEqual(calculatePortfolio(portfolioProjects(w), w.portfolio!.links).projects[w.projectId].tasks);
  });

  it('calculates each scenario with its own parked portfolio and preserves the active workspace', () => {
    const w = connectedWorkspace(), alternative = structuredClone(w.scenarios[0]); alternative.id = 'alternative'; w.scenarios.push(alternative);
    const bundle = structuredClone(w.portfolio!); bundle.projects[0].workspace.scenarios[0].tasks[0].delay = 7;
    w.scenarioPortfolios = { alternative: bundle };
    const original = JSON.stringify(w), results = calculateWorkspaceScenarios(w);
    expect(results.get(w.activeId)!.result!.operationDate).toBe('2030-01-25');
    expect(results.get('alternative')!.result!.operationDate).toBe('2030-02-01');
    expect(JSON.stringify(w)).toBe(original);
  });

  it('reports an unavailable scenario rather than fabricating an unconnected date', () => {
    const w = connectedWorkspace(), alternative = structuredClone(w.scenarios[0]); alternative.id = 'alternative';
    alternative.tasks = alternative.tasks.filter(task => task.id !== 'T1'); w.scenarios.push(alternative);
    const results = calculateWorkspaceScenarios(w);
    expect(results.get(w.activeId)!.result).not.toBeNull();
    expect(results.get('alternative')!.result).toBeNull();
    expect(results.get('alternative')!.error).toContain('찾을 수');
  });

  it('returns the complete representative path across project boundaries using readable local IDs', () => {
    const w = connectedWorkspace(), portfolio = calculatePortfolio(portfolioProjects(w), w.portfolio!.links);
    const path = connectedDrivingPath(w, portfolio);
    expect(path.map(step => [step.projectId, step.taskId])).toEqual([['linked', 'T1'], [w.projectId, 'T1']]);
    expect(path[0].projectName).toBe('합성 설계 프로젝트');
    expect(path.every(step => step.wbs === 'T1')).toBe(true);
    expect(path.at(-1)?.finish).toBe('2030-01-25');
  });

  it('resolves external driver IDs into source project and task names', () => {
    const w = connectedWorkspace();
    expect(resolveExternalDriver(w, 'external:bridge')).toMatchObject({ projectId: 'linked', taskId: 'T1', projectName: '합성 설계 프로젝트', wbs: 'T1', name: '합성 업무 T1', type: 'FS' });
    expect(resolveExternalDriver(w, 'external:missing')).toBeUndefined();
    expect(resolveExternalDriver(w, '관리 시작일')).toBeUndefined();
  });

  it('includes incoming and outgoing external relations only for the current project task', () => {
    const w = connectedWorkspace();
    w.portfolio!.links.push({ id: 'outgoing', from: { projectId: w.projectId, taskId: 'T1' }, to: { projectId: 'linked', taskId: 'T2' }, type: 'FF', lag: 0, active: false });
    expect(externalRelationsFor(w, 'T1').map(edge => edge.id)).toEqual(['bridge', 'outgoing']);
    expect(externalRelationsFor(w, 'T2')).toHaveLength(0);
  });

  it('formats negative binding lag without a misleading plus sign', () => {
    const w = workspace(), p = w.scenarios[0];
    p.dependencies.push({ id: 'edge', sourceId: 'synthetic', from: 'T1', to: 'T2', type: 'FS', lag: -2, active: true, condition: '' });
    const path = drivingPath(p, calculate(p), 'T2');
    expect(path.at(-1)?.cause).toBe('FS -2일');
  });
});
