// Document schema: which blocks, inline nodes and marks exist, how each is stored as HTML and read back.
// Stored bodies are this HTML (schema version 2). The editor never keeps raw DOM as the source.
import { Node, Mark, Extension, InputRule, mergeAttributes, wrappingInputRule } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Blockquote } from '@tiptap/extension-blockquote';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details';
import { UniqueID } from '@tiptap/extension-unique-id';
import { Placeholder } from '@tiptap/extensions';
import { ctx, newId, safeHref, safeSrc, COLORS, colorToken, fmtDate, KNOWN_TYPES } from './host.js';
import { Code, codeOptions } from './code.js';
import { MathInline, MathBlock } from './math.js';
import { Button } from './templates.js';
import { Synced, ItemList } from './blocks2.js';

export const ID_TYPES = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'taskList', 'taskItem', 'blockquote', 'codeBlock', 'horizontalRule',
  'details', 'callout', 'table', 'image', 'file', 'bookmark', 'embed', 'columns', 'column', 'toc', 'raw', 'mathBlock', 'button', 'synced', 'itemList'];
export { KNOWN_TYPES };
const BLOCK_COLOR_TYPES = ['paragraph', 'heading', 'blockquote', 'listItem', 'taskItem', 'details', 'callout'];
const okBlockColor = v => !!v && (COLORS.includes(v) || (v.endsWith('_bg') && COLORS.includes(v.slice(0, -3))));

/* ---------- marks ---------- */
const TextColor = Mark.create({
  name: 'textColor',
  addAttributes() { return { color: { default: null, parseHTML: el => el.getAttribute('data-color'), renderHTML: a => a.color ? { 'data-color': a.color } : {} } }; },
  parseHTML() { return [
    { tag: 'span[data-color]', getAttrs: el => COLORS.includes(el.getAttribute('data-color')) ? null : false },
    { tag: 'span[style*="color"]', getAttrs: el => { const t = el.style.color && colorToken(el.style.color, false); return t ? { color: t } : false; } },
    { tag: 'font[color]', getAttrs: el => { const t = colorToken(el.getAttribute('color'), false); return t ? { color: t } : false; } }]; },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0]; },
});
const BgColor = Mark.create({
  name: 'bgColor',
  addAttributes() { return { color: { default: 'yellow', parseHTML: el => el.getAttribute('data-bg') || 'yellow', renderHTML: a => ({ 'data-bg': a.color || 'yellow' }) } }; },
  parseHTML() { return [
    { tag: 'mark', getAttrs: el => { const v = el.getAttribute('data-bg'); if (v) return COLORS.includes(v) ? null : false; const t = el.style.backgroundColor && colorToken(el.style.backgroundColor, true); return { color: t || 'yellow' }; } },
    { tag: 'span[style*="background"]', getAttrs: el => { const t = el.style.backgroundColor && colorToken(el.style.backgroundColor, true); return t ? { color: t } : false; } }]; },
  renderHTML({ HTMLAttributes }) { return ['mark', HTMLAttributes, 0]; },
});

/* ---------- blocks ---------- */
const Callout = Node.create({
  name: 'callout', group: 'block', content: 'block+', defining: true,
  addAttributes() { return {
    icon: { default: '💡', parseHTML: el => el.getAttribute('data-icon') || '💡', renderHTML: a => ({ 'data-icon': a.icon || '💡' }) },
    color: { default: 'gray', parseHTML: el => { const v = el.getAttribute('data-color'); return COLORS.includes(v) ? v : 'gray'; }, renderHTML: a => ({ 'data-color': a.color || 'gray' }) } }; },
  parseHTML() { return [{ tag: 'div[data-type="callout"]', contentElement: el => el.querySelector(':scope > .nb-callout-body') || el }]; },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'callout', class: 'nb-callout' }, HTMLAttributes), ['span', { class: 'nb-callout-ico', contenteditable: 'false' }, node.attrs.icon || '💡'], ['div', { class: 'nb-callout-body' }, 0]]; },
  addCommands() { return { setCallout: () => ({ commands }) => commands.wrapIn(this.name) }; },
  addInputRules() { return [wrappingInputRule({ find: /^!\s$/, type: this.type })]; },
});

const Image = Node.create({
  name: 'image', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return { src: { default: '' }, alt: { default: '' }, caption: { default: '' }, width: { default: null }, align: { default: 'center' } }; },
  parseHTML() { return [
    { tag: 'figure.img', priority: 70, getAttrs: el => { const img = el.querySelector('img'); const src = img && safeSrc(img.getAttribute('src'), true); if (!src) return false;
      const w = parseInt(el.getAttribute('data-width'), 10); const al = el.getAttribute('data-align');
      return { src, alt: img.getAttribute('alt') || '', caption: (el.querySelector('figcaption') || {}).textContent || '', width: w > 0 ? w : null, align: ['left', 'center', 'right'].includes(al) ? al : 'center' }; } },
    { tag: 'img[src]', priority: 60, getAttrs: el => { const src = safeSrc(el.getAttribute('src'), true); return src ? { src, alt: el.getAttribute('alt') || '' } : false; } }]; },
  renderHTML({ node }) { const a = node.attrs; const w = a.width > 0 ? Math.round(a.width) : null;
    const out = ['figure', { class: 'img', 'data-type': 'image', 'data-align': a.align || 'center', ...(w ? { 'data-width': String(w), style: `width:${w}px` } : {}) }, ['img', { src: safeSrc(a.src, true) || '', alt: a.alt || '', loading: 'lazy' }]];
    if (a.caption) out.push(['figcaption', {}, a.caption]); return out; },
});

const FileCard = Node.create({
  name: 'file', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return { name: { default: '파일' }, fid: { default: '' }, size: { default: '' } }; },
  parseHTML() { return [{ tag: 'a.file', priority: 80, getAttrs: el => ({ name: el.getAttribute('data-name') || (el.querySelector('.fn') || {}).textContent || '파일', fid: (/^[\w-]+$/.test(el.getAttribute('data-fid') || '') ? el.getAttribute('data-fid') : ''), size: (el.querySelector('.fs') || {}).textContent || '' }) }]; },
  renderHTML({ node }) { const a = node.attrs; const k = ctx.fileKind(a.name);
    // attribute order (class, data-name, data-fid) is what the app's attachment list looks for
    const at = { class: 'file', 'data-name': a.name };
    if (a.fid) Object.assign(at, { 'data-fid': a.fid, href: '/api/file/' + a.fid, download: a.name, title: '클릭하면 다운로드됩니다' }); else at['data-filedl'] = a.name;
    const out = ['a', at, ['span', { class: 'fico ' + k.cls }, ['i'], k.lb], ['span', { class: 'fn' }, a.name]]; if (a.size) out.push(['span', { class: 'fs' }, a.size]); return out; },
});

const Bookmark = Node.create({
  name: 'bookmark', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return { href: { default: '' }, title: { default: '' }, desc: { default: '' }, download: { default: '' } }; },
  parseHTML() { return [{ tag: 'a.bookmark', priority: 80, getAttrs: el => { const href = safeHref(el.getAttribute('href')); if (!href || href === '#') return false; const b = el.querySelector('.bm-body b'), s = el.querySelector('.bm-body > span');
    return { href, title: (b ? b.textContent : el.textContent).trim(), desc: s ? s.textContent.trim() : '', download: el.getAttribute('download') || '' }; } }]; },
  renderHTML({ node }) { const a = node.attrs; let host = a.href; try { host = new URL(a.href, 'https://x').hostname.replace(/^www\./, ''); } catch {}
    const at = { class: 'bookmark', 'data-type': 'bookmark', href: safeHref(a.href) || '#' };
    if (a.download) at.download = a.download; else Object.assign(at, { target: '_blank', rel: 'noopener noreferrer' });
    const k = a.download ? ctx.fileKind(a.download) : null;
    const ico = k ? ['span', { class: 'fico ' + k.cls }, ['i'], k.lb] : ['span', { class: 'bm-glyph' }, ((a.title || host)[0] || '•').toUpperCase()];
    return ['a', at, ['span', { class: 'bm-ico' }, ico], ['span', { class: 'bm-body' }, ['b', {}, a.title || host], ['span', {}, a.desc || a.href]]]; },
});

const Embed = Node.create({
  name: 'embed', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return { kind: { default: 'iframe' }, src: { default: '' }, title: { default: '' } }; },
  parseHTML() { const of = (kind, el) => { const s = safeSrc(el.getAttribute('src') || (el.querySelector('source') || { getAttribute() {} }).getAttribute('src')); return s ? { kind, src: s, title: el.getAttribute('title') || '' } : false; };
    return [{ tag: 'iframe', getAttrs: el => of('iframe', el) }, { tag: 'video', getAttrs: el => of('video', el) }, { tag: 'audio', getAttrs: el => of('audio', el) }]; },
  renderHTML({ node }) { const a = node.attrs; const src = safeSrc(a.src) || 'about:blank'; const own = src.startsWith('/api/file/');
    if (a.kind === 'video') return ['video', { class: 'embed media', controls: '', preload: 'metadata', src }];
    if (a.kind === 'audio') return ['audio', { class: 'media', controls: '', preload: 'metadata', src }];
    // our own files (PDF viewer) cannot run inside a sandbox; outside pages always get one
    return ['iframe', { class: 'embed', src, title: a.title || '', loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin', ...(own ? {} : { sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation', allowfullscreen: '' }) }]; },
});

const Columns = Node.create({
  name: 'columns', group: 'block', content: 'column{2,5}', isolating: true, defining: true,
  parseHTML() { return [{ tag: 'div[data-type="columns"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'columns', class: 'nb-cols' }, HTMLAttributes), 0]; },
});
const Column = Node.create({
  name: 'column', content: 'block+', isolating: true,
  addAttributes() { return { w: { default: 1, parseHTML: el => { const v = parseFloat(el.getAttribute('data-w')); return v > 0 ? Math.min(20, Math.max(0.1, v)) : 1; }, renderHTML: a => ({ 'data-w': String(a.w || 1), style: `flex:${a.w || 1} 1 0` }) } }; },
  parseHTML() { return [{ tag: 'div[data-type="column"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'column', class: 'nb-col' }, HTMLAttributes), 0]; },
});

const Toc = Node.create({
  name: 'toc', group: 'block', atom: true, selectable: true, draggable: false,
  parseHTML() { return [{ tag: 'nav[data-type="toc"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['nav', mergeAttributes({ 'data-type': 'toc', class: 'nb-toc' }, HTMLAttributes)]; },
});

// A block this version does not know (written by a newer version): kept untouched, shown as a box that cannot be edited.
const Raw = Node.create({
  name: 'raw', group: 'block', atom: true, selectable: true, draggable: false,
  addAttributes() { return { html: { default: '', parseHTML: el => el.getAttribute('data-html') || '', renderHTML: a => ({ 'data-html': a.html || '' }) } }; },
  parseHTML() { return [{ tag: 'div[data-type="raw"]', priority: 90 }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'raw', class: 'nb-raw' }, HTMLAttributes)]; },
});

/* ---------- inline nodes ---------- */
const dateText = a => fmtDate(a.date) + (a.end && a.end !== a.date ? ' → ' + fmtDate(a.end) : '');
const okDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
const DateChip = Node.create({
  name: 'date', group: 'inline', inline: true, atom: true, selectable: true,
  // remind: days before the date on which the inbox shows a reminder ('0' = that day); by: who asked for it
  addAttributes() { return { date: { default: '' }, end: { default: null }, remind: { default: null }, by: { default: null } }; },
  parseHTML() { return [
    { tag: 'span[data-type="date"]', priority: 80, getAttrs: el => okDate(el.getAttribute('data-date')) ? { date: el.getAttribute('data-date'), end: okDate(el.getAttribute('data-end')) ? el.getAttribute('data-end') : null,
      remind: /^(0|1|2|7)$/.test(el.getAttribute('data-remind') || '') ? el.getAttribute('data-remind') : null, by: /^[\w.-]{1,40}$/.test(el.getAttribute('data-by') || '') ? el.getAttribute('data-by') : null } : false },
    { tag: 'span.datechip', priority: 70, getAttrs: el => { const m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(el.textContent || ''); return m ? { date: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` } : false; } }]; },
  renderHTML({ node }) { const a = node.attrs; return ['span', { class: 'datechip', 'data-type': 'date', 'data-date': a.date, ...(a.end ? { 'data-end': a.end } : {}), ...(a.remind != null && a.remind !== '' ? { 'data-remind': String(a.remind), ...(a.by ? { 'data-by': a.by } : {}) } : {}) }, dateText(a)]; },
  renderText({ node }) { return dateText(node.attrs); },
});
const Mention = Node.create({
  name: 'mention', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() { return { id: { default: null }, label: { default: '' } }; },
  parseHTML() { return [{ tag: 'span.mention', priority: 80, getAttrs: el => { const label = (el.textContent || '').replace(/^@/, '').trim(); return { id: el.getAttribute('data-id') || ctx.userIdByName(label) || null, label }; } }]; },
  renderHTML({ node }) { const a = node.attrs; return ['span', { class: 'mention', 'data-type': 'mention', ...(a.id ? { 'data-id': a.id } : {}) }, '@' + (a.id ? ctx.userName(a.id, a.label) : a.label)]; },
  renderText({ node }) { return '@' + (node.attrs.id ? ctx.userName(node.attrs.id, node.attrs.label) : node.attrs.label); },
});
const PageLink = Node.create({
  name: 'pageLink', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() { return { item: { default: '' }, label: { default: '' } }; },
  parseHTML() { return [{ tag: 'a[data-type="pageLink"]', priority: 90, getAttrs: el => el.getAttribute('data-item') ? { item: el.getAttribute('data-item'), label: (el.textContent || '').trim() } : false }]; },
  renderHTML({ node }) { const a = node.attrs; return ['a', { class: 'pagelink', 'data-type': 'pageLink', 'data-item': a.item }, ctx.pageTitle(a.item, a.label) || '제목 없음']; },
  renderText({ node }) { return ctx.pageTitle(node.attrs.item, node.attrs.label) || ''; },
});

/* ---------- shared attributes and typing rules ---------- */
const Extras = Extension.create({
  name: 'aidcExtras',
  addGlobalAttributes() { return [
    { types: BLOCK_COLOR_TYPES, attributes: { blockColor: { default: null, parseHTML: el => { const v = el.getAttribute('data-bc'); return okBlockColor(v) ? v : null; }, renderHTML: a => a.blockColor ? { 'data-bc': a.blockColor } : {} } } },
    { types: ['tableCell', 'tableHeader'], attributes: { bg: { default: null, parseHTML: el => { const v = el.getAttribute('data-bg'); if (COLORS.includes(v)) return v; return (el.style && el.style.backgroundColor && colorToken(el.style.backgroundColor, true)) || null; }, renderHTML: a => a.bg ? { 'data-bg': a.bg } : {} } } }]; },
  addInputRules() { return [
    // Notion: "> " starts a toggle (a quote is the double-quote key)
    new InputRule({ find: /^>\s$/, handler: ({ range, chain, state }) => { if (state.doc.resolve(range.from).parent.type.name !== 'paragraph') return null; chain().deleteRange(range).setDetails().updateAttributes('details', { open: true }).run(); } })]; },
});
const Quote = Blockquote.extend({ addInputRules() { return [wrappingInputRule({ find: /^\s*["“”]\s$/, type: this.type })]; } });
const Toggle = Details.extend({
  // The stock toggle button rewrites the node with only {open}, which drops the block id, the heading level and the colour.
  // Here the click changes that one attribute (not an undo step: folding is not an edit), and the wrapper follows attribute changes.
  addNodeView() { const make = this.parent(); return props => { const view = make(props); const dom = view.dom; const btn = dom.querySelector(':scope > button');
    const sync = n => { [['data-level', n.attrs.level], ['data-bc', n.attrs.blockColor], ['data-id', n.attrs.id]].forEach(([k, v]) => { if (v) dom.setAttribute(k, String(v)); else dom.removeAttribute(k); }); };
    dom.addEventListener('click', e => { if (!btn || !(e.target === btn || btn.contains(e.target))) return; e.stopPropagation(); e.preventDefault(); const { editor, getPos } = props; if (!editor.isEditable) return;
      const pos = typeof getPos === 'function' ? getPos() : null; const n = typeof pos === 'number' ? editor.state.doc.nodeAt(pos) : null; if (!n || n.type.name !== 'details') return;
      editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'open', !n.attrs.open).setMeta('addToHistory', false)); }, true);
    const update = view.update; view.update = n => { const ok = update(n); if (ok) sync(n); return ok; }; sync(props.node); return view; }; },
  addAttributes() { const base = this.parent ? this.parent() : {}; return { ...(Array.isArray(base) ? {} : base), level: { default: null, parseHTML: el => { const v = +el.getAttribute('data-level'); return v >= 1 && v <= 3 ? v : null; }, renderHTML: a => a.level ? { 'data-level': String(a.level) } : {} } }; },
});

export function buildExtensions(opts = {}) {
  const nv = opts.nodeViews || {}; const V = (ext, f) => f ? ext.extend({ addNodeView() { return f; } }) : ext;
  return [
    StarterKit.configure({
      blockquote: false, heading: { levels: [1, 2, 3] },
      codeBlock: false,
      dropcursor: { color: '#2383e2', width: 3 },
      link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: 'https', protocols: ['http', 'https', 'mailto', 'tel'], HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        isAllowedUri: (url, c) => !!safeHref(url) && c.defaultValidate(url) },
    }),
    Quote, TaskList, TaskItem.configure({ nested: true, a11y: { checkboxLabel: (node, checked) => `할 일${checked ? ' (완료)' : ''}: ${node.textContent || '빈 항목'}` } }),
    TableKit.configure({ table: { resizable: true, renderWrapper: true, cellMinWidth: 60, lastColumnResizable: true, allowTableNodeSelection: true } }),
    Toggle.configure({ persist: true, HTMLAttributes: { class: 'nb-toggle' }, renderToggleButton: ({ element, isOpen }) => { element.setAttribute('aria-label', isOpen ? '접기' : '펼치기'); element.setAttribute('aria-expanded', String(!!isOpen)); element.className = 'nb-toggle-btn'; } }),
    DetailsSummary, DetailsContent,
    Code.configure(codeOptions), MathInline, MathBlock, V(Button, nv.button), V(Synced, nv.synced), V(ItemList, nv.itemList),
    Callout, V(Image, nv.image), FileCard, Bookmark, Embed, Columns, Column, V(Toc, nv.toc), V(Raw, nv.raw), DateChip, Mention, PageLink, TextColor, BgColor, Extras,
    UniqueID.configure({ attributeName: 'id', types: ID_TYPES, generateID: () => newId() }),
    Placeholder.configure({ showOnlyCurrent: true, includeChildren: true, placeholder: ({ node }) => node.type.name === 'heading' ? '제목 ' + node.attrs.level : node.type.name === 'detailsSummary' ? '토글' : node.type.name === 'codeBlock' ? '' : "글을 입력하거나 '/'로 블록을 추가하세요" }),
    ...(opts.extra || []),
  ];
}
