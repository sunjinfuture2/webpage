// WorkSpace x Schedule (preview), eighth part (owner's third list of 2026-11-20): what is the same for everybody (download
// button, time until a meeting, where windows open, the share address, one line per project), every project with the schedule
// sections (a project made from nothing and its contents), one panel for actions, a meeting's lines as fields, the trail, export
// to Word / PDF and Excel, holidays, the gantt and the relation map, research and project pickers, the library.
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const zlib = require('zlib'); const fs = require('fs'); const os = require('os'); const path = require('path');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2';
// the files of a zip (stored or deflated), read from its central directory
function unzip(buf) { const out = {}; let p = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); const n = buf.readUInt16LE(p + 10); let q = buf.readUInt32LE(p + 16);
  for (let i = 0; i < n; i++) { const method = buf.readUInt16LE(q + 10), csize = buf.readUInt32LE(q + 20), nl = buf.readUInt16LE(q + 28), el = buf.readUInt16LE(q + 30), cl = buf.readUInt16LE(q + 32), off = buf.readUInt32LE(q + 42), name = buf.slice(q + 46, q + 46 + nl).toString('utf8');
    const lnl = buf.readUInt16LE(off + 26), lel = buf.readUInt16LE(off + 28), data = buf.slice(off + 30 + lnl + lel, off + 30 + lnl + lel + csize); out[name] = method === 0 ? data : zlib.inflateRawSync(data); q += 46 + nl + el + cl; }
  return out; }
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'R8A' + sfx, '여덟 일', { url: V2 }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const flush = () => a.evaluate(() => sharedFlush(true));
  const goP = async pid => { await ev(p => go('project:' + p), pid || 'pangyo'); await a.waitForFunction(p => schReady(p), pid || 'pangyo', { timeout: 15000 }); await sleep(700); };
  const save = async (sel, file) => { const [dl] = await Promise.all([a.waitForEvent('download', { timeout: 30000 }), typeof sel === 'string' ? a.click(sel) : sel()]); const f = path.join(os.tmpdir(), 'r8-' + sfx + '-' + file); await dl.saveAs(f); return { name: dl.suggestedFilename(), buf: fs.readFileSync(f) }; };

  console.log('— for everybody: files, meetings, windows, addresses');
  const ids = await ev(t => { const tm = new Date(Date.now() + 25 * 60000), hh = String(tm.getHours()).padStart(2, '0') + ':' + String(tm.getMinutes()).padStart(2, '0');
    const m = newItem('meeting', { title: t + ' 미팅', proj: 'pangyo', status: 'published', date: ymd(tm.getFullYear(), tm.getMonth() + 1, tm.getDate()), checks: [{ t: hh + ', 대회의실', pre: '12 min before' }, { t: '안건 하나' }, { t: '상대 둘' }] }), old = newItem('meeting', { title: t + ' 지난 미팅', proj: 'pangyo', status: 'published', date: '2026-01-05', checks: [{ t: '14시, 회의실', pre: '12 min before' }] });
    const r = newItem('research', { title: '[REF]\n' + t + ' 리서치 제목이 아주 길어서 좁은 칸에서는 여러 줄로 넘어가는 경우', proj: 'pangyo', status: 'published' }); m.research = [r.id]; render(true); return [m.id, old.id, r.id]; }, 'R8' + sfx);
  await flush(); await sleep(500);
  const f0 = await ev(([m, old, r]) => ({ a: hasFiles(item(r)), b: hasFiles({ file: true, body: '' }), c: hasFiles({ body: '<a href="/api/file/x">f</a>' }), card: !!document.querySelector(`#page-main .rcard[data-open="${r}"] [data-act="dl"]`), pre: meetPre(item(m)), preOld: meetPre(item(old)), preTxt: chkHtml(item(m)) }), ids);
  check('a download button only where a file is attached (not for the old "file" flag)', f0.a === false && f0.b === false && f0.c === true && f0.card === false, f0);
  check('the time until a meeting is worked out (25 minutes ahead reads so; a past one says nothing; the stored words are not used)', /^2[3-6] min before$/.test(f0.pre) && f0.preOld === '' && !/12 min before/.test(f0.preTxt), { pre: f0.pre, old: f0.preOld });
  await goP();
  await ev(([m]) => openPanel(m, true), ids); await sleep(500);
  const mcard = await ev(([m]) => { const c = document.querySelector(`.mcard[data-open="${m}"]`); return c ? { dl: !!c.querySelector('[data-act="dl"]'), lines: c.querySelectorAll('.chk li').length, pict: c.querySelectorAll('.chk li .bx .pict').length } : null; }, ids);
  check('meeting card: no download button without a file; three lines, each with its pictogram', !!mcard && mcard.dl === false && mcard.lines === 3 && mcard.pict === 3, mcard);
  // the trail: from the meeting into its research note and back
  await a.click(`#panel-pin [data-open="${ids[2]}"]`); await sleep(600);
  const t1 = await ev(() => { const t = document.querySelector('#panel-pin .itrail'), ty = document.querySelector('#panel-pin .itype'), hd = document.querySelector('#panel-pin .ihead'); return t ? { txt: t.textContent, trail: S.trail.slice(), between: t.getBoundingClientRect().top >= ty.getBoundingClientRect().bottom - 1 && t.getBoundingClientRect().bottom <= hd.getBoundingClientRect().top + 2, fs: getComputedStyle(t).fontSize === getComputedStyle(ty).fontSize && getComputedStyle(t).color === getComputedStyle(ty).color, crumbs: document.querySelector('#crumbs').textContent } : null; });
  check('trail: the panel one came from stands between the type and the 수정 row, in the type\'s size and colour', !!t1 && t1.trail.length === 1 && t1.trail[0] === ids[0] && /미팅/.test(t1.txt) && t1.between && t1.fs, t1);
  check('breadcrumb of a research note: no project in front, the whole title', !!t1 && !/판교/.test(t1.crumbs) && /\[REF\] R8/.test(t1.crumbs) && /리서치 제목이/.test(t1.crumbs), t1 && t1.crumbs);
  await a.click('#panel-pin .itrail [data-trail]'); await sleep(500);
  check('a step of the trail leads back and the trail ends there', await ev(([m]) => S.panel === m && !S.trail.length && !document.querySelector('#panel-pin .itrail'), ids));
  const rec = await ev(([m, old, r]) => { const rows = [...document.querySelectorAll('#sb-recent .item')].map(x => x.className.replace('item ', '') + ':' + x.textContent.trim()); const i = rows.findIndex(x => /^r0:리서치$/.test(x)); return { rows: rows.slice(0, 8), flat: i >= 0 && /r2 flat/.test(rows[i + 1]) && /\[REF\] R8.*리서치 제목이/.test(rows[i + 1]) }; }, ids);
  check('recent items: research is a group of its own, the whole title', rec.flat, rec.rows);
  // windows open where one is working
  await ev(() => closePanel(true)); await a.mouse.click(1500, 620); await sleep(100); await ev(() => askInput('시험', '', () => { })); await sleep(200);
  const ask = await ev(() => { const p = [...document.querySelectorAll('.pop')].find(x => x.querySelector('#ask-in')); const r = p.getBoundingClientRect(); p.remove(); return [Math.round(r.left), Math.round(r.top)]; });
  check('a small input window opens beside what was pressed (not where the text selection happens to be)', Math.abs(ask[0] - 1476) <= 30 && Math.abs(ask[1] - 632) <= 30, ask);
  await ev(() => openPop(document.createElement('i'), '<div class="hd">x</div>')); await sleep(100);
  const det = await ev(() => { const r = document.querySelector('.pop').getBoundingClientRect(); closePop(); return [Math.round(r.left), Math.round(r.top)]; });
  check('a menu whose anchor is gone opens where the pointer last went down, not in a corner', Math.abs(det[0] - 1500) <= 12 && Math.abs(det[1] - 624) <= 12, det);
  // toasts
  await ev(() => toast('시험 알림', 1800, [{ t: '되돌리기', fn: () => { } }, { t: '열기', go: true, fn: () => { window.__went = 1; } }])); await sleep(2600);
  const to = await ev(() => { const t = document.querySelector('#toast'); return { on: t.classList.contains('on'), x: !!t.querySelector('button.tx'), go: !!t.querySelector('button.go'), n: t.querySelectorAll('button').length }; });
  check('toast: still there after 2.6 s, with an x and a way there', to.on && to.x && to.go && to.n === 3, to);
  await a.click('#toast button.go'); await sleep(200); check('the way there runs and the toast goes', await ev(() => window.__went === 1 && !document.querySelector('#toast').classList.contains('on')));
  await ev(() => toast('남는 알림', 1800, { t: '되돌리기', fn: () => { }, keep: true })); await sleep(7600);
  check('a toast marked to stay is there until its x is pressed', await ev(() => document.querySelector('#toast').classList.contains('on'))); await a.click('#toast button.tx'); await sleep(200); check('the x closes it', await ev(() => !document.querySelector('#toast').classList.contains('on')));
  // share
  await ev(() => openLibrary('research')); await sleep(900);
  const sh = await ev(() => { const h = shareHash(); return { h, lib: /panel=lib%3Aresearch/.test(h) }; }); check('share: the address of an open library names the library', sh.lib, sh.h);
  await ev(() => closePanel(true)); await ev(() => { SCHU.tab = 'list'; SCHU.sec = 'gate'; schRefresh(); schLowerRefresh(); });
  const sh2 = await ev(() => shareHash()); check('share: the view of 액션 and the lower section are in the address', /view=list/.test(sh2) && /sec=gate/.test(sh2), sh2);
  const B = await newUser(browser, 'R8B' + sfx, '여덟 이', { url: V2 + sh2 }), b = B.page; await b.waitForFunction(() => schReady('pangyo'), null, { timeout: 15000 }); await sleep(900);
  check('opening that address shows the same view and section', await b.evaluate(() => S.page === 'project' && SCHU.tab === 'list' && SCHU.sec === 'gate' && !!document.querySelector('.tbl.sch-list') && !!document.querySelector('.sch-gates')));
  await ev(() => { SCHU.tab = 'gantt'; SCHU.sec = 'proc'; schRefresh(); schLowerRefresh(); });
  // one line per project
  const dup = await ev(() => { PROJ_ORDER.push('pangyo'); const n = orderedProjects().filter(x => x === 'pangyo').length; PROJ_ORDER.pop(); return n; }); check('a project named twice in the saved order is listed once', dup === 1, dup);
  // the demo actions
  const demo = await ev(() => { const mk = (id, title, extra) => { const it = Object.assign({ id, type: 'action', title, proj: 'pangyo', date: '2026-06-17', status: 'published', st: 'prog', people: [], comments: [], body: '' }, extra || {}); ITEMS.push(it); return it; };
    const x = mk('t7', 'AIDC 후보지(전기공업협동조합) 대상지 기본개요  조사'), y = mk('t8', '우리 팀이 고쳐 쓴 액션'), z = mk('a2', 'GPU임대가 비교보고서', { comments: [{ text: '의견' }] }), mt = item('m1'); const had = mt ? (mt.actions || []).slice() : null; if (mt) mt.actions = ['t7'];
    const n = dropDemoActionsV1(); const res = { n, x: x.status, y: y.status, z: z.status, link: mt ? mt.actions.length : 0 }; for (const it of [x, y, z]) ITEMS.splice(ITEMS.indexOf(it), 1); if (mt) mt.actions = had; return res; });
  check('demo actions: an untouched copy goes to the trash, one that was renamed or commented on stays, links to it are taken off', demo.n === 1 && demo.x === 'trash' && demo.y === 'published' && demo.z === 'published' && demo.link === 0, demo);
  check('the fixtures carry no demo action any more', await ev(() => !ITEMS.some(i => /^t\d+$/.test(i.id) || ['a1', 'a2', 'c3', 'c5', 'c8'].includes(i.id))));

  console.log('— frame: sidebar, notices, footer, names, holidays');
  const fr = await ev(() => { const top = document.querySelector('#sb .top'), lk = document.querySelectorAll('#sb .agent .item .sb-lk').length, foot = document.querySelector('#pfoot'), tri = document.querySelector('#notice .tri');
    return { sticky: getComputedStyle(top).position, lk, cols: [...foot.querySelectorAll('.fc b')].map(x => x.textContent), tri: getComputedStyle(tri).transform, pill: document.querySelector('#crumbs').textContent, tagEdit: !!document.querySelector('.tagedit') }; });
  check('sidebar: the top block stays; name and arrow of the five rows are one link', fr.sticky === 'sticky' && fr.lk === 5, fr);
  check('footer: no project and no agent column', fr.cols.join() === '바로가기,내 계정', fr.cols);
  check('notices: the closed arrow points down (eleventh round; it pointed right before)', /^matrix\(1\.4, 0, 0, 1\.4, 0, 0\)$/.test(fr.tri.replace(/\d+e-\d+/g, '0')), fr.tri);
  check('a project is called by its full name', /판교 AI 데이터센터/.test(fr.pill), fr.pill);
  const hol = await ev(() => { const s = schHolBuilt(2026), t = schHolBuilt(2025); S.calYp = 2026; S.calMp = 9; render(true); const cell = d => { const c = document.querySelector(`#page-project .cal .cell[data-date="${d}"]`); return c ? c.classList.contains('hol') && getComputedStyle(c.querySelector('.n')).color : null; };
    const r = { fixed: ['2026-01-01', '2026-03-01', '2026-05-05', '2026-06-06', '2026-08-15', '2026-10-03', '2026-10-09', '2026-12-25'].every(d => s.has(d)), lunar: ['2026-02-16', '2026-02-17', '2026-02-18', '2026-05-24', '2026-09-24', '2026-09-25', '2026-09-26'].every(d => s.has(d)), sub: ['2026-03-02', '2026-05-25', '2026-08-17', '2026-10-05'].every(d => s.has(d)) && !s.has('2026-06-08'), y25: t.has('2025-05-06') && t.has('2025-10-08') && !t.has('2025-05-07'), cell: cell('2026-09-25'), plain: cell('2026-09-22'), txt: document.querySelector('#page-project .cal .cell[data-date="2026-09-25"]').textContent.trim().replace(/\s+/g, ' '), name: (document.querySelector('#page-project .cal .cell[data-date="2026-09-25"] .holiday-name') || {}).textContent || '', plainName: !!document.querySelector('#page-project .cal .cell[data-date="2026-09-22"] .holiday-name') };
    S.calYp = +TODAY.slice(0, 4); S.calMp = +TODAY.slice(5, 7); render(true); return r; });
  check('holidays worked out by the page: fixed dates, the lunar ones and the substitute days of 2026 (and 2025)', hol.fixed && hol.lunar && hol.sub && hol.y25, hol);
  check('a holiday is a red date with its name beside it (the owner added the names on 2026-11-23); an ordinary day has none', (hol.cell === 'rgb(255, 0, 0)' || /^rgb\(2\d\d, \d{1,2}, \d{1,2}\)$/.test(hol.cell || '')) && hol.name === '추석' && !hol.plainName, hol);
  check('an ordinary weekday is not marked', hol.plain === false, hol.plain);

  console.log('— every project has the schedule sections; a project made from nothing');
  await goP('busan');
  const bs = await ev(() => { const m = schModel('busan'); return { has: schHas('busan'), secs: !!document.querySelector('#sch-actions') && !!document.querySelector('#sch-lower') && !!document.querySelector('#sch-gantt'), tasks: m.plan.tasks.length, op: m.res.operationDate, add: !!document.querySelector('#sch-gantt .sg-row.add'), ops: (document.querySelector('.phead .sch-ops') || {}).textContent }; });
  check('a project without a workbook has the same sections, empty, and a row that adds a phase', bs.has && bs.secs && bs.tasks === 0 && bs.op === '' && bs.add && /미정/.test(bs.ops || ''), bs);
  const pname0 = '시연 ' + sfx + ' 데이터센터';
  await ev(() => go('main')); await sleep(500); await a.click('.new-proj'); await sleep(300);
  check('the window that makes a project asks for no short name', await ev(() => !!document.querySelector('#np2-name') && !document.querySelector('#np2-tag')));
  await a.fill('#np2-name', pname0); await a.click('[data-np2="ok"]'); await sleep(900); await a.click('[data-editproj]'); await sleep(900);
  const pid = await ev(() => S.proj);
  await a.click('#sch-gantt .sg-row.add'); await sleep(300); await a.fill('#ask-in', '기획'); await a.keyboard.press('Enter'); await sleep(700);
  await a.hover('#sch-gantt .sg-row.ph'); await a.click('#sch-gantt .sg-row.ph .add'); await sleep(900); const firstPanel = await ev(() => [S.panel && S.panel.startsWith('wt-'), !!document.querySelector('#panel-pin .sch-props')]); await ev(() => closePanel(true)); await sleep(300);
  await a.hover('#sch-gantt .sg-row.ph'); await a.click('#sch-gantt .sg-row.ph .add'); await sleep(900); await ev(() => closePanel(true)); await sleep(300);   // (the + shows while the pointer is on the row; the page may have moved under it)
  const ts = await ev(p => schModel(p).plan.tasks.map(t => [t.id, t.wbs, t.phaseLabel]), pid);
  check('a phase and two tasks can be added to the empty plan; the tasks carry the phase\'s name', ts.length === 2 && ts[0][1] === 'W1.1' && ts[1][1] === 'W1.2' && ts.every(t => t[2] === '기획') && firstPanel[0] && firstPanel[1], { ts, firstPanel });
  await ev(([p, x, y]) => schPropose(p, { kind: 'new', from: x, to: y, type: 'FS' }), [pid, ts[0][0], ts[1][0]]); await sleep(500); await a.click('#dlg [data-pp="ok"]'); await sleep(900);
  const lk = await ev(p => { const m = schModel(p); return { deps: m.plan.dependencies.length, op: m.res.operationDate, bars: document.querySelectorAll('#sch-gantt .sg-bar').length, lines: document.querySelectorAll('#sch-gantt g[data-link]').length, dots: document.querySelectorAll('#sch-gantt .sg-dots circle').length, keep: document.querySelector('#toast').classList.contains('keep') }; }, pid);
  check('a relation between them is stored, drawn, and gives the project an operation date', lk.deps === 1 && /^\d{4}-\d\d-\d\d$/.test(lk.op) && lk.bars === 2 && lk.lines === 1 && lk.dots === 1, lk);
  check('the toast of a schedule change stays until it is closed', lk.keep, lk);
  for (const [sec, txt] of [['gate', '착공 승인'], ['proc', '수배전반'], ['evid', '전력 확약']]) { await ev(s => { SCHU.sec = s; schLowerRefresh(); }, sec); await sleep(300); await a.click('#sch-lower [data-sch="lowadd"]'); await sleep(300); await a.fill('#ask-in', txt); await a.keyboard.press('Enter'); await sleep(500);
    for (let i = 0; i < 2; i++) { const it = await a.$('.pop .sch-tm .it'); if (it) { await it.click(); await sleep(500); } } await ev(() => closePanel(true)); await sleep(300); }
  for (const kind of ['action', 'meeting', 'research']) { await ev(k => document.querySelector('.new-' + k).click(), kind); await sleep(600); await a.click('#panel-pin .ititle'); await a.keyboard.type('시연 ' + kind + ' ' + sfx); await sleep(200); await a.click('#panel-pin [data-ed="publish"]'); await sleep(800); await ev(() => closePanel(true)); await sleep(300); }
  await flush(); await sleep(800);
  const np = await ev(p => { const m = schModel(p); return { gates: schGates(p, m).length, proc: m.plan.procurement.length, ev: schEvRows(p, 'commitmentReviews').length, act: liveItems('action', p).length, meet: liveItems('meeting', p).length, cards: document.querySelectorAll('.mcard').length, evLabel: (document.querySelector('#sch-lower .sf[data-k="evKind"]') || {}).textContent }; }, pid);
  check('a gate, a package, a record, an action, a meeting and a research note can be made in it', np.gates === 1 && np.proc === 1 && np.ev === 1 && np.act === 1 && np.meet === 1 && np.cards === 1 && /\(1\)/.test(np.evLabel || ''), np);
  const xl = await save('#sch-actions .sch-xl.all', 'np.xlsx'), xz = unzip(xl.buf), wb = xz['xl/workbook.xml'].toString('utf8'), sheets = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map(m => m[1]);
  check('Excel from the new project: the sheets of the original workbook, opened on 마스터스케줄', xl.name.includes(pname0) && /마스터스케줄/.test(xl.name) && sheets.join() === '검토요약,마스터스케줄,승인게이트,책임경계,전제와참고자료,원자료대조,NVIS일정검토,업무연결,오프테이커 후보검토,외부설비 조달대장,일정 미연결 액션,보완·확약관리' && /activeTab="1"/.test(wb), { name: xl.name, sheets });
  await a.reload(); await a.waitForFunction(() => !document.querySelector('#app').hidden && typeof sharedReady !== 'undefined' && sharedReady, null, { timeout: 15000 }); await sleep(1500);
  const re = await ev(p => { const m = schModel(p); return m ? { phases: m.phases.map(g => schPhaseLabel(g) + ':' + g.tasks.length), deps: m.plan.dependencies.length, op: m.res.operationDate, gates: schGates(p, m).length, proc: m.plan.procurement.length } : null; }, pid);
  check('after a reload all of it is still there', !!re && re.phases.join() === '1) 기획:2' && re.deps === 1 && re.op === lk.op && re.gates === 1 && re.proc === 1, re);
  await ev(() => go('main')); await sleep(900);
  const mn = await ev(p => { const c = document.querySelector(`.pcard[data-go="project:${p}"]`); return c ? { ops: c.querySelector('.ops').textContent, h: c.querySelector('.img').style.height, rows: schMainRows().filter(r => r.proj === p).length } : null; }, pid);
  check('main page: its card shows the operation date at the default picture height; its tasks are in the action table', !!mn && /\d{4}\. \d\d\. \d\d/.test(mn.ops) && mn.h === '207.8px' && mn.rows >= 3, mn);

  console.log('— project cards, research');
  const pf = await ev(() => { const bar = document.querySelectorAll('.projects .pfil .sf').length, all = document.querySelectorAll('.pcard').length; S.pf = { st: '기초검토' }; render(true); const done = [...document.querySelectorAll('.pcard h3')].map(x => x.textContent), chip = (document.querySelector('.projects [data-pchip]') || {}).textContent; S.pf = { sort: 'name' }; render(true); const byName = [...document.querySelectorAll('.pcard h3')].map(x => x.textContent.replace(/^\d+/, '')); S.pf = {}; render(true);
    return { bar, all, done, chip, sorted: byName.slice().sort((x, y) => x.localeCompare(y, 'ko')).join() === byName.join(), h: [schCardImgH({}), schCardImgH({ img: 'x', imgR: 0.5 }), schCardImgH({ img: 'x', imgR: 2 }), schCardImgH({ img: 'x', imgR: 0.2 }), schCardImgH({ img: 'x' })] }; });
  check('project cards: six pickers (구분 · 추진 단계 · 위치 · 담당자 · 집중 추진 · 정렬); 추진 단계 keeps the ones of a stage and shows as a tag; 정렬 by name', pf.bar === 6 && pf.done.length >= 1 && pf.done.length < pf.all && pf.done.some(x => x.includes('인천 청라 AI 데이터센터')) && /추진 단계: 기초검토/.test(pf.chip || '') && pf.sorted, pf);
  check('a card\'s picture: 207.8 without one, by its shape with one, never over 296.2 nor under 150', pf.h.join() === '207.8,189.8,296.2,150,207.8', pf.h);
  const rs = await ev(([m, old, r]) => { const el = document.querySelector(`#page-main .rcard[data-open="${r}"] .tt`); const t2 = el && el.querySelector('.t2'); const lh = t2 ? parseFloat(getComputedStyle(t2).lineHeight) : 0, lines = t2 ? Math.round(t2.getBoundingClientRect().height / lh) : 0, tag = el && el.querySelector('.tg') ? el.querySelector('.tg').textContent : ''; const picks = [...document.querySelectorAll('#sec-research .sch-filters .sf')].map(x => x.dataset.rpick);
    const before = document.querySelectorAll('#page-main .rcard').length; S.rf = { when: 'range', from: TODAY, to: TODAY }; refreshSec('research'); const inR = [...document.querySelectorAll('#page-main .rcard')].map(x => x.dataset.open), chip = (document.querySelector('#sec-research [data-rchip="when"]') || {}).textContent; S.rf = { when: 'range', from: '2020-01-01', to: '2020-01-02' }; refreshSec('research'); const none = document.querySelectorAll('#page-main .rcard').length; S.rf = {}; refreshSec('research');
    return { tag, lines, picks, inR: inR.includes(r), chip, none, before }; }, ids);
  check('research card: the tag on its own line, the title in two lines at most', rs.tag === '[REF]' && rs.lines <= 2 && rs.lines >= 1, rs);
  // (the finish of a period carries its year only when it is another one than the start's: schDto, twentieth round)
  check('research: no sort picker; a period of one\'s own keeps what lies in it and shows as a tag', rs.picks.join() === 'tag,when,who,file' && rs.inR && /기간: \d{4}\. \d\d\. \d\d ~ (\d{4}\. )?\d\d\. \d\d/.test(rs.chip || '') && rs.none === 0, rs);
  await a.click('#sec-research [data-rpick="when"]'); await sleep(200); await ev(() => [...document.querySelectorAll('.pop .it')].find(x => x.textContent.includes('직접 설정')).click()); await sleep(300);
  await a.click('.pop.sch-rp [data-rd] >> nth=3'); await sleep(150); await a.click('.pop.sch-rp [data-rd] >> nth=9'); await sleep(150);   // (the window is drawn again after every press)
  const rp = await ev(() => ({ months: document.querySelectorAll('.pop.sch-rp .rp-m').length, a: !!document.querySelector('.pop.sch-rp .a'), b: !!document.querySelector('.pop.sch-rp .b'), mid: document.querySelectorAll('.pop.sch-rp .in').length }));
  await a.click('.pop.sch-rp [data-rx="ok"]'); await sleep(400);
  check('the period is picked on two months side by side: first day, last day, the days between shaded', rp.months === 2 && rp.a && rp.b && rp.mid === 5 && await ev(() => S.rf.when === 'range' && !!S.rf.from && S.rf.to > S.rf.from), rp); await ev(() => { S.rf = {}; refreshSec('research'); });
  await goP('busan'); check('research shows on every project page alike', await ev(([m, old, r]) => !!document.querySelector(`#page-project .rcard[data-open="${r}"]`) || liveItems('research', null).length > schResPer(), ids));

  console.log('— one panel for actions; a meeting\'s lines');
  await ev(() => go('main')); await sleep(500); await ev(() => document.querySelector('#sec-actions .new-action').click()); await sleep(600);
  const ap = await ev(() => { const it = curItem(), pin = document.querySelector('#panel-pin'); return { proj: it.proj, block: !!pin.querySelector('.props.sch-props.act-props'), tabs: [...pin.querySelectorAll('.sp-tabs button')].map(x => x.textContent.trim()), rows: [...pin.querySelectorAll('.sp-grid .pr .k')].map(x => x.textContent) }; });
  check('a new action made on the main page has no project and shows the block of a task', ap.proj === '' && ap.block && ap.tabs.join() === '정보,연결된 액션' && ap.rows.join() === '사업명,예상 기한,실제 기한,개발 단계,마일스톤,참고 자료,담당자,상태,중요도,URL', ap);
  await a.click('#panel-pin .ititle'); await a.keyboard.type('통일 액션 ' + sfx); await a.click('#panel-pin [data-pick="stx"]'); await sleep(200); await ev(() => [...document.querySelectorAll('.pop .it')].find(x => x.textContent.trim() === '보류').click()); await sleep(300);
  await a.click('#panel-pin [data-pick="ms"]'); await sleep(200); await ev(() => [...document.querySelectorAll('.pop .it')].find(x => x.textContent.includes('예')).click()); await sleep(300);
  await a.click('#panel-pin [data-ed="publish"]'); await sleep(800); const aid = await ev(() => S.panel); await flush(); await sleep(400);
  const al = await ev(id => { const it = item(id), row = document.querySelector(`#sec-actions .rw[data-open="${id}"]`); return { st: it.st, stx: it.stx, ms: it.ms, row: row ? row.textContent : '', dia: row ? !!row.querySelector('.sch-ms') : false }; }, aid);
  check('its state (one of the six marks) and the milestone flag are saved and show in the main table', al.st === 'prog' && al.stx === '보류' && al.ms === true && /보류/.test(al.row) && al.dia, al);
  await ev(() => closePanel(true)); await goP(); await ev(() => document.querySelector('#sch-actions .new-action').click()); await sleep(600);
  check('a new action made on a project page belongs to that project', await ev(() => curItem().proj === 'pangyo' && !!document.querySelector('#panel-pin .act-props [data-schp="link-phase"]'))); await ev(() => closePanel(true)); await sleep(300);
  await ev(([m]) => openPanel(m, true), ids); await sleep(400); await a.click('#panel-pin [data-ed="edit"]'); await sleep(500);
  const mrows = await ev(() => [...document.querySelectorAll('#panel-pin .props .pr .k')].map(x => x.textContent).filter(Boolean));
  await a.click('#panel-pin [data-pick="agenda"]'); await sleep(200); await a.fill('#pk-txt', '새 안건 ' + sfx); await a.keyboard.press('Enter'); await sleep(300);
  await a.click('#panel-pin [data-pick="mtime"]'); await sleep(200); await ev(() => [...document.querySelectorAll('.pop .it')].find(x => x.textContent.trim() === '9시 30분').click()); await sleep(300);
  await a.click('#panel-pin [data-ed="save"]'); await sleep(700); await flush();
  const mw = await ev(([m]) => { const it = item(m); return { time: it.time, agenda: it.agenda, checks: it.checks.map(c => c.t), picts: document.querySelectorAll('#panel-pin .mt-ln .bx .pict').length, card: [...document.querySelectorAll(`.mcard[data-open="${m}"] .chk .tx`)].map(x => x.textContent) }; }, ids);
  check('a meeting\'s panel has 일자 · 장소, 주요안건 and 상대 참여자, each with its pictogram', mrows.includes('일자 · 장소') && mrows.includes('주요안건') && mrows.includes('상대 참여자') && !mrows.includes('날짜') && mw.picts === 3, { mrows, picts: mw.picts });
  check('what is set there is what the card shows', mw.time === '09:30' && mw.agenda === '새 안건 ' + sfx && mw.checks[0] === '9시 30분, 대회의실' && mw.card[0] === '9시 30분, 대회의실' && mw.card[1] === '새 안건 ' + sfx, mw);

  console.log('— export');
  check('a content panel has the export pictogram beside the ⋯ menu', await ev(() => { const b = document.querySelector('#panel-pin .ihead .iexp'), m = document.querySelector('#panel-pin .ihead .nb-more'), t = document.querySelector('#panel-pin .ihead .trash .pict'); return !!b && !!m && b.previousElementSibling === m && b.querySelector('svg').getBoundingClientRect().width === t.getBoundingClientRect().width; }));
  await a.click('#panel-pin .ihead .iexp'); await sleep(200); const em = await ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim())); await ev(() => closePop());
  check('it offers Word and PDF', em.length === 2 && /Word/.test(em[0]) && /PDF/.test(em[1]), em);
  const dx = await save(() => ev(() => schExport(curItem(), 'docx')), 'm.docx'), dz = unzip(dx.buf), docx = (dz['word/document.xml'] || Buffer.alloc(0)).toString('utf8');
  check('Word: a .docx with the title, numbered sections in the left column (orange), the head line and the foot with the logo', /\.docx$/.test(dx.name) && docx.includes('R8' + sfx + ' 미팅') && docx.includes('1. 개요') && docx.includes('E36C0A') && docx.includes('새 안건 ' + sfx) && /Rev\. Date: \d{4}\. \d\d\. \d\d/.test(dz['word/header1.xml'].toString('utf8')) && /NUMPAGES/.test(dz['word/footer1.xml'].toString('utf8')) && !!dz['word/media/logo.png'] && dz['word/media/logo.png'].length > 3000, { name: dx.name, parts: Object.keys(dz) });
  const ph = await ev(() => { const d = schExpModel(curItem()); return { html: schExpHtml(d, ''), secs: d.sections.map(s => s.h), label: d.label }; });
  check('PDF: the same sheet as a page for the print window (head line, logo and page numbers in the page margins)', /@top-right/.test(ph.html) && /counter\(page\)/.test(ph.html) && /sunjin-logo\.png/.test(ph.html) && ph.html.includes('<h2>1. 개요</h2>') && /미팅/.test(ph.label) && /판교 AI 데이터센터/.test(ph.label), { secs: ph.secs, label: ph.label });
  await ev(() => closePanel(true));

  console.log('— gantt and relation map');
  await goP(); await ev(() => { SCHU.tab = 'gantt'; SCHU.scale = 'week'; SCHU.phase = ''; SCHU.open = [schModel('pangyo').phases[0].code]; schRefresh(); document.querySelector('#content').scrollTop = document.querySelector('#sch-actions').offsetTop - 40; }); await sleep(900);
  const g0 = await ev(() => { const box = document.querySelector('#sch-gantt'), sh = box.querySelector('.sg-shade'), dots = box.querySelector('.sg-dots'), bar = box.querySelector('.sg-bar'), xl = document.querySelector('#sch-actions .sch-filters .right .sch-xl'); const sr = sh.getBoundingClientRect(), br = box.getBoundingClientRect();
    return { dots: dots.querySelectorAll('circle').length, above: +getComputedStyle(dots).zIndex > +getComputedStyle(bar).zIndex, shade: Math.round(sr.height) >= Math.round(br.height) - 3, blend: getComputedStyle(sh).mixBlendMode, xl: !!xl && getComputedStyle(xl).color, pc: PROJECTS.pangyo.color }; });
  check('gantt: the points relations start from are a layer above the bars; the shade covers dates, rows and scroll bar', g0.dots > 0 && g0.above && g0.shade && g0.blend === 'multiply', g0);
  check('Excel export stands at the right of the filters, in the project\'s colour', g0.xl === `rgb(${parseInt(g0.pc.slice(1, 3), 16)}, ${parseInt(g0.pc.slice(3, 5), 16)}, ${parseInt(g0.pc.slice(5, 7), 16)})`, g0);
  const sel = await ev(() => { const m = schModel('pangyo'), t = m.phases[0].tasks.find(x => m.succ.get(x.id).some(e => m.phases[0].tasks.some(y => y.id === e.to))); SCHU.sel = t.id; schGanttBuild('pangyo'); const hot = document.querySelector('#sch-gantt .sg-dots circle.hot'), cold = document.querySelector('#sch-gantt .sg-dots circle:not(.hot)'), hl = document.querySelector('#sch-gantt .sg-links g.hot path:not(.hit)'), cl = document.querySelector('#sch-gantt .sg-links g:not(.hot) path:not(.hit)'); return { r: [hot && +hot.getAttribute('r'), cold && +cold.getAttribute('r')], w: [hl && parseFloat(getComputedStyle(hl).strokeWidth), cl && parseFloat(getComputedStyle(cl).strokeWidth)] }; });
  check('the chosen task: larger points, slightly thicker lines', sel.r[0] > sel.r[1] && sel.w[0] > sel.w[1], sel);
  const pan = await ev(() => { const host = document.querySelector('#sch-gantt .sg-scroll'), right = host.querySelector('.sg-right'), r = host.getBoundingClientRect(); host.scrollLeft = 400; let y = r.bottom - 14, x = r.right - 60; for (let k = 0; k < 30; k++) { const el = document.elementFromPoint(x, y); if (el === right || (el && el.classList.contains('sg-links'))) break; y -= 9; } return { x, y, sl: host.scrollLeft, on: document.elementFromPoint(x, y).className.baseVal || document.elementFromPoint(x, y).className }; });
  await a.mouse.move(pan.x, pan.y); await a.mouse.down(); await a.mouse.move(pan.x - 60, pan.y, { steps: 4 }); await a.mouse.move(pan.x - 160, pan.y, { steps: 4 }); const mid = await ev(() => document.querySelector('#sch-gantt .sg-scroll').classList.contains('pan')); await a.mouse.up(); await sleep(200);
  const pan2 = await ev(() => document.querySelector('#sch-gantt .sg-scroll').scrollLeft);
  check('pulling the ground of the gantt moves the view', mid && Math.abs(pan2 - pan.sl - 160) <= 12, { before: pan.sl, after: pan2, on: pan.on });
  const lp = await ev(() => { const n = schModel('pangyo').plan.dependencies.length; for (const g of document.querySelectorAll('#sch-gantt .sg-links g[data-link]')) { const hit = g.querySelector('path.hit'), L = hit.getTotalLength(), M = hit.getScreenCTM(); for (let k = 2; k < 19; k++) { const pt = hit.getPointAtLength(L * k / 20), x = pt.x * M.a + M.e, y = pt.y * M.d + M.f; if (document.elementFromPoint(x, y) === hit) return { id: g.dataset.link, x, y, n }; } } return { id: '', x: 0, y: 0, n }; });
  const gr = await ev(() => { const host = document.querySelector('#sch-gantt .sg-scroll'), right = host.querySelector('.sg-right'), r = host.getBoundingClientRect(); for (let y = r.bottom - 14; y > r.top + 60; y -= 9) for (let x = r.right - 60; x > r.left + 560; x -= 40) if (document.elementFromPoint(x, y) === right) return { x, y }; return null; });
  await a.mouse.move(lp.x, lp.y); await a.mouse.down(); await a.mouse.move(lp.x + 12, lp.y + 12, { steps: 3 }); await a.mouse.move(gr.x, gr.y, { steps: 5 }); await sleep(150);
  const pulling = await ev(id => { const g = document.querySelector(`#sch-gantt g[data-link="${id}"]`), d = document.querySelector('#sch-gantt .sg-links path.draft:not(.head)'); return { pull: !!g && g.classList.contains('pull') && g.classList.contains('far'), still: !!g && !g.style.transform, pale: !!g && +getComputedStyle(g.querySelector('path:not(.hit)')).opacity < .5, cut: !!d && d.classList.contains('cut') && d.getAttribute('d').length > 20, tip: (document.querySelector('.sg-tip') || {}).textContent }; }, lp.id); await a.mouse.up(); await sleep(500);
  const dlg = await ev(() => { const d = document.querySelector('#dlg'); return d ? d.textContent.slice(0, 40) : ''; });
  check('a relation taken hold of does not move: it stays where it is (pale) and a line from the task that stays follows the pointer; over empty ground that line is red and the window asks whether to remove the relation', pulling.pull && pulling.still && pulling.pale && pulling.cut && /연결 빼기/.test(pulling.tip || '') && /연결 빼기/.test(dlg), { pulling, dlg });
  await a.click('#dlg [data-pp="ok"]'); await sleep(900); check('확인 removes it (되돌리기 brings it back)', await ev(n => schModel('pangyo').plan.dependencies.length === n - 1, lp.n)); await ev(() => schUndo()); await sleep(700); check('…and it is back', await ev(n => schModel('pangyo').plan.dependencies.length === n, lp.n)); await ev(() => document.querySelector('#toast').classList.remove('on'));
  // an existing relation is changed like a new one is made: the arrow end onto another bar moves the relation there
  await ev(() => { const host = document.querySelector('#sch-gantt .sg-scroll'), t = schModel('pangyo').phases[0].tasks[0]; host.scrollLeft = Math.max(0, host._rows.get(t.id).x1 - 120); host.scrollTop = 0; }); await sleep(400);
  const mv = await ev(() => { const m = schModel('pangyo'), host = document.querySelector('#sch-gantt .sg-scroll'), box = host.getBoundingClientRect(); for (const g of document.querySelectorAll('#sch-gantt .sg-links g[data-link]')) { const rel = m.plan.dependencies.find(x => x.id === g.dataset.link), hit = g.querySelector('path.hit'), L = hit.getTotalLength(), M = hit.getScreenCTM(); if (!rel || rel.type !== 'FS') continue;
      for (let k = 18; k > 11; k--) { const pt = hit.getPointAtLength(L * k / 20), x = pt.x * M.a + M.e, y = pt.y * M.d + M.f; if (document.elementFromPoint(x, y) !== hit) continue;
        const b = [...document.querySelectorAll('#sch-gantt .sg-bar')].find(b => { const r = b.getBoundingClientRect(); return ![rel.from, rel.to].includes(b.dataset.bar) && b.offsetWidth > 50 && r.left > box.left + 520 && r.right < box.right - 20 && r.top > box.top + 50 && r.bottom < box.bottom - 10 && !m.plan.dependencies.some(e => (e.from === rel.from && e.to === b.dataset.bar) || (e.from === b.dataset.bar && e.to === rel.from)); }); if (!b) continue;
        const r = b.getBoundingClientRect(), ra = host._rows.get(rel.from), f = n => Math.round(n * 100) / 100; return { id: rel.id, from: rel.from, to: rel.to, x, y, bar: b.dataset.bar, bx: r.left + 8, by: r.top + r.height / 2, start: 'M' + f(ra.x2) + ',' + f(ra.cy) + ' ', n: m.plan.dependencies.length }; } } return null; });
  await a.mouse.move(mv.x, mv.y); await a.mouse.down(); await a.mouse.move(mv.x + 12, mv.y + 12, { steps: 3 }); await a.mouse.move(mv.bx, mv.by, { steps: 6 }); await sleep(200);
  const mv1 = await ev(o => { const g = document.querySelector(`#sch-gantt g[data-link="${o.id}"]`), d = document.querySelector('#sch-gantt .sg-links path.draft:not(.head)'), t = document.querySelector('#sch-gantt .sg-bar.target'); return { still: !g.style.transform && g.classList.contains('pull') && !g.classList.contains('far'), draft: d ? d.getAttribute('d') : '', green: !!d && !d.classList.contains('cut'), target: t ? t.dataset.bar : '', ts: !!t && t.classList.contains('ts'), tip: (document.querySelector('.sg-tip') || {}).textContent }; }, mv);
  await a.mouse.up(); await sleep(600); const mvD = await ev(() => { const d = document.querySelector('#dlg'); return d ? { title: d.querySelector('.pp-hd b').textContent, note: d.querySelector('.pp-sent').textContent, types: !!d.querySelector('.pp-types') } : null; });
  check('its arrow end pulled onto another bar: the start stays on the earlier task, the line is drawn as the chart will draw it (green, like a new one), the bar\'s left half is marked', mv1.still && mv1.green && mv1.draft.startsWith(mv.start) && mv1.target === mv.bar && mv1.ts && /^FS.*끝나면 → .*시작/.test(mv1.tip || ''), { mv1, start: mv.start });
  check('letting go there shows the move first (연결 옮기기), nothing is stored yet', !!mvD && mvD.title === '연결 옮기기' && /연결로 옮깁니다/.test(mvD.note) && !mvD.types && await ev(o => schModel('pangyo').plan.dependencies.some(e => e.id === o.id), mv), mvD);
  await a.click('#dlg [data-pp="ok"]'); await sleep(900);
  check('확인 moves the relation to that task (the old one is gone, the count stays)', await ev(o => { const d = schModel('pangyo').plan.dependencies; return !d.some(e => e.from === o.from && e.to === o.to) && d.some(e => e.from === o.from && e.to === o.bar && e.type === 'FS') && d.length === o.n; }, mv));
  await ev(() => { schCardHide(); schUndo(); }); await sleep(700);
  check('되돌리기 puts it back', await ev(o => { const d = schModel('pangyo').plan.dependencies; return d.some(e => e.from === o.from && e.to === o.to) && !d.some(e => e.from === o.from && e.to === o.bar) && d.length === o.n; }, mv)); await ev(() => document.querySelector('#toast').classList.remove('on'));
  await ev(() => { SCHU.tab = 'net'; SCHU.netMode = 'focus'; SCHU.netDepth = 1; SCHU.netZoom = 1; schRefresh(); }); await sleep(900);
  const n0 = await ev(() => { const host = document.querySelector('#sch-net .sn-scroll'), cards = [...host.querySelectorAll('.sn-node:not(.sel)')], c = cards.find(x => { const r = x.getBoundingClientRect(), h = host.getBoundingClientRect(); return r.left > h.left + 10 && r.right < h.right - 10 && r.top > h.top + 10 && r.bottom < h.bottom - 10; }) || cards[0], r = c.getBoundingClientRect(); return { id: c.dataset.k, was: document.querySelector('#sch-net .sn-node.sel').dataset.k, x: r.left, y: r.top, hits: host.querySelectorAll('.sn-links g[data-link] path.hit').length }; });
  check('relation map: every line has a hit area', n0.hits > 0, n0.hits);
  await a.mouse.click(n0.x + 60, n0.y + 40); await sleep(800);
  const n1 = await ev(o => { const c = document.querySelector(`#sch-net .sn-node[data-k="${o.id}"]`), r = c.getBoundingClientRect(), prev = document.querySelector('#sch-net .sn-node.prev'); return { sel: c.classList.contains('sel'), dx: Math.round(r.left - o.x), dy: Math.round(r.top - o.y), prev: prev && prev.dataset.k, mark: !!(prev && prev.querySelector('.sn-prev')) }; }, n0);
  check('stepping through the map: the pressed card stays where it was and the one pressed before is marked', n1.sel && Math.abs(n1.dx) <= 3 && Math.abs(n1.dy) <= 3 && n1.prev === n0.was && n1.mark, n1);
  await ev(() => { SCHU.tab = 'gantt'; SCHU.scale = 'fit'; SCHU.sel = ''; schRefresh(); });

  console.log('— calendar list, lists, library');
  await goP(); await ev(() => document.querySelector('#content').scrollTop = 0); await sleep(300);
  const cl = await ev(() => { const rl = document.querySelector('#page-project .rlist.sch'), ic = rl.querySelector('.rcap.act svg'), row = rl.querySelector('.ra'), other = document.querySelector('#page-project .cal .cell:not(.today):not(.out) .acnt svg'), per = document.querySelector('#sch-actions .sch-filters .sf.per');
    return { ic: getComputedStyle(ic).color, pc: PROJECTS.pangyo.color, av: !!row && !!row.querySelector('.avstack .avatar'), role: !!rl.querySelector('.sch-role'), fs: row ? getComputedStyle(row.querySelector('.tt')).fontSize : '', other: other && getComputedStyle(other).color, ms: rl.querySelectorAll('.ra .sch-ms').length, msWant: schDayRows('pangyo', TODAY).slice(0, 60).filter(x => x.ms).length }; });
  check('list beside the calendar: captions in the project\'s colour, a face instead of the word 미지정, a smaller title, a diamond for milestones', cl.ic === 'rgb(31, 142, 0)' && cl.av && !cl.role && cl.fs === '15.7px' && cl.ms === cl.msWant, cl);
  check('counts of other days in the calendar are grey', cl.other === 'rgb(207, 207, 207)', cl.other);
  await ev(() => { SCHU.tab = 'list'; schRefresh(); }); await sleep(500);
  const ls = await ev(() => { const f = document.querySelector('#sch-actions .sch-filters'), per = f.querySelector('.sf.per'), xl = f.querySelector('.sch-xl'), ua = document.querySelector('.tbl.sch-list .rw .url a'); return { perLeft: !!per && per === f.firstElementChild, txt: per && per.textContent.trim(), xlRight: !!xl && xl.getBoundingClientRect().left > per.getBoundingClientRect().right, ua: ua ? ua.className : 'none' }; });
  check('list: "n개씩 보기" stands at the left in the pickers\' look', ls.perLeft && /개씩 보기/.test(ls.txt) && ls.xlRight, ls);
  await ev(() => { SCHU.tab = 'gantt'; schRefresh(); go('main'); }); await sleep(600);
  const ml = await ev(id => { const f = document.querySelector('#sec-actions .sch-filters'), per = f.querySelector('.sf.per'), it = item(id); it.url = 'https://www.dropbox.com/scl/fi/abcdefghijklmnopqrstuvwxyz/very-long-name-of-a-file.pdf?dl=0'; S.q.action = it.title; refreshSec('action'); const ua = document.querySelector(`#sec-actions .rw[data-open="${id}"] .url a`); const r = { per: !!per && per === f.firstElementChild, ua: ua && ua.className, txt: ua && ua.textContent.trim(), svg: !!(ua && ua.querySelector('svg')) }; S.q.action = ''; refreshSec('action'); return r; }, aid);
  check('main table: the picker at the left; an address is an arrow, not its text', ml.per && ml.ua === 'sch-ua' && ml.txt === '' && ml.svg, ml);
  await ev(id => openPanel(id, true), aid); await sleep(500);
  const ur = await ev(() => { const u = document.querySelector('#panel-pin .props a.url'); const r = u.getBoundingClientRect(); return { one: r.height < 30, cut: u.scrollWidth > u.clientWidth, ws: getComputedStyle(u).whiteSpace }; });
  check('in the panel a long address keeps to one line and is cut with …', ur.one && ur.cut && ur.ws === 'nowrap', ur); await ev(() => closePanel(true));
  const up = await ev(async ([m, old, r]) => { const it = item(r); for (let i = 0; i < 44; i++) { let f; if (i % 4 === 1) f = new File([new Uint8Array(900 + i)], `자료_${i}.${['pdf', 'xlsx', 'docx'][i % 3]}`, { type: 'application/octet-stream' }); else { const c = document.createElement('canvas'); c.width = 240; c.height = [160, 320, 240][i % 3]; const g = c.getContext('2d'); g.fillStyle = ['#9db4c0', '#e0b1cb', '#bfd8bd'][i % 3]; g.fillRect(0, 0, c.width, c.height); f = new File([await new Promise(ok => c.toBlob(ok, 'image/png'))], `사진_${i}.png`, { type: 'image/png' }); } const d = await uploadAttachment(f, it); it.body = (it.body || '') + (d.src ? `<p><img src="${d.src}" alt="${f.name}"></p>` : `<p><a class="file" href="/api/file/${d.id}" download="${f.name}" data-name="${f.name}" data-fid="${d.id}">${f.name}</a></p>`); } render(true); return true; }, ids); await flush();
  await ev(() => openLibrary('research')); await sleep(2500);
  const lb = await ev(() => ({ cards: document.querySelectorAll('.lb-card').length, cols: document.querySelectorAll('.lb-col').length, rows: SCH_LIB.rows.length, lazy: [...document.querySelectorAll('.lb-card img')].every(i => i.loading === 'lazy'), tiles: document.querySelectorAll('.lb-tile').length, tops: [...document.querySelectorAll('.lb-col')].map(c => Math.round(c.getBoundingClientRect().height)) }));
  check('library: a wall of cards in columns of one width; the first 36 only', lb.rows >= 44 && lb.cards === 36 && lb.cols >= 3 && lb.lazy && lb.tiles > 0 && new Set(lb.tops).size > 1, lb);
  await ev(() => { document.querySelector('#panel').scrollTop = 1e6; }); await sleep(1500);
  check('the rest is made when the end of the wall comes near', await ev(() => document.querySelectorAll('.lb-card').length === SCH_LIB.rows.length));
  await a.click('.lb-kinds [data-lbk="pdf"]'); await sleep(400); const lk2 = await ev(() => ({ n: document.querySelectorAll('.lb-card').length, all: [...document.querySelectorAll('.lb-card .lb-t')].every(x => /\.pdf$/.test(x.textContent)) })); check('the kind buttons keep one kind of file', lk2.n > 0 && lk2.all, lk2);
  const fid = await ev(() => document.querySelector('.lb-card [data-open]').dataset.open); await ev(() => document.querySelector('.lb-card [data-open]').click()); await sleep(600);
  check('"내용 보기" opens the item, with the library as a step of the trail', await ev(id => S.panel === id && S.trail.length === 1 && S.trail[0] === 'lib:research' && /리서치 라이브러리/.test(document.querySelector('#panel-pin .itrail').textContent), fid));
  await a.click('#panel-pin .itrail [data-trail]'); await sleep(900); check('…and that step leads back to the library', await ev(() => S.panel === 'lib:research' && !!document.querySelector('#lb-wall')));
  await ev(() => closePanel(true));

  console.log('— ninth round (2026-11-22)');
  await ev(() => go('main')); await sleep(600);
  const n9 = await ev(() => { const pills = [...document.querySelectorAll('#sec-actions .tbl.sch-all .rw .pj .pill')], cut = pills.filter(p => p.scrollWidth > p.clientWidth + 1 || p.getBoundingClientRect().right > p.parentElement.getBoundingClientRect().right + 1).length, hp = document.querySelector('#sec-partners .rw .hp a'), cat = document.querySelector('#sec-partners .rw .cat a');
    const r0 = document.querySelector('#sb-recent .r0:not(:first-child)'), r2 = document.querySelector('#sb-recent .r2'), cnt = document.querySelector('#sb .agent .cnt');
    return { pills: pills.length, cut, hp: hp && [getComputedStyle(hp).borderRadius, getComputedStyle(hp).textOverflow], cat: cat && getComputedStyle(cat).borderRadius, r0: r0 && getComputedStyle(r0).marginTop, r2: r2 && [getComputedStyle(r2).height, getComputedStyle(r2).paddingLeft], cnt: cnt && getComputedStyle(cnt).right }; });
  check('main action table: no project tag is cut', n9.pills > 0 && n9.cut === 0, n9);
  check('partner list: an address keeps to its column (…), the lines under address and class are straight', !!n9.hp && n9.hp[0] === '0px' && n9.hp[1] === 'ellipsis' && n9.cat === '0px', n9);
  check('sidebar: more room above a group, items under a kind closer and further left, the agents\' square further right', (!n9.r0 || n9.r0 === '14px') && (!n9.r2 || (n9.r2[0] === '22px' && n9.r2[1] === '24.5px')) && n9.cnt === '12px', n9);
  await goP(); const tk9 = await ev(() => { const m = schModel('pangyo'), t = m.phases[0].tasks.find(x => x.kind !== 'milestone' && !x.actualStart && !x.finishRule && m.succ.get(x.id).length); openPanel(schItemId(t.id), true); return { id: t.id, pf: t.plannedFinish }; }); await sleep(500);
  await a.click('#panel-pin [data-ed="edit"]'); await sleep(700); await a.click('#panel-pin [data-schp="f"][data-k="plannedFinish"]'); await sleep(300); await ev(() => { const bs = [...document.querySelectorAll('.pop .dp [data-ds]')].filter(b => !b.disabled); bs[bs.length - 1].click(); }); await sleep(700);
  const c9 = await ev(o => { const b = document.querySelector('#dlg .pp-dates'), t = schModel('pangyo').byId.get(o.id); return { win: b ? b.textContent : '', bt: b ? [...b.querySelectorAll('.bt button')].map(x => x.textContent).join() : '', saved: t.plannedFinish !== o.pf, card: !!document.querySelector('#sch-card') }; }, tk9);
  check('a date picked in a task\'s panel saves nothing yet: the window says what will happen (what moves with it, the operation date) with 취소 and 적용', !c9.saved && /일정 변경/.test(c9.win) && /완료일/.test(c9.win) && /함께 바뀌는 업무/.test(c9.win) && /운영개시 예상/.test(c9.win) && c9.bt === '취소,적용' && !c9.card, c9);
  await a.click('#dlg [data-pp="ok"]'); await sleep(800); const c9b = await ev(o => ({ moved: schModel('pangyo').byId.get(o.id).plannedFinish !== o.pf, toast: /일정 변경/.test(document.querySelector('#toast').textContent) && /되돌리기/.test(document.querySelector('#toast').textContent), field: (document.querySelector('#panel-pin [data-schp="f"][data-k="plannedFinish"]') || {}).textContent }), tk9);
  check('적용 saves it (되돌리기 in the toast, the panel shows the new date)', c9b.moved && c9b.toast && !!c9b.field, c9b);
  await ev(() => schUndo()); await sleep(600); check('되돌리기 takes the change back', await ev(o => schModel('pangyo').byId.get(o.id).plannedFinish === o.pf && !document.querySelector('#sch-card'), tk9));
  await a.click('#panel-pin [data-ed="cancel"]'); await sleep(500); await ev(() => closePanel(true));
  await ev(() => { SCHU.tab = 'net'; schRefresh(); }); await sleep(700);
  check('relation map: nobody assigned is an empty face, not the word', await ev(() => { const w = [...document.querySelectorAll('#sch-net .sn-node .who')]; return w.length > 0 && w.every(x => !x.querySelector('.sch-role') && !!x.querySelector('.avatar')); }));
  await ev(() => { SCHU.tab = 'gantt'; schRefresh(); });

  console.log('— tenth round (2026-11-23)');
  await sleep(600);
  const l10 = await ev(() => { const host = document.querySelector('#sch-gantt .sg-scroll'), m = schModel('pangyo'), f = n => Math.round(n * 100) / 100, out = { n: 0, bad: 0, round: 0, slant: 0, first: '' };
    for (const e of m.plan.dependencies) { const g = document.querySelector('#sch-gantt .sg-links g[data-link="' + e.id + '"] path:not(.hit)'), ra = host._rows.get(e.from), rb = host._rows.get(e.to); if (!g || !ra || !rb || ra.x1 === undefined || rb.x1 === undefined) continue; const d = g.getAttribute('d'), k = /^(FS|SS|FF|SF)$/.test(e.type || '') ? e.type : 'FS';
      const ax = k[0] === 'F' ? ra.x2 : ra.x1, tip = k[1] === 'S' ? rb.x1 - 2 : rb.x2 + 2; out.n++;
      if (!(d.startsWith('M' + f(ax) + ',' + f(ra.cy) + ' ') && d.endsWith('L' + f(tip) + ',' + f(rb.cy)))) { out.bad++; out.first = out.first || k + ' ' + d; }
      if ((d.match(/Q/g) || []).length >= 4) out.round++;
      let x = 0, y = 0; for (const mm of d.matchAll(/([MLQ])\s*(-?[\d.]+),(-?[\d.]+)(?:\s+(-?[\d.]+),(-?[\d.]+))?/g)) { if (mm[1] === 'L' && Math.abs(+mm[2] - x) > 0.02 && Math.abs(+mm[3] - y) > 0.02) out.slant++; if (mm[1] === 'Q') { x = +mm[4]; y = +mm[5]; } else { x = +mm[2]; y = +mm[3]; } } }
    const A = { x1: 100, x2: 200, cy: 50 }, B = { x1: 150, x2: 260, cy: 90, rh: 30 }; out.fs = schLinkPath(A, { x1: 300, x2: 380, cy: 90 }, 'FS').d; out.back = schLinkPath(A, B, 'FS').d; out.ss = schLinkPath(A, B, 'SS').d; out.ff = schLinkPath(A, B, 'FF').d; return out; });
  check('gantt: every relation leaves the end its kind names (FS: the end of the earlier bar, level with its middle) and enters the other bar from the side (FS: its left edge), without a slanted piece', l10.n > 5 && l10.bad === 0 && l10.slant === 0, l10);
  check('gantt: the rule itself — end to start with room: out, one upright line, in; a later task that starts earlier is gone round; start to start leaves and enters on the left, end to end on the right', l10.fs.startsWith('M200,50 L') && l10.fs.endsWith('L298,90') && (l10.fs.match(/Q/g) || []).length === 2 && l10.back.startsWith('M200,50 L') && l10.back.endsWith('L148,90') && (l10.back.match(/Q/g) || []).length === 4 && l10.ss.startsWith('M100,50 L') && l10.ss.endsWith('L148,90') && l10.ff.startsWith('M200,50 L') && l10.ff.endsWith('L262,90'), l10);
  await ev(() => { const c = document.querySelector('#page-project .cal .cell'); c.insertAdjacentHTML('beforeend', '<span class="acnt" id="t10"><b>3</b><span class="nd"><i class="g">1</i><i class="r w">9+</i></span></span>'); }); await sleep(100);
  const d10 = await ev(() => { const o = [...document.querySelectorAll('#t10 .nd i')].map(i => { const b = i.getBoundingClientRect(); return [Math.round(b.width * 100) / 100, Math.round(b.height * 100) / 100, getComputedStyle(i).borderRadius, i.scrollWidth <= i.clientWidth + 1]; }); document.querySelector('#t10').remove(); return o; });
  check('project calendar: the notice beside today\'s count is a circle (as wide as high), also with 9+', d10.length === 2 && d10.every(x => x[0] === x[1] && x[0] === 11 && x[2] === '50%' && x[3]), d10);
  await ev(() => go('main')); await sleep(700);
  const p10 = await ev(() => { const r1 = n => Math.round(n * 10) / 10, tb = document.querySelector('#sec-partners .tbl.partners'), txt = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.nodeValue.trim() || n.parentElement.closest('.acts,.lg')) continue; const g = document.createRange(); g.selectNodeContents(n); const r = g.getBoundingClientRect(); if (r.height) return r; } return null; };
    const rows = [...tb.querySelectorAll('.rw')].filter(rw => rw.querySelectorAll('.cat a').length === 1).slice(0, 8).map(rw => { const R = rw.getBoundingClientRect(), mid = R.top + (R.height - 1) / 2, o = { h: r1(R.height), line: 0, dy: [], ul: null };
      for (const c of rw.children) { const b = c.getBoundingClientRect(); o.line = Math.max(o.line, Math.abs(r1(R.bottom - b.bottom))); const chip = c.querySelector('.chip'), t = c.classList.contains('mt') ? (chip ? chip.getBoundingClientRect() : null) : txt(c); if (t) o.dy.push(r1(t.top + t.height / 2 - mid)); if (c.classList.contains('cat') && t) o.ul = r1(c.querySelector('a').getBoundingClientRect().bottom - t.bottom); }
      return o; });
    const hd = [...tb.querySelectorAll('.hd span')].map(s => r1(s.querySelector('em').getBoundingClientRect().left - s.getBoundingClientRect().left)), lg = tb.querySelector('.rw .nm .lg'), pill = document.querySelector('#sec-actions .tbl.sch-all .rw .pj .pill'), pt = pill ? txt(pill) : null, pb = pill ? pill.getBoundingClientRect() : null;
    return { rows, hd, lg: lg ? r1(lg.getBoundingClientRect().left - lg.closest('.nm').getBoundingClientRect().left) : null, pill: pill ? [r1(pt.top - pb.top), r1(pb.bottom - pt.bottom), r1(pb.height)] : null }; });
  check('partner list: every row is equally high and its line is the very bottom of the row', p10.rows.length > 1 && p10.rows.every(r => r.h === p10.rows[0].h && r.line === 0), p10.rows);
  check('partner list: name, address, class, note and meeting stand on one middle line, in the middle between the lines above and below', p10.rows.every(r => r.dy.length >= 4 && r.dy.every(d => Math.abs(d) <= 0.75)), p10.rows);
  check('partner list: the line under a class is close under the letters (its lower edge 2 below them: 1 of room, 1 of line since the twelfth round; it was 6), the column titles and the logo start where the lines start', p10.rows.every(r => r.ul === 2) && p10.hd.every(x => x === 0) && p10.lg === 0, p10);
  check('main action table: the project tag\'s text is in the middle of its box', !!p10.pill && Math.abs(p10.pill[0] - p10.pill[1]) <= 1.5 && p10.pill[2] === 19.6, p10.pill);
  await goP();

  console.log('— without the preview nothing of this shows');
  const C = await newUser(browser, 'R8C' + sfx, '여덟 삼'), c = C.page; await sleep(600);
  const np0 = await c.evaluate(() => ({ pv: PREVIEW_ON, hol: document.querySelectorAll('.cal .cell.hol').length, pill: [...document.querySelectorAll('.cal .filters .pill')].map(x => x.textContent.trim()).join('|'), pfil: !!document.querySelector('.projects .pfil'), foot: !!document.querySelector('#pfoot') }));
  await c.evaluate(() => toast('알림', 1800)); const nt = await c.evaluate(() => ({ x: !!document.querySelector('#toast button.tx'), pv: document.querySelector('#toast').classList.contains('pv') }));
  await c.evaluate(() => { go('project:busan'); }); await sleep(900);
  const np1 = await c.evaluate(() => ({ sch: !!document.querySelector('#sch-actions'), has: schHas('busan') }));
  check('the page everybody else sees: short names, no holidays, no pickers above the cards, plain toasts, no schedule sections', np0.pv === false && np0.hol === 0 && /(^|\|)판교 AIDC(\||$)/.test(np0.pill || '') && !np0.pfil && !np0.foot && !nt.x && !nt.pv && !np1.sch && !np1.has, { np0, nt, np1 });

  // tidy up: what this run made
  await ev(([p, aid, ids]) => { for (const id of ids.concat(aid)) { const it = item(id); if (it) { it.status = 'trash'; it.trashedAt = new Date().toISOString(); } } for (const it of ITEMS) if (it.proj === p && it.status !== 'trash') { it.status = 'trash'; it.trashedAt = new Date().toISOString(); } if (PROJECTS[p]) trashProject(p); S.rf = {}; S.pf = {}; }, [pid, aid, ids]);
  await flush(); await sleep(600);
  const errs = [...A.errs, ...B.errs, ...C.errs]; check('no script errors', errs.length === 0, errs.slice(0, 5));
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
