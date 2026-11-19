// WorkSpace x Schedule (preview), third part (owner's third round, 2026-11-19): relation lines without slanted pieces, the one
// status design, the day list that ends where the calendar ends, the day window of the calendar, the green / red notices and
// their order. Needs wrangler dev on 127.0.0.1:8787. Two members.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const PV = { url: 'http://127.0.0.1:8787/?v=2' };
  const A = await newUser(browser, 'N3A', '가람 일', PV), a = A.page;
  const B = await newUser(browser, 'N3B', '나래 이', PV), b = B.page;
  const goP = async p => { await p.evaluate(() => go('project:pangyo')); await p.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };
  const fresh = p => p.evaluate(() => { INBOX_STATE.seen = {}; INBOX_STATE.seenInit = {}; SCH.last = {}; SCH.note = {}; Object.assign(SCHU, { scn: '', q: '', phase: '', scope: 'all', scale: 'month', open: ['W1', 'W2'], tab: 'gantt', sel: '' }); S.selDate = null; });
  await goP(a); await goP(b);
  await a.evaluate(async () => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; for (const it of ITEMS.filter(x => /^알림 검사 /.test(x.title || ''))) await trashItem(it); });
  await sleep(1500); await fresh(a); await fresh(b); await a.evaluate(() => render(true)); await b.evaluate(() => render(true)); await sleep(900);

  console.log('— relation lines');
  const lineCheck = () => a.evaluate(() => { const out = { n: 0, slant: 0, heads: 0, bad: '' };
    for (const g of document.querySelectorAll('#sch-gantt .sg-links g[data-link]')) { out.n++; const ps = g.querySelectorAll('path:not(.hit)'); if (ps.length === 2) out.heads++; const d = ps[0].getAttribute('d'); let x = null, y = null;
      for (const mm of d.matchAll(/([MLQ])([-\d.]+),([-\d.]+)(?: ([-\d.]+),([-\d.]+))?/g)) { const c = mm[1];
        if (c === 'M') { x = +mm[2]; y = +mm[3]; } else if (c === 'L') { if (Math.abs(+mm[2] - x) > 0.02 && Math.abs(+mm[3] - y) > 0.02) { out.slant++; out.bad = d; } x = +mm[2]; y = +mm[3]; } else { x = +mm[4]; y = +mm[5]; } } }
    return out; });
  for (const scale of ['month', 'week', 'day', 'fit']) { await a.evaluate(s => { SCHU.scale = s; schRefresh(); }, scale); await sleep(500); const r = await lineCheck();
    check(`${scale}: every relation line is made of upright and level pieces and round turns, each with one arrowhead`, r.n > 20 && r.slant === 0 && r.heads === r.n, r); }
  await a.evaluate(() => { SCHU.scale = 'month'; schRefresh(); }); await sleep(500);
  const names = await a.evaluate(() => { let cut = 0, inside = 0, outside = document.querySelectorAll('#sch-gantt .sg-tx').length; for (const el of document.querySelectorAll('#sch-gantt .sg-bar')) { const lb = el.querySelector('.lb'); if (!lb) continue; inside++; if (el.offsetWidth < 110 && lb.scrollWidth > lb.clientWidth + 1) cut++; } return { cut, inside, outside }; });
  check('the name of a task stands inside its bar (cut with … when the bar is short); only milestones and bars too short for a number have it beside them', names.inside > 5 && await a.evaluate(() => [...document.querySelectorAll('#sch-gantt .sg-bar')].every(el => (el.offsetWidth >= 44) === !!el.querySelector('.lb'))), names);
  const m15 = await a.evaluate(() => { const m = schModel('pangyo'), id = m.byWbs.get('W1.4').id, tx = [...document.querySelectorAll('#sch-gantt .sg-tx')].find(e => e.dataset.k === id); return { beside: !!tx, shadow: tx ? getComputedStyle(tx).textShadow !== 'none' : false }; });
  check('names beside bars keep a white edge so that a line passing behind stays readable', m15.beside && m15.shadow, m15);
  await a.evaluate(() => { SCHU.tab = 'net'; SCHU.netMode = 'focus'; SCHU.netDepth = 1; SCHU.netDir = 'both'; SCHU.sel = schModel('pangyo').byWbs.get('W1.7').id; schRefresh(); }); await sleep(700);
  const net = await a.evaluate(() => { const cards = [...document.querySelectorAll('#sch-net .sn-node')].map(c => c.getBoundingClientRect()); const out = { edges: 0, off: 0, straight: 0, detail: [] };
    const ratio = (x, y, side) => { const c = cards.find(r => Math.abs((side === 'r' ? r.right : r.left) - x) < 9 && y > r.top - 2 && y < r.bottom + 2); return c ? (y - c.top) / c.height : -1; };
    for (const g of document.querySelectorAll('#sch-net svg g')) { const p = g.querySelector('path'); if (!p) continue; out.edges++; const M = p.getScreenCTM(), L = p.getTotalLength(), pt = l => { const q = p.getPointAtLength(l); return { x: q.x * M.a + M.e, y: q.y * M.d + M.f }; }, s = pt(0), e = pt(L);
      const rs = ratio(s.x, s.y, 'r'), re = ratio(e.x, e.y, 'l'); if (Math.abs(rs - 24 / 128.5) > 0.03 || Math.abs(re - 24 / 128.5) > 0.03) { out.off++; out.detail.push([rs, re]); } if (Math.abs(s.y - e.y) < 0.6 && !/Q/.test(p.getAttribute('d'))) out.straight++; }
    return out; });
  check('relation map: every line leaves and reaches a card 24 below its top; cards of one row are joined by a straight line', net.edges >= 4 && net.off === 0 && net.straight >= 2, net);

  console.log('— one status design');
  const st = await a.evaluate(() => { const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;font-size:91px'; box.innerHTML = SCH_STATUSES.map(s => schStIcon(s)).join(''); document.body.appendChild(box);
    const out = [...box.children].map(e => { const sv = e.querySelector('svg'), u = e.querySelector('use').getAttribute('href'), r = sv.getBoundingClientRect(); return { t: e.textContent, u, sym: !!document.querySelector(u), c: getComputedStyle(e).color, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, fw: getComputedStyle(e).fontWeight }; }); box.remove(); return out; });
  const want = [['계획', 'plan', 'rgb(147, 147, 147)', 82.8, 82.8], ['확인 전', 'ask', 'rgb(239, 173, 27)', 13.5, 71.9], ['진행', 'prog', 'rgb(29, 163, 237)', 77, 77], ['완료', 'done', 'rgb(26, 204, 0)', 72.8, 62.5], ['보류', 'hold', 'rgb(234, 73, 73)', 40.5, 57], ['조건부 미발동', 'cond', 'rgb(183, 81, 237)', 81, 70.1]];
  check('six statuses in the sheet\'s order, each with its own mark, colour and size (measured at the sheet\'s 91 px type)', st.length === 6 && want.every((w, i) => st[i].t === w[0] && st[i].u === '#i-st-' + w[1] && st[i].sym && st[i].c === w[2] && Math.abs(st[i].w - w[3]) < 0.6 && Math.abs(st[i].h - w[4]) < 0.6 && st[i].fw === '600'), st);
  await a.evaluate(() => { SCHU.tab = 'gantt'; SCHU.sel = ''; schRefresh(); openPanel(schItemId(schModel('pangyo').byWbs.get('W1.9').id)); }); await sleep(600);
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(1300);
  await a.click('#panel-pin [data-schp="f"][data-k="status"]'); await sleep(200);
  const menu = await a.evaluate(() => [...document.querySelectorAll('.pop .it')].map(e => e.textContent.trim())), menuMarks = await a.evaluate(() => [...document.querySelectorAll('.pop .it')].every(e => !!e.querySelector('.sch-st use')));
  await a.click('.pop .it:has-text("보류")'); await sleep(700);
  const hold = await a.evaluate(() => { const m = schModel('pangyo'), t = m.byWbs.get('W1.9'), row = document.querySelector(`.sg-row.tk[data-row="${t.id}"] .st .sch-st`), pan = document.querySelector('#panel-pin [data-k="status"] .sch-st'); return { menu: null, st: t.status, as: t.actualStart, row: row && row.className, rowUse: row && row.querySelector('use').getAttribute('href'), pan: pan && pan.textContent, ov: Object.keys(SCHED.pangyo) }; });
  check('보류 can be chosen for a task; the outline and the panel show its mark; nothing else of the task moves', menu.join() === '계획,확인 전,진행,완료,보류,조건부 미발동' && hold.st === '보류' && !hold.as && /st-hold/.test(hold.row) && hold.rowUse === '#i-st-hold' && hold.pan === '보류' && hold.ov.length === 1 && menuMarks, { menu, hold, menuMarks });
  await a.click('#panel-pin [data-ed="cancel"]'); await sleep(700);
  check('취소 takes back what was changed in that edit', await a.evaluate(() => schModel('pangyo').byWbs.get('W1.9').status !== '보류' && !Object.keys(SCHED.pangyo).some(k => k.startsWith('t:'))));
  const cond = await a.evaluate(() => { const m = schModel('pangyo'), t = m.byWbs.get('W2.11'), row = document.querySelector(`.sg-row.tk[data-row="${t.id}"] .st`), left = document.querySelector('#sch-gantt .sg-left').getBoundingClientRect(); return { st: t.status, txt: row.textContent.trim(), title: row.getAttribute('title'), inside: row.querySelector('.sch-st').getBoundingClientRect().right <= left.right + 0.5, use: row.querySelector('use').getAttribute('href') }; });
  check('the long status keeps inside the outline (조건부, with the whole word as its hint)', cond.st === '조건부 미발동' && cond.txt === '조건부' && cond.title === '조건부 미발동' && cond.inside && cond.use === '#i-st-cond', cond);
  await a.evaluate(() => { closePanel(true); SCHU.sec = 'gate'; render(true); }); await sleep(700);
  const gate = await a.evaluate(() => { const g = document.querySelector('.sch-gates .gt .sch-st'); return g ? { cls: g.className, t: g.textContent, use: g.querySelector('use').getAttribute('href'), edit: g.dataset.schc } : null; });
  check('gates, evidence and commitments use the same marks (a gate not yet looked at: 확인 전 with the ! mark, still editable)', gate && /st-ask/.test(gate.cls) && gate.t === '확인 전' && gate.use === '#i-st-ask' && gate.edit === 'gstate', gate);
  const itemSt = await a.evaluate(t => { const it = newItem('action', { title: t, proj: 'pangyo', status: 'published' }); render(true); openPanel(it.id); const s = document.querySelector('#panel-pin .props .st'); return { id: it.id, sch: !!s.querySelector('.sch-st.st-prog'), txt: s.textContent.trim() }; }, '알림 검사 상태 ' + sfx);
  check('an ordinary action item shows its status with the same mark', itemSt.sch && itemSt.txt === '진행', itemSt);
  await a.evaluate(() => closePanel(true)); await sleep(300);

  console.log('— the list beside the calendar ends where the calendar ends');
  const fit = () => a.evaluate(() => { const g = document.querySelector('#page-project .cal .grid').getBoundingClientRect(), el = document.querySelector('#page-project .rlist.sch'), r = el.getBoundingClientRect(); return { grid: Math.round(g.bottom), list: Math.round(r.bottom), over: el.scrollHeight > el.clientHeight + 2, cut: el.classList.contains('cut'), rows: el.querySelectorAll('.ra').length, n: +el.querySelector('.rcap .n').textContent }; });
  const f1 = await fit();
  check('the list of today\'s actions stops at the lower edge of the calendar (the rest by scrolling inside, soft edge)', f1.list <= f1.grid + 1 && f1.over && f1.cut && f1.rows === f1.n && f1.n >= 10, f1);
  await sleep(1200); await a.evaluate(() => { const el = document.querySelector('#page-project .rlist.sch'); el.scrollTop = el.scrollHeight; }); await sleep(300);
  check('…scrolled to its end the soft edge is gone', await a.evaluate(() => !document.querySelector('#page-project .rlist.sch').classList.contains('cut')));
  await a.evaluate(() => render(true)); await sleep(400);
  check('…and a redraw of the page leaves the list where it stood', await a.evaluate(() => { const el = document.querySelector('#page-project .rlist.sch'); return el.scrollTop > 100 && !el.classList.contains('cut'); }));
  await a.evaluate(() => { document.querySelector('#page-project .rlist.sch').scrollTop = 0; }); await sleep(250);
  await a.click('#page-project .cal [data-cal="next"]'); await sleep(600); const f2 = await fit();
  await a.click('#page-project .cal [data-cal="prev"]'); await sleep(600);
  check('…also after turning the month', f2.list <= f2.grid + 1, f2);
  await a.setViewportSize({ width: 1500, height: 900 }); await sleep(700); const f3 = await fit(); await a.setViewportSize({ width: 1920, height: 1080 }); await sleep(700);
  check('…and in a narrower window', f3.list <= f3.grid + 1 && f3.grid - f3.list < 4, f3);

  console.log('— the day window of the calendar');
  await a.evaluate(() => { const c = document.querySelector('#content'), el = document.querySelector('#page-project .cal'); c.scrollTop = el.getBoundingClientRect().top + c.scrollTop - 110; }); await sleep(300);
  const pale = a.locator('#page-project .cal .cell:not(.today):not(.out) .acnt').nth(10); const day = await pale.evaluate(e => e.closest('[data-date]').dataset.date);
  await pale.hover(); await sleep(600);
  const pop = await a.evaluate(d => { const e = document.querySelector('.sch-daypop'); if (!e) return null; const r = e.getBoundingClientRect(), rows = [...e.querySelectorAll('.ra')], want = schDayRows('pangyo', d), box = e.querySelector('.dp-in'), first = rows[0].getBoundingClientRect(), tt = rows[0].querySelector('.tt'), dd = rows[0].querySelector('.sch-dd').getBoundingClientRect(), dt = rows[0].querySelector('.dt').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), n: rows.length, want: want.length, same: rows.every((x, i) => x.dataset.open === want[i].id), view: box.clientHeight, rowH: first.height, firstMid: Math.round((first.top + first.height / 2 - r.top) * 10) / 10, titleLeft: Math.round((tt.getBoundingClientRect().left - r.left) * 10) / 10, ddMid: Math.round((dd.left + dd.width / 2 - r.left) * 10) / 10, dtRight: Math.round((r.right - dt.right) * 10) / 10, font: getComputedStyle(tt).fontSize + '/' + getComputedStyle(tt).fontWeight, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }; }, day);
  check('resting on a pale count opens that day\'s actions: 505 wide, rows 48 apart, at most eight rows before it scrolls, wholly on screen', pop && pop.w === 505 && pop.n === pop.want && pop.same && pop.rowH === 48 && pop.view <= 384 && pop.h <= 483 && pop.inView, pop);
  check('…laid out as in the picture (first row 68 down, title 39 in, D-day about 358 in, date 45.5 from the right, 17 px / 600)', pop && Math.abs(pop.firstMid - 69) < 1.6 && Math.abs(pop.titleLeft - 40) < 1.1 && Math.abs(pop.ddMid - 358) < 6 && Math.abs(pop.dtRight - 46.5) < 1.1 && pop.font === '17px/600', pop);
  const pr = await a.evaluate(() => { const r = document.querySelector('.sch-daypop').getBoundingClientRect(); return { x: r.left + 120, y: r.top + 70 }; });
  await a.mouse.move(pr.x, pr.y, { steps: 6 }); await sleep(500);
  check('it stays while the pointer is on it', await a.evaluate(() => !!document.querySelector('.sch-daypop')));
  await a.mouse.click(pr.x, pr.y); await sleep(700);
  check('a row opens that action and the window goes', await a.evaluate(d => !document.querySelector('.sch-daypop') && S.panel === schDayRows('pangyo', d)[0].id, day));
  await a.evaluate(() => closePanel(true)); await sleep(300);
  await a.locator('#page-project .cal .cell.today .acnt').hover(); await sleep(600);
  check('today\'s (dark) count opens nothing: its actions are the list beside the calendar', await a.evaluate(() => !document.querySelector('.sch-daypop')));
  await pale.hover(); await sleep(600); await a.mouse.move(30, 400, { steps: 4 }); await sleep(700);
  check('the window goes when the pointer leaves', await a.evaluate(() => !document.querySelector('.sch-daypop')));
  await a.evaluate(() => { const c = [...document.querySelectorAll('#page-project .cal .cell:not(.today):not(.out)')][8]; c.click(); }); await sleep(500);
  check('a click on a day of the project calendar selects nothing: no frame, the list stays today\'s', await a.evaluate(() => !S.selDate && document.querySelectorAll('#page-project .cal .cell.sel:not(.today)').length === 0 && /금일 액션/.test(document.querySelector('#page-project .rlist.sch').textContent)));
  const lines = await a.evaluate(() => { const el = document.querySelector('#page-project .rlist.sch'), rows = document.querySelector('#page-project .cal .rows').getBoundingClientRect(), l1 = el.querySelector('.rline'), l2 = el.querySelector('.rsep'), c1 = getComputedStyle(l1), c2 = getComputedStyle(l2); return { dy: Math.abs(l1.getBoundingClientRect().top - rows.top), same: c1.borderTopColor === c2.borderTopColor && c1.borderTopWidth === c2.borderTopWidth && Math.abs(l1.getBoundingClientRect().width - l2.getBoundingClientRect().width) < 0.5, cal: c1.borderTopColor === getComputedStyle(document.querySelector('#page-project .cal .rows')).borderTopColor }; });
  check('the line above the list stands level with the calendar\'s line; both lines of the list have its colour and one width', lines.dy < 0.8 && lines.same && lines.cal, lines);

  console.log('— notices: green = starts today, red = one of my actions changed');
  const ids = await a.evaluate(() => { const m = schModel('pangyo'); return { far: m.byWbs.get('W3.2').id, late: m.byWbs.get('W1.6').id }; });
  const state = p => p.evaluate(() => { const n = (SCH.note.pangyo = null, schNotices('pangyo')), el = document.querySelector('#page-project .rlist.sch'), rows = [...el.querySelectorAll('.ra')].map(r => ({ id: r.dataset.open, r: !!r.querySelector('.sdot.r'), g: !!r.querySelector('.sdot.g') })), nd = document.querySelector('#page-project .cal .cell.today .acnt .nd');
    return { red: [...n.red], green: [...n.green], rows, badge: nd ? [...nd.children].map(i => i.className + i.textContent).join(' ') : '', count: +document.querySelector('#page-project .cal .cell.today .acnt b').textContent, cap: +el.querySelector('.rcap .n').textContent, seen: Object.keys(INBOX_STATE.seen || {}).length }; });
  const s0 = await state(a);
  check('to begin with nothing is red (what exists when a member first meets a project counts as seen)', s0.red.length === 0 && !s0.rows.some(r => r.r), s0);
  // an action item of today, written by B, with A as an assignee -> green for everybody, red for A (it newly concerns A)
  const gid = await b.evaluate(t => { const it = newItem('action', { title: t, proj: 'pangyo', status: 'published', people: ['N3B', 'N3A'] }); render(true); return it.id; }, '알림 검사 오늘 ' + sfx);
  await sleep(1800); const s1 = await state(a);
  check('an action whose schedule starts today has the green mark, and today\'s count shows how many', s1.green.includes(gid) && s1.rows.find(r => r.id === gid).g && s1.green.length === s0.green.length + 1 && s1.badge.includes('g' + s1.green.length), { green: s1.green.length, was: s0.green.length, badge: s1.badge });
  check('…and since somebody else put me on it, it is red for me and stands first', s1.red.includes(gid) && s1.rows[0].id === gid && s1.rows[0].r && /r1/.test(s1.badge), s1);
  const sB = await state(b);
  check('for the member who made it, it is green only (one\'s own change is never red)', sB.green.includes(gid) && !sB.red.includes(gid), sB);
  // B makes A an assignee of a task that is months away
  await b.evaluate(id => schCommit('pangyo', p => { p.tasks.find(t => t.id === id).people = ['N3A']; }, '담당자 지정'), ids.far); await sleep(1800);
  const s2 = await state(a);
  check('a far-off task somebody assigns to me turns red and is brought into today\'s list (count and list agree)', s2.red.includes('wt-' + ids.far) && s2.rows.some(r => r.id === 'wt-' + ids.far && r.r) && s2.count === s2.cap && s2.cap === s0.cap + 2 && /r2/.test(s2.badge), s2);
  const order = s2.rows.map(r => r.r ? 'r' : r.g ? 'g' : '-').join('');
  check('order of the list: red first, then green, then the nearest deadline', /^r+g*-+$/.test(order) && await a.evaluate(() => { const rows = schDayRows('pangyo', TODAY).filter(r => !r.red && !r.green && !r.done); return rows.every((r, i) => !i || rows[i - 1].due <= r.due); }), order);
  // seeing it
  await a.click(`#page-project .rlist.sch .ra[data-open="wt-${ids.far}"]`); await sleep(700);
  const s3 = await a.evaluate(id => ({ dot: !!document.querySelector(`#page-project .rlist.sch .ra[data-open="wt-${id}"] .sdot.r`), red: [...SCH.last.pangyo.red], badge: (document.querySelector('#page-project .cal .cell.today .acnt .nd') || {}).textContent, seen: !!(INBOX_STATE.seen || {})['wt-' + id] }), ids.far);
  check('opening it takes the red mark away at once (list and today\'s count) and is remembered', !s3.dot && !s3.red.includes('wt-' + ids.far) && s3.seen && s3.badge === s1.green.length + '1', s3);
  await a.evaluate(() => closePanel(true)); await sleep(1200);
  // a change by somebody else on a task of mine
  await b.evaluate(id => schCommit('pangyo', p => { p.tasks.find(t => t.id === id).plannedFinish = '2027-04-09'; }, '완료일 변경'), ids.far); await sleep(1800);
  const s4 = await state(a);
  check('when somebody else changes a task of mine it is red again', s4.red.includes('wt-' + ids.far), s4);
  await a.evaluate(id => openPanel('wt-' + id), ids.far); await sleep(500); await a.evaluate(() => closePanel(true)); await sleep(400);
  await a.evaluate(id => schCommit('pangyo', p => { p.tasks.find(t => t.id === id).pri = 'high'; }, '중요도'), ids.far); await sleep(1500);
  const s5 = await state(a);
  check('my own change to my task is not a notice', !s5.red.includes('wt-' + ids.far), s5);
  // a mention
  const mid = await b.evaluate(t => { const it = newItem('action', { title: t, proj: 'pangyo', status: 'published', people: ['N3B'], date: '2026-12-01' }); render(true); return it.id; }, '알림 검사 호출 ' + sfx);
  await sleep(1500); const s6 = await state(a);
  await b.evaluate(id => { const it = ITEMS.find(x => x.id === id); it.comments = (it.comments || []).concat({ id: 'c' + crypto.randomUUID().slice(0, 8), authorId: sharedUser, who: sharedName, text: '@가람 확인 부탁', ts: new Date().toISOString() }); render(true); }, mid);
  await sleep(1800); const s7 = await state(a);
  check('an action that does not concern me is not red; once I am called in it (@), it is', !s6.red.includes(mid) && s7.red.includes(mid) && s7.rows.some(r => r.id === mid && r.r), { before: s6.red, after: s7.red });
  // linked: an action item of B's is linked to my task; a change of it concerns me
  await a.evaluate(id => openPanel(id), mid); await sleep(400); await a.evaluate(() => closePanel(true)); await sleep(1200);
  const lid = await b.evaluate(([t, task]) => { const it = newItem('action', { title: t, proj: 'pangyo', status: 'published', people: ['N3B'], date: '2026-12-02', task }); render(true); return it.id; }, ['알림 검사 연결 ' + sfx, ids.far]);
  await sleep(1800); const s8 = await state(a);
  check('an action somebody links with a task of mine is red for me, and so is the task', s8.red.includes(lid) && s8.red.includes('wt-' + ids.far), s8.red);
  // after a reload what was seen stays seen, what was not stays red
  await a.evaluate(id => openPanel(id), lid); await sleep(500); await a.evaluate(() => closePanel(true)); await sleep(1500);
  await a.reload(); await a.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady, null, { timeout: 20000 }); await sleep(900); await goP(a); await sleep(600);
  const s9 = await state(a);
  check('after a reload: what I opened stays seen, what I did not open is still red', !s9.red.includes(lid) && s9.red.includes('wt-' + ids.far) && s9.red.includes(gid), s9.red);
  // main page
  await a.evaluate(() => go('main')); await sleep(900);
  const mainRows = await a.evaluate(() => [...document.querySelectorAll('#page-main .tbl.sch-main .rw')].slice(0, 6).map(r => ({ id: r.dataset.open, r: !!r.querySelector('.sdot.r'), g: !!r.querySelector('.sdot.g') })));
  check('the main page\'s action table follows the same order and shows the same marks', mainRows.length > 3 && mainRows[0].r && mainRows.filter(r => r.r).length === 2 && /^r+g*-*$/.test(mainRows.map(r => r.r ? 'r' : r.g ? 'g' : '-').join('')), mainRows);

  console.log('— without the preview nothing of this shows');
  const C = await newUser(browser, 'N3C', '다온 삼', { url: 'http://127.0.0.1:8787/?v=1' }), c = C.page;
  await c.evaluate(() => go('project:pangyo')); await sleep(1200);
  const old = await c.evaluate(() => ({ pv: schPreview(), list: !!document.querySelector('#page-project .rlist.sch'), badge: !!document.querySelector('#page-project .cal .acnt'), st: document.querySelector('#page-project .status-ic') ? document.querySelector('#page-project .status-ic').textContent : '', seen: Object.keys(INBOX_STATE.seen || {}).length }));
  check('a browser without the preview keeps the old list, statuses and calendar and stores no notice state', !old.pv && !old.list && !old.badge && old.seen === 0, old);

  console.log('— cleaning up');
  await goP(a);
  await a.evaluate(async s => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; for (const it of ITEMS.filter(x => (x.title || '').includes(s))) await trashItem(it); render(true); }, sfx); await sleep(1800);
  check('no page errors', !A.errs.length && !B.errs.length && !C.errs.length, [...A.errs, ...B.errs, ...C.errs].slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
