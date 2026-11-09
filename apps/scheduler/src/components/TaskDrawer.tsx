import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, Link2, LockKeyhole, Plus, Save, Trash2, X } from 'lucide-react';
import type { Controller } from '../useWorkspace';
import type { Dependency, Plan, Task } from '../core/types';
import { newDependency, removeTasks } from '../core/commands';
import { numberOrNull, shortDate } from '../core/dates';
import { externalRelationsFor, resolveExternalDriver } from '../core/explain';
import { portfolioProjects } from '../core/portfolio-workspace';
import { Badge, ErrorText, Modal } from './UI';

const kinds = { critical: 'CP', near: '근접', normal: '여유', outside: '대상 외' };
export function TaskDrawer({ controller: c, onClose }: { controller: Controller; onClose: () => void }) {
  const task = c.plan?.tasks.find(t => t.id === c.selectedId);
  const [draft, setDraft] = useState<Task | null>(task ? structuredClone(task) : null);
  const [tab, setTab] = useState('details');
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState<'close' | 'delete' | null>(null);
  useEffect(() => { setDraft(task ? structuredClone(task) : null); setDirty(false); }, [task]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) { if (dirty) setConfirm('close'); else onClose(); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [dirty, onClose]);
  if (!task || !draft || !c.plan || !c.workspace) return null;
  const r = c.result?.tasks[task.id];
  const patch = (values: Partial<Task>) => { setDraft({ ...draft, ...values }); setDirty(true); };
  const phases = [...new Map(c.plan.tasks.map(t => [t.phase, t.phaseLabel])).entries()].sort(([a], [b]) => a.localeCompare(b));
  const source = c.workspace.source.tasks.find(t => t.id === task.id);
  const close = () => dirty ? setConfirm('close') : onClose();
  const submit = () => {
    const ok = c.commit(p => { p.tasks[p.tasks.findIndex(t => t.id === task.id)] = structuredClone(draft); }, task.wbs + ' 업무 수정');
    if (ok) setDirty(false);
  };
  return <>
    <div className="drawer-mobile-backdrop" onClick={close} />
    <aside className="task-drawer" aria-label="업무 상세" data-testid="task-drawer">
      <div className="drawer-top"><span className="eyebrow">TASK DETAILS</span><button className="icon-button" aria-label="업무 상세 닫기" onClick={close}><X size={19} /></button></div>
      <div className="drawer-heading"><div className="task-kicker"><span>{task.wbs}</span><ChevronRight size={12} /><span>{task.phaseLabel}</span></div><h2>{task.name}</h2><div className="row gap-8"><Badge kind={r?.criticality}>{r ? kinds[r.criticality] : '계산 중'}</Badge><Badge>{task.kind === 'milestone' ? '마일스톤' : '일반 작업'}</Badge>{dirty && <span className="muted small">적용 전 변경</span>}</div></div>
      <div className="drawer-tabs" role="tablist" aria-label="업무 상세 탭">
        {[['details', '업무 정보'], ['links', '선후행'], ['source', '근거·출처'], ['history', '이력']].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}{id === 'links' && <span>{c.plan!.dependencies.filter(e => e.from === task.id || e.to === task.id).length + externalRelationsFor(c.workspace!, task.id).length}</span>}</button>)}
      </div>
      <div className="drawer-body">
        {tab === 'details' && <>
          {r && <div className="forecast-box"><span className="eyebrow">현재 예상 일정</span><strong>{shortDate(r.start)} <span>→</span> {shortDate(r.finish)}</strong><div><span>기간 {r.duration}일</span><span>운영 여유 {r.slack === null ? '대상 외' : r.slack + '일'}</span><span>목표 대비 {r.targetSlack === null ? '—' : r.targetSlack + '일'}</span></div></div>}
          {r && <details className="driver-details"><summary>현재 일정을 결정한 조건</summary>{task.actualStart && <p className="hint">입력한 실제일을 고정하고 관계 충돌을 별도로 표시합니다.</p>}{r.drivers.map((id, index) => {
            const edge = c.plan!.dependencies.find(e => e.id === id);
            const from = edge && c.plan!.tasks.find(t => t.id === edge.from);
            const external = resolveExternalDriver(c.workspace!, id);
            if (external) return <div key={id} className="driver-link"><Link2 size={12} /><span><small>{external.projectName}</small><br />{external.wbs} · {external.name}</span><Badge>{external.type}{external.lag ? ' ' + (external.lag > 0 ? '+' : '') + external.lag + '일' : ''}</Badge></div>;
            return edge && from ? <button key={id} className="driver-link" onClick={() => c.setSelectedId(from.id)}><Link2 size={12} /><span>{from.wbs} · {from.name}</span><Badge>{edge.type} {edge.lag ? (edge.lag > 0 ? '+' : '') + edge.lag + '일' : ''}</Badge></button> : <p className="hint" key={index}>{id.startsWith('external:') ? '연결 프로젝트의 선행 조건 · 프로젝트 연결 화면에서 확인해주세요.' : id}</p>;
          })}</details>}
          <form id="task-form" onSubmit={e => { e.preventDefault(); submit(); }}>
            <label className="field"><span>업무명</span><textarea aria-label="업무명" rows={2} value={draft.name} onChange={e => patch({ name: e.target.value })} required /></label>
            <div className="form-grid"><label className="field"><span>개발 단계</span><select aria-label="개발 단계" value={draft.phase} onChange={e => patch({ phase: e.target.value, phaseLabel: phases.find(([id]) => id === e.target.value)![1] })}>{phases.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
              <label className="field"><span>작업유형</span><select aria-label="작업유형" value={draft.kind} disabled={!!draft.finishRule} onChange={e => patch({ kind: e.target.value as Task['kind'], ...(e.target.value === 'milestone' ? { plannedFinish: draft.plannedStart } : {}) })}><option value="task">일반 작업</option><option value="milestone">마일스톤 · 0일</option></select></label></div>
            <div className="form-section-title">관리 일정 <small>선후행 조건에 따라 예상일이 달라질 수 있습니다</small></div>
            <div className="form-grid"><label className="field"><span>관리 시작일</span><input type="date" value={draft.plannedStart} onChange={e => patch({ plannedStart: e.target.value, ...(draft.kind === 'milestone' ? { plannedFinish: e.target.value } : {}) })} required /></label>
              <label className="field"><span>관리 완료일</span><input type="date" value={draft.plannedFinish} disabled={draft.kind === 'milestone' || !!draft.finishRule} onChange={e => patch({ plannedFinish: e.target.value })} required /></label></div>
            {draft.finishRule && <p className="hint">완료일은 SAT 승인일 +{draft.finishRule.months}개월로 자동 계산합니다.</p>}
            <label className="field"><span>기타 추가지연 <small>달력일 · 원 관리 시작일 기준</small></span><input aria-label="기타 추가지연" type="number" min="0" step="1" value={draft.delay} onChange={e => patch({ delay: Number(e.target.value) })} /></label>
            <div className="reference-line"><LockKeyhole size={13} /><span>원본 참조계획</span><b>{shortDate(task.referenceStart)} — {shortDate(task.referenceFinish)}</b></div>
            <div className="form-section-title">상태와 실적</div>
            <div className="form-grid"><label className="field"><span>업무 상태</span><select aria-label="업무 상태" value={draft.status} onChange={e => patch({ status: e.target.value })}>{['계획', '확인 전', '진행', '완료', '보류', '조건부 미발동'].map(x => <option key={x}>{x}</option>)}</select></label>
              <label className="field"><span>진척률 <small>% · 공란 = 미입력</small></span><input aria-label="진척률" type="number" min="0" max="100" step="0.1" placeholder="미입력" value={draft.progress === null ? '' : Math.round(draft.progress * 1000) / 10} onChange={e => patch({ progress: e.target.value === '' ? null : Number(e.target.value) / 100 })} /></label></div>
            <div className="form-grid"><label className="field"><span>실제 시작일</span><input type="date" value={draft.actualStart || ''} onChange={e => patch({ actualStart: e.target.value || null })} /></label>
              <label className="field"><span>실제 완료일</span><input type="date" value={draft.actualFinish || ''} onChange={e => patch({ actualFinish: e.target.value || null })} /></label></div>
            <label className="field"><span>잔여기간 <small>달력일 · 미완료 착수 업무</small></span><input type="number" min="0" step="1" placeholder="미입력" value={draft.remaining ?? ''} onChange={e => patch({ remaining: numberOrNull(e.target.value) })} /></label>
            <div className="form-section-title">담당과 책임</div>
            <div className="form-grid"><label className="field"><span>주 담당</span><input value={draft.primary || ''} placeholder="미지정" onChange={e => patch({ primary: e.target.value || null })} /></label>
              <label className="field"><span>부 담당</span><input value={draft.secondary || ''} placeholder="미지정" onChange={e => patch({ secondary: e.target.value || null })} /></label></div>
            <label className="field"><span>투입인원 <small>명 · 가용률과 구분</small></span><input type="number" min="0" step="1" value={draft.headcount ?? ''} placeholder="미입력" onChange={e => patch({ headcount: numberOrNull(e.target.value) })} /></label>
            <div className="role-list">{([['A', '승인'], ['R', '실행'], ['C', '협의']] as const).map(([key, name]) => <label key={key}><span className="role-key">{key}</span><span>{name}</span><input aria-label={name + ' 역할'} value={draft.roles[key]} onChange={e => patch({ roles: { ...draft.roles, [key]: e.target.value } })} placeholder="역할 미입력" /></label>)}</div>
            <label className="field"><span>완료기준·조건</span><textarea aria-label="완료기준·조건" rows={3} value={draft.criteria} onChange={e => patch({ criteria: e.target.value })} /></label>
            <label className="field"><span>확약·조건</span><textarea aria-label="확약·조건" rows={2} value={draft.conditions} onChange={e => patch({ conditions: e.target.value })} /></label>
            <label className="field"><span>증빙·확인사항</span><textarea aria-label="증빙·확인사항" rows={3} value={draft.evidence} onChange={e => patch({ evidence: e.target.value })} placeholder="확인한 근거를 기록하세요" /></label>
          </form>
          {r && c.result?.issues.filter(i => i.taskId === task.id).map((i, index) => <ErrorText key={index}>{i.message}</ErrorText>)}
        </>}
        {tab === 'links' && <Relations task={task} controller={c} />}
        {tab === 'source' && <>
          <div className="info-box"><LockKeyhole size={16} /><div><strong>원본 데이터는 보존됩니다</strong><p>가져온 조건부 참조계획입니다. 정식 승인 기준선과 구분합니다.</p></div></div>
          <dl className="definition-list"><dt>원본 파일</dt><dd>{c.workspace.source.sourceFile}</dd><dt>시트 · 행</dt><dd>{task.sourceSheet} · {task.sourceRow ?? '사용자 추가'}</dd><dt>원 WBS</dt><dd>{source?.sourceWbs || task.wbs}</dd><dt>달력</dt><dd>{source?.sourceCalendarCondition || '달력일'}</dd><dt>원본 조건</dt><dd>{source?.commitmentAndOriginalStatus || '—'}</dd><dt>원본 증빙</dt><dd>{source?.evidenceNote || '미입력'}</dd></dl>
          {source && <details className="source-details"><summary>32개 원본 필드와 수식 보기</summary><table className="source-table"><tbody>{Object.entries(source.sourceCells).map(([key, v]) => <tr key={key}><th>{key}</th><td>{String(v ?? '미입력')}{source.sourceFormulas[key] && <code>{source.sourceFormulas[key]}</code>}</td></tr>)}</tbody></table></details>}
        </>}
        {tab === 'history' && <div className="audit-list">{c.workspace.audit.filter(a => a.scenarioId === c.plan!.id && (a.label.includes(task.wbs) || /실행취소|다시실행/.test(a.label))).slice().reverse().map((a, i) => <div key={i}><span className="audit-dot" /><strong>{a.label}</strong><time>{new Date(a.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</time></div>)}<p className="hint">이 작업공간에서 기록한 변경 이력입니다. 단일 사용자 로컬 모드로 저장됩니다.</p></div>}
      </div>
      <div className="drawer-footer"><button className="icon-button danger" aria-label="업무 삭제" onClick={() => setConfirm('delete')}><Trash2 size={17} /></button><span className="small muted">{dirty ? '변경사항을 적용해주세요' : '현재 작업공간에 저장'}</span><button className="button primary" type="submit" form="task-form" disabled={!dirty || tab !== 'details'}><Save size={15} />변경 적용</button></div>
    </aside>
    {confirm && <Modal title={confirm === 'delete' ? '업무를 삭제할까요?' : '적용하지 않은 변경사항이 있습니다'} onClose={() => setConfirm(null)}><div className="modal-body"><p>{confirm === 'delete' ? task.wbs + ' 업무와 해당 선후행 관계를 삭제합니다. 실행취소로 복구할 수 있습니다.' : '현재 입력을 버리고 상세 화면을 닫을까요?'}</p></div><div className="modal-footer"><button className="button" onClick={() => setConfirm(null)}>취소</button><button className="button primary" onClick={() => { if (confirm === 'close') onClose(); else if (c.commit(p => removeTasks(p, [task.id]), task.wbs + ' 업무 삭제')) onClose(); setConfirm(null); }}>{confirm === 'delete' ? '삭제' : '닫기'}</button></div></Modal>}
  </>;
}

function Relations({ task, controller: c }: { task: Task; controller: Controller }) {
  const p = c.plan!;
  const links = p.dependencies.filter(e => e.from === task.id || e.to === task.id);
  const external = externalRelationsFor(c.workspace!, task.id), projects = portfolioProjects(c.workspace!);
  const [adding, setAdding] = useState(false), [from, setFrom] = useState(''), [direction, setDirection] = useState('before');
  const [type, setType] = useState<Dependency['type']>('FS'), [lag, setLag] = useState(0);
  const sorted = [...p.tasks].filter(t => t.id !== task.id).sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }));
  return <>
    <div className="section-heading"><h3>연결된 업무 <span>{links.length + external.length}</span></h3><button className="text-button" onClick={() => setAdding(!adding)}><Plus size={14} />관계 추가</button></div>
    <p className="hint">FS 완료→시작 · SS 시작→시작 · FF 완료→완료 · SF 시작→완료. 간격은 달력일이며 FS에는 다음날 1일이 포함됩니다.</p>
    {adding && <form className="relation-add" onSubmit={e => {
      e.preventDefault();
      if (!from) return;
      const edge = direction === 'before' ? newDependency(from, task.id, type, lag) : newDependency(task.id, from, type, lag);
      if (c.commit(d => d.dependencies.push(edge), task.wbs + ' 관계 추가')) { setAdding(false); setFrom(''); }
    }}><label className="field"><span>방향</span><select aria-label="방향" value={direction} onChange={e => setDirection(e.target.value)}><option value="before">선행 업무 추가</option><option value="after">후행 업무 추가</option></select></label>
      <label className="field"><span>연결할 업무</span><select aria-label="연결할 업무" value={from} onChange={e => setFrom(e.target.value)} required><option value="">업무 선택</option>{sorted.map(t => <option key={t.id} value={t.id}>{t.wbs} · {t.name}</option>)}</select></label>
      <div className="form-grid"><label className="field"><span>관계 유형</span><select aria-label="관계 유형" value={type} onChange={e => setType(e.target.value as Dependency['type'])}>{['FS', 'SS', 'FF', 'SF'].map(t => <option key={t}>{t}</option>)}</select></label><label className="field"><span>추가간격</span><input type="number" step="1" value={lag} onChange={e => setLag(Number(e.target.value))} /></label></div>
      <button className="button primary"><Link2 size={14} />관계 추가</button>
    </form>}
    {links.map(e => <RelationRow key={e.id} edge={e} task={task} plan={p} commit={c.commit} onSelect={c.setSelectedId} />)}
    {external.map(edge => {
      const incoming = edge.to.projectId === c.workspace!.projectId && edge.to.taskId === task.id;
      const other = incoming ? edge.from : edge.to, project = projects.find(project => project.id === other.projectId);
      const target = project?.plan.tasks.find(task => task.id === other.taskId);
      return <div className={'relation-card ' + (!edge.active ? 'inactive' : '')} key={'external:' + edge.id}><span className="relation-direction">외부 프로젝트 · {incoming ? '선행' : '후행'}</span><strong>{project?.name || '연결 프로젝트'}</strong><p>{target?.wbs} · {target?.name || '연결 업무 확인 필요'}</p><Badge kind={edge.active ? 'green' : 'muted'}>{edge.type} {edge.lag > 0 ? '+' : ''}{edge.lag}일 · {edge.active ? '적용' : '제외'}</Badge><p className="hint">프로젝트 연결 화면에서 이 관계를 편집할 수 있습니다.</p></div>;
    })}
    {!links.length && !external.length && <p className="hint">연결된 선후행 업무가 없습니다.</p>}
  </>;
}
function RelationRow({ edge: e, task, plan, commit, onSelect }: { edge: Dependency; task: Task; plan: Plan; commit: Controller['commit']; onSelect: (id: string) => void }) {
  const [type, setType] = useState(e.type), [lag, setLag] = useState(e.lag), [active, setActive] = useState(e.active);
  useEffect(() => { setType(e.type); setLag(e.lag); setActive(e.active); }, [e]);
  const other = plan.tasks.find(t => t.id === (e.to === task.id ? e.from : e.to))!;
  const changed = type !== e.type || lag !== e.lag || active !== e.active;
  return <div className={'relation-card ' + (!e.active ? 'inactive' : '')}>
    <span className="relation-direction">{e.to === task.id ? '선행' : '후행'} · {e.sourceId}</span>
    <button className="relation-title" onClick={() => onSelect(other.id)}><span>{other.wbs}</span>{other.name}<ArrowUpRight size={13} /></button>
    <div className="relation-controls"><select aria-label={e.sourceId + ' 관계유형'} value={type} onChange={ev => setType(ev.target.value as Dependency['type'])}>{['FS', 'SS', 'FF', 'SF'].map(t => <option key={t}>{t}</option>)}</select><label>간격 <input aria-label={e.sourceId + ' 추가간격'} type="number" step="1" value={lag} onChange={ev => setLag(Number(ev.target.value))} />일</label><label className="check-label"><input type="checkbox" checked={active} onChange={ev => setActive(ev.target.checked)} />적용</label><button className="icon-button" aria-label={e.sourceId + ' 관계 저장'} disabled={!changed} onClick={() => commit(p => Object.assign(p.dependencies.find(x => x.id === e.id)!, { type, lag, active }), task.wbs + ' 관계 수정')}><Check size={15} /></button><button className="icon-button danger" aria-label={e.sourceId + ' 관계 삭제'} onClick={() => commit(p => { p.dependencies = p.dependencies.filter(x => x.id !== e.id); }, task.wbs + ' 관계 삭제')}><Trash2 size={14} /></button></div>
    {e.condition && <p className="hint">{e.condition}</p>}
  </div>;
}
