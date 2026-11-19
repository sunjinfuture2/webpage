// WorkSpace x Schedule (preview): the combined Pangyo page. Needs wrangler dev on 127.0.0.1:8787.
// A works with the preview on, B too (sync between members), C has it off (the page everybody else still sees).
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'SCA', '일정 가', { url: 'http://127.0.0.1:8787/?v=2' }), a = A.page;
  const C = await newUser(browser, 'SCC', '일정 다', { url: 'http://127.0.0.1:8787/?v=1' }), c = C.page;
  const ev = (p, f, x) => p.evaluate(f, x);
  const goP = async p => { await ev(p, () => go('project:pangyo')); await p.waitForFunction(() => !schPreview() || schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };
  await goP(a); await goP(c);
  // start from the source plan (earlier runs of this script on the same local database)
  await ev(a, () => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; SCHU.scn = ''; render(true); }); await sleep(900);

  console.log('— preview switch');
  const pa = await ev(a, () => ({ pv: schPreview(), act: !!document.querySelector('#sch-actions'), low: !!document.querySelector('#sch-lower'), road: !!document.querySelector('.road'), old: !!document.querySelector('#page-project [data-sec="action"]'), ops: (document.querySelector('.sch-ops') || {}).textContent || '' }));
  check('with ?v=2 the Pangyo page has the schedule sections, no roadmap and no old action table', pa.pv && pa.act && pa.low && !pa.road && !pa.old, pa);
  check('the overview shows the calculated operation date 28.09.28', /^28\.09\.28/.test(pa.ops), pa.ops);
  const pc = await ev(c, () => ({ pv: schPreview(), act: !!document.querySelector('#sch-actions'), road: !!document.querySelector('.road'), old: !!document.querySelector('#page-project [data-sec="action"]'), ops: !!document.querySelector('.sch-ops') }));
  check('without it the page is what it was (action table, roadmap, no schedule)', !pc.pv && !pc.act && pc.road && pc.old && !pc.ops, pc);
  await ev(a, () => go('project:busan')); await sleep(500);
  const pb = await ev(a, () => ({ act: !!document.querySelector('#sch-actions'), road: !!document.querySelector('.road'), old: !!document.querySelector('#page-project [data-sec="action"]') }));
  check('a project without a schedule keeps its action table; the roadmap is gone in the preview', !pb.act && !pb.road && pb.old, pb);
  await goP(a);

  console.log('— gantt');
  const g0 = await ev(a, () => ({ rows: document.querySelectorAll('.sg-row.ph').length, tasks: document.querySelectorAll('.sg-row.tk').length, sums: document.querySelectorAll('.sg-sum').length, foot: document.querySelector('.sg-foot').textContent }));
  check('it opens with the eight phases folded and fitted to the period', g0.rows === 8 && g0.tasks === 0 && g0.sums === 8 && /운영개시 예상 28\.09\.28/.test(g0.foot) && /업무 233건/.test(g0.foot), g0);
  await a.click('.sg-row.ph[data-k="W1"] .tw'); await sleep(300);
  const g1 = await ev(a, () => ({ tasks: document.querySelectorAll('.sg-row.tk').length, bars: document.querySelectorAll('.sg-bar,.sg-msb').length, links: document.querySelectorAll('.sg-links path').length, first: document.querySelector('.sg-row.tk .nm').textContent }));
  check('opening a phase lists its tasks with bars, milestones and relation lines', g1.tasks === 15 && g1.bars === 15 && g1.links > 10 && /^1-1\)기준 문서/.test(g1.first), g1);
  await a.click('#sch-actions [data-sch="pick"][data-k="scale"]'); await sleep(150); await a.click('.pop .it:has-text("Day")'); await sleep(400);
  const g2 = await ev(a, () => ({ days: document.querySelectorAll('.sg-axis .dy').length, now: !!document.querySelector('.sg-axis .dy.now'), line: !!document.querySelector('.sg-right .now'), w: document.querySelector('.sg-right').offsetWidth }));
  check('the Day scale draws a column per day with today marked', g2.days > 900 && g2.now && g2.line && g2.w > 12000, g2);
  await a.fill('#sch-actions input[data-schq="q"]', 'SAT'); await sleep(500);
  const g3 = await ev(a, () => [...document.querySelectorAll('.sg-row.tk .nm')].map(x => x.textContent));
  check('searching shows the matching tasks of every phase', g3.length >= 3 && g3.every(t => /SAT/i.test(t)), g3.slice(0, 5));
  await a.fill('#sch-actions input[data-schq="q"]', ''); await sleep(400);
  await a.click('#sch-actions [data-sch="pick"][data-k="scale"]'); await sleep(150); await a.click('.pop .it:has-text("전체 기간")'); await sleep(300);

  console.log('— a task in the panel');
  await a.click('.sg-row.tk[data-row] >> nth=1'); await sleep(700);
  const p0 = await ev(a, () => ({ panel: S.panel, title: document.querySelector('#panel-pin .ititle').textContent, wbs: document.querySelector('#panel-pin .ititle').dataset.wbs, tabs: [...document.querySelectorAll('#panel-pin .sp-tabs button')].map(b => b.textContent.replace(/\d+$/, '')), keys: [...document.querySelectorAll('#panel-pin .sp-grid .k')].map(k => k.textContent), real: ITEMS.some(i => i.id === S.panel), trash: !!document.querySelector('#panel-pin .trash') }));
  check('a click opens the task in the right panel: WBS + name, tabs 정보 / 연결된 아이템, the schedule fields', /^wt-/.test(p0.panel) && p0.wbs === '1-2' && p0.title === 'PMO·의사결정·문서보안 체계 구성' && p0.tabs.join() === '정보,연결된 아이템' && ['사업명', '관리일정', '예상 기한', '실제 기한', '개발 단계', '담당자', '상태', '중요도', 'URL', '진척률'].every(k => p0.keys.includes(k)), p0);
  check('looking at a task creates nothing on the server and it cannot be thrown away', !p0.real && !p0.trash, p0);
  await a.click('#panel-pin [data-schp="f"][data-k="status"]'); await sleep(200); await a.click('.pop .it:has-text("진행")'); await sleep(700);
  const s1 = await ev(a, () => { const m = schModel('pangyo'), t = m.byWbs.get('W1.2'); return { st: t.status, as: t.actualStart, toast: document.querySelector('#toast').textContent, ov: Object.keys(SCHED.pangyo), row: document.querySelector('.sg-row.tk[data-row="' + t.id + '"] .st').textContent, pin: document.querySelector('#panel-pin .sch-st').textContent }; });
  check('choosing 진행 applies at once (state, actual start), in the panel and in the gantt, with an undo offer', s1.st === '진행' && !!s1.as && /되돌리기/.test(s1.toast) && s1.ov.length === 1 && /진행/.test(s1.row) && /진행/.test(s1.pin), s1);
  await sleep(900);
  const B = await newUser(browser, 'SCB', '일정 나', { url: 'http://127.0.0.1:8787/?v=2' }), b = B.page; await goP(b);
  check('another member sees the change (stored on the server as one field of meta:sched:pangyo)', await ev(b, () => { const t = schModel('pangyo').byWbs.get('W1.2'); return t.status === '진행' && Object.keys(sharedBase['meta:sched:pangyo'] || {}).length === 1; }));
  // two members change different tasks at the same moment: both stay
  await ev(a, () => { const t = schModel('pangyo').byWbs.get('W1.3'); schEditTask('pangyo', t.id, 'a', x => { x.delay = 2; }, true); });
  await ev(b, () => { const t = schModel('pangyo').byWbs.get('W1.5'); schEditTask('pangyo', t.id, 'b', x => { x.pri = 'high'; x.people = [sharedUser]; }, true); });
  await sleep(1800);
  const both = async p => ev(p, () => { const m = schModel('pangyo'); return { d: m.byWbs.get('W1.3').delay, pri: m.byWbs.get('W1.5').pri, who: (m.byWbs.get('W1.5').people || []).join() }; });
  const ba = await both(a), bb = await both(b);
  check('changes of two members to different tasks are both kept, on both screens', ba.d === 2 && ba.pri === 'high' && ba.who === 'SCB' && bb.d === 2 && bb.pri === 'high', { ba, bb });
  check('the member with the preview off is not disturbed by the schedule record', await ev(c, () => !document.querySelector('#sch-actions') && !!document.querySelector('.road')) && !C.errs.length, C.errs.slice(0, 3));

  console.log('— dates move what follows; undo');
  const before = await ev(a, () => { const m = schModel('pangyo'); return { op: m.res.operationDate, f: m.res.tasks[m.byWbs.get('W7.9').id].finish }; });
  await ev(a, () => { const t = schModel('pangyo').byWbs.get('W7.8'); openPanel(schItemId(t.id)); }); await sleep(500);
  await ev(a, () => { SCHP.more = true; rerenderItem(S.panel); }); await sleep(200);
  await a.click('#panel-pin [data-schp="f"][data-k="delay"]'); await sleep(200); await a.fill('#ask-in', '1'); await a.keyboard.press('Enter'); await sleep(700);
  const after = await ev(a, () => { const m = schModel('pangyo'); return { op: m.res.operationDate, toast: document.querySelector('#toast').textContent, ops: document.querySelector('.sch-ops').textContent }; });
  check('one more day on the SAT task moves the operation date to 2028-09-29 and says so', before.op === '2028-09-28' && after.op === '2028-09-29' && /운영개시 \+1일/.test(after.toast) && /^28\.09\.29/.test(after.ops), { before, after });
  await a.click('#toast button'); await sleep(600);
  check('되돌리기 puts it back', await ev(a, () => schModel('pangyo').res.operationDate === '2028-09-28' && !schModel('pangyo').byWbs.get('W7.8').delay));
  await ev(a, () => { document.activeElement.blur(); }); await a.keyboard.press('Control+Shift+Z'); await sleep(500);
  check('Ctrl+Shift+Z applies it again, Ctrl+Z undoes', await ev(a, () => schModel('pangyo').res.operationDate === '2028-09-29'));
  await a.keyboard.press('Control+z'); await sleep(500);
  check('…and the date is 2028-09-28 again', await ev(a, () => schModel('pangyo').res.operationDate === '2028-09-28'));

  console.log('— relations');
  await ev(a, () => { SCHP.tab = 'links'; rerenderItem(S.panel); }); await sleep(300);
  const l0 = await ev(a, () => ({ pre: document.querySelectorAll('#panel-pin .sl-node:not(.cur)').length, cur: document.querySelector('#panel-pin .sl-node.cur').textContent, paths: document.querySelectorAll('#panel-pin .sl-map path').length }));
  check('연결된 아이템 draws the tasks before and after around the task', l0.pre === 7 && /^7-8\)/.test(l0.cur) && l0.paths >= 7, l0);
  await a.click('#panel-pin [data-schp="addrel"][data-k="pre"]'); await sleep(250); await a.fill('#sch-tm-q', '8-6'); await sleep(250);
  await a.click('.sch-tm .it >> nth=0'); await sleep(600);
  check('a relation that would close a loop is refused with the reason', await ev(a, () => /순환/.test(document.querySelector('#toast').textContent) && schModel('pangyo').pred.get(schModel('pangyo').byWbs.get('W7.8').id).length === 4));
  await a.click('#panel-pin [data-schp="addrel"][data-k="pre"]'); await sleep(250); await a.fill('#sch-tm-q', '7-1'); await sleep(250); await a.click('.sch-tm .it >> nth=0'); await sleep(700);
  const l1 = await ev(a, () => { const m = schModel('pangyo'), t = m.byWbs.get('W7.8'); return { n: m.pred.get(t.id).length, added: Object.keys(SCHED.pangyo).filter(k => k.startsWith('d:')).length }; });
  check('adding a predecessor is stored as one new relation', l1.n === 5 && l1.added === 1, l1);
  await ev(a, () => schUndo()); await sleep(500);
  check('…and undone', await ev(a, () => schModel('pangyo').pred.get(schModel('pangyo').byWbs.get('W7.8').id).length === 4));

  console.log('— body and comments of a task are an ordinary item');
  await a.click('#panel-pin [data-cmt]'); await sleep(200); await a.keyboard.type('검수 일정 확인 ' + sfx); await a.keyboard.press('Enter'); await sleep(1500);
  const cm = await ev(a, s => { const it = ITEMS.find(i => i.id === S.panel); return { real: !!it, own: it && it.own, task: it && it.task, n: it && (it.comments || []).length, title: it && it.title, server: !!sharedBase['item:' + S.panel] }; }, sfx);
  check('the first comment turns the task into a stored item (wt-…, own, linked to the task)', cm.real && cm.own && /^[0-9a-f-]{36}$/.test(cm.task) && cm.n === 1 && cm.title === 'SAT 승인·운영이관 G6' && cm.server, cm);
  check('the other member finds the comment on the same task', await ev(b, s => { const t = schModel('pangyo').byWbs.get('W7.8'); const it = ITEMS.find(i => i.id === schItemId(t.id)); return !!it && (it.comments || []).some(x => x.text.includes(s)); }, sfx));

  console.log('— list, relation map, lower section, calendar, main page');
  await ev(a, () => closePanel(true)); await sleep(300);
  await a.click('#sch-actions [data-sch="tab"][data-k="list"]'); await sleep(400);
  const li = await ev(a, () => ({ rows: document.querySelector('#sch-actions .tbl.sch-list').querySelectorAll('.rw').length, head: [...document.querySelector('#sch-actions .tbl.sch-list').querySelectorAll('.hd span')].map(x => x.textContent.trim()), un: (document.querySelector('.sch-sub-h') || {}).textContent || '', pages: document.querySelectorAll('#sch-actions .pager button[data-k="page"]').length }));
  check('리스트: 20 tasks a page with the columns of the design, and the unlinked action items in a group of their own', li.rows === 20 && li.head.join() === 'WBS,업무명,관리일정,중요도,상태,담당자,기한,URL' && /일정 미연결 액션/.test(li.un) && li.pages >= 10, li);
  await ev(a, () => { SCHU.sel = schModel('pangyo').byWbs.get('W7.8').id; }); await a.click('#sch-actions [data-sch="tab"][data-k="net"]'); await sleep(500);
  const ne = await ev(a, () => ({ nodes: document.querySelectorAll('.sn-node').length, sel: (document.querySelector('.sn-node.sel .w') || {}).textContent, edges: document.querySelectorAll('.sn-links path').length }));
  check('관계도: the selected task with its direct neighbours', ne.nodes >= 2 && !!ne.sel && ne.edges >= 1, ne);
  await a.click('#sch-actions [data-sch="tab"][data-k="gantt"]'); await sleep(300);
  const lo = await ev(a, () => ({ rows: document.querySelectorAll('#sch-lower .tbl.sch-proc .rw').length, first: document.querySelector('#sch-lower .tbl.sch-proc .rw .nm').textContent }));
  check('외부설비 조달 lists the 16 packages', lo.rows === 16 && lo.first === '수전반·보호계전', lo);
  await a.click('#sch-lower .rw >> nth=0 >> [data-schc="pdelay"]'); await sleep(250); await a.fill('#ask-in', '30'); await a.keyboard.press('Enter'); await sleep(700);
  const pd = await ev(a, () => ({ d: schModel('pangyo').plan.procurement[0].delay, panel: S.panel, cell: document.querySelector('#sch-lower .rw [data-schc="pdelay"]').textContent, ov: !!SCHED.pangyo['p:설비01'] }));
  check('a PO delay typed in the row applies (and does not open the panel)', pd.d === 30 && !pd.panel && pd.cell === '30일' && pd.ov, pd);
  await ev(a, () => schUndo()); await sleep(400);
  await a.click('#sch-lower [data-sch="sec"][data-k="gate"]'); await sleep(300);
  const ga = await ev(a, () => ({ n: document.querySelectorAll('.sch-gates .gt').length, last: [...document.querySelectorAll('.sch-gates .gt .date')].map(x => x.textContent.slice(0, 8)) }));
  check('승인게이트: eight gates on a time line with the forecast dates', ga.n === 8 && ga.last.includes('28.09.18') && ga.last.includes('28.09.28') && ga.last.includes('29.03.18'), ga);
  await a.click('.sch-gates .gt >> nth=0 >> [data-schc="gstate"]'); await sleep(200); await a.click('.pop .it:has-text("검토 요청")'); await sleep(600);
  check('a gate state is changed in place and recorded with who and when', await ev(a, () => { const g = SCHED.pangyo['g:G1']; return g && g.status === '검토 요청' && g.by === 'SCA' && /검토 요청/.test(document.querySelector('.sch-gates .gt .sch-cm').textContent); }));
  await a.click('#sch-lower [data-sch="sec"][data-k="evid"]'); await sleep(300);
  const evd = await ev(a, () => ({ rows: document.querySelectorAll('#sch-lower .tbl.sch-ev .rw').length, links: document.querySelectorAll('#sch-lower .tbl.sch-ev .sch-wl').length }));
  check('근거 및 확약: the 17 commitment records with links to their tasks', evd.rows === 17 && evd.links > 10, evd);
  const cal = await ev(a, () => { S.calYp = 2026; S.calMp = 11; S.selDate = '2026-11-19'; refreshSec('cal'); const cells = [...document.querySelectorAll('#page-project .cal .cell .acnt')]; return { chips: cells.length, bars: document.querySelectorAll('#page-project .cal .ev.ty-action').length, cap: [...document.querySelectorAll('#page-project .rlist.sch .rcap')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), rows: document.querySelectorAll('#page-project .rlist.sch .ra').length, d: [...document.querySelectorAll('#page-project .rlist.sch .ra .sch-dd')].slice(0, 3).map(x => x.textContent) }; });
  check('calendar: actions are a count beside each date (no bars), the day list has 금일 액션 with D-days', cal.chips >= 28 && cal.bars === 0 && cal.cap.length === 2 && /액션/.test(cal.cap[1]) && cal.rows >= 10 && cal.d.every(x => /지연|D-/.test(x)), cal);
  await ev(a, () => go('main')); await sleep(900);
  const mn = await ev(a, () => ({ tbl: !!document.querySelector('#page-main .tbl.sch-main'), head: [...document.querySelectorAll('#page-main .tbl.sch-main .hd span')].map(x => x.textContent.trim()), tasks: schMainRows().filter(r => /^wt-/.test(r.id)).length, all: schModel('pangyo').plan.tasks.length, legend: [...document.querySelectorAll('#page-main .cal .legend span')].map(x => x.textContent.trim()) }));
  check('main page: the combined action table with only the Pangyo tasks that are under way or due soon', mn.tbl && mn.head.join() === '프로젝트,담당자,제목,기한,상태,중요도,최종수정일자' && mn.tasks > 5 && mn.tasks < 60 && mn.all === 233 && mn.legend.join() === '미팅,리서치', mn);

  console.log('— backup and scenarios');
  await goP(a);
  const bk = await ev(a, () => { const w = schBackup('pangyo'); return { v: w.schemaVersion, sc: w.scenarios.length, tasks: w.scenarios[0].tasks.length, st: w.scenarios[0].tasks.find(t => t.wbs === 'W1.2').status, src: w.source.tasks.length }; });
  check('the backup is the Schedule app\'s JSON (source + base scenario with the changes)', bk.v === 1 && bk.sc === 1 && bk.tasks === 233 && bk.st === '진행' && bk.src === 233, bk);
  await ev(a, () => { const w = schBackup('pangyo'); w.scenarios[0].tasks.find(t => t.wbs === 'W7.8').delay = 7; schImportBackup('pangyo', JSON.stringify(w)); }); await sleep(300);
  await a.click('#dlg button.pri'); await sleep(900);
  check('importing a backup replaces the shared changes (7 days on the SAT task give 2028-10-05) and is one undo step', await ev(a, () => schModel('pangyo').byWbs.get('W7.8').delay === 7 && schModel('pangyo').res.operationDate > '2028-09-28' && schModel('pangyo').byWbs.get('W1.2').status === '진행'), await ev(a, () => schModel('pangyo').res.operationDate));
  await ev(a, () => schUndo()); await sleep(500);
  check('…undone', await ev(a, () => !schModel('pangyo').byWbs.get('W7.8').delay && schModel('pangyo').res.operationDate === '2028-09-28'));
  await ev(a, () => { schSet('pangyo', 'sc:t1', { name: '지연 검토', by: sharedUser, at: new Date().toISOString(), ov: copy(Object.fromEntries(Object.entries(SCHED.pangyo).filter(([k]) => AIDCSchedule.isPlanKey(k)))) }); SCHU.scn = 't1'; SCH.memo.pangyo = null; schRedraw(true); }); await sleep(500);
  await ev(a, () => { const t = schModel('pangyo').byWbs.get('W7.8'); schEditTask('pangyo', t.id, 's', x => { x.delay = 5; }, true); }); await sleep(1500);
  const sc = await ev(a, () => ({ op: schModel('pangyo').res.operationDate, note: (document.querySelector('.sch-note') || {}).textContent || '', base: !(SCHED.pangyo['t:' + schModel('pangyo').byWbs.get('W7.8').id] || {}).delay }));
  check('a scenario is a copy to try things in: its changes do not touch the shared plan', sc.op > '2028-09-28' && /시나리오/.test(sc.note) && sc.base, sc);
  check('…the other member still sees the shared plan', await ev(b, () => schModel('pangyo').res.operationDate === '2028-09-28' && !!SCHED.pangyo['sc:t1']));

  console.log('— cleaning up');
  await ev(a, async s => { SCHU.scn = ''; for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; for (const it of ITEMS.filter(x => x.own && (x.comments || []).some(q => (q.text || '').includes(s)))) { it.comments = []; } render(true); }, sfx); await sleep(1500);
  check('no page errors', !A.errs.length && !B.errs.length && !C.errs.length, [...A.errs, ...B.errs, ...C.errs].slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
