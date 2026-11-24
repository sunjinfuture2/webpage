// WorkSpace x Schedule (preview), twelfth part (owner, 2026-11-23, the "fifteenth round"): Excel upload on the project page
// (schedule/ui/82-upload.js, schedule/xlsx.ts readSheets). Workbooks in the shape of the owner's guide workbook are made in the
// browser (same sheet names and column titles, the title rows above the header as in the original) and handed to the window:
// (thirty-third round) through the two windows there are now: the action section's — one schedule file fills 일정 · 리스트 · 관계도 —
// and the one of 외부설비 조달 with a row each for 외부설비 · 승인게이트 · 근거 및 확약; the gantt sheet alone; what members changed in the app stays unless the
// workbook changed the same value; errors are told per sheet; one undo takes an upload back; a second member follows without
// reloading; nothing of it shows without the preview.
// Needs wrangler dev on 127.0.0.1:8787.
const { chromium, sleep, check, newUser, done } = require('./h.cjs');
const sfx = Date.now().toString(36).slice(-5);
const V2 = 'http://127.0.0.1:8787/?v=2', V1 = 'http://127.0.0.1:8787/?v=1';
const XL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ---- sheets in the guide's shape ----
const TH = ['WBS', '개발단계', '업무패키지', '시작일', '완료일', '기간 Day', '선행 WBS·유형', '승인 역할', '실행 역할', '협의 역할', '완료기준·조건', '주 담당', '부 담당', '진척률', '상태', '근거·원자료', '기간 Week', '운영 총여유 Day', '운영 CP 구분', '작업유형', '기타 추가지연 Day', '실제 시작일', '실제 완료일', '잔여기간 Day', '갱신일', '확약·조건 / 원상태', '증빙·확인사항', '예상 시작일', '예상 완료일', '달력·휴일 조건', '투입인원', '입력 확인'];
const PH = { W1: '1 기획', W2: '2 설계·조달', W3: '3 운영' };
const trow = (wbs, name, start, finish, o = {}) => { const r = new Array(32).fill(null); r[0] = wbs; r[1] = PH[wbs.split('.')[0]]; r[2] = name; r[3] = start; r[4] = finish; r[7] = '사업총괄'; r[8] = o.R || 'PMO'; r[9] = '설계'; r[10] = name + ' 완료'; r[14] = o.st || '계획'; r[19] = o.ms ? '마일스톤' : '작업'; r[25] = '확인 전'; r[29] = '달력일'; return r; };
const TASKS = { 'W1.1': ['기획 정리', '2027-01-04', '2027-01-15'], 'W1.2': ['타당성 검토', '2027-01-18', '2027-01-29'], 'W2.1': ['기본 설계', '2027-02-01', '2027-02-26'], 'W2.2': ['장비 발주', '2027-03-01', '2027-03-05'],
  'W2.3': ['장비 납품', '2027-03-08', '2027-04-02'], 'W2.4': ['장비 설치', '2027-04-05', '2027-04-16'], 'W2.5': ['장비 SAT', '2027-04-19', '2027-04-23'], 'W3.1': ['운영 개시', '2027-05-03', '2027-05-03', { ms: true }] };
const taskSheet = (map, head = TH) => ({ name: '단계별업무분장', rows: [['개발 단계별 업무분장 및 일정 입력'], ['시험용'], [], head, ...Object.entries(map).map(([w, v]) => trow(w, v[0], v[1], v[2], v[3] || {}))] });
const LH = ['연결번호', '선행 WBS', '후행 WBS', '유형', '연계 조건', '선행 기준시작', '선행 기준완료', '후행 기준시작', '후행 기준완료', '요구 기준일', '기준 간격 Day', '기준 판정', '간트 표시', '기본 경로 적용', '추가간격 Day'];
const lrow = (i, a, b, type = 'FS', lag = 0, on = '적용') => { const r = new Array(15).fill(null); r[0] = 'L' + String(i).padStart(3, '0'); r[1] = a; r[2] = b; r[3] = type; r[4] = '시험'; r[13] = on; r[14] = lag; return r; };
const linkSheet = list => ({ name: '업무연결', rows: [['업무 연결 및 일정 정합성'], ['FS: …'], ['D/E …'], ['시험용'], [], LH, ...list.map((x, i) => lrow(i + 1, ...x))] });
const CHAIN = [['W1.1', 'W1.2'], ['W1.2', 'W2.1'], ['W2.1', 'W2.2'], ['W2.2', 'W2.3'], ['W2.3', 'W2.4'], ['W2.4', 'W2.5'], ['W2.5', 'W3.1']];
const QH = ['패키지', '설비', '포함 범위', '공급/소유 경계', '계약·PO WBS', 'PO 목표', '납품완료 목표', '설치완료 목표', '단위 SAT 목표', '계획창 Week', '확약 납기 Week', '납기 검토', '업체·계약상태', '발주/검수 증빙', '연결 WBS 순서', '실행 역할', '설치·통합 조건', 'PO 추가지연 Day', '운영 총여유 Day', '변경 설치완료', '견적 확보일', '납기 기산조건', '기산조건 충족일', '추가 운송 Day', '확약 기준 예상납품', '확약 상태', '견적·조건 증빙'];
const procSheet = { name: '외부설비 조달대장', rows: [['설비 조달·설치 대장'], ['시험용'], ['납기 …'], [], QH, ['설비01', '비상발전기', '본체·연료탱크', '발주자 소유', 'W2.2', '2027-03-05', '2027-04-02', '2027-04-16', '2027-04-23', 4, null, '납기 견적 미확보', '', '', 'W2.1 → W2.2 → W2.3 → W2.3 → W2.4 → W2.5', '전기공사업체', '', 0, 5, '2027-04-16', null, '미확정', null, 0, null, '미확약', '']] };
const GH = ['게이트', '연결 WBS', '승인 사항', '계획 승인일', '통과 증빙', '승인 역할', '미충족 처리', '연계업무', '상태'];
const gateSheet = list => ({ name: '승인게이트', rows: [[], ['단계별 승인 및 중단 조건'], ['시험용'], GH, ...list] });
const G1 = ['G1', 'W1.2', '타당성 승인', '2027-01-29', '사업계획 승인', '투자승인권자', '발주 보류', 'W1.1', '확인 전'], G2 = ['G2', 'W2.1', '설계 동결', '2027-02-26', '도면 승인', '사업총괄', '사양 확정 보류', 'W2.1', '확인 전'];
const evSheet = { name: '보완·확약관리', rows: [[], ['수정 반영 및 남은 확약사항'], ['시험용'], [], ['ID', '검토 항목', '연결 WBS·위치', '모델 반영내용', '남은 확인·입력', '확인 역할', '관리기한', '확인상태', '완료 확인일', '확약·완료 증빙', '담당자'], ['R01', '납기 확약', 'W2.3', '반영', '견적 확보', '구매', '2027-03-01', '확인 필요'], ['R02', '수전 일정', 'W2.4', '반영', '한전 회신', '시설', '2027-03-20', '확인 필요']] };
const sumSheet = day => ({ name: '검토요약', rows: [[], ['시험 프로젝트 마스터스케줄'], ['시험용'], ['항목', '적용', '설명'], ['기준일', day, '예측 상태일'], ['계획 성격', '시험', '']] });

(async () => {
  const browser = await chromium.launch();
  const A = await newUser(browser, 'RXA' + sfx, '열두 일', { url: V2 }), a = A.page;
  const ev = (f, x) => a.evaluate(f, x);
  const book = sheets => ev(async s => { const X = await schXlsx(), u = new Uint8Array(await X.makeBook(s)); let bin = ''; for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(bin); }, sheets).then(b => Buffer.from(b, 'base64'));
  // a file goes into the one field of the action window or, with a fourth value, into a row of the other window
  const put = async (files, pg = a) => { for (const f of files) { await pg.setInputFiles(`#dlg.sch-up input[data-slot="${f[3] || 'act'}"]`, [{ name: f[0], mimeType: f[2] || XL, buffer: f[1] }]); await pg.waitForFunction(() => !document.querySelector('#dlg.sch-up .rd'), null, { timeout: 30000 }); await sleep(150); }
    await pg.waitForFunction(() => !document.querySelector('#dlg.sch-up .rd') && !!document.querySelector('#dlg.sch-up .up-res, #dlg.sch-up .up-nt.err'), null, { timeout: 30000 }); await sleep(200); };
  const win = () => ev(() => { const d = document.querySelector('#dlg.sch-up'); if (!d) return null; const P = SCHUP.plan || {}, t = e => [...e.childNodes].map(n => n.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');   // the cells of a row, one space between
    return { rows: [...d.querySelectorAll('.up-row')].map(t), off: d.querySelectorAll('.up-row.off').length, notes: [...d.querySelectorAll('.up-nt')].map(t), warn: [...d.querySelectorAll('.up-wn')].map(t), info: [...d.querySelectorAll('.up-ft.inf')].map(t), say: [...d.querySelectorAll('.up-say')].map(t).join(' '), ok: !d.querySelector('[data-up="ok"]').disabled, tags: [...d.querySelectorAll('.up-tags span')].map(t), files: d.querySelectorAll('.up-part.has').length + (d.querySelector('.up-drop.has') ? 1 : 0), parts: Object.fromEntries([...d.querySelectorAll('.up-part')].map(p => [p.dataset.slot, p.classList.contains('bad') ? 'bad' : (p.querySelector('.cnt') || {}).textContent || ''])), same: !!P.same, err: P.error || '', replaced: P.replaced || 0, small: !!d.querySelector('.up-drop.has') }; });
  const apply = async () => { await a.click('#dlg [data-up="ok"]'); await a.waitForFunction(() => !document.querySelector('#dlg'), null, { timeout: 20000 }); await sleep(500); };
  const openUp = async (mode = 'act') => { await a.click(`.page.on [data-sch="upload"][data-k="${mode}"]`); await sleep(350); };
  const st = (pg, p) => pg.evaluate(p => { const m = schReady(p) ? schModel(p) : null; if (!m) return null; const w = x => { const t = m.byWbs.get(x); return t ? { id: t.id, name: t.name, st: t.status, ps: t.plannedStart, pf: t.plannedFinish, rs: t.referenceStart, prog: t.progress, pri: t.pri || '', A: t.roles.A, kind: t.kind, ph: t.phaseLabel } : null; };
    return { n: m.plan.tasks.length, l: m.plan.dependencies.length, p: m.plan.procurement.length, g: schGates(p, m).map(g => g.code + ':' + g.title).sort(), ev: schEvRows(p, 'commitmentReviews').length, sd: m.plan.statusDate, op: m.res.operationDate, src: ((SCHED[p] || {}).src || {}).id || '', keys: Object.keys(SCHED[p] || {}).filter(k => /^[tdp]:/.test(k)).length,
      w11: w('W1.1'), w12: w('W1.2'), w21: w('W2.1'), w22: w('W2.2'), w25: w('W2.5'), w26: w('W2.6'), w27: w('W2.7'), w31: w('W3.1') }; }, p);

  console.log('— the button and the window');
  await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 20000 }); await sleep(700);
  const bt = await ev(() => { const b = document.querySelector('.phead .ttl [data-schup]'), e = document.querySelector('.phead .ttl [data-editproj]'); if (!b || !e) return null; const r = b.getBoundingClientRect(), q = e.getBoundingClientRect(); return { text: b.textContent.trim(), gap: Math.round(r.left - q.right), dy: Math.abs(Math.round(r.top - q.top)), h: Math.round(r.height * 10) / 10, eh: Math.round(q.height * 10) / 10 }; });
  check('"개요 업로드" stands right of 수정 on the project title, at the same height (the schedule\'s files are let go in their sections)', bt && bt.text === '개요 업로드' && bt.gap >= 4 && bt.gap <= 14 && bt.dy <= 1 && bt.h === bt.eh, bt);
  await a.click('[data-editproj]'); await sleep(500);
  const whileEdit = await ev(() => !!document.querySelector('[data-schup]')); await a.click('[data-canceledit]'); await sleep(500);
  check('it is not there while the overview is being edited', whileEdit === false && await ev(() => !!document.querySelector('[data-schup]')));
  await openUp();
  const w0 = await ev(() => { const d = document.querySelector('#dlg.sch-up'), z = d && d.querySelector('.up-drop'); if (!z) return null; const c = getComputedStyle(z), t = d.querySelector('.up-ttl'), b = d.querySelector('.box').getBoundingClientRect(), tr = t.getBoundingClientRect();
    return { title: t.textContent, centred: Math.abs((tr.left + tr.right) / 2 - (b.left + b.right) / 2) < 2, sub: d.querySelector('.up-sub').textContent, style: c.borderTopStyle, radius: c.borderTopLeftRadius, h: z.offsetHeight, pic: !!z.querySelector('svg.up-pic'), say: z.textContent.trim(), ok: d.querySelector('[data-up="ok"]').disabled, multi: [...d.querySelectorAll('.up-parts .up-part b')].map(x => x.textContent).join(), jin: d.classList.contains('j-in') }; });
  check('the action window: a centred title, one grey line, one large dashed rounded field with a folder for the schedule file', w0 && w0.title === '액션 일정 업로드' && w0.centred && /일정 파일 하나로 액션 일정 · 리스트 · 관계도를 함께/.test(w0.sub) && w0.style === 'dashed' && w0.radius === '20px' && w0.h >= 170 && w0.pic && /끌어다 놓거나 눌러서 선택/.test(w0.say) && w0.ok === true && w0.multi === '', w0);
  const btns = await ev(() => ({ up: [...document.querySelectorAll('.page.on [data-sch="upload"]')].map(b => b.dataset.k + ':' + b.textContent.trim() + (b.querySelector('svg use') ? '*' : '')).join(), xl: document.querySelectorAll('.page.on [data-sch="xlsx"]').length }));
  check('each of the two sections has one 업로드 button with a pictogram, and no section has an export button', btns.up === 'act:업로드*,ext:업로드*' && btns.xl === 0, btns);
  await put([['메모.txt', Buffer.from('x'), 'text/plain']]);
  const wTxt = await win();
  check('a file that is no workbook is told so and nothing can be applied', wTxt.files === 1 && wTxt.notes.some(n => /엑셀\(\.xlsx\) 파일만/.test(n)) && wTxt.ok === false, wTxt);
  await a.keyboard.press('Escape'); await sleep(300);
  check('Escape closes the window', await ev(() => !document.querySelector('#dlg')));

  await openUp('ext');
  const wx = await ev(() => { const d = document.querySelector('#dlg.sch-up'); return d ? { title: d.querySelector('.up-ttl').textContent, drop: !!d.querySelector('.up-drop'), rows: [...d.querySelectorAll('.up-parts .up-part b')].map(x => x.textContent).join() } : null; });
  check('the other window: three rows, a file each — 외부설비 조달, 승인게이트, 근거 및 확약', wx && /외부설비 · 승인게이트 · 근거 및 확약 업로드/.test(wx.title) && !wx.drop && wx.rows === '외부설비 조달,승인게이트,근거 및 확약', wx);
  await a.keyboard.press('Escape'); await sleep(300);

  console.log('— a master file into a new project');
  await ev(() => go('main')); await sleep(500); await a.click('.new-proj'); await sleep(400);
  await a.fill('#np2-name', '엑셀 시험 ' + sfx); await a.click('[data-np2="ok"]'); await sleep(900);
  if (await a.$('[data-editproj].on')) { await a.click('[data-editproj]'); await sleep(900); }
  const pid = await ev(() => S.proj); await ev(() => sharedFlush(true)); await sleep(900);
  const B = await newUser(browser, 'RXB' + sfx, '열두 이', { url: V2 }), b = B.page;
  await b.evaluate(p => go('project:' + p), pid); await b.waitForFunction(p => schReady(p), pid, { timeout: 20000 }); await sleep(600);
  const s0 = await st(a, pid);
  const master = await book([sumSheet('2027-01-04'), taskSheet(TASKS), linkSheet(CHAIN), procSheet, gateSheet([G1, G2]), evSheet]);
  await openUp(); await put([['마스터.xlsx', master]]);
  const w1 = await win();
  check('the action window reads the schedule of the file — tasks, relations, the status date — and nothing else of it', w1.small && ['일정 · 리스트 8', '관계도 7'].every(x => w1.tags.some(t => t.replace(/\s+/g, ' ') === x)) && w1.tags.some(t => /기준일\s*2027\. 01\. 04/.test(t)) && !w1.tags.some(t => /외부설비|승인게이트|확약/.test(t)), w1.tags);
  check('before 적용 the window says what will be in the project and what that does to the operation date', w1.rows.some(r => /액션 일정 · 리스트 8건 새로 8/.test(r)) && w1.rows.some(r => /액션 관계도 7건 새로 7/.test(r)) && !w1.rows.some(r => /외부설비|승인게이트|근거/.test(r)) && w1.rows.some(r => /운영개시 예상 미정 → 2027\. 05\. 03/.test(r)) && w1.off === 0 && w1.ok, w1.rows);
  check('nothing is written before 적용', s0.n === 0 && (await st(a, pid)).n === 0 && (await st(a, pid)).src === '');
  await apply(); const s1a = await st(a, pid);
  check('applied: one file filled 일정 · 리스트 · 관계도 together, with the status date; the other sections are untouched', s1a.n === 8 && s1a.l === 7 && s1a.p === 0 && s1a.g.length === 0 && s1a.ev === 0 && s1a.sd === '2027-01-04' && s1a.op === '2027-05-03' && s1a.w31.kind === 'milestone' && s1a.w11.ph === '1 기획' && s1a.w11.A === '사업총괄' && s1a.keys === 0 && !!s1a.src, s1a);
  check('a new task takes its id from the project and its WBS', s1a.w11.id === pid + ':task:W1.1', s1a.w11);
  const shown = await ev(() => ({ toast: (document.querySelector('#toast') || {}).textContent || '', rows: document.querySelectorAll('#sch-gantt .sg-left .sg-row').length, phases: [...document.querySelectorAll('#sch-gantt .sg-left .sg-row.ph')].length }));
  check('the page shows it at once (the gantt has the three phases) and the toast offers 되돌리기', /엑셀 내용을 반영했습니다 · 액션 8건 · 관계 7건/.test(shown.toast) && /되돌리기/.test(shown.toast) && shown.phases === 3, shown);
  const files = await ev(async p => (await sharedListFiles()).filter(f => f.item === 'sched-src-' + p).map(f => ({ name: f.name, size: f.size })), pid);
  check('the plan is one small stored file of the project', files.length === 1 && files[0].size > 300 && files[0].size < 60000, files);
  // the same workbook, a row each, in the other window
  await openUp('ext'); await put([['마스터.xlsx', master, null, 'proc'], ['마스터.xlsx', master, null, 'gates'], ['마스터.xlsx', master, null, 'evid']]); const w1x = await win();
  check('the three rows each take their own sheet of a file and say how many they read', w1x.files === 3 && w1x.parts.proc === '1건' && w1x.parts.gates === '2건' && w1x.parts.evid === '2건' && w1x.rows.some(r => /외부설비 조달 1건 새로 1/.test(r)) && w1x.rows.some(r => /승인게이트 2건 새로 2/.test(r)) && w1x.rows.some(r => /근거 및 확약 2건 새로 2/.test(r)) && !w1x.rows.some(r => /액션/.test(r)) && w1x.off === 0 && w1x.ok, w1x);
  await apply(); const s1 = await st(a, pid);
  check('applied: the package, the gates and the records are in; the schedule is as it was', s1.p === 1 && s1.g.join() === 'G1:타당성 승인,G2:설계 동결' && s1.ev === 2 && s1.n === 8 && s1.l === 7 && s1.op === s1a.op && s1.src !== s1a.src, s1);
  await ev(() => sharedFlush(true)); await sleep(2500);
  const b1 = await st(b, pid);
  check('the other member sees it without reloading (their page fetches the stored plan)', b1 && b1.n === 8 && b1.l === 7 && b1.p === 1 && b1.op === '2027-05-03' && b1.src === s1.src, b1);

  console.log('— one section alone');
  const gates = await book([gateSheet([[...G1.slice(0, 2), '타당성 최종 승인', ...G1.slice(3)], G2, ['G3', 'W2.5', '설치 검수', '2027-04-23', 'SAT 성적서', '사업총괄', '운영 보류', 'W2.4', '확인 전']])]);
  await openUp('ext'); await put([['승인게이트만.xlsx', gates, null, 'gates']]); const w2 = await win();
  check('a file with only 승인게이트: that row says what changes, the other two say "올리지 않음"', w2.rows.some(r => /승인게이트 3건 새로 1 · 바뀜 1/.test(r)) && w2.off === 2 && w2.rows.filter(r => /올리지 않음 · 그대로/.test(r)).length === 2 && w2.ok, w2.rows);
  await apply(); const s2 = await st(a, pid);
  check('applied: three gates, everything else as it was', s2.g.join() === 'G1:타당성 최종 승인,G2:설계 동결,G3:설치 검수' && s2.n === 8 && s2.l === 7 && s2.p === 1 && s2.ev === 2 && s2.op === s1.op && s2.src !== s1.src, s2);

  console.log('— what members changed in the app');
  await ev(p => { const A = AIDCSchedule; schCommit(p, d => { const x = d.tasks.find(t => t.wbs === 'W1.1'); x.status = '진행'; const y = d.tasks.find(t => t.wbs === 'W2.1'); y.plannedStart = '2027-02-03'; y.plannedFinish = '2027-03-02'; d.tasks.find(t => t.wbs === 'W2.2').pri = 'high'; }, '', true);
    schCommit(p, d => { const t = A.newTask(d, 'W2'); t.name = '앱에서 추가한 업무'; t.plannedStart = t.referenceStart = '2027-03-10'; t.plannedFinish = t.referenceFinish = '2027-03-12'; d.tasks.push(t); }, '', true); }, pid);
  await sleep(400); const s3 = await st(a, pid);
  check('(setup) a state, moved dates, an importance and a task added in the app', s3.w11.st === '진행' && s3.w21.ps === '2027-02-03' && s3.w22.pri === 'high' && s3.n === 9 && s3.w26 && s3.w26.name === '앱에서 추가한 업무', s3);
  const T2 = { ...TASKS, 'W1.2': ['타당성 검토(개정)', '2027-01-18', '2027-01-29'], 'W2.1': ['기본 설계', '2027-02-08', '2027-03-05'], 'W2.7': ['시운전', '2027-04-26', '2027-04-30'] }; delete T2['W2.5'];
  await openUp(); await put([['일정만.xlsx', await book([taskSheet(T2)])]]); const w3 = await win();
  check('tasks alone: new / changed / gone are counted, and what goes with a task that is gone is told', w3.rows.some(r => /액션 일정 · 리스트 9건 새로 1 · 바뀜 2 · 없어짐 1/.test(r)) && w3.warn.some(x => /관계 2건이 함께 빠집니다/.test(x)) && w3.warn.some(x => /외부설비 1건은 연결 업무/.test(x)) && w3.off === 1, w3);
  check('a value changed in the app and in the workbook becomes the workbook\'s, and the window says how many', w3.replaced === 2 && w3.warn.some(x => /앱에서 고친 값 가운데 2건은 엑셀에서도 바뀐 칸/.test(x)), w3.warn);
  await apply(); const s4 = await st(a, pid);
  check('applied: the workbook\'s dates win where it changed them, the app\'s state / importance / added task stay', s4.w21.ps === '2027-02-08' && s4.w21.pf === '2027-03-05' && s4.w11.st === '진행' && s4.w22.pri === 'high' && s4.w26 && s4.w26.name === '앱에서 추가한 업무' && s4.w12.name === '타당성 검토(개정)' && !s4.w25 && s4.w27 && s4.w27.id === pid + ':task:W2.7' && s4.n === 9 && s4.l === 5 && s4.p === 0, s4);
  check('a task keeps its id through an upload (its body, comments and files stay attached)', s4.w11.id === s1.w11.id && s4.w21.id === s1.w21.id && s4.w26.id === s3.w26.id);

  console.log('— tasks and relations in one file, a relation to a task that is not there');
  const T3 = { ...T2, 'W2.5': TASKS['W2.5'] }, L3 = [...CHAIN, ['W2.7', 'W3.1', 'SS', 2], ['W9.9', 'W3.1']];
  await openUp(); await put([['일정과 관계.xlsx', await book([taskSheet(T3), linkSheet(L3)])]]); const w4 = await win();
  check('one file with both sheets: the field shows how many of each it read; the relation without a task is left out and told', w4.files === 1 && ['일정 · 리스트 9', '관계도 9'].every(x => w4.tags.some(t => t.replace(/\s+/g, ' ') === x)) && w4.warn.some(x => /업무 목록에 없는 WBS를 가리키는 관계 1건/.test(x)) && w4.rows.some(r => /액션 관계도 8건/.test(r)) && w4.off === 0, w4);
  await apply(); const s5 = await st(a, pid);
  check('applied: the task is back (same id), eight relations, the package shows again', s5.n === 10 && s5.w25 && s5.w25.id === s1.w25.id && s5.l === 8 && s5.p === 1 && s5.w26, s5);
  const lag = await ev(p => { const m = schModel(p), e = m.plan.dependencies.find(e => m.byId.get(e.from).wbs === 'W2.7'); return e && { type: e.type, lag: e.lag, to: m.byId.get(e.to).wbs }; }, pid);
  check('a relation carries its type and its extra days', lag && lag.type === 'SS' && lag.lag === 2 && lag.to === 'W3.1', lag);

  console.log('— the gantt sheet alone (마스터스케줄)');
  const MH = ['WBS', null, '작업명', '기간 Day', '기간 Week', '예상 시작일', '예상 완료일', '선행 WBS [유형]', '후속 WBS [유형]', '진척률', '주 담당', '부 담당', '운영 여유 / CP'];
  const mrows = [['통합 개발 일정'], ['운영개시 예상'], ['시험용'], ['조건부'], MH, []]; let lastPh = '';
  for (const [w, v] of Object.entries(T3)) { const ph = w.split('.')[0]; if (ph !== lastPh) { mrows.push([ph, null, PH[ph]]); lastPh = ph; } const ms = !!(v[3] && v[3].ms), s = w === 'W1.1' ? '2027-01-11' : v[1], f = w === 'W1.1' ? '2027-01-22' : v[2]; mrows.push([w, null, v[0], ms ? 0 : 5, 1, s, f, '—', '—', w === 'W1.1' ? 0.5 : null, null, null, '여유']); mrows.push([]); }
  await openUp(); await put([['간트만.xlsx', await book([{ name: '마스터스케줄', rows: mrows }])]]); const w5 = await win();
  check('the gantt sheet alone is read for names, dates, progress; the window says so', w5.tags.some(t => t.replace(/\s+/g, ' ') === '일정(날짜) 9') && w5.notes.some(n => /작업명·날짜·진척률·담당만 읽습니다/.test(n)) && w5.rows.some(r => /액션 일정 · 리스트 10건 바뀜 1 \(날짜·작업명만\)/.test(r)) && w5.ok, w5);
  await apply(); const s6 = await st(a, pid);
  check('applied: the dates and the progress of the task changed, its roles and its state stayed', s6.w11.rs === '2027-01-11' && s6.w11.prog === 0.5 && s6.w11.A === '사업총괄' && s6.w11.st === '진행' && s6.w31.kind === 'milestone' && s6.n === 10 && s6.l === 8, s6);
  await openUp(); await put([['간트만.xlsx', await book([{ name: '마스터스케줄', rows: mrows }])]]); const w6 = await win();
  check('the same content again: "바뀌는 것이 없습니다" and nothing to apply', w6.same && /바뀌는 것이 없습니다/.test(w6.say) && w6.ok === false, w6);
  await a.click('#dlg [data-up="x"]'); await sleep(300);

  console.log('— a row takes only its own sheet');
  await openUp('ext'); await put([['일정만.xlsx', await book([taskSheet(T3)]), null, 'gates']]); const x1 = await win();
  check('a file without the row\'s sheet is told so and cannot be applied', x1.parts.gates === 'bad' && x1.notes.some(n => /이 파일에는 승인게이트 시트가 없습니다/.test(n)) && x1.ok === false, x1);
  await a.click('#dlg [data-up="rm"]'); await sleep(200);
  await put([['마스터.xlsx', master, null, 'proc'], ['게이트 하나.xlsx', await book([gateSheet([G1])]), null, 'gates']]); const x2 = await win();
  check('two rows filled from two files: each row counts its own', x2.files === 2 && x2.parts.proc === '1건' && x2.parts.gates === '1건' && x2.rows.some(r => /승인게이트 1건/.test(r)) && x2.rows.some(r => /근거 및 확약.*올리지 않음/.test(r)), x2);
  await a.click('#dlg [data-up="x"]'); await sleep(300);
  await openUp(); await put([['승인게이트만.xlsx', gates]]); const x3 = await win();
  check('the action window refuses a file without a schedule sheet', x3.notes.some(n => /이 파일에는 일정 시트\(단계별업무분장 · 마스터스케줄 · 업무연결\)가 없습니다/.test(n)) && x3.ok === false, x3);
  await a.click('#dlg [data-up="x"]'); await sleep(300);

  console.log('— what cannot be read or worked out');
  await openUp(); await put([['유형오류.xlsx', await book([linkSheet([['W1.1', 'W1.2', 'XX']])])]]); const e1 = await win();
  check('a relation of an unknown type: the sheet is told with its row and is not applied', e1.notes.some(n => /업무연결.*유형 "XX"/.test(n) && /이 시트는 반영하지 않습니다/.test(n)) && /반영할 수 있는 시트가 없습니다/.test(e1.say) && e1.ok === false, e1);
  await a.click('#dlg [data-up="rm"]'); await sleep(200);
  check('a file can be taken out of the list again', (await win()).files === 0);
  await put([['순환.xlsx', await book([linkSheet([['W1.1', 'W1.2'], ['W1.2', 'W1.1']])])]]); const e2 = await win();
  check('relations that go in a circle cannot be worked out: told, nothing to apply', !!e2.err && /이대로는 반영할 수 없습니다/.test(await ev(() => (document.querySelector('#dlg .up-res.bad h4') || {}).textContent || '')) && e2.ok === false, e2.err);
  await a.click('#dlg [data-up="rm"]'); await sleep(200);
  await put([['날짜오류.xlsx', await book([taskSheet({ 'W1.1': ['기획 정리', '2027-01-15', '2027-01-04'] })])]]); const e3 = await win();
  check('a finish before its start is told with the row', e3.notes.some(n => /W1\.1: 완료일이 시작일보다 빠릅니다/.test(n)) && e3.ok === false, e3.notes);
  await a.click('#dlg [data-up="rm"]'); await sleep(200);
  await put([['앱내보내기.xlsx', await book([{ name: '단계별업무분장', rows: [['WBS', '단계', '업무명', '작업유형', '참조시작', '참조완료', '관리시작', '관리완료'], ['W1.1', '1 기획', '기획 정리', '작업', '2027-01-04', '2027-01-15', '2027-01-04', '2027-01-15']] }])]]); const e4 = await win();
  check('a table in the app\'s own export layout is recognised and refused in plain words', e4.notes.some(n => /앱에서 내보낸 파일의 표 형식/.test(n)) && e4.ok === false, e4.notes);
  await a.click('#dlg [data-up="rm"]'); await sleep(200);
  await put([['다른시트.xlsx', await book([{ name: 'Sheet1', rows: [['a', 'b'], [1, 2]] }])]]); const e5 = await win();
  check('a workbook without any of the guide\'s sheets says which sheets it found', e5.notes.some(n => /가이드 엑셀의 시트를 찾지 못했습니다.*Sheet1/.test(n)) && e5.ok === false, e5.notes);
  await a.click('#dlg [data-up="x"]'); await sleep(300);
  check('none of that changed the project', JSON.stringify(await st(a, pid)) === JSON.stringify(s6));
  await openUp(); await put([['이름이 다른 시트.xlsx', await book([{ ...taskSheet(T3), name: '일정표(개정)' }, { ...linkSheet(CHAIN), name: '선후관계' }])]]); const n1 = await win();
  check('sheets under other names are found by their heads, and the window says which', ['일정 · 리스트 9', '관계도 7'].every(x => n1.tags.some(t => t.replace(/\s+/g, ' ') === x)) && n1.notes.some(n => /시트 이름이 달라 머리글로 찾았습니다: "일정표\(개정\)"/.test(n)) && n1.notes.some(n => /머리글로 찾았습니다: "선후관계"/.test(n)), n1);
  await a.click('#dlg [data-up="x"]'); await sleep(300);

  console.log('— undo, the other member, reload');
  await ev(() => sharedFlush(true)); await sleep(2500); const b6 = await st(b, pid);
  check('the other member has followed every upload', b6 && b6.n === 10 && b6.l === 8 && b6.w11.rs === '2027-01-11' && b6.w11.st === '진행' && b6.g.length === 3 && b6.src === s6.src, b6);
  await ev(() => schUndo()); await sleep(500); const u1 = await st(a, pid);
  check('one undo takes the last upload back (the plan and the changes together)', u1.w11.rs === s5.w11.rs && u1.w11.prog === null && u1.src === s5.src && u1.n === 10, u1);
  await ev(() => sharedFlush(true)); await sleep(2500); const ub = await st(b, pid);
  check('and the other member follows the undo', ub && ub.w11.rs === s5.w11.rs && ub.src === s5.src, ub);
  await ev(() => schRedo()); await sleep(400); await ev(() => sharedFlush(true)); await sleep(1200);
  await a.reload(); await a.waitForFunction(() => !document.querySelector('#app').hidden); await a.waitForFunction(p => typeof schReady === 'function' && schReady(p), pid, { timeout: 20000 }); await sleep(700);
  const r1 = await st(a, pid);
  check('after a reload the project is as it was left', r1 && r1.n === 10 && r1.l === 8 && r1.w11.rs === '2027-01-11' && r1.w11.st === '진행' && r1.w22.pri === 'high' && r1.g.length === 3 && r1.src === s6.src, r1);
  await openUp(); const cur = await ev(() => (document.querySelector('#dlg .up-cur') || {}).textContent || ''); await a.keyboard.press('Escape'); await sleep(200);
  check('the window names the workbook that is in the project now', /지금 반영된 엑셀 · 간트만\.xlsx/.test(cur) && /열두 일/.test(cur), cur);

  console.log('— 판교 and the page without the preview');
  await ev(() => go('project:pangyo')); await a.waitForFunction(() => schReady('pangyo'), null, { timeout: 20000 }); await sleep(500);
  const pg = await ev(() => { const m = schModel('pangyo'); return { n: m.plan.tasks.length, op: m.res.operationDate, src: (SCHED.pangyo || {}).src || null }; });
  check('a project nobody uploaded to keeps its built-in plan', pg.n >= 233 && !pg.src, pg);
  const C = await newUser(browser, 'RXC' + sfx, '열두 삼', { url: V1 }), c = C.page;
  await c.evaluate(() => go('project:pangyo')); await sleep(900);
  check('without the preview there is no upload button', await c.evaluate(() => !document.querySelector('[data-schup]') && !!document.querySelector('[data-editproj]')));

  // clean up: the test project goes to the trash
  await ev(p => { if (PROJECTS[p]) trashProject(p); }, pid); await ev(() => sharedFlush(true)); await sleep(900);
  const errs = [...A.errs, ...B.errs, ...C.errs];
  check('no script errors', errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); process.exit(1); });
