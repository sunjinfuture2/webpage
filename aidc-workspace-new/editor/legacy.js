// Bodies written by the first editor (schema version 1) used their own class conventions. upgrade() rewrites
// those into the HTML the schema reads, without dropping anything: what is not recognised stays as text or as a raw block.
// It is idempotent: version 2 HTML passes through unchanged.
import { ctx } from './host.js';
import { KNOWN_TYPES } from './schema.js';

const KNOWN = new Set(KNOWN_TYPES);
const INLINE_HOSTS = 'p,h1,h2,h3,li,td,th,blockquote,summary';

export function upgrade(html) {
  if (!html || !/<[a-z]/i.test(html)) return html ? html.split('\n').map(l => `<p>${l.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</p>`).join('') : '';
  const doc = new DOMParser().parseFromString('<body>' + html, 'text/html'); const root = doc.body;
  root.querySelectorAll('script,style,object,embed,link,meta,base,form,frame,frameset,applet').forEach(n => n.remove());
  root.querySelectorAll('.blk-handle,.ph-empty,.slash-menu,.ed-toolbar,.mention-pop').forEach(n => n.remove());
  // blocks written by a newer version of the editor: keep them as they are
  root.querySelectorAll('[data-type]').forEach(n => { if (!root.contains(n) || KNOWN.has(n.getAttribute('data-type'))) return;
    const d = doc.createElement('div'); d.setAttribute('data-type', 'raw'); d.setAttribute('data-html', n.outerHTML); n.replaceWith(d); });
  root.querySelectorAll('h4,h5,h6').forEach(h => { const n = doc.createElement('h3'); n.append(...h.childNodes); h.replaceWith(n); });
  // version 1 to-do rows -> one task list per run of rows
  root.querySelectorAll('div.todo').forEach(d => { if (!root.contains(d) || d.parentElement.matches('ul[data-type="taskList"]')) return;
    const ul = doc.createElement('ul'); ul.setAttribute('data-type', 'taskList'); d.before(ul);
    let cur = d; while (cur && cur.nodeType === 1 && cur.matches('div.todo')) { const next = cur.nextElementSibling; const inp = cur.querySelector(':scope > input');
      const li = doc.createElement('li'); li.setAttribute('data-type', 'taskItem'); li.setAttribute('data-checked', String(cur.classList.contains('done') || !!(inp && (inp.checked || inp.hasAttribute('checked')))));
      const p = doc.createElement('p'); const tx = cur.querySelector(':scope > .tx'); p.append(...(tx || cur).childNodes); p.querySelectorAll('input').forEach(x => x.remove()); li.append(p); ul.append(li); cur.remove();
      cur = next && next.previousSibling === ul ? next : null; } });
  // version 1 toggles -> details (children are moved, so nested toggles are converted in turn)
  root.querySelectorAll('div.toggle').forEach(d => { if (!root.contains(d)) return; const det = doc.createElement('details'); if (d.classList.contains('open')) det.setAttribute('open', '');
    const sum = doc.createElement('summary'); const tx = d.querySelector(':scope > .tx'); if (tx) sum.append(...tx.childNodes);
    const body = doc.createElement('div'); body.setAttribute('data-type', 'detailsContent'); const tc = d.querySelector(':scope > .tc'); if (tc) body.append(...tc.childNodes);
    if (!body.textContent.trim() && !body.querySelector('img,table,hr,a,iframe,video,audio')) body.innerHTML = '<p></p>';
    det.append(sum, body); d.replaceWith(det); });
  root.querySelectorAll('div.callout').forEach(d => { if (!root.contains(d) || d.getAttribute('data-type') === 'callout') return; const c = doc.createElement('div'); c.setAttribute('data-type', 'callout');
    const body = doc.createElement('div'); body.className = 'nb-callout-body'; const p = doc.createElement('p'); const tx = d.querySelector(':scope > .tx'); p.append(...(tx || d).childNodes); p.querySelectorAll(':scope > i:empty').forEach(x => x.remove());
    body.append(p); c.append(body); d.replaceWith(c); });
  // version 1 paragraphs were shown with pre-wrap: a line break typed with Shift+Enter may be a bare newline
  const walk = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT); const hits = [];
  for (let t = walk.nextNode(); t; t = walk.nextNode()) if (t.nodeValue.includes('\n') && /\S/.test(t.nodeValue) && t.parentElement && !t.parentElement.closest('pre,code') && t.parentElement.closest(INLINE_HOSTS)) hits.push(t);
  hits.forEach(t => { const parts = t.nodeValue.split('\n'); const frag = doc.createDocumentFragment(); parts.forEach((s, i) => { if (i) frag.append(doc.createElement('br')); if (s) frag.append(doc.createTextNode(s)); }); t.replaceWith(frag); });
  return root.innerHTML;
}

/* ---------- read mode: the stored HTML is shown as it is; these are the parts that depend on live data ---------- */
export function headingsOf(root) {
  return [...root.querySelectorAll('h1,h2,h3,details[data-level] > summary,[data-type="details"][data-level] summary')].filter(h => !h.closest('[data-type="raw"]')).map(h => {
    const det = h.tagName === 'SUMMARY' ? h.closest('details,[data-type="details"]') : null; const src = det || h;
    return { level: det ? +det.getAttribute('data-level') : +h.tagName[1], text: (h.textContent || '').trim(), id: src.getAttribute('data-id') || '' }; }).filter(h => h.text);
}
export function fillToc(nav, heads) {
  nav.textContent = ''; nav.setAttribute('contenteditable', 'false');
  if (!heads.length) { const e = document.createElement('div'); e.className = 'nb-toc-empty'; e.textContent = '제목 블록을 추가하면 목차가 만들어집니다.'; nav.append(e); return; }
  const min = Math.min(...heads.map(h => h.level));
  heads.forEach(h => { const a = document.createElement('a'); a.className = 'nb-toc-it'; a.setAttribute('data-toc', h.id); a.style.paddingLeft = ((h.level - min) * 18 + 2) + 'px'; a.textContent = h.text; a.setAttribute('role', 'link'); a.tabIndex = 0; nav.append(a); });
}
export function jumpTo(root, id) {
  const t = id && root.querySelector(`[data-id="${String(id).replace(/[^\w-]/g, '')}"]`); if (!t) return false;
  for (let d = t.parentElement && t.parentElement.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
  t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.add('nb-flash'); setTimeout(() => t.classList.remove('nb-flash'), 1600); return true;
}
export function hydrate(root) {
  if (!root || root.dataset.nbReady) return; root.dataset.nbReady = '1';
  root.querySelectorAll('input[type="checkbox"]').forEach(i => { i.disabled = true; i.setAttribute('aria-readonly', 'true'); });
  root.querySelectorAll('li[data-type="taskItem"]').forEach(li => { const i = li.querySelector('input'); if (i) i.checked = li.getAttribute('data-checked') === 'true'; });
  root.querySelectorAll('span.mention[data-id]').forEach(s => { s.textContent = '@' + ctx.userName(s.getAttribute('data-id'), s.textContent.replace(/^@/, '')); });
  root.querySelectorAll('a[data-type="pageLink"]').forEach(a => { const t = ctx.pageTitle(a.getAttribute('data-item'), ''); if (t) a.textContent = t; else a.classList.add('gone'); a.setAttribute('role', 'link'); a.tabIndex = 0; });
  root.querySelectorAll('div[data-type="raw"]').forEach(d => { d.textContent = ''; const n = document.createElement('div'); n.className = 'nb-raw-note'; n.textContent = '이 버전에서는 편집할 수 없는 블록입니다. 내용은 그대로 보관됩니다.'; const v = document.createElement('div'); v.className = 'nb-raw-view'; v.innerHTML = ctx.clean(d.getAttribute('data-html') || ''); d.append(n, v); });
  root.querySelectorAll('nav[data-type="toc"]').forEach(n => fillToc(n, headingsOf(root)));
  root.querySelectorAll('pre').forEach(p => { if (p.querySelector('.nb-copy')) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'nb-copy'; b.textContent = '복사'; b.setAttribute('aria-label', '코드 복사'); p.append(b); });
  root.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-toc],a[data-type="pageLink"],.nb-copy'); if (!t || !root.contains(t)) return;
    if (t.matches('.nb-copy')) { e.preventDefault(); e.stopPropagation(); const code = t.parentElement.querySelector('code') || t.parentElement; const txt = [...code.childNodes].filter(n => n !== t).map(n => n.textContent).join(''); navigator.clipboard && navigator.clipboard.writeText(txt).then(() => ctx.toast('코드를 복사했습니다.'), () => ctx.toast('복사하지 못했습니다.')); return; }
    e.preventDefault(); e.stopPropagation();
    if (t.matches('[data-toc]')) { jumpTo(root, t.getAttribute('data-toc')); return; }
    ctx.openItem(t.getAttribute('data-item')); });
}
