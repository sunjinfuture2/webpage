import { describe, expect, it } from 'vitest';
import { switchWorkspaceScenario } from '../src/core/workspace-scenarios';
import { restoreWorkspaceCommand } from '../src/core/workspace-history';
import { assertWorkspace, remapWorkspaceProject } from '../src/core/storage';
import { backupText, parseBackup } from '../src/core/files';
import { workspace } from './fixtures';

function base() {
  const w = workspace(), foreign = workspace();
  w.portfolio = { schemaVersion: 1, projects: [{ id: 'B', name: '연결 B', workspace: foreign }], links: [
    { id: 'AB', from: { projectId: w.projectId, taskId: 'T1' }, to: { projectId: 'B', taskId: 'T2' }, type: 'FS', lag: 0, active: true },
  ] };
  const alternative = structuredClone(w.scenarios[0]); alternative.id = 'alternative'; alternative.name = '대안';
  w.scenarios.push(alternative);
  return w;
}

describe('scenario-owned connected projects', () => {
  it('clones connected inputs once and keeps both directions of switching independent', () => {
    const a = base(), aId = a.activeId;
    const b = switchWorkspaceScenario(a, 'alternative');
    b.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay = 8;
    b.portfolio!.links[0].lag = 3;
    expect(a.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay).toBe(0);
    const back = switchWorkspaceScenario(b, aId);
    expect(back.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay).toBe(0);
    expect(back.portfolio!.links[0].lag).toBe(0);
    back.portfolio!.links[0].lag = 1;
    const backToB = switchWorkspaceScenario(back, 'alternative');
    expect(backToB.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay).toBe(8);
    expect(backToB.portfolio!.links[0].lag).toBe(3);
    expect(() => assertWorkspace(backToB)).not.toThrow();
  });

  it('preserves an explicitly empty scenario instead of reusing another scenario bundle', () => {
    const a = base(), id = a.activeId;
    a.scenarioPortfolios = { alternative: null };
    const b = switchWorkspaceScenario(a, 'alternative');
    expect(b.portfolio).toBeUndefined();
    expect(switchWorkspaceScenario(b, id).portfolio).toEqual(a.portfolio);
  });

  it('round-trips each scenario bundle and remaps primary references in all of them', () => {
    const a = base(), b = switchWorkspaceScenario(a, 'alternative');
    b.portfolio!.links[0].lag = 4;
    const restored = parseBackup(backupText(b));
    const imported = remapWorkspaceProject(restored, 'new-primary');
    expect(imported.portfolio!.links[0].from.projectId).toBe('new-primary');
    expect(imported.scenarioPortfolios![a.activeId]!.links[0].from.projectId).toBe('new-primary');
    expect(switchWorkspaceScenario(imported, a.activeId).portfolio!.links[0].lag).toBe(0);
    expect(imported.portfolio!.links[0].lag).toBe(4);
  });

  it('validates inactive links against their own selected root plan', () => {
    const w = switchWorkspaceScenario(base(), 'alternative');
    const original = w.scenarios.find(p => p.id === 'synthetic')!;
    original.tasks = original.tasks.filter(t => t.id !== 'T1');
    expect(() => assertWorkspace(w)).toThrow('연결 대상');
    w.scenarioPortfolios!.unknown = null;
    expect(() => assertWorkspace(w)).toThrow();
  });

  it('undoes B without erasing later A changes or its connected snapshot', () => {
    const original = base(), aId = original.activeId;
    const before = switchWorkspaceScenario(original, 'alternative');
    const after = structuredClone(before);
    after.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay = 8;
    after.scenarios.find(p => p.id === 'alternative')!.tasks[0].delay = 2;
    // Controller commands clone the current root before applying input edits.
    const a = structuredClone(switchWorkspaceScenario(after, aId));
    a.scenarios.find(p => p.id === aId)!.tasks[0].primary = 'A만 변경';
    a.portfolio!.links[0].lag = 7;
    const currentB = switchWorkspaceScenario(a, 'alternative');
    const undoB = restoreWorkspaceCommand(currentB, { before, after }, 'undo');
    expect(undoB.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay).toBe(0);
    expect(undoB.scenarios.find(p => p.id === aId)!.tasks[0].primary).toBe('A만 변경');
    expect(undoB.scenarioPortfolios![aId]!.links[0].lag).toBe(7);
    const aAgain = switchWorkspaceScenario(undoB, aId);
    expect(aAgain.portfolio!.links[0].lag).toBe(7);
    expect(() => assertWorkspace(aAgain)).not.toThrow();
  });
});
