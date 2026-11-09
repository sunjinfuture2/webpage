import { useMemo, useState, type CSSProperties } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Plan, Preferences, ScheduleResult, Task } from '../core/types';
import { addDays, addMonths, monthLabel, today, shortDate } from '../core/dates';
import { calendarRange, layoutCalendar } from '../core/calendar-layout';
import { Badge, Modal } from './UI';
import './calendar-surface.css';

export interface CalendarProject { id: string; name: string; plan: Plan; result: ScheduleResult; gateTaskIds?: string[] }
interface Props {
  plan: Plan; result: ScheduleResult; tasks: Task[]; preferences: Preferences;
  onPreferences: (p: Partial<Preferences>) => void; onSelect: (id: string) => void;
  projects?: CalendarProject[]; currentProjectId?: string;
  onSelectProjectTask?: (projectId: string, taskId: string) => void;
}
type Event = { id: string; project: CalendarProject; projectIndex: number; task: Task; type: 'task' | 'milestone' | 'gate' };
const PALETTE = [['#e9f4e6', '#1f8e00', '#b1d8a6'], ['#f4e6ed', '#8c0043', '#d4a0b9'], ['#edecff', '#4b42fc', '#bcb9fe'], ['#e8e8e8', '#444444', '#ababab']];
const projectColor = (index: number): CSSProperties => {
  const [background, ink, square] = PALETTE[index % PALETTE.length];
  return { '--calendar-project-bg': background, '--calendar-project-ink': ink, '--calendar-project-square': square } as CSSProperties;
};
export function CalendarView({ plan, result, tasks, preferences: p, onPreferences, onSelect, projects, currentProjectId, onSelectProjectTask }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());
  const week = p.calendarMode === 'week', currentId = currentProjectId || projects?.[0]?.id || 'current';
  const allProjects = useMemo<CalendarProject[]>(() => projects?.length ? projects : [{ id: currentId, name: '현재 프로젝트', plan, result }], [projects, currentId, plan, result]);
  const range = useMemo(() => calendarRange(p.date, week), [p.date, week]);
  const events = useMemo(() => allProjects.flatMap((project, projectIndex) => {
    if (hiddenProjects.has(project.id)) return [];
    const gates = new Set(project.gateTaskIds || []), items = project.id === currentId ? tasks : project.plan.tasks;
    return items.filter(t => !!project.result.tasks[t.id]).map<Event>(task => ({ id: JSON.stringify([project.id, task.id]), project, projectIndex, task, type: gates.has(task.id) ? 'gate' : task.kind === 'milestone' ? 'milestone' : 'task' }));
  }), [allProjects, currentId, tasks, hiddenProjects]);
  const byId = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);
  const weeks = useMemo(() => layoutCalendar(events.map(e => ({ id: e.id, start: e.project.result.tasks[e.task.id].start, finish: e.project.result.tasks[e.task.id].finish, order: e.task.order })), range.origin, week ? 1 : 6, week ? 12 : 4), [events, range.origin, week]);
  const dateEvents = useMemo(() => expanded ? events.filter(e => { const r = e.project.result.tasks[e.task.id]; return r.start <= expanded && r.finish >= expanded; }).sort((a, b) => Number(b.task.kind === 'milestone') - Number(a.task.kind === 'milestone') || a.projectIndex - b.projectIndex || a.task.order - b.task.order) : [], [events, expanded]);
  const select = (event: Event) => { if (event.project.id === currentId) onSelect(event.task.id); else onSelectProjectTask?.(event.project.id, event.task.id); setExpanded(null); };
  const shift = (direction: number) => onPreferences({ date: week ? addDays(p.date, direction * 7) : addMonths(p.date, direction) });
  return <div className="calendar-view calendar-surface">
    <div className="calendar-toolbar"><div className="calendar-month-control"><button className="calendar-month-arrow" aria-label="이전 기간" onClick={() => shift(-1)}><ChevronLeft size={15} /></button><h2>{monthLabel(p.date)}</h2><button className="calendar-month-arrow" aria-label="다음 기간" onClick={() => shift(1)}><ChevronRight size={15} /></button><button className="calendar-today-button" onClick={() => onPreferences({ date: today() })}>오늘</button></div><div className="calendar-display-controls"><label className="calendar-date-picker"><CalendarDays size={13} /><input aria-label="달력 기준일" type="date" value={p.date} onChange={e => { if (e.target.value) onPreferences({ date: e.target.value }); }} /></label><div className="segmented"><button className={!week ? 'active' : ''} onClick={() => onPreferences({ calendarMode: 'month' })}>월</button><button className={week ? 'active' : ''} onClick={() => onPreferences({ calendarMode: 'week' })}>주</button></div></div></div>
    <div className="calendar-context"><div className="calendar-project-filters" aria-label="캘린더 프로젝트 필터">{allProjects.map((project, index) => <button key={project.id} className={'calendar-project-chip ' + (hiddenProjects.has(project.id) ? 'is-muted' : '')} style={projectColor(index)} aria-pressed={!hiddenProjects.has(project.id)} title={project.name} onClick={() => setHiddenProjects(previous => { const next = new Set(previous); if (next.has(project.id)) next.delete(project.id); else next.add(project.id); return next; })}>{project.name}</button>)}</div><div className="calendar-type-legend" aria-label="일정 유형 범례"><span><i className="type-task" />업무</span><span><i className="type-milestone" />마일스톤</span><span><i className="type-gate" />승인게이트</span></div></div>
    <div className={'calendar-grid ' + (week ? 'week-view' : '')}>
      <div className="calendar-weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((d, i) => <div key={d} className={'weekday ' + (i === 0 ? 'sunday' : i === 6 ? 'saturday' : '')}>{d}</div>)}</div>
      {weeks.map((layout, index) => {
        const spare = index >= range.visibleWeeks, hasHidden = layout.hiddenByDay.some(n => n > 0);
        const height = Math.max(101, 31 + layout.visibleLanes * 20 + (hasHidden ? 19 : 9));
        return <div key={layout.start} className={'calendar-week ' + (spare ? 'is-spare-week' : '')} style={{ minHeight: height }} aria-hidden={spare || undefined}>
          {range.dates.slice(index * 7, index * 7 + 7).map((date, column) => <div key={date} className={'calendar-cell ' + (!week && date.slice(0, 7) !== p.date.slice(0, 7) ? 'outside-month ' : '') + (date === today() ? 'is-today' : '')} onDoubleClick={() => setExpanded(date)}><button className={'date-number ' + (column === 0 ? 'sunday' : column === 6 ? 'saturday' : '')} onClick={() => setExpanded(date)} aria-label={date + ' 업무 보기'}>{Number(date.slice(8))}{date === plan.statusDate && <span className="status-label">상태일</span>}</button>{layout.hiddenByDay[column] > 0 && <button className="calendar-more" onClick={() => setExpanded(date)} aria-label={date + ' 숨긴 업무 ' + layout.hiddenByDay[column] + '개 더 보기'}>+{layout.hiddenByDay[column]}개<span className="calendar-more-long"> 더 보기</span></button>}</div>)}
          {!spare && <div className="calendar-events-layer">{layout.visible.map(segment => {
            const event = byId.get(segment.id)!, task = event.task, r = event.project.result.tasks[task.id];
            return <button key={event.id} className={'calendar-event calendar-span-event type-' + event.type + ' event-' + r.criticality + (segment.continuesBefore ? ' continues-before' : '') + (segment.continuesAfter ? ' continues-after' : '')} style={{ ...projectColor(event.projectIndex), left: `calc(${segment.startColumn * 100 / 7}% + ${segment.continuesBefore ? 0 : 1}px)`, width: `calc(${(segment.endColumn - segment.startColumn + 1) * 100 / 7}% - ${segment.continuesBefore ? 2 : 3}px)`, top: segment.lane * 20 }} onClick={() => select(event)} aria-label={event.project.name + ' · ' + task.wbs + ' · ' + task.name} title={event.project.name + '\n' + task.wbs + ' · ' + task.name + '\n' + r.start + ' — ' + r.finish}><>{segment.continuesBefore ? <span className="calendar-continuation" aria-hidden="true">↳</span> : <i className="calendar-event-marker" />}<span>{task.name}</span>{r.criticality === 'critical' && <b className="calendar-critical-marker" aria-label="크리티컬" />}</></button>;
          })}</div>}
        </div>;
      })}
    </div>
    <div className="calendar-footnote"><span>기간은 예상 시작~완료 기준입니다. 일정 막대를 누르면 업무 상세가 열립니다.</span><span>미승인 게이트는 자동 승인되지 않습니다.</span></div>
    {expanded && <Modal title={shortDate(expanded) + ' · ' + dateEvents.length + '개 업무'} onClose={() => setExpanded(null)}><div className="modal-body day-agenda">{dateEvents.length ? dateEvents.map(event => { const t = event.task, r = event.project.result.tasks[t.id]; return <button key={event.id} className="agenda-task" onClick={() => select(event)}><span className="mono muted">{t.wbs}</span><div><small style={projectColor(event.projectIndex)} className="calendar-agenda-project">{event.project.name}</small><strong>{t.name}</strong></div><Badge kind={r.criticality}>{t.kind === 'milestone' ? '마일스톤' : r.duration + '일'}</Badge></button>; }) : <p className="muted">이 날짜에 표시할 업무가 없습니다.</p>}</div></Modal>}
  </div>;
}
