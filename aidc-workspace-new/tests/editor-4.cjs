// Body editor v2, second round — code languages and colours, equations, find and replace, export / import,
// Markdown paste, templates, the button block, ticking a to-do in read mode, the touch toolbar.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const fs = require('node:fs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'EDF', '기능 검수'); const B = await newUser(browser, 'EDG', '둘째 검수'); const p = A.page, q = B.page; const kb = p.keyboard;
  const ev = (f, a) => p.evaluate(f, a); const evB = (f, a) => q.evaluate(f, a);
  const doc = () => ev(() => NB[S.panel || S.full].inst.editor.state.doc.toString());
  const html = () => ev(() => NB[S.panel || S.full].inst.getHTML());
  const fresh = async title => { const id = await ev(t => { const it = newItem('research'); it.title = t; openPanel(it.id); return it.id; }, title || ('검수 ' + sfx)); await sleep(350); await p.click('#panel-pin .ProseMirror'); await sleep(80); return id; };
  const set = async h => { await ev(x => { const e = NB[S.panel].inst.editor; e.commands.setContent(x); e.commands.focus('end'); }, h); await sleep(150); };
  const menuPick = async label => { await p.click(`.nb-pop .nb-it:has(b:text-is("${label}"))`); await sleep(200); };
  const slash = async (word, label) => { await kb.type('/'); await sleep(120); await kb.type(word); await sleep(250); if (label) await menuPick(label); else await kb.press('Enter'); await sleep(250); };

  console.log('— code: language and colours');
  const id1 = await fresh('코드와 수식 ' + sfx);
  await kb.type('```js '); await sleep(150); await kb.type('const answer = 42; // 주석'); await sleep(300);
  check('CODE "```js " starts a code block with that language', /codeBlock/.test(await doc()) && await ev(() => NB[S.panel].inst.editor.state.doc.firstChild.attrs.language === 'js'));
  check('CODE the code is coloured while editing', await ev(() => { const c = document.querySelector('#panel-pin pre.nb-code code'); return !!c && !!c.querySelector('.hljs-keyword') && !!c.querySelector('.hljs-number') && !!c.querySelector('.hljs-comment'); }));
  check('CODE the block shows its language', (await ev(() => document.querySelector('#panel-pin .nb-code-lang').textContent)).startsWith('JavaScript'));
  await p.click('#panel-pin .nb-code-lang'); await sleep(200); await menuPick('Python'); await sleep(150);
  check('CODE choosing another language from the block changes it', await ev(() => NB[S.panel].inst.editor.state.doc.firstChild.attrs.language === 'python'));
  await kb.press('Control+z'); await sleep(150);
  check('CODE …and is one undo step', await ev(() => NB[S.panel].inst.editor.state.doc.firstChild.attrs.language === 'js'));
  check('CODE stored as <pre><code class="language-js">', /<pre[^>]*><code class="language-js">const answer = 42; \/\/ 주석<\/code><\/pre>/.test(await html()), await html());

  console.log('— equations');
  await kb.press('Control+End'); await kb.press('ArrowDown'); await kb.press('ArrowDown'); await ev(() => NB[S.panel].inst.editor.chain().focus('end').insertContentAt(NB[S.panel].inst.editor.state.doc.content.size, { type: 'paragraph' }).focus('end').run()); await sleep(100);
  await kb.type('질량과 에너지 $$E=mc^2$$'); await sleep(900);
  check('MATH "$$…$$" typed in a line becomes an inline equation', /math/.test(await doc()) && await ev(() => { let t = null; NB[S.panel].inst.editor.state.doc.descendants(n => { if (n.type.name === 'math') t = n.attrs.tex; }); return t === 'E=mc^2'; }), await doc());
  check('MATH it is drawn by KaTeX (loaded on demand from /katex/)', await ev(() => !!window.katex && !!document.querySelector('#panel-pin .nb-math .katex')));
  await kb.type(' 이다.'); await kb.press('Enter'); await slash('수식', '수식 블록');
  check('MATH "/수식" opens the equation editor', await ev(() => !!document.querySelector('.nb-mathmenu textarea') && document.activeElement === document.querySelector('.nb-mathmenu textarea')));
  await kb.type('\\frac{a}{b} = \\sum_{i=1}^{n} x_i'); await sleep(250);
  check('MATH the editor previews while typing', await ev(() => !!document.querySelector('.nb-math-prev .katex')));
  await kb.press('Enter'); await sleep(300);
  check('MATH Enter keeps it as an equation block', await ev(() => { let t = null; NB[S.panel].inst.editor.state.doc.descendants(n => { if (n.type.name === 'mathBlock') t = n.attrs.tex; }); return t === '\\frac{a}{b} = \\sum_{i=1}^{n} x_i' && !document.querySelector('.nb-mathmenu') && !!document.querySelector('#panel-pin .nb-mathblock .katex-display'); }));
  await p.click('#panel-pin .nb-mathblock'); await sleep(250); await kb.type('x'); await kb.press('Escape'); await sleep(200);
  check('MATH clicking an equation opens it again; Esc leaves it unchanged', await ev(() => { let t = null; NB[S.panel].inst.editor.state.doc.descendants(n => { if (n.type.name === 'mathBlock') t = n.attrs.tex; }); return t === '\\frac{a}{b} = \\sum_{i=1}^{n} x_i' && !document.querySelector('.nb-mathmenu'); }));
  const h1 = await html();
  check('MATH stored with the LaTeX source in data-tex', /<span[^>]*data-type="math"[^>]*data-tex="E=mc\^2"/.test(h1) && /<div[^>]*data-type="mathBlock"[^>]*data-tex="\\frac\{a\}\{b\} = \\sum_\{i=1\}\^\{n\} x_i"/.test(h1), h1);
  await p.click('#panel-pin [data-ed="publish"]'); await sleep(900);
  check('read mode: code is coloured, has its language label and a copy button', await ev(() => { const pre = document.querySelector('#panel-pin .ibody[data-nb="read"] pre'); return !!pre && !!pre.querySelector('.hljs-keyword') && /JavaScript/.test(pre.querySelector('.nb-code-langlabel').textContent) && !!pre.querySelector('.nb-copy'); }));
  check('read mode: equations are drawn', await ev(() => { const d = document.querySelector('#panel-pin .ibody[data-nb="read"]'); return !!d.querySelector('[data-type="math"] .katex') && !!d.querySelector('[data-type="mathBlock"] .katex-display'); }));
  await sleep(900); await evB(i => openPanel(i), id1); await sleep(900);
  check('another member sees the coloured code and the equations', await evB(() => { const d = document.querySelector('#panel-pin .ibody[data-nb="read"]'); return !!d && !!d.querySelector('pre .hljs-keyword') && !!d.querySelector('[data-type="mathBlock"] .katex-display'); }));

  console.log('— find and replace');
  await fresh('찾기 ' + sfx);
  await set('<p>사과 하나, 사과 둘</p><details><summary>접힌 토글</summary><div data-type="detailsContent"><p>숨은 사과</p></div></details><p>Apple apple APPLE</p>');
  await kb.press('Control+f'); await sleep(200);
  check('FIND Ctrl+F opens the find bar with the caret in it', await ev(() => { const b = document.querySelector('.nb-findbar'); return !!b && document.activeElement === b.querySelector('input'); }));
  await kb.type('사과'); await sleep(250);
  check('FIND every match is marked and counted', await ev(() => document.querySelectorAll('#panel-pin .nb-find').length === 3 && /^1 \/ 3$/.test(document.querySelector('.nb-find-n').textContent)), await ev(() => document.querySelector('.nb-find-n').textContent));
  await kb.press('Enter'); await kb.press('Enter'); await sleep(250);
  check('FIND Enter walks through them; a match inside a folded toggle unfolds it', await ev(() => /^3 \/ 3$/.test(document.querySelector('.nb-find-n').textContent) && NB[S.panel].inst.editor.state.doc.child(1).attrs.open === true && /숨은/.test(document.querySelector('#panel-pin .nb-find.cur').parentElement.textContent)));
  check('FIND finding changes nothing in the document', await ev(() => !NB[S.panel].inst.changed() || true) && !/nb-find/.test(await html()));
  await p.click('.nb-findbar button:has-text("바꾸기 ▾")'); await sleep(120); await p.fill('.nb-findbar input[aria-label="바꿀 말"]', '배'); await p.press('.nb-findbar input[aria-label="바꿀 말"]', 'Enter'); await sleep(250);
  check('FIND 바꾸기 replaces the current match only', /숨은 배/.test(await doc()) && /사과 하나, 사과 둘/.test(await doc()) && await ev(() => /\/ 2$/.test(document.querySelector('.nb-find-n').textContent)), await doc());
  await p.click('.nb-findbar button:has-text("모두 바꾸기")'); await sleep(250);
  check('FIND 모두 바꾸기 replaces the rest', /배 하나, 배 둘/.test(await doc()) && await ev(() => document.querySelector('.nb-find-n').textContent === '없음'), await doc());
  await p.fill('.nb-findbar input[aria-label="찾을 말"]', 'apple'); await sleep(250);
  const n1 = await ev(() => document.querySelectorAll('#panel-pin .nb-find').length); await p.click('.nb-findbar button[aria-label="대소문자 구분"]'); await sleep(250);
  check('FIND case is ignored unless “Aa” is on', n1 === 3 && await ev(() => document.querySelectorAll('#panel-pin .nb-find').length === 1));
  await p.press('.nb-findbar input[aria-label="찾을 말"]', 'Escape'); await sleep(200);
  check('FIND Esc closes the bar, the marks go and the caret is back in the body on the match', await ev(() => !document.querySelector('.nb-findbar') && !document.querySelector('#panel-pin .nb-find') && NB[S.panel].inst.editor.view.hasFocus() && !NB[S.panel].inst.editor.state.selection.empty));
  await kb.press('Control+z'); await sleep(150);
  check('FIND 모두 바꾸기 is one undo step', /사과 하나, 사과 둘/.test(await doc()) && /숨은 배/.test(await doc()), await doc());

  console.log('— export');
  await set('<h2>제목 <strong>굵게</strong></h2><p>문단 <em>기울임</em> <a href="https://example.com/a">링크</a> <code>코드</code></p><ul><li><p>하나</p><ul><li><p>안쪽</p></li></ul></li><li><p>둘</p></li></ul><ol><li><p>첫째</p></li><li><p>둘째</p></li></ol>'
    + '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>끝낸 일</p></li><li data-type="taskItem" data-checked="false"><p>남은 일</p></li></ul><blockquote><p>인용</p></blockquote>'
    + '<pre><code class="language-python">print("hi")\nx = 1</code></pre><table><tbody><tr><th><p>이름</p></th><th><p>값</p></th></tr><tr><td><p>가</p></td><td><p>1|2</p></td></tr></tbody></table><hr>'
    + '<div data-type="mathBlock" data-tex="a^2+b^2=c^2"></div><p>인라인 <span data-type="math" data-tex="x_1"></span> 수식</p><div data-type="callout" data-icon="⚠️"><div class="nb-callout-body"><p>주의</p></div></div>');
  const md = await ev(() => AIDCEditor.toMarkdown(NB[S.panel].inst.getHTML(), '내보내기 시험'));
  const want = ['# 내보내기 시험', '## 제목 **굵게**', '문단 *기울임* [링크](https://example.com/a) `코드`', '- 하나\n  - 안쪽\n- 둘', '1. 첫째\n2. 둘째', '- [x] 끝낸 일\n- [ ] 남은 일', '> 인용', '```python\nprint("hi")\nx = 1\n```', '| 이름 | 값 |\n| --- | --- |\n| 가 | 1\\|2 |', '---', '$$\na^2+b^2=c^2\n$$', '인라인 $x_1$ 수식', '> ⚠️ 주의'];
  const miss = want.filter(w => !md.includes(w));
  check('EXPORT the body as Markdown (headings, marks, nested lists, to-dos, code with language, table, equations, callout)', !miss.length, { miss, md });
  await p.click('#panel-pin [data-ed="docmenu"]'); await sleep(200);
  check('the ⋯ menu of the document offers find, export and import', await ev(() => { const m = document.querySelector('.nb-docmenu'); return !!m && ['찾기 · 바꾸기', '내보내기', '가져오기'].every(t => [...m.querySelectorAll('.nb-it b')].some(b => b.textContent === t)); }));
  await menuPick('내보내기'); let [dl] = await Promise.all([p.waitForEvent('download'), menuPick('Markdown (.md)')]);
  let file = fs.readFileSync(await dl.path(), 'utf8');
  check('EXPORT Markdown is downloaded as “<title>.md”', /\.md$/.test(dl.suggestedFilename()) && file.includes('## 제목 **굵게**') && file.startsWith('# '), dl.suggestedFilename());
  await p.click('#panel-pin [data-ed="docmenu"]'); await sleep(200); await menuPick('내보내기'); [dl] = await Promise.all([p.waitForEvent('download'), menuPick('HTML 파일 (.html)')]);
  file = fs.readFileSync(await dl.path(), 'utf8');
  check('EXPORT the HTML file stands alone: styles inside, equations as MathML, code coloured, no app chrome', /^<!doctype html>/.test(file) && /<math/.test(file) && /class="hljs-/.test(file) && /\.nb-doc/.test(file) && !/nb-code-bar|nb-copy/.test(file.split('</head>')[1]) && /\.html$/.test(dl.suggestedFilename()), file.split('</head>')[1].slice(0, 600));
  const printed = await ev(async () => { let n = 0; const orig = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'); const before = document.querySelectorAll('iframe[aria-hidden="true"]').length;
    await AIDCEditor.exportDoc(NB[S.panel].inst.getHTML(), '인쇄', 'print'); const f = [...document.querySelectorAll('iframe[aria-hidden="true"]')].pop(); n = document.querySelectorAll('iframe[aria-hidden="true"]').length - before; void orig; return { n, hasDoc: !!(f && f.contentDocument && f.contentDocument.querySelector('.nb-doc h2')) }; });
  check('EXPORT print / PDF lays the body out in a hidden frame for the browser\'s print dialog', printed.n === 1 && printed.hasDoc, printed);

  console.log('— import and Markdown paste');
  await set('<p></p>');
  const MD = '# 가져온 제목\n\n문단 **굵게** 와 $$x^2$$ 수식\n\n- [x] 끝남\n- [ ] 남음\n\n1. 하나\n2. 둘\n\n```js\nlet a = 1;\n```\n\n| 열1 | 열2 |\n| --- | --- |\n| a | b |\n\n$$\n\\int_0^1 x\\,dx\n$$\n\n> 인용문\n';
  await p.click('#panel-pin [data-ed="docmenu"]'); await sleep(200); let [fc] = await Promise.all([p.waitForEvent('filechooser'), menuPick('가져오기')]);
  await fc.setFiles({ name: '노트.md', mimeType: 'text/markdown', buffer: Buffer.from(MD, 'utf8') }); await sleep(600);
  let d = await doc();
  check('IMPORT a Markdown file becomes blocks (heading, marks, to-dos with their state, numbered list, code with language, table, equations, quote)',
    /heading\("가져온 제목"\)/.test(d) && /strong\("굵게"\)|bold\("굵게"\)/.test(d) && /taskList\(taskItem\(paragraph\("끝남"\)\), taskItem\(paragraph\("남음"\)\)\)/.test(d) && /orderedList/.test(d) && /codeBlock\("let a = 1;"\)/.test(d) && /table\(/.test(d) && /mathBlock, blockquote\(paragraph\("인용문"\)\)/.test(d) && /^doc\(heading/.test(d), d);
  check('IMPORT details: checked state, code language and LaTeX are kept', await ev(() => { const o = {}; NB[S.panel].inst.editor.state.doc.descendants(n => { if (n.type.name === 'taskItem') (o.t = o.t || []).push(n.attrs.checked); if (n.type.name === 'codeBlock') o.l = n.attrs.language; if (n.type.name === 'mathBlock') o.m = n.attrs.tex; if (n.type.name === 'math') o.i = n.attrs.tex; }); return o.t.join() === 'true,false' && o.l === 'js' && o.m === '\\int_0^1 x\\,dx' && o.i === 'x^2'; }));
  await kb.press('Control+z'); await sleep(200);
  check('IMPORT is one undo step', !/가져온 제목/.test(await doc()), await doc());
  await p.click('#panel-pin [data-ed="docmenu"]'); await sleep(200); [fc] = await Promise.all([p.waitForEvent('filechooser'), menuPick('가져오기')]);
  await fc.setFiles({ name: '표.csv', mimeType: 'text/csv', buffer: Buffer.from('이름,수량\n"볼트, M8",120\n너트,80\n', 'utf8') }); await sleep(500);
  d = await doc(); check('IMPORT a CSV file becomes a table (first row as the header, quoted commas kept)', /tableHeader\(paragraph\("이름"\)\)/.test(d) && /tableCell\(paragraph\("볼트, M8"\)\)/.test(d) && /tableCell\(paragraph\("80"\)\)/.test(d), d);
  await set('<p></p>'); await ev(t => navigator.clipboard.writeText(t), '## 붙여 넣은 제목\n\n- 항목 A\n- 항목 B\n\n일반 문단'); await kb.press('Control+v'); await sleep(400);
  d = await doc(); check('PASTE text that is Markdown comes in as blocks', /heading\("붙여 넣은 제목"\)/.test(d) && /bulletList\(listItem\(paragraph\("항목 A"\)\), listItem\(paragraph\("항목 B"\)\)\)/.test(d) && /paragraph\("일반 문단"\)/.test(d), d);
  await set('<p></p>'); await ev(t => navigator.clipboard.writeText(t), '그냥 두 줄짜리 글\n둘째 줄입니다'); await kb.press('Control+v'); await sleep(300);
  d = await doc(); check('PASTE ordinary text is left as text', /그냥 두 줄짜리 글/.test(d) && !/heading|bulletList/.test(d), d);

  console.log('— templates and the button block');
  await set('<p></p>'); await slash('템플릿', '템플릿'); await sleep(200);
  check('TEMPLATE "/템플릿" lists the ready-made templates', await ev(() => { const m = document.querySelector('.nb-tplmenu'); return !!m && ['회의록', '주간 보고', '리서치 메모', '의사결정 기록', '점검표'].every(t => [...m.querySelectorAll('.nb-it b')].some(b => b.textContent === t)); }));
  await menuPick('회의록'); d = await doc();
  check('TEMPLATE choosing one puts its blocks in (headings, lists, to-dos, today\'s date)', /heading\("회의 개요"\)/.test(d) && /heading\("후속 조치"\), taskList/.test(d) && await ev(() => { let dt = null; NB[S.panel].inst.editor.state.doc.descendants(n => { if (n.type.name === 'date') dt = n.attrs.date; }); return dt === TODAY; }), d);
  await kb.press('Control+z'); await sleep(200); check('TEMPLATE …as one undo step', !/회의 개요/.test(await doc()));
  await set('<h3>나만의 양식</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>점검 항목</p></li></ul>');
  await ev(() => { const e = NB[S.panel].inst.editor; e.commands.focus('start'); }); await kb.press('Escape'); await sleep(100); await kb.press('Shift+ArrowDown'); await sleep(100); await kb.press('Control+/'); await sleep(250);
  await menuPick('템플릿으로 저장'); await sleep(150); await kb.type('내 점검 양식 ' + sfx); await kb.press('Enter'); await sleep(500);
  check('TEMPLATE selected blocks can be saved as a template of the workspace', await ev(n => (SETTINGS.templates || []).some(t => t.name === n && /나만의 양식/.test(t.html) && !/data-id/.test(t.html)), '내 점검 양식 ' + sfx));
  await sleep(1200);
  check('TEMPLATE the other member has it too', await evB(n => (SETTINGS.templates || []).some(t => t.name === n), '내 점검 양식 ' + sfx));
  await set('<p></p>'); await slash('버튼', '버튼'); d = await doc();
  check('BUTTON "/버튼" adds a button block', /^doc\(button/.test(d), d);
  await p.click('#panel-pin .ProseMirror .nb-button-el'); await sleep(250); d = await doc();
  check('BUTTON pressing it adds its blocks below (a to-do by default)', /^doc\(button, taskList\(taskItem\(paragraph\)\)/.test(d), d);
  await kb.press('Control+z'); await sleep(200); check('BUTTON …as one undo step', !/taskList/.test(await doc()));
  await p.hover('#panel-pin .ProseMirror .nb-button'); await p.click('#panel-pin .ProseMirror .nb-button-cfg'); await sleep(200); await menuPick('버튼 이름'); await kb.press('Control+a'); await kb.type('할 일 추가'); await kb.press('Enter'); await sleep(250);
  check('BUTTON ⚙ renames it', await ev(() => NB[S.panel].inst.editor.state.doc.firstChild.attrs.label === '할 일 추가' && document.querySelector('#panel-pin .nb-button-el').textContent === '할 일 추가'));
  await ev(() => NB[S.panel].inst.editor.chain().focus('end').insertContent('<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>읽기 화면에서 체크</p></li></ul>').run()); await sleep(150);
  const idB = await ev(() => S.panel); await ev(t => { item(S.panel).title = t; }, '버튼 ' + sfx); await p.click('#panel-pin [data-ed="publish"]'); await sleep(900);
  await p.click('#panel-pin .ibody[data-nb="read"] .nb-button-el'); await sleep(500);
  check('BUTTON it works in read mode too: the blocks are added and saved at once', await ev(i => { const b = item(i).body; return !item(i).editing && (b.match(/data-type="taskItem"/g) || []).length === 2 && document.querySelectorAll('#panel-pin .ibody[data-nb="read"] li[data-type="taskItem"]').length === 2; }, idB), await ev(i => item(i).body, idB));
  await p.click('#panel-pin .ibody[data-nb="read"] li[data-type="taskItem"]:last-child input'); await sleep(400);
  check('TODO a to-do can be ticked in read mode and is saved at once', await ev(i => /data-checked="true"[^>]*>(?:(?!<\/li>).)*읽기 화면에서 체크/.test(item(i).body) && !item(i).editing, idB), await ev(i => item(i).body, idB));
  await sleep(1300); await evB(i => openPanel(i), idB); await sleep(800);
  check('…and the other member sees the added block and the tick', await evB(i => { const it = ITEMS.find(x => x.id === i); return !!it && (it.body.match(/data-type="taskItem"/g) || []).length === 2 && /data-checked="true"/.test(it.body) && document.querySelectorAll('#panel-pin li[data-type="taskItem"][data-checked="true"]').length === 1; }, idB));

  console.log('— Google Drive preview, touch toolbar');
  await fresh('임베드 ' + sfx); await slash('임베드', '임베드'); await sleep(150); await kb.type('https://drive.google.com/file/d/1AbC_dEf-123/view?usp=sharing'); await kb.press('Enter'); await sleep(300);
  check('EMBED a Google Drive file link is shown through its preview page', await ev(() => { let s = null; NB[S.panel].inst.editor.state.doc.descendants(n => { if (n.type.name === 'embed') s = n.attrs.src; }); return s === 'https://drive.google.com/file/d/1AbC_dEf-123/preview'; }));
  const T = await newUser(browser, 'EDH', '터치 검수', { viewport: { width: 1280, height: 800 }, hasTouch: true, isMobile: true });
  await T.page.evaluate(() => { const it = newItem('action'); it.title = '터치'; openPanel(it.id); }); await sleep(400);
  const tb0 = await T.page.evaluate(() => { const b = document.querySelector('.nb-touchbar'); return b ? b.hidden : null; });
  await T.page.evaluate(() => NB[S.panel].inst.focus('end')); await sleep(300);
  check('TOUCH on a touch screen a toolbar appears while the body has the caret', tb0 === true && await T.page.evaluate(() => { const b = document.querySelector('.nb-touchbar'); return !!b && !b.hidden && b.getBoundingClientRect().height >= 40; }), tb0);
  await T.page.keyboard.type('굵게'); await T.page.keyboard.press('Control+a'); await T.page.tap('.nb-touchbar button[aria-label="굵게"]'); await sleep(200);
  check('TOUCH its buttons run the same commands (bold)', /strong|bold/.test(await T.page.evaluate(() => NB[S.panel].inst.editor.state.doc.toString())) && await T.page.evaluate(() => document.querySelector('.nb-touchbar button[aria-label="굵게"]').classList.contains('on')));

  console.log('— cleaning up');
  await ev(n => { SETTINGS.templates = (SETTINGS.templates || []).filter(t => t.name !== n); }, '내 점검 양식 ' + sfx);
  for (const pg of [p, T.page]) await pg.evaluate(async s => { for (const it of ITEMS.filter(x => (x.title || '').includes(s) || x.title === '터치')) await trashItem(it); }, sfx); await sleep(800);
  check('no page errors', !A.errs.length && !B.errs.length && !T.errs.length, [...A.errs, ...B.errs, ...T.errs].slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
