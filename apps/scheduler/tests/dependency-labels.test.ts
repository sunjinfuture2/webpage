import { expect, it } from 'vitest';
import { relationshipGap, relationshipSentence } from '../src/core/dependency-labels';

it.each([
  ['FS', '완료', '시작'], ['SS', '시작', '시작'], ['FF', '완료', '완료'], ['SF', '시작', '완료'],
] as const)('%s describes its actual constraint endpoints', (type, from, to) => {
  expect(relationshipSentence(type, '승인', '발주')).toBe(`‘승인’의 ${from} 시점이 ‘발주’의 ${to} 시점을 결정합니다.`);
});
it('distinguishes default inclusive-day scheduling from extra waiting or lead time', () => {
  expect(relationshipGap(0)).toContain('기본 관계');
  expect(relationshipGap(2)).toContain('2일 뒤');
  expect(relationshipGap(-2)).toContain('2일 앞당겨');
  expect(relationshipGap(NaN)).toContain('입력');
});
