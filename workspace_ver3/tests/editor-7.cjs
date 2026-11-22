// Body editor v2 — suggesting changes ("제안 모드"): what is typed stays as an insertion, what is deleted is struck through,
// each suggestion can be accepted or rejected.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'EDP', '제안 검수'); const B = await newUser(browser, 'EDQ', '둘째 제안'); const p = A.page, q = B.page; const kb = p.keyboard;
  const cdp = await A.ctx.newCDPSession(p);
  const ev = (f, a) => p.evaluate(f, a);
  const html = () => ev(() => NB[S.panel].inst.getHTML().replace(/ data-id="[^"]*"/g, ''));
  const text = () => ev(() => NB[S.panel].inst.editor.state.doc.textBetween(0, NB[S.panel].inst.editor.state.doc.content.size, '\n'));
  const menuPick = async label => { await p.click(`.nb-pop .nb-it:has(b:text-is("${label}"))`); await sleep(220); };
  const sel = async (from, to) => { await ev(([a, b]) => { NB[S.panel].inst.editor.chain().focus().setTextSelection({ from: a, to: b == null ? a : b }).run(); }, [from, to]); await p.waitForFunction(() => NB[S.panel].inst.editor.view.hasFocus()); await sleep(60); };
  const find = (s, nth) => ev(([x, n]) => { const d = NB[S.panel].inst.editor.state.doc; let hit = -1, k = 0; d.descendants((node, pos) => { if (hit >= 0 || !node.isTextblock) return hit < 0; const i = node.textContent.indexOf(x); if (i >= 0 && k++ === (n || 0)) hit = pos + 1 + i; return false; }); return hit; }, [s, nth]);
  const today = await ev(() => TODAY);

  const id = await ev(t => { const it = newItem('research'); it.title = t; openPanel(it.id); return it.id; }, '제안 ' + sfx); await sleep(350);
  await ev(() => { NB[S.panel].inst.editor.commands.setContent('<p>원래 문장입니다.</p><p>둘째 줄</p>'); }); await sleep(150); await p.click('#panel-pin [data-ed="publish"]'); await sleep(900);
  await p.click('#panel-pin [data-ed="edit"]'); await sleep(500);

  console.log('— turning it on, typing');
  await p.click('#panel-pin [data-ed="docmenu"]'); await sleep(250); await menuPick('제안 모드'); await sleep(200);
  check('SUG the ⋯ menu turns suggesting on; a bar says so', await ev(() => NB[S.panel].inst.suggesting() && !document.querySelector('#panel-pin .nb-sg-bar').hidden));
  let at = await find('입니다.'); await sel(at + 4); await kb.type(' 추가한 말'); await sleep(200);
  check('SUG typed text stays as an insertion with who and when', (await html()).includes(`<p>원래 문장입니다.<ins class="nb-ins" data-by="EDP" data-at="${today}"> 추가한 말</ins></p>`), await html());
  await kb.press('Backspace'); await kb.press('Backspace'); await sleep(150);
  check('SUG deleting one\'s own suggested text really removes it', (await html()).includes(`<ins class="nb-ins" data-by="EDP" data-at="${today}"> 추가한</ins></p>`) && !(await html()).includes('<del'), await html());
  await cdp.send('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 1, selectionEnd: 1 }); await sleep(40); await cdp.send('Input.imeSetComposition', { text: '하', selectionStart: 1, selectionEnd: 1 }); await sleep(40); await cdp.send('Input.imeSetComposition', { text: '한', selectionStart: 1, selectionEnd: 1 }); await sleep(40); await cdp.send('Input.insertText', { text: '한' }); await sleep(150);
  check('SUG Korean composition works while suggesting (the syllable is one insertion, nothing doubled)', /추가한한<\/ins><\/p>/.test(await html()) && (await text()).startsWith('원래 문장입니다. 추가한한\n'), await html());

  console.log('— deleting and replacing');
  at = await find('문장'); await sel(at, at + 2); await kb.press('Delete'); await sleep(150);
  check('SUG deleting existing text only strikes it through', (await html()).includes(`원래 <del class="nb-del" data-by="EDP" data-at="${today}">문장</del>입니다.`) && (await text()).startsWith('원래 문장입니다.'), await html());
  at = await find('원래'); await sel(at, at + 2); await kb.type('기존'); await sleep(200);
  check('SUG typing over a selection: the old words are struck, the new ones inserted after them', (await html()).includes(`<p><del class="nb-del" data-by="EDP" data-at="${today}">원래</del><ins class="nb-ins" data-by="EDP" data-at="${today}">기존</ins> <del`), await html());
  at = await find('둘째 줄'); await sel(at + 4); await kb.press('Backspace'); await sleep(120); await kb.press('Backspace'); await sleep(150);
  check('SUG Backspace walks left through existing text, striking it', /<p>둘째<del class="nb-del"[^>]*> 줄<\/del><\/p>/.test(await html()) && await ev(() => { const s = NB[S.panel].inst.editor.state.selection; return s.empty && s.$from.parentOffset === 2; }), await html());
  await ev(t => navigator.clipboard.writeText(t), '붙여 넣은 말'); await kb.press('Control+v'); await sleep(250);
  check('SUG pasted text is an insertion too', /둘째<ins class="nb-ins"[^>]*>붙여 넣은 말<\/ins><del/.test(await html()), await html());
  const before = await html(); await kb.press('Control+z'); await sleep(200);
  check('SUG a suggestion is an ordinary undo step', !(await html()).includes('붙여 넣은 말') && (await html()) !== before, await html());
  await kb.press('Control+Shift+z'); await sleep(200);
  await kb.press('Enter'); await kb.type('새 줄'); await sleep(200);
  check('SUG a new block is made directly; the text typed in it is an insertion', /<p><ins class="nb-ins"[^>]*>새 줄<\/ins><del class="nb-del"[^>]*> 줄<\/del><\/p>/.test(await html()), await html());
  check('the ⋯ menu counts the open suggestions', await (async () => { await p.click('#panel-pin [data-ed="docmenu"]'); await sleep(250); const t = await ev(() => [...document.querySelectorAll('.nb-docmenu .nb-it b')].map(b => b.textContent)); await kb.press('Escape'); await sleep(150); return t.some(x => /^제안 7건$/.test(x)); })(), await ev(() => NB[S.panel].inst.getHTML()));

  console.log('— accepting and rejecting');
  await p.click('#panel-pin .ProseMirror ins:has-text("기존")'); await sleep(250);
  check('SUG clicking a suggestion says whose it is and offers 수락 / 거절', await ev(() => { const m = document.querySelector('.nb-sgmenu'); return !!m && /삽입 제안 — 제안 검수/.test(m.textContent) && m.querySelectorAll('.nb-it').length === 2; }));
  await menuPick('수락'); check('SUG accepting an insertion keeps the text as ordinary text', /<\/del>기존 <del/.test(await html()), await html());
  await p.click('#panel-pin .ProseMirror del:has-text("원래")'); await sleep(250); await menuPick('수락');
  check('SUG accepting a deletion removes the text', (await html()).startsWith('<p>기존 <del') && !(await text()).includes('원래'), await html());
  await p.click('#panel-pin .ProseMirror del:has-text("문장")'); await sleep(250); await menuPick('거절');
  check('SUG rejecting a deletion leaves the text as it was', (await html()).startsWith('<p>기존 문장입니다.<ins'), await html());
  await p.click('#panel-pin .ProseMirror ins:has-text("추가한한")'); await sleep(250); await menuPick('거절');
  check('SUG rejecting an insertion takes the text out', (await html()).startsWith('<p>기존 문장입니다.</p>'), await html());
  await p.click('#panel-pin [data-ed="save"]'); await sleep(1000);
  check('SUG suggestions that are still open are saved with the body and shown when read', await ev(i => /<ins class="nb-ins" data-by="EDP"/.test(item(i).body) && /<del class="nb-del" data-by="EDP"/.test(item(i).body) && /삽입 제안 — 제안 검수/.test((document.querySelector('#panel-pin .ibody[data-nb="read"] ins.nb-ins') || {}).title || ''), id));
  await sleep(1000); await q.evaluate(i => openPanel(i), id); await sleep(700);
  check('SUG another member sees them', await q.evaluate(() => { const d = document.querySelector('#panel-pin .ibody[data-nb="read"]'); return !!d && d.querySelectorAll('ins.nb-ins').length === 2 && d.querySelectorAll('del.nb-del').length === 1; }));
  await q.click('#panel-pin [data-ed="edit"]'); await sleep(500); await q.click('#panel-pin [data-ed="docmenu"]'); await sleep(250); await q.click('.nb-pop .nb-it:has(b:text-is("제안 3건"))'); await sleep(220); await q.click('.nb-pop .nb-it:has(b:text-is("모두 수락"))'); await sleep(300);
  check('SUG the other member accepts them all at once', await q.evaluate(() => { const h = NB[S.panel].inst.getHTML(); return !/<ins|<del/.test(h) && />둘째붙여 넣은 말<\/p>/.test(h) && />새 줄<\/p>/.test(h); }), await q.evaluate(() => NB[S.panel].inst.getHTML()));
  await q.keyboard.press('Control+z'); await sleep(200);
  check('SUG …and can take that back in one step', await q.evaluate(() => (NB[S.panel].inst.getHTML().match(/<ins|<del/g) || []).length === 3));
  await q.click('#panel-pin [data-ed="cancel"]'); await sleep(600);

  console.log('— turning it off');
  await p.click('#panel-pin [data-ed="edit"]'); await sleep(500);
  check('SUG a new edit starts with suggesting off', await ev(() => !NB[S.panel].inst.suggesting() && document.querySelector('#panel-pin .nb-sg-bar').hidden));
  at = await find('기존'); await sel(at + 2); await kb.type('의'); await sleep(150);
  check('SUG without the mode typing is plain again', (await html()).startsWith('<p>기존의 문장입니다.</p>'), await html());
  await p.click('#panel-pin [data-ed="cancel"]'); await sleep(500);

  console.log('— cleaning up');
  await ev(async s => { for (const it of ITEMS.filter(x => (x.title || '').includes(s))) await trashItem(it); }, sfx); await sleep(800);
  check('no page errors', !A.errs.length && !B.errs.length, [...A.errs, ...B.errs].slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
