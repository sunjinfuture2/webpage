// WorkSpace, seventeenth part (owner, 2026-11-24: "코드에 넣어"): the development review list is in the code and is put into a database once.
//  - the Worker hands it to a member who is logged in (GET /api/devreport); the page's own code does not carry it;
//  - applyDevReportV1 — what the page runs once by itself outside local development — makes the 16 new projects, writes 판교 and 부산
//    over (their schedule, owner and partners stay) and sends 인천 청라 and 햇빛, which are not in the list, to the trash;
//  - a second run changes nothing.
// RUN IT LAST: it turns the demo database into the list (the suites before it count on the demo projects).
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2';
const IDS = ['asan-idc', 'goyang-aitown', 'boryeong-netzero', 'busan', 'chuncheon-cluster', 'daegu-univ', 'anyang-gwanyang', 'yangsan-sangbuk', 'wonju-idc', 'yongin-mabuk', 'jeungpyeong-shinsung', 'anseong-jinchon', 'pangyo', 'seongnam-geumto', 'daegu-alphacity', 'seongsu-philosophy', 'seongsu-taehwa', 'seongsu-bldg'];
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RDA' + sfx, '열일곱 일', { url: V2 }), a = A.page;
  const B = await newUser(browser, 'RDB' + sfx, '열일곱 이', { url: V2 }), b = B.page;
  const ev = (f, x) => a.evaluate(f, x);

  console.log('— where the list is kept');
  const w = await ev(async () => { const open = await fetch('/api/devreport', { headers: { 'X-AIDC-Client': String(CLIENT_VERSION) } }), mine = await apiFetch('/api/devreport'), d = mine.ok ? await mine.json() : null, page = await (await fetch('/')).text();
    return { open: open.status, mine: mine.status, kind: d && d.kind, n: d && d.projects.length, asof: d && d.asof, first: d && d.projects[0].name, inPage: /메타인프라|보령 넷제로|수성알파시티/.test(page), host: location.hostname }; });
  check('the Worker hands the list to a member who is logged in, and to nobody else', w.open === 401 && w.mine === 200 && w.kind === 'aidc-dev-report' && w.n === 18 && w.asof === '2026.11.24', w);
  check('the page\'s own code does not carry it', w.inPage === false, w);
  const before = await ev(ids => ({ flag: META_FLAGS.devReportV1 || 0, have: ids.filter(k => PROJECTS[k]).length, all: Object.keys(PROJECTS).length, pangyo: PROJECTS.pangyo ? { full: PROJECTS.pangyo.full, owner: (PHEAD.pangyo || {}).owner, partners: ((PHEAD.pangyo || {}).partners || []).join() } : null }), IDS);
  check('on a local development database the page does not put the list in by itself', before.flag === 1 || (before.have <= 2 && w.host === '127.0.0.1'), before);

  console.log('— put in once');
  const ok = await ev(() => applyDevReportV1()); await sleep(1800);
  const af = await ev(ids => { const ord = orderedProjects().filter(k => ids.includes(k)), h = k => PHEAD[k] || {}, P = k => PROJECTS[k] || {};
    return { flag: META_FLAGS.devReportV1, have: ids.filter(k => PROJECTS[k]).length, order: ord.join() === ids.join(), names: [P('asan-idc').full, P('busan').full, P('pangyo').full, P('seongsu-bldg').full].join('|'), stages: [P('asan-idc').status, P('busan').status, P('pangyo').status].join(), grp: ids.filter(k => h(k).grp === 'AIDC').length + '/' + ids.filter(k => h(k).grp === 'Small AIDC').length, focus: ids.filter(k => h(k).focus).join(),
      gone: ['incheon', 'sunlight'].map(k => !PROJECTS[k] && !!(SETTINGS.projTrash || {})[k]).join(), kpi: h('pangyo').kpi.length + '/' + h('asan-idc').kpi.length, plan: h('daegu-univ').plan.length, rows: h('pangyo').rows.length, asof: META_FLAGS.repAsof, owner: h('pangyo').owner, partners: (h('pangyo').partners || []).join(), tasks: schModel('pangyo') ? schModel('pangyo').plan.tasks.length : -1, sub: h('pangyo').sub, loc: h('asan-idc').loc, cost: h('asan-idc').cost }; }, IDS);
  check('the routine makes the 18 projects of the list, in the list\'s order, nine in each group, six of them pushed', ok === true && af.flag === 1 && af.have === 18 && af.order && af.grp === '9/9' && af.focus === 'daegu-univ,anseong-jinchon,pangyo,seongsu-philosophy,seongsu-taehwa,seongsu-bldg' && af.asof === '2026.11.24', af);
  check('판교 and 부산 are written over (name, stage, sheet) and keep their schedule, owner and partners', af.names === '메타인프라 아산 IDC|부산 기장 데이터센터|판교 AIDC|성수동빌딩 DC' && af.stages === '인허가,사업구상,사업계획' && af.kpi === '5/5' && af.rows === 10 && af.plan === 6 && af.tasks > 50 && before.pangyo && af.owner === before.pangyo.owner && af.partners === before.pangyo.partners && /판교 사옥 B1/.test(af.sub), { af, before });
  check('인천 청라 and 햇빛, which are not in the list, are in the trash (30 days)', af.gone === 'true,true', af.gone);
  check('the old fields other screens read follow the sheet (address, 총사업비)', /아산스마트밸리/.test(af.loc) && af.cost === '2,801억원', { loc: af.loc, cost: af.cost });
  check('another member has them', await b.evaluate(ids => ids.every(k => PROJECTS[k]) && !PROJECTS.incheon && META_FLAGS.devReportV1 === 1, IDS));
  const n1 = await ev(() => Object.keys(PROJECTS).length); await ev(() => applyDevReportV1()); await sleep(900);
  check('a second run makes nothing twice', await ev(n => Object.keys(PROJECTS).length === n, n1));

  console.log('— as it shows');
  await ev(() => { S.pf = {}; S.q.proj = ''; go('main'); }); await sleep(900);
  if (!await ev(() => !!document.querySelector('.page.on .tbl.vt-rep'))) { await a.click('.page.on .projects [data-vt="proj:table"]'); await sleep(700); }
  // ten rows a page (twenty-eighth round): every page is read
  const pgs = []; for (let i = 1; i < 12; i++) { const p = await ev(() => { const box = document.querySelector('.page.on .projects'), t = box.querySelector('.tbl.vt-rep'), pg = box.querySelector('.pager'), rws = [...t.querySelectorAll('.rw')];
      return { cur: S.pjPage || 1, total: pg ? +pg.dataset.total : 1, rows: rws.map(r => r.dataset.go.slice(8)), grps: [...t.querySelectorAll('.grp')].map(g => g.dataset.grp + ':' + g.querySelector('span').textContent).join(), red: t.querySelectorAll('.rw.focus').length, tags: t.querySelectorAll('.rw .nm .fo').length, rq: t.querySelectorAll('em.rq').length, na: t.querySelectorAll('em.na').length, nil: t.querySelectorAll('.tx .nil').length,
        first: [...rws[0].children].map(c => c.textContent.trim()).slice(0, 4).join('|'), hd: [...t.querySelectorAll('.hd span')].map(x => x.textContent).join(), foot: !!box.querySelector('.rep-foot'), cnt: box.querySelector('.rep-n').textContent, all: Object.keys(PROJECTS).length,
        rqOwn: rws.every(r => [...r.querySelectorAll('em.rq')].every(e => getComputedStyle(e).color === getComputedStyle(r.querySelector('.nm')).color)) }; });
    pgs.push(p); if (p.cur >= p.total) break; await a.click(`.page.on .projects .pager [data-vpg="${p.cur + 1}"]`); await sleep(500); }
  const sum = k => pgs.reduce((n, p) => n + p[k], 0), listed = pgs.flatMap(p => p.rows), P0 = pgs[0], brief = pgs.map(p => ({ ...p, rows: p.rows.length }));
  check('the main page lists them as the list does, ten a page', P0.total === Math.ceil(P0.all / 10) && pgs.length === P0.total && pgs.every((p, i) => p.rows.length === Math.min(10, P0.all - 10 * i)) && new Set(listed).size === P0.all && IDS.every(k => listed.includes(k)) && sum('red') === 6 && sum('tags') === 6 && P0.first === '01AIDC|메타인프라 아산 IDC|충남 아산시|㈜메타인프라' && P0.cnt === String(P0.all) && sum('rq') > 5 && sum('na') === 0 && sum('nil') > 5, brief);
  check('no headings of groups, no 비고 column, no note below; 확인 필요 / 보완 필요 are in the colour of the row\'s project', pgs.every(p => p.grps === '') && P0.hd === 'NO.,프로젝트,위치,사업주체,대지면적(m²),연면적(m²),IT LOAD (수전용량),추진 단계,최초자료일' && !P0.foot && pgs.every(p => p.rqOwn), brief);
  await ev(() => { S.pjPage = 1; schProjRedraw(); }); await sleep(300);
  // eighteen colours, all different; the calendar's tags on one line, the rest behind a button
  const col = await ev(ids => ({ distinct: new Set(ids.map(k => PROJECTS[k].color)).size, pale: ids.filter(k => /^pj-c\d$/.test(PROJECTS[k].cls || '')).length }), IDS);
  check('the projects of the list all have a colour of their own', col.distinct === 18 && col.pale === 0, col);
  await ev(() => { S.calPillsOpen = false; go('main'); document.querySelector('#content').scrollTop = 0; refreshSec('cal'); }); await sleep(600);
  const pills = () => ev(() => { const b = document.querySelector('.page.on .cal > .filters'), btn = b.querySelector('[data-calpills]'), ps = [...b.querySelectorAll('.pill')], br = b.getBoundingClientRect(); return { h: Math.round(br.height / (LAYOUT.zoom || 1)), n: ps.length, seen: ps.filter(p => { const r = p.getBoundingClientRect(); return r.top >= br.top - 1 && r.bottom <= br.bottom + 1; }).length, btn: btn.hidden ? '' : btn.textContent, open: b.classList.contains('open') }; });
  const p0 = await pills(); await a.click('.page.on [data-calpills]'); await sleep(500); const p1 = await pills(); await a.click('.page.on [data-calpills]'); await sleep(500); const p2 = await pills();
  check('the main calendar shows one line of project tags; the button at its end says how many more, opens them all and folds them again', p0.h === 20 && p0.n >= 18 && p0.seen < p0.n && p0.btn === '+' + (p0.n - p0.seen) && !p0.open && p1.open && p1.seen === p1.n && p1.btn === '접기' && p1.h > 60 && !p2.open && p2.h === 20, { p0, p1, p2 });
  await ev(() => go('project:asan-idc')); await a.waitForFunction(() => S.page === 'project' && schReady('asan-idc'), null, { timeout: 20000 }); await sleep(900);
  const ov = await ev(() => { const p = document.querySelector('.page.on .phead'); return { h1: p.querySelector('h1').textContent, sub: !!p.querySelector('.rsub'), memo: (p.querySelector('.rtb:not(.plan) .r.memo') || {}).textContent || '', kpi: p.querySelectorAll('.rstats .rkp:not(.fin) .k').length, fin: p.querySelectorAll('.rstats .rkp.fin .k').length, rows: p.querySelectorAll('.rtb:not(.plan) .r:not(.ops):not(.memo)').length, plan: p.querySelectorAll('.rtb.plan .r:not(.th)').length, map: !!p.querySelector('.rtb .r .rmapbox iframe.map'), src: !!p.querySelector('.rsrc') || !!p.querySelector('.rnote'), meta: (p.querySelector('.rmeta') || {}).textContent.replace(/\s+/g, ' ').trim() }; });
  check('a project of the list opens with its sheet (no sub line under the name; 비고 is the last row of the table)', ov.h1 === '메타인프라 아산 IDC' && !ov.sub && /^비고실시설계 진단 완료/.test(ov.memo) && ov.kpi === 5 && ov.fin === 4 && ov.rows === 11 && ov.plan === 6 && ov.map && !ov.src && /^No\. 01\s*AIDC\s*추진 단계\s*인허가/.test(ov.meta) && /2024\.04\.22/.test(ov.meta), ov);
  await ev(() => { localStorage.removeItem('aidc-view'); for (const k of Object.keys(SCH_VIEW)) delete SCH_VIEW[k]; go('main'); }); await sleep(600);
  const errs = [...A.errs, ...B.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
