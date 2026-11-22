// Comments on one block. They are ordinary comments of the item that also carry the id of a block (and a few words of it),
// so the app's comment list, notifications and sync treat them like any other comment. Here: the marker next to a block,
// the small thread window, and the plugin that keeps the markers in place while editing.
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { el, openBox } from './ui.js';
import { ctx } from './host.js';

const all = itemId => { try { return (ctx.comments && itemId ? ctx.comments(itemId) : []) || []; } catch { return []; } };
export function openCounts(itemId) { const m = new Map(); all(itemId).forEach(c => { if (c.block && !c.resolved) m.set(c.block, (m.get(c.block) || 0) + 1); }); return m; }
const stamp = iso => { const d = new Date(iso); if (!iso || isNaN(d)) return ''; return `${d.getMonth() + 1}. ${d.getDate()} ${d.getHours() < 12 ? '오전' : '오후'} ${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const quoteOf = text => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);

export function openThread(itemId, blockId, rect, opt = {}) {
  if (!ctx.addComment) { ctx.toast('이 화면에서는 댓글을 달 수 없습니다.'); return null; }
  const box = el('div', { class: 'nb-cthread' }); let showDone = false, api = null;
  const changed = () => { draw(); opt.onChange && opt.onChange(); };
  function draw() { const keep = box.querySelector('textarea'); const typed = keep ? keep.value : ''; box.textContent = '';
    const cs = all(itemId).filter(c => c.block === blockId), open = cs.filter(c => !c.resolved), done = cs.length - open.length;
    box.append(el('div', { class: 'nb-hd', text: '블록 댓글' })); if (opt.quote) box.append(el('div', { class: 'nb-cquote', text: opt.quote }));
    (showDone ? cs : open).forEach(c => box.append(el('div', { class: 'nb-c' + (c.resolved ? ' done' : '') },
      el('div', { class: 'nb-c-h' }, el('b', { text: c.who || '' }), el('time', { text: stamp(c.ts) + (c.resolved ? ' · 해결됨' : '') }), c.mine && ctx.deleteComment ? el('button', { type: 'button', class: 'nb-c-x', text: '삭제', 'aria-label': '내 댓글 삭제', onclick: e => { e.preventDefault(); ctx.deleteComment(itemId, c.id); changed(); } }) : null),
      el('div', { class: 'nb-c-t', text: c.text || '' }))));
    const inp = el('textarea', { class: 'nb-in', rows: '2', placeholder: open.length ? '답글 입력 · Enter로 등록' : '댓글 입력 · Enter로 등록', 'aria-label': '댓글' }); inp.value = typed;
    const send = () => { const v = inp.value.trim(); if (!v) return; if (ctx.addComment(itemId, { block: blockId, quote: opt.quote || '', text: v.slice(0, 2000) }) === false) return; inp.value = ''; changed(); };
    inp.addEventListener('keydown', e => { if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    const foot = el('div', { class: 'nb-ask-x' }, el('button', { type: 'button', class: 'nb-btn pri', text: '등록', onclick: e => { e.preventDefault(); send(); } }),
      open.length && ctx.resolveComments ? el('button', { type: 'button', class: 'nb-btn', text: '해결', title: '이 블록의 댓글을 해결됨으로 표시', onclick: e => { e.preventDefault(); ctx.resolveComments(itemId, blockId, true); changed(); if (api) api.close('ok'); } }) : null,
      done ? el('button', { type: 'button', class: 'nb-btn', text: showDone ? '해결된 댓글 숨기기' : `해결된 댓글 ${done}개 보기`, onclick: e => { e.preventDefault(); showDone = !showDone; draw(); } }) : null,
      done && showDone && ctx.resolveComments ? el('button', { type: 'button', class: 'nb-btn', text: '다시 열기', onclick: e => { e.preventDefault(); ctx.resolveComments(itemId, blockId, false); changed(); } }) : null);
    box.append(inp, foot); setTimeout(() => { if (box.isConnected) inp.focus(); }, 0); }
  api = openBox(box, { rect, cls: 'nb-cbox', label: '블록 댓글', onClose: opt.onClose }); draw(); return api;
}
const badge = (n, label, onClick) => { const b = el('button', { type: 'button', class: 'nb-cbadge', contenteditable: 'false', 'aria-label': `댓글 ${n}개 보기: ${label || '블록'}`, title: `댓글 ${n}개` }, el('span', { 'aria-hidden': 'true', text: '💬' }), el('b', { text: String(n) }));
  b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); }); b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick(b); }); return b; };

/* ---------- while editing: markers are widget decorations in front of the commented blocks ---------- */
export const commentKey = new PluginKey('nbComments');
export function commentPlugin(inst) {
  const build = doc => { const counts = openCounts(inst.itemId); if (!counts.size) return DecorationSet.empty; const decos = [];
    doc.descendants((node, pos) => { const id = node.attrs && node.attrs.id; const n = id && counts.get(id); if (!n) return;
      decos.push(Decoration.widget(pos, () => badge(n, quoteOf(node.textContent), b => commentOn(inst, id, b.getBoundingClientRect())), { side: -1, key: 'c' + id + ':' + n, ignoreSelection: true, stopEvent: () => true })); });
    return DecorationSet.create(doc, decos); };
  return new Plugin({ key: commentKey, state: { init: (_c, state) => build(state.doc), apply(tr, set, _old, state) { return tr.docChanged || tr.getMeta(commentKey) ? build(state.doc) : set; } }, props: { decorations(state) { return commentKey.getState(state); } } });
}
export function refreshComments(inst) { if (inst.destroyed) return; const v = inst.editor.view; v.dispatch(v.state.tr.setMeta(commentKey, true).setMeta('addToHistory', false)); }
export function commentOn(inst, blockId, rect) { let text = ''; inst.editor.state.doc.descendants(n => { if (n.attrs && n.attrs.id === blockId) { text = n.textContent; return false; } });
  return openThread(inst.itemId, blockId, rect, { quote: quoteOf(text), onChange: () => refreshComments(inst), onClose: () => { if (!inst.destroyed) inst.editor.view.focus(); } }); }

/* ---------- read mode: markers before the commented blocks, and a "comment" button that follows the pointer ---------- */
export function hydrateComments(root, itemId) {
  if (!itemId || !ctx.comments) return; const counts = openCounts(itemId); const sel = id => `[data-id="${String(id).replace(/[^\w-]/g, '')}"]`;
  const open = (id, rect) => { const t = root.querySelector(sel(id)); openThread(itemId, id, rect, { quote: quoteOf(t ? t.textContent : '') }); };
  counts.forEach((n, id) => { const t = root.querySelector(sel(id)); if (!t || t.closest('[data-type="synced"]')) return; t.before(badge(n, quoteOf(t.textContent), b => open(id, b.getBoundingClientRect()))); });
  if (!ctx.addComment || (ctx.canComment && !ctx.canComment(itemId))) return;
  const add = el('button', { type: 'button', class: 'nb-cadd', title: '이 블록에 댓글', 'aria-label': '이 블록에 댓글 달기', text: '💬' }); add.hidden = true; let cur = null;
  ['mousedown', 'mouseup'].forEach(t => add.addEventListener(t, e => { e.preventDefault(); e.stopPropagation(); }));
  add.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (cur) open(cur.getAttribute('data-id'), add.getBoundingClientRect()); });
  const host = root.parentElement || root; host.append(add);
  host.addEventListener('mousemove', e => { if (add.contains(e.target)) return; const t = e.target.closest && e.target.closest('[data-id]');
    if (!t || !root.contains(t) || t.closest('[data-type="synced"],[data-type="itemList"]') || counts.get(t.getAttribute('data-id'))) { if (!t || !root.contains(t)) return; add.hidden = true; cur = null; return; }
    cur = t; const r = t.getBoundingClientRect(), h = host.getBoundingClientRect(), z = ctx.zoom() || 1; add.hidden = false; add.style.top = Math.round((r.top - h.top) / z + host.scrollTop) + 'px'; });
  host.addEventListener('mouseleave', () => { add.hidden = true; cur = null; });
}
