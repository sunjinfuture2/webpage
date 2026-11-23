// Excel for the schedule: the Schedule app's own reader and writer (schedule/core/files.ts, unchanged) with ExcelJS.
// It is a bundle of its own (public/schedule-xlsx.js, about 1 MB) that the page loads only when a member asks for Excel.
import { importFile, makeXlsx } from './core/files';

// A plain workbook from rows the page hands over (the page's own export, 2026-11-20): one sheet per table in the look of the
// Schedule app's export (dark first row, frozen, with a filter), opened on the sheet that was asked for.
async function makeBook(sheets: { name: string; rows: unknown[][]; widths?: number[] }[], active?: string): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const book = new ExcelJS.Workbook(); book.creator = 'AIDC WorkSpace'; book.created = new Date();
  for (const s of sheets) {
    const sheet = book.addWorksheet(s.name); sheet.addRows(s.rows); sheet.views = [{ state: 'frozen', ySplit: 1 }];
    const head = sheet.getRow(1); head.font = { name: '맑은 고딕', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }; head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F4F4F' } }; head.height = 28; head.alignment = { vertical: 'middle' };
    sheet.columns?.forEach((c, i) => { c.width = (s.widths && s.widths[i]) || (i < 2 ? 18 : 28); });
    if (s.rows.length > 1) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: s.rows.length, column: s.rows[0].length } };
  }
  const at = Math.max(0, sheets.findIndex(s => s.name === active));
  book.views = [{ x: 0, y: 0, width: 24000, height: 14000, firstSheet: 0, activeTab: at, visibility: 'visible' }];
  return new Uint8Array(await book.xlsx.writeBuffer()).buffer as ArrayBuffer;
}

// ---- Reading the owner's guide workbook for the upload window (owner, 2026-11-23; schedule/ui/82-upload.js) ----
// The Schedule app's importFile wants all thirteen sheets at fixed rows. An upload may be the whole workbook or a file that holds
// only some of its sheets, so every known sheet is read on its own: the header row is looked for (first cell), columns are found by
// their titles, and whatever is wrong is told per sheet instead of refusing the file. Nothing here knows the project: the page gives
// the tasks their ids and merges the result into the project's source plan.
type Val = string | number | null;
type Note = { sheet: string; level: 'error' | 'warn' | 'info'; text: string };
const RECORD_SHEETS: Record<string, { kind: string; first: string; need: string[] }> = {
  '승인게이트': { kind: 'gates', first: '게이트', need: ['연결 WBS', '승인 사항'] },
  '외부설비 조달대장': { kind: 'procurementPackages', first: '패키지', need: ['설비', '계약·PO WBS', '연결 WBS 순서'] },
  '책임경계': { kind: 'responsibilityBoundaries', first: '경계', need: [] },
  '전제와참고자료': { kind: 'assumptionsAndReferences', first: 'ID', need: ['항목'] },
  '원자료대조': { kind: 'sourceMappings', first: '원ID', need: ['원업무명'] },
  'NVIS일정검토': { kind: 'nvisScheduleReview', first: '구분', need: ['항목'] },
  '오프테이커 후보검토': { kind: 'offtakers', first: '구분', need: ['업체'] },
  '보완·확약관리': { kind: 'commitmentReviews', first: 'ID', need: ['검토 항목'] },
};
const DATE_HEADS = new Set(['계획 승인일', 'PO 목표', '납품완료 목표', '설치완료 목표', '단위 SAT 목표', '변경 설치완료', '견적 확보일', '기산조건 충족일', '확약 기준 예상납품', '관리기한', '완료 확인일', '시작', '완료']);
// planFromSource reads a package by the letters of the original sheet: they are rebuilt from the titles, so a moved column still lands
const PROC_LETTERS: Record<string, string> = { A: '패키지', B: '설비', E: '계약·PO WBS', K: '확약 납기 Week', M: '업체·계약상태', O: '연결 WBS 순서', R: 'PO 추가지연 Day', V: '납기 기산조건', W: '기산조건 충족일', X: '추가 운송 Day', Z: '확약 상태', AA: '견적·조건 증빙' };
const TASK_HEADS: Record<string, string[]> = {
  phase: ['개발단계'], name: ['업무패키지', '작업명'], start: ['시작일', '예상 시작일'], finish: ['완료일', '예상 완료일'], days: ['기간 Day'],
  roleA: ['승인 역할'], roleR: ['실행 역할'], roleC: ['협의 역할'], criteria: ['완료기준·조건'], primary: ['주 담당'], secondary: ['부 담당'],
  progress: ['진척률'], status: ['상태'], slack: ['운영 총여유 Day'], kind: ['작업유형'], delay: ['기타 추가지연 Day'], actualStart: ['실제 시작일'], actualFinish: ['실제 완료일'],
  remaining: ['잔여기간 Day'], conditions: ['확약·조건 / 원상태'], evidence: ['증빙·확인사항'], fStart: ['예상 시작일'], fFinish: ['예상 완료일'], calendar: ['달력·휴일 조건'], headcount: ['투입인원'],
};
const squash = (v: unknown) => String(v ?? '').replace(/\s+/g, '');
const letters = (index: number) => { let s = ''; for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
const pad2 = (n: number) => String(n).padStart(2, '0');
const serialDay = (n: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000).toISOString().slice(0, 10);
function dayOf(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(+v) ? null : v.toISOString().slice(0, 10);
  if (typeof v === 'number') return v > 20000 && v < 80000 ? serialDay(v) : null;
  const m = /^\s*(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/.exec(String(v)); if (!m) return null;
  const d = `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`; const t = new Date(d + 'T00:00:00Z');
  return isNaN(+t) || t.toISOString().slice(0, 10) !== d ? null : d;
}
async function readSheets(file: File, opt?: { tasks?: 'list' | 'gantt' }) {
  if (file.size > 25 * 1024 * 1024) throw new Error('25MB 이하의 엑셀 파일을 선택해주세요.');
  if (!/\.xlsx$/i.test(file.name)) throw new Error('엑셀(.xlsx) 파일만 올릴 수 있습니다.');
  const ExcelJS = (await import('exceljs')).default, book = new ExcelJS.Workbook();
  const bytes = await file.arrayBuffer();
  try { await book.xlsx.load(bytes); } catch (e) { throw new Error('엑셀 파일을 열지 못했습니다. 암호가 걸렸거나 손상된 파일일 수 있습니다.'); }
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
  const notes: Note[] = [], note = (sheet: string, level: Note['level'], text: string) => { if (notes.filter(n => n.sheet === sheet && n.level === level).length < 8) notes.push({ sheet, level, text }); };
  let broken = 0;
  const value = (v: unknown): Val => {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return isNaN(+v) ? null : v.toISOString().slice(0, 10);
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') return v.length > 4000 ? v.slice(0, 4000) : v;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    const o = v as { formula?: string; sharedFormula?: string; result?: unknown; text?: string; richText?: Array<{ text: string }>; error?: string; hyperlink?: string };
    if (o.error) { broken++; return null; }
    if (o.formula !== undefined || o.sharedFormula !== undefined) return value(o.result);
    if (o.richText) return value(o.richText.map(t => t.text).join(''));
    if (o.text !== undefined) return value(typeof o.text === 'object' ? (o.text as any).richText?.map((t: any) => t.text).join('') : o.text);
    return null;
  };
  // ExcelJS's formula-value getter omits falsey cached results (a zero): the result is read on its own
  // A cell that is merged into another one hands out that one's value: only the first cell of a merge counts (the gantt sheet of the
  // guide merges five rows per task, which read as the same WBS five times).
  const at = (ws: any, row: number, col: number): Val => { const c = ws.getCell(row, col); if (c.isMerged && c.master && c.master.address !== c.address) return null; return value(c.type === ExcelJS.ValueType.Formula ? c.result : c.value); };
  const text = (v: unknown) => v === null || v === undefined ? '' : String(v).trim();
  const num = (v: unknown): number | null => { if (v === null || v === undefined || v === '') return null; const n = typeof v === 'number' ? v : Number(String(v).replace(/[,%\s]/g, '')); return Number.isFinite(n) ? n : null; };
  const width = (ws: any) => Math.min(Math.max(1, ws.columnCount || 1), 60);
  const headerRow = (ws: any, first: string) => { const want = squash(first); for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) if (squash(at(ws, r, 1)) === want) return r; return 0; };
  const heads = (ws: any, row: number) => { const map = new Map<string, number>(), list: string[] = []; for (let c = 1; c <= width(ws); c++) { const h = text(at(ws, row, c)); list.push(h); if (h && !map.has(squash(h))) map.set(squash(h), c); } while (list.length && !list[list.length - 1]) list.pop(); return { map, list }; };
  const wbsOf = (v: unknown) => { const s = squash(v).toUpperCase(); return /^W\d+\.\d+$/.test(s) ? s : ''; };

  const out: any = { name: file.name, size: file.size, sha, backup: false, found: [], other: [], notes, records: {} };
  const sheet = (name: string) => book.worksheets.find((w: any) => squash(w.name) === squash(name));
  out.backup = !!book.worksheets.find((w: any) => w.name === '__SUNJIN_BACKUP');
  const known = new Set(['검토요약', '마스터스케줄', '단계별업무분장', '업무연결', '운영영향 분석', ...Object.keys(RECORD_SHEETS)].map(squash));
  for (const w of book.worksheets as any[]) { if (w.name === '__SUNJIN_BACKUP') continue; (known.has(squash(w.name)) ? out.found : out.other).push(w.name); }

  // tasks: 단계별업무분장 (the input sheet), or the dates of 마스터스케줄 when the file has only that one
  const readTasks = (name: string, partial: boolean) => {
    const ws = sheet(name); if (!ws) return false;
    const hr = headerRow(ws, 'WBS'); if (!hr) { note(name, 'error', '머리글 행(첫 칸 "WBS")을 찾지 못했습니다.'); return true; }
    const H = heads(ws, hr), col = (k: string) => { for (const h of TASK_HEADS[k]) { const c = H.map.get(squash(h)); if (c) return c; } return 0; };
    if (H.map.has('업무명') && (H.map.has('참조시작') || H.map.has('관리시작'))) { note(name, 'error', '앱에서 내보낸 파일의 표 형식입니다. 가이드 엑셀 양식(단계별업무분장)으로 올려주세요.'); return true; }
    const C: Record<string, number> = {}; for (const k of Object.keys(TASK_HEADS)) C[k] = col(k);
    if (!partial) { C.fStart = H.map.get(squash('예상 시작일')) || 0; C.fFinish = H.map.get(squash('예상 완료일')) || 0; C.start = H.map.get(squash('시작일')) || 0; C.finish = H.map.get(squash('완료일')) || 0; }
    else { C.fStart = 0; C.fFinish = 0; }
    const missing = (['name', 'start', 'finish'] as const).filter(k => !C[k]).map(k => TASK_HEADS[k][0]);
    if (missing.length) { note(name, 'error', `필요한 열이 없습니다: ${missing.join(', ')}`); return true; }
    const tasks: any[] = [], seen = new Set<string>(); let phaseLabel = '', bad = 0;
    const g = (r: number, k: string) => C[k] ? at(ws, r, C[k]) : null;
    for (let r = hr + 1; r <= ws.rowCount && tasks.length < 5000; r++) {
      const a = at(ws, r, 1); if (a === null || a === '') continue;
      const wbs = wbsOf(a);
      if (!wbs) { if (/^W\d+$/i.test(squash(a))) phaseLabel = text(g(r, 'name')); continue; }   // a phase row of the gantt sheet names the tasks below it
      if (seen.has(wbs)) { note(name, 'error', `${r}행: WBS ${wbs}이(가) 두 번 나옵니다.`); bad++; continue; } seen.add(wbs);
      const start = dayOf(g(r, 'start')), finish = dayOf(g(r, 'finish'));
      if (!start || !finish) { note(name, 'error', `${r}행 ${wbs}: ${!start ? '시작일' : '완료일'}을 읽지 못했습니다. (수식이면 엑셀에서 계산·저장한 파일이어야 합니다)`); bad++; continue; }
      if (finish < start) { note(name, 'error', `${r}행 ${wbs}: 완료일이 시작일보다 빠릅니다.`); bad++; continue; }
      const kindText = text(g(r, 'kind')), days = num(g(r, 'days'));
      const kind = C.kind ? (kindText === '마일스톤' ? 'milestone' : 'task') : (C.days && days === 0 && start === finish ? 'milestone' : 'task');
      let progress = num(g(r, 'progress')); if (progress !== null) { if (progress > 1 && progress <= 100) progress = progress / 100; progress = Math.max(0, Math.min(1, progress)); }
      tasks.push({ row: r, wbs, phaseCode: wbs.split('.')[0], phase: C.phase ? text(g(r, 'phase')) : phaseLabel, name: text(g(r, 'name')) || wbs, kind, start, finish,
        fStart: dayOf(g(r, 'fStart')), fFinish: dayOf(g(r, 'fFinish')), slack: num(g(r, 'slack')),
        roleA: text(g(r, 'roleA')), roleR: text(g(r, 'roleR')), roleC: text(g(r, 'roleC')), criteria: text(g(r, 'criteria')),
        primary: text(g(r, 'primary')) || null, secondary: text(g(r, 'secondary')) || null, headcount: num(g(r, 'headcount')), progress, status: text(g(r, 'status')),
        delay: num(g(r, 'delay')), actualStart: dayOf(g(r, 'actualStart')), actualFinish: dayOf(g(r, 'actualFinish')), remaining: num(g(r, 'remaining')),
        conditions: text(g(r, 'conditions')), evidence: text(g(r, 'evidence')) || null, calendar: text(g(r, 'calendar')) });
    }
    if (bad) return true;
    if (!tasks.length) { note(name, 'error', 'WBS(W1.1 형식)가 있는 업무 행이 없습니다.'); return true; }
    out.tasks = tasks; out.tasksFrom = name; out.tasksPartial = partial; out.taskCols = Object.keys(C).filter(k => C[k]);
    if (partial) note(name, 'info', '이 시트에서는 작업명·날짜·진척률·담당만 읽습니다. 나머지 값은 그대로 둡니다.');
    return true;
  };
  // (the row "액션 일정" of the upload window asks for the gantt sheet first; everything else for the input sheet)
  if (opt && opt.tasks === 'gantt' && sheet('마스터스케줄')) readTasks('마스터스케줄', true);
  else if (sheet('단계별업무분장')) readTasks('단계별업무분장', false); else if (sheet('마스터스케줄')) readTasks('마스터스케줄', true);

  { const name = '업무연결', ws = sheet(name);
    if (ws) { const hr = headerRow(ws, '연결번호');
      if (!hr) note(name, 'error', '머리글 행(첫 칸 "연결번호")을 찾지 못했습니다. 가이드 엑셀의 머리글을 그대로 둔 시트여야 합니다.');
      else { const H = heads(ws, hr), c = (h: string) => H.map.get(squash(h)) || 0, F = c('선행 WBS'), T = c('후행 WBS'), Y = c('유형'), N = c('연계 조건'), A = c('기본 경로 적용'), L = c('추가간격 Day');
        if (!F || !T) note(name, 'error', '필요한 열이 없습니다: 선행 WBS, 후행 WBS');
        else { const links: any[] = []; let bad = 0;
          for (let r = hr + 1; r <= ws.rowCount && links.length < 20000; r++) {
            const from = wbsOf(at(ws, r, F)), to = wbsOf(at(ws, r, T)); if (!from && !to) continue;
            if (!from || !to || from === to) { note(name, 'error', `${r}행: 선행·후행 WBS를 확인해주세요.`); bad++; continue; }
            const type = (Y ? squash(at(ws, r, Y)).toUpperCase() : 'FS') || 'FS';
            if (!['FS', 'SS', 'FF', 'SF'].includes(type)) { note(name, 'error', `${r}행: 유형 "${type}"은(는) FS·SS·FF·SF 중 하나여야 합니다.`); bad++; continue; }
            const act = A ? text(at(ws, r, A)) : '적용';
            links.push({ row: r, sourceId: text(at(ws, r, 1)) || 'L' + String(links.length + 1).padStart(3, '0'), from, to, type, lag: (L ? num(at(ws, r, L)) : 0) || 0, active: act === '' || act === '적용', note: N ? text(at(ws, r, N)) : '' });
          }
          if (!bad) out.links = links; }
      } } }

  for (const [name, def] of Object.entries(RECORD_SHEETS)) {
    const ws = sheet(name); if (!ws) continue;
    const hr = headerRow(ws, def.first); if (!hr) { note(name, 'error', `머리글 행(첫 칸 "${def.first}")을 찾지 못했습니다. 가이드 엑셀의 머리글을 그대로 둔 시트여야 합니다.`); continue; }
    const H = heads(ws, hr), lack = def.need.filter(h => !H.map.has(squash(h)));
    if (lack.length) { note(name, 'error', `필요한 열이 없습니다: ${lack.join(', ')}`); continue; }
    const recs: any[] = [];
    for (let r = hr + 1; r <= ws.rowCount && recs.length < 5000; r++) {
      if (at(ws, r, 1) === null || text(at(ws, r, 1)) === '') continue;
      const fields: Record<string, Val> = {}, cells: Record<string, Val> = {};
      H.list.forEach((h, i) => { let v = at(ws, r, i + 1); if (v === null) return; if (DATE_HEADS.has(h) && typeof v === 'number') v = dayOf(v) ?? v; fields[h || letters(i + 1)] = v; cells[letters(i + 1)] = v; });
      if (def.kind === 'procurementPackages') { for (const k of Object.keys(cells)) delete cells[k]; for (const [letter, h] of Object.entries(PROC_LETTERS)) if (fields[h] !== undefined) cells[letter] = fields[h]; }
      recs.push({ provenance: { fileSha256: sha, sheet: name, row: r }, fields, sourceCells: cells });
    }
    out.records[def.kind] = recs;
    if (!recs.length) note(name, 'warn', '내용이 있는 행이 없습니다. 이 구역은 비워집니다.');
  }

  { const ws = sheet('검토요약');
    if (ws) { const rows: any[] = [];
      for (let r = 1; r <= Math.min(ws.rowCount, 200); r++) { const v: Record<string, Val> = {}; for (let c = 1; c <= 3; c++) { const x = at(ws, r, c); if (x !== null) v[letters(c)] = x; } rows.push({ row: r, values: v, raw: v });
        if (squash(v.A) === '기준일') { const d = dayOf(v.B); if (d) out.statusDate = d; else note('검토요약', 'warn', '기준일을 읽지 못했습니다. 지금의 기준일을 그대로 둡니다.'); } }
      if (out.statusDate) out.summary = rows; } }   // (a summary sheet without 기준일 is not the guide's: left alone)
  if (broken) note('', 'warn', `수식 오류가 있는 칸 ${broken}개는 빈칸으로 읽었습니다.`);
  return out;
}

(globalThis as any).AIDCScheduleXlsx = { importFile, makeXlsx, makeBook, readSheets };
