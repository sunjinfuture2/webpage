// The 액션 section of a project that has a schedule: 일정 (gantt) · 리스트 · 관계도, one set of filters for the three.

(function(){ // icons the schedule views add to the page's sprite
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden'); s.setAttribute('aria-hidden','true');
  s.innerHTML='<symbol id="i-sch-arr" viewBox="0 0 11 8"><path d="M0.5 4h9.3M6.7 0.9L9.9 4 6.7 7.1" fill="none" stroke="currentColor" stroke-width="1.1"/></symbol>'
   // status marks, traced from the owner's sheet (numbers are that sheet's pixels; 91 of them are one em of the word beside the mark)
   +'<symbol id="i-st-plan" viewBox="0 0 83 83"><path d="M41.5 .5v20M41.5 62.5v20M.5 41.5h20M62.5 41.5h20M12.5 12.5l14.15 14.15M12.5 70.5l14.15-14.15M70.5 70.5L56.35 56.35" fill="none" stroke="currentColor" stroke-width="10"/></symbol>'
   +'<symbol id="i-st-ask" viewBox="0 0 13.5 72"><path d="M0 0h13.5v47.7H0zM0 59.3h13.5V72H0z" fill="currentColor"/></symbol>'
   +'<symbol id="i-st-prog" viewBox="0 0 77 77"><path d="M64.19 19.84A31.75 31.75 0 1 1 38.5 6.75" fill="none" stroke="currentColor" stroke-width="13.5"/></symbol>'
   +'<symbol id="i-st-done" viewBox="0 0 73 62.5"><path d="M5 30.5L27 53 67.5 5" fill="none" stroke="currentColor" stroke-width="13" stroke-linejoin="miter"/></symbol>'
   +'<symbol id="i-st-hold" viewBox="0 0 40.5 57"><path d="M0 0h13v57H0zM27.5 0h13v57h-13z" fill="currentColor"/></symbol>'
   +'<symbol id="i-st-cond" viewBox="0 0 81 70"><path fill-rule="evenodd" d="M0 70L40.5 0 81 70zM22.7 58h36.3L40.7 26.7z" fill="currentColor"/></symbol>'
   +'<symbol id="i-sch-fit" viewBox="0 0 22 22"><path d="M1 7V1h6M15 1h6v6M21 15v6h-6M7 21H1v-6" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>'
   +'<symbol id="i-sch-ext" viewBox="0 0 9 9"><path d="M1 8L8 1M2.6 1H8v5.4" fill="none" stroke="currentColor" stroke-width="1.1"/></symbol>'
   +'<symbol id="i-sch-tag" viewBox="184.8 114.6 13.7 13.7"><path transform="matrix(1,0,0,-1,189.0314,119.889987)" d="M0 0C-.637 0-1.154 .516-1.154 1.154-1.154 1.791-.637 2.308 0 2.308 .637 2.308 1.154 1.791 1.154 1.154 1.154 .516 .637 0 0 0M8.424-.853 3.802 3.769C3.167 4.404 2.307 4.76 1.41 4.76H-1.948C-2.918 4.76-3.706 3.973-3.706 3.003V-.25C-3.706-1.148-3.349-2.008-2.715-2.642L1.958-7.315C2.47-7.827 3.299-7.827 3.811-7.315L8.424-2.702C8.935-2.191 8.935-1.364 8.424-.853" fill="currentColor"/></symbol>'
   +'<symbol id="i-sch-tri" viewBox="0 0 10 8.75"><path d="M0.4 0.3h9.2L5 8.5z" fill="currentColor"/></symbol>'
   +'<symbol id="i-sch-cal" viewBox="0 0 14 14"><path fill-rule="evenodd" d="M3.4 0h1.5v1.5h4.2V0h1.5v1.5h1.2A2.2 2.2 0 0 1 14 3.7v8.1a2.2 2.2 0 0 1-2.2 2.2H2.2A2.2 2.2 0 0 1 0 11.8V3.7a2.2 2.2 0 0 1 2.2-2.2h1.2zM1.5 5.6v6.2c0 .39.31.7.7.7h9.6a.7.7 0 0 0 .7-.7V5.6zM3.3 7.2h2v1.9h-2zm2.7 0h2v1.9H6zm2.7 0h2v1.9h-2zM3.3 9.8h2v1.9h-2zm2.7 0h2v1.9H6z" fill="currentColor"/></symbol>'
   +'<symbol id="i-sch-ck" viewBox="0 0 10 8"><path d="M1.2 4.1L3.8 6.6 8.8 1.4" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>';
  // the page's pictograms for 미팅 and 리서치 have a fixed colour; copies that take the text colour stand in front of the section titles
  for(const [src,dst] of [['pic-meeting','i-sch-meeting'],['pic-research','i-sch-research']]){ const o=document.getElementById(src); if(!o)continue; const c=o.cloneNode(true); c.id=dst; c.querySelectorAll('[fill]').forEach(n=>{if(n.getAttribute('fill')!=='none')n.setAttribute('fill','currentColor');}); c.querySelectorAll('[stroke]').forEach(n=>{if(n.getAttribute('stroke')!=='none')n.setAttribute('stroke','currentColor');}); s.appendChild(c); }
  document.body.appendChild(s); })();
// An address in a list: an arrow that opens it (the address itself is read in the panel), not the text of the address.
const schUrlCell=u=>{const h=urlHref(u);return h?`<a class="sch-ua" href="${esc(h)}" target="_blank" rel="noopener" data-stop title="${esc(u)} · 새 탭에서 열기" aria-label="주소 열기">${svg('i-sch-ext',10,10)}</a>`:'<span style="color:#c4c4c4">-</span>';};
const schTitleIcon=k=>`<span class="sch-ic">${svg(k==='action'?'i-sch-tag':'i-sch-'+k,k==='research'?27:32.5,31)}</span>`;

const SCH_SCOPES=[['all','모든 업무'],['mine','내 업무'],['open','미완료'],['prog','진행 중'],['late','지연'],['soon','30일 안에 마감'],['ms','마일스톤'],['crit','운영개시 경로']];
const SCH_SCALES=[['fit','전체 기간'],['day','Day'],['week','Week'],['month','Month']];
const schScopeName=()=>(SCH_SCOPES.find(x=>x[0]===SCHU.scope)||SCH_SCOPES[0])[1];
function schScopeTest(m,t){ const r=m.res.tasks[t.id], k=SCHU.scope, P=AIDCSchedule.progress;
  if(k==='mine')return schMine(t); if(k==='open')return !P.isDone(t); if(k==='prog')return !P.isDone(t)&&(P.isStarted(t)||schOnDay(m,t,schToday()));
  if(k==='late')return schLate(m,t); if(k==='soon'){const d=schDday(r.finish,P.isDone(t));return !!d&&d.n<=30;} if(k==='ms')return t.kind==='milestone'; if(k==='crit')return r.criticality==='critical'||r.criticality==='near'; return true; }
function schWhoTest(t){ const w=SCHU.who; if(!w)return true; if(w==='none'||w.startsWith('r:'))return !schPeople(t).length; return schPeople(t).includes(w); }
// What the titles of the list's columns filter by (owner, 2026-11-19): kept in SCHU.cf, used by the list only.
const schCf=()=>SCHU.cf||(SCHU.cf={});
const schCfOn=()=>Object.keys(schCf()).length>0;
function schSpanTest(c,a,b,done){ const today=schToday(), D=AIDCSchedule.dates;
  if(c.plan){ const mo=today.slice(0,7); if(c.plan==='now'&&!(a<=today&&b>=today))return false; if(c.plan==='month'&&!(a.slice(0,7)<=mo&&b.slice(0,7)>=mo))return false; if(c.plan==='past'&&!(b<today))return false; if(c.plan==='next'&&!(a>today))return false; }
  return true; }
function schDueTest(c,finish,done){ if(!c.due)return true; if(done||!finish)return false; const n=AIDCSchedule.dates.diffDays(finish,schToday()); return c.due==='late'?n<0:c.due==='7'?(n>=0&&n<=7):(n>=0&&n<=30); }
function schColTest(m,t){ const c=schCf(); if(!schCfOn())return true; const r=m.res.tasks[t.id], done=AIDCSchedule.progress.isDone(t);
  if(c.kind&&(c.kind==='ms')!==(t.kind==='milestone'))return false; if(c.pri&&schPri(m,t)!==c.pri)return false; if(c.st&&schStatus(t)!==c.st)return false; if(c.url&&(c.url==='y')!==!!urlHref(t.url))return false;
  return schSpanTest(c,t.plannedStart,t.plannedFinish)&&schDueTest(c,r.finish,done); }
// an ordinary action that is not linked to the schedule, against the same filters
function schItemTest(i,q){ const c=schCf(), done=i.st==='done', a=i.date||'', b=itemEnd(i)||a, today=schToday(), k=SCHU.scope, ppl=i.people||[];
  if(q&&!matchQ(q,i.title,...ppl.map(userName)))return false;
  if(k==='mine'&&!ppl.includes(sharedUser))return false; if(k==='open'&&done)return false; if(k==='prog'&&(done||!(a<=today&&b>=today)))return false; if(k==='late'&&(done||!(b<today)))return false;
  if(k==='soon'&&(done||!b||AIDCSchedule.dates.diffDays(b,today)>30))return false; if(k==='ms'||k==='crit')return false;
  const w=SCHU.who; if(w&&(w==='none'?ppl.length>0:!ppl.includes(w)))return false;
  if(c.kind&&(c.kind==='ms')!==!!i.ms)return false; if(c.pri&&(i.pri||'mid')!==c.pri)return false; if(c.st&&schItemSt(i)!==c.st)return false; if(c.url&&(c.url==='y')!==!!urlHref(i.url))return false;
  return schSpanTest(c,a,b)&&schDueTest(c,b,done); }
// The tasks the three views show, in WBS order (cols: also what the list's column titles filter by).
function schFiltered(m,cols){ const q=(SCHU.q||'').trim();
  return m.phases.flatMap(g=>g.tasks).filter(t=>(!SCHU.phase||t.phase===SCHU.phase)&&schScopeTest(m,t)&&schWhoTest(t)&&(!cols||schColTest(m,t))&&(!q||matchQ(q,t.name,schWk(t),schNo(t),t.status,...schPeople(t).map(userName)))); }
const schFiltering=()=>!!(SCHU.q||'').trim()||SCHU.scope!=='all'||!!SCHU.who||(SCHU.tab==='list'&&schCfOn());

// What is filtered shows beside the title, each with an x that takes it off (owner, 2026-11-19: as the partner list does).
const SCH_CF_NAMES={kind:['종류',{task:'일반 업무',ms:'마일스톤'}],plan:['기간',{now:'오늘 진행 중',month:'이번 달',next:'앞으로 시작',past:'지난 일정'}],pri:['중요도',{high:'높음',mid:'중간',low:'낮음'}],st:['상태',null],due:['기한',{late:'지연','7':'7일 안에 마감','30':'30일 안에 마감'}],url:['URL',{y:'주소 있음',n:'주소 없음'}]};
function schChips(pid){ const m=schReady(pid)?schModel(pid):null, out=[], chip=(k,label)=>out.push(`<button class="sch-chip" data-sch="chip" data-k="${k}" title="이 조건 지우기">${esc(label)}<i>✕</i></button>`);
  if(SCHU.phase){const g=m&&m.phases.find(x=>x.code===SCHU.phase);chip('phase','단계: '+(SCHU.phase==='none'?'일정 미연결':g?schPhaseLabel(g):SCHU.phase));}
  if(SCHU.scope&&SCHU.scope!=='all')chip('scope','범위: '+schScopeName());
  if(SCHU.who)chip('who','담당자: '+(SCHU.who==='none'||SCHU.who.startsWith('r:')?'미지정':userName(SCHU.who)));
  if(SCHU.tab==='list')for(const [k,v] of Object.entries(schCf())){const d=SCH_CF_NAMES[k];if(d)chip('cf:'+k,d[0]+': '+(d[1]?d[1][v]||v:v));}
  return out.join(''); }
function schActionSection(pid){ const tabs=[['gantt','일정'],['list','리스트'],['net','관계도']];
  return `<div class="sec sch-sec" id="sch-actions" style="margin-top:112px">
    <div class="sec-title sch-title" style="margin-left:-2.8px"><span class="sch-ic">${svg('i-sch-tag',32.5,31)}</span>액션<span class="sch-tabs">${tabs.map(([k,t],i)=>`${i?'<i>·</i>':''}<button class="${SCHU.tab===k?'on':''}" data-sch="tab" data-k="${k}">${t}</button>`).join('')}</span>
      ${plusBtn('new-action','새 액션')}<button class="sh-btn lib" data-lib="action">라이브러리</button>
      <label class="srch box">${svg('pic-search',15,15)}<input data-schq="q" placeholder="검색" value="${esc(SCHU.q||'')}">${qx(SCHU.q)}</label></div>
    <div class="sch-chipwrap"><div class="sch-chiprow" data-chips="act">${schChips(pid)}</div></div><div data-sec="sch-act">${schActionBody(pid)}</div></div>`; }
function schActionBody(pid){ const m=schModel(pid);
  if(!m)return `<div class="sch-empty">${SCH.failed[pid]?esc(SCH.failed[pid])+' <button class="sh-btn" data-sch="reload" style="margin-left:12px;height:26px;padding:0 10px;font-size:12px">다시 시도</button>':'일정을 불러오는 중입니다…'}</div>`;
  const sf=(k,label,set,cls='')=>`<div class="sf ${cls} ${set?'set':''}" data-sch="pick" data-k="${k}"><span>${esc(label)}</span>${svg('i-chev-d',9,4.6)}</div>`;
  const ck=(k,label)=>`<span class="ck ${(k==='refm'?SCHU.refm!==false:SCHU[k])?'on':''}" data-sch="toggle" data-k="${k}"><i>${svg('i-sch-ck',8,6.4)}</i>${label}</span>`;
  if(SCHU.phase==='none'&&SCHU.tab!=='list')SCHU.phase='';   // actions outside the schedule have no bar and no relations: they are a choice of the list only
  const g=SCHU.phase&&m.phases.find(x=>x.code===SCHU.phase), none=SCHU.phase==='none'; let f=SCHU.tab==='list'?'':sf('phase',none?'일정 미연결':g?schPhaseLabel(g):'전체 단계',!!g||none)+sf('scope',schScopeName(),SCHU.scope!=='all');
  if(SCHU.tab==='gantt')f+=sf('scale',(SCH_SCALES.find(x=>x[0]===SCHU.scale)||SCH_SCALES[0])[1],false,'narrow')+`<div class="cks">${ck('refm','참조계획')}${ck('links','연결선')}${ck('today','오늘')}</div>`;
  else if(SCHU.tab==='list')f+=sf('per',SCHU.per+'개씩 보기',false,'per');   // nothing else stands in this row: the picker is at its left, in the pickers' look
  else f=`<div class="seg"><button class="${SCHU.netMode==='all'?'on':''}" data-sch="netmode" data-k="all">${g?esc(schPhaseLabel(g)):'전체 단계'}</button><button class="${SCHU.netMode==='focus'?'on':''}" data-sch="netmode" data-k="focus">선택 업무 중심</button></div>`
    +(SCHU.netMode==='focus'?sf('netDepth',SCHU.netDepth+'단계 연결',false)+sf('netDir',({both:'선행+후행',before:'선행만',after:'후행만'})[SCHU.netDir],false):sf('phase',g?schPhaseLabel(g):'전체 단계',!!g));
  const note=m.err?`<div class="sch-note">일정 관계가 서로 맞지 않아 최근에 추가한 관계 일부를 빼고 계산했습니다: ${esc(m.err)}</div>`:(schScenario(pid)?`<div class="sch-note">시나리오 “${esc((SCHED[pid]['sc:'+schScenario(pid)]||{}).name||'')}”를 보고 있습니다. 여기서 고친 내용은 기본 계획에 반영되지 않습니다. <button class="sh-btn" data-sch="scn-off" style="margin-left:8px;height:22px;padding:0 9px;font-size:12px">기본 계획으로</button></div>`:'');
  return `<div class="sch-filters ${SCHU.tab==='net'?'net':''}">${f}<div class="right">${schInfo('all')}${schUpBtn('act')}</div></div>${note}${SCHU.tab==='gantt'?'<div class="sch-gantt" id="sch-gantt"><div class="sg-scroll"></div></div>':SCHU.tab==='list'?schListHtml(pid,m):schNetShell(pid,m)}`; }

// The page's pager look, but with its own attribute (the page's own handler would take data-pg for one of its lists).
// Pages: the first and the last one ("<<", ">>"), one back and one on, and the numbers ten at a time (1-10, 11-20, ...).
const schPgDbl=back=>`<span class="dbl"${back?' style="transform:rotate(180deg)"':''}>${svg('i-pg-arr',3.7,6.5)}${svg('i-pg-arr',3.7,6.5)}</span>`;
function schPager(cur,total,key,top){ const at=`data-sch="page" data-k="${key}" data-t="${total}"`, from=Math.floor((cur-1)/10)*10+1, to=Math.min(total,from+9);
  let h=`<div class="pager" style="margin-top:${top}px"><button class="arr ends" ${at} data-v="first" title="처음" aria-label="처음 쪽" ${cur<=1?'disabled':''}>${schPgDbl(true)}</button><button class="arr" ${at} data-v="prev" title="이전" aria-label="이전 쪽" ${cur<=1?'disabled':''}>${svg('i-pg-arr',3.7,6.5,'transform:rotate(180deg)')}</button>`;
  for(let i=from;i<=to;i++)h+=`<button ${at} data-v="${i}" class="${i===cur?'cur':''}">${i}</button>`;
  return h+`<button class="arr" ${at} data-v="next" title="다음" aria-label="다음 쪽" ${cur>=total?'disabled':''}>${svg('i-pg-arr',3.7,6.5)}</button><button class="arr ends" ${at} data-v="last" title="마지막" aria-label="마지막 쪽" ${cur>=total?'disabled':''}>${schPgDbl(false)}</button></div>`;}
// Why something is late, for the pointer resting on "n일 지연": what a member wrote as the reason first (the task's or the action's
// `why`), then what the schedule itself says (not started, not closed, which earlier tasks are still open).
function schLateWhy(m,t){ const P=AIDCSchedule.progress, r=m.res.tasks[t.id], today=schToday(); if(!r||P.isDone(t)||!(r.finish<today))return '';
  const out=[], ms=t.kind==='milestone'; if(t.why)out.push(t.why);
  if(t.actualStart)out.push(`${schD(t.actualStart)} 착수 · 완료 예정일 ${schD(r.finish)} 경과 (실제 완료일 미입력)`);
  else out.push(ms?`예정일 ${schD(r.finish)} 경과 (완료 처리 전)`:`시작 예정일 ${schD(r.start)} 경과 · 아직 착수 전 (실제 시작일 미입력)`);
  const pre=m.pred.get(t.id).filter(e=>e.active!==false).map(e=>m.byId.get(e.from)).filter(x=>x&&!P.isDone(x));
  if(pre.length)out.push(`끝나지 않은 선행 업무: ${pre.slice(0,3).map(schTaskTitle).join(', ')}${pre.length>3?` 외 ${pre.length-3}건`:''}`);
  if(t.status==='보류'||t.status==='확인 전')out.push('상태: '+t.status);
  return out.join('\n'); }
function schLateWhyItem(i){ const end=itemEnd(i), today=schToday(); if(!i||i.st==='done'||!end||!(end<today))return ''; const out=[]; if(i.why)out.push(i.why);
  out.push(i.actualStart?`${schD(i.actualStart)} 착수 · 기한 ${schD(end)} 경과 (완료 처리 전)`:`기한 ${schD(end)} 경과 · 실제 시작일 미입력`); const s=schItemSt(i); if(s==='보류'||s==='확인 전')out.push('상태: '+s); return out.join('\n'); }
/* ---------- list ---------- */
const SCH_SORT={wbs:(m,t)=>t.order,name:(m,t)=>t.name,plan:(m,t)=>t.plannedStart+t.plannedFinish,fin:(m,t)=>t.kind==='milestone'?'9':t.plannedFinish||'9',pri:(m,t)=>({high:0,mid:1,low:2})[schPri(m,t)],st:(m,t)=>SCH_STATUSES.indexOf(schStatus(t)),
  who:(m,t)=>schPeople(t).map(userName).join(',')||'~',due:(m,t)=>m.res.tasks[t.id].finish};
const SCH_SORT_I={wbs:i=>i._ord||1e9,name:i=>i.title||'',plan:i=>(i.date||'')+(itemEnd(i)||''),fin:i=>i.end&&i.end>i.date&&!i.ms?i.end:'9',pri:i=>({high:0,mid:1,low:2})[i.pri||'mid'],st:i=>SCH_STATUSES.indexOf(schItemSt(i)),who:i=>(i.people||[]).map(userName).join(',')||'~',due:i=>itemEnd(i)||''};
const schLoose=(pid,m)=>schUnlinked(pid).filter(i=>!(i.phase&&m.phases.some(g=>g.code===i.phase)));   // actions that belong to no phase and no task
// One table: the tasks of the schedule (their linked actions under them) and, after them, the actions that are not linked to it.
// The latter are also a choice of their own in the phase picker ("일정 미연결", below the last phase).
function schListHtml(pid,m){ const P=AIDCSchedule.progress, q=(SCHU.q||'').trim(), c=schCf(), none=SCHU.phase==='none'; let rows=none?[]:schFiltered(m,true).map(t=>({t}));
  // an action that belongs to a phase but to no task stands after that phase's tasks; one that belongs to nothing stands at the end ("일정 미연결")
  { const end=new Map(m.phases.map(g=>[g.code,g.tasks.length?Math.max(...g.tasks.map(t=>t.order))+.9:1e8+(Number(schPhaseNo(g.code))||0)]));
    rows=rows.concat(schUnlinked(pid).filter(i=>{const ph=i.phase&&end.has(i.phase)?i.phase:'';i._ord=ph?end.get(ph):1e9;return (none?!ph:!SCHU.phase||ph===SCHU.phase)&&schItemTest(i,q);}).sort(newestFirst).map(i=>({i}))); }
  const fT=SCH_SORT[SCHU.sort]||SCH_SORT.wbs, fI=SCH_SORT_I[SCHU.sort]||SCH_SORT_I.wbs;
  rows=rows.map((r,n)=>({...r,n,key:r.t?fT(m,r.t):fI(r.i)})).sort((a,b)=>(a.key<b.key?-1:a.key>b.key?1:0)*SCHU.dir||a.n-b.n);
  const total=Math.max(1,Math.ceil(rows.length/SCHU.per)); SCHU.page=Math.min(Math.max(1,SCHU.page),total); const page=rows.slice((SCHU.page-1)*SCHU.per,SCHU.page*SCHU.per);
  const on={wbs:!!SCHU.phase,name:!!c.kind,plan:!!c.plan,pri:!!c.pri,st:!!c.st,who:!!SCHU.who,due:!!c.due,url:!!c.url};
  const th=(k,t)=>`<span data-sch="col" data-k="${k}" class="${SCHU.sort===k?'sorted':''} ${SCHU.sort===k&&SCHU.dir<0?'up':''} ${on[k]?'flt':''}" title="눌러서 정렬 · 조건 선택">${t}${svg('i-chev-d',8,4)}</span>`;
  const head=`<div class="hd">${th('wbs','WBS')}${th('name','업무명')}${th('plan','시작일')}${th('fin','완료일')}${th('pri','중요도')}${th('st','상태')}${th('who','담당자')}${th('due','기한')}${th('url','URL')}</div>`;
  const urlCell=schUrlCell;
  let h=`<div class="tbl sch-list">${head}`;
  // (thirty-fourth round, owner: "1) 사업정의·RFP 16 이런 식으로 쓰여 있는 거 다 빼") no line names a phase above its rows any more: the WBS
  // number says which phase a row is of, and the menu of the column WBS narrows the list to one.
  for(const row of page){
    if(row.i){h+=schItemRow(row.i,'',row.i._ord<1e9?schPhaseNo(row.i.phase):'-');continue;} const t=row.t, r=m.res.tasks[t.id], done=P.isDone(t), linked=schLinked(pid,t.id), id=schItemId(t.id), it=ITEMS.find(x=>x.id===id), nc=it?(it.comments||[]).length:0;
    h+=`<div class="rw ${S.panel===id?'sel':''}" data-open="${id}"><div class="w">${schNo(t)}</div><div class="nm">${schDotsHtml(schNotices(pid),id)}<span class="gut">${t.kind==='milestone'?'<i class="sch-ms" style="margin:0"></i>':''}</span><span class="tx">${esc(t.name)}</span>${nc?`<span class="cnt">댓글 ${nc}</span>`:''}</div>
      <div class="rg">${schD(t.plannedStart)}</div><div class="rg">${t.kind==='milestone'||!t.plannedFinish?'<span class="nil">-</span>':schD(t.plannedFinish)}</div><div>${schPriHtml(m,t)}</div><div>${schStIcon(schStatus(t))}</div><div class="who">${schWhoHtml(t)}</div><div class="dd">${done?'':schDdayHtml(r.finish,false,schLateWhy(m,t))}</div><div class="url">${urlCell(t.url)}</div></div>`;
    for(const x of linked)h+=schItemRow(x,'sub',`↳ ${schNo(t)}`); }
  if(!page.length)h+=`<div class="none">${schFiltering()||SCHU.phase?'조건에 맞는 액션이 없습니다.':'등록된 업무가 없습니다.'}</div>`;
  return h+`<div class="ft"></div></div>${schPager(SCHU.page,total,'page',32)}`; }
// The menu of a column title: how to order by that column and what to keep.
function schColMenu(el,pid,m,v){ const c=schCf(), go=()=>{SCHU.page=1;schRefresh();};
  const srt=(label,dir)=>({t:label,sel:SCHU.sort===v&&SCHU.dir===dir,fn:()=>{SCHU.sort=v;SCHU.dir=dir;go();}});
  const fl=(key,val,item)=>({...item,sel:(c[key]||'')===val,fn:()=>{if(val)c[key]=val;else delete c[key];go();}});
  const set=(key,val,item)=>({...item,sel:(SCHU[key]||'')===val,fn:()=>{SCHU[key]=val;go();}});
  let items=[];
  if(v==='wbs')items=[{hd:'정렬'},srt('번호 순',1),srt('번호 역순',-1),'-',{hd:'단계'},set('phase','',{t:'전체 단계'}),...m.phases.map(g=>set('phase',g.code,{t:`${schPhaseLabel(g)} (${g.tasks.length})`})),set('phase','none',{t:`일정 미연결 (${schLoose(pid,m).length})`})];
  else if(v==='name')items=[{hd:'정렬'},srt('가나다 순',1),srt('가나다 역순',-1),'-',{hd:'종류'},fl('kind','',{t:'전체'}),fl('kind','task',{t:'일반 업무'}),fl('kind','ms',{t:'마일스톤',ico:'<i class="sch-ms" style="margin:0 8px 1px 1px"></i>'})];
  else if(v==='plan')items=[{hd:'정렬'},srt('시작이 빠른 순',1),srt('시작이 늦은 순',-1),'-',{hd:'기간'},fl('plan','',{t:'전체 기간'}),fl('plan','now',{t:'오늘 진행 중'}),fl('plan','month',{t:'이번 달에 걸친 일정'}),fl('plan','next',{t:'앞으로 시작'}),fl('plan','past',{t:'지난 일정'})];
  else if(v==='fin')items=[{hd:'정렬'},srt('완료가 빠른 순',1),srt('완료가 늦은 순',-1)];
  else if(v==='pri')items=[{hd:'정렬'},srt('높은 순',1),srt('낮은 순',-1),'-',{hd:'중요도'},fl('pri','',{t:'전체'}),...['high','mid','low'].map(p=>fl('pri',p,{t:priTxt[p],html:`<span class="pri pri-${p}">${priTxt[p]}</span>`}))];
  else if(v==='st')items=[{hd:'정렬'},srt('상태 순',1),srt('상태 역순',-1),'-',{hd:'상태'},fl('st','',{t:'전체'}),...SCH_STATUSES.map(x=>fl('st',x,{t:x,html:schStIcon(x)}))];
  else if(v==='who'){ const ppl=[...new Set(m.plan.tasks.flatMap(schPeople).concat(schUnlinked(pid).flatMap(i=>i.people||[])))].sort((x,y)=>userName(x).localeCompare(userName(y)));
    items=[{hd:'정렬'},srt('이름 순',1),srt('이름 역순',-1),'-',{hd:'담당자'},set('who','',{t:'전체 담당자'}),...ppl.map(u=>set('who',u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')})),set('who','none',{t:'미지정',html:'<span class="sch-role none">미지정</span>'})]; }
  else if(v==='due')items=[{hd:'정렬'},srt('가까운 순',1),srt('먼 순',-1),'-',{hd:'기한'},fl('due','',{t:'전체'}),fl('due','late',{t:'지연',html:'<span class="sch-dd hot">지연</span>'}),fl('due','7',{t:'7일 안에 마감'}),fl('due','30',{t:'30일 안에 마감'})];
  else if(v==='url')items=[{hd:'URL'},fl('url','',{t:'전체'}),fl('url','y',{t:'주소 있음'}),fl('url','n',{t:'주소 없음'})];
  menuPop(el,items.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)}),{cls:'sch-colmenu'}); }
// A row for an ordinary action item (linked to a task or not).
function schItemRow(x,cls,wbs){ const done=x.st==='done', end=itemEnd(x), u=urlHref(x.url);
  return `<div class="rw ${cls} ${S.panel===x.id?'sel':''}" data-open="${x.id}"><div class="w">${esc(wbs)}</div><div class="nm">${PROJECTS[x.proj]?schDotsHtml(schNotices(x.proj),x.id):''}<span class="gut">${x.ms?'<i class="sch-ms" style="margin:0"></i>':''}</span><span class="tx">${esc((x.title||'(제목 없음)').split('\n').join(' '))}</span></div>
    <div class="rg">${schD(x.date)||'<span class="nil">-</span>'}</div><div class="rg">${end>x.date&&!x.ms?schD(end):'<span class="nil">-</span>'}</div><div><span class="pri pri-${x.pri||'mid'}">${priTxt[x.pri||'mid']}</span></div><div>${schStIcon(schItemSt(x))}</div>
    <div class="who">${(x.people||[]).map(k=>`<span data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')||'<span class="sch-role none">미지정</span>'}</div><div class="dd">${schDdayHtml(end,done,schLateWhyItem(x))}</div><div class="url">${schUrlCell(x.url)}</div></div>`; }

/* ---------- gantt ---------- */
// Sizes are those of the design file (261118, page 9), measured on a 4x render: the outline is 508 wide, the header 40.75
// (months 24.25, days 16.5), a phase row 36.4 (30 when its tasks follow), a task row 33.25, a bar 22 high, a day 13.45 wide.
const SG={left:540,head:40.75,padTop:1.3,ph:36.4,phOpen:30,tk:33.25,padAfter:9.7,bar:22,day:13.45,port:21.5,ms:13.25};
// A relation joins two tasks the way the relation map does (owner, 2026-11-23): out of the END of the earlier task (its right
// edge, level with its middle) and into the START of the later one (its left edge). A relation of another kind uses the ends its
// kind names (SS: start to start, FF: end to end, SF: start to end). The line keeps the chart's rule: level and upright pieces
// joined by round turns, an open arrowhead, a point where it starts; nothing is slanted. It leaves by a short stub, runs up or
// down along one upright line (shared by every relation of that end of the task, so they read as one branching line) and turns
// into the other task. When the other task's end lies behind that line (the later task starts before the earlier one is over)
// the line goes round: along the gap between the rows beside the later task and into it from its own side.
// a, b: {x1, x2, cy, ...} of the two bars (a milestone: its left and right corners); a.so sets the stub further out.
function schLinkPath(a,b,type){ type=/^(FS|SS|FF|SF)$/.test(type||'')?type:'FS'; const f=n=>Math.round(n*100)/100, STUB=9, out=type[0]==='F'?1:-1, inn=type[1]==='S'?1:-1;
  const ax=out>0?a.x2:a.x1, ay=a.cy, by=b.cy, tip=inn>0?b.x1-2:b.x2+2, s=by>=ay?1:-1, t1=ax+out*(STUB+(a.so||0)); let pts;
  if(out!==inn){ const t=out>0?Math.max(t1,tip+STUB):Math.min(t1,tip-STUB); pts=[[ax,ay],[t,ay],[t,by],[tip,by]]; }              // end to end / start to start: one upright line beyond both
  else if((tip-t1)*inn>=4)pts=[[ax,ay],[t1,ay],[t1,by],[tip,by]];                                                                   // room for the turn
  else { const gy=by-s*((b.rh||SG.tk)/2), t2=tip-inn*STUB; pts=[[ax,ay],[t1,ay],[t1,gy],[t2,gy],[t2,by],[tip,by]]; }                // round the later task
  let d=`M${f(pts[0][0])},${f(pts[0][1])}`;
  for(let i=1;i<pts.length-1;i++){ const p=pts[i-1], c=pts[i], n=pts[i+1], l1=Math.hypot(c[0]-p[0],c[1]-p[1]), l2=Math.hypot(n[0]-c[0],n[1]-c[1]), r=Math.min(5,l1/2,l2/2);
    if(!(r>=.4)){ d+=` L${f(c[0])},${f(c[1])}`; continue; }
    d+=` L${f(c[0]-(c[0]-p[0])/l1*r)},${f(c[1]-(c[1]-p[1])/l1*r)} Q${f(c[0])},${f(c[1])} ${f(c[0]+(n[0]-c[0])/l2*r)},${f(c[1]+(n[1]-c[1])/l2*r)}`; }
  d+=` L${f(tip)},${f(by)}`;
  return {d,head:`M${f(tip-inn*3.6)},${f(by-3)} L${f(tip)},${f(by)} L${f(tip-inn*3.6)},${f(by+3)}`,dot:[ax,ay],into:inn>0?'left':'right'}; }
// Width of a piece of text in the chart's type (for deciding whether a name fits inside its bar).
function schTextW(text,weight){ const c=schTextW.c||(schTextW.c=document.createElement('canvas').getContext('2d')); if(!schTextW.f)schTextW.f=getComputedStyle(document.body).fontFamily||'sans-serif';
  c.font=`${weight||400} 12px ${schTextW.f}`; return c.measureText(text).width-text.length*.144; }
function schGanttBuild(pid){ const host=$('#sch-gantt .sg-scroll'); if(!host)return; const m=schModel(pid); if(!m){host.innerHTML='';return;} const A=AIDCSchedule, D=A.dates, P=A.progress;
  SG.left=document.documentElement.classList.contains('mob')?Math.round(Math.max(132,host.clientWidth*.44)):Math.round(Math.max(340,Math.min(Math.max(340,host.clientWidth-280),SCHU.gl||540)))   /* a phone: the names only, the chart beside them */;   // the outline was 508 wide in the design and is 540 since dates are written in full (eleventh round); its edge can be pulled (SCHU.gl)
  const shown=schFiltered(m), shownIds=new Set(shown.map(t=>t.id)), force=schFiltering(), sel=schTaskIdOf(S.panel)||SCHU.sel;
  // time range: like the Schedule app, the long support tail after the operation date is cut (it would flatten everything else)
  const all=m.plan.tasks; let o=Infinity, mx=-Infinity; for(const t of all){const r=m.res.tasks[t.id];o=Math.min(o,D.dayNumber(t.referenceStart),D.dayNumber(r.start));mx=Math.max(mx,D.dayNumber(r.finish));}
  if(!isFinite(o)){ o=D.dayNumber(schToday()); mx=o+150; }   // no task yet: half a year from today
  const origin=o-7, end=Math.min(mx,m.res.operationDate?D.dayNumber(D.addMonths(m.res.operationDate,7)):mx)+14, days=end-origin+1;
  const viewW=Math.max(300,host.clientWidth-SG.left-1), px=SCHU.scale==='day'?SG.day:SCHU.scale==='week'?5:SCHU.scale==='month'?1.7:Math.max(.05,viewW/days), TW=Math.round(days*px);
  const X=d=>(D.dayNumber(d)-origin)*px; host._px=px; host._o=origin;
  // rows
  const rows=[]; let y=SG.padTop;
  for(const g of m.phases){ if(SCHU.phase&&g.code!==SCHU.phase)continue; const ts=g.tasks.filter(t=>shownIds.has(t.id)); if(force&&!ts.length)continue;
    const open=(force||!!SCHU.phase||SCHU.open.includes(g.code))&&ts.length>0, h=open?SG.phOpen:SG.ph; rows.push({k:'ph',g,ts,y,h,open}); y+=h; if(open){for(const t of ts){rows.push({k:'tk',t,y,h:SG.tk});y+=SG.tk;}y+=SG.padAfter;} }
  const addY=force||SCHU.phase?-1:y; if(addY>=0)y+=SG.ph;
  const H=Math.max(y+8,80), rowOf=new Map(rows.filter(r=>r.k==='tk').map(r=>[r.t.id,r]));
  // those one relation away from the selected task: their lines and frames are drawn stronger
  const near=new Set(); if(sel&&m.byId.has(sel)){for(const e of m.pred.get(sel))near.add(e.from);for(const e of m.succ.get(sel))near.add(e.to);}
  // axis
  let ax=''; const first=D.fromDay(origin), last=D.fromDay(end), today=schToday();
  const months=[]; {let d=first.slice(0,8)+'01'; while(d<=last){months.push(d);d=D.addMonths(d,1);} }
  const yearTop=px<1.2; // too narrow for a label per month: years on top, months (or quarters) below
  if(yearTop){ const years=[...new Set(months.map(x=>x.slice(0,4)))];
    for(const yv of years){const a=Math.max(0,X(yv+'-01-01')), b=Math.min(TW,X((+yv+1)+'-01-01'));ax+=`<div class="mo" style="left:${a}px;width:${b-a}px">${yv}</div>`;}
    const step=px*30>=22?1:3; for(const d of months){const mo=+d.slice(5,7);if((mo-1)%step)continue;const a=X(d);if(a<0||a>TW-8)continue;ax+=`<div class="dy tick" style="left:${a}px;width:${px*30*step}px">${step===1?mo:Math.ceil(mo/3)+'Q'}</div>`;} }
  else{ for(const d of months){const a=Math.max(0,X(d)), b=Math.min(TW,X(D.addMonths(d,1)));if(b-a<2)continue;ax+=`<div class="mo" style="left:${a}px;width:${b-a}px">${b-a>46?d.slice(0,4)+'. '+(+d.slice(5,7)):+d.slice(5,7)}</div>`;}
    if(SCHU.scale==='day'){ for(let n=origin;n<=end;n++){const d=D.fromDay(n), dow=new Date(d+'T00:00:00Z').getUTCDay();ax+=`<div class="dy ${dow===6?'sat':dow===0?'sun':''} ${d===today?'now':''}" style="left:${(n-origin)*px}px;width:${px}px"><i>${+d.slice(8)}</i></div>`;} }
    else if(SCHU.scale==='week'){ for(let n=origin;n<=end;n++){const d=D.fromDay(n);if(new Date(d+'T00:00:00Z').getUTCDay()!==1)continue;ax+=`<div class="dy tick" style="left:${(n-origin)*px}px;width:${px*7}px">${+d.slice(8)}</div>`;} }
    else for(const d of months){for(const dd of ['01','11','21']){const x=d.slice(0,8)+dd;if(x<first||x>last)continue;ax+=`<div class="dy tick" style="left:${X(x)}px;width:${px*10}px">${+dd}</div>`;}} }
  // outline and bars
  let L='', R='', links='', marks='', dots='';
  for(const r of rows){
    if(r.k==='ph'){ const g=r.g, pr=schProgress(m,g.tasks), pc=schPct(pr); let a=Infinity,b=-Infinity; for(const t of g.tasks){const x=m.res.tasks[t.id];a=Math.min(a,D.dayNumber(x.start));b=Math.max(b,D.dayNumber(x.finish));}
      L+=`<div class="sg-row ph ${r.open?'open':''}" style="top:${r.y}px;height:${SG.ph}px" data-sch="phase" data-k="${g.code}"><span class="tw">${svg('i-sch-tri',10,8.75)}</span><span class="tt">${esc(schPhaseLabel(g))}</span><span class="n">(${force?r.ts.length+'/':''}${g.tasks.length})</span>
        <span class="pg ${pc?'has':''}" title="${esc(`완료 ${pr.done} / 대상 ${pr.total}${pr.started?' · 진행 '+pr.started:''}\n`+SCH_PROGRESS_TIP)}"><span class="bar"><i style="width:${Math.max(pc,pc?6:0)}%"></i></span>${pc}%</span><span class="add" data-sch="addtask" data-k="${g.code}" title="이 단계에 업무 추가">${svg('i-plus',9,9)}</span><span class="pm" data-sch="phmenu" data-k="${g.code}" title="단계 이름 바꾸기 · 삭제">${svg('i-more',3,13)}</span></div>`;
      if(g.tasks.length){ const x1=Math.max(-20,Math.min(TW,(a-origin)*px)), x2=Math.max(0,Math.min(TW,(b-origin+1)*px)), w=Math.max(3,x2-x1), fin=D.fromDay(b);
        R+=`<div class="sg-sum ${w<52?'out':''}" style="left:${x1}px;top:${r.y+7.45}px;width:${w}px" data-sch="phase" data-k="${g.code}" title="${esc(schPhaseLabel(g))} · ${schD(D.fromDay(a))} → ${schD(fin)} · ${pc}%"><em>${schD(fin)}</em></div>`; }   // a phase a member added has no task yet: no bar
      if(!r.open)for(const t of g.tasks)if(t.kind==='milestone'){const x=X(m.res.tasks[t.id].start);if(x>=0&&x<=TW)R+=`<i class="sg-dia ${P.isDone(t)?'done':''} ${t.id===sel?'sel':''}" style="left:${x-3.6}px;top:${r.y+20.4}px" data-sch="pickrow" data-k="${t.id}" title="${esc(schTaskTitle(t))} · ${schD(m.res.tasks[t.id].start)}"></i>`;}
      continue; }
    const t=r.t, x=m.res.tasks[t.id], done=P.isDone(t), late=!done&&x.finish<today, isSel=t.id===sel, isNear=near.has(t.id), cls=`${isSel?'sel':''} ${isNear?'near':''} ${done?'done':''}`, ms=t.kind==='milestone';
    L+=`<div class="sg-row tk ${isSel?'sel':''}" style="top:${r.y}px" data-sch="pickrow" data-k="${t.id}" data-row="${t.id}"><span class="bl"><i class="${ms?'ms':''}"></i></span><span class="nm" title="${esc(schTaskTitle(t))}"><b>${schNo(t)})</b>${esc(t.name)}</span>${schPeople(t).length?avstack(schPeople(t),3):''}${done?'':schDdayHtml(x.finish,false)}<span class="fill"></span>
      <span class="rg">${ms?schD(x.start):schRange(x.start,x.finish)}</span><span class="st" title="${esc(schStatus(t))}">${schStatus(t)==='조건부 미발동'?schMark('cond','조건부'):schStIcon(schStatus(t))}</span></div>`;
    const x1=X(x.start), x2=X(x.finish)+px, cy=r.y+r.h/2, top=cy-SG.bar/2, tip=`${schTaskTitle(t)}\n예상 ${schD(x.start)}${ms?'':' → '+schD(x.finish)+' ('+x.duration+'일)'} · ${schStatus(t)}${x.delta?`\n참조계획 대비 ${x.delta>0?'+':''}${x.delta}일`:''}${x.slack!==null?`\n운영개시 여유 ${x.slack}일`:''}${isSel?'\n한 번 더 누르면 상세가 열립니다':''}`;
    // (the reference plan is drawn on the bar itself, see below)
    if(ms){ Object.assign(r,{ms:true,cx:x1,cy,x1:x1-SG.ms,x2:x1+SG.ms,top:cy-SG.ms,bottom:cy+SG.ms});
      R+=`<i class="sg-msb ${cls}" style="left:${x1-9.35}px;top:${cy-9.35}px" data-sch="pickrow" data-k="${t.id}" data-bar="${t.id}" data-row="${t.id}" title="${esc(tip)}"></i><span class="sg-tx ${isSel?'sel':''}" style="left:${x1+SG.ms+3}px;top:${top}px" data-sch="pickrow" data-k="${t.id}" data-row="${t.id}"><b>${schNo(t)})</b>${esc(t.name)}</span>`; continue; }
    // the name of a task stands inside its bar, cut with … when the bar is short (owner, 2026-11-19); only a bar too short for even the number has it beside it
    const w=Math.max(4,x2-x1), label=`<b>${schNo(t)})</b>${esc(t.name)}`, inside=w>=44, prog=!done&&typeof t.progress==='number'?t.progress:0;
    Object.assign(r,{x1,x2:x1+w,cy,top,bottom:top+SG.bar});
    // the reference plan against the forecast (owner, 2026-11-19): dashed is the reference plan's finish. A dashed line inside the bar: the task now runs
    // longer than the reference plan; a dashed outline after the bar: it now ends earlier (the schedule shrank).
    let mark=''; if(SCHU.refm!==false&&x.finish!==t.referenceFinish){ const pf=X(t.referenceFinish)+px, dl=D.diffDays(x.finish,t.referenceFinish), tp=`참조계획 완료 ${schD(t.referenceFinish)} · 참조계획보다 ${Math.abs(dl)}일 ${dl>0?'늘어남':'줄어듦'}`;
      if(pf>x1+8&&pf<x1+w-4)mark=`<i class="pl in" style="width:${pf-x1}px" title="${tp}"></i>`; else if(pf>x1+w+3)mark=`<i class="pl out" style="left:${w-1}px;width:${pf-x1-w}px" title="${tp}"></i>`; }
    R+=`<div class="sg-bar ${cls} ${late?'late':''}" style="left:${x1}px;top:${top}px;width:${w}px" data-sch="pickrow" data-k="${t.id}" data-bar="${t.id}" data-row="${t.id}" title="${esc(tip)}">${inside?`<span class="lb">${label}</span>`:''}${mark}${prog?`<i class="pc" style="width:${Math.round(prog*100)}%"></i>`:''}${w>=18?'<s class="rz l" title="끌어서 시작일 변경"></s><s class="rz r" title="끌어서 종료일 변경"></s>':''}<u class="pt l" data-port="s" title="끌어서 다른 업무에 연결 (이 업무의 시작)"></u><u class="pt r" data-port="f" title="끌어서 다른 업무에 연결 (이 업무의 끝)"></u></div>`;
    if(!inside)R+=`<span class="sg-tx ${isSel?'sel':''}" style="left:${x1+w+6}px;top:${top}px" data-sch="pickrow" data-k="${t.id}" data-row="${t.id}">${label}</span>`; }
  if(addY>=0)L+=`<div class="sg-row add" style="top:${addY}px;height:${SG.ph}px" data-sch="newphase" title="개발 단계 추가">${svg('i-plus',9,9)}<span>개발 단계 추가</span>${rows.length?'':'<em>단계를 만들고, 그 줄의 + 로 업무를 추가합니다</em>'}</div>`;
  { // one upright line per task: tasks whose lines would fall on one another get stubs 4 longer each
    const used=[]; for(const r of rows){ if(r.k!=='tk'||r.x1===undefined)continue; r.so=0; if(!m.succ.get(r.t.id).some(e=>rowOf.has(e.to)&&e.type[0]==='F'))continue;
      let x=r.x2+9, n=0; while(used.some(u=>Math.abs(u-x)<3.5)&&n<5){x+=4;n++;} used.push(x); r.so=x-(r.x2+9); } }
  if(SCHU.links){ let hot=''; for(const e of m.plan.dependencies){ const a=rowOf.get(e.from), b=rowOf.get(e.to); if(!a||!b||a.x1===undefined||b.x1===undefined)continue; const isHot=e.from===sel||e.to===sel; if(!e.active&&!isHot)continue;
      const c=schLinkPath(a,b,e.type), g=`<g class="${isHot?'hot':''} ${e.active?'':'off'}" data-link="${e.id}"><path class="hit" d="${c.d}"/><path d="${c.d}"/><path d="${c.head}"/></g>`; if(isHot)hot+=g; else links+=g;
      dots+=`<circle class="${isHot?'hot':''} ${e.active?'':'off'}" cx="${c.dot[0]}" cy="${c.dot[1]}" r="${isHot?2.7:1.7}"/>`; }   // where a relation starts: drawn above the bars (it sits on a bar's edge and was half hidden behind it)
    links+=hot; }
  // "30% / 60% / 90%": the row after which that share of the whole schedule's weight is done (same weights as the progress figures)
  { const W=t=>P.isExcluded(t)?0:P.weight(t,m.res,schPri(m,t)), total=all.reduce((n,t)=>n+W(t),0); let acc=0, next=0; const steps=[.3,.6,.9];
    if(total>0&&!force&&!SCHU.phase)for(let i=0;i<rows.length&&next<steps.length;i++){ const r=rows[i]; if(r.k==='ph'&&r.open)continue; acc+=r.k==='ph'?r.g.tasks.reduce((n,t)=>n+W(t),0):W(r.t);
      while(next<steps.length&&acc/total>=steps[next]-1e-9){ const lastOfPhase=r.k==='tk'&&(i+1>=rows.length||rows[i+1].k==='ph'), yy=r.y+r.h+(lastOfPhase?SG.padAfter/2:0);
        marks+=`<i class="sg-mark" style="top:${yy}px" data-pc="${Math.round(steps[next]*100)}"></i>`; next++; } } }
  const nowX=today>=first&&today<=last?X(today)+px/2:-1;
  const crit=all.filter(t=>m.res.tasks[t.id].criticality==='critical').length;
  const hotMonths=months.map(d=>X(d)).filter(a=>a>0&&a<TW).map(a=>`<i class="mline" style="left:${a}px"></i>`).join('');
  host.innerHTML=`<div class="sg-inner" style="width:${SG.left+TW+1}px"><div class="sg-head"><div class="sg-corner" style="width:${SG.left}px"><span>운영개시 예상 <b>${m.res.operationDate?schD(m.res.operationDate):'미정'}</b>${m.res.operationDelay?`<em>(목표 대비 ${m.res.operationDelay>0?'+':''}${m.res.operationDelay}일)</em>`:''}</span><span>운영개시 경로 <b>${crit}</b>건</span><span>상태일 <b>${schD(m.plan.statusDate)}</b></span>${schInfo('dates')}</div><div class="sg-axis" style="left:${SG.left+1}px;width:${TW}px">${ax}${hotMonths}</div></div>
    <div class="sg-body" style="height:${H}px"><i class="sg-band" hidden></i><div class="sg-left" style="width:${SG.left}px;height:${H}px">${L}<i class="sg-split" title="끌어서 표의 폭 조절 · 두 번 누르면 처음 폭"></i></div>
    <div class="sg-right" style="left:${SG.left+1}px;width:${TW}px;height:${H}px">${R}${SCHU.today&&nowX>=0?`<i class="now" style="left:${nowX}px"></i>`:''}<svg class="sg-links" width="${TW}" height="${H}">${links}</svg><svg class="sg-dots" width="${TW}" height="${H}" aria-hidden="true">${dots}</svg></div>${marks}</div></div>`;
  // the horizontal scroll bar: a bar of its own below the chart, kept in step with it; the chart itself shows none
  { const box=host.parentElement; const old=box.querySelector('.sg-foot'); if(old)old.remove(); let tb=box.querySelector('.sg-topbar');
    if(!tb){ tb=document.createElement('div'); tb.className='sg-topbar'; tb.innerHTML='<i></i>'; box.insertBefore(tb,host.nextSibling);
      // Each of the two follows the other. A position one of them was just given by the other is not handed back (`_echo`): the scroll event
      // of that comes a frame later, and by then the chart may have been moved on (pulled by its ground, turned by the wheel); handing the
      // older position back made the view jump back a step now and then (found 2026-11-23 through the test of pulling the ground).
      const echo=el=>{ const mine=el._echo!==undefined&&Math.abs(el.scrollLeft-el._echo)<1; el._echo=undefined; return mine; }, give=(to,x)=>{ if(Math.abs(to.scrollLeft-x)>.5){to._echo=x;to.scrollLeft=x;} };
      tb.addEventListener('scroll',()=>{ if(!echo(tb))give(host,tb.scrollLeft); },{passive:true});
      host.addEventListener('scroll',()=>{ if(!echo(host))give(tb,host.scrollLeft); if(host._key)SCH.gs={key:host._key,x:host.scrollLeft,y:host.scrollTop}; },{passive:true});
      host.addEventListener('wheel',e=>{ const dx=e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX; if(dx&&(e.shiftKey||Math.abs(dx)>Math.abs(e.deltaY))){host.scrollLeft+=dx;e.preventDefault();} },{passive:false}); }
    tb.style.marginLeft=(SG.left+1)+'px'; tb.firstChild.style.width=TW+'px'; tb.classList.toggle('none',TW<=host.clientWidth-SG.left);
    // the shade at the table's edge runs over the dates above and the scroll bar below as well
    let sh=box.querySelector('.sg-shade'); if(!sh){sh=document.createElement('i');sh.className='sg-shade';box.appendChild(sh);} sh.style.left=(SG.left+1)+'px'; }
  host._rows=rowOf; schMarkTags(host);
  // where the view stands: the selected task, else today
  const key=pid+'|'+SCHU.scale+'|'+SCHU.phase; if(host._key!==key){ host._key=key;   // a fresh chart: where it stood before a redraw of the page (SCH.gs), else at the selected task or today
    if(SCH.gs&&SCH.gs.key===key){host.scrollLeft=SCH.gs.x;host.scrollTop=SCH.gs.y;} else{ const target=sel&&rowOf.get(sel)?rowOf.get(sel).x1:nowX; if(px>1.2&&target>=0)host.scrollLeft=Math.max(0,target-viewW*0.3); } }
  const tb=host.parentElement.querySelector('.sg-topbar'); if(tb&&Math.abs(tb.scrollLeft-host.scrollLeft)>.5){tb._echo=host.scrollLeft;tb.scrollLeft=host.scrollLeft;} if(typeof schGhostsDraw==='function')schGhostsDraw(); }
// The 30 / 60 / 90 % tags stand in the page margin left of the chart (outside the scrolling part), level with their lines.
function schMarkTags(host){ const box=host.parentElement; let layer=box.querySelector('.sg-tags'); if(!layer){layer=document.createElement('div');layer.className='sg-tags';box.appendChild(layer);}
  const view=host.clientHeight, off=host.offsetTop; layer.innerHTML=$$('.sg-mark',host).map(el=>{const y=SG.head+parseFloat(el.style.top)-host.scrollTop;return y<SG.head+2||y>view-2?'':`<b style="top:${off+y}px" title="여기까지 끝나면 전체 일정의 ${el.dataset.pc}%가 끝납니다 (기간·중요도·마일스톤 가중치 기준)"><svg width="40" height="15" viewBox="0 0 40 15" aria-hidden="true"><path d="M2.5 .5H30.6L39.2 7.5 30.6 14.5H2.5a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2z" fill="#fff" stroke="#cfcfcf"/></svg><span>${el.dataset.pc}%</span></b>`;}).join('');
  if(!host._markScroll){host._markScroll=true;host.addEventListener('scroll',()=>schMarkTags(host),{passive:true});} }
function schMount(){ if(S.page!=='project'||!schHas(S.proj)||S.full)return; if($('#sch-gantt'))schGanttBuild(S.proj); if($('#sch-net'))schNetBuild(S.proj); if(typeof schLowAddPlace==='function')schLowAddPlace(); }
function schRefresh(){ const el=$('[data-sec="sch-act"]'); if(!el||!schHas(S.proj))return; if(typeof schLegacyToTasks==='function'&&!(SCH.legacy||{})[S.proj]){ const pid=S.proj; clearTimeout(schRefresh.lg); schRefresh.lg=setTimeout(()=>schLegacyToTasks(pid),700); } const keep=schKeepScroll(); el.innerHTML=schActionBody(S.proj); $$('#sch-actions .sch-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.k===SCHU.tab)); { const ch=$('#sch-actions [data-chips]'); if(ch)ch.innerHTML=schChips(S.proj); } schMount(); schRestoreScroll(keep); schUiSave(); afterNav(); }
