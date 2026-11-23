// Changing a value of a procurement package, a gate or an evidence record: in its row or in its panel. Applies at once.
function schPkgEdit(pid,id,label,fn){ return schCommit(pid,d=>{const x=d.procurement.find(q=>q.id===id); if(x)fn(x);},label); }
function schPkgField(el,pid,id,k){ const m=schModel(pid), x=m.plan.procurement.find(q=>q.id===id); if(!x)return; const nm=x.name;
  const num=(label,cur,hi,apply,int)=>askInput(label,cur==null||cur===0?'':String(cur),v=>{v=(v||'').trim();if(v===''){apply(null);return;}const n=Number(v.replace(/[^\d.]/g,''));if(!Number.isFinite(n)||n<0||n>hi){toast(`0~${hi} 사이의 숫자를 입력하세요.`);return;}apply(int?Math.round(n):n);});
  if(k==='delay'){num('PO 추가지연 (일)',x.delay,36500,n=>schPkgEdit(pid,id,`${nm} PO 추가지연 ${n||0}일`,q=>{q.delay=n||0;}),true);return;}
  if(k==='commitment'){menuPop(el,SCH_COMMIT.map((s,i)=>({t:s,html:schStateMark(s),k:'c'+i,sel:x.commitment===s,fn:()=>schPkgEdit(pid,id,`${nm} ${s}`,q=>{q.commitment=s;})})),{cls:'sch-colmenu'});return;}
  if(k==='leadWeeks'){num('확약 납기 (주) · 비우면 미입력',x.leadWeeks,5200,n=>schPkgEdit(pid,id,`${nm} 확약 납기 ${n===null?'지움':n+'주'}`,q=>{q.leadWeeks=n;}));return;}
  if(k==='trigger'){menuPop(el,SCH_TRIGGERS.map((s,i)=>({t:s,k:'t'+i,sel:x.trigger===s,fn:()=>schPkgEdit(pid,id,`${nm} 납기 기산조건 ${s}`,q=>{q.trigger=s;if(s==='PO 발행'||s==='미확정')q.triggerDate=null;})})));return;}
  if(k==='triggerDate'){datePick(el,x.triggerDate||schToday(),v=>schPkgEdit(pid,id,`${nm} 기산조건 충족일`,q=>{q.triggerDate=v||null;}),{clear:'충족일 없음'});return;}
  if(k==='transport'){num('별도 운송 (일)',x.transport,36500,n=>schPkgEdit(pid,id,`${nm} 별도 운송 ${n||0}일`,q=>{q.transport=n||0;}),true);return;}
  if(k==='name'){askInput('설비 이름',x.name,v=>{v=(v||'').trim();if(v)schPkgEdit(pid,id,'패키지 이름 변경',q=>{q.name=v;});});return;}
  if(k.startsWith('ptask:')){const f=k.slice(6);schTaskMenu(el,m,'업무 선택',t=>true,tid=>schPkgEdit(pid,id,`${nm} 연결 업무 변경`,q=>{q[f]=tid;}));return;}
  if(k==='pdel'){confirmDlg(`“${nm}” 패키지를 삭제할까요?`,[{t:'삭제',pri:true,fn:()=>{closePanel(true);schCommit(pid,d=>{d.procurement=d.procurement.filter(q=>q.id!==id);},nm+' 패키지 삭제');}},{t:'취소',fn:()=>{}}]);return;}
  if(k==='supplier'||k==='evidence'){const lb=k==='supplier'?'공급사·계약상태':'견적·조건 증빙';askInput(lb,x[k]||'',v=>schPkgEdit(pid,id,`${nm} ${lb}`,q=>{q[k]=(v||'').trim();}));return;}
  if(k==='people'){const cur=Array.isArray(x.people)?x.people:[];menuPop(el,[{hd:'담당 멤버'}].concat(Object.keys(PEOPLE).map(u=>({t:PEOPLE[u],k:u,ico:av('av15'),sel:cur.includes(u),fn:()=>schPkgEdit(pid,id,`${nm} 담당자 변경`,q=>{const now=Array.isArray(q.people)?q.people:[];const nx=now.includes(u)?now.filter(z=>z!==u):now.concat(u);if(nx.length)q.people=nx;else delete q.people;})}))),{multi:true,cls:'multi'});return;} }
// "+" of the lower section: a package (it needs the task that orders and the task that installs), a gate (the task it waits for) or a record
function schLowerAdd(el,pid){ const m=schModel(pid), A=AIDCSchedule; if(!m)return;
  if(SCHU.sec==='proc'){ askInput('추가할 설비 패키지 이름','',name=>{name=(name||'').trim();if(!name)return; schTaskMenu(el,m,'① 계약·PO 업무 선택',t=>true,po=>{ setTimeout(()=>schTaskMenu(el,m,'② 설치 완료 업무 선택',t=>t.id!==po,ins=>{
      const id='추가'+crypto.randomUUID().slice(0,6); if(schCommit(pid,d=>{d.procurement.push({id,name,poTaskId:po,deliveryTaskId:ins,installTaskId:ins,satTaskId:ins,delay:0,leadWeeks:null,trigger:'미확정',triggerDate:null,transport:0,commitment:'미확약',supplier:'',evidence:'',sourceIndex:-1});},name+' 패키지 추가'))openPanel(`sp-${pid}-${id}`); }),0); }); }); return; }
  if(SCHU.sec==='gate'){ askInput('추가할 승인게이트 (승인 사항)','',title=>{title=(title||'').trim();if(!title)return; schTaskMenu(el,m,'이 승인이 기다리는 업무 선택',t=>true,task=>{ const id=crypto.randomUUID().slice(0,8); schSet(pid,'g:u:'+id,{title,task,status:'확인 전',by:sharedUser,at:new Date().toISOString()},'승인게이트를 추가했습니다'); openPanel(`sg-${pid}-u:${id}`); }); }); return; }
  const kind=SCHU.evKind==='assumptionsAndReferences'?'assumptionsAndReferences':'commitmentReviews';
  askInput(kind==='commitmentReviews'?'보완·확약 항목 제목':'전제·근거 항목 제목','',t=>{t=(t||'').trim();if(!t)return;const id=crypto.randomUUID().slice(0,8);SCHU.evKind=kind;schSet(pid,'e:u:'+id,{kind,title:t,status:kind==='commitmentReviews'?'확인 필요':'',by:sharedUser,at:new Date().toISOString()},'항목을 추가했습니다');openPanel(`se-${pid}-u-${id}`);}); }
function schGateState(el,pid,code){ const root=SCHED[pid]||{}, cur=root['g:'+code]||{}, m=schModel(pid), g=schGates(pid,m).find(q=>q.code===code); if(!g)return;
  menuPop(el,SCH_GATE_ST.map((s,i)=>({t:s,html:schStateMark(s),k:'g'+i,sel:g.st===s,fn:()=>schSet(pid,'g:'+code,{...cur,status:s,by:sharedUser,at:new Date().toISOString()},`${code} ${s}`)})),{cls:'sch-colmenu'}); }
function schEvState(el,pid,key){ const root=SCHED[pid]||{}, cur=root[key]||{};
  menuPop(el,SCH_EV_ST.map((s,i)=>({t:s,html:schStateMark(s),k:'e'+i,sel:cur.status===s,fn:()=>schSet(pid,key,{...cur,status:s},'상태: '+s)})).concat(key.startsWith('e:u:')?[]:['-',{t:'원본 상태로',k:'reset',fn:()=>{const nx={...cur};delete nx.status;schSet(pid,key,Object.keys(nx).length?nx:null,'원본 상태로 되돌렸습니다');}}]),{cls:'sch-colmenu'}); }
// row cells that change a value without opening the panel
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-schc]'); if(!el)return; const pid=S.proj; if(S.page!=='project'||!schReady(pid))return; e.stopPropagation(); e.preventDefault(); const k=el.dataset.schc, v=el.dataset.k;
  if(k==='pdelay')schPkgField(el,pid,v,'delay'); else if(k==='pcommit')schPkgField(el,pid,v,'commitment'); else if(k==='gstate')schGateState(el,pid,v); else if(k==='estate')schEvState(el,pid,v);
},true);
// the same in the panel of a package, a gate or a record
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-schx]'); if(!el)return; const mm=/^s([pge])-([^-]+)-(.+)$/.exec(S.panel||''); if(!mm||!schReady(mm[2]))return; e.stopPropagation(); const pid=mm[2], rest=mm[3], k=el.dataset.schx, root=SCHED[pid]||{};
  if(mm[1]==='p'){schPkgField(el,pid,rest,k);return;}
  if(mm[1]==='g'&&k.startsWith('gu:')){ const key='g:'+rest, cur=root[key]||{}, f=k.slice(3), m=schModel(pid);
    if(f==='del'){confirmDlg('이 승인게이트를 삭제할까요?',[{t:'삭제',pri:true,fn:()=>{closePanel(true);schSet(pid,key,null,'승인게이트를 삭제했습니다');}},{t:'취소',fn:()=>{}}]);return;}
    if(f==='task'){schTaskMenu(el,m,'이 승인이 기다리는 업무 선택',t=>true,task=>schSet(pid,key,{...cur,task},'연결 업무를 바꿨습니다'));return;}
    const lb={title:'승인 사항',role:'승인 역할',evidence:'통과 증빙',fallback:'미충족 처리'}[f]; askInput(lb,cur[f]||'',v=>{v=(v||'').trim();if(f==='title'&&!v)return;schSet(pid,key,{...cur,[f]:v},lb+'을(를) 바꿨습니다');}); return; }
  if(mm[1]==='g'){ if(k==='gstate')schGateState(el,pid,rest); else if(k==='gnote'){const cur=root['g:'+rest]||{};askInput('메모',cur.note||'',v=>{const nx={...cur,note:(v||'').trim()};if(!nx.note)delete nx.note;schSet(pid,'g:'+rest,Object.keys(nx).length?nx:null,'메모를 저장했습니다');});} return; }
  const um=/^u-(.+)$/.exec(rest), km=/^([A-Za-z]+)-(\d+)$/.exec(rest); let key='';
  if(um)key='e:u:'+um[1]; else if(km){const r=schEvRows(pid,km[1])[+km[2]];key=r?r.key:'';} if(!key)return; const cur=root[key]||{};
  if(k==='estate'){schEvState(el,pid,key);return;}
  if(k==='enote'){askInput('메모',cur.note||'',v=>{const nx={...cur,note:(v||'').trim()};if(!nx.note)delete nx.note;schSet(pid,key,Object.keys(nx).length?nx:null,'메모를 저장했습니다');});return;}
  if(k==='u:del'){confirmDlg('이 항목을 삭제할까요?',[{t:'삭제',pri:true,fn:()=>{closePanel(true);schSet(pid,key,null,'항목을 삭제했습니다');}},{t:'취소',fn:()=>{}}]);return;}
  if(k.startsWith('u:')){const f=k.slice(2), lb={title:'제목',cat:'구분',link:'연결 업무 (WBS)',role:'확인 역할',body:'내용',ref:'근거·URL'}[f];
    if(f==='title'){askInput(lb,cur.title||'',v=>{v=(v||'').replace(/\s+/g,' ').trim();if(!v||v===cur.title)return;schSet(pid,key,{...cur,title:v},'제목을 바꿨습니다');});return;}
    if(f==='due'){datePick(el,cur.due||schToday(),v=>schSet(pid,key,{...cur,due:v||''},'기한을 바꿨습니다'),{clear:'기한 없음'});return;}
    askInput(lb,cur[f]||'',v=>{v=(v||'').trim();if(f==='link')v=v.replace(/(^|[^\dW.])(\d+)-(\d+)/g,'$1W$2.$3');schSet(pid,key,{...cur,[f]:v},lb+'을(를) 바꿨습니다');});return;}
},true);
// after a change the open panel of a package / gate / record is drawn again
function schPanelRefresh(){ const id=S.panel; if(!id||!/^s[pget]-/.test(id))return; const html=schPanelHtml(id), pin=$('#panel-pin'); if(!html){closePanel(true);return;} const st=$('#panel').scrollTop; pin.innerHTML=html; fitTitle(pin); $('#panel').scrollTop=st; }
