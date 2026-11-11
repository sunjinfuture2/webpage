import type { Plan, ScheduleResult } from '../core/types';
import { shortDate, diffDays } from '../core/dates';
import { changedScheduleTasks } from '../core/schedule-navigation';

export function ScheduleImpact({ plan, before, after, taskId }: { plan: Plan; before: ScheduleResult; after: ScheduleResult; taskId: string }) {
  const changed = changedScheduleTasks(plan, before, after);
  return <section className="schedule-impact" aria-label="업무별 일정 변경 영향"><h3>함께 바뀌는 일정 <span>{changed.length}개</span></h3><p>현재 프로젝트의 예상 시작·완료일을 비교했습니다.</p>{changed.length ? <div className="impact-table-scroll"><table><thead><tr><th>업무</th><th>변경 전 → 변경 후</th><th>완료일 차이</th></tr></thead><tbody>{changed.map(t => {
    const a = before.tasks[t.id], b = after.tasks[t.id], delta = diffDays(b.finish, a.finish);
    return <tr key={t.id}><th><small>{t.wbs} · {t.id === taskId ? '직접 수정' : '연결·기산 조건 반영'}</small><span>{t.name}</span></th><td><span>{shortDate(a.start)} — {shortDate(a.finish)}</span><strong>→ {shortDate(b.start)} — {shortDate(b.finish)}</strong></td><td className={delta > 0 ? 'impact-later' : ''}>{delta > 0 ? '+' : ''}{delta}일</td></tr>;
  })}</tbody></table></div> : <p className="impact-no-change">예상일 변화가 없습니다. 선행 업무나 실제일 등의 조건이 일정을 결정하고 있을 수 있습니다.</p>}</section>;
}
