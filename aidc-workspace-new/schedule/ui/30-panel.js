// A task in the right panel. The panel itself is the page's item panel (itemHtml): title, body, comments, files, versions.
// What is added here is the block between the title and the comments: the tabs 정보 / 연결된 액션 with the task's schedule fields.
// Since the owner's fourth round (2026-11-19) those fields can be changed only after 수정 was pressed, like everything else in
// the panel. A change still applies at once (schCommit / schSet, so the other views follow while editing); 취소 takes back what
// was changed in this edit (every such change carries the item's id as its tag: schEditCancel), 저장 keeps it.
const SCHP={tab:'info',more:false};
const schOwn=it=>!!(it&&it.own&&it.task&&schReady(it.proj)&&schModel(it.proj).byId.has(it.task));
function schTitleAttr(it){ if(!schOwn(it))return ''; const t=schModel(it.proj).byId.get(it.task); return ` data-wbs="${esc(schNo(t))}"`; }
const schChev=()=>svg('i-chev-d',8,4);
// rows the panel of an ordinary action gets in a project with a schedule: the phase and, if chosen, the task it belongs to
function schItemRows(it,E,V){ if(!it||it.type!=='action'||it.own||!schReady(it.proj)||archTabOf(it))return []; const m=schModel(it.proj), t=it.task&&m.byId.get(it.task), none=x=>`<span class="plain" style="color:#c4c4c4">${x}</span>`;
  const g=m.phases.find(x=>x.code===(t?t.phase:it.phase));
  const stage=E?schStageEdit(m,g,t,it)
    :(g?`<span class="sch-stage ro"><span>${esc(schPhaseLabel(g))}</span>${t?`<a data-open="${schItemId(t.id)}" title="이 업무 열기">${esc(schTaskTitle(t))}</a>`:''}</span>`:none('일정 미연결'));
  const rows=[V('개발 단계',stage,'sch-v')]; if(t){const r=m.res.tasks[t.id];rows.push(V('예상 기한',`<span class="plain">${t.kind==='milestone'?schD(r.start):schRange(r.start,r.finish)}</span>`,'sch-v'));} return rows; }
function schItemProps(it,E,full){ if(!schOwn(it))return null; const pid=it.proj, m=schModel(pid), A=AIDCSchedule, P=A.progress, t=m.byId.get(it.task), r=m.res.tasks[t.id], g=m.phases.find(x=>x.code===t.phase), ms=t.kind==='milestone'; E=!!it.editing;
  if(!it.editing&&it.title!==t.name&&!otherLock('item:'+it.id))it.title=t.name;   // the name of the task is the title of its panel
  const V=(k,inner,cls='')=>`<div class="pr"><span class="k">${k}</span><span class="v sch-v ${cls}">${inner}</span></div>`;
  const none=x=>`<span class="plain" style="color:#c4c4c4">${x}</span>`, f=(k,inner,title='')=>E?`<span class="sf-e" data-schp="f" data-k="${k}" ${title?`title="${esc(title)}"`:''}>${inner}</span>`:`<span class="sf-r">${inner}</span>`, ph=x=>`<i>${E?x:'-'}</i>`;
  const tabs=`<div class="sp-tabs"><button class="${SCHP.tab==='info'?'on':''}" data-schp="tab" data-k="info">정보</button><button class="${SCHP.tab==='links'?'on':''}" data-schp="tab" data-k="links">연결된 액션<small>${m.pred.get(t.id).length+m.succ.get(t.id).length||''}</small></button></div>`;
  if(SCHP.tab==='links')return `<div class="props sch-props ${E?'ed':''}"><div class="rcol" hidden></div>${tabs}${schLinksHtml(pid,m,t,full,E)}</div>`;
  const arrow=svg('i-sch-arr',11,8,'color:#4f4f4f;margin:0 2px'), done=P.isDone(t);
  const drv=r.drivers.map(d=>{const e=m.plan.dependencies.find(x=>x.id===d);if(e){const b=m.byId.get(e.from);return `${schNo(b)}) ${b.name} (${e.type}${e.lag?(e.lag>0?' +':' ')+e.lag+'일':''})`;}return d.startsWith('납기:')?'조달 납기 '+d.slice(3):d;});
  const moved=r.start!==t.plannedStart||r.finish!==t.plannedFinish, why='일정 계산 결과입니다.'+(drv.length?'\n결정 요인: '+drv.join(' · '):'')+(moved?`\n입력한 관리일정: ${schD(t.plannedStart)}${ms?'':' → '+schD(t.plannedFinish)}`:'');
  // one row for the dates (owner: 관리일정 and 예상 기한 said nearly the same): the forecast is shown, what is typed is the managed date behind it
  const dates=ms?f('plannedStart',schD(r.start),E?'눌러서 변경\n'+why:why):`<span class="sch-pair">${f('plannedStart',schD(r.start),E?'시작일 변경\n'+why:why)+arrow+(t.finishRule?`<span class="plain" title="검수 완료 후 ${t.finishRule.months}개월로 정해지는 기간입니다">${schDto(r.start,r.finish)}</span>`:f('plannedFinish',schDto(r.start,r.finish),E?'완료일 변경\n'+why:why))}</span>`;
  const refs=schRefs(pid,t.id);
  const L=[V('사업명',pill(proj(pid),'nosq').replace('class="pill',`data-go="project:${esc(pid)}" title="프로젝트 페이지로 이동" class="pill`)),
    V('예상 기한'+schInfo('dates'),dates+(done?'':schWhyMark(schDdayHtml(r.finish,false,schLateWhy(m,t)),E,'schp'))+(moved?`<em class="sch-mv" title="${esc(why)}">선행 업무 반영</em>`:'')),
    V('실제 기한',!E&&!t.actualStart&&!t.actualFinish?none('-'):`<span class="sch-pair">${f('actualStart',t.actualStart?schD(t.actualStart):ph('시작일'),'실제 시작일')+(ms?'':arrow+f('actualFinish',t.actualFinish?schDto(t.actualStart,t.actualFinish):ph('완료일'),'실제 완료일'))}</span>`),
    ...(t.why?[V('지연 사유',f('why',`<span class="plain wrap">${esc(t.why)}</span>`,'지연 사유 · 리스트의 ‘n일 지연’에 마우스를 올리면 보입니다'),'wide')]:[]),   // shown once there is one; it is entered through the "n일 지연" mark above (수정 first)
    V('개발 단계',E?`<span class="sch-stage"><span class="sf" data-schp="phase-move" title="다른 단계로 옮기기 · 새 단계 추가">${esc(schPhaseLabel(g))}${schChev()}</span><button type="button" class="wbno pick" data-schp="wbs-move" title="눌러서 이 단계 안의 다른 자리로 옮기기 · 그 뒤 번호는 한 칸씩 밀립니다">${esc(schNo(t))})</button></span>`:`<span class="sch-stage ro"><span>${esc(schPhaseLabel(g))}</span><span class="wbno">${esc(schNo(t))})</span></span>`),
    V('마일스톤',f('kind',`<span class="plain">${ms?'<i class="sch-ms" style="margin:0 7px 1px 1px"></i>예':'아니오'}</span>`,'마일스톤 여부')),
    V('참고 자료',`<span class="chips sl-refs">${refs.map(x=>`<span class="sl-ref">${chipFull(x)}${E?`<button data-schp="unref" data-k="${esc(x.id)}" title="연결 해제">${svg('i-x',7,7)}</button>`:''}</span>`).join('')}${E?'<span class="chip add" data-schp="addref">+ 미팅 · 리서치 연결</span>':(refs.length?'':none('없음'))}</span>`)];
  const ppl=schPeople(t);
  const R=[V('담당자',f('people',ppl.length?`<span class="people">${ppl.map(k=>`<span class="who" data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')}</span>`:emptyPerson(),'담당 멤버')),
    V('상태'+schInfo('status'),f('status',schStIcon(schStatus(t)))),V('중요도',f('pri',schPriHtml(m,t))),
    V('URL',t.url&&urlHref(t.url)?`<a class="url" href="${esc(urlHref(t.url))}" target="_blank" rel="noopener" data-stop>${esc(t.url)}</a>${E?`<button class="copy-url" data-schp="f" data-k="url" title="주소 변경">${schChev()}</button>`:''}`:f('url',ph('주소 입력')))];
  let more='';
  if(SCHP.more){ const txt=(k,label,p2)=>V(label,f(k,t[k]?`<span class="plain wrap">${esc(t[k])}</span>`:ph(p2)),'wide');
    more=`<div class="sp-more"><div>${V('운영개시 여유',`<span class="plain">${r.slack===null?'대상 외 (운영개시 경로 밖)':r.slack+'일'+(r.criticality==='critical'?' · 운영개시를 결정하는 경로':r.criticality==='near'?' · 근접':'')}</span>`)}${V('역할',`<span class="plain wrap">승인 ${esc((t.roles||{}).A||'-')} · 실행 ${esc((t.roles||{}).R||'-')} · 협의 ${esc((t.roles||{}).C||'-')}</span>`)}</div>
      <div class="rc">${txt('criteria','완료 기준','입력')}${txt('conditions','조건·확약','입력')}${txt('evidence','증빙','입력')}</div></div>`; }
  return `<div class="props sch-props ${E?'ed':''}">${tabs}<div class="sp-grid"><div>${L.join('')}</div><div class="rcol">${R.join('')}</div></div><button class="sp-toggle" data-schp="more">${SCHP.more?'일정 상세 접기':'일정 상세'} ${svg('i-chev-d',8,4,SCHP.more?'transform:rotate(180deg)':'')}</button>${more}</div>`; }

/* ---------- 연결된 액션: the tasks before and after this one, as a small chart in the middle of the panel ---------- */
const schRefs=(pid,taskId)=>(((SCHED[pid]||{})['c:'+taskId]||{}).ids||[]).map(id=>item(id)).filter(x=>x&&ITEMS.includes(x)&&isLive(x));
function schLinksHtml(pid,m,t,full,E){ const A=AIDCSchedule, pre=m.pred.get(t.id).slice().sort((a,b)=>m.byId.get(a.from).order-m.byId.get(b.from).order), suc=m.succ.get(t.id).slice().sort((a,b)=>m.byId.get(a.to).order-m.byId.get(b.to).order);
  // as wide as the panel (or the full page) allows
  const avail=full?Math.min(898,($('#item-pin')||{}).clientWidth||898):(parseFloat(getComputedStyle($('#app')).getPropertyValue('--panelw'))||1031.9)-236, W=Math.round(Math.max(560,Math.min(898,avail)));   // (the panel's side margins and its scroll bar: the chart used to stick out on the right of a narrow panel)
  // Only the sides that hold something take room, and what is drawn stands in the middle (owner, 2026-11-24: with nothing before
  // it the task stood in the middle and its followers were pushed to the right edge).
  const RH=34, n=Math.max(pre.length,suc.length,1), H=n*RH, cy=H/2, GAP=44, LW=Math.floor((W-2*GAP)*0.335), CW=W-2*GAP-2*LW, used=(pre.length?LW+GAP:0)+CW+(suc.length?GAP+LW:0), LX=Math.round((W-used)/2), CX=LX+(pre.length?LW+GAP:0), RX=CX+CW+GAP;
  const yOf=(i,k)=>(H-k*RH)/2+i*RH+RH/2; let sv='', h='';
  const node=(e,other,x,y,side)=>{const o=m.byId.get(other), lb=e.type+(e.lag?(e.lag>0?'+':'')+e.lag:'');
    return `<div class="sl-node ${e.active?'':'off'}" style="left:${x}px;top:${y-13}px;width:${LW}px" data-open="${schItemId(o.id)}" title="${esc(schTaskTitle(o)+'\n'+A.relationshipSentence(e.type,side==='pre'?o.name:t.name,side==='pre'?t.name:o.name)+(e.active?'':'\n(조건부 · 지금은 계산에 쓰지 않음)'))}"><b>${schNo(o)})</b><span>${esc(o.name)}</span>${E?`<button class="rel" data-schp="rel" data-k="${e.id}" title="관계 수정">${lb}</button>`:`<em class="rel">${lb}</em>`}</div>`;};
  const elbow=(x1,y1,x2,y2)=>{const mx=(x1+x2)/2, r=Math.min(6,Math.abs(y2-y1)/2), s=Math.sign(y2-y1);return y1===y2?`M${x1},${y1} L${x2},${y2}`:`M${x1},${y1} L${mx-r},${y1} Q${mx},${y1} ${mx},${y1+s*r} L${mx},${y2-s*r} Q${mx},${y2} ${mx+r},${y2} L${x2},${y2}`;};
  pre.forEach((e,i)=>{const y=yOf(i,pre.length);h+=node(e,e.from,LX,y,'pre');sv+=`<path class="${e.active?'':'off'}" d="${elbow(LX+LW,y,CX-1,cy)}" marker-end="url(#sl-arrow)"/>`;});
  suc.forEach((e,i)=>{const y=yOf(i,suc.length);h+=node(e,e.to,RX,y,'suc');sv+=`<path class="${e.active?'':'off'}" d="${elbow(CX+CW,cy,RX-1,y)}" marker-end="url(#sl-arrow)"/>`;});
  h+=`<div class="sl-node cur" style="left:${CX}px;top:${cy-13}px;width:${CW}px"><b>${schNo(t)})</b><span>${esc(t.name)}</span></div>`;
  return `<div class="sp-links"><div class="sl-wrap" style="width:${W}px"><div class="sl-map" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}"><defs><marker id="sl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1l6 3-6 3" fill="none" stroke="#4f4f4f" stroke-width="1.1"/></marker></defs>${sv}</svg>${h}</div>${pre.length||suc.length?'':'<div class="sl-none">이 업무와 선후 관계로 이어진 액션이 없습니다. 일정이나 관계도에서 막대·카드를 끌어다 놓으면 연결됩니다.</div>'}</div></div>`; }

/* ---------- changing a field (only while the panel is being edited) ---------- */
function schEditTask(pid,taskId,label,fn,quiet,noRedraw){ return schCommit(pid,d=>{const x=d.tasks.find(q=>q.id===taskId); if(x)fn(x,d);},label,quiet,noRedraw); }
// a change made from an open edit is tagged with the item, so that 취소 can take exactly those back
const schTagged=(it,fn)=>{ SCH.tag=it&&it.editing?it.id:''; try{return fn();}finally{SCH.tag='';} };
function schEditCancel(it){ if(!it)return; const mine=SCH.undo.filter(u=>u.tag===it.id); if(!mine.length)return; SCH.undo=SCH.undo.filter(u=>u.tag!==it.id);
  for(const u of mine.reverse()){ if(u.raw){const root=SCHED[u.pid]||(SCHED[u.pid]={});for(const [k,v] of Object.entries(u.before)){if(v===null)delete root[k];else root[k]=copy(v);}SCH.memo[u.pid]=null;} else{const keep=SCHU.scn;SCHU.scn=u.sc||'';schWrite(u.pid,u.before);SCHU.scn=keep;} }
  schRedraw(true); }
const schEditKeep=it=>{ if(it)for(const u of SCH.undo)if(u.tag===it.id)u.tag=''; };
// the number of a task that joins a phase: one more than the highest there; its place: after that phase's last task
function schMoveToPhase(d,x,code,label){ const inPh=d.tasks.filter(q=>q.phase===code&&q.id!==x.id), max=Math.max(0,...inPh.map(q=>Number(q.wbs.split('.')[1])||0)); x.phase=code; x.phaseLabel=inPh.length?inPh[0].phaseLabel:label; x.wbs=code+'.'+(max+1); { const shown=Math.max(0,...inPh.map(schNoOf))+1; if(shown!==max+1)x.no=shown; else delete x.no; }
  const sorted=d.tasks.filter(q=>q.id!==x.id).sort((p,q)=>p.order-q.order), last=inPh.length?Math.max(...inPh.map(q=>q.order)):Math.max(0,...sorted.filter(q=>q.phase.localeCompare(code,undefined,{numeric:true})<0).map(q=>q.order)), next=sorted.find(q=>q.order>last); x.order=next?(last+next.order)/2:last+1; }
// A phase can be renamed (any phase: the record ph:<code> carries the name; a phase of the workbook can be given its own name back)
// and, while it holds no task, removed (owner, 2026-11-23: "만든 거 수정도 할 수 있어야지"). Actions that stood in a removed phase
// keep its code and read "일정 미연결"; that is why a new phase never takes a number an action still carries (undo brings them back).
function schPhaseRename(pid,code,done){ const m=schModel(pid), g=m&&m.phases.find(x=>x.code===code); if(!g)return; const cur=(SCHED[pid]||{})['ph:'+code]||{}, was=schPhaseName(g.label);
  askInput(`${schPhaseNo(code)}) 단계 이름`,was,v=>{ v=(v||'').replace(/\s+/g,' ').trim(); if(!v||v===was)return;
    schSet(pid,'ph:'+code,{...cur,label:v,by:cur.by||sharedUser,at:cur.at||new Date().toISOString()},`${schPhaseNo(code)}) 단계 이름을 “${v}”(으)로 바꿨습니다`); if(done)done(code); }); }
function schPhaseDelete(pid,code,done){ const m=schModel(pid), g=m&&m.phases.find(x=>x.code===code); if(!g)return; const A=AIDCSchedule, n=g.tasks.length, na=liveItems('action',pid).filter(i=>!i.own&&!i.task&&i.phase===code).length;
  if(schScenario(pid)){toast('시나리오를 보는 중에는 단계를 지울 수 없습니다.',3200);return;}
  // a phase that holds tasks goes with them (owner, 2026-11-24: an x on every phase); the question says how many, one undo brings all back
  confirmDlg(`“${schPhaseLabel(g)}” 단계를 삭제할까요?${n?` 이 단계의 액션 ${n}건과 거기에 걸린 관계도 함께 지워집니다.`:''}${na?` 이 단계에 둔 일반 액션 ${na}건은 ‘일정 미연결’로 남습니다.`:''} (삭제 뒤 알림의 ‘되돌리기’로 되살릴 수 있습니다)`,[{t:'삭제',pri:true,fn:()=>{
    const label=`${schPhaseLabel(g)} 단계를 삭제했습니다`, u0=SCH.undo.length;
    if(n&&!schCommit(pid,d=>A.removeTasks(d,g.tasks.map(t=>t.id)),'',true,true))return;
    if(SCHU.phase===code)SCHU.phase=''; SCHU.open=SCHU.open.filter(c=>c!==code); if(g.tasks.some(t=>t.id===SCHU.sel))SCHU.sel='';
    if((SCHED[pid]||{})['ph:'+code]!==undefined)schSet(pid,'ph:'+code,null);
    schUndoJoin(pid,u0,label); toast(label,5200,{t:'되돌리기',fn:schUndo,keep:true}); schRedraw(true); if(done)done(code,true); }},{t:'취소',fn:()=>{}}]); }
// The undo steps made since `from` become one (a phase with its tasks, the actions that got their numbers together).
function schUndoJoin(pid,from,label){ const parts=SCH.undo.splice(from); if(!parts.length)return; if(parts.length===1||parts.some(u=>u.sc)){ parts[parts.length-1].label=label; SCH.undo.push(...parts); return; }
  const one={pid,sc:'',raw:true,before:{},after:{},label,tag:''}; for(const u of parts){ for(const k of Object.keys(u.before))if(!(k in one.before))one.before[k]=u.before[k]; Object.assign(one.after,u.after); } SCH.undo.push(one); }
// what a phase picker offers for the phase that is chosen now; a phase of the workbook that was renamed can have its name back
function schPhaseEditItems(pid,m,g,after,withDel){ if(!g)return []; const rec=(SCHED[pid]||{})['ph:'+g.code], src=((SCH.base[pid]||{}).tasks||[]).find(t=>t.phase===g.code), own=src&&src.phaseLabel, out=['-',{t:`“${schPhaseLabel(g)}” 이름 바꾸기`,k:'ph-ren',fn:()=>schPhaseRename(pid,g.code,after)}];
  if(rec&&rec.label&&own&&schPhaseName(own)!==schPhaseName(rec.label))out.push({t:`원래 이름으로 (${schPhaseName(own)})`,k:'ph-reset',fn:()=>{schSet(pid,'ph:'+g.code,null,`${schPhaseNo(g.code)}) 단계 이름을 되돌렸습니다`);if(after)after(g.code);}});
  if(withDel)out.push({t:`“${schPhaseLabel(g)}” 단계 삭제`,k:'ph-del',danger:true,fn:()=>schPhaseDelete(pid,g.code,after)});
  return out; }
// The numbers of a phase as they show, and a task put before another one of its phase: it takes that one's number, that one
// and those after it move one up (as far as the numbers run on without a gap), and it stands there in the order of the plan too.
// `pull`: the task had a place in this phase already; what stood after it closes up first. No `beforeId`: the end of the phase.
const schNextNo=(m,code)=>Math.max(0,...m.plan.tasks.filter(t=>t.phase===code).map(schNoOf))+1;
const schAtNo=(m,code,it)=>{ const at=it&&it.wbsAt&&m.byId.get(it.wbsAt); return at&&at.phase===code?schNoOf(at):schNextNo(m,code); };
function schPutBefore(d,x,beforeId,pull){ const set=(t,n)=>{ if(n===schKeyNo(t))delete t.no; else t.no=n; }, peers=()=>d.tasks.filter(t=>t.phase===x.phase&&t.id!==x.id).sort((a,b)=>schNoOf(a)-schNoOf(b)||a.order-b.order);
  if(pull){ let k=schNoOf(x); for(const t of peers()){ const v=schNoOf(t); if(v<=k)continue; if(v>k+1)break; set(t,v-1); k=v; } }
  const ps=peers(), at=beforeId?ps.find(t=>t.id===beforeId):null, all=d.tasks.filter(t=>t.id!==x.id).sort((a,b)=>a.order-b.order);
  if(!at){ set(x,Math.max(0,...ps.map(schNoOf))+1); if(pull&&ps.length){ const last=ps.reduce((a,b)=>b.order>a.order?b:a), nx=all[all.indexOf(last)+1]; x.order=nx?(last.order+nx.order)/2:last.order+1; } return; }
  const n=schNoOf(at); let k=n; for(const t of ps){ const v=schNoOf(t); if(v<k)continue; if(v>k)break; set(t,v+1); k=v+1; }
  set(x,n); const prev=all[all.indexOf(at)-1]; x.order=prev?(prev.order+at.order)/2:at.order-1; }
// The picker of a place: the actions of the phase with their numbers; a press puts the action before that row.
function schNoPick(el,m,code,selfId,cur,pick,label){ const g=m.phases.find(x=>x.code===code); if(!g)return; const self=selfId&&m.byId.get(selfId), list=g.tasks.filter(t=>t.id!==selfId).sort((a,b)=>schNoOf(a)-schNoOf(b)||a.order-b.order), top=Math.max(0,...list.map(schNoOf));
  // The action itself is a row of the list too, at the place it has (or will get): it is pulled to another place (owner, 2026-11-24:
  // "순서 변경 드래그해서 옮길 수 있게, 애니메이션까지"); a press on another row still puts it before that one.
  // every row shows the number it has with the action standing where it stands now: for a new action the rows after it are one up already
  const at=cur?list.findIndex(t=>t.id===cur):-1, i0=at<0?list.length:at, seq=(self?list.concat(self):list).map(schNoOf).sort((x,y)=>x-y); if(!self)seq.push(top+1);
  const vis=list.slice(); vis.splice(i0,0,null); const lab=k=>esc(schWbs(code+'.'+seq[k]));
  // Before the place is taken a window asks once more (owner, 2026-11-24: "자리 옮길 때 옮길 거냐고 물어봐"): from which number to
  // which; 취소 leaves everything as it was. The same for a row that was pressed and for a row that was pulled.
  const name=self?self.name:(label||'이 액션'), take=pick; pick=beforeId=>{ const j=beforeId?list.findIndex(t=>t.id===beforeId):list.length; if(j<0||j===i0)return;
    const from=schWbs(code+'.'+seq[i0]), to=schWbs(code+'.'+seq[j>i0?j-1:j]);
    confirmDlg(self?`“${name}” 액션을 ${from} 자리에서 ${to} 자리로 옮길까요? 그 사이 번호는 한 칸씩 밀립니다.`:`“${name}” 액션을 ${from} 대신 ${to} 자리에 넣을까요? 저장하면 그 뒤 번호는 한 칸씩 밀립니다.`,[{t:'옮기기',pri:true,fn:()=>take(beforeId)},{t:'취소',fn:()=>{}}]); };
  const rows=vis.map((t,k)=>t?{k:t.id,html:`<b class="no">${lab(k)})</b><span class="phn">${esc(t.name)}</span>`,fn:()=>pick(t.id)}:{k:'self',cls:'self',html:`<i class="grip" aria-hidden="true"></i><b class="no">${lab(k)})</b><span class="phn">${esc(self?self.name:(label||'이 액션'))}</span>`});
  const pop=menuPop(el,[{hd:'들어갈 자리 · 초록 줄을 끌어서 옮기거나 다른 줄을 누르면 그 앞으로 들어갑니다. 뒤 번호는 한 칸씩 밀립니다'}].concat(rows,i0<list.length?[{k:'end',cls:'end',html:`<b class="no"></b><span class="phn">맨 뒤로 보내기</span>`,fn:()=>pick('')}]:[]),{cls:'sch-nopick'});
  { const s=pop.querySelector('.it[data-k="self"]'), e2=pop.querySelector('.it[data-k="end"]'); if(s){s.classList.add('self');s.title='끌어서 자리 옮기기';} if(e2)e2.classList.add('end'); if(s&&s.scrollIntoView)s.scrollIntoView({block:'nearest'}); }
  schNoDrag(pop,pick); return pop; }
// Pulling the own row of that menu: it follows the pointer, the rows it passes slide out of its way and every row shows the number
// it would get; let go, it settles and the place is taken (the row it now stands before, or the end). A pull of less than 4 px is
// a press and does nothing. The menu scrolls when the pointer nears its upper or lower edge.
function schNoDrag(pop,pick){ const self=pop.querySelector('.it.self'); if(!self)return; let d=null, eat=false;
  const others=()=>[...pop.querySelectorAll('.it[data-k]')].filter(x=>x!==self&&!x.classList.contains('end'));
  const place=()=>{ const dy=d.y-d.y0+(pop.scrollTop-d.s0), j=Math.max(0,Math.min(d.n-1,Math.round(d.i0+dy/d.h))); self.style.transform=`translateY(${dy}px)`; if(j===d.j)return; d.j=j;
    d.rest.forEach((r,k)=>{ const idx=k<d.i0?k:k+1, sh=idx>d.i0&&idx<=j?-d.h:idx<d.i0&&idx>=j?d.h:0; r.style.transform=sh?`translateY(${sh}px)`:''; });
    const order=d.rest.slice(); order.splice(j,0,self); order.forEach((r,k)=>{ const b=r.querySelector('.no'); if(b)b.textContent=d.nos[k]; }); };
  const edge=()=>{ if(!d)return; const r=pop.getBoundingClientRect(), v=d.y<r.top+26?-7:d.y>r.bottom-26?7:0; if(v){ const was=pop.scrollTop; pop.scrollTop+=v; if(pop.scrollTop!==was)place(); } d.raf=requestAnimationFrame(edge); };
  self.addEventListener('pointerdown',e=>{ if(e.button||d)return; e.preventDefault(); const rest=others(), all=[...pop.querySelectorAll('.it[data-k]')].filter(x=>!x.classList.contains('end')), i0=all.indexOf(self), h=self.getBoundingClientRect().height;
    d={y0:e.clientY,y:e.clientY,s0:pop.scrollTop,i0,j:i0,n:all.length,h,rest,nos:all.map(r=>(r.querySelector('.no')||{}).textContent||''),moved:false,id:e.pointerId}; try{self.setPointerCapture(e.pointerId);}catch(_){} });
  self.addEventListener('pointermove',e=>{ if(!d||e.pointerId!==d.id)return; d.y=e.clientY; if(!d.moved){ if(Math.abs(d.y-d.y0)<4)return; d.moved=true; pop.classList.add('dragging'); self.classList.add('drag'); d.raf=requestAnimationFrame(edge); } place(); });
  const done=e=>{ if(!d||e.pointerId!==d.id)return; const x=d; d=null; cancelAnimationFrame(x.raf); try{self.releasePointerCapture(x.id);}catch(_){} if(!x.moved)return; eat=true; setTimeout(()=>{eat=false;},400);
    self.classList.add('drop'); self.style.transform=`translateY(${(x.j-x.i0)*x.h}px)`;
    const next=x.rest[x.j], before=next?next.dataset.k:''; if(e.type==='pointercancel'||x.j===x.i0){ setTimeout(()=>{ pop.classList.remove('dragging'); self.classList.remove('drag','drop'); self.style.transform=''; x.rest.forEach(r=>{r.style.transform='';}); [...pop.querySelectorAll('.it[data-k]')].filter(r=>!r.classList.contains('end')).forEach((r,k)=>{const b=r.querySelector('.no');if(b)b.textContent=x.nos[k];}); },170); return; }
    setTimeout(()=>{ closePop(); pick(before); },html.classList.contains('mp-calm')?0:190); };
  const html=document.documentElement; self.addEventListener('pointerup',done); self.addEventListener('pointercancel',done);
  pop.addEventListener('click',e=>{ const it=e.target.closest('.it'); if(eat||(it&&it===self)){ e.stopPropagation(); e.preventDefault(); } },true); }
// The list of phases of a picker: a press chooses one; the x of a row removes that phase; below it "new" and the rename of the chosen one.
function schPhasePick(el,pid,m,sel,pick,after){ const p=menuPop(el,m.phases.map(g=>({k:g.code,sel:sel===g.code,html:`<span class="phn">${esc(schPhaseLabel(g))}</span><button type="button" class="phx" data-phx="${esc(g.code)}" title="이 단계 삭제" aria-label="${esc(schPhaseLabel(g))} 단계 삭제">${svg('i-x',8,8)}</button>`,fn:()=>pick(g.code,g.label)}))
    .concat(['-',{t:'＋ 새 단계 추가',k:'new',fn:()=>schNewPhase(pid,m,(code,label)=>pick(code,label))}],schPhaseEditItems(pid,m,m.phases.find(g=>g.code===sel),after)),{cls:'sch-phpick'});
  p.addEventListener('click',e=>{ const x=e.target.closest('[data-phx]'); if(!x)return; e.stopPropagation(); e.preventDefault(); closePop(); schPhaseDelete(pid,x.dataset.phx,after); },true); return p; }
// 개발 단계 of an action that is not a task yet, while it is edited: the same as a task's row (the phase, the number beside it) with an x that
// takes the phase off again. An action that hangs under a task from before shows that task instead of the number.
const schStageEdit=(m,g,t,it)=>`<span class="sch-stage"><span class="sf" data-schp="link-phase" title="단계를 고르면 그 단계의 WBS 번호를 받아 액션 일정 · 리스트 · 관계도에 올라갑니다">${g?esc(schPhaseLabel(g)):'단계 선택'}${schChev()}</span>${t?`<a class="wbno up" data-open="${schItemId(t.id)}" title="이 업무 아래에 붙어 있습니다 · 눌러서 열기">↳ ${esc(schTaskTitle(t))}</a>`:g?`<button type="button" class="wbno auto" data-schp="wbs-at" title="저장하면 받는 WBS 번호 · 눌러서 들어갈 자리를 고르면 그 뒤 번호는 한 칸씩 밀립니다">${esc(schWbs(g.code+'.'+schAtNo(m,g.code,it)))})</button>`:''}${g||t?`<button class="x" data-schp="unlink" title="${t?'업무 연결 해제':'개발 단계 지우기'}">${svg('i-x',8,8)}</button>`:''}</span>`;
function schNewPhase(pid,m,done){ askInput('새 개발 단계 이름','',v=>{ v=(v||'').trim(); if(!v)return; const no=Math.max(0,...m.phases.map(g=>Number(schPhaseNo(g.code))||0),...ITEMS.filter(i=>i.proj===pid&&i.phase).map(i=>Number(schPhaseNo(i.phase))||0))+1, code='W'+no; schSet(pid,'ph:'+code,{label:v,by:sharedUser,at:new Date().toISOString()},`${no}) ${v} 단계를 추가했습니다`); done(code,v); }); }
function schFieldEdit(el,it){ const pid=it.proj, m=schModel(pid), A=AIDCSchedule, D=A.dates, t=m.byId.get(it.task), r=m.res.tasks[t.id], k=el.dataset.k, id=t.id, name=schNo(t), ms=t.kind==='milestone';
  const edit=(label,fn)=>schTagged(it,()=>schEditTask(pid,id,`${name} ${label}`,fn));
  // what moves the schedule (dates, state, kind) says so in the card of the gantt, with 되돌리기
  const editCard=(label,fn,want)=>{ const snap=schSnap(pid); if(schTagged(it,()=>schEditTask(pid,id,`${name} ${label}`,fn,true)))schChangeCard(pid,snap,{title:`${name} ${label}`,focus:id,want:want||null}); };
  // a change of dates is shown first and saved by 적용 (owner, 2026-11-23), as a change of relations is; saved, it is tagged like every change of this edit
  const askDates=(label,note,fn,want)=>schProposeDates(pid,{task:id,title:`${name} ${label}`,label:`${name} ${label}`,note,want:want||null,mutate:d=>{const x=d.tasks.find(q=>q.id===id);if(x)fn(x,d);},commit:()=>schTagged(it,()=>schEditTask(pid,id,`${name} ${label}`,fn))});
  if(k==='plannedStart'){datePick(el,t.plannedStart,v=>{if(!v||v===t.plannedStart)return;askDates('일정 변경',`시작일 ${schD(t.plannedStart)} → ${schD(v)}`,x=>{const len=D.diffDays(x.plannedFinish,x.plannedStart);x.plannedStart=v;if(ms)x.plannedFinish=v;else if(!x.finishRule&&x.plannedFinish<v)x.plannedFinish=D.addDays(v,len);},v);});return;}
  if(k==='plannedFinish'){datePick(el,t.plannedFinish,v=>{if(v&&v!==t.plannedFinish)askDates('일정 변경',`완료일 ${schD(t.plannedFinish)} → ${schD(v)}`,x=>{x.plannedFinish=v;});},{min:t.plannedStart});return;}
  if(k==='actualStart'){datePick(el,t.actualStart||r.start,v=>{if((v||null)===(t.actualStart||null))return;askDates(v?'실제 시작일 입력':'실제 시작일 지움',v?`실제 시작일 ${schD(v)}`:'실제 시작일을 지웁니다.',x=>{x.actualStart=v||null;if(!v){x.actualFinish=null;if(x.status==='완료'||x.status==='진행')x.status='계획';}else{if(ms){x.actualFinish=v;x.status='완료';}else{if(x.actualFinish&&x.actualFinish<v)x.actualFinish=v;if(x.status!=='완료')x.status='진행';}}});},{clear:'실제 시작 없음'});return;}
  if(k==='actualFinish'){datePick(el,t.actualFinish||(r.finish<schToday()?r.finish:schToday()),v=>{if((v||null)===(t.actualFinish||null))return;askDates(v?'실제 완료일 입력':'실제 완료일 지움',v?`실제 완료일 ${schD(v)}`:'실제 완료일을 지웁니다.',x=>{if(!v){x.actualFinish=null;if(x.status==='완료')x.status='진행';return;}if(!x.actualStart||x.actualStart>v)x.actualStart=r.start<=v?r.start:v;x.actualFinish=v;x.status='완료';x.remaining=null;});},{min:t.actualStart||undefined,clear:'실제 완료 없음'});return;}
  if(k==='status'){menuPop(el,SCH_STATUSES.map((s,i)=>({t:s,html:schStIcon(s),k:'s'+i,sel:schStatus(t)===s,fn:()=>editCard('상태: '+s,x=>{const today=schToday();x.status=s;
      if(s==='완료'){if(!x.actualStart)x.actualStart=r.start<=today?r.start:today;if(!x.actualFinish)x.actualFinish=ms?x.actualStart:(today>=x.actualStart?today:x.actualStart);x.remaining=null;}
      else{x.actualFinish=null;if(s==='진행'&&!x.actualStart&&!ms)x.actualStart=r.start<=today?r.start:today;if(s==='계획'||s==='확인 전'||s==='조건부 미발동'){x.actualStart=null;x.remaining=null;}}})})),{cls:'sch-colmenu'});return;}
  if(k==='pri'){menuPop(el,[['high','높음'],['mid','중간'],['low','낮음']].map(x=>({t:x[1],html:`<span class="pri pri-${x[0]}">${x[1]}</span>`,k:x[0],sel:t.pri===x[0],fn:()=>edit('중요도: '+x[1],q=>{q.pri=x[0];})})).concat(['-',{t:'자동 (일정 여유 기준)',k:'auto',sel:!t.pri,fn:()=>edit('중요도 자동',q=>{delete q.pri;})}]),{cls:'sch-colmenu'});return;}
  if(k==='people'){const cur=schPeople(t);menuPop(el,[{hd:'담당 멤버'}].concat(Object.keys(PEOPLE).map(u=>({t:PEOPLE[u],k:u,ico:av('av15'),sel:cur.includes(u),fn:()=>edit('담당자 변경',q=>{const now=schPeople(q);const nx=now.includes(u)?now.filter(z=>z!==u):now.concat(u);if(nx.length)q.people=nx;else delete q.people;})}))),{multi:true,cls:'multi'});return;}
  if(k==='url'){askInput('URL',t.url||'',v=>{v=(v||'').trim();edit(v?'URL 입력':'URL 지움',q=>{if(v)q.url=v;else delete q.url;});});return;}
  if(k==='kind'){ if(t.finishRule){toast('검수 완료 후 개월 수로 정해지는 업무는 마일스톤으로 바꿀 수 없습니다.',3600);return;}
    menuPop(el,[{t:'아니오 (기간이 있는 업무)',k:'n',sel:!ms,fn:()=>{if(ms)editCard('일반 업무로 변경',x=>{x.kind='task';});}},{t:'예 (하루짜리 기준점)',k:'y',ico:'<i class="sch-ms" style="margin:0 8px 1px 1px"></i>',sel:ms,fn:()=>{if(!ms)editCard('마일스톤으로 변경',x=>{x.kind='milestone';x.plannedFinish=x.plannedStart;if(x.actualStart)x.actualFinish=x.actualStart;});}}]);return;}
  if(k==='why'){askInput('지연 사유',t.why||'',v=>edit('지연 사유 입력',q=>{q.why=(v||'').replace(/\s+/g,' ').trim();}));return;}
  if(k==='criteria'||k==='conditions'||k==='evidence'){const lb={criteria:'완료 기준',conditions:'조건·확약',evidence:'증빙'}[k];askInput(lb,t[k]||'',v=>edit(lb+' 수정',q=>{q[k]=(v||'').trim();}));return;} }
// what can be done with one relation: its kind, its gap, leaving it out of the calculation, deleting it
function schRelMenu(el,pid,relId){ const m=schModel(pid), A=AIDCSchedule, rel=m&&m.plan.dependencies.find(x=>x.id===relId); if(!rel)return; const a=m.byId.get(rel.from), b=m.byId.get(rel.to), nm=`${schNo(a)} → ${schNo(b)}`;
  // every change of a relation is shown with its effect first and saved by 확인 (schPropose)
  const ch=(title,note,label,fn,gone)=>schPropose(pid,{kind:'change',from:rel.from,to:rel.to,title,note,label,gone,mutate:d=>{const x=d.dependencies.find(q=>q.id===rel.id);if(x)fn(x,d);}});
  menuPop(el,[{hd:`${nm} 관계`}].concat(['FS','SS','FF','SF'].map(ty=>({t:ty+' · '+A.relationshipNames[ty],k:ty,sel:rel.type===ty,fn:()=>{if(rel.type!==ty)ch('관계 유형 변경',`${rel.type} → ${ty} · `+A.relationshipSentence(ty,a.name,b.name),'관계 유형 '+ty,x=>{x.type=ty;});}})),['-',
    {t:'간격 '+(rel.lag?(rel.lag>0?'+':'')+rel.lag+'일':'없음')+' · 변경…',k:'lag',fn:()=>askInput('간격 (일) · 음수는 앞당김',String(rel.lag||0),v=>{const n=Math.round(Number(v));if(!Number.isFinite(n)||Math.abs(n)>36500){toast('정수를 입력하세요.');return;}if(n!==(rel.lag||0))ch('관계 간격 변경',`간격 ${rel.lag||0}일 → ${n}일`,'관계 간격 '+n+'일',x=>{x.lag=n;});})},
    {t:rel.active?'계산에서 빼기 (조건부)':'계산에 다시 쓰기',k:'act',fn:()=>ch(rel.active?'관계 사용 중지':'관계 다시 사용',rel.active?'이 관계를 일정 계산에서 뺍니다 (선은 점선으로 남습니다).':'이 관계를 일정 계산에 다시 씁니다.',rel.active?'관계 사용 중지':'관계 다시 사용',x=>{x.active=!x.active;},rel.active)},
    {t:'두 업무 보기',k:'see',fn:()=>{SCHU.sel=b.id;openPanel(schItemId(b.id));}},
    {t:'관계 삭제',k:'del',danger:true,fn:()=>schPropose(pid,{kind:'change',from:rel.from,to:rel.to,title:'관계 삭제',note:`${nm} 관계를 지웁니다.`,label:`${nm} 관계 삭제`,gone:true,mutate:d=>{d.dependencies=d.dependencies.filter(q=>q.id!==rel.id);}})}])); }
// a list of tasks to choose from (linking an action); extra: entries above the list
function schTaskMenu(el,m,title,filter,pick,extra){ const p=openPop(el,`<div style="padding:6px 6px 4px"><input id="sch-tm-q" placeholder="WBS 또는 업무명 검색"></div><div class="hd">${esc(title)}</div>${(extra||[]).map((x,i)=>`<div class="it ex" data-x="${i}">${esc(x.t)}</div>`).join('')}<div class="sch-tm"></div>`,{cls:'link'}); const box=p.querySelector('.sch-tm'), inp=p.querySelector('#sch-tm-q');
  const draw=()=>{const q=inp.value.trim();const list=m.plan.tasks.filter(t=>filter(t)&&(!q||matchQ(q,t.name,schWk(t),schNo(t)))).slice(0,60);box.innerHTML=list.map(t=>`<div class="it" data-t="${t.id}"><b style="font-weight:600;min-width:38px">${schNo(t)}</b>${esc(t.name)}</div>`).join('')||'<div class="msg">맞는 업무가 없습니다.</div>';};
  draw(); inp.oninput=draw; inp.focus(); p.addEventListener('click',e=>{const ex=e.target.closest('.it.ex');if(ex){e.stopPropagation();closePop();extra[+ex.dataset.x].fn();return;}const x=e.target.closest('.it[data-t]');if(!x)return;e.stopPropagation();closePop();pick(x.dataset.t);}); }
// meetings and research notes to hang on a task: the search field first, then the list
function schRefMenu(el,it,pid,t){ const cur=((SCHED[pid]||{})['c:'+t.id]||{}).ids||[], all=ITEMS.filter(i=>(i.type==='meeting'||i.type==='research')&&isLive(i)&&!cur.includes(i.id)).sort(newestFirst), short=x=>{x=(x||'제목 없음').split('\n').join(' ');return x.length>38?x.slice(0,38)+'…':x;};
  const p=openPop(el,`<div style="padding:6px 6px 4px"><input id="sch-rf-q" placeholder="미팅 · 리서치 검색"></div><div class="hd">미팅 · 리서치 연결</div><div class="sch-tm"></div>`,{cls:'link'}), box=p.querySelector('.sch-tm'), inp=p.querySelector('#sch-rf-q');
  const draw=()=>{const q=inp.value.trim();box.innerHTML=all.filter(i=>!q||matchQ(q,i.title,proj(i.proj).tag)).slice(0,60).map(i=>`<div class="it" data-r="${esc(i.id)}"><b style="font-weight:600;min-width:46px;color:#8e8e8e">${i.type==='meeting'?'미팅':'리서치'}</b>${esc(short(i.title))}</div>`).join('')||'<div class="msg">맞는 자료가 없습니다.</div>';};
  draw(); inp.oninput=draw; inp.focus(); p.addEventListener('click',e=>{const x=e.target.closest('.it[data-r]');if(!x)return;e.stopPropagation();closePop();schTagged(it,()=>schSet(pid,'c:'+t.id,{ids:cur.concat(x.dataset.r)},'참고 자료를 연결했습니다'));}); }
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-schp]'); if(!el)return; const it=curItem(); if(!it)return;
  if(el.dataset.schp==='atab'){ SCHP.tab=el.dataset.k; rerenderItem(it.id); return; }   // the tabs of an ordinary action (it may have no project yet)
  if(el.dataset.schp==='more'&&!schOwn(it)){ SCHP.more=!SCHP.more; rerenderItem(it.id); return; }   // "일정 상세" of an ordinary action
  if(!schReady(it.proj))return; const k=el.dataset.schp, pid=it.proj, m=schModel(pid), A=AIDCSchedule;
  if(k==='tab'){SCHP.tab=el.dataset.k;if(it.editing)schPropsRefresh(it);else rerenderItem(it.id);return;}
  if(k==='more'){SCHP.more=!SCHP.more;if(it.editing&&schOwn(it))schPropsRefresh(it);else rerenderItem(it.id);return;}
  // an ordinary action: the phase and the task it belongs to (part of its own edit, saved with 저장). A phase alone is enough; a new phase or a new task can be made here.
  if(k==='wbs-at'){ if(!canEditItem(it)||schOwn(it)||!it.phase)return; e.stopPropagation(); const at=it.wbsAt&&m.byId.get(it.wbsAt);   // where a new action goes in its phase
    schNoPick(el,m,it.phase,'',at&&at.phase===it.phase?at.id:'',id=>{ if(id)it.wbsAt=id; else delete it.wbsAt; it.dirty=true; rerenderItem(it.id); },(it.title||'').split('\n').join(' ').trim()||'새 액션'); return; }
  if(k==='link-phase'||k==='link-task'){ if(!canEditItem(it))return; e.stopPropagation(); const cur=it.task&&m.byId.get(it.task), again=()=>{it.dirty=true;rerenderItem(it.id);};
    const setPhase=code=>{ if(it.phase!==code)delete it.wbsAt; it.phase=code; if(cur&&cur.phase!==code)delete it.task; again(); };
    if(k==='link-phase'){ schPhasePick(el,pid,m,(cur?cur.phase:it.phase)||'',code=>setPhase(code),(code,gone)=>{if(gone&&it.phase===code)delete it.phase;again();}); return; }
    const ph=(cur&&cur.phase)||it.phase||'', g=ph&&m.phases.find(x=>x.code===ph), extra=[];
    if(g){ if(it.task)extra.push({t:`${schPhaseLabel(g)} 단계에만 두기 (업무 선택 해제)`,fn:()=>{delete it.task;again();}});
      extra.push({t:`＋ ${schPhaseNo(g.code)}) 단계에 새 업무 추가`,fn:()=>askInput('새 업무 이름','',v=>{v=(v||'').trim();if(!v)return;let nid='';if(schCommit(pid,d=>{const x=A.newTask(d,g.code);x.name=v;x.phaseLabel=g.label;x.plannedStart=x.referenceStart=it.date||schToday();x.plannedFinish=x.referenceFinish=A.dates.addDays(x.plannedStart,4);schMoveToPhase(d,x,g.code,g.label);d.tasks.push(x);nid=x.id;},`${v} 업무를 추가했습니다`)){it.task=nid;it.phase=g.code;again();}})}); }
    schTaskMenu(el,m,g?'업무 선택 · '+schPhaseLabel(g):'업무 선택',t=>!ph||t.phase===ph,id=>{it.task=id;it.phase=m.byId.get(id).phase;again();},extra); return; }
  if(k==='unlink'){ if(!canEditItem(it))return; delete it.task; delete it.phase; delete it.wbsAt; it.dirty=true; rerenderItem(it.id); return; }
  if(!schOwn(it))return; const t=m.byId.get(it.task);
  // the trash of a task's panel deletes the task (with what hangs on it); it can be taken back from the toast
  if(k==='del'){e.stopPropagation();confirmDlg(`“${schTaskTitle(t)}” 업무를 삭제할까요? 이 업무에 걸린 관계도 함께 지워집니다. (삭제 뒤 알림의 ‘되돌리기’로 되살릴 수 있습니다)`,[{t:'삭제',pri:true,fn:()=>{const was=it.editing;if(was)revertItem(it);closePanel(true);schCommit(pid,d=>A.removeTasks(d,[t.id]),schNo(t)+' 업무 삭제');}},{t:'취소',fn:()=>{}}]);return;}
  if(!it.editing)return;   // everything below changes the task: only after 수정
  if(k==='f'){e.stopPropagation();schFieldEdit(el,it);return;}
  if(k==='wbs-move'){ e.stopPropagation(); const g=m.phases.find(x=>x.code===t.phase), rest=g?g.tasks.filter(x=>x.id!==t.id).sort((a,b)=>schNoOf(a)-schNoOf(b)||a.order-b.order):[], nx=rest.find(x=>schNoOf(x)>schNoOf(t));
    if(!rest.length){toast('이 단계에 다른 액션이 없습니다.',2800);return;}
    schNoPick(el,m,t.phase,t.id,nx?nx.id:'',id=>{ if(id===(nx?nx.id:''))return; const was=schNo(t);
      if(schTagged(it,()=>schEditTask(pid,t.id,'',(x,d)=>schPutBefore(d,x,id,true),true))){ const now=schNo(schModel(pid).byId.get(t.id)); toast(`${was} → ${now} · 그 사이 번호가 한 칸씩 옮겨졌습니다`,4200); schPropsRefresh(it); } }); return; }
  if(k==='phase-move'){ e.stopPropagation(); if(t.wbs==='W8.6'){toast('운영개시 기준 업무는 다른 단계로 옮길 수 없습니다.',3600);return;}
    const move=(code,label)=>{ const snap=schSnap(pid), ttl=`${schNo(t)} 단계 이동`; if(schTagged(it,()=>schEditTask(pid,t.id,ttl,(x,d)=>schMoveToPhase(d,x,code,label),true)))schChangeCard(pid,snap,{title:ttl,focus:t.id,note:`${schPhaseNo(code)}) ${schPhaseName(label)} 단계로 옮겼습니다.`}); };
    schPhasePick(el,pid,m,t.phase,(code,label)=>{if(t.phase!==code)move(code,label);},(code,gone)=>{ if(gone&&!schOwn(it)){closePanel(true);return;} schPropsRefresh(it); }); return;}
  if(k==='rel'){e.stopPropagation();e.preventDefault();schRelMenu(el,pid,el.dataset.k);return;}
  if(k==='addref'){e.stopPropagation();schRefMenu(el,it,pid,t);return;}
  if(k==='unref'){e.stopPropagation();const cur=((SCHED[pid]||{})['c:'+t.id]||{}).ids||[];const nx=cur.filter(x=>x!==el.dataset.k);schTagged(it,()=>schSet(pid,'c:'+t.id,nx.length?{ids:nx}:null,'참고 자료 연결을 해제했습니다'));return;}
},true);
// Saving the panel of a task: a new title renames the task; what was changed in this edit stays.
// An action with a development phase is an entry of that phase (owner, 2026-11-23: WBS and 개발 단계 are one thing). When such an
// action is saved as published and is not hung under another task, it becomes a task of the plan: the next WBS number of its phase,
// its dates, state, assignees, importance, address and reason go over to the task, its references become the task's. The item stays
// what it was (same id: body, comments, files and links to it are untouched) and is from then on the task's own item (own + task).
// Undoing the step takes the task away again and the item reads as an ordinary action once more. true: it became a task.
const schNextWbs=(m,code)=>code+'.'+(Math.max(0,...m.plan.tasks.filter(t=>t.phase===code).map(t=>Number(String(t.wbs).split('.')[1])||0))+1);
function schActionToTask(it,quiet){ if(!schPreview()||!it||it.type!=='action'||it.own||it.task||!it.phase||it.status!=='published'||!PROJECTS[it.proj]||!schReady(it.proj)||archTabOf(it))return false;
  const pid=it.proj, m=schModel(pid), g=m.phases.find(x=>x.code===it.phase); if(!g||schScenario(pid))return false;
  const A=AIDCSchedule, ms=!!it.ms, today=schToday(), start=it.date||today, e0=itemEnd(it), end=ms?start:(e0&&e0>start?e0:start), st=it.st==='done'?'완료':(SCH_STATUSES.includes(it.stx)?it.stx:(start<=today?'진행':'계획')); let nid='';
  const ok=schCommit(pid,d=>{ const x=A.newTask(d,g.code); x.name=(it.title||'').split('\n').join(' ').trim()||'제목 없음'; x.kind=ms?'milestone':'task'; x.plannedStart=x.referenceStart=start; x.plannedFinish=x.referenceFinish=end;
      schMoveToPhase(d,x,g.code,g.label); if(!g.tasks.length)x.phaseLabel=g.label; schPutBefore(d,x,it.wbsAt||''); x.status=st;
      let as=it.actualStart||null, af=it.actualFinish||null; if(af&&!as)as=af<start?af:start; if(as&&af&&af<as)af=as;
      if(st==='완료'){ if(!as)as=start<=today?start:today; if(!af)af=ms?as:(today>=as?today:as); }
      else{ af=null; if(st==='진행'&&!as&&!ms)as=start<=today?start:today; if(st==='계획'||st==='확인 전'||st==='조건부 미발동')as=null; }
      if(ms&&as&&st==='완료')af=as; x.actualStart=as; x.actualFinish=af;
      if((it.people||[]).length)x.people=it.people.slice(); if(it.pri&&it.pri!=='std')x.pri=it.pri; if(it.url)x.url=it.url; if(it.why)x.why=it.why;
      for(const k of ['criteria','conditions','evidence'])if(it[k])x[k]=String(it[k]); d.tasks.push(x); nid=x.id; },'',true,true);
  if(!ok||!nid)return false;
  it.own=true; it.task=nid; delete it.wbsOff; delete it.wbsAt; schOwnIds.c=null; SCH.memo[pid]=null;
  if((it.refs||[]).length)schWrite(pid,{['c:'+nid]:{ids:it.refs.slice()}});
  (SCH.conv||(SCH.conv={}))[nid]=it.id; if(quiet)return true;
  if(!SCHU.open.includes(g.code))SCHU.open.push(g.code); SCHU.sel=nid; schUiSave(); SCH.convSay=it.id;   // remembered for undo / redo (schConvSettle) and for the toast of this save (schSavedSay)
  return true; }
// The toast of 게시 / 저장: an action that has just become a task says under which number it now stands.
function schSavedSay(it,text){ if(!it||SCH.convSay!==it.id)return null; SCH.convSay=''; const t=schOwn(it)&&schModel(it.proj).byId.get(it.task); if(!t)return null;
  return {text:`${text.replace(/\.$/,'')} · ${schNo(t)}) 번호로 액션 일정 · 리스트 · 관계도에 올렸습니다.`,act:{t:'되돌리기',fn:schUndo}}; }
// After undo / redo: the step that made an action a task took the task away (or brought it back). The action follows: without its
// task it is an ordinary action again (it still carries its phase, so it is listed with it), with it the task's own item.
function schConvSettle(pid){ const c=SCH.conv; if(!c||!schReady(pid))return; const m=schModel(pid); let ch=false;
  for(const [tid,iid] of Object.entries(c)){ const it=ITEMS.find(x=>x.id===iid); if(!it||it.proj!==pid)continue; const has=m.byId.has(tid);
    if(has&&!it.own){it.own=true;it.task=tid;delete it.wbsOff;ch=true;} else if(!has&&it.own&&it.task===tid){delete it.own;delete it.task;it.wbsOff=1;ch=true;} }   // wbsOff: taken back on purpose, not to be turned again by itself
  if(ch){schOwnIds.c=null;SCH.memo[pid]=null;} }
// Actions that were given a phase before the sixteenth round (published, no task) get their WBS number now: once per project and
// session, on the page of their writer (only their own, so two pages never turn the same action), all in one undo step.
function schLegacyToTasks(pid){ if(!schPreview()||typeof sharedReady==='undefined'||!sharedReady||!PROJECTS[pid]||!schReady(pid)||schScenario(pid))return; const L=SCH.legacy||(SCH.legacy={}); if(L[pid])return; L[pid]=1;
  const m=schModel(pid), list=liveItems('action',pid).filter(i=>!i.own&&!i.task&&i.phase&&!i.wbsOff&&i.status==='published'&&i.authorId===sharedUser&&!i.editing&&m.phases.some(g=>g.code===i.phase)&&!otherLock('item:'+i.id)); if(!list.length)return;
  const u0=SCH.undo.length; let n=0; for(const it of list.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id))))if(schActionToTask(it,true))n++;
  if(!n)return; const label=`개발 단계가 있던 액션 ${n}건에 WBS 번호를 붙였습니다`; schUndoJoin(pid,u0,label); toast(label+' · 액션 일정 · 리스트 · 관계도에 올라갑니다.',6000,{t:'되돌리기',fn:schUndo,keep:true}); schRedraw(true); }
function schAfterSave(it){ schEditKeep(it); if(schActionToTask(it))return; if(!schOwn(it))return; const m=schModel(it.proj), t=m.byId.get(it.task), name=(it.title||'').split('\n').join(' ').trim(); if(name&&name!==t.name)schEditTask(it.proj,t.id,schNo(t)+' 업무명 변경',x=>{x.name=name;},true,true); } // the caller redraws
