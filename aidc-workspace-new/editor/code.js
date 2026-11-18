// Code blocks: a language can be chosen, the code is coloured (lowlight / highlight.js grammars) while editing and when read.
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { closeHistory } from './hist.js';
import { el, openMenu } from './ui.js';
import { ctx } from './host.js';

export const lowlight = createLowlight(common);
export const LANGS = [['', '자동 감지'], ['plaintext', '일반 텍스트'], ['bash', 'Bash'], ['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['css', 'CSS'], ['diff', 'Diff'], ['go', 'Go'], ['graphql', 'GraphQL'], ['ini', 'INI · TOML'],
  ['java', 'Java'], ['javascript', 'JavaScript'], ['json', 'JSON'], ['kotlin', 'Kotlin'], ['lua', 'Lua'], ['makefile', 'Makefile'], ['markdown', 'Markdown'], ['perl', 'Perl'], ['php', 'PHP'], ['python', 'Python'], ['r', 'R'],
  ['ruby', 'Ruby'], ['rust', 'Rust'], ['scss', 'SCSS'], ['shell', 'Shell 세션'], ['sql', 'SQL'], ['swift', 'Swift'], ['typescript', 'TypeScript'], ['xml', 'HTML · XML'], ['yaml', 'YAML']];
const ALIAS = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', sh: 'bash', zsh: 'bash', html: 'xml', htm: 'xml', svg: 'xml', yml: 'yaml', md: 'markdown', 'c++': 'cpp', 'c#': 'csharp', cs: 'csharp', golang: 'go', rb: 'ruby', rs: 'rust', kt: 'kotlin', text: 'plaintext', txt: 'plaintext', toml: 'ini' };
export const langKey = v => { v = String(v || '').toLowerCase(); v = ALIAS[v] || v; return v && lowlight.registered(v) ? v : ''; };
export const langName = v => { const k = langKey(v); const hit = LANGS.find(l => l[0] === k); return hit ? hit[1] : (v || '자동 감지'); };
const copy = text => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => ctx.toast('코드를 복사했습니다.', 1400), () => ctx.toast('복사하지 못했습니다.')); else ctx.toast('복사하지 못했습니다.'); };

export function languageItems(cur, set) { const k = langKey(cur); return LANGS.map(([v, name]) => ({ label: name, checked: v === k, run: () => set(v || null) })); }

function codeView({ node, editor, getPos }) { let cur = node;
  const code = el('code');
  const langBtn = el('button', { type: 'button', class: 'nb-code-lang', title: '언어 선택', 'aria-haspopup': 'menu' });
  const copyBtn = el('button', { type: 'button', class: 'nb-code-copy', text: '복사', 'aria-label': '코드 복사' });
  const bar = el('div', { class: 'nb-code-bar', contenteditable: 'false' }, langBtn, copyBtn);
  const pre = el('pre', { class: 'nb-code', spellcheck: 'false' }, bar, code);
  const set = v => { const pos = getPos(); if (typeof pos !== 'number') return; editor.view.dispatch(closeHistory(editor.state.tr.setNodeAttribute(pos, 'language', v))); editor.view.focus(); };
  const sync = () => { const l = cur.attrs.language; langBtn.textContent = langName(l) + ' ▾'; langBtn.setAttribute('aria-label', '언어: ' + langName(l)); code.className = l ? 'language-' + l : ''; if (cur.attrs.id) pre.setAttribute('data-id', cur.attrs.id); else pre.removeAttribute('data-id'); langBtn.hidden = !editor.isEditable; };
  [langBtn, copyBtn].forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); }));
  langBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (!editor.isEditable) return; openMenu(languageItems(cur.attrs.language, set), { rect: langBtn.getBoundingClientRect(), cls: 'nb-langmenu', takeFocus: true, onClose: () => editor.view.focus() }); });
  copyBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); copy(cur.textContent); });
  sync();
  return { dom: pre, contentDOM: code, update(n) { if (n.type !== cur.type) return false; cur = n; sync(); return true; },
    stopEvent: e => !!(e.target && e.target.nodeType === 1 && bar.contains(e.target)), ignoreMutation: m => m.type !== 'selection' && bar.contains(m.target) }; }

export const Code = CodeBlockLowlight.extend({ addNodeView() { return codeView; } });
export const codeOptions = { lowlight, defaultLanguage: null, enableTabIndentation: true, tabSize: 2, HTMLAttributes: { spellcheck: 'false' } };

/* read mode: colour the stored <pre><code class="language-…"> and show its language */
const toDom = n => { if (n.type === 'text') return document.createTextNode(n.value); const s = document.createElement('span'); s.className = ((n.properties && n.properties.className) || []).join(' '); (n.children || []).forEach(c => s.append(toDom(c))); return s; };
export function highlightIn(root) {
  root.querySelectorAll('pre > code').forEach(code => { const pre = code.parentElement; if (pre.dataset.nbHl) return; pre.dataset.nbHl = '1';
    const raw = (/language-([\w+#-]+)/.exec(code.className) || [])[1] || ''; const lang = langKey(raw); const text = code.textContent;
    try { const tree = lang ? lowlight.highlight(lang, text) : (text.length < 20000 ? lowlight.highlightAuto(text) : null); if (tree) { code.textContent = ''; tree.children.forEach(c => code.append(toDom(c))); } } catch { /* the plain text stays */ }
    if (raw) { const l = document.createElement('span'); l.className = 'nb-code-langlabel'; l.textContent = langName(raw); l.setAttribute('aria-hidden', 'true'); pre.append(l); } });
}
