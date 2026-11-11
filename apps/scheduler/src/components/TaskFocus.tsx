import { ArrowLeft, ArrowRight, GitBranch, X } from 'lucide-react';
import type { Plan, ScheduleResult } from '../core/types';
import { relationshipNames } from '../core/dependency-labels';

export function TaskFocus({ plan, result, id, direction, count, onDirection, onFocus, onOpen, onClose }: { plan: Plan; result: ScheduleResult; id: string; direction: 'nearby' | 'both' | 'before' | 'after'; count: number; onDirection: (d: 'nearby' | 'both' | 'before' | 'after') => void; onFocus: (id: string) => void; onOpen: () => void; onClose: () => void }) {
  const task = plan.tasks.find(t => t.id === id); if (!task) return null;
  return <section className="task-focus" aria-label="연결 집중 보기"><div className="task-focus-heading"><GitBranch size={16} /><div><small>연결 집중 · {count}개 업무</small><strong>{task.wbs} <span>{task.name}</span></strong></div><div className="focus-actions"><select aria-label="집중 경로" value={direction} onChange={e => onDirection(e.target.value as typeof direction)}><option value="nearby">바로 연결된 업무</option><option value="both">앞·뒤 전체 경로</option><option value="before">앞 업무 경로</option><option value="after">뒤 업무 경로</option></select><button className="button compact" onClick={onOpen}>업무 수정</button><button className="icon-button" aria-label="집중 보기 닫기" onClick={onClose}><X size={16} /></button></div></div><div className="focus-neighbors">{(['before', 'after'] as const).map(side => {
    const edges = plan.dependencies.filter(e => e.active && (side === 'before' ? e.to === id : e.from === id));
    return <div key={side}><span className="focus-side-label">{side === 'before' ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}{side === 'before' ? '바로 앞 업무' : '바로 뒤 업무'}</span><div>{edges.map(e => {
      const other = plan.tasks.find(t => t.id === (side === 'before' ? e.from : e.to)); if (!other) return null;
      return <button key={e.id} className={other.phase !== task.phase ? 'outside-phase' : ''} title={other.name + ' · ' + relationshipNames[e.type] + ' · 추가 간격 ' + e.lag + '일' + (other.phase !== task.phase ? ' · 다른 단계' : '')} onClick={() => onFocus(other.id)}><b>{other.wbs}</b>{other.name}<small>{e.type}{e.lag ? (e.lag > 0 ? '+' : '') + e.lag + '일' : ''}</small></button>;
    })}{!edges.length && <span className="muted">연결 없음</span>}</div></div>;
  })}</div><p className="focus-caption">활성 관계로 이어진 현재 프로젝트의 업무입니다. 점선은 다른 단계의 업무이며, 실제 날짜 변화는 남은 여유와 일정 조건에 따라 달라집니다.{result.tasks[id]?.slack !== null && ' · 운영 여유 ' + result.tasks[id]?.slack + '일'}</p></section>;
}
