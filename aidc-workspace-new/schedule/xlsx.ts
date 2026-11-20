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

(globalThis as any).AIDCScheduleXlsx = { importFile, makeXlsx, makeBook };
