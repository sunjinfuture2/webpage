// WorkSpace x Schedule (preview), sixth part (owner's sixth round, 2026-11-20): the frame (logo, recent items as a tree, notices,
// footer, trash pictogram), the main page (partner rows, search boxes, the action table with column menus and tags of filters,
// research pickers, project cards, the window that makes a project) and the project page (list beside the calendar, + above the
// open tab, meetings fading, research filling its rows, partners linked with @). Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'R6A' + sfx, '여섯 일', { url: V2 }), a = A.page;
  const B = await newUser(browser, 'R6B' + sfx, '여섯 이', { url: V2 }), b = B.page;
  const ev = (f, x) => a.evaluate(f, x), evb = (f, x) => b.evaluate(f, x);
  const flush = p => p.evaluate(() => sharedFlush(true));
  const goP = async () => { await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };

  console.log('— frame: logo, button below it, trash pictogram');
  const lg = () => ev(() => { const t = document.querySelector('.tb-logo'), s = document.querySelector('#sb .logo'), r = t.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), shown: getComputedStyle(t).display !== 'none', inner: getComputedStyle(s).visibility }; });
  const l0 = await lg(); await a.click('#sb-collapse'); await sleep(120); const l1 = await lg(); await sleep(500); const l2 = await lg();
  await a.mouse.move(900, 500); await sleep(250); const bg = await ev(() => getComputedStyle(document.querySelector('#sb-open')).backgroundColor);
  check('one logo that stays where it is while the sidebar folds and opens', l0.shown && l0.inner === 'hidden' && l0.x === l1.x && l1.x === l2.x && l0.y === l2.y, { l0, l1, l2 });
  check('no grey behind the button below the logo', /rgba\(0, 0, 0, 0\)|transparent/.test(bg), bg);
  await a.click('#sb-open'); await sleep(400);
  const r1 = await ev(t => { const it = newItem('research', { title: t + ' 가', proj: 'pangyo', status: 'published' }); render(true); openPanel(it.id); return it.id; }, '6차 리서치 ' + sfx); await sleep(500);
  const tr = () => ev(() => { const t = document.querySelector('#panel-pin .ihead .trash'); if (!t) return null; const r = t.getBoundingClientRect(), p = t.querySelector('.pict').getBoundingClientRect(); return { w: Math.round(r.width), p: Math.round(p.width) }; });
  const t0 = await tr(); await a.click('#panel-pin [data-ed="edit"]'); await sleep(1200); const t1 = await tr(); await a.click('#panel-pin [data-ed="cancel"]'); await sleep(400);
  check('the trash pictogram is half as large again (24 in a box of 36), also while the item is edited', t0 && t0.p === 24 && t0.w === 36 && t1 && t1.p === 24, { t0, t1 });
  await ev(() => { const p = PARTNERS.find(x => !x.trash); openPanel(p.id); }); await sleep(400); await a.click('#panel-pin [data-ed="editpartner"]'); await sleep(500);
  check('…and on a partner that is being edited', !!(await tr()));
  await a.click('#panel-pin [data-ed="cancelsimple"]'); await sleep(300); await ev(() => closePanel(true));

  console.log('— recent items');
  const r2 = await ev(t => { const it = newItem('research', { title: t + ' 나', proj: 'pangyo', status: 'published' }); const m = newItem('meeting', { title: t + ' 미팅', proj: 'pangyo', status: 'published' }); render(true); return [it.id, m.id]; }, '6차 리서치 ' + sfx);
  for (const id of r2) { await ev(i => openPanel(i, true), id); await sleep(250); } await ev(() => closePanel(true)); await sleep(300);
  const rc = () => ev(() => [...document.querySelectorAll('#sb-recent .item')].map(e => (e.className.match(/r\d/) || ['?'])[0] + ':' + e.querySelector('.tx').textContent));
  const rc0 = await rc();
  check('a tree: the project, the kinds below it, the items below a kind', rc0[0] === 'r0:판교 AI 데이터센터' && rc0.includes('r1:미팅') && rc0.includes('r0:리서치') && rc0.filter(x => x.startsWith('r2:6차 리서치') && !x.endsWith('미팅')).length === 2 && rc0.indexOf('r0:리서치') < rc0.indexOf('r2:6차 리서치 ' + sfx + ' 나') && rc0.indexOf('r1:미팅') < rc0.indexOf('r2:6차 리서치 ' + sfx + ' 미팅'), rc0);   // research is a group of its own since the eighth round
  await a.click('#sb-recent [data-rec="project:pangyo|미팅"]'); await sleep(200);
  const rc1 = await rc();
  check('a kind folds (and stays folded after a redraw)', rc1.includes('r3:미팅') && !rc1.some(x => x.startsWith('r2:6차 리서치') && x.endsWith('미팅')) && await ev(() => { render(true); return !!document.querySelector('#sb-recent .r3[data-rec="project:pangyo|미팅"]'); }), rc1);
  await a.click('#sb-recent [data-rec="project:pangyo|미팅"]'); await sleep(200);
  await a.click(`#sb-recent .r2[data-open="${r2[1]}"]`); await sleep(400);
  check('an item of the tree opens it', await ev(id => S.panel === id, r2[1]));
  await ev(() => closePanel(true));

  console.log('— notices');
  await flush(a); await sleep(600);
  const n0 = await ev(() => ({ input: !!document.querySelector('#notice-in'), plus: getComputedStyle(document.querySelector('#notice .nplus')).display }));
  await a.click('#notice .head'); await sleep(200);
  const n1 = await ev(() => ({ plus: getComputedStyle(document.querySelector('#notice .nplus')).display, input: !!document.querySelector('#notice-in') }));
  check('no “type and Enter” line; the + shows once the bar is open', !n0.input && n0.plus === 'none' && n1.plus !== 'none' && !n1.input, { n0, n1 });
  await a.click('#notice .nplus'); await sleep(200); await a.click('#notice [data-nt="save"]'); await sleep(200);
  check('a notice needs a title', await ev(() => !!document.querySelector('#nt-title') && !NOTICES.some(x => x.title === '')));
  await a.fill('#nt-title', '6차 공지 ' + sfx); await a.fill('#nt-body', '첫 줄\n둘째 줄 ' + sfx); await a.click('#notice [data-nt="save"]'); await sleep(400);
  const n2 = await ev(t => { const x = NOTICES.find(y => y.title === t); return x ? { body: x.body, text: x.text, by: x.by === sharedUser, own: !![...document.querySelectorAll('#notice .nrow')].find(r => r.querySelector('.nt').textContent === t).querySelector('.nb'), head: document.querySelector('#notice .msg').textContent } : null; }, '6차 공지 ' + sfx);
  check('title and text are stored; my own notice carries no “new” mark', n2 && /둘째 줄/.test(n2.body) && n2.text.startsWith('6차 공지') && n2.by && !n2.own && n2.head === '6차 공지 ' + sfx, n2);
  await flush(a); await sleep(1500);
  const nb0 = await evb(t => ({ head: !!document.querySelector('#notice .lb .nb'), col: getComputedStyle(document.querySelector('#notice .lb .nb') || document.body).backgroundColor, msg: document.querySelector('#notice .msg').textContent, t }), '6차 공지 ' + sfx);
  check('the other member sees a green mark on the bar', nb0.head && nb0.col === 'rgb(26, 204, 0)' && nb0.msg === '6차 공지 ' + sfx, nb0);
  await b.click('#notice .head'); await sleep(200);
  const row = `#notice .nrow:has(.nt:text-is("6차 공지 ${sfx}"))`;
  check('…and on the new notice', await b.locator(row + ' .nb').count() === 1);
  await b.click(row); await sleep(300);
  const nb1 = await evb(t => ({ body: (document.querySelector('#notice .nbody') || {}).textContent || '', mark: !![...document.querySelectorAll('#notice .nrow')].find(r => r.querySelector('.nt').textContent === t).querySelector('.nb'), seen: (INBOX_STATE.nseen || []).length }), '6차 공지 ' + sfx);
  check('a click shows its text; the mark is gone and that is remembered', /첫 줄/.test(nb1.body) && /둘째 줄/.test(nb1.body) && !nb1.mark && nb1.seen === 1, nb1);
  await b.mouse.click(900, 700); await sleep(250);
  check('a click anywhere else closes the bar', await evb(() => !document.querySelector('#notice').classList.contains('open')));
  await ev(t => { NOTICES = NOTICES.filter(x => x.title !== t); renderNotice(); }, '6차 공지 ' + sfx); await ev(() => schNoticeClose());

  console.log('— footer');
  const foot = async () => ev(() => { const f = document.querySelector('.page.on .pfoot'); if (!f) return null; const prev = f.previousElementSibling; return { gap: Math.round(f.getBoundingClientRect().top - prev.getBoundingClientRect().bottom), cols: f.querySelectorAll('.fc').length, logo: f.querySelector('.flogo').textContent, last: f.parentElement.lastElementChild === f }; });
  const f1 = await foot(); await goP(); const f2 = await foot(); await ev(() => go('archive')); await sleep(500); const f3 = await foot();
  check('one footer below every page, after the same room', f1 && f2 && f3 && f1.gap === 240 && f2.gap === 240 && f3.gap === 240 && f1.cols === 2 && f1.last && f2.last && f3.last, { f1, f2, f3 });
  await a.click('.page.on .pfoot [data-foot="trash"]'); await sleep(400);
  check('its links work (휴지통 opens the my page there)', await ev(() => MP.open && mpKey() === 'trash')); await ev(() => closeModal());
  await a.click('.page.on .pfoot [data-go="main"]'); await sleep(500);
  check('…and 메인 페이지 goes to the main page', await ev(() => S.page === 'main'));

  console.log('— main page');
  const pm = await ev(() => { const lg = document.querySelector('#page-main .tbl.partners .rw .nm .lg'); return { w: Math.round(lg.getBoundingClientRect().width * 10) / 10, boxes: [...document.querySelectorAll('#page-main .sec-title .srch')].map(x => x.classList.contains('box') && Math.round(x.getBoundingClientRect().height)) }; });
  check('partner logos 30% smaller (26.6 → 18.6)', Math.abs(pm.w - 18.6) < .3, pm);
  check('the three search boxes look like the project page\'s (grey box, 38 high)', pm.boxes.length === 3 && pm.boxes.every(h => h === 38), pm);
  const mid = await ev(([t]) => { const m = newItem('meeting', { title: t, proj: 'pangyo', status: 'published' }); const p = PARTNERS.find(x => !x.trash && partnerRows().slice(0, 10).includes(x)); p.meet = m.id; render(true); return { m: m.id, p: p.id }; }, ['6차 협력 미팅 ' + sfx]); await sleep(400);
  const chip = `#page-main .tbl.partners .rw[data-partner="${mid.p}"] .mt .chip`;
  const cy = await ev(sel => { const c = document.querySelector(sel); return c ? getComputedStyle(c).top : null; }, chip);
  await a.click(chip); await sleep(500);
  check('the meeting tag of a partner stands on the row\'s middle line (no offset since the tenth round) and opens that meeting', cy === '0px' && await ev(id => S.panel === id, mid.m), cy);
  await ev(() => closePanel(true));
  const tb = await ev(() => { const t = document.querySelector('#page-main .tbl.sch-list.sch-all'), ttl = document.querySelector('#sec-actions .sec-title').getBoundingClientRect(); return t ? { hd: [...t.querySelectorAll('.hd span')].map(s => s.textContent.trim()), left: Math.round(t.getBoundingClientRect().left - ttl.left), per: !!document.querySelector('#sec-actions .sec-title [data-per]'), perRow: !!document.querySelector('#sec-actions .sch-filters [data-per]') } : null; });
  check('the action table is the project page\'s list with 프로젝트 in front', tb && JSON.stringify(tb.hd) === JSON.stringify(['프로젝트', 'WBS', '업무명', '시작일', '완료일', '중요도', '상태', '담당자', '기한', 'URL']) && Math.abs(tb.left) < 6 && !tb.per && tb.perRow, tb);
  await ev(t => { newItem('action', { title: t, proj: 'pangyo', status: 'published', pri: 'high' }); render(true); }, '6차 높음 ' + sfx); await sleep(300);   // the demo actions are gone: one of our own to filter for
  await a.click('#page-main [data-mcol="pri"]'); await sleep(250); await a.click('.pop .it:has(.pri-high)'); await sleep(400);
  const fl = await ev(() => { const rows = [...document.querySelectorAll('#page-main .tbl.sch-list.sch-all .rw')], c = document.querySelector('#sec-actions .sch-chiprow .sch-chip'), ttl = document.querySelector('#sec-actions .sec-title').getBoundingClientRect(), tbl = document.querySelector('#page-main .tbl.sch-list.sch-all').getBoundingClientRect(), cr = c && c.getBoundingClientRect();
    return { n: rows.length, all: rows.every(r => r.querySelector('.pri-high')), chip: c && c.textContent, between: !!cr && cr.top >= ttl.bottom - 1 && cr.bottom <= tbl.top + 1, h: cr && Math.round(cr.height), bg: c && getComputedStyle(c).backgroundColor, inTitle: !!document.querySelector('#sec-actions .sec-title .sch-chip'), flt: !!document.querySelector('#page-main [data-mcol="pri"].flt') }; });
  check('a column title filters; what is filtered is a small grey tag between the title and the table', fl.n > 0 && fl.all && /중요도: 높음/.test(fl.chip) && fl.between && !fl.inTitle && fl.h === 20 && fl.bg === 'rgb(241, 241, 240)' && fl.flt, fl);
  await a.hover('#sec-actions .sch-chiprow .sch-chip'); await sleep(250);
  check('the tag turns darker under the pointer', await ev(() => getComputedStyle(document.querySelector('#sec-actions .sch-chiprow .sch-chip')).backgroundColor === 'rgb(217, 217, 217)'));
  await a.click('#sec-actions .sch-chiprow .sch-chip'); await sleep(300);
  check('a click on the tag takes the filter off', await ev(() => !Object.keys(S.mf).length && !document.querySelector('#sec-actions .sch-chip')));
  await a.click('#page-main [data-mcol="due"]'); await sleep(200); await a.click('.pop .it:has-text("가까운 순")'); await sleep(300);
  check('…and a column title orders', await ev(() => S.sort.k === 'due' && !!document.querySelector('#page-main [data-mcol="due"].sorted')));
  await ev(() => { S.sort = { k: '', dir: 1 }; refreshSec('action'); });
  await a.click('#page-main [data-rpick="when"]'); await sleep(200); await a.click('.pop .it:has-text("올해")'); await sleep(300);
  const rf = await ev(() => ({ chip: (document.querySelector('#sec-research .sch-chiprow .sch-chip') || {}).textContent, cards: document.querySelectorAll('#page-main .rcard').length, yr: [...document.querySelectorAll('#page-main .rcard .dt')].every(d => d.textContent.trim().startsWith(TODAY.slice(0, 4))) }));
  check('research: pickers above the cards filter them, with the same tags', /기간: 올해/.test(rf.chip || '') && rf.cards > 0 && rf.yr, rf);
  await a.click('#sec-research .sch-chiprow .sch-chip'); await sleep(250);
  await a.click('#page-main .tbl.partners [data-cat]'); await sleep(400);
  check('the partner list\'s filter is such a tag too, not a button beside the title', await ev(() => !!document.querySelector('#page-main #sec-partners .sch-chiprow .sch-chip[data-catclear]') && !document.querySelector('#page-main #sec-partners .sec-title [data-catclear]')));
  await a.click('#page-main #sec-partners .sch-chip'); await sleep(300);
  // project cards
  await a.waitForFunction(() => !!schModel('pangyo'), null, { timeout: 15000 }); await ev(() => render(true)); await sleep(300);
  const card = () => ev(() => { const c = document.querySelector('#proj-inner .pcard[data-go="project:pangyo"] .info'), rows = [...c.children].map(d => d.textContent.trim()); return { first: rows[0], second: rows[1], fs: getComputedStyle(c).fontSize, want: schD(schModel('pangyo').res.operationDate), other: [...document.querySelectorAll('#proj-inner .pcard:not([data-go="project:pangyo"]) .info .ops')].map(x => x.textContent) }; });
  const c0 = await card();
  check('a project card names the expected operation date above 담당자; type half a point larger', c0.first.startsWith('운영개시 예상') && c0.first.includes(c0.want) && c0.want === '2028. 09. 28' && c0.second.startsWith('담당자') && c0.fs === '12.5px' && c0.other.every(t => /미정/.test(t)), c0);
  const w78 = await ev(() => { const t = schModel('pangyo').byWbs.get('W7.8'); schEditTask('pangyo', t.id, '검사', x => { x.delay = (x.delay || 0) + 1; }, true); render(true); return t.id; }); await sleep(400);
  const c1 = await card();
  check('…and follows the schedule when that date moves', c1.first.includes('2028. 09. 29'), c1.first);
  await ev(id => { schEditTask('pangyo', id, '검사 되돌림', x => { x.delay = Math.max(0, (x.delay || 0) - 1); }, true); render(true); }, w78); await sleep(300);
  // the window that makes a project
  await a.click('#page-main .new-proj'); await sleep(300);
  check('+ beside 프로젝트 opens a window of its own', await ev(() => !!document.querySelector('.dlg.sch-np #np2-name') && !document.querySelector('.pop')));
  await a.click('.sch-np [data-np2="ok"]'); await sleep(200);
  check('it needs a name', await ev(() => /사업명을 입력/.test(document.querySelector('#np2-err').textContent)));
  await a.fill('#np2-name', '6차 검사 사업 ' + sfx); await a.click('.sch-np [data-st="진행중"]'); await a.click('.sch-np [data-np2="ok"]'); await sleep(900);
  const np = await ev(t => { const id = Object.keys(PROJECTS).find(k => PROJECTS[k].full === t), p = PROJECTS[id]; return p ? { id, tag: p.tag, st: p.status, page: S.page === 'project' && S.proj === id, edit: S.editProj } : null; }, '6차 검사 사업 ' + sfx);
  check('the project is made with name and class (no short name since the eighth round: it is the name), and opens for its overview', np && np.tag === '6차 검사 사업 ' + sfx && np.st === '진행중' && np.page && np.edit, np);
  await a.click('#page-project [data-editproj]'); await sleep(1500);
  await ev(id => { go('main'); trashProject(id); purgeOne('project', id); render(true); }, np.id); await sleep(800);

  console.log('— project page');
  await goP();
  const rl = () => ev(() => { const el = document.querySelector('#page-project .rlist.sch'), box = el.querySelector('.rscroll'), ln = [...el.querySelectorAll('.rline')].map(x => Math.round(x.getBoundingClientRect().top)), caps = [...el.querySelectorAll('.rcap')].map(c => c.querySelector('.lb').textContent), act = el.querySelector('.rcap.act'), d = el.querySelector('.rdate').getBoundingClientRect(), grid = document.querySelector('#page-project .cal .grid').getBoundingClientRect(), n = act.querySelector('.n').getBoundingClientRect(), ic = [...el.querySelectorAll('.rcap .ic')].map(i => Math.round(i.getBoundingClientRect().left));
    return { ln, caps, actTop: Math.round(act.getBoundingClientRect().top), boxTop: Math.round(box.getBoundingClientRect().top), dateAbove: d.bottom <= ln[0], grid: Math.round(grid.bottom), n: act.querySelector('.n').textContent, rows: el.querySelectorAll('.ra').length, ic, scroll: box.scrollTop, max: box.scrollHeight - box.clientHeight, txt: el.textContent }; });
  const q0 = await rl();
  check('주요일정 and 액션 (no “금일”), each with a pictogram in the same place; the count in its bubble', JSON.stringify(q0.caps) === JSON.stringify(['주요일정', '액션']) && !/금일/.test(q0.txt) && q0.ic[0] === q0.ic[1] && +q0.n === q0.rows && q0.rows > 0, q0);
  check('the date stands above the upper line; the lower line is the calendar\'s lower edge', q0.dateAbove && Math.abs(q0.ln[1] - q0.grid) <= 2, q0);
  await ev(() => { const b = document.querySelector('#page-project .rlist.sch .rscroll'); b.scrollTop = b.scrollHeight; }); await sleep(300);
  const q1 = await rl();
  check('the list scrolls between the two lines, which do not move; the caption 액션 stays at the top', q0.max > 40 && q1.scroll > 40 && q1.ln[0] === q0.ln[0] && q1.ln[1] === q0.ln[1] && Math.abs(q1.actTop - q1.boxTop) <= 1, { q0: q0.ln, q1 });
  await ev(() => { document.querySelector('#page-project .rlist.sch .rscroll').scrollTop = 0; });
  const up = async () => ev(() => { const box = document.querySelector('#sch-lower .sch-tabs.lead'), on = box.querySelector('button.on').getBoundingClientRect(), add = box.querySelector('.sch-evadd.up').getBoundingClientRect(), lib = document.querySelector('#sch-lower .sec-title .lib'); return { dx: Math.round(Math.abs((add.left + add.right) / 2 - (on.left + on.right) / 2)), above: add.bottom <= on.top + 4, lib: !!lib, k: SCHU.sec }; });
  await ev(() => { SCHU.sec = 'proc'; schLowerRefresh(); }); await sleep(400); const u0 = await up();
  await a.click('#sch-lower [data-sch="sec"][data-k="evid"]'); await sleep(500); const u1 = await up();
  check('the + stands above the open tab and follows it; 라이브러리 stays', u0.dx <= 2 && u0.above && u1.dx <= 2 && u1.above && u1.k === 'evid' && u0.lib, { u0, u1 });
  await a.click('#sch-lower .sch-evadd.up'); await sleep(300);
  check('…and still adds to that tab', await ev(() => !!document.querySelector('.pop, #dlg, #panel.on .ititle')));
  await ev(() => { closePop(); const d = document.querySelector('#dlg'); if (d) d.remove(); if (S.panel) closePanel(true); SCHU.sec = 'proc'; schLowerRefresh(); }); await sleep(300);
  await ev(() => { SCHU.scope = 'mine'; schRefresh(); }); await sleep(300);
  check('the tags of the action section stand between its title and the list, not beside 라이브러리', await ev(() => { const c = document.querySelector('#sch-actions .sch-chiprow .sch-chip'), t = document.querySelector('#sch-actions .sec-title'); return !!c && !t.querySelector('.sch-chip') && c.getBoundingClientRect().top >= t.getBoundingClientRect().bottom - 1; }));
  await a.click('#sch-actions .sch-chiprow .sch-chip'); await sleep(300);
  check('…and still take the filter off', await ev(() => SCHU.scope === 'all'));
  check('meeting cards cut by the edge fade to white', await ev(() => { const f = document.querySelector('#page-project .meet .fade.r'); return !!f && /gradient/.test(getComputedStyle(f).backgroundImage); }));
  const w0 = await ev(() => [...document.querySelectorAll('#page-project .phead .col')].map(c => Math.round(c.getBoundingClientRect().width)));
  await a.click('#sb-collapse'); await sleep(700);
  const w1 = await ev(() => ({ w: [...document.querySelectorAll('#page-project .phead .col')].map(c => Math.round(c.getBoundingClientRect().width)), per: schResPer(), cols: getComputedStyle(document.querySelector('#page-project .rgrid')).gridTemplateColumns.split(' ').length, cards: document.querySelectorAll('#page-project .rcard').length, total: liveItems('research', 'pangyo').length }));
  check('folded sidebar: the three columns of 사업개요 all get wider', w1.w[0] > w0[0] + 20 && w1.w[1] > w0[1] + 20 && w1.w[2] > w0[2] + 20, { w0, w1: w1.w });
  check('…and research shows whole rows (two rows of as many cards as fit)', w1.per === w1.cols * 2 && w1.cards === Math.min(w1.total, w1.per) && w1.cols === 7, w1);
  await a.click('#sb-open'); await sleep(600);
  // the day window
  await ev(() => { const c = document.querySelector('#content'); c.scrollTop = document.querySelector('#page-project [data-sec="cal"]').offsetTop - 20; }); await sleep(300);
  const badge = await ev(() => { const cells = [...document.querySelectorAll('#page-project .cal .cell[data-date]')].filter(c => c.dataset.date !== TODAY && c.querySelector('.acnt')); const c = cells[Math.min(3, cells.length - 1)]; c.querySelector('.acnt').setAttribute('data-t6', '1'); return c.dataset.date; });
  await a.hover('#page-project .cal .acnt[data-t6]'); await sleep(900);
  const dp = await ev(() => { const p = document.querySelector('.sch-daypop'); return p ? { w: Math.round(p.getBoundingClientRect().width), full: p.offsetWidth, z: LAYOUT.zoom || 1 } : null; });
  check('the window of a day is 30% smaller', dp && Math.abs(dp.w - dp.full * dp.z * .7) <= 2 && dp.full === 505, dp);
  await a.mouse.move(600, 20); await sleep(500);
  // partners in the overview
  const pn = await ev(() => { const p = PARTNERS.find(x => !x.trash); return p.name; });
  await ev(() => { document.querySelector('#content').scrollTop = 0; }); await a.click('#page-project [data-editproj]'); await sleep(1200);
  const n0p = await ev(() => document.querySelectorAll('.phead .partners a[data-k]').length);
  await a.click('#page-project [data-addpartnerrow]'); await sleep(300);
  await a.keyboard.type('@' + pn.slice(0, 2)); await sleep(400);
  const at = await ev(() => { const p = document.querySelector('.pop.sch-at'); return p ? [...p.querySelectorAll('[data-at]')].map(x => x.querySelector('.t').textContent) : null; });
  check('@ and a few letters in a partner field list the matching partners', at && at.length > 0 && at.every(t => t.toLowerCase().includes(pn.slice(0, 2).toLowerCase())), at);
  await a.keyboard.press('Enter'); await sleep(300);
  check('Enter takes the chosen one (the field keeps the plain name)', await ev(([n, k]) => { const f = [...document.querySelectorAll('.phead .partners a[data-k]')].pop(); return f.textContent === n && !document.querySelector('.pop.sch-at') && document.querySelectorAll('.phead .partners a[data-k]').length === k + 1; }, [pn, n0p]));
  await a.click('#page-project [data-editproj]'); await sleep(1500);
  const lk = await ev(n => { const l = [...document.querySelectorAll('.phead .partners .lk')].find(x => x.querySelector('a').textContent.trim() === n); return l ? { logo: !!l.querySelector('i.plogo'), w: Math.round(l.querySelector('i').getBoundingClientRect().width) } : null; }, pn);
  check('saved: a partner that is in the list carries its small logo', lk && lk.logo && lk.w <= 18, lk);
  await a.click(`.phead .partners .lk a[data-partnername="${pn}"]`); await sleep(400);
  check('…and opens that partner', await ev(n => { const p = PARTNERS.find(x => x.id === S.panel); return !!p && p.name === n; }, pn));
  // clean up what this test wrote
  await ev(() => closePanel(true)); await a.click('#page-project [data-editproj]'); await sleep(1000);
  await ev(() => { saveProjectHead(); PHEAD.pangyo.partners = PHEAD.pangyo.partners.slice(0, -1); render(true); }); await a.click('#page-project [data-editproj]'); await sleep(1500);
  await ev(async ([ids, m, p]) => { const pt = PARTNERS.find(x => x.id === p); if (pt) pt.meet = null; for (const id of ids.concat(m)) { const it = item(id); if (it) await trashItem(it); } }, [[r1, ...r2], mid.m, mid.p]); await flush(a); await sleep(600);

  console.log('— without the preview');
  const C = await newUser(browser, 'R6C' + sfx, '여섯 삼'), c = C.page;
  const old = await c.evaluate(() => ({ foot: !!document.querySelector('.pfoot'), tree: !!document.querySelector('#sb-recent .r0'), tb: getComputedStyle(document.querySelector('.tb-logo')).display, input: (document.querySelector('#notice').classList.add('open'), !!document.querySelector('#notice-in')), box: !!document.querySelector('#page-main .srch.box'), main: !!document.querySelector('#page-main .tbl.actions') && !document.querySelector('#page-main .tbl.sch-list') }));
  check('the page without the preview is as it was (no footer, flat recent list, its own logo, the Enter line, the old table)', !old.foot && !old.tree && old.tb === 'none' && old.input && !old.box && old.main, old);

  const errs = [...A.errs, ...B.errs, ...C.errs];
  check('no script errors', errs.length === 0, errs.slice(0, 5));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
