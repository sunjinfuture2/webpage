// Block level commands. Menus, shortcuts and drag and drop all call these; every change is one transaction (one undo step).
import { Fragment, Slice } from '@tiptap/pm/model';
import { NodeSelection, TextSelection, Selection } from '@tiptap/pm/state';
import { dropPoint } from '@tiptap/pm/transform';
import { closeHistory } from './hist.js';

// every block command is its own undo step, however quickly commands follow each other
const send = (view, tr) => view.dispatch(closeHistory(tr));

const SKIP = new Set(['tableRow', 'tableCell', 'tableHeader', 'detailsSummary', 'detailsContent', 'column', 'bulletList', 'orderedList', 'taskList']);
const isItem = n => n && (n.type.name === 'listItem' || n.type.name === 'taskItem');
const ownsFirstLine = n => n && (isItem(n) || n.type.name === 'blockquote' || n.type.name === 'callout');
const isList = n => n && /List$/.test(n.type.name);

// The block a handle / menu acts on at a position: the list item (not its paragraph), the whole table (not a cell), the toggle (not its title).
export function blockAt(doc, pos, inside) {
  if (inside != null && inside >= 0) { const n = doc.nodeAt(inside); if (n && n.isBlock && n.isAtom) { const $i = doc.resolve(inside); for (let d = 1; d <= $i.depth; d++) if ($i.node(d).type.name === 'table') return { pos: $i.before(d), node: $i.node(d) }; return { pos: inside, node: n }; } }
  const $p = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (let d = 1; d <= $p.depth; d++) if ($p.node(d).type.name === 'table') return { pos: $p.before(d), node: $p.node(d) };
  for (let d = $p.depth; d >= 1; d--) { const node = $p.node(d), parent = $p.node(d - 1);
    if (SKIP.has(node.type.name)) continue;
    if (node.type.name === 'paragraph' && ownsFirstLine(parent) && $p.index(d - 1) === 0) continue;
    return { pos: $p.before(d), node }; }
  const after = $p.nodeAfter, before = $p.nodeBefore; // between blocks at the top level
  if (after && after.isBlock && !SKIP.has(after.type.name)) return { pos: $p.pos, node: after };
  if (before && before.isBlock && !SKIP.has(before.type.name)) return { pos: $p.pos - before.nodeSize, node: before };
  return null;
}
export const blockOfSelection = state => { const s = state.selection; if (s instanceof NodeSelection && s.node.isBlock) return blockAt(state.doc, s.from, s.from); return blockAt(state.doc, s.from); };
export function findById(doc, id) { let hit = null; if (!id) return null; doc.descendants((n, pos) => { if (hit) return false; if (n.attrs && n.attrs.id === id) { hit = { pos, node: n }; return false; } }); return hit; }
// sibling blocks of one parent covered by [from, to]
export function blocksIn(doc, from, to) { const out = []; const $f = doc.resolve(from); const parent = $f.parent; let pos = $f.start(); parent.forEach((n, off) => { const p = pos + off; if (p >= from && p + n.nodeSize <= to) out.push({ pos: p, node: n }); }); return out; }
// the editor selection that goes with a block range: the node itself for one block, the text of all of them otherwise
export function selFor(doc, r) { const bs = blocksIn(doc, r.from, r.to); if (bs.length === 1 && NodeSelection.isSelectable(bs[0].node)) return NodeSelection.create(doc, bs[0].pos);
  return TextSelection.between(doc.resolve(Math.min(r.from + 1, doc.content.size)), doc.resolve(Math.max(r.to - 1, 0))); }
const stripIds = frag => { const out = []; frag.forEach(n => out.push(n.isText ? n : n.type.create({ ...n.attrs, ...('id' in n.attrs ? { id: null } : {}) }, stripIds(n.content), n.marks))); return Fragment.fromArray(out); };

/* ----- turning one block into another kind ----- */
const TEXTY = new Set(['paragraph', 'heading', 'codeBlock', 'listItem', 'taskItem', 'blockquote', 'callout', 'details']);
export const canTurn = node => TEXTY.has(node.type.name);
function partsOf(node, schema) {
  const kids = []; node.forEach(c => kids.push(c));
  switch (node.type.name) {
    case 'paragraph': case 'heading': return { inline: node.content, rest: [] };
    case 'codeBlock': return { inline: node.textContent ? Fragment.from(schema.text(node.textContent)) : Fragment.empty, rest: [], code: true };
    case 'details': { const body = []; node.child(1).forEach(c => body.push(c)); const lone = body.length === 1 && body[0].type.name === 'paragraph' && !body[0].content.size; return { inline: node.child(0).content, rest: lone ? [] : body }; }
    default: return kids.length && kids[0].isTextblock && !kids[0].type.spec.code ? { inline: kids[0].content, rest: kids.slice(1) } : { inline: Fragment.empty, rest: kids };
  }
}
const textOnly = (inline, schema, keepMarks) => { const out = []; inline.forEach(n => { const t = n.isText ? n.text : (n.type.spec.leafText ? n.type.spec.leafText(n) : (n.type.name === 'hardBreak' ? ' ' : n.textContent || '')); if (t) out.push(schema.text(t, keepMarks && n.isText ? n.marks : null)); }); return Fragment.fromArray(out); };
function buildAs(target, p, schema, src) {
  const N = schema.nodes; const keep = { id: src.attrs.id || null }; const bc = src.attrs.blockColor || null;
  const A = (type, extra) => ({ ...(type.spec.attrs && 'id' in type.spec.attrs ? keep : {}), ...(bc && type.spec.attrs && 'blockColor' in type.spec.attrs ? { blockColor: bc } : {}), ...(extra || {}) });
  const inline = p.code ? p.inline : p.inline; const para = () => N.paragraph.create(null, inline);
  const m = /^(toggle|h)([123])$/.exec(target);
  if (target === 'paragraph') return [N.paragraph.create(A(N.paragraph), inline), ...p.rest];
  if (m && m[1] === 'h') return [N.heading.create(A(N.heading, { level: +m[2] }), inline), ...p.rest];
  if (target === 'bullet') return [N.bulletList.create(null, N.listItem.create(A(N.listItem), [para(), ...p.rest]))];
  if (target === 'ordered') return [N.orderedList.create(null, N.listItem.create(A(N.listItem), [para(), ...p.rest]))];
  if (target === 'todo') return [N.taskList.create(null, N.taskItem.create(A(N.taskItem, { checked: src.type.name === 'taskItem' ? !!src.attrs.checked : false }), [para(), ...p.rest]))];
  if (target === 'quote') return [N.blockquote.create(A(N.blockquote), [para(), ...p.rest])];
  if (target === 'callout') return [N.callout.create(A(N.callout), [para(), ...p.rest])];
  if (target === 'toggle' || m) return [N.details.create(A(N.details, { open: true, level: m ? +m[2] : null }), [N.detailsSummary.create(null, textOnly(inline, schema, true)), N.detailsContent.create(null, p.rest.length ? p.rest : [N.paragraph.create()])])];
  if (target === 'code') { const t = textOnly(inline, schema, false); return [N.codeBlock.create(A(N.codeBlock), t.size ? schema.text(t.textBetween(0, t.size)) : null), ...p.rest]; }
  return null;
}
const joinListsAt = (tr, pos) => { if (pos <= 0 || pos >= tr.doc.content.size) return; const $p = tr.doc.resolve(pos); const a = $p.nodeBefore, b = $p.nodeAfter; if (a && b && a.type === b.type && isList(a)) { try { tr.join(pos); } catch {} } };
export const kindOf = node => { const n = node.type.name; return n === 'heading' ? 'h' + node.attrs.level : n === 'listItem' ? null : n === 'taskItem' ? 'todo' : n === 'blockquote' ? 'quote' : n === 'codeBlock' ? 'code' : n === 'details' ? (node.attrs.level ? 'toggle' + node.attrs.level : 'toggle') : n; };
// what the block is called in menus ("bullet" / "ordered" need the parent list)
export function kindAt(doc, pos) { const node = doc.nodeAt(pos); if (!node) return null; if (node.type.name === 'listItem') { const parent = doc.resolve(pos).parent; return parent.type.name === 'orderedList' ? 'ordered' : 'bullet'; } return kindOf(node); }

function turnOne(tr, pos, target) {
  const doc = tr.doc, schema = doc.type.schema, node = doc.nodeAt(pos); if (!node || !canTurn(node) || kindAt(doc, pos) === target) return false;
  const built = buildAs(target, partsOf(node, schema), schema, node); if (!built) return false;
  let from = pos, to = pos + node.nodeSize, nodes = built;
  if (isItem(node)) { // a list item can only leave its list by splitting the list around it
    const $p = doc.resolve(pos), list = $p.parent, idx = $p.index(); from = $p.before(); to = $p.after(); const before = [], after = []; list.forEach((c, _o, i) => { if (i < idx) before.push(c); else if (i > idx) after.push(c); });
    nodes = [...(before.length ? [list.copy(Fragment.fromArray(before))] : []), ...built, ...(after.length ? [list.type.create({ ...list.attrs, id: null }, Fragment.fromArray(after))] : [])];
    const first = from + (before.length ? nodes[0].nodeSize : 0);
    tr.replaceWith(from, to, nodes); const end = tr.mapping.map(to);
    tr.setSelection(endOfFirstText(tr.doc, first)); joinListsAt(tr, first + built[0].nodeSize); joinListsAt(tr, first); void end; return true; }
  tr.replaceWith(from, to, nodes); tr.setSelection(endOfFirstText(tr.doc, from)); joinListsAt(tr, from + built[0].nodeSize); joinListsAt(tr, from); return true;
}
function endOfFirstText(doc, pos) { const s = Selection.findFrom(doc.resolve(Math.min(pos + 1, doc.content.size)), 1, true) || Selection.atStart(doc); return TextSelection.create(doc, s.$from.end()); }

export function turnInto(editor, range, target) { // range: {from, to} of sibling blocks
  const { state, view } = editor; const ids = blocksIn(state.doc, range.from, range.to).filter(b => canTurn(b.node)).map(b => b.node.attrs.id).filter(Boolean);
  const tr = state.tr; let n = 0;
  if (ids.length) ids.forEach(id => { const hit = findById(tr.doc, id); if (hit && turnOne(tr, hit.pos, target)) n++; });
  else { const b = state.doc.nodeAt(range.from); if (b && turnOne(tr, range.from, target)) n++; }
  if (!n) return false; send(view, tr.scrollIntoView()); view.focus(); return true;
}

/* ----- duplicate / delete / move / colour ----- */
export function duplicateBlocks(editor, range) { const { state, view } = editor; const slice = state.doc.slice(range.from, range.to); const tr = state.tr.insert(range.to, stripIds(slice.content));
  const size = range.to - range.from; const out = { from: range.to, to: range.to + size }; tr.setSelection(selFor(tr.doc, out)); send(view, tr.setMeta('nbRange', out).scrollIntoView()); return out; }
export function deleteBlocks(editor, range) { const { state, view } = editor; const tr = state.tr.deleteRange(range.from, range.to); normalizeColumns(tr);
  const at = Math.min(tr.mapping.map(range.from), tr.doc.content.size); tr.setSelection(Selection.near(tr.doc.resolve(at), -1)); send(view, tr.scrollIntoView()); view.focus(); return true; }
export function moveBlocks(editor, range, dir) {
  const { state, view } = editor; const $f = state.doc.resolve(range.from), $t = state.doc.resolve(range.to); const parent = $f.parent; const i0 = $f.index(), i1 = $t.index();
  const tr = state.tr; const slice = state.doc.slice(range.from, range.to); let at;
  if (dir < 0) { if (i0 === 0) return null; at = range.from - parent.child(i0 - 1).nodeSize; tr.delete(range.from, range.to).insert(at, slice.content); }
  else { if (i1 >= parent.childCount) return null; const next = parent.child(i1); tr.delete(range.from, range.to); at = range.from + next.nodeSize; tr.insert(at, slice.content); }
  const out = { from: at, to: at + (range.to - range.from) }; tr.setSelection(selFor(tr.doc, out)); send(view, tr.setMeta('nbRange', out).scrollIntoView()); return out;
}
export function colorBlocks(editor, range, value) { const { state, view } = editor; const tr = state.tr; let n = 0;
  blocksIn(state.doc, range.from, range.to).forEach(b => { if (b.node.type.name === 'callout') { const c = value && value.replace(/_bg$/, ''); tr.setNodeAttribute(b.pos, 'color', c || 'gray'); n++; } else if (b.node.type.spec.attrs && 'blockColor' in b.node.type.spec.attrs) { tr.setNodeAttribute(b.pos, 'blockColor', value || null); n++; } });
  if (n) send(view, tr.setMeta('nbRange', range)); return n > 0; }

/* ----- moving blocks by drag and drop ----- */
// Children of a list may only live in a list: wrap them when they are dropped somewhere else.
function fitFor(doc, pos, content, sourceList) { const first = content.firstChild; if (!first || !isItem(first)) return content; const $p = doc.resolve(pos);
  if (isList($p.parent) && $p.parent.type.contentMatch.matchType(first.type)) return content;
  const type = sourceList && sourceList.type.contentMatch.matchType(first.type) ? sourceList.type : (first.type.name === 'taskItem' ? doc.type.schema.nodes.taskList : doc.type.schema.nodes.bulletList);
  return Fragment.from(type.create(null, content)); }
export function dropPosFor(doc, pos, slice) { const p = dropPoint(doc, pos, slice); return p == null ? null : p; }
export function moveRangeTo(editor, range, coordsPos, copy) {
  const { state, view } = editor; const doc = state.doc; const sourceList = doc.resolve(range.from).parent; const raw = doc.slice(range.from, range.to);
  let pos = dropPoint(doc, coordsPos, raw); let content = raw.content;
  if (pos == null) { const wrapped = fitFor(doc, coordsPos, content, sourceList); if (wrapped !== content) { content = wrapped; pos = dropPoint(doc, coordsPos, new Slice(content, 0, 0)); } }
  if (pos == null) return false; if (!copy && pos >= range.from && pos <= range.to) return false;
  content = fitFor(doc, pos, content, sourceList); if (copy) content = stripIds(content);
  const tr = state.tr; if (!copy) tr.deleteRange(range.from, range.to);
  const at = tr.mapping.map(pos, -1); try { tr.insert(at, content); } catch { return false; }
  normalizeColumns(tr); const size = content.size; const a = Math.min(at, tr.doc.content.size);
  const out = { from: a, to: Math.min(a + size, tr.doc.content.size) }; let ok = blocksIn(tr.doc, out.from, out.to).length > 0; if (ok) { try { tr.setSelection(selFor(tr.doc, out)); } catch { ok = false; } } send(view, (ok ? tr.setMeta('nbRange', out) : tr).setMeta('uiEvent', 'drop')); return true;
}
// Dropping a block on the right edge of another one puts the two side by side.
export function moveIntoColumn(editor, range, targetPos, copy) {
  const { state, view } = editor; const doc = state.doc, N = doc.type.schema.nodes; const target = doc.nodeAt(targetPos); if (!target) return false;
  if (targetPos >= range.from && targetPos < range.to) return false;
  let content = fitFor(doc, 0, doc.slice(range.from, range.to).content, doc.resolve(range.from).parent); if (copy) content = stripIds(content);
  const tr = state.tr; let col; try { col = N.column.create(null, content); } catch { return false; }
  if (target.type.name === 'columns') { if (target.childCount >= 5) return false; tr.insert(targetPos + target.nodeSize - 1, col); }
  else { if (doc.resolve(targetPos).depth !== 0) return false; tr.replaceWith(targetPos, targetPos + target.nodeSize, N.columns.create(null, [N.column.create(null, target), col])); }
  if (!copy) { const f = tr.mapping.map(range.from, 1), t = tr.mapping.map(range.to, -1); if (t > f) tr.deleteRange(f, t); }
  normalizeColumns(tr); send(view, tr.setMeta('uiEvent', 'drop')); return true;
}
// After a move: a column left with nothing but an empty paragraph goes away; a single remaining column becomes plain blocks again.
export function normalizeColumns(tr) {
  for (let guard = 0; guard < 20; guard++) { let hit = null;
    tr.doc.descendants((n, pos) => { if (hit) return false; if (n.type.name !== 'columns') return true; const keep = []; n.forEach(c => { const lone = c.childCount === 1 && c.firstChild.type.name === 'paragraph' && !c.firstChild.content.size; if (!lone) keep.push(c); });
      if (keep.length === n.childCount) return true; hit = { pos, node: n, keep }; return false; });
    if (!hit) return; const { pos, node, keep } = hit; let nodes;
    if (keep.length >= 2) nodes = [node.copy(Fragment.fromArray(keep))]; else if (keep.length === 1) { nodes = []; keep[0].forEach(c => nodes.push(c)); } else nodes = [tr.doc.type.schema.nodes.paragraph.create()];
    tr.replaceWith(pos, pos + node.nodeSize, nodes); }
}
export function unwrapColumns(editor, pos) { const { state, view } = editor; const node = state.doc.nodeAt(pos); if (!node || node.type.name !== 'columns') return false; const nodes = []; node.forEach(c => c.forEach(b => nodes.push(b))); send(view, state.tr.replaceWith(pos, pos + node.nodeSize, nodes)); return true; }

/* ----- inserting a new block from the slash menu / + button ----- */
// json: a node (or list of nodes). An empty paragraph under the caret is replaced; otherwise the block goes right below the current one.
export function insertBlock(editor, json, opt = {}) {
  const { state } = editor; const { $from } = state.selection; const tb = $from.parent; let nodes;
  try { nodes = (Array.isArray(json) ? json : [json]).map(j => state.schema.nodeFromJSON(j)); } catch { return false; }
  const depth = $from.depth; const tr = state.tr; let at;
  if (depth >= 1 && tb.isTextblock) { const container = $from.node(depth - 1), idx = $from.index(depth - 1); const empty = tb.type.name === 'paragraph' && tb.content.size === 0;
    if (empty && container.canReplaceWith(idx, idx + 1, nodes[0].type) && !(isItem(container) && idx === 0)) { at = $from.before(depth); tr.replaceWith(at, $from.after(depth), nodes); }
    else { at = $from.after(depth); if (!container.canReplaceWith(idx + 1, idx + 1, nodes[0].type)) { const p = dropPoint(state.doc, at, new Slice(Fragment.fromArray(nodes), 0, 0)); if (p == null) return false; at = p; } tr.insert(at, nodes); } }
  else { const s = state.selection; at = s.to; tr.insert(at, nodes); }
  const first = nodes[0]; const last = at + nodes.reduce((a, n) => a + n.nodeSize, 0);
  if (opt.select === 'node') tr.setSelection(NodeSelection.create(tr.doc, at));
  else if (first.isAtom || opt.select === 'after') { const s = Selection.findFrom(tr.doc.resolve(Math.min(last, tr.doc.content.size)), 1, true); if (s) tr.setSelection(s); else { tr.insert(last, state.schema.nodes.paragraph.create()); tr.setSelection(TextSelection.create(tr.doc, last + 1)); } }
  else { const s = Selection.findFrom(tr.doc.resolve(at + 1), 1, true); if (s) tr.setSelection(s); }
  send(editor.view, tr.scrollIntoView()); editor.view.focus(); return at;
}
