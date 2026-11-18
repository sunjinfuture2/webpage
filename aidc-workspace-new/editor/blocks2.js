// Blocks that show something that lives elsewhere in the workspace:
//  - synced: a block of another (or the same) item, always shown as it is there
//  - itemList: a list of workspace items chosen by kind / project / state (a small "database view")
// Neither stores what it shows: the stored HTML is only the reference, the content is filled in when the body is shown.
import { Node, mergeAttributes } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { el, openMenu } from './ui.js';
import { ctx, fmtDate } from './host.js';
import { hydrate } from './legacy.js';

const attr = (name, def, ok) => ({ default: def, parseHTML: e => { const v = e.getAttribute('data-' + name); return v == null || (ok && !ok(v)) ? def : v; }, renderHTML: a => (a[name] == null || a[name] === '' ? {} : { ['data-' + name]: String(a[name]) }) });
const idOk = v => /^[\w:.-]{1,80}$/.test(v);

/* ---------- synced block ---------- */
export const Synced = Node.create({
  name: 'synced', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return { item: attr('item', '', idOk), block: attr('block', '', idOk) }; },
  parseHTML() { return [{ tag: 'div[data-type="synced"]', priority: 80 }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'synced', class: 'nb-synced' }, HTMLAttributes)]; },
  renderText() { return ''; },
});
export function fillSynced(dom, itemId, blockId, depth) {
  dom.textContent = ''; dom.setAttribute('contenteditable', 'false'); let src = null; try { src = ctx.blockHtml ? ctx.blockHtml(itemId, blockId) : null; } catch { src = null; }
  const link = el('a', { class: 'nb-synced-src', role: 'link', tabindex: '0', text: src ? '원본: ' + (src.title || '제목 없음') : '원본 없음' });
  const go = e => { e.preventDefault(); e.stopPropagation(); if (src) ctx.openItem(itemId, blockId); };
  link.addEventListener('click', go); link.addEventListener('keydown', e => { if (e.key === 'Enter') go(e); });
  const body = el('div', { class: 'nb-synced-b' });
  if (!src) body.append(el('div', { class: 'nb-note', text: '원본 블록을 찾을 수 없습니다. 원본 글이 저장되지 않았거나, 삭제되었거나, 볼 수 없는 글입니다.' }));
  else { const doc = el('div', { class: 'nb-doc' }); doc.innerHTML = ctx.clean(src.html || ''); body.append(doc);
    doc.querySelectorAll('[data-type="synced"]').forEach(n => { if ((depth || 0) >= 2) { n.textContent = ''; n.append(el('div', { class: 'nb-note', text: '동기화 블록이 너무 깊게 겹쳐 있어 여기서는 표시하지 않습니다.' })); n.dataset.nbLive = '1'; } });
    hydrate(doc, { depth: (depth || 0) + 1 }); }
  dom.append(el('div', { class: 'nb-synced-h' }, el('span', { class: 'nb-synced-tag', text: '⟳ 동기화됨' }), link), body);
}
let clip = null;
export function copySynced(itemId, blockId) { clip = { item: itemId, block: blockId }; try { localStorage.setItem('aidc-sync-clip', JSON.stringify(clip)); } catch { /* this tab only */ } }
export function syncedClip() { if (clip) return clip; try { const c = JSON.parse(localStorage.getItem('aidc-sync-clip') || 'null'); return c && idOk(c.item || '') && idOk(c.block || '') ? c : null; } catch { return null; } }
export function syncedView() { return ({ node }) => { let cur = node; const dom = el('div', { class: 'nb-synced', 'data-type': 'synced', contenteditable: 'false' });
  const sync = () => { if (cur.attrs.id) dom.setAttribute('data-id', cur.attrs.id); dom.setAttribute('data-item', cur.attrs.item); dom.setAttribute('data-block', cur.attrs.block); fillSynced(dom, cur.attrs.item, cur.attrs.block, 0); }; sync(); dom._nbRefresh = sync;
  return { dom, update(n) { if (n.type !== cur.type) return false; const ch = n.attrs.item !== cur.attrs.item || n.attrs.block !== cur.attrs.block || n.attrs.id !== cur.attrs.id; cur = n; if (ch) sync(); return true; },
    selectNode() { dom.classList.add('ProseMirror-selectednode'); }, deselectNode() { dom.classList.remove('ProseMirror-selectednode'); }, stopEvent: e => !!(e.target && e.target.closest && e.target.closest('a,button,summary,input')), ignoreMutation: () => true }; }; }

/* ---------- item list ---------- */
const KINDS = ['all', 'action', 'research', 'meeting'];
export const ItemList = Node.create({
  name: 'itemList', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return { kind: attr('kind', 'all', v => KINDS.includes(v)), proj: attr('proj', '', idOk), state: attr('state', '', v => v === 'prog' || v === 'done'), mine: attr('mine', '', v => v === '1'), limit: attr('limit', '10', v => /^\d{1,3}$/.test(v)) }; },
  parseHTML() { return [{ tag: 'div[data-type="itemList"]', priority: 80 }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'itemList', class: 'nb-itemlist' }, HTMLAttributes)]; },
  renderText() { return ''; },
});
const filtersOf = dom => ({ kind: dom.getAttribute('data-kind') || 'all', proj: dom.getAttribute('data-proj') || '', state: dom.getAttribute('data-state') || '', mine: dom.getAttribute('data-mine') === '1', limit: Math.max(1, Math.min(200, +dom.getAttribute('data-limit') || 10)) });
const labels = () => { try { return (ctx.itemFilters && ctx.itemFilters()) || {}; } catch { return {}; } };
const nameOf = (list, k) => ((list || []).find(x => x[0] === k) || [])[1] || '';
export function fillItemList(dom, onGear) {
  dom.textContent = ''; dom.setAttribute('contenteditable', 'false'); const f = filtersOf(dom), L = labels(); let rows = []; try { rows = (ctx.queryItems ? ctx.queryItems(f) : []) || []; } catch { rows = []; }
  const parts = [nameOf(L.kinds, f.kind) || '전체', f.proj ? nameOf(L.projs, f.proj) || '(없는 프로젝트)' : '', f.state ? nameOf(L.states, f.state) : '', f.mine ? '내 담당' : ''].filter(Boolean);
  const head = el('div', { class: 'nb-il-h' }, el('span', { class: 'nb-il-tag', text: '☰ 항목 목록' }), el('span', { class: 'nb-il-f', text: parts.join(' · ') }), el('span', { class: 'nb-il-n', text: rows.length + '건' }));
  if (onGear) head.append(el('button', { type: 'button', class: 'nb-il-cfg', text: '⚙', title: '목록 조건', 'aria-label': '목록 조건', 'aria-haspopup': 'menu', onmousedown: e => { e.preventDefault(); e.stopPropagation(); }, onclick: e => { e.preventDefault(); e.stopPropagation(); onGear(e.currentTarget); } }));
  dom.append(head);
  if (!ctx.queryItems) { dom.append(el('div', { class: 'nb-note', text: '이 화면에서는 목록을 표시할 수 없습니다.' })); return; }
  if (!rows.length) { dom.append(el('div', { class: 'nb-note', text: '조건에 맞는 항목이 없습니다.' })); return; }
  const table = el('div', { class: 'nb-il-t', role: 'table', 'aria-label': '항목 목록: ' + parts.join(', ') });
  rows.slice(0, f.limit).forEach(r => { const row = el('a', { class: 'nb-il-r' + (r.done ? ' done' : ''), role: 'row', tabindex: '0' }, el('span', { class: 'nb-il-ti', role: 'cell', text: r.title || '제목 없음' }), el('span', { class: 'nb-il-k', role: 'cell', text: r.kind || '' }), el('span', { class: 'nb-il-s', role: 'cell', text: r.status || '' }), el('span', { class: 'nb-il-w', role: 'cell', text: r.who || '' }), el('span', { class: 'nb-il-d', role: 'cell', text: r.date ? fmtDate(r.date) : '' }));
    const go = e => { e.preventDefault(); e.stopPropagation(); ctx.openItem(r.id); }; row.addEventListener('click', go); row.addEventListener('keydown', e => { if (e.key === 'Enter') go(e); }); table.append(row); });
  dom.append(table); if (rows.length > f.limit) dom.append(el('div', { class: 'nb-il-more', text: `외 ${rows.length - f.limit}건 (⚙에서 표시 개수를 늘릴 수 있습니다)` }));
}
export function itemListItems(editor, pos) { const node = editor.state.doc.nodeAt(pos); if (!node || node.type.name !== 'itemList') return []; const a = node.attrs, L = labels();
  const set = attrs => { const n = editor.state.doc.nodeAt(pos); if (n && n.type.name === 'itemList') editor.view.dispatch(closeHistory(editor.state.tr.setNodeMarkup(pos, undefined, { ...n.attrs, ...attrs }))); };
  return [
    { label: '종류', icon: '▤', hint: nameOf(L.kinds, a.kind) || '전체', children: (L.kinds || []).map(([k, n]) => ({ label: n, checked: a.kind === k, run: () => set({ kind: k }) })) },
    { label: '프로젝트', icon: '◧', hint: a.proj ? nameOf(L.projs, a.proj) : '전체', children: [{ label: '전체', checked: !a.proj, run: () => set({ proj: '' }) }, ...(L.projs || []).map(([k, n]) => ({ label: n, checked: a.proj === k, run: () => set({ proj: k }) }))] },
    { label: '상태', icon: '◔', hint: a.state ? nameOf(L.states, a.state) : '전체', children: [{ label: '전체', checked: !a.state, run: () => set({ state: '' }) }, ...(L.states || []).map(([k, n]) => ({ label: n, checked: a.state === k, run: () => set({ state: k }) }))] },
    { label: '내 담당만', icon: '☺', checked: a.mine === '1', run: () => set({ mine: a.mine === '1' ? '' : '1' }) },
    { label: '표시 개수', icon: '#', hint: a.limit + '건', children: ['5', '10', '20', '50'].map(n => ({ label: n + '건', checked: String(a.limit) === n, run: () => set({ limit: n }) })) }];
}
export function itemListView() { return ({ node, editor, getPos }) => { let cur = node; const dom = el('div', { class: 'nb-itemlist', 'data-type': 'itemList', contenteditable: 'false' });
  const gear = b => { const p = getPos(); if (typeof p === 'number') openMenu(itemListItems(editor, p), { rect: b.getBoundingClientRect(), cls: 'nb-ilmenu', takeFocus: true, onClose: () => { if (!editor.isDestroyed) editor.view.focus(); } }); };
  const sync = () => { const a = cur.attrs; [['kind', a.kind], ['proj', a.proj], ['state', a.state], ['mine', a.mine], ['limit', a.limit], ['id', a.id]].forEach(([k, v]) => { if (v) dom.setAttribute('data-' + k, String(v)); else dom.removeAttribute('data-' + k); }); fillItemList(dom, editor.isEditable ? gear : null); }; sync(); dom._nbRefresh = sync;
  return { dom, update(n) { if (n.type !== cur.type) return false; const ch = JSON.stringify(n.attrs) !== JSON.stringify(cur.attrs); cur = n; if (ch) sync(); return true; },
    selectNode() { dom.classList.add('ProseMirror-selectednode'); }, deselectNode() { dom.classList.remove('ProseMirror-selectednode'); }, stopEvent: e => !!(e.target && e.target.closest && e.target.closest('a,button')), ignoreMutation: () => true }; }; }

/* read mode */
export function hydrateLive(root, depth) {
  root.querySelectorAll('div[data-type="synced"]').forEach(d => { if (d.dataset.nbLive) return; d.dataset.nbLive = '1'; fillSynced(d, d.getAttribute('data-item') || '', d.getAttribute('data-block') || '', depth || 0); });
  root.querySelectorAll('div[data-type="itemList"]').forEach(d => { if (d.dataset.nbLive) return; d.dataset.nbLive = '1'; fillItemList(d, null); });
}
// the views of an open editor show live data: the app asks for a refresh when the workspace changed
export function refreshLive(wrap) { wrap.querySelectorAll('[data-type="synced"],[data-type="itemList"]').forEach(d => { if (typeof d._nbRefresh === 'function') d._nbRefresh(); }); }
