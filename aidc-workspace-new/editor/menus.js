// What the menus offer. Each entry ends in a command from commands.js or a Tiptap command, never in direct DOM edits.
import { createTable } from '@tiptap/extension-table';
import { TableMap, moveTableRow, moveTableColumn, selectedRect, CellSelection } from '@tiptap/pm/tables';
import { closeHistory } from '@tiptap/pm/history';
import { ctx, COLORS, COLOR_NAMES, embedUrl, safeHref } from './host.js';
import { swatch } from './ui.js';
import { turnInto, insertBlock, blockOfSelection, duplicateBlocks, deleteBlocks } from './commands.js';

export const TURN = [
  { k: 'paragraph', label: '텍스트', icon: 'T' }, { k: 'h1', label: '제목 1', icon: 'H1' }, { k: 'h2', label: '제목 2', icon: 'H2' }, { k: 'h3', label: '제목 3', icon: 'H3' },
  { k: 'bullet', label: '글머리 기호 목록', icon: '•' }, { k: 'ordered', label: '번호 매기기 목록', icon: '1.' }, { k: 'todo', label: '할 일 목록', icon: '☐' }, { k: 'toggle', label: '토글 목록', icon: '▸' },
  { k: 'quote', label: '인용', icon: '❝' }, { k: 'callout', label: '콜아웃', icon: '💡' }, { k: 'code', label: '코드', icon: '&lt;/&gt;' },
  { k: 'toggle1', label: '토글 제목 1', icon: '▸H1' }, { k: 'toggle2', label: '토글 제목 2', icon: '▸H2' }, { k: 'toggle3', label: '토글 제목 3', icon: '▸H3' }];
const P = { type: 'paragraph' }; const item = t => ({ type: t, content: [P] });
const EMPTY = { paragraph: P, h1: { type: 'heading', attrs: { level: 1 } }, h2: { type: 'heading', attrs: { level: 2 } }, h3: { type: 'heading', attrs: { level: 3 } },
  bullet: { type: 'bulletList', content: [item('listItem')] }, ordered: { type: 'orderedList', content: [item('listItem')] }, todo: { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [P] }] },
  quote: { type: 'blockquote', content: [P] }, callout: { type: 'callout', content: [P] }, code: { type: 'codeBlock' } };
const toggleJson = level => ({ type: 'details', attrs: { open: true, level: level || null }, content: [{ type: 'detailsSummary' }, { type: 'detailsContent', content: [P] }] });
['toggle', 'toggle1', 'toggle2', 'toggle3'].forEach((k, i) => { EMPTY[k] = toggleJson(i || null); });

// An empty line becomes the chosen block; a line with text keeps its text and gets the new block below it.
export function applyKind(editor, kind) {
  const { state } = editor; const { $from } = state.selection; const b = blockOfSelection(state); if (!b) return false;
  const emptyLine = $from.parent.isTextblock && $from.parent.content.size === 0;
  if (emptyLine && b.node.type.name !== 'table') return turnInto(editor, { from: b.pos, to: b.pos + b.node.nodeSize }, kind) || insertBlock(editor, EMPTY[kind]) !== false;
  return insertBlock(editor, EMPTY[kind]) !== false;
}
export const tableJson = (schema, rows = 3, cols = 3) => createTable(schema, rows, cols, true).toJSON();
export const columnsJson = n => ({ type: 'columns', content: Array.from({ length: n }, () => ({ type: 'column', content: [P] })) });

export function slashItems(inst) {
  const ed = inst.editor; const T = (k, hint, al) => { const t = TURN.find(x => x.k === k); return { k, label: t.label, hint, icon: t.icon, al, run: () => applyKind(ed, k) }; };
  return [
    { header: '기본 블록' },
    T('paragraph', '일반 문단', 'text paragraph plain 문단 본문 텍스트'), T('h1', '큰 제목', 'heading1 h1 title 제목1 #'), T('h2', '중간 제목', 'heading2 h2 제목2 ##'), T('h3', '작은 제목', 'heading3 h3 제목3 ###'),
    T('bullet', '• 항목', 'bullet list ul unordered 목록 불릿 글머리'), T('ordered', '1. 항목', 'numbered ordered list ol 번호 목록 숫자'), T('todo', '체크박스 항목', 'todo task check checkbox 체크 할일 할 일 체크박스'),
    T('toggle', '접고 펼치는 항목', 'toggle fold collapse 접기 펼치기 토글'), T('quote', '인용문', 'quote blockquote 인용'), T('callout', '강조 상자', 'callout note info 강조 박스 콜아웃 알림'),
    { k: 'hr', label: '구분선', hint: '가로선', icon: '—', al: 'divider hr line rule 구분선 줄 가로선', run: () => insertBlock(ed, { type: 'horizontalRule' }, { select: 'after' }) },
    T('code', '코드 블록', 'code snippet pre 코드'),
    { k: 'table', label: '표', hint: '3×3 표', icon: '▦', al: 'table grid 표 테이블', run: () => insertBlock(ed, tableJson(ed.schema)) },
    { header: '미디어' },
    { k: 'image', label: '이미지', hint: '이미지 파일 업로드', icon: '▣', al: 'image picture photo img 이미지 사진 그림', run: () => inst.pickFiles('image/*') },
    { k: 'file', label: '파일', hint: '파일 첨부', icon: '⎘', al: 'file attach upload pdf 파일 첨부 업로드', run: () => inst.pickFiles('') },
    { k: 'bookmark', label: '링크/북마크', hint: '주소를 카드로', icon: '↗', al: 'link bookmark url web 링크 북마크 주소', run: () => inst.askUrl('bookmark') },
    { k: 'embed', label: '임베드', hint: 'YouTube · Vimeo · 지도 · Figma', icon: '⧉', al: 'embed iframe youtube vimeo map figma video 임베드 영상 유튜브 지도 동영상', run: () => inst.askUrl('embed') },
    { k: 'video', label: '동영상', hint: '동영상 파일 업로드', icon: '▶', al: 'video movie mp4 동영상 영상 비디오', run: () => inst.pickFiles('video/*') },
    { k: 'audio', label: '오디오', hint: '오디오 파일 업로드', icon: '♪', al: 'audio sound mp3 오디오 음성 녹음', run: () => inst.pickFiles('audio/*') },
    { k: 'pdf', label: 'PDF', hint: 'PDF를 본문에서 바로 보기', icon: 'PDF', al: 'pdf document 문서 피디에프', run: () => inst.pickFiles('application/pdf', 'embed') },
    { header: '인라인' },
    { k: 'date', label: '날짜', hint: '오늘 날짜 · 눌러서 변경', icon: '◷', al: 'date today time 날짜 오늘 일정', run: () => ed.chain().focus().insertContent([{ type: 'date', attrs: { date: ctx.today() } }, { type: 'text', text: ' ' }]).run() },
    { k: 'mention', label: '멤버 멘션', hint: '@이름', icon: '@', al: 'mention member user person 멘션 멤버 사람 담당', run: () => ed.chain().focus().insertContent('@').run() },
    { k: 'page', label: '페이지 링크', hint: '다른 글로 연결', icon: '⤴', al: 'page link reference 페이지 문서 글 연결 링크', run: () => ed.chain().focus().insertContent('[[').run() },
    { header: '고급 블록' },
    T('toggle1', '접을 수 있는 큰 제목', 'toggle heading1 토글 제목1'), T('toggle2', '접을 수 있는 중간 제목', 'toggle heading2 토글 제목2'), T('toggle3', '접을 수 있는 작은 제목', 'toggle heading3 토글 제목3'),
    { k: 'col2', label: '2단', hint: '블록을 좌우 두 열로', icon: '▥', al: 'columns column 2 two 다단 2단 열 나란히', run: () => insertBlock(ed, columnsJson(2)) },
    { k: 'col3', label: '3단', hint: '블록을 세 열로', icon: '▥', al: 'columns column 3 three 다단 3단 열', run: () => insertBlock(ed, columnsJson(3)) },
    { k: 'toc', label: '목차', hint: '제목으로 만든 차례', icon: '☰', al: 'toc table of contents outline 목차 차례', run: () => insertBlock(ed, { type: 'toc' }, { select: 'after' }) },
    { header: '동작' },
    { k: 'duplicate', label: '복제', hint: '현재 블록을 아래에 복제', icon: '⧉', al: 'duplicate copy 복제 복사', run: () => { const b = blockOfSelection(ed.state); b && duplicateBlocks(ed, { from: b.pos, to: b.pos + b.node.nodeSize }); } },
    { k: 'delete', label: '삭제', hint: '현재 블록 삭제', icon: '✕', al: 'delete remove 삭제 지우기', danger: true, run: () => { const b = blockOfSelection(ed.state); b && deleteBlocks(ed, { from: b.pos, to: b.pos + b.node.nodeSize }); } },
  ];
}
export function filterSlash(items, q) {
  q = (q || '').toLowerCase().replace(/\s+/g, ''); if (!q) return items;
  const hit = items.filter(i => !i.header && ((i.label || '').toLowerCase().replace(/\s+/g, '').includes(q) || (i.al || '').toLowerCase().split(' ').some(a => a.startsWith(q)) || (i.k || '').startsWith(q)));
  const exact = x => (x.label || '').toLowerCase().replace(/\s+/g, '').startsWith(q) || (x.al || '').toLowerCase().split(' ').includes(q) ? 0 : 1;
  return hit.sort((a, b) => exact(a) - exact(b));
}

export const colorItems = (apply, cur) => [
  { header: '글자색' }, { label: '기본', icon: swatch('tx', ''), checked: !cur, run: () => apply(null) },
  ...COLORS.map(c => ({ label: COLOR_NAMES[c], icon: swatch('tx', c), checked: cur === c, run: () => apply(c) })),
  { header: '배경색' }, { label: '기본 배경', icon: swatch('bg', ''), run: () => apply(null) },
  ...COLORS.map(c => ({ label: COLOR_NAMES[c] + ' 배경', icon: swatch('bg', c), checked: cur === c + '_bg', run: () => apply(c + '_bg') }))];

/* ----- table ----- */
const inTable = state => { const { $from } = state.selection; for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === 'table') return { pos: $from.before(d), node: $from.node(d), depth: d }; return null; };
export { inTable };
export function tableItems(editor) {
  const c = () => editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; }); const can = editor.can(); const st = editor.state; const t = inTable(st); if (!t) return [];
  let rect = null; try { rect = selectedRect(st); } catch {}
  const mv = (cmd, from, to) => () => { cmd({ from, to })(editor.state, tr => editor.view.dispatch(closeHistory(tr))); editor.view.focus(); };
  const rows = rect ? rect.map.height : 0, cols = rect ? rect.map.width : 0;
  const head = t.node.firstChild && t.node.firstChild.firstChild && t.node.firstChild.firstChild.type.name === 'tableHeader';
  const cellBg = v => () => c().setCellAttribute('bg', v).run();
  return [
    { header: '행' },
    { label: '위에 행 삽입', icon: '↑', run: () => c().addRowBefore().run() }, { label: '아래에 행 삽입', icon: '↓', run: () => c().addRowAfter().run() },
    { label: '행 위로 이동', icon: '⇡', disabled: !rect || rect.top === 0 || rect.bottom - rect.top !== 1, run: rect ? mv(moveTableRow, rect.top, rect.top - 1) : null },
    { label: '행 아래로 이동', icon: '⇣', disabled: !rect || rect.bottom >= rows || rect.bottom - rect.top !== 1, run: rect ? mv(moveTableRow, rect.top, rect.top + 1) : null },
    { label: '행 삭제', icon: '✕', danger: true, disabled: !can.deleteRow(), run: () => c().deleteRow().run() },
    { header: '열' },
    { label: '왼쪽에 열 삽입', icon: '←', run: () => c().addColumnBefore().run() }, { label: '오른쪽에 열 삽입', icon: '→', run: () => c().addColumnAfter().run() },
    { label: '열 왼쪽으로 이동', icon: '⇠', disabled: !rect || rect.left === 0 || rect.right - rect.left !== 1, run: rect ? mv(moveTableColumn, rect.left, rect.left - 1) : null },
    { label: '열 오른쪽으로 이동', icon: '⇢', disabled: !rect || rect.right >= cols || rect.right - rect.left !== 1, run: rect ? mv(moveTableColumn, rect.left, rect.left + 1) : null },
    { label: '열 삭제', icon: '✕', danger: true, disabled: !can.deleteColumn(), run: () => c().deleteColumn().run() },
    { header: '셀 · 표' },
    { label: '제목 행', icon: '▤', checked: head, run: () => c().toggleHeaderRow().run() }, { label: '제목 열', icon: '▥', run: () => c().toggleHeaderColumn().run() },
    { label: '셀 병합', icon: '⊞', disabled: !can.mergeCells(), run: () => c().mergeCells().run() }, { label: '셀 분할', icon: '⊟', disabled: !can.splitCell(), run: () => c().splitCell().run() },
    { label: '셀 배경색', icon: swatch('bg', 'yellow'), children: [{ label: '없음', icon: swatch('bg', ''), run: cellBg(null) }, ...COLORS.map(k => ({ label: COLOR_NAMES[k], icon: swatch('bg', k), run: cellBg(k) }))] },
    { label: '셀 내용 지우기', icon: '⌫', run: () => clearCells(editor) },
    { label: '열 너비 초기화', icon: '↔', run: () => resetWidths(editor) },
    { label: '표 삭제', icon: '🗑', danger: true, run: () => c().deleteTable().run() }];
}
function clearCells(editor) { const { state, view } = editor; const s = state.selection; const tr = state.tr; const P0 = state.schema.nodes.paragraph;
  const wipe = (node, pos) => { tr.replaceWith(tr.mapping.map(pos + 1), tr.mapping.map(pos + node.nodeSize - 1), P0.create()); };
  if (s instanceof CellSelection) s.forEachCell((node, pos) => wipe(node, pos)); else { const { $from } = s; for (let d = $from.depth; d > 0; d--) { const n = $from.node(d); if (n.type.name === 'tableCell' || n.type.name === 'tableHeader') { wipe(n, $from.before(d)); break; } } }
  if (tr.docChanged) view.dispatch(closeHistory(tr)); view.focus(); }
function resetWidths(editor) { const { state, view } = editor; const t = inTable(state); if (!t) return; const tr = state.tr;
  t.node.descendants((n, off) => { if (n.type.name === 'tableCell' || n.type.name === 'tableHeader') { if (n.attrs.colwidth) tr.setNodeMarkup(t.pos + 1 + off, undefined, { ...n.attrs, colwidth: null }); return false; } return true; });
  if (tr.docChanged) view.dispatch(closeHistory(tr)); view.focus(); }
// put the caret in the last row / column so "add" always appends at the end
export function appendRowOrCol(editor, tablePos, what) { const table = editor.state.doc.nodeAt(tablePos); if (!table) return; const map = TableMap.get(table); const cell = tablePos + 1 + map.map[what === 'row' ? map.width * (map.height - 1) : map.width - 1];
  const ch = editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; }).setTextSelection(cell + 2); (what === 'row' ? ch.addRowAfter() : ch.addColumnAfter()).run(); }

export { embedUrl, safeHref };
