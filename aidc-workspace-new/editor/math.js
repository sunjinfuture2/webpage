// Equations (LaTeX, drawn by KaTeX). KaTeX and its fonts are loaded only when a body really contains an equation.
import { Node, InputRule, mergeAttributes } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { el, openBox } from './ui.js';

let katexP = null;
export function loadKatex() {
  if (window.katex) return Promise.resolve(window.katex);
  if (!katexP) katexP = new Promise((res, rej) => {
    if (!document.querySelector('link[data-nb-katex]')) document.head.append(el('link', { rel: 'stylesheet', href: '/katex/katex.min.css', 'data-nb-katex': '1' }));
    const s = el('script', { src: '/katex/katex.min.js' }); s.onload = () => (window.katex ? res(window.katex) : rej(new Error('katex')));
    s.onerror = () => { katexP = null; s.remove(); rej(new Error('katex')); }; document.head.append(s); });
  return katexP;
}
const OPTS = display => ({ displayMode: !!display, throwOnError: false, strict: 'ignore', trust: false, maxExpand: 500, maxSize: 20 });
export function renderMath(dom, tex, display) {
  tex = String(tex || ''); dom.classList.toggle('empty', !tex.trim());
  if (!tex.trim()) { dom.textContent = display ? '수식을 입력하려면 누르세요' : '수식'; return; }
  const draw = k => { try { k.render(tex, dom, OPTS(display)); } catch { dom.textContent = tex; } };
  if (window.katex) draw(window.katex); else { dom.textContent = tex; loadKatex().then(draw).catch(() => { /* the LaTeX source stays readable */ }); }
}
// for files that leave the page (export, print): MathML needs neither the KaTeX stylesheet nor its fonts
export function mathMarkup(tex, display) { try { return window.katex ? window.katex.renderToString(String(tex || ''), { ...OPTS(display), output: 'mathml' }) : null; } catch { return null; } }

export function editMath(editor, pos, fresh) {
  const node = editor.state.doc.nodeAt(pos); if (!node || !/^math/.test(node.type.name)) return; const display = node.type.name === 'mathBlock';
  const dom = editor.view.nodeDOM(pos); const rect = dom && dom.getBoundingClientRect ? dom.getBoundingClientRect() : editor.view.coordsAtPos(pos);
  const ta = el('textarea', { class: 'nb-in nb-math-src', rows: display ? '3' : '2', placeholder: 'LaTeX   예: E = mc^2,  \\frac{a}{b},  \\sum_{i=1}^{n} x_i', 'aria-label': 'LaTeX 수식', spellcheck: 'false' }); ta.value = node.attrs.tex || '';
  const prev = el('div', { class: 'nb-math-prev', 'aria-hidden': 'true' }); const ok = el('button', { type: 'button', class: 'nb-btn pri', text: '완료' });
  const box = el('div', { class: 'nb-mathbox' }, el('div', { class: 'nb-hd', text: display ? '수식 블록 (LaTeX)' : '인라인 수식 (LaTeX)' }), ta, prev, el('div', { class: 'nb-ask-x' }, el('span', { class: 'nb-note', text: 'Enter 완료 · Shift+Enter 줄바꿈 · Esc 취소' }), ok));
  let done = false; const draw = () => renderMath(prev, ta.value, display);
  const apply = () => { if (done) return; done = true; const n = editor.state.doc.nodeAt(pos); if (!n || n.type !== node.type) return; const tex = ta.value.trim();
    if (!tex && fresh) editor.view.dispatch(editor.state.tr.delete(pos, pos + n.nodeSize).setMeta('addToHistory', false));
    else if (tex !== n.attrs.tex) editor.view.dispatch(closeHistory(editor.state.tr.setNodeAttribute(pos, 'tex', tex))); };
  const cancel = () => { if (done) return; done = true; const n = editor.state.doc.nodeAt(pos); if (fresh && n && n.type === node.type && !n.attrs.tex) editor.view.dispatch(editor.state.tr.delete(pos, pos + n.nodeSize).setMeta('addToHistory', false)); };
  const api = openBox(box, { rect, cls: 'nb-mathmenu', label: '수식 편집', onClose: why => { if (why === 'esc') cancel(); else apply(); if (!editor.isDestroyed) editor.view.focus(); } });
  ta.addEventListener('input', draw);
  ta.addEventListener('keydown', e => { if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); apply(); api.close('ok'); } });
  ok.addEventListener('click', e => { e.preventDefault(); apply(); api.close('ok'); });
  draw(); ta.focus(); ta.select();
}

const texAttr = { tex: { default: '', parseHTML: e => e.getAttribute('data-tex') || e.textContent || '', renderHTML: a => ({ 'data-tex': a.tex || '' }) } };
const view = display => ({ node, editor, getPos }) => { let cur = node;
  const dom = el(display ? 'div' : 'span', { class: display ? 'nb-mathblock' : 'nb-math', 'data-type': display ? 'mathBlock' : 'math', contenteditable: 'false', role: 'img' });
  const sync = () => { dom.setAttribute('aria-label', '수식: ' + (cur.attrs.tex || '비어 있음')); if (cur.attrs.id) dom.setAttribute('data-id', cur.attrs.id); renderMath(dom, cur.attrs.tex, display); };
  dom.addEventListener('click', e => { if (!editor.isEditable) return; e.preventDefault(); const p = getPos(); if (typeof p === 'number') editMath(editor, p); });
  sync();
  return { dom, update(n) { if (n.type !== cur.type) return false; const ch = n.attrs.tex !== cur.attrs.tex || n.attrs.id !== cur.attrs.id; cur = n; if (ch) sync(); return true; },
    selectNode() { dom.classList.add('ProseMirror-selectednode'); }, deselectNode() { dom.classList.remove('ProseMirror-selectednode'); }, ignoreMutation: () => true }; };

export const MathInline = Node.create({
  name: 'math', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() { return texAttr; },
  parseHTML() { return [{ tag: 'span[data-type="math"]', priority: 80 }]; },
  renderHTML({ node, HTMLAttributes }) { return ['span', mergeAttributes({ 'data-type': 'math', class: 'nb-math' }, HTMLAttributes), node.attrs.tex || '']; },
  renderText({ node }) { return '$' + node.attrs.tex + '$'; },
  addNodeView() { return view(false); },
  // Notion: $$…$$ typed in a line becomes an inline equation
  addInputRules() { return [new InputRule({ find: /\$\$([^$\n]+)\$\$$/, handler: ({ state, range, match }) => { const tex = match[1].trim(); if (!tex) return null; state.tr.replaceWith(range.from, range.to, this.type.create({ tex })); } })]; },
});
export const MathBlock = Node.create({
  name: 'mathBlock', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return texAttr; },
  parseHTML() { return [{ tag: 'div[data-type="mathBlock"]', priority: 80 }]; },
  renderHTML({ node, HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'mathBlock', class: 'nb-mathblock' }, HTMLAttributes), node.attrs.tex || '']; },
  renderText({ node }) { return '$$' + node.attrs.tex + '$$'; },
  addNodeView() { return view(true); },
});

/* read mode */
export function renderMathIn(root) {
  root.querySelectorAll('[data-type="math"],[data-type="mathBlock"]').forEach(n => { if (n.dataset.nbMath) return; n.dataset.nbMath = '1'; const display = n.getAttribute('data-type') === 'mathBlock';
    n.setAttribute('role', 'img'); n.setAttribute('aria-label', '수식: ' + (n.getAttribute('data-tex') || '')); renderMath(n, n.getAttribute('data-tex') || n.textContent || '', display); });
}
