// Body editor v2 — editing one body together: joining, live changes and carets, undo of one's own change, saving in turn,
// leaving, an edit that cannot be shared, a dropped connection.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'EDM', '첫째 편집'); const B = await newUser(browser, 'EDN', '둘째 편집'); const p = A.page, q = B.page;
  const ev = (f, a) => p.evaluate(f, a); const evB = (f, a) => q.evaluate(f, a);
  const docOf = pg => pg.evaluate(() => { const r = NB[S.panel]; return r && r.inst ? r.inst.editor.state.doc.toString() : null; });
  const jsonOf = pg => pg.evaluate(() => JSON.stringify(NB[S.panel].inst.getJSON()));
  const toastOf = pg => pg.evaluate(() => { const t = document.querySelector('#toast'); return t.classList.contains('on') ? t.textContent : ''; });
  const until = async (f, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(120); } return false; };
  const api = (pg, path) => pg.evaluate(async u => { const r = await apiFetch(u); return { status: r.status, body: await r.json().catch(() => null) }; }, path);
  const typeAtEnd = async (pg, nth, text) => { await pg.evaluate(n => { const e = NB[S.panel].inst.editor; let pos = 0; for (let i = 0; i < n; i++) pos += e.state.doc.child(i).nodeSize; e.chain().focus().setTextSelection(pos + e.state.doc.child(n).nodeSize - 1).run(); }, nth); await pg.waitForFunction(() => NB[S.panel].inst.editor.view.hasFocus()); await pg.keyboard.type(text, { delay: 15 }); };

  const id = await ev(t => { const it = newItem('research'); it.title = t; openPanel(it.id); return it.id; }, '함께 수정 ' + sfx); await sleep(350);
  await ev(() => { NB[S.panel].inst.editor.commands.setContent('<p>첫 문단</p><p>둘째 문단</p>'); }); await sleep(150); await p.click('#panel-pin [data-ed="publish"]'); await sleep(1000);

  console.log('— joining');
  await p.click('#panel-pin [data-ed="edit"]');
  await p.locator('#panel-pin .ProseMirror[contenteditable="true"]').waitFor();
  check('alone, the editor is the plain one (no shared document)', await ev(() => !!NB[S.panel] && !NB[S.panel].session && !NB[S.panel].inst.collab));
  await sleep(600); await evB(i => openPanel(i), id); await sleep(700);
  check('CO another member sees who is editing and a “함께 수정” button', await evB(() => { const h = document.querySelector('#panel-pin .ihead'); return /첫째 편집님이 수정 중입니다/.test(h.textContent) && !!h.querySelector('[data-ed="join"]'); }), await evB(() => document.querySelector('#panel-pin .ihead').textContent));
  await q.click('#panel-pin [data-ed="join"]');
  const joined = await until(() => evB(() => { const r = NB[S.panel]; return !!(r && r.session && r.session.synced && r.inst.editor.isEditable); }));
  check('CO joining opens the same document for the second member', joined && /paragraph\("첫 문단"\), paragraph\("둘째 문단"\)/.test(await docOf(q)), await docOf(q));
  check('CO the first editor\'s page turned its document into the shared one and says who joined', await ev(i => !!NB[i].session && item(i)._co === 'host' && NB[i].inst.editor.isEditable, id) && /둘째 편집님이 함께 수정을 시작했습니다/.test(await toastOf(p)), await toastOf(p));
  check('CO block ids are the same on both sides', (await jsonOf(p)) === (await jsonOf(q)));

  console.log('— typing at the same time');
  await Promise.all([typeAtEnd(p, 0, ' 첫째가 씀'), typeAtEnd(q, 1, ' 둘째가 씀')]);
  const same1 = await until(async () => (await docOf(p)) === (await docOf(q)) && /첫째가 씀/.test(await docOf(q)) && /둘째가 씀/.test(await docOf(p)));
  check('CO both see both changes, and the two documents are identical', same1, [await docOf(p), await docOf(q)]);
  check('CO nothing typed is lost (leading spaces included)', /첫 문단 첫째가 씀/.test(await docOf(p)) && /둘째 문단 둘째가 씀/.test(await docOf(p)), await docOf(p));
  check('CO each sees the other\'s caret with their name', await until(async () => await ev(() => [...document.querySelectorAll('#panel-pin .nb-caret-name')].some(n => n.textContent === '둘째 편집')) && await evB(() => [...document.querySelectorAll('#panel-pin .nb-caret-name')].some(n => n.textContent === '첫째 편집'))));
  check('CO the header names who edits along', await ev(() => /둘째 편집님과 함께 수정 중/.test(document.querySelector('#panel-pin .nb-co').textContent)) && await evB(() => /첫째 편집님과 함께 수정 중/.test(document.querySelector('#panel-pin .nb-co').textContent)));
  await sleep(700); await p.keyboard.press('Control+z'); await sleep(500);
  check('CO undo takes back only one\'s own typing', await until(async () => { const d = await docOf(q); return !/첫째가 씀/.test(d) && /둘째가 씀/.test(d) && d === await docOf(p); }), await docOf(q));
  await p.keyboard.press('Control+Shift+z'); await sleep(400);
  await q.keyboard.press('Enter'); await q.keyboard.type('/'); await sleep(150); await q.keyboard.type('제목1'); await sleep(250); await q.keyboard.press('Enter'); await sleep(200); await q.keyboard.type('둘째가 만든 제목'); await sleep(300);
  check('CO a block added by one appears for the other, with the same id', await until(async () => /heading\("둘째가 만든 제목"\)/.test(await docOf(p)) && (await jsonOf(p)) === (await jsonOf(q))), [await docOf(p), await docOf(q)]);
  await Promise.all([(async () => { for (let i = 0; i < 12; i++) await p.keyboard.type('가'); })(), (async () => { for (let i = 0; i < 12; i++) await q.keyboard.type('나'); })()]);
  check('CO after a burst of interleaved typing the documents still agree', await until(async () => (await docOf(p)) === (await docOf(q)) && /가{12}/.test(await docOf(p)) && /나{12}/.test(await docOf(p))), [await docOf(p), await docOf(q)]);

  console.log('— a dropped connection');
  await evB(() => sharedSocket.close()); await sleep(200); await typeAtEnd(q, 1, ' 끊긴 동안'); await typeAtEnd(p, 0, ' 그 사이');
  check('CO what was typed while one connection was down arrives on both sides once it is back', await until(async () => (await docOf(p)) === (await docOf(q)) && /끊긴 동안/.test(await docOf(p)) && /그 사이/.test(await docOf(q)), 12000), [await docOf(p), await docOf(q)]);

  console.log('— saving in turn');
  const before = await docOf(p);
  await p.click('#panel-pin [data-ed="save"]'); await sleep(1300);
  check('CO the first editor saves: the body holds everybody\'s text', await ev(i => { const b = item(i).body; return !item(i).editing && /첫째가 씀/.test(b) && /둘째가 씀/.test(b) && /끊긴 동안/.test(b) && /둘째가 만든 제목/.test(b) && item(i).ed === 2; }, id));
  check('CO the second member keeps editing, now holds the lock, and still has the document', await evB(i => item(i).editing && !!NB[i] && NB[i].inst.editor.isEditable && sharedLocks['item:' + i] && sharedLocks['item:' + i].employee === 'EDN', id) && (await docOf(q)) === before);
  check('CO …and what was saved is the base of their own save', await evB(i => sharedBase['item:' + i].body === item(i)._editOriginal.body && /첫째가 씀/.test(sharedBase['item:' + i].body), id));
  await typeAtEnd(q, 0, ' 마지막 한마디'); await q.click('#panel-pin [data-ed="save"]'); await sleep(1400);
  check('CO the second save goes through without a conflict', await evB(i => !item(i).editing && /마지막 한마디/.test(item(i).body) && /첫째가 씀/.test(item(i).body), id) && !/겹쳐|보관/.test(await toastOf(q)), await toastOf(q));
  check('CO the first editor sees the final body', await until(() => ev(i => /마지막 한마디/.test(item(i).body), id)));
  const vs = (await api(p, '/api/versions?item=' + id)).body.versions;
  check('CO each save is in the version history under its member', vs.length >= 2 && vs[0].employee === 'EDN' && vs[1].employee === 'EDM', vs.map(v => v.employee));
  await ev(i => openPanel(i), id); await sleep(300); await p.click('#panel-pin [data-ed="edit"]'); await sleep(600);
  check('CO once everybody has left, the next edit starts alone again from the saved body', await ev(i => !!NB[i] && !NB[i].session && /마지막 한마디/.test(NB[i].inst.editor.state.doc.toString()), id));

  console.log('— leaving without saving');
  await sleep(500); await evB(i => openPanel(i), id); await sleep(600); await q.click('#panel-pin [data-ed="join"]');
  await until(() => evB(() => { const r = NB[S.panel]; return !!(r && r.session && r.session.synced); }));
  await typeAtEnd(q, 0, ' 취소한 글'); await until(async () => /취소한 글/.test(await docOf(p)));
  await q.click('#panel-pin [data-ed="cancel"]'); await sleep(900);
  check('CO 취소 by the member who joined: they leave and are told their typing stays with the others', await evB(i => !item(i).editing && !NB[i], id) && /다른 멤버의 화면에 남아/.test(await toastOf(q)) && /취소한 글/.test(await docOf(p)), await toastOf(q));
  check('CO the first editor goes on alone in the same document', await ev(i => item(i).editing && !!NB[i].session && NB[i].inst.editor.isEditable && !(sharedLocks['item:' + i].co || []).length, id));
  const saved = await ev(i => sharedBase['item:' + i].body, id);
  await p.click('#panel-pin [data-ed="cancel"]'); await sleep(1200);
  check('CO 취소 by the last editor: nothing of the session is saved', await ev(([i, b]) => !item(i).editing && item(i).body === b && !/취소한 글/.test(item(i).body), [id, saved]) && await evB(([i, b]) => item(i).body === b, [id, saved]));

  console.log('— an edit that cannot be shared');
  const seedId = await ev(() => { const x = ITEMS.find(y => isPub(y) && !y.arch && y.body && !y.ed && y.id !== NB_TRIAL && !otherLock('item:' + y.id)); return x && x.id; });
  check('(a first-editor body to try this on)', !!seedId, seedId);
  await ev(i => { localStorage.setItem('aidc-editor', 'v1'); openPanel(i); }, seedId); await sleep(400); await p.click('#panel-pin [data-ed="edit"]'); await sleep(600);
  await sleep(500); await evB(i => openPanel(i), seedId); await sleep(700); await q.click('#panel-pin [data-ed="join"]'); await sleep(1800);
  check('CO an edit made with the first editor cannot be joined: the request is undone and says so', await evB(i => !item(i).editing && !NB[i], seedId) && /함께 수정할 수 없는 글/.test(await toastOf(q)) && await ev(i => item(i).editing && !NB[i], seedId), await toastOf(q));
  await p.click('#panel-pin [data-ed="cancel"]'); await sleep(700); await ev(() => localStorage.removeItem('aidc-editor'));
  check('CO …and the co-lock is given back', await until(() => ev(i => !sharedLocks['item:' + i], seedId)));

  console.log('— cleaning up');
  await ev(async s => { for (const it of ITEMS.filter(x => (x.title || '').includes(s))) await trashItem(it); }, sfx); await sleep(900);
  check('no page errors', !A.errs.length && !B.errs.length, [...A.errs, ...B.errs].slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
