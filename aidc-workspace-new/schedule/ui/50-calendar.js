// The calendar and the list beside it while the preview is on.
// A day counts the actions that are under way (forecast start to finish) and, from today on, those that are late and not finished.
function schDayTasks(pid,day){ const m=schModel(pid); if(!m)return []; const P=AIDCSchedule.progress, today=schToday();
  return m.plan.tasks.filter(t=>{if(P.isExcluded(t))return false;const r=m.res.tasks[t.id];if(r.start<=day&&r.finish>=day)return true;return day>=today&&!P.isDone(t)&&r.finish<today;}); }
const schDayItems=(pid,day)=>liveItems('action',pid).filter(i=>!i.own&&i.date&&i.date<=day&&itemEnd(i)>=day);
function schCalCounts(pid,mStart,mEnd){ const out={}, dim=+mEnd.slice(8), m=schHas(pid)?schModel(pid):null, P=AIDCSchedule.progress, today=schToday();
  const add=(a,b)=>{const s=a<mStart?1:+a.slice(8), e=b>mEnd?dim:+b.slice(8);for(let n=s;n<=e;n++)out[n]=(out[n]||0)+1;};
  if(m)for(const t of m.plan.tasks){ if(P.isExcluded(t))continue; const r=m.res.tasks[t.id];
    if(r.start<=mEnd&&r.finish>=mStart)add(r.start,r.finish);
    if(!P.isDone(t)&&r.finish<today){const from=today>mStart?today:mStart;if(from<=mEnd)add(from,mEnd);} }   // a late task stays on every day from today
  for(const i of liveItems('action',pid)){ if(i.own||!i.date)continue; const b=itemEnd(i); if(i.date<=mEnd&&b>=mStart)add(i.date,b); }
  return out; }
function schRightList(opts){ const pid=opts.proj||null, main=!pid, D=S.selDate||TODAY, P=AIDCSchedule.progress; const all=itemsOn(D,pid), by=t=>all.filter(i=>i.type===t).sort(newestFirst);
  const evs=by('meeting'), rss=by('research'); const [y,mo,dn]=D.split('-').map(Number), dow='일월화수목금토'[new Date(y,mo-1,dn).getDay()], one=t=>esc((t||'').split('\n').join(' ')||'(제목 없음)');
  const dateTag=`<span class="d">${y!==+TODAY.slice(0,4)?y+'년 ':''}${mo}월 ${dn}일 (${dow})${D===TODAY?'<span class="td">오늘</span>':'<button class="sh-btn" data-seltoday>오늘로</button>'}</span>`;
  let h=`<div class="rlist sch ${main?'':'pv'}" style="${main?'':'top:150px'}"><div class="rcap">${D===TODAY?'금일 주요일정':'주요일정'}${dateTag}</div>`;
  if(!evs.length&&!rss.length)h+=`<div class="rnone">${D===TODAY?'오늘':'이 날짜에'} 등록된 미팅·리서치가 없습니다.</div>`;
  evs.forEach(e=>{const p=proj(e.proj);
    h+=`<div class="ev" data-open="${e.id}">${main?pill(p):''}<div class="tt">${main?'':dotsHtml(e)}<b>${one(e.title)}</b>${avstack(e.people)}</div>${(e.checks||[]).length?`<ul class="chk">${e.checks.map(c=>`<li><span class="bx">${pict(meetingLineIcon(c))}</span><span class="tx">${esc(c.t)}</span>${c.pre?`<span class="pre">${esc(c.pre)}</span>`:''}</li>`).join('')}</ul>`:''}</div>`;});
  if(rss.length)h+=`<div class="it rs" style="padding-top:${evs.length?30:6}px"><div class="cat" style="top:${evs.length?30:6}px"><i>${pict('research')}</i>리서치</div>${rss.map((x,i)=>`<div class="tt" style="margin-top:${i?8:18.7}px" data-open="${x.id}"><b>${one(x.title)}</b>${avstack(x.people)}</div>`).join('')}</div>`;
  if(pid){ // the actions of the day: tasks of the schedule and ordinary action items, nearest deadline first
    const rows=[]; const m=schHas(pid)?schModel(pid):null;
    if(m)for(const t of schDayTasks(pid,D)){const r=m.res.tasks[t.id], done=P.isDone(t);rows.push({id:schItemId(t.id),title:schTaskTitle(t),ppl:schPeople(t),role:schRole(t),due:r.finish,done,dots:''});}
    for(const i of schDayItems(pid,D))rows.push({id:i.id,title:(i.task&&m&&m.byId.get(i.task)?schWbs(m.byId.get(i.task).wbs)+') ':'')+(i.title||'(제목 없음)').split('\n').join(' '),ppl:i.people||[],role:'',due:itemEnd(i),done:i.st==='done',dots:dotsHtml(i)});
    rows.sort((a,b)=>(a.done-b.done)||a.due.localeCompare(b.due)||a.title.localeCompare(b.title,undefined,{numeric:true}));
    h+=`<div class="rsep"></div><div class="rcap">${pict('action')}${D===TODAY?'금일 액션':'이 날의 액션'}<span class="n">${rows.length}</span></div>`;
    if(!rows.length)h+=`<div class="rnone">${schHas(pid)&&!m?'일정을 불러오는 중입니다…':'이 날짜에 진행 중인 액션이 없습니다.'}</div>`;
    h+=rows.slice(0,60).map(x=>`<div class="ra" data-open="${esc(x.id)}" title="${esc(x.title)}"><span class="tt">${x.dots}${esc(x.title)}</span>${x.ppl.length?avstack(x.ppl,3):(x.role?`<span class="sch-role">${esc(x.role)}</span>`:'')}${x.done?`<span class="sch-dd" style="color:#1acc00">완료</span>`:(schDdayHtml(x.due,false)||'<span class="sch-dd"></span>')}<span class="dt">${schD(x.due)}</span></div>`).join('');
    if(rows.length>60)h+=`<div class="more">외 ${rows.length-60}건 · 아래 액션 리스트에서 모두 볼 수 있습니다</div>`; }
  return h+`</div>`; }
