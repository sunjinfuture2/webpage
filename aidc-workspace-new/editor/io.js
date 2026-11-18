// Getting a body out of the workspace (Markdown, HTML file, print / PDF) and into it (Markdown, text, HTML, CSV).
// Export works from the stored HTML, so it is the same in read and in edit mode.
import { marked } from 'marked';
import { closeHistory } from '@tiptap/pm/history';
import { ctx, esc } from './host.js';
import { upgrade } from './legacy.js';
import { loadKatex, mathMarkup } from './math.js';
import { highlightIn } from './code.js';

const abs = u => { try { return new URL(u, location.href).href; } catch { return u || ''; } };
const escMd = s => String(s || '').replace(/([\\`*_[\]<])/g, '\\$1');
const wrap = (m, s) => { const a = /^\s*/.exec(s)[0], b = /\s*$/.exec(s)[0]; const core = s.slice(a.length, s.length - b.length); return core ? a + m + core + m + b : s; };
const prefix = (text, p) => text.split('\n').map(l => (p + l).replace(/\s+$/, '')).join('\n');

function inline(node) { let out = ''; node.childNodes.forEach(n => { out += inl(n); }); return out; }
function inl(n) {
  if (n.nodeType === 3) return escMd(n.nodeValue); if (n.nodeType !== 1) return '';
  const t = n.tagName, c = () => inline(n);
  if (t === 'BR') return '  \n';
  if (t === 'STRONG' || t === 'B') return wrap('**', c()); if (t === 'EM' || t === 'I') return wrap('*', c()); if (t === 'S' || t === 'DEL' || t === 'STRIKE') return wrap('~~', c());
  if (t === 'CODE') { const x = n.textContent; const f = /`/.test(x) ? '``' : '`'; return f + (f.length > 1 ? ' ' : '') + x + (f.length > 1 ? ' ' : '') + f; }
  if (t === 'U') return '<u>' + c() + '</u>';
  if (t === 'A') { if (n.getAttribute('data-type') === 'pageLink') return '[[' + n.textContent + ']]'; const h = n.getAttribute('href'); return h ? `[${c()}](${abs(h)})` : c(); }
  if (n.getAttribute('data-type') === 'math') return '$' + (n.getAttribute('data-tex') || '') + '$';
  if (t === 'IMG') return `![${escMd(n.getAttribute('alt') || '')}](${abs(n.getAttribute('src'))})`;
  if (t === 'INPUT' || t === 'BUTTON' || t === 'LABEL') return '';
  return c();
}
const cellText = c => { const kids = [...c.children]; return (kids.length ? kids.map(k => (k.tagName === 'P' ? inline(k) : blk(k) || '')).join('<br>') : inline(c)).replace(/ {2}\n/g, '<br>').replace(/\n+/g, '<br>').replace(/\|/g, '\\|'); };
function table(t) {
  const rows = [...t.querySelectorAll('tr')].map(tr => [...tr.children].map(cellText)); if (!rows.length) return '';
  const cols = Math.max(...rows.map(r => r.length)); const line = r => '| ' + Array.from({ length: cols }, (_x, i) => r[i] || ' ').join(' | ') + ' |';
  const head = t.querySelector('tr:first-child th') ? rows.shift() : Array(cols).fill(' ');
  return [line(head), '| ' + Array(cols).fill('---').join(' | ') + ' |', ...rows.map(line)].join('\n');
}
function list(ul) {
  const ordered = ul.tagName === 'OL', task = ul.getAttribute('data-type') === 'taskList'; let i = +(ul.getAttribute('start') || 1); const lines = [];
  [...ul.children].forEach(li => { if (li.tagName !== 'LI') return;
    const marker = task ? `- [${li.getAttribute('data-checked') === 'true' ? 'x' : ' '}] ` : ordered ? `${i++}. ` : '- ';
    const body = task ? (li.querySelector(':scope > div') || li) : li; const parts = [];
    [...body.children].forEach(ch => { const b = blk(ch); if (b) parts.push(b); });
    if (!parts.length) parts.push(inline(body));
    const pad = ' '.repeat(marker.length); lines.push(marker + parts.join('\n').split('\n').map((l, k) => (k ? pad + l : l)).join('\n')); });
  return lines.join('\n');
}
function blocks(parent) { const out = []; [...parent.children].forEach(n => { const b = blk(n); if (b != null && b !== '') out.push(b); }); return out.join('\n\n'); }
function blk(n) {
  const t = n.tagName, type = n.getAttribute('data-type');
  if (/^H[1-6]$/.test(t)) return '#'.repeat(+t[1]) + ' ' + inline(n).replace(/\s*\n\s*/g, ' ');
  if (t === 'P') return inline(n);
  if (t === 'UL' || t === 'OL') return list(n);
  if (t === 'BLOCKQUOTE') return prefix(blocks(n) || inline(n), '> ');
  if (t === 'PRE') { const code = n.querySelector('code') || n; const lang = (/language-([\w+#-]+)/.exec(code.className) || [])[1] || ''; const text = code.textContent.replace(/\n$/, ''); const run = Math.max(0, ...(text.match(/`+/g) || []).map(x => x.length)); const f = '`'.repeat(Math.max(3, run + 1)); return f + lang + '\n' + text + '\n' + f; }
  if (t === 'HR') return '---';
  if (t === 'TABLE') return table(n);
  if (t === 'FIGURE') { const img = n.querySelector('img'), cap = n.querySelector('figcaption'); return img ? `![${escMd(img.getAttribute('alt') || '')}](${abs(img.getAttribute('src'))})` + (cap && cap.textContent ? '\n\n*' + escMd(cap.textContent) + '*' : '') : ''; }
  if (t === 'A' && n.classList.contains('file')) return `[${escMd(n.getAttribute('data-name') || n.textContent)}](${abs(n.getAttribute('href') || '')})`;
  if (t === 'A' && n.classList.contains('bookmark')) { const b = n.querySelector('.bm-body b'); return `[${escMd(b ? b.textContent : n.textContent)}](${abs(n.getAttribute('href'))})`; }
  if (t === 'IFRAME' || t === 'VIDEO' || t === 'AUDIO') return `[${escMd(n.getAttribute('title') || '임베드')}](${abs(n.getAttribute('src'))})`;
  if (t === 'DETAILS' || type === 'details') { const sum = n.querySelector('summary'), body = n.querySelector('[data-type="detailsContent"]'); const lv = +n.getAttribute('data-level'); const head = sum ? inline(sum) : '';
    return '<details>\n<summary>' + (lv ? `<h${lv}>${head}</h${lv}>` : head) + '</summary>\n\n' + (body ? blocks(body) : '') + '\n\n</details>'; }
  if (type === 'callout') { const body = n.querySelector(':scope > .nb-callout-body') || n; return prefix((n.getAttribute('data-icon') || '💡') + ' ' + blocks(body), '> '); }
  if (type === 'columns' || type === 'column') return blocks(n);
  if (type === 'mathBlock') return '$$\n' + (n.getAttribute('data-tex') || '') + '\n$$';
  if (type === 'button') return '`[' + (n.getAttribute('data-label') || n.textContent || '버튼') + ']`';
  if (type === 'toc' || type === 'synced' || type === 'itemList') return '';
  if (type === 'raw') return n.getAttribute('data-html') || '';
  if (t === 'DIV' || t === 'SECTION' || t === 'ARTICLE') return blocks(n) || inline(n);
  return inline(n);
}
const parse = html => new DOMParser().parseFromString('<body>' + (html || ''), 'text/html').body;
export function toMarkdown(html, title) { const md = blocks(parse(html)).replace(/\n{3,}/g, '\n\n').trim(); return (title ? '# ' + escMd(title) + '\n\n' : '') + md + '\n'; }

/* ---------- export ---------- */
const fileName = (title, ext) => (String(title || '문서').replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 80) || '문서') + '.' + ext;
function download(name, text, type) { const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([text], { type })); a.href = url; a.download = name; a.addEventListener('click', e => e.stopPropagation()); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
const PAGE_CSS = 'body{font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif;color:#1c1c1c;line-height:1.6;margin:0;padding:40px 48px;-webkit-print-color-adjust:exact;print-color-adjust:exact}main{max-width:820px;margin:0 auto}h1.doc-title{font-size:30px;margin:0 0 22px}.ibody{position:static!important;font-size:15px}a.file,a.bookmark{color:inherit}.nb-copy,.nb-code-bar{display:none!important}@media print{body{padding:0}iframe,video,audio{display:none}details>*{display:block!important}}';
async function standalone(html, title) {
  const root = parse(html);
  root.querySelectorAll('[src^="/"],[href^="/"]').forEach(n => { for (const k of ['src', 'href']) if ((n.getAttribute(k) || '').startsWith('/')) n.setAttribute(k, abs(n.getAttribute(k))); });
  root.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
  root.querySelectorAll('input[type="checkbox"]').forEach(i => i.setAttribute('disabled', ''));
  root.querySelectorAll('li[data-type="taskItem"]').forEach(li => { const i = li.querySelector('input'); if (i) { if (li.getAttribute('data-checked') === 'true') i.setAttribute('checked', ''); else i.removeAttribute('checked'); } });
  root.querySelectorAll('span.mention[data-id]').forEach(s => { s.textContent = '@' + ctx.userName(s.getAttribute('data-id'), s.textContent.replace(/^@/, '')); });
  root.querySelectorAll('a[data-type="pageLink"]').forEach(a => { const t = ctx.pageTitle(a.getAttribute('data-item'), ''); if (t) a.textContent = t; });
  root.querySelectorAll('[data-type="toc"],[data-type="synced"],[data-type="itemList"],[data-type="button"]').forEach(n => n.remove());
  const maths = [...root.querySelectorAll('[data-type="math"],[data-type="mathBlock"]')];
  if (maths.length) { try { await loadKatex(); } catch { /* the LaTeX source is written instead */ } maths.forEach(n => { const m = mathMarkup(n.getAttribute('data-tex') || '', n.getAttribute('data-type') === 'mathBlock'); if (m) n.innerHTML = m; }); }
  try { highlightIn(root); root.querySelectorAll('.nb-code-langlabel').forEach(n => n.remove()); } catch { /* plain code */ }
  const css = (document.getElementById('nb-style') || {}).textContent || '';
  return `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${esc(title || '문서')}</title>\n<style>${css}\n${PAGE_CSS}</style>\n</head>\n<body>\n<main>\n${title ? `<h1 class="doc-title">${esc(title)}</h1>\n` : ''}<div class="ibody"><div class="nb-doc">${root.innerHTML}</div></div>\n</main>\n</body>\n</html>\n`;
}
export async function exportDoc(html, title, fmt) {
  if (fmt === 'md') { download(fileName(title, 'md'), toMarkdown(html, title), 'text/markdown;charset=utf-8'); return true; }
  const page = await standalone(html, title);
  if (fmt === 'html') { download(fileName(title, 'html'), page, 'text/html;charset=utf-8'); return true; }
  // print (the browser's dialog offers "PDF로 저장"): a hidden frame, so no pop-up is needed
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.append(f);
  const d = f.contentDocument; d.open(); d.write(page); d.close();
  const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { ctx.toast('인쇄 창을 열지 못했습니다.'); } setTimeout(() => f.remove(), 60000); };
  const imgs = [...d.images].filter(i => !i.complete); if (!imgs.length) setTimeout(go, 150); else { let n = imgs.length, fired = false; const one = () => { if (--n <= 0 && !fired) { fired = true; go(); } }; imgs.forEach(i => { i.addEventListener('load', one); i.addEventListener('error', one); }); setTimeout(() => { if (!fired) { fired = true; go(); } }, 4000); }
  return true;
}

/* ---------- import ---------- */
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function mdToHtml(md) {
  let src = String(md || '').replace(/\r\n?/g, '\n'); const keep = [];
  const hold = h => { keep.push(h); return `\u0000${keep.length - 1}\u0000`; };
  // fenced code first, so nothing inside it is read as an equation
  src = src.replace(/(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2[^\n]*(?=\n|$)/g, m => hold(m));
  src = src.replace(/(^|\n)\$\$\s*\n?([\s\S]+?)\n?\s*\$\$(?=\n|$)/g, (_m, a, tex) => a + hold(`\n\n<div data-type="mathBlock" data-tex="${escH(tex.trim())}"></div>\n\n`));
  src = src.replace(/\$\$([^$\n]+)\$\$/g, (_m, tex) => hold(`<span data-type="math" data-tex="${escH(tex.trim())}"></span>`));
  src = src.replace(/(^|[^\\$\w])\$([^$\s][^$\n]*?)\$(?![\w$])/g, (m, a, tex) => (/[\\^_{}=]/.test(tex) && !/\s$/.test(tex) ? a + hold(`<span data-type="math" data-tex="${escH(tex)}"></span>`) : m));
  src = src.replace(/\u0000(\d+)\u0000/g, (_m, i) => keep[+i]);
  return marked.parse(src, { gfm: true, breaks: false, async: false }).replace(/\n<\/code><\/pre>/g, '</code></pre>');
}
export const looksLikeMarkdown = t => { const lines = String(t || '').split(/\r?\n/); if (lines.length < 2) return false; let hit = 0;
  for (const l of lines) if (/^(#{1,6} \S|\s*[-*+] \S|\s*\d+[.)] \S|> ?\S|\|.+\|\s*$|\s*[-*+] \[[ xX]\] )/.test(l)) hit++;
  return /^(```|~~~)/m.test(t) || /^#{1,6} \S/m.test(t) || hit >= 2; };
function parseCsv(text, sep) { const rows = []; let row = [], cell = '', q = false; const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === '') { q = true; continue; } if (c === sep) { row.push(cell); cell = ''; continue; } if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; } cell += c; }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); } return rows.filter(r => r.some(x => x !== '')); }
export function fileToHtml(name, text) {
  const ext = (/\.([a-z0-9]+)$/i.exec(name || '') || [])[1] || ''; const e = ext.toLowerCase();
  if (e === 'html' || e === 'htm') { const d = new DOMParser().parseFromString(text, 'text/html'); return ctx.clean(d.body ? d.body.innerHTML : text); }
  if (e === 'csv' || e === 'tsv') { const rows = parseCsv(text, e === 'tsv' ? '\t' : ',').slice(0, 300); const cols = Math.min(40, Math.max(0, ...rows.map(r => r.length))); if (!rows.length || !cols) return '';
    return '<table><tbody>' + rows.map((r, k) => '<tr>' + Array.from({ length: cols }, (_x, i) => `<${k ? 'td' : 'th'}>${escH(r[i] || '').replace(/\n/g, '<br>')}</${k ? 'td' : 'th'}>`).join('') + '</tr>').join('') + '</tbody></table>'; }
  if (e === 'txt') return text.replace(/\r\n?/g, '\n').split(/\n{2,}/).filter(p => p.trim()).map(p => '<p>' + escH(p).replace(/\n/g, '<br>') + '</p>').join('');
  return ctx.clean(mdToHtml(text));
}
const MAX_IMPORT = 2 * 1024 * 1024;
// HTML made elsewhere has line breaks between its blocks; put in as it is they would become paragraphs of their own
const CONTAINERS = new Set(['BODY', 'DIV', 'UL', 'OL', 'TABLE', 'TBODY', 'THEAD', 'TFOOT', 'TR', 'BLOCKQUOTE', 'DETAILS', 'FIGURE', 'SECTION', 'ARTICLE']);
const BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DIV', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR', 'DETAILS', 'SUMMARY', 'FIGURE', 'NAV', 'TR', 'TD', 'TH', 'TBODY', 'THEAD']);
export function tidyBlocks(html) { const root = parse(html); const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const drop = [];
  for (let t = walk.nextNode(); t; t = walk.nextNode()) { if (/\S/.test(t.nodeValue) || t.parentElement.closest('pre,code')) continue; const a = t.previousSibling, b = t.nextSibling; const isB = n => !!n && n.nodeType === 1 && BLOCKS.has(n.tagName);
    if (CONTAINERS.has(t.parentElement.tagName) || isB(a) || isB(b)) drop.push(t); }
  drop.forEach(t => t.remove()); return root.innerHTML; }
export function insertHtml(inst, html, atEnd) { const ed = inst.editor; const clean = tidyBlocks(upgrade(html || '')); if (!clean.trim()) return false;
  const ch = ed.chain().focus(atEnd ? 'end' : undefined).command(({ tr }) => { closeHistory(tr); return true; });
  // an empty line under the caret is replaced by what comes in
  const { $from, empty } = ed.state.selection; const blank = !atEnd && empty && $from.depth === 1 && $from.parent.type.name === 'paragraph' && !$from.parent.content.size;
  const last = ed.state.doc.lastChild; const blankEnd = atEnd && last && last.type.name === 'paragraph' && !last.content.size;
  if (blank) ch.insertContentAt({ from: $from.before(1), to: $from.after(1) }, clean); else if (blankEnd) ch.insertContentAt({ from: ed.state.doc.content.size - last.nodeSize, to: ed.state.doc.content.size }, clean); else ch.insertContent(clean);
  ch.run(); return true; }
export function importFile(inst) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.md,.markdown,.txt,.html,.htm,.csv,.tsv,text/markdown,text/plain,text/html,text/csv';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; if (f.size > MAX_IMPORT) { ctx.toast('2 MB보다 큰 파일은 가져올 수 없습니다.', 2800); return; }
    const r = new FileReader(); r.onerror = () => ctx.toast('파일을 읽지 못했습니다.'); r.onload = () => { if (inst.destroyed) return; let html = ''; try { html = fileToHtml(f.name, String(r.result || '')); } catch { html = ''; }
      if (!html || !insertHtml(inst, html, !inst.editor.view.hasFocus())) { ctx.toast('가져올 내용이 없거나 읽을 수 없는 형식입니다.', 2800); return; } ctx.toast(`“${f.name}”의 내용을 넣었습니다. Ctrl+Z로 되돌릴 수 있습니다.`, 3200); inst.opts.onChange && inst.opts.onChange(); };
    r.readAsText(f); };
  inp.click();
}
