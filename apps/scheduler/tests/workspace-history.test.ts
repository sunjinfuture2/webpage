import { describe, expect, it } from 'vitest';
import { restoreWorkspaceCommand } from '../src/core/workspace-history';
import { workspace } from './fixtures';

describe('scenario history with shared project snapshots', () => {
  it('undoes the selected scenario while preserving later edits in another scenario', () => {
    const before = workspace(), other = structuredClone(before.scenarios[0]);
    other.id = 'other'; before.scenarios.push(other);
    const after = structuredClone(before); after.scenarios[0].tasks[0].delay = 4;
    const current = structuredClone(after); current.scenarios[1].tasks[0].primary = '다른 시나리오 담당';
    current.preferences.view = 'network';
    const restored = restoreWorkspaceCommand(current, { before, after }, 'undo');
    expect(restored.scenarios[0].tasks[0].delay).toBe(0);
    expect(restored.scenarios[1].tasks[0].primary).toBe('다른 시나리오 담당');
    expect(restored.preferences.view).toBe('network');
    expect(current.scenarios[0].tasks[0].delay).toBe(4);
  });

  it('replays undo and redo without changing other scenarios', () => {
    const before = workspace(), other = structuredClone(before.scenarios[0]);
    other.id = 'other'; before.scenarios.push(other);
    const after = structuredClone(before); after.scenarios[0].tasks[0].delay = 4;
    const current = structuredClone(after); current.scenarios[1].tasks[0].delay = 8;
    const command = { before, after };
    const undo = restoreWorkspaceCommand(current, command, 'undo');
    const redo = restoreWorkspaceCommand(undo, command, 'redo');
    expect(redo.scenarios[0].tasks[0].delay).toBe(4);
    expect(redo.scenarios[1].tasks[0].delay).toBe(8);
  });

  it('restores connected inputs and links as one operation', () => {
    const before = workspace(), foreign = workspace();
    before.portfolio = { schemaVersion: 1, projects: [{ id: 'B', name: '합성 B', workspace: foreign }], links: [] };
    const after = structuredClone(before);
    after.scenarios[0].tasks[0].delay = 3;
    after.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay = 5;
    after.portfolio!.links.push({ id: 'cross', from: { projectId: before.projectId, taskId: 'T1' }, to: { projectId: 'B', taskId: 'T2' }, type: 'FS', lag: 0, active: true });
    const restored = restoreWorkspaceCommand(after, { before, after }, 'undo');
    expect(restored.scenarios[0].tasks[0].delay).toBe(0);
    expect(restored.portfolio!.projects[0].workspace.scenarios[0].tasks[0].delay).toBe(0);
    expect(restored.portfolio!.links).toHaveLength(0);
  });

  it('refuses to overwrite more recent shared portfolio edits', () => {
    const before = workspace(), after = structuredClone(before);
    after.portfolio = { schemaVersion: 1, projects: [], links: [] };
    const current = structuredClone(after);
    current.portfolio!.projects.push({ id: 'later', name: '다른 시나리오에서 추가', workspace: workspace() });
    expect(() => restoreWorkspaceCommand(current, { before, after }, 'undo')).toThrow('다른 시나리오');
    expect(current.portfolio!.projects).toHaveLength(1);
  });

  it('preserves a shared portfolio changed after a plan-only operation', () => {
    const before = workspace(), after = structuredClone(before);
    after.scenarios[0].tasks[0].delay = 4;
    const current = structuredClone(after);
    current.portfolio = { schemaVersion: 1, projects: [{ id: 'new', name: '나중 추가', workspace: workspace() }], links: [] };
    const restored = restoreWorkspaceCommand(current, { before, after }, 'undo');
    expect(restored.scenarios[0].tasks[0].delay).toBe(0);
    expect(restored.portfolio).toEqual(current.portfolio);
  });

  it('refuses a stale plan or another workspace before changing anything', () => {
    const before = workspace(), after = structuredClone(before);
    after.scenarios[0].tasks[0].delay = 4;
    const current = structuredClone(after); current.scenarios[0].tasks[0].delay = 9;
    expect(() => restoreWorkspaceCommand(current, { before, after }, 'undo')).toThrow('갱신');
    current.projectId = 'another-workspace';
    expect(() => restoreWorkspaceCommand(current, { before, after }, 'undo')).toThrow('다른 작업공간');
  });
});
