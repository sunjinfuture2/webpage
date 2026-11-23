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

  await ev(async () => { for (const it of ITEMS.filter(x => /^견적 비교 /.test(x.title || ''))) await trashItem(it); }); await sleep(600);   // left by a run that stopped half-way
  console.log('— an action item and its task');
  const id = await ev(t => { const it = newItem('action'); it.title = t; it.proj = 'pangyo'; openPanel(it.id); return it.id; }, '견적 비교 ' + sfx); await sleep(500);
  const r0 = await ev(() => ({ stage: !!document.querySelector('#panel-pin [data-schp="link-phase"]'), task: !!document.querySelector('#panel-pin [data-schp="link-task"]'), more: !!document.querySelector('#panel-pin .act-props .sp-toggle[data-schp="more"]'), keys: [...document.querySelectorAll('#panel-pin .props .k')].map(k => k.textContent) }));
  check('a new action of a project has 개발 단계 as one picker (no second one) and "일정 상세", like a task of the schedule', r0.stage && !r0.task && r0.more && r0.keys.includes('개발 단계'), r0);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(200);
  const phMenu = await ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()));
  await a.click('.pop .it:has-text("4) 계약·금융")'); await sleep(400);
  const ph1 = await ev(i => ({ phase: item(i).phase, task: item(i).task || '', label: document.querySelector('#panel-pin [data-schp="link-phase"]').textContent.trim(), auto: (document.querySelector('#panel-pin .wbno.auto') || {}).textContent || '', x: !!document.querySelector('#panel-pin [data-schp="unlink"]') }), id);
  check('a phase is chosen (a new one can be added from the same menu): the number it will get stands beside it, with an x', ph1.phase === 'W4' && !ph1.task && /^4\) /.test(ph1.label) && /^4-\d+\)$/.test(ph1.auto) && ph1.x && phMenu.some(x => /새 단계 추가/.test(x)), { ph1, phMenu });
  // an action that hangs under a task (made before the eighteenth round; there is no picker for it any more) still shows and lists that way
  await ev(i => { const m = schModel('pangyo'), t = m.byWbs.get('W4.24'), it = item(i); it.task = t.id; it.phase = t.phase; it.dirty = true; rerenderItem(i); }, id); await sleep(400);
  const r1 = await ev(i => { const it = item(i), m = schModel('pangyo'), t = m.byId.get(it.task); return { wbs: t && t.wbs, up: (document.querySelector('#panel-pin .wbno.up') || {}).textContent || '', keys: [...document.querySelectorAll('#panel-pin .props .k')].map(k => k.textContent) }; }, id);
  check('an action that hangs under a task shows that task beside its phase', r1.wbs === 'W4.24' && /↳ 4-24\)/.test(r1.up) && r1.keys.includes('예상 기한'), r1);
  await a.click('#panel-pin [data-ed="publish"]'); await sleep(1200);
  await ev(() => closePanel(true)); await sleep(300);
  await ev(() => { SCHU.tab = 'list'; SCHU.phase = 'W4'; SCHU.per = 50; schRefresh(); }); await sleep(400);
  const li = await ev(s => { const rows = [...document.querySelectorAll('#sch-actions .tbl.sch-list .rw')]; const i = rows.findIndex(r => r.classList.contains('sub') && r.textContent.includes(s)); let j = i - 1; while (j > 0 && rows[j].classList.contains('sub')) j--; return { i, prev: i > 0 ? rows[j].querySelector('.w').textContent : '', w: i >= 0 ? rows[i].querySelector('.w').textContent : '', un: rows.some(r => !r.classList.contains('sub') && r.textContent.includes(s)) }; }, sfx);
  check('published, it is listed under its task (4-24) and no longer among the unlinked ones', li.i > 0 && li.prev === '4-24' && /4-24/.test(li.w) && !li.un, li);
  await ev(() => { const t = schModel('pangyo').byWbs.get('W4.24'); openPanel(schItemId(t.id)); SCHP.tab = 'links'; rerenderItem(S.panel); }); await sleep(400);
  check('the task\'s 연결된 액션 tab shows only the chart of the tasks around it (no rows below it)', await ev(() => !!document.querySelector('#panel-pin .sl-map .sl-node.cur') && !document.querySelector('#panel-pin .sl-items')));
  await ev(() => { SCHP.tab = 'info'; closePanel(true); SCHU.tab = 'gantt'; SCHU.phase = ''; SCHU.per = 20; SCHU.open = ['W1']; SCHU.scale = 'week'; schRefresh(); }); await sleep(500);

  console.log('— dragging a bar');
  await ev(() => { const c = document.querySelector('#content'), g = document.querySelector('#sch-actions'); c.scrollTop = g.getBoundingClientRect().top + c.scrollTop - 70; }); await sleep(300);
  const bar = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.12'), el = document.querySelector('.sg-bar[data-bar="' + t.id + '"]'), host = document.querySelector('#sch-gantt .sg-scroll'); host.scrollLeft = Math.max(0, parseFloat(el.style.left) - 300); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, px: host._px, s: schModel('pangyo').res.tasks[t.id].start, ps: t.plannedStart }; });
  await a.mouse.move(bar.x, bar.y); await a.mouse.down(); await a.mouse.move(bar.x + 20, bar.y, { steps: 4 }); await a.mouse.move(bar.x + 5 * 7 + 1, bar.y, { steps: 4 }); await sleep(120);
  const tip = await ev(() => (document.querySelector('.sg-tip') || {}).textContent || '');
  await a.mouse.up(); await sleep(600);
  const win = await ev(() => { const m = schModel('pangyo'), t = m.byWbs.get('W1.12'), b = document.querySelector('#dlg .pp-dates'); return { open: !!b, ps: t.plannedStart, hd: b ? b.querySelector('.pp-hd').textContent : '', sum: b ? (b.querySelector('.pp-sum') || {}).textContent : '', now: b ? b.querySelector('.pp-cmp .bx.new strong').textContent : '', op: b ? b.querySelector('.pp-cmp .bx.op').textContent : '', rows: b ? b.querySelectorAll('.pp-tbl .rw').length : 0, chart: b ? b.querySelectorAll('.pp-chart .br.now, .pp-chart .ms.now').length : 0, bt: b ? [...b.querySelectorAll('.bt button')].map(x => x.textContent).join() : '', panel: S.panel }; });
  check('dragging a bar a week to the right (shown while dragging) saves nothing yet: a window shows what will happen, as for a relation (the task\'s new dates, what moves with it, the operation date) with 취소 and 적용', /\+7일/.test(tip) && /기간 이동/.test(tip) && win.open && win.ps === '2027-01-11' && /1-12 기간 이동 \+7일/.test(win.hd) && /기간이 7일 늦어집니다/.test(win.sum) && /2027\. 01\. 18/.test(win.now) && /운영개시 예상/.test(win.op) && win.rows >= 1 && win.chart >= 1 && win.bt === '취소,적용' && !win.panel, { tip, win, bar });
  await a.click('#dlg [data-pp="x"]'); await sleep(400);
  check('취소 changes nothing', await ev(() => { const t = schModel('pangyo').byWbs.get('W1.12'); return t.plannedStart === '2027-01-11' && !document.querySelector('#dlg') && !document.querySelector('#sch-card'); }));
  { const again = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.12'), r = document.querySelector('.sg-bar[data-bar="' + t.id + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await a.mouse.move(again.x, again.y); await a.mouse.down(); await a.mouse.move(again.x + 20, again.y, { steps: 4 }); await a.mouse.move(again.x + 5 * 7 + 1, again.y, { steps: 4 }); await sleep(120); await a.mouse.up(); await sleep(600); }
  await a.click('#dlg [data-pp="ok"]'); await sleep(800);
  const moved = await ev(() => { const m = schModel('pangyo'), t = m.byWbs.get('W1.12'); return { ps: t.plannedStart, pf: t.plannedFinish, s: m.res.tasks[t.id].start, panel: S.panel, toast: document.querySelector('#toast').textContent, card: !!document.querySelector('#sch-card'), dlg: !!document.querySelector('#dlg'), ghost: document.querySelectorAll('#sch-gantt .sg-ghost').length, chg: !!document.querySelector('#sch-gantt .sg-bar.chg') }; });
  check('적용 moves the managed dates by 7 days without opening the panel, with 되돌리기 in the toast; the bar flashes and where it stood stays outlined', moved.ps === '2027-01-18' && moved.pf === '2027-01-29' && moved.s === '2027-01-18' && !moved.panel && /되돌리기/.test(moved.toast) && /1-12 기간 이동 \+7일/.test(moved.toast) && !moved.card && !moved.dlg && moved.ghost >= 1 && moved.chg, moved);
  await ev(() => schUndo()); await sleep(400);
  check('…undone', await ev(() => schModel('pangyo').byWbs.get('W1.12').plannedStart === '2027-01-11'));
  await ev(() => { const t = schModel('pangyo').byWbs.get('W1.2'); schEditTask('pangyo', t.id, 'x', x => { x.status = '진행'; x.actualStart = '2026-11-03'; }, true); }); await sleep(500);
  const b2 = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.2'), el = document.querySelector('.sg-bar[data-bar="' + t.id + '"]'), host = document.querySelector('#sch-gantt .sg-scroll'); host.scrollLeft = Math.max(0, parseFloat(el.style.left) - 300); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await a.mouse.move(b2.x, b2.y); await a.mouse.down(); await a.mouse.move(b2.x + 40, b2.y, { steps: 5 }); await a.mouse.up(); await sleep(500);
  check('a task that has started does not move by dragging (its actual start holds it)', await ev(() => schModel('pangyo').byWbs.get('W1.2').plannedStart === '2026-11-02' && /실제 시작일/.test(document.querySelector('#toast').textContent)));

  console.log('— relations in the chart');
  await ev(() => { SCHU.open = ['W1']; SCHU.scale = 'day'; schRefresh(); const g = document.querySelector('#sch-gantt .sg-scroll'), t = schModel('pangyo').byWbs.get('W1.8'); g.scrollLeft = Math.max(0, g._rows.get(t.id).x1 - 120); }); await sleep(400);
  const ends = await ev(() => { const m = schModel('pangyo'), a = m.byWbs.get('W1.8'), b = m.byWbs.get('W1.13'); const ra = document.querySelector('.sg-bar[data-bar="' + a.id + '"]').getBoundingClientRect(), rb = document.querySelector('.sg-bar[data-bar="' + b.id + '"]'); return { ax: ra.right, ay: ra.top + ra.height / 2, has: !!rb, n: m.succ.get(a.id).length }; });
  await a.mouse.move(ends.ax - 12, ends.ay); await sleep(150);
  const port = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.8'), p = document.querySelector('.sg-bar[data-bar="' + t.id + '"] .pt.r'), r = p.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, shown: getComputedStyle(p).display !== 'none' }; });
  const tgt = await ev(() => { const m = schModel('pangyo'), a = m.byWbs.get('W1.8'), t = ['W1.11', 'W1.12', 'W1.13'].map(w => m.byWbs.get(w)).find(x => !m.plan.dependencies.some(e => e.from === a.id && e.to === x.id)), r = document.querySelector('.sg-bar[data-bar="' + t.id + '"]').getBoundingClientRect(); return { x: r.left + 6, y: r.top + r.height / 2, wbs: schWbs(t.wbs), id: t.id }; });
  await a.mouse.move(port.x, port.y); await a.mouse.down(); await a.mouse.move(port.x + 30, port.y + 10, { steps: 4 }); await a.mouse.move(tgt.x, tgt.y, { steps: 6 }); await sleep(150);
  const tipTxt = await ev(() => (document.querySelector('.sg-tip') || {}).textContent || ''); await a.mouse.up(); await sleep(500);
  const dlg = await ev(id => { const d = document.querySelector('.sch-dlg'), m = schModel('pangyo'), a = m.byWbs.get('W1.8'); if (!d) return null; return { title: d.querySelector('.pp-hd b').textContent, on: d.querySelector('.pp-types .on b').textContent, boxes: d.querySelectorAll('.pp-cmp .bx').length, rows: d.querySelectorAll('.pp-chart .lb').length, link: !!d.querySelector('.pp-chart svg path'), moved: d.querySelector('.pp-h b').textContent, stored: m.plan.dependencies.some(x => x.from === a.id && x.to === id) }; }, tgt.id);
  check('letting go shows what is being connected and what it does (kinds, before and after, operation date, a small chart, the tasks that move) and stores nothing yet', dlg && dlg.title === '관계 연결' && dlg.on === 'FS' && dlg.boxes === 3 && dlg.rows >= 2 && dlg.link && /\d+개/.test(dlg.moved) && !dlg.stored, dlg);
  await a.click('.sch-dlg [data-pp="ok"]'); await sleep(700);
  const made = await ev(id => { const m = schModel('pangyo'), a = m.byWbs.get('W1.8'); const e = m.plan.dependencies.filter(x => x.from === a.id && x.to === id); return { n: e.length, types: e.map(x => x.type).sort().join(), toast: document.querySelector('#toast').textContent, added: Object.keys(SCHED.pangyo).filter(k => k.startsWith('d:')).length }; }, tgt.id);
  check('pulling from the end of a bar to the start of another makes a relation of that kind (the hint names it while pulling)', port.shown && tipTxt.startsWith('FS1-8 끝나면 → ' + tgt.wbs + ' 시작') && made.n === 1 && made.types === 'FS' && made.added === 1 && /관계 추가/.test(made.toast), { port, tipTxt, made, tgt });
  const lineAt = await ev(() => { const id = Object.keys(SCHED.pangyo).find(k => k.startsWith('d:')).slice(2), g = document.querySelector('.sg-links g[data-link="' + id + '"] path.hit'), len = g.getTotalLength(), pt = g.getPointAtLength(len * 0.6), box = document.querySelector('#sch-gantt .sg-links').getBoundingClientRect(), z = LAYOUT.zoom || 1; return { x: box.left + pt.x * z, y: box.top + pt.y * z, id }; });
  await a.mouse.click(lineAt.x, lineAt.y); await sleep(300);
  const relMenu = await ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent));
  check('a click on a relation line opens that relation: kind, gap, leave out, delete', relMenu.some(x => /^FS/.test(x)) && relMenu.some(x => /간격/.test(x)) && relMenu.some(x => /관계 삭제/.test(x)), relMenu);
  await a.click('.pop .it:has-text("관계 삭제")'); await sleep(400);
  check('…deleting is shown in the same window first', await ev(() => { const d = document.querySelector('.sch-dlg'); return !!d && d.querySelector('.pp-hd b').textContent === '관계 삭제' && Object.keys(SCHED.pangyo).some(k => k.startsWith('d:')); }));
  await a.click('.sch-dlg [data-pp="ok"]'); await sleep(600);
  check('…and 확인 removes the stored relation', await ev(() => !Object.keys(SCHED.pangyo).some(k => k.startsWith('d:'))));
  await ev(() => { SCHU.scale = 'week'; schRefresh(); }); await sleep(300);

  console.log('— tools (no way in since the my-page specification, the functions stay); Excel');
  check('the page has no tools button and the user menu no tools entry', await ev(() => !document.querySelector('[data-sch="tools"]') && typeof schUserMenu === 'undefined' && typeof schToolsMenu === 'function'));
  const x1 = await ev(async () => { const X = await schXlsx(); const w = schBackup('pangyo'), p = w.scenarios[0]; p.tasks.find(t => t.wbs === 'W7.8').delay = 2; const bytes = await X.makeXlsx(w, p, AIDCSchedule.calculate(p)); window.__xl = bytes; const u = new Uint8Array(bytes); return { n: u.length, zip: u[0] === 0x50 && u[1] === 0x4b }; });
  check('the Excel bundle is fetched on demand and writes a workbook', x1.zip && x1.n > 200000, x1);
  await ev(async () => { await schImportFile('pangyo', new File([window.__xl], '일정.xlsx')); }); await sleep(500);
  const dl = await ev(() => (document.querySelector('#dlg .m') || {}).textContent || '');
  await a.click('#dlg button.pri'); await sleep(900);
  check('importing that workbook asks once and brings its plan in (two days on the SAT task give 2028-09-30), keeping assignees', /가져올까요/.test(dl) && await ev(() => schModel('pangyo').byWbs.get('W7.8').delay === 2 && schModel('pangyo').res.operationDate === '2028-09-30'), dl);
  await ev(() => schUndo()); await sleep(400);
  // a workbook made from another copy of the source carries other ids: tasks are matched by WBS
  const rm = await ev(() => { const w = schBackup('pangyo'), p = w.scenarios[0], map = new Map(p.tasks.map(t => [t.id, 'x:' + t.wbs])); for (const t of p.tasks) { if (t.finishRule) t.finishRule.anchorId = map.get(t.finishRule.anchorId); t.id = map.get(t.id); } for (const e of p.dependencies) { e.from = map.get(e.from); e.to = map.get(e.to); e.id = 'l:' + e.id; } for (const x of p.procurement) for (const f of ['poTaskId', 'deliveryTaskId', 'installTaskId', 'satTaskId']) x[f] = map.get(x[f]); p.tasks.find(t => t.wbs === 'W1.9').delay = 4; const q = schRemapPlan(SCH.base.pangyo, p), ov = AIDCSchedule.diffPlans(SCH.base.pangyo, q); const mine = Object.keys(SCHED.pangyo || {}).filter(AIDCSchedule.isPlanKey).length; return { keys: Object.keys(ov).length, mine, only: Object.keys(ov).every(k => k.startsWith('t:')), delay: (ov['t:' + schModel('pangyo').byWbs.get('W1.9').id] || {}).delay }; });
  check('a plan whose ids differ is matched by WBS: only the real change remains (no new tasks or relations)', rm.keys === rm.mine + 1 && rm.only && rm.delay === 4, rm);

  console.log('— adding a package and a gate');
  await ev(() => { SCHU.sec = 'proc'; schLowerRefresh(); document.querySelector('#sch-lower').scrollIntoView({ block: 'start' }); }); await sleep(300);
  await a.click('#sch-lower [data-sch="lowadd"]'); await sleep(250); await a.fill('#ask-in', '비상발전 연료탱크 ' + sfx); await a.keyboard.press('Enter'); await sleep(350);
  await a.fill('#sch-tm-q', '4-30'); await sleep(250); await a.click('.sch-tm .it >> nth=0'); await sleep(450);
  await a.fill('#sch-tm-q', '5-37'); await sleep(250); await a.click('.sch-tm .it >> nth=0'); await sleep(800);
  const pk = await ev(s => { const m = schModel('pangyo'), x = m.plan.procurement.find(q => q.name.includes(s)); return { n: m.plan.procurement.length, has: !!x, panel: S.panel, rows: document.querySelectorAll('#sch-lower .tbl.sch-proc .rw').length, ov: Object.keys(SCHED.pangyo).filter(k => k.startsWith('p:')).length, del: !!document.querySelector('#panel-pin [data-schx="pdel"]') }; }, sfx);
  check('"+" on 외부설비 조달 adds a package with its ordering and installing tasks; it opens and can be deleted', pk.n === 17 && pk.has && /^sp-pangyo-추가/.test(pk.panel || '') && pk.rows === 17 && pk.ov === 1 && pk.del, pk);
  await a.click('#panel-pin [data-schx="pdel"]'); await sleep(250); await a.click('#dlg button.pri'); await sleep(700);
  check('…deleted again', await ev(() => schModel('pangyo').plan.procurement.length === 16 && !Object.keys(SCHED.pangyo).some(k => k.startsWith('p:'))));
  await ev(() => { SCHU.sec = 'gate'; schLowerRefresh(); }); await sleep(300);
  await a.click('#sch-lower [data-sch="lowadd"]'); await sleep(250); await a.fill('#ask-in', '연료 반입 승인 ' + sfx); await a.keyboard.press('Enter'); await sleep(350);
  await a.fill('#sch-tm-q', '6-7'); await sleep(250); await a.click('.sch-tm .it >> nth=0'); await sleep(800);
  const gt = await ev(s => ({ n: document.querySelectorAll('.sch-gates .gt').length, has: [...document.querySelectorAll('.sch-gates .gt .cat')].some(c => c.textContent.includes(s)), panel: S.panel, date: (document.querySelector('#panel-pin .props .plain') || {}).textContent }), sfx);
  check('"+" on 승인게이트 adds a gate that takes its date from the task it waits for', gt.n === 9 && gt.has && /^sg-pangyo-u:/.test(gt.panel || ''), gt);
  await a.click('#panel-pin [data-schx="gu:del"]'); await sleep(250); await a.click('#dlg button.pri'); await sleep(700);
  check('…deleted again', await ev(() => document.querySelectorAll('.sch-gates .gt').length === 8));
  await ev(() => { SCHU.sec = 'proc'; schLowerRefresh(); const c = document.querySelector('#content'), g = document.querySelector('#sch-actions'); c.scrollTop = g.getBoundingClientRect().top + c.scrollTop - 70; }); await sleep(300);

  console.log('— names with quotes');
  await ev(() => { window.__x = 0; const t = schModel('pangyo').byWbs.get('W1.13'); schEditTask('pangyo', t.id, 'q', x => { x.name = 'A" onmouseover="window.__x=1" data-z="'; }, true); }); await sleep(600);
  const q = await ev(() => { const t = schModel('pangyo').byWbs.get('W1.13'), row = document.querySelector('.sg-row.tk[data-row="' + t.id + '"]'), nm = row.querySelector('.nm'); return { title: nm.getAttribute('title'), over: nm.hasAttribute('onmouseover') || row.hasAttribute('onmouseover') || !!document.querySelector('#sch-gantt [data-z]'), text: nm.textContent }; });
  check('a task name with quotes stays text (in the row and in its title attribute)', /onmouseover="window/.test(q.title) && !q.over && /A" onmouseover/.test(q.text), q);
  await ev(() => schUndo()); await sleep(300);

  console.log('— addresses, full page, badge');
  const tid = await ev(() => schModel('pangyo').byWbs.get('W7.8').id);
  await a.goto('http://127.0.0.1:8787/#page=project&proj=pangyo&panel=wt-' + tid); await a.reload(); await a.waitForFunction(() => typeof sharedReady !== 'undefined' && sharedReady && schReady('pangyo'), null, { timeout: 20000 }); await a.waitForFunction(() => !!document.querySelector('#panel-pin .ititle[data-wbs]'), null, { timeout: 15000 }).catch(() => { }); await sleep(600);
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
