import { Extension } from '@tiptap/core';
import { closeHistory } from './hist.js';

const types = ['paragraph', 'heading', 'listItem', 'taskItem'];
const excluded = ['table', 'codeBlock'];
export const indentLevel = value => Math.max(0, Math.min(20, Math.trunc(Number(value) || 0)));

export function indentBlocks(editor, delta, range) {
  const { state, view } = editor;
  // The block handle's selection can cover more blocks than the text caret.
  range ||= state.plugins.find(p => p.key.startsWith('nbRange$'))?.getState(state) || state.selection;
  if (range === state.selection) {
    for (let d = state.selection.$from.depth; d > 0; d--)
      if (excluded.includes(state.selection.$from.node(d).type.name)) return false;
  }
  const selected = [];
  state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (excluded.includes(node.type.name)) return false;
    if (!types.includes(node.type.name)) return;
    // Ending at the start of the next paragraph does not select that paragraph.
    if (range.from !== range.to && pos + 1 >= range.to) return false;
    selected.push({ node, pos });
    return false;
  });
  if (!selected.length) return false;
  const tr = closeHistory(state.tr);
  for (const { node, pos } of selected) {
    const indent = indentLevel(indentLevel(node.attrs.indent) + delta);
    if (indent !== node.attrs.indent) tr.setNodeAttribute(pos, 'indent', indent);
  }
  if (tr.docChanged) {
    view.dispatch(tr.scrollIntoView());
    // Typing immediately after Tab must be a separate undo step as well.
    view.dispatch(closeHistory(editor.state.tr));
  }
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
