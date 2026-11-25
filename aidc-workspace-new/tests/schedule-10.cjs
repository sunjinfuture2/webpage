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
  const contract=await ev(ids=>{
    const it=newItem('contract',{proj:'pangyo',status:'published',title:'연결 미팅 검수',meetings:[ids.m1,ids.m2]});
    go('project:pangyo');return it.id;
  },made);
  made.contract=contract;
  const links=a.locator('.contract-table [data-open="'+contract+'"] .contract-meetings .chip');
  await links.first().waitFor();
  const meetings=await links.evaluateAll(chips=>chips.map(c=>{
    const t=c.querySelector('.t'),bounds=c.getBoundingClientRect(),cell=c.closest('.contract-meetings').getBoundingClientRect();
    return {colour:getComputedStyle(c).color===getComputedStyle(c.querySelector('svg')).color,
      title:t.textContent===oneLine(item(c.dataset.open).title),clip:getComputedStyle(t).textOverflow,
      fits:bounds.height<22 && bounds.left>=cell.left-1 && bounds.right<=cell.right+1};
  }));
  await ev(() => go('main')); await sleep(900);
  const ch=await ev(()=>{
    const sh=ITEMS.find(i=>i.short && i.title && i.short!==i.title && isLive(i)), html=sh?chipOf(sh):'';
    const category=document.querySelector('#page-main .tbl.partners .rw .cat a'), label=document.querySelector('#page-main .cal .ev .lb');
    return {short:sh?{full:html.includes('>'+esc(oneLine(sh.title))+'<'),cut:html.includes(esc(sh.short)+'<')}:null,
      under:getComputedStyle(category).borderBottomWidth,cal:getComputedStyle(label).textOverflow,calTop:getComputedStyle(label).top};
  });
  check('linked meeting chips use each project’s pictogram colour',meetings.length===2 && meetings.every(x=>x.colour),meetings);
  check('linked meeting chips keep the complete title on one line inside their column; calendar entries use ellipsis',
    meetings.every(x=>x.title && x.fits && x.clip==='clip') && (!ch.short || (ch.short.full && !ch.short.cut)) && ch.cal==='ellipsis',{meetings,ch});
  check('the calendar label keeps its vertical offset',ch.calTop==='1.67px',ch.calTop);
  check('the partner category underline is one pixel wide',ch.under==='1px',ch.under);
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
  console.log('— archive: the importance Standard');
  await ev(() => go('archive')); await sleep(900);
  const ar = await ev(() => { const row = document.querySelector('#arch-pw .tbl.archive .rw[data-open]'); row.scrollIntoView({ block: 'center' }); return row.dataset.open; });
  await ev(id => openPanel(id), ar); await sleep(700); await a.click('#panel-pin [data-ed="edit"]'); await sleep(800); await a.click('#panel-pin [data-pick="pri"]'); await sleep(300);
  const pm = await ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()));
  await a.click('.pop .it:has-text("Standard")'); await sleep(400); await a.click('#panel-pin [data-ed="save"]'); await sleep(800); await flush();
  const st = await ev(id => { const cell = document.querySelector(`#arch-pw .tbl.archive .rw[data-open="${id}"] .pri`), cs = cell && getComputedStyle(cell), hi = document.createElement('span'); hi.className = 'pri pri-high'; document.body.appendChild(hi); const hc = getComputedStyle(hi).color; hi.remove(); return { pri: item(id).pri, txt: cell ? cell.textContent : '', cls: cell ? cell.className : '', color: cs ? cs.color : '', weight: cs ? cs.fontWeight : '', high: hc, rank: PRI_RANK.std < PRI_RANK.high }; }, ar);
  check('archive: a document\'s importance can be Standard, listed first, in a strong violet (not red) and bold; it ranks above 높음', pm.join() === 'Standard,높음,중간,낮음' && st.pri === 'std' && st.txt === 'Standard' && /pri-std/.test(st.cls) && st.color === 'rgb(109, 40, 217)' && +st.weight >= 700 && st.color !== st.high && st.rank, { pm, st });
  await ev(() => closePanel(true)); await sleep(300); await ev(id => openPanel(id), made.late); await sleep(700); await a.click('#panel-pin [data-ed="edit"]'); await sleep(800); await a.click('#panel-pin [data-pick="pri"]'); await sleep(300);
  const pm2 = await ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim())); await ev(() => closePop()); await a.click('#panel-pin [data-ed="cancel"]'); await sleep(500); await ev(() => closePanel(true));
  check('…only there: an action is offered 높음 · 중간 · 낮음', pm2.join() === '높음,중간,낮음', pm2);
  await ev(id => { const it = item(id); if (it) { it.pri = 'mid'; render(true); } }, ar); await flush();
  console.log('— my red mark: to the comment that calls me');
  const B = await newUser(browser, 'RXB' + sfx, '열 이', { url: V2 }), b = B.page; await sleep(500);
  const me = await ev(() => ({ id: sharedUser, name: sharedName }));
  const mt = await ev(s => { const it = newItem('meeting', { title: 'R12 호출 미팅 ' + s, status: 'published', date: TODAY, proj: 'pangyo', people: [sharedUser], body: '<p>회의 메모</p>' }); render(true); return it.id; }, sfx); await flush(); await sleep(600);
  await b.reload(); await b.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady, null, { timeout: 15000 }); await sleep(800);
  await b.evaluate(([id, name]) => { const it = item(id), first = name.split(' ')[0]; it.comments = it.comments || []; for (let i = 0; i < 14; i++) it.comments.push({ id: 'c' + Date.now().toString(36) + i, authorId: sharedUser, text: i === 9 ? '@' + first + ' 이 부분 확인 부탁드립니다' : '의견 ' + (i + 1) + ' — 길게 이어지는 댓글 목록', ts: new Date(Date.now() - (14 - i) * 60000).toISOString() }); render(true); return sharedFlush(true); }, [mt, me.name]); await sleep(1500);
  await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(900);
  const red = await ev(id => { const it = item(id), chip = document.querySelector(`#page-project .cal .ev[data-open="${id}"]`), row = document.querySelector(`#page-project .rlist.sch .ev[data-open="${id}"]`); return { n: (it.comments || []).length, has: hasMention(it), chip: !!(chip && chip.querySelector('.dt')), row: !!(row && row.querySelector('.dots i.r')), tg: mineTarget(it) }; }, mt);
  await a.click(`#page-project .rlist.sch .ev[data-open="${mt}"]`); await sleep(1500);
  const mh = await ev(id => { const pin = document.querySelector('#panel-pin'), el = pin.querySelector('.cmt-list .c.mine-hit'), r = el && el.getBoundingClientRect(); return { open: S.panel === id, ci: el ? +el.dataset.ci : -1, txt: el ? el.querySelector('.ct').textContent : '', seen: !!r && r.top >= 60 && r.bottom <= innerHeight - 10, n: pin.querySelectorAll('.mine-hit').length, anim: el ? getComputedStyle(el).animationName : '' }; }, mt);
  check('an entry that carries my red mark, when pressed, opens at the comment that calls me: it is brought into view and lights up', red.n === 14 && red.has && red.row && red.tg && red.tg.ci === 9 && mh.open && mh.ci === 9 && /확인 부탁/.test(mh.txt) && mh.seen && mh.n === 1 && mh.anim === 'mineHit', { red, mh });
  await sleep(2900); check('…for a moment only', await ev(() => !document.querySelector('.mine-hit') && !SCH.mine));
  const gone = await ev(id => { const it = item(id), row = document.querySelector(`#page-project .rlist.sch .ev[data-open="${id}"]`); return { has: hasMention(it), row: !!(row && row.querySelector('.dots i.r')), unread: unreadNotes().filter(n => n.item === id).length }; }, mt);
  check('seen now: the red mark of that entry is gone and its notices are read', !gone.has && !gone.row && gone.unread === 0, gone);
  await ev(() => closePanel(true)); await sleep(300);
  const bm = await b.evaluate(([s, uid, name]) => { const it = newItem('research', { title: 'R12 본문 호출 ' + s, status: 'published', proj: '', people: [sharedUser], ed: 2, body: '<p>' + '앞 문단입니다. '.repeat(40) + '</p>'.repeat(1) + '<p>첫 줄</p>'.repeat(30) + `<p>여기서 <span class="mention" data-type="mention" data-id="${uid}">@${name}</span> 님 확인이 필요합니다.</p>` }); render(true); return sharedFlush(true).then(() => it.id); }, [sfx, me.id, me.name]); await sleep(1500);
  await ev(() => go('main')); await sleep(900);
  const rb = await ev(id => { const card = document.querySelector(`#page-main .rcard[data-open="${id}"]`); return { has: hasMention(item(id)), card: !!(card && card.querySelector('.dots i.r')), kinds: unreadNotes().filter(n => n.item === id).map(n => n.kind).join() }; }, bm);
  await a.click(`#page-main .rcard[data-open="${bm}"]`); await sleep(1800);
  const hb = await ev(id => { const el = document.querySelector('#panel-pin .ibody .mention.mine-hit'), r = el && el.getBoundingClientRect(), card = document.querySelector(`#page-main .rcard[data-open="${id}"]`); return { open: S.panel === id, txt: el ? el.textContent : '', seen: !!r && r.top >= 60 && r.bottom <= innerHeight - 10, after: hasMention(item(id)), card: !!(card && card.querySelector('.dots i.r')) }; }, bm);
  check('my name in a text gives its entry the red mark too; pressed, it opens at that mention, and the mark goes', rb.has && rb.card && rb.kinds === 'body' && hb.open && hb.txt === '@' + me.name && hb.seen && !hb.after && !hb.card, { rb, hb });
  await ev(() => closePanel(true)); await sleep(300);
  const own = await ev(s => { const it = newItem('research', { title: 'R12 내 글 ' + s, status: 'published', proj: '', people: [sharedUser], body: '<p>내가 쓴 글</p>' }); render(true); return it.id; }, sfx); await flush(); await sleep(600);
  await b.reload(); await b.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady, null, { timeout: 15000 }); await sleep(800);
  await b.evaluate(id => { const it = item(id); it.comments = (it.comments || []).concat({ id: 'c' + Date.now().toString(36), authorId: sharedUser, text: '부르지 않고 단 댓글입니다', ts: new Date().toISOString() }); render(true); return sharedFlush(true); }, own); await sleep(1500);
  await ev(() => { go('main'); render(true); }); await sleep(700);
  const oc = await ev(id => { const card = document.querySelector(`#page-main .rcard[data-open="${id}"]`); return { has: hasMention(item(id)), card: !!(card && card.querySelector('.dots i.r')), kinds: unreadNotes().filter(n => n.item === id).map(n => n.kind).join() }; }, own);
  await a.click(`#page-main .rcard[data-open="${own}"]`); await sleep(1600);
  const oh = await ev(id => { const el = document.querySelector('#panel-pin .cmt-list .c.mine-hit'); return { txt: el ? el.querySelector('.ct').textContent : '', after: hasMention(item(id)) }; }, own);
  check('a comment of somebody else on what is mine gives the red mark as well (no call needed); pressed, it opens at that comment', oc.has && oc.card && oc.kinds === 'comment' && /부르지 않고/.test(oh.txt) && !oh.after, { oc, oh });
  await ev(id => { closePanel(true); const it = item(id); if (it) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } render(true); }, own); await flush();
  await ev(() => closePanel(true)); await sleep(300);
  await ev(ids => { for (const id of ids) { const it = item(id); if (it && it.authorId === sharedUser) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } } render(true); }, [mt]); await flush();
  await b.evaluate(id => { const it = item(id); if (it) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } render(true); return sharedFlush(true); }, bm);
  console.log('— without the preview');
  const C = await newUser(browser, 'RXC' + sfx, '열 삼', { url: V1 }), c = C.page; await sleep(600);
  const off = await c.evaluate(ids => { go('main'); const cell = document.querySelector('#page-main .cal .cell[data-date]:not(.today):not(.out)'), d = cell.dataset.date; cell.click(); const sel = S.selDate; document.querySelector('[data-seltoday]') && document.querySelector('[data-seltoday]').click();
    const sh = ITEMS.find(i => i.short && i.title && i.short !== i.title && isLive(i)), html = sh ? chipOf(sh) : ''; const a = document.querySelector('#page-main .tbl.partners .rw .cat a');
    return { pv: PREVIEW_ON, sel: sel === d, back: !S.selDate, short: sh ? html.includes(esc(sh.short) + '<') : true, sch: !!document.querySelector('.rlist.sch'), rs: !!document.querySelector(`#page-main .rlist [data-open="${ids.rs}"]`) }; }, made);
  check('the page everybody else sees is as it was: its calendar selects days, the list has research, chips keep their short form', off.pv === false && off.sel && off.back && off.short && !off.sch && off.rs, off);

  // my own records go to the trash
  await ev(ids => { for (const id of [ids.m1, ids.m2, ids.rs, ids.late, ids.contract, ...ids.many]) { const it = item(id); if (it) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } } render(true); }, made); await flush();
  const errs = [...A.errs, ...B.errs, ...C.errs]; check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})();
