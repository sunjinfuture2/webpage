// The 액션 section of a project that has a schedule: 일정 (gantt) · 리스트 · 관계도, one set of filters for the three.

(function(){ // icons the schedule views add to the page's sprite
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden'); s.setAttribute('aria-hidden','true');
  s.innerHTML='<symbol id="i-sch-arr" viewBox="0 0 11 8"><path d="M0.5 4h9.3M6.7 0.9L9.9 4 6.7 7.1" fill="none" stroke="currentColor" stroke-width="1.1"/></symbol>'
   +'<symbol id="i-sch-bang" viewBox="0 0 3 10.5"><path d="M1.5 0.4v6.4M1.5 8.6v1.6" fill="none" stroke="currentColor" stroke-width="1.7"/></symbol>'
   +'<symbol id="i-sch-plan" viewBox="0 0 11 11"><path d="M5.5 0.6v2.2M5.5 8.2v2.2M0.6 5.5h2.2M8.2 5.5h2.2M2 2l1.6 1.6M7.4 7.4L9 9M9 2L7.4 3.6M3.6 7.4L2 9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></symbol>'
   +'<symbol id="i-sch-fit" viewBox="0 0 22 22"><path d="M1 7V1h6M15 1h6v6M21 15v6h-6M7 21H1v-6" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>'
   +'<symbol id="i-sch-ext" viewBox="0 0 9 9"><path d="M1 8L8 1M2.6 1H8v5.4" fill="none" stroke="currentColor" stroke-width="1.1"/></symbol>'
   +'<symbol id="i-sch-ck" viewBox="0 0 10 8"><path d="M1.2 4.1L3.8 6.6 8.8 1.4" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>';
  document.body.appendChild(s); })();

const SCH_SCOPES=[['all','모든 업무'],['mine','내 업무'],['open','미완료'],['prog','진행 중'],['late','지연'],['soon','30일 안에 마감'],['ms','마일스톤'],['crit','운영개시 경로']];
const SCH_SCALES=[['fit','전체 기간'],['day','Day'],['week','Week'],['month','Month']];
const schScopeName=()=>(SCH_SCOPES.find(x=>x[0]===SCHU.scope)||SCH_SCOPES[0])[1];
function schScopeTest(m,t){ const r=m.res.tasks[t.id], k=SCHU.scope, P=AIDCSchedule.progress;
  if(k==='mine')return schMine(t); if(k==='open')return !P.isDone(t); if(k==='prog')return !P.isDone(t)&&(P.isStarted(t)||schOnDay(m,t,schToday()));
  if(k==='late')return schLate(m,t); if(k==='soon'){const d=schDday(r.finish,P.isDone(t));return !!d&&d.n<=30;} if(k==='ms')return t.kind==='milestone'; if(k==='crit')return r.criticality==='critical'||r.criticality==='near'; return true; }
function schWhoTest(t){ const w=SCHU.who; if(!w)return true; if(w.startsWith('r:'))return !schPeople(t).length&&schRole(t)===w.slice(2); return schPeople(t).includes(w); }
// The tasks the three views show, in WBS order.
function schFiltered(m){ const q=(SCHU.q||'').trim();
  return m.phases.flatMap(g=>g.tasks).filter(t=>(!SCHU.phase||t.phase===SCHU.phase)&&schScopeTest(m,t)&&schWhoTest(t)&&(!q||matchQ(q,t.name,t.wbs,schWbs(t.wbs),schRole(t),t.status,...schPeople(t).map(userName)))); }
const schFiltering=()=>!!(SCHU.q||'').trim()||SCHU.scope!=='all'||!!SCHU.who;

function schActionSection(pid){ const tabs=[['gantt','일정'],['list','리스트'],['net','관계도']];
  return `<div class="sec sch-sec" id="sch-actions" style="margin-top:112px">
    <div class="sec-title sch-title" style="margin-left:-2.8px"><span class="sch-ic">${pict('action')}</span>액션<span class="sch-tabs">${tabs.map(([k,t],i)=>`${i?'<i>·</i>':''}<button class="${SCHU.tab===k?'on':''}" data-sch="tab" data-k="${k}">${t}</button>`).join('')}</span>
      ${plusBtn('new-action','새 액션아이템')}<button class="sh-btn lib" data-lib="action">라이브러리</button><button class="sh-btn lib tools" data-sch="tools" title="가져오기 · 내보내기 · 시나리오 · 상태일">프로젝트 도구</button>
      <label class="srch box">${svg('pic-search',15,15)}<input data-schq="q" placeholder="검색" value="${esc(SCHU.q||'')}"></label></div>
    <div data-sec="sch-act">${schActionBody(pid)}</div></div>`; }
function schActionBody(pid){ const m=schModel(pid);
  if(!m)return `<div class="sch-empty">${SCH.failed[pid]?esc(SCH.failed[pid])+' <button class="sh-btn" data-sch="reload" style="margin-left:12px;height:26px;padding:0 10px;font-size:12px">다시 시도</button>':'일정을 불러오는 중입니다…'}</div>`;
  const sf=(k,label,set,cls='')=>`<div class="sf ${cls} ${set?'set':''}" data-sch="pick" data-k="${k}"><span>${esc(label)}</span>${svg('i-chev-d',9,4.6)}</div>`;
  const ck=(k,label)=>`<span class="ck ${SCHU[k]?'on':''}" data-sch="toggle" data-k="${k}"><i>${svg('i-sch-ck',8,6.4)}</i>${label}</span>`;
  const g=SCHU.phase&&m.phases.find(x=>x.code===SCHU.phase); let f=sf('phase',g?schPhaseLabel(g):'전체 단계',!!g)+sf('scope',schScopeName(),SCHU.scope!=='all');
  if(SCHU.tab==='gantt')f+=sf('scale',(SCH_SCALES.find(x=>x[0]===SCHU.scale)||SCH_SCALES[0])[1],false,'narrow')+`<div class="cks">${ck('ref','참조계획')}${ck('links','연결선')}${ck('today','오늘')}</div>`;
  else if(SCHU.tab==='list')f+=sf('who',SCHU.who?(SCHU.who.startsWith('r:')?SCHU.who.slice(2):userName(SCHU.who)):'담당자별',!!SCHU.who)+`<div class="right"><div class="tbl-tools" data-sch="pick" data-k="per">${SCHU.per}개씩 보기 ${svg('i-chev-d',7.8,4,'color:currentColor')}</div></div>`;
  else f=`<div class="seg"><button class="${SCHU.netMode==='all'?'on':''}" data-sch="netmode" data-k="all">전체 단계</button><button class="${SCHU.netMode==='focus'?'on':''}" data-sch="netmode" data-k="focus">선택 업무 중심</button></div>`
    +(SCHU.netMode==='focus'?sf('netDepth',SCHU.netDepth+'단계 연결',false)+sf('netDir',({both:'선행+후행',before:'선행만',after:'후행만'})[SCHU.netDir],false):sf('phase',g?schPhaseLabel(g):'전체 단계',!!g));
  const note=m.err?`<div class="sch-note">일정 관계가 서로 맞지 않아 최근에 추가한 관계 일부를 빼고 계산했습니다: ${esc(m.err)}</div>`:(schScenario(pid)?`<div class="sch-note">시나리오 “${esc((SCHED[pid]['sc:'+schScenario(pid)]||{}).name||'')}”를 보고 있습니다. 여기서 고친 내용은 기본 계획에 반영되지 않습니다. <button class="sh-btn" data-sch="scn-off" style="margin-left:8px;height:22px;padding:0 9px;font-size:12px">기본 계획으로</button></div>`:'');
  return `<div class="sch-filters">${f}</div>${note}${SCHU.tab==='gantt'?'<div class="sch-gantt" id="sch-gantt"><div class="sg-scroll"></div></div>':SCHU.tab==='list'?schListHtml(pid,m):schNetShell(pid,m)}`; }

// The page's pager look, but with its own attribute (the page's own handler would take data-pg for one of its lists).
function schPager(cur,total,key,top){let h=`<div class="pager" style="margin-top:${top}px"><button class="arr" data-sch="page" data-k="${key}" data-v="prev" ${cur<=1?'disabled':''}>${svg('i-pg-arr',3.7,6.5,'transform:rotate(180deg)')}</button>`;
  const from=Math.max(1,Math.min(cur-4,total-9)), to=Math.min(total,from+9); for(let i=from;i<=to;i++)h+=`<button data-sch="page" data-k="${key}" data-v="${i}" class="${i===cur?'cur':''}">${i}</button>`;
  return h+`<button class="arr" data-sch="page" data-k="${key}" data-v="next" ${cur>=total?'disabled':''}>${svg('i-pg-arr',3.7,6.5)}</button></div>`;}
/* ---------- list ---------- */
const SCH_SORT={wbs:(m,t)=>t.order,name:(m,t)=>t.name,plan:(m,t)=>t.plannedStart+t.plannedFinish,pri:(m,t)=>({high:0,mid:1,low:2})[schPri(m,t)],st:(m,t)=>SCH_STATUSES.indexOf(schStatus(t)),
  who:(m,t)=>schPeople(t).map(userName).join(',')||'~'+schRole(t),due:(m,t)=>m.res.tasks[t.id].finish};
function schListHtml(pid,m){ const P=AIDCSchedule.progress; let rows=schFiltered(m); const f=SCH_SORT[SCHU.sort]||SCH_SORT.wbs;
  rows=rows.slice().sort((a,b)=>{const x=f(m,a),y=f(m,b);return (x<y?-1:x>y?1:0)*SCHU.dir||a.order-b.order;});
  const total=Math.max(1,Math.ceil(rows.length/SCHU.per)); SCHU.page=Math.min(Math.max(1,SCHU.page),total); const page=rows.slice((SCHU.page-1)*SCHU.per,SCHU.page*SCHU.per);
  const th=(k,t)=>`<span data-sch="sort" data-k="${k}" class="${SCHU.sort===k?'sorted':''} ${SCHU.sort===k&&SCHU.dir<0?'up':''}" title="눌러서 정렬">${t}${svg('i-chev-d',8,4)}</span>`;
  const head=`<div class="hd">${th('wbs','WBS')}${th('name','업무명')}${th('plan','관리일정')}${th('pri','중요도')}${th('st','상태')}${th('who','담당자')}${th('due','기한')}<span style="cursor:default">URL</span></div>`;
  const urlCell=u=>{const h=urlHref(u);return h?`<a href="${esc(h)}" target="_blank" rel="noopener" data-stop>${esc(u)}</a>`:'<span style="color:#c4c4c4">-</span>';};
  let h=`<div class="tbl sch-list">${head}`;
  for(const t of page){ const r=m.res.tasks[t.id], done=P.isDone(t), linked=schLinked(pid,t.id), id=schItemId(t.id), it=ITEMS.find(x=>x.id===id), nc=it?(it.comments||[]).length:0;
    h+=`<div class="rw ${S.panel===id?'sel':''}" data-open="${id}"><div class="w">${schWbs(t.wbs)}</div><div class="nm"><span class="gut">${t.kind==='milestone'?'<i class="sch-ms" style="margin:0"></i>':''}</span><span class="tx">${esc(t.name)}</span>${nc?`<span class="cnt">댓글 ${nc}</span>`:''}</div>
      <div class="rg">${t.kind==='milestone'?schD(t.plannedStart):schRange(t.plannedStart,t.plannedFinish)}</div><div>${schPriHtml(m,t)}</div><div>${schStIcon(schStatus(t))}</div><div class="who">${schWhoHtml(t)}</div><div class="dd">${done?'':schDdayHtml(r.finish,false)}</div><div class="url">${urlCell(t.url)}</div></div>`;
    for(const x of linked)h+=schItemRow(x,'sub',`↳ ${schWbs(t.wbs)}`); }
  if(!page.length)h+=`<div class="none">${schFiltering()||SCHU.phase?'조건에 맞는 업무가 없습니다.':'등록된 업무가 없습니다.'}</div>`;
  h+=`<div class="ft"></div></div>${schPager(SCHU.page,total,'page',32)}`;
  // actions that are not part of the schedule stay in a group of their own until somebody links them to a task
  const q=(SCHU.q||'').trim(), un=schUnlinked(pid).filter(i=>!q||matchQ(q,i.title,...(i.people||[]).map(userName))).sort(newestFirst);
  if(un.length){ const ut=Math.max(1,Math.ceil(un.length/10)); SCHU.upage=Math.min(Math.max(1,SCHU.upage),ut);
    h+=`<div class="sch-sub-h">일정 미연결 액션<small>${un.length}건 · 상세창의 ‘개발 단계’에서 업무를 고르면 그 업무 아래로 옮겨집니다</small></div><div class="tbl sch-list">${head.replace(/data-sch="sort" data-k="[a-z]+"/g,'').replace(/ title="눌러서 정렬"/g,' style="cursor:default"').replace(/<svg[^>]*><use href="#i-chev-d"\/><\/svg>/g,'')}`
      +un.slice((SCHU.upage-1)*10,SCHU.upage*10).map(x=>schItemRow(x,'','-')).join('')+`<div class="ft"></div></div>${ut>1?schPager(SCHU.upage,ut,'upage',26):''}`; }
  return h; }
// A row for an ordinary action item (linked to a task or not).
function schItemRow(x,cls,wbs){ const done=x.st==='done', end=itemEnd(x), u=urlHref(x.url);
  return `<div class="rw ${cls} ${S.panel===x.id?'sel':''}" data-open="${x.id}"><div class="w">${esc(wbs)}</div><div class="nm"><span class="gut"></span><span class="tx">${esc((x.title||'(제목 없음)').split('\n').join(' '))}</span></div>
    <div class="rg">${end>x.date?schRange(x.date,end):schD(x.date)}</div><div><span class="pri pri-${x.pri||'mid'}">${priTxt[x.pri||'mid']}</span></div><div>${schStIcon(done?'완료':'진행')}</div>
    <div class="who">${(x.people||[]).map(k=>`<span>${av()}${esc(userName(k))}</span>`).join('')}</div><div class="dd">${schDdayHtml(end,done)}</div><div class="url">${u?`<a href="${esc(u)}" target="_blank" rel="noopener" data-stop>${esc(x.url)}</a>`:'<span style="color:#c4c4c4">-</span>'}</div></div>`; }

/* ---------- gantt ---------- */
const SG={left:508,ph:36,tk:34};
// Same port rules as the Schedule app (ganttGeometry.ts): a finish port is the right edge of the bar, a start port the left one.
function schConnector(x1,y1,x2,y2,type){ const a=type==='FS'||type==='FF'?1:-1, b=type==='FF'||type==='SF'?1:-1, stub=9, sx=x1+a*stub, tx=x2+b*stub; let pts;
  if((a===1&&b===-1&&tx>=sx)||(a===-1&&b===1&&tx<=sx)){const mid=(sx+tx)/2;pts=[[x1,y1],[mid,y1],[mid,y2],[x2,y2]];}
  else if(a===b){const side=a>0?Math.max(sx,tx)+5:Math.min(sx,tx)-5;pts=[[x1,y1],[side,y1],[side,y2],[x2,y2]];}
  else{const bend=y1+(y2>=y1?17:-17);pts=[[x1,y1],[sx,y1],[sx,bend],[tx,bend],[tx,y2],[x2,y2]];}
  let d=`M${pts[0][0]},${pts[0][1]}`;
  for(let i=1;i<pts.length-1;i++){const p0=pts[i-1],p=pts[i],p1=pts[i+1];const r=Math.min(8,Math.abs(p[0]-p0[0])+Math.abs(p[1]-p0[1]),Math.abs(p1[0]-p[0])+Math.abs(p1[1]-p[1]))/2;
    d+=` L${p[0]-Math.sign(p[0]-p0[0])*r},${p[1]-Math.sign(p[1]-p0[1])*r} Q${p[0]},${p[1]} ${p[0]+Math.sign(p1[0]-p[0])*r},${p[1]+Math.sign(p1[1]-p[1])*r}`;}
  const l=pts[pts.length-1], k=pts[pts.length-2], dir=Math.sign(l[0]-k[0])||1; return {d:d+` L${l[0]},${l[1]}`,head:`M${l[0]-dir*4},${l[1]-2.6} L${l[0]},${l[1]} L${l[0]-dir*4},${l[1]+2.6}`}; }
function schGanttBuild(pid){ const host=$('#sch-gantt .sg-scroll'); if(!host)return; const m=schModel(pid); if(!m){host.innerHTML='';return;} const A=AIDCSchedule, D=A.dates, P=A.progress;
  const shown=schFiltered(m), shownIds=new Set(shown.map(t=>t.id)), force=schFiltering(), sel=schTaskIdOf(S.panel)||SCHU.sel;
  // time range: like the Schedule app, the long support tail after the operation date is cut (it would flatten everything else)
  const all=m.plan.tasks; let o=Infinity, mx=-Infinity; for(const t of all){const r=m.res.tasks[t.id];o=Math.min(o,D.dayNumber(t.referenceStart),D.dayNumber(r.start));mx=Math.max(mx,D.dayNumber(r.finish));}
  const origin=o-7, end=Math.min(mx,D.dayNumber(D.addMonths(m.res.operationDate,7)))+14, days=end-origin+1;
  const viewW=Math.max(300,host.clientWidth-SG.left-1), px=SCHU.scale==='day'?14:SCHU.scale==='week'?5:SCHU.scale==='month'?1.7:Math.max(.05,viewW/days), TW=Math.round(days*px);
  const X=d=>(D.dayNumber(d)-origin)*px; host._px=px;
  // rows
  const rows=[]; let y=0;
  for(const g of m.phases){ if(SCHU.phase&&g.code!==SCHU.phase)continue; const ts=g.tasks.filter(t=>shownIds.has(t.id)); if(force&&!ts.length)continue;
    const open=force||!!SCHU.phase||SCHU.open.includes(g.code); rows.push({k:'ph',g,ts,y,h:SG.ph,open}); y+=SG.ph; if(open)for(const t of ts){rows.push({k:'tk',t,y,h:SG.tk});y+=SG.tk;} }
  const H=Math.max(y,60), rowOf=new Map(rows.filter(r=>r.k==='tk').map(r=>[r.t.id,r]));
  // axis
  let ax=''; const first=D.fromDay(origin), last=D.fromDay(end), today=schToday();
  const months=[]; {let d=first.slice(0,8)+'01'; while(d<=last){months.push(d);d=D.addMonths(d,1);} }
  const yearTop=px<1.2; // too narrow for a label per month: years on top, months (or quarters) below
  if(yearTop){ const years=[...new Set(months.map(x=>x.slice(0,4)))];
    for(const yv of years){const a=Math.max(0,X(yv+'-01-01')), b=Math.min(TW,X((+yv+1)+'-01-01'));ax+=`<div class="mo" style="left:${a}px;width:${b-a}px">${yv}</div>`;}
    const step=px*30>=22?1:3; for(const d of months){const mo=+d.slice(5,7);if((mo-1)%step)continue;const a=X(d);if(a<0||a>TW-8)continue;ax+=`<div class="dy tick" style="left:${a}px;width:${px*30*step}px">${step===1?mo:Math.ceil(mo/3)+'Q'}</div>`;} }
  else{ for(const d of months){const a=Math.max(0,X(d)), b=Math.min(TW,X(D.addMonths(d,1)));if(b-a<2)continue;ax+=`<div class="mo" style="left:${a}px;width:${b-a}px">${b-a>46?d.slice(0,4)+'. '+(+d.slice(5,7)):+d.slice(5,7)}</div>`;}
    if(SCHU.scale==='day'){ for(let n=origin;n<=end;n++){const d=D.fromDay(n), dow=new Date(d+'T00:00:00Z').getUTCDay();ax+=`<div class="dy ${dow===6?'sat':dow===0?'sun':''} ${d===today?'now':''}" style="left:${(n-origin)*px}px;width:${px}px">${+d.slice(8)}</div>`;} }
    else if(SCHU.scale==='week'){ for(let n=origin;n<=end;n++){const d=D.fromDay(n);if(new Date(d+'T00:00:00Z').getUTCDay()!==1)continue;ax+=`<div class="dy tick" style="left:${(n-origin)*px}px;width:${px*7}px">${+d.slice(8)}</div>`;} }
    else for(const d of months){for(const dd of ['01','11','21']){const x=d.slice(0,8)+dd;if(x<first||x>last)continue;ax+=`<div class="dy tick" style="left:${X(x)}px;width:${px*10}px">${+dd}</div>`;}} }
  // left outline and bars
  let L='', R='', links='';
  for(const d of months){const a=X(d);if(a>0&&a<TW)R+=`<i class="mline" style="left:${a}px"></i>`;}
  for(const r of rows){
    if(r.k==='ph'){ const g=r.g, pr=schProgress(m,g.tasks), pc=schPct(pr); let a=Infinity,b=-Infinity; for(const t of g.tasks){const x=m.res.tasks[t.id];a=Math.min(a,D.dayNumber(x.start));b=Math.max(b,D.dayNumber(x.finish));}
      L+=`<div class="sg-row ph ${r.open?'open':''}" style="top:${r.y}px" data-sch="phase" data-k="${g.code}"><span class="tw">${svg('i-tri-d',9,7)}</span>${esc(schPhaseLabel(g))}<span class="n">(${force?r.ts.length+'/':''}${g.tasks.length})</span>
        <span class="pg ${pc?'has':''}" title="${esc(`완료 ${pr.done} / 대상 ${pr.total}${pr.started?' · 진행 '+pr.started:''}\n`+SCH_PROGRESS_TIP)}"><span class="bar"><i style="width:${pc}%"></i></span>${pc}%</span><span class="add" data-sch="addtask" data-k="${g.code}" title="이 단계에 업무 추가">${svg('i-plus',9,9)}</span></div>`;
      const x1=Math.max(-20,Math.min(TW,(a-origin)*px)), x2=Math.max(0,Math.min(TW,(b-origin+1)*px)), w=Math.max(3,x2-x1), fin=D.fromDay(b);
      R+=`<div class="sg-sum ${w<52?'out':''}" style="left:${x1}px;top:${r.y+10}px;width:${w}px" data-sch="phase" data-k="${g.code}" title="${esc(schPhaseLabel(g))} · ${schD(D.fromDay(a))} → ${schD(fin)} · ${pc}%">${pc?`<i class="pc" style="width:${pc}%"></i>`:''}<em>${schD(fin)}</em></div>`;
      if(!r.open)for(const t of g.tasks)if(t.kind==='milestone'){const x=X(m.res.tasks[t.id].start);if(x>=0&&x<=TW)R+=`<i class="sg-dia ${P.isDone(t)?'done':''}" style="left:${x-3.5}px;top:${r.y+23}px" data-open="${schItemId(t.id)}" title="${esc(schTaskTitle(t))} · ${schD(m.res.tasks[t.id].start)}"></i>`;}
      continue; }
    const t=r.t, x=m.res.tasks[t.id], done=P.isDone(t), late=!done&&x.finish<today, id=schItemId(t.id), isSel=t.id===sel;
    L+=`<div class="sg-row tk ${isSel?'sel':''}" style="top:${r.y}px" data-open="${id}" data-row="${t.id}"><span class="bl"><i class="${t.kind==='milestone'?'ms':''}"></i></span><span class="nm" title="${esc(schTaskTitle(t))}"><b>${schWbs(t.wbs)})</b>${esc(t.name)}</span>${schPeople(t).length?avstack(schPeople(t),3):''}${done?'':schDdayHtml(x.finish,false)}<span class="fill"></span>
      <span class="rg">${t.kind==='milestone'?schD(x.start):schRange(x.start,x.finish)}</span><span class="st">${schStIcon(schStatus(t))}</span></div>`;
    if(isSel)R+=`<i class="band" style="top:${r.y}px;height:${r.h}px"></i>`;
    const x1=X(x.start), x2=X(x.finish)+px, tip=`${schTaskTitle(t)}\n예상 ${schD(x.start)} → ${schD(x.finish)}${t.kind==='milestone'?'':' ('+x.duration+'일)'} · ${schStatus(t)}${x.delta?`\n참조계획 대비 ${x.delta>0?'+':''}${x.delta}일`:''}${x.slack!==null?`\n운영개시 여유 ${x.slack}일`:''}`;
    r.x1=x1; r.x2=t.kind==='milestone'?x1:x2; r.cy=r.y+r.h/2;
    if(SCHU.ref){const a=X(t.referenceStart), b=X(t.referenceFinish)+px;R+=`<i class="sg-ref" style="left:${a}px;top:${r.y+r.h-5}px;width:${Math.max(3,b-a)}px" title="참조계획 ${schD(t.referenceStart)} → ${schD(t.referenceFinish)}"></i>`;}
    if(t.kind==='milestone'){ r.x1=x1-8; r.x2=x1+8; R+=`<i class="sg-msb ${done?'done':''} ${isSel?'sel':''}" style="left:${x1-7.5}px;top:${r.y+r.h/2-7.5}px" data-open="${id}" data-bar="${t.id}" title="${esc(tip)}"></i><span class="sg-tx ${isSel?'sel':''}" style="left:${x1+16}px;top:${r.y+6}px" data-open="${id}"><b>${schWbs(t.wbs)})</b>${esc(t.name)}</span>`; continue; }
    const w=Math.max(4,x2-x1), label=`<b>${schWbs(t.wbs)})</b>${esc(t.name)}`, inside=w>=58, slip=t.delay>0?Math.min(w-4,t.delay*px):0, prog=!done&&typeof t.progress==='number'?t.progress:(!done&&P.isStarted(t)?P.achievement(t,m.res,today):0);
    R+=`<div class="sg-bar ${done?'done':''} ${late?'late':''} ${isSel?'sel':''}" style="left:${x1}px;top:${r.y+6}px;width:${w}px" data-open="${id}" data-bar="${t.id}" title="${esc(tip)}">${inside?`<span class="lb">${label}</span>`:''}${slip>1?`<i class="slip" style="width:${slip}px" title="추가지연 ${t.delay}일"></i>`:''}${prog?`<i class="pc" style="width:${Math.round(prog*100)}%"></i>`:''}</div>`;
    if(!inside)R+=`<span class="sg-tx ${isSel?'sel':''}" style="left:${x1+w+7}px;top:${r.y+6}px" data-open="${id}">${label}</span>`; }
  if(SCHU.links){ for(const e of m.plan.dependencies){ const a=rowOf.get(e.from), b=rowOf.get(e.to); if(!a||!b||(!e.active&&e.from!==sel&&e.to!==sel))continue;
      const fromEnd=e.type==='FS'||e.type==='FF', toEnd=e.type==='FF'||e.type==='SF', c=schConnector(fromEnd?a.x2:a.x1,a.cy,toEnd?b.x2:b.x1,b.cy,e.type), hot=e.from===sel||e.to===sel;
      links+=`<path class="${hot?'hot':''} ${e.active?'':'off'}" d="${c.d}"/><path class="${hot?'hot':''}" d="${c.head}"/>${hot?`<circle cx="${fromEnd?a.x2:a.x1}" cy="${a.cy}" r="2"/>`:''}`; } }
  const nowX=today>=first&&today<=last?X(today)+px/2:-1;
  const crit=all.filter(t=>m.res.tasks[t.id].criticality==='critical').length;
  host.innerHTML=`<div class="sg-inner" style="width:${SG.left+TW+1}px"><div class="sg-head"><div class="sg-corner" style="width:${SG.left}px"><button data-sch="expand" data-k="1">모두 펼치기</button><button data-sch="expand" data-k="0">모두 접기</button></div><div class="sg-axis" style="left:${SG.left+1}px;width:${TW}px">${ax}</div></div>
    <div class="sg-body" style="height:${H}px"><div class="sg-left" style="width:${SG.left}px;height:${H}px">${L}</div>
    <div class="sg-right" style="left:${SG.left+1}px;width:${TW}px;height:${H}px">${R}${SCHU.today&&nowX>=0?`<i class="now" style="left:${nowX}px"></i>`:''}<svg class="sg-links" width="${TW}" height="${H}">${links}</svg></div></div></div>`;
  const foot=host.parentElement.querySelector('.sg-foot')||host.parentElement.appendChild(Object.assign(document.createElement('div'),{className:'sg-foot'}));
  foot.innerHTML=`<span>운영개시 예상 <b>${schD(m.res.operationDate)}</b>${m.res.operationDelay?` (목표 대비 ${m.res.operationDelay>0?'+':''}${m.res.operationDelay}일)`:''}</span><span>운영개시 경로 <b>${crit}</b>건</span><span>상태일 <b>${schD(m.plan.statusDate)}</b></span><span class="sp">${shown.length===all.length?`업무 ${all.length}건`:`업무 ${shown.length} / ${all.length}건`} · 관계 ${m.plan.dependencies.filter(e=>e.active).length}건</span>`;
  // where the view stands: the selected task, else today
  const key=pid+'|'+SCHU.scale+'|'+SCHU.phase; if(host._key!==key){host._key=key; const target=sel&&rowOf.get(sel)?rowOf.get(sel).x1:nowX; if(px>1.2&&target>=0)host.scrollLeft=Math.max(0,target-viewW*0.3);} }
function schMount(){ if(S.page!=='project'||!schHas(S.proj)||S.full)return; if($('#sch-gantt'))schGanttBuild(S.proj); if($('#sch-net'))schNetBuild(S.proj); }
function schRefresh(){ const el=$('[data-sec="sch-act"]'); if(!el||!schHas(S.proj))return; const keep=schKeepScroll(); el.innerHTML=schActionBody(S.proj); $$('#sch-actions .sch-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.k===SCHU.tab)); schMount(); schRestoreScroll(keep); schUiSave(); afterNav(); }
