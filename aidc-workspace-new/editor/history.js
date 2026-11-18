// Version history of one document: the list the server keeps, a read-only preview of each version and "restore".
// The app gives the data (o.load, o.get) and does the restoring (o.restore); this file is only the window.
import { el } from './ui.js';
import { ctx } from './host.js';
import { upgrade, hydrate } from './legacy.js';

const stamp = iso => { const d = new Date(iso); if (isNaN(d)) return iso || ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}  ${d.getHours() < 12 ? '오전' : '오후'} ${((d.getHours() + 11) % 12) + 1}:${p(d.getMinutes())}`; };

export function openHistory(o) {
  const prevFocus = document.activeElement;
  const list = el('div', { class: 'nb-hist-list', role: 'listbox', 'aria-label': '버전 목록', tabindex: '0' }), view = el('div', { class: 'nb-hist-view' });
  const restore = el('button', { type: 'button', class: 'nb-btn pri', text: '이 버전으로 되돌리기', disabled: true }), closeBtn = el('button', { type: 'button', class: 'nb-btn', text: '닫기' });
  const head = el('div', { class: 'nb-hist-head' }, el('b', { text: '버전 기록' }), el('span', { class: 'nb-hist-sub', text: o.title || '' }), el('span', { class: 'nb-hist-sp' }), restore, closeBtn);
  const box = el('div', { class: 'nb-hist', role: 'dialog', 'aria-modal': 'true', 'aria-label': '버전 기록' }, head, el('div', { class: 'nb-hist-body' }, list, view));
  const back = el('div', { class: 'nb-modal' }, box); let rows = [], cur = null, closed = false, seq = 0;
  const close = () => { if (closed) return; closed = true; back.remove(); document.removeEventListener('keydown', onKey, true); if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch { /* gone */ } } };
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; } if (!box.contains(e.target)) return; e.stopPropagation();
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length && list.contains(document.activeElement)) { e.preventDefault(); const i = rows.findIndex(r => r.v === cur); const n = Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); pick(rows[n].v); } };
  ['mousedown', 'mouseup', 'click', 'keyup'].forEach(t => back.addEventListener(t, e => e.stopPropagation()));
  back.addEventListener('mousedown', e => { if (e.target === back) close(); }); closeBtn.addEventListener('click', close);
  const note = t => { view.textContent = ''; view.append(el('div', { class: 'nb-hist-note', text: t })); };
  async function pick(v) { cur = v; rows.forEach(r => { r.node.classList.toggle('sel', r.v === v); r.node.setAttribute('aria-selected', String(r.v === v)); if (r.v === v) r.node.scrollIntoView({ block: 'nearest' }); });
    restore.disabled = true; const my = ++seq; note('불러오는 중…');
    let full; try { full = await o.get(v.id); } catch { full = null; } if (closed || my !== seq) return; if (!full) { note('이 버전을 불러오지 못했습니다.'); return; }
    const doc = el('div', { class: 'nb-doc' }); doc.innerHTML = ctx.clean(upgrade(full.body || '')); view.textContent = '';
    view.append(el('div', { class: 'nb-hist-title', text: (full.title || '').split('\n')[0] || '제목 없음' }), el('div', { class: 'ibody nb-hist-doc' }, doc)); hydrate(doc); view.scrollTop = 0;
    const same = o.current && String(o.current.body || '') === String(full.body || '') && String(o.current.title || '') === String(full.title || '');
    restore.disabled = same || !o.restore; restore.textContent = same ? '현재 내용과 같음' : '이 버전으로 되돌리기'; restore.onclick = () => { if (o.restore(full) !== false) close(); }; }
  document.body.append(back); document.addEventListener('keydown', onKey, true); note('버전을 불러오는 중…'); list.focus();
  Promise.resolve().then(() => o.load()).then(vs => { if (closed) return; list.textContent = '';
    if (!vs || !vs.length) { list.append(el('div', { class: 'nb-hist-empty', text: '아직 보관된 버전이 없습니다.' })); note('제목이나 본문을 저장할 때마다 여기에 버전이 쌓입니다. 같은 사람이 1분 안에 이어서 저장한 것은 하나로 묶입니다.'); return; }
    rows = vs.map((v, i) => { const node = el('div', { class: 'nb-hist-it', role: 'option' }, el('b', { text: stamp(v.at) }), el('small', { text: (ctx.userName(v.employee, v.employee) || '알 수 없음') + (i === 0 ? ' · 최신' : v.kind === 'base' ? ' · 기록 시작 전 내용' : '') })); node.addEventListener('click', () => pick(v)); list.append(node); return { v, node }; });
    pick(vs[0]); }).catch(() => { if (!closed) { list.textContent = ''; note('버전 기록을 불러오지 못했습니다. 연결을 확인한 뒤 다시 열어 주세요.'); } });
  return { close };
}
