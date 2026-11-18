// Find and replace inside one body (Ctrl+F while editing). Matches are decorations: the document itself is only changed by "바꾸기".
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { closeHistory } from './hist.js';
import { el } from './ui.js';
import { ctx } from './host.js';

export const findKey = new PluginKey('nbFind');
const LIMIT = 2000;
export function matchesIn(doc, q, cs) {
  const out = []; if (!q) return out;
  doc.descendants((node, pos) => { if (out.length >= LIMIT) return false; if (!node.isTextblock) return true;
    let text = ''; const map = [];
    node.forEach((ch, off) => { if (ch.isText) { for (let i = 0; i < ch.text.length; i++) map.push(pos + 1 + off + i); text += ch.text; } else { map.push(pos + 1 + off); text += '￼'; } });
    let hay = text, needle = q; if (!cs) { const l = text.toLowerCase(), n = q.toLowerCase(); if (l.length === text.length && n.length === q.length) { hay = l; needle = n; } }
    for (let i = hay.indexOf(needle); i >= 0 && out.length < LIMIT; i = hay.indexOf(needle, i + needle.length)) out.push({ from: map[i], to: map[i + needle.length - 1] + 1 });
    return false; });
  return out;
}
const EMPTY = { q: '', cs: false, list: [], i: -1 };
export function findPlugin() {
  return new Plugin({ key: findKey,
    state: { init: () => EMPTY,
      apply(tr, v) { const m = tr.getMeta(findKey);
        if (m && m.close) return EMPTY;
        if (m && m.set) { const list = matchesIn(tr.doc, m.set.q, m.set.cs); let i = list.length ? 0 : -1; if (list.length && m.set.near != null) { const k = list.findIndex(x => x.from >= m.set.near); i = k < 0 ? 0 : k; } return { q: m.set.q, cs: m.set.cs, list, i }; }
        if (m && m.go != null) return v.list.length ? { ...v, i: (v.i + m.go + v.list.length) % v.list.length } : v;
        if (v.q && tr.docChanged) { const list = matchesIn(tr.doc, v.q, v.cs); const at = m && m.at != null ? m.at : (v.list[v.i] ? tr.mapping.map(v.list[v.i].from, -1) : 0); let i = list.findIndex(x => x.from >= at); if (i < 0) i = list.length ? 0 : -1; return { ...v, list, i }; }
        return v; } },
    props: { decorations(state) { const v = findKey.getState(state); if (!v || !v.list.length) return null; return DecorationSet.create(state.doc, v.list.map((x, k) => Decoration.inline(x.from, x.to, { class: k === v.i ? 'nb-find cur' : 'nb-find' }))); } } });
}

export function openFind(inst, withReplace) {
  const ed = inst.editor, view = ed.view; if (inst.findBar) { inst.findBar.focus(withReplace); return; }
  const st = () => findKey.getState(ed.state) || EMPTY;
  const q = el('input', { class: 'nb-in', type: 'text', placeholder: '찾기', 'aria-label': '찾을 말' }), r = el('input', { class: 'nb-in', type: 'text', placeholder: '바꿀 말', 'aria-label': '바꿀 말' });
  const count = el('span', { class: 'nb-find-n', 'aria-live': 'polite' });
  const btn = (text, title, fn, cls) => el('button', { type: 'button', class: 'nb-btn ' + (cls || ''), text, title, 'aria-label': title, onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); fn(); } });
  const cs = btn('Aa', '대소문자 구분', () => { cs.classList.toggle('on'); cs.setAttribute('aria-pressed', String(cs.classList.contains('on'))); run(); }); cs.setAttribute('aria-pressed', 'false');
  const more = btn('바꾸기 ▾', '바꾸기 열기 / 닫기', () => { row2.hidden = !row2.hidden; if (!row2.hidden) r.focus(); position(); });
  const row2 = el('div', { class: 'nb-find-row' }, r, btn('바꾸기', '현재 항목 바꾸기 (Enter)', () => replaceOne()), btn('모두 바꾸기', '모두 바꾸기', () => replaceAll())); row2.hidden = !withReplace;
  const bar = el('div', { class: 'nb-pop nb-findbar', role: 'search', 'aria-label': '본문에서 찾기' }, el('div', { class: 'nb-find-row' }, q, count, cs, btn('↑', '이전 (Shift+Enter)', () => go(-1)), btn('↓', '다음 (Enter)', () => go(1)), more, btn('✕', '닫기 (Esc)', () => close(true))), row2);
  ['mousedown', 'click', 'mouseup', 'keyup', 'keydown'].forEach(t => bar.addEventListener(t, e => e.stopPropagation()));
  const position = () => { const h = (inst.host || inst.wrap).getBoundingClientRect(); bar.style.top = Math.round(Math.max(8, Math.min(h.top + 6, window.innerHeight - bar.offsetHeight - 8))) + 'px'; bar.style.left = Math.round(Math.max(8, Math.min(h.right - bar.offsetWidth - 10, window.innerWidth - bar.offsetWidth - 8))) + 'px'; };
  const show = () => { const v = st(); count.textContent = !v.q ? '' : v.list.length ? `${v.i + 1} / ${v.list.length}${v.list.length >= LIMIT ? '+' : ''}` : '없음'; count.classList.toggle('none', !!v.q && !v.list.length);
    const m = v.list[v.i]; if (!m) return;
    // a match inside a folded toggle: unfold it (folding is not an edit)
    const $p = ed.state.doc.resolve(m.from); const tr = ed.state.tr; for (let d = $p.depth; d > 0; d--) { const n = $p.node(d); if (n.type.name === 'details' && !n.attrs.open) tr.setNodeAttribute($p.before(d), 'open', true); }
    if (tr.docChanged) view.dispatch(tr.setMeta('addToHistory', false));
    requestAnimationFrame(() => { const cur = view.dom.querySelector('.nb-find.cur'); if (cur) cur.scrollIntoView({ block: 'center' }); }); };
  const run = near => { view.dispatch(ed.state.tr.setMeta(findKey, { set: { q: q.value, cs: cs.classList.contains('on'), near: near == null ? ed.state.selection.from : near } })); show(); };
  const go = d => { view.dispatch(ed.state.tr.setMeta(findKey, { go: d })); show(); };
  const replaceOne = () => { const v = st(), m = v.list[v.i]; if (!m) return; const tr = ed.state.tr; if (r.value) tr.insertText(r.value, m.from, m.to); else tr.delete(m.from, m.to); view.dispatch(closeHistory(tr.setMeta(findKey, { at: m.from + r.value.length }))); show(); };
  const replaceAll = () => { const v = st(); if (!v.list.length) return; const tr = ed.state.tr; for (let k = v.list.length - 1; k >= 0; k--) { const m = v.list[k]; if (r.value) tr.insertText(r.value, m.from, m.to); else tr.delete(m.from, m.to); } const n = v.list.length; view.dispatch(closeHistory(tr)); show(); ctx.toast(`${n}곳을 바꿨습니다.`, 1800); };
  const close = focusBack => { if (!inst.findBar) return; const v = st(), m = v.list[v.i]; inst.findBar = null; bar.remove(); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true);
    if (inst.destroyed) return; const tr = ed.state.tr.setMeta(findKey, { close: true }); if (m && focusBack) { try { tr.setSelection(TextSelection.create(ed.state.doc, m.from, m.to)); } catch {} } view.dispatch(tr); if (focusBack) view.focus(); };
  q.addEventListener('input', () => run());
  const keys = (inp, enter) => inp.addEventListener('keydown', e => { if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Escape') { e.preventDefault(); close(true); } else if (e.key === 'Enter') { e.preventDefault(); enter(e); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); q.focus(); q.select(); } });
  keys(q, e => go(e.shiftKey ? -1 : 1)); keys(r, () => replaceOne());
  document.body.append(bar); position(); window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
  const sel = ed.state.selection; const picked = sel.empty ? '' : ed.state.doc.textBetween(sel.from, sel.to, ' ', ' '); if (picked && picked.length < 80 && !/\n/.test(picked)) q.value = picked;
  inst.findBar = { close, focus: wr => { if (wr) { row2.hidden = false; position(); } q.focus(); q.select(); }, el: bar };
  inst.cleanup.push(() => close(false)); if (q.value) run(sel.from); q.focus(); q.select();
}
