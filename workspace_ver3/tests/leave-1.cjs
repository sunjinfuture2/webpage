// Leaving something that is being edited: nothing is asked, it is saved on the way out (owner, 2026-11-18).
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'LVA', '저장 검수1'); const p = A.page; const kb = p.keyboard;
  const B = await newUser(browser, 'LVB', '저장 검수2');
  const ev = (f, a) => p.evaluate(f, a);
  const stamp = Date.now().toString(36);
  const dlg = () => ev(() => !!document.querySelector('#dlg'));
  const toastText = () => ev(() => { const t = document.querySelector('#toast'); return t.classList.contains('on') ? t.textContent : ''; });
  const make = async title => { const id = await ev(t => { const it = newItem('action'); openPanel(it.id); return it.id; }, title); await sleep(300);
    await p.click('#panel-pin .ititle'); await kb.type(title); await p.click('#panel-pin [data-ed="publish"]'); await sleep(500); return id; };

  console.log('— an existing item');
  const id = await make('나가기 검수 ' + stamp);
  await p.click('#panel-pin [data-ed="edit"]'); await sleep(400); await p.click('#panel-pin .ProseMirror'); await kb.type('닫으면 저장되는 문장'); await sleep(150);
  await p.click('#panel-close'); await sleep(300);
  check('closing the panel while editing asks nothing', !(await dlg()));
  check('the panel is closed', await ev(() => !S.panel));
  check('a toast says it was saved and offers 되돌리기', /저장했습니다\.되돌리기$/.test(await toastText()), await toastText());
  check('the body is saved and the item is no longer being edited', await ev(i => { const it = item(i); return !it.editing && /닫으면 저장되는 문장/.test(it.body) && it.ed === 2; }, id));
  await sleep(1200);
  check('another member sees the saved text', await B.page.evaluate(i => { const it = ITEMS.find(x => x.id === i); return !!it && /닫으면 저장되는 문장/.test(it.body || ''); }, id));
  await ev(i => openPanel(i), id); await sleep(300); await p.click('#panel-pin [data-ed="edit"]'); await sleep(400); await p.click('#panel-pin .ProseMirror'); await kb.press('Control+End'); await kb.type(' 그리고 실수'); await sleep(120);
  await p.click('#panel-close'); await sleep(250);
  await p.click('#toast button'); await sleep(400);
  check('되돌리기 puts back what was there before the edit', await ev(i => { const b = item(i).body; return /닫으면 저장되는 문장/.test(b) && !/실수/.test(b); }, id), await ev(i => item(i).body, id));
  await sleep(1200);
  check('…for the other member too', await B.page.evaluate(i => { const b = ITEMS.find(x => x.id === i).body || ''; return /닫으면 저장되는 문장/.test(b) && !/실수/.test(b); }, id));

  console.log('— nothing changed');
  const mod0 = await ev(i => item(i).updatedAt, id);
  await ev(i => openPanel(i), id); await sleep(300); await p.click('#panel-pin [data-ed="edit"]'); await sleep(400); await p.click('#panel-close'); await sleep(300);
  check('leaving without a change saves nothing and shows no toast about saving', !(await dlg()) && !/저장/.test(await toastText()) && await ev(([i, m]) => item(i).updatedAt === m, [id, mod0]));

  console.log('— moving elsewhere');
  await ev(i => openPanel(i), id); await sleep(300); await p.click('#panel-pin [data-ed="edit"]'); await sleep(400); await p.click('#panel-pin .ProseMirror'); await kb.press('Control+End'); await kb.type(' 이동'); await sleep(120);
  const other = await ev(i => { const x = ITEMS.find(y => y.id !== i && y.status === 'published' && (y.type === 'action' || y.type === 'research') && !y.agent && !y.arch); return x && x.id; }, id);
  await ev(i => openPanel(i), other); await sleep(350);
  check('opening another item saves the first one without a question', !(await dlg()) && await ev(([i, o]) => S.panel === o && /이동/.test(item(i).body) && !item(i).editing, [id, other]));
  await ev(i => openPanel(i), id); await sleep(300); await p.click('#panel-pin [data-ed="edit"]'); await sleep(400); await p.click('#panel-pin .ProseMirror'); await kb.press('Control+End'); await kb.type(' 메뉴'); await sleep(120);
  await ev(() => go('archive')); await sleep(350);
  check('going to another page saves it too', !(await dlg()) && await ev(i => S.page === 'archive' && /메뉴/.test(item(i).body) && !item(i).editing, id));
  await ev(i => { go('main'); openPanel(i); }, id); await sleep(350); await p.click('#panel-pin [data-ed="edit"]'); await sleep(400); await p.click('#panel-pin .ProseMirror'); await kb.press('Control+End'); await kb.type(' 뒤로'); await sleep(150);
  await p.goBack(); await sleep(500);
  check('the browser back button saves and goes back', !(await dlg()) && await ev(i => /뒤로/.test(item(i).body) && !item(i).editing, id));

  console.log('— Ctrl+S');
  await ev(i => { go('main'); openPanel(i); }, id); await sleep(350); await p.click('#panel-pin [data-ed="edit"]'); await sleep(400); await p.click('#panel-pin .ProseMirror'); await kb.press('Control+End'); await kb.type(' 단축키'); await kb.press('Control+s'); await sleep(350);
  check('Ctrl+S saves and leaves edit mode', await ev(i => S.panel === i && /단축키/.test(item(i).body) && !item(i).editing, id));

  console.log('— a new item');
  const n1 = await ev(() => { const it = newItem('action'); openPanel(it.id); return it.id; }); await sleep(300);
  await p.click('#panel-pin .ititle'); await kb.type('새 글 초안 ' + stamp); await p.click('#panel-close'); await sleep(300);
  check('a new item with a title becomes a draft, nothing is asked', !(await dlg()) && await ev(i => { const it = item(i); return !!it && it.status === 'draft'; }, n1));
  const n2 = await ev(() => { const it = newItem('action'); openPanel(it.id); return it.id; }); await sleep(300);
  await p.click('#panel-pin .ProseMirror'); await kb.type('제목 없이 쓴 본문'); await sleep(120); await p.click('#panel-close'); await sleep(300);
  check('a new item with only a body becomes the draft "제목 없음"', await ev(i => { const it = item(i); return !!it && it.status === 'draft' && it.title === '제목 없음' && /제목 없이 쓴 본문/.test(it.body); }, n2));
  const n3 = await ev(() => { const it = newItem('action'); openPanel(it.id); return it.id; }); await sleep(300); await p.click('#panel-close'); await sleep(250);
  check('an untouched new item is simply dropped', await ev(i => !ITEMS.some(x => x.id === i), n3));
  await sleep(900);
  check('drafts are not shown to the other member', await B.page.evaluate(([a, b]) => !ITEMS.some(x => (x.id === a || x.id === b) && typeof canSee === 'function' && canSee(x)), [n1, n2]));

  console.log('— a partner card and a project overview');
  const pid = await ev(() => { const x = PARTNERS.find(y => !y.trash); openPanel(x.id); return x.id; }); await sleep(300);
  await p.click('#panel-pin [data-ed="editpartner"]'); await sleep(250);
  const sk = await ev(() => { const e = [...document.querySelectorAll('#panel-pin [data-sk]')].find(x => !/^(name|url)$/.test(x.dataset.sk)); return e && e.dataset.sk; });
  const sk0 = await ev(([i, k]) => PARTNERS.find(x => x.id === i)[k], [pid, sk]);
  await p.click(`#panel-pin [data-sk="${sk}"]`); await kb.press('Control+End'); await kb.type(' 검수' + stamp); await p.click('#panel-close'); await sleep(300);
  check('closing a partner card that is being edited saves it, nothing is asked', !(await dlg()) && await ev(([i, k, t]) => !S.editSimple && !S.panel && String(PARTNERS.find(x => x.id === i)[k]).includes(t), [pid, sk, '검수' + stamp]));
  await ev(([i, k, v]) => { PARTNERS.find(x => x.id === i)[k] = v; }, [pid, sk, sk0]); await sleep(600);
  const proj = await ev(() => { const k = Object.keys(PROJECTS)[0]; go('project:' + k); return k; }); await sleep(500);
  await p.click('[data-editproj]'); await sleep(500);
  const pk = await ev(() => { const e = [...document.querySelectorAll('#proj-pw [data-k]')].find(x => x.dataset.k !== '__full' && x.isContentEditable && x.offsetParent); return e && e.dataset.k; });
  const snap = await ev(k => JSON.stringify([PROJECTS[k], PHEAD[k]]), proj);
  await p.click(`#proj-pw [data-k="${pk}"]`); await kb.press('Control+End'); await kb.type(' 검수' + stamp); await sleep(100);
  await ev(() => go('main')); await sleep(1500);
  check('leaving a project overview that is being edited saves it and moves on, nothing is asked', !(await dlg()) && await ev(([k, s, t]) => S.page === 'main' && !S.editProj && JSON.stringify([PROJECTS[k], PHEAD[k]]) !== s && JSON.stringify([PROJECTS[k], PHEAD[k]]).includes(t), [proj, snap, '검수' + stamp]));
  await ev(([k, s]) => { const [a, b] = JSON.parse(s); PROJECTS[k] = a; PHEAD[k] = b; }, [proj, snap]); await sleep(700);

  console.log('— cleaning up');
  for (const i of [id, n1, n2]) { await ev(async x => { const it = item(x); if (it) await trashItem(it); }, i); await sleep(250); }
  check('no page errors', !A.errs.length && !B.errs.length, [...A.errs, ...B.errs].slice(0, 3));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
