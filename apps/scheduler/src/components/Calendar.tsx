import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import type { Plan, Preferences, ScheduleResult, Task } from '../core/types';
import { addDays, addMonths, dayNumber, fromDay, monthLabel, monthStart, today, shortDate } from '../core/dates';
import { Badge, Modal } from './UI';

interface Props { plan: Plan; result: ScheduleResult; tasks: Task[]; preferences: Preferences; onPreferences: (p: Partial<Preferences>) => void; onSelect: (id: string) => void }
export function CalendarView({ plan, result, tasks, preferences: p, onPreferences, onSelect }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const mode = p.calendarMode || 'month', week = mode === 'week';
  const first = week ? p.date : monthStart(p.date);
  const origin = dayNumber(first) - new Date(first + 'T00:00:00Z').getUTCDay();
  const dates = Array.from({ length: week ? 7 : 42 }, (_, i) => fromDay(origin + i));
  const onDate = (d: string) => tasks.filter(t => {
    const r = result.tasks[t.id]; return r && r.start <= d && r.finish >= d;
  }).sort((a, b) => Number(b.kind === 'milestone') - Number(a.kind === 'milestone') || (result.tasks[a.id].criticality === 'critical' ? -1 : 1) || a.order - b.order);
  const dateTasks = expanded ? onDate(expanded) : [];
  return <div className="calendar-view">
    <div className="calendar-toolbar"><div className="row gap-12"><h2>{monthLabel(p.date)}</h2><div className="row"><button className="icon-button" aria-label="이전 기간" onClick={() => onPreferences({ date: week ? addDays(p.date, -7) : addMonths(p.date, -1) })}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="다음 기간" onClick={() => onPreferences({ date: week ? addDays(p.date, 7) : addMonths(p.date, 1) })}><ChevronRight size={18} /></button></div><button className="button compact" onClick={() => onPreferences({ date: today() })}>오늘</button></div>
      <div className="row gap-12"><label className="calendar-date-picker"><CalendarDays size={15} /><input aria-label="달력 기준일" type="date" value={p.date} onChange={e => { if (e.target.value) onPreferences({ date: e.target.value }); }} /></label><div className="segmented"><button className={!week ? 'active' : ''} onClick={() => onPreferences({ calendarMode: 'month' })}>월</button><button className={week ? 'active' : ''} onClick={() => onPreferences({ calendarMode: 'week' })}>주</button></div></div></div>
    <div className={'calendar-grid ' + (week ? 'week-view' : '')}>
      {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => <div key={d} className={'weekday ' + (i === 0 ? 'sunday' : i === 6 ? 'saturday' : '')}>{d}</div>)}
      {dates.map((date, index) => {
        const list = onDate(date), outside = !week && date.slice(0, 7) !== p.date.slice(0, 7);
        return <div key={date} className={'calendar-cell ' + (outside ? 'outside-month ' : '') + (date === today() ? 'is-today' : '')} onDoubleClick={() => setExpanded(date)}>
          <button className={'date-number ' + (index % 7 === 0 ? 'sunday' : index % 7 === 6 ? 'saturday' : '')} onClick={() => setExpanded(date)} aria-label={date + ' 업무 보기'}>{Number(date.slice(8))}{date === plan.statusDate && <span className="status-label">상태일</span>}</button>
          <div className="calendar-events">{list.slice(0, week ? 30 : 3).map(t => {
            const r = result.tasks[t.id];
            return <button className={'calendar-event event-' + r.criticality + ' phase-' + t.phase} key={t.id} onClick={() => onSelect(t.id)} title={t.wbs + ' · ' + t.name + '\n' + r.start + ' — ' + r.finish}>
              {t.kind === 'milestone' ? <Flag size={10} /> : <i />}<span>{t.name}</span>{week && <small>{t.wbs}</small>}
            </button>;
          })}</div>
          {!week && list.length > 3 && <button className="calendar-more" onClick={() => setExpanded(date)}>+{list.length - 3}개 더 보기</button>}
        </div>;
      })}
    </div>
    <div className="calendar-footnote"><span className="green-dot" />실제 업무의 시작~완료 기간 표시 · 미승인 게이트는 자동 승인되지 않습니다.</div>
    {expanded && <Modal title={shortDate(expanded) + ' · ' + dateTasks.length + '개 업무'} onClose={() => setExpanded(null)}><div className="modal-body day-agenda">{dateTasks.length ? dateTasks.map(t => <button key={t.id} className="agenda-task" onClick={() => { onSelect(t.id); setExpanded(null); }}><span className="mono muted">{t.wbs}</span><strong>{t.name}</strong><Badge kind={result.tasks[t.id].criticality}>{t.kind === 'milestone' ? '마일스톤' : result.tasks[t.id].duration + '일'}</Badge></button>) : <p className="muted">이 날짜에 계획된 업무가 없습니다.</p>}</div></Modal>}
  </div>;
}
