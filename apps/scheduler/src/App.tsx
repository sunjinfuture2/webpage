import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesGantt, Check, ChevronDown, ChevronRight, CircleHelp, Copy, Download, FileJson, FileSpreadsheet, FileText, Flag, GitBranch, HardDrive, Layers, ListTodo, LoaderCircle, Menu, MoreHorizontal, Network, FolderKanban, Package, PanelLeftClose, PanelLeftOpen, Plus, Redo2, Search, Settings2, ShieldCheck, Target, Trash2, Undo2, Upload, X } from 'lucide-react';
import { useWorkspace } from './useWorkspace';
import type { Plan, Preferences, ScheduleResult, View, Workspace } from './core/types';
import { calculate } from './core/engine';
import { newTask, removeTasks, validatedPlan } from './core/commands';
import { addDays, shortDate, today } from './core/dates';
import { exportBackup, exportCSV, exportXlsx, importFile } from './core/files';
import { listWorkspaces } from './core/storage';
import { Gantt, type DependencyChange } from './components/Gantt';
import { NetworkView } from './components/NetworkView';
import { PortfolioView } from './components/PortfolioView';
import { calculatePortfolio, comparePortfolio, type PortfolioComparison } from './core/portfolio';
import { portfolioProjects, portfolioSignature } from './core/portfolio-workspace';
import { CalendarView } from './components/Calendar';
import { TaskDrawer } from './components/TaskDrawer';
import { TaskList, ProcurementView, GatesView, EvidenceView, ScenariosView } from './components/Views';
import { Badge, ErrorText, Loading, Modal } from './components/UI';
import { Welcome } from './components/Welcome';
import { QuickFind } from './components/QuickFind';
import { TaskFocus } from './components/TaskFocus';
import { ScheduleImpact } from './components/ScheduleImpact';
import { traceTaskIds } from './core/schedule-navigation';

const titles: Record<View, [string, string]> = {
  overview: ['전체 개요', '단계와 승인 지점을 보고, 필요한 업무로 바로 들어가세요.'],
  network: ['업무 관계도', '연결의 흐름을 따라가며 일정의 결정 원인을 확인합니다.'],
  portfolio: ['프로젝트 연결', '서로 다른 프로젝트의 선후행 관계와 변경 영향을 함께 봅니다.'],
  gantt: ['마스터 일정', '단계를 펼쳐 세부 업무를 보고, 같은 시간축에서 일정을 관리하세요.'],
  calendar: ['캘린더', '업무와 주요 게이트를 날짜별로 확인하세요.'],
  tasks: ['업무·책임', '업무별 관리 일정과 담당을 정리합니다.'],
  procurement: ['외부설비 조달', '발주부터 납품·설치·SAT까지 연결합니다.'],
  gates: ['승인게이트', '일정과 실제 승인 요건을 함께 확인합니다.'],
  scenarios: ['지연·시나리오', '원본 계획을 보존하며 가능성을 비교합니다.'],
  evidence: ['근거·확약', '전제와 확인사항을 원본 출처까지 추적합니다.'],
};
export default function App() {
  const base = useWorkspace();
  const [draftDirty, setDraftDirty] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null | undefined>(undefined);
  const selectTask = useCallback((action: Parameters<typeof base.setSelectedId>[0]) => {
    const id = typeof action === 'function' ? action(base.selectedId) : action;
    if (draftDirty && id !== base.selectedId) setPendingTaskId(id);
    else base.setSelectedId(id);
  }, [draftDirty, base.selectedId, base.setSelectedId]);
  const connected = useMemo(() => {
    if (!base.workspace || !base.plan || (!base.workspace.portfolio && base.workspace.preferences.view !== 'portfolio')) return { result: null, error: '' };
    try { return { result: calculatePortfolio(portfolioProjects(base.workspace), base.workspace.portfolio?.links || []), error: '' }; }
    catch (e) { return { result: null, error: e instanceof Error ? e.message : '연결 일정을 계산하지 못했습니다.' }; }
  }, [base.plan, base.workspace?.portfolio, base.workspace?.projectId, base.workspace?.source.sourceFile, base.workspace?.preferences.view === 'portfolio']);
  const c = { ...base, setSelectedId: selectTask, result: connected.result?.projects[base.workspace?.projectId || ''] || base.result, computeError: connected.error || base.computeError };

  const [sidebar, setSidebar] = useState(() => window.innerWidth >= 900), [query, setQuery] = useState(''), [phase, setPhase] = useState('all'), [filter, setFilter] = useState('all');
  const [checked, setChecked] = useState(new Set<string>());
  const [quickFind, setQuickFind] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusDirection, setFocusDirection] = useState<'nearby' | 'both' | 'before' | 'after'>('nearby');
  const focusReturn = useRef<{ query: string; phase: string; filter: string; date: string; fitTimeline?: boolean; scale: Preferences['scale'] } | null>(null);
  const [showCalendarFilters, setShowCalendarFilters] = useState(false);
  const [calendarDetail, setCalendarDetail] = useState<{ projectId: string; taskId: string } | null>(null);
  const [modal, setModal] = useState<'export' | 'settings' | 'help' | 'issues' | 'bulk' | 'delete' | 'workspaces' | null>(null);
  const [savedSpaces, setSavedSpaces] = useState<Array<{ id: string; file: string; updatedAt: string }>>([]);
  const [busy, setBusy] = useState('');
  const [incoming, setIncoming] = useState<Workspace | null>(null);
  const [importMode, setImportMode] = useState<'new' | 'replace'>('new');
  const [settingsDate, setSettingsDate] = useState(''), [settingsPower, setSettingsPower] = useState<'9800' | '5000'>('9800');
  const [bulkDelay, setBulkDelay] = useState(0), [bulkOwner, setBulkOwner] = useState('');
  const [proposal, setProposal] = useState<{ taskId: string; plan: Plan; result: ScheduleResult; oldVersion: string; mode: 'move' | 'resize'; delta: number; comparison?: PortfolioComparison; signature: string; projectId: string } | null>(null);
  const inputFile = useRef<HTMLInputElement>(null), search = useRef<HTMLInputElement>(null);
  const { workspace: w, plan: p, result: r } = c;
  const view = w?.preferences.view === 'overview' ? 'gantt' : w?.preferences.view || 'gantt';
  const notify = c.notify;
  useEffect(() => {
    if (!w || !p) return;
    if (!w.preferences.masterTree) {
      const selectedPhase = p.tasks.find(t => t.id === c.selectedId)?.phase;
      c.preferences({ masterTree: true, fitTimeline: true, collapsed: [...new Set(p.tasks.map(t => t.phase))].filter(id => id !== selectedPhase), ...(w.preferences.view === 'overview' ? { view: 'gantt' } : {}) });
    } else if (w.preferences.view === 'overview') c.preferences({ view: 'gantt' });
  }, [w?.projectId, w?.preferences.masterTree, w?.preferences.view, p?.id]);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 899px)');
    const resize = () => { if (narrow.matches) setSidebar(false); };
    narrow.addEventListener('change', resize); return () => narrow.removeEventListener('change', resize);
  }, []);
  useEffect(() => { setFocusId(null); setQuickFind(false); focusReturn.current = null; }, [w?.projectId, p?.id]);
  const focusIds = useMemo(() => p && focusId && p.tasks.some(t => t.id === focusId) ? traceTaskIds(focusId, p.dependencies, focusDirection) : null, [p, focusId, focusDirection]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!document.querySelector('[aria-modal="true"], .task-drawer')) setQuickFind(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); c.saveNow(); }
      if (editing || draftDirty || document.querySelector('[aria-modal="true"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) c.redo(); else c.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); c.redo(); }
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [c.saveNow, c.undo, c.redo, draftDirty]);
  const tasks = useMemo(() => {
    if (!p || !r) return [];
    const q = query.toLowerCase().trim();
    return p.tasks.filter(t => {
      const x = r.tasks[t.id];
      return x && (!focusIds || focusIds.has(t.id)) && (phase === 'all' || t.phase === phase) &&
        (!q || [t.wbs, t.name, t.primary || '', t.roles.R].join(' ').toLowerCase().includes(q)) &&
        (filter === 'all' || filter === 'critical' && x.criticality === 'critical' || filter === 'near' && x.criticality === 'near' || filter === 'unassigned' && !t.primary || filter === 'milestones' && t.kind === 'milestone' || filter === 'changed' && x.delta !== 0);
    });
  }, [p, r, query, phase, filter, focusIds]);
  const onCheck = useCallback((id: string) => setChecked(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; }), []);
  const onSelect = useCallback((id: string, extend = false) => { if (extend) onCheck(id); else c.setSelectedId(id); }, [c.setSelectedId, onCheck]);
  const propose = useCallback((taskId: string, delta: number, mode: 'move' | 'resize') => {
    if (!c.plan) return;
    try {
      const next = validatedPlan(c.plan, d => {
        const task = d.tasks.find(t => t.id === taskId)!;
        if (mode === 'move') task.plannedStart = addDays(task.plannedStart, delta);
        task.plannedFinish = addDays(task.plannedFinish, delta);
      });
      const after = c.workspace?.portfolio ? calculatePortfolio(portfolioProjects(c.workspace, next), c.workspace.portfolio.links) : null;
      setProposal({ taskId, signature: portfolioSignature(c.workspace!), projectId: c.workspace!.projectId, plan: next, result: after?.projects[c.workspace!.projectId] || calculate(next), oldVersion: c.plan.updatedAt, mode, delta, comparison: after && connected.result ? comparePortfolio(connected.result, after) : undefined });
    } catch (e) { notify(e instanceof Error ? e.message : '일정을 변경할 수 없습니다.', true); }
  }, [c.plan, c.workspace, connected.result, notify]);
  const changeDependency = (intent: DependencyChange) => c.commit(d => {
    if (intent.kind === 'delete') d.dependencies = d.dependencies.filter(e => e.id !== intent.id);
    else if (intent.kind === 'create') d.dependencies.push(intent.dependency);
    else d.dependencies = d.dependencies.map(e => e.id === intent.dependency.id ? intent.dependency : e);
  }, intent.kind === 'delete' ? '관계 삭제' : '선후행 관계 변경');
  const changeView = (next: View) => { if (next === 'overview') next = 'gantt'; setFocusId(null); focusReturn.current = null; c.preferences({ view: next }); setQuery(''); setPhase('all'); setFilter('all'); setChecked(new Set()); if (window.innerWidth < 900) setSidebar(false); };
  const enterFocus = (id: string) => {
    const task = p?.tasks.find(t => t.id === id); if (!task || !r || !w) return;
    if (!focusId) { focusReturn.current = { query, phase, filter, date: w.preferences.date, fitTimeline: w.preferences.fitTimeline, scale: w.preferences.scale }; setFocusDirection('nearby'); }
    setFocusId(id); setQuery(''); setPhase('all'); setFilter('all'); setChecked(new Set());
    c.preferences({ view: 'gantt', date: r.tasks[id].start, fitTimeline: false, scale: 'month', showLinks: true, collapsed: w.preferences.collapsed.filter(x => x !== task.phase) });
    if (window.innerWidth < 900) setSidebar(false);
  };
  const closeFocus = () => {
    setFocusId(null);
    const previous = focusReturn.current;
    if (previous) { setQuery(previous.query); setPhase(previous.phase); setFilter(previous.filter); c.preferences({ date: previous.date, fitTimeline: previous.fitTimeline, scale: previous.scale }); }
    focusReturn.current = null;
  };
  const pickFile = async (file?: File) => {
    if (!file) return;
    setBusy('가져올 파일을 검증하고 있습니다');
    try { const next = await importFile(file); setIncoming(next); setImportMode('new'); }
    catch (e) { notify(e instanceof Error ? e.message : '파일을 가져오지 못했습니다.', true); }
    finally { setBusy(''); if (inputFile.current) inputFile.current.value = ''; }
  };
  const addTask = () => {
    if (!p) return;
    const task = newTask(p, phase === 'all' ? 'W1' : phase);
    if (c.commit(d => d.tasks.push(task), task.wbs + ' 업무 추가')) { setQuery(''); setFilter('all'); c.setSelectedId(task.id); c.preferences({ collapsed: w!.preferences.collapsed.filter(x => x !== task.phase) }); }
  };
  const openSettings = () => { if (!p) return; setSettingsDate(p.statusDate); setSettingsPower(p.powerRoute); setModal('settings'); };
  const doExport = async (type: 'backup' | 'xlsx' | 'tasks' | 'dependencies') => {
    if (!w || !p || !r) return;
    if (connected.error) { notify(connected.error, true); return; }
    if (c.computing || r.planId !== p.id || r.planVersion !== p.updatedAt) { notify('일정 계산이 완료된 후 내보내주세요.'); return; }
    try {
      setBusy(type === 'xlsx' ? '엑셀 파일을 작성하고 있습니다' : '백업 파일을 준비하고 있습니다');
      if (type === 'backup') exportBackup(w);
      else if (type === 'xlsx') await exportXlsx(w, p, r);
      else exportCSV(p, r, type);
      notify('다운로드 파일을 만들었습니다.');
    } catch (e) { notify(e instanceof Error ? e.message : '내보내기에 실패했습니다.', true); }
    finally { setBusy(''); }
  };
  if (c.loadError) return <div className="startup-error"><AlertCircle size={30} /><h1>작업공간을 열지 못했습니다</h1><p>{c.loadError}</p><p className="muted">브라우저의 로컬 저장소 사용 권한을 확인해주세요. 기존 저장 데이터는 삭제하지 않았습니다.</p><button className="button primary" onClick={() => location.reload()}>다시 열기</button></div>;
  if (c.needsImport) return <Welcome onOpen={next => c.importWorkspace(next, 'new')} />;
  if (!w || !p || !r) return <Loading text={c.computeError || '일정 작업공간을 준비하고 있습니다'} />;
  const phases = [...new Map(p.tasks.map(t => [t.phase, t.phaseLabel])).entries()].sort(([a], [b]) => a.localeCompare(b));
  const navigation = [
    { view: 'gantt' as const, icon: ChartNoAxesGantt, title: '마스터 일정', count: null },
    { view: 'network' as const, icon: Network, title: '업무 관계도', count: null },
    { view: 'portfolio' as const, icon: FolderKanban, title: '프로젝트 연결', count: w.portfolio?.projects.length || null },
    { view: 'calendar' as const, icon: CalendarDays, title: '캘린더', count: null },
    { view: 'tasks' as const, icon: ListTodo, title: '업무·책임', count: p.tasks.length },
    { view: 'procurement' as const, icon: Package, title: '외부설비 조달', count: p.procurement.length },
    { view: 'gates' as const, icon: ShieldCheck, title: '승인게이트', count: w.source.gates.length },
    { view: 'scenarios' as const, icon: GitBranch, title: '지연·시나리오', count: w.scenarios.length },
    { view: 'evidence' as const, icon: BookOpen, title: '근거·확약', count: null },
  ];
  const unassigned = p.tasks.filter(t => !t.primary).length;
  const statusLabel = ({ saved: '이 기기에 저장됨', saving: '저장 중', pending: '변경 저장 대기', error: '저장 확인 필요' })[c.saveState];
  return <div className={'app-shell ' + (['overview', 'gantt', 'calendar', 'tasks'].includes(view) ? 'master-schedule ' : '') + 'view-is-' + view + ' ' + (!sidebar ? 'sidebar-closed' : '')}>
    {sidebar && <button className="sidebar-backdrop" aria-label="탐색 닫기" onClick={() => setSidebar(false)} />}
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol"><i /><i /><i /></div><div><strong>SUNJIN<span> Schedule</span></strong><small>AIDC PROJECT MANAGEMENT</small></div><button className="icon-button sidebar-collapse" aria-label="탐색 접기" onClick={() => setSidebar(false)}><PanelLeftClose size={17} /></button></div>
      <button className="project-switch" aria-label="작업공간 선택" onClick={async () => { try { setSavedSpaces(await listWorkspaces()); setModal('workspaces'); } catch { notify('저장된 작업공간 목록을 읽지 못했습니다.', true); } }}><div className="project-symbol">P</div><div><strong>판교 AIDC</strong><span title={w.source.sourceFile}>{w.source.sourceFile}</span></div><ChevronDown size={12} className="muted" /></button>
      <div className="nav-label">일정 관리</div>
      <nav aria-label="일정관리 메뉴">{navigation.map(({ view: id, icon: Icon, title, count }, i) => <div key={id}>{i === 5 && <div className="nav-label second">프로젝트 관리</div>}<button className={'nav-item ' + (view === id ? 'active' : '')} aria-current={view === id ? 'page' : undefined} onClick={() => changeView(id)}><Icon size={17} strokeWidth={1.65} /><span>{title}</span>{count !== null && <small>{count}</small>}{view === id && <span className="nav-active-dot" />}</button></div>)}</nav>
      <div className="sidebar-bottom">
        <div className="scenario-selector"><label htmlFor="active-scenario"><GitBranch size={13} />작업 시나리오</label><div className="select-wrap"><select id="active-scenario" aria-label="작업 시나리오" value={p.id} onChange={e => c.switchScenario(e.target.value)}>{w.scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ChevronDown size={13} /></div></div>
        <div className="sidebar-tools"><button onClick={() => inputFile.current?.click()}><Upload size={15} />가져오기</button><button onClick={() => setModal('export')}><Download size={15} />내보내기</button></div>
        <div className="local-caption"><HardDrive size={13} /><span>독립 작업공간 · 로컬 저장</span><button aria-label="앱 도움말" onClick={() => setModal('help')}><CircleHelp size={14} /></button></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs">{!sidebar && <button className="icon-button" aria-label="탐색 펼치기" onClick={() => setSidebar(true)}><PanelLeftOpen size={18} /></button>}<span className="breadcrumb-root">프로젝트</span><ChevronRight size={13} /><span className="project-crumb"><i />판교 AIDC</span><ChevronRight size={13} /><strong>{titles[view][0]}</strong></div><div className="topbar-actions"><button className="quick-trigger" title="빠른 찾기 · Ctrl/⌘ K" aria-label="빠른 찾기" disabled={!!c.selectedId} onClick={() => setQuickFind(true)}><Search size={14} /><span>빠른 찾기</span><kbd>⌘ K</kbd></button><button className={'save-status ' + c.saveState} onClick={c.saveNow} title="지금 저장 · Ctrl+S">{c.saveState === 'saving' ? <LoaderCircle className="spin" size={12} /> : <span />}{statusLabel}</button><div className="topbar-divider" /><button className="icon-button" aria-label="실행취소" title="실행취소 · Ctrl+Z" disabled={!c.canUndo || draftDirty} onClick={c.undo}><Undo2 size={17} /></button><button className="icon-button" aria-label="다시실행" title="다시실행 · Ctrl+Shift+Z" disabled={!c.canRedo || draftDirty} onClick={c.redo}><Redo2 size={17} /></button><button className="icon-button" aria-label="프로젝트 설정" onClick={openSettings}><Settings2 size={17} /></button></div></header>
      {c.saveError && <div className="error-banner" role="alert"><AlertCircle size={15} /><span>{c.saveError}</span><button onClick={() => doExport('backup')}>백업 내보내기</button><button onClick={c.saveNow}>다시 저장</button></div>}
      {c.computeError && <div className="error-banner" role="alert"><AlertCircle size={15} />{c.computeError}</div>}
      <section className="page-heading"><div><div className="eyebrow">PANGYO AIDC · MASTER PLAN</div><h1>{['overview', 'gantt', 'calendar', 'tasks'].includes(view) ? '프로젝트 마스터 일정' : titles[view][0]}<span className="title-slash">/</span><span className="title-project">판교</span></h1><p>{titles[view][1]}</p></div><div className="heading-actions"><button className="button" onClick={() => setModal('export')} disabled={c.computing}><ArrowDownToLine size={15} />내보내기</button><button className="button primary" onClick={addTask}><Plus size={16} />새 업무</button></div></section>
      <section className={'project-summary ' + (!r.operationValid ? 'invalid-prediction' : '')} aria-label="일정 계산 요약"><div className="operation-summary"><div className="summary-icon"><Target size={17} /></div><div><span>{r.operationValid ? '조건부 운영개시 예상' : '축소안 재승인 필요 · 예측 적용 보류'}</span><strong data-testid="operation-date">{shortDate(r.operationDate)}</strong></div><Badge kind={r.operationDelay > 0 || !r.operationValid ? 'warning' : 'green'}>{r.operationDelay > 0 ? '목표 대비 +' + r.operationDelay + '일' : '관리목표 유지'}</Badge></div><div className="summary-divider" /><button className="summary-metric" onClick={() => { changeView('gantt'); setFilter('critical'); }}><span className="red-dot" /><span>크리티컬</span><b data-testid="critical-count">{r.criticalCount}</b></button><button className="summary-metric" onClick={() => { changeView('gantt'); setFilter('near'); }}><span className="amber-dot" /><span>근접 업무</span><b>{r.nearCount}</b></button><button className="summary-metric unassigned" onClick={() => { changeView('tasks'); setFilter('unassigned'); }}><span>담당 미지정</span><b>{unassigned}</b></button><div className="summary-spacer" /><button className="status-date-button" onClick={openSettings}><CalendarDays size={13} /><span>상태일</span><b>{shortDate(p.statusDate)}</b></button></section>
      {!r.operationValid && <div className="condition-banner"><AlertCircle size={14} />5,000kW 축소안의 용량·설비·사업성·일정 재승인 전입니다. 표시 일자는 기본경로의 참고 계산입니다.</div>}
      {w.portfolio?.links.some(l => l.active) && view !== 'portfolio' && <button className="external-schedule-note" onClick={() => changeView('portfolio')}><GitBranch size={13} />프로젝트 간 {w.portfolio.links.filter(l => l.active).length}개 관계를 반영한 일정 · 연결과 영향을 확인하세요<ArrowRight size={12} /></button>}<div className="work-area">
        <div className="view-toolbar"><div className="view-tabs" aria-label="일정 보기">{([['gantt', ChartNoAxesGantt, '마스터 일정'], ['tasks', ListTodo, '업무 목록'], ['calendar', CalendarDays, '캘린더'], ['network', Network, '관계도'], ['portfolio', FolderKanban, '프로젝트 연결']] as const).map(([id, Icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => changeView(id)}><Icon size={15} />{label}</button>)}</div><div className="toolbar-spacer" />{view === 'calendar' && <button className="master-filter-toggle" aria-label="캘린더 필터" aria-expanded={showCalendarFilters} onClick={() => setShowCalendarFilters(v => !v)}>필터{phase !== 'all' || filter !== 'all' ? ' · 적용 중' : ''}<ChevronDown size={12} /></button>}<label className="search-box"><Search size={15} /><input ref={search} aria-label="업무 검색" placeholder={view === 'evidence' ? '근거 검색' : '업무 검색'} value={query} onChange={e => { setFocusId(null); setQuery(e.target.value); }} />{query && <button type="button" aria-label="검색 지우기" onClick={() => setQuery('')}><X size={13} /></button>}</label></div>
        {['gantt', 'tasks', 'calendar'].includes(view) && (view !== 'calendar' || showCalendarFilters) && <div className="filter-toolbar"><div className="row gap-8"><select aria-label="단계 필터" value={phase} onChange={e => { setFocusId(null); setPhase(e.target.value); }}><option value="all">전체 단계</option>{phases.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select aria-label="업무 필터" value={filter} onChange={e => { setFocusId(null); setFilter(e.target.value); }}><option value="all">모든 업무</option><option value="critical">크리티컬</option><option value="near">근접 업무 · 14일 이내</option><option value="unassigned">담당 미지정</option><option value="milestones">마일스톤</option><option value="changed">일정 변동</option></select>{checked.size > 0 && <div className="bulk-tools"><b>{checked.size}개 선택</b><button onClick={() => setModal('bulk')}>일괄 수정</button><button aria-label="선택 업무 삭제" onClick={() => setModal('delete')}><Trash2 size={13} /></button><button aria-label="선택 해제" onClick={() => setChecked(new Set())}><X size={13} /></button></div>}</div><div className="row gap-12 filter-right">
          {view === 'gantt' && <><label className="check-label"><input type="checkbox" checked={w.preferences.showReference} onChange={e => c.preferences({ showReference: e.target.checked })} />참조계획</label><select aria-label="간트 축척" value={w.preferences.fitTimeline ? 'fit' : w.preferences.scale} onChange={e => c.preferences(e.target.value === 'fit' ? { fitTimeline: true } : { scale: e.target.value as 'month', fitTimeline: false })}><option value="fit">전체 기간 맞춤</option><option value="week">일 단위</option><option value="month">주 단위</option><option value="quarter">월 단위</option><option value="year">분기 단위</option></select><button className="text-button" onClick={() => c.preferences({ date: p.statusDate, fitTimeline: false })}>상태일</button><button className="text-button" onClick={() => { c.preferences({ date: r.operationDate, fitTimeline: false }); }}>운영개시<ArrowRight size={12} /></button></>}
          {view !== 'gantt' && <span className="muted small">{tasks.length}개 업무</span>}
        </div></div>}
        {view === 'gantt' && focusIds && focusId && <TaskFocus plan={p} result={r} id={focusId} direction={focusDirection} count={focusIds.size} onDirection={setFocusDirection} onFocus={enterFocus} onOpen={() => c.setSelectedId(focusId)} onClose={closeFocus} />}
        <div className={'view-body view-' + view} aria-busy={c.computing}>
          {view === 'gantt' && <Gantt key={w.projectId + ":" + p.id} plan={p} result={r} tasks={tasks} preferences={w.preferences} selectedId={c.selectedId || (focusIds ? focusId : null)} onFocusTask={enterFocus} gateTaskIds={p.tasks.filter(t => w.source.gates.some(g => g.fields['연결 WBS'] === t.wbs)).map(t => t.id)} checked={checked} forceExpand={!!focusIds || !!query || filter !== 'all' || phase !== 'all'} onSelect={onSelect} onCheck={onCheck} onPreferences={c.preferences} onPropose={propose} onDependencyChange={changeDependency} onRevealTask={id => { const task = p.tasks.find(t => t.id === id); setQuery(''); setPhase('all'); setFilter('all'); c.setSelectedId(id); if (task) c.preferences({ collapsed: w.preferences.collapsed.filter(x => x !== task.phase), date: r.tasks[id].start }); }} />}
          {view === 'network' && <NetworkView key={w.projectId + ":" + p.id} plan={p} result={r} selectedId={c.selectedId} onSelect={c.setSelectedId} onRevealTask={enterFocus} onDependencyChange={changeDependency} />}
          {view === 'portfolio' && connected.result && <PortfolioView key={w.projectId + ":" + p.id} workspace={w} result={connected.result} onCommit={c.commitWorkspace} onSelectTask={c.setSelectedId} />}
          {view === 'tasks' && <TaskList controller={c} tasks={tasks} checked={checked} onCheck={onCheck} />}
          {view === 'calendar' && <CalendarView plan={p} result={r} tasks={tasks} preferences={w.preferences} onPreferences={c.preferences} onSelect={c.setSelectedId} currentProjectId={w.projectId} projects={[{ id: w.projectId, name: /판교/.test(w.source.sourceFile) ? '판교 AI 데이터센터' : '현재 프로젝트', plan: { ...p, tasks }, result: r, gateTaskIds: p.tasks.filter(t => w.source.gates.some(g => g.fields['연결 WBS'] === t.wbs)).map(t => t.id) }, ...(connected.result ? w.portfolio?.projects || [] : []).map(entry => { const plan = entry.workspace.scenarios.find(s => s.id === entry.workspace.activeId)!; const q = query.trim().toLowerCase(); return { id: entry.id, name: entry.name, plan: { ...plan, tasks: plan.tasks.filter(t => (!q || (t.wbs + ' ' + t.name + ' ' + (t.primary || '')).toLowerCase().includes(q)) && (phase === 'all' || t.phase === phase) && (filter === 'all' || filter === 'milestones' && t.kind === 'milestone' || filter === 'unassigned' && !t.primary || filter === 'critical' && connected.result?.projects[entry.id].tasks[t.id].criticality === 'critical' || filter === 'near' && connected.result?.projects[entry.id].tasks[t.id].criticality === 'near' || filter === 'changed' && connected.result?.projects[entry.id].tasks[t.id].delta !== 0)) }, result: connected.result!.projects[entry.id], gateTaskIds: plan.tasks.filter(t => entry.workspace.source.gates.some(g => g.fields['연결 WBS'] === t.wbs)).map(t => t.id) }; })]} onSelectProjectTask={(projectId, taskId) => { if (projectId === w.projectId) c.setSelectedId(taskId); else setCalendarDetail({ projectId, taskId }); }} />}
          {view === 'procurement' && <ProcurementView controller={c} query={query} />}
          {view === 'gates' && <GatesView controller={c} query={query} />}
          {view === 'evidence' && <EvidenceView controller={c} query={query} />}
          {view === 'scenarios' && <ScenariosView controller={c} />}
        </div>
      </div>
      <footer className="app-footer"><span>조건부 관리안 · 공급·납기·인력 확약 전</span><button onClick={() => setModal('issues')}><AlertCircle size={12} />{r.issues.length ? r.issues.length + '개 확인사항' : '연결 조건 충족'}<ChevronRight size={11} /></button><span>{c.computing ? '일정 재계산 중…' : '달력일 기준 · ' + r.computedAtMs.toFixed(0) + 'ms'}</span></footer>
    </div>
    {calendarDetail && (() => { const entry = w.portfolio?.projects.find(p => p.id === calendarDetail.projectId), plan = entry?.workspace.scenarios.find(p => p.id === entry.workspace.activeId), task = plan?.tasks.find(t => t.id === calendarDetail.taskId), value = connected.result?.projects[calendarDetail.projectId]?.tasks[calendarDetail.taskId]; if (!entry || !plan || !task || !value) return null; return <Modal title={entry.name} onClose={() => setCalendarDetail(null)}><div className="modal-body calendar-project-detail"><Badge>{task.wbs}</Badge><h3>{task.name}</h3><dl className="definition-list"><dt>예상 시작</dt><dd>{shortDate(value.start)}</dd><dt>예상 완료</dt><dd>{shortDate(value.finish)}</dd><dt>계획</dt><dd>{plan.name}</dd><dt>주 담당</dt><dd>{task.primary || '미지정'}</dd></dl><p className="hint">현재 시나리오에 연결한 프로젝트 사본의 계산 결과입니다.</p></div><div className="modal-footer"><button className="button" onClick={() => setCalendarDetail(null)}>닫기</button><button className="button primary" onClick={() => { setCalendarDetail(null); changeView('portfolio'); }}>프로젝트 연결에서 보기<ArrowRight size={13} /></button></div></Modal>; })()}
    {quickFind && <QuickFind tasks={p.tasks} onClose={() => setQuickFind(false)} onTask={enterFocus} onView={changeView} onAdd={addTask} />}
    {c.selectedId && <TaskDrawer controller={c} onDirtyChange={setDraftDirty} onClose={() => base.setSelectedId(null)} />}
    {pendingTaskId !== undefined && <Modal title="적용하지 않은 변경사항이 있습니다" onClose={() => setPendingTaskId(undefined)}><div className="modal-body"><p>수정 중인 내용을 버리고 다른 업무로 이동할까요?</p></div><div className="modal-footer"><button className="button" onClick={() => setPendingTaskId(undefined)}>계속 수정</button><button className="button primary" onClick={() => { setDraftDirty(false); base.setSelectedId(pendingTaskId); setPendingTaskId(undefined); }}>변경 버리고 이동</button></div></Modal>}
    <input ref={inputFile} className="sr-only" type="file" aria-label="일정 파일 가져오기" accept=".json,.xlsx" onChange={e => pickFile(e.target.files?.[0])} />
    {c.toast && <div className={'toast ' + (c.toast.error ? 'toast-error' : '')} role={c.toast.error ? 'alert' : 'status'}>{c.toast.error ? <AlertCircle size={16} /> : <Check size={16} />}{c.toast.text}</div>}
    {busy && <div className="busy-overlay" role="status"><LoaderCircle className="spin" size={22} /><span>{busy}</span></div>}
    {modal === 'export' && <Modal title="내보내기" onClose={() => setModal(null)}><div className="modal-body export-options"><p className="muted">현재 시나리오: <strong>{p.name}</strong> · 업무 {p.tasks.length}개 · 관계 {p.dependencies.length}개</p><button onClick={() => doExport('backup')}><FileJson size={22} /><div><strong>전체 작업공간 백업</strong><span>원본·모든 시나리오·편집·이력 보존 · JSON</span></div><Download size={17} /></button><button onClick={() => doExport('xlsx')}><FileSpreadsheet size={22} /><div><strong>엑셀 업무 데이터</strong><span>13개 업무 시트와 앱 복원 데이터 · XLSX</span></div><Download size={17} /></button><button onClick={() => doExport('tasks')}><FileText size={22} /><div><strong>업무 목록</strong><span>원본/관리/예상/실적·담당·여유 · CSV</span></div><Download size={17} /></button><button onClick={() => doExport('dependencies')}><GitBranch size={22} /><div><strong>선후행 관계</strong><span>현재 프로젝트 내부 관계·유형·간격 · CSV</span></div><Download size={17} /></button>{w.portfolio && <p className="hint">프로젝트 사이 관계와 연결 프로젝트 사본은 전체 JSON 백업 및 엑셀 복원 데이터에 포함됩니다. CSV는 현재 프로젝트 내부 관계입니다.</p>}<p className="hint">엑셀은 업무 데이터 내보내기입니다. 원본 표시용 간트 서식을 그대로 복제하지 않습니다. MPP 내보내기는 이 릴리스의 기능에 포함되지 않습니다.</p></div></Modal>}
    {modal === 'workspaces' && <Modal title="이 기기의 작업공간" onClose={() => setModal(null)}><div className="modal-body saved-spaces">{savedSpaces.length ? savedSpaces.map(s => <button key={s.id} className={'saved-space ' + (s.id === w.projectId ? 'active' : '')} onClick={async () => { try { if (s.id !== w.projectId) await c.openWorkspace(s.id); setModal(null); setQuery(''); setFilter('all'); setPhase('all'); } catch (e) { notify(e instanceof Error ? e.message : '열기 실패', true); } }}><HardDrive size={19} /><div><strong>{s.id === 'pangyo-aidc' ? '판교 AIDC · 기본 작업공간' : '가져온 작업공간'}</strong><span>{s.file}</span><small>{s.updatedAt ? new Date(s.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : ''}</small></div>{s.id === w.projectId ? <Badge kind="green">현재</Badge> : <ArrowUpRight size={15} />}</button>) : <p className="muted">첫 자동 저장을 기다리고 있습니다.</p>}<p className="hint">가져올 때 ‘새 작업공간’을 선택하면 기존 작업을 여기에 보존합니다. 다른 기기로 옮길 때는 JSON 백업을 사용하세요.</p></div></Modal>}
    {modal === 'settings' && <Modal title="프로젝트 설정" onClose={() => setModal(null)}><form onSubmit={e => { e.preventDefault(); if (c.commit(d => { d.statusDate = settingsDate; d.powerRoute = settingsPower; }, '프로젝트 상태일·전력 경로 변경')) setModal(null); }}><div className="modal-body"><label className="field"><span>예측 상태일</span><input type="date" required value={settingsDate} onChange={e => setSettingsDate(e.target.value)} /></label><p className="hint">원본은 {w.source.statusDate} 기준입니다. 오늘 날짜로 자동 변경하지 않습니다.</p><label className="field"><span>총수전 검토 경로</span><select aria-label="총수전 검토 경로" value={settingsPower} onChange={e => setSettingsPower(e.target.value as '9800')}><option value="9800">9,800kW 기본 경로 · 확약 전</option><option value="5000">5,000kW 축소안 · 재승인 필요</option></select></label>{settingsPower === '5000' && <ErrorText>축소안의 IT부하·설비·사업성·일정 재승인 전에는 운영일 예측이 유효하지 않습니다.</ErrorText>}<div className="info-box"><HardDrive size={17} /><p>이 기기의 브라우저에 자동 저장합니다. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전 JSON 백업을 내보내세요.</p></div></div><div className="modal-footer"><button className="button" type="button" onClick={() => setModal(null)}>취소</button><button className="button primary">설정 적용</button></div></form></Modal>}
    {modal === 'help' && <Modal title="선진 AIDC 일정관리" onClose={() => setModal(null)}><div className="modal-body help-content"><div className="help-brand">SUNJIN<span> Schedule</span></div><p>판교 AIDC의 원본 일정과 선후행 관계로 작동하는 독립 일정 작업공간입니다.</p><h3>편집과 저장</h3><p>업무를 선택해 정보를 수정하고 ‘변경 적용’을 누르세요. 간트 막대를 옮기면 영향 미리보기가 열립니다. 적용한 변경은 이 브라우저에 자동 저장됩니다.</p><h3>계획과 사실을 구분합니다</h3><p>운영개시 일자는 확약 전 조건부 예상입니다. 실명 담당·납기 미입력, 게이트 미승인 상태를 그대로 보존합니다. 로컬 단일 사용자 모드이며 서버 공유·계정 인증은 제공하지 않습니다.</p><h3>빠른 작업</h3><div className="shortcut"><span>업무·화면 빠른 찾기</span><kbd>Ctrl/⌘ K</kbd></div><p>마스터 일정에서 단계를 누르면 그 아래에 세부 업무가 펼쳐집니다. 업무 옆 연결 아이콘을 누르면 앞·뒤 업무를 함께 볼 수 있습니다.</p><div className="shortcut"><span>검색</span><kbd>/</kbd></div><div className="shortcut"><span>지금 저장</span><kbd>Ctrl/⌘ S</kbd></div><div className="shortcut"><span>실행취소 / 다시실행</span><kbd>Ctrl/⌘ Z / Shift Z</kbd></div><p className="hint">고급 자원평준화·EV·MPP·서버 협업·홈페이지 통합은 후속 범위입니다.</p></div></Modal>}
    {modal === 'issues' && <Modal title="일정 확인사항" onClose={() => setModal(null)} wide><div className="modal-body">{r.issues.length ? r.issues.map((i, index) => <button className="issue-row" key={index} onClick={() => { if (i.taskId) c.setSelectedId(i.taskId); setModal(null); }}><AlertCircle size={16} /><span>{i.message}</span>{i.taskId && <ArrowUpRight size={14} />}</button>) : <div className="info-box"><ShieldCheck size={18} /><p>활성 {p.dependencies.filter(e => e.active).length}개 관계의 예상일 조건을 충족합니다. 공급·납기·인력·실제 승인과는 별도입니다.</p></div>}<div className="help-facts"><span>주담당 미지정 <b>{unassigned}개</b></span><span>납기 미확약 <b>{p.procurement.filter(x => x.commitment !== '확약').length}개</b></span></div></div></Modal>}
    {modal === 'bulk' && <Modal title={checked.size + '개 업무 일괄 수정'} onClose={() => setModal(null)}><div className="modal-body"><p className="muted">선택한 업무에 아래 변경을 함께 적용합니다.</p><label className="field"><span>기타 추가지연에 더할 일수</span><input type="number" min="0" step="1" value={bulkDelay} onChange={e => setBulkDelay(Number(e.target.value))} /></label><label className="field"><span>주 담당 <small>공란이면 기존 값 유지</small></span><input value={bulkOwner} onChange={e => setBulkOwner(e.target.value)} placeholder="실제 담당자 입력" /></label></div><div className="modal-footer"><button className="button" onClick={() => setModal(null)}>취소</button><button className="button primary" onClick={() => { if (c.commit(d => d.tasks.filter(t => checked.has(t.id)).forEach(t => { t.delay += bulkDelay; if (bulkOwner.trim()) t.primary = bulkOwner.trim(); }), checked.size + '개 업무 일괄 수정')) { setModal(null); setBulkDelay(0); setBulkOwner(''); } }}>일괄 적용</button></div></Modal>}
    {modal === 'delete' && <Modal title={checked.size + '개 업무를 삭제할까요?'} onClose={() => setModal(null)}><div className="modal-body"><p>선택한 업무와 해당 관계를 삭제합니다. 조달·지원 기산·운영개시 기준 업무는 보호됩니다. 실행취소로 복원할 수 있습니다.</p></div><div className="modal-footer"><button className="button" onClick={() => setModal(null)}>취소</button><button className="button primary" onClick={() => { if (c.commit(d => removeTasks(d, [...checked]), checked.size + '개 업무 삭제')) { setChecked(new Set()); c.setSelectedId(null); setModal(null); } }}>삭제</button></div></Modal>}
    {incoming && <Modal title="검증한 일정을 가져옵니다" onClose={() => setIncoming(null)}><div className="modal-body"><p><strong>{incoming.source.sourceFile}</strong></p><p className="muted">{incoming.scenarios[0].tasks.length}개 업무 · {incoming.scenarios[0].dependencies.length}개 관계 · 시나리오 {incoming.scenarios.length}개</p><label className="import-option"><input type="radio" name="import-mode" checked={importMode === 'new'} onChange={() => setImportMode('new')} /><div><strong>새 작업공간으로 열기</strong><span>현재 저장 공간을 보존하고 별도로 엽니다.</span></div></label><label className="import-option"><input type="radio" name="import-mode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /><div><strong>현재 작업공간 교체</strong><span>현재 편집·시나리오를 바꿉니다. 먼저 백업을 권장합니다.</span></div></label></div><div className="modal-footer"><button className="button" onClick={() => setIncoming(null)}>취소</button><button className="button primary" onClick={async () => { try { await c.importWorkspace(incoming, importMode); setIncoming(null); setQuery(''); setFilter('all'); setPhase('all'); } catch (e) { notify(e instanceof Error ? e.message : '가져오기 실패', true); } }}>가져오기</button></div></Modal>}
    {proposal && proposal.projectId === w.projectId && proposal.plan.id === p.id && <Modal title="관리 일정 변경 미리보기" onClose={() => setProposal(null)} wide><div className="modal-body"><p><strong>{p.tasks.find(t => t.id === proposal.taskId)?.wbs} · {p.tasks.find(t => t.id === proposal.taskId)?.name}</strong></p><p className="muted">{proposal.mode === 'move' ? '관리 시작·완료일' : '관리 완료일'} {proposal.delta > 0 ? '+' : ''}{proposal.delta}일. 원본 참조계획과 실제일은 보존합니다.</p><div className="proposal-dates"><div><span>현재 예상</span><strong>{shortDate(r.tasks[proposal.taskId].start)}<br />{shortDate(r.tasks[proposal.taskId].finish)}</strong></div><ArrowRight size={19} /><div><span>변경 후 예상</span><strong>{shortDate(proposal.result.tasks[proposal.taskId].start)}<br />{shortDate(proposal.result.tasks[proposal.taskId].finish)}</strong></div></div><div className="proposal-impact"><span>운영개시 예상</span><strong>{shortDate(r.operationDate)} → {shortDate(proposal.result.operationDate)}</strong><Badge kind={proposal.result.operationDelay > r.operationDelay ? 'warning' : 'green'}>목표 대비 {proposal.result.operationDelay}일</Badge></div><ScheduleImpact plan={p} before={r} after={proposal.result} taskId={proposal.taskId} />{proposal.comparison && <div className="connected-impact"><strong>프로젝트 전체 영향</strong><p>{proposal.comparison.changedProjects}개 프로젝트 · {proposal.comparison.changedTasks}개 업무 예상일 변경</p>{proposal.comparison.projects.map(x => <p key={x.projectId}>{x.name}: {shortDate(x.beforeDate)} → {shortDate(x.afterDate)}</p>)}</div>}<p className="hint">선후행 조건이 지배하면 막대가 관리일만큼 이동하지 않을 수 있습니다. 예상일을 확인한 후 적용하세요.</p>{proposal.result.issues.filter(i => i.taskId === proposal.taskId).map((i, j) => <ErrorText key={j}>{i.message}</ErrorText>)}</div><div className="modal-footer"><button className="button" onClick={() => setProposal(null)}>취소</button><button className="button primary" onClick={() => { if (c.commit(d => { if (portfolioSignature(w) !== proposal.signature || d.updatedAt !== proposal.oldVersion) throw new Error('계획이 변경됐습니다. 미리보기를 다시 열어주세요.'); Object.assign(d.tasks.find(t => t.id === proposal.taskId)!, proposal.plan.tasks.find(t => t.id === proposal.taskId)!); }, '간트 ' + (proposal.mode === 'move' ? '일정 이동' : '기간 변경'))) setProposal(null); }}>변경 적용</button></div></Modal>}
  </div>;
}
