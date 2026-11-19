// A task in the right panel. The panel itself is the page's item panel (itemHtml): title, body, comments, files, versions.
// What is added here is the block between the title and the comments: the tabs 정보 / 연결된 아이템 with the task's
// schedule fields. Those fields are not part of "수정 / 저장": each change applies at once (schCommit) and can be undone.
const SCHP={tab:'info',more:false};
const schOwn=it=>!!(it&&it.own&&it.task&&schReady(it.proj)&&schModel(it.proj).byId.has(it.task));
function schTitleAttr(it){ if(!schOwn(it))return ''; const t=schModel(it.proj).byId.get(it.task); return ` data-wbs="${esc(schWbs(t.wbs))}"`; }
// rows the panel of an ordinary action item gets in a project with a schedule: the task it belongs to and that task's dates
function schItemRows(it,E,V){ if(!it||it.type!=='action'||it.own||!schReady(it.proj)||archTabOf(it))return []; const m=schModel(it.proj), t=it.task&&m.byId.get(it.task), none=x=>`<span class="plain" style="color:#c4c4c4">${x}</span>`;
  const g=t&&m.phases.find(x=>x.code===t.phase);
  const stage=E?`<span class="sch-stage"><span class="sf" data-schp="link-phase">${g?esc(schPhaseLabel(g)):'단계 선택'}${svg('i-chev-d',8,4)}</span><span class="sf" data-schp="link-task">${t?esc(schTaskTitle(t)):'업무 선택'}${svg('i-chev-d',8,4)}</span>${t?`<button class="x" data-schp="unlink" title="연결 해제">${svg('i-x',8,8)}</button>`:''}</span>`
    :(t?`<span class="sch-stage ro"><span>${esc(schPhaseLabel(g))}</span><a data-open="${schItemId(t.id)}" title="이 업무 열기">${esc(schTaskTitle(t))}</a></span>`:none('일정 미연결'));
  const rows=[V('개발 단계',stage,'sch-v')]; if(t){const r=m.res.tasks[t.id];rows.push(V('예상 기한',`<span class="plain">${t.kind==='milestone'?schD(r.start):schRange(r.start,r.finish)}</span>`,'sch-v'));} return rows; }
function schItemProps(it,E,full){ if(!schOwn(it))return null; const pid=it.proj, m=schModel(pid), A=AIDCSchedule, P=A.progress, t=m.byId.get(it.task), r=m.res.tasks[t.id], g=m.phases.find(x=>x.code===t.phase), ms=t.kind==='milestone';
  if(!it.editing&&it.title!==t.name&&!otherLock('item:'+it.id))it.title=t.name;   // the name of the task is the title of its panel
  const V=(k,inner,cls='')=>`<div class="pr"><span class="k">${k}</span><span class="v sch-v ${cls}">${inner}</span></div>`;
  const none=x=>`<span class="plain" style="color:#c4c4c4">${x}</span>`, f=(k,inner,title='')=>`<span class="sf-e" data-schp="f" data-k="${k}" ${title?`title="${esc(title)}"`:''}>${inner}</span>`;
  const tabs=`<div class="sp-tabs"><button class="${SCHP.tab==='info'?'on':''}" data-schp="tab" data-k="info">정보</button><button class="${SCHP.tab==='links'?'on':''}" data-schp="tab" data-k="links">연결된 아이템<small>${m.pred.get(t.id).length+m.succ.get(t.id).length+schLinked(pid,t.id).length+schRefs(pid,t.id).length||''}</small></button></div>`;
  if(SCHP.tab==='links')return `<div class="props sch-props"><div class="rcol" hidden></div>${tabs}${schLinksHtml(pid,m,t,full)}</div>`;
  const arrow=svg('i-sch-arr',11,8,'color:#4f4f4f;margin:0 2px'), done=P.isDone(t);
  const drv=r.drivers.map(d=>{const e=m.plan.dependencies.find(x=>x.id===d);if(e){const b=m.byId.get(e.from);return `${schWbs(b.wbs)}) ${b.name} (${e.type}${e.lag?(e.lag>0?' +':' ')+e.lag+'일':''})`;}return d.startsWith('납기:')?'조달 납기 '+d.slice(3):d;});
  const moved=r.start!==t.plannedStart||r.finish!==t.plannedFinish;
  const L=[V('사업명',pill(proj(pid)).replace('class="pill',`data-go="project:${esc(pid)}" title="프로젝트 페이지로 이동" class="pill`)),
    V('관리일정',ms?f('plannedStart',schD(t.plannedStart),'눌러서 변경'):`<span class="sch-pair">${f('plannedStart',schD(t.plannedStart),'관리 시작일 변경')+arrow+(t.finishRule?`<span class="plain" title="검수 완료 후 ${t.finishRule.months}개월로 정해지는 기간입니다">${schD(t.plannedFinish)}</span>`:f('plannedFinish',schD(t.plannedFinish),'관리 완료일 변경'))}</span>`),
    V('예상 기한',`<span class="plain ${moved?'sch-moved':''}" title="${esc('일정 계산 결과입니다.'+(drv.length?'\n결정 요인: '+drv.join(' · '):''))}">${ms?schD(r.start):schRange(r.start,r.finish)}</span>${done?'':schDdayHtml(r.finish,false)}${r.delta?`<em class="sch-delta ${r.delta>0?'late':''}" title="참조계획 대비">${r.delta>0?'+':''}${r.delta}일</em>`:''}`),
    V('실제 기한',`<span class="sch-pair">${f('actualStart',t.actualStart?schD(t.actualStart):'<i>시작일</i>','실제 시작일')+(ms?'':arrow+f('actualFinish',t.actualFinish?schD(t.actualFinish):'<i>완료일</i>','실제 완료일'))}</span>`),
    V('개발 단계',`<span class="sch-stage ro"><span>${esc(schPhaseLabel(g))}</span></span>`)];
  const ppl=schPeople(t), role=schRole(t);
  const R=[V('담당자',f('people',ppl.length?`<span class="people">${ppl.map(k=>`<span class="who">${av()}${esc(userName(k))}</span>`).join('')}</span>`:(role?`<span class="sch-role" style="font-size:14px">${esc(role)}</span><i>지정</i>`:'<i>지정</i>'),ppl.length?'담당 멤버 변경':'담당 멤버 지정 (지금은 원본 일정의 실행 역할)')),
    V('상태',f('status',schStIcon(schStatus(t)))),V('중요도',f('pri',schPriHtml(m,t))),
    V('URL',t.url&&urlHref(t.url)?`<a class="url" href="${esc(urlHref(t.url))}" target="_blank" rel="noopener" data-stop>${esc(t.url)}</a><button class="copy-url" data-schp="f" data-k="url" title="주소 변경">${svg('i-chev-d',8,4)}</button>`:f('url','<i>주소 입력</i>')),
    V('진척률',f('progress',typeof t.progress==='number'?Math.round(t.progress*100)+'%':(done?'100%':'<i>미입력</i>'),'0~100 사이의 숫자. 비우면 기간 경과로 추정합니다'))];
  let more='';
  if(SCHP.more){ const txt=(k,label,ph)=>V(label,f(k,t[k]?`<span class="plain wrap">${esc(t[k])}</span>`:`<i>${ph}</i>`),'wide');
    more=`<div class="sp-more"><div>${V('추가지연',f('delay',t.delay?t.delay+'일':'<i>없음</i>','이 업무에 더하는 지연 일수'))}${V('잔여기간',f('remaining',t.remaining!==null?t.remaining+'일':'<i>미입력</i>','착수한 업무의 남은 일수 (상태일 기준)'))}${V('운영개시 여유',`<span class="plain">${r.slack===null?'대상 외 (운영개시 경로 밖)':r.slack+'일'+(r.criticality==='critical'?' · 운영개시를 결정하는 경로':r.criticality==='near'?' · 근접':'')}</span>`)}${V('참조계획',`<span class="plain">${ms?schD(t.referenceStart):schRange(t.referenceStart,t.referenceFinish)}</span>`)}</div>
      <div class="rc">${V('역할',`<span class="plain wrap">승인 ${esc((t.roles||{}).A||'-')} · 실행 ${esc((t.roles||{}).R||'-')} · 협의 ${esc((t.roles||{}).C||'-')}</span>`)}${txt('criteria','완료 기준','입력')}${txt('conditions','조건·확약','입력')}${txt('evidence','증빙','입력')}</div>
      ${t.sourceSheet==='사용자 추가'?`<div class="full"><button class="sh-btn sp-del" data-schp="del">이 업무 삭제</button></div>`:''}</div>`; }
  return `<div class="props sch-props">${tabs}<div class="sp-grid"><div>${L.join('')}</div><div class="rcol">${R.join('')}</div></div><button class="sp-toggle" data-schp="more">${SCHP.more?'일정 상세 접기':'일정 상세'} ${svg('i-chev-d',8,4,SCHP.more?'transform:rotate(180deg)':'')}</button>${more}</div>`; }

/* ---------- 연결된 아이템: the tasks before and after, and the content linked to the task ---------- */
const schRefs=(pid,taskId)=>(((SCHED[pid]||{})['c:'+taskId]||{}).ids||[]).map(id=>item(id)).filter(x=>x&&ITEMS.includes(x)&&isLive(x));
function schLinksHtml(pid,m,t,full){ const A=AIDCSchedule, pre=m.pred.get(t.id).slice().sort((a,b)=>m.byId.get(a.from).order-m.byId.get(b.from).order), suc=m.succ.get(t.id).slice().sort((a,b)=>m.byId.get(a.to).order-m.byId.get(b.to).order);
  // as wide as the panel (or the full page) allows
  const avail=full?Math.min(898,($('#item-pin')||{}).clientWidth||898):(parseFloat(getComputedStyle($('#app')).getPropertyValue('--panelw'))||1031.9)-205, W=Math.round(Math.max(600,Math.min(898,avail)));
  const RH=34, n=Math.max(pre.length,suc.length,1), H=n*RH, cy=H/2, GAP=44, LW=Math.floor((W-2*GAP)*0.335), CW=W-2*GAP-2*LW, CX=LW+GAP, RX=CX+CW+GAP;
  const yOf=(i,k)=>(H-k*RH)/2+i*RH+RH/2; let sv='', h='';
  const node=(e,other,x,y,side)=>{const o=m.byId.get(other), lb=e.type+(e.lag?(e.lag>0?'+':'')+e.lag:'');
    return `<div class="sl-node ${e.active?'':'off'}" style="left:${x}px;top:${y-13}px;width:${LW}px" data-open="${schItemId(o.id)}" title="${esc(schTaskTitle(o)+'\n'+A.relationshipSentence(e.type,side==='pre'?o.name:t.name,side==='pre'?t.name:o.name)+(e.active?'':'\n(조건부 · 지금은 계산에 쓰지 않음)'))}"><b>${schWbs(o.wbs)})</b><span>${esc(o.name)}</span><button class="rel" data-schp="rel" data-k="${e.id}" title="관계 수정">${lb}</button></div>`;};
  const elbow=(x1,y1,x2,y2)=>{const mx=(x1+x2)/2, r=Math.min(6,Math.abs(y2-y1)/2), s=Math.sign(y2-y1);return y1===y2?`M${x1},${y1} L${x2},${y2}`:`M${x1},${y1} L${mx-r},${y1} Q${mx},${y1} ${mx},${y1+s*r} L${mx},${y2-s*r} Q${mx},${y2} ${mx+r},${y2} L${x2},${y2}`;};
  pre.forEach((e,i)=>{const y=yOf(i,pre.length);h+=node(e,e.from,0,y,'pre');sv+=`<path class="${e.active?'':'off'}" d="${elbow(LW,y,CX-1,cy)}" marker-end="url(#sl-arrow)"/>`;});
  suc.forEach((e,i)=>{const y=yOf(i,suc.length);h+=node(e,e.to,RX,y,'suc');sv+=`<path class="${e.active?'':'off'}" d="${elbow(CX+CW,cy,RX-1,y)}" marker-end="url(#sl-arrow)"/>`;});
  h+=`<div class="sl-node cur" style="left:${CX}px;top:${cy-13}px;width:${CW}px"><b>${schWbs(t.wbs)})</b><span>${esc(t.name)}</span></div>`;
  const linked=schLinked(pid,t.id), refs=schRefs(pid,t.id);
  return `<div class="sp-links"><div class="sl-wrap" style="width:${W}px"><div class="sl-cap"><span>선행 업무 ${pre.length}</span><span>후행 업무 ${suc.length}</span></div><div class="sl-map" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}"><defs><marker id="sl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1l6 3-6 3" fill="none" stroke="#4f4f4f" stroke-width="1.1"/></marker></defs>${sv}</svg>${h}</div>
    <div class="sl-add"><button class="sh-btn" data-schp="addrel" data-k="pre">+ 선행 업무</button><button class="sh-btn" data-schp="addrel" data-k="suc">+ 후행 업무</button></div></div>
    <div class="sl-items"><div class="pr"><span class="k">연결된 액션</span><span class="v"><span class="chips">${linked.map(x=>chipFull(x)).join('')||'<span class="plain" style="color:#c4c4c4">없음 · 액션아이템의 ‘개발 단계’에서 이 업무를 고르면 여기에 나옵니다</span>'}</span></span></div>
      <div class="pr"><span class="k">참고 자료</span><span class="v"><span class="chips">${refs.map(x=>`<span class="sl-ref">${chipFull(x)}<button data-schp="unref" data-k="${esc(x.id)}" title="연결 해제">${svg('i-x',7,7)}</button></span>`).join('')}<span class="chip add" data-schp="addref">+ 미팅 · 리서치 연결</span></span></span></div></div></div>`; }

/* ---------- changing a field ---------- */
function schEditTask(pid,taskId,label,fn,quiet,noRedraw){ return schCommit(pid,d=>{const x=d.tasks.find(q=>q.id===taskId); if(x)fn(x,d);},label,quiet,noRedraw); }
function schFieldEdit(el,it){ const pid=it.proj, m=schModel(pid), A=AIDCSchedule, D=A.dates, t=m.byId.get(it.task), r=m.res.tasks[t.id], k=el.dataset.k, id=t.id, name=schWbs(t.wbs), ms=t.kind==='milestone';
  const edit=(label,fn)=>schEditTask(pid,id,`${name} ${label}`,fn);
  const num=(label,cur,lo,hi,apply,unit='')=>askInput(label,cur==null?'':String(cur),v=>{v=(v||'').trim();if(v===''){apply(null);return;}const n=Number(v.replace(/[^\d.-]/g,''));if(!Number.isFinite(n)||n<lo||n>hi){toast(`${lo}~${hi}${unit} 사이의 숫자를 입력하세요.`);return;}apply(n);});
  if(k==='plannedStart'){datePick(el,t.plannedStart,v=>{if(!v)return;edit('관리일정 변경',x=>{const len=D.diffDays(x.plannedFinish,x.plannedStart);x.plannedStart=v;if(ms)x.plannedFinish=v;else if(!x.finishRule&&x.plannedFinish<v)x.plannedFinish=D.addDays(v,len);});});return;}
  if(k==='plannedFinish'){datePick(el,t.plannedFinish,v=>{if(v)edit('관리일정 변경',x=>{x.plannedFinish=v;});},{min:t.plannedStart});return;}
  if(k==='actualStart'){datePick(el,t.actualStart||r.start,v=>{edit(v?'실제 시작일 입력':'실제 시작일 지움',x=>{x.actualStart=v||null;if(!v){x.actualFinish=null;if(x.status==='완료'||x.status==='진행')x.status='계획';}else{if(ms){x.actualFinish=v;x.status='완료';}else{if(x.actualFinish&&x.actualFinish<v)x.actualFinish=v;if(x.status!=='완료')x.status='진행';}}});},{clear:'실제 시작 없음'});return;}
  if(k==='actualFinish'){datePick(el,t.actualFinish||(r.finish<schToday()?r.finish:schToday()),v=>{edit(v?'실제 완료일 입력':'실제 완료일 지움',x=>{if(!v){x.actualFinish=null;if(x.status==='완료')x.status='진행';return;}if(!x.actualStart||x.actualStart>v)x.actualStart=r.start<=v?r.start:v;x.actualFinish=v;x.status='완료';x.remaining=null;});},{min:t.actualStart||undefined,clear:'실제 완료 없음'});return;}
  if(k==='status'){menuPop(el,SCH_STATUSES.map((s,i)=>({t:s,k:'s'+i,sel:schStatus(t)===s,fn:()=>edit('상태: '+s,x=>{const today=schToday();x.status=s;
      if(s==='완료'){if(!x.actualStart)x.actualStart=r.start<=today?r.start:today;if(!x.actualFinish)x.actualFinish=ms?x.actualStart:(today>=x.actualStart?today:x.actualStart);x.remaining=null;}
      else{x.actualFinish=null;if(s==='진행'&&!x.actualStart&&!ms)x.actualStart=r.start<=today?r.start:today;if(s==='계획'||s==='확인 전'||s==='조건부 미발동'){x.actualStart=null;x.remaining=null;}}})})));return;}
  if(k==='pri'){menuPop(el,[['high','높음'],['mid','중간'],['low','낮음']].map(x=>({t:x[1],k:x[0],sel:t.pri===x[0],fn:()=>edit('중요도: '+x[1],q=>{q.pri=x[0];})})).concat(['-',{t:'자동 (일정 여유 기준)',k:'auto',sel:!t.pri,fn:()=>edit('중요도 자동',q=>{delete q.pri;})}]));return;}
  if(k==='people'){const cur=schPeople(t);menuPop(el,[{hd:schRole(t)?'담당 멤버 · 실행 역할: '+schRole(t):'담당 멤버'}].concat(Object.keys(PEOPLE).map(u=>({t:PEOPLE[u],k:u,ico:av('av15'),sel:cur.includes(u),fn:()=>edit('담당자 변경',q=>{const now=schPeople(q);const nx=now.includes(u)?now.filter(z=>z!==u):now.concat(u);if(nx.length)q.people=nx;else delete q.people;})}))),{multi:true,cls:'multi'});return;}
  if(k==='url'){askInput('URL',t.url||'',v=>{v=(v||'').trim();edit(v?'URL 입력':'URL 지움',q=>{if(v)q.url=v;else delete q.url;});});return;}
  if(k==='progress'){num('진척률 (%) · 비우면 미입력',typeof t.progress==='number'?Math.round(t.progress*100):null,0,100,n=>edit('진척률 '+(n===null?'지움':n+'%'),q=>{q.progress=n===null?null:n/100;}),'%');return;}
  if(k==='delay'){num('추가지연 (일)',t.delay||null,0,36500,n=>edit('추가지연 '+(n||0)+'일',q=>{q.delay=Math.round(n||0);}),'일');return;}
  if(k==='remaining'){num('잔여기간 (일) · 비우면 미입력',t.remaining,0,36500,n=>edit('잔여기간 '+(n===null?'지움':n+'일'),q=>{q.remaining=n===null?null:Math.round(n);}),'일');return;}
  if(k==='criteria'||k==='conditions'||k==='evidence'){const lb={criteria:'완료 기준',conditions:'조건·확약',evidence:'증빙'}[k];askInput(lb,t[k]||'',v=>edit(lb+' 수정',q=>{q[k]=(v||'').trim();}));return;} }
// a list of tasks to choose from (relations, linking an action)
function schTaskMenu(el,m,title,filter,pick){ const p=openPop(el,`<div class="hd">${esc(title)}</div><div style="padding:2px 6px 6px"><input id="sch-tm-q" placeholder="WBS 또는 업무명 검색"></div><div class="sch-tm"></div>`,{cls:'link'}); const box=p.querySelector('.sch-tm'), inp=p.querySelector('#sch-tm-q');
  const draw=()=>{const q=inp.value.trim();const list=m.plan.tasks.filter(t=>filter(t)&&(!q||matchQ(q,t.name,t.wbs,schWbs(t.wbs)))).slice(0,60);box.innerHTML=list.map(t=>`<div class="it" data-t="${t.id}"><b style="font-weight:600;min-width:38px">${schWbs(t.wbs)}</b>${esc(t.name)}</div>`).join('')||'<div class="msg">맞는 업무가 없습니다.</div>';};
  draw(); inp.oninput=draw; inp.focus(); p.addEventListener('click',e=>{const x=e.target.closest('.it[data-t]');if(!x)return;e.stopPropagation();closePop();pick(x.dataset.t);}); }
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-schp]'); if(!el)return; const it=curItem(); if(!it||!schReady(it.proj))return; const k=el.dataset.schp, pid=it.proj, m=schModel(pid), A=AIDCSchedule;
  if(k==='tab'){SCHP.tab=el.dataset.k;if(it.editing)schPropsRefresh(it);else rerenderItem(it.id);return;}
  if(k==='more'){SCHP.more=!SCHP.more;if(it.editing)schPropsRefresh(it);else rerenderItem(it.id);return;}
  // an ordinary action item: which task it belongs to (part of its own edit, saved with 저장)
  if(k==='link-phase'||k==='link-task'){ if(!canEditItem(it))return; e.stopPropagation(); const cur=it.task&&m.byId.get(it.task);
    if(k==='link-phase'){menuPop(el,m.phases.map(g=>({t:schPhaseLabel(g),k:g.code,sel:!!cur&&cur.phase===g.code,fn:()=>{it._phase=g.code;const b=$('[data-schp="link-task"]',pinOf(it));if(b)setTimeout(()=>b.click(),0);}})));return;}
    const ph=it._phase||(cur&&cur.phase)||''; schTaskMenu(el,m,ph?'업무 선택 · '+schPhaseLabel(m.phases.find(g=>g.code===ph)):'업무 선택',t=>!ph||t.phase===ph,id=>{it.task=id;delete it._phase;it.dirty=true;rerenderItem(it.id);}); return; }
  if(k==='unlink'){ if(!canEditItem(it))return; delete it.task; delete it._phase; it.dirty=true; rerenderItem(it.id); return; }
  if(!schOwn(it))return; const t=m.byId.get(it.task);
  if(k==='f'){e.stopPropagation();schFieldEdit(el,it);return;}
  if(k==='del'){confirmDlg(`“${schTaskTitle(t)}” 업무를 삭제할까요? 이 업무에 걸린 관계도 함께 지워집니다.`,[{t:'삭제',pri:true,fn:()=>{closePanel(true);schCommit(pid,d=>A.removeTasks(d,[t.id]),schWbs(t.wbs)+' 업무 삭제');}},{t:'취소',fn:()=>{}}]);return;}
  if(k==='addrel'){e.stopPropagation();const pre=el.dataset.k==='pre';const linked=new Set((pre?m.pred.get(t.id).map(x=>x.from):m.succ.get(t.id).map(x=>x.to)).concat(t.id));
    schTaskMenu(el,m,pre?'선행 업무 추가 (끝나면 이 업무가 시작)':'후행 업무 추가 (이 업무가 끝나면 시작)',x=>!linked.has(x.id),id=>schCommit(pid,d=>{d.dependencies.push(pre?A.newDependency(id,t.id,'FS',0):A.newDependency(t.id,id,'FS',0));},schWbs(t.wbs)+(pre?' 선행 관계 추가':' 후행 관계 추가')));return;}
  if(k==='rel'){e.stopPropagation();e.preventDefault();const rel=m.plan.dependencies.find(x=>x.id===el.dataset.k);if(!rel)return;const ch=(label,fn)=>schCommit(pid,d=>{const x=d.dependencies.find(q=>q.id===rel.id);if(x)fn(x,d);},label);
    menuPop(el,[{hd:'관계 유형'}].concat(['FS','SS','FF','SF'].map(ty=>({t:ty+' · '+A.relationshipNames[ty],k:ty,sel:rel.type===ty,fn:()=>ch('관계 유형 '+ty,x=>{x.type=ty;})})),['-',{t:'간격 '+(rel.lag?(rel.lag>0?'+':'')+rel.lag+'일':'없음')+' · 변경…',k:'lag',fn:()=>askInput('간격 (일) · 음수는 앞당김',String(rel.lag||0),v=>{const n=Math.round(Number(v));if(!Number.isFinite(n)||Math.abs(n)>36500){toast('정수를 입력하세요.');return;}ch('관계 간격 '+n+'일',x=>{x.lag=n;});})},
      {t:rel.active?'계산에서 빼기 (조건부)':'계산에 다시 쓰기',k:'act',fn:()=>ch(rel.active?'관계 사용 중지':'관계 다시 사용',x=>{x.active=!x.active;})},{t:'관계 삭제',k:'del',danger:true,fn:()=>schCommit(pid,d=>{d.dependencies=d.dependencies.filter(q=>q.id!==rel.id);},'관계 삭제')}]));return;}
  if(k==='addref'){e.stopPropagation();const cur=((SCHED[pid]||{})['c:'+t.id]||{}).ids||[];const list=ITEMS.filter(i=>(i.type==='meeting'||i.type==='research')&&isLive(i)&&!cur.includes(i.id)).sort(newestFirst).slice(0,60);const short=x=>{x=(x||'제목 없음').split('\n').join(' ');return x.length>34?x.slice(0,34)+'…':x;};
    menuPop(el,[{hd:'미팅 · 리서치 연결 (일정에는 영향 없음)'}].concat(list.map(i=>({t:(i.type==='meeting'?'미팅 · ':'리서치 · ')+short(i.title),k:i.id,fn:()=>schSet(pid,'c:'+t.id,{ids:cur.concat(i.id)},'참고 자료를 연결했습니다')}))),{cls:'link'});return;}
  if(k==='unref'){e.stopPropagation();const cur=((SCHED[pid]||{})['c:'+t.id]||{}).ids||[];const nx=cur.filter(x=>x!==el.dataset.k);schSet(pid,'c:'+t.id,nx.length?{ids:nx}:null,'참고 자료 연결을 해제했습니다');return;}
},true);
// Saving the panel of a task with a new title renames the task.
function schAfterSave(it){ if(!schOwn(it))return; const m=schModel(it.proj), t=m.byId.get(it.task), name=(it.title||'').split('\n').join(' ').trim(); if(name&&name!==t.name)schEditTask(it.proj,t.id,schWbs(t.wbs)+' 업무명 변경',x=>{x.name=name;},true,true); } // the caller redraws
