import { describe, expect, it } from 'vitest';
import { calendarRange, layoutCalendar, type CalendarInterval } from '../src/core/calendar-layout';
const event = (id: string, start: string, finish = start, order = 0): CalendarInterval => ({ id, start, finish, order });
describe('continuous calendar interval layout', () => {
  it('retains 42 month cells and shows only the actual month weeks, including leap day', () => {
    const range = calendarRange('2030-02-20', false);
    expect(range.dates).toHaveLength(42); expect(range.origin).toBe('2030-01-27'); expect(range.visibleWeeks).toBe(5);
    expect(calendarRange('2032-02-29', false).dates).toContain('2032-02-29');
  });
  it('anchors week view to Sunday', () => {
    const range = calendarRange('2030-01-09', true);
    expect(range.origin).toBe('2030-01-06'); expect(range.dates).toHaveLength(7); expect(range.dates).toContain('2030-01-09');
  });
  it('splits a multi-week interval into continuous weekly spans with stable lanes', () => {
    const weeks = layoutCalendar([event('long', '2030-01-04', '2030-01-09')], '2029-12-30', 2);
    expect(weeks[0].visible[0]).toMatchObject({ startColumn: 5, endColumn: 6, lane: 0, continuesBefore: false, continuesAfter: true });
    expect(weeks[1].visible[0]).toMatchObject({ startColumn: 0, endColumn: 3, lane: 0, continuesBefore: true, continuesAfter: false });
  });
  it('reserves overlapping inclusive dates and reuses a lane after completion', () => {
    const week = layoutCalendar([event('one', '2030-01-06', '2030-01-08'), event('two', '2030-01-08', '2030-01-09'), event('three', '2030-01-09', '2030-01-10')], '2030-01-06', 1)[0];
    const map = new Map(week.segments.map(e => [e.id, e]));
    expect(map.get('one')!.lane).toBe(0); expect(map.get('two')!.lane).toBe(1); expect(map.get('three')!.lane).toBe(0);
  });
  it('counts all 5,000 overlapping items while rendering only visible lanes', () => {
    const events = Array.from({ length: 5000 }, (_, i) => event('task-' + i, '2030-01-08', '2030-01-10', i));
    const week = layoutCalendar(events, '2030-01-06', 1, 4)[0];
    expect(week.visible).toHaveLength(4); expect(week.totalByDay).toEqual([0, 0, 5000, 5000, 5000, 0, 0]); expect(week.hiddenByDay).toEqual([0, 0, 4996, 4996, 4996, 0, 0]);
  });
  it('promotes a hidden continuation into a free visible lane in the next week', () => {
    const events = [...Array.from({ length: 4 }, (_, i) => event('short-' + i, '2030-01-06', '2030-01-12', i)), event('continuing', '2030-01-06', '2030-01-20', 4)];
    const weeks = layoutCalendar(events, '2030-01-06', 3, 4);
    expect(weeks[0].visible.map(e => e.id)).not.toContain('continuing');
    expect(weeks[1].visible).toEqual([expect.objectContaining({ id: 'continuing', lane: 0 })]);
    expect(weeks[1].hiddenByDay).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
  it('keeps one-day milestones in one column and the source immutable', () => {
    const events = [event('milestone', '2030-01-08')], before = JSON.stringify(events);
    const segment = layoutCalendar(events, '2030-01-06', 1)[0].visible[0];
    expect(segment.startColumn).toBe(2); expect(segment.endColumn).toBe(2); expect(JSON.stringify(events)).toBe(before);
  });
});
