// The calendar and the list beside it while the preview is on.
// A day counts the actions that are under way (forecast start to finish) and, from today on, those that are late and not finished.
function schDayTasks(pid,day){ const m=schModel(pid); if(!m)return []; const P=AIDCSchedule.progress, today=schToday();
  return m.plan.tasks.filter(t=>{if(P.isExcluded(t))return false;const r=m.res.tasks[t.id];if(r.start<=day&&r.finish>=day)return true;return day>=today&&!P.isDone(t)&&r.finish<today;}); }
const schDayItems=(pid,day)=>liveItems('action',pid).filter(i=>!i.own&&i.date&&i.date<=day&&itemEnd(i)>=day);
// The actions listed for a day, in the order the owner set: changed ones (red) first, then those that start today (green), then the
// nearest deadline. Today's list also carries the red ones that are not under way today, so that a change never goes unnoticed.
function schDayRows(pid,D){ const P=AIDCSchedule.progress, m=schHas(pid)?schModel(pid):null, n=schNotices(pid), rows=[];
  const taskRow=t=>{const r=m.res.tasks[t.id], id=schItemId(t.id);return {id,title:schTaskTitle(t),ppl:schPeople(t),role:schRole(t),due:r.finish,done:P.isDone(t),red:n.red.has(id),green:n.green.has(id)};};
  const itemRow=i=>({id:i.id,title:(i.task&&m&&m.byId.get(i.task)?schWbs(m.byId.get(i.task).wbs)+') ':'')+(i.title||'(제목 없음)').split('\n').join(' '),ppl:i.people||[],role:'',due:itemEnd(i),done:i.st==='done',red:n.red.has(i.id),green:n.green.has(i.id)});
  if(m)for(const t of schDayTasks(pid,D))rows.push(taskRow(t));
  for(const i of schDayItems(pid,D))rows.push(itemRow(i));
  if(D===TODAY){ const have=new Set(rows.map(r=>r.id)); for(const id of n.red){ if(have.has(id))continue; const tid=schTaskIdOf(id);
      if(tid){const t=m&&m.byId.get(tid); if(t)rows.push(taskRow(t));} else{const i=ITEMS.find(x=>x.id===id); if(i&&isLive(i))rows.push(itemRow(i));} } }
  rows.sort((a,b)=>(b.red-a.red)||(b.green-a.green)||(a.done-b.done)||a.due.localeCompare(b.due)||a.title.localeCompare(b.title,undefined,{numeric:true}));
  return rows.map(r=>Object.assign(r,{dots:schDotsHtml(n,r.id)})); }
const schDayRowHtml=x=>`<div class="ra" data-open="${esc(x.id)}" title="${esc(x.title)}">${x.dots}<span class="tt">${esc(x.title)}</span>${x.ppl.length?avstack(x.ppl,3):(x.role?`<span class="sch-role">${esc(x.role)}</span>`:'')}<i class="sp"></i>${x.done?`<span class="sch-dd" style="color:#1acc00">완료</span>`:(schDdayHtml(x.due,false)||'<span class="sch-dd"></span>')}<span class="dt">${schD(x.due)}</span></div>`;
function schCalCounts(pid,mStart,mEnd){ const out={}, dim=+mEnd.slice(8), m=schHas(pid)?schModel(pid):null, P=AIDCSchedule.progress, today=schToday();
  const add=(a,b)=>{const s=a<mStart?1:+a.slice(8), e=b>mEnd?dim:+b.slice(8);for(let n=s;n<=e;n++)out[n]=(out[n]||0)+1;};
  if(m)for(const t of m.plan.tasks){ if(P.isExcluded(t))continue; const r=m.res.tasks[t.id];
    if(r.start<=mEnd&&r.finish>=mStart)add(r.start,r.finish);
    if(!P.isDone(t)&&r.finish<today){const from=today>mStart?today:mStart;if(from<=mEnd)add(from,mEnd);} }   // a late task stays on every day from today
  for(const i of liveItems('action',pid)){ if(i.own||!i.date)continue; const b=itemEnd(i); if(i.date<=mEnd&&b>=mStart)add(i.date,b); }
  if(TODAY>=mStart&&TODAY<=mEnd){const n=schDayRows(pid,TODAY).length; if(n)out[+TODAY.slice(8)]=n;}   // today: exactly what the list beside the calendar shows
  return out; }
// The count beside a date: a small speech bubble pointing at the day number. Today's also says how many of its actions start today (green)
// and how many of mine have changed (red).
function schCalBadge(pid,date,count){ let dots='';
  if(date===TODAY){ const rows=schDayRows(pid,date), g=rows.filter(x=>x.green).length, r=rows.filter(x=>x.red).length;
    dots=(g?`<i class="g" title="오늘 일정이 시작된 액션 ${g}건">${g>9?'9+':g}</i>`:'')+(r?`<i class="r" title="내가 담당·호출·연결된 액션의 변동 ${r}건">${r>9?'9+':r}</i>`:''); }
  return `<span class="acnt" ${date===TODAY?`title="오늘 진행 중이거나 지연된 액션 ${count}건"`:''}>${svg('i-sch-tag',9.75,9.5)}<b>${count}</b>${dots?`<span class="nd">${dots}</span>`:''}</span>`; }
function schRightList(opts){ const pid=opts.proj||null, main=!pid, D=S.selDate||TODAY, P=AIDCSchedule.progress; const all=itemsOn(D,pid), by=t=>all.filter(i=>i.type===t).sort(newestFirst);
  const evs=by('meeting'), rss=by('research'); const [y,mo,dn]=D.split('-').map(Number), dow='일월화수목금토'[new Date(y,mo-1,dn).getDay()], one=t=>esc((t||'').split('\n').join(' ')||'(제목 없음)');
  const dateTag=`<span class="d">${y!==+TODAY.slice(0,4)?y+'년 ':''}${mo}월 ${dn}일 (${dow})${D===TODAY?'<span class="td">오늘</span>':'<button class="sh-btn" data-seltoday>오늘로</button>'}</span>`;
  let h=`<div class="rlist sch ${main?'':'pv'}" style="${main?'':'top:150px'}"><div class="rcap">${D===TODAY?'금일 주요일정':'주요일정'}${dateTag}</div>`;
  if(!evs.length&&!rss.length)h+=`<div class="rnone">${D===TODAY?'오늘':'이 날짜에'} 등록된 미팅·리서치가 없습니다.</div>`;
  evs.forEach(e=>{const p=proj(e.proj);
    h+=`<div class="ev" data-open="${e.id}">${main?pill(p):''}<div class="tt">${main?'':dotsHtml(e)}<b>${one(e.title)}</b>${avstack(e.people)}</div>${(e.checks||[]).length?`<ul class="chk">${e.checks.map(c=>`<li><span class="bx">${pict(meetingLineIcon(c))}</span><span class="tx">${esc(c.t)}</span>${c.pre?`<span class="pre">${esc(c.pre)}</span>`:''}</li>`).join('')}</ul>`:''}</div>`;});
  if(rss.length)h+=`<div class="it rs" style="padding-top:${evs.length?30:6}px"><div class="cat" style="top:${evs.length?30:6}px"><i>${pict('research')}</i>리서치</div>${rss.map((x,i)=>`<div class="tt" style="margin-top:${i?8:18.7}px" data-open="${x.id}"><b>${one(x.title)}</b>${avstack(x.people)}</div>`).join('')}</div>`;
  if(pid){ // the actions of the day: tasks of the schedule and ordinary action items
    const m=schHas(pid)?schModel(pid):null, rows=schDayRows(pid,D);
    h+=`<div class="rsep"></div><div class="rcap">${svg('i-sch-tag',13,13)}${D===TODAY?'금일 액션':'이 날의 액션'}<span class="n">${rows.length}</span></div>`;
    if(!rows.length)h+=`<div class="rnone">${schHas(pid)&&!m?'일정을 불러오는 중입니다…':'이 날짜에 진행 중인 액션이 없습니다.'}</div>`;
    h+=rows.slice(0,60).map(schDayRowHtml).join('');
    if(rows.length>60)h+=`<div class="more">외 ${rows.length-60}건 · 아래 액션 리스트에서 모두 볼 수 있습니다</div>`; }
  return h+`</div>`; }

// The list beside the calendar ends where the calendar ends (owner, 2026-11-19: "do not show all of today's actions, cut it at the end
// of the calendar"). What does not fit is reached by scrolling inside the list; a soft edge shows that there is more.
const schFitMark=el=>el.classList.toggle('cut',el.scrollHeight-el.clientHeight-el.scrollTop>2);
function schFitRight(){ const z=LAYOUT.zoom||1; $$('.rlist.sch').forEach(el=>{ const grid=el.parentElement&&el.parentElement.querySelector('.cal .grid'); if(!grid||!el.offsetParent)return;
    const h=Math.round((grid.getBoundingClientRect().bottom-el.getBoundingClientRect().top)/z); if(h<160)return; el.style.maxHeight=h+'px'; schFitMark(el);
    if(!el._fit){ el._fit=true; const key=S.page+'|'+(S.page==='project'?S.proj:'')+'|'+(S.selDate||''); if(SCH.rs&&SCH.rs.k===key&&SCH.rs.top>0){el.scrollTop=SCH.rs.top;schFitMark(el);}   // redrawn: back to where it stood
      el.addEventListener('scroll',()=>{SCH.rs={k:key,top:el.scrollTop};schFitMark(el);},{passive:true}); } }); }
function schAfterNav(){ if(!schPreview())return; schFitRight(); if(schPop&&!document.contains(schPop._a))schDayPopHide(true); }

// The actions of a day in a small window, while the pointer rests on that day's (pale) count in the calendar. Sizes are those of the
// owner's picture: 505 wide, rows 48 apart, 44 above the first row and 53 below the last, eight rows before it scrolls.
let schPop=null, schPopT=0, schPopHideT=0;
function schDayPopHide(now){ clearTimeout(schPopT); clearTimeout(schPopHideT); const go=()=>{if(schPop){schPop.remove();schPop=null;}}; if(now)go(); else schPopHideT=setTimeout(go,240); }
function schDayPopShow(badge){ const cell=badge.closest('[data-date]'), pid=S.proj; if(!cell||!document.contains(badge)||S.page!=='project'||!schHas(pid))return; clearTimeout(schPopHideT);
  const date=cell.dataset.date; if(schPop&&schPop._date===date&&schPop._a===badge)return; if(schPop)schPop.remove();
  const rows=schDayRows(pid,date), [y,mo,dn]=date.split('-').map(Number), p=document.createElement('div'); p.className='sch-daypop'; p._date=date; p._a=badge; p.setAttribute('role','dialog'); p.setAttribute('aria-label',`${mo}월 ${dn}일의 액션 ${rows.length}건`);
  p.innerHTML=`<div class="dp-in">${rows.map(schDayRowHtml).join('')||'<div class="dp-none">이 날 진행 중인 액션이 없습니다.</div>'}</div>${rows.length>8?`<div class="dp-more">${mo}월 ${dn}일 · 액션 ${rows.length}건 (스크롤)</div>`:''}`;
  document.body.appendChild(p); const z=LAYOUT.zoom||1, r=badge.getBoundingClientRect(); p.style.transform=z===1?'':`scale(${z})`; const w=p.offsetWidth*z, h=p.offsetHeight*z;
  let x=r.left-6*z, top=r.bottom+7*z; if(x+w>innerWidth-8)x=innerWidth-8-w; if(top+h>innerHeight-8&&r.top-7*z-h>=8)top=r.top-7*z-h; top=Math.max(8,Math.min(top,innerHeight-8-h)); x=Math.max(8,x);
  p.style.left=x+'px'; p.style.top=top+'px'; schPop=p; const box=p.firstElementChild; schFitMark(box); box.addEventListener('scroll',()=>schFitMark(box),{passive:true});
  p.addEventListener('mouseenter',()=>clearTimeout(schPopHideT)); p.addEventListener('mouseleave',()=>schDayPopHide()); p.addEventListener('click',e=>{if(e.target.closest('[data-open]'))setTimeout(()=>schDayPopHide(true),0);}); }
