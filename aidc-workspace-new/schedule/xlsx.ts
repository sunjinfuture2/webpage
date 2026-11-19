// Excel for the schedule: the Schedule app's own reader and writer (schedule/core/files.ts, unchanged) with ExcelJS.
// It is a bundle of its own (public/schedule-xlsx.js, about 1 MB) that the page loads only when a member asks for Excel.
import { importFile, makeXlsx } from './core/files';

(globalThis as any).AIDCScheduleXlsx = { importFile, makeXlsx };
