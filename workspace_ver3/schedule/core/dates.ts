const DAY = 86_400_000;
export const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
export const dayNumber = (s: string) => {
  if (!isDay(s)) throw new Error('올바른 날짜가 아닙니다: ' + s);
  return Math.round(Date.parse(s + 'T00:00:00Z') / DAY);
};
export const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => fromDay(dayNumber(s) + n);
export const diffDays = (a: string, b: string) => dayNumber(a) - dayNumber(b);
export function addMonths(s: string, months: number): string {
  const d = new Date(s + 'T00:00:00Z');
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return target.toISOString().slice(0, 10);
}
export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
export const shortDate = (s: string | null | undefined) => s ? s.replaceAll('-', '.') : '—';
export const monthLabel = (s: string) => s.slice(0, 4) + '. ' + Number(s.slice(5, 7));
export const monthStart = (s: string) => s.slice(0, 8) + '01';
export function monday(s: string) {
  const d = new Date(s + 'T00:00:00Z').getUTCDay();
  return addDays(s, -((d + 6) % 7));
}
export const numberOrNull = (v: string) => v.trim() === '' ? null : Number(v);
