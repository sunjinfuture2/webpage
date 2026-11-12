import { expect, it } from 'vitest';
import { outlineOffsets, outlineIndexAt } from '../src/core/gantt-outline';

it('places expanded tasks directly under their summary and shifts later phases on the same axis', () => {
  expect(outlineOffsets(['phase', 'phase', 'phase'])).toEqual([0, 64, 128, 192]);
  expect(outlineOffsets(['phase', 'task', 'task', 'phase'])).toEqual([0, 64, 102, 140, 204]);
});
it('locates mixed-height rows at boundaries and clamps an old scroll position after folding', () => {
  const offsets = outlineOffsets(['phase', 'task', 'phase']);
  expect([0, 63, 64, 101, 102, 9000].map(y => outlineIndexAt(offsets, y))).toEqual([0, 0, 1, 1, 2, 2]);
  expect(outlineIndexAt(outlineOffsets([]), 10)).toBe(0);
});
