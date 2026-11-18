// One editor instance for one document body. The app only sees: create(host, opts) -> { getHTML, changed, pending, attach, focus, insertFiles, destroy }.
import { Editor, Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection, TextSelection, Selection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { CellSelection } from '@tiptap/pm/tables';
import { closeHistory } from '@tiptap/pm/history';
import { Suggestion, exitSuggestion } from '@tiptap/suggestion';
import { buildExtensions, ID_TYPES } from './schema.js';
import { upgrade, fillToc, hydrate } from './legacy.js';
import { ctx, newId, safeHref, safeSrc, embedUrl, COLORS, COLOR_NAMES, fmtSize, fmtDate } from './host.js';
import { el, place, openMenu, askLine, closeAllMenus, anyMenuOpen, swatch } from './ui.js';
import { blockAt, blockOfSelection, blocksIn, findById, selFor, canTurn, kindAt, turnInto, duplicateBlocks, deleteBlocks, moveBlocks, colorBlocks, moveRangeTo, moveIntoColumn, unwrapColumns, insertBlock } from './commands.js';
import { TURN, slashItems, filterSlash, colorItems, tableItems, inTable, appendRowOrCol, tableJson } from './menus.js';
import { openFind, findPlugin } from './find.js';
import { importFile, insertHtml, mdToHtml, looksLikeMarkdown } from './io.js';
import { editMath } from './math.js';
import { languageItems } from './code.js';
import { buttonView, buttonItems, saveAsTemplate } from './templates.js';
import { touchBar } from './touch.js';

const rangeKey = new PluginKey('nbRange'), uploadKey = new PluginKey('nbUpload');
const MAX_FILE = 1.8 * 1024 * 1024;
const live = new Set();
let lastEsc = 0;
export const escHandled = () => anyMenuOpen() || performance.now() - lastEsc < 80;
const isMod = e => e.metaKey || e.ctrlKey;
const composing = e => e.isComposing || e.keyCode === 229;

export function create(host, opts = {}) {
  const inst = { host, opts, itemId: opts.itemId || '', uploads: new Map(), tocs: new Set(), destroyed: false };
  const wrap = el('div', { class: 'nb-editor' }); host.append(wrap); inst.wrap = wrap;
  const editor = new Editor({
    element: wrap, injectCSS: false, content: upgrade(opts.html || ''),
    extensions: buildExtensions({ extra: [behaviors(inst)], nodeViews: { image: imageView(inst), toc: tocView(inst), raw: rawView(), button: buttonView(inst) } }),
    editorProps: { attributes: { class: 'nb-doc', role: 'textbox', 'aria-multiline': 'true', 'aria-label': opts.label || '본문', spellcheck: 'false', translate: 'no' } },
    onUpdate: () => { refreshTocs(inst); opts.onChange && opts.onChange(); },
  });
  inst.editor = editor; const view = editor.view;
  // every block gets a lasting id; ids copied around by the old editor are made unique again
  { const tr = editor.state.tr, seen = new Set(); let n = 0; editor.state.doc.descendants((node, pos) => { if (!ID_TYPES.includes(node.type.name)) return; const id = node.attrs.id; if (!id || seen.has(id)) { tr.setNodeAttribute(pos, 'id', newId()); n++; } else seen.add(id); });
    if (n) view.dispatch(tr.setMeta('addToHistory', false)); }
  const base = editor.state.doc; const sigs = new WeakMap();
  const sig = doc => { let s = sigs.get(doc); if (s == null) { s = JSON.stringify(doc.toJSON(), (k, v) => k === 'open' ? undefined : v); sigs.set(doc, s); } return s; };

  Object.assign(inst, {
    getHTML: () => editor.isEmpty ? '' : editor.getHTML(),
    getJSON: () => editor.getJSON(),
    // opening or closing a toggle is not an edit
    changed: () => !editor.state.doc.eq(base) && sig(editor.state.doc) !== sig(base),
    pending: () => [...inst.uploads.values()].filter(u => u.state === 'uploading').length,
    focus: where => { editor.commands.focus(where == null ? undefined : where, { scrollIntoView: false }); },
    attach: h => { if (wrap.parentElement !== h) { const had = view.hasFocus(); h.append(wrap); inst.host = h; if (had) view.focus(); } },
    insertFiles: (files, at, as) => insertFiles(inst, files, at, as),
    pickFiles: (accept, as) => { const inp = el('input', { type: 'file', multiple: true, accept: accept || null }); inp.onchange = () => { const fs = [...inp.files]; if (fs.length) insertFiles(inst, fs, null, as); }; inp.click(); },
    askUrl: kind => askUrl(inst, kind),
    jump: id => jumpToBlock(inst, id),
    find: withReplace => openFind(inst, withReplace), importFile: () => importFile(inst), insertHtml: (h, atEnd) => insertHtml(inst, h, atEnd),
    destroy: () => { if (inst.destroyed) return; inst.destroyed = true; live.delete(inst); inst.cleanup.forEach(f => { try { f(); } catch {} }); editor.destroy(); wrap.remove(); },
  });
  inst.cleanup = []; chrome(inst); touchBar(inst); live.add(inst); refreshTocs(inst);
  return inst;
}
export function closeFloating() { closeAllMenus(); live.forEach(i => i.hideChrome && i.hideChrome()); }

/* ====================================================================== behaviour (plugins + keys) */
function behaviors(inst) {
  return Extension.create({
    name: 'aidcBehaviors', priority: 1000,
    addKeyboardShortcuts() { const ed = () => this.editor; const cur = () => rangeKey.getState(ed().state) || (b => b && { from: b.pos, to: b.pos + b.node.nodeSize })(blockOfSelection(ed().state));
      return {
        'Mod-k': () => { linkAsk(inst); return true; },
        'Mod-f': () => { openFind(inst, false); return true; },
        // the block menu without a mouse (the handle only shows on hover)
        'Mod-/': () => { const r = cur(); if (!r) return false; const b = blocksIn(ed().state.doc, r.from, r.to)[0]; if (!b) return false; const dom = ed().view.nodeDOM(b.pos); if (!dom || dom.nodeType !== 1) return false;
          if (!rangeKey.getState(ed().state)) setRange(inst, r); const br = dom.getBoundingClientRect(); blockMenu(inst, b, r, { left: br.left, right: br.left, top: br.top, bottom: Math.min(br.bottom, br.top + 28), width: 0, height: Math.min(br.height, 28) }); return true; },
        'Mod-d': () => { const r = cur(); if (r) duplicateBlocks(ed(), r); return true; },
        'Mod-Shift-ArrowUp': () => { const r = cur(); if (r) moveBlocks(ed(), r, -1); return true; },
        'Mod-Shift-ArrowDown': () => { const r = cur(); if (r) moveBlocks(ed(), r, 1); return true; },
        // first press selects the text of the current block, the next one the whole body
        'Mod-a': () => { const s = ed().state.selection; const { $from, $to } = s; if (!$from.parent.isTextblock || !$from.sameParent($to)) return false; const a = $from.start(), b = $from.end(); if (b <= a || (s.from === a && s.to === b)) return false; ed().commands.setTextSelection({ from: a, to: b }); return true; },
        Enter: () => { const { $head, empty } = ed().state.selection; if (!empty || $head.parent.type.name !== 'detailsSummary' || $head.parentOffset !== $head.parent.content.size) return false; const det = $head.node(-1); if (!det.attrs.open) return false;
          const first = det.child(1).firstChild; if (!first || first.type.name !== 'paragraph' || first.content.size) return false; ed().commands.setTextSelection($head.after() + 2); return true; },
        Backspace: () => { const s = ed().state.selection; if (!s.empty || s.$from.parentOffset !== 0) return false; if (s.$from.parent.type.name === 'heading') return ed().commands.setParagraph(); return false; },
        Escape: () => { if (document.querySelector('.nb-slash,.nb-at')) return false; if (anyMenuOpen()) { closeAllMenus(); lastEsc = performance.now(); return true; }
          const st = ed().state; if (rangeKey.getState(st) || st.selection instanceof NodeSelection) { ed().view.dispatch(st.tr.setMeta('nbRange', null).setSelection(Selection.near(st.selection.$from))); ed().view.dom.blur(); lastEsc = performance.now(); return true; }
          if (!st.selection.empty) { ed().commands.setTextSelection(st.selection.to); lastEsc = performance.now(); return true; }
          const b = blockOfSelection(st); if (b) { setRange(inst, { from: b.pos, to: b.pos + b.node.nodeSize }); lastEsc = performance.now(); return true; } return false; },
      }; },
    addProseMirrorPlugins() { const editor = this.editor;
      const slashKey = new PluginKey('nbSlash'), atKey = new PluginKey('nbAt'), pageKey = new PluginKey('nbPage');
      const notInCode = ({ state, range }) => { const $p = state.doc.resolve(range.from); return !$p.parent.type.spec.code && !$p.marks().some(m => m.type.name === 'code') && $p.parent.type.name !== 'detailsSummary'; };
      const listRender = (key, cls, empty) => () => { let menu = null, props = null, lastQ = null;
        // The plugin reports every change twice: first with no items (still looking), then with the result. Only the result is drawn.
        const show = p => { props = p; const items = p.items.map(it => it.header ? it : { ...it, run: () => p.command(it) }); if (!p.clientRect) return; const rect = () => (props.clientRect && props.clientRect()) || { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
          const none = !items.some(i => !i.header); const settled = p.query === lastQ; lastQ = p.query; if (none && !settled) return;
          if (!menu) menu = openMenu(items, { rect, cls, empty, onClose: () => { menu = null; } }); else menu.setItems(items);
          if (none && (p.query || '').length > 8) exitSuggestion(editor.view, key); };
        return { onStart: show, onUpdate: show, onExit: () => { if (menu) { const m = menu; menu = null; m.close(); } },
          onKeyDown: ({ event }) => { if (composing(event) || !menu) return false; if (event.key === 'Escape') { menu.close(); exitSuggestion(editor.view, key); lastEsc = performance.now(); return true; } if (event.key === 'Enter' && !menu.count) return false; return menu.key(event); } }; };
      const people = q => ctx.users().filter(u => !q || u.name.toLowerCase().includes(q) || String(u.id).toLowerCase().includes(q)).slice(0, 8).map(u => ({ label: u.name, hint: u.id, icon: '@', ins: { type: 'mention', attrs: { id: u.id, label: u.name } } }));
      const pages = (q, n) => ctx.pages().filter(p => p.id !== inst.itemId && (!q || (p.title || '').toLowerCase().includes(q))).slice(0, n).map(p => ({ label: p.title || '제목 없음', hint: p.kind || '', icon: '⤴', ins: { type: 'pageLink', attrs: { item: p.id, label: p.title || '' } } }));
      const days = q => { const t = ctx.today(); const add = n => { const d = new Date(t + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
        return [['오늘', 'today', 0], ['내일', 'tomorrow', 1], ['어제', 'yesterday', -1]].filter(([k, e]) => !q || k.startsWith(q) || e.startsWith(q)).map(([k, _e, n]) => ({ label: k, hint: fmtDate(add(n)), icon: '◷', ins: { type: 'date', attrs: { date: add(n) } } })); };
      const insertInline = ({ editor: ed, range, props }) => { ed.chain().focus().insertContentAt(range, [props.ins, { type: 'text', text: ' ' }]).run(); };
      return [
        Suggestion({ editor, pluginKey: slashKey, char: '/', allowSpaces: false, startOfLine: false, allow: notInCode,
          items: ({ query }) => filterSlash(slashItems(inst), query),
          command: ({ editor: ed, range, props }) => { ed.chain().focus().deleteRange(range).run(); props.run && props.run(); },
          render: listRender(slashKey, 'nb-slash', '일치하는 블록이 없습니다.') }),
        Suggestion({ editor, pluginKey: atKey, char: '@', allowSpaces: false, allow: notInCode,
          items: ({ query }) => { const q = (query || '').toLowerCase(); const a = people(q), b = pages(q, 6), c = days(q); return [...(a.length ? [{ header: '멤버' }, ...a] : []), ...(c.length ? [{ header: '날짜' }, ...c] : []), ...(b.length ? [{ header: '페이지' }, ...b] : [])]; },
          command: insertInline, render: listRender(atKey, 'nb-at', '일치하는 멤버·페이지가 없습니다.') }),
        Suggestion({ editor, pluginKey: pageKey, char: '[[', allowSpaces: true, allowedPrefixes: null, allow: notInCode,
          items: ({ query }) => { const b = pages((query || '').toLowerCase(), 10); return b.length ? [{ header: '페이지 링크' }, ...b] : []; },
          command: insertInline, render: listRender(pageKey, 'nb-at', '일치하는 페이지가 없습니다.') }),
        rangePlugin(inst), uploadPlugin(inst), inputPlugin(inst), findPlugin(),
      ]; },
  });
}

/* selected blocks (Esc, handle click, Shift+arrows): kept in plugin state, drawn as a decoration */
function rangePlugin(inst) {
  return new Plugin({ key: rangeKey,
    state: { init: () => null, apply(tr, v) { const m = tr.getMeta('nbRange'); if (m !== undefined) return m; if (!v) return null; return tr.docChanged || tr.selectionSet ? null : v; } },
    props: {
      decorations(state) { const r = rangeKey.getState(state); if (!r) return null; let bs = []; try { bs = blocksIn(state.doc, r.from, r.to); } catch { return null; } return DecorationSet.create(state.doc, bs.map(b => Decoration.node(b.pos, b.pos + b.node.nodeSize, { class: 'nb-selected' }))); },
      handleKeyDown(view, e) { const r = rangeKey.getState(view.state); if (!r || composing(e)) return false; const ed = inst.editor;
        if (e.key === 'Backspace' || e.key === 'Delete') { deleteBlocks(ed, r); return true; }
        if (e.shiftKey && !isMod(e) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { growRange(inst, r, e.key === 'ArrowDown' ? 1 : -1); return true; }
        if (e.key === 'Enter') { const b = blocksIn(view.state.doc, r.from, r.to)[0]; if (b) { const s = Selection.findFrom(view.state.doc.resolve(b.pos + 1), 1, true); if (s) view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, s.$from.end())).setMeta('nbRange', null)); } return true; }
        if (e.key === 'Tab') { e.preventDefault(); return false; }
        return false; } } });
}
function setRange(inst, r) { const { state, view } = inst.editor; inst.anchor = r; const tr = state.tr; try { tr.setSelection(selFor(state.doc, r)); } catch {} view.dispatch(tr.setMeta('nbRange', r)); view.focus(); }
function growRange(inst, r, dir) { const { state, view } = inst.editor; const a = inst.anchor && inst.anchor.from >= r.from && inst.anchor.to <= r.to ? inst.anchor : r; const $f = state.doc.resolve(r.from), $t = state.doc.resolve(r.to); let out = { ...r };
  if (dir > 0) { if (r.from < a.from) out.from = r.from + $f.nodeAfter.nodeSize; else if ($t.nodeAfter) out.to = r.to + $t.nodeAfter.nodeSize; }
  else { if (r.to > a.to) out.to = r.to - $t.nodeBefore.nodeSize; else if ($f.nodeBefore) out.from = r.from - $f.nodeBefore.nodeSize; }
  const tr = state.tr; try { tr.setSelection(selFor(state.doc, out)); } catch {} view.dispatch(tr.setMeta('nbRange', out).scrollIntoView()); }

/* files that are still being sent are a widget, not part of the document: nothing unfinished can be saved */
function uploadPlugin(inst) {
  return new Plugin({ key: uploadKey,
    state: { init: () => DecorationSet.empty, apply(tr, set) { set = set.map(tr.mapping, tr.doc); const a = tr.getMeta(uploadKey);
      if (a && a.add) set = set.add(tr.doc, [Decoration.widget(a.add.pos, a.add.dom, { id: a.add.id, side: -1, ignoreSelection: true, stopEvent: () => true })]);
      if (a && a.remove) set = set.remove(set.find(undefined, undefined, s => s.id === a.remove));
      return set; } },
    props: { decorations(state) { return uploadKey.getState(state); } } });
}
const placeholderPos = (state, id) => { const f = uploadKey.getState(state).find(undefined, undefined, s => s.id === id); return f.length ? f[0].from : null; };
function blockInsertPos(state, type, at) { const $p = state.doc.resolve(at == null ? state.selection.to : at); for (let d = $p.depth; d >= 1; d--) { const i = $p.indexAfter(d - 1); if ($p.node(d - 1).canReplaceWith(i, i, type)) return $p.after(d); } return $p.depth === 0 ? $p.pos : state.doc.content.size; }
function nodeForFile(schema, f, up, as) { const N = schema.nodes; const inline = up.id ? `/api/file/${up.id}?inline=1` : '';
  if (/^image\//.test(f.type) && (up.src || inline) && as !== 'file') return N.image.create({ src: up.src || inline, alt: f.name });
  if (/^video\//.test(f.type) && inline && as !== 'file') return N.embed.create({ kind: 'video', src: inline, title: f.name });
  if (/^audio\//.test(f.type) && inline && as !== 'file') return N.embed.create({ kind: 'audio', src: inline, title: f.name });
  if (as === 'embed' && inline && (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name))) return N.embed.create({ kind: 'iframe', src: inline, title: f.name });
  if (!up.id) return null; return N.file.create({ name: f.name, fid: up.id, size: fmtSize(f.size) }); }
function insertFiles(inst, files, at, as) {
  const { view, state } = inst.editor; if (!ctx.upload) { ctx.toast('이 화면에서는 파일을 올릴 수 없습니다.'); return; }
  const pos = blockInsertPos(state, state.schema.nodes.file, at);
  files.forEach(f => { const id = newId(); const u = { id, file: f, as, state: 'uploading', dom: el('div', { class: 'nb-upload', contenteditable: 'false', role: 'status' }) }; inst.uploads.set(id, u); drawUpload(inst, u); view.dispatch(view.state.tr.setMeta(uploadKey, { add: { id, pos, dom: u.dom } })); startUpload(inst, u); });
  inst.opts.onChange && inst.opts.onChange();
}
function drawUpload(inst, u) { const d = u.dom; d.textContent = ''; d.className = 'nb-upload ' + u.state; const f = u.file;
  d.append(el('span', { class: 'nb-up-ic', text: u.state === 'failed' ? '!' : '', 'aria-hidden': 'true' }), el('span', { class: 'nb-up-name', text: f.name }), el('span', { class: 'nb-up-st', text: u.state === 'failed' ? (u.error || '업로드하지 못했습니다.') : `올리는 중… ${fmtSize(f.size)}` }));
  if (u.state === 'failed') d.append(el('button', { type: 'button', class: 'nb-btn', text: '다시 시도', onmousedown: e => e.preventDefault(), onclick: () => { u.state = 'uploading'; u.error = ''; drawUpload(inst, u); startUpload(inst, u); } }));
  d.append(el('button', { type: 'button', class: 'nb-btn', text: u.state === 'failed' ? '삭제' : '취소', onmousedown: e => e.preventDefault(), onclick: () => dropUpload(inst, u) })); }
function dropUpload(inst, u) { u.state = 'gone'; inst.uploads.delete(u.id); const v = inst.editor.view; if (!inst.destroyed) v.dispatch(v.state.tr.setMeta(uploadKey, { remove: u.id })); inst.opts.onChange && inst.opts.onChange(); }
function startUpload(inst, u) { const f = u.file;
  const fail = msg => { if (u.state === 'gone') return; u.state = 'failed'; u.error = msg; drawUpload(inst, u); ctx.toast(msg, 3000); inst.opts.onChange && inst.opts.onChange(); };
  if (f.size > MAX_FILE) { fail(`${fmtSize(MAX_FILE)}보다 큰 파일은 올릴 수 없습니다 (${fmtSize(f.size)}).`); return; }
  if (!f.size) { fail('빈 파일은 올릴 수 없습니다.'); return; }
  Promise.resolve().then(() => ctx.upload(f, inst.itemId)).then(up => { if (u.state === 'gone' || inst.destroyed) return; const v = inst.editor.view; const pos = placeholderPos(v.state, u.id);
    if (pos == null) { inst.uploads.delete(u.id); return; } // the place it was going to was deleted while it was on its way
    const node = nodeForFile(v.state.schema, f, up || {}, u.as); if (!node) { fail('서버에 저장하지 못했습니다.'); return; }
    inst.uploads.delete(u.id); u.state = 'done'; v.dispatch(closeHistory(v.state.tr.insert(pos, node).setMeta(uploadKey, { remove: u.id }))); inst.opts.onChange && inst.opts.onChange();
  }).catch(e => fail((e && e.message) || '업로드하지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.')); }

/* paste, drop, clicks */
function inputPlugin(inst) { let shiftPaste = false; const ed = () => inst.editor;
  return new Plugin({ props: {
    transformPastedHTML: html => upgrade(html),
    handleKeyDown(_v, e) { if (e.key.toLowerCase && e.key.toLowerCase() === 'v') shiftPaste = e.shiftKey; return false; },
    handlePaste(view, e) { const cd = e.clipboardData; if (!cd) return false; const plain = shiftPaste; shiftPaste = false;
      const files = [...(cd.files || [])]; if (files.length && !cd.getData('text/html')) { insertFiles(inst, files); return true; }
      if (plain) return false; const { $from, empty } = view.state.selection; if ($from.parent.type.spec.code) return false;
      const html = cd.getData('text/html'), text = cd.getData('text/plain') || ''; if (html || !text) return false; const t = text.trim();
      if (/^https?:\/\/\S+$/i.test(t) && safeHref(t)) { if (!empty) return false; pasteUrl(inst, t); return true; }
      const rows = /\t/.test(text) ? parseTsv(text) : []; const cols = rows.length ? Math.max(...rows.map(r => r.length)) : 0;
      if (rows.length >= 2 && cols >= 2 && rows.filter(r => r.length > 1).length >= rows.length * 0.6) {
        if (rows.length > 300 || cols > 40) { ctx.toast('표가 너무 커서 일반 텍스트로 붙여 넣었습니다 (최대 300행 × 40열).', 3200); return false; }
        const escH = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>');
        view.pasteHTML('<table><tbody>' + rows.map(r => '<tr>' + Array.from({ length: cols }, (_x, i) => `<td>${escH(r[i] || '')}</td>`).join('') + '</tr>').join('') + '</tbody></table>'); return true; }
      // text copied from a Markdown source (headings, lists, fences, tables) comes in as blocks; Ctrl+Shift+V keeps it as typed
      if (looksLikeMarkdown(text)) { let h = ''; try { h = ctx.clean(mdToHtml(text)); } catch { h = ''; } if (h) { view.pasteHTML(h); return true; } }
      return false; },
    handleDrop(view, e, _slice, moved) { const drag = inst.drag;
      if (drag) { e.preventDefault(); inst.drag = null; const edge = inst.edge; inst.edge = null; inst.hideEdge && inst.hideEdge(); const copy = e.altKey;
        if (edge) { if (!moveIntoColumn(ed(), drag, edge.pos, copy)) ctx.toast('여기에는 나란히 놓을 수 없습니다.'); view.focus(); return true; }
        const hit = view.posAtCoords({ left: e.clientX, top: e.clientY }); if (hit) moveRangeTo(ed(), drag, hit.pos, copy); view.focus(); return true; }
      const files = [...((e.dataTransfer && e.dataTransfer.files) || [])]; if (files.length && !moved) { e.preventDefault(); const hit = view.posAtCoords({ left: e.clientX, top: e.clientY }); insertFiles(inst, files, hit ? hit.pos : null); return true; }
      return false; },
    handleClick(view, pos, e) { const a = e.target.closest && e.target.closest('a'); if (!a || !view.dom.contains(a)) return false;
      if (a.matches('[data-type="pageLink"]')) { if (isMod(e)) ctx.openItem(a.getAttribute('data-item')); return false; }
      if (a.matches('.file,.bookmark')) return false;
      if (isMod(e)) { const h = safeHref(a.getAttribute('href')); if (h) window.open(h, '_blank', 'noopener'); return true; }
      linkMenu(inst, a); return false; },
    handleClickOn(view, _pos, node, nodePos, e, direct) { if (direct && node.type.name === 'date') { dateMenu(inst, nodePos, e.target.getBoundingClientRect()); return true; } return false; },
    handleDOMEvents: {
      click(view, e) { const a = e.target.closest && e.target.closest('a'); if (a && view.dom.contains(a)) { if (!(isMod(e) && a.matches('.file,.bookmark'))) e.preventDefault(); e.stopPropagation(); }
        const ico = e.target.closest && e.target.closest('.nb-callout-ico'); if (ico && view.editable) { e.preventDefault(); calloutMenu(inst, ico); } return false; },
      dragover(view, e) { if (inst.drag) inst.trackEdge && inst.trackEdge(e); return false; },
    } } });
}
function parseTsv(text) { const rows = []; let row = [], cell = '', q = false; const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === '') { q = true; continue; } if (c === '\t') { row.push(cell); cell = ''; continue; } if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; } cell += c; }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); } return rows.filter(r => r.some(x => x !== '')); }

/* ====================================================================== links, addresses, dates */
function selRect(view, from, to) { const a = view.coordsAtPos(from), b = view.coordsAtPos(to, -1); const top = Math.min(a.top, b.top), bottom = Math.max(a.bottom, b.bottom), left = Math.min(a.left, b.left), right = Math.max(a.right, b.right); return { top, bottom, left, right, width: right - left, height: bottom - top }; }
function linkAsk(inst) { const ed = inst.editor; const { from, to, empty } = ed.state.selection; const cur = ed.getAttributes('link').href || '';
  if (empty && !cur) { ctx.toast('링크를 걸 글을 먼저 선택하세요.'); return; }
  askLine({ rect: selRect(ed.view, from, to), label: '링크 주소', placeholder: 'https://', value: cur, ok: cur ? '수정' : '링크',
    extra: cur ? [{ label: '링크 해제', danger: true, run: () => ed.chain().focus().extendMarkRange('link').unsetLink().run() }] : null,
    onOk: v => { if (!v) { ed.chain().focus().extendMarkRange('link').unsetLink().run(); return; } const href = safeHref(v); if (!href) { ctx.toast('사용할 수 없는 주소입니다. http(s) 주소만 넣을 수 있습니다.', 2800); ed.commands.focus(); return; }
      const ch = ed.chain().focus(); if (empty) ch.extendMarkRange('link'); else ch.setTextSelection({ from, to }); ch.setLink({ href }).run(); },
    onCancel: () => ed.commands.focus() }); }
function linkMenu(inst, a) { const ed = inst.editor; const href = safeHref(a.getAttribute('href')) || '';
  openMenu([{ custom: el('div', { class: 'nb-link-url', text: href }) }, { label: '열기', icon: '↗', kbd: 'Ctrl+클릭', run: () => href && window.open(href, '_blank', 'noopener') }, { label: '주소 수정', icon: '✎', run: () => linkAsk(inst) },
    { label: '주소 복사', icon: '⧉', run: () => copyText(href, '주소를 복사했습니다.') }, { label: '링크 해제', icon: '✕', danger: true, run: () => ed.chain().focus().extendMarkRange('link').unsetLink().run() }], { rect: a.getBoundingClientRect(), cls: 'nb-linkmenu', noPreselect: true }); }
const copyText = (t, msg) => { const done = () => ctx.toast(msg, 1400); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => ctx.toast('복사하지 못했습니다.')); else ctx.toast('복사하지 못했습니다.'); };
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
function bookmarkJson(url) { return { type: 'bookmark', attrs: { href: url, title: hostOf(url), desc: url } }; }
function unfurlInto(inst, url, at) { if (!ctx.unfurl) return; const node = inst.editor.state.doc.nodeAt(at); const id = node && node.attrs.id; if (!id) return;
  Promise.resolve().then(() => ctx.unfurl(url)).then(m => { if (!m || inst.destroyed) return; const hit = findById(inst.editor.state.doc, id); if (!hit || hit.node.type.name !== 'bookmark' || hit.node.attrs.href !== url) return;
    const title = (m.title || '').trim().slice(0, 200), desc = (m.description || '').trim().slice(0, 300); if (!title && !desc) return;
    inst.editor.view.dispatch(inst.editor.state.tr.setNodeMarkup(hit.pos, undefined, { ...hit.node.attrs, title: title || hit.node.attrs.title, desc: desc || url }).setMeta('addToHistory', false)); }).catch(() => {}); }
function insertUrlAs(inst, url, kind) { const ed = inst.editor;
  if (kind === 'embed') { const e = embedUrl(url); if (e) { insertBlock(ed, { type: 'embed', attrs: { kind: e.kind, src: e.src, title: e.label } }, { select: 'after' }); return; } ctx.toast('본문 안에 표시할 수 없는 주소라서 북마크로 넣었습니다.', 3000); }
  const at = insertBlock(ed, bookmarkJson(url), { select: 'after' }); if (at !== false) unfurlInto(inst, url, at); }
function askUrl(inst, kind) { const ed = inst.editor; const { from } = ed.state.selection;
  askLine({ rect: selRect(ed.view, from, from), label: kind === 'embed' ? '임베드할 주소 (YouTube · Vimeo · Google 지도 · Figma)' : '링크 주소', placeholder: 'https://', ok: '넣기',
    onOk: v => { const href = safeHref(v); if (!href || !/^https?:/i.test(href)) { ctx.toast('http(s) 주소를 넣어 주세요.'); ed.commands.focus(); return; } ed.commands.focus(); insertUrlAs(inst, href, kind); }, onCancel: () => ed.commands.focus() }); }
// A pasted address goes in as a link straight away; the small menu lets the writer turn it into a bookmark or an embed.
function pasteUrl(inst, url) { const ed = inst.editor; const from = ed.state.selection.from;
  ed.chain().focus().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }).run(); const to = ed.state.selection.from; const emb = embedUrl(url);
  const swap = kind => () => { const st = ed.state; if (st.doc.textBetween(Math.min(from, st.doc.content.size), Math.min(to, st.doc.content.size)) !== url) return; const $f = st.doc.resolve(from);
    if ($f.parent.type.name === 'paragraph' && $f.parent.textContent === url) { ed.chain().focus().deleteRange({ from, to }).run(); insertUrlAs(inst, url, kind); } else { ed.chain().focus().setTextSelection(to).run(); insertUrlAs(inst, url, kind); } };
  setTimeout(() => { if (inst.destroyed) return; openMenu([{ header: '붙여 넣은 주소' }, { label: '링크로 두기', icon: '↗', run: () => ed.commands.focus() }, { label: '북마크 카드로', icon: '▭', run: swap('bookmark') }, ...(emb ? [{ label: emb.label + ' 임베드', icon: '⧉', run: swap('embed') }] : [])],
    { rect: selRect(ed.view, from, to), cls: 'nb-pastemenu', noPreselect: true }); }, 0); }
function dateMenu(inst, pos, rect) { const ed = inst.editor; const node = ed.state.doc.nodeAt(pos); if (!node) return; let menu;
  const set = attrs => { const n = ed.state.doc.nodeAt(pos); if (!n || n.type.name !== 'date') return; ed.view.dispatch(closeHistory(ed.state.tr.setNodeMarkup(pos, undefined, { ...n.attrs, ...attrs }))); };
  const a = el('input', { type: 'date', class: 'nb-in', value: node.attrs.date, 'aria-label': '날짜' }), b = el('input', { type: 'date', class: 'nb-in', value: node.attrs.end || '', 'aria-label': '종료일 (선택)' });
  a.addEventListener('change', () => { if (a.value) set({ date: a.value }); }); b.addEventListener('change', () => set({ end: b.value && b.value >= a.value ? b.value : null }));
  menu = openMenu([{ custom: el('div', { class: 'nb-date' }, el('label', {}, '날짜', a), el('label', {}, '종료일 (선택)', b)) }, { label: '오늘로', icon: '◷', run: () => set({ date: ctx.today(), end: null }) }, { label: '종료일 지우기', icon: '✕', run: () => set({ end: null }) },
    { custom: el('div', { class: 'nb-note', text: '알림 예약은 아직 지원하지 않습니다.' }) }], { rect, cls: 'nb-datemenu', noPreselect: true, onClose: () => ed.commands.focus() }); void menu; }
function calloutMenu(inst, ico) { const ed = inst.editor; let pos; try { pos = ed.view.posAtDOM(ico.parentElement, 0); } catch { return; } const $p = ed.state.doc.resolve(pos); let at = null; for (let d = $p.depth; d >= 0; d--) if ($p.node(d).type.name === 'callout') { at = d ? $p.before(d) : null; break; } if (at == null) { const n = ed.state.doc.nodeAt(pos); if (n && n.type.name === 'callout') at = pos; else return; }
  const icons = ['💡', '⚠️', '❗', '✅', 'ℹ️', '📌', '🔥', '📝', '❓', '⭐', '🚧', '📎'];
  const grid = el('div', { class: 'nb-emoji', role: 'group', 'aria-label': '아이콘' }, icons.map(i => el('button', { type: 'button', text: i, 'aria-label': '아이콘 ' + i, onclick: () => { ed.view.dispatch(closeHistory(ed.state.tr.setNodeAttribute(at, 'icon', i))); closeAllMenus(); ed.commands.focus(); } })));
  openMenu([{ header: '아이콘' }, { custom: grid }, { header: '배경색' }, ...COLORS.map(c => ({ label: COLOR_NAMES[c], icon: swatch('bg', c), run: () => ed.view.dispatch(closeHistory(ed.state.tr.setNodeAttribute(at, 'color', c))) }))], { rect: ico.getBoundingClientRect(), cls: 'nb-calloutmenu', noPreselect: true }); }
function jumpToBlock(inst, id) { const ed = inst.editor; const hit = findById(ed.state.doc, id); if (!hit) return false; const tr = ed.state.tr; const $p = ed.state.doc.resolve(hit.pos);
  for (let d = $p.depth; d > 0; d--) { const n = $p.node(d); if (n.type.name === 'details' && !n.attrs.open) tr.setNodeAttribute($p.before(d), 'open', true); }
  if (tr.docChanged) ed.view.dispatch(tr.setMeta('addToHistory', false));
  setTimeout(() => { const dom = ed.view.nodeDOM(hit.pos); if (dom && dom.scrollIntoView) { dom.scrollIntoView({ block: 'center', behavior: 'smooth' }); dom.classList.add('nb-flash'); setTimeout(() => dom.classList.remove('nb-flash'), 1600); } }, 30); return true; }

/* ====================================================================== node views */
function imageView(inst) { return ({ node, getPos, editor }) => { let cur = node;
  const img = el('img', { draggable: 'false' }), cap = el('figcaption', { class: 'nb-cap' });
  const set = attrs => { const pos = getPos(); if (typeof pos !== 'number') return; editor.view.dispatch(closeHistory(editor.state.tr.setNodeMarkup(pos, undefined, { ...cur.attrs, ...attrs }))); };
  const btn = (label, title, fn) => el('button', { type: 'button', class: 'nb-ib', title, 'aria-label': title, text: label, onmousedown: e => { e.preventDefault(); e.stopPropagation(); }, onclick: e => { e.preventDefault(); e.stopPropagation(); fn(); } });
  const ask = (label, key) => askLine({ rect: fig.getBoundingClientRect(), label, value: cur.attrs[key] || '', onOk: v => set({ [key]: v }), onCancel: () => {} });
  const bar = el('div', { class: 'nb-imgbar' }, btn('◧', '왼쪽 정렬', () => set({ align: 'left' })), btn('▣', '가운데 정렬', () => set({ align: 'center' })), btn('◨', '오른쪽 정렬', () => set({ align: 'right' })), btn('⤢', '본문 폭에 맞춤', () => set({ width: null })),
    btn('캡션', '캡션 편집', () => ask('캡션', 'caption')), btn('대체 텍스트', '대체 텍스트 편집 (화면 낭독기용 설명)', () => ask('대체 텍스트', 'alt')), btn('↗', '원본 보기', () => { const s = safeSrc(cur.attrs.src, true); s && window.open(s, '_blank', 'noopener'); }));
  const rz = side => { const h = el('span', { class: 'nb-rz ' + side, 'aria-hidden': 'true' });
    h.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); const z = ctx.zoom() || 1; const x0 = e.clientX, w0 = fig.getBoundingClientRect().width / z; const max = (fig.parentElement.getBoundingClientRect().width / z) || 9999; const k = (cur.attrs.align || 'center') === 'center' ? 2 : 1; let w = w0;
      const mv = ev => { const dx = (ev.clientX - x0) / z; w = Math.max(80, Math.min(max, w0 + (side === 'r' ? dx : -dx) * k)); fig.style.width = Math.round(w) + 'px'; };
      const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); fig.classList.remove('resizing'); set({ width: Math.round(w) >= Math.round(max) ? null : Math.round(w) }); };
      fig.classList.add('resizing'); document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); }); return h; };
  const fig = el('figure', { class: 'img nb-img', 'data-type': 'image', contenteditable: 'false' }, el('span', { class: 'nb-imgwrap' }, img, rz('l'), rz('r'), bar), cap);
  img.addEventListener('error', () => fig.classList.add('broken')); img.addEventListener('load', () => fig.classList.remove('broken'));
  const sync = () => { const a = cur.attrs; const s = safeSrc(a.src, true) || ''; if (img.getAttribute('src') !== s) img.setAttribute('src', s); img.alt = a.alt || ''; fig.setAttribute('data-align', a.align || 'center'); fig.style.width = a.width > 0 ? Math.round(a.width) + 'px' : ''; cap.textContent = a.caption || ''; cap.hidden = !a.caption; if (a.id) fig.setAttribute('data-id', a.id); };
  sync();
  return { dom: fig, update(n) { if (n.type !== cur.type) return false; cur = n; sync(); return true; }, selectNode() { fig.classList.add('ProseMirror-selectednode'); }, deselectNode() { fig.classList.remove('ProseMirror-selectednode'); },
    stopEvent(e) { return !!(e.target.closest && e.target.closest('.nb-imgbar,.nb-rz')); }, ignoreMutation: () => true }; }; }
function headingsOfDoc(doc) { const out = []; doc.descendants(n => { if (n.type.name === 'heading') { const t = n.textContent.trim(); if (t) out.push({ level: n.attrs.level, text: t, id: n.attrs.id || '' }); return false; } if (n.type.name === 'details' && n.attrs.level) { const t = n.firstChild.textContent.trim(); if (t) out.push({ level: n.attrs.level, text: t, id: n.attrs.id || '' }); } return !(n.isTextblock || n.type.name === 'raw'); }); return out; }
function refreshTocs(inst) { if (!inst.tocs.size || !inst.editor) return; const heads = headingsOfDoc(inst.editor.state.doc); const key = JSON.stringify(heads); inst.tocs.forEach(nav => { if (nav._k !== key) { nav._k = key; fillToc(nav, heads); } }); }
function tocView(inst) { return ({ node }) => { const nav = el('nav', { class: 'nb-toc', 'data-type': 'toc', contenteditable: 'false' }); if (node.attrs.id) nav.setAttribute('data-id', node.attrs.id); inst.tocs.add(nav); if (inst.editor) refreshTocs(inst); else setTimeout(() => refreshTocs(inst), 0);
  nav.addEventListener('click', e => { const a = e.target.closest('[data-toc]'); if (a) { e.preventDefault(); e.stopPropagation(); jumpToBlock(inst, a.getAttribute('data-toc')); } });
  return { dom: nav, update: n => n.type.name === 'toc', destroy() { inst.tocs.delete(nav); }, selectNode() { nav.classList.add('ProseMirror-selectednode'); }, deselectNode() { nav.classList.remove('ProseMirror-selectednode'); }, stopEvent: e => !!(e.target.closest && e.target.closest('[data-toc]')), ignoreMutation: () => true }; }; }
function rawView() { return ({ node }) => { const d = el('div', { class: 'nb-raw', 'data-type': 'raw', contenteditable: 'false' }, el('div', { class: 'nb-raw-note', text: '이 버전에서는 편집할 수 없는 블록입니다. 내용은 그대로 보관됩니다.' })); const v = el('div', { class: 'nb-raw-view' }); v.innerHTML = ctx.clean(node.attrs.html || ''); d.append(v);
  return { dom: d, update: n => n.type.name === 'raw' && n.attrs.html === node.attrs.html, selectNode() { d.classList.add('ProseMirror-selectednode'); }, deselectNode() { d.classList.remove('ProseMirror-selectednode'); }, ignoreMutation: () => true }; }; }

/* ====================================================================== floating chrome: selection toolbar, block handle, table tools, drop edge */
function chrome(inst) { const ed = inst.editor, view = ed.view; const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); inst.cleanup.push(() => t.removeEventListener(type, fn, o)); };
  const floats = []; const float = (cls, ...kids) => { const n = el('div', { class: 'nb-float ' + cls }, ...kids); n.hidden = true; ['mousedown', 'mouseup', 'click', 'keydown', 'keyup'].forEach(t => n.addEventListener(t, e => e.stopPropagation())); document.body.append(n); floats.push(n); inst.cleanup.push(() => n.remove()); return n; };
  const rangeNow = () => rangeKey.getState(ed.state);

  /* --- selection toolbar --- */
  let mouseDown = false, colorMenu = null;
  const tb = (label, title, fn, cls) => el('button', { type: 'button', class: 'nb-tb ' + (cls || ''), title, 'aria-label': title, html: label, onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); fn(e.currentTarget); } });
  const mk = (name, label, title) => { const b = tb(label, title, () => ed.chain().focus().toggleMark(name).run()); b.dataset.mark = name; return b; };
  const turnBtn = tb('<span class="nb-tb-kind">텍스트</span><span class="nb-caret">▾</span>', '블록 유형 바꾸기', b => { const s = ed.state.selection; const a = blockAt(ed.state.doc, s.from), z = blockAt(ed.state.doc, s.to); if (!a) return; let r = { from: a.pos, to: a.pos + a.node.nodeSize };
    if (z && z.pos !== a.pos) { const $a = ed.state.doc.resolve(a.pos), $z = ed.state.doc.resolve(z.pos); if ($a.parent === $z.parent) r = { from: a.pos, to: z.pos + z.node.nodeSize }; }
    const kind = kindAt(ed.state.doc, a.pos); colorMenu = openMenu(TURN.map(t => ({ label: t.label, icon: t.icon, checked: t.k === kind, run: () => turnInto(ed, r, t.k) })), { rect: b.getBoundingClientRect(), cls: 'nb-turnmenu', keep: t => bubble.contains(t), onClose: () => { colorMenu = null; } }); }, 'wide');
  const colorBtn = tb('<span class="nb-tb-a">A</span><span class="nb-caret">▾</span>', '글자색 · 배경색', b => { const cur = ed.getAttributes('textColor').color || null, bg = ed.isActive('bgColor') ? ed.getAttributes('bgColor').color : null;
    const apply = v => { const ch = ed.chain().focus(); if (v && v.endsWith('_bg')) ch.setMark('bgColor', { color: v.slice(0, -3) }); else if (v) ch.setMark('textColor', { color: v }); ch.run(); };
    const items = colorItems(apply, cur); items[1].run = () => ed.chain().focus().unsetMark('textColor').run(); const bi = items.findIndex(i => i.label === '기본 배경'); items[bi].run = () => ed.chain().focus().unsetMark('bgColor').run(); if (bg) items.forEach(i => { if (i.label === COLOR_NAMES[bg] + ' 배경') i.checked = true; });
    colorMenu = openMenu(items, { rect: b.getBoundingClientRect(), cls: 'nb-colormenu', keep: t => bubble.contains(t), onClose: () => { colorMenu = null; } }); });
  const bubble = float('nb-bubble', turnBtn, el('span', { class: 'nb-tb-sep' }), mk('bold', '<b>B</b>', '굵게 (Ctrl+B)'), mk('italic', '<i>I</i>', '기울임 (Ctrl+I)'), mk('underline', '<u>U</u>', '밑줄 (Ctrl+U)'), mk('strike', '<s>S</s>', '취소선 (Ctrl+Shift+S)'), mk('code', '&lt;/&gt;', '인라인 코드 (Ctrl+E)'),
    (() => { const b = tb('링크', '링크 (Ctrl+K)', () => linkAsk(inst)); b.dataset.mark = 'link'; return b; })(), colorBtn, tb('지우기', '서식 지우기', () => ed.chain().focus().unsetAllMarks().run()));
  bubble.setAttribute('role', 'toolbar'); bubble.setAttribute('aria-label', '서식');
  const showBubble = () => { const st = ed.state, s = st.selection; const ok = view.editable && !mouseDown && !rangeNow() && s instanceof TextSelection && !s.empty && (view.hasFocus() || colorMenu) && !s.$from.parent.type.spec.code && st.doc.textBetween(s.from, s.to, ' ', ' ').length > 0;
    if (!ok) { if (colorMenu && (!(s instanceof TextSelection) || s.empty)) { colorMenu.close(); colorMenu = null; } if (!colorMenu) bubble.hidden = true; return; }
    bubble.hidden = false; if (inst.hideHandle) inst.hideHandle(); bubble.querySelectorAll('[data-mark]').forEach(b => { const onM = ed.isActive(b.dataset.mark); b.classList.toggle('on', onM); b.setAttribute('aria-pressed', String(onM)); });
    const a = blockAt(st.doc, s.from); const kind = a ? kindAt(st.doc, a.pos) : null; const t = TURN.find(x => x.k === kind); turnBtn.querySelector('.nb-tb-kind').textContent = t ? t.label : '텍스트'; turnBtn.disabled = !a || !canTurn(a.node);
    colorBtn.querySelector('.nb-tb-a').setAttribute('data-c', ed.getAttributes('textColor').color || '');
    place(bubble, selRect(view, s.from, s.to), { above: true, center: true, gap: 8 }); };
  on(view.dom, 'mousedown', () => { mouseDown = true; bubble.hidden = true; });
  on(document, 'mouseup', () => { if (mouseDown) { mouseDown = false; setTimeout(showBubble, 0); } });
  ed.on('selectionUpdate', showBubble); ed.on('blur', () => setTimeout(() => { if (!colorMenu && !bubble.contains(document.activeElement)) bubble.hidden = true; }, 120)); ed.on('focus', showBubble);

  /* --- block handle (+ and ⋮⋮) --- */
  let hov = null; // {pos, node}
  const addBtn = el('button', { type: 'button', class: 'nb-h-add', title: '아래에 블록 추가', 'aria-label': '아래에 블록 추가', text: '+' });
  const dragBtn = el('button', { type: 'button', class: 'nb-h-drag', title: '끌어서 이동 · 눌러서 메뉴', 'aria-label': '블록 메뉴 · 끌어서 이동', draggable: 'true', 'aria-haspopup': 'menu', html: '<svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true"><g fill="currentColor"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/></g></svg>' });
  const handle = float('nb-handle', addBtn, dragBtn);
  const blockDom = b => { const d = view.nodeDOM(b.pos); return d && d.nodeType === 1 ? d : null; };
  inst.hideHandle = () => { handle.hidden = true; };
  const showHandle = b => { const dom = blockDom(b); if (!dom) { handle.hidden = true; return; } hov = b; const r = dom.getBoundingClientRect(); const z = ctx.zoom() || 1; const cs = getComputedStyle(dom); const lh = (parseFloat(cs.lineHeight) || 23) * z; const pt = (parseFloat(cs.paddingTop) || 0) * z;
    const marker = /^(listItem|taskItem)$/.test(b.node.type.name) ? 24 * z : 0; handle.hidden = false; const top = b.node.isAtom || b.node.type.name === 'table' ? r.top + 2 : r.top + pt + Math.max(0, (lh - 24) / 2);
    handle.style.left = Math.round(Math.max(2, r.left - marker - handle.offsetWidth - 4)) + 'px'; handle.style.top = Math.round(top) + 'px'; };
  on(document, 'mousemove', e => { if (inst.drag || !view.editable) return; if (handle.contains(e.target)) return; if (anyMenuOpen() || !bubble.hidden || e.buttons) return;
    const r = view.dom.getBoundingClientRect(); if (e.clientX < r.left - 70 || e.clientX > r.right + 8 || e.clientY < r.top - 2 || e.clientY > r.bottom + 2 || !view.dom.isConnected) { handle.hidden = true; return; }
    const hit = view.posAtCoords({ left: Math.max(r.left + 6, Math.min(e.clientX, r.right - 6)), top: e.clientY }); if (!hit) return; const b = blockAt(ed.state.doc, hit.pos, hit.inside); if (b) showHandle(b); });
  on(window, 'scroll', () => { handle.hidden = true; tbl.hidden = true; addRow.hidden = true; addCol.hidden = true; }, true);
  const rangeFor = b => { const r = rangeNow(); return r && b.pos >= r.from && b.pos < r.to ? r : { from: b.pos, to: b.pos + b.node.nodeSize }; };
  const fresh = () => { if (!hov) return null; const n = ed.state.doc.nodeAt(hov.pos); return n && n.type === hov.node.type ? { pos: hov.pos, node: n } : null; };
  addBtn.addEventListener('mousedown', e => e.preventDefault());
  addBtn.addEventListener('click', e => { e.preventDefault(); const b = fresh(); if (!b) return; handle.hidden = true;
    if (b.node.type.name === 'paragraph' && !b.node.content.size) { ed.chain().focus().setTextSelection(b.pos + 1).insertContent('/').run(); return; }
    const end = b.pos + b.node.nodeSize; const $e = ed.state.doc.resolve(end); const P = ed.schema.nodes.paragraph;
    if ($e.parent.canReplaceWith($e.index(), $e.index(), P)) ed.chain().focus().insertContentAt(end, { type: 'paragraph' }).setTextSelection(end + 1).insertContent('/').run();
    else { const li = b.node.type.create(b.node.type.name === 'taskItem' ? { checked: false } : null, P.create()); ed.view.dispatch(ed.state.tr.insert(end, li)); ed.chain().focus().setTextSelection(end + 2).insertContent('/').run(); } });
  dragBtn.addEventListener('click', e => { e.preventDefault(); const b = fresh(); if (!b) return; let r = { from: b.pos, to: b.pos + b.node.nodeSize }; const cur = rangeNow();
    if (e.shiftKey && cur) { const $a = ed.state.doc.resolve(cur.from), $b = ed.state.doc.resolve(b.pos); if ($a.parent === $b.parent) r = { from: Math.min(cur.from, r.from), to: Math.max(cur.to, r.to) }; } else if (cur && b.pos >= cur.from && b.pos < cur.to) r = cur;
    setRange(inst, r); if (!e.shiftKey) blockMenu(inst, b, r, dragBtn.getBoundingClientRect()); });
  dragBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dragBtn.click(); } });
  dragBtn.addEventListener('dragstart', e => { const b = fresh(); if (!b) { e.preventDefault(); return; } closeAllMenus(); const r = rangeFor(b); inst.drag = r; const slice = ed.state.doc.slice(r.from, r.to);
    view.dragging = { slice, move: !e.altKey }; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', slice.content.textBetween(0, slice.content.size, '\n')); const dom = blockDom(b); if (dom) { try { e.dataTransfer.setDragImage(dom, 0, 0); } catch {} }
    document.body.classList.add('nb-dragging'); blocksIn(ed.state.doc, r.from, r.to).forEach(x => { const d = view.nodeDOM(x.pos); d && d.classList && d.classList.add('nb-drag-src'); }); });
  dragBtn.addEventListener('dragend', () => { inst.drag = null; inst.edge = null; view.dragging = null; document.body.classList.remove('nb-dragging'); view.dom.querySelectorAll('.nb-drag-src').forEach(d => d.classList.remove('nb-drag-src')); inst.hideEdge(); handle.hidden = true; stopScroll(); });

  /* --- while dragging: right edge of a top level block = "put next to it"; near the top / bottom of the scroller = scroll --- */
  const edgeLine = float('nb-edge'); let scrollTimer = null; const stopScroll = () => { if (scrollTimer) { clearInterval(scrollTimer); scrollTimer = null; } };
  inst.hideEdge = () => { edgeLine.hidden = true; document.body.classList.remove('nb-coldrop'); };
  const scroller = () => { for (let n = view.dom.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 4) return n; } return null; };
  inst.trackEdge = e => { const sc = scroller(); stopScroll(); if (sc) { const sr = sc.getBoundingClientRect(); const d = e.clientY < sr.top + 60 ? -14 : e.clientY > sr.bottom - 60 ? 14 : 0; if (d) scrollTimer = setInterval(() => { sc.scrollTop += d; }, 16); }
    const r = view.dom.getBoundingClientRect(); const hit = view.posAtCoords({ left: Math.max(r.left + 6, Math.min(e.clientX, r.right - 6)), top: e.clientY }); inst.edge = null;
    if (hit) { const $p = ed.state.doc.resolve(hit.pos); const top = $p.depth >= 1 ? $p.before(1) : (hit.inside >= 0 && ed.state.doc.resolve(hit.inside).depth === 0 ? hit.inside : null); const node = top == null ? null : ed.state.doc.nodeAt(top); const dom = top == null ? null : view.nodeDOM(top);
      if (node && dom && dom.nodeType === 1 && !(top >= inst.drag.from && top < inst.drag.to) && node.type.name !== 'table') { const br = dom.getBoundingClientRect(); const z = ctx.zoom() || 1; if (e.clientX > br.right - 46 * z && br.width > 260 * z) { inst.edge = { pos: top }; edgeLine.hidden = false; edgeLine.style.left = Math.round(br.right + 2) + 'px'; edgeLine.style.top = Math.round(br.top) + 'px'; edgeLine.style.height = Math.round(br.height) + 'px'; document.body.classList.add('nb-coldrop'); return; } } }
    inst.hideEdge(); };
  on(document, 'drop', stopScroll, true);

  /* --- columns: drag the gap to change the widths --- */
  on(view.dom, 'mousedown', e => { const cols = e.target; if (!(cols.classList && cols.classList.contains('nb-cols')) || !view.editable) return; const kids = [...cols.children].filter(c => c.classList.contains('nb-col')); let i = -1;
    for (let k = 0; k < kids.length - 1; k++) { const a = kids[k].getBoundingClientRect(), b = kids[k + 1].getBoundingClientRect(); if (e.clientX >= a.right - 2 && e.clientX <= b.left + 2) { i = k; break; } } if (i < 0) return; e.preventDefault();
    let pos; try { pos = view.posAtDOM(cols, 0) - 1; } catch { return; } const node = ed.state.doc.nodeAt(pos); if (!node || node.type.name !== 'columns') return;
    const wa = node.child(i).attrs.w || 1, wb = node.child(i + 1).attrs.w || 1, ra = kids[i].getBoundingClientRect().width, rb = kids[i + 1].getBoundingClientRect().width, x0 = e.clientX; let raf = 0, last = null;
    const apply = () => { raf = 0; if (!last) return; const n = ed.state.doc.nodeAt(pos); if (!n || n.type.name !== 'columns' || n.childCount <= i + 1) return; let p = pos + 1; for (let k = 0; k < i; k++) p += n.child(k).nodeSize; const tr = ed.state.tr.setNodeAttribute(p, 'w', last[0]).setNodeAttribute(p + n.child(i).nodeSize, 'w', last[1]); view.dispatch(tr); };
    const mv = ev => { const dx = ev.clientX - x0; const share = Math.max(0.12, Math.min(0.88, (ra + dx) / (ra + rb))); const tot = wa + wb; last = [Math.round(tot * share * 100) / 100, Math.round(tot * (1 - share) * 100) / 100]; if (!raf) raf = requestAnimationFrame(apply); };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.classList.remove('nb-colresize'); };
    document.body.classList.add('nb-colresize'); document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); });

  /* --- table tools --- */
  const tblBtn = el('button', { type: 'button', class: 'nb-tb', title: '표 메뉴', 'aria-label': '표 메뉴', 'aria-haspopup': 'menu', text: '표 ▾', onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); openMenu(tableItems(ed), { rect: tblBtn.getBoundingClientRect(), cls: 'nb-tablemenu', noPreselect: true }); } });
  const tbl = float('nb-tbl', tblBtn);
  const addRow = float('nb-tadd row', el('button', { type: 'button', title: '맨 아래에 행 추가', 'aria-label': '맨 아래에 행 추가', text: '+', onmousedown: e => e.preventDefault(), onclick: () => { const t = inTable(ed.state); t && appendRowOrCol(ed, t.pos, 'row'); } }));
  const addCol = float('nb-tadd col', el('button', { type: 'button', title: '맨 오른쪽에 열 추가', 'aria-label': '맨 오른쪽에 열 추가', text: '+', onmousedown: e => e.preventDefault(), onclick: () => { const t = inTable(ed.state); t && appendRowOrCol(ed, t.pos, 'col'); } }));
  const showTable = () => { const t = view.editable && (view.hasFocus() || tbl.contains(document.activeElement)) ? inTable(ed.state) : null; const dom = t && view.nodeDOM(t.pos); const table = dom && (dom.tagName === 'TABLE' ? dom : dom.querySelector('table'));
    if (!table) { tbl.hidden = addRow.hidden = addCol.hidden = true; return; } const r = table.getBoundingClientRect(); const wr = (table.closest('.tableWrapper') || table).getBoundingClientRect(); const vis = { left: Math.max(r.left, wr.left), right: Math.min(r.right, wr.right) };
    tbl.hidden = addRow.hidden = addCol.hidden = false; tbl.style.left = Math.round(vis.left) + 'px'; tbl.style.top = Math.round(Math.max(4, r.top - tbl.offsetHeight - 6)) + 'px';
    addRow.style.left = Math.round(vis.left) + 'px'; addRow.style.top = Math.round(r.bottom + 3) + 'px'; addRow.style.width = Math.round(Math.max(40, vis.right - vis.left)) + 'px';
    addCol.style.left = Math.round(vis.right + 3) + 'px'; addCol.style.top = Math.round(r.top) + 'px'; addCol.style.height = Math.round(r.height) + 'px'; };
  ed.on('selectionUpdate', showTable); ed.on('update', showTable); ed.on('focus', showTable); ed.on('blur', () => setTimeout(showTable, 150));
  ed.on('update', () => { handle.hidden = true; });

  /* empty space under the last block: the caret goes to the end */
  on(inst.host, 'mousedown', e => { if (e.target === inst.host || e.target === inst.wrap) { e.preventDefault(); ed.commands.focus('end'); } });
  inst.hideChrome = () => { floats.forEach(f => { f.hidden = true; }); };
}

function blockMenu(inst, b, range, rect) { const ed = inst.editor; const node = b.node, name = node.type.name; const multi = blocksIn(ed.state.doc, range.from, range.to).length > 1; const kind = kindAt(ed.state.doc, b.pos);
  const fire = tr => ed.view.dispatch(closeHistory(tr));
  const set = attrs => { const n = ed.state.doc.nodeAt(b.pos); if (n && n.type === node.type) fire(ed.state.tr.setNodeMarkup(b.pos, undefined, { ...n.attrs, ...attrs })); };
  const items = []; const text = ed.state.doc.textBetween(range.from, range.to, '\n', ' ');
  if (blocksIn(ed.state.doc, range.from, range.to).some(x => canTurn(x.node))) items.push({ label: '전환', icon: '⇄', children: TURN.map(t => ({ label: t.label, icon: t.icon, checked: !multi && t.k === kind, run: () => turnInto(ed, range, t.k) })) });
  if (blocksIn(ed.state.doc, range.from, range.to).some(x => x.node.type.spec.attrs && ('blockColor' in x.node.type.spec.attrs))) items.push({ label: '색', icon: swatch('tx', 'red'), children: colorItems(v => colorBlocks(ed, range, v), node.attrs.blockColor || null) });
  if (!multi) {
    if (name === 'image') items.push({ label: '정렬', icon: '▣', children: [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']].map(([k, l]) => ({ label: l, checked: (node.attrs.align || 'center') === k, run: () => set({ align: k }) })) },
      { label: '캡션', icon: '✎', run: () => askLine({ rect, label: '캡션', value: node.attrs.caption || '', onOk: v => set({ caption: v }) }) }, { label: '대체 텍스트', icon: 'Aa', run: () => askLine({ rect, label: '대체 텍스트 (화면 낭독기용 설명)', value: node.attrs.alt || '', onOk: v => set({ alt: v }) }) },
      { label: '원본 보기', icon: '↗', run: () => { const s = safeSrc(node.attrs.src, true); s && window.open(s, '_blank', 'noopener'); } }, { label: '다른 이미지로 교체', icon: '⟳', run: () => { const inp = el('input', { type: 'file', accept: 'image/*' }); inp.onchange = () => { const f = inp.files[0]; if (!f) return; ctx.toast('이미지를 올리는 중입니다…', 1500); Promise.resolve().then(() => ctx.upload(f, inst.itemId)).then(up => { if (up && (up.src || up.id)) set({ src: up.src || `/api/file/${up.id}?inline=1` }); }).catch(er => ctx.toast((er && er.message) || '업로드하지 못했습니다.', 2800)); }; inp.click(); } });
    if (name === 'file') { const pdfish = /\.(pdf|mp4|webm|mov|mp3|wav|m4a|ogg)$/i.exec(node.attrs.name || ''); items.push({ label: '다운로드', icon: '↓', disabled: !node.attrs.fid, run: () => { const a = el('a', { href: '/api/file/' + node.attrs.fid, download: node.attrs.name, onclick: e => e.stopPropagation() }); document.body.append(a); a.click(); a.remove(); } });
      if (pdfish && node.attrs.fid) items.push({ label: '본문에서 바로 보기', icon: '⧉', run: () => { const ext = pdfish[1].toLowerCase(); const k = ext === 'pdf' ? 'iframe' : /mp4|webm|mov/.test(ext) ? 'video' : 'audio'; fire(ed.state.tr.replaceWith(b.pos, b.pos + node.nodeSize, ed.schema.nodes.embed.create({ id: node.attrs.id, kind: k, src: `/api/file/${node.attrs.fid}?inline=1`, title: node.attrs.name }))); } }); }
    if (name === 'embed') { const own = /^\/api\/file\/([\w-]+)/.exec(node.attrs.src || ''); items.push({ label: '새 창에서 열기', icon: '↗', run: () => { const s = safeSrc(node.attrs.src); s && window.open(s, '_blank', 'noopener'); } });
      if (own) items.push({ label: '파일 카드로 표시', icon: '▭', run: () => fire(ed.state.tr.replaceWith(b.pos, b.pos + node.nodeSize, ed.schema.nodes.file.create({ id: node.attrs.id, name: node.attrs.title || '파일', fid: own[1] }))) }); }
    if (name === 'bookmark') items.push({ label: '열기', icon: '↗', run: () => { const h = safeHref(node.attrs.href); h && window.open(h, '_blank', 'noopener'); } }, { label: '제목 수정', icon: '✎', run: () => askLine({ rect, label: '북마크 제목', value: node.attrs.title || '', onOk: v => set({ title: v }) }) },
      { label: '주소 수정', icon: '🔗', run: () => askLine({ rect, label: '주소', value: node.attrs.href || '', onOk: v => { const h = safeHref(v); if (h && /^https?:/i.test(h)) set({ href: h, desc: node.attrs.desc === node.attrs.href ? h : node.attrs.desc }); else ctx.toast('http(s) 주소를 넣어 주세요.'); } }) }, { label: '일반 링크로 바꾸기', icon: 'T', run: () => fire(ed.state.tr.replaceWith(b.pos, b.pos + node.nodeSize, ed.schema.nodes.paragraph.create({ id: node.attrs.id }, ed.schema.text(node.attrs.title || node.attrs.href, [ed.schema.marks.link.create({ href: node.attrs.href })])))) });
    if (name === 'columns') items.push({ label: '단 해제', icon: '▤', run: () => unwrapColumns(ed, b.pos) }, { label: '열 너비 같게', icon: '↔', run: () => { const tr = ed.state.tr; let p = b.pos + 1; node.forEach(c => { tr.setNodeAttribute(p, 'w', 1); p += c.nodeSize; }); fire(tr); } });
    if (name === 'table') items.push({ label: '표 편집', icon: '▦', children: () => { ed.chain().setTextSelection(Math.min(b.pos + 4, ed.state.doc.content.size)).run(); return tableItems(ed); } });
    if (name === 'codeBlock') items.push({ label: '언어', icon: '{}', children: languageItems(node.attrs.language, v => set({ language: v })) }, { label: '코드 복사', icon: '⧉', run: () => copyText(node.textContent, '코드를 복사했습니다.') });
    if (name === 'mathBlock') items.push({ label: '수식 편집', icon: '∑', run: () => editMath(ed, b.pos) });
    if (name === 'button') items.push(...buttonItems(inst, b.pos, rect));
    if (name === 'listItem' || name === 'taskItem') items.push({ label: '들여쓰기', icon: '→', kbd: 'Tab', run: () => { ed.chain().focus().setTextSelection(b.pos + 2).sinkListItem(name).run(); } }, { label: '내어쓰기', icon: '←', kbd: 'Shift+Tab', run: () => { ed.chain().focus().setTextSelection(b.pos + 2).liftListItem(name).run(); } });
  }
  if (items.length) items.push({ sep: true });
  items.push({ label: '템플릿으로 저장', icon: '▤', run: () => saveAsTemplate(inst, range, rect) }, { label: '복제', icon: '⧉', kbd: 'Ctrl+D', run: () => duplicateBlocks(ed, range) }, { label: '위로 이동', icon: '↑', kbd: 'Ctrl+Shift+↑', run: () => moveBlocks(ed, range, -1) }, { label: '아래로 이동', icon: '↓', kbd: 'Ctrl+Shift+↓', run: () => moveBlocks(ed, range, 1) });
  if (!multi && node.attrs.id && ctx.blockLink) items.push({ label: '블록 링크 복사', icon: '🔗', run: () => copyText(ctx.blockLink(inst.itemId, node.attrs.id), '블록 링크를 복사했습니다.') });
  items.push({ label: '삭제', icon: '✕', kbd: 'Del', danger: true, run: () => deleteBlocks(ed, range) }, { sep: true }, { custom: el('div', { class: 'nb-note', text: `글자 수 ${text.replace(/\s/g, '').length.toLocaleString()} · 블록 ${blocksIn(ed.state.doc, range.from, range.to).length}개` }) });
  openMenu(items, { rect, cls: 'nb-blockmenu', takeFocus: true, onClose: () => { if (!inst.destroyed) inst.editor.view.focus(); } }); }

export { hydrate, upgrade };
