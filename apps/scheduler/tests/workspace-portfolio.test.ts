import { describe, expect, it } from 'vitest';
import { assertWorkspace, remapWorkspaceProject } from '../src/core/storage';
import { backupText, makeXlsx, parseBackup, importFile } from '../src/core/files';
import { calculate } from '../src/core/engine';
import { workspace } from './fixtures';
import type { Workspace } from '../src/core/types';

function connectedWorkspace(): Workspace {
  const w = workspace(), foreign = workspace();
  foreign.projectId = 'imported-original-id';
  w.portfolio = {
    schemaVersion: 1,
    projects: [{ id: 'project-B', name: '합성 연결 프로젝트', workspace: foreign }],
    links: [{ id: 'cross-edge', from: { projectId: w.projectId, taskId: 'T1' }, to: { projectId: 'project-B', taskId: 'T2' }, type: 'FS', lag: 0, active: true }],
  };
  return w;
}

describe('backward-compatible workspace portfolio extension', () => {
  it('reads an existing v1 workspace and the new saved view names without migration loss', () => {
    const w = workspace();
    expect(() => assertWorkspace(w)).not.toThrow();
    w.preferences.view = 'network';
    expect(() => assertWorkspace(w)).not.toThrow();
    w.preferences.view = 'portfolio';
    expect(parseBackup(backupText(w))).toEqual(w);
  });

  it('preserves linked projects, nullable fields and links through JSON', () => {
    const w = connectedWorkspace();
    expect(() => assertWorkspace(w)).not.toThrow();
    const restored = parseBackup(backupText(w));
    expect(restored).toEqual(w);
    expect(restored.portfolio!.projects[0].workspace.scenarios[0].tasks[0].primary).toBeNull();
  });

  it('reidentifies an imported root and all primary endpoints without changing its input or foreign identities', () => {
    const w = connectedWorkspace(), before = JSON.stringify(w);
    const imported = remapWorkspaceProject(w, 'new-root');
    expect(imported.projectId).toBe('new-root');
    expect(imported.portfolio!.links[0].from.projectId).toBe('new-root');
    expect(imported.portfolio!.links[0].to.projectId).toBe('project-B');
    expect(imported.portfolio!.projects[0].workspace.projectId).toBe('imported-original-id');
    expect(JSON.stringify(w)).toBe(before);
    expect(() => remapWorkspaceProject(w, 'project-B')).toThrow('ID');
  });

  it('rejects missing linked tasks and cycles spanning two projects', () => {
    const w = connectedWorkspace();
    w.portfolio!.links[0].to.taskId = 'missing';
    expect(() => assertWorkspace(w)).toThrow();
    const cycle = connectedWorkspace();
    cycle.portfolio!.links.push({ id: 'reverse', from: { projectId: 'project-B', taskId: 'T2' }, to: { projectId: cycle.projectId, taskId: 'T1' }, type: 'SS', lag: 0, active: true });
    expect(() => assertWorkspace(cycle)).toThrow('순환');
  });

  it('rejects duplicate project identities and recursive portfolio bundles', () => {
    const duplicate = connectedWorkspace();
    duplicate.portfolio!.projects[0].id = duplicate.projectId;
    expect(() => assertWorkspace(duplicate)).toThrow('ID');
    const nested = connectedWorkspace();
    nested.portfolio!.projects[0].workspace.portfolio = { schemaVersion: 1, projects: [], links: [] };
    expect(() => assertWorkspace(nested)).toThrow('중첩');
  });

  it('round-trips the complete linked bundle through the XLSX backup', async () => {
    const w = connectedWorkspace(), p = w.scenarios[0];
    const bytes = await makeXlsx(w, p, calculate(p));
    expect(await importFile(new File([bytes], 'linked-workspace.xlsx'))).toEqual(w);
  }, 15000);
});
