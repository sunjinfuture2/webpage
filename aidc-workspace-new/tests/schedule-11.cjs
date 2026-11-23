// WorkSpace x Schedule (preview), eleventh part (owner, 2026-11-23, the "fourteenth round"): small movements (80-motion.js).
// A phase of the gantt opens and closes, the bars slide after a change of dates, tabs, menus and windows that ask, the calendar's
// month, light <-> dark; second set: cards rise under the pointer, the rows of a list fade in, a mark that has just come pops;
// "화면 움직임 줄이기" turns all of it off; without the preview nothing moves.
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

  console.log('— second set: cards, lists, a mark that has just come');
  await ev(() => { go('main'); }); await sleep(900);
  const lift = async sel => { const ok = await ev(q => { const e = document.querySelector(q); if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; }, sel); if (!ok) return null; await sleep(250); await a.hover(sel); await sleep(320);
    return ev(q => { const e = document.querySelector(q), r = e.getBoundingClientRect(); let p = e.parentElement, clip = null; while (p && p !== document.body) { const o = getComputedStyle(p); if (/hidden|auto|scroll|clip/.test(o.overflowY + o.overflowX)) { clip = p.getBoundingClientRect(); break; } p = p.parentElement; } return { tr: getComputedStyle(e).translate, cut: !!clip && r.top < clip.top - 0.5 }; }, sel); };
  const l1 = await lift('#page-main .pcard'), l2 = await lift('#page-main .rcard'); await a.mouse.move(5, 400);
  await ev(() => go('archive')); await sleep(700); await a.click('#arch-pw [data-arview="sites"]'); await sleep(500); const l3 = await lift('#ar-body .acard'); await a.mouse.move(5, 400);
  check('cards rise 2 under the pointer (project, research, reference site) and are not cut by what holds them', [l1, l2, l3].every(x => x && /^0px -2px$/.test(x.tr) && !x.cut), { l1, l2, l3 });
  await ev(() => go('main')); await sleep(800);
  const pg = await ev(() => { const b = document.querySelector('.page.on #sec-partners .pager button[data-pg="2"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); b.click(); return true; }); await sleep(40);
  const pf = await ev(() => { const rows = [...document.querySelectorAll('.page.on #sec-partners .tbl.partners .rw')]; return { n: rows.length, fade: rows.filter(r => r.classList.contains('j-fade')).length, head: document.querySelector('.page.on #sec-partners .tbl.partners .hd').classList.contains('j-fade'), page: S.ptPage }; });
  check('another page of a list: its rows fade in once, the column titles stay', pg && pf.page === 2 && pf.n > 0 && pf.fade === pf.n && !pf.head, pf);
  await ev(() => { S.ptPage = 1; render(true); }); await goP(); await ev(() => { SCHU.tab = 'list'; schRefresh(); document.querySelector('#sch-actions').scrollIntoView({ block: 'start' }); }); await sleep(500);
  await a.click('#sch-actions .tbl .hd [data-sch="col"][data-k="pri"]'); await sleep(250); await a.click('.pop .it:has-text("높은 순")'); await sleep(40);
  const sf = await ev(() => { const rows = [...document.querySelectorAll('[data-sec="sch-act"] .tbl .rw')]; return { n: rows.length, fade: rows.filter(r => r.classList.contains('j-fade')).length, sort: SCHU.sort }; });
  check('another order chosen from a column\'s menu: the rows fade in once', sf.n > 0 && sf.fade === sf.n && sf.sort === 'pri', sf);
  await ev(() => { SCHU.sort = ''; SCHU.tab = 'gantt'; schRefresh(); }); await sleep(300);
  const B = await newUser(browser, 'RMB' + sfx, '열한 이', { url: V2 }), b = B.page; await sleep(400);
  const me = await ev(() => ({ id: sharedUser, name: sharedName }));
  const mt = await ev(s => { const it = newItem('meeting', { title: 'RM 톡 미팅 ' + s, status: 'published', date: TODAY, proj: 'pangyo', people: [sharedUser], body: '<p>메모</p>' }); render(true); return sharedFlush(true).then(() => it.id); }, sfx); await sleep(900);
  await b.reload(); await b.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady, null, { timeout: 15000 }); await sleep(800);
  await ev(() => { window._pop = { dot: 0, badge: 0 }; new MutationObserver(() => { if (document.querySelector('.dots i.r.j-pop, .sq .dt.j-pop')) window._pop.dot++; if (document.querySelector('#inbox-badge.j-pop')) window._pop.badge++; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true }); }); await sleep(600);
  await b.evaluate(([id, name]) => { const it = item(id); it.comments = (it.comments || []).concat({ id: 'c' + Date.now().toString(36), authorId: sharedUser, text: '@' + name.split(' ')[0] + ' 확인 부탁드립니다', ts: new Date().toISOString() }); render(true); return sharedFlush(true); }, [mt, me.name]); await sleep(2600);
  const pp = await ev(id => ({ ...window._pop, red: hasMention(item(id)), shown: !!document.querySelector(`#page-project [data-open="${id}"] .dots i.r, #page-project [data-open="${id}"] .sq .dt`) }), mt);
  check('a red mark that has just come pops once on its entry, and the inbox\'s count pops as it grows', pp.red && pp.shown && pp.dot > 0 && pp.badge > 0, pp);
  await sleep(900); check('…and is still again afterwards', await ev(() => !document.querySelector('.j-pop')));
  await ev(id => { const it = item(id); if (it) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } render(true); return sharedFlush(true); }, mt);

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
  const errs = [...A.errs, ...B.errs, ...C.errs]; check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})();
