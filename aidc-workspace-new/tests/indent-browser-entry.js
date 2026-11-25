import { create } from '../editor/editor.js';
import { TextSelection } from '@tiptap/pm/state';
window.make = html => {
  window.inst?.destroy();
  window.inst = create(document.querySelector('#host'), {html});
};
window.select = (from, to=from) => {
  const ed=window.inst.editor;
  ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc,from,to)));
  ed.view.focus();
};
window.inspect = () => ({json:inst.getJSON(),html:inst.getHTML(),selection:inst.selectionJSON()});
