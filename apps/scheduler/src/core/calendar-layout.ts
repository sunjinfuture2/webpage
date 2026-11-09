import { addDays, addMonths, dayNumber, fromDay, monthStart } from './dates';

export interface CalendarInterval { id: string; start: string; finish: string; order: number }
export interface CalendarSegment { id: string; startColumn: number; endColumn: number; lane: number; continuesBefore: boolean; continuesAfter: boolean }
export interface CalendarWeekLayout { start: string; segments: CalendarSegment[]; visible: CalendarSegment[]; hiddenByDay: number[]; totalByDay: number[]; visibleLanes: number }
export function calendarRange(date: string, week: boolean) {
  const first = week ? date : monthStart(date), firstNumber = dayNumber(first);
  const origin = firstNumber - new Date(first + 'T00:00:00Z').getUTCDay();
  const daysInMonth = dayNumber(addMonths(monthStart(date), 1)) - dayNumber(monthStart(date));
  return { origin: fromDay(origin), visibleWeeks: week ? 1 : Math.ceil((firstNumber - origin + daysInMonth) / 7),
    dates: Array.from({ length: week ? 7 : 42 }, (_, i) => fromDay(origin + i)) };
}
/** Each interval is rendered once per week. Seven-bit lane masks keep dense months inexpensive. */
export function layoutCalendar(intervals: CalendarInterval[], origin: string, weeks: number, maxLanes = 4): CalendarWeekLayout[] {
  const prepared = intervals.map(item => ({ ...item, s: dayNumber(item.start), e: dayNumber(item.finish) }));
  const result: CalendarWeekLayout[] = [];
  let previousLanes = new Map<string, number>();
  const originNumber = dayNumber(origin);
  for (let index = 0; index < weeks; index++) {
    const ws = originNumber + index * 7, we = ws + 6;
    const candidates = prepared.filter(item => item.s <= we && item.e >= ws)
      .sort((a, b) => Math.max(a.s, ws) - Math.max(b.s, ws) || (Math.min(b.e, we) - Math.max(b.s, ws)) - (Math.min(a.e, we) - Math.max(a.s, ws)) || a.order - b.order || a.id.localeCompare(b.id));
    const laneMasks: number[] = [], freePointers = Array<number>(128).fill(0);
    const nextLanes = new Map<string, number>(), segments: CalendarSegment[] = [];
    const hiddenByDay = Array<number>(7).fill(0), totalByDay = Array<number>(7).fill(0);
    for (const item of candidates) {
      const startColumn = Math.max(item.s, ws) - ws, endColumn = Math.min(item.e, we) - ws;
      const mask = ((1 << (endColumn - startColumn + 1)) - 1) << startColumn;
      const previous = item.s < ws ? previousLanes.get(item.id) : undefined;
      const carry = previous !== undefined && previous < maxLanes && !(laneMasks[previous] & mask);
      let lane = carry ? previous! : freePointers[mask];
      while (laneMasks[lane] & mask) lane++;
      laneMasks[lane] = (laneMasks[lane] || 0) | mask;
      if (!carry) freePointers[mask] = lane + 1;
      nextLanes.set(item.id, lane);
      for (let day = startColumn; day <= endColumn; day++) { totalByDay[day]++; if (lane >= maxLanes) hiddenByDay[day]++; }
      segments.push({ id: item.id, startColumn, endColumn, lane, continuesBefore: item.s < ws, continuesAfter: item.e > we });
    }
    previousLanes = nextLanes;
    const visible = segments.filter(item => item.lane < maxLanes);
    result.push({ start: addDays(origin, index * 7), segments, visible, hiddenByDay, totalByDay, visibleLanes: visible.length ? Math.max(...visible.map(item => item.lane)) + 1 : 0 });
  }
  return result;
}
