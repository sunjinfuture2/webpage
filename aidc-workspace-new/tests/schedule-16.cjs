// WorkSpace, sixteenth part (owner, 2026-11-24, the "twenty-fourth round"): the development review list —
//  - 추진 단계 (기초검토 … 인허가) took the place of the old 분류; a project has a group (AIDC / Small AIDC) and may be marked 집중 추진;
//  - the overview of a project is the sheet of the list: 요약, 핵심 지표, 사업성 지표, four texts, the table 사업 개요, 추진 일정, 리스크, 출처;
//    it is edited in place (rows added and taken away, the state of a step picked) and saved like before;
//  - "확인 필요" / "보완 필요" are written orange, "자료 없음" grey;
//  - the main page lists the projects as the list does (number, groups with their count, the pushed ones red), with pickers,
//    a search, an Excel file, and a data file (.json) that makes or updates projects in one go and can be written out again;
//  - the page as it was (?v=1) keeps its overview and offers the same stages.
// Needs wrangler dev on 127.0.0.1:8787. The data files of this suite are made up (no project of the company is in them).
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const fs = require('fs'), os = require('os'), path = require('path');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2', V1 = 'http://127.0.0.1:8787/?v=1';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RLA' + sfx, '열여섯 일', { url: V2 }), a = A.page;
  const B = await newUser(browser, 'RLB' + sfx, '열여섯 이', { url: V2 }), b = B.page;
  const ev = (f, x) => a.evaluate(f, x);
  const pops = () => ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()));
  const toastTxt = () => ev(() => (document.querySelector('#toast') || {}).textContent || '');
  const setText = (sel, t) => ev(([s, v]) => { const el = document.querySelector('.page.on .phead ' + s); el.focus(); el.innerText = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, t]);

  console.log('— the stages, and a project made with its group');
  await ev(() => { localStorage.removeItem('aidc-view'); for (const k of Object.keys(SCH_VIEW)) delete SCH_VIEW[k]; S.q.proj = ''; S.pf = {}; go('main'); }); await sleep(800);
  check('추진 단계 are the six of the list, in the order a project goes through them', await ev(() => PSTATUS_ORDER.join()) === '기초검토,사업구상,사업제안,사업계획,계통협의,인허가');
  await a.click('.page.on .projects .new-proj'); await sleep(400);
  const np = await ev(() => { const d = document.querySelector('#dlg.sch-np'); return d ? { grp: [...d.querySelectorAll('#np2-grp button')].map(x => x.textContent + (x.classList.contains('on') ? '*' : '')).join(), st: [...d.querySelectorAll('#np2-st button')].map(x => x.textContent).join(), labels: [...d.querySelectorAll('.np-f label')].map(x => x.textContent.replace('필수', '').trim()).join() } : null; });
  check('the window that makes a project asks for 구분 and 추진 단계', np && np.grp === 'AIDC*,Small AIDC' && np.st === '기초검토,사업구상,사업제안,사업계획,계통협의,인허가' && np.labels === '사업명,구분,추진 단계,담당자,부지', np);
  const NAME = '검토 시험 ' + sfx;
  await a.fill('#np2-name', NAME); await a.fill('#np2-site', '경기 시험시'); await a.click('.sch-np [data-grp="Small AIDC"]'); await a.click('.sch-np [data-st="사업제안"]'); await a.click('.sch-np [data-np2="ok"]'); await sleep(1000);
  const pid = await ev(() => S.proj);
  const made = await ev(id => ({ page: S.page, edit: !!S.editProj, st: PROJECTS[id].status, grp: PHEAD[id].grp, first: PHEAD[id].first, lsite: PHEAD[id].lsite }), pid);
  check('it is made with its group, its stage and today as 최초자료일, and opens for its overview', made.page === 'project' && made.edit && made.st === '사업제안' && made.grp === 'Small AIDC' && /^\d{4}\.\d{2}\.\d{2}$/.test(made.first) && made.lsite === '경기 시험시', made);

  console.log('— the overview while it is edited');
  const ed0 = await ev(() => { const p = document.querySelector('.page.on .phead'); return { rep: p.classList.contains('rep'), ed: p.classList.contains('ed'), titles: [...p.querySelectorAll('.rt')].map(x => x.textContent).join(), rows: [...p.querySelectorAll('.rtb:not(.plan) .r > b')].map(x => x.textContent).join(), adds: [...p.querySelectorAll('[data-repadd]')].map(x => x.dataset.repadd).join() }; });
  check('the sheet of the list: its blocks, the table with the usual rows, a button to add to each list', ed0.rep && ed0.ed && ed0.titles === '요약,핵심 지표,사업성 지표,위치 지도,사업 개요,입지 및 전력 인프라,사업 구조 및 수익 모델,추진 현황 및 주요 특성,협력업체,사업 개요 표,추진 일정,주요 리스크 및 검토사항' && ed0.rows === '위치,용도지역,대지면적,연면적,건폐율 / 용적률,규모,사업주체,운영사 / 임차인,수전 계획' && ed0.adds === 'kpi,fin,rows,plan', ed0);
  await setText('.rsub', '시험용 소형 데이터센터 ' + sfx);
  await setText('[data-k="ldev"]', '보완 필요 (시험 주체 ' + sfx + ')'); await setText('[data-k="larea"]', '1,234'); await setText('[data-k="lgfa"]', '자료 없음'); await setText('[data-k="lload"]', '5MW (수전 9MW)'); await setText('[data-k="memo"]', '검사 비고 ' + sfx);
  await a.click('.page.on .phead [data-repadd="kpi"]'); await sleep(300);
  check('+ 지표 adds a row and puts the caret in it', await ev(() => document.activeElement && document.activeElement.dataset.k) === 'kpi:0:0');
  await setText('[data-k="kpi:0:0"]', '5MW / 9MW'); await setText('[data-k="kpi:0:1"]', 'IT Load / 수전용량');
  await a.click('.page.on .phead [data-repadd="kpi"]'); await sleep(300);   // a second one that stays empty
  check('what was typed stays when another row is added', await ev(() => [...document.querySelectorAll('.page.on .phead [data-k^="kpi:"]')].map(x => x.textContent).join('|')) === '5MW / 9MW|IT Load / 수전용량||');
  await a.click('.page.on .phead [data-repadd="fin"]'); await sleep(300);
  await setText('[data-k="fin:0:0"]', '확인 필요 (100억 / 120억)'); await setText('[data-k="fin:0:1"]', '총사업비 (추정)');
  await setText('[data-k="rows:0:1"]', '경기 시험시 시험동 12-3');
  await a.click('.page.on .phead .rtb .r:has([data-k="rows:5:0"]) [data-repdel]'); await sleep(300);
  check('the x of a row takes the row away', await ev(() => [...document.querySelectorAll('.page.on .phead .rtb:not(.plan) .r > b')].map(x => x.textContent).join()) === '위치,용도지역,대지면적,연면적,건폐율 / 용적률,사업주체,운영사 / 임차인,수전 계획');
  await a.click('.page.on .phead [data-repadd="plan"]'); await sleep(300);
  await setText('[data-k="plan:0:0"]', '2027.03'); await setText('[data-k="plan:0:1"]', '착공');
  await a.click('.page.on .phead [data-repstate]'); await sleep(300);
  const stMenu = await pops();
  await a.click('.pop .it:has-text("목표")'); await sleep(300);
  check('the state of a step is picked from 완료 · 진행 · 예정 · 목표', stMenu.join() === '완료,진행,예정,목표' && await ev(() => document.querySelector('.page.on .phead [data-repstate]').textContent.trim()) === '목표', stMenu);
  await setText('[data-k="main"]', '시험용 사업 개요 문단.'); await setText('[data-k="infra"]', '수전 9MW 계획\n변전소 2km'); await setText('[data-k="risk"]', '임차인 자료 없음'); await setText('[data-k="src"]', '시험 자료 1\n시험 자료 2');
  await a.click('.page.on .phead [data-repfocus]'); await sleep(300);
  await a.click('.page.on .phead [data-reppick="grp"]'); await sleep(300); const grpMenu = await pops(); await a.keyboard.press('Escape'); await sleep(200);
  check('집중 추진 is a switch, the group a menu', await ev(() => document.querySelector('.page.on .phead [data-repfocus]').classList.contains('on')) && grpMenu.join() === 'AIDC,Small AIDC', grpMenu);
  await a.click('.page.on .phead [data-editproj]'); await sleep(1600);
  const sv = await ev(id => { const h = PHEAD[id]; return { edit: !!S.editProj, kpi: JSON.stringify(h.kpi), fin: JSON.stringify(h.fin), rows: h.rows.map(r => r[0]).join(), plan: JSON.stringify(h.plan), loc: h.loc, cost: h.cost, dev: h.dev, focus: h.focus, sub: h.sub, infra: h.infra, src: h.src }; }, pid);
  check('저장: the lists as typed (an empty row is gone), and the old fields other screens read follow the table', !sv.edit && sv.kpi === '[["5MW / 9MW","IT Load / 수전용량"]]' && sv.fin === '[["확인 필요 (100억 / 120억)","총사업비 (추정)"]]' && sv.rows === '위치,용도지역,대지면적,연면적,건폐율 / 용적률,사업주체,운영사 / 임차인,수전 계획' && sv.plan === '[["2027.03","착공","목표"]]' && sv.loc === '경기 시험시 시험동 12-3' && sv.cost === '확인 필요 (100억 / 120억)' && sv.focus === true && sv.sub === '시험용 소형 데이터센터 ' + sfx && sv.infra === '수전 9MW 계획\n변전소 2km' && sv.src === '시험 자료 1\n시험 자료 2', sv);

  console.log('— the overview as it is read');
  const vw = await ev(() => { const p = document.querySelector('.page.on .phead'), q = s => p.querySelector(s), t = s => (q(s) || {}).textContent || '', cal = document.querySelector('.page.on [data-sec="cal"]');
    return { meta: [...p.querySelectorAll('.rmeta .m')].map(x => x.textContent.trim()).join('|'), sub: t('.rsub'), kpi: t('.rkp:not(.fin) .k b'), finRq: t('.rkp.fin .k b em.rq'), devRq: !!p.querySelector('.rb.sum .fr .v em.rq'), na: [...p.querySelectorAll('em.na')].length, infra: [...p.querySelectorAll('.rc2 .rb:nth-child(2) .rul li')].map(x => x.textContent).join('|'),
      planSt: (q('.rtb.plan .r:not(.th) i .sch-st') || {}).className, src: t('.rsrc span'), flow: Math.round(cal.getBoundingClientRect().top - p.getBoundingClientRect().bottom), editables: p.querySelectorAll('[contenteditable]').length, ops: !!p.querySelector('.rb.sum [data-sch="ops"]') }; });
  check('number, group, 집중 추진, stage, owner and the two dates in one line under the title; the sub title', /^No\. \d\d\|Small AIDC\|집중 추진\|추진 단계사업제안\|담당자열여섯 일\|최초자료일\d{4}\.\d{2}\.\d{2}\|기준일-$/.test(vw.meta) && vw.sub === '시험용 소형 데이터센터 ' + sfx, vw);
  check('the three marks are coloured by themselves; several lines are a list; a step shows its state', vw.kpi === '5MW / 9MW' && vw.finRq === '확인 필요' && vw.devRq && vw.na >= 2 && vw.infra === '수전 9MW 계획|변전소 2km' && /st-cond/.test(vw.planSt) && /시험 자료 1\s*\/\s*시험 자료 2/.test(vw.src), vw);
  check('the overview is as tall as what it says (the calendar stands below it) and nothing is editable while it is read', vw.flow >= 0 && vw.flow < 40 && vw.editables === 0 && vw.ops, vw);
  await sleep(600);
  const bSees = await b.evaluate(id => PROJECTS[id] && PHEAD[id] ? { st: PROJECTS[id].status, kpi: JSON.stringify(PHEAD[id].kpi), plan: JSON.stringify(PHEAD[id].plan), grp: PHEAD[id].grp, focus: PHEAD[id].focus } : null, pid);
  check('another member has it', bSees && bSees.st === '사업제안' && bSees.kpi === sv.kpi && bSees.plan === sv.plan && bSees.grp === 'Small AIDC' && bSees.focus === true, bSees);

  console.log('— the list of the main page');
  await ev(() => go('main')); await sleep(700); await a.click('.page.on .projects [data-vt="proj:table"]'); await sleep(700);
  const tb = await ev(id => { const box = document.querySelector('.page.on .projects'), t = box.querySelector('.tbl.vt-rep'), rw = t.querySelector(`.rw[data-go="project:${id}"]`), all = orderedProjects();
    return { hd: [...t.querySelectorAll('.hd span')].map(x => x.textContent).join(), grps: [...t.querySelectorAll('.grp')].map(g => g.dataset.grp + ':' + g.querySelector('span').textContent).join(), counts: ['AIDC', 'Small AIDC', ''].map(g => all.filter(k => schRepOf(k).grp === g).length).join(), rows: t.querySelectorAll('.rw').length, all: all.length,
      mine: rw ? { cells: [...rw.children].map(c => c.textContent.trim()).join('|'), focus: rw.classList.contains('focus'), no: rw.querySelector('.no span').textContent === schRepNos()[id], noBg: getComputedStyle(rw.querySelector('.no span')).backgroundColor, rq: !!rw.querySelector('em.rq'), na: !!rw.querySelector('em.na') } : null, cnt: box.querySelector('.rep-cnt').textContent, foot: !!box.querySelector('.rep-foot'), pager: !!box.querySelector('[data-vpg]') }; }, pid);
  check('the table has the columns of the list and all projects on one page', tb.hd === 'NO.,프로젝트,위치,사업주체,대지면적(m²),연면적(m²),IT LOAD (수전용량),추진 단계,최초자료일,비고' && tb.rows === tb.all && !tb.pager && tb.foot && new RegExp(`총 ${tb.all}건`).test(tb.cnt), tb);
  const [nA, nS, nX] = tb.counts.split(',').map(Number);
  check('grouped: AIDC 프로젝트, Small AIDC (and the ones without a group), each with its count', tb.grps === [nA ? `AIDC:${nA}건` : '', nS ? `Small AIDC:${nS}건` : '', nX ? `:${nX}건` : ''].filter(Boolean).join(), tb);
  check('the row of the project: its cells, its number, red because it is being pushed, the marks coloured', tb.mine && new RegExp(`^\\d\\d\\|${NAME}\\|경기 시험시\\|보완 필요 \\(시험 주체 ${sfx}\\)\\|1,234\\|자료 없음\\|5MW \\(수전 9MW\\)\\|사업제안\\|\\d{4}\\.\\d{2}\\.\\d{2}\\|검사 비고 ${sfx}$`).test(tb.mine.cells) && tb.mine.focus && tb.mine.no && tb.mine.noBg === 'rgb(217, 32, 46)' && tb.mine.rq && tb.mine.na, tb.mine);
  await a.fill('.page.on .projects input[data-q="proj"]', '시험 주체 ' + sfx); await sleep(400);
  check('the search looks into 사업주체 too', await ev(() => document.querySelectorAll('.page.on .tbl.vt-rep .rw').length) === 1);
  await a.fill('.page.on .projects input[data-q="proj"]', ''); await sleep(300);
  const pick = async (k, label) => { await a.click(`.page.on .projects [data-ppick="${k}"]`); await sleep(300); const items = await pops(); await a.click(`.pop .it:has-text("${label}")`); await sleep(500); return items; };
  const rowsNow = () => ev(() => ({ n: document.querySelectorAll('.page.on .tbl.vt-rep .rw').length, grp: [...new Set([...document.querySelectorAll('.page.on .tbl.vt-rep .rw')].map(r => schRepOf(r.dataset.go.slice(8)).grp))].join(), focus: [...document.querySelectorAll('.page.on .tbl.vt-rep .rw')].every(r => r.classList.contains('focus')), chips: [...document.querySelectorAll('.page.on .projects [data-pchip]')].map(x => x.textContent.replace('✕', '').trim()).join(), heads: document.querySelectorAll('.page.on .tbl.vt-rep .grp').length }));
  const gm = await pick('grp', 'Small AIDC'), g1 = await rowsNow();
  check('구분 narrows the list to one group', gm.join() === '전체 구분,AIDC,Small AIDC' && g1.n === nS && g1.grp === 'Small AIDC' && g1.chips === '구분: Small AIDC' && g1.heads === 1, { gm, g1 });
  await pick('focus', '집중 추진만'); const g2 = await rowsNow();
  check('집중 추진만 leaves the red ones', g2.n >= 1 && g2.n <= nS && g2.focus && g2.chips === '구분: Small AIDC,집중 추진만', g2);
  await a.click('.page.on .projects [data-pchip="grp"]'); await sleep(300); await a.click('.page.on .projects [data-pchip="focus"]'); await sleep(300);
  const rm = await pick('region', '경기'), g3 = await rowsNow();
  check('위치 lists 시·도 and narrows to one', rm[0] === '전체 위치' && rm.includes('경기') && g3.n >= 1 && g3.chips === '위치: 경기' && await ev(() => [...document.querySelectorAll('.page.on .tbl.vt-rep .rw')].every(r => schRepRegion(r.dataset.go.slice(8)) === '경기')), { rm, g3 });
  await a.click('.page.on .projects [data-pchip="region"]'); await sleep(300);
  const sm = await pick('st', '사업제안'), g4 = await rowsNow();
  check('추진 단계 lists the stages that are in use', sm[0] === '전체 단계' && sm.includes('사업제안') && g4.n >= 1 && g4.chips === '추진 단계: 사업제안', { sm, g4 });
  await a.click('.page.on .projects [data-pchip="st"]'); await sleep(300);
  await a.click('.page.on .tbl.vt-rep [data-vcol="proj:first"]'); await sleep(300); const fm = await pops(); await a.click('.pop .it:has-text("최초자료일 최근 순")'); await sleep(500);
  const g5 = await ev(() => ({ heads: document.querySelectorAll('.page.on .tbl.vt-rep .grp').length, keys: [...document.querySelectorAll('.page.on .tbl.vt-rep .rw')].map(r => schRepKey(schRepOf(r.dataset.go.slice(8)).first).replace('9999', '0000')), sorted: [...document.querySelectorAll('.page.on .tbl.vt-rep .hd .sorted')].map(x => x.textContent).join() }));
  check('the column 최초자료일 orders the whole list, newest first, without the groups', fm.join() === '기본 순서 (번호순),최초자료일 최근 순' && g5.heads === 0 && g5.keys.every((k, i) => !i || g5.keys[i - 1] >= k) && g5.sorted === '최초자료일', { fm, g5 });
  await a.click('.page.on .projects [data-pchip="sort"]'); await sleep(300);
  const [dl] = await Promise.all([a.waitForEvent('download'), a.click('.page.on .projects [data-pjxl]')]);
  check('엑셀로 내보내기 hands over a workbook', /^프로젝트 목록_\d{4}-\d{2}-\d{2}\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  await a.click('.page.on .projects [data-vt="proj:cards"]'); await sleep(700);
  const cd = await ev(id => { const c = document.querySelector(`.page.on #proj-inner .pcard[data-go="project:${id}"]`); return c ? { no: c.querySelector('h3 em').textContent === schRepNos()[id], name: c.querySelector('h3').textContent, sub: c.querySelector('.sub').textContent, st: c.querySelector('.st').textContent, fo: !!c.querySelector('.fo'), labels: [...c.querySelectorAll('.info b')].map(x => x.textContent).join(), rq: !!c.querySelector('.info em.rq') } : null; }, pid);
  check('a card: number and name, group and sub title, the stage, 집중 추진, the cells of the list', cd && cd.no && cd.name.endsWith(NAME) && cd.sub === 'Small AIDC · 시험용 소형 데이터센터 ' + sfx && cd.st === '사업제안' && cd.fo && cd.labels === '위치,사업주체,대지면적,연면적,IT LOAD,최초자료일' && cd.rq, cd);

  console.log('— a data file of the list');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rep16-')), idA = 't16a' + sfx, idB = 't16b' + sfx;
  const entry = (id, name, more) => ({ id, name, grp: 'AIDC', focus: false, sub: '자료 파일 시험', stage: '인허가', first: '2020.01.02', asof: '2026.11.01', list: { site: '충남 시험군', dev: '㈜시험', area: '100', gfa: '200', load: '1MW (수전 2MW)', memo: '파일에서 옴' },
    kpi: [['1MW / 2MW', 'IT Load / 수전용량'], ['200m²', '연면적']], fin: [['10억원', '총사업비 (가정)'], ['자료 없음', '사업 수익률']], finNote: '* 시험 수치', ov: '파일로 만든 사업.', infra: ['수전 2MW', '변전소 1km'], model: '임대형.', stat: ['검토 중', '부지 확인'],
    rows: [['위치', '충남 시험군 시험리 1'], ['용도지역', '계획관리지역'], ['사업주체', '㈜시험']], plan: [['2026.01', '검토', '완료'], ['2027.01', '착공', '예정']], risk: ['수전 미확정'], src: ['시험 보고서 (2026.11)'], ...more });
  const file1 = path.join(dir, 'list-1.json'), file2 = path.join(dir, 'list-2.json'), file3 = path.join(dir, 'wrong.json'), file4 = path.join(dir, 'list-4.json');
  fs.writeFileSync(file1, JSON.stringify({ kind: 'aidc-dev-report', v: 1, asof: '2026.11.24', projects: [entry(idA, '자료 시험 A ' + sfx), entry(idB, '자료 시험 B ' + sfx, { grp: 'Small AIDC', focus: true, stage: '기초검토', first: '2020.01' })] }));
  fs.writeFileSync(file2, JSON.stringify({ kind: 'aidc-dev-report', v: 1, asof: '2026.11.24', projects: [entry(idA, '자료 시험 A ' + sfx, { stage: '계통협의', list: { site: '충남 시험군', dev: '㈜시험', area: '100', gfa: '200', load: '1MW (수전 2MW)', memo: '두 번째 파일' } }), entry('', '자료 시험 C ' + sfx, { match: [NAME], grp: 'Small AIDC', stage: '사업계획', first: '2021.05.05' })] }));
  fs.writeFileSync(file3, JSON.stringify({ projects: [{ name: 'x' }] }));
  fs.writeFileSync(file4, JSON.stringify({ kind: 'aidc-dev-report', v: 1, others: 'trash', projects: [entry(idA, '자료 시험 A ' + sfx)] }));
  const choose = async file => { await a.click('.page.on .projects [data-repio]'); await sleep(300); const items = await pops(); const [fc] = await Promise.all([a.waitForEvent('filechooser'), a.click('.pop .it >> nth=0')]); await fc.setFiles(file); await sleep(700); return items; };
  const ask = () => ev(() => { const d = document.querySelector('#dlg.sch-repin'); return d ? { g: [...d.querySelectorAll('.g > b')].map(x => x.textContent).join(), li: [...d.querySelectorAll('.g li')].map(x => x.textContent.trim()), ck: (d.querySelector('#rin-others') || {}).checked } : null; });
  const before = await ev(() => Object.keys(PROJECTS).length);
  const menu = await choose(file1), q1 = await ask();
  check('자료 파일 offers to take a file in and to write one out; the window says what will happen first', menu.join() === '자료 파일 가져오기 (.json),자료 파일로 내보내기 (.json)' && q1 && q1.g === `새로 만들기 2건,파일에 없는 프로젝트 ${before}건` && q1.ck === false && await ev(n => Object.keys(PROJECTS).length === n, before), { menu, q1 });
  await a.click('#dlg [data-rin="ok"]'); await sleep(1500);
  const im1 = await ev(([x, y]) => { const p = PROJECTS[x], h = PHEAD[x], q = PROJECTS[y]; return p && q ? { n: Object.keys(PROJECTS).length, st: p.status, full: p.full, kpi: JSON.stringify(h.kpi), infra: h.infra, stat: h.stat, loc: h.loc, cost: h.cost, lload: h.lload, plan: h.plan.length, noA: schRepNos()[x], firstSmall: orderedProjects().filter(k => schRepOf(k).grp === 'Small AIDC')[0] === y, asof: META_FLAGS.repAsof, trash: Object.keys(SETTINGS.projTrash || {}).filter(k => k === x || k === y).length, qFocus: PHEAD[y].focus } : null; }, [idA, idB]);
  check('가져오기 makes the projects with everything the file says, and nothing else is touched', im1 && im1.n === before + 2 && im1.st === '인허가' && im1.full === '자료 시험 A ' + sfx && im1.kpi === '[["1MW / 2MW","IT Load / 수전용량"],["200m²","연면적"]]' && im1.infra === '수전 2MW\n변전소 1km' && im1.stat === '검토 중\n부지 확인' && im1.loc === '충남 시험군 시험리 1' && im1.cost === '10억원' && im1.plan === 2 && im1.qFocus === true && /가져왔습니다 · 새로 만들기 2건 · 덮어쓰기 0건/.test(await toastTxt()), im1);
  check('the oldest 최초자료일 of a group is its first number; the day of the list stands beside the title', im1 && im1.noA === '01' && im1.firstSmall && im1.asof === '2026.11.24' && /기준일 2026\.11\.24 · 총 \d+건/.test(await ev(() => document.querySelector('.page.on .rep-cnt').textContent)), im1);
  await sleep(700);
  check('another member has them', await b.evaluate(([x, y]) => !!(PROJECTS[x] && PROJECTS[y] && PHEAD[x].rows.length === 3), [idA, idB]));
  await ev(id => { PHEAD[id].partners = ['시험 협력사']; }, pid); await sleep(600);
  await choose(file2); const q2 = await ask();
  check('a second file: a project with the same id, or the name it had, is written over (not made twice)', q2 && q2.g.startsWith('덮어쓰기 2건') && q2.li.some(x => x.includes('자료 시험 C ' + sfx) && x.includes('← ' + NAME)), q2);
  await a.click('#dlg [data-rin="ok"]'); await sleep(1500);
  const im2 = await ev(([x, p]) => ({ n: Object.keys(PROJECTS).length, st: PROJECTS[x].status, memo: PHEAD[x].memo, name: PROJECTS[p].full, pst: PROJECTS[p].status, pk: JSON.stringify(PHEAD[p].kpi), partners: PHEAD[p].partners.join(), owner: PHEAD[p].owner, first: PHEAD[p].first }), [idA, pid]);
  check('written over: the overview is the file\'s, the name too; 담당자 and 협력업체 stay', im2.n === before + 2 && im2.st === '계통협의' && im2.memo === '두 번째 파일' && im2.name === '자료 시험 C ' + sfx && im2.pst === '사업계획' && im2.pk === '[["1MW / 2MW","IT Load / 수전용량"],["200m²","연면적"]]' && im2.partners === '시험 협력사' && im2.owner === '열여섯 일' && im2.first === '2021.05.05', im2);
  await choose(file3); await sleep(300);
  check('a file that is not a list is refused', /자료 파일이 아닙니다/.test(await toastTxt()) && !await ev(() => !!document.querySelector('#dlg.sch-repin')));
  await choose(file4); const q4 = await ask();
  check('a file may ask for the others to go to the trash: the box is ticked, and 취소 changes nothing', q4 && q4.ck === true && /파일에 없는 프로젝트 \d+건/.test(q4.g), q4);
  await a.click('#dlg [data-rin="x"]'); await sleep(300);
  check('취소: nothing happened', await ev(n => Object.keys(PROJECTS).length === n && !document.querySelector('#dlg'), before + 2));
  await a.click('.page.on .projects [data-repio]'); await sleep(300);
  const [dj] = await Promise.all([a.waitForEvent('download'), a.click('.pop .it >> nth=1')]);
  const out = JSON.parse(fs.readFileSync(await dj.path(), 'utf8')), oa = out.projects.find(p => p.id === idA);
  check('내보내기 writes the same kind of file: what was taken in comes out again', /^AIDC 프로젝트 개발검토 리스트_.*\.json$/.test(dj.suggestedFilename()) && out.kind === 'aidc-dev-report' && out.projects.length === before + 2 && oa && oa.name === '자료 시험 A ' + sfx && oa.stage === '계통협의' && oa.list.memo === '두 번째 파일' && JSON.stringify(oa.infra) === '["수전 2MW","변전소 1km"]' && JSON.stringify(oa.plan) === '[["2026.01","검토","완료"],["2027.01","착공","예정"]]' && oa.ov === '파일로 만든 사업.' && oa.model === '임대형.', { name: dj.suggestedFilename(), oa });

  console.log('— the page as it was');
  const C = await newUser(browser, 'RLC' + sfx, '열여섯 삼', { url: V1 }), c = C.page;
  await c.evaluate(id => go('project:' + id), pid); await sleep(1200);
  const old = await c.evaluate(() => { const p = document.querySelector('.page.on .phead'); return { rep: p.classList.contains('rep'), labels: [...p.querySelectorAll('.col .fr > b')].map(x => x.textContent).join(), loc: (p.querySelector('.col1 .fr:last-child .v') || {}).textContent }; });
  check('without the switch the overview is the one from before, fed by the same record', !old.rep && old.labels.startsWith('분류,진행도,담당자,대상위치,용도지역,사업형태,사업시행자') && old.loc === '충남 시험군 시험리 1', old);
  await c.click('.page.on .phead [data-editproj]'); await sleep(900); await c.click('.page.on .phead [data-pickstatus]'); await sleep(300);
  const oldSt = await c.evaluate(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()).join());
  check('its 분류 offers the same stages', oldSt === '기초검토,사업구상,사업제안,사업계획,계통협의,인허가', oldSt);
  await c.keyboard.press('Escape'); await sleep(200); await c.click('.page.on .phead [data-canceledit]'); await sleep(600);

  // clean up: the projects of this run to the trash, the view back to cards
  await ev(ids => { for (const id of ids) if (PROJECTS[id]) trashProject(id); localStorage.removeItem('aidc-view'); for (const k of Object.keys(SCH_VIEW)) delete SCH_VIEW[k]; S.pf = {}; S.q.proj = ''; go('main'); }, [pid, idA, idB]); await sleep(1200);
  const errs = [...A.errs, ...B.errs, ...C.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
