// Twenty-second round (owner, 2026-11-24: "모바일 호환되게"): the page on a phone.
// A phone used to get the 1920 wide page shrunk to its screen (the viewport tag said width=1920). Now a small screen (the shorter
// side of the screen under 700 px) or a window under 700 px gets `html.mob`, set before anything is painted by the early script
// in the head of original.html, which also turns the viewport tag to the width of the device. In that mode:
//  - fitLayout (original.html) does not scale anything: the page is as wide as the screen, with 16 px at each side, and `--d`
//    is what is left of the 1338 wide column (a large negative number), so everything that is "1338 + d" wide fits by itself;
//  - what cannot be narrow (tables, the gantt, the relation map) keeps the narrowest desktop measure inside (`--d:-200px` in
//    its own scope) and is moved sideways with the finger; cards that stood in a row that was pushed are moved the same way;
//  - the sidebar is a drawer over the page (the page's own collapsed state `sb-off`), the panel of an item and the windows
//    take the whole screen. The rules are schedule/mobile.css; this file holds what needs code.
// Tablets and the ?v=1 page are left as they were.
const schMob=()=>document.documentElement.classList.contains('mob');
const schMobWant=()=>{ try{ return schPreview()&&(Math.min(screen.width||9999,screen.height||9999)<700||window.innerWidth<700); }catch(e){ return false; } };
function schMobApply(){ const want=schMobWant(), html=document.documentElement; if(want===schMob())return false; html.classList.toggle('mob',want);
  const m=document.querySelector('meta[name="viewport"]'); if(m)m.setAttribute('content',want?'width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover':'width=1920');
  const app=$('#app'); if(app){ if(want)app.classList.add('sb-off'); app.style.zoom=''; } return true; }
// a window pulled narrower or wider than the limit changes the mode (a phone turned round stays a phone)
window.addEventListener('resize',()=>{ if(schMobApply()){ const app=$('#app'); if(app&&!app.hidden){ fitLayout(); render(true); } } });
(function(){ const app=$('#app'); if(schMob()&&app)app.classList.add('sb-off'); })();
// the drawer: the grey square of the top bar opens it (the page's own handler takes `sb-off` away); a press beside it, or on
// anything in it that leads somewhere, closes it again
document.addEventListener('click',e=>{ if(!schMob()||!e.target.closest)return; const app=$('#app'); if(!app||app.classList.contains('sb-off'))return;
  const inSb=e.target.closest('#sb'), opener=e.target.closest('#sb-open');
  if(opener)return;
  if(!inSb){ app.classList.add('sb-off'); e.stopPropagation(); e.preventDefault(); return; }       // the dimmed page
  if(e.target.closest('#sb-collapse'))return;                                                    // the page's handler closes it
  if(e.target.closest('.item,[data-go],[data-open],a,#sb-inbox,#sb-search,.agent'))setTimeout(()=>{ app.classList.add('sb-off'); },0);
},true);
// (Rows of cards that the desktop page pushes with arrows are moved with the finger here: mobile.css takes the offset of the
// arrows away and lets the row scroll.)

const schMobDetails = new Set();
function schMobProjectDetail(pid, open){
  if(open)schMobDetails.add(pid); else schMobDetails.delete(pid);
}
function schProjectCompact(pid, editing){
  return schMob() ? !editing && !schMobDetails.has(pid) : S.collapsed;
}
function schProjectDetailButton(pid, editing){
  const expanded=!schProjectCompact(pid,editing);
  return `<button type="button" class="ov" data-collapse aria-expanded="${expanded}">프로젝트 상세 ${svg('i-chev-d',9,5)}</button>`;
}

// The short list and its continuation share the same rows, order and item links.
const schMobAgendaOpen = new Set();
function schMobAgenda(list, row, key, label){
  const limit=4, first=list.slice(0,limit).map(row).join('');
  if(list.length<=limit)return first;
  const rest=list.slice(limit);
  return first+`<details class="mob-agenda-more" data-agenda-key="${esc(key)}" ${schMobAgendaOpen.has(key)?'open':''}>
    <summary><span class="more-label">${label} ${rest.length}건 더 보기</span><span class="less-label">${label} 접기</span>${svg('i-chev-d',10,6)}</summary>
    ${rest.map(row).join('')}</details>`;
}
document.addEventListener('toggle',e=>{
  const el=e.target;
  if(!el.isConnected||!el.matches?.('details[data-agenda-key]'))return;
  if(el.open)schMobAgendaOpen.add(el.dataset.agendaKey); else schMobAgendaOpen.delete(el.dataset.agendaKey);
},true);
