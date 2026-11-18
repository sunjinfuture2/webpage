// Side panel <-> full page: the panel grows / shrinks instead of jumping, the full page has a button back to the panel,
// and the width handle stops at its limits without closing (or saving) anything.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'PNA', '패널 검수'); const p = A.page; const kb = p.keyboard;
  const ev = (f, a) => p.evaluate(f, a);
  const panelW = () => ev(() => Math.round(document.querySelector('#panel').getBoundingClientRect().width));
  const state = () => ev(() => ({ panel: S.panel, full: S.full, anim: document.querySelector('#app').classList.contains('panel-anim'), w: Math.round(document.querySelector('#panel').getBoundingClientRect().width), on: document.querySelector('#panel').classList.contains('on') }));
  const id = await ev(t => { const it = newItem('research'); it.title = t; openPanel(it.id); return it.id; }, '패널 ' + sfx); await sleep(350);
  await ev(() => { NB[S.panel].inst.editor.commands.setContent('<p>첫 문단</p>' + '<p>줄</p>'.repeat(40)); }); await sleep(150); await p.click('#panel-pin [data-ed="publish"]'); await sleep(900);
  const w0 = await panelW(); const mainW = await ev(() => document.querySelector('#main').clientWidth);

  console.log('— growing into the full page');
  await p.click('#panel-expand'); await sleep(110);
  const mid = await state();
  check('EXPAND pressing “전체 페이지로 열기” grows the panel (still the panel, wider, mid-way)', mid.panel === id && !mid.full && mid.anim && mid.w > w0 + 20 && mid.w < mainW, { mid, w0, mainW });
  const widths = []; for (let i = 0; i < 4; i++) { widths.push(await panelW()); await sleep(35); }
  check('EXPAND the width keeps increasing while it runs', widths.every((w, i) => !i || w >= widths[i - 1]), widths);
  await sleep(450); const end = await state();
  check('EXPAND it ends as the full page; the panel is put away at its usual width', end.full === id && !end.panel && !end.anim && !end.on && await ev(() => document.querySelector('#page-item').classList.contains('on') && getComputedStyle(document.querySelector('#app')).getPropertyValue('--panelw').trim() === '1031.9px' && !document.querySelector('#panel-pin').style.marginLeft));
  check('SHRINK the full page shows a “패널로 좁히기” button with an icon', await ev(() => { const b = document.querySelector('#full-shrink'); const r = b.getBoundingClientRect(); return getComputedStyle(b).display !== 'none' && r.width > 90 && r.height >= 28 && /패널로 좁히기/.test(b.textContent) && !!b.querySelector('svg'); }));

  console.log('— shrinking back');
  await p.click('#full-shrink'); await sleep(110);
  const mid2 = await state();
  check('SHRINK pressing it brings the panel back from full size, narrowing', mid2.panel === id && !mid2.full && mid2.anim && mid2.on && mid2.w > w0 + 20, { mid2, w0 });
  await sleep(550); const end2 = await state();
  check('SHRINK it ends as the panel at its usual width', end2.panel === id && !end2.full && !end2.anim && Math.abs(end2.w - w0) <= 1 && await ev(() => !document.querySelector('#panel-pin').style.marginLeft && !!document.querySelector('#panel-pin [data-ed="edit"]')), { end2, w0 });

  console.log('— while editing');
  await p.click('#panel-pin [data-ed="edit"]'); await sleep(450); await ev(() => NB[S.panel].inst.focus('end')); await kb.type('확장 전 입력'); await sleep(100);
  await p.click('#panel-expand'); await sleep(650);
  const st1 = await ev(i => ({ full: S.full === i, editing: !!item(i).editing, same: !!NB[i] && !!NB[i].inst.wrap.closest('#item-pin'), text: !!NB[i] && /확장 전 입력/.test(NB[i].inst.editor.state.doc.toString()), dlg: !!document.querySelector('#dlg'), saved: /확장 전 입력/.test((sharedBase['item:' + i] || {}).body || '') }), id);
  check('EXPAND an edit goes along into the full page (same editor and text, still being edited, nothing saved or asked)', st1.full && st1.editing && st1.same && st1.text && !st1.dlg && !st1.saved, st1);
  check('EXPAND the caret stays in the body, so typing simply goes on', await ev(i => NB[i].inst.editor.view.hasFocus(), id));
  await kb.type(' 그리고 후'); await p.click('#full-shrink'); await sleep(750);
  check('SHRINK …and back into the panel', await ev(i => S.panel === i && item(i).editing && NB[i].inst.wrap.closest('#panel-pin') && /확장 전 입력 그리고 후/.test(NB[i].inst.editor.state.doc.toString()), id));

  console.log('— the width handle');
  const handle = async () => ev(() => { const r = document.querySelector('#panel-resize').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 300 }; });
  let h = await handle(); await p.mouse.move(h.x, h.y); await p.mouse.down(); await p.mouse.move(h.x + 300, h.y + 20, { steps: 8 }); await p.mouse.move(h.x + 700, h.y + 40, { steps: 8 }); await sleep(100);
  const wMin = await panelW(); await p.mouse.up(); await sleep(400);
  check('RESIZE dragging narrower stops at the narrowest width (900)', wMin === 900, wMin);
  const st2 = await ev(i => ({ panel: S.panel === i, editing: !!item(i).editing, ed: !!NB[i], on: document.querySelector('#panel').classList.contains('on'), saved: /확장 전 입력/.test((sharedBase['item:' + i] || {}).body || ''), toast: (t => (t.classList.contains('on') ? t.textContent : ''))(document.querySelector('#toast')) }), id);
  check('RESIZE letting go far inside the panel neither closes it nor saves the edit', st2.panel && st2.editing && st2.ed && st2.on && !st2.saved && !/저장/.test(st2.toast), st2);
  h = await handle(); await p.mouse.move(h.x, h.y); await p.mouse.down(); await p.mouse.move(h.x - 500, h.y + 10, { steps: 8 }); await p.mouse.move(60, h.y + 10, { steps: 8 }); await sleep(100);
  const wMax = await panelW(); await p.mouse.up(); await sleep(400);
  check('RESIZE dragging wider stops at the widest width (1500) and letting go over the page keeps the panel', wMax === 1500 && await ev(i => S.panel === i && item(i).editing, id), wMax);
  await p.click('#panel-pin .ProseMirror'); await sleep(150);
  check('…and the next real click works as usual', await ev(i => NB[i].inst.editor.view.hasFocus(), id));
  h = await handle(); await p.mouse.move(h.x, h.y); await p.mouse.down(); await p.mouse.move(h.x + 468, h.y, { steps: 6 }); await p.mouse.up(); await sleep(200);
  await p.click('#panel-pin [data-ed="cancel"]'); await sleep(500);

  console.log('— cleaning up');
  await ev(() => { localStorage.removeItem('aidc-panelw'); });
  await ev(async s => { for (const it of ITEMS.filter(x => (x.title || '').includes(s))) await trashItem(it); }, sfx); await sleep(700);
  check('no page errors', !A.errs.length, A.errs.slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
