// The calendar and the list beside it while the preview is on.
// A day counts the actions that are under way (forecast start to finish) and, from today on, those that are late and not finished.
function schDayTasks(pid,day){ const m=schModel(pid); if(!m)return []; const P=AIDCSchedule.progress, today=schToday();
  return m.plan.tasks.filter(t=>{if(P.isExcluded(t))return false;const r=m.res.tasks[t.id];if(r.start<=day&&r.finish>=day)return true;return day>=today&&!P.isDone(t)&&r.finish<today;}); }
const schDayItems=(pid,day)=>liveItems('action',pid).filter(i=>!i.own&&i.date&&i.date<=day&&itemEnd(i)>=day);
// The actions listed for a day, in the order the owner set: changed ones (red) first, then those that start today (green), then the
// nearest deadline. Today's list also carries the red ones that are not under way today, so that a change never goes unnoticed.
function schDayRows(pid,D){ const P=AIDCSchedule.progress, m=schHas(pid)?schModel(pid):null, n=schNotices(pid), rows=[];
  const taskRow=t=>{const r=m.res.tasks[t.id], id=schItemId(t.id);return {id,title:schTaskTitle(t),ms:t.kind==='milestone',ppl:schPeople(t),role:'미지정',due:r.finish,done:P.isDone(t),red:n.red.has(id),green:n.green.has(id)};};
  const itemRow=i=>({id:i.id,ms:!!i.ms,title:(i.task&&m&&m.byId.get(i.task)?schNo(m.byId.get(i.task))+') ':'')+(i.title||'(제목 없음)').split('\n').join(' '),ppl:i.people||[],role:'미지정',due:itemEnd(i),done:i.st==='done',red:n.red.has(i.id),green:n.green.has(i.id)});
  if(m)for(const t of schDayTasks(pid,D))rows.push(taskRow(t));
  for(const i of schDayItems(pid,D))rows.push(itemRow(i));
  if(D===TODAY){ const have=new Set(rows.map(r=>r.id)); for(const id of n.red){ if(have.has(id))continue; const tid=schTaskIdOf(id);
      if(tid){const t=m&&m.byId.get(tid); if(t)rows.push(taskRow(t));} else{const i=ITEMS.find(x=>x.id===id); if(i&&isLive(i))rows.push(itemRow(i));} } }
  rows.sort((a,b)=>(b.red-a.red)||(b.green-a.green)||(a.done-b.done)||a.due.localeCompare(b.due)||a.title.localeCompare(b.title,undefined,{numeric:true}));
  return rows.map(r=>Object.assign(r,{dots:schDotsHtml(n,r.id)})); }
const schDayRowHtml=(x,yy)=>`<div class="ra" data-open="${esc(x.id)}" title="${esc(x.title)}">${x.dots}${x.ms?'<i class="sch-ms" title="마일스톤"></i>':''}<span class="tt">${esc(x.title)}</span><span class="avstack" title="${esc(x.ppl.length?x.ppl.map(userName).join(', '):'담당자 미지정')}">${x.ppl.length?x.ppl.slice(0,3).map(u=>avOf(u)).join(''):'<span class="avatar nil"></span>'}</span><i class="sp"></i>${x.done?`<span class="sch-dd" style="color:#1acc00">완료</span>`:(schDdayHtml(x.due,false)||'<span class="sch-dd"></span>')}<span class="dt">${yy===true?schD2(x.due):schD(x.due)}</span></div>`;
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
    dots=(g?`<i class="g${g>9?' w':''}" title="오늘 일정이 시작된 액션 ${g}건">${g>9?'9+':g}</i>`:'')+(r?`<i class="r${r>9?' w':''}" title="내가 담당·호출·연결된 액션의 변동 ${r}건">${r>9?'9+':r}</i>`:''); }
  return `<span class="acnt" ${date===TODAY?`title="오늘 진행 중이거나 지연된 액션 ${count}건"`:''}>${svg('i-sch-tag',9.75,9.5)}<b>${count}</b>${dots?`<span class="nd">${dots}</span>`:''}</span>`; }
function schRightList(opts){ const pid=opts.proj||null, main=!pid, D=TODAY, /* the list is always today's: neither calendar selects days (project: 2026-11-19, main: 2026-11-23) */  P=AIDCSchedule.progress; const all=itemsOn(D,pid), by=t=>all.filter(i=>i.type===t).sort(newestFirst);
  const evs=by('meeting'); const [y,mo,dn]=D.split('-').map(Number), dow='일월화수목금토'[new Date(y,mo-1,dn).getDay()], one=t=>esc((t||'').split('\n').join(' ')||'(제목 없음)');
  // the date stands above the upper line; both lines stay where they are, what is between them scrolls; a caption stays in sight
  let h=`<div class="rlist sch ${main?'':'pv'}" style="${main?'':`top:150px;--pc:${esc(proj(pid).color||'#4f4f4f')}`}"><div class="rdate">${schD(D)} (${dow})</div><div class="rline"></div><div class="rscroll"><div class="rcap cap-ev"><span class="ic">${svg('i-sch-cal',13,13)}</span><span class="lb">주요일정</span></div>`;
  if(!evs.length)h+=`<div class="rnone">오늘 등록된 미팅이 없습니다.</div>`;
  evs.forEach(e=>{const p=proj(e.proj);
    h+=`<div class="ev" data-open="${e.id}">${main?pill(p):''}<div class="tt">${main?'':dotsHtml(e)}<b>${one(e.title)}</b>${avstack(e.people)}</div>${meetLines3(e).some(c=>c.t)?chkHtml(e):''}</div>`;});
  if(pid){ // the actions of the day: tasks of the schedule and ordinary action items
    const m=schHas(pid)?schModel(pid):null, rows=schDayRows(pid,D);
    h+=`<div class="rsep"></div><div class="rcap act"><span class="ic">${svg('i-sch-tag',13,13)}</span><span class="lb">액션</span><span class="n">${rows.length}</span></div>`;
    if(!rows.length)h+=`<div class="rnone">${schHas(pid)&&!m?'일정을 불러오는 중입니다…':'이 날짜에 진행 중인 액션이 없습니다.'}</div>`;
    h+=rows.slice(0,60).map(x=>schDayRowHtml(x,true)).join('');   // the short year only here; the day window keeps the whole date
    if(rows.length>60)h+=`<div class="more">외 ${rows.length-60}건 · 아래 액션 리스트에서 모두 볼 수 있습니다</div>`; }
  return h+`<div class="rtail"></div></div><div class="rline bt"></div></div>`; }

// The list beside the calendar ends where the calendar ends (owner, 2026-11-19: "do not show all of today's actions, cut it at the end
// of the calendar"). What does not fit is reached by scrolling inside the list; a soft edge shows that there is more.
// More below: a soft lower edge (cut). Scrolled: a soft upper edge too (cut-t, and below a caption that stands still: stuck).
const schFitMark=el=>{ el.classList.toggle('cut',el.scrollHeight-el.clientHeight-el.scrollTop>2); el.classList.toggle('cut-t',el.scrollTop>2); const top=el.getBoundingClientRect().top;
  el.querySelectorAll('.rcap').forEach(c=>c.classList.toggle('stuck',el.scrollTop>2&&c.getBoundingClientRect().top-top<1.5)); };
function schFitRight(){ const z=LAYOUT.zoom||1; if(document.documentElement.classList.contains('mob')){ $$('.rlist.sch').forEach(el=>{el.style.top='';el.style.height='';}); return; }   // a phone: the list stands below the calendar, as long as it is
  $$('.rlist.sch').forEach(el=>{ const grid=el.parentElement&&el.parentElement.querySelector('.cal .grid'), box=el.querySelector('.rscroll'); if(!grid||!box||!el.offsetParent)return;
    // its upper line stands level with the calendar's line under the weekdays, its lower line with the calendar's lower edge: neither moves
    const rows=grid.querySelector('.rows'), line=el.querySelector('.rline'); if(rows&&line){ const d=(rows.getBoundingClientRect().top-line.getBoundingClientRect().top)/z; if(Math.abs(d)>.3)el.style.top=(parseFloat(getComputedStyle(el).top)+d)+'px'; }
    const h=Math.round((grid.getBoundingClientRect().bottom-el.getBoundingClientRect().top)/z); if(h<160)return; el.style.height=h+'px'; schFitMark(box);
    if(!box._fit){ box._fit=true; const key=S.page+'|'+(S.page==='project'?S.proj:'')+'|'+(S.selDate||''); if(SCH.rs&&SCH.rs.k===key&&SCH.rs.top>0){box.scrollTop=SCH.rs.top;schFitMark(box);}   // redrawn: back to where it stood
      box.addEventListener('scroll',()=>{SCH.rs={k:key,top:box.scrollTop};schFitMark(box);},{passive:true}); } }); }
function schAfterNav(){ if(!schPreview())return; schFitRight(); { const c=$('#sch-card'), open=item(S.panel||S.full); if(c&&!(S.page==='project'&&c.dataset.pid===S.proj)&&!(open&&open.proj===c.dataset.pid&&open.own)){c.remove();toastPlace();} }   /* the card of a change belongs to its project's page */ if(schPop&&!document.contains(schPop._a))schDayPopHide(true); }

// The actions of a day in a small window, while the pointer rests on that day's (pale) count in the calendar. Sizes are those of the
// owner's picture: 505 wide, rows 48 apart, 44 above the first row and 53 below the last, eight rows before it scrolls.
let schPop=null, schPopT=0, schPopHideT=0;
function schDayPopHide(now){ clearTimeout(schPopT); clearTimeout(schPopHideT); const go=()=>{if(schPop){schPop.remove();schPop=null;}}; if(now)go(); else schPopHideT=setTimeout(go,240); }
function schDayPopShow(badge){ const cell=badge.closest('[data-date]'), pid=S.proj; if(!cell||!document.contains(badge)||S.page!=='project'||!schHas(pid))return; clearTimeout(schPopHideT);
  const date=cell.dataset.date; if(schPop&&schPop._date===date&&schPop._a===badge)return; if(schPop)schPop.remove();
  const rows=schDayRows(pid,date), [y,mo,dn]=date.split('-').map(Number), p=document.createElement('div'); p.className='sch-daypop'; p._date=date; p._a=badge; p.setAttribute('role','dialog'); p.setAttribute('aria-label',`${mo}월 ${dn}일의 액션 ${rows.length}건`);
  p.innerHTML=`<div class="dp-in">${rows.map(x=>schDayRowHtml(x)).join('')||'<div class="dp-none">이 날 진행 중인 액션이 없습니다.</div>'}</div>${rows.length>8?`<div class="dp-more">${schD(date)} · 액션 ${rows.length}건 (스크롤)</div>`:''}`;
  document.body.appendChild(p); const z=(LAYOUT.zoom||1)*.7, r=badge.getBoundingClientRect(); p.style.transform=`scale(${z})`; const w=p.offsetWidth*z, h=p.offsetHeight*z;   /* 0.7: the owner found the window a third too large */
  let x=r.left-6*z, top=r.bottom+7*z; if(x+w>innerWidth-8)x=innerWidth-8-w; if(top+h>innerHeight-8&&r.top-7*z-h>=8)top=r.top-7*z-h; top=Math.max(8,Math.min(top,innerHeight-8-h)); x=Math.max(8,x);
  p.style.left=x+'px'; p.style.top=top+'px'; schPop=p; const box=p.firstElementChild; schFitMark(box); box.addEventListener('scroll',()=>schFitMark(box),{passive:true});
  p.addEventListener('mouseenter',()=>clearTimeout(schPopHideT)); p.addEventListener('mouseleave',()=>schDayPopHide()); p.addEventListener('click',e=>{if(e.target.closest('[data-open]'))setTimeout(()=>schDayPopHide(true),0);}); }

// "+N건" in a day of the calendar: what did not fit, as a small list (the calendars do not select days, so there is no other way to it).
function schCalMore(el){ const d=el.dataset.date, pid=S.page==='project'?S.proj:null; if(!d)return;
  const rank={meeting:0,research:1}, list=calItems(pid).filter(i=>i.type!=='action'&&i.date<=d&&itemEnd(i)>=d).sort((a,b)=>((rank[a.type]||0)-(rank[b.type]||0))||newestFirst(a,b)); if(!list.length)return;
  menuPop(el,[{hd:schD(d)+' · '+list.length+'건'},...list.map((i,n)=>({html:`<span class="cm-t">${esc(oneLine(i.title)||'(제목 없음)')}</span>`,ico:`<i class="cm-ic">${schCalPict(i.type,proj(i.proj).color)}</i>`,k:'cm'+n,fn:()=>openPanel(i.id)}))],{cls:'sch-calmore'}); }
