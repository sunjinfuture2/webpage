import { useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, Flag } from 'lucide-react';
import type { Plan, ScheduleResult, SourceRecord, Task } from '../core/types';
import { addMonths, diffDays, monthStart, shortDate } from '../core/dates';
import { phaseSummaries } from '../core/schedule-navigation';
import { Empty } from './UI';

export function MasterOverview({ plan, result, tasks, gates, onPhase, onTask }: {
  plan: Plan; result: ScheduleResult; tasks: Task[]; gates: SourceRecord[];
  onPhase: (phase: string, date: string) => void; onTask: (id: string) => void;
}) {
  const [full, setFull] = useState(false);
  const groups = useMemo(() => phaseSummaries(tasks, result), [tasks, result]);
  if (!groups.length) return <Empty title="조건에 맞는 업무가 없습니다">검색어를 바꿔보세요.</Empty>;
  const start = monthStart(groups.map(g => g.start).sort()[0]);
  const last = groups.map(g => g.finish).sort().at(-1)!;
  const finish = full ? last : [last, addMonths(result.operationDate, 7)].sort()[0];
  const end = addMonths(monthStart(finish < start ? start : finish), 1);
  const span = Math.max(1, diffDays(end, start));
  const x = (date: string) => Math.max(0, Math.min(100, diffDays(date, start) / span * 100));
  const months: string[] = [];
  for (let date = start; date < end && months.length < 1200; date = addMonths(date, 1)) months.push(date);
  const gateWbs = new Set(gates.map(g => String(g.fields['연결 WBS'] || '')));
  const milestones = tasks.filter(t => gateWbs.has(t.wbs)).sort((a, b) => result.tasks[a.id].finish.localeCompare(result.tasks[b.id].finish));
  const highlights = milestones.length ? milestones : tasks.filter(t => t.kind === 'milestone').sort((a, b) => result.tasks[a.id].start.localeCompare(result.tasks[b.id].start)).slice(0, 8);
  return <section className="master-overview" aria-label="전체 일정 개요">
    <div className="overview-heading"><div><span className="eyebrow">PROJECT AT A GLANCE</span><h2>전체 흐름, 한눈에.</h2><p>{tasks.length}개 업무 · {groups.length}개 단계{tasks.length !== plan.tasks.length && ' · 검색 결과'}<span>단계를 누르면 상세 일정으로 이동합니다.</span></p></div><label className="check-label"><input type="checkbox" checked={full} onChange={e => setFull(e.target.checked)} />전체 지원기간 보기</label></div>
    <div className="overview-legend"><span><i className="risk-normal" />진행 계획</span><span><i className="risk-near" />여유 14일 이내</span><span><i className="risk-critical" />여유 0일 이하</span><span><i className="risk-conditional" />조건부 대기</span><span>◆ 주요 승인 · 마일스톤</span></div>
    <div className="overview-scroll"><div className="overview-chart">
      <div className="overview-axis"><span>개발 단계 / 운영 여유</span><div>{months.map((date, i) => (i === 0 || date.slice(5, 7) === '01' || months.length <= 36 || months.length <= 80 && (Number(date.slice(5, 7)) - 1) % 3 === 0) && <span key={date} style={{ left: x(date) + '%' }}><b>{date.slice(5, 7) === '01' || i === 0 ? date.slice(0, 4) : '\u00a0'}</b><small>{Number(date.slice(5, 7))}월</small></span>)}</div></div>
      {groups.map((group, i) => {
        const risk = group.critical ? 'critical' : group.near ? 'near' : 'normal';
        const label = group.slack === null ? '운영 여유 대상 외' : group.slack <= 0 ? '여유 ' + group.slack + '일 · CP' : '최소 여유 ' + group.slack + '일';
        return <div className="overview-phase" key={group.id}>
          <button className="overview-phase-label" onClick={() => onPhase(group.id, group.start)} aria-label={group.id + ' 상세 일정 열기'}><span className={'phase-token tone-' + i % 4}>{group.id}</span><div><strong>{group.label.replace(/^\d+\s*/, '')}</strong><span>{group.tasks.length}개 업무 · 완료 {group.completed}개{group.conditional > 0 && ' · 조건부 ' + group.conditional + '개'}</span><small className={'risk-text-' + risk}>{label}</small></div><ChevronRight size={14} /></button>
          <div className="overview-lane">{months.map(date => <i className="overview-gridline" key={date} style={{ left: x(date) + '%' }} />)}
            {group.start < end && <button className={'overview-span risk-' + risk} style={{ left: x(group.start) + '%', width: Math.min(100 - x(group.start), Math.max(.3, x(group.finish) - x(group.start) + 100 / span)) + '%' }} onClick={() => onPhase(group.id, group.start)} title={group.label + ' · ' + group.start + ' ~ ' + group.finish + ' · ' + label}><span>{shortDate(group.start).slice(2)} — {shortDate(group.finish).slice(2)}</span>{group.finish >= end && <ArrowRight size={13} />}</button>}
            {group.tasks.filter(t => t.kind === 'milestone' && result.tasks[t.id].start >= start && result.tasks[t.id].start < end).map(t => <button className={'overview-milestone ' + (gateWbs.has(t.wbs) ? 'is-gate' : '')} key={t.id} style={{ left: x(result.tasks[t.id].start) + '%' }} aria-label={t.wbs + ' ' + t.name + ' 연결 살펴보기'} title={t.wbs + ' · ' + t.name + ' · ' + result.tasks[t.id].start} onClick={() => onTask(t.id)}>◆</button>)}
            {group.tasks.filter(t => t.status === '조건부 미발동' && result.tasks[t.id].start < end).map(t => <button key={'conditional-' + t.id} className="overview-conditional risk-conditional" style={{ left: x(result.tasks[t.id].start) + '%', width: Math.min(100 - x(result.tasks[t.id].start), Math.max(.4, x(result.tasks[t.id].finish) - x(result.tasks[t.id].start) + 100 / span)) + '%' }} title={t.wbs + ' · ' + t.name + ' · 조건부 대기'} aria-label={t.wbs + ' 조건부 업무 살펴보기'} onClick={() => onTask(t.id)} />)}
            {group.start >= end && <button className="overview-outside" onClick={() => onPhase(group.id, group.start)}>표시 범위 이후 시작 <ArrowRight size={12} /></button>}
          </div>
        </div>;
      })}
    </div></div>
    <p className="overview-note">막대는 단계의 첫 시작부터 마지막 완료까지입니다. 최소 여유는 완료·조건부 대기 업무를 제외한 하위 업무 기준이며, 모든 업무가 동시에 진행된다는 뜻은 아닙니다. {full ? '' : '표시 범위를 넘는 기간은 화살표로 표시합니다.'}</p>
    <div className="overview-milestones"><div className="overview-section-title"><Flag size={15} /><h3>{milestones.length ? '주요 승인 지점' : '주요 마일스톤'}</h3><span>선택하면 연결 업무를 함께 봅니다</span></div><div className="milestone-rail">{highlights.map(t => <button key={t.id} onClick={() => onTask(t.id)}><small>{t.wbs}<ArrowRight size={12} /></small><strong>{t.name}</strong><time>{shortDate(result.tasks[t.id].finish)}</time><span>{t.roles.A || '승인 역할 미입력'}</span></button>)}{!highlights.length && <p className="muted">등록된 마일스톤이 없습니다.</p>}</div></div>
  </section>;
}
