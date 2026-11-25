// WorkSpace x Schedule (preview), thirteenth part (owner, 2026-11-23, the "sixteenth round"):
//  - a development phase that was made can be renamed and, while it holds no task, removed (its row in the gantt, the phase pickers);
//  - WBS and 개발 단계 are one thing: an action that is given a phase becomes, when published, a task of the plan with the next WBS
//    number of that phase, and stands in 액션 일정 · 리스트 · 관계도; it keeps its own item; the list names the phase above its rows;
//  - leaving something that is being written asks first (저장 / 저장 안 함 / 계속 작성); without the preview it still saves silently;
//  - a menu's own button pressed again closes the menu;
//  - the title of a record a member added can be changed; an uploaded workbook can be taken out again.
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2', V1 = 'http://127.0.0.1:8787/?v=1';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RYA' + sfx, '열셋 일', { url: V2 }), a = A.page, kb = a.keyboard;
  const B = await newUser(browser, 'RYB' + sfx, '열셋 이', { url: V2 }), b = B.page;
  const ev = (f, x) => a.evaluate(f, x);
  const goP = async (pg = a) => { await pg.evaluate(() => go('project:pangyo')); await pg.waitForFunction(() => schReady('pangyo'), null, { timeout: 20000 }); await sleep(600); };
  const flush = async () => { await ev(() => sharedFlush(true)); await sleep(1500); };
  const pops = () => ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()));
  const toastText = () => ev(() => { const t = document.querySelector('#toast'); return t && t.classList.contains('on') ? t.textContent : ''; });
  const ask = async v => { await a.fill('#ask-in', v); await a.click('[data-ask="o"]'); await sleep(500); };
  const gantt = async () => { await ev(() => { SCHU.tab = 'gantt'; SCHU.phase = ''; SCHU.q = ''; SCHU.scope = 'all'; SCHU.who = ''; schRefresh(); }); await sleep(400); };
  const rowMenu = async code => { await a.hover(`#sch-gantt .sg-left .sg-row.ph[data-k="${code}"]`); await sleep(120); await a.click(`#sch-gantt .sg-left .sg-row.ph[data-k="${code}"] .pm`); await sleep(250); };
  const made = [];   // items this run makes
  const newAction = async (title, proj = 'pangyo') => { const id = await ev(([t, p]) => { const it = newItem('action'); it.title = t; it.proj = p; openPanel(it.id); return it.id; }, [title, proj]); made.push(id); await sleep(500); return id; };
  const pickPhase = async label => { await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.click(`.pop .it:has-text("${label}")`); await sleep(400); };
  await goP(); await goP(b); await gantt(); await ev(() => { SCHU.open = []; schRefresh(); }); await sleep(300);

  console.log('— 연결된 액션 stands in the middle');
  const lk = async wbs => { await ev(w => { const t = schModel('pangyo').byWbs.get(w); SCHP.tab = 'links'; openPanel(schItemId(t.id)); }, wbs); await sleep(600);
    return ev(() => { const map = document.querySelector('#panel-pin .sl-map'), wrap = document.querySelector('#panel-pin .sl-wrap'), pin = document.querySelector('#panel-pin'), m = map.getBoundingClientRect(), ns = [...map.querySelectorAll('.sl-node')].map(n => n.getBoundingClientRect()), l = Math.min(...ns.map(r => r.left)), r = Math.max(...ns.map(r => r.right)), cur = map.querySelector('.sl-node.cur').getBoundingClientRect(), cs = getComputedStyle(pin), box = pin.getBoundingClientRect();
      return { n: ns.length, left: Math.round(l - m.left), right: Math.round(m.right - r), curMid: Math.round((cur.left + cur.right) / 2 - (m.left + m.right) / 2), over: wrap.scrollWidth - wrap.clientWidth, inside: m.left >= box.left + parseFloat(cs.paddingLeft) - 1 && m.right <= box.right - parseFloat(cs.paddingRight) + 1 }; }); };
  const lk1 = await lk('W1.1');
  check('a task with followers only: the task and its followers stand in the middle together, nothing sticks out', lk1.n >= 3 && Math.abs(lk1.left - lk1.right) <= 2 && lk1.left > 40 && lk1.curMid < -40 && lk1.over <= 0 && lk1.inside, lk1);
  const lk2 = await lk('W2.2');
  check('a task with both sides takes the whole width, itself in the middle', lk2.n >= 3 && lk2.left <= 2 && lk2.right <= 2 && Math.abs(lk2.curMid) <= 2 && lk2.over <= 0, lk2);
  await ev(() => { SCHP.tab = 'info'; closePanel(true); }); await sleep(300);

  console.log('— an action put in between: the numbers after it move up');
  // (owner, 2026-11-24. The key `wbs` of a task never changes: the calculation, the gates and the workbook know it by that; `no` is what shows.)
  const nums = () => ev(() => { const m = schModel('pangyo'), g = m.phases.find(x => x.code === 'W1'); return { shown: g.tasks.map(t => schNo(t)), keys: g.tasks.map(t => t.wbs), ops: m.res.operationDate, n: g.tasks.length, ov: Object.keys(SCHED.pangyo || {}).filter(k => k.startsWith('t:') && SCHED.pangyo[k] && SCHED.pangyo[k].no).length }; });
  const z0 = await nums();
  const idN = await newAction('끼움 액션 ' + sfx);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.click('.pop .it[data-k="W1"]'); await sleep(400);
  const nb0 = await ev(() => { const b = document.querySelector('#panel-pin [data-schp="wbs-at"]'); return b && { tag: b.tagName, txt: b.textContent, title: b.title }; });
  check('the number a new action will get is a button that says its place can be chosen', nb0 && nb0.tag === 'BUTTON' && nb0.txt === `1-${z0.n + 1})` && /들어갈 자리/.test(nb0.title), nb0);
  await a.click('#panel-pin [data-schp="wbs-at"]'); await sleep(300);
  const nm0 = await ev(() => ({ hd: (document.querySelector('.pop.sch-nopick .hd') || {}).textContent, rows: [...document.querySelectorAll('.pop.sch-nopick .it')].map(x => x.querySelector('.no').textContent), self: [...document.querySelectorAll('.pop.sch-nopick .it')].findIndex(x => x.classList.contains('self')), own: (document.querySelector('.pop.sch-nopick .it.self .phn') || {}).textContent }));
  check('its menu lists the actions of the phase with their numbers and the action itself as the last row, to be pulled', /끌어서/.test(nm0.hd) && /한 칸씩 밀립니다/.test(nm0.hd) && nm0.rows.length === z0.n + 1 && nm0.rows[2] === '1-3)' && nm0.self === z0.n && nm0.rows[z0.n] === `1-${z0.n + 1})` && nm0.own === '끼움 액션 ' + sfx, nm0);
  const nk3 = await ev(() => schModel('pangyo').byWbs.get('W1.3').id);
  const dlgTxt = () => ev(() => { const d = document.querySelector('#dlg'); return d ? { m: d.querySelector('.m').textContent, b: [...d.querySelectorAll('button')].map(x => x.textContent).join() } : null; });
  await a.click(`.pop.sch-nopick .it[data-k="${nk3}"]`); await sleep(300);
  const pq1 = await dlgTxt(), before1 = await ev(() => document.querySelector('#panel-pin [data-schp="wbs-at"]').textContent);
  check('a row chosen: a window asks first, from which number to which', pq1 && new RegExp(`끼움 액션 ${sfx}.*1-${z0.n + 1} 대신 1-3 자리에 넣을까요`).test(pq1.m) && pq1.b === '옮기기,취소' && before1 === `1-${z0.n + 1})`, { pq1, before1 });
  await a.click('#dlg button:not(.pri)'); await sleep(300);
  check('취소: nothing is chosen', await ev(i => !document.querySelector('#dlg') && !item(i).wbsAt && document.querySelector('#panel-pin [data-schp="wbs-at"]').textContent, idN) === `1-${z0.n + 1})`);
  await a.click('#panel-pin [data-schp="wbs-at"]'); await sleep(300); await a.click(`.pop.sch-nopick .it[data-k="${nk3}"]`); await sleep(300); await a.click('#dlg button.pri'); await sleep(300);
  check('옮기기: the button shows that number', await ev(() => document.querySelector('#panel-pin [data-schp="wbs-at"]').textContent === '1-3)'));
  await a.click('#panel-pin [data-ed="publish"]'); await sleep(1400);
  const z1 = await nums(), st1 = await ev(i => { const it = item(i), m = schModel('pangyo'), t = m.byId.get(it.task); return { no: t && schNo(t), key: t && t.wbs, toast: (document.querySelector('#toast') || {}).textContent, head: (document.querySelector('#panel-pin .ititle') || { dataset: {} }).dataset.wbs, at: it.wbsAt || '', nk3: schNo(m.byWbs.get('W1.3')), link: schWbsLinks(m, 'W1.3').replace(/<[^>]+>/g, ''), w86: !!m.byWbs.get('W8.6') }; }, idN);
  check('published, it stands at 1-3 and what was 1-3 and after moved one up (the keys and the operation date stay)', st1.no === '1-3' && st1.key === 'W1.' + (z0.n + 1) && JSON.stringify(z1.shown) === JSON.stringify(z0.shown.concat('1-' + (z0.n + 1))) && z1.keys[2] === st1.key && z1.keys[3] === 'W1.3' && z1.ops === z0.ops && st1.w86 && !st1.at, { st1, z1 });
  check('the toast and the head of the panel say 1-3; a text that names W1.3 shows the number it has now', /1-3\) 번호로/.test(st1.toast) && st1.head === '1-3' && st1.nk3 === '1-4' && st1.link === '1-4', st1);
  await ev(() => { closePanel(true); SCHU.tab = 'gantt'; SCHU.open = ['W1']; schRefresh(); }); await sleep(500);
  const gr1 = await ev(() => [...document.querySelectorAll('#sch-gantt .sg-left .sg-row.tk')].slice(0, 4).map(r => r.textContent.trim().slice(0, 9)));
  check('the gantt lists it between 1-2 and what is 1-4 now', /^1-1\)/.test(gr1[0]) && /^1-2\)/.test(gr1[1]) && gr1[2].startsWith('1-3)끼움 액션') && /^1-4\)/.test(gr1[3]), gr1);
  await ev(() => schUndo()); await sleep(600); const z2 = await nums();
  check('one 되돌리기 takes the action out and every number back', JSON.stringify(z2.shown) === JSON.stringify(z0.shown) && z2.ov === z0.ov, z2);
  await ev(i => { const it = item(i); it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); render(true); }, idN); await sleep(300);
  // a task that is there already: its number is a button while its panel is edited; 취소 takes the move back
  await ev(() => openPanel(schItemId(schModel('pangyo').byWbs.get('W1.6').id))); await sleep(600);
  const nro = await ev(() => !document.querySelector('#panel-pin [data-schp="wbs-move"]'));
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(600); await a.click('#panel-pin [data-schp="wbs-move"]'); await sleep(300);
  const nm1 = await ev(() => ({ n: document.querySelectorAll('.pop.sch-nopick .it').length, self: (document.querySelector('.pop.sch-nopick .it.self .no') || {}).textContent, at: [...document.querySelectorAll('.pop.sch-nopick .it')].findIndex(x => x.classList.contains('self')), end: [...document.querySelectorAll('.pop.sch-nopick .it .phn')].pop().textContent }));
  const nk2 = await ev(() => schModel('pangyo').byWbs.get('W1.2').id);
  await a.click(`.pop.sch-nopick .it[data-k="${nk2}"]`); await sleep(300);
  const pq2 = await dlgTxt(), z3a = await nums();
  check('moving an action that is there asks too, and nothing has moved yet', pq2 && /액션을 1-6 자리에서 1-2 자리로 옮길까요\? 그 사이 번호는 한 칸씩 밀립니다/.test(pq2.m) && JSON.stringify(z3a.keys) === JSON.stringify(z0.keys), { pq2 });
  await a.click('#dlg button.pri'); await sleep(600);
  const z3 = await nums(), nmv = await ev(() => ({ btn: document.querySelector('#panel-pin [data-schp="wbs-move"]').textContent, toast: (document.querySelector('#toast') || {}).textContent }));
  check('an existing action moved before 1-2: it shows 1-2, the ones between moved one up, nothing else changed', nro && nm1.n === z0.n + 1 && nm1.self === '1-6)' && nm1.at === 5 && /맨 뒤/.test(nm1.end) && JSON.stringify(z3.keys.slice(0, 7)) === JSON.stringify(['W1.1', 'W1.6', 'W1.2', 'W1.3', 'W1.4', 'W1.5', 'W1.7']) && JSON.stringify(z3.shown) === JSON.stringify(z0.shown) && nmv.btn === '1-2)' && /1-6 → 1-2/.test(nmv.toast) && z3.ops === z0.ops, { nm1, z3, nmv });
  await a.click('#panel-pin [data-ed="cancel"]'); await sleep(700); const z4 = await nums();
  check('취소 puts it back', JSON.stringify(z4.keys) === JSON.stringify(z0.keys) && JSON.stringify(z4.shown) === JSON.stringify(z0.shown) && z4.ov === z0.ov, z4);
  // the same by pulling the own row of the menu: the rows it passes slide out of its way and show the numbers they would get
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(600); await a.click('#panel-pin [data-schp="wbs-move"]'); await sleep(350);
  const box0 = await (await a.$('.pop.sch-nopick .it.self')).boundingBox(), px = box0.x + box0.width / 2, py = box0.y + box0.height / 2;
  await a.mouse.move(px, py); await a.mouse.down(); for (let i = 1; i <= 10; i++) { await a.mouse.move(px, py - 2 * box0.height * i / 10); await sleep(25); } await sleep(250);
  const dg = await ev(() => { const its = [...document.querySelectorAll('.pop.sch-nopick .it')].filter(x => !x.classList.contains('end')); return { dragging: document.querySelector('.pop.sch-nopick').classList.contains('dragging'), self: document.querySelector('.pop.sch-nopick .it.self').className, nos: its.map(x => x.querySelector('.no').textContent), moved: its.map(x => !!x.style.transform), trans: getComputedStyle(its[3]).transitionProperty }; });
  check('pulled up two rows: it follows the pointer, the two rows it passed have slid down and every row shows its number to be', dg.dragging && /drag/.test(dg.self) && dg.nos[5] === '1-4)' && dg.nos[3] === '1-5)' && dg.nos[4] === '1-6)' && dg.nos[2] === '1-3)' && dg.moved[3] && dg.moved[4] && dg.moved[5] && !dg.moved[2] && !dg.moved[6] && /transform/.test(dg.trans), dg);
  await a.mouse.up(); await sleep(700);
  const pq3 = await dlgTxt(), z5a = await nums();
  check('let go: the menu closes and the window asks before anything moves', pq3 && /1-6 자리에서 1-4 자리로 옮길까요/.test(pq3.m) && !await ev(() => !!document.querySelector('.pop.sch-nopick')) && JSON.stringify(z5a.keys) === JSON.stringify(z0.keys), { pq3 });
  await a.click('#dlg button.pri'); await sleep(600);
  const z5 = await nums(), dq = await ev(() => ({ pop: !!document.querySelector('.pop.sch-nopick'), btn: document.querySelector('#panel-pin [data-schp="wbs-move"]').textContent }));
  check('옮기기: the action stands there (1-4), the two it passed one up', !dq.pop && dq.btn === '1-4)' && JSON.stringify(z5.keys.slice(0, 7)) === JSON.stringify(['W1.1', 'W1.2', 'W1.3', 'W1.6', 'W1.4', 'W1.5', 'W1.7']) && JSON.stringify(z5.shown) === JSON.stringify(z0.shown), { z5, dq });
  await a.click('#panel-pin [data-schp="wbs-move"]'); await sleep(350); await a.click('.pop.sch-nopick .it.self'); await sleep(300);
  check('a press on the own row (no pull) changes nothing and leaves the menu open', await ev(() => !!document.querySelector('.pop.sch-nopick')) && JSON.stringify((await nums()).keys) === JSON.stringify(z5.keys));
  await ev(() => closePop()); await a.click('#panel-pin [data-ed="cancel"]'); await sleep(700);
  check('취소 takes the pull back too', JSON.stringify((await nums()).keys) === JSON.stringify(z0.keys));
  await ev(() => closePanel(true)); await sleep(300); await gantt(); await ev(() => { SCHU.open = []; schRefresh(); }); await sleep(300);

  console.log('— a phase can be renamed and removed');
  const pm = await ev(() => { const r = document.querySelector('#sch-gantt .sg-left .sg-row.ph[data-k="W1"]'), p = r.querySelector('.pm'); return { has: !!p, hidden: getComputedStyle(p).display === 'none', title: p.title }; });
  await rowMenu('W1'); const m1 = await pops();
  check('a phase row of the gantt has a "⋮" beside its + (shown with it), with 이름 바꾸기 and 단계 삭제', pm.has && pm.hidden && /이름 바꾸기/.test(pm.title) && m1.length === 2 && /“1\) 사업정의·RFP” 이름 바꾸기/.test(m1[0]) && /단계 삭제/.test(m1[1]), { pm, m1 });
  await a.click('.pop .it:has-text("이름 바꾸기")'); await sleep(250);
  check('the window asks with the name as it is (without the number)', await ev(() => document.querySelector('#ask-in').value === '사업정의·RFP'));
  await ask('사업정의 ' + sfx);
  const r1 = await ev(() => ({ row: document.querySelector('#sch-gantt .sg-left .sg-row.ph[data-k="W1"] .tt').textContent, rec: (SCHED.pangyo['ph:W1'] || {}).label, toast: (document.querySelector('#toast') || {}).textContent }));
  check('renamed: the gantt row carries the new name at once, with 되돌리기', r1.row === '1) 사업정의 ' + sfx && r1.rec === '사업정의 ' + sfx && /되돌리기/.test(r1.toast), r1);
  await ev(() => { SCHU.tab = 'list'; SCHU.sort = 'wbs'; SCHU.dir = 1; SCHU.page = 1; schRefresh(); }); await sleep(400);
  const g1 = await ev(() => { const t = document.querySelector('#sch-actions .tbl.sch-list'); return { gr: t.querySelectorAll('.gr').length, first: (t.querySelector('.rw .w') || {}).textContent.trim(), rows: t.querySelectorAll('.rw').length }; });
  check('the list in WBS order has no line that names a phase above its rows (thirty-fourth round): the rows follow each other from the first phase', g1.gr === 0 && /^1-\d+$/.test(g1.first) && g1.rows >= 10, g1);
  await flush(); await b.evaluate(() => { SCHU.tab = 'gantt'; schRefresh(); }); await sleep(500);
  check('the other member sees the new name', await b.evaluate(s => document.querySelector('#sch-gantt .sg-left .sg-row.ph[data-k="W1"] .tt').textContent === '1) 사업정의 ' + s, sfx));
  await gantt(); await rowMenu('W1'); const m2 = await pops();
  check('a renamed phase of the workbook can have its own name back', m2.some(x => /원래 이름으로 \(사업정의·RFP\)/.test(x)), m2);
  await a.click('.pop .it:has-text("원래 이름으로")'); await sleep(500);
  check('…and has it back', await ev(() => document.querySelector('#sch-gantt .sg-left .sg-row.ph[data-k="W1"] .tt').textContent === '1) 사업정의·RFP' && !SCHED.pangyo['ph:W1']));

  console.log('— a phase made from an action\'s picker');
  const n0 = await ev(() => schModel('pangyo').plan.tasks.length);
  const id1 = await newAction('단계 액션 ' + sfx);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.click('.pop .it:has-text("새 단계 추가")'); await sleep(300); await ask('시험 단계 ' + sfx);
  const code = await ev(i => item(i).phase, id1), no = code.slice(1);
  const p1 = await ev(c => ({ row: (document.querySelector(`#sch-gantt .sg-left .sg-row.ph[data-k="${c}"] .tt`) || {}).textContent, auto: (document.querySelector('#panel-pin .wbno.auto') || {}).textContent, sub: !!document.querySelector('#panel-pin [data-schp="link-task"]'), x: !!document.querySelector('#panel-pin [data-schp="unlink"]'), free: !ITEMS.some(i => i.proj === 'pangyo' && i.phase === c && i.status !== 'new') }), code);
  check('a phase made while an action is being written stands in the gantt at once', p1.row === `${no}) 시험 단계 ${sfx}`, p1);
  check('the action shows the WBS number it will get beside its phase, with an x; there is no second picker', p1.auto === `${no}-1)` && p1.sub === false && p1.x, p1);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); const m3 = await pops();
  const xs = await ev(() => ({ rows: document.querySelectorAll('.pop.sch-phpick .it[data-k^="W"]').length, x: document.querySelectorAll('.pop.sch-phpick .it[data-k^="W"] [data-phx]').length, hidden: getComputedStyle(document.querySelector('.pop.sch-phpick .it [data-phx]')).visibility }));
  check('the picker offers to rename the phase that is chosen, and every phase of the list has an x (shown under the pointer)', m3.some(x => x === `“${no}) 시험 단계 ${sfx}” 이름 바꾸기`) && xs.rows >= 9 && xs.x === xs.rows && xs.hidden === 'hidden', { m3, xs });
  await a.click('.pop .it:has-text("이름 바꾸기")'); await sleep(250); await ask('고친 단계 ' + sfx);
  check('renamed from the picker: the panel and the gantt follow', await ev(([c, s, n]) => document.querySelector('#panel-pin [data-schp="link-phase"]').textContent.trim() === `${n}) 고친 단계 ${s}` && document.querySelector(`#sch-gantt .sg-left .sg-row.ph[data-k="${c}"] .tt`).textContent === `${n}) 고친 단계 ${s}`, [code, sfx, no]));

  console.log('— an action with a phase is a WBS entry');
  await a.click('#panel-pin [data-ed="publish"]'); await sleep(1300);
  const c1 = await ev(i => { const it = item(i), m = schModel('pangyo'), t = it.task && m.byId.get(it.task); return { own: !!it.own, schOwn: schOwn(it), wbs: t && t.wbs, name: t && t.name, st: t && t.status, n: m.plan.tasks.length, panel: S.panel, pair: t && schItemId(t.id) === i && schTaskIdOf(i) === t.id, task: it.task,
    toast: (document.querySelector('#toast') || {}).textContent, head: (document.querySelector('#panel-pin .ititle') || { dataset: {} }).dataset.wbs, props: !!document.querySelector('#panel-pin .sch-props:not(.act-props)'), row: !!document.querySelector(`#sch-gantt .sg-row.tk[data-row="${it.task}"]`), bar: !!document.querySelector(`#sch-gantt [data-bar="${it.task}"]`) }; }, id1);
  check('published, it is a task of the plan with the next number of its phase', c1.own && c1.schOwn && c1.wbs === code + '.1' && c1.name === '단계 액션 ' + sfx && c1.n === n0 + 1, c1);
  check('it keeps its own item (same id), and the pair task <-> item is found both ways', c1.panel === id1 && c1.pair === true, c1);
  check('the toast says under which number it now stands, the panel is the task\'s', new RegExp(`게시했습니다 · ${no}-1\\) 번호로 액션 일정 · 리스트 · 관계도에 올렸습니다`).test(c1.toast) && c1.head === `${no}-1` && c1.props, c1);
  check('it stands in the gantt at once (its phase is opened, a row and a bar)', c1.row && c1.bar, c1);
  await ev(() => closePanel(true)); await sleep(300);
  await ev(() => { SCHU.tab = 'list'; SCHU.page = 999; schRefresh(); }); await sleep(400);
  const wbsColumn = a.locator('#sch-actions .sch-list [data-sch="col"][data-k="wbs"]');
  await wbsColumn.click();
  await a.locator('.pop .it').filter({hasText:'고친 단계 ' + sfx}).click();
  const visibleTasks = await a.locator('#sch-actions .sch-list .rw').allTextContents();
  const wbs = await a.locator('#sch-actions .sch-list .rw .w').allTextContents();
  check('the renamed phase filters the list to the new action and its WBS number', await ev(() => SCHU.phase) === code && visibleTasks.length === 1 && visibleTasks[0].includes('단계 액션 ' + sfx) && wbs[0] === `${no}-1`, {wbs, visibleTasks});
  await wbsColumn.click();
  await a.locator('.pop .it').filter({hasText:'전체 단계'}).click();
  await ev(() => { SCHU.tab = 'net'; schRefresh(); }); await sleep(600);
  check('…and in the relation map', await ev(t => !!document.querySelector(`#sch-net [data-k="${t}"]`), c1.task));
  await flush();
  const bSees = await b.evaluate(([t, i]) => { const m = schModel('pangyo'), x = m.byId.get(t); return x && { wbs: x.wbs, item: schItemId(t) === i, title: (ITEMS.find(q => q.id === i) || {}).title }; }, [c1.task, id1]);
  check('the other member has the task, paired with the same item', bSees && bSees.wbs === code + '.1' && bSees.item && bSees.title === '단계 액션 ' + sfx, bSees);
  await gantt(); await ev(c => { if (!SCHU.open.includes(c)) SCHU.open.push(c); schRefresh(); }, code); await sleep(300);
  await a.click(`#sch-gantt .sg-row.tk[data-row="${c1.task}"]`); await sleep(250); await a.click(`#sch-gantt .sg-row.tk[data-row="${c1.task}"]`); await sleep(500);
  check('pressed in the gantt (twice) it opens that same item', await ev(i => S.panel === i, id1));
  await ev(() => closePanel(true)); await sleep(200);
  await rowMenu(code); const m4 = await pops(); await ev(() => closePop());
  check('the "⋮" of a phase row offers 이름 바꾸기 and 단계 삭제', m4.some(x => /이름 바꾸기/.test(x)) && m4.some(x => /단계 삭제/.test(x)), m4);

  console.log('— undo and redo of that step');
  await ev(() => schUndo()); await sleep(500);
  const u1 = await ev(i => { const it = item(i), m = schModel('pangyo'); return { own: !!it.own, task: it.task || '', n: m.plan.tasks.length, phase: it.phase, listed: schUnlinked('pangyo').some(x => x.id === i) }; }, id1);
  check('undone: the task is gone and the action is an ordinary action of its phase again', !u1.own && !u1.task && u1.n === n0 && u1.phase === code && u1.listed, u1);
  await ev(() => schRedo()); await sleep(500);
  const u2 = await ev(([i, t]) => { const it = item(i), m = schModel('pangyo'); return { own: !!it.own, task: it.task, has: m.byId.has(t), n: m.plan.tasks.length }; }, [id1, c1.task]);
  check('redone: it is the task\'s own item again', u2.own && u2.task === c1.task && u2.has && u2.n === n0 + 1, u2);

  console.log('— what does not become a task');
  const id2 = await newAction('붙인 액션 ' + sfx); await pickPhase('1) 사업정의·RFP');
  await ev(i => { const m = schModel('pangyo'), t = m.phases[0].tasks[0], it = item(i); it.task = t.id; it.phase = t.phase; it.dirty = true; rerenderItem(i); }, id2); await sleep(400);   // hung under a task as before the eighteenth round
  await a.click('#panel-pin [data-ed="publish"]'); await sleep(1200);
  const k2 = await ev(i => { const it = item(i); return { own: !!it.own, task: !!it.task, n: schModel('pangyo').plan.tasks.length, auto: !!document.querySelector('#panel-pin .wbno.auto') }; }, id2);
  check('an action hung under an existing task stays an action of that task', !k2.own && k2.task && k2.n === n0 + 1, k2);
  await ev(() => closePanel(true)); await sleep(200);
  const id3 = await newAction('단계 없는 액션 ' + sfx); await a.click('#panel-pin [data-ed="publish"]'); await sleep(1200);
  const k3 = await ev(i => { const it = item(i); return { own: !!it.own, loose: schLoose('pangyo', schModel('pangyo')).some(x => x.id === i), n: schModel('pangyo').plan.tasks.length }; }, id3);
  check('an action without a phase stays 일정 미연결', !k3.own && k3.loose && k3.n === n0 + 1, k3);
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(500); await pickPhase('2) 사업성·권리');
  const want = await ev(() => (document.querySelector('#panel-pin .wbno.auto') || {}).textContent);
  await a.click('#panel-pin [data-ed="save"]'); await sleep(1300);
  const k4 = await ev(i => { const it = item(i), m = schModel('pangyo'), t = it.task && m.byId.get(it.task); return { own: !!it.own, wbs: t && t.wbs, n: m.plan.tasks.length, panel: S.panel, toast: (document.querySelector('#toast') || {}).textContent }; }, id3);
  check('given a phase later and saved, it becomes the next WBS of that phase (same item)', k4.own && want === k4.wbs.replace('W', '').replace('.', '-') + ')' && k4.n === n0 + 2 && k4.panel === id3 && /저장했습니다 · 2-\d+\) 번호로/.test(k4.toast), { k4, want });
  await ev(() => closePanel(true)); await sleep(200);
  await ev(() => { SCHU.tab = 'list'; SCHU.sort = 'name'; SCHU.page = 1; schRefresh(); }); await sleep(300);
  check('the list ordered by another column has no phase lines', await ev(() => document.querySelectorAll('#sch-actions .tbl.sch-list .gr').length === 0));
  await ev(() => { SCHU.sort = 'wbs'; SCHU.dir = 1; SCHU.page = 999; schRefresh(); }); await sleep(300);
  const tail = await ev(() => ({ gr: document.querySelectorAll('#sch-actions .tbl.sch-list .gr').length, w: [...document.querySelectorAll('#sch-actions .tbl.sch-list .rw .w')].map(x => x.textContent.trim()) }));
  check('in WBS order the actions of no phase stand at the end, with no line above them', tail.gr === 0 && (i => i < 0 || tail.w.slice(i).every(x => x === '-'))(tail.w.indexOf('-')), tail);

  console.log('— a phase that holds a task goes with it');
  await gantt(); await ev(c => { if (!SCHU.open.includes(c)) SCHU.open.push(c); schRefresh(); }, code); await sleep(300);
  const before = await ev(() => schModel('pangyo').plan.tasks.length);
  await rowMenu(code); await a.click('.pop .it:has-text("단계 삭제")'); await sleep(300);
  const dq2 = await ev(() => (document.querySelector('#dlg .m') || {}).textContent || ''); await a.click('#dlg button.pri'); await sleep(600);
  const dd = await ev(([c, i]) => ({ n: schModel('pangyo').plan.tasks.length, phase: schModel('pangyo').phases.some(g => g.code === c), rec: !!SCHED.pangyo['ph:' + c], toast: (document.querySelector('#toast') || {}).textContent, undo: SCH.undo[SCH.undo.length - 1].label }), [code, id1]);
  check('the question says how many actions go with the phase; removed, they are gone together', /이 단계의 액션 1건과 거기에 걸린 관계도 함께 지워집니다/.test(dq2) && dd.n === before - 1 && !dd.phase && !dd.rec && /단계를 삭제했습니다.*되돌리기/.test(dd.toast), { dq2, dd });
  await ev(() => schUndo()); await sleep(500);
  check('one 되돌리기 brings the phase and its action back', await ev(([c, n]) => schModel('pangyo').plan.tasks.length === n && schModel('pangyo').phases.some(g => g.code === c) && !!SCHED.pangyo['ph:' + c], [code, before]));

  console.log('— an action that carried a phase from before');
  const oldId = await ev(s => { const it = newItem('action'); Object.assign(it, { title: '예전 단계 액션 ' + s, proj: 'pangyo', phase: 'W3', status: 'published', authorId: sharedUser, createdAt: new Date().toISOString(), date: TODAY }); delete it.sessionNew; SCH.legacy = {}; return it.id; }, sfx); made.push(oldId);
  await ev(() => schRefresh()); await sleep(1500);
  const lg = await ev(i => { const it = item(i), m = schModel('pangyo'), t = it.task && m.byId.get(it.task); return { own: !!it.own, wbs: t && t.wbs, toast: (document.querySelector('#toast') || {}).textContent }; }, oldId);
  check('it gets its WBS number by itself on its writer\'s page, and the toast says so', lg.own && /^W3\.\d+$/.test(lg.wbs || '') && /개발 단계가 있던 액션 1건에 WBS 번호를 붙였습니다/.test(lg.toast), lg);
  await ev(() => schUndo()); await sleep(500); await ev(() => { SCH.legacy = {}; schRefresh(); }); await sleep(1500);
  check('taken back, it is not turned again by itself', await ev(i => { const it = item(i); return !it.own && !it.task && it.phase === 'W3' && it.wbsOff === 1; }, oldId));

  console.log('— removing a phase');
  await gantt();
  const id4 = await newAction('버릴 액션 ' + sfx);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.click('.pop .it:has-text("새 단계 추가")'); await sleep(300); await ask('버릴 단계 ' + sfx);
  const code2 = await ev(i => item(i).phase, id4);
  check('a new phase does not take a number that is in use', code2 !== code && +code2.slice(1) > +code.slice(1), { code, code2 });
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.hover(`.pop.sch-phpick .it[data-k="${code2}"]`); await sleep(120); await a.click(`.pop.sch-phpick .it[data-k="${code2}"] [data-phx]`); await sleep(300);
  const dl = await ev(() => (document.querySelector('#dlg .m') || {}).textContent || ''); await a.click('#dlg button.pri'); await sleep(500);
  const d1 = await ev(([i, c]) => ({ phase: item(i).phase || '', rec: SCHED.pangyo['ph:' + c] || null, row: !!document.querySelector(`#sch-gantt .sg-left .sg-row.ph[data-k="${c}"]`), label: document.querySelector('#panel-pin [data-schp="link-phase"]').textContent.trim() }), [id4, code2]);
  check('removed after a question: the record is gone, the action has no phase, the gantt has no such row', /단계를 삭제할까요/.test(dl) && !d1.phase && !d1.rec && !d1.row && d1.label === '단계 선택', { dl, d1 });
  await ev(() => schUndo()); await sleep(400);
  check('…and 되돌리기 brings the phase back', await ev(c => !!SCHED.pangyo['ph:' + c] && !!document.querySelector(`#sch-gantt .sg-left .sg-row.ph[data-k="${c}"]`), code2));
  await ev(c => schSet('pangyo', 'ph:' + c, null), code2); await sleep(300);

  console.log('— leaving what is being written asks first');
  const dlg = () => ev(() => { const d = document.querySelector('#dlg.leave-dlg'); return d ? { text: d.querySelector('.m').textContent, btns: [...d.querySelectorAll('button')].map(x => x.textContent) } : null; });
  await a.click('#panel-pin .ititle'); await kb.press('Control+A'); await kb.type('닫기 시험 ' + sfx); await sleep(150);
  await a.click('#panel-close'); await sleep(300); const q1 = await dlg();
  check('closing a new item with something written: a window asks, nothing is saved yet', q1 && /작성 중인 내용이 있습니다/.test(q1.text) && /저장하지 않고 닫을까요/.test(q1.text) && q1.btns.join() === '계속 작성,저장 안 함,초안으로 저장' && await ev(i => S.panel === i && item(i).status === 'new', id4), q1);
  await a.click('#dlg [data-lv="stay"]'); await sleep(250);
  check('계속 작성: the window goes, the panel stays with what was written', await ev(i => !document.querySelector('#dlg') && S.panel === i && /닫기 시험/.test(document.querySelector('#panel-pin .ititle').textContent), id4));
  await a.click('#panel-close'); await sleep(300); await kb.press('Escape'); await sleep(250);
  check('Esc does the same', await ev(i => !document.querySelector('#dlg') && S.panel === i, id4));
  await a.click('#panel-close'); await sleep(300); await a.click('#dlg [data-lv="drop"]'); await sleep(500);
  check('저장 안 함: the panel closes and the item is not kept (no draft)', await ev(i => !S.panel && !ITEMS.some(x => x.id === i), id4) && /저장하지 않았습니다/.test(await toastText()), await toastText());
  const id5 = await newAction('초안 시험 ' + sfx); await a.click('#panel-pin .ititle'); await kb.press('End'); await kb.type(' 더'); await sleep(150);
  await ev(() => go('main')); await sleep(300); const q2 = await dlg();
  check('moving to another page asks too', !!q2 && await ev(() => S.page === 'project'), q2);
  await a.click('#dlg [data-lv="save"]'); await sleep(600);
  check('초안으로 저장: saved as a draft, then the move goes on', await ev(i => S.page === 'main' && (item(i) || {}).status === 'draft', id5) && /초안으로 저장했습니다/.test(await toastText()), await toastText());
  await goP();
  // an existing item
  await ev(i => openPanel(i), id2); await sleep(400); await a.click('#panel-pin [data-ed="edit"]'); await sleep(500); await a.click('#panel-pin .ProseMirror'); await kb.type('버릴 문장'); await sleep(150);
  await ev(i => openPanel(i), id3); await sleep(300); const q3 = await dlg();
  check('an item being edited: opening another one asks, with 저장', q3 && q3.btns.join() === '계속 작성,저장 안 함,저장' && await ev(i => S.panel === i, id2), q3);
  await a.click('#dlg [data-lv="drop"]'); await sleep(600);
  check('저장 안 함: it goes back to what it was, the lock is released, the other item opens', await ev(([i, o]) => S.panel === o && !item(i).editing && !/버릴 문장/.test(item(i).body || '') && !lockMine('item:' + i), [id2, id3]));
  await ev(i => openPanel(i), id2); await sleep(400); await a.click('#panel-pin [data-ed="edit"]'); await sleep(500); await a.click('#panel-pin .ProseMirror'); await kb.type('남길 문장'); await sleep(150);
  await a.click('#panel-close'); await sleep(300); await a.click('#dlg [data-lv="save"]'); await sleep(600);
  check('저장: saved as the 저장 button saves, then closed', await ev(i => !S.panel && !item(i).editing && /남길 문장/.test(item(i).body || ''), id2));
  await ev(i => openPanel(i), id2); await sleep(400); await a.click('#panel-pin [data-ed="edit"]'); await sleep(500); await a.click('#panel-close'); await sleep(300);
  check('nothing changed: nothing is asked', await ev(() => !document.querySelector('#dlg') && !S.panel));
  // the project overview
  await a.click('[data-editproj]'); await sleep(600);
  const f0 = await ev(() => { const e = document.querySelector('#page-project .phead [data-k], #page-project .phead .editable'); return e ? e.textContent : null; });
  await a.click('#page-project .phead h1.editable, #page-project .phead h1[contenteditable]'); await kb.press('End'); await kb.type(' X'); await sleep(200);
  await ev(() => go('main')); await sleep(300); const q4 = await dlg();
  await a.click('#dlg [data-lv="drop"]').catch(() => { }); await sleep(700);
  check('a project overview being edited asks too; 저장 안 함 puts it back', !!q4 && await ev(() => S.page === 'main' && !S.editProj && !/ X$/.test(PROJECTS.pangyo.full)), { q4, f0 });
  await goP();

  console.log('— a menu\'s own button pressed again closes it');
  await ev(() => { SCHU.tab = 'gantt'; schRefresh(); }); await sleep(300);
  const sf = '#sch-actions .sch-filters .sf[data-k="phase"]';
  await a.click(sf); await sleep(250); const t1 = await ev(() => !!document.querySelector('.pop'));
  await a.click(sf); await sleep(250); const t2 = await ev(() => !!document.querySelector('.pop'));
  await a.click(sf); await sleep(250); const t3 = await ev(() => !!document.querySelector('.pop')); await ev(() => closePop());
  check('a filter opens, closes when pressed again, opens the third time', t1 && !t2 && t3, { t1, t2, t3 });
  await ev(() => { SCHU.tab = 'list'; schRefresh(); }); await sleep(300);
  const th = '#sch-actions .tbl.sch-list .hd [data-k="st"]';
  await a.click(th); await sleep(250); const h1 = await ev(() => !!document.querySelector('.pop')); await a.click(th); await sleep(250); const h2 = await ev(() => !!document.querySelector('.pop'));
  check('a column title of the list does the same', h1 && !h2, { h1, h2 });
  await a.click(th); await sleep(250); await a.click('#sch-actions .tbl.sch-list .hd [data-k="pri"]'); await sleep(250);
  check('pressing another button opens that one\'s menu', await ev(() => { const p = document.querySelector('.pop'); return !!p && /높음/.test(p.textContent); })); await ev(() => closePop());

  console.log('— a record a member added: its title; an uploaded workbook: out again');
  await ev(() => { schSet('pangyo', 'e:u:t' + Date.now().toString(36).slice(-5), { kind: 'commitmentReviews', title: '제목 시험', status: '확인 필요', by: sharedUser, at: new Date().toISOString() }); }); await sleep(300);
  const eid = await ev(() => Object.keys(SCHED.pangyo).find(k => k.startsWith('e:u:') && SCHED.pangyo[k].title === '제목 시험'));
  await ev(k => openPanel('se-pangyo-u-' + k.slice(4)), eid); await sleep(500);
  await a.click('#panel-pin [data-schx="u:title"]'); await sleep(250); await ask('고친 제목 ' + sfx);
  check('the title of a record a member added can be changed', await ev(([k, s]) => SCHED.pangyo[k].title === '고친 제목 ' + s && document.querySelector('#panel-pin .ititle').textContent === '고친 제목 ' + s, [eid, sfx]));
  await ev(k => { closePanel(true); schSet('pangyo', k, null); }, eid); await sleep(300);
  // a workbook put into a new project, then taken out
  await ev(() => go('main')); await sleep(400); await a.click('.new-proj'); await sleep(400); await a.fill('#np2-name', '빼기 시험 ' + sfx); await a.click('[data-np2="ok"]'); await sleep(900);
  if (await a.$('[data-editproj].on')) { await a.click('[data-editproj]'); await sleep(900); }
  const pid = await ev(() => S.proj);
  const TH = ['WBS', '개발단계', '업무패키지', '시작일', '완료일', '기간 Day', '선행 WBS·유형', '승인 역할', '실행 역할', '협의 역할', '완료기준·조건', '주 담당', '부 담당', '진척률', '상태'];
  const buf = Buffer.from(await ev(async h => { const X = await schXlsx(), u = new Uint8Array(await X.makeBook([{ name: '단계별업무분장', rows: [['제목'], ['시험'], [], h, ['W1.1', '1 기획', '기획 정리', '2027-01-04', '2027-01-15'], ['W1.2', '1 기획', '검토', '2027-01-18', '2027-01-29']] }])); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); }, TH), 'base64');
  await a.click('.page.on [data-sch="upload"][data-k="act"]'); await sleep(350);
  await a.setInputFiles('#dlg.sch-up input[data-slot="act"]', [{ name: '빼기.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf }]);
  await a.waitForSelector('#dlg.sch-up .up-res', { timeout: 30000 }); await sleep(200); await a.click('#dlg [data-up="ok"]'); await a.waitForFunction(() => !document.querySelector('#dlg'), null, { timeout: 20000 }); await sleep(500);
  const o1 = await ev(p => schModel(p).plan.tasks.length, pid);
  await a.click('.page.on [data-sch="upload"][data-k="act"]'); await sleep(350); const out = await ev(() => (document.querySelector('#dlg.sch-up [data-up="out"]') || {}).textContent || '');
  await a.click('#dlg.sch-up [data-up="out"]'); await sleep(300); const oq = await ev(() => (document.querySelector('#dlg .m') || {}).textContent || ''); await a.click('#dlg button.pri'); await sleep(600);
  const o2 = await ev(p => ({ n: schModel(p).plan.tasks.length, src: (SCHED[p] || {}).src || null }), pid);
  check('the upload window offers "올린 엑셀 빼기"; after a question the project is back to its plan before the upload', o1 === 2 && out === '올린 엑셀 빼기' && /빈 일정으로 돌아갈까요/.test(oq) && o2.n === 0 && !o2.src, { o1, out, oq, o2 });
  await ev(() => schUndo()); await sleep(500);
  check('…and 되돌리기 puts the workbook back', await ev(p => schModel(p).plan.tasks.length === 2 && !!(SCHED[p] || {}).src, pid));

  console.log('— without the preview');
  const C = await newUser(browser, 'RYC' + sfx, '열셋 삼', { url: V1 }), c = C.page;
  const cid = await c.evaluate(t => { const it = newItem('action'); openPanel(it.id); return it.id; }, 0); await sleep(400);
  await c.click('#panel-pin .ititle'); await c.keyboard.type('미리보기 없이 ' + sfx); await sleep(150); await c.click('#panel-close'); await sleep(400);
  check('an action that became a task is still listed as an action there (the item of a task of the workbook is not)', await c.evaluate(i => { const it = ITEMS.find(x => x.id === i); return !!it && it.own && isLive(it) && !isLive({ ...it, id: 'wt-' + it.task }); }, id1));
  check('leaving still saves without a question (a draft)', await c.evaluate(i => !document.querySelector('#dlg') && !S.panel && (ITEMS.find(x => x.id === i) || {}).status === 'draft', cid));
  await c.evaluate(async i => { const it = ITEMS.find(x => x.id === i); if (it) await trashItem(it); }, cid); await sleep(300);

  // clean up: the tasks and items of this run, the test project
  await ev(async ([ids, p]) => { const A = AIDCSchedule, tids = ids.map(i => ITEMS.find(x => x.id === i)).filter(x => x && x.own && x.task && schModel('pangyo').byId.has(x.task)).map(x => x.task);   // only the tasks this run's own actions became
    if (tids.length) schCommit('pangyo', d => A.removeTasks(d, tids), '', true);
    for (const i of ids) { const it = ITEMS.find(x => x.id === i); if (it) { delete it.own; delete it.task; await trashItem(it); } }
    for (const k of Object.keys(SCHED.pangyo || {})) if (k.startsWith('ph:')) delete SCHED.pangyo[k]; SCH.memo.pangyo = null;
    if (PROJECTS[p]) trashProject(p); }, [made, pid]);
  await ev(() => sharedFlush(true)); await sleep(1200);
  check('(clean) the plan of 판교 has its tasks back as they were', await ev(n => { go('project:pangyo'); return schModel('pangyo').plan.tasks.length === n; }, n0));
  const errs = [...A.errs, ...B.errs, ...C.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
