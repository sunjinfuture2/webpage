// WorkSpace x Schedule (preview), seventh part (owner's seventh round, 2026-11-20): colours of the calendar's pictograms, soft upper
// edge of the day list, sidebar, footer (line, logo, the company's places), research tags and widths, tags of filters, breadcrumb;
// project page: + above the tab, gantt (scroll bar below, % tags, bar ends, what a change looks like), relation map (pull to move,
// wheel to zoom, circle to link), gates. Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'R7A' + sfx, '일곱 일', { url: V2 }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const flush = () => a.evaluate(() => sharedFlush(true));
  const goP = async () => { await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };
  const rgb = h => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

  console.log('— calendar, sidebar, breadcrumb');
  const ids = await ev(t => { const m = newItem('meeting', { title: t + ' 미팅', proj: 'pangyo', status: 'published' }), b = newItem('meeting', { title: t + ' 부산', proj: 'busan', status: 'published' }), r = newItem('research', { title: '[REF] ' + t, proj: 'pangyo', status: 'published' }), r2 = newItem('research', { title: '[REF] ' + t + ' 둘', proj: 'pangyo', status: 'published' }), r3 = newItem('research', { title: '[ENERGY] ' + t, proj: 'pangyo', status: 'published' }), r4 = newItem('research', { title: '[ENERGY] ' + t + ' 둘', proj: 'pangyo', status: 'published' }); render(true); return [m.id, b.id, r.id, r2.id, r3.id, r4.id]; }, '7차 ' + sfx); await sleep(500);
  const c0 = await ev(([m, b, r]) => { const col = id => { const e = document.querySelector(`#page-main .cal .ev[data-open="${id}"] .sq .pict`); return e ? getComputedStyle(e).color : null; }; return { m: col(m), b: col(b), r: getComputedStyle(document.querySelector('#page-main .cal .legend .ty-research .pict')).color, pm: PROJECTS.pangyo.color, pb: PROJECTS.busan.color }; }, ids);
  check('main calendar: a meeting\'s pictogram takes its project\'s colour, research a dark grey', c0.m === rgb(c0.pm) && c0.b === rgb(c0.pb) && c0.m !== c0.b && c0.r === 'rgb(120, 120, 120)', c0);
  await goP();
  const c1 = await ev(() => { const lg = [...document.querySelectorAll('#page-project .cal .legend span .pict')].map(e => getComputedStyle(e).color), ac = document.querySelector('#page-project .cal .cell.today .acnt svg'), o = document.querySelector('#page-project .cal .cell:not(.today):not(.out) .acnt svg'); return { lg, today: ac && getComputedStyle(ac).color, top: ac && getComputedStyle(ac).opacity, other: o && getComputedStyle(o).color, oop: o && getComputedStyle(o).opacity, pm: PROJECTS.pangyo.color }; });
  check('project calendar: legend and today\'s count of actions in the project\'s colour, other days grey (eighth round), research dark grey', c1.lg[0] === rgb(c1.pm) && c1.lg[1] === rgb(c1.pm) && c1.lg[2] === 'rgb(120, 120, 120)' && c1.today === rgb(c1.pm) && c1.top === '1' && c1.other === 'rgb(207, 207, 207)', c1);
  await ev(() => { const c = document.querySelector('#content'); c.scrollTop = document.querySelector('#page-project [data-sec="cal"]').offsetTop - 20; }); await sleep(300);
  const e0 = await ev(() => { const b = document.querySelector('#page-project .rlist.sch .rscroll'); return { stuck: b.querySelectorAll('.rcap.stuck').length, op: getComputedStyle(b.querySelector('.rcap.act'), '::after').opacity }; });
  await ev(() => { const b = document.querySelector('#page-project .rlist.sch .rscroll'); b.scrollTop = b.scrollHeight / 2; }); await sleep(450);
  const e1 = await ev(() => { const b = document.querySelector('#page-project .rlist.sch .rscroll'), c = b.querySelector('.rcap.act'), s = getComputedStyle(c, '::after'); return { stuck: c.classList.contains('stuck'), op: s.opacity, bg: s.backgroundImage, cut: b.classList.contains('cut') }; });
  check('the day list fades at its upper edge too once it is scrolled (below the caption that stays)', e0.stuck === 0 && e0.op === '0' && e1.stuck && e1.op === '1' && /gradient/.test(e1.bg), { e0, e1 });
  await ev(() => { document.querySelector('#page-project .rlist.sch .rscroll').scrollTop = 0; });
  for (const id of [ids[0], ids[2]]) { await ev(i => openPanel(i, true), id); await sleep(250); } await ev(() => closePanel(true)); await sleep(300);
  const sb = await ev(() => { const rows = [...document.querySelectorAll('#sb-recent .item')]; return { dark: rows.filter(r => !r.classList.contains('on') && getComputedStyle(r).color !== 'rgb(142, 142, 142)' && getComputedStyle(r).color !== 'rgb(155, 155, 155)').map(r => r.textContent + getComputedStyle(r).color), on: rows.filter(r => r.classList.contains('on')).map(r => getComputedStyle(r).color), nums: document.querySelectorAll('#sb-recent .rn').length, n: rows.length }; });
  check('sidebar: only the open entry is dark; no counts beside the kinds', sb.n >= 4 && sb.dark.length === 0 && sb.on.length === 1 && sb.on[0] === 'rgb(43, 43, 43)' && sb.nums === 0, sb);
  await ev(i => openPanel(i, true), ids[0]); await sleep(400);
  const cr = await ev(() => [...document.querySelectorAll('#crumbs > *')].map(e => getComputedStyle(e).opacity));
  check('the way to the open page: every part but the last at half strength', cr.length >= 3 && cr[cr.length - 1] === '1' && cr.slice(0, -1).every(o => o === '0.5'), cr);
  await ev(() => closePanel(true));
  check('no “n개 중 n개 표시” beside 미팅', await ev(() => (document.querySelector('#meet-cnt') || {}).textContent === ''));

  console.log('— footer');
  const f0 = await ev(() => { const f = document.querySelector('.page.on .pfoot'), ln = f.querySelector('.fline').getBoundingClientRect(), c = document.querySelector('#content').getBoundingClientRect(), prev = f.previousElementSibling; return { gap: Math.round(f.getBoundingClientRect().top - prev.getBoundingClientRect().bottom), left: Math.round(ln.left - c.left), right: Math.round(c.right - ln.right), logo: getComputedStyle(f.querySelector('.flogo')).color, links: [...f.querySelectorAll('.fout .fx')].map(x => x.getAttribute('aria-label') || x.textContent), off: f.querySelectorAll('.fout .fx.off').length, icons: [...f.querySelectorAll('.fout .fx.ic')].map(x => getComputedStyle(x).color) }; });
  check('twice the room above the footer; its line runs across the whole page; the logo is black', f0.gap === 240 && f0.left <= 1 && f0.right <= 16 && f0.logo === 'rgb(15, 15, 15)', f0);
  check('the company\'s places: 그룹웨어, 홈페이지 and three grey marks (YouTube, Instagram, Facebook); without an address they are pale', JSON.stringify(f0.links) === JSON.stringify(['그룹웨어', '회사 홈페이지', 'YouTube', 'Instagram', 'Facebook']) && f0.off === 5 && f0.icons.length === 3 && new Set(f0.icons).size === 1 && f0.icons[0] === 'rgb(154, 154, 154)', f0);
  await a.click('.page.on .pfoot .fx.off >> nth=0'); await sleep(500);
  check('one without an address says so and leads the one who may set it to the settings', await ev(() => /주소/.test(document.querySelector('#toast').textContent) && (canAdmin() ? MP.open && mpKey() === 'settings.general' : !MP.open)));
  if (await ev(() => canAdmin())) {
    await a.fill('[data-mpf="ws.lk_home"]', 'https://example.com/'); await a.fill('[data-mpf="ws.lk_youtube"]', 'not a link'); await sleep(200);
    check('an address must be one', await ev(() => /주소를 입력/.test(document.querySelector('[data-mperr="ws.lk_youtube"]').textContent) && document.querySelector('[data-mp="save:ws"]').disabled));
    await a.fill('[data-mpf="ws.lk_youtube"]', ''); await sleep(150); await a.click('[data-mp="save:ws"]'); await sleep(1500); await ev(() => closeModal()); await sleep(300);
    const f1 = await ev(() => { const x = document.querySelector('.page.on .pfoot .fout .fx'), h = [...document.querySelectorAll('.page.on .pfoot .fout .fx')].find(y => y.textContent === '회사 홈페이지'); return { href: h.getAttribute('href'), target: h.target, off: document.querySelectorAll('.page.on .pfoot .fout .fx.off').length, stored: (SETTINGS.links || {}).home }; });
    check('a stored address makes the entry a link that opens in a new tab', f1.href === 'https://example.com/' && f1.target === '_blank' && f1.off === 4 && f1.stored === 'https://example.com/', f1);
    await ev(() => { SETTINGS.links = {}; render(true); }); await flush();
  } else await ev(() => closeModal());

  console.log('— research, tags of filters');
  await ev(() => go('main')); await sleep(500);
  const rp = await ev(() => [...document.querySelectorAll('#sec-research .sch-filters [data-rpick]')].map(e => e.dataset.rpick));
  check('research: a picker for tags, none for the project', rp[0] === 'tag' && !rp.includes('proj'), rp);
  await a.click('#sec-research [data-rpick="tag"]'); await sleep(250);
  const tags = await ev(() => [...document.querySelectorAll('.pop .it')].map(e => e.textContent.trim()));
  await a.click('.pop .it:has-text("[ENERGY]")'); await sleep(400);
  const rt = await ev(() => ({ chip: (document.querySelector('#sec-research .sch-chiprow .sch-chip') || {}).textContent, titles: [...document.querySelectorAll('#page-main .rcard .tt')].map(e => e.textContent.trim().split('\n')[0]) }));
  check('the tags written in front of titles are found ([REF], [ENERGY] …) and filter the cards', tags[0] === '전체 구분' && tags.some(t => t.startsWith('[REF]')) && tags.some(t => t.startsWith('[ENERGY]')) && tags[tags.length - 1].startsWith('구분 없음') && /구분: \[ENERGY\]/.test(rt.chip || '') && rt.titles.length >= 2 && rt.titles.every(t => t.toUpperCase().startsWith('[ENERGY]')), { tags, rt }); await ev(() => closePop());   // the list of 구분 stays open (several can be ticked)
  const chipY = await ev(() => { const c = document.querySelector('#sec-research .sch-chip'); return { pt: getComputedStyle(c).paddingTop, h: c.offsetHeight }; });
  check('the word of a tag sits 1 lower (the tag itself stays 20 high)', chipY.pt === '2px' && chipY.h === 20, chipY);
  await a.click('#sec-research .sch-chip'); await sleep(300);
  const grid = async () => ev(() => { const g = document.querySelector('.page.on .rgrid'), cards = [...g.querySelectorAll('.rcard')], r0 = cards[0].getBoundingClientRect(), r1 = cards[1].getBoundingClientRect(), gr = g.getBoundingClientRect(), row = cards.filter(c => Math.abs(c.getBoundingClientRect().top - r0.top) < 2), last = row[row.length - 1].getBoundingClientRect(), z = LAYOUT.zoom || 1; return { w: Math.round(r0.width / z * 10) / 10, gap: Math.round((r1.left - r0.right) / z * 10) / 10, cols: row.length, flush: Math.round((gr.right - last.right) / z), n: cards.length }; });
  const g1 = await grid(); await a.setViewportSize({ width: 1700, height: 1000 }); await sleep(700); await ev(() => render(true)); await sleep(300); const g2 = await grid(); await a.setViewportSize({ width: 1920, height: 1080 }); await sleep(700); await ev(() => render(true)); await sleep(300);
  check('research cards share the width: never under 210.3, the gap stays, the row ends at the edge', g1.w >= 210.2 && g1.gap === 15 && Math.abs(g1.flush) <= 1 && g2.w >= 210.2 && g2.gap === 15 && Math.abs(g2.flush) <= 1 && g1.n === g1.cols * 2, { g1, g2 });
  check('the main action table has no pickers above it (its column titles do that)', await ev(() => !document.querySelector('#sec-actions [data-mpick]') && !!document.querySelector('#sec-actions .sch-filters [data-per]')));
  await ev(() => { S.mf = { proj: 'pangyo', pri: 'high' }; refreshSec('action'); }); await sleep(300);
  const mc = await ev(() => [...document.querySelectorAll('#sec-actions .sch-chip')].map(c => c.textContent + '|' + getComputedStyle(c).color));
  check('main page: the tag of a project filter is in that project\'s colour', mc.length === 2 && mc[0].startsWith('프로젝트') && mc[0].endsWith(rgb(await ev(() => PROJECTS.pangyo.color))) && mc[1].endsWith('rgb(92, 92, 92)'), mc);
  await ev(() => { S.mf = {}; refreshSec('action'); });
  const y0 = await ev(() => { const c = document.querySelector('#content'); c.scrollTop = document.querySelector('#sec-partners').offsetTop - 200; return c.scrollTop; }); await sleep(200);
  await a.click('#page-main .tbl.partners [data-cat]'); await sleep(500); const y1 = await ev(() => document.querySelector('#content').scrollTop);
  await a.click('#page-main #sec-partners .sch-chip'); await sleep(500); const y2 = await ev(() => document.querySelector('#content').scrollTop);
  check('taking the partner filter off leaves the page where it is (it used to jump to the top)', y0 > 500 && y2 > 500 && Math.abs(y2 - y1) < 400, { y0, y1, y2 });

  console.log('— project page');
  await goP();
  await ev(() => { SCHU.tab = 'list'; SCHU.scope = 'late'; schRefresh(); }); await sleep(400);
  const pc = await ev(() => { const c = document.querySelector('#sch-actions .sch-chiprow .sch-chip'); return { col: c && getComputedStyle(c).color, pm: PROJECTS.pangyo.color, pick: !!document.querySelector('#sch-actions .sch-filters [data-sch="pick"][data-k="scope"]') }; });
  check('on a project page the tags of filters are in the project\'s colour; the list has no pickers', pc.col === rgb(pc.pm) && !pc.pick, pc);
  await ev(() => { SCHU.scope = 'all'; SCHU.tab = 'gantt'; SCHU.scale = 'week'; SCHU.phase = ''; SCHU.open = []; schRefresh(); const c = document.querySelector('#content'); c.scrollTop = document.querySelector('#sch-actions').offsetTop - 40; }); await sleep(700);
  const tg0 = await ev(() => { const box = document.querySelector('#sch-gantt'), host = box.querySelector('.sg-scroll'), tags = [...box.querySelectorAll('.sg-tags b')], marks = [...host.querySelectorAll('.sg-mark')]; return { dy: tags.map((t, i) => { const r = t.getBoundingClientRect(); return Math.round(((r.top + r.bottom) / 2 - marks[i].getBoundingClientRect().top) * 10) / 10; }), shape: tags.every(t => !!t.querySelector('svg path')), tip: tags.map(t => Math.round(t.getBoundingClientRect().right - box.getBoundingClientRect().left)), txt: tags.map(t => t.textContent) }; });
  await ev(() => { SCHU.open = [schModel('pangyo').phases[0].code]; schRefresh(); }); await sleep(600);
  const g = await ev(() => { const box = document.querySelector('#sch-gantt'), host = box.querySelector('.sg-scroll'), tb = box.querySelector('.sg-topbar'), tags = [...box.querySelectorAll('.sg-tags b')], marks = [...host.querySelectorAll('.sg-mark')], tw = box.querySelector('.sg-row.ph.open .tw svg').getBoundingClientRect(), left = box.querySelector('.sg-left').getBoundingClientRect(), sh = getComputedStyle(box.querySelector('.sg-left'), '::after');
    return { below: tb.getBoundingClientRect().top >= host.getBoundingClientRect().bottom - 1, dy: tags.map((t, i) => { const r = t.getBoundingClientRect(); return Math.round(((r.top + r.bottom) / 2 - marks[i].getBoundingClientRect().top) * 10) / 10; }), shape: tags.every(t => !!t.querySelector('svg path')), tip: tags.map(t => Math.round(t.getBoundingClientRect().right - box.getBoundingClientRect().left)), cut: Math.round((tw.left - left.left) * 10) / 10, shade: sh.backgroundImage, blend: sh.mixBlendMode }; });
  check('gantt: the scroll bar is below the chart again', g.below, g);
  check('the % tags are one closed shape, level with their dashed lines, their tip on the chart\'s edge', tg0.dy.length === 3 && tg0.dy.every(d => Math.abs(d) <= 1) && tg0.shape && tg0.tip.every(x => Math.abs(x) <= 2) && tg0.txt.join() === '30%,60%,90%', tg0);
  check('an open phase row is not cut at the left; the shade at the table\'s edge darkens (multiply), it does not lighten', g.cut >= 0 && /rgba\(0, 0, 0/.test(g.shade) && g.blend === 'multiply', g);
  const up = await ev(() => { const box = document.querySelector('#sch-lower .sch-tabs.lead'), on = box.querySelector('button.on').getBoundingClientRect(), add = box.querySelector('.sch-evadd.up').getBoundingClientRect(); return Math.round(on.top - add.bottom); });
  check('the + of the lower section stands higher above its tab', up >= 8, up);
  // moving a bar, pulling its end
  const tid = await ev(() => { const m = schModel('pangyo'), t = m.phases[0].tasks.find(t => t.kind !== 'milestone' && !t.actualStart && !t.finishRule && (document.querySelector(`.sg-bar[data-bar="${t.id}"]`) || {}).offsetWidth > 60); return t.id; });
  const before = await ev(id => { const m = schModel('pangyo'), t = m.byId.get(id), r = m.res.tasks[id]; return { ps: t.plannedStart, pf: t.plannedFinish, s: r.start, f: r.finish, px: document.querySelector('#sch-gantt .sg-scroll')._px }; }, tid);
  const bb = await a.locator(`.sg-bar[data-bar="${tid}"]`).boundingBox();
  await a.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await a.mouse.down(); await a.mouse.move(bb.x + bb.width / 2 + before.px * 4 + 1, bb.y + bb.height / 2, { steps: 5 }); await sleep(200);
  const mid = await ev(() => ({ ghost: !!document.querySelector('#sch-gantt .sg-ghost'), labs: [...document.querySelectorAll('#sch-gantt .sg-dlab')].map(l => l.textContent), on: document.querySelectorAll('#sch-gantt .sg-dlab.on').length, tip: (document.querySelector('.sg-tip') || {}).textContent }));
  await a.mouse.up(); await sleep(700);
  const held = await ev(id => { const m = schModel('pangyo'), r = m.res.tasks[id], b = document.querySelector('#dlg .pp-dates'); return { s: r.start, win: b ? b.textContent : '', bt: b ? [...b.querySelectorAll('.bt button')].map(x => x.textContent).join() : '' }; }, tid);
  await a.click('#dlg [data-pp="ok"]'); await sleep(800);
  const aft = await ev(id => { const m = schModel('pangyo'), r = m.res.tasks[id]; return { s: r.start, f: r.finish, card: !!document.querySelector('#sch-card'), ghost: document.querySelectorAll('#sch-gantt .sg-ghost').length, chg: !!document.querySelector(`#sch-gantt .sg-bar.chg[data-bar="${id}"]`), toast: document.querySelector('#toast').classList.contains('on') && /되돌리기/.test(document.querySelector('#toast').textContent), ttx: document.querySelector('#toast').textContent }; }, tid);
  check('while a bar is pulled: where it stood stays as a dashed outline, both dates stand above its ends, a tag says by how much', mid.ghost && mid.labs.length === 2 && mid.on === 2 && /^\+4일기간 이동/.test(mid.tip || ''), mid);
  check('letting go saves nothing: a window says what will happen, in words (task, dates, others that move, operation date) with 취소 and 적용', held.s === before.s && /기간 이동 \+4일/.test(held.win) && /함께 바뀌는 업무/.test(held.win) && /운영개시 예상/.test(held.win) && held.bt === '취소,적용', held);
  check('적용 saves it: 되돌리기 in the toast, the bar flashes over the outline of where it stood', aft.s !== before.s && /기간 이동 \+4일/.test(aft.ttx) && aft.toast && !aft.card && aft.ghost >= 1 && aft.chg, aft);
  await ev(() => schUndo()); await sleep(600);
  check('되돌리기 takes the change back', await ev(([id, b]) => { const m = schModel('pangyo'), t = m.byId.get(id); return t.plannedStart === b.ps && t.plannedFinish === b.pf && !document.querySelector('#sch-card'); }, [tid, before]));
  const b2 = await a.locator(`.sg-bar[data-bar="${tid}"]`).boundingBox();
  await a.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2); await sleep(150); await a.mouse.move(b2.x + b2.width - 2, b2.y + b2.height / 2); await a.mouse.down(); await a.mouse.move(b2.x + b2.width - 2 + before.px * 3 + 1, b2.y + b2.height / 2, { steps: 5 }); await sleep(200);
  const mid2 = await ev(() => ({ tip: (document.querySelector('.sg-tip') || {}).textContent, on: [...document.querySelectorAll('#sch-gantt .sg-dlab.on')].map(l => l.className) })); await a.mouse.up(); await sleep(700); await a.click('#dlg [data-pp="ok"]'); await sleep(800);
  const aft2 = await ev(([id, b]) => { const m = schModel('pangyo'), t = m.byId.get(id), r = m.res.tasks[id]; return { ps: t.plannedStart, s: r.start, f: r.finish, longer: AIDCSchedule.dates.diffDays(r.finish, b.f) }; }, [tid, before]);
  check('a bar\'s right end is pulled to change the finish only', /^\+3일종료일 변경/.test(mid2.tip || '') && mid2.on.length === 1 && /\br\b/.test(mid2.on[0]) && aft2.ps === before.ps && aft2.s === before.s && aft2.longer === 3, { mid2, aft2 });
  await ev(() => { schCardHide(); schUndo(); }); await sleep(500);
  // pulling a relation: the line as it will be, the window with the outcome in one line and the kinds as pictures
  const b3 = await a.locator(`.sg-bar[data-bar="${tid}"]`).boundingBox(); await a.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2); await sleep(200);
  const port = await a.locator(`.sg-bar[data-bar="${tid}"] .pt.r`).boundingBox();
  const tg = await ev(id => { const m = schModel('pangyo'), bars = [...document.querySelectorAll('#sch-gantt .sg-bar')].filter(b => b.dataset.bar !== id && b.offsetWidth > 40 && !m.plan.dependencies.some(e => (e.from === id && e.to === b.dataset.bar) || (e.to === id && e.from === b.dataset.bar)) && parseFloat(b.style.left) > parseFloat(document.querySelector(`.sg-bar[data-bar="${id}"]`).style.left) + 80), r = bars[0].getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2, id: bars[0].dataset.bar }; }, tid);
  await a.mouse.move(port.x + port.width / 2, port.y + port.height / 2); await a.mouse.down(); await a.mouse.move(tg.x - 30, tg.y - 20, { steps: 4 }); await a.mouse.move(tg.x, tg.y, { steps: 4 }); await sleep(250);
  const lk = await ev(id => { const d = document.querySelector('#sch-gantt .sg-links .draft'), t = document.querySelector(`.sg-bar[data-bar="${id}"]`); return { d: d ? d.getAttribute('d') : '', end: t.classList.contains('ts'), tip: (document.querySelector('.sg-tip') || {}).textContent }; }, tg.id);
  await a.mouse.up(); await sleep(700);
  const dl = await ev(() => { const d = document.querySelector('.sch-dlg'); return d ? { glyphs: d.querySelectorAll('.pp-types button svg.rg').length, sum: (d.querySelector('.pp-sum') || {}).textContent || '', wrap: [...d.querySelectorAll('.pp-types button')].every(b => b.offsetHeight <= 32) } : null; });
  check('pulling a relation draws the line the chart will draw (with its bends) and marks the end it will reach', / [QL]/.test(lk.d) && lk.d.split(' ').length > 3 && lk.end && /^FS.*끝나면 → .*시작/.test(lk.tip || ''), lk);
  check('the window that follows shows the kinds as small pictures and the outcome in one line', dl && dl.glyphs === 4 && dl.wrap && /(일정은 바뀌지 않습니다|늦어집니다|당겨집니다|그대로입니다)/.test(dl.sum), dl);
  await a.click('.sch-dlg [data-pp="x"]'); await sleep(300);
  // relation map
  await ev(() => { SCHU.tab = 'net'; SCHU.netMode = 'all'; SCHU.netZoom = 1; schRefresh(); }); await sleep(800);
  const st = () => ev(() => { const h = document.querySelector('#sch-net .sn-scroll'); return { x: Math.round(h.scrollLeft), y: Math.round(h.scrollTop), z: SCHU.netZoom || 1, panel: S.panel, dlg: !!document.querySelector('#dlg') }; });
  const nb = await a.locator('#sch-net').boundingBox(), n0 = await st();
  await a.mouse.move(nb.x + 700, nb.y + 300); await a.mouse.down(); await a.mouse.move(nb.x + 520, nb.y + 230, { steps: 6 }); await a.mouse.up(); await sleep(300); const n1 = await st();
  check('relation map: pulling moves the view (also when the pointer is on a card), nothing opens', n1.x - n0.x === 180 && n1.y - n0.y === 70 && !n1.panel && !n1.dlg, { n0, n1 });
  const under = () => ev(([x, y]) => { const el = document.elementFromPoint(x, y), c = el && el.closest('.sn-node'); if (!c) return null; const r = c.getBoundingClientRect(); return { k: c.dataset.k, fx: (x - r.left) / r.width, fy: (y - r.top) / r.height }; }, [nb.x + 700, nb.y + 300]);
  await a.mouse.move(nb.x + 700, nb.y + 300); const u0 = await under(); await a.mouse.wheel(0, 240); await sleep(500); const n2 = await st(), u1 = await under(); await a.mouse.wheel(0, -240); await sleep(500); const n3 = await st();
  check('the wheel makes it smaller and larger around the pointer (no key needed)', n2.z < 1 && n3.z > n2.z && (!u0 || (u1 && u1.k === u0.k && Math.abs(u1.fx - u0.fx) < .12 && Math.abs(u1.fy - u0.fy) < .12)), { n2, n3, u0, u1 });
  const pull = await ev(() => { const m = schModel('pangyo'), box = document.querySelector('#sch-net').getBoundingClientRect(), vis = [...document.querySelectorAll('#sch-net .sn-node')].filter(c => { const r = c.getBoundingClientRect(); return r.left > box.left + 80 && r.right < box.right - 30 && r.top > box.top + 70 && r.bottom < box.bottom - 10; }); for (const a of vis) for (const b of vis) { if (a === b || m.plan.dependencies.some(e => (e.from === a.dataset.k && e.to === b.dataset.k) || (e.from === b.dataset.k && e.to === a.dataset.k))) continue; const p = a.querySelector('.sn-port').getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return { c: { x: ra.left + 60, y: ra.top + 60 }, p: { x: p.left + p.width / 2, y: p.top + p.height / 2 }, b: { x: rb.left + 80, y: rb.top + 70 }, from: a.dataset.k, to: b.dataset.k }; } return null; });
  await a.mouse.move(pull.c.x, pull.c.y); await sleep(250); await a.mouse.move(pull.p.x, pull.p.y); await a.mouse.down(); await a.mouse.move(pull.p.x + 30, pull.p.y + 20, { steps: 3 }); await a.mouse.move(pull.b.x, pull.b.y, { steps: 6 }); await sleep(200);
  const nt = await ev(() => (document.querySelector('.sg-tip') || {}).textContent || ''); await a.mouse.up(); await sleep(600);
  check('a relation is pulled from the circle at a card\'s right edge and is shown before it is saved', /끝나면 → .*시작/.test(nt) && await ev(() => !!document.querySelector('.sch-dlg .pp-types')) && !(await ev(p => schModel('pangyo').plan.dependencies.some(e => e.from === p.from && e.to === p.to), pull)), nt);
  await a.click('.sch-dlg [data-pp="x"]'); await sleep(300);
  // gates
  await ev(() => { SCHU.sec = 'gate'; schLowerRefresh(); }); await sleep(400);
  const gt = await ev(() => { const w = document.querySelector('.sch-gates .gt.wait'); return w ? { cat: getComputedStyle(w.querySelector('.cat')).opacity, dl: getComputedStyle(w.querySelector('dl')).opacity, date: getComputedStyle(w.querySelector('.date')).opacity, st: getComputedStyle(w.querySelector('.sf-e')).opacity } : null; });
  check('a gate that is not approved is paler, all but its state', gt && gt.cat === '0.5' && gt.dl === '0.5' && gt.date === '0.5' && gt.st === '1', gt);
  await ev(() => { document.querySelector('.sch-gates .gt [data-schc="gstate"]').click(); }); await sleep(300); await a.click('.pop .it:has-text("승인")'); await sleep(600);
  const ga = await ev(() => { const g = document.querySelector('.sch-gates .gt'); return { ok: g.classList.contains('ok'), cat: getComputedStyle(g.querySelector('.cat')).opacity }; });
  check('…approved, it stands at full strength', ga.ok && ga.cat === '1', ga);
  await ev(() => schUndo()); await sleep(300);
  // clean up
  await ev(async ids => { for (const id of ids) { const it = item(id); if (it) await trashItem(it); } }, ids); await flush(); await sleep(500);

  const errs = [...A.errs];
  check('no script errors', errs.length === 0, errs.slice(0, 5));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
