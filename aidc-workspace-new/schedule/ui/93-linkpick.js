/* ---------- linking items: a search box instead of a line of instructions (forty-seventh round) ----------
   Owner, 2026-11-25: "관련미팅, 액션에 연결 · 눌러서 추가 / 해제 이런거 삭제하고 검색바 넣어줘". The small window that links an
   item to meetings / actions / research (관련 미팅, 관련 액션, 연결된 리서치 — a contract's and every other item's) opens with a
   search box in the page's own design at its top and the list under it; nothing else is written there. A press adds or takes
   away a link and the window stays open (it is drawn again at the same place, with what was typed and where the list was), so
   several can be linked in one go; Escape or a press outside closes it. What is linked stands first. */
function schLinkPick(el, it, k, candidates, word){
  const key = el && el.dataset ? el.dataset.pick : k, st = schLinkPick.st && schLinkPick.st.id === it.id && schLinkPick.st.k === k ? schLinkPick.st : { id: it.id, k, q: '', top: 0 };
  schLinkPick.st = st;
  const p = openPop(el, `<label class="lp-srch">${svg('pic-search', 15, 15)}<input type="text" placeholder="${esc(word)} 검색" aria-label="${esc(word)} 검색" value="${esc(st.q)}"><button type="button" class="lp-x" title="지우기" aria-label="지우기"${st.q ? '' : ' hidden'}>${svg('i-x', 9, 9)}</button></label><div class="lp-list" role="listbox" aria-multiselectable="true"></div>`, { cls: 'multi link lp' });
  const input = p.querySelector('input'), list = p.querySelector('.lp-list'), x = p.querySelector('.lp-x');
  const short = t => oneLine(t || '') || '(제목 없음)';
  const draw = () => { const q = input.value.trim(), cur = it[k] || [];
    const rows = candidates().filter(i => !q || matchQ(q, i.title)).sort((a, b) => (cur.includes(b.id) - cur.includes(a.id)) || String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
    list.innerHTML = rows.slice(0, 80).map(i => `<div class="it ${cur.includes(i.id) ? 'sel' : ''}" role="option" aria-selected="${cur.includes(i.id)}" data-lp="${esc(i.id)}" title="${esc(short(i.title))}"><span class="e">${esc(short(i.title))}</span>${cur.includes(i.id) ? '<span class="x" title="선택 해제">' + svg('i-x', 8, 8) + '</span>' : ''}</div>`).join('')
      || `<div class="lp-none">${q ? '검색 결과가 없습니다.' : `연결할 ${esc(word)}이 없습니다.`}</div>`;
    x.hidden = !q; };
  input.addEventListener('input', () => { st.q = input.value; list.scrollTop = 0; draw(); });
  input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePop(); } });
  x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); input.value = ''; st.q = ''; draw(); input.focus(); });
  list.addEventListener('click', e => { const row = e.target.closest('[data-lp]'); if (!row) return; e.stopPropagation();
    const id = row.dataset.lp, cur = it[k] || []; it[k] = cur.includes(id) ? cur.filter(v => v !== id) : cur.concat(id); it.dirty = true; st.top = list.scrollTop;
    closePop(); rerenderItem(it.id);
    // the window comes back where its field is now, as it was
    const again = [...document.querySelectorAll(`[data-pick="${key}"]`)].find(n => n.offsetParent && n.closest('#panel-pin, #item-pin'));
    if (again) { const q2 = schLinkPick(again, it, k, candidates, word); const l2 = q2.querySelector('.lp-list'); l2.scrollTop = st.top; } });
  draw(); list.scrollTop = st.top || 0; setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (_) {} }, 0);
  return p;
}
