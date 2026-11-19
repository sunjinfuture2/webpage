// WorkSpace x Schedule (preview), fifth part (owner's fifth round, 2026-11-19): main page (partner logos, deleting a project and
// bringing it back, research without a project row), the gantt (scroll bar on top, the table's width, the view keeps its place,
// reference plan as dashed marks, filter tags), gates. Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'R5A', '한결 일', { url: 'http://127.0.0.1:8787/?v=2' }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const goP = async () => { await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };

  console.log('— main page');
  const m0 = await ev(() => { const row = document.querySelector('#page-main .tbl.partners .rw .nm .lg'), list = document.querySelector('#page-main .rlist.sch'); return { mono: !!row && row.classList.contains('mono') && !row.querySelector('.pict'), letter: row ? row.childNodes[0].textContent : '', cnt: (document.querySelector('#proj-cnt') || {}).textContent, today: !!list.querySelector('.td'), cap: list.querySelector('.rcap').textContent }; });
  check('partner list: no pictogram before a name (the site\'s logo over the first letter of the name)', m0.mono && m0.letter.length === 1, m0);
  check('“n개 중 n개 표시” is gone from 프로젝트; 금일 주요일정 has no “오늘” tag', m0.cnt === '' && !m0.today && /금일 주요일정/.test(m0.cap) && !/오늘/.test(m0.cap), m0);
  const rid = await ev(t => { const it = newItem('research', { title: t, proj: 'pangyo', status: 'published' }); render(true); openPanel(it.id); return it.id; }, '5차 검사 리서치 ' + sfx); await sleep(600);
  check('a research note shows no 사업명 (in reading and in editing)', await ev(() => ![...document.querySelectorAll('#panel-pin .props .k')].some(k => k.textContent === '사업명')));
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(1200);
  check('…also while editing', await ev(() => ![...document.querySelectorAll('#panel-pin .props .k')].some(k => k.textContent === '사업명') && !document.querySelector('#panel-pin [data-pick="proj"]')));
  await a.click('#panel-pin [data-ed="cancel"]'); await sleep(500); await ev(() => closePanel(true));
  // a project made for this test, deleted and brought back
  const pid = await ev(s => { const id = 'p5' + s; PROJECTS[id] = { ...copy(PROJECTS.sunlight || PROJECTS[Object.keys(PROJECTS)[0]]), id, tag: '검사 ' + s, full: '5차 검사 사업 ' + s, name: '5차 검사 사업 ' + s }; PHEAD[id] = {}; applyProjectStatus(id, PROJECTS[id].status); render(true); go('project:' + id); return id; }, sfx); await sleep(1500);
  const pd = await ev(() => { const b = document.querySelector('#page-project .phead .pdel'), e = document.querySelector('#page-project [data-editproj]'), r = b.getBoundingClientRect(), q = e.getBoundingClientRect(), h = document.querySelector('#page-project .phead').getBoundingClientRect(); return { sameRow: Math.abs((r.top + r.height / 2) - (q.top + q.height / 2)) < 8, right: Math.round(h.right - r.right), farRight: r.left > q.right + 400 }; });
  check('the button that deletes a project stands in the row of 수정, at its right end', pd.sameRow && pd.right <= 2 && pd.farRight, pd);
  await a.click('#page-project .phead .pdel'); await sleep(300);
  const msg = await ev(() => document.querySelector('#dlg .m').textContent);
  check('it asks first and says that the project can be brought back for a while', /정말 삭제/.test(msg) && /30일/.test(msg) && /복구/.test(msg), msg);
  await a.click('#dlg button.pri'); await sleep(900);
  const del = await ev(id => ({ page: S.page, gone: !PROJECTS[id], card: [...document.querySelectorAll('#proj-inner .pcard')].some(c => c.dataset.go === 'project:' + id), trash: !!(SETTINGS.projTrash || {})[id], list: trashList().some(x => x.k === 'project' && x.id === id) }), pid);
  check('deleted: back on the main page, the project is in no list, it waits in the trash of the settings', del.page === 'main' && del.gone && !del.card && del.trash && del.list, del);
  await sleep(1500);
  const B = await newUser(browser, 'R5B', '한결 이', { url: 'http://127.0.0.1:8787/?v=2' }), b = B.page;
  check('another member no longer has the project either, and sees it in the trash', await b.evaluate(id => !PROJECTS[id] && trashList().some(x => x.k === 'project' && x.id === id), pid));
  await ev(() => openModal('trash')); await sleep(500);
  await a.click(`[data-mp="tr-restore:project|${pid}"]`); await sleep(1200);
  const back = await ev(id => ({ there: !!PROJECTS[id] && PROJECTS[id].full, trash: !!(SETTINGS.projTrash || {})[id], card: [...document.querySelectorAll('#proj-inner .pcard')].some(c => c.dataset.go === 'project:' + id) }), pid);
  check('복원 from the trash brings the project back whole', /5차 검사 사업/.test(back.there) && !back.trash && back.card, back);
  await ev(() => closeModal()); await sleep(1200);
  check('…for the other member too', await b.evaluate(id => !!PROJECTS[id], pid));
  await ev(id => { trashProject(id); purgeOne('project', id); render(true); }, pid); await sleep(1200);   // the test's own project: away for good
  check('emptied from the trash it is gone', await ev(id => !PROJECTS[id] && !(SETTINGS.projTrash || {})[id], pid));
  await B.ctx.close();

  console.log('— gantt');
  await goP();
  await ev(() => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; Object.assign(SCHU, { scn: '', q: '', phase: '', scope: 'all', scale: 'day', open: ['W1', 'W2', 'W3'], tab: 'gantt', sel: '', cf: {}, who: '', sec: 'gate' }); delete SCHU.gl; delete SCHU.refm; SCH.gs = null; render(true); }); await sleep(1200);
  const g0 = await ev(() => { const box = document.querySelector('#sch-gantt'), tb = box.querySelector('.sg-topbar'), host = box.querySelector('.sg-scroll'), cs = getComputedStyle(host), left = box.querySelector('.sg-left'); return { top: !!tb && tb.getBoundingClientRect().bottom <= host.getBoundingClientRect().top + 1, tbW: tb.firstChild.offsetWidth, ox: cs.overflowX, shade: getComputedStyle(left, '::after').width, foot: !!box.querySelector('.sg-foot'), sum: getComputedStyle(box.querySelector('.sg-sum')).borderTopLeftRadius, fs: getComputedStyle(box.querySelector('.sg-row.tk')).fontSize, dd: getComputedStyle(box.querySelector('.sg-row.tk .sch-dd')).fontWeight, tag: parseFloat(getComputedStyle(document.querySelector('.sg-tags b') || document.body).left) }; });
  check('the horizontal scroll bar is a bar above the chart; the chart itself shows none; no line of counts below', g0.top && g0.tbW > 5000 && g0.ox === 'hidden' && !g0.foot, g0);
  check('type 12.2 in the outline, D-day one step lighter, summary bars slightly rounded, the soft edge belongs to the table', g0.fs === '12.2px' && g0.dd === '500' && g0.sum === '2px' && g0.shade === '16px', g0);
  await ev(() => { document.querySelector('#sch-gantt .sg-topbar').scrollLeft = 600; }); await sleep(250);
  const g1 = await ev(() => { const host = document.querySelector('#sch-gantt .sg-scroll'), left = host.querySelector('.sg-left').getBoundingClientRect(), h = host.getBoundingClientRect(); host.scrollTop = 140; return { x: host.scrollLeft, stuck: Math.abs(left.left - h.left) < 1 }; }); await sleep(250);
  check('moving that bar moves the chart; the table (and its soft edge) stays', g1.x === 600 && g1.stuck, g1);
  await ev(() => render(true)); await sleep(700);
  const g2 = await ev(() => { const host = document.querySelector('#sch-gantt .sg-scroll'); return { x: host.scrollLeft, y: host.scrollTop, tb: document.querySelector('#sch-gantt .sg-topbar').scrollLeft }; });
  check('a redraw of the page leaves the chart where it stood (it used to jump back)', g2.x === 600 && g2.y === 140 && g2.tb === 600, g2);
  await ev(() => { const c = document.querySelector('#content'), x = document.querySelector('#sch-actions'); c.scrollTop = x.getBoundingClientRect().top + c.scrollTop - 70; }); await sleep(400);
  const sp = await ev(() => { const r = document.querySelector('#sch-gantt .sg-split').getBoundingClientRect(), h = document.querySelector('#sch-gantt .sg-scroll').getBoundingClientRect(); return { x: r.left + r.width / 2, y: h.top + 160 }; });
  await a.mouse.move(sp.x, sp.y); await a.mouse.down(); await a.mouse.move(sp.x - 60, sp.y, { steps: 4 }); await a.mouse.move(sp.x - 120, sp.y, { steps: 4 }); await a.mouse.up(); await sleep(400);
  const g3 = await ev(() => ({ w: document.querySelector('#sch-gantt .sg-left').offsetWidth, gl: SCHU.gl, nm: [...document.querySelectorAll('#sch-gantt .sg-row.tk .nm')].some(e => e.scrollWidth > e.clientWidth), rg: [...document.querySelectorAll('#sch-gantt .sg-row.tk .rg')].every(e => e.scrollWidth <= e.clientWidth + 1) }));
  check('the edge of the table can be pulled: the table gets narrower, names are cut with … and the dates keep their room', Math.abs(g3.w - 389) <= 3 && Math.abs(g3.gl - 388) <= 3 && g3.nm && g3.rg, g3);
  await a.mouse.dblclick(sp.x - 120, sp.y); await sleep(400);
  check('a double click gives the design\'s width back', await ev(() => Math.abs(document.querySelector('#sch-gantt .sg-left').offsetWidth - 509) <= 1));
  await ev(() => { schCommit('pangyo', p => { p.tasks.find(t => t.wbs === 'W1.6').plannedFinish = '2026-11-09'; p.tasks.find(t => t.wbs === 'W1.2').plannedFinish = '2026-11-27'; }, ''); }); await sleep(600);
  const ref = await ev(() => { const m = schModel('pangyo'), q = w => document.querySelector(`.sg-bar[data-bar="${m.byWbs.get(w).id}"] .pl`); return { shorter: q('W1.6') && q('W1.6').className, longer: q('W1.2') && q('W1.2').className, tipS: q('W1.6') && q('W1.6').title, tipL: q('W1.2') && q('W1.2').title, same: !q('W1.1') }; });
  check('dashed is the reference plan: an outline after a bar that now ends earlier, a line inside a bar that now runs longer; nothing where they agree', /out/.test(ref.shorter) && /in/.test(ref.longer) && /줄어듦/.test(ref.tipS) && /늘어남/.test(ref.tipL) && ref.same, ref);
  await a.click('#sch-actions [data-sch="toggle"][data-k="refm"]'); await sleep(400);
  check('the 참조계획 box turns those marks off', await ev(() => !document.querySelector('#sch-gantt .sg-bar .pl')));
  await ev(() => { delete SCHU.refm; schUndo(); }); await sleep(500);
  await a.click('#sch-actions [data-sch="pick"][data-k="scope"]'); await sleep(200); await a.click('.pop .it:has-text("지연")'); await sleep(400);
  await a.click('#sch-actions [data-sch="pick"][data-k="phase"]'); await sleep(200); await a.click('.pop .it:has-text("1) 사업정의")'); await sleep(400);
  const chips = await ev(() => [...document.querySelectorAll('#sch-actions .sch-chips .sch-chip')].map(e => e.textContent.replace(' ✕', '')));
  check('what is filtered shows beside the title as tags (as the partner list does)', chips.join('|') === '단계: 1) 사업정의·RFP|범위: 지연', chips);
  await a.click('#sch-actions .sch-chips .sch-chip >> nth=0'); await sleep(400);
  check('the x of a tag takes that filter off', await ev(() => SCHU.phase === '' && SCHU.scope === 'late' && document.querySelectorAll('#sch-actions .sch-chips .sch-chip').length === 1));
  await a.click('#sch-actions .sch-chips .sch-chip >> nth=0'); await sleep(400);
  const sel = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.3'); SCHU.sel = t.id; schGanttBuild('pangyo'); return getComputedStyle(document.querySelector(`.sg-bar[data-bar="${t.id}"]`)).boxShadow; });
  check('the frame of a selected bar is a little stronger', /0\.75px/.test(sel), sel);

  console.log('— gates');
  const gt = await ev(() => { const g = document.querySelector('.sch-gates .gt'); return getComputedStyle(g).paddingBottom; });
  check('more room between the gates', parseFloat(gt) >= 70, gt);
  await a.click('.sch-gates .gt .sch-st'); await sleep(250);
  const gm = await ev(() => [...document.querySelectorAll('.pop .it')].map(e => { const s = e.querySelector('.sch-st'); return s ? s.className.replace('sch-st ', '').trim() + ':' + e.textContent.trim() : ''; }));
  check('the menu of a gate\'s state shows each state with its mark and colour', gm.join('|') === 'st-ask:확인 전|st-plan:준비 중|st-prog:검토 요청|st-done:승인|st-hold:보완·반려', gm);
  await ev(() => closePop());
  await ev(() => { SCHU.sec = 'proc'; schLowerRefresh(); }); await sleep(300);
  await a.click('#sch-lower [data-sch="pick"][data-k="procState"]'); await sleep(200); await a.click('.pop .it:has-text("미확약")'); await sleep(400);
  check('the lower section shows its filter the same way', await ev(() => [...document.querySelectorAll('#sch-lower .sch-chips .sch-chip')].map(e => e.textContent).join() === '확약 상태: 미확약 ✕'));
  await a.click('#sch-lower .sch-chips .sch-chip'); await sleep(300);
  check('…and its x takes it off', await ev(() => !SCHU.procState && !document.querySelector('#sch-lower .sch-chips .sch-chip')));

  console.log('— cleaning up');
  await ev(async s => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; SCHU.scope = 'all'; SCHU.sel = ''; for (const it of ITEMS.filter(x => (x.title || '').includes(s))) await trashItem(it); render(true); }, sfx); await sleep(1800);
  check('no page errors', !A.errs.length, A.errs.slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
