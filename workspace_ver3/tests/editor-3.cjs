// Body editor v2 — drag and drop, Korean composition (through the browser's IME channel), keyboard-only use, scaled layout, large bodies, repeated open / close.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const out = n => require('node:path').join(require('node:os').tmpdir(), 'aidc-editor-' + n + '.png');
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'EDE', '편집 검수3'); const p = A.page; const kb = p.keyboard;
  const ev = (f, a) => p.evaluate(f, a);
  const doc = () => ev(() => NB[S.panel || S.full].inst.editor.state.doc.toString());
  const fresh = async () => { await ev(() => { const it = newItem('action'); it.title = '검수'; openPanel(it.id); }); await sleep(350); await p.click('#panel-pin .ProseMirror'); await sleep(80); };
  const set = async h => { await ev(x => { const e = NB[S.panel].inst.editor; e.commands.setContent(x); e.commands.focus('start'); }, h); await sleep(120); };
  const rectOf = i => ev(k => { const e = NB[S.panel].inst.editor; let pos = 0; for (let n = 0; n < k; n++) pos += e.state.doc.child(n).nodeSize; const r = e.view.nodeDOM(pos).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, i);
  const grab = async i => { const r = await rectOf(i); await p.mouse.move(r.x + 40, r.y + Math.min(12, r.h / 2)); await sleep(150); const h = await ev(() => { const b = document.querySelector('.nb-handle .nb-h-drag').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await p.mouse.move(h.x, h.y); await sleep(60); await p.mouse.down(); return h; };

  console.log('— T17 drag and drop');
  await fresh(); await set('<p>하나</p><p>둘</p><p>셋</p><p>넷</p>');
  let h = await grab(0); let t = await rectOf(2); await p.mouse.move(h.x + 30, h.y + 20, { steps: 4 }); await p.mouse.move(t.x + 60, t.y + t.h - 2, { steps: 10 }); await sleep(150);
  check('MOVE-03 a line shows where the block will land', await ev(() => !!document.querySelector('.prosemirror-dropcursor-block')));
  await p.screenshot({ path: out('ed3-drag') }); await p.mouse.up(); await sleep(250);
  check('T17 dragging the first block below the third: 둘, 셋, 하나, 넷', (await doc()).startsWith('doc(paragraph("둘"), paragraph("셋"), paragraph("하나"), paragraph("넷")'), await doc());
  await kb.press('Control+z'); await sleep(150); check('MOVE-11 one undo puts it back', (await doc()).startsWith('doc(paragraph("하나"), paragraph("둘"), paragraph("셋"), paragraph("넷")'), await doc());
  await set('<p>밖</p><details open><summary>토글</summary><div data-type="detailsContent"><p>안</p></div></details><p>끝</p>');
  h = await grab(0); t = await ev(() => { const r = document.querySelector('.ProseMirror [data-type="detailsContent"] p').getBoundingClientRect(); return { x: r.left, y: r.top, h: r.height }; }); await p.mouse.move(h.x + 30, h.y + 20, { steps: 4 }); await p.mouse.move(t.x + 50, t.y + t.h - 2, { steps: 10 }); await sleep(120); await p.mouse.up(); await sleep(250);
  check('T17 dropping inside a toggle nests the block there', (await doc()).startsWith('doc(details(detailsSummary("토글"), detailsContent(paragraph("안"), paragraph("밖")))'), await doc());
  await set('<ul><li><p>가</p></li><li><p>나</p></li></ul><p>문단</p>');
  h = await ev(() => { const e = NB[S.panel].inst.editor; const li = e.view.dom.querySelector('li'); const r = li.getBoundingClientRect(); return { x: r.left + 30, y: r.top + 10 }; }); await p.mouse.move(h.x, h.y); await sleep(150);
  const hb = await ev(() => { const b = document.querySelector('.nb-handle .nb-h-drag').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await p.mouse.move(hb.x, hb.y); await p.mouse.down(); t = await rectOf(1); await p.mouse.move(hb.x + 30, hb.y + 30, { steps: 4 }); await p.mouse.move(t.x + 60, t.y + t.h - 1, { steps: 10 }); await sleep(120); await p.mouse.up(); await sleep(250);
  check('T17 a list item dragged out of its list stays a list item (wrapped in a list of the same kind)', /^doc\(bulletList\(listItem\(paragraph\("나"\)\)\), paragraph\("문단"\), bulletList\(listItem\(paragraph\("가"\)\)\)/.test(await doc()), await doc());
  await set('<p>왼쪽에 남을 긴 문단입니다. 폭이 충분해야 옆에 놓을 수 있습니다.</p><p>옆으로</p><p>아래</p>');
  h = await grab(1); t = await rectOf(0); await p.mouse.move(h.x + 30, h.y - 10, { steps: 4 }); await p.mouse.move(t.x + t.w - 12, t.y + t.h / 2, { steps: 10 }); await sleep(150);
  check('ADV-04 near the right edge a vertical line offers "side by side"', await ev(() => { const e = document.querySelector('.nb-edge'); return e && !e.hidden; }));
  await p.mouse.up(); await sleep(250);
  check('T23 dropping on the right edge makes two columns', (await doc()).startsWith('doc(columns(column(paragraph("왼쪽에 남을 긴 문단입니다. 폭이 충분해야 옆에 놓을 수 있습니다.")), column(paragraph("옆으로"))), paragraph("아래")'), await doc());
  const gap = await ev(() => { const c = document.querySelectorAll('.ProseMirror .nb-col'); const a = c[0].getBoundingClientRect(), b = c[1].getBoundingClientRect(); return { x: (a.right + b.left) / 2, y: a.top + 8, wa: a.width, wb: b.width }; });
  await p.mouse.move(gap.x, gap.y); await p.mouse.down(); await p.mouse.move(gap.x - 120, gap.y, { steps: 8 }); await sleep(120); await p.mouse.up(); await sleep(200);
  const cw = await ev(() => { const c = document.querySelectorAll('.ProseMirror .nb-col'); return [c[0].getBoundingClientRect().width, c[1].getBoundingClientRect().width, NB[S.panel].inst.getHTML()]; });
  check('T23 dragging the gap changes the widths and stores the ratio', cw[0] < gap.wa - 60 && cw[1] > gap.wb + 60 && /data-w="0\.\d+"/.test(cw[2]) && /data-w="1\.\d+"/.test(cw[2]), [cw[0], cw[1], gap.wa]);
  await ev(() => { const e = NB[S.panel].inst.editor; const n = e.state.doc.child(0).child(1); const pos = 1 + e.state.doc.child(0).child(0).nodeSize + 1; e.view.dispatch(e.state.tr.delete(pos + 1, pos + n.firstChild.nodeSize - 1)); }); await sleep(100);
  await p.screenshot({ path: out('ed3-columns') });

  console.log('— T02 / T03 Korean composition (IME events from the browser)');
  await set(''); const cdp = await p.context().newCDPSession(p);
  const compose = async steps => { for (const s of steps) { await cdp.send('Input.imeSetComposition', { text: s, selectionStart: s.length, selectionEnd: s.length }); await sleep(25); } await cdp.send('Input.insertText', { text: steps[steps.length - 1] }); await sleep(30); };
  await compose(['ㅎ', '호', '회']); await compose(['ㅇ', '으', '의']); await compose(['ㄹ', '로', '록']); await kb.press('Space'); await compose(['ㅈ', '자', '작']); await compose(['ㅅ', '서', '성']);
  check('T02 composing 회의록 작성: no doubled or split letters', (await doc()).startsWith('doc(paragraph("회의록 작성")'), await doc());
  await cdp.send('Input.imeSetComposition', { text: '갑', selectionStart: 1, selectionEnd: 1 }); await sleep(30); await cdp.send('Input.imeSetComposition', { text: '가', selectionStart: 1, selectionEnd: 1 }); await sleep(30); await cdp.send('Input.insertText', { text: '가' }); await sleep(40);
  check('T02 changing a final consonant during composition leaves one letter', (await doc()).startsWith('doc(paragraph("회의록 작성가")'), await doc());
  await set(''); await kb.type('/'); await sleep(200);
  await cdp.send('Input.imeSetComposition', { text: 'ㅍ', selectionStart: 1, selectionEnd: 1 }); await sleep(120); await cdp.send('Input.imeSetComposition', { text: '표', selectionStart: 1, selectionEnd: 1 }); await sleep(250);
  check('IME-02 the menu filters while a syllable is still being composed', await ev(() => [...document.querySelectorAll('.nb-slash .nb-it b')].map(b => b.textContent)[0]) === '표');
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Process', code: 'Enter', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 }); await sleep(120);
  check('T03 Enter that only confirms the syllable does not run the menu or add a line', !(await doc()).includes('table') && (await doc()).split('paragraph').length <= 3 && await ev(() => !!document.querySelector('.nb-slash')), await doc());
  await cdp.send('Input.insertText', { text: '표' }); await sleep(250); await kb.press('Enter'); await sleep(250);
  check('T03 the next Enter runs the command once', ((await doc()).match(/table\(/g) || []).length === 1 && !(await doc()).includes('/표'), await doc());

  console.log('— keyboard only (A11Y-02 / T54)');
  await set('<p>키보드만으로</p>'); await kb.press('Control+/'); await sleep(200);
  check('A11Y-02 Ctrl+/ opens the block menu and puts the focus in it', await ev(() => { const m = document.querySelector('.nb-blockmenu'); return !!m && document.activeElement === m && m.getAttribute('role') === 'menu'; }));
  await kb.press('ArrowDown'); await kb.press('ArrowRight'); await sleep(150); await kb.press('ArrowDown'); await kb.press('ArrowDown'); await sleep(60);
  check('A11Y-02 the active entry is announced (aria-activedescendant / aria-selected)', await ev(() => { const m = [...document.querySelectorAll('.nb-menu')].pop(); const a = m.querySelector('.nb-it.sel'); return !!a && a.getAttribute('aria-selected') === 'true' && a.getAttribute('role') === 'menuitem'; }));
  await kb.press('Enter'); await sleep(200);
  check('T54 arrow keys + Enter in the menu changed the block (제목 2) and focus returned to the text', (await doc()).startsWith('doc(heading("키보드만으로")') && await ev(() => NB[S.panel].inst.editor.view.hasFocus() && NB[S.panel].inst.editor.state.doc.firstChild.attrs.level === 2), await doc());
  await kb.press('Control+/'); await sleep(150); await kb.press('Escape'); await sleep(120);
  check('KEY-03 Esc closes the menu first, the panel stays', await ev(() => !document.querySelector('.nb-blockmenu') && !!S.panel));
  check('A11Y-01 the editing area has a role, a name and says it is multi-line', await ev(() => { const d = NB[S.panel].inst.editor.view.dom; return d.getAttribute('role') === 'textbox' && d.getAttribute('aria-multiline') === 'true' && !!d.getAttribute('aria-label'); }));

  console.log('— scaled layout (narrow window)');
  await p.setViewportSize({ width: 1280, height: 800 }); await sleep(500); await set('<p>좁은 화면의 첫 문단</p><p>둘째 문단입니다</p>');
  const z = await ev(() => LAYOUT.zoom); const r1 = await rectOf(1); await p.mouse.move(r1.x + 30, r1.y + r1.h / 2); await sleep(150);
  const hz = await ev(() => { const b = document.querySelector('.nb-handle').getBoundingClientRect(); const e = NB[S.panel].inst.editor.view.dom.getBoundingClientRect(); return { right: b.right, top: b.top, bottom: b.bottom, left: e.left, hidden: document.querySelector('.nb-handle').hidden }; });
  check('UI-05 with the page scaled (zoom ' + z.toFixed(2) + ') the handle still sits beside the hovered block', z < 1 && !hz.hidden && hz.right <= hz.left + 2 && hz.top >= r1.y - 6 && hz.bottom <= r1.y + r1.h + 10, [hz, r1]);
  await ev(() => { const e = NB[S.panel].inst.editor; e.commands.setTextSelection({ from: 1, to: 6 }); e.view.dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); }); await sleep(150);
  const bz = await ev(() => { const b = document.querySelector('.nb-bubble').getBoundingClientRect(); const e = NB[S.panel].inst.editor.view; const c = e.coordsAtPos(1); return { bottom: b.bottom, top: c.top, left: b.left, right: b.right, vw: innerWidth }; });
  check('UI-09 the toolbar floats just above the selection and inside the window', bz.bottom <= bz.top && bz.top - bz.bottom < 30 && bz.left >= 0 && bz.right <= bz.vw, bz);
  await p.setViewportSize({ width: 1920, height: 1080 }); await sleep(400);

  console.log('— T55 large body, T56 repeated use');
  const big = await ev(() => { let h = ''; for (let i = 0; i < 115; i++) { h += `<h2>${i + 1}장 사업 검토 항목</h2>`; for (let k = 0; k < 7; k++) h += `<p>판교 AI 데이터센터 개발 사업의 전력 인입과 냉각 방식, 수익 구조를 검토한 ${i}-${k}번째 문단입니다. <strong>굵은 글</strong>과 <a href="https://example.com/${i}">링크</a>가 섞여 있습니다. 수전 용량과 공사 일정에 따라 달라지며, 인허가와 계통 연계 협의 결과를 반영해 다음 회의에서 다시 확정합니다.</p>`; h += `<ul><li><p>항목 ${i}-1</p></li><li><p>항목 ${i}-2</p></li></ul>`; h += `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>할 일 ${i}</p></li></ul>`; if (i % 10 === 0) h += '<table><tbody><tr><th>구분</th><th>값</th></tr><tr><td>가</td><td>1</td></tr></tbody></table><details open><summary>접는 글</summary><div data-type="detailsContent"><p>안쪽</p></div></details>'; }
    const it = newItem('research'); it.title = '큰 문서'; it.body = h; it.ed = 2; it.status = 'draft'; window.__big = it.id; return { chars: h.replace(/<[^>]+>/g, '').length }; });
  const tOpen = await ev(() => { closePanel(true); const t0 = performance.now(); openPanel(window.__big, true); const t1 = performance.now(); const e = NB[window.__big].inst.editor; let blocks = 0; e.state.doc.descendants(n => { if (n.isBlock) blocks++; }); return { ms: t1 - t0, top: e.state.doc.childCount, blocks }; }); await sleep(300);
  check(`PERF-03 a body of ${tOpen.top} top-level blocks (${tOpen.blocks} blocks in all, ${big.chars.toLocaleString()} characters) is ready to edit in ${Math.round(tOpen.ms)} ms (target < 2000)`, tOpen.top >= 1000 && big.chars >= 100000 && tOpen.ms < 2000, tOpen);
  const typing = await ev(async () => { const e = NB[window.__big].inst.editor; e.commands.focus(600); const ts = []; for (let i = 0; i < 60; i++) { const t0 = performance.now(); e.view.dispatch(e.state.tr.insertText('가')); void e.view.dom.offsetHeight; ts.push(performance.now() - t0); await new Promise(r => setTimeout(r, 8)); } ts.sort((a, b) => a - b); const t1 = performance.now(); const html = NB[window.__big].inst.getHTML(); const t2 = performance.now(); const ch = NB[window.__big].inst.changed(); const t3 = performance.now(); return { p50: ts[30], p95: ts[56], max: ts[59], html: t2 - t1, changed: t3 - t2, len: html.length, ch }; });
  check(`PERF-02 typing in that body: p50 ${typing.p50.toFixed(1)} ms, p95 ${typing.p95.toFixed(1)} ms per letter incl. layout (target p95 < 50)`, typing.p95 < 50, typing);
  check(`PERF-05 writing the whole body out takes ${Math.round(typing.html)} ms and happens only on save / draft, not per key`, typing.html < 600 && typing.ch === true, typing);
  await kb.type(' /'); await sleep(250); const tSlash = await ev(async () => { const t0 = performance.now(); const e = NB[window.__big].inst.editor; e.view.dispatch(e.state.tr.insertText('h')); await new Promise(r => setTimeout(r, 0)); await new Promise(r => requestAnimationFrame(r)); return { ms: performance.now() - t0, n: document.querySelectorAll('.nb-slash .nb-it').length }; });
  check(`PERF-02 slash search result in ${Math.round(tSlash.ms)} ms (target < 100)`, tSlash.ms < 100 && tSlash.n > 0, tSlash);
  await kb.press('Escape'); await ev(() => { const it = ITEMS.find(x => x.id === window.__big); closePanel(true); const i = ITEMS.indexOf(it); if (i >= 0) ITEMS.splice(i, 1); }); await sleep(200);
  const leak = await ev(async () => { const before = { floats: document.querySelectorAll('.nb-float').length, pops: document.querySelectorAll('.nb-pop').length }; const it = newItem('action'); it.title = '반복'; for (let i = 0; i < 100; i++) { openPanel(it.id); NB[it.id].inst.editor.commands.insertContent('가'); closePanel(true); await new Promise(r => setTimeout(r, 2)); }
    openPanel(it.id); const one = { floats: document.querySelectorAll('.nb-float').length, editors: Object.keys(NB).length, pm: document.querySelectorAll('.ProseMirror').length, text: NB[it.id].inst.editor.state.doc.textContent.length }; closePanel(true); const i = ITEMS.indexOf(it); ITEMS.splice(i, 1); openPanel(newItem('action').id); const after = { floats: document.querySelectorAll('.nb-float').length, editors: Object.keys(NB).length }; return { before, one, after }; });
  check('T56 100 × open / type / close: one editor, one set of floating tools, nothing left behind, the text kept every time', leak.one.editors === 1 && leak.one.pm === 1 && leak.one.floats <= 6 && leak.one.text === 100 && leak.after.editors === 1 && leak.after.floats <= 6, leak);
  check('no script errors during the run', A.errs.length === 0, A.errs);
  await browser.close(); done();
})().catch(e => { console.error('crashed:', String(e && e.stack || e).slice(0, 1400)); process.exit(2); });
