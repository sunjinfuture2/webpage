import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Plan, Preferences, ScheduleResult, Workspace } from './core/types';
import { readWorkspace, readWorkspaceById, writeWorkspace, assertWorkspace, remapWorkspaceProject } from './core/storage';
import { validatedPlan } from './core/commands';
import { isDay } from './core/dates';
import { restoreWorkspaceCommand } from './core/workspace-history';
import type { WorkspaceCommand } from './core/workspace-history';
import { switchWorkspaceScenario } from './core/workspace-scenarios';

const views = ['overview', 'gantt', 'calendar', 'tasks', 'procurement', 'gates', 'scenarios', 'evidence', 'network', 'portfolio'];
function entryView(): Preferences['view'] | null { const value = new URLSearchParams(window.location.search).get('view'); return value && views.includes(value) ? value as Preferences['view'] : null; }
export function requestedProjectId(hash: string): string | null {
  try { const match = hash.match(/^#\/projects\/([^/]+)\/schedule(?:\?|$)/); return match ? decodeURIComponent(match[1]) : null; }
  catch { return null; }
}
export function routeState(workspace: Workspace) {
  const hash = window.location.hash;
  if (!hash || hash === '#/') { const view = entryView(); return { workspace: view ? { ...workspace, preferences: { ...workspace.preferences, view } } : workspace, selectedId: null as string | null, warning: '' }; }
  const match = hash.match(/^#\/projects\/([^/]+)\/schedule(?:\?(.*))?$/);
  let projectId = '';
  try { projectId = match ? decodeURIComponent(match[1]) : ''; } catch { /* malformed URL -> safe saved workspace */ }
  if (!match || projectId !== workspace.projectId) return { workspace, selectedId: null, warning: '찾을 수 없는 프로젝트 경로입니다. 현재 작업공간을 열었습니다.' };
  const q = new URLSearchParams(match[2] || '');
  const v = q.get('view'), date = q.get('date'), selectedId = q.get('taskId'), scenarioId = q.get('scenarioId');
  let warning = '';
  if (v && !views.includes(v)) warning = '지원하지 않는 보기입니다. 기본 보기를 열었습니다.';
  if (date && !isDay(date)) warning = 'URL의 날짜를 확인해주세요. 저장된 날짜로 복구했습니다.';
  const requestedScenario = scenarioId && workspace.scenarios.some(p => p.id === scenarioId) ? scenarioId : workspace.activeId;
  let routed = workspace;
  if (requestedScenario !== workspace.activeId) {
    try { routed = switchWorkspaceScenario(workspace, requestedScenario); assertWorkspace(routed); }
    catch { routed = workspace; warning = '이 시나리오는 연결 프로젝트의 업무 참조와 호환되지 않습니다. 저장된 계획을 열었습니다.'; }
  }
  const activeId = routed.activeId;
  const selectedValid = selectedId && workspace.scenarios.find(p => p.id === activeId)?.tasks.some(t => t.id === selectedId);
  if (selectedId && !selectedValid) warning = '선택한 업무를 찾을 수 없습니다. 일정 화면에서 다시 선택해주세요.';
  return {
    workspace: { ...routed, preferences: { ...routed.preferences, ...(v && views.includes(v) ? { view: v as Preferences['view'] } : {}), ...(date && isDay(date) ? { date } : {}) } },
    selectedId: selectedValid ? selectedId : null, warning,
  };
}
export function syncRoute(w: Workspace, taskId?: string | null) {
  const q = new URLSearchParams({ view: w.preferences.view, date: w.preferences.date, scenarioId: w.activeId });
  if (taskId) q.set('taskId', taskId);
  const url = new URL(window.location.href); url.searchParams.delete('view'); url.hash = '/projects/' + encodeURIComponent(w.projectId) + '/schedule?' + q;
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const current = useRef<Workspace | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [needsImport, setNeedsImport] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'saving' | 'error'>('pending');
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const revision = useRef(0), computeRevision = useRef(0), saveSerial = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const blocked = useRef(false);
  const undoStack = useRef(new Map<string, WorkspaceCommand[]>()), redoStack = useRef(new Map<string, WorkspaceCommand[]>());
  const worker = useRef<Worker | null>(null);
  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  const setRoot = useCallback((next: Workspace) => { current.current = next; setWorkspace(next); setSaveState('pending'); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await readWorkspace(requestedProjectId(window.location.hash));
        if (!saved) { if (!cancelled) setNeedsImport(true); return; }
        const w = saved.workspace;
        assertWorkspace(w);
        if (cancelled) return;
        revision.current = saved?.revision || 0;
        const routed = routeState(w);
        setRoot(routed.workspace); setSelectedId(routed.selectedId);
        if (routed.warning) notify(routed.warning, true);
      } catch (e) { if (!cancelled) setLoadError(e instanceof Error ? e.message : '작업공간을 열지 못했습니다.'); }
    })();
    return () => { cancelled = true; };
  }, [notify, setRoot]);
  useEffect(() => {
    const w = new Worker(new URL('./core/engine.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = event => {
      if (event.data.revision !== computeRevision.current) return;
      setComputing(false);
      if (event.data.error) setComputeError(event.data.error);
      else { setResult(event.data.result); setComputeError(''); }
    };
    w.onerror = () => { setComputing(false); setComputeError('계산 Worker를 실행하지 못했습니다. 새로고침 후 다시 시도해주세요.'); };
    return () => { w.terminate(); worker.current = null; };
  }, []);
  const plan = workspace?.scenarios.find(p => p.id === workspace.activeId) || null;
  useEffect(() => {
    if (!plan || !worker.current) return;
    setComputing(true); setComputeError('');
    worker.current.postMessage({ revision: ++computeRevision.current, plan });
  }, [plan]);
  const enqueueSave = useCallback((w: Workspace) => {
    const serial = ++saveSerial.current;
    setSaveState('saving');
    saveQueue.current = saveQueue.current.then(async () => {
      if (blocked.current) return;
      try {
        revision.current = await writeWorkspace(w, revision.current);
        if (serial === saveSerial.current && current.current === w) { setSaveState('saved'); setSaveError(''); }
      } catch (e) {
        blocked.current = true; setSaveState('error');
        setSaveError(e instanceof Error ? e.message : '저장하지 못했습니다. 백업을 내보내 데이터를 보존해주세요.');
      }
    });
  }, []);
  useEffect(() => {
    if (!workspace) return;
    if (blocked.current) { setSaveState('error'); return; }
    const timer = setTimeout(() => enqueueSave(workspace), 350);
    return () => clearTimeout(timer);
  }, [workspace, enqueueSave]);
  useEffect(() => {
    if (!workspace) return;
    syncRoute(workspace, selectedId);
  }, [workspace?.projectId, workspace?.activeId, workspace?.preferences.view, workspace?.preferences.date, selectedId]);
  useEffect(() => {
    const onHash = async () => {
      if (!current.current) return;
      try {
        const hash = window.location.hash, requested = requestedProjectId(hash);
        if (requested && requested !== current.current.projectId && await readWorkspaceById(requested)) {
          if (window.location.hash !== hash) return;
          enqueueSave(current.current); await saveQueue.current;
          if (blocked.current) { syncRoute(current.current); notify('현재 변경을 저장하지 못해 작업공간을 전환하지 않았습니다.', true); return; }
          if (window.location.hash !== hash) return;
          const saved = await readWorkspaceById(requested);
          if (saved) {
            assertWorkspace(saved.workspace); revision.current = saved.revision;
            const next = routeState(saved.workspace);
            setResult(null); undoStack.current.clear(); redoStack.current.clear();
            syncRoute(next.workspace, next.selectedId); setRoot(next.workspace); setSelectedId(next.selectedId);
            if (next.warning) notify(next.warning, true);
            return;
          }
        }
        const next = routeState(current.current); syncRoute(next.workspace, next.selectedId); setRoot(next.workspace); setSelectedId(next.selectedId);
        if (next.warning) notify(next.warning, true);
      }
      catch { notify('URL 경로를 확인해주세요.', true); }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setRoot, notify, enqueueSave]);
  const commitWorkspace = useCallback((mutate: (draft: Workspace) => void, label: string) => {
    const w = current.current; if (!w) return false;
    try {
      const next = structuredClone(w);
      mutate(next);
      if (next.projectId !== w.projectId) throw new Error('작업공간의 프로젝트 ID는 편집할 수 없습니다.');
      const stamp = new Date().toISOString();
      const touchPlans = (after: Workspace, before?: Workspace) => {
        for (const p of after.scenarios) {
          const prior = before?.scenarios.find(s => s.id === p.id);
          if (prior && JSON.stringify(prior) !== JSON.stringify(p)) p.updatedAt = stamp;
        }
      };
      touchPlans(next, w);
      for (const entry of next.portfolio?.projects || []) touchPlans(entry.workspace, w.portfolio?.projects.find(p => p.id === entry.id)?.workspace);
      assertWorkspace(next);
      undoStack.current.set(w.activeId, [...(undoStack.current.get(w.activeId) || []).slice(-39), { before: w, after: next }]);
      redoStack.current.set(w.activeId, []);
      setRoot({ ...next, audit: [...w.audit.slice(-199), { at: stamp, scenarioId: next.activeId, label }] });
      setHistoryTick(x => x + 1); notify(label + ' · 반영했습니다');
      return true;
    } catch (e) { notify(e instanceof Error ? e.message : '변경을 적용하지 못했습니다.', true); return false; }
  }, [setRoot, notify]);
  const commit = useCallback((mutate: (draft: Plan) => void, label: string) => commitWorkspace(d => {
    const p = d.scenarios.find(p => p.id === d.activeId)!;
    const next = validatedPlan(p, mutate);
    d.scenarios = d.scenarios.map(s => s.id === p.id ? next : s);
  }, label), [commitWorkspace]);
  const travelHistory = useCallback((kind: 'undo' | 'redo') => {
    const w = current.current; if (!w) return;
    const p = w.scenarios.find(p => p.id === w.activeId)!;
    const from = kind === 'undo' ? undoStack : redoStack, to = kind === 'undo' ? redoStack : undoStack;
    const stack = from.current.get(p.id) || [], command = stack.at(-1); if (!command) return;
    let restored: Workspace;
    try {
      restored = restoreWorkspaceCommand(w, command, kind);
      restored = { ...restored, audit: [...w.audit.slice(-199), { at: new Date().toISOString(), scenarioId: p.id, label: kind === 'undo' ? '실행취소' : '다시실행' }] };
      assertWorkspace(restored);
    }
    catch (e) { notify(e instanceof Error ? e.message : '변경 이력을 복원하지 못했습니다.', true); return; }
    from.current.set(p.id, stack.slice(0, -1)); to.current.set(p.id, [...(to.current.get(p.id) || []).slice(-39), command]);
    setRoot(restored);
    setHistoryTick(x => x + 1);
  }, [setRoot, notify]);
  const preferences = useCallback((patch: Partial<Preferences>) => {
    if (current.current) setRoot({ ...current.current, preferences: { ...current.current.preferences, ...patch } });
  }, [setRoot]);
  const switchScenario = useCallback((id: string) => {
    if (current.current?.scenarios.some(p => p.id === id)) {
      const next = switchWorkspaceScenario(current.current, id);
      try { assertWorkspace(next); setRoot(next); setSelectedId(null); }
      catch (e) { notify(e instanceof Error ? e.message : '연결 프로젝트와 호환되지 않는 시나리오입니다.', true); }
    }
  }, [setRoot, notify]);
  const cloneScenario = useCallback((name: string) => {
    const w = current.current; if (!w) return;
    try {
      const p = structuredClone(w.scenarios.find(p => p.id === w.activeId)!);
      p.id = crypto.randomUUID(); p.name = name.trim() || '새 시나리오'; p.createdAt = new Date().toISOString(); p.updatedAt = p.createdAt;
      const next = switchWorkspaceScenario({ ...w, scenarios: [...w.scenarios, p] }, p.id);
      assertWorkspace(next); setRoot(next); notify('연결 프로젝트까지 복제한 독립 시나리오를 만들었습니다.');
    } catch (e) { notify(e instanceof Error ? e.message : '시나리오를 복제하지 못했습니다.', true); }
  }, [setRoot, notify]);
  const deleteScenario = useCallback((id: string) => {
    const w = current.current; if (!w || w.scenarios.length === 1 || id === 'base') return;
    const remaining = w.scenarios.filter(p => p.id !== id);
    const next = w.activeId === id ? switchWorkspaceScenario(w, remaining[0].id) : { ...w };
    next.scenarios = remaining;
    if (next.scenarioPortfolios) {
      next.scenarioPortfolios = { ...next.scenarioPortfolios };
      delete next.scenarioPortfolios[id];
    }
    try { assertWorkspace(next); setRoot(next); setSelectedId(null); }
    catch (e) { notify(e instanceof Error ? e.message : '연결 프로젝트와 호환되지 않는 시나리오입니다.', true); }
  }, [setRoot, notify]);
  const importWorkspace = useCallback(async (next: Workspace, mode: 'new' | 'replace') => {
    assertWorkspace(next); await saveQueue.current;
    if (mode === 'replace' && !current.current) throw new Error('교체할 작업공간을 먼저 열어주세요.');
    const foreignIds = new Set([next.portfolio, ...Object.values(next.scenarioPortfolios || {})].flatMap(bundle => bundle?.projects.map(p => p.id) || []));
    let nextId = mode === 'new' ? 'import-' + crypto.randomUUID() : current.current!.projectId;
    while (mode === 'new' && foreignIds.has(nextId)) nextId = 'import-' + crypto.randomUUID();
    const w = remapWorkspaceProject(next, nextId);
    if (!window.location.hash || window.location.hash === '#/') { const view = entryView(); if (view) w.preferences.view = view; }
    if (mode === 'new') revision.current = 0;
    blocked.current = false; setSaveError(''); undoStack.current.clear(); redoStack.current.clear();
    setSelectedId(null); setResult(null); setRoot(w); setNeedsImport(false); notify('파일을 검증하고 작업공간을 열었습니다.');
  }, [setRoot, notify]);
  const saveNow = useCallback(() => {
    if (current.current) { blocked.current = false; enqueueSave(current.current); }
  }, [enqueueSave]);
  const openWorkspace = useCallback(async (id: string) => {
    if (current.current) enqueueSave(current.current);
    await saveQueue.current;
    if (blocked.current) throw new Error('현재 변경을 저장하지 못했습니다. 백업 후 다시 시도해주세요.');
    const saved = await readWorkspaceById(id);
    if (!saved) throw new Error('저장된 작업공간을 찾을 수 없습니다.');
    assertWorkspace(saved.workspace); revision.current = saved.revision;
    setSelectedId(null); setResult(null); undoStack.current.clear(); redoStack.current.clear();
    setRoot(saved.workspace);
  }, [enqueueSave, setRoot]);
  const historyState = useMemo(() => ({
    canUndo: !!(plan && undoStack.current.get(plan.id)?.length),
    canRedo: !!(plan && redoStack.current.get(plan.id)?.length),
  }), [historyTick, plan?.id]);
  return { workspace, plan, result, selectedId, setSelectedId, computing, computeError, loadError, needsImport, saveError, saveState, toast, notify, commit, commitWorkspace, preferences, switchScenario, cloneScenario, deleteScenario, importWorkspace, openWorkspace, saveNow, undo: () => travelHistory('undo'), redo: () => travelHistory('redo'), ...historyState };
}
export type Controller = ReturnType<typeof useWorkspace>;
