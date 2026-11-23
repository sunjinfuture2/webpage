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

  console.log('— a phase can be renamed and removed');
  const pm = await ev(() => { const r = document.querySelector('#sch-gantt .sg-left .sg-row.ph[data-k="W1"]'), p = r.querySelector('.pm'); return { has: !!p, hidden: getComputedStyle(p).display === 'none', title: p.title }; });
  await rowMenu('W1'); const m1 = await pops();
  check('a phase row of the gantt has a "⋮" beside its + (shown with it), with 이름 바꾸기; a phase that holds tasks offers no 삭제', pm.has && pm.hidden && /이름 바꾸기/.test(pm.title) && m1.length === 1 && /“1\) 사업정의·RFP” 이름 바꾸기/.test(m1[0]), { pm, m1 });
  await a.click('.pop .it:has-text("이름 바꾸기")'); await sleep(250);
  check('the window asks with the name as it is (without the number)', await ev(() => document.querySelector('#ask-in').value === '사업정의·RFP'));
  await ask('사업정의 ' + sfx);
  const r1 = await ev(() => ({ row: document.querySelector('#sch-gantt .sg-left .sg-row.ph[data-k="W1"] .tt').textContent, rec: (SCHED.pangyo['ph:W1'] || {}).label, toast: (document.querySelector('#toast') || {}).textContent }));
  check('renamed: the gantt row carries the new name at once, with 되돌리기', r1.row === '1) 사업정의 ' + sfx && r1.rec === '사업정의 ' + sfx && /되돌리기/.test(r1.toast), r1);
  await ev(() => { SCHU.tab = 'list'; SCHU.sort = 'wbs'; SCHU.dir = 1; SCHU.page = 1; schRefresh(); }); await sleep(400);
  const g1 = await ev(() => [...document.querySelectorAll('#sch-actions .tbl.sch-list .gr')].map(g => [...g.children].map(c => c.textContent).join('|')));
  check('the list in WBS order names each phase above its rows, with how many it holds', g1.length >= 1 && g1[0].startsWith('1) 사업정의 ' + sfx + '|') && +g1[0].split('|')[1] >= 15, g1);
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
  const p1 = await ev(c => ({ row: (document.querySelector(`#sch-gantt .sg-left .sg-row.ph[data-k="${c}"] .tt`) || {}).textContent, auto: (document.querySelector('#panel-pin .wbno.auto') || {}).textContent, sub: document.querySelector('#panel-pin [data-schp="link-task"]').textContent.trim(), free: !ITEMS.some(i => i.proj === 'pangyo' && i.phase === c && i.status !== 'new') }), code);
  check('a phase made while an action is being written stands in the gantt at once', p1.row === `${no}) 시험 단계 ${sfx}`, p1);
  check('the action shows the WBS number it will get, and the second picker says what it is for', p1.auto === `${no}-1)` && p1.sub === '업무 아래에 붙이기', p1);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); const m3 = await pops();
  check('the picker offers to rename and to remove the phase that is chosen (it holds no task yet)', m3.some(x => x === `“${no}) 시험 단계 ${sfx}” 이름 바꾸기`) && m3.some(x => x === `“${no}) 시험 단계 ${sfx}” 단계 삭제`), m3);
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
  const l1 = await ev(s => { const rows = [...document.querySelectorAll('#sch-actions .tbl.sch-list > *')], i = rows.findIndex(r => r.classList.contains('rw') && r.textContent.includes('단계 액션 ' + s)); return { w: i >= 0 ? rows[i].querySelector('.w').textContent : '', grp: i > 0 && rows[i - 1].classList.contains('gr') ? rows[i - 1].textContent : '' }; }, sfx);
  check('…in the list under its phase, with its number', l1.w === `${no}-1` && l1.grp.startsWith(`${no}) 고친 단계 ${sfx}`), l1);
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
  check('its phase now holds a task: 삭제 is no longer offered', m4.length >= 1 && !m4.some(x => /단계 삭제/.test(x)), m4);

  console.log('— undo and redo of that step');
  await ev(() => schUndo()); await sleep(500);
  const u1 = await ev(i => { const it = item(i), m = schModel('pangyo'); return { own: !!it.own, task: it.task || '', n: m.plan.tasks.length, phase: it.phase, listed: schUnlinked('pangyo').some(x => x.id === i) }; }, id1);
  check('undone: the task is gone and the action is an ordinary action of its phase again', !u1.own && !u1.task && u1.n === n0 && u1.phase === code && u1.listed, u1);
  await ev(() => schRedo()); await sleep(500);
  const u2 = await ev(([i, t]) => { const it = item(i), m = schModel('pangyo'); return { own: !!it.own, task: it.task, has: m.byId.has(t), n: m.plan.tasks.length }; }, [id1, c1.task]);
  check('redone: it is the task\'s own item again', u2.own && u2.task === c1.task && u2.has && u2.n === n0 + 1, u2);

  console.log('— what does not become a task');
  const id2 = await newAction('붙인 액션 ' + sfx); await pickPhase('1) 사업정의·RFP');
  await a.click('#panel-pin [data-schp="link-task"]'); await sleep(300); await a.click('.sch-tm .it >> nth=0'); await sleep(400);
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
  check('actions of no phase stand under "일정 미연결"', await ev(() => [...document.querySelectorAll('#sch-actions .tbl.sch-list .gr')].some(g => g.textContent.startsWith('일정 미연결'))));

  console.log('— removing a phase');
  await gantt();
  const id4 = await newAction('버릴 액션 ' + sfx);
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.click('.pop .it:has-text("새 단계 추가")'); await sleep(300); await ask('버릴 단계 ' + sfx);
  const code2 = await ev(i => item(i).phase, id4);
  check('a new phase does not take a number that is in use', code2 !== code && +code2.slice(1) > +code.slice(1), { code, code2 });
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.click('.pop .it:has-text("단계 삭제")'); await sleep(300);
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
  await a.click('[data-schup]'); await sleep(350);
  await a.setInputFiles('#dlg.sch-up input[type=file]', [{ name: '빼기.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf }]);
  await a.waitForSelector('#dlg.sch-up .up-res', { timeout: 30000 }); await sleep(200); await a.click('#dlg [data-up="ok"]'); await a.waitForFunction(() => !document.querySelector('#dlg'), null, { timeout: 20000 }); await sleep(500);
  const o1 = await ev(p => schModel(p).plan.tasks.length, pid);
  await a.click('[data-schup]'); await sleep(350); const out = await ev(() => (document.querySelector('#dlg.sch-up [data-up="out"]') || {}).textContent || '');
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
