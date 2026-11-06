import type { Plan, ScheduleResult, SeedArchive, SeedTask, SourceRecord, Workspace } from './types';
import { assertWorkspace } from './storage';
import { workspaceFromSource } from './seed';
import { diffDays, isDay, today } from './dates';

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function backupText(w: Workspace) { return JSON.stringify(w, null, 2); }
export function parseBackup(text: string): Workspace {
  const value: unknown = JSON.parse(text);
  assertWorkspace(value); return value;
}
export function exportBackup(w: Workspace) {
  downloadBlob(new Blob([backupText(w)], { type: 'application/json' }), 'SUNJIN_일정백업_' + today() + '.json');
}
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value);
  if (typeof value === 'string' && /^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export const toCSV = (rows: unknown[][]) => '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
export function taskRows(p: Plan, r: ScheduleResult): unknown[][] {
  return [
    ['ID', 'WBS', '단계', '업무명', '작업유형', '원본시작', '원본완료', '관리시작', '관리완료', '예상시작', '예상완료', '달력기간', '실제시작', '실제완료', '잔여일', '진척률(0~1)', '상태', '주담당', '부담당', '투입인원', '추가지연', '운영여유', '목표여유', 'CP', '조건', '완료기준', '출처시트', '출처행'],
    ...p.tasks.map(t => {
      const x = r.tasks[t.id];
      return [t.id, t.wbs, t.phaseLabel, t.name, t.kind === 'milestone' ? '마일스톤' : '작업', t.referenceStart, t.referenceFinish, t.plannedStart, t.plannedFinish, x.start, x.finish, x.duration, t.actualStart, t.actualFinish, t.remaining, t.progress, t.status, t.primary, t.secondary, t.headcount, t.delay, x.slack, x.targetSlack, x.criticality, t.conditions, t.criteria, t.sourceSheet, t.sourceRow];
    }),
  ];
}
export function dependencyRows(p: Plan): unknown[][] {
  const wbs = new Map(p.tasks.map(t => [t.id, t.wbs]));
  return [
    ['관계ID', '원연결번호', '선행WBS', '후행WBS', '유형', '추가간격(달력일)', '활성', '조건'],
    ...p.dependencies.map(e => [e.id, e.sourceId, wbs.get(e.from), wbs.get(e.to), e.type, e.lag, e.active ? '적용' : '조건부 제외', e.condition]),
  ];
}
export function exportCSV(p: Plan, r: ScheduleResult, kind: 'tasks' | 'dependencies') {
  const rows = kind === 'tasks' ? taskRows(p, r) : dependencyRows(p);
  downloadBlob(new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' }), 'SUNJIN_' + (kind === 'tasks' ? '업무' : '업무연결') + '_' + today() + '.csv');
}
export async function makeXlsx(w: Workspace, p: Plan, r: ScheduleResult): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const book = new ExcelJS.Workbook();
  book.creator = 'SUNJIN Schedule'; book.created = new Date();
  const table = (name: string, rows: unknown[][]) => {
    const sheet = book.addWorksheet(name);
    sheet.addRows(rows);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).font = { name: '맑은 고딕', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F4F4F' } };
    sheet.getRow(1).height = 28;
    sheet.columns?.forEach((c, i) => { c.width = i < 2 ? 18 : 28; });
    if (rows.length > 1) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length, column: rows[0].length } };
    return sheet;
  };
  table('검토요약', [['항목', '값'], ['프로젝트', '판교 AIDC'], ['시나리오', p.name], ['상태일', p.statusDate], ['운영개시 예상', r.operationDate], ['목표대비 지연', r.operationDelay], ['예측조건', r.operationValid ? '공급·납기·인력 확약 전 조건부' : '축소안 재승인 필요·예측 적용불가'], ['업무수', p.tasks.length], ['관계수', p.dependencies.length], ['내보내기 형식', '업무 데이터 내보내기. 원본 간트 서식 복제 아님.'], ['공란', '미입력은 빈 셀, 0은 숫자 0'], ['참조원본', w.source.sourceFile]]);
  const tasks = taskRows(p, r);
  table('마스터스케줄', tasks);
  table('단계별업무분장', tasks);
  const recordTable = (name: string, records: SourceRecord[], override?: (r: SourceRecord) => Record<string, unknown>) => {
    const values = records.map(rec => override ? override(rec) : rec.fields);
    const keys = [...new Set(values.flatMap(v => Object.keys(v)))];
    table(name, [keys, ...values.map(v => keys.map(k => v[k] ?? null))]);
  };
  recordTable('승인게이트', w.source.gates, rec => {
    const t = p.tasks.find(t => t.wbs === rec.fields['연결 WBS']);
    return { ...rec.fields, '원본계획 승인일': rec.fields['계획 승인일'], '예상 승인일': t ? r.tasks[t.id].finish : null };
  });
  recordTable('책임경계', w.source.responsibilityBoundaries);
  recordTable('전제와참고자료', w.source.assumptionsAndReferences);
  recordTable('원자료대조', w.source.sourceMappings);
  recordTable('NVIS일정검토', w.source.nvisScheduleReview);
  table('업무연결', dependencyRows(p));
  recordTable('오프테이커 후보검토', w.source.offtakers);
  recordTable('외부설비 조달대장', w.source.procurementPackages, rec => {
    const x = p.procurement.find(x => x.id === rec.fields['패키지']);
    return x ? { ...rec.fields, 'PO 추가지연 Day': x.delay, '확약 납기 Week': x.leadWeeks, '납기 기산조건': x.trigger, '기산조건 충족일': x.triggerDate, '추가 운송 Day': x.transport, '확약 상태': x.commitment, '공급사': x.supplier, '견적·조건 증빙': x.evidence, '예상 PO': r.tasks[x.poTaskId].start, '계산 납품완료': r.tasks[x.deliveryTaskId].finish, '확약 기준 예상납품': r.deliveries[x.id], '운영 총여유 Day': r.tasks[x.poTaskId].slack } : rec.fields;
  });
  table('운영영향 분석', [['WBS', '업무', '예상시작', '예상완료', '기준대비완료차', '현재총여유', '목표여유', 'CP', '결정원인'], ...p.tasks.map(t => { const x = r.tasks[t.id]; return [t.wbs, t.name, x.start, x.finish, x.delta, x.slack, x.targetSlack, x.criticality, x.drivers.join(', ')]; })]);
  recordTable('보완·확약관리', w.source.commitmentReviews);
  // A hidden, versioned full backup provides a lossless app round-trip.
  const meta = book.addWorksheet('__SUNJIN_BACKUP', { state: 'veryHidden' });
  meta.addRow(['SUNJIN_SCHEDULE_BACKUP_V1']);
  const json = backupText(w);
  for (let i = 0; i < json.length;) {
    let end = Math.min(json.length, i + 28000);
    const last = json.charCodeAt(end - 1);
    if (end < json.length && last >= 0xd800 && last <= 0xdbff) end--;
    meta.addRow([json.slice(i, end)]); i = end;
  }
  const buffer = await book.xlsx.writeBuffer();
  return new Uint8Array(buffer).buffer as ArrayBuffer;
}
export async function exportXlsx(w: Workspace, p: Plan, r: ScheduleResult) {
  const bytes = await makeXlsx(w, p, r);
  downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'SUNJIN_마스터일정_' + today() + '.xlsx');
}

export async function importFile(file: File): Promise<Workspace> {
  if (file.size > 25 * 1024 * 1024) throw new Error('25MB 이하의 XLSX 또는 JSON 파일을 선택해주세요.');
  if (file.name.toLowerCase().endsWith('.json')) {
    const value = JSON.parse(await file.text());
    if (value.schemaVersion === 1) { assertWorkspace(value); return value; }
    if (value.schemaVersion === 'analysis-seed-1') {
      const w = workspaceFromSource(value); assertWorkspace(w); return w;
    }
    throw new Error('지원하지 않는 JSON 버전입니다.');
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('XLSX 또는 SUNJIN JSON 백업 파일을 선택해주세요.');
  const ExcelJS = (await import('exceljs')).default, book = new ExcelJS.Workbook();
  const bytes = await file.arrayBuffer();
  await book.xlsx.load(bytes);
  const meta = book.getWorksheet('__SUNJIN_BACKUP');
  if (meta?.getCell('A1').value === 'SUNJIN_SCHEDULE_BACKUP_V1') {
    let json = '';
    for (let i = 2; i <= meta.rowCount; i++) json += String(meta.getCell(i, 1).value || '');
    return parseBackup(json);
  }
  const required = ['검토요약', '마스터스케줄', '단계별업무분장', '승인게이트', '책임경계', '전제와참고자료', '원자료대조', 'NVIS일정검토', '업무연결', '오프테이커 후보검토', '외부설비 조달대장', '운영영향 분석', '보완·확약관리'];
  if (required.some(name => !book.getWorksheet(name))) throw new Error('원본 형식의 13개 시트를 찾을 수 없습니다. 원본 XLSX 또는 앱에서 내보낸 파일을 사용해주세요.');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
  const letters = (index: number) => { let s = ''; for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
  const cellValue = (v: unknown): string | number | null => {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'number' || typeof v === 'string') return v;
    const o = v as { formula?: string; sharedFormula?: string; result?: unknown; text?: string; richText?: Array<{ text: string }>; error?: string };
    if (o.error) throw new Error('엑셀 수식 오류: ' + o.error);
    if (o.formula || o.sharedFormula) return cellValue(o.result);
    return o.text || o.richText?.map(t => t.text).join('') || null;
  };
  const cells = (name: string, row: number, max: number): Record<string, string | number | null> => {
    const sheet = book.getWorksheet(name)!;
    return Object.fromEntries(Array.from({ length: max }, (_, i) => {
      const cell = sheet.getCell(row, i + 1);
      // ExcelJS's formula-value getter omits falsey cached results (including 0).
      // Reading cell.result preserves a zero CP/lag instead of converting it to null.
      return [letters(i + 1), cellValue(cell.type === ExcelJS.ValueType.Formula ? cell.result : cell.value)];
    }).filter(([, v]) => v !== null));
  };
  const text = (v: unknown) => v === null || v === undefined ? '' : String(v);
  const date = (v: unknown) => {
    if (typeof v === 'number') return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
    const s = text(v).slice(0, 10); if (!isDay(s)) throw new Error('날짜 수식의 저장 결과가 없습니다. Excel에서 계산·저장한 원본을 사용해주세요.'); return s;
  };
  const optionalDate = (v: unknown) => v === null || v === undefined || v === '' ? null : date(v);
  const num = (v: unknown) => v === undefined || v === null || v === '' ? null : Number(v);
  const provenance = (sheet: string, row: number) => ({ fileSha256: hash, sheet, row });
  const tasks: SeedTask[] = [];
  const sheet = book.getWorksheet('단계별업무분장')!;
  if (cellValue(sheet.getCell('A4').value) !== 'WBS') throw new Error('업무분장 헤더 위치가 원본 형식과 다릅니다.');
  for (let i = 5; i <= sheet.rowCount; i++) {
    const c = cells(sheet.name, i, 32); if (!/^W\d+\.\d+$/.test(text(c.A))) continue;
    const start = date(c.D), finish = date(c.E), kind = c.T === '마일스톤' ? 'milestone' : 'task';
    const formulas: Record<string, string> = {};
    for (let j = 1; j <= 32; j++) { const v = sheet.getCell(i, j).value; if (typeof v === 'object' && v && 'formula' in v) formulas[letters(j)] = '=' + v.formula; }
    tasks.push({
      id: hash.slice(0, 12) + ':task:' + c.A, sourceWbs: text(c.A), sourcePhase: text(c.B), phaseCode: text(c.A).split('.')[0], name: text(c.C), kind,
      importedReference: { start, finish, durationCalendarDays: kind === 'milestone' ? 0 : diffDays(finish, start) + 1 },
      importedForecast: { start: date(c.AB), finish: date(c.AC), operationTotalSlackCalendarDays: num(c.R) },
      roleResponsibilities: { A: text(c.H), R: text(c.I), C: text(c.J) },
      primaryAssignee: text(c.L) || null, secondaryAssignee: text(c.M) || null, headcount: num(c.AE), sourceProgressFraction: num(c.N), sourceStatus: text(c.O),
      acceptanceCriteria: text(c.K), extraDelayCalendarDays: num(c.U), actualStart: optionalDate(c.V), actualFinish: optionalDate(c.W), remainingCalendarDays: num(c.X),
      commitmentAndOriginalStatus: text(c.Z), evidenceNote: text(c.AA) || null, sourceCalendarCondition: text(c.AD),
      provenance: provenance(sheet.name, i), sourceCells: c, sourceFormulas: formulas,
    });
  }
  if (!tasks.length) throw new Error('가져올 WBS 업무가 없습니다.');
  const taskId = new Map(tasks.map(t => [t.sourceWbs, t.id]));
  const dependencySheet = book.getWorksheet('업무연결')!;
  const dependencies: SeedArchive['dependencies'] = [];
  for (let i = 7; i <= dependencySheet.rowCount; i++) {
    const c = cells(dependencySheet.name, i, 19); if (!/^L\d+/.test(text(c.A))) continue;
    dependencies.push({ id: hash.slice(0, 12) + ':link:' + c.A, sourceId: text(c.A), predecessorId: taskId.get(text(c.B)) || '', successorId: taskId.get(text(c.C)) || '', type: text(c.D) as 'FS', lag: Number(c.O || 0), activeInBaseScenario: c.N === '적용', conditionNote: text(c.E) });
  }
  const records = (name: string, header: number, cols: number): SourceRecord[] => {
    const h = cells(name, header, cols), recs: SourceRecord[] = [], ws = book.getWorksheet(name)!;
    for (let i = header + 1; i <= ws.rowCount; i++) {
      const c = cells(name, i, cols); if (!c.A) continue;
      recs.push({ provenance: provenance(name, i), fields: Object.fromEntries(Object.entries(c).map(([k, v]) => [text(h[k]) || k, v])), sourceCells: c });
    } return recs;
  };
  const source: SeedArchive = {
    schemaVersion: 'analysis-seed-1', sourceFile: file.name, sourceSha256: hash, statusDate: date(cellValue(book.getWorksheet('검토요약')!.getCell('B5').value)), tasks, dependencies,
    gates: records('승인게이트', 4, 9), procurementPackages: records('외부설비 조달대장', 5, 27), responsibilityBoundaries: records('책임경계', 4, 6),
    assumptionsAndReferences: records('전제와참고자료', 4, 6), sourceMappings: records('원자료대조', 4, 7), nvisScheduleReview: records('NVIS일정검토', 4, 7),
    offtakers: records('오프테이커 후보검토', 5, 7), commitmentReviews: records('보완·확약관리', 5, 11),
    sourceProjectSummary: Array.from({ length: book.getWorksheet('검토요약')!.rowCount }, (_, i) => ({ row: i + 1, values: cells('검토요약', i + 1, 3), raw: cells('검토요약', i + 1, 3) })),
  };
  const w = workspaceFromSource(source); assertWorkspace(w); return w;
}
