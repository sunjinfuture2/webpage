// WorkSpace x Schedule (preview), eleventh part (owner, 2026-11-23, the "fourteenth round"): small movements (80-motion.js).
// A phase of the gantt opens and closes, the bars slide after a change of dates, tabs, menus and windows that ask, the calendar's
// month, light <-> dark; "화면 움직임 줄이기" turns all of it off; without the preview nothing moves.
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2', V1 = 'http://127.0.0.1:8787/?v=1';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RMA' + sfx, '열한 일', { url: V2 }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const goP = async () => { await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };
  await goP(); await ev(() => { SCHU.tab = 'gantt'; SCHU.open = ['W1']; SCHU.scale = 'month'; SCHU.sel = ''; schRefresh(); }); await sleep(500);

  console.log('— gantt: a phase opens and closes');
  const an = () => ev(() => { const h = document.querySelector('#sch-gantt .sg-scroll'), q = c => [...h.querySelectorAll('.' + c)], top = e => parseFloat(e.style.top); const w2 = [...h.querySelectorAll('.sg-left > .sg-row.ph')].find(r => r.dataset.k === 'W2'), w3 = [...h.querySelectorAll('.sg-left > .sg-row.ph')].find(r => r.dataset.k === 'W3');
    return { open: SCHU.open.join(), in: q('sg-j-in').length, inRows: q('sg-j-in').filter(e => e.classList.contains('sg-row')).length, shift: q('sg-j-shift').length, dy: (q('sg-j-shift')[0] || { style: { getPropertyValue: () => '' } }).style.getPropertyValue('--dy'), out: q('sg-j-out').length, w2: w2 ? top(w2) : null, w3: w3 ? top(w3) : null, anim: q('sg-j-in')[0] ? getComputedStyle(q('sg-j-in')[0]).animationName : '', shiftAnim: q('sg-j-shift')[0] ? getComputedStyle(q('sg-j-shift')[0]).animationName : '', tri: w2 ? getComputedStyle(w2.querySelector('.tw svg')).animationName : '', n: schModel('pangyo').phases.find(g => g.code === 'W2').tasks.length, rowH: SG.row }; });
  const f0 = await an();
  await a.click('#sch-gantt .sg-left .sg-row.ph[data-k="W2"] .tt'); await sleep(60); const f1 = await an();
  check('opening a phase: its rows and bars come in, everything below slides down from where it stood, the arrow turns', f0.open === 'W1' && f1.open === 'W1,W2' && f1.inRows === f1.n && f1.in > f1.n && f1.anim === 'sgIn' && f1.shift > 0 && f1.shiftAnim === 'sgShift' && Math.abs(parseFloat(f1.dy) + (f1.w3 - f0.w3)) < 1 && f1.tri === 'sgTri', { f0, f1 });
  await sleep(400);
  await a.click('#sch-gantt .sg-left .sg-row.ph[data-k="W2"] .tt'); await sleep(40); const f2 = await an(); await sleep(350); const f3 = await an();
  check('closing: its rows go first (the chart is drawn again a moment later), then what was below slides up', f2.open === 'W1,W2' && f2.out >= f2.n && f3.open === 'W1' && f3.out === 0 && f3.shift > 0 && parseFloat(f3.dy) > 0 && f3.w3 === f0.w3, { f2, f3 });
  await sleep(300);

  console.log('— a change of dates: the window grows in, the bars slide');
  const tid = await ev(() => { const m = schModel('pangyo'), t = m.phases[0].tasks.find(t => t.kind !== 'milestone' && !t.actualStart && !t.finishRule && (document.querySelector(`.sg-bar[data-bar="${t.id}"]`) || {}).offsetWidth > 40); document.querySelector(`.sg-bar[data-bar="${t.id}"]`).scrollIntoView({ block: 'center', inline: 'center' }); return t.id; }); await sleep(300);
  const bb = await a.locator(`.sg-bar[data-bar="${tid}"]`).boundingBox(), px = await ev(() => document.querySelector('#sch-gantt .sg-scroll')._px);
  await a.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await a.mouse.down(); await a.mouse.move(bb.x + bb.width / 2 + px * 5 + 1, bb.y + bb.height / 2, { steps: 5 }); await a.mouse.up(); await sleep(60);
  const dl = await ev(() => { const d = document.querySelector('#dlg'); return d ? { jin: d.classList.contains('j-in'), bg: getComputedStyle(d).animationName, box: getComputedStyle(d.querySelector('.box')).animationName } : null; });
  check('the window that asks comes in softly (the veil fades, the box grows a little)', dl && dl.jin && dl.bg === 'jFade' && dl.box === 'jDlg', dl);
  const left0 = await ev(id => parseFloat(document.querySelector(`.sg-bar[data-bar="${id}"]`).style.left), tid);
  await sleep(300); await a.click('#dlg [data-pp="ok"]'); await sleep(40);
  const sl = await ev(id => { const b = document.querySelector(`.sg-bar[data-bar="${id}"]`); return { tr: b.style.transition, left: parseFloat(b.style.left), now: b.getBoundingClientRect().left, links: document.querySelector('#sch-gantt .sg-links').classList.contains('j-fade') }; }, tid);
  await sleep(700); const sl2 = await ev(id => { const b = document.querySelector(`.sg-bar[data-bar="${id}"]`); return { tr: b.style.transition, left: parseFloat(b.style.left) }; }, tid);
  check('saved, the bar slides from where it stood to its new place (and goes on sliding when the chart is drawn again meanwhile)', /left \d+ms/.test(sl.tr) && sl.left - left0 > px * 4 && sl2.tr === '' && Math.abs(sl2.left - sl.left) < 1, { left0, px, sl, sl2 });
  await ev(() => schUndo()); await ev(() => sharedFlush(true)); await sleep(1200);   // the page is drawn again when the save has answered: wait that out

  console.log('— tabs, menus, the calendar, the theme');
  await a.click('#sch-actions .sch-tabs button[data-k="list"]'); await sleep(40);
  const tb = await ev(() => { const on = document.querySelector('#sch-actions .sch-tabs button.on'), body = document.querySelector('[data-sec="sch-act"]'); return { k: on.dataset.k, tab: on.classList.contains('j-tab'), anim: getComputedStyle(on).animationName, right: on.classList.contains('j-r'), fade: body.classList.contains('j-fade') }; });
  await sleep(40); await a.click('#sch-actions .sch-tabs button[data-k="gantt"]'); await sleep(40); const tb2 = await ev(() => { const on = document.querySelector('#sch-actions .sch-tabs button.on'); return { k: on.dataset.k, right: on.classList.contains('j-r'), tab: on.classList.contains('j-tab') }; });
  check('a tab that is chosen: its line grows from the side of the tab that was left, what it shows fades in', tb.k === 'list' && tb.tab && tb.anim === 'jTab' && !tb.right && tb.fade && tb2.k === 'gantt' && tb2.tab && tb2.right, { tb, tb2 });
  await sleep(400); check('…and the marks are taken off again', await ev(() => !document.querySelector('.j-tab') && !document.querySelector('[data-sec="sch-act"].j-fade')));
  await a.click('#tb-user .av'); await sleep(60); const pop = await ev(() => { const p = document.querySelector('.pop'); return p ? { jin: p.classList.contains('j-in'), anim: getComputedStyle(p).animationName } : null; }); await ev(() => closePop());
  check('a menu comes down a little as it appears', pop && pop.jin && pop.anim === 'jIn', pop);
  await ev(() => document.querySelector('#page-project .cal').scrollIntoView({ block: 'center' })); await sleep(200);
  await a.click('#page-project .cal [data-cal="next"]'); await sleep(40); const c1 = await ev(() => document.querySelector('#page-project .cal .rows').className); await sleep(350);
  await a.click('#page-project .cal [data-cal="prev"]'); await sleep(40); const c2 = await ev(() => document.querySelector('#page-project .cal .rows').className);
  check('the calendar moves the way the month goes', /j-cal-n/.test(c1) && /j-cal-p/.test(c2), { c1, c2 });
  await a.click('#th-btn'); await sleep(30); const th = await ev(() => ({ anim: document.documentElement.classList.contains('th-anim'), tr: getComputedStyle(document.documentElement).transitionProperty, dark: document.documentElement.classList.contains('dark') })); await sleep(500);
  const th2 = await ev(() => document.documentElement.classList.contains('th-anim')); await a.click('#th-btn'); await sleep(500);
  check('light <-> dark crosses over (the page\'s filter is in transition for a moment)', th.anim && /filter/.test(th.tr) && th.dark && !th2, { th, th2 });

  console.log('— 화면 움직임 줄이기; without the preview');
  await ev(() => { INBOX_STATE.prefs = { ...(INBOX_STATE.prefs || {}), calm: true }; myPrefsApply(); }); await sleep(200);
  await a.click('#sch-gantt .sg-left .sg-row.ph[data-k="W2"] .tt'); await sleep(40);
  const cm = await ev(() => ({ open: SCHU.open.join(), cls: document.querySelectorAll('.sg-j-in,.sg-j-shift,.sg-j-out').length })); await a.click('#tb-user .av'); await sleep(60); const cp = await ev(() => { const p = document.querySelector('.pop'), r = { jin: !!p && p.classList.contains('j-in') }; closePop(); return r; });
  await a.click('#sch-gantt .sg-left .sg-row.ph[data-k="W2"] .tt'); await sleep(40); const cm2 = await ev(() => SCHU.open.join());
  check('with 화면 움직임 줄이기 nothing moves: a phase opens and closes at once, a menu just appears', cm.open === 'W1,W2' && cm.cls === 0 && !cp.jin && cm2 === 'W1', { cm, cp, cm2 });
  await ev(() => { const p = { ...(INBOX_STATE.prefs || {}) }; delete p.calm; INBOX_STATE.prefs = p; myPrefsApply(); return sharedFlush(true); });
  const C = await newUser(browser, 'RMC' + sfx, '열한 삼', { url: V1 }), c = C.page; await sleep(500);
  await c.click('#tb-user .av'); await sleep(80); const off = await c.evaluate(() => { const p = document.querySelector('.pop'), r = { pv: PREVIEW_ON, pop: !!p, jin: !!p && p.classList.contains('j-in') }; closePop(); return r; });
  check('without the preview nothing of this is put on', off.pv === false && off.pop && !off.jin, off);
  const errs = [...A.errs, ...C.errs]; check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})();
