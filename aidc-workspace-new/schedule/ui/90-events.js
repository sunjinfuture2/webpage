// Clicks, typing and keys of the schedule views. Opening a task is the page's own data-open (the right panel).
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-sch]'); if(!el)return; const pid=S.proj; if(S.page!=='project'||!schHas(pid))return; const k=el.dataset.sch, v=el.dataset.k, m=schModel(pid);
  if(k==='reload'){schLoad(pid);schRefresh();return;}
  if(k==='tools'){e.stopPropagation();schToolsMenu(el,pid);return;}
  if(k==='addtask'&&m){e.stopPropagation();let nid='';if(schCommit(pid,d=>{const t=AIDCSchedule.newTask(d,v);t.plannedStart=t.referenceStart=schToday();t.plannedFinish=t.referenceFinish=AIDCSchedule.dates.addDays(schToday(),4);d.tasks.push(t);nid=t.id;},'업무를 추가했습니다')){if(!SCHU.open.includes(v))SCHU.open.push(v);schRefresh();openPanel(schItemId(nid));}return;}
  // a task in the gantt or the relation map: the first click selects it (green, its direct relations drawn stronger), the second opens it
  if(k==='pickrow'){ if(!m||!m.byId.has(v))return; if((schTaskIdOf(S.panel)||SCHU.sel)===v){SCHU.sel=v;openPanel(schItemId(v));return;} SCHU.sel=v; schUiSave(); if($('#sch-gantt'))schGanttBuild(pid); if($('#sch-net'))schNetBuild(pid); return; }
  if(k==='tab'){if(SCHU.tab!==v){SCHU.tab=v;schRefresh();}return;}
  if(k==='col'&&m){e.stopPropagation();schColMenu(el,pid,m,v);return;}
  if(k==='cf-clear'){SCHU.cf={};SCHU.who='';SCHU.page=1;schRefresh();return;}
  if(k==='toggle'){SCHU[v]=!SCHU[v];schRefresh();return;}
  if(k==='phase'){const i=SCHU.open.indexOf(v);if(i>=0)SCHU.open.splice(i,1);else SCHU.open.push(v);schRefresh();return;}
  if(k==='expand'){SCHU.open=v==='1'&&m?m.phases.map(g=>g.code):[];schRefresh();return;}
  if(k==='sort'){if(SCHU.sort===v)SCHU.dir=-SCHU.dir;else{SCHU.sort=v;SCHU.dir=1;}SCHU.page=1;schRefresh();return;}
  if(k==='page'){const key=v, cur=SCHU[key]||1, x=el.dataset.v;SCHU[key]=x==='prev'?cur-1:x==='next'?cur+1:+x;if(key==='evPage'){schLowerRefresh();const lw=$('#sch-lower');if(lw)lw.scrollIntoView({block:'start'});return;}schRefresh();const top=$('#sch-actions');if(top&&key==='page')top.scrollIntoView({block:'start'});return;}
  if(k==='sec'){if(SCHU.sec!==v){SCHU.sec=v;SCHU.evPage=1;schLowerRefresh();}return;}
  if(k==='lowadd'){e.stopPropagation();schLowerAdd(el,pid);return;}
  if(k==='netmode'){SCHU.netMode=v;schRefresh();return;}
  if(k==='netfit'){ if(SCHU.netFit){SCHU.netFit=false;SCHU.netZoom=1;schNetBuild(pid);schUiSave();}else{schNetZoom(0);SCHU.netFit=true;schUiSave();} return; }
  if(k==='scn-off'){SCHU.scn='';SCH.memo[pid]=null;schRedraw(true);return;}
  if(k==='ops'){SCHU.tab='gantt';const t=m&&m.byWbs.get('W8.6');if(t){SCHU.sel=t.id;if(!SCHU.open.includes(t.phase))SCHU.open.push(t.phase);}schRefresh();const top=$('#sch-actions');if(top)top.scrollIntoView({block:'start',behavior:'smooth'});return;}
  if(k==='pick'&&m&&['procState','evKind','evState'].includes(v)){ const setL=(key,val)=>()=>{SCHU[key]=val;SCHU.evPage=1;if(key==='evKind')SCHU.evState='';schLowerRefresh();}; let items;
    if(v==='procState')items=[{t:'전체 상태',sel:!SCHU.procState,fn:setL('procState','')}].concat(SCH_COMMIT.map(x=>({t:x,sel:SCHU.procState===x,fn:setL('procState',x)})));
    else if(v==='evKind')items=SCH_EV.map(([key,t])=>({t:`${t} (${((SCH.src[pid]||{})[key]||[]).length})`,sel:SCHU.evKind===key,fn:setL('evKind',key)}));
    else items=[{t:'전체 상태',sel:!SCHU.evState,fn:setL('evState','')}].concat([...new Set(schEvRows(pid,SCHU.evKind).map(r=>r.st).filter(Boolean))].map(x=>({t:x,sel:SCHU.evState===x,fn:setL('evState',x)})));
    e.stopPropagation(); menuPop(el,items.map((x,i)=>({...x,k:String(i)}))); return; }
  if(k==='pick'&&m){ const set=(key,val,extra)=>()=>{SCHU[key]=val;SCHU.page=1;if(extra)extra();schRefresh();}; let items=[];
    if(v==='phase')items=[{t:'전체 단계',sel:!SCHU.phase,fn:set('phase','')},...m.phases.map(g=>({t:`${schPhaseLabel(g)} (${g.tasks.length})`,sel:SCHU.phase===g.code,fn:set('phase',g.code)})),
      {t:`일정 미연결 (${schLoose(pid,m).length})`,sel:SCHU.phase==='none',fn:set('phase','none',()=>{SCHU.tab='list';})}];
    else if(v==='scope')items=SCH_SCOPES.map(([key,t])=>({t,sel:SCHU.scope===key,fn:set('scope',key)}));
    else if(v==='scale')items=SCH_SCALES.map(([key,t])=>({t,sel:SCHU.scale===key,fn:set('scale',key)}));
    else if(v==='per')items=[10,20,50,100].map(n=>({t:n+'개씩 보기',sel:SCHU.per===n,fn:set('per',n)}));
    else if(v==='netDepth')items=[1,2,3,4].map(n=>({t:n+'단계 연결',sel:SCHU.netDepth===n,fn:set('netDepth',n)}));
    else if(v==='netDir')items=[['both','선행+후행'],['before','선행만'],['after','후행만']].map(([key,t])=>({t,sel:SCHU.netDir===key,fn:set('netDir',key)}));
    else if(v==='who'){ const ppl=[...new Set(m.plan.tasks.flatMap(schPeople))], roles=[...new Set(m.plan.tasks.filter(t=>!schPeople(t).length).map(schRole).filter(Boolean))].sort();
      items=[{t:'전체 담당자',sel:!SCHU.who,fn:set('who','')},...(ppl.length?['-',{hd:'멤버'},...ppl.map(x=>({t:userName(x),sel:SCHU.who===x,fn:set('who',x)}))]:[]),...(roles.length?['-',{hd:'실행 역할 (멤버 미지정)'},...roles.map(x=>({t:x,sel:SCHU.who==='r:'+x,fn:set('who','r:'+x)}))]:[])]; }
    e.stopPropagation(); menuPop(el,items.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)}),{right:v==='per'}); return; }
});
let schQT=0;
document.addEventListener('input',e=>{ const t=e.target; if(!(t.matches&&t.matches('input[data-schq]')))return; const key=t.dataset.schq; SCHU[key]=t.value; SCHU.page=1; SCHU.upage=1; SCHU.evPage=1; clearTimeout(schQT); schQT=setTimeout(key==='lq'?schLowerRefresh:schRefresh,140); });
// Ctrl+Z / Ctrl+Shift+Z undo and redo schedule changes while nothing is being typed.
document.addEventListener('keydown',e=>{ if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||S.page!=='project'||!schHas(S.proj)||S.full)return; const a=document.activeElement; if(a&&a.matches&&a.matches('input,textarea,select,[contenteditable="true"]'))return; if(!SCH.undo.length&&!SCH.redo.length)return; e.preventDefault(); if(e.shiftKey)schRedo();else schUndo(); });
window.addEventListener('resize',()=>{ clearTimeout(schQT); schQT=setTimeout(()=>{const g=$('#sch-gantt .sg-scroll');if(g&&SCHU.scale==='fit'){g._key='';schGanttBuild(S.proj);}},200); });

// Dragging a bar of the gantt moves the task's managed dates by whole days (not for a task that has started or whose length is a rule).
// What is drawn is the forecast, so the new managed start is "forecast start + the days dragged"; if a predecessor still holds the task, the toast says so.
// A line of the gantt can be clicked: the menu of that relation opens where the pointer is.
document.addEventListener('click',e=>{ const g=e.target.closest&&e.target.closest('#sch-gantt g[data-link]'); if(!g||!schReady(S.proj))return; e.stopPropagation(); const a=document.createElement('i'); a.style.cssText=`position:fixed;left:${e.clientX}px;top:${e.clientY-6}px;width:1px;height:1px`; document.body.appendChild(a); schRelMenu(a,S.proj,g.dataset.link); a.remove(); },true);
// Pulling from the small circle at the start or the end of a bar to another bar makes a relation. The ends decide its kind:
// end -> start is FS (the usual "after"), start -> start SS, end -> end FF, start -> end SF.
function schLinkDrag(e,port){ const pid=S.proj, m=schModel(pid), svgEl=$('#sch-gantt .sg-links'), bar=port.closest('[data-bar]'); if(!m||!svgEl||!bar)return; e.preventDefault(); const from=bar.dataset.bar, fromEnd=port.dataset.port, z=LAYOUT.zoom||1;
  const box=()=>svgEl.getBoundingClientRect(), r0=port.getBoundingClientRect(), b0=box(), x0=(r0.left+r0.width/2-b0.left)/z, y0=(r0.top+r0.height/2-b0.top)/z;
  const line=document.createElementNS('http://www.w3.org/2000/svg','path'); line.setAttribute('class','draft'); svgEl.appendChild(line); bar.classList.add('linking'); document.body.style.userSelect='none'; let target=null, toEnd='s', tip=null;
  const kind=()=>fromEnd==='f'?(toEnd==='s'?'FS':'FF'):(toEnd==='s'?'SS':'SF');
  const move=ev=>{ const b=box(); line.setAttribute('d',`M${x0},${y0} L${(ev.clientX-b.left)/z},${(ev.clientY-b.top)/z}`); const el=document.elementFromPoint(ev.clientX,ev.clientY), hit=el&&el.closest&&el.closest('#sch-gantt [data-bar]');
    if(target&&target!==hit)target.classList.remove('target'); target=hit&&hit.dataset.bar!==from?hit:null;
    if(!tip){tip=document.createElement('div');tip.className='sg-tip';document.body.appendChild(tip);} tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY+16)+'px';
    if(target){target.classList.add('target');const r=target.getBoundingClientRect();toEnd=target.classList.contains('sg-msb')||ev.clientX<=r.left+r.width/2?'s':'f';tip.textContent=`${schWbs(m.byId.get(from).wbs)} → ${schWbs(m.byId.get(target.dataset.bar).wbs)} · ${kind()} ${AIDCSchedule.relationshipNames[kind()]}`;}else tip.textContent='연결할 업무의 막대에 놓으세요'; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); document.body.style.userSelect=''; line.remove(); if(tip)tip.remove(); bar.classList.remove('linking'); swallowClick(); if(!target)return; target.classList.remove('target');
    schPropose(pid,{kind:'new',from,to:target.dataset.bar,type:kind()}); };   // shown with its effect first; 확인 saves
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); }
document.addEventListener('mousedown',e=>{ if(e.button!==0)return; const port=e.target.closest&&e.target.closest('#sch-gantt [data-port]'); if(port){schLinkDrag(e,port);return;} const bar=e.target.closest&&e.target.closest('#sch-gantt [data-bar]'); if(!bar)return; const pid=S.proj, m=schModel(pid), host=$('#sch-gantt .sg-scroll'); if(!m||!host||!host._px)return;
  const t=m.byId.get(bar.dataset.bar); if(!t)return; const D=AIDCSchedule.dates, r=m.res.tasks[t.id], px=host._px, x0=e.clientX, left0=parseFloat(bar.style.left)||0, lock=t.actualStart?'착수한 업무는 실제 시작일로 고정됩니다. 상세창에서 날짜를 바꾸세요.':t.finishRule?'검수 완료 후 개월 수로 정해지는 업무입니다.':''; let moved=false, days=0, tip=null;
  const move=ev=>{ const dx=(ev.clientX-x0)/(LAYOUT.zoom||1); if(!moved&&Math.abs(dx)<4)return; if(!moved){moved=true;document.body.style.userSelect='none';if(lock){toast(lock,3200);}else{tip=document.createElement('div');tip.className='sg-tip';document.body.appendChild(tip);}}
    if(lock)return; days=Math.round(dx/px); bar.style.left=(left0+days*px)+'px'; bar.classList.add('drag'); const a=D.addDays(r.start,days), b=D.addDays(r.finish,days); tip.textContent=`${schD(a)}${t.kind==='milestone'?'':' → '+schD(b)} (${days>0?'+':''}${days}일)`; tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY+16)+'px'; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); document.body.style.userSelect=''; if(tip)tip.remove(); if(!moved)return; swallowClick(); bar.classList.remove('drag'); bar.style.left=left0+'px'; if(lock||!days)return;
    const len=D.diffDays(t.plannedFinish,t.plannedStart), ns=D.addDays(r.start,days);
    if(schEditTask(pid,t.id,`${schWbs(t.wbs)} 관리일정 ${days>0?'+':''}${days}일`,x=>{x.plannedStart=ns;x.plannedFinish=x.kind==='milestone'?ns:D.addDays(ns,len);})){const r2=schModel(pid).res.tasks[t.id];if(r2&&r2.start!==ns)toast(`${schWbs(t.wbs)} 관리일정을 옮겼지만 선행 업무 때문에 예상 시작은 ${schD(r2.start)}입니다.`,4600,{t:'되돌리기',fn:schUndo});} };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); });
// Preview marker in the top bar (and the way back to the page everybody else sees).
function schPreviewBadge(){ if(!schPreview()||$('#sch-pv'))return; const host=$('#tb-user'); if(!host)return; /* inside the user block: the top bar places its parts absolutely */ const b=document.createElement('button'); b.id='sch-pv'; b.className='sch-pv'; b.type='button'; b.textContent='미리보기'; b.title='일정 통합 화면 미리보기 중입니다';
  b.addEventListener('click',e=>{e.stopPropagation();menuPop(b,[{hd:'일정 통합 화면 미리보기'},{t:'기존 화면으로 돌아가기',k:'off',fn:()=>{try{localStorage.removeItem('aidc-preview');}catch(x){}location.href=location.pathname+'?v=1'+location.hash;}},{t:'미리보기 주소 복사',k:'cp',fn:()=>{const u=location.origin+location.pathname+'?v=2'+location.hash;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('미리보기 주소를 복사했습니다.'),()=>toast(u,6000));}}],{right:true});});
  host.insertBefore(b,host.firstChild); }
schPreviewBadge();

// The row under the pointer is marked across the outline and the time line.
document.addEventListener('mouseover',e=>{ const g=e.target.closest&&e.target.closest('#sch-gantt .sg-body'); const band=$('#sch-gantt .sg-band'); if(!band)return; const el=g&&e.target.closest('[data-row]'), id=el?el.dataset.row:'';
  if(band._id===id)return; band._id=id; $$('#sch-gantt .hover').forEach(x=>x.classList.remove('hover')); const host=$('#sch-gantt .sg-scroll'), r=id&&host._rows?host._rows.get(id):null;
  if(!r){band.hidden=true;return;} band.hidden=false; band.style.top=(r.y+2.1)+'px'; $$(`#sch-gantt [data-row="${id}"]`).forEach(x=>x.classList.add('hover')); });

// the day window of the calendar: it opens a moment after the pointer comes to rest on a pale count and stays while the pointer is on it
document.addEventListener('mouseover',e=>{ const b=e.target.closest&&e.target.closest('.cal.pv .cell:not(.today):not(.out) .acnt'); if(!b)return; clearTimeout(schPopHideT); clearTimeout(schPopT); if(schPop&&schPop._a===b)return; schPopT=setTimeout(()=>schDayPopShow(b),schPop?60:160); });
document.addEventListener('mouseout',e=>{ const b=e.target.closest&&e.target.closest('.cal.pv .cell .acnt'); if(!b||b.contains(e.relatedTarget))return; clearTimeout(schPopT); if(schPop&&!(e.relatedTarget&&schPop.contains(e.relatedTarget)))schDayPopHide(); });
document.addEventListener('mousedown',e=>{ if(schPop&&!schPop.contains(e.target))schDayPopHide(true); },true);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&schPop)schDayPopHide(true); });
document.addEventListener('scroll',e=>{ if(schPop&&!(e.target instanceof Node&&schPop.contains(e.target)))schDayPopHide(true); },true);
window.addEventListener('resize',()=>{ if(schPop)schDayPopHide(true); if(schPreview())setTimeout(schFitRight,60); });

// relation map: Ctrl (or ⌘) + wheel makes it larger and smaller; the cards a card is related to show on their lines while the pointer is on it
document.addEventListener('wheel',e=>{ if(!(e.ctrlKey||e.metaKey))return; const host=e.target.closest&&e.target.closest('#sch-net'); if(!host)return; e.preventDefault(); SCHU.netFit=false; schNetZoom(e.deltaY<0?1:-1); },{passive:false});
document.addEventListener('mouseover',e=>{ const net=$('#sch-net'); if(!net)return; const card=e.target.closest&&e.target.closest('#sch-net .sn-node'), id=card?card.dataset.k:''; if(net._hov===id)return; net._hov=id;
  net.querySelectorAll('.sn-links g').forEach(g=>g.classList.toggle('hov',!!id&&(g.dataset.a===id||g.dataset.b===id))); });

// Relation map: pulling a card onto another card proposes "when the first is finished the second starts" (the kind can be changed in the window that follows).
document.addEventListener('mousedown',e=>{ if(e.button!==0)return; const card=e.target.closest&&e.target.closest('#sch-net .sn-node'); if(!card||!schReady(S.proj))return; const pid=S.proj, m=schModel(pid), from=card.dataset.k, svgEl=$('#sch-net .sn-links'); if(!m||!m.byId.has(from)||!svgEl)return;
  const x0=e.clientX, y0=e.clientY; let on=false, line=null, tip=null, target=null;
  const pt=(x,y)=>{const M=svgEl.getScreenCTM();return M?[(x-M.e)/M.a,(y-M.f)/M.d]:[0,0];};
  const move=ev=>{ if(!on){ if(Math.hypot(ev.clientX-x0,ev.clientY-y0)<7)return; on=true; document.body.style.userSelect='none'; card.classList.add('linking'); line=document.createElementNS('http://www.w3.org/2000/svg','path'); line.setAttribute('class','draft'); svgEl.appendChild(line); tip=document.createElement('div'); tip.className='sg-tip'; document.body.appendChild(tip); }
    const r=card.getBoundingClientRect(), a=pt(r.right,r.top+r.height*SN.port/SN.h), b=pt(ev.clientX,ev.clientY); line.setAttribute('d',`M${a[0]},${a[1]} L${b[0]},${b[1]}`);
    const el=document.elementFromPoint(ev.clientX,ev.clientY), hit=el&&el.closest&&el.closest('#sch-net .sn-node'); if(target&&target!==hit)target.classList.remove('target'); target=hit&&hit.dataset.k!==from?hit:null; if(target)target.classList.add('target');
    tip.style.left=(ev.clientX+14)+'px'; tip.style.top=(ev.clientY+16)+'px'; tip.textContent=target?`${schWbs(m.byId.get(from).wbs)} → ${schWbs(m.byId.get(target.dataset.k).wbs)} · 놓으면 연결 내용을 보여줍니다`:'연결할 업무 카드에 놓으세요'; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); if(!on)return; document.body.style.userSelect=''; card.classList.remove('linking'); if(line)line.remove(); if(tip)tip.remove(); swallowClick(); if(!target)return; target.classList.remove('target');
    schPropose(pid,{kind:'new',from,to:target.dataset.k,type:'FS'}); };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); });
