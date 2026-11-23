// Eleventh round (owner, 2026-11-23): small things many screens share while the preview is on.
//  - a note under what the pointer rests on ([data-tip], lines split by \n; [data-tiph] = its caption): why an action is late;
//  - an X at the right of a search box once something is typed (qx() of original.html draws it, hidden while the box is empty);
//  - the card of a member (name, title, role, team, e-mail, phone) when an assignee is pressed, or rested on for a second,
//    wherever the value is not being edited;
//  - short help on what the dates and the states mean (an "i" pictogram, schInfo).
(function(){ const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden'); s.setAttribute('aria-hidden','true');
  s.innerHTML='<symbol id="i-sch-info" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 7.3v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="4.9" r=".9" fill="currentColor"/></symbol>'
   +'<symbol id="i-sch-link" viewBox="0 0 16 16"><path d="M6.6 9.4a3 3 0 0 0 4.2 0l2.4-2.4a3 3 0 0 0-4.2-4.2l-1 1M9.4 6.6a3 3 0 0 0-4.2 0L2.8 9a3 3 0 0 0 4.2 4.2l1-1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></symbol>';
  document.body.appendChild(s); })();

/* ---------- a note under what the pointer rests on ---------- */
let schTipEl=null, schTipT=0, schTipOn=null;
function schTipHide(){ clearTimeout(schTipT); if(schTipEl){schTipEl.remove();schTipEl=null;} schTipOn=null; }
document.addEventListener('mouseover',e=>{ const a=e.target.closest&&e.target.closest('[data-tip]'); if(a===schTipOn)return; schTipHide(); if(!a||!PREVIEW_ON)return; schTipOn=a;
  schTipT=setTimeout(()=>{ if(!a.isConnected||schTipOn!==a)return; const d=document.createElement('div'); d.className='sch-tip'; d.setAttribute('role','tooltip');
    d.innerHTML=(a.dataset.tiph?`<b>${esc(a.dataset.tiph)}</b>`:'')+a.dataset.tip.split('\n').map(l=>`<span>${esc(l)}</span>`).join(''); document.body.appendChild(d);
    const r=a.getBoundingClientRect(), w=d.offsetWidth, h=d.offsetHeight; let x=Math.min(innerWidth-w-8,Math.max(8,r.left+r.width/2-w/2)), y=r.bottom+7; if(y+h>innerHeight-8)y=Math.max(8,r.top-h-7);
    d.style.left=x+'px'; d.style.top=y+'px'; schTipEl=d; },160); });
document.addEventListener('scroll',schTipHide,true); document.addEventListener('mousedown',schTipHide,true); window.addEventListener('blur',schTipHide);

/* ---------- search boxes: an X once something is typed ---------- */
document.addEventListener('input',e=>{ const t=e.target; if(!t||t.tagName!=='INPUT'||!t.parentElement)return; const x=t.parentElement.querySelector(':scope > .q-x'); if(x)x.hidden=!t.value; },true);
document.addEventListener('click',e=>{ const x=e.target.closest&&e.target.closest('.q-x'); if(!x)return; e.preventDefault(); e.stopPropagation(); const inp=x.parentElement.querySelector('input'); if(!inp)return;
  inp.value=''; x.hidden=true; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.focus(); },true);

/* ---------- the card of a member ---------- */
const schUcBusy=a=>!!a.closest('.sf-e,[data-pick],[data-schp="f"],[contenteditable="true"]');   // the value is being edited: pressing it picks people, as before
let schUcT=0, schUcA=null, schUcHover=false;
function schUserCard(a,id,byHover){ const me=MEMBERS_META[id]||{}, name=userName(id)||id, row=(k,v)=>`<div class="uc-r"><span>${k}</span><b>${v}</b></div>`, none='<i>미등록</i>';
  const team=[SETTINGS.org,...(Array.isArray(me.ws)?me.ws:[])].filter(Boolean).join(' · ');
  const p=openPop(a,`<div class="uc-h">${avOf(id,'big')}<div class="uc-n"><b>${esc(name)}</b><small>${esc([me.title,typeof roleOf==='function'&&MEMBERS_META[id]?roleOf(id):''].filter(Boolean).join(' · ')||'멤버 정보')}</small></div></div>
    ${row('소속',team?esc(team):none)}${row('이메일',me.email?`<a href="mailto:${esc(me.email)}" data-stop>${esc(me.email)}</a>`:none)}${row('연락처',me.phone?`<a href="tel:${esc(String(me.phone).replace(/[^\d+]/g,''))}" data-stop>${esc(me.phone)}</a>`:none)}
    ${id===sharedUser?'<div class="uc-f">내 정보는 마이페이지 › 계정 › 프로필에서 바꿉니다.</div>':''}`,{cls:'ucard'});
  p.dataset.user=id; schUcHover=!!byHover; if(byHover){ const off=ev=>{ const to=ev.relatedTarget; if(to&&(p.contains(to)||a.contains(to)))return; if(popEl===p&&schUcHover)closePop(); }; p.addEventListener('mouseleave',off); a.addEventListener('mouseleave',off,{once:true}); }
  return p; }
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const a=e.target.closest&&e.target.closest('[data-user]'); if(!a||schUcBusy(a))return; e.preventDefault(); e.stopPropagation(); clearTimeout(schUcT); schUserCard(a,a.dataset.user,false); },true);
document.addEventListener('mouseover',e=>{ if(!PREVIEW_ON)return; const a=e.target.closest&&e.target.closest('[data-user]'); if(a===schUcA)return; clearTimeout(schUcT); schUcA=a; if(!a||schUcBusy(a))return;
  schUcT=setTimeout(()=>{ if(a.isConnected&&schUcA===a&&!SCH.drag&&!(popEl&&popEl.classList.contains('ucard')&&popEl.dataset.user===a.dataset.user))schUserCard(a,a.dataset.user,true); },1000); });

/* ---------- short help: what the dates and the states mean ---------- */
const schInfo=k=>`<button type="button" class="sch-info" data-info="${k}" title="도움말" aria-label="도움말" aria-haspopup="dialog">${svg('i-sch-info',14,14)}</button>`;
const SCH_HELP={
  dates:['날짜가 뜻하는 것',[
    ['시작일 · 완료일','담당자가 정한 계획 날짜(관리일정). 직접 수정하는 값.'],
    ['예상 기한','선행 업무와 실제 진행을 반영해 계산한 시작·완료 예상일. 선행 업무가 늦어지면 함께 밀림.'],
    ['실제 기한','실제로 착수·완료한 날짜. 입력하면 예상 기한이 그 날짜로 고정.'],
    ['기한 (D-n · n일 지연)','오늘부터 완료 예상일까지 남은 날. 지난 업무는 ‘n일 지연’, 마우스를 올리면 지연 사유 표시.'],
    ['상태일','일정 계산의 기준일. 끝나지 않은 업무는 이 날 이후로 배치.'],
    ['운영개시 예상','전체 업무의 예상 기한으로 계산한 운영 시작일.']]],
  status:['상태와 바뀌는 기준',[
    ['계획','아직 착수하지 않은 업무.'],
    ['확인 전','착수 여부나 일정을 담당자가 아직 확인하지 않은 업무.'],
    ['진행','착수한 업무. 실제 시작일이 입력된 상태.'],
    ['완료','끝난 업무. 실제 완료일이 입력된 상태.'],
    ['보류','잠시 멈춘 업무.'],
    ['조건부 미발동','조건이 충족되어야 시작하는 업무. 아직 조건 미충족.'],
    ['바뀌는 기준','진행으로 바꾸면 실제 시작일, 완료로 바꾸면 실제 완료일이 함께 입력. 계획·확인 전·조건부 미발동으로 되돌리면 실제 시작일 삭제. 실제 완료일을 입력하면 완료로 변경.']]]};
function schHelpPop(a,k){ const parts=k==='all'?['dates','status']:[k]; openPop(a,parts.map(x=>{ const [t,rows]=SCH_HELP[x]; return `<div class="hp-t">${esc(t)}</div><dl class="hp-l">${rows.map(([n,d])=>`<dt>${x==='status'&&SCH_ST[n]?schStIcon(n):esc(n)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`; }).join(''),{cls:'sch-help'}); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-info]'); if(!b)return; e.preventDefault(); e.stopPropagation(); if(popEl&&popEl.classList.contains('sch-help')&&popEl._a===b){closePop();return;} schHelpPop(b,b.dataset.info); if(popEl)popEl._a=b; },true);
