import { useId, useState } from 'react';
import { ArrowRight, ArrowLeftRight, GitBranch, Trash2 } from 'lucide-react';
import type { Dependency, Plan } from '../core/types';
import { Modal, ErrorText } from './UI';
import { relationshipNames, relationshipSentence, relationshipGap } from '../core/dependency-labels';

export type DependencyChange = { kind: 'create' | 'update'; dependency: Dependency } | { kind: 'delete'; id: string };
export function DependencyEditor({ plan, dependency, creating, onChange, onClose }: { plan: Plan; dependency: Dependency; creating: boolean; onChange: (intent: DependencyChange) => boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(() => structuredClone(dependency)), [error, setError] = useState('');
  const id = useId();
  const patch = (next: Partial<Dependency>) => { setDraft(d => ({ ...d, ...next })); setError(''); };
  const submit = () => {
    if (draft.from === draft.to) { setError('같은 업무의 시작과 완료는 서로 연결할 수 없습니다.'); return; }
    if (!Number.isInteger(draft.lag) || Math.abs(draft.lag) > 36500) { setError('간격은 −36,500~36,500의 정수 달력일로 입력해주세요.'); return; }
    if (onChange({ kind: creating ? 'create' : 'update', dependency: draft })) onClose();
    else setError('관계를 적용하지 못했습니다. 순환·중복 또는 연결 조건 안내를 확인해주세요.');
  };
  return <Modal title={creating ? '새 선후행 관계' : '선후행 관계 편집'} onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); submit(); }}>
      <div className="modal-body dependency-editor">
        <div className="dependency-editor-heading"><GitBranch size={17} /><p>관계를 바꾸면 연결된 업무의 예상 일정을 다시 계산합니다.</p></div>
        <label className="field"><span>선행 업무</span><select aria-label="관계 선행 업무" value={draft.from} onChange={e => patch({ from: e.target.value })}>{plan.tasks.map(t => <option key={t.id} value={t.id}>{t.wbs} · {t.name}</option>)}</select></label>
        <div className="dependency-editor-arrow"><ArrowRight size={16} /><button type="button" className="dependency-swap" onClick={() => patch({ from: draft.to, to: draft.from })}><ArrowLeftRight size={12} />순서 바꾸기</button></div>
        <label className="field"><span>후행 업무</span><select aria-label="관계 후행 업무" value={draft.to} onChange={e => patch({ to: e.target.value })}>{plan.tasks.map(t => <option key={t.id} value={t.id}>{t.wbs} · {t.name}</option>)}</select></label>
        <div className="dependency-editor-fields"><label className="field"><span>어떻게 연결할까요?</span><select aria-label="관계 유형" value={draft.type} onChange={e => patch({ type: e.target.value as Dependency['type'] })}>{(Object.keys(relationshipNames) as Dependency['type'][]).map(type => <option key={type} value={type}>{relationshipNames[type]} ({type})</option>)}</select></label><label className="field"><span>추가 간격 · 달력일</span><input aria-label="관계 간격" required type="number" step="1" min="-36500" max="36500" value={Number.isFinite(draft.lag) ? draft.lag : ''} onChange={e => patch({ lag: e.target.value === '' ? NaN : Number(e.target.value) })} /></label></div>
        <div className="dependency-gap-presets" aria-label="추가 간격 빠른 선택">{[[0, '추가 대기 없음'], [1, '하루 더 대기'], [2, '이틀 더 대기'], [-2, '이틀 앞당김']].map(([days, text]) => <button type="button" key={days} className={draft.lag === days ? 'active' : ''} onClick={() => patch({ lag: Number(days) })}>{text}</button>)}</div>
        <div className="dependency-meaning" role="status"><strong>{relationshipSentence(draft.type, plan.tasks.find(t => t.id === draft.from)?.name || '앞 업무', plan.tasks.find(t => t.id === draft.to)?.name || '다음 업무')}</strong><span>{relationshipGap(draft.lag)}</span></div>
        <p className="hint">일정의 시작·완료 시점은 다른 선행 조건도 함께 반영합니다. 기존 달력일 계산 기준을 유지합니다.</p>
        <label className="dependency-active" htmlFor={id}><input id={id} type="checkbox" checked={draft.active} onChange={e => patch({ active: e.target.checked })} /><span>이 관계를 일정 계산에 적용</span></label>
        <label className="field"><span>적용 조건·메모</span><textarea aria-label="관계 적용 조건" rows={2} value={draft.condition} onChange={e => patch({ condition: e.target.value })} /></label>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      <div className="modal-footer dependency-editor-footer">{!creating && <button type="button" className="dependency-delete" onClick={() => { if (onChange({ kind: 'delete', id: draft.id })) onClose(); else setError('관계를 삭제하지 못했습니다. 안내를 확인해주세요.'); }}><Trash2 size={14} />관계 삭제</button>}<button type="button" className="button" onClick={onClose}>취소</button><button className="button primary">관계 적용</button></div>
    </form>
  </Modal>;
}
