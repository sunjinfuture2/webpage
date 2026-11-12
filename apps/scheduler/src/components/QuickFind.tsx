import { useMemo, useRef, useState, useEffect } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import type { Task, View } from '../core/types';
import { searchTasks } from '../core/schedule-navigation';
import { Modal } from './UI';

const views: Array<[View, string]> = [['gantt', '마스터 일정'], ['tasks', '업무 목록'], ['calendar', '캘린더'], ['network', '업무 관계도'], ['portfolio', '프로젝트 연결'], ['scenarios', '지연·시나리오']];
export function QuickFind({ tasks, onClose, onTask, onView, onAdd }: { tasks: Task[]; onClose: () => void; onTask: (id: string) => void; onView: (view: View) => void; onAdd: () => void }) {
  const [query, setQuery] = useState(''), [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const matches = useMemo(() => searchTasks(tasks, query), [tasks, query]);
  const actions = views.filter(([, name]) => !query || name.includes(query.trim())).map(([view, name]) => ({ id: 'view-' + view, label: name, meta: '화면 이동', run: () => onView(view) }));
  if (!query || '새 업무 추가'.includes(query.trim())) actions.push({ id: 'add', label: '새 업무 추가', meta: '만들기', run: onAdd });
  const items = [...actions, ...matches.slice(0, 40).map(t => ({ id: t.id, label: t.name, meta: t.wbs + ' · ' + (t.primary || t.roles.R || '담당 미지정'), run: () => onTask(t.id) }))];
  const active = Math.min(index, Math.max(0, items.length - 1));
  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const run = (at: number) => { const item = items[at]; if (item) { onClose(); item.run(); } };
  return <Modal title="빠른 찾기" onClose={onClose}>
    <div className="quick-find"><label><Search size={18} /><input ref={input} aria-label="업무와 화면 검색" placeholder="업무번호, 이름, 담당자 또는 화면 검색…" value={query} onChange={e => { setQuery(e.target.value); setIndex(0); }} onKeyDown={e => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setIndex(Math.max(0, Math.min(items.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)))); }
      if (e.key === 'Enter') { e.preventDefault(); run(active); }
    }} role="combobox" aria-expanded="true" aria-controls="quick-find-results" aria-activedescendant={items.length ? 'quick-option-' + active : undefined} aria-autocomplete="list" /></label>
    <div className="quick-results" ref={list} id="quick-find-results" role="listbox" aria-label="빠른 찾기 결과">{items.map((item, i) => <div role="option" aria-selected={i === active} id={'quick-option-' + i} key={item.id} data-active={i === active} onMouseMove={() => setIndex(i)}><button tabIndex={-1} onClick={() => run(i)}><span><small>{item.meta}</small><strong>{item.label}</strong></span><ArrowRight size={14} /></button></div>)}{!items.length && <p className="quick-empty">일치하는 업무나 화면이 없습니다.</p>}</div>
    <div className="quick-footer"><span>↑ ↓ 선택 · Enter 열기 · Esc 닫기</span><span>{query && matches.length > 40 ? '업무 ' + matches.length + '개 중 40개 표시 · 검색어를 좁혀주세요' : '업무 선택 시 연결 집중 보기'}</span></div></div>
  </Modal>;
}
