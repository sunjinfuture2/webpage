// A change of relations is shown before it is saved (owner, 2026-11-19, after the Schedule app's "변경 후 예상 / 함께 바뀌는 일정"):
// what is connected to what, how the later task and the operation date move, a small chart of the tasks that move with it and
// the list of them. 확인 saves at once (schCommit, with 되돌리기 in the toast as for every schedule change); 취소 changes nothing.
// o: { kind:'new', from, to, type }  a relation pulled in the gantt or the relation map (its kind can still be changed here)
//    { kind:'change', from, to, title, note, mutate(draft), label }  a change of an existing relation (kind, gap, in / out, delete)
// A relation kind as a small picture: the earlier task above, the later one below, the line from the end (or start) that decides to the end (or start) it decides.
function schRelGlyph(ty){ const A=ty[0]==='F'?[2,16]:[14,30], B=ty[1]==='S'?[18,32]:[4,18], ax=ty[0]==='F'?A[1]:A[0], bx=ty[1]==='S'?B[0]:B[1], out=ty[0]==='F'?3:-3, inn=ty[1]==='S'?-3:3;
  return `<svg class="rg" width="34" height="18" viewBox="0 0 34 18" aria-hidden="true"><rect x="${A[0]}" y="2" width="${A[1]-A[0]}" height="4.5" rx="1.2" fill="currentColor" opacity=".45"/><rect x="${B[0]}" y="11.5" width="${B[1]-B[0]}" height="4.5" rx="1.2" fill="currentColor"/><path d="M${ax},4.2 H${ax+out} V13.7 H${bx+inn}" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="${bx+inn}" cy="13.7" r="1.4" fill="currentColor"/></svg>`; }
function schPropose(pid,o){ const m=schModel(pid), A=AIDCSchedule, D=A.dates; if(!m)return; closePop(); const a=m.byId.get(o.from), b=m.byId.get(o.to); if(!a||!b||a===b)return; let type=o.type||'FS';
  const mut=()=>o.kind==='new'?(d=>{d.dependencies.push(A.newDependency(o.from,o.to,type,0));}):o.mutate;
  const calc=()=>{ if(o.kind==='new'&&m.plan.dependencies.some(x=>x.from===o.from&&x.to===o.to&&x.type===type))return {err:'이미 있는 관계입니다. 다른 유형을 고르거나 취소하세요.'};
    try{const draft=A.validatedPlan(m.plan,mut());return {draft,res:schCalc(draft)};}catch(e){return {err:String(e&&e.message||'적용할 수 없는 관계입니다.')};} };
  let cur=calc(); if(cur.err&&o.kind!=='new'){toast(cur.err,3600);return;}
  const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-dlg'; document.body.appendChild(d);
  const close=()=>{d.remove();document.removeEventListener('keydown',key,true);};
  const ok=()=>{ if(cur.err)return; close(); SCHU.sel=o.to; schCommit(pid,mut(),o.kind==='new'?`${schWbs(a.wbs)} → ${schWbs(b.wbs)} 관계 추가 (${type})`:o.label); };
  const key=e=>{ if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();} else if(e.key==='Enter'){e.stopPropagation();e.preventDefault();ok();} };
  const rg=(x,t)=>t.kind==='milestone'?schD(x.start):`${schD(x.start)} → ${schD(x.finish)}`;
  const draw=()=>{ const r0=m.res, res=cur.res, err=cur.err; let body='';
    if(err)body=`<div class="pp-err">${esc(err)}</div>`;
    else{ const plan=cur.draft, moved=plan.tasks.filter(t=>r0.tasks[t.id]&&(res.tasks[t.id].start!==r0.tasks[t.id].start||res.tasks[t.id].finish!==r0.tasks[t.id].finish)), opD=D.diffDays(res.operationDate,r0.operationDate), b0=r0.tasks[b.id], b1=res.tasks[b.id];
      const shown=[a,b].concat(moved.filter(t=>t.id!==a.id&&t.id!==b.id)).slice(0,10);
      // the outcome in one line, before the figures
      const ds=D.diffDays(b1.start,b0.start), df=D.diffDays(b1.finish,b0.finish), dm=ds||df, sum=!moved.length&&!opD?`<div class="pp-sum">일정은 바뀌지 않습니다. 관계만 ${o.gone?'지워집니다':'기록됩니다'}.</div>`
        :`<div class="pp-sum ${opD>0||(!opD&&dm>0)?'late':'early'}"><b>${esc(schWbs(b.wbs))})</b> ${dm?`${ds?'시작':'완료'}이 ${Math.abs(dm)}일 ${dm>0?'늦어집니다':'당겨집니다'}`:'는 그대로입니다'}<i></i>함께 바뀌는 업무 <b>${moved.filter(t=>t.id!==b.id).length}</b>개<i></i>운영개시 ${opD?`<b>${opD>0?'+':''}${opD}일</b>`:'변화 없음'}</div>`;
      body=`${sum}<div class="pp-cmp"><div class="bx"><span>현재 예상 · ${esc(schWbs(b.wbs))}</span><strong>${rg(b0,b)}</strong></div><i>${svg('i-sch-arr',14,10)}</i><div class="bx ${b0.start!==b1.start||b0.finish!==b1.finish?'new':''}"><span>변경 후 예상</span><strong>${rg(b1,b)}</strong></div>
        <div class="bx op ${opD>0?'late':opD<0?'early':''}"><span>운영개시 예상</span><strong>${schD(r0.operationDate)}${opD?` → ${schD(res.operationDate)}`:''}</strong><em>${opD?(opD>0?'+':'')+opD+'일':'변화 없음'}</em></div></div>
        ${schProposeChart(m,cur,shown,o.kind==='new'||!o.gone?[a.id,b.id]:null)}
        <div class="pp-h">함께 바뀌는 일정 <b>${moved.length}개</b>${moved.length>shown.length?`<small>차트에는 ${shown.length}개까지 그렸습니다</small>`:''}</div>
        ${moved.length?`<div class="pp-tbl"><div class="hd"><span>업무</span><span>변경 전 → 변경 후</span><span>완료일 차이</span></div>${moved.map(t=>{const x=r0.tasks[t.id], y=res.tasks[t.id], dl=D.diffDays(y.finish,x.finish);
          return `<div class="rw"><span class="nm"><b>${esc(schWbs(t.wbs))})</b>${esc(t.name)}</span><span class="rg"><s>${rg(x,t)}</s><strong>${rg(y,t)}</strong></span><span class="dl ${dl>0?'late':dl<0?'early':''}">${dl>0?'+':''}${dl}일</span></div>`;}).join('')}</div>`
          :'<div class="pp-none">예상일이 바뀌는 업무가 없습니다. 다른 선행 업무나 실제일이 일정을 정하고 있을 수 있습니다.</div>'}`; }
    d.innerHTML=`<div class="box" role="dialog" aria-label="${esc(o.kind==='new'?'관계 연결':o.title)}"><div class="pp-hd"><b>${esc(o.kind==='new'?'관계 연결':o.title)}</b><span><em>${esc(schTaskTitle(a))}</em>${svg('i-sch-arr',13,9)}<em>${esc(schTaskTitle(b))}</em></span></div>
      ${o.kind==='new'?`<div class="pp-types">${['FS','SS','FF','SF'].map(ty=>`<button data-pp="ty" data-k="${ty}" class="${ty===type?'on':''}">${schRelGlyph(ty)}<b>${ty}</b>${esc(A.relationshipNames[ty])}</button>`).join('')}</div>`:''}
      <p class="pp-sent">${esc(o.kind==='new'?A.relationshipSentence(type,a.name,b.name):(o.note||''))}</p>${body}
      <div class="bt"><button data-pp="x">취소</button><button data-pp="ok" class="pri" ${err?'disabled':''}>확인</button></div></div>`; const p=d.querySelector('button.pri'); if(p&&!err)p.focus(); };
  d.addEventListener('click',e=>{ if(e.target===d){close();return;} const bt=e.target.closest('[data-pp]'); if(!bt)return; const k=bt.dataset.pp; if(k==='x')close(); else if(k==='ok')ok(); else if(k==='ty'){type=bt.dataset.k;cur=calc();draw();} });
  document.addEventListener('keydown',key,true); draw(); }
// The small chart of the dialog: one row per task, where it stood (dashed) and where it will stand (solid); the relation in question as a line.
function schProposeChart(m,cur,tasks,rel){ const D=AIDCSchedule.dates, r0=m.res, r1=cur.res, LW=214, TW=590, RH=27, top=22, today=schToday(); let lo=Infinity, hi=-Infinity;
  for(const t of tasks)for(const r of [r0.tasks[t.id],r1.tasks[t.id]]){ if(!r)continue; lo=Math.min(lo,D.dayNumber(r.start)); hi=Math.max(hi,D.dayNumber(r.finish)); }
  lo-=3; hi+=4; const px=TW/Math.max(1,hi-lo+1), X=d=>(D.dayNumber(d)-lo)*px, H=top+tasks.length*RH+6, geo=new Map(); let rows='', ax='';
  { let d=D.fromDay(lo).slice(0,8)+'01'; const step=px*30<34?(px*30<12?6:3):1; for(let n=0;n<400&&D.dayNumber(d)<=hi;n++){ const x=X(d); if(x>=0&&x<TW-20&&((+d.slice(5,7)-1)%step===0))ax+=`<i class="mo" style="left:${LW+x}px">${d.slice(2,4)}.${+d.slice(5,7)}</i>`; d=D.addMonths(d,1); } }
  tasks.forEach((t,i)=>{ const a=r0.tasks[t.id], b=r1.tasks[t.id], ms=t.kind==='milestone', ch=!a||a.start!==b.start||a.finish!==b.finish, cy=top+i*RH+RH/2, bar=(r,cls)=>{ const x1=X(r.start), w=Math.max(3,X(r.finish)+px-x1);
      return ms?`<i class="ms ${cls}" style="left:${LW+x1-5}px;top:${cy-5}px"></i>`:`<i class="br ${cls}" style="left:${LW+x1}px;top:${cy-7}px;width:${w}px"></i>`; };
    const x1=X(b.start), w=Math.max(3,X(b.finish)+px-x1); geo.set(t.id,ms?{ms:true,cx:x1,cy,x1:x1-6,x2:x1+6,top:cy-6,bottom:cy+6,port:x1}:{x1,x2:x1+w,cy,top:cy-7,bottom:cy+7,port:x1+Math.min(w/2,14)});
    rows+=`<div class="lb" style="top:${cy-10}px;width:${LW-14}px" title="${esc(schTaskTitle(t))}"><b>${esc(schWbs(t.wbs))})</b>${esc(t.name)}</div>${ch&&a?bar(a,'was'):''}${bar(b,ch?'now':'same')}`; });
  let link=''; if(rel&&geo.has(rel[0])&&geo.has(rel[1])){ const c=schLinkPath(geo.get(rel[0]),geo.get(rel[1])); link=`<svg width="${TW}" height="${H}" style="left:${LW}px"><path d="${c.d}"/><path d="${c.head}"/><circle cx="${c.dot[0]}" cy="${c.dot[1]}" r="1.8"/></svg>`; }
  const nx=today>=D.fromDay(lo)&&today<=D.fromDay(hi)?`<i class="td" style="left:${LW+X(today)+px/2}px;top:${top-4}px;height:${H-top+2}px"></i>`:'';
  return `<div class="pp-chart" style="height:${H}px;width:${LW+TW}px"><div class="ax">${ax}</div>${nx}${rows}${link}<div class="lg"><span><i class="br was"></i>변경 전</span><span><i class="br now"></i>변경 후</span></div></div>`; }
