// WorkSpace x Schedule (preview), second part: linking an action item to a task, dragging a bar, opening by address,
// the full page of a task, the preview badge. Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'SDA', '연결 가', { url: 'http://127.0.0.1:8787/?v=2' }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const goP = async () => { await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };
  await goP();
  await ev(() => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; SCHU.scn = ''; SCHU.q = ''; SCHU.phase = ''; SCHU.scope = 'all'; SCHU.scale = 'fit'; SCHU.open = []; render(true); }); await sleep(900);

  console.log('— an action item and its task');
  const id = await ev(t => { const it = newItem('action'); it.title = t; it.proj = 'pangyo'; openPanel(it.id); return it.id; }, '견적 비교 ' + sfx); await sleep(500);
  const r0 = await ev(() => ({ stage: !!document.querySelector('#panel-pin [data-schp="link-phase"]'), task: !!document.querySelector('#panel-pin [data-schp="link-task"]'), keys: [...document.querySelectorAll('#panel-pin .props .k')].map(k => k.textContent) }));
  check('a new action item of a project with a schedule has 개발 단계 with a phase and a task to choose', r0.stage && r0.task && r0.keys.includes('개발 단계'), r0);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(200); await a.click('.pop .it:has-text("4) 계약·금융")'); await sleep(400);
  const menu = await ev(() => [...document.querySelectorAll('.sch-tm .it')].map(x => x.textContent).slice(0, 3));
  check('choosing the phase offers the tasks of that phase', menu.length === 3 && menu.every(x => /^4-/.test(x)), menu);
  await a.fill('#sch-tm-q', '수전반'); await sleep(250); await a.click('.sch-tm .it:has-text("계약서명")'); await sleep(500);
  const r1 = await ev(i => { const it = item(i), m = schModel('pangyo'), t = m.byId.get(it.task); return { wbs: t && t.wbs, keys: [...document.querySelectorAll('#panel-pin .props .k')].map(k => k.textContent), due: (document.querySelector('#panel-pin .props .sch-rg') || document.querySelector('#panel-pin .props .sch-v .plain') || {}).textContent }; }, id);
  check('the item is linked to the task and shows the task\'s forecast date', r1.wbs === 'W4.24' && r1.keys.includes('예상 기한'), r1);
  await a.click('#panel-pin [data-ed="publish"]'); await sleep(1200);
  await ev(() => closePanel(true)); await sleep(300);
  await ev(() => { SCHU.tab = 'list'; SCHU.phase = 'W4'; SCHU.per = 50; schRefresh(); }); await sleep(400);
  const li = await ev(s => { const rows = [...document.querySelectorAll('#sch-actions .tbl.sch-list .rw')]; const i = rows.findIndex(r => r.classList.contains('sub') && r.textContent.includes(s)); return { i, prev: i > 0 ? rows[i - 1].querySelector('.w').textContent : '', w: i >= 0 ? rows[i].querySelector('.w').textContent : '', un: [...document.querySelectorAll('.sch-sub-h + .tbl .rw')].some(r => r.textContent.includes(s)) }; }, sfx);
  check('published, it is listed under its task (4-24) and no longer among the unlinked ones', li.i > 0 && li.prev === '4-24' && /4-24/.test(li.w) && !li.un, li);
  await ev(() => { const t = schModel('pangyo').byWbs.get('W4.24'); openPanel(schItemId(t.id)); SCHP.tab = 'links'; rerenderItem(S.panel); }); await sleep(400);
  check('the task\'s 연결된 아이템 tab lists the action', await ev(s => [...document.querySelectorAll('#panel-pin .sl-items .chip')].some(c => c.textContent.includes(s)), sfx));
  await ev(() => { SCHP.tab = 'info'; closePanel(true); SCHU.tab = 'gantt'; SCHU.phase = ''; SCHU.per = 20; SCHU.open = ['W1']; SCHU.scale = 'week'; schRefresh(); }); await sleep(500);

  console.log('— dragging a bar');
  await ev(() => { const c = document.querySelector('#content'), g = document.querySelector('#sch-actions'); c.scrollTop = g.getBoundingClientRect().top + c.scrollTop - 70; }); await sleep(300);
  const bar = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.12'), el = document.querySelector('.sg-bar[data-bar="' + t.id + '"]'), host = document.querySelector('#sch-gantt .sg-scroll'); host.scrollLeft = Math.max(0, parseFloat(el.style.left) - 300); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, px: host._px, s: schModel('pangyo').res.tasks[t.id].start, ps: t.plannedStart }; });
  await a.mouse.move(bar.x, bar.y); await a.mouse.down(); await a.mouse.move(bar.x + 20, bar.y, { steps: 4 }); await a.mouse.move(bar.x + 5 * 7 + 1, bar.y, { steps: 4 }); await sleep(120);
  const tip = await ev(() => (document.querySelector('.sg-tip') || {}).textContent || '');
  await a.mouse.up(); await sleep(700);
  const moved = await ev(() => { const m = schModel('pangyo'), t = m.byWbs.get('W1.12'); return { ps: t.plannedStart, pf: t.plannedFinish, s: m.res.tasks[t.id].start, panel: S.panel, toast: document.querySelector('#toast').textContent }; });
  check('dragging a bar a week to the right moves the managed dates by 7 days (shown while dragging), without opening the panel', /\+7일/.test(tip) && moved.ps === '2027-01-18' && moved.pf === '2027-01-29' && moved.s === '2027-01-18' && !moved.panel && /되돌리기/.test(moved.toast), { tip, moved, bar });
  await ev(() => schUndo()); await sleep(400);
  check('…undone', await ev(() => schModel('pangyo').byWbs.get('W1.12').plannedStart === '2027-01-11'));
  await ev(() => { const t = schModel('pangyo').byWbs.get('W1.2'); schEditTask('pangyo', t.id, 'x', x => { x.status = '진행'; x.actualStart = '2026-11-03'; }, true); }); await sleep(500);
  const b2 = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.2'), el = document.querySelector('.sg-bar[data-bar="' + t.id + '"]'), host = document.querySelector('#sch-gantt .sg-scroll'); host.scrollLeft = Math.max(0, parseFloat(el.style.left) - 300); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await a.mouse.move(b2.x, b2.y); await a.mouse.down(); await a.mouse.move(b2.x + 40, b2.y, { steps: 5 }); await a.mouse.up(); await sleep(500);
  check('a task that has started does not move by dragging (its actual start holds it)', await ev(() => schModel('pangyo').byWbs.get('W1.2').plannedStart === '2026-11-02' && /실제 시작일/.test(document.querySelector('#toast').textContent)));

  console.log('— names with quotes');
  await ev(() => { window.__x = 0; const t = schModel('pangyo').byWbs.get('W1.13'); schEditTask('pangyo', t.id, 'q', x => { x.name = 'A" onmouseover="window.__x=1" data-z="'; }, true); }); await sleep(600);
  const q = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.13'), row = document.querySelector('.sg-row.tk[data-row="' + t.id + '"]'), nm = row.querySelector('.nm'); return { title: nm.getAttribute('title'), over: nm.hasAttribute('onmouseover') || row.hasAttribute('onmouseover') || !!document.querySelector('#sch-gantt [data-z]'), text: nm.textContent }; });
  check('a task name with quotes stays text (in the row and in its title attribute)', /onmouseover="window/.test(q.title) && !q.over && /A" onmouseover/.test(q.text), q);
  await ev(() => schUndo()); await sleep(300);

  console.log('— addresses, full page, badge');
  const tid = await ev(() => schModel('pangyo').byWbs.get('W7.8').id);
  await a.goto('http://127.0.0.1:8787/#page=project&proj=pangyo&panel=wt-' + tid); await a.reload(); await a.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady && schReady('pangyo'), null, { timeout: 20000 }); await sleep(1200);
  check('an address with a task opens that task after the schedule has loaded', await ev(t => S.page === 'project' && S.panel === 'wt-' + t && document.querySelector('#panel-pin .ititle').dataset.wbs === '7-8', tid));
  await a.click('#panel-expand'); await sleep(900);
  const full = await ev(t => ({ full: S.full === 'wt-' + t, props: !!document.querySelector('#item-pin .sch-props'), tabs: document.querySelectorAll('#item-pin .sp-tabs button').length, hash: location.hash }), tid);
  check('the task opens as a full page too', full.full && full.props && full.tabs === 2 && /full=wt-/.test(full.hash), full);
  await ev(() => { SCHP.tab = 'links'; rerenderItem(S.full); }); await sleep(300);
  check('…with its relation map', await ev(() => document.querySelectorAll('#item-pin .sl-node').length >= 8));
  await ev(() => { SCHP.tab = 'info'; go('project:pangyo'); }); await sleep(600);
  const badge = await ev(() => ({ b: (document.querySelector('#sch-pv') || {}).textContent, title: document.title }));
  check('the top bar says this is the preview', badge.b === '미리보기', badge);
  await a.click('#sch-pv'); await sleep(200); await a.click('.pop .it:has-text("기존 화면으로")'); await a.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady, null, { timeout: 20000 }); await sleep(1200);
  check('“기존 화면으로 돌아가기” turns it off: the old page, no badge', await ev(() => !schPreview() && !document.querySelector('#sch-pv') && !document.querySelector('#sch-actions') && S.page === 'project' && !!document.querySelector('.road')));
  check('the linked action item is an ordinary action there (its link is kept)', await ev(s => { const it = ITEMS.find(i => (i.title || '').includes(s)); return !!it && !!it.task && [...document.querySelectorAll('#page-project .tbl.actions .rw')].length > 0; }, sfx));

  console.log('— cleaning up');
  await a.goto('http://127.0.0.1:8787/?v=2'); await a.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady, null, { timeout: 20000 }); await sleep(800); await goP();
  await ev(async s => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; for (const it of ITEMS.filter(x => (x.title || '').includes(s))) await trashItem(it); render(true); }, sfx); await sleep(1500);
  check('no page errors', !A.errs.length, A.errs.slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
