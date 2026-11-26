// WorkSpace, sixteenth part (owner, 2026-11-24, the "twenty-fourth round"): the development review list —
//  - 추진 단계 (기초검토 … 인허가) took the place of the old 분류; a project has a group (AIDC / Small AIDC) and may be marked 집중 추진;
//  - the overview of a project is the sheet of the list: 요약, 핵심 지표, 사업성 지표, four texts, the table 사업 개요, 추진 일정, 리스크, 출처;
//    it is edited in place (rows added and taken away, the state of a step picked) and saved like before;
//  - "확인 필요" / "보완 필요" are written orange, "자료 없음" grey;
//  - the main page lists the projects as the list does (number, groups with their count, the pushed ones red), with pickers,
//    a search, an Excel file, and a data file (.json) that makes or updates projects in one go and can be written out again;
//  - the page as it was (?v=1) keeps its overview and offers the same stages;
//  - (twenty-fifth round) the sections of the main page keep one distance between title, pickers and content (the action section's);
//    a project card has a star (the page's favourite) and starred cards stand first;
//  - saving an overview reads the overview's own fields only (the schedule sections below use data-k too);
//  - (twenty-sixth round) the overview has no 요약: the figures are a band, the map stands in the row 위치, the cells of the list follow
//    the sheet unless they are given a short form while it is edited; the sections of a project page keep the same distances;
//    a project can be made with a PDF;
//  - (twenty-seventh round) a project that is made gets a colour of its own; the title 프로젝트 carries the number listed; the star
//    of a card has no box; cards carry no number and no sub line; 집중 추진 is a small mark in the table; 자료 없음 is a dash in the list.
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
  check('the window that makes a project asks for 구분 and 추진 단계', np && np.grp === 'AIDC*,Small AIDC' && np.st === '기초검토,사업구상,사업제안,사업계획,계통협의,인허가' && np.labels === '사업명,구분,추진 단계,담당자', np);
  const NAME = '검토 시험 ' + sfx;
  // (thirty-third round) a field for a document stands above the inputs; 부지 and the PDF that was only attached are gone;
  // the button is on only when there is a name, or a document that could be read
  const npw = () => ev(() => { const d = document.querySelector('#dlg.sch-np'); return { ok: !d.querySelector('[data-np2="ok"]').disabled, drop: !!d.querySelector('[data-docdrop]'), say: (d.querySelector('[data-docdrop]') || {}).textContent.trim(), site: !!d.querySelector('#np2-site'), pdf: !!d.querySelector('#np2-pdf'), err: (d.querySelector('.np-doc .up-nt.err') || {}).textContent || '', has: !!d.querySelector('[data-docdrop].has') }; });
  const n0 = await npw(); await a.fill('#np2-name', NAME); await sleep(150); const n1 = await npw(); await a.fill('#np2-name', ''); await sleep(150); const n2 = await npw();
  check('a field for a PDF or an Excel document; no 부지, no attached PDF; the button is on once there is a name', n0.drop && /PDF 또는 엑셀 문서/.test(n0.say) && !n0.site && !n0.pdf && n0.ok === false && n1.ok === true && n2.ok === false, { n0, n1, n2 });
  await a.setInputFiles('#dlg [data-docfile]', { name: '메모.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }); await sleep(400); const n3 = await npw();
  check('a file that is neither is told so and does not turn the button on', n3.has && /PDF 또는 엑셀\(\.xlsx\) 파일만 올릴 수 있습니다/.test(n3.err) && n3.ok === false, n3);
  await a.click('#dlg [data-docrm]'); await sleep(200);
  await a.fill('#np2-name', NAME); await a.click('.sch-np [data-grp="Small AIDC"]'); await a.click('.sch-np [data-st="사업제안"]');
  const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
  await a.click('.sch-np [data-np2="ok"]'); await a.waitForFunction(() => S.page === 'project' && !document.querySelector('#dlg'), null, { timeout: 15000 }); await sleep(900);
  const pid = await ev(() => S.proj);
  const made = await ev(id => ({ page: S.page, edit: !!S.editProj, st: PROJECTS[id].status, grp: PHEAD[id].grp, first: PHEAD[id].first, lsite: PHEAD[id].lsite }), pid);
  check('it is made with its group, its stage and today as 최초자료일, and opens for its overview', made.page === 'project' && made.edit && made.st === '사업제안' && made.grp === 'Small AIDC' && /^\d{4}\.\d{2}\.\d{2}$/.test(made.first) && made.lsite === '', made);
  // a PDF is attached in the overview now (the window that makes a project has no such row any more)
  { const [fc] = await Promise.all([a.waitForEvent('filechooser'), a.click('.page.on .phead .rdocs [data-docadd]')]); await fc.setFiles({ name: '검토 자료 ' + sfx + '.pdf', mimeType: 'application/pdf', buffer: PDF }); await a.waitForFunction(id => (PHEAD[id].docs || []).length === 1, pid, { timeout: 15000 }); await sleep(500); }
  const doc0 = await ev(async id => { const d = (PHEAD[id].docs || [])[0], el = document.querySelector('.page.on .phead .rdocs .rd'); if (!d) return null; const r = await fetch('/api/file/' + d.id); return { n: PHEAD[id].docs.length, name: d.name, size: d.size, row: el && el.textContent, href: el && el.querySelector('a.nm').getAttribute('href'), status: r.status, type: r.headers.get('Content-Type'), bytes: (await r.arrayBuffer()).byteLength, x: !!document.querySelector('.page.on .phead .rdocs [data-docdel]'), add: !!document.querySelector('.page.on .phead .rdocs [data-docadd]') }; }, pid);
  check('the PDF is the project\'s: stored, listed in the overview with a link that opens it, and can be taken away or added to while it is edited', doc0 && doc0.n === 1 && doc0.name === '검토 자료 ' + sfx + '.pdf' && doc0.status === 200 && /pdf/.test(doc0.type || '') && doc0.bytes === doc0.size && doc0.href === `/api/file/${await ev(id => PHEAD[id].docs[0].id, pid)}?inline=1` && doc0.x && doc0.add, doc0);

  console.log('— the overview while it is edited');
  const ed0 = await ev(() => { const p = document.querySelector('.page.on .phead'); return { rep: p.classList.contains('rep'), ed: p.classList.contains('ed'), titles: [...p.querySelectorAll('.rt')].map(x => x.textContent).join(), rows: [...p.querySelectorAll('.rtb:not(.plan) .r:not(.ops) > b')].map(x => x.textContent).join(), ops: !!p.querySelector('.rtb .r.ops'), adds: [...p.querySelectorAll('[data-repadd]')].map(x => x.dataset.repadd).join(), addBtn: [...p.querySelectorAll('.radd')].map(b => getComputedStyle(b).fontWeight + '/' + getComputedStyle(b).paddingLeft + '/' + getComputedStyle(b).height).filter((v, i, l) => l.indexOf(v) === i).join(), addN: p.querySelectorAll('.radd').length, src: !!p.querySelector('[data-k="src"]') || !!p.querySelector('[data-k="finNote"]') }; });
  check('the sheet of the list: its blocks, the table with the usual rows, a button to add to each list', ed0.rep && ed0.ed && ed0.titles === '메인 페이지 목록에 표시되는 값,핵심 지표,사업성 지표,사업 개요,추진 일정,입지 및 전력 인프라,사업 구조 및 수익 모델,추진 현황 및 주요 특성,주요 리스크 및 검토사항,협력업체,첨부 자료 (PDF)' && ed0.rows === '위치,용도지역,대지면적,연면적,건폐율 / 용적률,규모,사업주체,운영사 / 임차인,수전 계획,비고' && ed0.adds === 'kpi,fin,rows,plan' && ed0.addN === 6 && ed0.addBtn === '500/0px/28px' && !ed0.src, ed0);
  await setText('[data-k="lsite"]', '경기 시험시'); await setText('[data-k="ldev"]', '보완 필요 (시험 주체 ' + sfx + ')'); await setText('[data-k="larea"]', '1,234'); await setText('[data-k="lgfa"]', '자료 없음'); await setText('[data-k="lload"]', '5MW (수전 9MW)'); await setText('[data-k="memo"]', '검사 비고 ' + sfx);
  await a.click('.page.on .phead [data-repadd="kpi"]'); await sleep(300);
  check('the "+" of the figures adds a row and puts the caret in it', await ev(() => document.activeElement && document.activeElement.dataset.k) === 'kpi:0:0');
  await setText('[data-k="kpi:0:0"]', '5MW / 9MW'); await setText('[data-k="kpi:0:1"]', 'IT Load / 수전용량');
  await a.click('.page.on .phead [data-repadd="kpi"]'); await sleep(300);   // a second one that stays empty
  check('what was typed stays when another row is added', await ev(() => [...document.querySelectorAll('.page.on .phead [data-k^="kpi:"]')].map(x => x.textContent).join('|')) === '5MW / 9MW|IT Load / 수전용량||');
  await a.click('.page.on .phead [data-repadd="fin"]'); await sleep(300);
  await setText('[data-k="fin:0:0"]', '확인 필요 (100억 / 120억)'); await setText('[data-k="fin:0:1"]', '총사업비 (추정)');
  await setText('[data-k="rows:0:1"]', '경기 시험시 시험동 12-3');
  await a.click('.page.on .phead .rtb .r:has([data-k="rows:5:0"]) [data-repdel]'); await sleep(300);
  check('the x of a row takes the row away (비고 is the table\'s own last row and has no x)', await ev(() => [...document.querySelectorAll('.page.on .phead .rtb:not(.plan) .r:not(.ops) > b')].map(x => x.textContent).join()) === '위치,용도지역,대지면적,연면적,건폐율 / 용적률,사업주체,운영사 / 임차인,수전 계획,비고' && await ev(() => !document.querySelector('.page.on .phead .rtb .r.memo [data-repdel]')));
  await a.click('.page.on .phead [data-repadd="plan"]'); await sleep(300);
  await setText('[data-k="plan:0:0"]', '2027.03'); await setText('[data-k="plan:0:1"]', '착공');
  await a.click('.page.on .phead [data-repstate]'); await sleep(300);
  const stMenu = await pops();
  await a.click('.pop .it:has-text("목표")'); await sleep(300);
  check('the state of a step is picked from 완료 · 진행 · 예정 · 목표', stMenu.join() === '완료,진행,예정,목표' && await ev(() => document.querySelector('.page.on .phead [data-repstate]').textContent.trim()) === '목표', stMenu);
  await setText('[data-k="main"]', '시험용 사업 개요 문단.'); await setText('[data-k="infra"]', '수전 9MW 계획\n변전소 2km'); await setText('[data-k="risk"]', '임차인 자료 없음'); 
  await a.click('.page.on .phead [data-repfocus]'); await sleep(300);
  await a.click('.page.on .phead [data-reppick="grp"]'); await sleep(300); const grpMenu = await pops(); await a.keyboard.press('Escape'); await sleep(200);
  check('집중 추진 is a switch, the group a menu', await ev(() => document.querySelector('.page.on .phead [data-repfocus]').classList.contains('on')) && grpMenu.join() === 'AIDC,Small AIDC', grpMenu);
  await a.click('.page.on .phead [data-editproj]'); await sleep(1600);
  const sv = await ev(id => { const h = PHEAD[id]; return { edit: !!S.editProj, kpi: JSON.stringify(h.kpi), fin: JSON.stringify(h.fin), rows: h.rows.map(r => r[0]).join(), plan: JSON.stringify(h.plan), loc: h.loc, cost: h.cost, dev: h.dev, focus: h.focus, sub: h.sub, infra: h.infra, src: h.src }; }, pid);
  check('저장: the lists as typed (an empty row is gone), and the old fields other screens read follow the table', !sv.edit && sv.kpi === '[["5MW / 9MW","IT Load / 수전용량"]]' && sv.fin === '[["확인 필요 (100억 / 120억)","총사업비 (추정)"]]' && sv.rows === '위치,용도지역,대지면적,연면적,건폐율 / 용적률,사업주체,운영사 / 임차인,수전 계획' && sv.plan === '[["2027.03","착공","목표"]]' && sv.loc === '경기 시험시 시험동 12-3' && sv.cost === '확인 필요 (100억 / 120억)' && sv.focus === true && !sv.sub && sv.infra === '수전 9MW 계획\n변전소 2km' && !sv.src, sv);

  console.log('— the overview as it is read');
  const vw = await ev(() => { const p = document.querySelector('.page.on .phead'), q = s => p.querySelector(s), t = s => (q(s) || {}).textContent || '', cal = document.querySelector('.page.on [data-sec="cal"]');
    return { meta: [...p.querySelectorAll('.rmeta .rml .m')].map(x => x.textContent.trim()).join('|'), side: [...p.querySelectorAll('.rmeta .rmr .rbt button')].map(x => x.textContent.trim()).join() + ' / ' + [...p.querySelectorAll('.rmeta .rmr .rdt > *')].map(x => x.textContent.trim()).join('|'), sideBelow: (q('.rmeta .rdt').getBoundingClientRect().top >= q('.rmeta .rbt').getBoundingClientRect().bottom) && (d => d[1].getBoundingClientRect().top > d[0].getBoundingClientRect().top + 8)(p.querySelectorAll('.rmeta .rdt > b')), ttl: [...p.querySelectorAll('.ttl > *')].map(x => x.tagName + (x.matches('.pexp') && !x.textContent.trim() && x.querySelector('svg use') ? ':pict' : '')).join(), mainIn: !!q('.rc1 .rb:first-child .rmain + .rtb'), sub: !!q('.rsub'), memo: t('.rtb:not(.plan) .r.memo'), fig: (b => getComputedStyle(b).fontSize + '/' + getComputedStyle(b).fontWeight)(q('.rkp .k > b')), lines: [getComputedStyle(q('.rc2 .rb')).borderTopWidth, getComputedStyle(q('.rc2 .rb')).borderBottomWidth, getComputedStyle(q('.rc2 .rt')).borderBottomWidth, getComputedStyle(q('.rtb .r')).borderBottomWidth].join(), rqCol: getComputedStyle(q('em.rq')).color, h1Col: getComputedStyle(q('h1')).color, kpi: t('.rkp:not(.fin) .k b'), finRq: t('.rkp.fin .k b em.rq'), titles: [...p.querySelectorAll('.rt')].map(x => x.textContent).join(), cols: p.querySelectorAll('.rc').length, band: getComputedStyle(p.querySelector('.rstats .rkp')).gridTemplateColumns.split(' ').length, cells: !!p.querySelector('.rcells'), map: (p.querySelector('.rtb .r .rmapbox iframe.map') || {}).src || '', mapRow: ((p.querySelector('.rtb .r:has(.rmapbox) > b') || {}).textContent || ''), doc: (p.querySelector('.rdocs .rd a.nm') || {}).textContent || '', docX: !!p.querySelector('.rdocs [data-docdel]'), na: [...p.querySelectorAll('em.na')].length, infra: [...p.querySelectorAll('.rc2 .rb:nth-child(1) .rul li')].map(x => x.textContent).join('|'),
      planSt: (q('.rtb.plan .r:not(.th) i .sch-st') || {}).className, src: !!q('.rsrc') || !!q('.rnote'), lineCol: getComputedStyle(q('.rc2 .rb')).borderTopColor, flow: Math.round(cal.getBoundingClientRect().top - p.getBoundingClientRect().bottom), editables: p.querySelectorAll('[contenteditable]').length, ops: !!p.querySelector('.rtb .r.ops [data-sch="ops"]') }; });
  check('number, group, 집중 추진, stage and owner in one line under the title; no sub line; 비고 is a row of the table', /^No\. \d\d\|Small AIDC\|집중 추진\|추진 단계사업제안\|담당자열여섯 일$/.test(vw.meta) && vw.sub === false && vw.memo === '비고검사 비고 ' + sfx, vw);
  // thirty-fourth round
  check('at the right of that line 수정 and 개요 업로드, and below them the two dates, a line each; beside the name only the pictogram that hands out the report; 사업 개요 holds its text above its table', /^수정,개요 업로드 \/ 최초자료일\|\d{4}\.\d{2}\.\d{2}\|기준일\|-$/.test(vw.side) && vw.sideBelow && vw.ttl === 'H1,BUTTON:pict' && vw.mainIn, { side: vw.side, below: vw.sideBelow, ttl: vw.ttl, mainIn: vw.mainIn });
  // twenty-eighth round
  check('the figures are a tenth smaller and two steps lighter; a block has one pale line above its title and no other (none closing it, none under the title, none between the rows); 확인 필요 is in the project\'s colour', vw.fig === '19.8px/500' && vw.lines === '1px,0px,0px,0px' && vw.lineCol === 'rgb(227, 227, 227)' && vw.rqCol === vw.h1Col, { fig: vw.fig, lines: vw.lines, rq: vw.rqCol, h1: vw.h1Col });
  check('the three marks are coloured by themselves; several lines are a list; a step shows its state; no 출처 line and no note under the figures', vw.kpi === '5MW / 9MW' && vw.finRq === '확인 필요' && vw.na >= 1 && vw.infra === '수전 9MW 계획|변전소 2km' && /st-cond/.test(vw.planSt) && vw.src === false, vw);
  check('the overview is as tall as what it says (the calendar stands below it) and nothing is editable while it is read', vw.flow >= 0 && vw.flow < 40 && vw.editables === 0 && vw.ops, vw);
  check('no 요약 and no block for the map: the figures are a band of five across, two columns below, the map stands inside the row 위치, the PDF is listed', vw.titles === '핵심 지표,사업성 지표,사업 개요,추진 일정,입지 및 전력 인프라,사업 구조 및 수익 모델,추진 현황 및 주요 특성,주요 리스크 및 검토사항,협력업체,첨부 자료 (PDF)' && vw.cols === 2 && vw.band === 5 && !vw.cells && vw.mapRow === '위치' && /maps\.google\.com\/maps\?q=/.test(vw.map) && decodeURIComponent(vw.map).includes('경기 시험시 시험동 12-3') && vw.doc === '검토 자료 ' + sfx + '.pdf' && !vw.docX, vw);
  await sleep(600);
  const bSees = await b.evaluate(id => PROJECTS[id] && PHEAD[id] ? { st: PROJECTS[id].status, kpi: JSON.stringify(PHEAD[id].kpi), plan: JSON.stringify(PHEAD[id].plan), grp: PHEAD[id].grp, focus: PHEAD[id].focus } : null, pid);
  check('another member has it', bSees && bSees.st === '사업제안' && bSees.kpi === sv.kpi && bSees.plan === sv.plan && bSees.grp === 'Small AIDC' && bSees.focus === true, bSees);

  console.log('— the list of the main page');
  await ev(() => go('main')); await sleep(700); await a.click('.page.on .projects [data-vt="proj:table"]'); await sleep(700);
  await ev(id => { S.pjPage = Math.ceil((schRepSeq(schProjFilter(orderedProjects())).indexOf(id) + 1) / SCH_V_PER) || 1; schProjRedraw(); }, pid); await sleep(400);   // ten rows a page: the page that holds the project
  const tb = await ev(id => { const box = document.querySelector('.page.on .projects'), t = box.querySelector('.tbl.vt-rep'), rw = t.querySelector(`.rw[data-go="project:${id}"]`), all = orderedProjects();
    return { hd: [...t.querySelectorAll('.hd span')].map(x => x.textContent).join(), grps: [...t.querySelectorAll('.grp')].map(g => g.dataset.grp + ':' + g.querySelector('span').textContent).join(), counts: ['AIDC', 'Small AIDC', ''].map(g => all.filter(k => schRepOf(k).grp === g).length).join(), rows: t.querySelectorAll('.rw').length, all: all.length,
      mine: rw ? { cells: [...rw.children].map(c => c.textContent.trim()).join('|'), focus: rw.classList.contains('focus'), no: rw.querySelector('.no span').textContent === schRepNos()[id], noBg: getComputedStyle(rw.querySelector('.no span')).backgroundColor, rowBg: getComputedStyle(rw).backgroundColor, mark: (rw.querySelector('.nm .fo') || {}).textContent, markH: rw.querySelector('.nm .fo') ? Math.round(rw.querySelector('.nm .fo').getBoundingClientRect().height / (LAYOUT.zoom || 1)) : 0, nameCol: getComputedStyle(rw.querySelector('.nm')).color, pc: PROJECTS[id].color, tag: (rw.querySelector('.no span + .gtag') || {}).textContent, tagBg: rw.querySelector('.no .gtag') ? getComputedStyle(rw.querySelector('.no .gtag')).backgroundColor : '', rq: !!rw.querySelector('em.rq'), rqCol: rw.querySelector('em.rq') ? getComputedStyle(rw.querySelector('em.rq')).color : '', na: !!rw.querySelector('em.na') } : null, page: S.pjPage || 1, per: SCH_V_PER, cnt: box.querySelector('.rep-n').textContent, oldCnt: !!box.querySelector('.rep-cnt'), foot: !!box.querySelector('.rep-foot'), pager: !!box.querySelector('[data-vpg]') }; }, pid);
  check('the table has the columns of the list without 비고, ten projects a page (a pager when there are more) and no note below', tb.hd === 'NO.,프로젝트,위치,사업주체,대지면적(m²),연면적(m²),IT LOAD (수전용량),추진 단계,최초자료일' && tb.per === 10 && tb.rows === Math.min(10, tb.all - 10 * (tb.page - 1)) && tb.pager === tb.all > 10 && !tb.foot && tb.cnt === String(tb.all) && !tb.oldCnt, tb);
  const [nA, nS, nX] = tb.counts.split(',').map(Number);
  check('no headings of groups in the table; a row says its group with a light grey badge between the number and the name', tb.grps === '' && tb.mine && tb.mine.tag === 'Small AIDC' && tb.mine.tagBg === 'rgb(241, 241, 240)', { grps: tb.grps, mine: tb.mine });
  const hexRgb = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
  check('the row of the project: its cells, its number; 자료 없음 reads "-" there; being pushed is a small mark before the name (no red row, no red number, the name in the project\'s colour)', tb.mine && new RegExp(`^\\d\\dSmall AIDC\\|집중${NAME}\\|경기 시험시\\|보완 필요 \\(시험 주체 ${sfx}\\)\\|1,234\\|-\\|5MW \\(수전 9MW\\)\\|사업제안\\|\\d{4}\\.\\d{2}\\.\\d{2}$`).test(tb.mine.cells) && tb.mine.rqCol === hexRgb(tb.mine.pc) && tb.mine.focus && tb.mine.no && tb.mine.mark === '집중' && tb.mine.markH <= 16 && tb.mine.noBg === 'rgba(0, 0, 0, 0)' && tb.mine.rowBg === 'rgba(0, 0, 0, 0)' && tb.mine.nameCol === hexRgb(tb.mine.pc) && tb.mine.rq && !tb.mine.na, tb.mine);
  await a.fill('.page.on .projects input[data-q="proj"]', '시험 주체 ' + sfx); await sleep(400);
  check('the search looks into 사업주체 too, and the number in the title follows what is listed', await ev(() => document.querySelectorAll('.page.on .tbl.vt-rep .rw').length === 1 && document.querySelector('.page.on .projects .rep-n').textContent === '1'));
  await a.fill('.page.on .projects input[data-q="proj"]', ''); await sleep(300);
  const pick = async (k, label) => { await a.click(`.page.on .projects [data-ppick="${k}"]`); await sleep(300); const items = await pops(); await a.click(`.pop .it:has-text("${label}")`); await sleep(500); return items; };
  const rowsNow = () => ev(() => ({ n: document.querySelectorAll('.page.on .tbl.vt-rep .rw').length, grp: [...new Set([...document.querySelectorAll('.page.on .tbl.vt-rep .rw')].map(r => schRepOf(r.dataset.go.slice(8)).grp))].join(), focus: [...document.querySelectorAll('.page.on .tbl.vt-rep .rw')].every(r => r.classList.contains('focus')), chips: [...document.querySelectorAll('.page.on .projects [data-pchip]')].map(x => x.textContent.replace('✕', '').trim()).join(), heads: document.querySelectorAll('.page.on .tbl.vt-rep .grp').length }));
  const gm = await pick('grp', 'Small AIDC'), g1 = await rowsNow();
  check('구분 narrows the list to one group', gm.join() === '전체 구분,AIDC,Small AIDC' && g1.n === Math.min(nS, 10) && g1.grp === 'Small AIDC' && g1.chips === '구분: Small AIDC' && g1.heads === 0, { gm, g1 });
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
  await a.click('.page.on .projects [data-mainexp]'); await sleep(350); await a.click('#dlg.sch-xw .xq-files .xq-card:has(input[value="docx"])'); await a.click('#dlg.sch-xw .xq-files .xq-card:has(input[value="xlsx"])');   /* Word is ticked at first: 엑셀 alone */
  const [dl] = await Promise.all([a.waitForEvent('download'), a.click('#dlg.sch-xw [data-xw="ok"]')]);
  check('내보내기 (엑셀) hands over a workbook', /^AIDC 프로젝트 개발검토 리스트_\d{4}-\d{2}-\d{2}\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  await a.click('.page.on .projects [data-vt="proj:cards"]'); await sleep(700);
  const cd = await ev(id => { const c = document.querySelector(`.page.on #proj-inner .pcard[data-go="project:${id}"]`); const st = c && c.querySelector('[data-pstar]'), cs = st && getComputedStyle(st), sp = st && st.querySelector('svg path'); return c ? { name: (c.querySelector('h3 .pnm') || {}).textContent, tag: (c.querySelector('h3 .pnm + .gtag') || {}).textContent, no: !!c.querySelector('h3 em'), sub: !!c.querySelector('.sub'), st: c.querySelector('.st').textContent, fo: (f => !!f && f.textContent === '집중 추진' && !c.querySelector('.img .fo') && getComputedStyle(f).backgroundColor + '/' + getComputedStyle(f).color === 'rgb(253, 236, 238)/rgb(217, 32, 46)')(c.querySelector('h3 .pnm + .gtag + .gtag.gfo')), strokeC: getComputedStyle(sp).stroke, labels: [...c.querySelectorAll('.info b')].map(x => x.textContent).join(), vals: [...c.querySelectorAll('.info .e')].map(x => x.textContent).join('|'), rq: !!c.querySelector('.info em.rq'), na: !!c.querySelector('.info em.na'), starBox: cs.backgroundColor + '/' + cs.boxShadow, stroke: sp.getAttribute('stroke'), fill: sp.getAttribute('fill'), col: getComputedStyle(c.querySelector('h3')).color, cls: PROJECTS[id].cls, pc: PROJECTS[id].color } : null; }, pid);
  check('a card: the name, then the badge of its group, then 집중 추진 in the colours of the table\'s mark (no number, no sub line); the stage; the cells of the list with 자료 없음 as "-"', cd && cd.name === NAME && cd.tag === 'Small AIDC' && !cd.no && !cd.sub && cd.st === '사업제안' && cd.fo && cd.labels === '위치,사업주체,대지면적,연면적,IT LOAD,최초자료일' && /\|1,234\|-\|5MW/.test(cd.vals) && cd.rq && !cd.na, cd);
  check('the star of a card has no box: white inside and out until it is on', cd && cd.starBox === 'rgba(0, 0, 0, 0)/none' && cd.stroke === '#fff' && cd.strokeC === 'rgb(255, 255, 255)' && cd.fill === '#fff', cd);
  const tones = await ev(() => { const ps = Object.values(PROJECTS), mine = ps.filter(p => /^pj-n\d+$/.test(p.cls || '')), nx = nextProjTone(); return { n: mine.length, distinct: new Set(mine.map(p => p.color)).size, old: ps.filter(p => /^pj-c\d$/.test(p.cls || '')).length, next: nx.cls, free: !ps.some(p => p.cls === nx.cls), all: PROJ_TONES.length, varOk: mine.every(p => getComputedStyle(Object.assign(document.createElement('i'), { className: p.cls })).getPropertyValue('--cc') === '' || true) }; });
  check('a project that is made gets a colour no other project has (twenty tones; none of the six pale ones any more)', cd && /^pj-n\d+$/.test(cd.cls) && cd.col === hexRgb(cd.pc) && tones.n >= 1 && tones.distinct === tones.n && tones.old === 0 && tones.free && tones.all === 20, { cd: cd && cd.cls, tones });

  const fol = await ev(id => { const h = PHEAD[id], keep = [h.lsite, h.ldev, h.lload]; h.lsite = ''; h.ldev = ''; h.lload = ''; h.rows.find(r => r[0] === '사업주체')[1] = '표의 사업주체'; render(true); const c = document.querySelector(`.page.on #proj-inner .pcard[data-go="project:${id}"] .info`).textContent, r = schRepOf(id); [h.lsite, h.ldev, h.lload] = keep; h.rows.find(r => r[0] === '사업주체')[1] = ''; render(true); return { site: r.site, dev: r.dev, load: r.load, card: c }; }, pid);
  check('a cell of the list that is left empty follows the sheet (the rows 위치 · 사업주체 of the table, the 핵심 지표 of IT / 수전)', fol.site === '경기 시험시 시험동 12-3' && fol.dev === '표의 사업주체' && fol.load === '5MW / 9MW' && fol.card.includes('경기 시험시 시험동 12-3') && fol.card.includes('표의 사업주체'), fol);

  console.log('— one distance in every section of the main page; the star of a card');
  const dist = () => ev(() => { const z = LAYOUT.zoom || 1, R = el => el.getBoundingClientRect(), f = n => Math.round(n / z * 10) / 10;
    const one = (box, filt, content) => { const b = document.querySelector('.page.on ' + box), t = R(b.querySelector('.sec-title')), fl = R(b.querySelector(filt)), c = R(b.querySelector(content)); return [f(fl.top - t.top), f(c.top - fl.bottom)].join('/'); };
    return [one('.projects', '.pfil .sch-filters', document.querySelector('.page.on .projects .tbl') ? '.tbl' : '.pcard'), one('#sec-actions', '.sch-filters', '.tbl'), one('#sec-research', '.sch-filters', '.rcard, .rgrid')]; });
  const d1 = await dist(); await a.click('.page.on .projects [data-vt="proj:table"]'); await sleep(600); const d2 = await dist(); await a.click('.page.on .projects [data-vt="proj:cards"]'); await sleep(600);
  check('프로젝트 · 액션 · 리서치: the pickers 93 below the top of the title, the content 34 below the pickers (cards and table alike)', d1.join() === '93/34,93/34,93/34' && d2[0] === '93/34', { d1, d2 });
  const stars = () => ev(() => { const cs = [...document.querySelectorAll('#proj-inner .pcard')]; return { order: cs.map(c => c.dataset.go.slice(8)), on: cs.map(c => c.querySelector('[data-pstar]').classList.contains('on')), page: S.page }; });
  const s0 = await stars();
  await ev(id => document.querySelector(`#proj-inner .pcard [data-pstar="${id}"]`).click(), pid); await sleep(600);
  const s1 = await stars(), sv1 = await ev(id => ({ fill: document.querySelector(`#proj-inner .pcard [data-pstar="${id}"] svg path`).getAttribute('fill'), fav: S.favs.includes('project:' + id), stored: JSON.parse(localStorage.getItem('aidc-favs') || '[]').includes('project:' + id), side: !!document.querySelector(`#sb .item[data-go="project:${id}"]`), toast: document.querySelector('#toast').textContent }), pid);
  const firstOff = s => s.on.indexOf(false) < 0 ? s.on.length : s.on.indexOf(false);
  check('every card has a star; pressed, the card is a favourite (kept in this browser, listed in the sidebar) and the project is not opened', s0.on.length === s0.order.length && !s0.on[s0.order.indexOf(pid)] && s1.on[s1.order.indexOf(pid)] && s1.page === 'main' && sv1.fav && sv1.stored && sv1.side && sv1.fill === '#ffce00' && /맨 앞에 고정/.test(sv1.toast), { s0, s1, sv1 });
  check('starred cards stand first, the others after them in their order', s1.on.slice(0, firstOff(s1)).every(Boolean) && !s1.on.slice(firstOff(s1)).some(Boolean) && s1.order.indexOf(pid) < firstOff(s1) && s1.order.filter((k, i) => !s1.on[i]).join() === s0.order.filter(k => k !== pid && !s0.on[s0.order.indexOf(k)]).join(), { s0, s1 });
  await ev(() => { S.pf = { sort: 'name' }; render(true); }); await sleep(500); const s2 = await stars();
  check('…whatever order is chosen for the rest', s2.order.indexOf(pid) < firstOff(s2) && s2.on.slice(0, firstOff(s2)).every(Boolean), s2);
  await ev(() => { S.pf = {}; render(true); }); await sleep(400);
  await ev(id => go('project:' + id), pid); await sleep(900);
  check('it is the star of the project page', await ev(() => !!document.querySelector('#tb-star use[href="#i-star"]')));
  await a.click('#tb-star'); await sleep(300); await ev(() => go('main')); await sleep(800);
  const s3 = await stars();
  check('taken back there, the card stands in its place again', !s3.on[s3.order.indexOf(pid)] && s3.order.join() === s0.order.join(), { s0, s3 });
  // the sections of a project page keep the same distances (pangyo: it has meetings, a plan, packages, gates, records)
  const pdist = () => ev(() => { const z = LAYOUT.zoom || 1, R = el => el.getBoundingClientRect(), f = n => Math.round(n / z * 10) / 10;
    const one = (b, filt, content) => { const t = R(b.querySelector('.sec-title')), fl = R(b.querySelector(filt)), c = R(b.querySelector(content)); return [f(fl.top - t.top), f(c.top - fl.bottom)].join('/'); }, P = s => document.querySelector('.page.on ' + s);
    return { meet: one(P('.meet'), '.sch-filters', P('.meet .tbl') ? '.tbl' : '.mcard'), act: one(P('#sch-actions'), '.sch-filters', '#sch-gantt, .tbl.sch-list, #sch-net'), low: one(P('#sch-lower'), '.sch-filters', '.tbl, .sch-gates'), res: one([...document.querySelectorAll('.page.on .sec')].find(s => s.querySelector('[data-sec="research"]')), '.sch-filters', '.rcard, .rgrid') }; });
  await ev(() => { SCHU.tab = 'gantt'; SCHU.sec = 'proc'; go('project:pangyo'); }); await a.waitForFunction(() => schReady('pangyo') && !!document.querySelector('#sch-gantt .sg-row'), null, { timeout: 20000 }); await sleep(900);
  const pd = [await pdist()];
  await a.click('#sch-actions [data-sch="tab"][data-k="list"]'); await sleep(600); await a.click('#sch-lower [data-sch="sec"][data-k="gate"]'); await sleep(600); await a.click('.page.on .meet [data-vt="meet:table"]'); await sleep(600); pd.push(await pdist());
  await a.click('#sch-actions [data-sch="tab"][data-k="net"]'); await sleep(700); await a.click('#sch-lower [data-sch="sec"][data-k="evid"]'); await sleep(600); await a.click('.page.on .meet [data-vt="meet:cards"]'); await sleep(600); pd.push(await pdist());
  await a.click('#sch-actions [data-sch="tab"][data-k="gantt"]'); await sleep(500); await a.click('#sch-lower [data-sch="sec"][data-k="proc"]'); await sleep(400);
  check('a project page: 미팅 (cards, table) · 액션 (일정, 리스트, 관계도) · 외부설비 조달 / 승인게이트 / 근거 및 확약 · 리서치 all keep 93 / 34', pd.every(x => Object.values(x).every(v => v === '93/34')), pd);
  check('the pickers of 미팅 are a row of their own below the title (the views and the search stay beside it)', await ev(() => { const m = document.querySelector('.page.on .meet'); return !!m.querySelector('.sch-filters.meetf [data-mtpick]') && !m.querySelector('.sch-vtools [data-mtpick]') && !!m.querySelector('.sch-vtools [data-vt]') && !!m.querySelector('.sch-vtools input[data-q="meeting"]'); }));
  // an overview saved while the list of actions is open (its columns carry data-k too: plan, fin …)
  await ev(id => { SCHU.tab = 'list'; go('project:' + id); }, pid); await sleep(1100);
  await a.click('.page.on .phead [data-editproj]'); await sleep(900);
  await setText('[data-k="memo"]', '리스트 탭에서 저장 ' + sfx); await a.click('.page.on .phead [data-editproj]'); await sleep(1600);
  const lsv = await ev(id => { const h = PHEAD[id]; return { edit: !!S.editProj, list: !!document.querySelector('#sch-actions .tbl.sch-list'), memo: h.memo, kpi: Array.isArray(h.kpi) && h.kpi.length, fin: Array.isArray(h.fin) && h.fin.length, plan: Array.isArray(h.plan) && h.plan.length, junk: ['wbs', 'name', 'pri', 'st', 'who', 'due', 'url', 'gantt', 'list', 'net'].filter(k => k in h) }; }, pid);
  check('saving with the list of actions open saves, keeps the lists and writes nothing else into the record', !lsv.edit && lsv.list && lsv.memo === '리스트 탭에서 저장 ' + sfx && lsv.kpi === 1 && lsv.fin === 1 && lsv.plan === 1 && lsv.junk.length === 0, lsv);
  await ev(() => { SCHU.tab = 'gantt'; go('main'); }); await sleep(800);

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
  // (thirty-third round) a data file goes in through the window that makes a project, like any document; its button then opens the window that says what will happen
  const choose = async file => { await a.click('.page.on .projects .new-proj'); await sleep(350); await a.setInputFiles('#dlg [data-docfile]', file); await a.waitForFunction(() => { const d = document.querySelector('#dlg.sch-np'); return d && !d.querySelector('.rd') && (d.querySelector('.up-tags') || d.querySelector('.up-nt.err')); }, null, { timeout: 20000 }); await sleep(200);
    const w = await ev(() => { const d = document.querySelector('#dlg.sch-np'), b = d.querySelector('[data-np2="ok"]'); return { ok: !b.disabled, txt: b.textContent, err: (d.querySelector('.np-doc .up-nt.err') || {}).textContent || '' }; });
    if (w.ok) { await a.click('#dlg [data-np2="ok"]'); await sleep(600); } else { await a.click('#dlg [data-np2="x"]'); await sleep(300); } return w; };
  const ask = () => ev(() => { const d = document.querySelector('#dlg.sch-repin'); return d ? { g: [...d.querySelectorAll('.g > b')].map(x => x.textContent).join(), li: [...d.querySelectorAll('.g li')].map(x => x.textContent.trim()), ck: (d.querySelector('#rin-others') || {}).checked } : null; });
  const before = await ev(() => Object.keys(PROJECTS).length);
  const menu = await choose(file1), q1 = await ask();
  check('a data file in the window that makes a project: its button says how many; the window that follows says what will happen first', menu.ok && menu.txt === '2건 만들기' && q1 && q1.g === `새로 만들기 2건,파일에 없는 프로젝트 ${before}건` && q1.ck === false && await ev(n => Object.keys(PROJECTS).length === n, before), { menu, q1 });
  await a.click('#dlg [data-rin="ok"]'); await sleep(1500);
  const im1 = await ev(([x, y]) => { const p = PROJECTS[x], h = PHEAD[x], q = PROJECTS[y]; return p && q ? { n: Object.keys(PROJECTS).length, st: p.status, full: p.full, kpi: JSON.stringify(h.kpi), infra: h.infra, stat: h.stat, loc: h.loc, cost: h.cost, lload: h.lload, plan: h.plan.length, noA: schRepNos()[x], firstSmall: orderedProjects().filter(k => schRepOf(k).grp === 'Small AIDC')[0] === y, asof: META_FLAGS.repAsof, trash: Object.keys(SETTINGS.projTrash || {}).filter(k => k === x || k === y).length, qFocus: PHEAD[y].focus } : null; }, [idA, idB]);
  check('가져오기 makes the projects with everything the file says, and nothing else is touched', im1 && im1.n === before + 2 && im1.st === '인허가' && im1.full === '자료 시험 A ' + sfx && im1.kpi === '[["1MW / 2MW","IT Load / 수전용량"],["200m²","연면적"]]' && im1.infra === '수전 2MW\n변전소 1km' && im1.stat === '검토 중\n부지 확인' && im1.loc === '충남 시험군 시험리 1' && im1.cost === '10억원' && im1.plan === 2 && im1.qFocus === true && /가져왔습니다 · 새로 만들기 2건 · 덮어쓰기 0건/.test(await toastTxt()), im1);
  check('the oldest 최초자료일 of a group is its first number; the day of the list is kept (the title says only how many there are)', im1 && im1.noA === '01' && im1.firstSmall && im1.asof === '2026.11.24' && await ev(() => document.querySelector('.page.on .projects .rep-n').textContent === String(Object.keys(PROJECTS).length) && !/기준일/.test(document.querySelector('.page.on .projects .sec-title').textContent)), im1);
  await sleep(700);
  check('another member has them', await b.evaluate(([x, y]) => !!(PROJECTS[x] && PROJECTS[y] && PHEAD[x].rows.length === 3), [idA, idB]));
  await ev(id => { PHEAD[id].partners = ['시험 협력사']; }, pid); await sleep(600);
  await choose(file2); const q2 = await ask();
  check('a second file: a project with the same id, or the name it had, is written over (not made twice)', q2 && q2.g.startsWith('덮어쓰기 2건') && q2.li.some(x => x.includes('자료 시험 C ' + sfx) && x.includes('← ' + NAME)), q2);
  await a.click('#dlg [data-rin="ok"]'); await sleep(1500);
  const im2 = await ev(([x, p]) => ({ n: Object.keys(PROJECTS).length, st: PROJECTS[x].status, memo: PHEAD[x].memo, name: PROJECTS[p].full, pst: PROJECTS[p].status, pk: JSON.stringify(PHEAD[p].kpi), partners: PHEAD[p].partners.join(), owner: PHEAD[p].owner, first: PHEAD[p].first }), [idA, pid]);
  check('written over: the overview is the file\'s, the name too; 담당자 and 협력업체 stay', im2.n === before + 2 && im2.st === '계통협의' && im2.memo === '두 번째 파일' && im2.name === '자료 시험 C ' + sfx && im2.pst === '사업계획' && im2.pk === '[["1MW / 2MW","IT Load / 수전용량"],["200m²","연면적"]]' && im2.partners === '시험 협력사' && im2.owner === '열여섯 일' && im2.first === '2021.05.05', im2);
  const w3 = await choose(file3); await sleep(300);
  check('a file that is not a list is refused', /자료 파일이 아닙니다/.test(w3.err) && w3.ok === false && !await ev(() => !!document.querySelector('#dlg')), w3);
  await choose(file4); const q4 = await ask();
  check('a file may ask for the others to go to the trash: the box is ticked, and 취소 changes nothing', q4 && q4.ck === true && /파일에 없는 프로젝트 \d+건/.test(q4.g), q4);
  await a.click('#dlg [data-rin="x"]'); await sleep(300);
  check('취소: nothing happened', await ev(n => Object.keys(PROJECTS).length === n && !document.querySelector('#dlg'), before + 2));
  // what the list holds goes out as a workbook and is read back the same (the data file's own export is gone)
  const rt = await ev(async id => { const ids = orderedProjects(), X = await schXlsx(), bytes = await X.makeBook(schXMainSheets(ids, { list: true, sheets: true }), '프로젝트 목록'), rep = schDocToReport(await schDocRead(new File([bytes], 'out.xlsx')));
    if (rep.error) return { error: rep.error }; const oa = rep.projects.find(p => norm(p.name) === norm(PROJECTS[id].full)) || {}; return { n: rep.projects.length, all: ids.length, sheets: rep.found.sheets, oa: { name: oa.name, stage: oa.stage, memo: (oa.list || {}).memo, infra: JSON.stringify(oa.infra), plan: JSON.stringify(oa.plan), ov: oa.ov, model: oa.model, kpi: JSON.stringify(oa.kpi) } }; }, idA);
  check('the workbook of the main page\'s 내보내기 is read back as the same projects: what was taken in comes out again', rt.n === rt.all && rt.sheets === rt.all && rt.oa.name === '자료 시험 A ' + sfx && rt.oa.stage === '계통협의' && rt.oa.memo === '두 번째 파일' && rt.oa.infra === '["수전 2MW","변전소 1km"]' && rt.oa.plan === '[["2026.01","검토","완료"],["2027.01","착공","예정"]]' && rt.oa.ov === '파일로 만든 사업.' && rt.oa.model === '임대형.' && rt.oa.kpi === '[["1MW / 2MW","IT Load / 수전용량"],["200m²","연면적"]]', rt);

  console.log('— a document makes a project; 개요 업로드; the report of a project (thirty-third round)');
  {
  // a workbook in the shape the main page writes: the list and one sheet for one project, under a new name
  const mkBook = (id, name) => ev(async ([id, name]) => { const X = await schXlsx(), sh = schXMainSheets([id], { list: true, sheets: true }); sh[0].rows[1][2] = name; sh[1].rows[1][1] = name; sh[1].name = name.slice(0, 28);
    const u = new Uint8Array(await X.makeBook(sh, '프로젝트 목록')); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); }, [id, name]).then(b => Buffer.from(b, 'base64'));
  const XLS = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', DOCNAME = '문서 시험 ' + sfx, nBefore = await ev(() => Object.keys(PROJECTS).length);
  await ev(() => go('main')); await sleep(500); await a.click('.page.on .projects .new-proj'); await sleep(350);
  await a.setInputFiles('#dlg [data-docfile]', { name: '개요 문서.xlsx', mimeType: XLS, buffer: await mkBook(idA, DOCNAME) });
  await a.waitForFunction(() => { const d = document.querySelector('#dlg.sch-np'); return d && !d.querySelector('.rd') && (d.querySelector('.up-tags') || d.querySelector('.up-nt.err')); }, null, { timeout: 30000 }); await sleep(250);
  const d1 = await ev(() => { const d = document.querySelector('#dlg.sch-np'); return { name: d.querySelector('#np2-name').value, ok: !d.querySelector('[data-np2="ok"]').disabled, txt: d.querySelector('[data-np2="ok"]').textContent, tags: [...d.querySelectorAll('.up-tags span')].map(x => x.textContent.replace(/\s+/g, ' ')).join(' | '), grp: (d.querySelector('#np2-grp .on') || {}).textContent, st: (d.querySelector('#np2-st .on') || {}).textContent, err: (d.querySelector('.up-nt.err') || {}).textContent || '' }; });
  check('a document alone turns the button on: its name, its group and its stage are put into the fields, and the field says what was read', d1.ok && d1.txt === '프로젝트 만들기' && d1.name === DOCNAME && d1.grp === 'AIDC' && d1.st === '계통협의' && /프로젝트\s*1/.test(d1.tags) && /핵심 지표 2/.test(d1.tags) && /개요 표 3행/.test(d1.tags) && !d1.err, d1);
  await a.click('#dlg [data-np2="ok"]'); await a.waitForFunction(() => S.page === 'project' && !document.querySelector('#dlg'), null, { timeout: 15000 }); await sleep(900);
  const pidD = await ev(() => S.proj), dm = await ev(id => { const p = PROJECTS[id], h = PHEAD[id]; return { n: Object.keys(PROJECTS).length, full: p.full, st: p.status, grp: h.grp, kpi: JSON.stringify(h.kpi), rows: h.rows.length, plan: h.plan.length, main: h.main, infra: h.infra, memo: h.memo, edit: !!S.editProj, toast: document.querySelector('#toast').textContent }; }, pidD);
  check('made: a new project with the document\'s overview (figures, texts, the table, the schedule), opened and not in edit', dm.n === nBefore + 1 && dm.full === DOCNAME && dm.st === '계통협의' && dm.grp === 'AIDC' && dm.kpi === '[["1MW / 2MW","IT Load / 수전용량"],["200m²","연면적"]]' && dm.rows === 3 && dm.plan === 2 && dm.main === '파일로 만든 사업.' && dm.infra === '수전 2MW\n변전소 1km' && dm.memo === '두 번째 파일' && !dm.edit && /문서 내용으로 프로젝트를 만들었습니다/.test(dm.toast), dm);
  const tb2 = await ev(() => [...document.querySelectorAll('.page.on .phead .ttl button, .page.on .phead .rmeta .rbt button')].map(b => (b.textContent.trim() || b.getAttribute('aria-label')) + (b.querySelector('svg use') ? '*' : '')).join());
  check('beside the name 내보내기 as a pictogram alone; at the dates 수정 and 개요 업로드 (with its pictogram)', tb2 === '내보내기*,수정,개요 업로드*', tb2);
  // thirty-fifth round: files on the blocks of the overview
  await a.click('.page.on .phead [data-editproj]'); await sleep(800);
  const fz = await ev(() => [...document.querySelectorAll('.page.on .phead [data-fzone]')].map(z => z.dataset.fzone + (z.querySelector('.rfdrop') ? '*' : '')).join());
  // thirty-sixth round: every button that adds is a "+" alone; the titles of the sheet's blocks can be edited; the row for files says only "파일 첨부"
  const e36 = await ev(() => { const p = document.querySelector('.page.on .phead'); return { adds: [...p.querySelectorAll('.radd')].map(b => (b.textContent.trim() || '+') + (b.querySelector('svg') ? '' : '?') + ':' + b.getAttribute('title')).join(), ttl: [...p.querySelectorAll('.rt [contenteditable][data-k^="ttl:"]')].map(x => x.dataset.k.slice(4)).join(), drop: [...p.querySelectorAll('.rfdrop')].map(b => b.textContent.trim()).filter((v, i, l) => l.indexOf(v) === i).join(), fold: p.querySelector('.ov').textContent.trim() }; });
  check('every add button is a "+" alone that says in its title what it adds; the titles of the sheet\'s nine blocks can be edited; a file row reads "파일 첨부" and nothing more; the fold is called 프로젝트 상세', e36.adds === '+:지표 추가,+:지표 추가,+:행 추가,+:일정 추가,+:협력업체 추가,+:PDF 첨부' && e36.ttl === 'kpi,fin,main,plan,infra,struct,stat,risk,partners' && e36.drop === '파일 첨부' && e36.fold === '프로젝트 상세', e36);
  const [fch] = await Promise.all([a.waitForEvent('filechooser'), a.click('.page.on .phead [data-fadd="plan"]')]); await fch.setFiles([{ name: '일정 검토.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }]);
  await a.waitForFunction(() => document.querySelectorAll('.page.on .phead [data-fzone="plan"] .rf').length === 1, null, { timeout: 20000 }); await sleep(300);
  await ev(() => { document.querySelector('.page.on .phead [data-k="ttl:plan"]').innerText = '추진 계획'; });
  await a.click('.page.on .phead [data-editproj]'); await sleep(1300);
  const t36 = await ev(id => ({ ttl: JSON.stringify(PHEAD[id].ttl || null), shown: [...document.querySelectorAll('.page.on .phead .rt')].map(x => x.textContent.trim()).includes('추진 계획'), junk: Object.keys(PHEAD[id]).filter(k => k.includes(':')).length, head: schXProjDoc(id, { parts: ['ov'], forms: {} }).sections[0].blocks.filter(b => b.k === 'tbl').map(b => b.head.join('/')).join('|') }), pidD);
  check('a title that was changed is the project\'s own (kept as `ttl`, shown, written into the report); the usual titles are not stored', t36.ttl === '{"plan":"추진 계획"}' && t36.shown && t36.junk === 0 && /시기\/추진 계획\/상태/.test(t36.head), t36);
  const fr = await ev(id => ({ att: ((PHEAD[id].att || {}).plan || []).map(x => x.name).join(), row: (document.querySelector('.page.on .phead .rfl .rf .nm span') || {}).textContent, href: (document.querySelector('.page.on .phead .rfl .rf a.nm') || { getAttribute: () => '' }).getAttribute('href'), drops: document.querySelectorAll('.page.on .phead .rfdrop').length, ed: !!S.editProj }), pidD);
  check('while the overview is edited every block of text ends in a row that takes files (not the two rows of figures); a file put to a block is listed below it after 저장 (a PDF opens in a new tab)', fz === 'main*,plan*,infra*,struct*,stat*,risk*,partners*' && fr.att === '일정 검토.pdf' && fr.row === '일정 검토.pdf' && /^\/api\/file\/[0-9a-f-]{36}\?inline=1$/.test(fr.href) && fr.drops === 0 && !fr.ed, { fz, fr });
  // 개요 업로드: a document changes what it has and leaves the rest; one step back
  await ev(id => { const h = PHEAD[id]; h.partners = ['문서 협력사']; h.risk = '손으로 쓴 리스크'; }, pidD); await sleep(300);
  const other = await ev(async ([id, name]) => { const X = await schXlsx(), rows = [['항목', '내용'], ['프로젝트', name], ['추진 단계', '인허가'], [], ['핵심 지표'], ['9MW', '새 지표'], [], ['사업 개요 표'], ['위치', '서울 시험구'], ['규모', '지상 3층']];
    const u = new Uint8Array(await X.makeBook([{ name: '한 장', rows, widths: [30, 80] }])); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); }, [pidD, '다른 이름 ' + sfx]).then(b => Buffer.from(b, 'base64'));
  await a.click('.page.on .phead [data-schup]'); await sleep(350);
  await a.setInputFiles('#dlg.sch-docup [data-docfile]', { name: '고친 개요.xlsx', mimeType: XLS, buffer: other });
  await a.waitForFunction(() => { const d = document.querySelector('#dlg.sch-docup'); return d && !d.querySelector('.rd') && (d.querySelector('.up-res') || d.querySelector('.up-nt.err')); }, null, { timeout: 30000 }); await sleep(250);
  const du = await ev(() => { const d = document.querySelector('#dlg.sch-docup'); return { ttl: d.querySelector('.up-ttl').textContent, rows: [...d.querySelectorAll('.up-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), warn: (d.querySelector('.up-wn') || {}).textContent || '', ok: !d.querySelector('[data-doc="ok"]').disabled }; });
  check('개요 업로드: the window says what was read and that the project keeps its own name', du.ttl === '개요 업로드' && du.rows.some(r => /읽은 내용.*핵심 지표 1.*개요 표 2행/.test(r)) && du.rows.some(r => /추진 단계\s*인허가/.test(r)) && /이 프로젝트의 이름\(.*\)은 그대로 둡니다/.test(du.warn) && du.ok, du);
  await a.click('#dlg [data-doc="ok"]'); await sleep(900);
  const da = await ev(id => { const p = PROJECTS[id], h = PHEAD[id]; return { full: p.full, st: p.status, kpi: JSON.stringify(h.kpi), rows: JSON.stringify(h.rows), main: h.main, plan: h.plan.length, risk: h.risk, partners: h.partners.join(), loc: h.loc, toast: document.querySelector('#toast').textContent }; }, pidD);
  check('applied: what the document has is changed (figures, the table, the stage); what it does not say stays (the text, the schedule, the risks, the partners, the name)', da.full === DOCNAME && da.st === '인허가' && da.kpi === '[["9MW","새 지표"]]' && da.rows === '[["위치","서울 시험구"],["규모","지상 3층"]]' && da.main === '파일로 만든 사업.' && da.plan === 2 && da.risk === '손으로 쓴 리스크' && da.partners === '문서 협력사' && da.loc === '서울 시험구' && /되돌리기/.test(da.toast), da);
  await ev(() => { const b = [...document.querySelectorAll('#toast button')].find(x => /되돌리기/.test(x.textContent)); if (b) b.click(); }); await sleep(700);
  const dz = await ev(id => ({ st: PROJECTS[id].status, kpi: PHEAD[id].kpi.length, rows: PHEAD[id].rows.length }), pidD);
  check('되돌리기 takes the upload back', dz.st === '계통협의' && dz.kpi === 2 && dz.rows === 3, dz);
  // the report of the project
  await a.click('.page.on .phead [data-projexp]'); await sleep(400);
  const xr = await ev(() => { const d = document.querySelector('#dlg.sch-xw'); return d ? { groups: [...d.querySelectorAll('h5')].map(h => [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('')).join(), parts: [...d.querySelectorAll('[data-xwp]')].map(c => c.dataset.xwp + (c.disabled ? '-' : c.checked ? '*' : '')).join(), form: [...d.querySelectorAll('.xq-row')].map(r => r.dataset.xwrow + ':' + (r.classList.contains('on') ? [...r.querySelectorAll('[data-xwf]')].map(b => b.dataset.xwf + (b.classList.contains('on') ? '*' : '')).join('/') : 'off')).join(), says: [...d.querySelectorAll('.xq-row.on [data-xwsay]')].every(x => x.textContent.trim().length > 0), list: [...d.querySelectorAll('[data-xwlist] li')].map(l => l.querySelector('span').textContent + '/' + l.querySelector('em').textContent).join(), tot: d.querySelector('[data-xwtot]').textContent, file: [...d.querySelectorAll('input[name="xw-file"]')].map(x => x.value + (x.checked ? '*' : '')).join(), words: d.querySelectorAll('.np-hd span, h5 small, .xw-nt').length, seg: [...d.querySelector('.xq-seg').children].map(b => b.textContent).join('/'), place: (b => ['[data-xw="ok"]', '.xq-files', '.xq-pdf'].map(q => Math.round(d.querySelector(q).getBoundingClientRect().top - b.top)).join())(d.querySelector('.box').getBoundingClientRect()) } : null; });
  check('내보내기 asks what to put in first (a part without content cannot be ticked) and, for every part that is ticked, 요약 or FULL; the right side lists what was put together; then the files (Word ticked, PPT, 엑셀); no lines of explanation', xr && xr.words === 0 && xr.seg === '요약/FULL' && xr.groups === '넣을 내용,구성,파일' && /^state:sum\*\/full,ov:sum\*\/full,act:off,proc:off,gate:off,evid:off,meet:off,part:off$/.test(xr.form) && xr.says && /^state\*,ov\*,act-,proc-,gate-,evid-,meet-,part$/.test(xr.parts) && xr.list === '진행 현황 요약/요약,사업 개요/요약' && /^항목 2개 · 표 \d+개 · \d+줄$/.test(xr.tot) && xr.file === 'docx*,pptx,xlsx', xr);
  // thirty-fifth round: a part's own form, and the report that follows it
  await a.click('#dlg.sch-xw [data-xwrow="ov"] [data-xwf="full"]'); await sleep(150);
  const xf = await ev(() => { const d = document.querySelector('#dlg.sch-xw'); return { say: d.querySelector('[data-xwrow="ov"] [data-xwsay]').textContent, list: [...d.querySelectorAll('[data-xwlist] li')].map(l => l.querySelector('span').textContent + '/' + l.querySelector('em').textContent).join() }; });
  const xd = await ev(id => { const mix = schXProjDoc(id, { parts: ['state', 'ov'], forms: { ov: 'full' } }), sum = schXProjDoc(id, { parts: ['state', 'ov'], forms: {} }); const heads = d => d.sections[1].blocks.filter(b => b.k === 'p' && b.runs[0].b).map(b => b.runs[0].t).join(); return { mixTitle: mix.title[1], mixFile: /_보고서\(맞춤\)_/.test(mix.file), mixOv: heads(mix), sumOv: heads(sum), sumTitle: sum.title[1] }; }, pidD);
  const xp = await ev(() => { const d = document.querySelector('#dlg.sch-xw'), b = d.querySelector('.box').getBoundingClientRect(); return { seg: d.querySelector('[data-xwrow="ov"] .xq-seg').classList.contains('full'), place: ['[data-xw="ok"]', '.xq-files', '.xq-pdf'].map(q => Math.round(d.querySelector(q).getBoundingClientRect().top - b.top)).join() }; });
  check('the right side does not move when what is listed changes (thirty-seventh round), and the choice that was turned is marked', xp.place === xr.place && xp.seg, { before: xr.place, after: xp.place, seg: xp.seg });
  check('a ticked part is turned to FULL by itself: its line and the list at the right follow, and the report holds that part in full and the others in short ("맞춤 구성")', /리스크/.test(xf.say) && xf.list === '진행 현황 요약/요약,사업 개요/FULL' && xd.mixTitle === '프로젝트 보고서 · 맞춤 구성' && xd.mixFile && /주요 리스크 및 검토사항/.test(xd.mixOv) && !/주요 리스크 및 검토사항/.test(xd.sumOv) && xd.sumTitle === '프로젝트 보고서 · 요약형', { xf, xd });
  await a.click('#dlg.sch-xw [data-xwall="sum"]'); await sleep(150);
  await a.check('#dlg.sch-xw [data-xwp="part"]');   // Word is ticked from the start
  // forty-first round: the slides follow the company's template; a part in 요약 is one page, a part in FULL runs on (the
  // slides are counted by their names in the file: every name stands in it uncompressed)
  const pp = await ev(async id => { const mk = async forms => { const parts = ['state', 'ov'], b = await schExpPptx(schXProjDoc(id, { parts, forms }), { pid: id, parts, forms }), u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
      return { size: u.length, pk: String.fromCharCode(u[0], u[1]), type: b.type, slides: new Set(s.match(/ppt\/slides\/slide\d+\.xml/g) || []).size }; };
    const ctx = schXPptOf({ pid: id, parts: ['state', 'ov'], forms: { state: 'sum', ov: 'sum' } }); return { sum: await mk({ state: 'sum', ov: 'sum' }), full: await mk({ state: 'sum', ov: 'full' }), kind: ctx.kind, has: Object.keys(ctx.full).sort().join(), head: ['kpi', 'fin', 'rows', 'plan', 'infra', 'risk', 'ttl'].every(k => k in ctx.proj), who: typeof ctx.author === 'string' && typeof ctx.dept === 'string' && !/AI Data Center/.test(ctx.dept) }; }, pidD);
  check('the same report as slides: a .pptx is made in the page (thirty-seventh round)', pp.sum.pk === 'PK' && pp.sum.size > 20000 && pp.full.size < 600000 && /presentationml/.test(pp.sum.type), pp);
  check('slides (forty-first round): the module is handed the overview as it is kept and every ticked part in full; in 요약 a part is ONE page (cover, contents, the overview, the state, the last page = 5), in FULL the overview runs on with a divider before every group', pp.kind === 'proj' && pp.has === 'ov,state' && pp.head && pp.who && pp.sum.slides === 5 && pp.full.slides > pp.sum.slides + 2, pp);
  // forty-ninth round: the schedule's chart in the reports (a chart of the phases, in FULL one more per phase) and the project's
  // Excel in the guide workbook's form — a FULL file goes back in with nothing changed, the sheets of a 요약 file are for reading
  const x49 = await ev(async () => { for (let i = 0; i < 80 && !schReady('pangyo'); i++) await new Promise(r => setTimeout(r, 250)); const m = schModel('pangyo'), X = await schXlsx(), parts = ['state', 'act', 'proc', 'gate', 'evid'], out = {};
    const charts = f => schXProjDoc('pangyo', { parts: ['act'], forms: { act: f } }).sections[0].blocks.filter(b => b.k === 'img' && b.gantt).length;
    out.charts = { sum: charts('sum'), full: charts('full'), phases: m.phases.filter(g => g.tasks.length).length };
    for (const f of ['full', 'sum']) { const forms = Object.fromEntries(parts.map(k => [k, f])), read = await X.readSheets(new File([await X.makeGuideBook(schXlSpec('pangyo', parts, forms))], 'x.xlsx')), mg = schUpMerge('pangyo', [read]);
      out[f] = { tasks: (read.tasks || []).length, links: (read.links || []).length, same: !!mg.same, none: !!mg.none, view: read.notes.filter(n => /보기용/.test(n.text)).length }; }
    return out; });
  check('charts (forty-ninth round): 요약 has the chart of the phases, FULL one more for every phase', x49.charts.sum === 1 && x49.charts.full === 1 + x49.charts.phases, x49.charts);
  check('엑셀 (forty-ninth round): FULL in the guide workbook\'s form loads back with nothing changed; 요약 sheets are for reading and load nothing', x49.full.tasks > 0 && x49.full.links > 0 && x49.full.same && x49.sum.none && x49.sum.view >= 3, x49);
  const [dw] = await Promise.all([a.waitForEvent('download', { timeout: 30000 }), a.click('#dlg.sch-xw [data-xw="ok"]')]); const wbuf = fs.readFileSync(await dw.path());
  const rd = await ev(id => { const doc = schXProjDoc(id, { form: 'full', parts: ['state', 'ov', 'part'], act: 'near', days: 60 }), sum = schXProjDoc(id, { form: 'sum', parts: ['state'], act: 'near', days: 60 }); return { title: doc.title.join(' / '), label: doc.label, secs: doc.sections.map(s => s.h).join(), state: doc.sections[0].blocks.find(b => b.k === 'tbl').rows.map(r => r.join(':')).join('|'), ov: doc.sections[1].blocks.filter(b => b.k === 'p' && b.runs[0].b).map(b => b.runs[0].t).join(), sumSecs: sum.sections.length, html: /class="sec/.test(schExpHtml(doc, '')) }; }, pidD);
  check('a Word file comes down; the report is the project as it stands — its stage, its overview, its partners — under the parts that were ticked', /^문서 시험 .*_보고서\(요약\)_\d{8}\.docx$/.test(dw.suggestedFilename()) && wbuf.length > 5000 && wbuf.slice(0, 2).toString() === 'PK' && rd.title === DOCNAME + ' / 프로젝트 보고서 · FULL' && /AIDC/.test(rd.label) && rd.secs === '1. 진행 현황,2. 사업 개요,3. 협력업체' && /추진 단계:계통협의/.test(rd.state) && /보고서 작성일:/.test(rd.state) && /사업 개요/.test(rd.ov) && /주요 리스크 및 검토사항/.test(rd.ov) && rd.sumSecs === 1 && rd.html, { name: dw.suggestedFilename(), size: wbuf.length, rd });
  const md = await ev(() => { const ids = schXMainIds('all'), doc = schXMainDoc(ids, { list: true, sheets: true }); return { n: ids.length, secs: doc.sections.length, brk: doc.sections.filter(s => s.brk).length, first: doc.sections[0].h, cols: doc.sections[0].blocks[0].head.join(), rows: doc.sections[0].blocks[0].rows.length }; });
  check('the main page\'s report: the list, then one sheet per project, each on a new page', md.secs === md.n + 1 && md.brk === md.n && md.first === '1. 프로젝트 목록' && md.cols === 'NO.,프로젝트,구분,위치,사업주체,IT LOAD (수전용량),추진 단계,최초자료일' && md.rows === md.n, md);
  await ev(id => { if (PROJECTS[id]) trashProject(id); go('main'); }, pidD); await sleep(700);
  }

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
