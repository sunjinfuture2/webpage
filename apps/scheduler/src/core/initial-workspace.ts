import type { SeedArchive } from './types';
import type { SavedWorkspace } from './storage';
import { assertWorkspace } from './storage';
import { workspaceFromSource } from './seed';

/** A saved workspace always wins; the bundled plan is only a first-visit seed. */
export async function startingWorkspace(saved: SavedWorkspace | undefined, loadSource: () => Promise<SeedArchive>): Promise<SavedWorkspace> {
  if (saved) { assertWorkspace(saved.workspace); return saved; }
  const workspace = workspaceFromSource(await loadSource());
  assertWorkspace(workspace);
  return { workspace, revision: 0 };
}

export async function loadInitialSource(): Promise<SeedArchive> {
  const response = await fetch(import.meta.env.BASE_URL + 'initial-schedule.json');
  if (!response.ok) throw new Error('기본 일정을 불러오지 못했습니다. 연결을 확인하고 다시 열어주세요.');
  return response.json();
}
