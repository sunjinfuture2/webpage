// Templates (ready-made groups of blocks) and the button block that adds such a group, or opens a link, when pressed.
import { Node, mergeAttributes } from '@tiptap/core';
import { DOMSerializer } from '@tiptap/pm/model';
import { closeHistory } from './hist.js';
import { ctx, safeHref } from './host.js';
import { el, openMenu, askLine } from './ui.js';
import { upgrade } from './legacy.js';
import { tidyBlocks } from './io.js';
import { findById } from './commands.js';

const P = '<p></p>';
const todo = (...t) => '<ul data-type="taskList">' + t.map(x => `<li data-type="taskItem" data-checked="false"><p>${x}</p></li>`).join('') + '</ul>';
const day = () => `<span data-type="date" data-date="${ctx.today()}"></span>`;
export const BUILTIN = [
  { id: 'meeting', name: '회의록', hint: '개요 · 안건 · 결정 · 후속 조치', html: () => `<h2>회의 개요</h2><ul><li><p>일시: ${day()} </p></li><li><p>참석: </p></li><li><p>장소: </p></li></ul><h2>안건</h2><ol><li><p></p></li></ol><h2>논의 내용</h2>${P}<h2>결정 사항</h2><ul><li><p></p></li></ul><h2>후속 조치</h2>${todo('', '')}` },
  { id: 'weekly', name: '주간 보고', hint: '한 일 · 할 일 · 이슈', html: () => `<p>기준일: ${day()} </p><h2>이번 주 한 일</h2><ul><li><p></p></li></ul><h2>다음 주 할 일</h2>${todo('')}<h2>이슈 · 리스크</h2><div data-type="callout" data-icon="⚠️" data-color="yellow"><div class="nb-callout-body"><p></p></div></div>` },
  { id: 'research', name: '리서치 메모', hint: '요약 · 배경 · 핵심 · 시사점 · 출처', html: () => `<div data-type="callout" data-icon="💡" data-color="blue"><div class="nb-callout-body"><p>한 줄 요약: </p></div></div><h2>배경</h2>${P}<h2>핵심 내용</h2><ul><li><p></p></li></ul><h2>시사점</h2>${P}<h2>출처</h2><ul><li><p></p></li></ul>` },
  { id: 'decision', name: '의사결정 기록', hint: '배경 · 선택지 · 결정 · 근거', html: () => `<p>결정일: ${day()} </p><h2>배경</h2>${P}<h2>선택지</h2><table><tbody><tr><th><p>선택지</p></th><th><p>장점</p></th><th><p>단점</p></th></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table><h2>결정</h2>${P}<h2>근거</h2>${P}` },
  { id: 'checklist', name: '점검표', hint: '할 일 목록', html: () => todo('', '', '') },
];
const userTemplates = () => { try { return (ctx.templates ? ctx.templates() : []) || []; } catch { return []; } };
export const templateHtml = id => { const b = BUILTIN.find(t => t.id === id); if (b) return b.html(); const u = userTemplates().find(t => t.id === id); return u ? u.html : ''; };
export const templateName = id => { const t = BUILTIN.find(x => x.id === id) || userTemplates().find(x => x.id === id); return t ? t.name : ''; };

export function insertTemplateHtml(editor, html, at) { const clean = tidyBlocks(upgrade(html || '')); if (!clean.trim()) return false;
  const ch = editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; }); if (at != null) ch.insertContentAt(at, clean); else ch.insertContent(clean); return ch.run(); }
// the blocks of a range as stored HTML, without their ids (a template is a mould, every use gets ids of its own)
export function rangeHtml(editor, range) { const frag = editor.state.doc.slice(range.from, range.to).content; const box = document.createElement('div'); box.append(DOMSerializer.fromSchema(editor.schema).serializeFragment(frag)); box.querySelectorAll('[data-id]').forEach(n => n.removeAttribute('data-id')); return box.innerHTML; }

export function templateItems(pick) { const mine = userTemplates();
  return [{ header: '기본 템플릿' }, ...BUILTIN.map(t => ({ label: t.name, hint: t.hint, icon: '▤', run: () => pick(t.id) })),
    ...(mine.length ? [{ header: '저장한 템플릿' }, ...mine.map(t => ({ label: t.name, hint: t.by ? ctx.userName(t.by, '') : '', icon: '▤', run: () => pick(t.id) }))] : [])]; }
export function openTemplateMenu(inst, rect) { const ed = inst.editor; const mine = userTemplates();
  const items = templateItems(id => insertTemplateHtml(ed, templateHtml(id)));
  if (mine.length && ctx.deleteTemplate) items.push({ sep: true }, { label: '저장한 템플릿 삭제', icon: '✕', danger: true, children: mine.map(t => ({ label: t.name, run: () => { ctx.deleteTemplate(t.id); ctx.toast(`템플릿 “${t.name}”을(를) 삭제했습니다.`); } })) });
  items.push({ sep: true }, { custom: el('div', { class: 'nb-note', text: '블록을 선택한 뒤 블록 메뉴의 “템플릿으로 저장”으로 직접 만들 수 있습니다.' }) });
  openMenu(items, { rect, cls: 'nb-tplmenu', takeFocus: true, onClose: () => { if (!inst.destroyed) ed.view.focus(); } }); }
export function saveAsTemplate(inst, range, rect) { if (!ctx.saveTemplate) { ctx.toast('이 화면에서는 템플릿을 저장할 수 없습니다.'); return; } const html = rangeHtml(inst.editor, range);
  askLine({ rect, label: '템플릿 이름', placeholder: '예: 주간 회의록', ok: '저장', onOk: v => { if (!v) { ctx.toast('이름을 입력해야 저장할 수 있습니다.'); return; } ctx.saveTemplate({ name: v.slice(0, 40), html }); ctx.toast(`템플릿 “${v.slice(0, 40)}”을(를) 저장했습니다. ‘/템플릿’에서 쓸 수 있습니다.`, 3000); }, onCancel: () => inst.editor.view.focus() }); }

/* ---------- button block ---------- */
const DEFAULT_TPL = todo('');
export const Button = Node.create({
  name: 'button', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return {
    label: { default: '새 버튼', parseHTML: e => e.getAttribute('data-label') || e.textContent.trim() || '새 버튼', renderHTML: a => ({ 'data-label': a.label || '새 버튼' }) },
    action: { default: 'insert', parseHTML: e => (e.getAttribute('data-action') === 'link' ? 'link' : 'insert'), renderHTML: a => ({ 'data-action': a.action === 'link' ? 'link' : 'insert' }) },
    href: { default: '', parseHTML: e => safeHref(e.getAttribute('data-href')) || '', renderHTML: a => (a.href ? { 'data-href': a.href } : {}) },
    tpl: { default: DEFAULT_TPL, parseHTML: e => e.getAttribute('data-tpl') || '', renderHTML: a => (a.tpl ? { 'data-tpl': a.tpl } : {}) } }; },
  parseHTML() { return [{ tag: 'div[data-type="button"]', priority: 80 }]; },
  renderHTML({ node, HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'button', class: 'nb-button' }, HTMLAttributes), ['button', { type: 'button', class: 'nb-button-el' }, node.attrs.label || '새 버튼']]; },
  renderText({ node }) { return '[' + (node.attrs.label || '버튼') + ']'; },
});
export function pressButton(editor, pos) { const n = editor.state.doc.nodeAt(pos); if (!n || n.type.name !== 'button') return;
  if (n.attrs.action === 'link') { const h = safeHref(n.attrs.href); if (h) window.open(h, '_blank', 'noopener'); else ctx.toast('버튼에 연결된 주소가 없습니다. ⚙에서 주소를 넣어 주세요.', 2600); return; }
  if (!n.attrs.tpl) { ctx.toast('버튼이 추가할 내용이 비어 있습니다. ⚙에서 골라 주세요.', 2600); return; }
  insertTemplateHtml(editor, n.attrs.tpl, pos + n.nodeSize); }
export function buttonItems(inst, pos, rect) { const ed = inst.editor; const node = ed.state.doc.nodeAt(pos); if (!node || node.type.name !== 'button') return [];
  const set = attrs => { const n = ed.state.doc.nodeAt(pos); if (n && n.type.name === 'button') ed.view.dispatch(closeHistory(ed.state.tr.setNodeMarkup(pos, undefined, { ...n.attrs, ...attrs }))); };
  return [
    { label: '버튼 이름', icon: '✎', run: () => askLine({ rect, label: '버튼 이름', value: node.attrs.label, onOk: v => v && set({ label: v.slice(0, 40) }) }) },
    { label: '누르면: 블록 추가', icon: '＋', checked: node.attrs.action !== 'link', children: [...templateItems(id => set({ action: 'insert', tpl: templateHtml(id) })), { sep: true }, { label: '할 일 한 줄', icon: '☐', run: () => set({ action: 'insert', tpl: DEFAULT_TPL }) }] },
    { label: '누르면: 링크 열기', icon: '↗', checked: node.attrs.action === 'link', run: () => askLine({ rect, label: '열 주소', placeholder: 'https://', value: node.attrs.href, onOk: v => { const h = safeHref(v); if (h && /^https?:/i.test(h)) set({ action: 'link', href: h }); else ctx.toast('http(s) 주소를 넣어 주세요.'); } }) },
  ]; }
export function buttonView(inst) { return ({ node, editor, getPos }) => { let cur = node;
  const btn = el('button', { type: 'button', class: 'nb-button-el' }); const gear = el('button', { type: 'button', class: 'nb-button-cfg', text: '⚙', title: '버튼 설정', 'aria-label': '버튼 설정', 'aria-haspopup': 'menu' });
  const dom = el('div', { class: 'nb-button', 'data-type': 'button', contenteditable: 'false' }, btn, gear);
  const sync = () => { btn.textContent = cur.attrs.label || '새 버튼'; btn.title = cur.attrs.action === 'link' ? '누르면 링크를 엽니다' : '누르면 아래에 블록을 추가합니다'; if (cur.attrs.id) dom.setAttribute('data-id', cur.attrs.id); gear.hidden = !editor.isEditable; };
  [btn, gear].forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); }));
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const p = getPos(); if (typeof p === 'number') pressButton(editor, p); });
  gear.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const p = getPos(); if (typeof p !== 'number') return; const r = gear.getBoundingClientRect(); openMenu(buttonItems(inst, p, r), { rect: r, cls: 'nb-btnmenu', takeFocus: true, onClose: () => { if (!inst.destroyed) editor.view.focus(); } }); });
  sync();
  return { dom, update(n) { if (n.type !== cur.type) return false; cur = n; sync(); return true; }, selectNode() { dom.classList.add('ProseMirror-selectednode'); }, deselectNode() { dom.classList.remove('ProseMirror-selectednode'); },
    stopEvent: e => !!(e.target && e.target.closest && e.target.closest('button')), ignoreMutation: () => true }; }; }

/* read mode: a button works there too. Adding blocks is a small save of its own, made by the app (ctx.addBlocksAfter). */
export function hydrateButtons(root, itemId) {
  root.querySelectorAll('div[data-type="button"]').forEach(d => { if (d.dataset.nbBtn) return; d.dataset.nbBtn = '1'; const b = d.querySelector('button') || d;
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation();
      if (d.getAttribute('data-action') === 'link') { const h = safeHref(d.getAttribute('data-href')); if (h) window.open(h, '_blank', 'noopener'); return; }
      const tpl = d.getAttribute('data-tpl') || ''; if (!tpl) return;
      if (ctx.addBlocksAfter && itemId && d.getAttribute('data-id')) ctx.addBlocksAfter(itemId, d.getAttribute('data-id'), tpl); else ctx.toast('수정을 누른 뒤에 쓸 수 있는 버튼입니다.', 2400); }); });
}
export { findById };
