// Suggesting changes ("제안 모드"). While it is on, what a member types is kept as an insertion and what they delete is
// only struck through; each suggestion can then be accepted or rejected. It works on text: typing, deleting, replacing
// a selection, pasting text. New or removed blocks, moves and changes of block type are applied directly, as without the mode.
// Stored as <ins data-by data-at>…</ins> and <del data-by data-at>…</del> in the body.
import { Mark, Extension, getMarkRange } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { closeHistory } from './hist.js';
import { ctx } from './host.js';
import { el, openMenu } from './ui.js';

const attrs = () => ({
  by: { default: null, parseHTML: e => (/^[\w.-]{1,40}$/.test(e.getAttribute('data-by') || '') ? e.getAttribute('data-by') : null), renderHTML: a => (a.by ? { 'data-by': a.by } : {}) },
  at: { default: null, parseHTML: e => (/^\d{4}-\d{2}-\d{2}$/.test(e.getAttribute('data-at') || '') ? e.getAttribute('data-at') : null), renderHTML: a => (a.at ? { 'data-at': a.at } : {}) } });
export const Ins = Mark.create({ name: 'ins', inclusive: false, excludes: 'del', addAttributes: attrs, parseHTML() { return [{ tag: 'ins', priority: 60 }]; }, renderHTML({ HTMLAttributes }) { return ['ins', { class: 'nb-ins', ...HTMLAttributes }, 0]; } });
export const Del = Mark.create({ name: 'del', inclusive: false, excludes: 'ins', addAttributes: attrs, parseHTML() { return [{ tag: 'del[data-by]', priority: 60 }, { tag: 'del.nb-del', priority: 60 }]; }, renderHTML({ HTMLAttributes }) { return ['del', { class: 'nb-del', ...HTMLAttributes }, 0]; } });

export const suggestKey = new PluginKey('nbSuggest');
export const isSuggesting = state => !!suggestKey.getState(state);
const me = () => (ctx.me ? ctx.me() : null) || null;
const stamp = () => ({ by: me(), at: ctx.today() });
const mine = m => m && m.type.name === 'ins' && m.attrs.by && m.attrs.by === me();

// every piece of inline content between two positions that carries a suggestion mark
function pieces(doc, from, to) { const out = [];
  doc.nodesBetween(from, to, (node, pos) => { if (!node.isInline) return true; const m = node.marks.find(x => x.type.name === 'ins' || x.type.name === 'del'); if (m) out.push({ from: Math.max(pos, from), to: Math.min(pos + node.nodeSize, to), mark: m }); return false; });
  return out; }
export const countSuggestions = doc => { let n = 0, last = null; pieces(doc, 0, doc.content.size).forEach(p => { if (!last || last.to !== p.from || !last.mark.eq(p.mark)) n++; last = p; }); return n; };
// accept: insertions stay as plain text, deletions are carried out. reject: the other way round.
export function resolveSuggestions(editor, range, accept) { const { state, view } = editor; const tr = state.tr; const list = pieces(state.doc, range ? range.from : 0, range ? range.to : state.doc.content.size);
  for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; const isIns = p.mark.type.name === 'ins'; if (isIns === !!accept) tr.removeMark(p.from, p.to, p.mark.type); else tr.delete(p.from, p.to); }
  if (!tr.docChanged) return 0; view.dispatch(closeHistory(tr.setMeta('nbNoSuggest', true))); return list.length; }

// What a transaction becomes while suggesting. Only text-level changes are rewritten: a deletion whose ends are both inside
// text (Backspace, Delete, cut, typing or pasting over a selection) and a paste. Text that is not this member's own insertion
// is struck through instead of removed; what comes in is marked as an insertion. Everything else is applied as it is.
function rewrite(state, tr) {
  if (tr.steps.length !== 1 || !(tr.steps[0] instanceof ReplaceStep)) return null; const step = tr.steps[0]; const { from, to, slice } = step; const paste = !!tr.getMeta('paste') && slice.size > 0;
  const doc = state.doc; const $f = doc.resolve(from), $t = doc.resolve(to); if (!$f.parent.isTextblock || !$t.parent.isTextblock || $f.parent.type.spec.code) return null;
  const ins = state.schema.marks.ins, del = state.schema.marks.del; const segs = []; let allOwn = true;
  if (to > from) doc.nodesBetween(from, to, (node, pos) => { if (!node.isInline) return true; const a = Math.max(pos, from), b = Math.min(pos + node.nodeSize, to); const o = node.marks.some(mine); if (!o) allOwn = false; segs.push({ a, b, own: o, struck: node.marks.some(m => m.type === del) }); return false; });
  const soft = segs.length > 0 && !allOwn; if (!soft) return null; // nothing to strike: the change is applied as it is (what comes in is marked afterwards); one's own suggested text is really removed
  const out = state.tr;
  if (soft) { for (let i = segs.length - 1; i >= 0; i--) { const s = segs[i]; if (s.own) out.delete(s.a, s.b); else if (!s.struck) out.addMark(s.a, s.b, del.create(stamp())); } }
  else if (to > from) out.delete(from, to);
  let caret, bias = 1;
  if (slice.size) { const at = out.mapping.map(to, 1); const before = out.doc.content.size; out.replace(at, at, slice); const added = out.doc.content.size - before; if (added > 0) { out.removeMark(at, at + added, del); out.addMark(at, at + added, ins.create(stamp())); } caret = at + Math.max(0, added); bias = -1; }
  else { const sel = state.selection; if (sel.empty && sel.from === to) { caret = out.mapping.map(from, -1); bias = -1; } else caret = out.mapping.map(to, 1); }
  try { out.setSelection(TextSelection.near(out.doc.resolve(Math.max(0, Math.min(caret, out.doc.content.size))), bias)); } catch { /* the selection stays where the mapping puts it */ }
  ['inputType', 'uiEvent', 'paste', 'pointer'].forEach(k => { const v = tr.getMeta(k); if (v !== undefined) out.setMeta(k, v); });
  return out.setMeta('nbNoSuggest', true).scrollIntoView();
}

export function suggestExtension(inst) {
  return Extension.create({ name: 'aidcSuggest',
    dispatchTransaction({ transaction, next }) { const ed = this.editor; let tr = transaction;
      try { if (tr.docChanged && isSuggesting(ed.state) && !tr.getMeta('nbNoSuggest') && tr.getMeta('addToHistory') !== false && !tr.getMeta('history$') && !tr.getMeta('y-sync$') && !ed.view.composing) { const r = rewrite(ed.state, tr); if (r) tr = r; } } catch (e) { console.error(e); tr = transaction; }
      next(tr); },
    addProseMirrorPlugins() { return [new Plugin({ key: suggestKey,
      state: { init: () => false, apply(tr, v) { const m = tr.getMeta(suggestKey); return m === undefined ? v : !!m; } },
      // What is put into a line of text while suggesting (typing, every step of an IME composition, a paste, an inline chip) is marked
      // as an insertion right after it went in. Marks are only added, the text itself is left alone, so a running composition is not disturbed.
      appendTransaction(trs, _old, state) { if (!suggestKey.getState(state) || !me()) return null; const { ins, del } = state.schema.marks; let ranges = [];
        for (const tr of trs) { if (!tr.docChanged) continue; ranges = ranges.map(r => ({ from: tr.mapping.map(r.from, 1), to: tr.mapping.map(r.to, -1) })).filter(r => r.to > r.from);
          if (tr.getMeta('nbNoSuggest') || tr.getMeta('addToHistory') === false || tr.getMeta('history$') || tr.getMeta('y-sync$') || tr.steps.length !== 1 || !(tr.steps[0] instanceof ReplaceStep)) continue;
          const st = tr.steps[0]; if (!st.slice.size) continue; const $f = tr.docs[0].resolve(st.from); if (!$f.parent.isTextblock || $f.parent.type.spec.code) continue;
          if (!tr.getMeta('paste') && (st.slice.openStart || st.slice.openEnd || !st.slice.content.firstChild.isInline)) continue;
          tr.mapping.maps[0].forEach((_a, _b, ns, ne) => { if (ne > ns) ranges.push({ from: ns, to: ne }); }); }
        if (!ranges.length) return null; const out = state.tr; const size = state.doc.content.size;
        ranges.forEach(r => { const from = Math.max(0, r.from), to = Math.min(size, r.to); if (to <= from) return; state.doc.nodesBetween(from, to, (node, pos) => { if (!node.isInline) return !node.type.spec.code; if (node.marks.some(m => m.type === ins || m.type === del)) return false;
          out.addMark(Math.max(pos, from), Math.min(pos + node.nodeSize, to), ins.create(stamp())); return false; }); });
        return out.docChanged ? out.setMeta('nbNoSuggest', true) : null; },
      props: { handleClick(view, pos, e) { const t = e.target.closest && e.target.closest('ins,del'); if (!t || !view.dom.contains(t) || !view.editable) return false; const $p = view.state.doc.resolve(pos); const type = view.state.schema.marks[t.tagName === 'INS' ? 'ins' : 'del'];
        const r = getMarkRange($p, type) || getMarkRange(view.state.doc.resolve(Math.max(0, pos - 1)), type); if (!r) return false; suggestionMenu(inst, r, t); return false; } } })]; } });
}
export function setSuggesting(inst, on) { const v = inst.editor.view; v.dispatch(v.state.tr.setMeta(suggestKey, !!on).setMeta('addToHistory', false)); inst.wrap.classList.toggle('nb-suggesting', !!on); if (inst.suggestBar) inst.suggestBar.hidden = !on; v.focus(); }
export function suggestBar(inst) { const off = el('button', { type: 'button', class: 'nb-btn', text: '끄기', onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); setSuggesting(inst, false); } });
  const bar = el('div', { class: 'nb-sg-bar', role: 'status' }, el('span', { text: '제안 모드 · 입력은 삽입 제안으로, 삭제는 취소선으로 남습니다' }), off); bar.hidden = true; inst.wrap.prepend(bar); inst.suggestBar = bar; }
const who = t => { const by = t.getAttribute('data-by'); return (by ? ctx.userName(by, by) : '알 수 없음') + (t.getAttribute('data-at') ? ' · ' + t.getAttribute('data-at') : ''); };
function suggestionMenu(inst, range, target) { const ed = inst.editor; const isIns = target.tagName === 'INS';
  openMenu([{ custom: el('div', { class: 'nb-note', text: `${isIns ? '삽입' : '삭제'} 제안 — ${who(target)}` }) },
    { label: '수락', icon: '✓', hint: isIns ? '이 글을 본문에 넣기' : '이 글을 지우기', run: () => resolveSuggestions(ed, range, true) },
    { label: '거절', icon: '✕', hint: isIns ? '이 글을 빼기' : '지우지 않고 그대로 두기', run: () => resolveSuggestions(ed, range, false) }], { rect: target.getBoundingClientRect(), cls: 'nb-sgmenu', noPreselect: true, onClose: () => { if (!inst.destroyed) ed.view.focus(); } }); }
export function suggestItems(inst) { const ed = inst.editor; const n = countSuggestions(ed.state.doc); const on = isSuggesting(ed.state);
  return [{ label: '제안 모드', icon: '✎', hint: on ? '켜짐 · 누르면 끕니다' : '입력 · 삭제를 제안으로 남기기', checked: on, run: () => setSuggesting(inst, !on) },
    { label: `제안 ${n}건`, icon: '≡', disabled: !n, children: [{ label: '모두 수락', icon: '✓', run: () => { const k = resolveSuggestions(ed, null, true); if (k) ctx.toast('제안을 모두 수락했습니다. Ctrl+Z로 되돌릴 수 있습니다.', 2600); } }, { label: '모두 거절', icon: '✕', danger: true, run: () => { const k = resolveSuggestions(ed, null, false); if (k) ctx.toast('제안을 모두 거절했습니다. Ctrl+Z로 되돌릴 수 있습니다.', 2600); } }] }]; }
/* read mode: say whose suggestion it is */
export function hydrateSuggestions(root) { root.querySelectorAll('ins.nb-ins,del.nb-del').forEach(t => { t.title = `${t.tagName === 'INS' ? '삽입' : '삭제'} 제안 — ${who(t)}`; }); }
