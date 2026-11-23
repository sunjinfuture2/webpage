// Seventh round (owner, 2026-11-20): what a change of the schedule looks like while it is made and right after.
// - A bar of the gantt is moved by its middle and made longer or shorter by its ends. While it is pulled, where it stood stays as a
//   dashed outline, both dates stand above its ends and a tag at the pointer says by how much.
// - After the change a card at the foot of the window says what happened in plain words (which task, from when to when, how many
//   others moved with it, what it did to the operation date) with 되돌리기; the bars that moved flash and keep the outline of
//   where they stood for a few seconds.
// - The relation map is moved by pulling its ground (or a card) and made larger and smaller with the wheel; a relation is pulled
//   from the small circle at a card's right edge.

/* ---------- before / after ---------- */
function schSnap(pid){ const m=schModel(pid), out={op:m.res.operationDate,t:{}}; for(const t of m.plan.tasks){const r=m.res.tasks[t.id]; out.t[t.id]=[r.start,r.finish];} return out; }
let schCardT=0;
function schCardHide(){ clearTimeout(schCardT); const c=$('#sch-card'); if(c)c.remove(); toastPlace(); }
// o: {title, focus (task id), want (the start that was asked for, to say when a predecessor holds the task)}
function schChangeCard(pid,snap,o){ const m=schModel(pid); if(!m)return; const D=AIDCSchedule.dates, moved=[];
  for(const t of m.plan.tasks){ const a=snap.t[t.id], r=m.res.tasks[t.id]; if(a&&(a[0]!==r.start||a[1]!==r.finish))moved.push({t,a,b:[r.start,r.finish],dl:D.diffDays(r.finish,a[1])}); }
  const f=o.focus&&m.byId.get(o.focus), fm=moved.find(x=>x.t.id===o.focus), others=moved.filter(x=>x.t.id!==o.focus), opD=m.res.operationDate&&snap.op?D.diffDays(m.res.operationDate,snap.op):0, rg=(x,t)=>t.kind==='milestone'?schD(x[0]):`${schD(x[0])} → ${schD(x[1])}`;
  const held=f&&o.want&&m.res.tasks[f.id].start!==o.want;
  schCardHide(); const c=document.createElement('div'); c.id='sch-card'; c.className='sch-card'; c.dataset.pid=pid; c.setAttribute('role','status');
  c.innerHTML=`<div class="c-hd"><b>${esc(o.title||'일정을 변경했습니다')}</b><button class="c-x" data-card="x" aria-label="닫기">×</button></div>
    ${f?`<div class="c-ln c-first"><span class="nm"><b>${esc(schWbs(f.wbs))})</b>${esc(f.name)}</span>${fm?`<span class="rg"><s>${rg(fm.a,f)}</s>${svg('i-sch-arr',12,8)}<strong>${rg(fm.b,f)}</strong></span>`:'<span class="rg mut">예상 일정은 그대로입니다</span>'}</div>`:''}
    ${held?`<div class="c-note">선행 업무가 이 업무를 붙잡고 있어 예상 시작은 ${schD(m.res.tasks[f.id].start)}입니다.</div>`:''}${o.note?`<div class="c-note">${esc(o.note)}</div>`:''}
    <div class="c-facts"><span class="${others.length?'on':''}">함께 바뀐 업무 <b>${others.length}</b>건</span><span class="${opD>0?'late':opD<0?'early':''}">운영개시 예상 <b>${schD(m.res.operationDate)}</b>${opD?` (${opD>0?'+':''}${opD}일)`:' · 변화 없음'}</span></div>
    ${others.length?`<div class="c-more" hidden>${others.slice(0,40).map(x=>`<div class="c-ln"><span class="nm"><b>${esc(schWbs(x.t.wbs))})</b>${esc(x.t.name)}</span><span class="rg"><s>${rg(x.a,x.t)}</s>${svg('i-sch-arr',12,8)}<strong>${rg(x.b,x.t)}</strong></span><em class="${x.dl>0?'late':x.dl<0?'early':''}">${x.dl>0?'+':''}${x.dl}일</em></div>`).join('')}${others.length>40?`<div class="c-ln mut">외 ${others.length-40}건</div>`:''}</div>`:''}
    <div class="c-bt">${others.length?'<button data-card="more">바뀐 업무 보기</button>':''}<span class="sp"></span><button class="pri" data-card="undo">되돌리기</button></div>`;
  document.body.appendChild(c);
  // it stays until it is closed (owner, 2026-11-20): 되돌리기 must not slip away while one is still looking at what moved
  c.addEventListener('click',e=>{ e.stopPropagation(); const b=e.target.closest('[data-card]'); if(!b)return; const k=b.dataset.card;
    if(k==='x')schCardHide(); else if(k==='undo'){schCardHide();schUndo();} else if(k==='more'){const box=c.querySelector('.c-more'); box.hidden=!box.hidden; b.textContent=box.hidden?'바뀐 업무 보기':'접기';toastPlace();} });
  toastPlace(); schGhosts(pid,moved); }
// In the gantt: the bars that moved flash, and where they stood stays as a dashed outline for a few seconds.
// (The page is drawn again when the change has been saved, so the marks are kept as data and put back by every draw until their time is up.)
function schGhosts(pid,moved){ SCH.ghost={pid,at:Date.now(),list:moved.map(x=>({id:x.t.id,a:x.a}))}; schGhostsDraw(); clearTimeout(schGhosts.t);
  schGhosts.t=setTimeout(()=>{ $$('#sch-gantt .sg-ghost.keep').forEach(g=>{g.classList.add('out');setTimeout(()=>g.parentNode&&g.parentNode.removeChild(g),700);}); SCH.ghost=null; },3600); }
function schGhostsDraw(){ const G=SCH.ghost, host=$('#sch-gantt .sg-scroll'), right=host&&host.querySelector('.sg-right'); if(!G||G.pid!==S.proj||!right||!host._rows||host._o===undefined)return; const age=Date.now()-G.at; if(age>3600){SCH.ghost=null;return;}
  const D=AIDCSchedule.dates, px=host._px, X=d=>(D.dayNumber(d)-host._o)*px; right.querySelectorAll('.sg-ghost.keep').forEach(g=>right.removeChild(g));
  for(const x of G.list){ const r=host._rows.get(x.id); if(!r||r.top===undefined)continue; const bar=right.querySelector(`[data-bar="${x.id}"]`); if(bar){bar.classList.add('chg');bar.style.animationDelay=(-age)+'ms';}
    const g=document.createElement('i'); g.className='sg-ghost keep'+(r.ms?' ms':''); const x1=X(x.a[0]), w=Math.max(4,X(x.a[1])+px-x1);
    g.style.cssText=r.ms?`left:${x1-7}px;top:${r.cy-7}px`:`left:${x1}px;top:${r.top}px;width:${w}px`; right.appendChild(g); } }

/* ---------- gantt: moving a bar, pulling its ends ---------- */
function schBarDrag(e,bar){ const pid=S.proj, m=schModel(pid), host=$('#sch-gantt .sg-scroll'); if(!m||!host||!host._px)return; const t=m.byId.get(bar.dataset.bar); if(!t)return;
  const D=AIDCSchedule.dates, r=m.res.tasks[t.id], px=host._px, z=LAYOUT.zoom||1, x0=e.clientX, ms=t.kind==='milestone', left0=parseFloat(bar.style.left)||0, w0=parseFloat(bar.style.width)||0, right=bar.parentElement;
  const rz=e.target.closest&&e.target.closest('.rz'), mode=rz&&!ms?(rz.classList.contains('l')?'start':'end'):'move', span=D.diffDays(r.finish,r.start);
  const lock=t.actualStart?'착수한 업무는 실제 시작일로 고정됩니다. 상세창에서 날짜를 바꾸세요.':t.finishRule?'검수 완료 후 개월 수로 정해지는 업무입니다.':''; let moved=false, days=0, tip=null, ghost=null, la=null, lb=null;
  const lab=()=>{const i=document.createElement('i');i.className='sg-dlab';right.appendChild(i);return i;};
  const move=ev=>{ const dx=(ev.clientX-x0)/z; if(!moved&&Math.abs(dx)<4)return;
    if(!moved){ moved=true; SCH.drag=true; document.body.style.userSelect='none'; schCardHide(); if(lock){toast(lock,3200);} else{ document.body.style.cursor=mode==='move'?'grabbing':'ew-resize'; tip=document.createElement('div'); tip.className='sg-tip'; document.body.appendChild(tip);
        ghost=document.createElement('i'); ghost.className='sg-ghost'+(ms?' ms':''); ghost.style.cssText=ms?`left:${left0+2.35}px;top:${parseFloat(bar.style.top)+2.35}px`:`left:${left0}px;top:${bar.style.top};width:${w0}px`; right.appendChild(ghost); la=lab(); if(!ms)lb=lab(); bar.classList.add('drag'); } }
    if(lock)return; days=Math.round(dx/px); let a=r.start, b=r.finish;
    if(mode==='move'){ a=D.addDays(r.start,days); b=D.addDays(r.finish,days); bar.style.left=(left0+days*px)+'px'; }
    else if(mode==='start'){ days=Math.min(days,span); a=D.addDays(r.start,days); bar.style.left=(left0+days*px)+'px'; bar.style.width=Math.max(4,w0-days*px)+'px'; }
    else { days=Math.max(days,-span); b=D.addDays(r.finish,days); bar.style.width=Math.max(4,w0+days*px)+'px'; }
    const L=parseFloat(bar.style.left), W=ms?0:parseFloat(bar.style.width), top=parseFloat(bar.style.top)-17;
    la.textContent=schD(a); la.style.cssText=`left:${ms?L+9.35:L}px;top:${top}px`; la.className='sg-dlab '+(ms?'c':'l')+(mode!=='end'&&days?' on':''); if(lb){ lb.textContent=schD(b); lb.style.cssText=`left:${L+W}px;top:${top}px`; lb.className='sg-dlab r'+(mode!=='start'&&days?' on':''); }
    tip.innerHTML=`<b>${days>0?'+':''}${days}일</b>${mode==='move'?'기간 이동':mode==='start'?'시작일 변경':'종료일 변경'}${ms?'':` · ${D.diffDays(b,a)+1}일간`}`; tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY+18)+'px'; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); document.body.style.userSelect=''; document.body.style.cursor=''; SCH.drag=false; for(const n of [tip,ghost,la,lb])if(n)n.remove(); if(!moved)return; swallowClick(); bar.classList.remove('drag'); bar.style.left=left0+'px'; if(!ms)bar.style.width=w0+'px'; if(lock||!days)return;
    const snap=schSnap(pid), len=D.diffDays(t.plannedFinish,t.plannedStart), sign=(days>0?'+':'')+days+'일', w=schWbs(t.wbs); let label, want=null, fn;
    if(mode==='move'){ const ns=D.addDays(r.start,days); want=ns; label=`${w} 기간 이동 ${sign}`; fn=x=>{x.plannedStart=ns;x.plannedFinish=x.kind==='milestone'?ns:D.addDays(ns,len);}; }
    else if(mode==='start'){ const ns=D.addDays(r.start,days); want=ns; label=`${w} 시작일 ${sign}`; fn=x=>{x.plannedStart=ns;x.plannedFinish=D.addDays(ns,Math.max(0,span-days));}; }
    else { label=`${w} 종료일 ${sign}`; fn=x=>{x.plannedFinish=D.addDays(x.plannedFinish,days);}; }
    if(schEditTask(pid,t.id,label,fn,true))schChangeCard(pid,snap,{title:label,focus:t.id,want}); };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); }

/* ---------- gantt: pulling a relation ---------- */
// The line is drawn the way the chart will draw it (schLinkPath) as soon as the pointer is on a bar; until then it follows the pointer.
function schLinkDrag(e,port){ const pid=S.proj, m=schModel(pid), host=$('#sch-gantt .sg-scroll'), svgEl=$('#sch-gantt .sg-links'), bar=port.closest('[data-bar]'); if(!m||!svgEl||!bar||!host._rows)return; e.preventDefault(); schCardHide(); const from=bar.dataset.bar, fromEnd=port.dataset.port, z=LAYOUT.zoom||1;
  const box=()=>svgEl.getBoundingClientRect(), r0=port.getBoundingClientRect(), b0=box(), x0=(r0.left+r0.width/2-b0.left)/z, y0=(r0.top+r0.height/2-b0.top)/z, NS='http://www.w3.org/2000/svg';
  const line=document.createElementNS(NS,'path'), head=document.createElementNS(NS,'path'); line.setAttribute('class','draft'); head.setAttribute('class','draft head'); svgEl.appendChild(line); svgEl.appendChild(head); SCH.drag=true; bar.classList.add('linking'); host.classList.add('linking'); document.body.style.userSelect='none'; let target=null, toEnd='s', tip=null;
  const kind=()=>fromEnd==='f'?(toEnd==='s'?'FS':'FF'):(toEnd==='s'?'SS':'SF'), A=AIDCSchedule;
  const move=ev=>{ const b=box(), mx=(ev.clientX-b.left)/z, my=(ev.clientY-b.top)/z, el=document.elementFromPoint(ev.clientX,ev.clientY), hit=el&&el.closest&&el.closest('#sch-gantt [data-bar]');
    if(target&&target!==hit)target.classList.remove('target','ts','tf'); target=hit&&hit.dataset.bar!==from?hit:null;
    if(!tip){tip=document.createElement('div');tip.className='sg-tip';document.body.appendChild(tip);} tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY+18)+'px';
    if(target){ const r=target.getBoundingClientRect(), ta=m.byId.get(from), tb=m.byId.get(target.dataset.bar); toEnd=target.classList.contains('sg-msb')||ev.clientX<=r.left+r.width/2?'s':'f'; target.classList.add('target'); target.classList.toggle('ts',toEnd==='s'); target.classList.toggle('tf',toEnd==='f');
      // exactly the line the chart will draw for this pair and this kind (out of the end that was pulled, into the half under the pointer)
      const ga=host._rows.get(from), gb=host._rows.get(target.dataset.bar), c=ga&&gb&&ga.x1!==undefined&&gb.x1!==undefined?schLinkPath(ga,gb,kind()):null;
      if(c){line.setAttribute('d',c.d);head.setAttribute('d',c.head);} else { const tx=(toEnd==='s'?r.left:r.right)-b.left, ty=r.top+r.height/2-b.top; line.setAttribute('d',`M${x0},${y0} L${tx/z},${ty/z}`); head.setAttribute('d',''); }
      tip.innerHTML=`<b>${kind()}</b>${esc(schWbs(ta.wbs))} ${fromEnd==='f'?'끝나면':'시작하면'} → ${esc(schWbs(tb.wbs))} ${toEnd==='s'?'시작':'완료'} · 놓으면 결과를 먼저 보여 줍니다`; }
    else { // not on a bar yet: the same rule towards the pointer (down from the task, a round turn, into where the pointer is)
      const ga=host._rows.get(from), c=ga&&ga.x1!==undefined?schLinkPath(ga,{cy:my,cx:mx,x1:mx+2,x2:mx-2,top:my-11,bottom:my+11,ms:false},fromEnd==='f'?'FS':'SS'):null;
      if(c){line.setAttribute('d',c.d);head.setAttribute('d',c.head);} else {line.setAttribute('d',`M${x0},${y0} L${mx},${my}`); head.setAttribute('d','');}
      tip.textContent='연결할 업무의 막대에 놓으세요 (왼쪽 반 = 시작에, 오른쪽 반 = 끝에)'; } };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); document.body.style.userSelect=''; SCH.drag=false; line.remove(); head.remove(); if(tip)tip.remove(); bar.classList.remove('linking'); host.classList.remove('linking'); swallowClick(); if(!target)return; target.classList.remove('target','ts','tf');
    schPropose(pid,{kind:'new',from,to:target.dataset.bar,type:kind()}); };   // shown with its effect first; 확인 saves
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); }
// An existing relation is changed the way a new one is made (owner, 2026-11-23). The line itself does not move: it stays where
// it is, pale, and the end that was taken hold of (the half of the line the pointer was on) comes loose and follows the pointer,
// drawn by the rule a new relation is drawn by; the other end stays on its task. Let go on another task and the relation moves
// there (in the gantt the half of the bar under the pointer says start or end, so the same task's other half changes the kind);
// let go on empty ground away from where it was taken and the window asks whether to remove it. Whatever it is, the outcome is
// shown first and 확인 saves (schPropose). Used by the gantt and by the relation map.
function schLinkPull(e,g){ const pid=S.proj, m=schModel(pid), rel=m&&m.plan.dependencies.find(x=>x.id===g.dataset.link), svgEl=g.ownerSVGElement; if(!rel||!svgEl)return;
  const net=!!g.closest('#sch-net'), host=net?null:$('#sch-gantt .sg-scroll'), rows=host&&host._rows; if(!net&&!rows)return;
  e.preventDefault();   // no text selection and no drag of a selection left on the page by something else: either would swallow the pointer's moves
  const NS='http://www.w3.org/2000/svg', x0=e.clientX, y0=e.clientY, z=LAYOUT.zoom||1, A=AIDCSchedule, W=id=>schWbs(m.byId.get(id).wbs);
  const pt=net?((x,y)=>{const M=svgEl.getScreenCTM();return M?[(x-M.e)/M.a,(y-M.f)/M.d]:[0,0];}):((x,y)=>{const b=svgEl.getBoundingClientRect();return [(x-b.left)/z,(y-b.top)/z];});
  let loose='to';   // which end comes loose: the half of the line that was taken hold of
  try{ const hp=g.querySelector('path.hit')||g.querySelector('path'), L=hp.getTotalLength(), p0=pt(x0,y0); let best=Infinity, at=1; for(let i=0;i<=40;i++){ const q=hp.getPointAtLength(L*i/40), dd=Math.hypot(q.x-p0[0],q.y-p0[1]); if(dd<best){best=dd;at=i/40;} } loose=at<.5?'from':'to'; }catch(_){}
  const fixed=loose==='to'?rel.from:rel.to, sel=net?'#sch-net .sn-node':'#sch-gantt [data-bar]', idOf=el=>net?el.dataset.k:el.dataset.bar;
  let on=false, tip=null, line=null, head=null, target=null, far=false, type=rel.type, nf=rel.from, nt=rel.to;
  const move=ev=>{ const d=Math.hypot(ev.clientX-x0,ev.clientY-y0);
    if(!on){ if(d<7)return; on=true; SCH.drag=true; schCardHide(); g.classList.add('pull'); document.body.style.userSelect='none'; if(host)host.classList.add('linking');
      line=document.createElementNS(NS,'path'); line.setAttribute('class','draft'); svgEl.appendChild(line); head=document.createElementNS(NS,'path'); head.setAttribute('class','draft head'); svgEl.appendChild(head);
      tip=document.createElement('div'); tip.className='sg-tip'; document.body.appendChild(tip); }
    const el=document.elementFromPoint(ev.clientX,ev.clientY), hit=el&&el.closest&&el.closest(sel); if(target&&target!==hit)target.classList.remove('target','ts','tf');
    target=hit&&idOf(hit)!==fixed&&m.byId.has(idOf(hit))?hit:null; type=rel.type; nf=rel.from; nt=rel.to; const [mx,my]=pt(ev.clientX,ev.clientY);
    if(target){ target.classList.add('target'); if(loose==='to')nt=idOf(target); else nf=idOf(target);
      if(!net){ const r=target.getBoundingClientRect(), half=target.classList.contains('sg-msb')?(loose==='to'?'S':'F'):(ev.clientX<=r.left+r.width/2?'S':'F'); type=loose==='to'?rel.type[0]+half:half+rel.type[1]; target.classList.toggle('ts',half==='S'); target.classList.toggle('tf',half==='F'); } }
    far=!target&&d>=28; g.classList.toggle('far',far);
    if(net){ const card=id=>$(`#sch-net .sn-node[data-k="${id}"]`), side=(c,right)=>{const r=c.getBoundingClientRect();return pt(right?r.right:r.left,r.top+r.height*SN.port/SN.h);}, ca=card(nf), cb=card(nt);
      const a=(loose==='from'&&!target)||!ca?[mx,my]:side(ca,true), b=(loose==='to'&&!target)||!cb?[mx,my]:side(cb,false), mid=(a[0]+b[0])/2;
      line.setAttribute('d',`M${a[0]},${a[1]} C${mid},${a[1]} ${mid},${b[1]} ${b[0]},${b[1]}`); head.setAttribute('d',''); }
    else { // the line the chart would draw: from the task that stays to the pointer (or the other way round), or between the two tasks once the pointer is on a bar
      const ga=loose==='from'&&!target?{cy:my,cx:mx,x1:mx,x2:mx,so:0}:rows.get(nf), gb=loose==='to'&&!target?{cy:my,cx:mx,x1:mx+2,x2:mx-2}:rows.get(nt), c=ga&&gb&&ga.x1!==undefined&&gb.x1!==undefined?schLinkPath(ga,gb,type):null;
      line.setAttribute('d',c?c.d:''); head.setAttribute('d',c?c.head:''); }
    line.classList.toggle('cut',far); head.classList.toggle('cut',far); tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY+18)+'px';
    tip.innerHTML=target?(nf===rel.from&&nt===rel.to&&type===rel.type?'지금 연결 그대로입니다'
        :`<b>${net?'연결 옮기기':type}</b>${esc(W(nf))} ${type[0]==='F'?'끝나면':'시작하면'} → ${esc(W(nt))} ${type[1]==='S'?'시작':'완료'} · 놓으면 결과를 먼저 보여 줍니다`)
      :far?'<b>연결 빼기</b>놓으면 이 연결을 뺄지 묻습니다':`다른 업무${net?' 카드':'의 막대'}에 놓으면 연결을 옮기고, 빈 곳에 놓으면 연결을 뺍니다`; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); if(!on)return; SCH.drag=false; document.body.style.userSelect=''; g.classList.remove('pull','far'); if(host)host.classList.remove('linking');
    for(const n of [line,head,tip])if(n)n.remove(); const had=target; if(target)target.classList.remove('target','ts','tf'); swallowClick(); const old=`${W(rel.from)} → ${W(rel.to)}`;
    if(had){ if(nf===rel.from&&nt===rel.to&&type===rel.type)return; if(m.plan.dependencies.some(x=>x.id!==rel.id&&x.from===nf&&x.to===nt&&x.type===type)){toast('이미 있는 관계입니다.',3200);return;}
      const now=`${W(nf)} → ${W(nt)}`, kindOnly=nf===rel.from&&nt===rel.to, ty=type, a=nf, b=nt;
      if(kindOnly)schPropose(pid,{kind:'change',from:a,to:b,title:'관계 유형 변경',note:`${old} 연결의 유형을 바꿉니다: ${rel.type} → ${ty}. ${A.relationshipSentence(ty,m.byId.get(a).name,m.byId.get(b).name)}`,label:`${old} 관계 유형 ${ty}`,mutate:d=>{const q=d.dependencies.find(x=>x.id===rel.id);if(q)q.type=ty;}});
      else schPropose(pid,{kind:'change',from:a,to:b,title:'연결 옮기기',note:`${old} 연결을 ${now}${ty!==rel.type?` (${ty})`:''} 연결로 옮깁니다. 확인을 누르면 바뀝니다.`,label:`${old} 관계를 ${now} 관계로 변경`,
        mutate:d=>{ d.dependencies=d.dependencies.filter(q=>q.id!==rel.id); d.dependencies.push(A.newDependency(a,b,ty,rel.lag||0)); }});
      return; }
    if(!far)return;
    schPropose(pid,{kind:'change',from:rel.from,to:rel.to,title:'연결 빼기',note:`${old} 연결을 뺍니다. 확인을 누르면 관계가 지워집니다.`,label:`${old} 관계 삭제`,gone:true,mutate:d=>{d.dependencies=d.dependencies.filter(q=>q.id!==rel.id);}}); };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); }
// The ground of the chart (where no bar is) can be pulled to move the view, like the relation map.
function schGanttPan(e){ let host=$('#sch-gantt .sg-scroll'); if(!host)return; const x0=e.clientX, y0=e.clientY, sl=host.scrollLeft, st=host.scrollTop, z=LAYOUT.zoom||1; let on=false;
  const move=ev=>{ const dx=ev.clientX-x0, dy=ev.clientY-y0; if(!host.isConnected){ host=document.querySelector('#sch-gantt .sg-scroll'); if(!host)return; if(on)host.classList.add('pan'); }   /* the chart was drawn again between pressing and pulling: go on with the new one */
    if(!on){ if(Math.hypot(dx,dy)<5)return; on=true; SCH.drag=true; host.classList.add('pan'); document.body.style.userSelect='none'; } host.scrollLeft=sl-dx/z; host.scrollTop=st-dy/z; if(host._key)SCH.gs={key:host._key,x:host.scrollLeft,y:host.scrollTop}; };   /* remembered at once: a redraw held back during the pull runs on letting go, before the scroll event has told the chart where it stands */
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); if(!on)return; SCH.drag=false; host.classList.remove('pan'); document.body.style.userSelect=''; swallowClick(); };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); }
document.addEventListener('mousedown',e=>{ if(e.button!==0||!e.target.closest)return; const port=e.target.closest('#sch-gantt [data-port]'); if(port){schLinkDrag(e,port);return;} const bar=e.target.closest('#sch-gantt [data-bar]'); if(bar){schBarDrag(e,bar);return;}
  const lk=e.target.closest('#sch-gantt g[data-link]'); if(lk){schLinkPull(e,lk);return;} if(e.target.closest('#sch-gantt .sg-right')&&!e.target.closest('[data-sch]'))schGanttPan(e); });

/* ---------- relation map: pull to move, wheel to make larger and smaller, a circle to pull a relation from ---------- */
// keeps the point under the pointer where it is while the size changes
function schNetZoomAt(dir,cx,cy){ const host=$('#sch-net .sn-scroll'); if(!host||!host._lay)return; const z0=SCHU.netZoom||1, r=host.getBoundingClientRect(), k=LAYOUT.zoom||1, mx=(cx-r.left)/k, my=(cy-r.top)/k, ax=(host.scrollLeft+mx)/z0, ay=(host.scrollTop+my)/z0;
  const z1=Math.max(.25,Math.min(1.5,Math.round(z0*(dir>0?1.12:1/1.12)*100)/100)); if(z1===z0)return; SCHU.netFit=false; SCHU.netZoom=z1; schNetBuild(S.proj); host.scrollLeft=ax*z1-mx; host.scrollTop=ay*z1-my; clearTimeout(schNetZoomAt.t); schNetZoomAt.t=setTimeout(schUiSave,400); }
document.addEventListener('wheel',e=>{ const host=e.target.closest&&e.target.closest('#sch-net'); if(!host||e.target.closest('.sn-tools'))return; e.preventDefault(); if(e.deltaY)schNetZoomAt(e.deltaY<0?1:-1,e.clientX,e.clientY); },{passive:false});
document.addEventListener('mousedown',e=>{ if(e.button!==0)return; const net=e.target.closest&&e.target.closest('#sch-net'); if(!net||e.target.closest('.sn-tools')||!schReady(S.proj))return; const host=net.querySelector('.sn-scroll'), port=e.target.closest('.sn-port');
  if(port){ schNetLink(e,port.closest('.sn-node')); return; }
  { const lk=e.target.closest('g[data-link]'); if(lk){ schLinkPull(e,lk); return; } }
  const x0=e.clientX, y0=e.clientY, sl=host.scrollLeft, st=host.scrollTop, z=LAYOUT.zoom||1; let on=false;
  const move=ev=>{ const dx=ev.clientX-x0, dy=ev.clientY-y0; if(!on){ if(Math.hypot(dx,dy)<5)return; on=true; net.classList.add('pan'); document.body.style.userSelect='none'; } host.scrollLeft=sl-dx/z; host.scrollTop=st-dy/z; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); if(!on)return; net.classList.remove('pan'); document.body.style.userSelect=''; swallowClick(); };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); });
function schNetLink(e,card){ const pid=S.proj, m=schModel(pid), from=card&&card.dataset.k, svgEl=$('#sch-net .sn-links'); if(!m||!from||!m.byId.has(from)||!svgEl)return; e.preventDefault(); e.stopPropagation();
  let line=null, tip=null, target=null; const pt=(x,y)=>{const M=svgEl.getScreenCTM();return M?[(x-M.e)/M.a,(y-M.f)/M.d]:[0,0];};
  SCH.drag=true; document.body.style.userSelect='none'; card.classList.add('linking'); line=document.createElementNS('http://www.w3.org/2000/svg','path'); line.setAttribute('class','draft'); svgEl.appendChild(line); tip=document.createElement('div'); tip.className='sg-tip'; document.body.appendChild(tip);
  const move=ev=>{ const r=card.getBoundingClientRect(), a=pt(r.right,r.top+r.height*SN.port/SN.h), el=document.elementFromPoint(ev.clientX,ev.clientY), hit=el&&el.closest&&el.closest('#sch-net .sn-node'); if(target&&target!==hit)target.classList.remove('target'); target=hit&&hit.dataset.k!==from?hit:null;
    let b=pt(ev.clientX,ev.clientY); if(target){ target.classList.add('target'); const q=target.getBoundingClientRect(); b=pt(q.left,q.top+q.height*SN.port/SN.h); }
    const mid=(a[0]+b[0])/2; line.setAttribute('d',`M${a[0]},${a[1]} C${mid},${a[1]} ${mid},${b[1]} ${b[0]},${b[1]}`);
    tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY+18)+'px'; tip.innerHTML=target?`<b>FS</b>${esc(schWbs(m.byId.get(from).wbs))} 끝나면 → ${esc(schWbs(m.byId.get(target.dataset.k).wbs))} 시작 · 놓으면 결과를 먼저 보여 줍니다`:'연결할 업무 카드에 놓으세요'; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); document.body.style.userSelect=''; SCH.drag=false; card.classList.remove('linking'); if(line)line.remove(); if(tip)tip.remove(); swallowClick(); if(!target)return; target.classList.remove('target');
    schPropose(pid,{kind:'new',from,to:target.dataset.k,type:'FS'}); };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); }
