// WorkSpace x Schedule (preview), tenth part (owner's list of 2026-11-23, the "twelfth round"): the list beside the calendars shows
// meetings only and its caption is not something to press, the main calendar selects no day ("+N건" lists what did not fit), the
// reason of a delay is entered through the "n일 지연" mark while a panel is edited, chips carry the project's colour in their
// pictogram and the whole title on one line, the archive's distance to the footer, the line under a partner's 구분, the room
// between the recent items.
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2', V1 = 'http://127.0.0.1:8787/?v=1';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RXA' + sfx, '열 일', { url: V2 }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const flush = () => a.evaluate(() => sharedFlush(true));
  await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(600);
  const made = await ev(s => { const AD = AIDCSchedule.dates.addDays, far = AD(TODAY.slice(0, 8) + '01', 45).slice(0, 8) + '15', pn = PARTNERS.find(p => !p.trash);
    const mk = (type, o) => newItem(type, Object.assign({ status: 'published', date: TODAY, people: [sharedUser] }, o));
    const m1 = mk('meeting', { proj: 'pangyo', title: 'R12 미팅 판교 설계 검토 회의의 아주 긴 제목이 한 줄로 이어집니다 ' + s }), m2 = mk('meeting', { proj: 'busan', title: 'R12 미팅 부산 ' + s, partner: pn.name }), rs = mk('research', { proj: '', title: 'R12 리서치 오늘 ' + s });
    const many = Array.from({ length: 7 }, (_, i) => mk('meeting', { proj: i % 2 ? 'busan' : 'incheon', date: far, title: 'R12 많은 날 ' + (i + 1) + ' ' + s }).id);
    const late = mk('action', { proj: 'pangyo', date: AD(TODAY, -12), end: AD(TODAY, -4), title: 'R12 늦은 액션 ' + s });
    render(true); return { m1: m1.id, m2: m2.id, rs: rs.id, many, far, late: late.id, partner: pn.name }; }, sfx);
  await flush(); await sleep(500);

  console.log('— the list beside the calendars');
  await ev(() => go('main')); await sleep(900);
  const l1 = await ev(ids => { const rl = document.querySelector('#page-main .rlist.sch'), cap = rl.querySelector('.rcap'), has = id => !!rl.querySelector(`[data-open="${id}"]`);
    return { cap: cap.querySelector('.lb').textContent, capEv: cap.classList.contains('ev'), cursor: getComputedStyle(cap).cursor, m1: has(ids.m1), m2: has(ids.m2), rs: has(ids.rs), block: !!rl.querySelector('.it.rs'), today: !!rl.querySelector('[data-seltoday]') }; }, made);
  await a.hover('#page-main .rlist.sch .rcap'); await sleep(250);
  const capBg = await ev(() => getComputedStyle(document.querySelector('#page-main .rlist.sch .rcap')).backgroundColor);
  check('main page: 주요일정 lists today\'s meetings and no research', l1.cap === '주요일정' && l1.m1 && l1.m2 && !l1.rs && !l1.block, l1);
  check('its caption is not something to press: no hand, nothing lights up under the pointer', !l1.capEv && l1.cursor === 'default' && capBg === 'rgb(255, 255, 255)', { l1, capBg });
  await a.mouse.move(900, 500);
  const day = await ev(() => { const cell = document.querySelector('#page-main .cal .cell[data-date]:not(.today):not(.out)'); cell.click(); return { sel: S.selDate, frames: document.querySelectorAll('#page-main .cal .cell.sel:not(.today)').length, cursor: getComputedStyle(cell).cursor, date: document.querySelector('#page-main .rlist.sch .rdate').textContent, want: dateDot(TODAY) }; });
  check('the main calendar selects no day: a press on a date changes nothing, the list stays today\'s', !day.sel && day.frames === 0 && day.cursor === 'default' && day.date.startsWith(day.want) && !l1.today, day);
  await ev(d => { S.calY = +d.slice(0, 4); S.calM = +d.slice(5, 7); refreshSec('cal'); }, made.far); await sleep(500);
  const more = await ev(d => { const m = document.querySelector(`#page-main .cal .more[data-date="${d}"]`); if (!m) return null; m.scrollIntoView({ block: 'center' }); m.click(); const its = [...document.querySelectorAll('.pop.sch-calmore .it')]; return { label: m.textContent, n: its.length, pict: its.length ? getComputedStyle(its[0].querySelector('svg')).color : '', sel: S.selDate }; }, made.far);
  await a.click('.pop.sch-calmore .it'); await sleep(600);
  const moreOpen = await ev(ids => ids.includes(S.panel), made.many);
  check('"+N건" lists everything of that day (it selected the day before); an entry opens its meeting', more && /^\+\d+건$/.test(more.label) && more.n === 7 && !more.sel && moreOpen, { more, moreOpen });
  await ev(() => { closePanel(true); const n = new Date(); S.calY = n.getFullYear(); S.calM = n.getMonth() + 1; refreshSec('cal'); }); await sleep(400);
  await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(800);
  const l2 = await ev(ids => { const rl = document.querySelector('#page-project .rlist.sch'), has = id => !!rl.querySelector(`[data-open="${id}"]`), caps = [...rl.querySelectorAll('.rcap')]; return { caps: caps.map(c => c.querySelector('.lb').textContent), ev: caps.some(c => c.classList.contains('ev')), cursor: getComputedStyle(caps[0]).cursor, m1: has(ids.m1), rs: has(ids.rs), block: !!rl.querySelector('.it.rs'), chipRs: itemsOn(TODAY, 'pangyo').some(i => i.id === ids.rs) }; }, made);   // still one of the calendar's entries of today (a chip, or behind "+N건" on a full day)
  check('project page: the same list (주요일정 = meetings, then 액션), research stays an entry of the calendar only', l2.caps.join() === '주요일정,액션' && !l2.ev && l2.cursor === 'default' && l2.m1 && !l2.rs && !l2.block && l2.chipRs, l2);

  const bub = await ev(() => { const n = document.querySelector('#page-project .rlist.sch .rcap.act .n'), rg = document.createRange(); rg.selectNodeContents(n); const t = rg.getBoundingClientRect(), b = n.getBoundingClientRect(); return { color: getComputedStyle(n).color, dy: +((t.top + t.height / 2) - (b.top + b.height / 2)).toFixed(2), h: Math.round(b.height), icon: getComputedStyle(n.closest('.rcap').querySelector('svg')).color, pc: PROJECTS.pangyo.color }; });
  check('the count beside 액션 is black (the pictogram keeps the project\'s colour) and its digits stand 1 lower inside the bubble', bub.color === 'rgb(0, 0, 0)' && Math.abs(bub.dy - 1) <= 0.3 && bub.h === 18 && bub.icon !== 'rgb(0, 0, 0)', bub);
  console.log('— the reason of a delay');
  const lt = await ev(() => { const m = schModel('pangyo'), P = AIDCSchedule.progress, today = schToday(), t = m.plan.tasks.find(x => !P.isExcluded(x) && !P.isDone(x) && m.res.tasks[x.id].finish < today && x.kind !== 'milestone' && !x.why); openPanel(schItemId(t.id)); return { id: t.id }; }); await sleep(800);
  const r0 = await ev(() => { const pin = document.querySelector('#panel-pin'); return { mark: !!pin.querySelector('.sch-why'), dd: (pin.querySelector('.sch-dd.late') || {}).textContent, row: [...pin.querySelectorAll('.sch-props .pr .k')].some(k => /지연 사유/.test(k.textContent)) }; });
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(800);
  const r1 = await ev(() => { const w = document.querySelector('#panel-pin .sch-why'); return w ? { k: w.dataset.k, schp: w.dataset.schp, title: w.title, txt: w.textContent.trim(), cursor: getComputedStyle(w).cursor } : null; });
  await a.click('#panel-pin .sch-why'); await sleep(400); const askT = await ev(() => { const i = document.querySelector('#ask-in'); return i ? i.closest('.pop').querySelector('.hd').textContent : ''; });
  await a.fill('#ask-in', '발주처 회신 지연 R12'); await a.click('.pop [data-ask="o"]'); await sleep(900);
  const r2 = await ev(id => { const pin = document.querySelector('#panel-pin'), t = schModel('pangyo').byId.get(id), row = [...pin.querySelectorAll('.sch-props .pr')].find(r => /지연 사유/.test(r.querySelector('.k').textContent)); return { why: t.why, row: row ? row.querySelector('.v').textContent.trim() : '', tip: (pin.querySelector('.sch-dd.late') || { dataset: {} }).dataset.tip || '' }; }, lt.id);
  check('read: "n일 지연" is only a mark, and there is no empty 지연 사유 line', !r0.mark && /지연/.test(r0.dd || '') && !r0.row, r0);
  check('수정, then a press on "n일 지연": the reason is asked for and kept (a task of the schedule)', r1 && r1.k === 'why' && r1.schp === 'f' && /지연/.test(r1.txt) && r1.cursor === 'pointer' && askT === '지연 사유' && r2.why === '발주처 회신 지연 R12' && r2.row === '발주처 회신 지연 R12' && /^발주처 회신 지연 R12/.test(r2.tip), { r1, askT, r2 });
  await ev(() => closePanel(true)); await sleep(400); await ev(id => schEditTask('pangyo', id, '지연 사유 지움', x => { x.why = ''; }, true), lt.id); await flush();
  await ev(id => openPanel(id), made.late); await sleep(700); await a.click('#panel-pin [data-ed="edit"]'); await sleep(800);
  const i1 = await ev(() => { const w = document.querySelector('#panel-pin .sch-why'); return w ? { pick: w.dataset.pick, txt: w.textContent.trim() } : null; });
  await a.click('#panel-pin .sch-why'); await sleep(400); await a.fill('#pk-txt', '자재 입고 지연 R12'); await a.click('.pop [data-pk="ok"]'); await sleep(600);
  const i2 = await ev(id => ({ why: item(id).why, row: [...document.querySelectorAll('#panel-pin .sch-props .pr')].filter(r => /지연 사유/.test(r.querySelector('.k').textContent)).map(r => r.querySelector('.v').textContent.trim()).join() }), made.late);
  await a.click('#panel-pin [data-ed="save"]'); await sleep(700); await flush();
  check('…and the same in an ordinary action', i1 && i1.pick === 'why' && /지연/.test(i1.txt) && i2.why === '자재 입고 지연 R12' && i2.row === '자재 입고 지연 R12' && await ev(id => item(id).why === '자재 입고 지연 R12' && !item(id).editing, made.late), { i1, i2 });
  await ev(() => closePanel(true)); await sleep(300);

  console.log('— chips, partners, archive, recent items');
  await ev(() => go('main')); await sleep(900);
  const ch = await ev(ids => { const t = document.querySelector('#page-main .tbl.partners'); t.scrollIntoView({ block: 'center' }); const rows = [...t.querySelectorAll('.rw')], chips = rows.map(r => r.querySelector('.mt .chip')).filter(Boolean);
    const one = c => { const it = item(c.dataset.open), cs = getComputedStyle(c), tt = c.querySelector('.t'), mt = c.closest('.mt').getBoundingClientRect(), r = c.getBoundingClientRect(); return { type: it.type, pict: getComputedStyle(c.querySelector('svg')).color, text: cs.color, full: tt.textContent === oneLine(it.title), clip: getComputedStyle(tt).textOverflow, oneRow: r.height < 22, inside: r.right <= mt.right + 1 }; };
    const meet = chips.map(one).filter(x => x.type === 'meeting'), sh = ITEMS.find(i => i.short && i.title && i.short !== i.title && isLive(i)), html = sh ? chipOf(sh) : '', a = rows[0].querySelector('.cat a');
    const calLb = document.querySelector('#page-main .cal .ev .lb');
    return { n: meet.length, sameColour: meet.every(x => x.pict === x.text), full: meet.every(x => x.full && x.oneRow && x.inside && x.clip === 'clip'), short: sh ? { full: html.includes('>' + esc(oneLine(sh.title)) + '<'), cut: html.includes(esc(sh.short) + '<') } : null, under: a ? getComputedStyle(a).borderBottomWidth : '', cal: calLb ? getComputedStyle(calLb).textOverflow : '', calTop: calLb ? getComputedStyle(calLb).top : '', chipTop: chips.length ? getComputedStyle(chips[0].querySelector('.t')).top : '', pictTop: chips.length ? getComputedStyle(chips[0].querySelector('.sq')).top : '' }; }, made);
  check('a chip\'s pictogram carries its project\'s point colour (it was grey in a coloured chip)', ch.n > 0 && ch.sameColour, ch);
  check('no shortened titles in chips: the whole title on one line, cut where the room ends, without dots; the calendar\'s own entries end in "…" when they do not fit', ch.full && (!ch.short || (ch.short.full && !ch.short.cut)) && ch.cal === 'ellipsis', ch);
  check('the text of a calendar entry and of a chip in the partner list\'s 미팅 column stands 1 lower (1.67 and 1), the pictogram does not move', ch.calTop === '1.67px' && ch.chipTop === '1px' && (ch.pictTop === 'auto' || ch.pictTop === '0px'), { cal: ch.calTop, chip: ch.chipTop, pict: ch.pictTop });
  check('the line under a partner\'s 구분 is half as thick (1px)', ch.under === '1px', ch.under);
  const gap = async pg => { await ev(p => go(p), pg); await sleep(1000); return ev(() => { const c = document.querySelector('#content'); c.scrollTop = c.scrollHeight; const pg = document.querySelector('.page.on'), ps = [...pg.querySelectorAll('.pager')].filter(e => e.offsetParent), last = ps[ps.length - 1]; return Math.round(document.querySelector('#pfoot').getBoundingClientRect().top - last.getBoundingClientRect().bottom); }); };
  const gm = await gap('main'), ga = await gap('archive');
  check('the archive stands as far above the footer as the main page (it was 207 further)', Math.abs(ga - gm) <= 2 && ga < 300, { main: gm, archive: ga });
  await ev(id => openPanel(id), made.m1); await sleep(600); await ev(() => closePanel(true)); await sleep(400);
  const rc = await ev(() => [...document.querySelectorAll('#sb-recent .item')].map(e => [e.className.replace(/^item\s*/, '').split(' ')[0], Math.round(e.getBoundingClientRect().height)]));
  check('recent items: the lines that begin with a dot are 22 high (19 before), as the lines above them', rc.some(x => x[0] === 'r2') && rc.filter(x => x[0] === 'r2').every(x => x[1] === 22), rc);

  const cards = await ev(async s => { const a = newItem('research', { title: '[R12] 글 없는 카드 ' + s, status: 'published', proj: '', people: [sharedUser] }), b = newItem('research', { title: '[R12] 글 있는 카드 ' + s, status: 'published', proj: '', people: [sharedUser], body: '<p>' + '본문이 있는 리서치는 카드에 요약이 붙어 더 높다. '.repeat(6) + '</p>' }); S.q.research = '[R12]'; go('main'); render(true); await new Promise(r => setTimeout(r, 400));
    const el = id => document.querySelector(`#page-main .rcard[data-open="${id}"]`), ra = el(a.id).getBoundingClientRect(), rb = el(b.id).getBoundingClientRect(); const out = { a: Math.round(ra.height), b: Math.round(rb.height), sameRow: Math.abs(ra.top - rb.top) < 1, ds: [!!el(a.id).querySelector('.ds'), !!el(b.id).querySelector('.ds')], align: getComputedStyle(document.querySelector('#page-main .rgrid')).alignItems, ids: [a.id, b.id] }; S.q.research = ''; render(true); return out; }, sfx);
  check('research cards are as high as what they hold: one with a note is higher than one with a title only, both start on the same line', cards.sameRow && cards.b > cards.a + 20 && cards.ds.join() === 'false,true' && cards.align === 'start', cards);
  await ev(ids => { for (const id of ids) { const it = item(id); if (it) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } } render(true); }, cards.ids); await flush();
  await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(600);
  const hit = await ev(async () => { const keep = [SCHU.tab, SCHU.netZoom, SCHU.netFit]; SCHU.tab = 'net'; SCHU.netFit = false; const out = {}; for (const z of [1, 0.5]) { SCHU.netZoom = z; render(true); await new Promise(r => setTimeout(r, 500)); const ps = [...document.querySelectorAll('#sch-net .sn-links path.hit')].map(p => parseFloat(getComputedStyle(p).strokeWidth)); out[z] = ps.length ? Math.min(...ps) : null; out['n' + z] = ps.length; out['hot' + z] = document.querySelectorAll('#sch-net .sn-links g.hot path.hit').length; }
    const open = SCHU.open; SCHU.tab = 'gantt'; SCHU.open = ['W1', 'W2']; render(true); await new Promise(r => setTimeout(r, 600)); const gs = [...document.querySelectorAll('#sch-gantt .sg-links path.hit')].map(p => parseFloat(getComputedStyle(p).strokeWidth)); out.gantt = gs.length ? Math.min(...gs) : null; out.gn = gs.length; SCHU.open = open;
    [SCHU.tab, SCHU.netZoom, SCHU.netFit] = keep; render(true); return out; });
  check('relation map: the band that takes the pointer is 16 wide at full size (12 before) and 11 on the screen at half size (6 before), on every line, those of the selected task too (theirs was as thin as the line); the gantt\'s stays 9 on every line', hit[1] === 16 && Math.abs(hit[0.5] * 0.5 - 11) < 0.1 && hit.n1 > 0 && hit.gantt === 9, hit);
  console.log('— without the preview');
  const C = await newUser(browser, 'RXC' + sfx, '열 삼', { url: V1 }), c = C.page; await sleep(600);
  const off = await c.evaluate(ids => { go('main'); const cell = document.querySelector('#page-main .cal .cell[data-date]:not(.today):not(.out)'), d = cell.dataset.date; cell.click(); const sel = S.selDate; document.querySelector('[data-seltoday]') && document.querySelector('[data-seltoday]').click();
    const sh = ITEMS.find(i => i.short && i.title && i.short !== i.title && isLive(i)), html = sh ? chipOf(sh) : ''; const a = document.querySelector('#page-main .tbl.partners .rw .cat a');
    return { pv: PREVIEW_ON, sel: sel === d, back: !S.selDate, short: sh ? html.includes(esc(sh.short) + '<') : true, sch: !!document.querySelector('.rlist.sch'), rs: !!document.querySelector(`#page-main .rlist [data-open="${ids.rs}"]`) }; }, made);
  check('the page everybody else sees is as it was: its calendar selects days, the list has research, chips keep their short form', off.pv === false && off.sel && off.back && off.short && !off.sch && off.rs, off);

  // my own records go to the trash
  await ev(ids => { for (const id of [ids.m1, ids.m2, ids.rs, ids.late, ...ids.many]) { const it = item(id); if (it) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } } render(true); }, made); await flush();
  const errs = [...A.errs, ...C.errs]; check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})();
