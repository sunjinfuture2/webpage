import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Copy, ExternalLink, FileText, Flag, Link2, Package, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { Controller } from '../useWorkspace';
import type { Plan, Procurement, SourceRecord, Task } from '../core/types';
import { calculate } from '../core/engine';
import { planFromSource } from '../core/seed';
import { connectedDrivingPath, drivingPath } from '../core/explain';
import { calculateWorkspaceScenarios } from '../core/scenario-results';
import { shortDate } from '../core/dates';
import { Badge, Empty, ErrorText, Modal } from './UI';

export function TaskList({ controller: c, tasks, checked, onCheck }: { controller: Controller; tasks: Task[]; checked: Set<string>; onCheck: (id: string) => void }) {
  const r = c.result!;
  const field = (t: Task, key: 'primary' | 'name', value: string) => {
    if ((t[key] || '') !== value) c.commit(p => { const target = p.tasks.find(x => x.id === t.id)!; if (key === 'primary') target.primary = value || null; else target.name = value; }, t.wbs + ' ' + (key === 'primary' ? '담당' : '업무명') + ' 수정');
  };
  if (!tasks.length) return <Empty title="조건에 맞는 업무가 없습니다" />;
  return <div className="list-view scroll-area"><table className="data-table task-table"><thead><tr><th /><th>WBS</th><th>업무명</th><th>관리 시작</th><th>관리 완료</th><th>예상 완료</th><th>상태</th><th>주 담당</th><th>진척률</th><th>운영 여유</th></tr></thead><tbody>{tasks.map(t => {
    const x = r.tasks[t.id]; if (!x) return null;
    return <tr key={t.id} className={c.selectedId === t.id ? 'selected' : ''}><td><input type="checkbox" aria-label={t.wbs + ' 선택'} checked={checked.has(t.id)} onChange={() => onCheck(t.id)} /></td><td><button className="text-button mono" onClick={() => c.setSelectedId(t.id)}>{t.wbs}</button></td>
      <td className="list-name"><div className="row gap-8"><button className="icon-button compact" aria-label={t.wbs + ' 상세 열기'} onClick={() => c.setSelectedId(t.id)}>{t.kind === 'milestone' ? <Flag size={13} /> : <ArrowUpRight size={13} />}</button><input key={t.name} aria-label={t.wbs + ' 업무명'} defaultValue={t.name} onBlur={e => field(t, 'name', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></div></td>
      <td><input type="date" aria-label={t.wbs + ' 관리 시작'} value={t.plannedStart} onChange={e => { if (!e.target.value) return; c.commit(p => { const a = p.tasks.find(x => x.id === t.id)!; a.plannedStart = e.target.value; if (a.kind === 'milestone') a.plannedFinish = e.target.value; }, t.wbs + ' 관리 시작 변경'); }} /></td>
      <td><input type="date" aria-label={t.wbs + ' 관리 완료'} value={t.plannedFinish} disabled={t.kind === 'milestone' || !!t.finishRule} onChange={e => { if (e.target.value) c.commit(p => { p.tasks.find(x => x.id === t.id)!.plannedFinish = e.target.value; }, t.wbs + ' 관리 완료 변경'); }} /></td><td className="mono nowrap">{shortDate(x.finish)}</td>
      <td><Badge kind={x.criticality}>{t.status}</Badge></td><td><input key={t.primary || ''} aria-label={t.wbs + ' 주 담당'} defaultValue={t.primary || ''} placeholder="미지정" onBlur={e => field(t, 'primary', e.target.value)} /></td>
      <td className="mono">{t.progress === null ? <span className="muted">미입력</span> : Math.round(t.progress * 100) + '%'}</td><td><Badge kind={x.criticality}>{x.slack === null ? '대상 외' : x.slack + '일'}</Badge></td></tr>;
  })}</tbody></table></div>;
}

export function ProcurementView({ controller: c, query }: { controller: Controller; query: string }) {
  const [editing, setEditing] = useState<Procurement | null>(null);
  const [draft, setDraft] = useState<Procurement | null>(null);
  const [error, setError] = useState('');
  const p = c.plan!, r = c.result!;
  const items = p.procurement.filter(x => (x.name + x.id + x.supplier).toLowerCase().includes(query.toLowerCase()));
  const open = (x: Procurement) => { setEditing(x); setDraft(structuredClone(x)); setError(''); };
  return <div className="ledger-view"><div className="ledger-note"><Package size={17} /><div><strong>{p.procurement.length}개 설비 패키지</strong><span>납기·기산조건·PO 지연을 일정과 함께 관리합니다. 미확약을 확보 완료로 표시하지 않습니다.</span></div><Badge kind="warning">{p.procurement.filter(x => x.commitment !== '확약').length}개 미확약</Badge></div>
    <div className="scroll-area"><table className="data-table procurement-table"><thead><tr><th>패키지 · 설비</th><th>계약·PO</th><th>예상 PO</th><th>예상 설치완료</th><th>운영 여유</th><th>PO 추가지연</th><th>확약 납기</th><th>확약 상태</th><th /></tr></thead><tbody>{items.map(x => {
      const po = p.tasks.find(t => t.id === x.poTaskId)!, pr = r.tasks[x.poTaskId], install = r.tasks[x.installTaskId];
      return <tr key={x.id}><td><small>{x.id}</small><button className="table-name-button" onClick={() => open(x)}>{x.name}</button></td><td><button className="text-button mono" onClick={() => c.setSelectedId(po.id)}>{po.wbs}<ArrowUpRight size={11} /></button></td><td className="mono">{shortDate(pr?.start)}</td><td className="mono">{shortDate(install?.finish)}</td><td><Badge kind={pr?.criticality}>{pr?.slack === null ? '대상 외' : pr?.slack + '일'}</Badge></td>
        <td><div className="inline-number"><input aria-label={x.id + ' PO 추가지연'} key={x.delay} type="number" min="0" step="1" defaultValue={x.delay} onBlur={e => { const n = Number(e.target.value); if (n !== x.delay) c.commit(d => { d.procurement.find(a => a.id === x.id)!.delay = n; }, x.id + ' PO 지연 변경'); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><span>일</span></div></td><td>{x.leadWeeks === null ? <span className="muted">미입력</span> : x.leadWeeks + '주'}</td><td><Badge kind={x.commitment === '확약' ? 'green' : 'warning'}>{x.commitment}</Badge></td><td><button className="icon-button" aria-label={x.id + ' 조달 편집'} onClick={() => open(x)}><ArrowUpRight size={16} /></button></td></tr>;
    })}</tbody></table></div>
    {editing && draft && <Modal title={editing.id + ' · ' + editing.name} onClose={() => setEditing(null)} wide><form onSubmit={e => { e.preventDefault(); const ok = c.commit(plan => Object.assign(plan.procurement.find(x => x.id === draft.id)!, draft), draft.id + ' 조달 입력 변경'); if (ok) setEditing(null); else setError('입력값을 확인해주세요. 변경은 아직 적용되지 않았습니다.'); }}><div className="modal-body"><div className="info-box"><Link2 size={16} /><p>기산조건부터 현장 납품까지의 달력주입니다. 이미 납기에 포함된 운송일은 다시 더하지 마세요.</p></div>
      <div className="form-grid"><label className="field"><span>PO 추가지연 · 일</span><input type="number" min="0" step="1" value={draft.delay} onChange={e => setDraft({ ...draft, delay: Number(e.target.value) })} /></label><label className="field"><span>확약 납기 · 주</span><input type="number" min="0" step="0.1" placeholder="미입력" value={draft.leadWeeks ?? ''} onChange={e => setDraft({ ...draft, leadWeeks: e.target.value === '' ? null : Number(e.target.value) })} /></label></div>
      <div className="form-grid"><label className="field"><span>납기 기산조건</span><select aria-label="납기 기산조건" value={draft.trigger} onChange={e => setDraft({ ...draft, trigger: e.target.value })}>{['미확정', 'PO 발행', '선금 지급', '도면 승인', '복합 조건'].map(x => <option key={x}>{x}</option>)}</select></label><label className="field"><span>기산조건 충족일</span><input type="date" value={draft.triggerDate || ''} onChange={e => setDraft({ ...draft, triggerDate: e.target.value || null })} /></label></div>
      <div className="form-grid"><label className="field"><span>별도 운송 · 일</span><input type="number" min="0" step="1" value={draft.transport} onChange={e => setDraft({ ...draft, transport: Number(e.target.value) })} /></label><label className="field"><span>확약 상태</span><select aria-label="확약 상태" value={draft.commitment} onChange={e => setDraft({ ...draft, commitment: e.target.value })}>{['미확약', '견적 수령', '조건부 확약', '확약'].map(x => <option key={x}>{x}</option>)}</select></label></div>
      <label className="field"><span>공급사·계약상태</span><input value={draft.supplier} onChange={e => setDraft({ ...draft, supplier: e.target.value })} placeholder="미입력" /></label><label className="field"><span>견적·조건 증빙</span><textarea rows={3} value={draft.evidence} onChange={e => setDraft({ ...draft, evidence: e.target.value })} /></label>
      <details className="source-details"><summary>원본 포함 범위·설치 조건</summary><dl className="definition-list">{Object.entries(c.workspace!.source.procurementPackages[editing.sourceIndex].fields).filter(([k]) => /범위|경계|조건|증빙|순서/.test(k)).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v ?? '미입력')}</dd></div>)}</dl></details>{error && <ErrorText>{error}</ErrorText>}</div><div className="modal-footer"><button type="button" className="button" onClick={() => setEditing(null)}>취소</button><button className="button primary"><Check size={15} />변경 적용</button></div></form></Modal>}
  </div>;
}

export function GatesView({ controller: c, query }: { controller: Controller; query: string }) {
  const p = c.plan!, r = c.result!;
  const records = c.workspace!.source.gates.filter(x => JSON.stringify(x.fields).includes(query));
  return <div className="cards-view scroll-area"><div className="section-intro"><ShieldCheck size={19} /><div><h2>승인게이트</h2><p>예상 승인일과 실제 승인 상태를 구분합니다. 날짜가 도래해도 자동 승인되지 않습니다.</p></div></div><div className="gate-grid">{records.map(rec => {
    const f = rec.fields, t = p.tasks.find(t => t.wbs === f['연결 WBS']);
    return <article className="gate-card" key={String(f['게이트'])}><div className="row between"><span className="gate-number">{String(f['게이트'])}</span><Badge>{String(f['상태'])}</Badge></div><h3>{String(f['승인 사항'])}</h3><span className="muted small">예상 승인일</span><strong className="gate-date">{t ? shortDate(r.tasks[t.id]?.finish) : '연결 확인 필요'}</strong><div className="gate-separator" /><dl><dt>승인 역할</dt><dd>{String(f['승인 역할'])}</dd><dt>통과 증빙</dt><dd>{String(f['통과 증빙'])}</dd><dt>미충족 처리</dt><dd>{String(f['미충족 처리'])}</dd></dl><button className="text-button" disabled={!t} onClick={() => t && c.setSelectedId(t.id)}>{String(f['연결 WBS'])} 일정 열기<ArrowRight size={14} /></button></article>;
  })}</div></div>;
}

export function EvidenceView({ controller: c, query }: { controller: Controller; query: string }) {
  const [tab, setTab] = useState('commitmentReviews'), [selected, setSelected] = useState<SourceRecord | null>(null);
  const s = c.workspace!.source;
  const collections = [
    ['commitmentReviews', '보완·확약', s.commitmentReviews], ['assumptionsAndReferences', '전제·근거', s.assumptionsAndReferences],
    ['responsibilityBoundaries', '책임경계', s.responsibilityBoundaries], ['sourceMappings', '원자료대조', s.sourceMappings],
    ['nvisScheduleReview', 'NVIS 검토', s.nvisScheduleReview], ['offtakers', '오프테이커', s.offtakers],
  ] as const;
  const records = collections.find(([id]) => id === tab)![2].filter(r => JSON.stringify(r.fields).toLowerCase().includes(query.toLowerCase()));
  const titleOf = (r: SourceRecord) => String(r.fields['검토 항목'] || r.fields['항목'] || r.fields['경계'] || r.fields['원업무명'] || r.fields['업체'] || '근거');
  return <div className="evidence-view"><div className="evidence-tabs">{collections.map(([id, label, rows]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}<span>{rows.length}</span></button>)}</div><div className="evidence-grid scroll-area">{records.map((rec, i) => {
    const f = rec.fields, status = f['확인상태'] || f['구분'] || f['현재 상태'] || '원본 기록';
    return <button className="evidence-card" key={i} onClick={() => setSelected(rec)}><div className="row between"><span className="mono muted small">{String(f.ID || f['원ID'] || String(i + 1).padStart(2, '0'))}</span><Badge>{String(status)}</Badge></div><h3>{titleOf(rec)}</h3><p>{String(f['남은 확인·입력'] || f['내용·판교 반영'] || f['확정할 항목'] || f['원완료기준'] || f['협의 필수사항'] || f['성립 조건'] || '')}</p><div className="evidence-card-footer"><FileText size={12} /><span>{rec.provenance.sheet} · {rec.provenance.row}행</span><ArrowUpRight size={14} /></div></button>;
  })}{!records.length && <Empty title="검색 결과가 없습니다" />}</div>
    {selected && <Modal title={titleOf(selected)} onClose={() => setSelected(null)} wide><div className="modal-body"><p className="source-caption"><BookOpen size={14} />{selected.provenance.sheet} · {selected.provenance.row}행 · 원본 기록</p><dl className="record-details">{Object.entries(selected.fields).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? '미입력')}</dd></div>)}</dl></div></Modal>}
  </div>;
}

export function ScenariosView({ controller: c }: { controller: Controller }) {
  const w = c.workspace!, p = c.plan!;
  const [name, setName] = useState(''), [creating, setCreating] = useState(false), [deleting, setDeleting] = useState<string | null>(null), [compareId, setCompareId] = useState('reference');
  const reference = useMemo(() => planFromSource(w.source), [w.source]);
  const results = useMemo(() => calculateWorkspaceScenarios(w), [w.scenarios, w.activeId, w.portfolio, w.scenarioPortfolios, w.projectId, w.source.sourceFile]);
  const referenceResult = useMemo(() => calculate(reference), [reference]);
  const compareReference = compareId === 'reference' || !w.scenarios.some(s => s.id === compareId);
  const compared = compareReference ? reference : w.scenarios.find(s => s.id === compareId)!;
  const compareEntry = results.get(compared.id);
  const compareResult = compareReference ? referenceResult : compareEntry?.result;
  const current = c.result!;
  const connected = results.get(p.id)?.portfolio;
  const path = useMemo(() => connected ? connectedDrivingPath(w, connected) : drivingPath(p, current).map(step => ({ ...step, projectId: w.projectId, projectName: '' })), [w, p, current, connected]);
  const diffs = p.tasks.filter(t => {
    if (!compareResult) return false;
    const other = compared.tasks.find(x => x.id === t.id), a = current.tasks[t.id], b = other && compareResult.tasks[other.id];
    return !other || !b || a.start !== b.start || a.finish !== b.finish || t.primary !== other.primary || t.progress !== other.progress || t.status !== other.status;
  });
  return <div className="scenarios-view scroll-area"><div className="section-heading"><div><h2>계획은 보존하고, 가능성을 비교하세요</h2><p className="muted">독립 시나리오에서 지연과 조건을 검토합니다. 원본 참조계획은 바뀌지 않습니다.</p></div><button className="button primary" onClick={() => setCreating(true)}><Plus size={15} />시나리오 복제</button></div>
    <div className="scenario-grid">{w.scenarios.map(s => {
      const entry = results.get(s.id)!, r = s.id === p.id ? current : entry.result;
      return <article key={s.id} className={'scenario-card ' + (p.id === s.id ? 'active' : '')}><div className="row between"><Badge kind={p.id === s.id ? 'green' : 'muted'}>{p.id === s.id ? '현재 작업 중' : '저장된 시나리오'}</Badge>{s.id !== 'base' && <button className="icon-button danger" aria-label={s.name + ' 삭제'} onClick={() => setDeleting(s.id)}><Trash2 size={15} /></button>}</div><h3>{s.name}</h3>{r ? <><span className="muted small">{r.operationValid ? '조건부 운영개시 예상' : '예측 적용조건 확인 필요·참고일'}</span><strong>{shortDate(r.operationDate)}</strong><div className="scenario-metrics"><span>목표 대비 <b className={r.operationDelay > 0 ? 'red' : 'green'}>{r.operationDelay > 0 ? '+' : ''}{r.operationDelay}일</b></span><span>CP <b>{r.criticalCount}</b></span><span>변동 업무 <b>{r.changedCount}</b></span></div></> : <ErrorText>{entry.error}</ErrorText>}<button className={'button full ' + (s.id === p.id ? 'subtle' : '')} disabled={s.id === p.id || !r} onClick={() => c.switchScenario(s.id)}>{s.id === p.id ? '사용 중' : !r ? '연결 조건 확인 필요' : '이 계획 열기'}<ArrowRight size={14} /></button></article>;
    })}<button className="scenario-new" onClick={() => setCreating(true)}><Copy size={23} /><strong>새 가능성 검토</strong><span>현재 입력을 복제해 시작합니다</span></button></div>
    <details className="impact-path"><summary>운영개시를 결정한 대표 경로 <span>{path.length}개 업무</span></summary><p className="hint">선택한 시나리오와 연결 프로젝트를 함께 계산한 대표 경로입니다. 외부 업무를 누르면 프로젝트 연결 화면을 엽니다.</p><div>{path.map((step, index) => <div className="path-step" key={step.projectId + ':' + step.taskId}><button onClick={() => { if (step.projectId === w.projectId) c.setSelectedId(step.taskId); else { c.setSelectedId(null); c.preferences({ view: 'portfolio' }); } }}><span className="mono">{step.projectId !== w.projectId ? step.projectName + ' / ' : ''}{step.wbs}</span><strong>{step.name}</strong><small>{shortDate(step.finish)} · {step.cause}</small></button>{index !== path.length - 1 && <ArrowRight size={13} />}</div>)}</div></details>
    <div className="compare-header"><h3>업무별 차이 <span>{diffs.length}</span></h3><label>비교 기준<select aria-label="비교 기준" value={compareReference ? 'reference' : compareId} onChange={e => setCompareId(e.target.value)}><option value="reference">원본 참조계획</option>{w.scenarios.filter(s => s.id !== p.id).map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label></div>
    {compareReference && <p className="hint">원본 참조계획은 가져온 원본 입력의 계산입니다. 이후 추가한 프로젝트 연결은 포함하지 않습니다.</p>}
    {!compareResult && <ErrorText>{compareEntry?.error || '비교할 시나리오의 연결 조건을 확인해주세요.'}</ErrorText>}
    {diffs.length ? <table className="data-table"><thead><tr><th>WBS</th><th>업무</th><th>비교 기준 완료</th><th>현재 예상 완료</th><th>완료 차이</th><th>담당 · 진척</th></tr></thead><tbody>{diffs.map(t => {
      const a = current.tasks[t.id], b = compareResult!.tasks[t.id];
      return <tr key={t.id}><td className="mono">{t.wbs}</td><td><button className="table-name-button" onClick={() => c.setSelectedId(t.id)}>{t.name}</button></td><td className="mono">{shortDate(b?.finish)}</td><td className="mono">{shortDate(a.finish)}</td><td><Badge kind={b && a.finish > b.finish ? 'warning' : 'muted'}>{b ? Math.round((Date.parse(a.finish) - Date.parse(b.finish)) / 86400000) + '일' : '신규'}</Badge></td><td>{t.primary || '미지정'} · {t.progress === null ? '미입력' : Math.round(t.progress * 100) + '%'}</td></tr>;
    })}</tbody></table> : compareResult ? <Empty title="비교 기준과 일정 차이가 없습니다">지연이나 조건을 변경하면 영향 업무를 이곳에서 확인할 수 있습니다.</Empty> : null}
    {creating && <Modal title="시나리오 복제" onClose={() => setCreating(false)}><form onSubmit={e => { e.preventDefault(); c.cloneScenario(name); setCreating(false); setName(''); }}><div className="modal-body"><p className="muted">현재 계획의 업무·관계·조달 입력을 별도로 복제합니다.</p><label className="field"><span>시나리오 이름</span><input required value={name} onChange={e => setName(e.target.value)} placeholder="예: NVIS 착수 7일 지연 검토" /></label></div><div className="modal-footer"><button className="button" type="button" onClick={() => setCreating(false)}>취소</button><button className="button primary"><Copy size={15} />복제하기</button></div></form></Modal>}
    {deleting && <Modal title="시나리오를 삭제할까요?" onClose={() => setDeleting(null)}><div className="modal-body"><p>이 시나리오의 입력을 삭제합니다. 필요한 경우 먼저 JSON 백업을 내보내세요.</p></div><div className="modal-footer"><button className="button" onClick={() => setDeleting(null)}>취소</button><button className="button primary" onClick={() => { c.deleteScenario(deleting); setDeleting(null); }}>삭제</button></div></Modal>}
  </div>;
}
