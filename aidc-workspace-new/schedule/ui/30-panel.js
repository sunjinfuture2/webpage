// A task in the right panel. The panel itself is the page's item panel (itemHtml): title, body, comments, files, versions.
// What is added here is the block between the title and the comments: the tabs 정보 / 연결된 액션 with the task's schedule fields.
// Since the owner's fourth round (2026-11-19) those fields can be changed only after 수정 was pressed, like everything else in
// the panel. A change still applies at once (schCommit / schSet, so the other views follow while editing); 취소 takes back what
// was changed in this edit (every such change carries the item's id as its tag: schEditCancel), 저장 keeps it.
const SCHP={tab:'info',more:false};
const schOwn=it=>!!(it&&it.own&&it.task&&schReady(it.proj)&&schModel(it.proj).byId.has(it.task));
function schTitleAttr(it){ if(!schOwn(it))return ''; const t=schModel(it.proj).byId.get(it.task); return ` data-wbs="${esc(schWbs(t.wbs))}"`; }
const schChev=()=>svg('i-chev-d',8,4);
// rows the panel of an ordinary action gets in a project with a schedule: the phase and, if chosen, the task it belongs to
function schItemRows(it,E,V){ if(!it||it.type!=='action'||it.own||!schReady(it.proj)||archTabOf(it))return []; const m=schModel(it.proj), t=it.task&&m.byId.get(it.task), none=x=>`<span class="plain" style="color:#c4c4c4">${x}</span>`;
  const g=m.phases.find(x=>x.code===(t?t.phase:it.phase));
  const stage=E?`<span class="sch-stage"><span class="sf" data-schp="link-phase">${g?esc(schPhaseLabel(g)):'단계 선택'}${schChev()}</span><span class="sf" data-schp="link-task">${t?esc(schTaskTitle(t)):'업무 선택'}${schChev()}</span>${g||t?`<button class="x" data-schp="unlink" title="연결 해제">${svg('i-x',8,8)}</button>`:''}</span>`
    :(g?`<span class="sch-stage ro"><span>${esc(schPhaseLabel(g))}</span>${t?`<a data-open="${schItemId(t.id)}" title="이 업무 열기">${esc(schTaskTitle(t))}</a>`:''}</span>`:none('일정 미연결'));
  const rows=[V('개발 단계',stage,'sch-v')]; if(t){const r=m.res.tasks[t.id];rows.push(V('예상 기한',`<span class="plain">${t.kind==='milestone'?schD(r.start):schRange(r.start,r.finish)}</span>`,'sch-v'));} return rows; }
function schItemProps(it,E,full){ if(!schOwn(it))return null; const pid=it.proj, m=schModel(pid), A=AIDCSchedule, P=A.progress, t=m.byId.get(it.task), r=m.res.tasks[t.id], g=m.phases.find(x=>x.code===t.phase), ms=t.kind==='milestone'; E=!!it.editing;
  if(!it.editing&&it.title!==t.name&&!otherLock('item:'+it.id))it.title=t.name;   // the name of the task is the title of its panel
  const V=(k,inner,cls='')=>`<div class="pr"><span class="k">${k}</span><span class="v sch-v ${cls}">${inner}</span></div>`;
  const none=x=>`<span class="plain" style="color:#c4c4c4">${x}</span>`, f=(k,inner,title='')=>E?`<span class="sf-e" data-schp="f" data-k="${k}" ${title?`title="${esc(title)}"`:''}>${inner}</span>`:`<span class="sf-r">${inner}</span>`, ph=x=>`<i>${E?x:'-'}</i>`;
  const tabs=`<div class="sp-tabs"><button class="${SCHP.tab==='info'?'on':''}" data-schp="tab" data-k="info">정보</button><button class="${SCHP.tab==='links'?'on':''}" data-schp="tab" data-k="links">연결된 액션<small>${m.pred.get(t.id).length+m.succ.get(t.id).length||''}</small></button></div>`;
  if(SCHP.tab==='links')return `<div class="props sch-props ${E?'ed':''}"><div class="rcol" hidden></div>${tabs}${schLinksHtml(pid,m,t,full,E)}</div>`;
  const arrow=svg('i-sch-arr',11,8,'color:#4f4f4f;margin:0 2px'), done=P.isDone(t);
  const drv=r.drivers.map(d=>{const e=m.plan.dependencies.find(x=>x.id===d);if(e){const b=m.byId.get(e.from);return `${schWbs(b.wbs)}) ${b.name} (${e.type}${e.lag?(e.lag>0?' +':' ')+e.lag+'일':''})`;}return d.startsWith('납기:')?'조달 납기 '+d.slice(3):d;});
  const moved=r.start!==t.plannedStart||r.finish!==t.plannedFinish, why='일정 계산 결과입니다.'+(drv.length?'\n결정 요인: '+drv.join(' · '):'')+(moved?`\n입력한 관리일정: ${schD(t.plannedStart)}${ms?'':' → '+schD(t.plannedFinish)}`:'');
  // one row for the dates (owner: 관리일정 and 예상 기한 said nearly the same): the forecast is shown, what is typed is the managed date behind it
  const dates=ms?f('plannedStart',schD(r.start),E?'눌러서 변경\n'+why:why):`<span class="sch-pair">${f('plannedStart',schD(r.start),E?'시작일 변경\n'+why:why)+arrow+(t.finishRule?`<span class="plain" title="검수 완료 후 ${t.finishRule.months}개월로 정해지는 기간입니다">${schD(r.finish)}</span>`:f('plannedFinish',schD(r.finish),E?'완료일 변경\n'+why:why))}</span>`;
  const refs=schRefs(pid,t.id);
  const L=[V('사업명',pill(proj(pid),'nosq').replace('class="pill',`data-go="project:${esc(pid)}" title="프로젝트 페이지로 이동" class="pill`)),
    V('예상 기한'+schInfo('dates'),dates+(done?'':schDdayHtml(r.finish,false,schLateWhy(m,t)))+(moved?`<em class="sch-mv" title="${esc(why)}">선행 업무 반영</em>`:'')),
    V('실제 기한',!E&&!t.actualStart&&!t.actualFinish?none('-'):`<span class="sch-pair">${f('actualStart',t.actualStart?schD(t.actualStart):ph('시작일'),'실제 시작일')+(ms?'':arrow+f('actualFinish',t.actualFinish?schD(t.actualFinish):ph('완료일'),'실제 완료일'))}</span>`),
    ...(t.why||schLateWhy(m,t)?[V('지연 사유',f('why',t.why?`<span class="plain wrap">${esc(t.why)}</span>`:ph('사유 입력'),'지연 사유 · 리스트의 ‘n일 지연’에 마우스를 올리면 보입니다'),'wide')]:[]),
    V('개발 단계',E?`<span class="sch-stage"><span class="sf" data-schp="phase-move" title="다른 단계로 옮기기 · 새 단계 추가">${esc(schPhaseLabel(g))}${schChev()}</span><span class="wbno">${esc(schWbs(t.wbs))})</span></span>`:`<span class="sch-stage ro"><span>${esc(schPhaseLabel(g))}</span><span class="wbno">${esc(schWbs(t.wbs))})</span></span>`),
    V('마일스톤',f('kind',`<span class="plain">${ms?'<i class="sch-ms" style="margin:0 7px 1px 1px"></i>예':'아니오'}</span>`,'마일스톤 여부')),
    V('참고 자료',`<span class="chips sl-refs">${refs.map(x=>`<span class="sl-ref">${chipFull(x)}${E?`<button data-schp="unref" data-k="${esc(x.id)}" title="연결 해제">${svg('i-x',7,7)}</button>`:''}</span>`).join('')}${E?'<span class="chip add" data-schp="addref">+ 미팅 · 리서치 연결</span>':(refs.length?'':none('없음'))}</span>`)];
  const ppl=schPeople(t);
  const R=[V('담당자',f('people',ppl.length?`<span class="people">${ppl.map(k=>`<span class="who" data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')}</span>`:'<span class="sch-role none" style="font-size:14px">미지정</span>','담당 멤버')),
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
  const avail=full?Math.min(898,($('#item-pin')||{}).clientWidth||898):(parseFloat(getComputedStyle($('#app')).getPropertyValue('--panelw'))||1031.9)-205, W=Math.round(Math.max(600,Math.min(898,avail)));
  const RH=34, n=Math.max(pre.length,suc.length,1), H=n*RH, cy=H/2, GAP=44, LW=Math.floor((W-2*GAP)*0.335), CW=W-2*GAP-2*LW, CX=LW+GAP, RX=CX+CW+GAP;
  const yOf=(i,k)=>(H-k*RH)/2+i*RH+RH/2; let sv='', h='';
  const node=(e,other,x,y,side)=>{const o=m.byId.get(other), lb=e.type+(e.lag?(e.lag>0?'+':'')+e.lag:'');
    return `<div class="sl-node ${e.active?'':'off'}" style="left:${x}px;top:${y-13}px;width:${LW}px" data-open="${schItemId(o.id)}" title="${esc(schTaskTitle(o)+'\n'+A.relationshipSentence(e.type,side==='pre'?o.name:t.name,side==='pre'?t.name:o.name)+(e.active?'':'\n(조건부 · 지금은 계산에 쓰지 않음)'))}"><b>${schWbs(o.wbs)})</b><span>${esc(o.name)}</span>${E?`<button class="rel" data-schp="rel" data-k="${e.id}" title="관계 수정">${lb}</button>`:`<em class="rel">${lb}</em>`}</div>`;};
  const elbow=(x1,y1,x2,y2)=>{const mx=(x1+x2)/2, r=Math.min(6,Math.abs(y2-y1)/2), s=Math.sign(y2-y1);return y1===y2?`M${x1},${y1} L${x2},${y2}`:`M${x1},${y1} L${mx-r},${y1} Q${mx},${y1} ${mx},${y1+s*r} L${mx},${y2-s*r} Q${mx},${y2} ${mx+r},${y2} L${x2},${y2}`;};
  pre.forEach((e,i)=>{const y=yOf(i,pre.length);h+=node(e,e.from,0,y,'pre');sv+=`<path class="${e.active?'':'off'}" d="${elbow(LW,y,CX-1,cy)}" marker-end="url(#sl-arrow)"/>`;});
  suc.forEach((e,i)=>{const y=yOf(i,suc.length);h+=node(e,e.to,RX,y,'suc');sv+=`<path class="${e.active?'':'off'}" d="${elbow(CX+CW,cy,RX-1,y)}" marker-end="url(#sl-arrow)"/>`;});
  h+=`<div class="sl-node cur" style="left:${CX}px;top:${cy-13}px;width:${CW}px"><b>${schWbs(t.wbs)})</b><span>${esc(t.name)}</span></div>`;
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
function schMoveToPhase(d,x,code,label){ const inPh=d.tasks.filter(q=>q.phase===code&&q.id!==x.id), max=Math.max(0,...inPh.map(q=>Number(q.wbs.split('.')[1])||0)); x.phase=code; x.phaseLabel=inPh.length?inPh[0].phaseLabel:label; x.wbs=code+'.'+(max+1);
  const sorted=d.tasks.filter(q=>q.id!==x.id).sort((p,q)=>p.order-q.order), last=inPh.length?Math.max(...inPh.map(q=>q.order)):Math.max(0,...sorted.filter(q=>q.phase.localeCompare(code,undefined,{numeric:true})<0).map(q=>q.order)), next=sorted.find(q=>q.order>last); x.order=next?(last+next.order)/2:last+1; }
function schNewPhase(pid,m,done){ askInput('새 개발 단계 이름','',v=>{ v=(v||'').trim(); if(!v)return; const no=Math.max(0,...m.phases.map(g=>Number(schPhaseNo(g.code))||0))+1, code='W'+no; schSet(pid,'ph:'+code,{label:v,by:sharedUser,at:new Date().toISOString()},`${no}) ${v} 단계를 추가했습니다`); done(code,v); }); }
function schFieldEdit(el,it){ const pid=it.proj, m=schModel(pid), A=AIDCSchedule, D=A.dates, t=m.byId.get(it.task), r=m.res.tasks[t.id], k=el.dataset.k, id=t.id, name=schWbs(t.wbs), ms=t.kind==='milestone';
  const edit=(label,fn)=>schTagged(it,()=>schEditTask(pid,id,`${name} ${label}`,fn));
  // what moves the schedule (dates, state, kind) says so in the card of the gantt, with 되돌리기
  const editCard=(label,fn,want)=>{ const snap=schSnap(pid); if(schTagged(it,()=>schEditTask(pid,id,`${name} ${label}`,fn,true)))schChangeCard(pid,snap,{title:`${name} ${label}`,focus:id,want:want||null}); };
  if(k==='plannedStart'){datePick(el,t.plannedStart,v=>{if(!v)return;editCard('일정 변경',x=>{const len=D.diffDays(x.plannedFinish,x.plannedStart);x.plannedStart=v;if(ms)x.plannedFinish=v;else if(!x.finishRule&&x.plannedFinish<v)x.plannedFinish=D.addDays(v,len);},v);});return;}
  if(k==='plannedFinish'){datePick(el,t.plannedFinish,v=>{if(v)editCard('일정 변경',x=>{x.plannedFinish=v;});},{min:t.plannedStart});return;}
  if(k==='actualStart'){datePick(el,t.actualStart||r.start,v=>{editCard(v?'실제 시작일 입력':'실제 시작일 지움',x=>{x.actualStart=v||null;if(!v){x.actualFinish=null;if(x.status==='완료'||x.status==='진행')x.status='계획';}else{if(ms){x.actualFinish=v;x.status='완료';}else{if(x.actualFinish&&x.actualFinish<v)x.actualFinish=v;if(x.status!=='완료')x.status='진행';}}});},{clear:'실제 시작 없음'});return;}
  if(k==='actualFinish'){datePick(el,t.actualFinish||(r.finish<schToday()?r.finish:schToday()),v=>{editCard(v?'실제 완료일 입력':'실제 완료일 지움',x=>{if(!v){x.actualFinish=null;if(x.status==='완료')x.status='진행';return;}if(!x.actualStart||x.actualStart>v)x.actualStart=r.start<=v?r.start:v;x.actualFinish=v;x.status='완료';x.remaining=null;});},{min:t.actualStart||undefined,clear:'실제 완료 없음'});return;}
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
function schRelMenu(el,pid,relId){ const m=schModel(pid), A=AIDCSchedule, rel=m&&m.plan.dependencies.find(x=>x.id===relId); if(!rel)return; const a=m.byId.get(rel.from), b=m.byId.get(rel.to), nm=`${schWbs(a.wbs)} → ${schWbs(b.wbs)}`;
  // every change of a relation is shown with its effect first and saved by 확인 (schPropose)
  const ch=(title,note,label,fn,gone)=>schPropose(pid,{kind:'change',from:rel.from,to:rel.to,title,note,label,gone,mutate:d=>{const x=d.dependencies.find(q=>q.id===rel.id);if(x)fn(x,d);}});
  menuPop(el,[{hd:`${nm} 관계`}].concat(['FS','SS','FF','SF'].map(ty=>({t:ty+' · '+A.relationshipNames[ty],k:ty,sel:rel.type===ty,fn:()=>{if(rel.type!==ty)ch('관계 유형 변경',`${rel.type} → ${ty} · `+A.relationshipSentence(ty,a.name,b.name),'관계 유형 '+ty,x=>{x.type=ty;});}})),['-',
    {t:'간격 '+(rel.lag?(rel.lag>0?'+':'')+rel.lag+'일':'없음')+' · 변경…',k:'lag',fn:()=>askInput('간격 (일) · 음수는 앞당김',String(rel.lag||0),v=>{const n=Math.round(Number(v));if(!Number.isFinite(n)||Math.abs(n)>36500){toast('정수를 입력하세요.');return;}if(n!==(rel.lag||0))ch('관계 간격 변경',`간격 ${rel.lag||0}일 → ${n}일`,'관계 간격 '+n+'일',x=>{x.lag=n;});})},
    {t:rel.active?'계산에서 빼기 (조건부)':'계산에 다시 쓰기',k:'act',fn:()=>ch(rel.active?'관계 사용 중지':'관계 다시 사용',rel.active?'이 관계를 일정 계산에서 뺍니다 (선은 점선으로 남습니다).':'이 관계를 일정 계산에 다시 씁니다.',rel.active?'관계 사용 중지':'관계 다시 사용',x=>{x.active=!x.active;},rel.active)},
    {t:'두 업무 보기',k:'see',fn:()=>{SCHU.sel=b.id;openPanel(schItemId(b.id));}},
    {t:'관계 삭제',k:'del',danger:true,fn:()=>schPropose(pid,{kind:'change',from:rel.from,to:rel.to,title:'관계 삭제',note:`${nm} 관계를 지웁니다.`,label:`${nm} 관계 삭제`,gone:true,mutate:d=>{d.dependencies=d.dependencies.filter(q=>q.id!==rel.id);}})}])); }
// a list of tasks to choose from (linking an action); extra: entries above the list
function schTaskMenu(el,m,title,filter,pick,extra){ const p=openPop(el,`<div style="padding:6px 6px 4px"><input id="sch-tm-q" placeholder="WBS 또는 업무명 검색"></div><div class="hd">${esc(title)}</div>${(extra||[]).map((x,i)=>`<div class="it ex" data-x="${i}">${esc(x.t)}</div>`).join('')}<div class="sch-tm"></div>`,{cls:'link'}); const box=p.querySelector('.sch-tm'), inp=p.querySelector('#sch-tm-q');
  const draw=()=>{const q=inp.value.trim();const list=m.plan.tasks.filter(t=>filter(t)&&(!q||matchQ(q,t.name,t.wbs,schWbs(t.wbs)))).slice(0,60);box.innerHTML=list.map(t=>`<div class="it" data-t="${t.id}"><b style="font-weight:600;min-width:38px">${schWbs(t.wbs)}</b>${esc(t.name)}</div>`).join('')||'<div class="msg">맞는 업무가 없습니다.</div>';};
  draw(); inp.oninput=draw; inp.focus(); p.addEventListener('click',e=>{const ex=e.target.closest('.it.ex');if(ex){e.stopPropagation();closePop();extra[+ex.dataset.x].fn();return;}const x=e.target.closest('.it[data-t]');if(!x)return;e.stopPropagation();closePop();pick(x.dataset.t);}); }
// meetings and research notes to hang on a task: the search field first, then the list
function schRefMenu(el,it,pid,t){ const cur=((SCHED[pid]||{})['c:'+t.id]||{}).ids||[], all=ITEMS.filter(i=>(i.type==='meeting'||i.type==='research')&&isLive(i)&&!cur.includes(i.id)).sort(newestFirst), short=x=>{x=(x||'제목 없음').split('\n').join(' ');return x.length>38?x.slice(0,38)+'…':x;};
  const p=openPop(el,`<div style="padding:6px 6px 4px"><input id="sch-rf-q" placeholder="미팅 · 리서치 검색"></div><div class="hd">미팅 · 리서치 연결</div><div class="sch-tm"></div>`,{cls:'link'}), box=p.querySelector('.sch-tm'), inp=p.querySelector('#sch-rf-q');
  const draw=()=>{const q=inp.value.trim();box.innerHTML=all.filter(i=>!q||matchQ(q,i.title,proj(i.proj).tag)).slice(0,60).map(i=>`<div class="it" data-r="${esc(i.id)}"><b style="font-weight:600;min-width:46px;color:#8e8e8e">${i.type==='meeting'?'미팅':'리서치'}</b>${esc(short(i.title))}</div>`).join('')||'<div class="msg">맞는 자료가 없습니다.</div>';};
  draw(); inp.oninput=draw; inp.focus(); p.addEventListener('click',e=>{const x=e.target.closest('.it[data-r]');if(!x)return;e.stopPropagation();closePop();schTagged(it,()=>schSet(pid,'c:'+t.id,{ids:cur.concat(x.dataset.r)},'참고 자료를 연결했습니다'));}); }
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-schp]'); if(!el)return; const it=curItem(); if(!it)return;
  if(el.dataset.schp==='atab'){ SCHP.tab=el.dataset.k; rerenderItem(it.id); return; }   // the tabs of an ordinary action (it may have no project yet)
  if(!schReady(it.proj))return; const k=el.dataset.schp, pid=it.proj, m=schModel(pid), A=AIDCSchedule;
  if(k==='tab'){SCHP.tab=el.dataset.k;if(it.editing)schPropsRefresh(it);else rerenderItem(it.id);return;}
  if(k==='more'){SCHP.more=!SCHP.more;if(it.editing)schPropsRefresh(it);else rerenderItem(it.id);return;}
  // an ordinary action: the phase and the task it belongs to (part of its own edit, saved with 저장). A phase alone is enough; a new phase or a new task can be made here.
  if(k==='link-phase'||k==='link-task'){ if(!canEditItem(it))return; e.stopPropagation(); const cur=it.task&&m.byId.get(it.task), again=()=>{it.dirty=true;rerenderItem(it.id);};
    const setPhase=code=>{ it.phase=code; if(cur&&cur.phase!==code)delete it.task; again(); };
    if(k==='link-phase'){menuPop(el,m.phases.map(g=>({t:schPhaseLabel(g),k:g.code,sel:(cur?cur.phase:it.phase)===g.code,fn:()=>setPhase(g.code)})).concat(['-',{t:'＋ 새 단계 추가',k:'new',fn:()=>schNewPhase(pid,m,code=>setPhase(code))}]));return;}
    const ph=(cur&&cur.phase)||it.phase||'', g=ph&&m.phases.find(x=>x.code===ph), extra=[];
    if(g){ if(it.task)extra.push({t:`${schPhaseLabel(g)} 단계에만 두기 (업무 선택 해제)`,fn:()=>{delete it.task;again();}});
      extra.push({t:`＋ ${schPhaseNo(g.code)}) 단계에 새 업무 추가`,fn:()=>askInput('새 업무 이름','',v=>{v=(v||'').trim();if(!v)return;let nid='';if(schCommit(pid,d=>{const x=A.newTask(d,g.code);x.name=v;x.phaseLabel=g.label;x.plannedStart=x.referenceStart=it.date||schToday();x.plannedFinish=x.referenceFinish=A.dates.addDays(x.plannedStart,4);schMoveToPhase(d,x,g.code,g.label);d.tasks.push(x);nid=x.id;},`${v} 업무를 추가했습니다`)){it.task=nid;it.phase=g.code;again();}})}); }
    schTaskMenu(el,m,g?'업무 선택 · '+schPhaseLabel(g):'업무 선택',t=>!ph||t.phase===ph,id=>{it.task=id;it.phase=m.byId.get(id).phase;again();},extra); return; }
  if(k==='unlink'){ if(!canEditItem(it))return; delete it.task; delete it.phase; it.dirty=true; rerenderItem(it.id); return; }
  if(!schOwn(it))return; const t=m.byId.get(it.task);
  // the trash of a task's panel deletes the task (with what hangs on it); it can be taken back from the toast
  if(k==='del'){e.stopPropagation();confirmDlg(`“${schTaskTitle(t)}” 업무를 삭제할까요? 이 업무에 걸린 관계도 함께 지워집니다. (삭제 뒤 알림의 ‘되돌리기’로 되살릴 수 있습니다)`,[{t:'삭제',pri:true,fn:()=>{const was=it.editing;if(was)revertItem(it);closePanel(true);schCommit(pid,d=>A.removeTasks(d,[t.id]),schWbs(t.wbs)+' 업무 삭제');}},{t:'취소',fn:()=>{}}]);return;}
  if(!it.editing)return;   // everything below changes the task: only after 수정
  if(k==='f'){e.stopPropagation();schFieldEdit(el,it);return;}
  if(k==='phase-move'){ e.stopPropagation(); if(t.wbs==='W8.6'){toast('운영개시 기준 업무는 다른 단계로 옮길 수 없습니다.',3600);return;}
    const move=(code,label)=>{ const snap=schSnap(pid), ttl=`${schWbs(t.wbs)} 단계 이동`; if(schTagged(it,()=>schEditTask(pid,t.id,ttl,(x,d)=>schMoveToPhase(d,x,code,label),true)))schChangeCard(pid,snap,{title:ttl,focus:t.id,note:`${schPhaseNo(code)}) ${schPhaseName(label)} 단계로 옮겼습니다.`}); };
    menuPop(el,m.phases.map(g=>({t:schPhaseLabel(g),k:g.code,sel:t.phase===g.code,fn:()=>{if(t.phase!==g.code)move(g.code,g.label);}})).concat(['-',{t:'＋ 새 단계 추가',k:'new',fn:()=>schNewPhase(pid,m,(code,label)=>move(code,label))}]));return;}
  if(k==='rel'){e.stopPropagation();e.preventDefault();schRelMenu(el,pid,el.dataset.k);return;}
  if(k==='addref'){e.stopPropagation();schRefMenu(el,it,pid,t);return;}
  if(k==='unref'){e.stopPropagation();const cur=((SCHED[pid]||{})['c:'+t.id]||{}).ids||[];const nx=cur.filter(x=>x!==el.dataset.k);schTagged(it,()=>schSet(pid,'c:'+t.id,nx.length?{ids:nx}:null,'참고 자료 연결을 해제했습니다'));return;}
},true);
// Saving the panel of a task: a new title renames the task; what was changed in this edit stays.
function schAfterSave(it){ schEditKeep(it); if(!schOwn(it))return; const m=schModel(it.proj), t=m.byId.get(it.task), name=(it.title||'').split('\n').join(' ').trim(); if(name&&name!==t.name)schEditTask(it.proj,t.id,schWbs(t.wbs)+' 업무명 변경',x=>{x.name=name;},true,true); } // the caller redraws
