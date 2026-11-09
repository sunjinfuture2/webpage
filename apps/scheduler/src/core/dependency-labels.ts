import type { LinkType } from './types';

export const relationshipNames: Record<LinkType, string> = {
  FS: '앞 업무가 끝나면 시작',
  SS: '앞 업무가 시작하면 시작',
  FF: '앞 업무가 끝나야 완료',
  SF: '앞 업무가 시작해야 완료',
};
export function relationshipSentence(type: LinkType, before: string, after: string) {
  const actions: Record<LinkType, [string, string]> = {
    FS: ['완료', '시작'], SS: ['시작', '시작'], FF: ['완료', '완료'], SF: ['시작', '완료'],
  };
  const [from, to] = actions[type];
  return `‘${before}’의 ${from} 시점이 ‘${after}’의 ${to} 시점을 결정합니다.`;
}
export function relationshipGap(lag: number) {
  if (!Number.isFinite(lag)) return '추가 간격을 입력해주세요.';
  return lag === 0 ? '추가 대기 없음 · 기본 관계대로 계산' : lag > 0 ? `기본 관계보다 ${lag}일 뒤부터 가능` : `기본 관계보다 ${Math.abs(lag)}일 앞당겨 진행 가능`;
}
