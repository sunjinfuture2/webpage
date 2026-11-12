import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, Check, CircleDot, Flag, GitBranch, Layers3, List, Maximize, Minus, Move, Plus, Search, Workflow, X } from 'lucide-react';
import type { Dependency, Plan, ScheduleResult } from '../core/types';
import { buildNetworkLayout, NETWORK_NODE_HEIGHT as NODE_H, NETWORK_NODE_WIDTH as NODE_W } from '../core/network';
import { shortDate } from '../core/dates';
import { Badge } from './UI';
import { DependencyEditor, type DependencyChange } from './DependencyEditor';
import { relationshipNames } from '../core/dependency-labels';
import './network.css';

export interface NetworkViewProps { plan: Plan; result: ScheduleResult; selectedId: string | null; onSelect: (id: string) => void; onRevealTask?: (id: string) => void; onDependencyChange?: (intent: DependencyChange) => boolean }
const typeNames = { FS: '완료 → 시작', SS: '시작 → 시작', FF: '완료 → 완료', SF: '시작 → 완료' };
const directionLabels = { both: '선행 + 후행', before: '선행 업무', after: '후행 업무' };

export function NetworkView({ plan, result, selectedId, onSelect, onRevealTask, onDependencyChange }: NetworkViewProps) {
  const fallback = plan.tasks.find(t => t.wbs === 'W8.6')?.id || plan.tasks[0]?.id || '';
  const [focusId, setFocusId] = useState(selectedId || fallback), [depth, setDepth] = useState(1);
  const [direction, setDirection] = useState<'both' | 'before' | 'after'>('both');
  const [all, setAll] = useState(false), [inactive, setInactive] = useState(false), [list, setList] = useState(false);
  const [zoom, setZoom] = useState(1), [query, setQuery] = useState(''), [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState(selectedId || fallback), [spotlight, setSpotlight] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ dependency: Dependency; creating: boolean } | null>(null);
  const viewport = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const marker = 'network-arrow-' + useId().replaceAll(':', '');
  useEffect(() => { if (selectedId && plan.tasks.some(t => t.id === selectedId)) { setFocusId(selectedId); setInspectId(selectedId); } }, [selectedId, plan.tasks]);
  const focus = plan.tasks.find(t => t.id === focusId) || plan.tasks.find(t => t.id === fallback)!;
  const actualFocus = focus?.id || '';
  const graph = useMemo(() => buildNetworkLayout(plan, result, { focusId: actualFocus, depth, direction, all, includeInactive: inactive }), [plan, result, actualFocus, depth, direction, all, inactive]);
  const byId = useMemo(() => new Map(plan.tasks.map(t => [t.id, t])), [plan.tasks]);
  const positions = useMemo(() => new Map(graph.nodes.map(n => [n.task.id, n])), [graph]);
  const currentEdge = graph.edges.find(e => e.id === selectedEdge);
  const routeById = useMemo(() => new Map(graph.routes.map(route => [route.edgeId, route])), [graph]);
  const activeId = positions.has(inspectId) ? inspectId : actualFocus;
  const activeTask = byId.get(activeId);
  const activeEdge = graph.edges.find(e => e.id === (selectedEdge || hoveredEdge));
  const highlightedEdges = new Set(activeEdge ? [activeEdge.id] : spotlight ? graph.edges.filter(e => e.from === activeId || e.to === activeId).map(e => e.id) : []);
  const highlightedNodes = new Set(activeEdge ? [activeEdge.from, activeEdge.to] : spotlight ? [activeId, ...graph.edges.filter(e => highlightedEdges.has(e.id)).flatMap(e => [e.from, e.to])] : []);
  const emphasizing = highlightedNodes.size > 0;
  const counts = useMemo(() => {
    const before = new Map<string, number>(), after = new Map<string, number>();
    for (const e of plan.dependencies) if (e.active || inactive) { before.set(e.to, (before.get(e.to) || 0) + 1); after.set(e.from, (after.get(e.from) || 0) + 1); }
    return { before, after };
  }, [plan.dependencies, inactive]);
  const hits = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? plan.tasks.filter(t => (t.wbs + ' ' + t.name).toLowerCase().includes(q)).slice(0, 8) : [];
  }, [plan.tasks, query]);
  const center = () => {
    const vp = viewport.current, node = positions.get(actualFocus);
    if (!vp || !node) return;
    vp.scrollTo({ left: Math.max(0, (node.x + NODE_W / 2) * zoom - vp.clientWidth / 2), top: Math.max(0, (node.y + NODE_H / 2) * zoom - vp.clientHeight / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  useEffect(() => { const frame = requestAnimationFrame(center); return () => cancelAnimationFrame(frame); }, [actualFocus, depth, direction, all, list, inactive]);
  const fit = () => {
    const vp = viewport.current; if (!vp) return;
    const next = Math.max(.25, Math.min(1, (vp.clientWidth - 24) / graph.width, (vp.clientHeight - 24) / graph.height));
    setZoom(next); vp.scrollTo({ left: 0, top: 0 });
  };
  const focusTask = (id: string) => { setFocusId(id); setInspectId(id); setSpotlight(false); setHoveredEdge(null); setAll(false); setQuery(''); setSelectedEdge(null); };
  if (!focus) return <div className="network-empty">연결을 확인할 업무가 없습니다.</div>;
  return <div className="network-view" data-testid="network-view">
    <div className="network-heading"><div className="network-heading-icon"><Workflow size={19} /></div><div><strong>업무의 연결을 따라가세요</strong><p>왼쪽에서 오른쪽으로 읽고, 업무나 선을 눌러 연결을 강조하세요.</p></div><span className="network-total"><b>{plan.tasks.length}</b>개 업무<span />활성 관계 <b>{plan.dependencies.filter(e => e.active).length}</b>개</span></div>
    <div className="network-toolbar"><div className="network-segment" aria-label="관계도 범위"><button className={!all ? 'active' : ''} onClick={() => setAll(false)}><CircleDot size={13} />선택 업무 중심</button><button className={all ? 'active' : ''} onClick={() => setAll(true)}><Layers3 size={13} />전체 연결</button></div><select aria-label="관계도 탐색 방향" value={direction} disabled={all} onChange={e => setDirection(e.target.value as typeof direction)}>{Object.entries(directionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="관계도 탐색 깊이" value={depth} disabled={all} onChange={e => setDepth(Number(e.target.value))}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}단계 연결</option>)}</select><label className="network-check"><input type="checkbox" checked={inactive} onChange={e => setInactive(e.target.checked)} />조건부 관계</label><div className="network-toolbar-spacer" />{(spotlight || selectedEdge) && <button className="network-reset" onClick={() => { setSpotlight(false); setSelectedEdge(null); setHoveredEdge(null); }}>강조 해제</button>}{onDependencyChange && plan.tasks.length > 1 && <button className="network-reset" onClick={() => setEditing({ creating: true, dependency: { id: crypto.randomUUID(), sourceId: '사용자 연결', from: activeId, to: plan.tasks.find(t => t.id !== activeId)!.id, type: 'FS', lag: 0, active: true, condition: '' } })}><Plus size={12} />관계 추가</button>}<div className="network-search"><Search size={14} /><input aria-label="관계도 중심 업무 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="중심 업무 찾기" />{query && <button aria-label="관계도 검색 지우기" onClick={() => setQuery('')}><X size={12} /></button>}{query && <div className="network-search-results">{hits.length ? hits.map(t => <button key={t.id} onClick={() => focusTask(t.id)}><span>{t.wbs}</span>{t.name}</button>) : <p>일치하는 업무가 없습니다.</p>}</div>}</div><button className={'icon-button ' + (list ? 'network-control-active' : '')} aria-label={list ? '관계도 그래프 보기' : '관계도 목록 보기'} onClick={() => setList(!list)}>{list ? <Workflow size={16} /> : <List size={16} />}</button></div>
    <div className="network-context"><span className="network-focus-tag"><GitBranch size={12} />중심 업무</span><button className="network-focus-name" onClick={() => onSelect(focus.id)}><span>{focus.wbs}</span><strong>{focus.name}</strong><ArrowDownRight size={13} /></button><span className="network-context-dates">{shortDate(result.tasks[focus.id]?.start)} — {shortDate(result.tasks[focus.id]?.finish)}</span><span className="network-visible-count">표시 {graph.nodes.length} / {graph.relevantTotal}개</span></div>
    {(graph.omittedNodes > 0 || graph.hiddenEdges > 0) && <div className="network-limit" role="status">{graph.omittedNodes > 0 ? `현재 범위 ${graph.relevantTotal}개 중 가까운 업무 최대 120개를 표시합니다. ` : ''}{graph.hiddenEdges > 0 ? `표시 범위·복잡도 제한 밖의 관계 ${graph.hiddenEdges}개가 있습니다. ` : ''}중심 업무나 탐색 범위를 바꿔 이어서 확인하세요. 표시 한도는 업무 120개·관계 600개이며 계산에는 모든 관계를 유지합니다.</div>}
    {activeTask && <div className="network-inspection"><span>선택 업무</span><strong>{activeTask.wbs} · {activeTask.name}</strong><button onClick={() => focusTask(activeTask.id)}>이 업무 중심으로</button>{onRevealTask && <button onClick={() => onRevealTask(activeTask.id)}>일정에서 보기</button>}<button onClick={() => onSelect(activeTask.id)}>업무 수정</button></div>}
    {list ? <div className="network-list"><table className="data-table"><thead><tr><th>WBS</th><th>업무</th><th>예상 시작</th><th>예상 완료</th><th>여유</th><th>연결</th><th /></tr></thead><tbody>{graph.nodes.map(({ task: t }) => { const r = result.tasks[t.id]; return <tr key={t.id}><td className="mono">{t.wbs}</td><td><button className="network-list-title" onClick={() => onSelect(t.id)}>{t.name}</button></td><td className="mono">{shortDate(r?.start)}</td><td className="mono">{shortDate(r?.finish)}</td><td><Badge kind={r?.criticality}>{r?.slack == null ? '대상 외' : r.slack + '일'}</Badge></td><td><span className="muted">선행 {counts.before.get(t.id) || 0} · 후행 {counts.after.get(t.id) || 0}</span></td><td><button className="button compact" onClick={() => focusTask(t.id)}>중심으로 보기</button></td></tr>; })}</tbody></table></div> : <div className="network-stage-wrap"><div ref={viewport} className="network-stage" aria-label="업무 관계도 캔버스" tabIndex={0}
      onPointerDown={e => { if ((e.target as HTMLElement).closest('button, [data-network-edge]')) return; drag.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop }; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.classList.add('is-panning'); }}
      onPointerMove={e => { if (!drag.current) return; e.currentTarget.scrollLeft = drag.current.left - (e.clientX - drag.current.x); e.currentTarget.scrollTop = drag.current.top - (e.clientY - drag.current.y); }}
      onPointerUp={e => { drag.current = null; e.currentTarget.classList.remove('is-panning'); }} onPointerCancel={e => { drag.current = null; e.currentTarget.classList.remove('is-panning'); }}>
      <div className="network-scaled-space" style={{ width: graph.width * zoom, height: graph.height * zoom }}><div className="network-canvas" style={{ width: graph.width, height: graph.height, transform: `scale(${zoom})` }}>
        <svg className="network-links" width={graph.width} height={graph.height} aria-label="선후행 관계"><defs><marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="context-stroke" /></marker></defs>{[...graph.edges].sort((a, b) => Number(highlightedEdges.has(a.id)) - Number(highlightedEdges.has(b.id))).map(e => {
          const path = routeById.get(e.id)!; const driving = result.tasks[e.to]?.drivers.includes(e.id), critical = driving && result.tasks[e.from]?.criticality === 'critical' && result.tasks[e.to]?.criticality === 'critical';
          const selected = e.id === selectedEdge, highlighted = highlightedEdges.has(e.id), label = `${byId.get(e.from)?.wbs} → ${byId.get(e.to)?.wbs} · ${e.type} ${e.lag > 0 ? '+' : ''}${e.lag}일${e.active ? '' : ' · 조건부 제외'}`;
          return <g key={e.id} data-network-edge={e.id} className={'network-edge ' + (!e.active ? 'inactive ' : '') + (critical ? 'critical ' : '') + (selected ? 'selected ' : '') + (highlighted ? 'is-highlighted ' : '') + (emphasizing && !highlighted ? 'is-dim ' : '')} onMouseEnter={() => setHoveredEdge(e.id)} onMouseLeave={() => setHoveredEdge(null)} role="button" tabIndex={0} aria-label={label} aria-pressed={selected} onClick={() => setSelectedEdge(selected ? null : e.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedEdge(selected ? null : e.id); } }}><title>{label}</title><path className="network-edge-halo" d={path.path} /><path className="network-edge-hit" d={path.path} /><path className="network-edge-line" d={path.path} markerEnd={`url(#${marker})`} />{(highlighted || graph.edges.length <= 6) && <g className="network-edge-label" transform={`translate(${path.labelX},${path.labelY})`}><rect x={e.lag ? -36 : -16} y={-11} width={e.lag ? 72 : 32} height={19} rx={4} /><text textAnchor="middle" y={2}>{e.type}{e.lag ? ` ${e.lag > 0 ? '+' : ''}${e.lag}일` : ''}</text></g>}</g>;
        })}</svg>
        {graph.nodes.map(({ task: t, x, y }) => {
          const r = result.tasks[t.id], selected = t.id === activeId;
          return <button key={t.id} className={'network-node ' + (selected ? 'is-focus ' : '') + (emphasizing && !highlightedNodes.has(t.id) ? 'is-dim ' : '') + 'node-' + r?.criticality} style={{ left: x, top: y, width: NODE_W, height: NODE_H }} data-network-task={t.id} onClick={() => { setInspectId(t.id); setSpotlight(true); setSelectedEdge(null); }} aria-label={`${t.wbs} ${t.name} 연결 강조`} aria-pressed={selected}><div className="network-node-top"><span className="network-node-wbs">{t.kind === 'milestone' ? <Flag size={10} /> : <span className="network-node-dot" />}{t.wbs}</span>{selected ? <span className="network-node-selected"><Check size={10} />선택</span> : <span className={"network-node-phase " + (r?.delta ? "has-change" : "")} title={r?.delta ? "참조계획 대비 완료일 차이" : t.phaseLabel}>{r?.delta ? "참조 대비 " + (r.delta > 0 ? "+" : "") + r.delta + "일" : t.phaseLabel}</span>}</div><strong>{t.name}</strong><div className="network-node-dates"><span>{shortDate(r?.start)}</span><ArrowRight size={11} /><span>{shortDate(r?.finish)}</span></div><div className="network-node-bottom"><span>{t.primary || '담당 미지정'}</span><span>{r?.slack == null ? '분석 대상 외' : r.slack === 0 ? '여유 0일' : '여유 ' + r.slack + '일'}</span></div></button>;
        })}
      </div></div>
    </div><div className="network-zoom"><button aria-label="관계도 축소" onClick={() => setZoom(z => Math.max(.25, +(z - .1).toFixed(2)))} disabled={zoom <= .25}><Minus size={15} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="관계도 확대" onClick={() => setZoom(z => Math.min(1.5, +(z + .1).toFixed(2)))} disabled={zoom >= 1.5}><Plus size={15} /></button><i /><button aria-label="관계도 화면 맞춤" title="화면 맞춤" onClick={fit}><Maximize size={14} /></button><button aria-label="중심 업무로 이동" title="중심 업무로 이동" onClick={center}><CircleDot size={15} /></button></div><div className="network-pan-hint"><Move size={12} />빈 공간을 끌어 이동</div></div>}
    {currentEdge && <div className="network-edge-detail" role="status"><GitBranch size={14} /><button onClick={() => focusTask(currentEdge.from)}>{byId.get(currentEdge.from)?.wbs} · {byId.get(currentEdge.from)?.name}</button><ArrowRight size={12} /><button onClick={() => focusTask(currentEdge.to)}>{byId.get(currentEdge.to)?.wbs} · {byId.get(currentEdge.to)?.name}</button><Badge>{currentEdge.type} · {typeNames[currentEdge.type]}</Badge><span className="network-relationship-meaning">{relationshipNames[currentEdge.type]}</span><span>{currentEdge.lag > 0 ? '+' : ''}{currentEdge.lag}일</span>{!currentEdge.active && <Badge>조건부 제외</Badge>}{onDependencyChange && <button className="button compact" onClick={() => setEditing({ dependency: currentEdge, creating: false })}>관계 수정</button>}<button className="icon-button" aria-label="관계 설명 닫기" onClick={() => setSelectedEdge(null)}><X size={13} /></button></div>}
    {editing && onDependencyChange && <DependencyEditor key={editing.dependency.id} plan={plan} dependency={editing.dependency} creating={editing.creating} onChange={onDependencyChange} onClose={() => setEditing(null)} />}
    <div className="network-legend"><span><i className="network-legend-line normal" />선후행 관계</span><span><i className="network-legend-line critical" />크리티컬 결정 관계</span><span><i className="network-legend-line inactive" />조건부 제외</span><p>화살표는 선행 → 후행 흐름입니다. FS·SS·FF·SF는 관계 유형을 뜻합니다.</p></div>
  </div>;
}
