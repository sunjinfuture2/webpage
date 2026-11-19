// WorkSpace x Schedule (preview), fourth part (owner's fourth round, 2026-11-19): gates that fit a screen, one height for the three
// views of 액션, column menus of the list, the relation map's tools, pulling cards onto each other, the item panel (edit only after
// 수정, 취소 takes the changes back, project tag, phases, milestone, reference material, trash). Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'R4A', '보람 일', { url: 'http://127.0.0.1:8787/?v=2' }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const goP = async () => { await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(700); };
  await goP();
  await ev(async () => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; Object.assign(SCHU, { scn: '', q: '', phase: '', scope: 'all', scale: 'fit', open: [], tab: 'gantt', sel: '', cf: {}, who: '', sort: 'wbs', dir: 1, page: 1, per: 20, sec: 'gate', netZoom: 1, netFit: false }); SCHP.tab = 'info'; SCHP.more = false;
    for (const it of ITEMS.filter(x => /^4차 검사 /.test(x.title || ''))) await trashItem(it); render(true); }); await sleep(1500);

  console.log('— gates and procurement');
  const g0 = await ev(() => { const box = document.querySelector('.sch-gates'), gt = box.querySelector('.gt'), code = gt.querySelector('.cat small'), cat = gt.querySelector('.cat'), cs = getComputedStyle(code), cc = getComputedStyle(cat); return { h: box.clientHeight, more: box.scrollHeight > box.clientHeight + 40, oy: getComputedStyle(box).overflowY, fs: cs.fontSize === cc.fontSize, fw: +cs.fontWeight - +cc.fontWeight, n: box.querySelectorAll('.gt').length, black: box.querySelectorAll('.gt.to-ok, .ln0.ok').length }; });
  check('승인게이트 fits one screen and scrolls for the rest; the code (G1) is as large as the title and one step bolder', g0.h <= 600 && g0.more && g0.oy === 'auto' && g0.fs && g0.fw === 100 && g0.n === 8 && g0.black === 0, g0);
  await ev(() => { schSet('pangyo', 'g:G2', { status: '승인', by: sharedUser, at: new Date().toISOString() }, ''); }); await sleep(500);
  const g1 = await ev(() => { const gts = [...document.querySelectorAll('.sch-gates .gt')], col = e => getComputedStyle(e).backgroundColor; return { into: col(gts[0].querySelector('.ln')), after: col(gts[1].querySelector('.ln')), dot: col(gts[1].querySelector('.dot')), first: col(gts[0].querySelector('.ln0')), g1dot: col(gts[0].querySelector('.dot')) }; });
  check('an approved gate: the line is black only from the gate before it up to its own dot, not beyond', g1.into === 'rgb(15, 15, 15)' && g1.dot === 'rgb(15, 15, 15)' && g1.after !== 'rgb(15, 15, 15)' && g1.first !== 'rgb(15, 15, 15)' && g1.g1dot !== 'rgb(15, 15, 15)', g1);
  await ev(() => { schUndo(); SCHU.sec = 'proc'; schLowerRefresh(); }); await sleep(500);
  check('the sentence above the procurement table is gone', await ev(() => !/납기와 PO 지연/.test(document.querySelector('#sch-lower').textContent) && document.querySelectorAll('#sch-lower .tbl .rw').length > 5));

  console.log('— 액션: one height for the three views');
  const hOf = async tab => { await ev(t => { SCHU.tab = t; SCHU.open = ['W1', 'W2', 'W3']; SCHU.netMode = 'all'; schRefresh(); }, tab); await sleep(600); return ev(t => { const el = document.querySelector(t === 'gantt' ? '#sch-gantt .sg-scroll' : t === 'list' ? '#sch-actions .tbl.sch-list' : '#sch-net'); return { h: el.clientHeight, over: (t === 'net' ? document.querySelector('#sch-net .sn-scroll') : el).scrollHeight > el.clientHeight + 30 }; }, tab); };
  const hg = await hOf('gantt'), hl = await hOf('list'), hn = await hOf('net');
  check('일정, 리스트 and 관계도 are equally tall (a height one screen shows) and scroll inside', hg.h <= 600 && hg.h >= 560 && Math.abs(hl.h - hg.h) <= 2 && Math.abs(hn.h - hg.h) <= 2 && hg.over && hl.over && hn.over, { hg, hl, hn });

  console.log('— relation map');
  await ev(() => { SCHU.netMode = 'focus'; SCHU.netDepth = 1; SCHU.netDir = 'both'; SCHU.netZoom = 1; SCHU.netFit = false; SCHU.sel = schModel('pangyo').byWbs.get('W2.5').id; schRefresh(); }); await sleep(600);
  const n0 = await ev(() => { const net = document.querySelector('#sch-net'), fit = net.querySelector('.sn-fit'), r = fit.getBoundingClientRect(), b = net.getBoundingClientRect(), cv = net.querySelector('.sn-canvas'); return { zoomBtns: net.querySelectorAll('[data-sch="netzoom"]').length, left: r.left - b.left, top: r.top - b.top, dots: cv.style.backgroundSize, netBg: getComputedStyle(net).backgroundImage }; });
  check('no + / − buttons; the fit pictogram stands at the upper left; the dots belong to the drawing', n0.zoomBtns === 0 && n0.left < 40 && n0.top < 40 && n0.dots === '30px 28.5px' && n0.netBg === 'none', n0);
  await a.hover('#sch-net .sn-canvas'); await a.keyboard.down('Control'); await a.mouse.wheel(0, 300); await a.keyboard.up('Control'); await sleep(500);
  const n1 = await ev(() => ({ z: SCHU.netZoom, dots: document.querySelector('#sch-net .sn-canvas').style.backgroundSize }));
  check('Ctrl + wheel makes the map smaller and the dots shrink with it', n1.z < 1 && Math.abs(parseFloat(n1.dots) - 30 * n1.z) < 0.01 && Math.abs(parseFloat(n1.dots.split(' ')[1]) - 28.5 * n1.z) < 0.01, n1);
  await ev(() => { SCHU.netZoom = 1; schNetBuild('pangyo'); }); await sleep(300);
  const card = a.locator('#sch-net .sn-node:not(.sel)').first(); await card.hover(); await sleep(250);
  const hov = await ev(() => { const g = [...document.querySelectorAll('#sch-net .sn-links g.hov')]; return { n: g.length, w: g.length ? getComputedStyle(g[0].querySelector('path')).strokeWidth : '', other: document.querySelectorAll('#sch-net .sn-links g:not(.hov)').length }; });
  check('the pointer on a card makes that card\'s lines thicker and darker', hov.n >= 1 && parseFloat(hov.w) >= 1.4 && hov.other >= 1, hov);
  check('a card without an assignee says 미지정 and nothing else', await ev(() => [...document.querySelectorAll('#sch-net .sn-node .who')].every(w => w.textContent.trim() === '미지정')));
  // pulling a card onto another
  const pull = await ev(() => { const m = schModel('pangyo'), cards = [...document.querySelectorAll('#sch-net .sn-node')], pre = m.pred.get(SCHU.sel).map(e => e.from), suc = m.succ.get(SCHU.sel).map(e => e.to), from = cards.find(c => pre.includes(c.dataset.k)), to = cards.find(c => suc.includes(c.dataset.k) && !m.plan.dependencies.some(e => e.from === from.dataset.k && e.to === c.dataset.k)), r = e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }; return { a: r(from), b: r(to), from: from.dataset.k, to: to.dataset.k }; });
  await a.mouse.move(pull.a.x, pull.a.y); await a.mouse.down(); await a.mouse.move(pull.a.x + 20, pull.a.y + 12, { steps: 3 }); await a.mouse.move(pull.b.x, pull.b.y, { steps: 6 }); await sleep(150);
  const tip = await ev(() => (document.querySelector('.sg-tip') || {}).textContent || ''); await a.mouse.up(); await sleep(500);
  const pd = await ev(p => { const d = document.querySelector('.sch-dlg'), m = schModel('pangyo'); return d ? { title: d.querySelector('.pp-hd b').textContent, stored: m.plan.dependencies.some(e => e.from === p.from && e.to === p.to), chart: d.querySelectorAll('.pp-chart .lb').length, ok: !d.querySelector('[data-pp="ok"]').disabled, panel: S.panel } : null; }, pull);
  check('pulling a card onto another shows the same window (what is connected, what changes) before anything is stored', /놓으면/.test(tip) && pd && pd.title === '관계 연결' && !pd.stored && pd.chart >= 2 && !pd.panel, { tip, pd });
  if (pd && pd.ok) { await a.click('.sch-dlg [data-pp="ty"][data-k="SS"]'); await sleep(300); await a.click('.sch-dlg [data-pp="ok"]'); await sleep(700);
    check('the kind can still be changed there; 확인 saves it', await ev(p => schModel('pangyo').plan.dependencies.some(e => e.from === p.from && e.to === p.to && e.type === 'SS') && /되돌리기/.test(document.querySelector('#toast').innerHTML + document.querySelector('#toast').textContent), pull));
    await ev(() => schUndo()); await sleep(500); }
  else { await a.click('.sch-dlg [data-pp="x"]'); check('the kind can still be changed there; 확인 saves it', false, 'the proposed relation was not possible'); }
  check('…and it can be taken back', await ev(p => !schModel('pangyo').plan.dependencies.some(e => e.from === p.from && e.to === p.to), pull));

  console.log('— list: column menus, 미지정, alignment');
  await ev(() => { SCHU.tab = 'list'; SCHU.sel = ''; schRefresh(); }); await sleep(500);
  const al = await ev(() => { const tbl = document.querySelector('#sch-actions .tbl.sch-list'), hd = [...tbl.querySelectorAll('.hd span')].find(x => x.dataset.k === 'name'), rows = [...tbl.querySelectorAll('.rw')], x = e => Math.round(e.getBoundingClientRect().left * 10) / 10, ms = rows.find(r => r.querySelector('.sch-ms')), no = rows.find(r => !r.querySelector('.sch-ms'));
    const hx = (() => { const r = document.createRange(); r.selectNodeContents(hd); return Math.round([...r.getClientRects()][0].left * 10) / 10; })();
    return { head: hx, ms: x(ms.querySelector('.tx')), no: x(no.querySelector('.tx')), mark: x(ms.querySelector('.sch-ms')), who: [...new Set(rows.map(r => r.querySelector('.who').textContent.trim()))], dd: getComputedStyle(tbl.querySelector('.sch-dd')).fontWeight, pri: getComputedStyle(tbl.querySelector('.pri')).opacity }; });
  check('a name starts where the column title starts, with or without the mark of a milestone (the mark hangs to the left)', Math.abs(al.ms - al.no) < 0.2 && Math.abs(al.no - al.head) < 1.2 && al.mark < al.ms - 8, al);
  check('where nobody is assigned the list says 미지정 only; D-day is one step lighter; importance is drawn in full colour', al.who.join() === '미지정' && al.dd === '500' && al.pri === '1', al);
  await a.click('#sch-actions .tbl.sch-list .hd [data-k="who"]'); await sleep(250);
  const wm = await ev(() => [...document.querySelectorAll('.pop .it, .pop .hd')].map(e => e.textContent.trim()));
  check('a click on 담당자 offers the order and whom to keep (members, 미지정)', wm.includes('정렬') && wm.includes('이름 순') && wm.includes('담당자') && wm.includes('전체 담당자') && wm.includes('미지정'), wm);
  await ev(() => closePop());
  await ev(() => { const m = schModel('pangyo'); schCommit('pangyo', p => { p.tasks.find(t => t.wbs === 'W1.3').people = [sharedUser]; p.tasks.find(t => t.wbs === 'W3.2').people = [sharedUser]; }, ''); }); await sleep(500);
  await a.click('#sch-actions .tbl.sch-list .hd [data-k="who"]'); await sleep(250); await a.click('.pop .it:has-text("보람 일")'); await sleep(500);
  const f1 = await ev(() => ({ rows: [...document.querySelectorAll('#sch-actions .tbl.sch-list .rw .w')].map(e => e.textContent), flt: document.querySelector('#sch-actions .tbl.sch-list .hd [data-k="who"]').classList.contains('flt'), clear: [...document.querySelectorAll('#sch-actions .sch-chips .sch-chip')].map(e => e.textContent.replace(' ✕', '')).join('|') }));
  check('choosing a member keeps that member\'s actions; the condition shows beside the section title with an x', f1.rows.join() === '1-3,3-2' && f1.flt && f1.clear === '담당자: 보람 일', f1);
  await a.click('#sch-actions .tbl.sch-list .hd [data-k="st"]'); await sleep(250);
  const sm = await ev(() => [...document.querySelectorAll('.pop .it')].filter(e => e.querySelector('.sch-st use')).map(e => e.textContent.trim()));
  check('the menu of 상태 shows the statuses with their marks and colours', sm.join() === '계획,확인 전,진행,완료,보류,조건부 미발동', sm);
  await a.click('.pop .it:has-text("확인 전")'); await sleep(400);
  check('two conditions work together', await ev(() => { const m = schModel('pangyo'), want = ['W1.3', 'W3.2'].filter(w => schStatus(m.byWbs.get(w)) === '확인 전').map(schWbs).join(); return want.length > 0 && [...document.querySelectorAll('#sch-actions .tbl.sch-list .rw .w')].map(e => e.textContent).join() === want; }));
  check('each condition has its own tag there', await ev(() => [...document.querySelectorAll('#sch-actions .sch-chips .sch-chip')].map(e => e.textContent.replace(' ✕', '')).join('|') === '담당자: 보람 일|상태: 확인 전'));
  await a.click('#sch-actions .sch-chips .sch-chip >> nth=1'); await sleep(400); await a.click('#sch-actions .sch-chips .sch-chip >> nth=0'); await sleep(400);
  check('the x of a tag takes that condition off; without tags everything shows again', await ev(() => document.querySelectorAll('#sch-actions .tbl.sch-list .rw').length === 20 && !SCHU.who && !Object.keys(SCHU.cf).length && !document.querySelector('#sch-actions .sch-chips .sch-chip')));
  await a.click('#sch-actions .tbl.sch-list .hd [data-k="due"]'); await sleep(250); await a.click('.pop .it:has-text("먼 순")'); await sleep(400);
  check('…and the same menu orders the list', await ev(() => { const m = schModel('pangyo'), ws = [...document.querySelectorAll('#sch-actions .tbl.sch-list .rw:not(.sub) .w')].map(e => e.textContent).filter(x => x !== '-').slice(0, 5), f = w => m.res.tasks[m.byWbs.get('W' + w.replace('-', '.')).id].finish; return ws.length === 5 && ws.every((w, i) => !i || f(ws[i - 1]) >= f(w)); }));
  await ev(() => { SCHU.sort = 'wbs'; SCHU.dir = 1; schUndo(); schRefresh(); }); await sleep(500);

  console.log('— a task\'s panel: only after 수정; 취소 takes back; 저장 keeps');
  const tid = await ev(() => { const t = schModel('pangyo').byWbs.get('W3.4'); SCHP.tab = 'info'; openPanel(schItemId(t.id)); return t.id; }); await sleep(600);
  const v0 = await ev(() => { const pin = document.querySelector('#panel-pin'), st = e => getComputedStyle(e); const ed = pin.querySelector('[data-ed="edit"]'); return { type: pin.querySelector('.itype').textContent.trim(), fields: pin.querySelectorAll('[data-schp="f"]').length, keys: [...pin.querySelectorAll('.sp-grid .k')].map(k => k.textContent), tabs: [...pin.querySelectorAll('.sp-tabs button')].map(b => b.textContent), small: st(pin.querySelector('.sp-tabs small')).fontSize === st(pin.querySelector('.sp-tabs button')).fontSize, trash: !!pin.querySelector('.trash[data-schp="del"]'), who: pin.querySelector('.sp-grid .rcol .pr .v').textContent.trim(), pill: !!pin.querySelector('.sp-grid .pill.nosq'), editBg: st(ed).backgroundColor }; });
  check('the panel is named 액션; rows: 사업명 (a plain tag), one date row, 개발 단계, 마일스톤, 참고 자료 …; the tab is 연결된 액션 with its number as large as the word', v0.type === '액션' && v0.keys.join() === '사업명,예상 기한,실제 기한,개발 단계,마일스톤,참고 자료,담당자,상태,중요도,URL' && /^연결된 액션\d*$/.test(v0.tabs[1]) && v0.small && v0.pill && v0.who === '미지정', v0);
  check('before 수정 nothing can be changed; the trash is back', v0.fields === 0 && v0.trash, v0);
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(1300);
  const e0 = await ev(() => { const pin = document.querySelector('#panel-pin'), st = e => getComputedStyle(e), sv = pin.querySelector('[data-ed="save"]'), f = pin.querySelector('[data-schp="f"][data-k="plannedStart"]'); return { saveBg: st(sv).backgroundColor, saveCol: st(sv).color, fields: pin.querySelectorAll('[data-schp="f"]').length, op: st(f).opacity, line: st(f).textDecorationLine }; });
  check('수정 turns the fields into pale, underlined ones; 저장 is a filled button (수정 was not)', parseInt(e0.saveBg.slice(4)) < 60 && e0.saveCol === 'rgb(255, 255, 255)' && v0.editBg !== e0.saveBg && parseInt(v0.editBg.replace(/rgba?\(/, '')) > 200 && e0.fields >= 7 && +e0.op < 0.7 && e0.line === 'underline', e0);
  await a.click('#panel-pin [data-schp="f"][data-k="pri"]'); await sleep(250);
  check('the menu of 중요도 is drawn in the colours of its values', await ev(() => [...document.querySelectorAll('.pop .it .pri')].map(e => e.className.trim()).join() === 'pri pri-high,pri pri-mid,pri pri-low'));
  await a.click('.pop .it:has-text("높음")'); await sleep(500);
  await a.click('#panel-pin [data-schp="f"][data-k="kind"]'); await sleep(250); await a.click('.pop .it:has-text("예")'); await sleep(500);
  const e1 = await ev(id => { const t = schModel('pangyo').byId.get(id); return { pri: t.pri, kind: t.kind, same: t.plannedStart === t.plannedFinish, gantt: !!document.querySelector(`.sg-msb[data-bar="${id}"]`) || SCHU.tab !== 'gantt' }; }, tid);
  check('while editing a change applies at once (importance, milestone: its dates become one day)', e1.pri === 'high' && e1.kind === 'milestone' && e1.same, e1);
  await a.click('#panel-pin [data-ed="cancel"]'); await sleep(800);
  const e2 = await ev(id => { const t = schModel('pangyo').byId.get(id); return { pri: t.pri || '', kind: t.kind, ov: Object.keys(SCHED.pangyo).filter(k => k.startsWith('t:')) }; }, tid);
  check('취소 takes back everything that edit changed', e2.pri === '' && e2.kind === 'task' && e2.ov.length === 0, e2);
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(1300);
  await a.click('#panel-pin [data-schp="phase-move"]'); await sleep(250);
  const pm = await ev(() => [...document.querySelectorAll('.pop .it')].map(e => e.textContent.trim()));
  await a.click('.pop .it:has-text("새 단계 추가")'); await sleep(300); await a.fill('#ask-in', '시운전 지원 ' + sfx); await a.keyboard.press('Enter'); await sleep(800);
  const ph = await ev(id => { const m = schModel('pangyo'), t = m.byId.get(id), g = m.phases.find(x => x.code === t.phase); return { phase: t.phase, wbs: t.wbs, label: g && schPhaseLabel(g), phases: m.phases.length, row: document.querySelector('#panel-pin .sch-stage').textContent.trim() }; }, tid);
  check('개발 단계: the task can be moved to another phase, also to a new one made on the spot', pm.some(x => /^1\) /.test(x)) && pm.some(x => /새 단계 추가/.test(x)) && ph.phase === 'W9' && ph.wbs === 'W9.1' && ph.label === '9) 시운전 지원 ' + sfx && ph.phases === 9 && /9-1\)/.test(ph.row), { pm, ph });
  await a.click('#panel-pin [data-schp="addref"]'); await sleep(300);
  const rf = await ev(() => { const p = document.querySelector('.pop'); return { first: p.firstElementChild.querySelector('input') ? 'search' : p.firstElementChild.className, text: p.textContent, n: p.querySelectorAll('.it[data-r]').length }; });
  check('참고 자료 is on the 정보 tab; its picker starts with a search field and no longer says “일정에는 영향 없음”', rf.first === 'search' && !/영향 없음/.test(rf.text) && rf.n > 0, rf);
  await a.click('.pop .it[data-r] >> nth=0'); await sleep(500);
  await a.click('#panel-pin [data-ed="save"]'); await sleep(1300);
  const sv = await ev(id => { const m = schModel('pangyo'), t = m.byId.get(id); return { phase: t.phase, refs: ((SCHED.pangyo['c:' + id] || {}).ids || []).length, chip: document.querySelectorAll('#panel-pin .sl-refs .sl-ref').length, editing: !!(item(S.panel) || {}).editing, tags: SCH.undo.filter(u => u.tag).length }; }, tid);
  check('저장 keeps what was changed', sv.phase === 'W9' && sv.refs === 1 && sv.chip === 1 && !sv.editing && sv.tags === 0, sv);
  await ev(() => { SCHU.tab = 'gantt'; SCHU.open = ['W9']; SCHU.scale = 'fit'; schRefresh(); }); await sleep(500);
  check('the new phase is a phase of the chart like the others', await ev(() => { const r = [...document.querySelectorAll('#sch-gantt .sg-row.ph')].pop(); return /^9\) 시운전 지원/.test(r.querySelector('.tt').textContent) && document.querySelectorAll('#sch-gantt .sg-row.tk').length === 1; }));
  await a.click('#panel-pin .trash[data-schp="del"]'); await sleep(300); await a.click('#dlg button.pri'); await sleep(800);
  check('the trash of a task\'s panel deletes the task (after asking) and the toast can bring it back', await ev(id => !schModel('pangyo').byId.has(id) && !S.panel && /되돌리기/.test(document.querySelector('#toast').textContent), tid));
  await a.click('#toast button'); await sleep(700);
  check('…brought back', await ev(id => schModel('pangyo').byId.has(id), tid));

  console.log('— an ordinary action');
  const iid = await ev(t => { const it = newItem('action', { title: t, proj: 'pangyo' }); openPanel(it.id); return it.id; }, '4차 검사 액션 ' + sfx); await sleep(700);
  const i0 = await ev(() => { const pin = document.querySelector('#panel-pin'), pk = pin.querySelector('.proj-pick'); return { tag: !!pk && !!pk.querySelector('.pill.nosq[data-pick="proj"]'), x: !!pk && !!pk.querySelector('[data-pick="proj-x"]'), sq: pk ? getComputedStyle(pk.querySelector('.sq')).display : '', ph: pin.querySelector('.ititle').dataset.ph }; });
  check('사업명 while editing: the tag itself (no pictogram) with an x beside it', i0.tag && i0.x && i0.sq === 'none' && i0.ph === '새 액션', i0);
  await a.click('#panel-pin [data-pick="proj"]'); await sleep(250);
  const pmn = await ev(() => [...document.querySelectorAll('.pop .it')].map(e => !!e.querySelector('.pill.nosq')));
  await a.click('.pop .it >> nth=1'); await sleep(400);
  const i1 = await ev(i => item(i).proj, iid);
  check('a click on the tag lists the projects as tags and changes the project', pmn.length >= 3 && pmn.every(Boolean) && i1 !== 'pangyo' && !!i1, { pmn, i1 });
  await a.click('#panel-pin [data-pick="proj-x"]'); await sleep(400);
  check('the x takes the project off', await ev(i => item(i).proj === '' && !document.querySelector('#panel-pin [data-pick="proj-x"]'), iid));
  await ev(i => { item(i).proj = 'pangyo'; rerenderItem(i); }, iid); await sleep(400);
  await a.click('#panel-pin [data-pick="st"]'); await sleep(250);
  check('its status menu carries the same marks', await ev(() => [...document.querySelectorAll('.pop .it .sch-st use')].map(u => u.getAttribute('href')).join() === '#i-st-prog,#i-st-done'));
  await ev(() => closePop());
  await a.click('#panel-pin [data-schp="link-phase"]'); await sleep(250); await a.click('.pop .it:has-text("9) 시운전 지원")'); await sleep(400);
  await a.click('#panel-pin [data-ed="publish"]'); await sleep(1300); await ev(() => closePanel(true)); await sleep(300);
  await ev(() => { SCHU.tab = 'list'; SCHU.phase = 'W9'; schRefresh(); }); await sleep(500);
  const l9 = await ev(s => [...document.querySelectorAll('#sch-actions .tbl.sch-list .rw')].map(r => r.querySelector('.w').textContent + '|' + (r.textContent.includes(s) ? 'mine' : '')), sfx);
  check('an action put into a phase without a task is listed with that phase, after its tasks', l9.length === 2 && l9[0] === '9-1|' && l9[1] === '9|mine', l9);
  await ev(() => { SCHU.phase = 'none'; schRefresh(); }); await sleep(400);
  check('…and is not among 일정 미연결', await ev(s => ![...document.querySelectorAll('#sch-actions .tbl.sch-list .rw')].some(r => r.textContent.includes(s)), sfx));

  console.log('— without the preview the page is as before');
  const C = await newUser(browser, 'R4C', '새봄 삼', { url: 'http://127.0.0.1:8787/?v=1' }), c = C.page;
  await c.evaluate(() => go('project:pangyo')); await sleep(1200);
  const old = await c.evaluate(s => { const it = ITEMS.find(i => (i.title || '').includes(s)); openPanel(it.id); const pin = document.querySelector('#panel-pin'); return { type: pin.querySelector('.itype').textContent.trim(), sq: getComputedStyle(pin.querySelector('.pill .sq')).display, on: document.documentElement.classList.contains('sch-on'), who: TYPE_NAME.action, edit: getComputedStyle(pin.querySelector('[data-ed="edit"]')).backgroundColor }; }, sfx);
  check('a browser without the preview still says 액션아이템, keeps the pictogram in the project tag and its own buttons', old.type === '액션아이템' && old.sq !== 'none' && !old.on && old.who === '액션아이템', old);

  console.log('— cleaning up');
  await ev(async s => { for (const k of Object.keys(SCHED.pangyo || {})) delete SCHED.pangyo[k]; SCH.memo.pangyo = null; SCHU.phase = ''; SCHU.cf = {}; for (const it of ITEMS.filter(x => (x.title || '').includes(s))) await trashItem(it); render(true); }, sfx); await sleep(1800);
  check('no page errors', !A.errs.length && !C.errs.length, [...A.errs, ...C.errs].slice(0, 4));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
