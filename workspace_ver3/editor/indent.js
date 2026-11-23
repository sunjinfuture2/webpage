import { Extension } from '@tiptap/core';
import { closeHistory } from './hist.js';

const types = ['paragraph', 'heading', 'listItem', 'taskItem'];
export const indentLevel = value => Math.max(0, Math.min(20, Math.trunc(Number(value) || 0)));

// List items move as a unit; their paragraphs and nested lists must not move twice.
export function indentBlocks(editor, delta, range = editor.state.selection) {
  const { state, view } = editor;
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if (['table', 'codeBlock'].includes($from.node(d).type.name)) return false;
  }
  const selected = [];
  state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (['table', 'codeBlock'].includes(node.type.name)) return false;
    if (!types.includes(node.type.name)) return;
    if (pos + 1 >= range.to && range.from !== range.to) return false;
    selected.push({ node, pos });
    return false;
  });
  if (!selected.length) return false;
  const tr = closeHistory(state.tr);
  for (const { node, pos } of selected) {
    const indent = indentLevel(indentLevel(node.attrs.indent) + delta);
    if (indent !== node.attrs.indent) tr.setNodeAttribute(pos, 'indent', indent);
  }
  if (tr.docChanged) view.dispatch(tr.scrollIntoView());
  return true;
}

export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',
  priority: 1100,
  addGlobalAttributes() { return [{ types, attributes: { indent: {
    default: 0,
    parseHTML: element => indentLevel(element.getAttribute('data-indent')),
    renderHTML: attrs => attrs.indent ? { 'data-indent': String(indentLevel(attrs.indent)), style: `margin-left:${indentLevel(attrs.indent) * 24}px` } : {},
  } } }]; },
  addKeyboardShortcuts() { return {
    Tab: () => indentBlocks(this.editor, 1),
    'Shift-Tab': () => indentBlocks(this.editor, -1),
  }; },
});
