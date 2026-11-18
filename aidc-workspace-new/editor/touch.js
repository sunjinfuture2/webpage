// A toolbar for touch screens: the hover handle and the selection bubble need a mouse, so on a touch device the same
// commands sit in one bar above the on-screen keyboard while the body has the caret.
import { el, openMenu } from './ui.js';
import { blockOfSelection, duplicateBlocks, deleteBlocks, moveBlocks, kindAt, turnInto } from './commands.js';
import { TURN, colorItems } from './menus.js';

export const isTouch = () => { try { return window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches); } catch { return false; } };

export function touchBar(inst) { if (!isTouch()) return; const ed = inst.editor, view = ed.view;
  const on = (t, type, fn) => { t.addEventListener(type, fn); inst.cleanup.push(() => t.removeEventListener(type, fn)); };
  const cur = () => { const b = blockOfSelection(ed.state); return b ? { from: b.pos, to: b.pos + b.node.nodeSize, b } : null; };
  const B = (label, title, fn, cls) => el('button', { type: 'button', class: 'nb-tk ' + (cls || ''), html: label, title, 'aria-label': title, onpointerdown: e => e.preventDefault(), onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); fn(e.currentTarget); refresh(); } });
  const mark = (name, label, title) => { const b = B(label, title, () => ed.chain().focus().toggleMark(name).run()); b.dataset.mark = name; return b; };
  const listType = () => { const { $from } = ed.state.selection; for (let d = $from.depth; d > 0; d--) { const n = $from.node(d).type.name; if (n === 'listItem' || n === 'taskItem') return n; } return null; };
  const bar = el('div', { class: 'nb-touchbar', role: 'toolbar', 'aria-label': '편집 도구' },
    B('＋', '블록 추가', () => ed.chain().focus().insertContent('/').run()),
    B('전환', '블록 유형 바꾸기', b => { const r = cur(); if (!r) return; const kind = kindAt(ed.state.doc, r.b.pos); openMenu(TURN.map(t => ({ label: t.label, icon: t.icon, checked: t.k === kind, run: () => turnInto(ed, r, t.k) })), { rect: b.getBoundingClientRect(), cls: 'nb-turnmenu', above: true }); }, 'wide'),
    mark('bold', '<b>B</b>', '굵게'), mark('italic', '<i>I</i>', '기울임'), mark('underline', '<u>U</u>', '밑줄'), mark('strike', '<s>S</s>', '취소선'), mark('code', '&lt;/&gt;', '인라인 코드'),
    B('색', '글자색 · 배경색', b => { const apply = v => { const ch = ed.chain().focus(); if (!v) ch.unsetMark('textColor').unsetMark('bgColor'); else if (v.endsWith('_bg')) ch.setMark('bgColor', { color: v.slice(0, -3) }); else ch.setMark('textColor', { color: v }); ch.run(); }; openMenu(colorItems(apply, ed.getAttributes('textColor').color || null), { rect: b.getBoundingClientRect(), cls: 'nb-colormenu', above: true }); }, 'wide'),
    B('⇥', '들여쓰기', () => { const t = listType(); if (t) ed.chain().focus().sinkListItem(t).run(); }), B('⇤', '내어쓰기', () => { const t = listType(); if (t) ed.chain().focus().liftListItem(t).run(); }),
    B('↑', '블록 위로', () => { const r = cur(); r && moveBlocks(ed, r, -1); }), B('↓', '블록 아래로', () => { const r = cur(); r && moveBlocks(ed, r, 1); }),
    B('⧉', '블록 복제', () => { const r = cur(); r && duplicateBlocks(ed, r); }), B('🗑', '블록 삭제', () => { const r = cur(); r && deleteBlocks(ed, r); }),
    B('↶', '실행 취소', () => ed.chain().focus().undo().run()), B('↷', '다시 실행', () => ed.chain().focus().redo().run()),
    B('⌨', '키보드 닫기', () => view.dom.blur()));
  bar.hidden = true; ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(t => bar.addEventListener(t, e => e.stopPropagation())); document.body.append(bar);
  const vv = window.visualViewport;
  const place = () => { const gap = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0; bar.style.bottom = Math.round(gap) + 'px'; };
  const refresh = () => { bar.querySelectorAll('[data-mark]').forEach(b => { const a = ed.isActive(b.dataset.mark); b.classList.toggle('on', a); b.setAttribute('aria-pressed', String(a)); }); };
  const show = () => { bar.hidden = !(view.editable && view.hasFocus()); if (!bar.hidden) { place(); refresh(); } };
  ed.on('focus', show); ed.on('blur', () => setTimeout(show, 200)); ed.on('selectionUpdate', refresh);
  if (vv) { on(vv, 'resize', place); on(vv, 'scroll', place); }
  inst.cleanup.push(() => bar.remove()); inst.touchBar = bar;
}
