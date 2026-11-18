import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { startingWorkspace } from '../src/core/initial-workspace';
import { calculate } from '../src/core/engine';
import { workspace } from './fixtures';

describe('first-visit schedule', () => {
  it('opens the bundled schedule with real relationships and baseline dates', async () => {
    const source = JSON.parse(readFileSync(new URL('../public/initial-schedule.json', import.meta.url), 'utf8'));
    const initial = await startingWorkspace(undefined, async () => source);
    const plan = initial.workspace.scenarios[0];
    expect(initial.revision).toBe(0);
    expect(plan.tasks).toHaveLength(233);
    expect(plan.dependencies).toHaveLength(511);
    expect(calculate(plan).operationDate).toBe('2028-09-28');
    expect(initial.workspace.preferences.collapsed).toHaveLength(8);
  });
  it('preserves saved edits, scenarios and storage revision without loading the default', async () => {
    const w = workspace(); w.scenarios[0].tasks[0].name = '저장한 편집';
    const saved = { workspace: w, revision: 17 }, load = vi.fn();
    expect(await startingWorkspace(saved, load)).toBe(saved);
    expect(load).not.toHaveBeenCalled();
  });
  it('reports invalid saved data rather than silently replacing it with defaults', async () => {
    const w = workspace(); w.activeId = 'missing';
    const load = vi.fn();
    await expect(startingWorkspace({ workspace: w, revision: 1 }, load)).rejects.toThrow();
    expect(load).not.toHaveBeenCalled();
  });
});
