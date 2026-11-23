// Public calendar data only; the API key never leaves the Worker for the browser.
export function normalizeHolidays(rows, year, source) {
  const names = {}, days = new Set();
  for (const h of rows) {
    if (source === 'kasi' ? h.isHoliday !== 'Y' : Array.isArray(h.types) && !h.types.includes('Public')) continue;
    const raw = String(source === 'kasi' ? h.locdate : h.date);
    const date = /^\d{8}$/.test(raw) ? `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}` : raw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(year + '-')) continue;
    const name = String(source === 'kasi' ? h.dateName : h.localName || h.name || '').trim().slice(0,100);
    days.add(date);
    if (name) names[date] = [...new Set([...(names[date] || '').split(' · ').filter(Boolean), name])].join(' · ');
  }
  if (!days.size) throw new Error('Empty holiday response');
  return { year, days: [...days].sort(), names, source, format: 2 };
}

export async function fetchHolidays(year, key, fetcher = fetch) {
  if (key) {
    const url = new URL('https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo');
    // The portal offers encoded and decoded keys. URLSearchParams encodes exactly once.
    let decoded = key.trim(); try { decoded = decodeURIComponent(decoded); } catch {}
    url.search = new URLSearchParams({ serviceKey: decoded, solYear: String(year), numOfRows: '100', pageNo: '1', _type: 'json' });
    const r = await fetcher(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error('Holiday provider unavailable');
    const d = await r.json();
    if (String(d.response?.header?.resultCode) !== '00') throw new Error('Holiday provider rejected request');
    const items = d.response?.body?.items?.item;
    return normalizeHolidays(Array.isArray(items) ? items : items ? [items] : [], year, 'kasi');
  }
  const r = await fetcher(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error('Holiday provider unavailable');
  const rows = await r.json();
  return normalizeHolidays(Array.isArray(rows) ? rows : [], year, 'nager');
}
