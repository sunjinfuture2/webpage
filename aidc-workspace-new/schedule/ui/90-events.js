// Clicks, typing and keys of the schedule views. Opening a task is the page's own data-open (the right panel).
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-sch]'); if(!el)return; const pid=S.proj; if(S.page!=='project'||!schHas(pid))return; const k=el.dataset.sch, v=el.dataset.k, m=schModel(pid);
  if(k==='reload'){schLoad(pid);schRefresh();return;}
  if(k==='newphase'&&m){e.stopPropagation();schNewPhase(pid,m,code=>{if(!SCHU.open.includes(code))SCHU.open.push(code);schRefresh();});return;}
  if(k==='phmenu'&&m){ e.stopPropagation(); const g=m.phases.find(x=>x.code===v); if(g)menuPop(el,schPhaseEditItems(pid,m,g,()=>schRefresh()).slice(1)); return; }   // the "⋮" of a phase row: rename, remove
  if(k==='tools'){e.stopPropagation();schToolsMenu(el,pid);return;}
  if(k==='xlsx'){e.stopPropagation();schXlsxSection(pid,v,el.dataset.part||'');return;}
  if(k==='addtask'&&m){e.stopPropagation();let nid='';if(schCommit(pid,d=>{const t=AIDCSchedule.newTask(d,v), g=m.phases.find(x=>x.code===v);t.plannedStart=t.referenceStart=schToday();t.plannedFinish=t.referenceFinish=AIDCSchedule.dates.addDays(schToday(),4);if(g&&!g.tasks.length)t.phaseLabel=g.label;if(t.order==null)t.order=Math.max(0,...d.tasks.map(x=>+x.order||0))+1;d.tasks.push(t);nid=t.id;},'업무를 추가했습니다')){if(!SCHU.open.includes(v))SCHU.open.push(v);schRefresh();openPanel(schItemId(nid));}return;}
  // a task in the gantt or the relation map: the first click selects it (green, its direct relations drawn stronger), the second opens it
  if(k==='pickrow'){ if(!m||!m.byId.has(v))return; if((schTaskIdOf(S.panel)||SCHU.sel)===v){SCHU.sel=v;openPanel(schItemId(v));return;}
    { const card=el.closest('#sch-net .sn-node'), host=card&&$('#sch-net .sn-scroll'); if(card&&host){ const r=card.getBoundingClientRect(), hr=host.getBoundingClientRect(), kz=LAYOUT.zoom||1; SCH.netPrev=schTaskIdOf(S.panel)||SCHU.sel||''; SCH.netAnchor={id:v,x:(r.left-hr.left)/kz,y:(r.top-hr.top)/kz}; } else SCH.netPrev=''; }
    SCHU.sel=v; schUiSave(); if($('#sch-gantt'))schGanttBuild(pid); if($('#sch-net'))schNetBuild(pid); return; }
  if(k==='tab'){if(SCHU.tab!==v){SCHU.tab=v;schRefresh();}return;}
  if(k==='col'&&m){e.stopPropagation();schColMenu(el,pid,m,v);return;}
  if(k==='chip'){ e.stopPropagation(); if(v==='procState'||v==='evState'){SCHU[v]='';SCHU.evPage=1;schLowerRefresh();return;} if(v==='phase')SCHU.phase=''; else if(v==='scope')SCHU.scope='all'; else if(v==='who')SCHU.who=''; else if(v.startsWith('cf:'))delete schCf()[v.slice(3)]; SCHU.page=1; schRefresh(); return; }
  if(k==='toggle'){SCHU[v]=v==='refm'?SCHU.refm===false:!SCHU[v];schRefresh();return;}
  if(k==='phase'){schFold(v);return;}   // opens / closes with a small movement (80-motion.js)
  if(k==='expand'){SCHU.open=v==='1'&&m?m.phases.map(g=>g.code):[];schRefresh();return;}
  if(k==='sort'){if(SCHU.sort===v)SCHU.dir=-SCHU.dir;else{SCHU.sort=v;SCHU.dir=1;}SCHU.page=1;schRefresh();return;}
  if(k==='page'){const key=v, cur=SCHU[key]||1, x=el.dataset.v;SCHU[key]=x==='prev'?cur-1:x==='next'?cur+1:x==='first'?1:x==='last'?(+el.dataset.t||cur):+x;if(key==='evPage'){schLowerRefresh();const lw=$('#sch-lower');if(lw)lw.scrollIntoView({block:'start'});return;}schRefresh();const top=$('#sch-actions');if(top&&key==='page')top.scrollIntoView({block:'start'});return;}
  if(k==='sec'){if(SCHU.sec!==v){SCHU.sec=v;SCHU.evPage=1;schLowerRefresh();}return;}
  if(k==='lowadd'){e.stopPropagation();schLowerAdd(el,pid);return;}
  if(k==='netmode'){SCHU.netMode=v;schRefresh();return;}
  if(k==='netfit'){ if(SCHU.netFit){SCHU.netFit=false;SCHU.netZoom=1;schNetBuild(pid);schUiSave();}else{schNetZoom(0);SCHU.netFit=true;schUiSave();} return; }
  if(k==='scn-off'){SCHU.scn='';SCH.memo[pid]=null;schRedraw(true);return;}
  if(k==='ops'){SCHU.tab='gantt';const t=m&&m.byWbs.get('W8.6');if(t){SCHU.sel=t.id;if(!SCHU.open.includes(t.phase))SCHU.open.push(t.phase);}schRefresh();const top=$('#sch-actions');if(top)top.scrollIntoView({block:'start',behavior:'smooth'});return;}
  if(k==='pick'&&m&&['procState','evKind','evState'].includes(v)){ const setL=(key,val)=>()=>{SCHU[key]=val;SCHU.evPage=1;if(key==='evKind')SCHU.evState='';schLowerRefresh();}; let items;
    if(v==='procState')items=[{t:'전체 상태',sel:!SCHU.procState,fn:setL('procState','')}].concat(SCH_COMMIT.map(x=>({t:x,sel:SCHU.procState===x,fn:setL('procState',x)})));
    else if(v==='evKind')items=SCH_EV.map(([key,t])=>({t:`${t} (${schEvRows(pid,key).length})`,sel:SCHU.evKind===key,fn:setL('evKind',key)}));
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
    e.stopPropagation(); menuPop(el,items.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)})); return; }
});
let schQT=0;
document.addEventListener('input',e=>{ const t=e.target; if(!(t.matches&&t.matches('input[data-schq]')))return; const key=t.dataset.schq; SCHU[key]=t.value; SCHU.page=1; SCHU.upage=1; SCHU.evPage=1; clearTimeout(schQT); schQT=setTimeout(key==='lq'?schLowerRefresh:schRefresh,140); });
// Ctrl+Z / Ctrl+Shift+Z undo and redo schedule changes while nothing is being typed.
document.addEventListener('keydown',e=>{ if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||S.page!=='project'||!schHas(S.proj)||S.full)return; const a=document.activeElement; if(a&&a.matches&&a.matches('input,textarea,select,[contenteditable="true"]'))return; if(!SCH.undo.length&&!SCH.redo.length)return; e.preventDefault(); if(e.shiftKey)schRedo();else schUndo(); });
window.addEventListener('resize',()=>{ clearTimeout(schQT); schQT=setTimeout(()=>{const g=$('#sch-gantt .sg-scroll');if(g&&SCHU.scale==='fit'){g._key='';schGanttBuild(S.proj);}},200); });

// Dragging a bar of the gantt moves the task's managed dates by whole days (not for a task that has started or whose length is a rule).
// What is drawn is the forecast, so the new managed start is "forecast start + the days dragged"; if a predecessor still holds the task, the toast says so.
// A line of the gantt can be clicked: the menu of that relation opens where the pointer is.
document.addEventListener('click',e=>{ const g=e.target.closest&&e.target.closest('#sch-gantt g[data-link],#sch-net g[data-link]'); if(!g||!schReady(S.proj))return; e.stopPropagation(); const a=document.createElement('i'); a.style.cssText=`position:fixed;left:${e.clientX}px;top:${e.clientY-6}px;width:1px;height:1px`; document.body.appendChild(a); schRelMenu(a,S.proj,g.dataset.link); a.remove(); },true);
// (Moving a bar, pulling its ends and pulling a relation: schBarDrag / schLinkDrag in 68-feedback.js.)
// Preview marker in the top bar (and the way back to the page everybody else sees).
function schPreviewBadge(){ if(!schPreview()||$('#sch-pv'))return; const host=$('#tb-user'); if(!host)return; /* inside the user block: the top bar places its parts absolutely */ const b=document.createElement('button'); b.id='sch-pv'; b.className='sch-pv'; b.type='button'; b.textContent='미리보기'; b.title='일정 통합 화면 미리보기 중입니다';
  b.addEventListener('click',e=>{e.stopPropagation();menuPop(b,[{hd:'일정 통합 화면 미리보기'},{t:'기존 화면으로 돌아가기',k:'off',fn:()=>{try{localStorage.removeItem('aidc-preview');}catch(x){}location.href=location.pathname+'?v=1'+location.hash;}},{t:'미리보기 주소 복사',k:'cp',fn:()=>{const u=location.origin+location.pathname+'?v=2'+location.hash;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('미리보기 주소를 복사했습니다.'),()=>toast(u,6000));}}],{right:true});});
  host.insertBefore(b,host.firstChild); }
schPreviewBadge();
// Dark mode at hand: a moon / sun in the top bar, beside the 미리보기 badge and the member's profile (owner, 2026-11-23), switches
// between light and dark (the same setting as 마이페이지 › 설정 › 기본 설정 › 테마).
function schThemeBtn(){ if(!schPreview()||$('#th-btn'))return; const host=$('#tb-user'); if(!host)return; const b=document.createElement('button'); b.id='th-btn'; b.className='th-btn'; b.type='button';
  b.innerHTML='<svg class="moon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M13.3 9.7A5.7 5.7 0 0 1 6.3 2.7a5.7 5.7 0 1 0 7 7z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg><svg class="sun" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.4v1.8M8 12.8v1.8M1.4 8h1.8M12.8 8h1.8M3.3 3.3l1.3 1.3M11.4 11.4l1.3 1.3M3.3 12.7l1.3-1.3M11.4 4.6l1.3-1.3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  b.addEventListener('click',ev=>{ ev.stopPropagation(); const dark=document.documentElement.classList.contains('dark'); themeSet(dark?'light':'dark'); if(typeof mpRender==='function'&&typeof MP!=='undefined'&&MP.open)mpRender(); });
  const badge=$('#sch-pv'); if(badge&&badge.parentElement===host)host.insertBefore(b,badge.nextSibling); else host.insertBefore(b,host.firstChild);   // right after the badge, before the avatar
  themeApply(); }
schThemeBtn();

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

// relation map (the wheel, pulling the ground and pulling a relation are in 68-feedback.js): the cards a card is related to show on their lines while the pointer is on it
document.addEventListener('mouseover',e=>{ const net=$('#sch-net'); if(!net)return; const card=e.target.closest&&e.target.closest('#sch-net .sn-node'), id=card?card.dataset.k:''; if(net._hov===id)return; net._hov=id;
  net.querySelectorAll('.sn-links g').forEach(g=>g.classList.toggle('hov',!!id&&(g.dataset.a===id||g.dataset.b===id))); });

// the edge between the outline and the chart can be pulled to make the table narrower or wider (double click: the design's width)
document.addEventListener('mousedown',e=>{ if(e.button!==0)return; const sp=e.target.closest&&e.target.closest('#sch-gantt .sg-split'); if(!sp)return; e.preventDefault(); e.stopPropagation(); const z=LAYOUT.zoom||1, x0=e.clientX, w0=SG.left; let raf=0, moved=false; document.body.style.userSelect='none'; document.body.style.cursor='col-resize';
  const move=ev=>{ const dx=(ev.clientX-x0)/z; if(!moved&&Math.abs(dx)<2)return; moved=true; SCHU.gl=Math.round(w0+dx); if(!raf)raf=requestAnimationFrame(()=>{raf=0;schGanttBuild(S.proj);}); };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); document.body.style.userSelect=''; document.body.style.cursor=''; if(moved){swallowClick();SCHU.gl=SG.left;schUiSave();} };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up); },true);
document.addEventListener('dblclick',e=>{ if(e.target.closest&&e.target.closest('#sch-gantt .sg-split')){delete SCHU.gl;schGanttBuild(S.proj);schUiSave();} });
