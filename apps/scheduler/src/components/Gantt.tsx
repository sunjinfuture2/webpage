import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Layers3, Flag, GripVertical, Link2, ListTree, Plus, X, ArrowRight, Pencil } from 'lucide-react';
import type { Dependency, Plan, Preferences, ScheduleResult, Task } from '../core/types';
import { addDays, addMonths, dayNumber, diffDays, fromDay, monthStart, shortDate } from '../core/dates';
import { Badge, Empty, Modal } from './UI';
import { DependencyEditor, type DependencyChange } from './DependencyEditor';
import { connectorPath, dependencyEndpoints, scopedDependencies, type RelationScope } from './ganttGeometry';
import './connections.css';
import './master-gantt.css';
import { phaseSummaries } from '../core/schedule-navigation';
import { outlineOffsets, outlineIndexAt } from '../core/gantt-outline';
import './master-outline.css';
import { relationshipNames } from '../core/dependency-labels';

export type { DependencyChange } from './DependencyEditor';

const ROW = 38, PHASE_ROW = 64, HEAD = 52;
interface Props {
  plan: Plan; result: ScheduleResult; tasks: Task[]; preferences: Preferences;
  selectedId: string | null; checked: Set<string>; forceExpand: boolean;
  onSelect: (id: string, extend?: boolean) => void; onCheck: (id: string) => void;
  onPreferences: (patch: Partial<Preferences>) => void;
  onPropose: (taskId: string, delta: number, mode: 'move' | 'resize') => void;
  onDependencyChange?: (intent: DependencyChange) => boolean;
  onRevealTask?: (id: string) => void;
  onFocusTask?: (id: string) => void;
  gateTaskIds?: string[];
}
type LinkPort = { taskId: string; end: 'start' | 'finish' };
type LinkDrag = { from: LinkPort; startX: number; startY: number; originX: number; originY: number; pointerId: number; x: number; y: number; moved: boolean; target: LinkPort | null };
type PhaseRow = { kind: 'phase'; code: string; label: string; tasks: Task[] };
type TaskRow = { kind: 'task'; task: Task };
export function Gantt({ plan, result, tasks, preferences: pref, selectedId, checked, forceExpand, onSelect, onCheck, onPreferences, onPropose, onDependencyChange, onRevealTask, onFocusTask, gateTaskIds = [] }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const previousResult = useRef(result);
  const [updatedIds, setUpdatedIds] = useState(new Set<string>());
  useEffect(() => {
    const previous = previousResult.current; previousResult.current = result;
    const ids = Object.keys(result.tasks).filter(id => previous.tasks[id] && (previous.tasks[id].start !== result.tasks[id].start || previous.tasks[id].finish !== result.tasks[id].finish));
    setUpdatedIds(new Set(ids));
    if (!ids.length) return;
    const timer = setTimeout(() => setUpdatedIds(new Set()), 900);
    return () => clearTimeout(timer);
  }, [result]);
  const [scroll, setScroll] = useState({ x: 0, y: 0, height: 600, width: 1000 });
  const [gridWidth, setGridWidth] = useState(pref.gridWidth);
  const [fullHorizon, setFullHorizon] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; delta: number; mode: 'move' | 'resize' } | null>(null);
  const dragRef = useRef(drag), dragged = useRef(false);
  const [focusDate, setFocusDate] = useState(pref.date);
  const [linkScope, setLinkScope] = useState<RelationScope>('all');
  const [linking, setLinking] = useState(false);
  const [port, setPort] = useState<{ taskId: string; end: 'start' | 'finish' } | null>(null);
  const [editing, setEditing] = useState<{ dependency: Dependency; creating: boolean } | null>(null);
  const [relationList, setRelationList] = useState(false), [listQuery, setListQuery] = useState(''), [listPage, setListPage] = useState(0);
  const [connectionNotice, setConnectionNotice] = useState('');
  const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
  const linkDragRef = useRef<LinkDrag | null>(null), suppressPortClick = useRef(false);
  const markerId = 'gantt-arrow-' + useId().replaceAll(':', '');
  const byId = useMemo(() => new Map(plan.tasks.map(t => [t.id, t])), [plan.tasks]);
  const criticalIds = useMemo(() => new Set(plan.tasks.filter(t => result.tasks[t.id]?.criticality === 'critical').map(t => t.id)), [plan.tasks, result]);
  const scopeEdges = useMemo(() => scopedDependencies(plan.dependencies, selectedId, linkScope, criticalIds), [plan.dependencies, selectedId, linkScope, criticalIds]);
  const tracedIds = useMemo(() => new Set(scopeEdges.flatMap(e => [e.from, e.to])), [scopeEdges]);
  const listEdges = useMemo(() => { const q = listQuery.trim().toLowerCase(); return plan.dependencies.filter(e => !q || [e.sourceId, e.type, e.condition, byId.get(e.from)?.wbs, byId.get(e.from)?.name, byId.get(e.to)?.wbs, byId.get(e.to)?.name].join(' ').toLowerCase().includes(q)); }, [plan.dependencies, byId, listQuery]);
  useEffect(() => { setListPage(0); }, [listQuery, plan.dependencies.length]);
  useEffect(() => { if (!selectedId && (linkScope === 'upstream' || linkScope === 'downstream')) setLinkScope('all'); }, [selectedId, linkScope]);
  useEffect(() => { setPort(null); setEditing(null); setLinking(false); }, [plan.id]);
  useEffect(() => { const cancel = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPort(null); setLinking(false); setConnectionNotice(''); } }; window.addEventListener('keydown', cancel); return () => window.removeEventListener('keydown', cancel); }, []);
  useEffect(() => {
    linkDragRef.current = null; setLinkDrag(null);
  }, [plan.id, plan.updatedAt]);
  useEffect(() => {
    if (!linkDragRef.current) return;
    const update = (event: PointerEvent) => {
      const state = linkDragRef.current; if (!state || event.pointerId !== state.pointerId) return;
      const hit = document.elementsFromPoint(event.clientX, event.clientY).map(e => e.closest<HTMLElement>('[data-link-task]')).find(e => e && viewport.current?.contains(e));
      const target: LinkPort | null = hit?.dataset.linkTask ? { taskId: hit.dataset.linkTask, end: hit.dataset.linkEnd === 'finish' ? 'finish' : 'start' } : null;
      const next = { ...state, x: event.clientX, y: event.clientY, target, moved: state.moved || Math.hypot(event.clientX - state.originX, event.clientY - state.originY) > 5 };
      if (next.moved && !state.moved) setPort(null);
      linkDragRef.current = next; setLinkDrag(next);
    };
    const stop = (event: PointerEvent) => {
      if (linkDragRef.current && event.pointerId !== linkDragRef.current.pointerId) return;
      const state = linkDragRef.current; linkDragRef.current = null; setLinkDrag(null);
      if (!state?.moved) return;
      suppressPortClick.current = true;
      if (!state.target) { setConnectionNotice('다른 업무의 막대나 시작·완료점에 놓아주세요. 일정은 바뀌지 않았습니다.'); return; }
      if (state.target.taskId === state.from.taskId) { setConnectionNotice('같은 업무끼리는 연결할 수 없습니다. 다른 업무를 선택해주세요.'); return; }
      const type = (state.from.end === 'finish' ? 'F' : 'S') + (state.target.end === 'finish' ? 'F' : 'S');
      setEditing({ creating: true, dependency: { id: crypto.randomUUID(), sourceId: '사용자 연결', from: state.from.taskId, to: state.target.taskId, type: type as Dependency['type'], lag: 0, active: true, condition: '' } });
      setPort(null); setLinking(false); setConnectionNotice(''); onPreferences({ showLinks: true });
    };
    const cancel = () => { suppressPortClick.current = true; linkDragRef.current = null; setLinkDrag(null); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('pointermove', update); window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', key); window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('pointermove', update); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', key); window.removeEventListener('blur', cancel); };
  }, [!!linkDrag, plan.updatedAt, onPreferences]);
  const beginLinkDrag = (event: React.PointerEvent<HTMLButtonElement>, taskId: string, end: LinkPort['end']) => {
    event.stopPropagation(); if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault(); suppressPortClick.current = false; setConnectionNotice('');
    const box = event.currentTarget.getBoundingClientRect();
    const next: LinkDrag = { from: { taskId, end }, startX: box.x + box.width / 2, startY: box.y + box.height / 2, originX: event.clientX, originY: event.clientY, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, target: null };
    linkDragRef.current = next; setLinkDrag(next); event.currentTarget.setPointerCapture(event.pointerId);
  };
  useEffect(() => { setGridWidth(pref.gridWidth); }, [pref.gridWidth]);
  useEffect(() => {
    const element = viewport.current; if (!element) return;
    const observer = new ResizeObserver(() => setScroll(s => ({ ...s, height: element.clientHeight, width: element.clientWidth })));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const mobile = scroll.width < 650;
  const width = mobile ? scroll.width : Math.min(gridWidth, Math.max(420, scroll.width - 240));

  const origin = useMemo(() => Math.min(...plan.tasks.map(t => Math.min(dayNumber(t.referenceStart), dayNumber(result.tasks[t.id]?.start || t.plannedStart)))) - 7, [plan.tasks, result]);
  const operationEnd = dayNumber(addMonths(result.operationDate, 7));
  const maxDate = useMemo(() => Math.max(...plan.tasks.map(t => dayNumber(result.tasks[t.id]?.finish || t.plannedFinish))), [plan.tasks, result]);
  const end = (fullHorizon ? maxDate + 30 : Math.min(maxDate, operationEnd) + 14);
  const fitting = !!pref.fitTimeline && !mobile;
  const px = fitting ? Math.max(.02, (scroll.width - width - 2) / (end - origin + 1)) : ({ week: 18, month: 4, quarter: 1.7, year: .65 })[pref.scale];
  const timelineWidth = fitting ? (end - origin + 1) * px : Math.max(800, (end - origin + 1) * px);
  const summaryById = useMemo(() => new Map(phaseSummaries(tasks, result).map(g => [g.id, g])), [tasks, result]);
  const phaseCodes = [...summaryById.keys()];
  const togglePhase = (code: string) => onPreferences({ collapsed: pref.collapsed.includes(code) ? pref.collapsed.filter(x => x !== code) : [...pref.collapsed, code] });
  const rows = useMemo(() => {
    const groups = new Map<string, Task[]>();
    [...tasks].sort((a, b) => a.phase.localeCompare(b.phase, undefined, { numeric: true }) || a.order - b.order).forEach(t => { if (!groups.has(t.phase)) groups.set(t.phase, []); groups.get(t.phase)!.push(t); });
    const result: Array<PhaseRow | TaskRow> = [];
    groups.forEach((items, code) => {
      result.push({ kind: 'phase', code, label: items[0].phaseLabel, tasks: items });
      if (forceExpand || !pref.collapsed.includes(code)) items.forEach(task => result.push({ kind: 'task', task }));
    });
    return result;
  }, [tasks, pref.collapsed, forceExpand]);
  const offsets = useMemo(() => outlineOffsets(rows.map(r => r.kind)), [rows]);
  const rowsHeight = offsets.at(-1)!;
  const lastRevealed = useRef<string | null>(null);
  const rowIndex = useMemo(() => new Map(rows.flatMap((r, i) => r.kind === 'task' ? [[r.task.id, i] as const] : [])), [rows]);
  useEffect(() => {
    const el = viewport.current; if (!el) return;
    el.scrollLeft = fitting ? 0 : Math.max(0, (dayNumber(pref.date) - origin) * px - 36);
    setFocusDate(pref.date);
  }, [pref.date, pref.scale, origin, fitting]);
  useEffect(() => {
    const el = viewport.current, index = selectedId ? rowIndex.get(selectedId) : undefined;
    if (!selectedId) lastRevealed.current = null;
    if (el && index !== undefined && lastRevealed.current !== selectedId) {
      lastRevealed.current = selectedId;
      const top = offsets[index];
      if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - HEAD - ROW) el.scrollTop = Math.max(0, top - ROW * 2);
    }
  }, [selectedId, forceExpand, rowIndex]);
  useEffect(() => { if (!selectedId && viewport.current) viewport.current.scrollTop = 0; }, [tasks.length, forceExpand]);
  dragRef.current = drag;
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const state = dragRef.current; if (!state) return;
      const delta = Math.round((e.clientX - state.x) / px);
      if (delta !== 0) dragged.current = true;
      setDrag({ ...state, delta });
    };
    const up = () => {
      const state = dragRef.current;
      if (state?.delta) onPropose(state.id, state.delta, state.mode);
      setDrag(null); setTimeout(() => { dragged.current = false; }, 100);
    };
    const cancel = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrag(null); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('keydown', cancel);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', cancel); };
  }, [!!drag, px, onPropose]);
  const monthTicks = useMemo(() => {
    const ticks = [];
    let month = monthStart(fromDay(origin));
    for (let i = 0; i < 2400 && dayNumber(month) <= end; i++, month = addMonths(month, 1)) {
      ticks.push({ date: month, left: (dayNumber(month) - origin) * px, span: diffDays(addMonths(month, 1), month) * px });
    }
    return ticks;
  }, [origin, end, px]);
  const startIndex = Math.max(0, outlineIndexAt(offsets, scroll.y) - 8);
  const tickStep = px >= 10 ? 1 : px >= 3 ? 7 : px >= 1.2 ? 14 : 30;
  const endIndex = Math.min(rows.length, outlineIndexAt(offsets, scroll.y + scroll.height) + 10);
  const visible = rows.slice(startIndex, endIndex);
  const drawable = pref.showLinks ? scopeEdges.filter(e => {
    const from = rowIndex.get(e.from), to = rowIndex.get(e.to);
    if (from === undefined || to === undefined || from < startIndex || from >= endIndex || to < startIndex || to >= endIndex) return false;
    return [e.from, e.to].every(id => dayNumber(result.tasks[id].finish) <= end && dayNumber(result.tasks[id].start) <= end);
  }) : [];
  const connectors = drawable.slice(0, 120);
  const revealTask = (id: string) => {
    setRelationList(false);
    if (onRevealTask) { onRevealTask(id); return; }
    const t = byId.get(id); if (!t) return;
    onPreferences({ collapsed: pref.collapsed.filter(p => p !== t.phase), date: result.tasks[id].start });
    onSelect(id);
  };
  const choosePort = (taskId: string, end: 'start' | 'finish') => {
    setConnectionNotice('');
    if (!port) { setPort({ taskId, end }); return; }
    if (port.taskId === taskId) { setConnectionNotice('다른 업무의 시작점 또는 완료점을 선택해주세요.'); return; }
    const type = (port.end === 'finish' ? 'F' : 'S') + (end === 'finish' ? 'F' : 'S');
    setEditing({ creating: true, dependency: { id: crypto.randomUUID(), sourceId: '사용자 연결', from: port.taskId, to: taskId, type: type as Dependency['type'], lag: 0, active: true, condition: '' } });
    setPort(null);
  };
  const newRelation = () => {
    if (plan.tasks.length < 2) return;
    const from = selectedId || plan.tasks[0].id, to = plan.tasks.find(t => t.id !== from)!.id;
    setEditing({ creating: true, dependency: { id: crypto.randomUUID(), sourceId: '사용자 연결', from, to, type: 'FS', lag: 0, active: true, condition: '' } });
    setRelationList(false);
  };
  const resizeGrid = (event: React.PointerEvent) => {
    event.preventDefault(); const x = event.clientX, original = width;
    let next = width;
    const move = (e: PointerEvent) => { next = Math.max(420, Math.min(900, original + e.clientX - x)); setGridWidth(next); };
    const done = () => { onPreferences({ gridWidth: next }); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', done); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', done);
  };
  if (!tasks.length) return <Empty title="조건에 맞는 업무가 없습니다">검색어나 필터를 바꿔보세요.</Empty>;
  return <div className={'gantt-shell ' + (mobile ? 'gantt-mobile ' : '') + (linking ? 'is-connecting ' : '') + (linkDrag ? 'is-link-dragging' : '')}>
    <div className="outline-toolbar"><span><Layers3 size={14} />{forceExpand ? '검색·필터·집중 보기의 업무를 펼쳐 표시합니다' : '단계를 누르면 세부 업무가 펼쳐집니다'}</span><div><button onClick={() => onPreferences({ collapsed: [] })} disabled={forceExpand}>모두 펼치기</button><button onClick={() => onPreferences({ collapsed: phaseCodes })} disabled={forceExpand}>모두 접기</button><button onClick={() => onPreferences({ fitTimeline: true })} aria-pressed={!!pref.fitTimeline}>전체 기간 맞춤</button></div></div>
    <div className="connection-toolbar" aria-label="선후행 관계 도구">
      <div className="connection-toolbar-title"><Link2 size={14} /><span>연결 일정</span><b>{plan.dependencies.filter(e => e.active).length}</b></div>
      <label className="connection-visibility"><input type="checkbox" checked={pref.showLinks} onChange={e => onPreferences({ showLinks: e.target.checked })} /><span>연결선</span></label>
      <select aria-label="연결선 범위" value={linkScope} onChange={e => { setLinkScope(e.target.value as RelationScope); onPreferences({ showLinks: true }); }}><option value="all">전체 관계</option><option value="upstream" disabled={!selectedId}>선택 업무의 선행 경로</option><option value="downstream" disabled={!selectedId}>선택 업무의 후행 경로</option><option value="critical">크리티컬 경로</option></select>
      <span className="connection-toolbar-spacer" />{onDependencyChange && !mobile && <span className="connection-quick-help">끝점을 끌어 연결 · 선을 눌러 수정</span>}
      {onDependencyChange && !mobile && <button className={'connection-action ' + (linking ? 'active' : '')} aria-pressed={linking} onClick={() => { setLinking(!linking); setPort(null); setConnectionNotice(''); if (!linking) onPreferences({ showLinks: true }); }}><Plus size={13} />관계 연결</button>}
      <button className="connection-action" onClick={() => { setRelationList(true); setListQuery(''); }}><ListTree size={14} />관계 목록<span>{plan.dependencies.length}</span></button>
    </div>
    {(linking || connectionNotice) && <div className="connection-instruction" role="status"><Link2 size={13} /><span>{connectionNotice || (port ? `${byId.get(port.taskId)?.wbs} ${port.end === 'start' ? '시작' : '완료'} 선택됨 · 다음 업무의 시작·완료점을 누르거나 끌어서 연결하세요.` : '앞 업무의 시작·완료점에서 다음 업무로 끌어놓으세요. 끝점을 차례로 눌러 연결할 수도 있습니다.')}</span><button aria-label="관계 연결 취소" onClick={() => { setLinking(false); setPort(null); setConnectionNotice(''); }}><X size={14} /></button></div>}
    <div className="gantt-range"><span>표시 기준 <b>{shortDate(focusDate)}</b></span><div className="row gap-16"><label className="check-label"><input type="checkbox" checked={fullHorizon} onChange={e => setFullHorizon(e.target.checked)} />6년 지원기간 포함</label><span className="timeline-legend"><i />상태일 <span className="legend-baseline" />원본 참조 <span className="legend-cp" />CP</span></div></div>
    <div className="gantt-scroll" ref={viewport} data-testid="gantt-scroll" onScroll={e => { const el = e.currentTarget; setScroll(s => ({ ...s, x: el.scrollLeft, y: el.scrollTop })); setFocusDate(fromDay(origin + Math.floor(el.scrollLeft / px))); }}>
      <div style={{ width: mobile ? width : width + timelineWidth, minHeight: '100%' }}>
        <div className="schedule-header">
          <div className="row-grid grid-header" style={{ width, minWidth: width }}><span /><span>WBS</span><span>업무명</span><span className="date-col">예상 시작</span><span className="date-col">예상 완료</span><span className="progress-col">진척률</span><div className="grid-resizer" role="separator" aria-label="그리드 너비 조정" onPointerDown={resizeGrid}><GripVertical size={10} /></div></div>
          {!mobile && <div className="timeline-header" style={{ width: timelineWidth }}><div className="month-axis">{monthTicks.filter(t => px >= 1.2 || (Number(t.date.slice(5, 7)) - 1) % (px < .22 ? 12 : 3) === 0).map(t => <div key={t.date} style={{ left: t.left, width: px < 1.2 ? diffDays(addMonths(t.date, px < .22 ? 12 : 3), t.date) * px : t.span }} className={t.date.slice(5, 7) === '01' ? 'new-year' : ''}>{px < .22 ? t.date.slice(0, 4) : px < 1.2 ? t.date.slice(0, 4) + ' Q' + Math.ceil(Number(t.date.slice(5, 7)) / 3) : px >= 2 || t.date.slice(5, 7) === '01' ? t.date.slice(0, 4) + '. ' + Number(t.date.slice(5, 7)) : Number(t.date.slice(5, 7)) + '월'}</div>)}</div><div className="day-axis">{Array.from({ length: Math.ceil((end - origin) / tickStep) }, (_, i) => {
            const d = origin + i * tickStep, text = fromDay(d);
            if (tickStep * px < 28) return null;
            if ((d - origin) * px < scroll.x - 60 || (d - origin) * px > scroll.x + scroll.width + 100) return null;
            return <span key={d} style={{ left: (d - origin) * px, width: tickStep * px }} className={new Date(text + 'T00:00:00Z').getUTCDay() === 0 ? 'sunday' : ''}>{px < 1.2 ? Number(text.slice(5, 7)) + '월' : Number(text.slice(8, 10))}</span>;
          })}</div></div>}
        </div>
        <div className="virtual-rows" style={{ height: rowsHeight }}>
          {!mobile && <div className="timeline-background" style={{ left: width, width: timelineWidth, height: '100%' }}>{monthTicks.map(t => <i key={t.date} style={{ left: t.left }} />)}<div className="status-date-line" style={{ left: (dayNumber(plan.statusDate) - origin) * px }} /></div>}
          {visible.map((row, index) => {
            const y = offsets[startIndex + index];
            if (row.kind === 'phase') {
              const group = summaryById.get(row.code)!;
              const left = (dayNumber(group.start) - origin) * px;
              const barWidth = Math.max(6, (Math.min(end, dayNumber(group.finish)) - dayNumber(group.start) + 1) * px);
              const opened = forceExpand || !pref.collapsed.includes(row.code);
              const risk = group.critical ? 'critical' : group.near ? 'near' : 'normal';
              const slack = group.slack === null ? '운영 여유 대상 외' : '최소 여유 ' + group.slack + '일';
              return <div key={row.code} className={'gantt-row phase-row outline-phase ' + (opened ? 'is-open' : '')} data-phase={row.code} style={{ top: y, height: PHASE_ROW }}>
                <div className="row-grid phase-grid" style={{ width, minWidth: width }}><button className="phase-toggle" aria-label={row.code + ' 단계 ' + (opened ? '접기' : '펼치기')} aria-expanded={opened} disabled={forceExpand} onClick={() => togglePhase(row.code)}>{opened ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<span className={'phase-token tone-' + phaseCodes.indexOf(row.code) % 4}>{row.code}</span><span className="outline-phase-label"><strong>{row.label.replace(/^\d+\s*/, '')}</strong><small>{group.tasks.length}개 업무 · {slack}{group.conditional ? ' · 조건부 ' + group.conditional + '개' : ''}</small></span></button><span className="date-col table-date">{shortDate(group.start).slice(2)}</span><span className="date-col table-date">{shortDate(group.finish).slice(2)}</span><span className="progress-col outline-completed">{group.completed}/{group.tasks.length}</span></div>
                {!mobile && <div className="timeline-track" style={{ width: timelineWidth }}>{left < timelineWidth && <button className={'outline-range risk-' + risk} style={{ left, width: barWidth }} aria-label={row.code + ' 일정 ' + (opened ? '접기' : '펼치기')} disabled={forceExpand} title={group.start + ' ~ ' + group.finish + ' · ' + slack} onClick={() => togglePhase(row.code)}><span>{shortDate(group.start).slice(2)} — {shortDate(group.finish).slice(2)}</span>{dayNumber(group.finish) > end && <ArrowRight size={12} />}</button>}
                  {!opened && row.tasks.filter(t => t.kind === 'milestone' || gateTaskIds.includes(t.id)).map(t => {
                    const date = gateTaskIds.includes(t.id) ? result.tasks[t.id].finish : result.tasks[t.id].start;
                    const x = (dayNumber(date) - origin) * px; if (x > timelineWidth) return null;
                    return <button key={t.id} className={'outline-milestone ' + (gateTaskIds.includes(t.id) ? 'is-gate' : '')} style={{ left: x }} title={t.wbs + ' · ' + t.name + ' · ' + date} aria-label={t.wbs + ' 주요 일정 열기'} onClick={() => { onPreferences({ collapsed: pref.collapsed.filter(x => x !== row.code) }); onSelect(t.id); }}>◆</button>;
                  })}
                </div>}
              </div>;
            }
            const t = row.task, r = result.tasks[t.id]; if (!r) return null;
            const left = (dayNumber(r.start) - origin) * px;
            const barWidth = Math.max(t.kind === 'milestone' ? 10 : 5, (Math.min(end, dayNumber(r.finish)) - dayNumber(r.start) + 1) * px);
            const selected = selectedId === t.id;
            const isDragging = drag?.id === t.id;
            const transform = isDragging && drag.mode === 'move' ? 'translateX(' + drag.delta * px + 'px)' : undefined;
            const draggedWidth = isDragging && drag.mode === 'resize' ? Math.max(5, barWidth + drag.delta * px) : barWidth;
            return <div key={t.id} className={'gantt-row ' + (updatedIds.has(t.id) ? 'is-updated ' : '') + (selected ? 'is-selected ' : '') + (checked.has(t.id) ? 'is-checked ' : '') + (selectedId && linkScope !== 'all' && tracedIds.has(t.id) ? 'is-traced ' : '') + (port?.taskId === t.id || linkDrag?.from.taskId === t.id ? 'is-link-source ' : '') + (linkDrag?.target?.taskId === t.id && linkDrag.from.taskId !== t.id ? 'is-link-target' : '')} style={{ top: y, height: ROW }} data-wbs={t.wbs}>
              <div className="row-grid" style={{ width, minWidth: width }}><span className="row-check"><input aria-label={t.wbs + ' 선택'} type="checkbox" checked={checked.has(t.id)} onChange={() => onCheck(t.id)} /></span><button className="wbs-cell" onClick={() => onSelect(t.id)}>{t.wbs}</button>
                <div className="task-name-group"><button className="name-cell" title={t.name} onClick={e => onSelect(t.id, e.ctrlKey || e.metaKey || e.shiftKey)} onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = tasks.findIndex(x => x.id === t.id) + (e.key === 'ArrowDown' ? 1 : -1); if (tasks[n]) onSelect(tasks[n].id); } }}>{t.kind === 'milestone' && <Flag size={11} className="milestone-icon" />}<span>{t.name}</span>{r.criticality === 'critical' && <Badge kind="critical">CP</Badge>}{r.criticality === 'near' && <i className="near-dot" />}</button>{onFocusTask && <button className="focus-task-button" aria-label={t.wbs + ' 연결 살펴보기'} title="앞·뒤 연결 업무 살펴보기" onClick={() => onFocusTask(t.id)}><Link2 size={13} /></button>}</div>
                <button className="date-col table-date" onClick={() => onSelect(t.id)}>{shortDate(r.start).slice(2)}</button><button className="date-col table-date" onClick={() => onSelect(t.id)}>{shortDate(r.finish).slice(2)}</button><span className={'progress-col small ' + (t.progress === null ? 'muted' : 'green')}>{t.progress === null ? '—' : Math.round(t.progress * 100) + '%'}</span>
              </div>
              {!mobile && <div className="timeline-track" style={{ width: timelineWidth }}>
                {pref.showReference && <div className="reference-bar" title={'원본 ' + t.referenceStart + ' — ' + t.referenceFinish} style={{ left: (dayNumber(t.referenceStart) - origin) * px, width: Math.max(4, (Math.min(end, dayNumber(t.referenceFinish)) - dayNumber(t.referenceStart) + 1) * px) }} />}
                {left <= timelineWidth && <button data-link-task={t.id} data-link-end="start" aria-label={t.wbs + ' 간트 막대'} className={'gantt-bar bar-' + r.criticality + (t.kind === 'milestone' ? ' milestone' : '') + (/조건부/.test(t.status) ? ' is-conditional' : '') + (isDragging ? ' dragging' : '')} style={{ left, width: draggedWidth, transform }} title={t.wbs + ' · ' + t.name + '\n' + r.start + ' → ' + r.finish + '\n운영 여유 ' + (r.slack ?? '대상 외') + '\n드래그하면 관리 일정을 이동합니다.'}
                  onClick={() => { if (!dragged.current) onSelect(t.id); }} onPointerDown={e => { if (t.actualStart || t.finishRule || e.button !== 0) return; e.preventDefault(); setDrag({ id: t.id, x: e.clientX, delta: 0, mode: 'move' }); }}>
                  {t.progress !== null && t.kind !== 'milestone' && <span className="bar-progress" style={{ width: t.progress * 100 + '%' }} />}
                  {t.kind !== 'milestone' && draggedWidth >= 64 && <span className="bar-caption"><i aria-hidden="true" /><span>{t.name}</span></span>}
                  {t.kind !== 'milestone' && !t.actualStart && !t.finishRule && <span className="bar-resize" aria-label={t.wbs + ' 기간 조정'} onPointerDown={e => { e.stopPropagation(); e.preventDefault(); setDrag({ id: t.id, x: e.clientX, delta: 0, mode: 'resize' }); }} />}
                </button>}
                {onDependencyChange && left <= timelineWidth && dayNumber(r.finish) <= end && <>{(['start', 'finish'] as const).map(endpoint => <button type="button" key={endpoint} data-link-task={t.id} data-link-end={endpoint} className={'dependency-port port-' + endpoint + (port?.taskId === t.id && port.end === endpoint ? ' is-chosen' : '')} style={{ left: endpoint === 'start' ? Math.max(0, left - 17) : left + (t.kind === 'milestone' ? 8 : barWidth) + 2 }} aria-label={t.wbs + (endpoint === 'start' ? ' 시작점 연결' : ' 완료점 연결')} title={(endpoint === 'start' ? '시작' : '완료') + ' · 다른 업무로 끌어서 연결'} onPointerDown={e => beginLinkDrag(e, t.id, endpoint)} onClick={e => { e.stopPropagation(); if (suppressPortClick.current && e.detail !== 0) return; setLinking(true); choosePort(t.id, endpoint); }}><span className="dependency-port-label">{endpoint === 'start' ? '시작' : '완료'}</span></button>)}</>}
                {selected && left + barWidth < timelineWidth && <span className="bar-label" style={{ left: left + barWidth + 8 }}>{r.duration}일 · {r.slack === null ? '대상 외' : '여유 ' + r.slack + '일'}</span>}
              </div>}
            </div>;
          })}
          {!mobile && connectors.length > 0 && <svg className="dependency-layer connection-layer" style={{ left: width }} width={timelineWidth} height={rowsHeight} aria-label="선후행 관계 연결선"><defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M1 1 L6 3.5 L1 6" fill="none" stroke="#9ba59c" /></marker></defs>{connectors.map(e => {
            const a = result.tasks[e.from], b = result.tasks[e.to];
            const ends = dependencyEndpoints(e.type), fromTask = byId.get(e.from)!, toTask = byId.get(e.to)!;
            const endpoint = (id: string, end: 'start' | 'finish') => {
              const r = result.tasks[id], t = byId.get(id)!;
              const left = (dayNumber(r.start) - origin) * px;
              return t.kind === 'milestone' ? left + 4 : end === 'start' ? left : left + Math.max(5, (dayNumber(r.finish) - dayNumber(r.start) + 1) * px);
            };
            const x1 = endpoint(e.from, ends.from), x2 = endpoint(e.to, ends.to);
            const y1 = offsets[rowIndex.get(e.from)!] + 17, y2 = offsets[rowIndex.get(e.to)!] + 17;
            const label = `${fromTask.wbs} → ${toTask.wbs} · ${relationshipNames[e.type]} · ${e.type} ${e.lag > 0 ? '+' : ''}${e.lag}일`, path = connectorPath(x1, y1, x2, y2, e.type);
            const focused = e.from === selectedId || e.to === selectedId || !!selectedId && linkScope !== 'all';
            const critical = a.criticality === 'critical' && b.criticality === 'critical';
            return <g key={e.id} className={'connection-edge ' + (focused ? 'is-focused ' : '') + (critical ? 'is-critical' : '')}>
              <path className="connection-visible" d={path} markerEnd={`url(#${markerId})`} />
              <path className="connection-hit" d={path} role="button" tabIndex={0} aria-label={(onDependencyChange ? '관계 편집: ' : '관계 보기: ') + label} onClick={() => onDependencyChange ? setEditing({ dependency: e, creating: false }) : setRelationList(true)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (onDependencyChange) setEditing({ dependency: e, creating: false }); else setRelationList(true); } }}><title>{label + (onDependencyChange ? '\n클릭하여 관계 편집' : '')}</title></path>
            </g>;
          })}</svg>}
        </div>
      </div>
    </div>
    <div className="gantt-footer"><span><span className="green-dot" />{tasks.length}개 업무 표시 <span className="divider">/</span> 전체 {plan.tasks.length}개</span><span>{pref.showLinks ? `화면 연결선 ${connectors.length}/${scopeEdges.length}개 · ` : ''}<button className="connection-hidden-count" onClick={() => { setRelationList(true); setListQuery(''); }}>{pref.showLinks && scopeEdges.length > connectors.length ? `화면 밖·접힌 업무 등 ${scopeEdges.length - connectors.length}개 관계 보기` : `전체 관계 ${plan.dependencies.length}개`}</button><span className="divider">·</span> 달력일 기준{!fullHorizon && ' · 운영·안정화 기간'}</span></div>
    {linkDrag?.moved && <><svg className="dependency-drag-preview" aria-hidden="true"><defs><marker id={markerId + '-drag'} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1,1 L7,4 L1,7" fill="none" stroke="#f47920" strokeWidth="1.5" /></marker></defs><circle cx={linkDrag.startX} cy={linkDrag.startY} r="3" fill="#f47920" /><path d={connectorPath(linkDrag.startX, linkDrag.startY, linkDrag.x, linkDrag.y, ((linkDrag.from.end === 'finish' ? 'F' : 'S') + (linkDrag.target?.end === 'finish' ? 'F' : 'S')) as Dependency['type'])} markerEnd={'url(#' + markerId + '-drag)'} /></svg><div className="connection-drag-tooltip" role="status" style={{ left: Math.max(8, Math.min(linkDrag.x + 14, window.innerWidth - 265)), top: Math.min(linkDrag.y + 17, window.innerHeight - 65) }}>{linkDrag.target && linkDrag.target.taskId !== linkDrag.from.taskId ? <>{byId.get(linkDrag.from.taskId)?.wbs} {linkDrag.from.end === 'finish' ? '완료' : '시작'} → {byId.get(linkDrag.target.taskId)?.wbs} {linkDrag.target.end === 'finish' ? '완료' : '시작'}<small>놓으면 관계를 확인합니다 · Esc 취소</small></> : <>다른 업무의 막대나 끝점에 놓으세요<small>Esc로 취소</small></>}</div></>}
    {editing && onDependencyChange && <DependencyEditor key={editing.dependency.id} plan={plan} dependency={editing.dependency} creating={editing.creating} onChange={onDependencyChange} onClose={() => setEditing(null)} />}
    {relationList && <Modal title="선후행 관계 목록" onClose={() => setRelationList(false)} wide><div className="modal-body dependency-browser"><div className="dependency-browser-heading"><div><strong>관계 {plan.dependencies.length}개</strong><span>활성 {plan.dependencies.filter(e => e.active).length} · 조건부 제외 {plan.dependencies.filter(e => !e.active).length}</span></div>{onDependencyChange && <button className="button primary" disabled={plan.tasks.length < 2} onClick={newRelation}><Plus size={14} />새 관계</button>}</div><input className="dependency-browser-search" aria-label="관계 검색" placeholder="업무명, WBS, 유형 또는 조건 검색" value={listQuery} onChange={e => setListQuery(e.target.value)} /><div className="dependency-browser-list">{listEdges.slice(listPage * 50, (listPage + 1) * 50).map(e => { const from = byId.get(e.from)!, to = byId.get(e.to)!; return <div key={e.id} className={'dependency-browser-row ' + (!e.active ? 'inactive' : '')}><div className="dependency-browser-tasks"><button data-relation-end="선행" onClick={() => revealTask(e.from)} title="선행 업무로 이동"><b>{from.wbs}</b><span>{from.name}</span></button><ArrowRight size={14} /><button data-relation-end="후행" onClick={() => revealTask(e.to)} title="후행 업무로 이동"><b>{to.wbs}</b><span>{to.name}</span></button></div><div className="dependency-browser-meta"><Badge kind={e.active ? 'normal' : 'muted'}>{e.type} {e.lag > 0 ? '+' : ''}{e.lag}일</Badge>{!e.active && <span>조건부 제외</span>}{e.condition && <small title={e.condition}>{e.condition}</small>}{onDependencyChange && <button className="icon-button" aria-label={from.wbs + ' → ' + to.wbs + ' 관계 편집'} onClick={() => { setRelationList(false); setEditing({ dependency: e, creating: false }); }}><Pencil size={14} /></button>}</div></div>; })}{!listEdges.length && <div className="dependency-browser-empty">검색한 관계가 없습니다.</div>}</div><div className="dependency-browser-pagination"><span>검색 {listEdges.length}개 · 화면 밖 업무도 모두 포함합니다.</span><button className="button compact" disabled={listPage === 0} onClick={() => setListPage(p => p - 1)}>이전</button><span>{listPage + 1} / {Math.max(1, Math.ceil(listEdges.length / 50))}</span><button className="button compact" disabled={(listPage + 1) * 50 >= listEdges.length} onClick={() => setListPage(p => p + 1)}>다음</button></div></div></Modal>}
  </div>;
}
