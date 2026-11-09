import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Flag, GripVertical, Link2, ListTree, Plus, X, ArrowRight, Pencil } from 'lucide-react';
import type { Dependency, Plan, Preferences, ScheduleResult, Task } from '../core/types';
import { addDays, addMonths, dayNumber, diffDays, fromDay, monthStart, shortDate } from '../core/dates';
import { Badge, Empty, Modal } from './UI';
import { DependencyEditor, type DependencyChange } from './DependencyEditor';
import { connectorPath, dependencyEndpoints, scopedDependencies, type RelationScope } from './ganttGeometry';
import './connections.css';

export type { DependencyChange } from './DependencyEditor';

const ROW = 38, HEAD = 52;
interface Props {
  plan: Plan; result: ScheduleResult; tasks: Task[]; preferences: Preferences;
  selectedId: string | null; checked: Set<string>; forceExpand: boolean;
  onSelect: (id: string, extend?: boolean) => void; onCheck: (id: string) => void;
  onPreferences: (patch: Partial<Preferences>) => void;
  onPropose: (taskId: string, delta: number, mode: 'move' | 'resize') => void;
  onDependencyChange?: (intent: DependencyChange) => boolean;
  onRevealTask?: (id: string) => void;
}
type PhaseRow = { kind: 'phase'; code: string; label: string; tasks: Task[] };
type TaskRow = { kind: 'task'; task: Task };
export function Gantt({ plan, result, tasks, preferences: pref, selectedId, checked, forceExpand, onSelect, onCheck, onPreferences, onPropose, onDependencyChange, onRevealTask }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
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
  useEffect(() => { setGridWidth(pref.gridWidth); }, [pref.gridWidth]);
  useEffect(() => {
    const element = viewport.current; if (!element) return;
    const observer = new ResizeObserver(() => setScroll(s => ({ ...s, height: element.clientHeight, width: element.clientWidth })));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const mobile = scroll.width < 650;
  const width = mobile ? scroll.width : gridWidth;
  const px = ({ week: 18, month: 4, quarter: 1.7, year: 0.65 })[pref.scale];
  const origin = useMemo(() => Math.min(...plan.tasks.map(t => Math.min(dayNumber(t.referenceStart), dayNumber(result.tasks[t.id]?.start || t.plannedStart)))) - 7, [plan.tasks, result]);
  const operationEnd = dayNumber(addMonths(result.operationDate, 7));
  const maxDate = useMemo(() => Math.max(...plan.tasks.map(t => dayNumber(result.tasks[t.id]?.finish || t.plannedFinish))), [plan.tasks, result]);
  const end = (fullHorizon ? maxDate + 30 : Math.min(maxDate, operationEnd) + 14);
  const timelineWidth = Math.max(800, (end - origin + 1) * px);
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
  const rowIndex = useMemo(() => new Map(rows.flatMap((r, i) => r.kind === 'task' ? [[r.task.id, i] as const] : [])), [rows]);
  useEffect(() => {
    const el = viewport.current; if (!el) return;
    el.scrollLeft = Math.max(0, (dayNumber(pref.date) - origin) * px - 36);
    setFocusDate(pref.date);
  }, [pref.date, pref.scale, origin]);
  useEffect(() => {
    const el = viewport.current, index = selectedId ? rowIndex.get(selectedId) : undefined;
    if (el && index !== undefined) {
      const top = index * ROW;
      if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - HEAD - ROW) el.scrollTop = Math.max(0, top - ROW * 2);
    }
  }, [selectedId, forceExpand, rowIndex]);
  useEffect(() => { if (viewport.current) viewport.current.scrollTop = 0; }, [tasks.length, forceExpand]);
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
  const startIndex = Math.max(0, Math.floor(scroll.y / ROW) - 8);
  const tickStep = pref.scale === 'week' ? 1 : pref.scale === 'month' ? 7 : pref.scale === 'quarter' ? 14 : 30;
  const endIndex = Math.min(rows.length, startIndex + Math.ceil(scroll.height / ROW) + 18);
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
  return <div className={'gantt-shell ' + (mobile ? 'gantt-mobile' : '')}>
    <div className="connection-toolbar" aria-label="선후행 관계 도구">
      <div className="connection-toolbar-title"><Link2 size={14} /><span>연결 일정</span><b>{plan.dependencies.filter(e => e.active).length}</b></div>
      <label className="connection-visibility"><input type="checkbox" checked={pref.showLinks} onChange={e => onPreferences({ showLinks: e.target.checked })} /><span>연결선</span></label>
      <select aria-label="연결선 범위" value={linkScope} onChange={e => { setLinkScope(e.target.value as RelationScope); onPreferences({ showLinks: true }); }}><option value="all">전체 관계</option><option value="upstream" disabled={!selectedId}>선택 업무의 선행 경로</option><option value="downstream" disabled={!selectedId}>선택 업무의 후행 경로</option><option value="critical">크리티컬 경로</option></select>
      <span className="connection-toolbar-spacer" />
      {onDependencyChange && !mobile && <button className={'connection-action ' + (linking ? 'active' : '')} aria-pressed={linking} onClick={() => { setLinking(!linking); setPort(null); setConnectionNotice(''); if (!linking) onPreferences({ showLinks: true }); }}><Plus size={13} />관계 연결</button>}
      <button className="connection-action" onClick={() => { setRelationList(true); setListQuery(''); }}><ListTree size={14} />관계 목록<span>{plan.dependencies.length}</span></button>
    </div>
    {linking && <div className="connection-instruction" role="status"><Link2 size={13} /><span>{port ? `${byId.get(port.taskId)?.wbs} ${port.end === 'start' ? '시작' : '완료'}점 선택됨 · 연결할 다른 업무의 S/F를 선택하세요.` : '선행 업무의 S(시작) 또는 F(완료)를 누른 뒤, 후행 업무의 연결점을 선택하세요.'}{connectionNotice && <b>{connectionNotice}</b>}</span><button aria-label="관계 연결 취소" onClick={() => { setLinking(false); setPort(null); }}><X size={14} /></button></div>}
    <div className="gantt-range"><span>표시 기준 <b>{shortDate(focusDate)}</b></span><div className="row gap-16"><label className="check-label"><input type="checkbox" checked={fullHorizon} onChange={e => setFullHorizon(e.target.checked)} />6년 지원기간 포함</label><span className="timeline-legend"><i />상태일 <span className="legend-baseline" />원본 참조 <span className="legend-cp" />CP</span></div></div>
    <div className="gantt-scroll" ref={viewport} data-testid="gantt-scroll" onScroll={e => { const el = e.currentTarget; setScroll(s => ({ ...s, x: el.scrollLeft, y: el.scrollTop })); setFocusDate(fromDay(origin + Math.floor(el.scrollLeft / px))); }}>
      <div style={{ width: mobile ? width : width + timelineWidth, minHeight: '100%' }}>
        <div className="schedule-header">
          <div className="row-grid grid-header" style={{ width, minWidth: width }}><span /><span>WBS</span><span>업무명</span><span className="date-col">예상 시작</span><span className="date-col">예상 완료</span><span className="progress-col">진척률</span><div className="grid-resizer" role="separator" aria-label="그리드 너비 조정" onPointerDown={resizeGrid}><GripVertical size={10} /></div></div>
          {!mobile && <div className="timeline-header" style={{ width: timelineWidth }}><div className="month-axis">{monthTicks.filter(t => pref.scale !== 'year' || (Number(t.date.slice(5, 7)) - 1) % 3 === 0).map(t => <div key={t.date} style={{ left: t.left, width: pref.scale === 'year' ? diffDays(addMonths(t.date, 3), t.date) * px : t.span }} className={t.date.slice(5, 7) === '01' ? 'new-year' : ''}>{pref.scale === 'year' ? t.date.slice(0, 4) + ' Q' + Math.ceil(Number(t.date.slice(5, 7)) / 3) : px >= 2 || t.date.slice(5, 7) === '01' ? t.date.slice(0, 4) + '. ' + Number(t.date.slice(5, 7)) : Number(t.date.slice(5, 7)) + '월'}</div>)}</div><div className="day-axis">{Array.from({ length: Math.ceil((end - origin) / tickStep) }, (_, i) => {
            const d = origin + i * tickStep, text = fromDay(d);
            if ((d - origin) * px < scroll.x - 60 || (d - origin) * px > scroll.x + scroll.width + 100) return null;
            return <span key={d} style={{ left: (d - origin) * px, width: tickStep * px }} className={new Date(text + 'T00:00:00Z').getUTCDay() === 0 ? 'sunday' : ''}>{pref.scale === 'year' ? Number(text.slice(5, 7)) + '월' : Number(text.slice(8, 10))}</span>;
          })}</div></div>}
        </div>
        <div className="virtual-rows" style={{ height: rows.length * ROW }}>
          {!mobile && <div className="timeline-background" style={{ left: width, width: timelineWidth, height: '100%' }}>{monthTicks.map(t => <i key={t.date} style={{ left: t.left }} />)}<div className="status-date-line" style={{ left: (dayNumber(plan.statusDate) - origin) * px }} /></div>}
          {visible.map((row, index) => {
            const y = (startIndex + index) * ROW;
            if (row.kind === 'phase') {
              const starts = row.tasks.map(t => dayNumber(result.tasks[t.id]?.start || t.plannedStart));
              const finishes = row.tasks.map(t => dayNumber(result.tasks[t.id]?.finish || t.plannedFinish));
              const left = (Math.min(...starts) - origin) * px, barWidth = Math.max(8, (Math.min(end, Math.max(...finishes)) - Math.min(...starts) + 1) * px);
              return <div key={row.code} className="gantt-row phase-row" style={{ top: y, height: ROW }}>
                <div className="phase-grid" style={{ width, minWidth: width }}><button className="phase-toggle" aria-expanded={forceExpand || !pref.collapsed.includes(row.code)} onClick={() => onPreferences({ collapsed: pref.collapsed.includes(row.code) ? pref.collapsed.filter(x => x !== row.code) : [...pref.collapsed, row.code] })}>{forceExpand || !pref.collapsed.includes(row.code) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<strong>{row.label}</strong><span>{row.tasks.length}</span></button><span className="phase-code">{row.code}</span></div>
                {!mobile && <div className="timeline-track" style={{ width: timelineWidth }}><div className="summary-bar" style={{ left, width: barWidth }} /></div>}
              </div>;
            }
            const t = row.task, r = result.tasks[t.id]; if (!r) return null;
            const left = (dayNumber(r.start) - origin) * px;
            const barWidth = Math.max(t.kind === 'milestone' ? 10 : 5, (Math.min(end, dayNumber(r.finish)) - dayNumber(r.start) + 1) * px);
            const selected = selectedId === t.id;
            const isDragging = drag?.id === t.id;
            const transform = isDragging && drag.mode === 'move' ? 'translateX(' + drag.delta * px + 'px)' : undefined;
            const draggedWidth = isDragging && drag.mode === 'resize' ? Math.max(5, barWidth + drag.delta * px) : barWidth;
            return <div key={t.id} className={'gantt-row ' + (selected ? 'is-selected ' : '') + (checked.has(t.id) ? 'is-checked ' : '') + (selectedId && linkScope !== 'all' && tracedIds.has(t.id) ? 'is-traced ' : '') + (port?.taskId === t.id ? 'is-link-source' : '')} style={{ top: y, height: ROW }} data-wbs={t.wbs}>
              <div className="row-grid" style={{ width, minWidth: width }}><span className="row-check"><input aria-label={t.wbs + ' 선택'} type="checkbox" checked={checked.has(t.id)} onChange={() => onCheck(t.id)} /></span><button className="wbs-cell" onClick={() => onSelect(t.id)}>{t.wbs}</button>
                <button className="name-cell" title={t.name} onClick={e => onSelect(t.id, e.ctrlKey || e.metaKey || e.shiftKey)} onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = tasks.findIndex(x => x.id === t.id) + (e.key === 'ArrowDown' ? 1 : -1); if (tasks[n]) onSelect(tasks[n].id); } }}>{t.kind === 'milestone' && <Flag size={11} className="milestone-icon" />}<span>{t.name}</span>{r.criticality === 'critical' && <Badge kind="critical">CP</Badge>}{r.criticality === 'near' && <i className="near-dot" />}</button>
                <button className="date-col table-date" onClick={() => onSelect(t.id)}>{shortDate(r.start).slice(2)}</button><button className="date-col table-date" onClick={() => onSelect(t.id)}>{shortDate(r.finish).slice(2)}</button><span className={'progress-col small ' + (t.progress === null ? 'muted' : 'green')}>{t.progress === null ? '—' : Math.round(t.progress * 100) + '%'}</span>
              </div>
              {!mobile && <div className="timeline-track" style={{ width: timelineWidth }}>
                {pref.showReference && <div className="reference-bar" title={'원본 ' + t.referenceStart + ' — ' + t.referenceFinish} style={{ left: (dayNumber(t.referenceStart) - origin) * px, width: Math.max(4, (Math.min(end, dayNumber(t.referenceFinish)) - dayNumber(t.referenceStart) + 1) * px) }} />}
                {left <= timelineWidth && <button aria-label={t.wbs + ' 간트 막대'} className={'gantt-bar bar-' + r.criticality + (t.kind === 'milestone' ? ' milestone' : '') + (isDragging ? ' dragging' : '')} style={{ left, width: draggedWidth, transform }} title={t.wbs + ' · ' + t.name + '\n' + r.start + ' → ' + r.finish + '\n운영 여유 ' + (r.slack ?? '대상 외') + '\n드래그하면 관리 일정을 이동합니다.'}
                  onClick={() => { if (!dragged.current) onSelect(t.id); }} onPointerDown={e => { if (t.actualStart || t.finishRule || e.button !== 0) return; e.preventDefault(); setDrag({ id: t.id, x: e.clientX, delta: 0, mode: 'move' }); }}>
                  {t.progress !== null && t.kind !== 'milestone' && <span className="bar-progress" style={{ width: t.progress * 100 + '%' }} />}
                  {t.kind !== 'milestone' && !t.actualStart && !t.finishRule && <span className="bar-resize" aria-label={t.wbs + ' 기간 조정'} onPointerDown={e => { e.stopPropagation(); e.preventDefault(); setDrag({ id: t.id, x: e.clientX, delta: 0, mode: 'resize' }); }} />}
                </button>}
                {linking && onDependencyChange && left <= timelineWidth && dayNumber(r.finish) <= end && <><button type="button" className={'dependency-port port-start ' + (port?.taskId === t.id && port.end === 'start' ? 'is-chosen' : '')} style={{ left: Math.max(0, left - 15) }} aria-label={t.wbs + ' 시작점 연결'} title="S · 시작점" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); choosePort(t.id, 'start'); }}>S</button><button type="button" className={'dependency-port port-finish ' + (port?.taskId === t.id && port.end === 'finish' ? 'is-chosen' : '')} style={{ left: left + (t.kind === 'milestone' ? 8 : barWidth) + 2 }} aria-label={t.wbs + ' 완료점 연결'} title="F · 완료점" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); choosePort(t.id, 'finish'); }}>F</button></>}
                {selected && left + barWidth < timelineWidth && <span className="bar-label" style={{ left: left + barWidth + 8 }}>{r.duration}일 · {r.slack === null ? '대상 외' : '여유 ' + r.slack + '일'}</span>}
              </div>}
            </div>;
          })}
          {!mobile && connectors.length > 0 && <svg className="dependency-layer connection-layer" style={{ left: width }} width={timelineWidth} height={rows.length * ROW} aria-label="선후행 관계 연결선"><defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M1 1 L6 3.5 L1 6" fill="none" stroke="#9ba59c" /></marker></defs>{connectors.map(e => {
            const a = result.tasks[e.from], b = result.tasks[e.to];
            const ends = dependencyEndpoints(e.type), fromTask = byId.get(e.from)!, toTask = byId.get(e.to)!;
            const endpoint = (id: string, end: 'start' | 'finish') => {
              const r = result.tasks[id], t = byId.get(id)!;
              const left = (dayNumber(r.start) - origin) * px;
              return t.kind === 'milestone' ? left + 4 : end === 'start' ? left : left + Math.max(5, (dayNumber(r.finish) - dayNumber(r.start) + 1) * px);
            };
            const x1 = endpoint(e.from, ends.from), x2 = endpoint(e.to, ends.to);
            const y1 = rowIndex.get(e.from)! * ROW + 17, y2 = rowIndex.get(e.to)! * ROW + 17;
            const label = `${fromTask.wbs} → ${toTask.wbs} · ${e.type} ${e.lag > 0 ? '+' : ''}${e.lag}일`, path = connectorPath(x1, y1, x2, y2, e.type);
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
    {editing && onDependencyChange && <DependencyEditor key={editing.dependency.id} plan={plan} dependency={editing.dependency} creating={editing.creating} onChange={onDependencyChange} onClose={() => setEditing(null)} />}
    {relationList && <Modal title="선후행 관계 목록" onClose={() => setRelationList(false)} wide><div className="modal-body dependency-browser"><div className="dependency-browser-heading"><div><strong>관계 {plan.dependencies.length}개</strong><span>활성 {plan.dependencies.filter(e => e.active).length} · 조건부 제외 {plan.dependencies.filter(e => !e.active).length}</span></div>{onDependencyChange && <button className="button primary" disabled={plan.tasks.length < 2} onClick={newRelation}><Plus size={14} />새 관계</button>}</div><input className="dependency-browser-search" aria-label="관계 검색" placeholder="업무명, WBS, 유형 또는 조건 검색" value={listQuery} onChange={e => setListQuery(e.target.value)} /><div className="dependency-browser-list">{listEdges.slice(listPage * 50, (listPage + 1) * 50).map(e => { const from = byId.get(e.from)!, to = byId.get(e.to)!; return <div key={e.id} className={'dependency-browser-row ' + (!e.active ? 'inactive' : '')}><div className="dependency-browser-tasks"><button data-relation-end="선행" onClick={() => revealTask(e.from)} title="선행 업무로 이동"><b>{from.wbs}</b><span>{from.name}</span></button><ArrowRight size={14} /><button data-relation-end="후행" onClick={() => revealTask(e.to)} title="후행 업무로 이동"><b>{to.wbs}</b><span>{to.name}</span></button></div><div className="dependency-browser-meta"><Badge kind={e.active ? 'normal' : 'muted'}>{e.type} {e.lag > 0 ? '+' : ''}{e.lag}일</Badge>{!e.active && <span>조건부 제외</span>}{e.condition && <small title={e.condition}>{e.condition}</small>}{onDependencyChange && <button className="icon-button" aria-label={from.wbs + ' → ' + to.wbs + ' 관계 편집'} onClick={() => { setRelationList(false); setEditing({ dependency: e, creating: false }); }}><Pencil size={14} /></button>}</div></div>; })}{!listEdges.length && <div className="dependency-browser-empty">검색한 관계가 없습니다.</div>}</div><div className="dependency-browser-pagination"><span>검색 {listEdges.length}개 · 화면 밖 업무도 모두 포함합니다.</span><button className="button compact" disabled={listPage === 0} onClick={() => setListPage(p => p - 1)}>이전</button><span>{listPage + 1} / {Math.max(1, Math.ceil(listEdges.length / 50))}</span><button className="button compact" disabled={(listPage + 1) * 50 >= listEdges.length} onClick={() => setListPage(p => p + 1)}>다음</button></div></div></Modal>}
  </div>;
}
