// WorkSpace, fifteenth part (owner, 2026-11-24, the "twenty-first round"): lists that can be seen as a table too —
//  - the projects of the main page: cards or a table (the design of the 외부설비 조달 table), a search box, an Excel file of what is listed;
//  - the meetings of a project: cards or a table, a search box, pickers (period, participant, order);
//  - which view a member looks at is this browser's own; the page as it was (?v=1) has none of it;
//  - (twenty-third round) the column titles of the two tables are menus; cards and table start at the same place.
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2', V1 = 'http://127.0.0.1:8787/?v=1';
(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RVA' + sfx, '열다섯 일', { url: V2 }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const pops = () => ev(() => [...document.querySelectorAll('.pop .it')].map(x => x.textContent.trim()));
  // where something stands inside its section (px of the page, from the section's upper left corner)
  const place = (box, sel) => ev(([b, s]) => { const bx = document.querySelector('.page.on ' + b), r = bx.querySelector(s).getBoundingClientRect(), br = bx.getBoundingClientRect(), z = LAYOUT.zoom || 1; return [Math.round((r.top - br.top) / z * 10) / 10, Math.round((r.left - br.left) / z * 10) / 10]; }, [box, sel]);

  console.log('— the projects of the main page');
  await ev(() => { localStorage.removeItem('aidc-view'); for (const k of Object.keys(SCH_VIEW)) delete SCH_VIEW[k]; S.q.proj = ''; S.pf = {}; go('main'); }); await sleep(800);
  const pj0 = await ev(() => { const box = document.querySelector('.page.on .projects'), tools = box.querySelector('.sch-vtools'); return { cards: box.querySelectorAll('#proj-inner .pcard').length, all: orderedProjects().length, toggle: [...tools.querySelectorAll('[data-vt]')].map(b => b.dataset.vt + (b.classList.contains('on') ? '*' : '')).join(), search: !!tools.querySelector('input[data-q="proj"]'), xl: (box.querySelector('[data-mainexp]') || {}).textContent, old: !!box.querySelector('[data-pjxl],[data-repio]'), table: !!box.querySelector('.tbl') }; });
  check('cards as before, with the two views, a search box and one 내보내기 (no 자료 파일, no 엑셀로 내보내기)', pj0.cards === pj0.all && pj0.cards > 1 && pj0.toggle === 'proj:cards*,proj:table' && pj0.search && /^내보내기$/.test((pj0.xl || '').trim()) && !pj0.old && !pj0.table, pj0);
  const pjCards = await place('.projects', '.pcard');
  await a.fill('.page.on .projects input[data-q="proj"]', '판교'); await sleep(400);
  const pj1 = await ev(() => ({ n: document.querySelectorAll('#proj-inner .pcard').length, name: (document.querySelector('#proj-inner .pcard h3') || {}).textContent, focus: document.activeElement && document.activeElement.dataset.q }));
  check('the search narrows the cards while the box keeps the caret', pj1.n === 1 && /판교/.test(pj1.name) && pj1.focus === 'proj', pj1);
  await a.fill('.page.on .projects input[data-q="proj"]', ''); await sleep(300);
  await a.click('.page.on .projects [data-vt="proj:table"]'); await sleep(600);
  await ev(id => { S.pjPage = Math.ceil((schRepSeq(schProjFilter(orderedProjects())).indexOf(id) + 1) / SCH_V_PER) || 1; schProjRedraw(); }, 'pangyo'); await sleep(300);   // ten rows a page (twenty-eighth round): the page that holds 판교
  const pj2 = await ev(() => { const box = document.querySelector('.page.on .projects'), t = box.querySelector('.tbl.sch-proc.vt-proj'), rows = [...t.querySelectorAll('.rw')], pg = PROJECTS.pangyo; return { hd: [...t.querySelectorAll('.hd span')].map(x => x.textContent).join(), rows: rows.length, page: S.pjPage || 1, first: (r => r && [...r.children].map(c => c.textContent.trim()))(t.querySelector('.rw[data-go="project:pangyo"]')), go: rows[0] && rows[0].dataset.go, ls: localStorage.getItem('aidc-view'), cards: !!document.querySelector('#proj-inner'), on: (box.querySelector('[data-vt].on') || { dataset: {} }).dataset.vt, hdBg: getComputedStyle(t.querySelector('.hd')).backgroundColor, rowH: Math.round(rows[0].getBoundingClientRect().height / (LAYOUT.zoom || 1)), name: pg.full, ops: schModel('pangyo') ? schD(schModel('pangyo').res.operationDate) : '' }; });
  check('as a table: the head and the rows of the 외부설비 조달 table, one row per project with the cells of the review list (twenty-fourth round)', pj2.hd === 'NO.,프로젝트,위치,사업주체,대지면적(m²),연면적(m²),IT LOAD (수전용량),추진 단계,최초자료일' && pj2.rows === Math.min(10, pj0.all - 10 * (pj2.page - 1)) && !pj2.cards && pj2.on === 'proj:table' && pj2.hdBg === 'rgb(247, 247, 246)' && pj2.rowH === 56 && /^\d\d(AIDC|Small AIDC)?$/.test(pj2.first[0]) && pj2.first.includes(pj2.name), pj2);
  const pjTable = await place('.projects', '.tbl.vt-proj');
  check('the table starts where the cards start (as far down, as far to the left)', pjCards[0] === pjTable[0] && pjCards[1] === pjTable[1] && pjTable[0] > 100, { pjCards, pjTable });
  check('the choice is this browser\'s own and stays over a redraw', JSON.parse(pj2.ls).proj === 'table' && await ev(() => { render(true); return !!document.querySelector('.page.on .projects .tbl.vt-proj'); }));
  await a.fill('.page.on .projects input[data-q="proj"]', '판교'); await sleep(400);
  const pj3 = await ev(() => ({ n: document.querySelectorAll('.page.on .tbl.vt-proj .rw').length, focus: document.activeElement && document.activeElement.dataset.q }));
  await a.fill('.page.on .projects input[data-q="proj"]', '없는이름' + sfx); await sleep(400);
  const pj4 = await ev(() => (document.querySelector('.page.on .tbl.vt-proj .none') || {}).textContent || '');
  check('the search works on the table too; nothing found says so', pj3.n === 1 && pj3.focus === 'proj' && /조건에 맞는 프로젝트가 없습니다/.test(pj4), { pj3, pj4 });
  await a.fill('.page.on .projects input[data-q="proj"]', '판교'); await sleep(400);
  await ev(async () => { const X = await schXlsx(), orig = X.makeBook; window._book = null; X.makeBook = async (sheets, active) => { window._book = { sheets, active }; X.makeBook = orig; return orig(sheets, active); }; });
  await a.click('.page.on .projects [data-mainexp]'); await sleep(350);
  const xw = await ev(() => { const d = document.querySelector('#dlg.sch-xw'); return d ? { scope: [...d.querySelectorAll('input[name="xw-scope"]')].map(x => x.value + (x.checked ? '*' : '')).join(), parts: [...d.querySelectorAll('[data-xwp]')].map(x => x.dataset.xwp + (x.checked ? '*' : '')).join(), files: [...d.querySelectorAll('input[name="xw-file"]')].map(x => x.type + ':' + x.value + (x.checked ? '*' : '')).join(), pdf: !!d.querySelector('[data-xwpdf]') && !d.querySelector('[data-xwpdf]').checked } : null; });
  check('내보내기 opens a window: what is listed now or all projects, the list and a sheet per project, Word · PPT · 엑셀 to tick together (Word at first) and PDF besides', xw && /^shown\*,all/.test(xw.scope) && xw.parts === 'list*,sheets*' && xw.files === 'checkbox:docx*,checkbox:pptx,checkbox:xlsx' && xw.pdf, xw);
  await a.click('#dlg.sch-xw .xq-files .xq-card:has(input[value="docx"])'); await a.click('#dlg.sch-xw .xq-files .xq-card:has(input[value="xlsx"])');   /* Word is ticked at first: 엑셀 alone */
  const [dl] = await Promise.all([a.waitForEvent('download', { timeout: 30000 }), a.click('#dlg.sch-xw [data-xw="ok"]')]); await sleep(300);
  const bk = await ev(() => window._book && { active: window._book.active, names: window._book.sheets.map(s => s.name), head: window._book.sheets[0].rows[0].join(), rows: window._book.sheets[0].rows.length - 1, first: window._book.sheets[0].rows[1], sheet: window._book.sheets[1] && window._book.sheets[1].rows.slice(0, 2).map(r => r.join('|')).join(' / '), titles: window._book.sheets[1] ? window._book.sheets[1].rows.filter(r => r.length === 1).map(r => r[0]) : [] });
  check('엑셀: the list as it stands now (the search applies) and one sheet per project, named with the day', /^AIDC 프로젝트 개발검토 리스트_\d{4}-\d{2}-\d{2}\.xlsx$/.test(dl.suggestedFilename()) && bk && bk.names.length === 2 && bk.names[0] === '프로젝트 목록' && bk.active === '프로젝트 목록' && bk.head === 'NO.,구분,프로젝트,부제,위치,사업주체,대지면적(m²),연면적(m²),IT LOAD (수전용량),추진 단계,집중 추진,최초자료일,기준일,비고,담당자,운영개시 예상' && bk.rows === 1 && /판교/.test(bk.first[2]) && /^\d{4}-\d{2}-\d{2}$/.test(bk.first[15]) && /^항목\|내용 \/ 프로젝트\|.*판교/.test(bk.sheet), { name: dl.suggestedFilename(), bk });
  await a.fill('.page.on .projects input[data-q="proj"]', ''); await sleep(300);
  // the column titles of the table are menus: the same conditions as the pickers of the section
  await a.click('.page.on .tbl.vt-proj [data-vcol="proj:st"]'); await sleep(300); const hdItems = await pops(); await a.click('.pop .it >> nth=1'); await sleep(500);
  const pjh = await ev(() => ({ rows: document.querySelectorAll('.page.on .tbl.vt-proj .rw').length, st: [...new Set([...document.querySelectorAll('.page.on .tbl.vt-proj .rw .st')].map(x => x.textContent.trim()))], flt: [...document.querySelectorAll('.page.on .tbl.vt-proj .hd .flt')].map(x => x.textContent), chip: !!document.querySelector('.page.on .projects [data-pchip="st"]'), cols: [...document.querySelectorAll('.page.on .tbl.vt-proj .hd [data-vcol]')].map(x => x.dataset.vcol).join() }));
  check('the column title 추진 단계 of the table filters it (marked, with the tag of the section)', hdItems.length > 1 && hdItems[0] === '전체 단계' && pjh.rows > 0 && pjh.st.length === 1 && pjh.flt.join() === '추진 단계' && pjh.chip && pjh.cols === 'proj:name,proj:region,proj:st,proj:first', { hdItems, pjh });
  await a.click('.page.on .projects [data-pchip="st"]'); await sleep(400);
  await a.click('.page.on .tbl.vt-proj [data-vcol="proj:name"]'); await sleep(300); await a.click('.pop .it:has-text("운영개시 빠른 순")'); await sleep(500);
  check('the menu of 프로젝트 orders it (운영개시 빠른 순)', await ev(() => schPf().sort === 'ops' && [...document.querySelectorAll('.page.on .tbl.vt-proj .hd .sorted')].map(x => x.textContent).join() === '프로젝트' && (document.querySelector('.page.on .tbl.vt-proj .rw') || { dataset: {} }).dataset.go === 'project:pangyo'));
  await a.click('.page.on .projects [data-pchip="sort"]'); await sleep(400);
  await a.click('.page.on .projects [data-ppick="st"]'); await sleep(300); const stItems = await pops(); await a.click('.pop .it >> nth=1'); await sleep(500);
  const pj5 = await ev(() => ({ rows: document.querySelectorAll('.page.on .tbl.vt-proj .rw').length, st: [...new Set([...document.querySelectorAll('.page.on .tbl.vt-proj .rw .st')].map(x => x.textContent.trim()))], chip: !!document.querySelector('.page.on .projects [data-pchip="st"]') }));
  check('the pickers of the section (추진 단계 …) hold for the table', stItems.length > 1 && pj5.rows > 0 && pj5.st.length === 1 && pj5.chip, { stItems, pj5 });
  await a.click('.page.on .projects [data-pchip="st"]'); await sleep(400);
  await a.click('.page.on .tbl.vt-proj .rw[data-go="project:pangyo"]'); await a.waitForFunction(() => S.page === 'project' && schReady('pangyo'), null, { timeout: 20000 }); await sleep(700);
  check('a row opens its project', await ev(() => S.page === 'project' && S.proj === 'pangyo'));

  console.log('— the meetings of a project');
  const day = n => ev(n => { const d = new Date(TODAY + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, n);
  const soon = await day(9);
  const mid = await ev(([s, d]) => { const it = newItem('meeting'); Object.assign(it, { title: '표 시험 미팅 ' + s, proj: 'pangyo', status: 'published', authorId: sharedUser, createdAt: new Date().toISOString(), date: d, people: [sharedUser] }); delete it.sessionNew; meetWrite(it, { time: '15:30', place: '시험 회의실 ' + s, agenda: '표 보기 확인', guests: '외부 손님' }); S.mtf = {}; S.q.meeting = ''; render(true); return it.id; }, [sfx, soon]); await sleep(600);
  const mt0 = await ev(() => { const box = document.querySelector('.page.on .meet'), tools = box.querySelector('.sch-vtools'); return { cards: box.querySelectorAll('#meet-inner .mcard').length, all: liveItems('meeting', 'pangyo').length, picks: [...box.querySelectorAll('.sch-filters.meetf [data-mtpick]')].map(x => x.textContent.trim()).join(), toggle: [...tools.querySelectorAll('[data-vt]')].map(b => b.dataset.vt + (b.classList.contains('on') ? '*' : '')).join(), search: !!tools.querySelector('input[data-q="meeting"]') }; });
  check('cards as before, with three pickers (a row of their own since the twenty-sixth round), the two views and a search box beside the title', mt0.cards === mt0.all && mt0.cards >= 2 && mt0.picks === '전체 기간,전체 참석자,최신 순' && mt0.toggle === 'meet:cards*,meet:table' && mt0.search, mt0);
  const mtCards = await place('.meet', '.mcard');
  await a.click('.page.on .meet [data-mtpick="when"]'); await sleep(300); const whenItems = await pops(); await a.click('.pop .it:has-text("예정된 미팅")'); await sleep(400);
  const mt1 = await ev(s => ({ titles: [...document.querySelectorAll('#meet-inner .mcard .tt b')].map(x => x.textContent), set: document.querySelector('.page.on .meet [data-mtpick="when"]').classList.contains('set'), label: document.querySelector('.page.on .meet [data-mtpick="when"]').textContent.trim() }), sfx);
  check('기간 › 예정된 미팅: only what lies ahead, the picker shows the choice', whenItems.join() === '전체 기간,예정된 미팅,지난 미팅,이번 달' && mt1.titles.length >= 1 && mt1.titles.includes('표 시험 미팅 ' + sfx) && mt1.set && mt1.label === '예정된 미팅' && await ev(() => schMeetRows('pangyo').every(m => m.date >= TODAY)), mt1);
  await a.click('.page.on .meet [data-mtpick="who"]'); await sleep(300); await a.click('.pop .it:has-text("(나)")'); await sleep(400);
  check('참석자 › 나: my meetings only', await ev(() => { const r = schMeetRows('pangyo'); return r.length >= 1 && r.every(m => (m.people || []).includes(sharedUser)) && document.querySelectorAll('#meet-inner .mcard').length === r.length; }));
  await ev(() => { S.mtf = {}; schMeetRedraw(); }); await sleep(300);
  await a.click('.page.on .meet [data-vt="meet:table"]'); await sleep(600);
  const mt2 = await ev(([s, id]) => { const box = document.querySelector('.page.on .meet'), t = box.querySelector('.tbl.sch-proc.vt-meet'), rows = [...t.querySelectorAll('.rw')], mine = rows.find(r => r.dataset.open === id); return { hd: [...t.querySelectorAll('.hd span')].map(x => x.textContent).join(), rows: rows.length, all: liveItems('meeting', 'pangyo').length, firstIsNewest: rows[0] === mine, mine: mine && [...mine.children].map(c => c.textContent.trim()), tv: box.classList.contains('tv'), cards: !!document.querySelector('#meet-inner'), pager: !!box.querySelector('.pager') }; }, [sfx, mid]);
  check('as a table: 날짜 · 시간 · 미팅명 · 장소 · 안건 · 참석자 · 외부 참석 · 회의록, newest first (a cell with nothing to say is empty, no dash)', mt2.hd === '날짜,시간,미팅명,장소,안건,참석자,외부 참석,회의록' && mt2.rows === Math.min(10, mt2.all) && mt2.firstIsNewest && mt2.tv && !mt2.cards && mt2.mine[0] === soon.replace(/-/g, '. ') && mt2.mine[1] === '15시 30분' && mt2.mine[2] === '표 시험 미팅 ' + sfx && mt2.mine[3] === '시험 회의실 ' + sfx && mt2.mine[4] === '표 보기 확인' && /열다섯 일/.test(mt2.mine[5]) && mt2.mine[6] === '외부 손님' && mt2.mine[7] === '' && mt2.pager === mt2.all > 10, mt2);
  const mtTable = await place('.meet', '.tbl.vt-meet');
  check('the table of the meetings starts where their cards start', mtCards[0] === mtTable[0] && mtCards[1] === mtTable[1] && mtTable[0] > 40, { mtCards, mtTable });
  await a.click('.page.on .tbl.vt-meet [data-vcol="meet:file"]'); await sleep(300); const fItems = await pops(); await a.click('.pop .it:has-text("회의록 없음")'); await sleep(400);
  const mf = await ev(() => ({ rows: document.querySelectorAll('.page.on .tbl.vt-meet .rw').length, every: schMeetRows('pangyo').every(m => !hasFiles(m)), flt: [...document.querySelectorAll('.page.on .tbl.vt-meet .hd .flt')].map(x => x.textContent).join(), chip: (document.querySelector('.page.on .meet [data-mtchip="file"]') || {}).textContent || '', cols: [...document.querySelectorAll('.page.on .tbl.vt-meet .hd [data-vcol]')].map(x => x.dataset.vcol).join() }));
  check('the column title 회의록 filters the table (marked, a tag beside the pickers)', fItems.join() === '전체,회의록 있음,회의록 없음' && mf.rows > 0 && mf.every && mf.flt === '회의록' && /회의록: 없음/.test(mf.chip) && mf.cols === 'meet:date,meet:name,meet:who,meet:guest,meet:file', { fItems, mf });
  await a.click('.page.on .meet [data-mtchip="file"]'); await sleep(400);
  await a.click('.page.on .tbl.vt-meet [data-vcol="meet:who"]'); await sleep(300); await a.click('.pop .it:has-text("(나)")'); await sleep(400);
  check('참석자 there is the picker\'s own condition (the picker shows it)', await ev(() => schMtf().who === sharedUser && document.querySelector('.page.on .meet [data-mtpick="who"]').classList.contains('set') && [...document.querySelectorAll('.page.on .tbl.vt-meet .hd .flt')].map(x => x.textContent).join() === '참석자'));
  await ev(() => { S.mtf = {}; schMeetRedraw(); }); await sleep(300);
  await a.click('.page.on .meet [data-mtpick="sort"]'); await sleep(300); await a.click('.pop .it:has-text("오래된 순")'); await sleep(400);
  check('정렬 › 오래된 순 turns the table round', await ev(() => { const d = [...document.querySelectorAll('.page.on .tbl.vt-meet .rw .w')].map(x => x.textContent); return d.length > 1 && d.every((x, i) => !i || d[i - 1] <= x); }));
  await a.fill('.page.on .meet input[data-q="meeting"]', '시험 회의실 ' + sfx); await sleep(400);
  const mt3 = await ev(() => ({ n: document.querySelectorAll('.page.on .tbl.vt-meet .rw').length, focus: document.activeElement && document.activeElement.dataset.q }));
  await a.fill('.page.on .meet input[data-q="meeting"]', '없는말' + sfx); await sleep(400);
  const mt4 = await ev(() => (document.querySelector('.page.on .tbl.vt-meet .none') || {}).textContent || '');
  check('the search looks at the place too; nothing found says so', mt3.n === 1 && mt3.focus === 'meeting' && /조건에 맞는 미팅이 없습니다/.test(mt4), { mt3, mt4 });
  await a.fill('.page.on .meet input[data-q="meeting"]', ''); await sleep(300);
  // fortieth round: the marks stand in the table too; research can be a table; a meeting's panel keeps its left column out of the right one
  const tm = await ev(id => { const rw = document.querySelector(`.page.on .tbl.vt-meet .rw[data-open="${id}"]`), d = rw && rw.querySelector('.nm .tdots'); return { want: dotsOf(item(id)).join(''), has: d ? [...d.children].map(i => i.className).join('') : '', left: d ? Math.round(d.getBoundingClientRect().left - rw.querySelector('.nm').getBoundingClientRect().left) : null }; }, mid);
  check('a row of the meeting table carries the marks its card carries, at the upper left of the name', tm.has === tm.want && (tm.want === '' || (tm.left >= 0 && tm.left < 8)), tm);
  const rsec = await ev(() => { const s = [...document.querySelectorAll('.page.on .sec')].find(x => x.querySelector('[data-sec="research"]')); s.querySelector('[data-vt="res:table"]').click(); return true; }); await sleep(600);
  const rt = await ev(() => { const s = [...document.querySelectorAll('.page.on .sec')].find(x => x.querySelector('[data-sec="research"]')), t = s.querySelector('.tbl.vt-res'); return t ? { hd: [...t.querySelectorAll('.hd span')].map(x => x.textContent).join(), rows: t.querySelectorAll('.rw').length, all: liveItems('research').length, cards: s.querySelectorAll('.rcard').length, bar: !!s.querySelector('.sch-filters.res'), view: schViewOf('res') } : null; });
  check('research can be seen as a table too: 날짜 · 제목 · 구분 · 담당자 · 최종수정 · 첨부, ten a page, under the same pickers', rsec && rt && rt.hd === '날짜,제목,구분,담당자,최종수정,첨부' && rt.rows === Math.min(10, rt.all) && rt.cards === 0 && rt.bar && rt.view === 'table', rt);
  await ev(() => { const s = [...document.querySelectorAll('.page.on .sec')].find(x => x.querySelector('[data-sec="research"]')); s.querySelector('[data-vt="res:cards"]').click(); }); await sleep(500);
  await ev(id => { const it = item(id); meetWrite(it, { agenda: '긴 안건 '.repeat(30) }); openPanel(id, true); }, mid); await sleep(700);
  const pg = await ev(() => { const P = document.querySelector('#panel-pin .props'), L = P.children[0], rk = [...P.querySelectorAll('.rcol .pr .k')].find(k => k.textContent.trim()); let mr = 0; for (const e of L.querySelectorAll('.pr .v, .pr .v *')) { const b = e.getBoundingClientRect(); if (b.width && b.height) mr = Math.max(mr, b.right); } return Math.round((rk.getBoundingClientRect().left - mr) / (LAYOUT.zoom || 1)); });
  check('a long line of a meeting\'s panel ends before the right column begins', pg >= 12, pg);
  await ev(id => { meetWrite(item(id), { agenda: '표 보기 확인' }); closePanel(true); render(true); }, mid); await sleep(400);
  await a.click(`.page.on .tbl.vt-meet .rw[data-open="${mid}"]`); await sleep(700);
  check('a row opens the meeting', await ev(id => S.panel === id && item(id).type === 'meeting', mid));
  await ev(() => closePanel(true)); await sleep(300);
  // more than ten: pages of the table
  const extra = await ev(([s, d]) => { const ids = []; for (let i = 0; i < 9; i++) { const it = newItem('meeting'); Object.assign(it, { title: `쪽 시험 미팅 ${s} ${i}`, proj: 'pangyo', status: 'published', authorId: sharedUser, createdAt: new Date().toISOString(), date: d }); delete it.sessionNew; ids.push(it.id); } S.mtf = {}; render(true); return ids; }, [sfx, soon]); await sleep(600);
  const pg0 = await ev(() => ({ rows: document.querySelectorAll('.page.on .tbl.vt-meet .rw').length, pager: !!document.querySelector('.page.on .meet .pager [data-vpg="2"]'), all: liveItems('meeting', 'pangyo').length }));
  await a.click('.page.on .meet .pager [data-vpg="2"]'); await sleep(400);
  const pg1 = await ev(() => ({ rows: document.querySelectorAll('.page.on .tbl.vt-meet .rw').length, page: S.mtPage, pane: !!document.querySelector('#modal.on') }));
  check('over ten meetings the table has pages of ten', pg0.all > 10 && pg0.rows === 10 && pg0.pager && pg1.page === 2 && pg1.rows === pg0.all - 10 && !pg1.pane, { pg0, pg1 });
  await a.click('.page.on .meet [data-vt="meet:cards"]'); await sleep(600);
  check('back to the cards: every meeting again', await ev(() => document.querySelectorAll('#meet-inner .mcard').length === liveItems('meeting', 'pangyo').length && !document.querySelector('.page.on .meet.tv')));

  console.log('— the page as it was');
  const C = await newUser(browser, 'RVC' + sfx, '열다섯 삼', { url: V1 }), c = C.page;
  await c.evaluate(() => go('main')); await sleep(600);
  const old1 = await c.evaluate(() => ({ tools: !!document.querySelector('.sch-vtools'), cards: document.querySelectorAll('#proj-inner .pcard').length, tbl: !!document.querySelector('.tbl.sch-vtbl') }));
  await c.evaluate(() => go('project:pangyo')); await sleep(800);
  const old2 = await c.evaluate(() => ({ tools: !!document.querySelector('.sch-vtools'), cards: document.querySelectorAll('#meet-inner .mcard').length }));
  check('?v=1 has neither the views nor the search boxes: cards only', !old1.tools && old1.cards > 1 && !old1.tbl && !old2.tools && old2.cards >= 1, { old1, old2 });

  // clean up: the meetings of this run to the trash, the views back to cards
  await ev(ids => { for (const id of ids) { const it = item(id); if (it) { it.prevStatus = it.status; it.status = 'trash'; it.trashedAt = new Date().toISOString(); } } localStorage.removeItem('aidc-view'); for (const k of Object.keys(SCH_VIEW)) delete SCH_VIEW[k]; S.mtf = {}; S.pf = {}; render(true); sharedFlush(true); }, [mid, ...extra]); await sleep(1500);
  const errs = [...A.errs, ...C.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
