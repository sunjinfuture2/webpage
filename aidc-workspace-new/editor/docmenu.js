// The "⋯" menu of a document: things that concern the whole body rather than one block.
// The app opens it from the item header and may add entries of its own (extra).
import { el, openMenu } from './ui.js';
import { ctx } from './host.js';
import { exportDoc, importFile } from './io.js';
import { openFind } from './find.js';

export function docMenu(o) {
  const inst = o.inst || null; const html = () => (inst ? inst.getHTML() : o.html || '');
  const text = (new DOMParser().parseFromString('<body>' + html(), 'text/html').body.textContent || '');
  const exp = fmt => () => { Promise.resolve().then(() => exportDoc(html(), o.title || '', fmt)).catch(() => ctx.toast('내보내지 못했습니다.')); };
  const items = [
    inst ? { label: '찾기 · 바꾸기', icon: '⌕', kbd: 'Ctrl+F', run: () => openFind(inst, false) } : { label: '찾기', icon: '⌕', hint: '읽는 중에는 브라우저의 Ctrl+F', disabled: true },
    { label: '내보내기', icon: '⇩', children: [{ label: 'Markdown (.md)', icon: 'M↓', run: exp('md') }, { label: 'HTML 파일 (.html)', icon: '&lt;&gt;', run: exp('html') }, { label: '인쇄 · PDF로 저장', icon: '⎙', run: exp('print') }] },
    inst ? { label: '가져오기', icon: '⇧', hint: 'Markdown · 텍스트 · HTML · CSV 파일', run: () => importFile(inst) } : { label: '가져오기', icon: '⇧', hint: '수정을 누른 뒤 사용', disabled: true },
    ...(o.extra || []),
    { sep: true }, { custom: el('div', { class: 'nb-note', text: `글자 수 ${text.length.toLocaleString()} · 공백 제외 ${text.replace(/\s/g, '').length.toLocaleString()}` }) }];
  return openMenu(items, { rect: o.rect, cls: 'nb-docmenu', takeFocus: true, onClose: () => { if (inst && !inst.destroyed && o.refocus !== false) inst.editor.view.focus(); } });
}
