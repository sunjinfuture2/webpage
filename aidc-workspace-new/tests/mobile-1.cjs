// WorkSpace on a phone (owner, 2026-11-24, the "twenty-second round"): schedule/ui/86-mobile.js + schedule/mobile.css.
//  - a small screen gets html.mob and a viewport as wide as the device; nothing is scaled and nothing is wider than the screen;
//  - the sidebar is a drawer, the calendar has seven days across the screen with the list of the day below it, rows of cards
//    and tables are moved sideways, the overview of a project and the panel of an item stand one part below the other,
//    the my page takes the whole screen;
//  - a wide screen and the ?v=1 page are as they were; a window pulled under 700 px changes to the phone's page and back.
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2', V1 = 'http://127.0.0.1:8787/?v=1', PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'MBA' + sfx, '모바일 일', { url: V2, ...PHONE }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const fits = sel => ev(sel => { const c = document.querySelector(sel); return { over: c.scrollWidth - c.clientWidth, w: c.clientWidth, doc: document.documentElement.scrollWidth, vw: innerWidth }; }, sel);

  console.log('— the frame');
  const f0 = await ev(() => ({ mob: document.documentElement.classList.contains('mob'), meta: document.querySelector('meta[name="viewport"]').content, vw: innerWidth, zoom: LAYOUT.zoom, appZoom: document.querySelector('#app').style.zoom, off: document.querySelector('#app').classList.contains('sb-off'), sbRight: Math.round(document.querySelector('#sb').getBoundingClientRect().right), opener: getComputedStyle(document.querySelector('#sb-open')).display, pw: getComputedStyle(document.querySelector('#app')).getPropertyValue('--L').trim() }));
  check('a phone gets html.mob, a viewport as wide as the device and nothing scaled; the sidebar is put away', f0.mob && /width=device-width/.test(f0.meta) && /minimum-scale=1/.test(f0.meta) && f0.vw === 390 && f0.zoom === 1 && !f0.appZoom && f0.off && f0.sbRight <= 0 && f0.opener !== 'none' && f0.pw === '16px', f0);
  await a.tap('#sb-open'); await sleep(450);
  const d1 = await ev(() => { const r = document.querySelector('#sb').getBoundingClientRect(); return { left: Math.round(r.left), w: Math.round(r.width), off: document.querySelector('#app').classList.contains('sb-off'), pos: getComputedStyle(document.querySelector('#sb')).position }; });
  await a.touchscreen.tap(370, 500); await sleep(450);
  const d2 = await ev(() => ({ off: document.querySelector('#app').classList.contains('sb-off'), page: S.page }));
  check('the grey square opens the sidebar as a drawer over the page; a tap beside it closes it', d1.left === 0 && d1.w <= 328 && !d1.off && d1.pos === 'fixed' && d2.off && d2.page === 'main', { d1, d2 });
  await a.tap('#sb-open'); await sleep(400); await ev(() => { const it = [...document.querySelectorAll('#sb .item')].find(x => /판교/.test(x.textContent)); it.click(); }); await a.waitForFunction(() => S.page === 'project' && schReady('pangyo'), null, { timeout: 20000 }); await sleep(700);
  check('an entry of the drawer leads there and the drawer goes', await ev(() => S.page === 'project' && S.proj === 'pangyo' && document.querySelector('#app').classList.contains('sb-off')));

  console.log('— the main page');
  await ev(() => go('main')); await sleep(800);
  const m0 = await fits('#content');
  const cal = await ev(() => { const c = document.querySelector('.page.on .cal'), cells = [...c.querySelectorAll('.row')[1].querySelectorAll('.cell')].map(x => x.getBoundingClientRect()), l = document.querySelector('.page.on .rlist').getBoundingClientRect(), g = c.querySelector('.grid').getBoundingClientRect(); return { n: cells.length, w: cells.map(r => Math.round(r.width)), right: Math.round(cells[6].right), listTop: Math.round(l.top), gridBottom: Math.round(g.bottom), listLeft: Math.round(l.left), listW: Math.round(l.width) }; });
  check('nothing is wider than the screen; the calendar has seven days of one width across it and the list of the day below it', m0.over <= 0 && m0.doc <= 390 && cal.n === 7 && Math.max(...cal.w) - Math.min(...cal.w) <= 1 && cal.right <= 375 && cal.listTop >= cal.gridBottom && cal.listLeft === 16 && cal.listW === 358, { m0, cal });
  const pj = await ev(() => { const box = document.querySelector('.page.on .projects'), t = box.querySelector('.track'), tools = box.querySelector('.sch-vtools').getBoundingClientRect(), ttl = box.querySelector('.sec-title').getBoundingClientRect(); return { scroll: t.scrollWidth > t.clientWidth + 40, ox: getComputedStyle(t).overflowX, arrows: [...box.querySelectorAll('.arr')].every(x => getComputedStyle(x).display === 'none'), tr: box.querySelector('#proj-inner').style.transform, toolsBelow: tools.top >= ttl.bottom - 1, toolsRight: Math.round(tools.right), card: Math.round(box.querySelector('.pcard').getBoundingClientRect().width) }; });
  await ev(() => { document.querySelector('.page.on .projects .track').scrollLeft = 260; }); await sleep(200);
  check('the project cards are moved with the finger (no arrows); the views and the search stand below the title', pj.scroll && pj.ox === 'auto' && pj.arrows && pj.toolsBelow && pj.toolsRight <= 375 && pj.card <= 320 && await ev(() => document.querySelector('.page.on .projects .track').scrollLeft > 200), pj);
  const tb = await ev(() => { const t = document.querySelector('.page.on #sec-actions .tbl'), row = t.querySelector('.rw'), r = t.getBoundingClientRect(); return { ox: getComputedStyle(t).overflowX, wide: t.scrollWidth > t.clientWidth + 100, left: Math.round(r.left), right: Math.round(r.right), rowH: row ? Math.round(row.getBoundingClientRect().height) : 0, rowW: row ? Math.round(row.getBoundingClientRect().width) : 0 }; });
  check('a table keeps its columns and is moved sideways inside the screen', tb.ox === 'auto' && tb.wide && tb.left === 0 && tb.right === 390 && tb.rowW > 600 && tb.rowH < 70, tb);
  const rs = await ev(() => { const c = [...document.querySelectorAll('.page.on #sec-research .rcard')].map(x => x.getBoundingClientRect()); return { n: c.length, w: c[0] && Math.round(c[0].width), oneCol: c.length < 2 || Math.round(c[1].left) === Math.round(c[0].left) }; });
  check('research cards stand one below the other, as wide as the screen allows', rs.n > 0 && rs.w === 358 && rs.oneCol, rs);

  console.log('— a project page');
  await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 20000 }); await sleep(800);
  const p0 = await fits('#content');
  const overview = a.locator('.page.on .phead [data-collapse]');
  check('the phone opens on the summary with the calendar in the first screen', await overview.getAttribute('aria-expanded') === 'false' && await ev(() => document.querySelector('.page.on .cal .grid').getBoundingClientRect().top < innerHeight));
  await overview.tap();
  const ph = await ev(() => { const X = s => document.querySelector(s).getBoundingClientRect(), c1 = X('.phead .rstats'), c2 = X('.phead .rc1'), c3 = X('.phead .rc2'), h = X('.phead .ttl h1');   /* the sheet of the review list: the band of figures, then the two columns (twenty-sixth round) */ return { stacked: c2.top >= c1.bottom - 1 && c3.top >= c2.bottom - 1, w: [c1, c2, c3].map(r => Math.round(r.width)), h1Right: Math.round(h.right), h: Math.round(X('.phead').height) }; });
  check('the overview stands one column below the other, inside the screen', p0.over <= 0 && ph.stacked && ph.w.every(w => w === 358) && ph.h1Right <= 375 && ph.h > 600, { p0, ph });
  await overview.tap();
  await ev(() => { S.calYp=2026; S.calMp=11; refreshSec('cal'); });
  const day = a.locator('.page.on button[data-mob-day]').first();
  await day.tap();
  check('a touch on a day count shows its actions', await a.locator('.mob-day-menu .mob-day-item').count() > 0);
  await ev(() => closePop());
  const gt = await ev(() => { const g = document.querySelector('#sch-gantt'), l = g.querySelector('.sg-left'); return { w: Math.round(g.getBoundingClientRect().width), left: Math.round(l.getBoundingClientRect().width), rows: g.querySelectorAll('.sg-left .sg-row.ph').length }; });
  check('the gantt shows the names in under half of the screen and the chart beside them', gt.w === 390 && gt.left >= 132 && gt.left <= 190 && gt.rows >= 8, gt);
  const mt = await ev(() => { const box = document.querySelector('.page.on .meet'), t = box.querySelector('.track'); return { ox: getComputedStyle(t).overflowX, circ: [...box.querySelectorAll('.circ')].every(x => getComputedStyle(x).display === 'none'), h: Math.round(box.getBoundingClientRect().height), picks: box.querySelectorAll('[data-mtpick]').length }; });
  check('the meetings are moved with the finger, their pickers and views stand below the title', mt.ox === 'auto' && mt.circ && mt.h > 300 && mt.picks === 3, mt);

  console.log('— the panel of an item');
  const tid = await ev(() => { const id = schItemId(schModel('pangyo').byWbs.get('W1.3').id); openPanel(id); return id; }); await sleep(900);
  const pn = await ev(() => { const p = document.querySelector('#panel').getBoundingClientRect(), pin = document.querySelector('#panel-pin'), X = s => { const e = pin.querySelector(s); return e ? e.getBoundingClientRect() : null; }, hd = X('.ihead'), tt = X('.ititle'), pr = X('.props'), bd = X('.ibody'), wide = [...pin.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > 391; }).length, close = document.querySelector('#panel-close').getBoundingClientRect();
    return { panel: [Math.round(p.left), Math.round(p.width)], order: hd.bottom <= tt.top + 1 && tt.bottom <= pr.top + 1 && pr.bottom <= bd.top + 1, left: [hd, tt, pr, bd].map(r => Math.round(r.left)), wide, close: [Math.round(close.left), Math.round(close.width)], expand: getComputedStyle(document.querySelector('#panel-expand')).display, opener: getComputedStyle(document.querySelector('#sb-open')).display, title: pin.querySelector('.ititle').textContent.slice(0, 6) }; });
  check('it takes the whole screen; its head, title, fields and text stand one below the other, nothing sticks out', pn.panel[0] === 0 && pn.panel[1] === 390 && pn.order && pn.left.every(x => x === 16) && pn.wide === 0 && pn.expand === 'none' && pn.opener === 'none' && pn.close[0] >= 8 && pn.close[0] < 40, pn);
  await a.tap('#panel-pin [data-ed="edit"]'); await sleep(900);
  const ed = await ev(() => ({ editing: !!curItem().editing, fields: document.querySelectorAll('#panel-pin .sf-e').length, over: [...document.querySelectorAll('#panel-pin *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > 391; }).length, bodyFont: getComputedStyle(document.querySelector('#panel-pin .ibody')).fontSize }));
  check('수정 works there; the text is written at 16 px (a phone zooms into smaller fields)', ed.editing && ed.fields > 4 && ed.over === 0 && ed.bodyFont === '16px', ed);
  await a.tap('#panel-pin [data-ed="cancel"]'); await sleep(700); await a.tap('#panel-close'); await sleep(600);
  check('the » of the top bar closes it', await ev(() => !S.panel && !document.querySelector('#panel').classList.contains('on')));

  console.log('— the archive and my page');
  await ev(() => go('archive')); await sleep(800);
  const ar = await fits('#content'), ar2 = await ev(() => { const v = [...document.querySelectorAll('#arch-pw [data-arview]')].map(b => b.getBoundingClientRect()), q = document.querySelector('#arch-pw .ar-top .srch').getBoundingClientRect(); return { oneLine: v.every(r => r.height < 44), searchBelow: q.top >= v[0].bottom - 1, searchW: Math.round(q.width) }; });
  await ev(() => document.querySelector('#arch-pw [data-arview="sites"]').click()); await sleep(500);
  const ar3 = await ev(() => { const c = [...document.querySelectorAll('#arch-pw .asec .acard')].slice(0, 3).map(x => x.getBoundingClientRect()); return { n: c.length, two: c.length > 1 && Math.round(c[1].top) === Math.round(c[0].top) && c[1].left > c[0].right, w: Math.round(c[0].width), third: c.length < 3 || c[2].top > c[0].bottom - 1 }; });
  check('the archive: its two views on one line with the search below them, site cards two to a row', ar.over <= 0 && ar2.oneLine && ar2.searchBelow && ar2.searchW >= 340 && ar3.two && ar3.w > 150 && ar3.third, { ar, ar2, ar3 });
  await ev(() => { document.querySelector('#arch-pw [data-arview="docs"]').click(); go('main'); openModal('account'); }); await sleep(900);
  const my = await ev(() => { const m = document.querySelector('.modal').getBoundingClientRect(), n = document.querySelector('.modal .mnav').getBoundingClientRect(), b = document.querySelector('.modal .mbody').getBoundingClientRect(); return { modal: [Math.round(m.left), Math.round(m.top), Math.round(m.width), Math.round(m.height)], navAbove: n.bottom <= b.top + 1, bodyW: Math.round(b.width), over: [...document.querySelectorAll('.modal .mbody *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > 391; }).length }; });
  check('my page takes the whole screen, its menu above what it shows', my.modal.join() === '0,0,390,844' && my.navAbove && my.bodyW === 390 && my.over === 0, my);
  await ev(() => closeModal()); await sleep(400);
  await ev(() => schNewProject()); await sleep(500);
  const dg = await ev(() => { const b = document.querySelector('#dlg .box').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; });
  check('a window fits the screen', dg[0] >= 8 && dg[1] <= 382, dg);
  await ev(() => { const d = document.querySelector('#dlg'); if (d) d.remove(); });

  console.log('— elsewhere nothing changed');
  const D = await newUser(browser, 'MBD' + sfx, '모바일 사', { url: V2 }), d = D.page;
  const wd = await d.evaluate(() => ({ mob: document.documentElement.classList.contains('mob'), meta: document.querySelector('meta[name="viewport"]').content, sb: Math.round(document.querySelector('#sb').getBoundingClientRect().width) }));
  await d.setViewportSize({ width: 620, height: 800 }); await sleep(900);
  const nw = await d.evaluate(() => ({ mob: document.documentElement.classList.contains('mob'), zoom: LAYOUT.zoom, over: document.querySelector('#content').scrollWidth - document.querySelector('#content').clientWidth, off: document.querySelector('#app').classList.contains('sb-off') }));
  await d.setViewportSize({ width: 1920, height: 1080 }); await sleep(900);
  const bk = await d.evaluate(() => ({ mob: document.documentElement.classList.contains('mob'), meta: document.querySelector('meta[name="viewport"]').content, zoom: LAYOUT.zoom, d: LAYOUT.d }));
  check('a wide screen is as it was; a window pulled under 700 px gets the phone\'s page and gives it back when it is wide again', !wd.mob && wd.meta === 'width=1920' && wd.sb > 200 && nw.mob && nw.zoom === 1 && nw.over <= 0 && nw.off && !bk.mob && bk.meta === 'width=1920' && bk.zoom === 1 && bk.d > -201, { wd, nw, bk });
  const C = await newUser(browser, 'MBC' + sfx, '모바일 삼', { url: V1, ...PHONE }), c = C.page;
  const old = await c.evaluate(() => ({ mob: document.documentElement.classList.contains('mob'), meta: document.querySelector('meta[name="viewport"]').content, pv: PREVIEW_ON }));
  check('the ?v=1 page on a phone stays the 1920 wide page', !old.mob && old.meta === 'width=1920' && !old.pv, old);

  const errs = [...A.errs, ...D.errs, ...C.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
