// Excel upload on the project page (owner, 2026-11-23): "엑셀 업로드" beside 수정 fills the schedule sections of the project from the
// owner's guide workbook. One master file, or several files that each hold some of its sheets:
//   단계별업무분장 (or, alone, 마스터스케줄)  -> 액션 일정 · 리스트        업무연결       -> 액션 관계도
//   외부설비 조달대장                         -> 외부설비 조달             승인게이트     -> 승인게이트
//   보완·확약관리 · 전제와참고자료 · 책임경계 · NVIS일정검토 · 오프테이커 후보검토 · 원자료대조 -> 근거 및 확약
//   검토요약 (기준일)                         -> the status date
// How it is kept: what was read is merged into the project's source plan (the sections that were not uploaded stay), the whole
// source plan is stored as one file on the server (gzip, /api/file) and the project's record names it (`src` in meta:sched:<project>).
// 00-state.js loads the named file in place of the built-in plan. What members changed in the app are overrides on top of the source
// plan, so they stay; only where the workbook itself changed a value does the workbook win (schUpReconcile). Tasks keep their ids by
// WBS, so their bodies, comments and files stay attached. One undo step takes the whole upload back.
// The reading is in the Excel bundle (schedule/xlsx.ts readSheets); nothing is written before 적용.
const SCHUP={pid:'',files:[],plan:null,busy:false,fail:'',run:0,off:null};
const SCH_UP_REC=[['procurementPackages','외부설비 조달대장'],['gates','승인게이트'],['commitmentReviews','보완·확약관리'],['assumptionsAndReferences','전제와참고자료'],['responsibilityBoundaries','책임경계'],['nvisScheduleReview','NVIS일정검토'],['offtakers','오프테이커 후보검토'],['sourceMappings','원자료대조']];
const SCH_UP_EVK=['commitmentReviews','assumptionsAndReferences','responsibilityBoundaries','nvisScheduleReview','offtakers','sourceMappings'];
// what the workbook says about a task, a relation, a package (everything else in an override is only known to the app: members, importance, address, reason)
const SCH_UP_TF=['wbs','phase','phaseLabel','name','order','kind','referenceStart','referenceFinish','plannedStart','plannedFinish','delay','actualStart','actualFinish','remaining','progress','status','primary','secondary','headcount','roles','criteria','conditions','evidence','sourceRow','sourceSheet','finishRule'];
const SCH_UP_DF=['sourceId','from','to','type','lag','active','condition'];
const SCH_UP_PF=['name','poTaskId','deliveryTaskId','installTaskId','satTaskId','delay','leadWeeks','trigger','triggerDate','transport','commitment','supplier','evidence','sourceIndex'];
const SCH_UP_SHOWN=['name','phase','phaseLabel','kind','referenceStart','referenceFinish','plannedStart','plannedFinish','delay','actualStart','actualFinish','remaining','progress','status','primary','secondary','headcount','roles','criteria','conditions','evidence'];

// the source plan without what only the original workbook needs (cell copies, formulas): this is what is stored
function schUpSlim(src){ const rec=(k,r)=>({provenance:r.provenance||{},fields:r.fields||{},sourceCells:k==='procurementPackages'?(r.sourceCells||{}):{}}), out=schEmptySource();
  out.sourceFile=src.sourceFile||''; out.sourceSha256=src.sourceSha256||''; out.statusDate=src.statusDate;
  out.tasks=(src.tasks||[]).map(t=>{const x=Object.assign({},t);delete x.sourceCells;delete x.sourceFormulas;return x;});
  out.dependencies=(src.dependencies||[]).map(d=>({id:d.id,sourceId:d.sourceId,predecessorId:d.predecessorId,successorId:d.successorId,type:d.type,lag:d.lag,activeInBaseScenario:d.activeInBaseScenario,conditionNote:d.conditionNote||''}));
  for(const [k] of SCH_UP_REC)out[k]=(src[k]||[]).map(r=>rec(k,r));
  out.sourceProjectSummary=src.sourceProjectSummary||[]; return out; }
const schUpRecKey=(kind,f,i)=>kind==='gates'?String(f['게이트']):kind==='procurementPackages'?String(f['패키지']):String(f.ID||f['원ID']||i);
function schUpCount(a,b,fields){ const A=new Map(a.map(x=>[x.id,x])), B=new Set(b.map(x=>x.id)); let add=0,chg=0,del=0; for(const x of b){const o=A.get(x.id); if(!o)add++; else if(fields.some(f=>!same(o[f],x[f])))chg++;} for(const x of a)if(!B.has(x.id))del++; return {n:b.length,add,chg,del}; }
function schUpRecCount(kind,a,b){ const A=new Map(a.map((r,i)=>[schUpRecKey(kind,r.fields,i),r.fields])), B=new Set(); let add=0,chg=0,del=0; b.forEach((r,i)=>{const k=schUpRecKey(kind,r.fields,i), o=A.get(k); B.add(k); if(!o)add++; else if(!same(schUpSorted(o),schUpSorted(r.fields)))chg++;}); for(const k of A.keys())if(!B.has(k))del++; return {n:b.length,add,chg,del}; }
// equal whatever the order of the names, and a date is a date with or without the time the first archive carried ("2027-03-05T00:00:00")
const schUpSorted=f=>Object.keys(f).sort().map(k=>[k,typeof f[k]==='string'&&/^\d{4}-\d{2}-\d{2}T00:00:00$/.test(f[k])?f[k].slice(0,10):f[k]]).filter(x=>x[1]!==null&&x[1]!==undefined);

// What happens to the changes members made in the app when the source plan under them is replaced (a three-way merge, one value at a time):
// a value the workbook did not change keeps the member's change; a value the workbook changed too becomes the workbook's (counted in
// `replaced`, told before 적용); a task / relation / package that was added in the app and is not in the workbook stays; what hangs on
// something that is gone is dropped. Returns the fields of the record to change (null = remove).
function schUpReconcile(ov,oldBase,newBase,oldSrc,newSrc,has){ const out={}; let replaced=0;
  const map=l=>new Map(l.map(x=>[x.id,x])), oT=map(oldBase.tasks), nT=map(newBase.tasks), oD=map(oldBase.dependencies), nD=map(newBase.dependencies), oP=map(oldBase.procurement), nP=map(newBase.procurement);
  const merge=(key,v,o,n,F)=>{ let lost=0; const next={}; for(const [f,x] of Object.entries(v)){ if(F.includes(f)&&!same(o?o[f]:undefined,n[f])){lost++;continue;} next[f]=x; } if(lost){replaced+=lost;out[key]=Object.keys(next).length?next:null;} };
  const appOnly=(v,F)=>{const next={};for(const [f,x] of Object.entries(v))if(!f.startsWith('_')&&f!=='id'&&!F.includes(f))next[f]=x;return Object.keys(next).length?next:null;};
  const stays=new Set(nT.keys());                                    // the tasks there will be: the workbook's and those added in the app
  for(const [key,v] of Object.entries(ov)){ if(!key.startsWith('t:')||!v||typeof v!=='object')continue; const id=key.slice(2), n=nT.get(id);
    if(v._del){ if(!n)out[key]=null; continue; }
    if(v._new){ if(!n){stays.add(id);continue;} out[key]=appOnly(v,SCH_UP_TF); replaced++; continue; }   // the workbook has this WBS now: its task takes the place (and the id) of the one added in the app
    if(!n){out[key]=null;continue;} merge(key,v,oT.get(id),n,SCH_UP_TF); }
  const pairs=new Set(newBase.dependencies.map(e=>e.from+'>'+e.to+'>'+e.type));
  for(const [key,v] of Object.entries(ov)){ if(!v||typeof v!=='object')continue; const id=key.slice(2);
    if(key.startsWith('d:')){ const n=nD.get(id);
      if(v._del){ if(!n)out[key]=null; continue; }
      if(v._new){ if(n||!stays.has(v.from)||!stays.has(v.to)||pairs.has(v.from+'>'+v.to+'>'+v.type))out[key]=null; continue; }
      if(!n){out[key]=null;continue;} merge(key,v,oD.get(id),n,SCH_UP_DF); }
    else if(key.startsWith('p:')){ const n=nP.get(id);
      if(v._del){ if(!n)out[key]=null; continue; }
      if(v._new){ if(n){out[key]=appOnly(v,SCH_UP_PF);replaced++;} continue; }
      if(!n){out[key]=null;continue;} merge(key,v,oP.get(id),n,SCH_UP_PF); }
    else if(key.startsWith('g:')&&!key.startsWith('g:u:')&&has.gates){ const code=key.slice(2), f=r=>r&&String(r.fields['게이트'])===code, o=(oldSrc.gates||[]).find(f), n=(newSrc.gates||[]).find(f);
      if(!n){out[key]=null;continue;} if(v.status&&String((o&&o.fields['상태'])||'')!==String(n.fields['상태']||'')){const next=Object.assign({},v);delete next.status;replaced++;out[key]=Object.keys(next).length?next:null;} }
    else if(key.startsWith('e:')&&!key.startsWith('e:u:')){ const kind=key.split(':')[1]; if(!SCH_UP_EVK.includes(kind)||!has['ev:'+kind])continue;
      const find=l=>{const i=(l||[]).findIndex((r,j)=>schEvKey(kind,j,r.fields)===key);return i<0?null:l[i];}, o=find(oldSrc[kind]), n=find(newSrc[kind]), sf=kind==='commitmentReviews'?'확인상태':kind==='offtakers'?'현재 상태':'';
      if(!n){out[key]=null;continue;} if(sf&&v.status&&String((o&&o.fields[sf])||'')!==String(n.fields[sf]||'')){const next=Object.assign({},v);delete next.status;replaced++;out[key]=Object.keys(next).length?next:null;} }
    else if(key==='cfg'&&has.date&&v.statusDate&&oldSrc.statusDate!==newSrc.statusDate){ const next=Object.assign({},v);delete next.statusDate;replaced++;out[key]=Object.keys(next).length?next:null; } }
  return {changes:out,replaced}; }

// The source plan the project would have, and what that does: nothing is written here.
function schUpMerge(pid,reads){ const A=AIDCSchedule, D=A.dates, m=schModel(pid); if(!m)return {error:'일정을 불러오는 중입니다. 잠시 뒤에 다시 시도해주세요.'};
  const old=SCH.src[pid], oldBase=SCH.base[pid], root=SCHED[pid]||{}, src=schUpSlim(old), warn=[], R={}; let T=null, L=null, when='', sum=null;
  const twice=(what,r)=>warn.push(`${what} 시트가 두 파일에 있습니다. “${r.name}” 기준으로 반영합니다.`);
  for(const r of reads){
    if(r.tasks){ if(!T||(T.tasksPartial&&!r.tasksPartial))T=r; else if(T.tasksPartial===r.tasksPartial){twice('업무',r);T=r;} }
    if(r.links){ if(L)twice('업무연결',r); L=r; }
    for(const [k,label] of SCH_UP_REC)if(r.records&&r.records[k]){ if(R[k])twice(label,r); R[k]=r; }
    if(r.statusDate)when=r.statusDate; if(r.summary)sum=r.summary; }
  const has={tasks:!!T,links:!!L,proc:!!R.procurementPackages,gates:!!R.gates,evid:SCH_UP_EVK.some(k=>R[k]),date:!!when&&when!==old.statusDate}; for(const k of SCH_UP_EVK)has['ev:'+k]=!!R[k];
  if(!(has.tasks||has.links||has.proc||has.gates||has.evid||when))return {none:true,warn,has};
  // the plan as it is now, without a scenario this browser may be looking at
  let cur=m.plan, curRes=m.res; if(schScenario(pid)){ try{cur=A.applyOverrides(oldBase,root);curRes=schCalc(cur);}catch(e){cur=oldBase;curRes=schCalc(cur);} }
  const oldIds=new Set(old.tasks.map(t=>t.id)), added=cur.tasks.filter(t=>!oldIds.has(t.id)), oldTask=new Map(old.tasks.map(t=>[t.sourceWbs,t])), addedBy=new Map(added.map(t=>[t.wbs,t]));
  if(T){ const cols=new Set(T.taskCols||[]), label=new Map(m.phases.map(g=>[g.code,g.label]));
    src.tasks=T.tasks.map(x=>{ const o=oldTask.get(x.wbs), a=addedBy.get(x.wbs), id=o?o.id:a?a.id:`${pid}:task:${x.wbs}`, pick=(k,v,was,def)=>cols.has(k)?v:(o?was:def), ro=(o&&o.roleResponsibilities)||{}, fo=(o&&o.importedForecast)||{};
      const kind=cols.has('kind')||cols.has('days')?x.kind:(o?o.kind:'task');
      return {id,sourceWbs:x.wbs,sourcePhase:x.phase||(o&&o.sourcePhase)||label.get(x.phaseCode)||x.phaseCode,phaseCode:x.phaseCode,name:x.name,kind,
        importedReference:{start:x.start,finish:x.finish,durationCalendarDays:kind==='milestone'?0:D.diffDays(x.finish,x.start)+1},
        importedForecast:{start:x.fStart||x.start,finish:x.fFinish||x.finish,operationTotalSlackCalendarDays:pick('slack',x.slack,fo.operationTotalSlackCalendarDays??null,null)},
        roleResponsibilities:{A:pick('roleA',x.roleA,ro.A||'',''),R:pick('roleR',x.roleR,ro.R||'',''),C:pick('roleC',x.roleC,ro.C||'','')},
        primaryAssignee:pick('primary',x.primary,o&&o.primaryAssignee||null,null),secondaryAssignee:pick('secondary',x.secondary,o&&o.secondaryAssignee||null,null),headcount:pick('headcount',x.headcount,o?o.headcount??null:null,null),
        sourceProgressFraction:pick('progress',x.progress,o?o.sourceProgressFraction??null:null,null),sourceStatus:pick('status',x.status,o&&o.sourceStatus||'',''),acceptanceCriteria:pick('criteria',x.criteria,o&&o.acceptanceCriteria||'',''),
        extraDelayCalendarDays:pick('delay',x.delay,o?o.extraDelayCalendarDays??null:null,null),actualStart:pick('actualStart',x.actualStart,o&&o.actualStart||null,null),actualFinish:pick('actualFinish',x.actualFinish,o&&o.actualFinish||null,null),
        remainingCalendarDays:pick('remaining',x.remaining,o?o.remainingCalendarDays??null:null,null),commitmentAndOriginalStatus:pick('conditions',x.conditions,o&&o.commitmentAndOriginalStatus||'',''),evidenceNote:pick('evidence',x.evidence,o&&o.evidenceNote||null,null),
        sourceCalendarCondition:pick('calendar',x.calendar,o&&o.sourceCalendarCondition||'','달력일'),provenance:{fileSha256:T.sha,sheet:T.tasksFrom,row:x.row}}; }); }
  // a relation names its tasks by WBS: the workbook's tasks first, then those added in the app
  const idOf=new Map(src.tasks.map(t=>[t.sourceWbs,t.id])); for(const t of added)if(!idOf.has(t.wbs))idOf.set(t.wbs,t.id);
  if(L){ const byPair=new Map(old.dependencies.map(d=>[d.predecessorId+'>'+d.successorId+'>'+d.type,d])), seen=new Set(), ids=new Set(); let lost=0, dup=0; src.dependencies=[];
    for(const x of L.links){ const a=idOf.get(x.from), b=idOf.get(x.to); if(!a||!b){lost++;continue;} const k=a+'>'+b+'>'+x.type; if(seen.has(k)){dup++;continue;} seen.add(k);
      const o=byPair.get(k); let id=o?o.id:`${pid}:link:${x.from}>${x.to}:${x.type}`; if(ids.has(id))id+=':'+ids.size; ids.add(id);
      src.dependencies.push({id,sourceId:x.sourceId,predecessorId:a,successorId:b,type:x.type,lag:Math.round(x.lag||0),activeInBaseScenario:!!x.active,conditionNote:x.note||''}); }
    if(lost)warn.push(`업무연결: 업무 목록에 없는 WBS를 가리키는 관계 ${lost}건은 넣지 않았습니다.${!src.tasks.length?' 업무 시트(단계별업무분장)를 함께 올려주세요.':''}`);
    if(dup)warn.push(`업무연결: 선행·후행·유형이 같은 관계 ${dup}건은 한 번만 넣었습니다.`); }
  else if(T){ const alive=new Set(idOf.values()), n0=src.dependencies.length; src.dependencies=src.dependencies.filter(d=>alive.has(d.predecessorId)&&alive.has(d.successorId)); if(n0!==src.dependencies.length)warn.push(`없어지는 업무에 걸려 있던 관계 ${n0-src.dependencies.length}건이 함께 빠집니다.`); }
  for(const [k] of SCH_UP_REC)if(R[k])src[k]=R[k].records[k].map(r=>({provenance:r.provenance,fields:r.fields,sourceCells:k==='procurementPackages'?r.sourceCells:{}}));
  if(when)src.statusDate=when; if(sum)src.sourceProjectSummary=sum;
  src.sourceFile=[...new Set(reads.map(r=>r.name))].join(', ').slice(0,300); src.sourceSha256=(T||L||reads[0]).sha||'';
  let newBase; try{newBase=A.planFromSource(src);}catch(e){return {error:String(e&&e.message||e),warn,has};}
  const rec=schUpReconcile(root,oldBase,newBase,old,src,has), next=Object.assign({},root); for(const [k,v] of Object.entries(rec.changes)){if(v===null)delete next[k];else next[k]=v;}
  for(const [k,v] of Object.entries(root)){ if(!k.startsWith('sc:')||!v||!v.ov)continue; const r2=schUpReconcile(v.ov,oldBase,newBase,old,src,has); if(!Object.keys(r2.changes).length)continue;   // a scenario holds changes of its own: the same rule
    const ov=Object.assign({},v.ov); for(const [a,b] of Object.entries(r2.changes)){if(b===null)delete ov[a];else ov[a]=b;} rec.changes[k]=Object.assign({},v,{ov}); }
  let plan,res; try{ plan=A.applyOverrides(newBase,next);
    const bad=plan.tasks.length?A.validatePlan(plan).filter(i=>i.severity==='error'):[]; if(bad.length)return {error:[...new Set(bad.map(i=>i.message))].slice(0,4).join(' / ')+(bad.length>4?` 외 ${bad.length-4}건`:''),warn,has};
    res=schCalc(plan); }catch(e){ return {error:'올린 내용으로 일정을 계산할 수 없습니다: '+String(e&&e.message||e),warn,has}; }
  const hidden=newBase.procurement.length-plan.procurement.length-Object.keys(next).filter(k=>k.startsWith('p:')&&next[k]&&next[k]._del).length; if(hidden>0&&(has.proc||has.tasks))warn.push(`외부설비 ${hidden}건은 연결 업무(WBS)가 업무 목록에 없어 표에 나오지 않습니다.`);
  const cT=schUpCount(cur.tasks,plan.tasks,SCH_UP_SHOWN), cL=schUpCount(cur.dependencies,plan.dependencies,['from','to','type','lag','active','condition']), cP=schUpCount(cur.procurement,plan.procurement,SCH_UP_PF.filter(f=>f!=='sourceIndex')),
    cG=schUpRecCount('gates',old.gates||[],src.gates), cE={n:0,add:0,chg:0,del:0}; for(const k of SCH_UP_EVK)if(R[k]){const c=schUpRecCount(k,old[k]||[],src[k]);for(const f of ['n','add','chg','del'])cE[f]+=c[f];}
  const common=l=>l.filter(t=>cur.tasks.some(x=>x.id===t.id)&&plan.tasks.some(x=>x.id===t.id)).map(t=>t.id).join(','), reordered=has.tasks&&common(cur.tasks)!==common(plan.tasks);
  let moved=0; for(const t of plan.tasks){const a=curRes.tasks[t.id], b=res.tasks[t.id]; if(a&&b&&(a.start!==b.start||a.finish!==b.finish))moved++;}
  const diff=c=>c.add+c.chg+c.del, total=diff(cT)+diff(cL)+diff(cP)+(has.gates?diff(cG):0)+diff(cE)+(has.date?1:0)+(reordered?1:0)+Object.keys(rec.changes).length;
  return {src,has,warn,changes:rec.changes,replaced:rec.replaced,same:!total,partial:!!(T&&T.tasksPartial),moved,reordered,op0:curRes.operationDate||'',op1:res.operationDate||'',when,
    n:{tasks:plan.tasks.length,links:plan.dependencies.length,proc:plan.procurement.length,gates:src.gates.length,evid:cE.n},c:{tasks:cT,links:cL,proc:cP,gates:cG,evid:cE}}; }

/* ---------- the window ---------- */
function schUpPlan(){ SCHUP.plan=null; SCHUP.fail=''; const reads=SCHUP.files.filter(f=>f.res).map(f=>f.res); if(!reads.length)return; try{SCHUP.plan=schUpMerge(SCHUP.pid,reads);}catch(e){SCHUP.plan={error:String(e&&e.message||e),warn:[],has:{}};} }
function schUpClose(){ const d=$('#dlg.sch-up'); if(d)d.remove(); if(SCHUP.off)SCHUP.off(); SCHUP.off=null; SCHUP.run++; SCHUP.files=[]; SCHUP.plan=null; SCHUP.busy=false; }
function schUpFileHtml(f,i){ const r=f.res, tags=[]; let notes='';
  if(r){ if(r.tasks)tags.push([r.tasksPartial?'일정(날짜)':'일정 · 리스트',r.tasks.length]); if(r.links)tags.push(['관계도',r.links.length]);
    for(const [k,label] of SCH_UP_REC)if(r.records[k])tags.push([k==='procurementPackages'?'외부설비':k==='gates'?'승인게이트':label,r.records[k].length]);
    if(r.statusDate)tags.push(['기준일',schD(r.statusDate)]);
    if(!tags.length&&!r.notes.some(n=>n.level==='error'))notes+=`<div class="up-nt err">${r.found.length?'읽을 내용이 있는 시트가 없습니다. (계산 결과 시트만 들어 있습니다)':'가이드 엑셀의 시트를 찾지 못했습니다.'}${r.other.length?` 시트 이름: ${esc(r.other.slice(0,6).join(', '))}`:''}</div>`;
    for(const n of r.notes)notes+=`<div class="up-nt ${n.level==='error'?'err':''}">${n.sheet?`<b>${esc(n.sheet)}</b> `:''}${esc(n.text)}${n.level==='error'?' <i>이 시트는 반영하지 않습니다.</i>':''}</div>`; }
  if(f.err)notes+=`<div class="up-nt err">${esc(f.err)}</div>`;
  return `<div class="up-file ${f.err?'bad':''}"><div class="up-top">${svg('i-sch-xls',14,14)}<span class="nm" title="${esc(f.name)}">${esc(f.name)}</span><span class="sz">${fmtSize(f.size)}</span>${f.reading?'<span class="rd">읽는 중…</span>':''}<button class="rm" data-up="rm" data-i="${i}" title="목록에서 빼기" aria-label="목록에서 빼기">${svg('i-x',9,9)}</button></div>
    ${tags.length?`<div class="up-tags">${tags.map(t=>`<span>${esc(t[0])}<b>${esc(String(t[1]))}</b></span>`).join('')}</div>`:''}${notes}</div>`; }
function schUpResultHtml(P){ if(!P)return '';
  if(P.none)return `<div class="up-res"><p class="up-say">반영할 수 있는 시트가 없습니다. 가이드 엑셀의 시트 이름과 머리글을 그대로 둔 파일을 올려주세요.</p></div>`;
  if(P.error)return `<div class="up-res bad"><h4>이대로는 반영할 수 없습니다</h4><p class="up-say">${esc(P.error)}</p>${(P.warn||[]).map(w=>`<p class="up-wn">${esc(w)}</p>`).join('')}</div>`;
  const txt=c=>{const a=[];if(c.add)a.push(`새로 ${c.add}`);if(c.chg)a.push(`바뀜 ${c.chg}`);if(c.del)a.push(`없어짐 ${c.del}`);return a.length?a.join(' · '):'변화 없음';};
  const row=(label,on,n,c,extra)=>`<div class="up-row ${on?'':'off'}"><span>${label}</span><b>${on?n+'건':''}</b><em>${on?txt(c)+(extra||''):'올리지 않음 · 그대로'}</em></div>`;
  const D=AIDCSchedule.dates, d=P.op0&&P.op1?D.diffDays(P.op1,P.op0):0;
  return `<div class="up-res"><h4>프로젝트에 반영되는 내용</h4>
    ${row('액션 일정 · 리스트',P.has.tasks,P.n.tasks,P.c.tasks,P.partial?' (날짜·작업명만)':P.reordered&&!(P.c.tasks.add+P.c.tasks.chg+P.c.tasks.del)?' · 순서 바뀜':'')}${row('액션 관계도',P.has.links,P.n.links,P.c.links)}${row('외부설비 조달',P.has.proc,P.n.proc,P.c.proc)}${row('승인게이트',P.has.gates,P.n.gates,P.c.gates)}${row('근거 및 확약',P.has.evid,P.n.evid,P.c.evid)}
    ${P.when?`<div class="up-row"><span>기준일</span><b></b><em>${schD(P.when)}${P.has.date?'':' · 변화 없음'}</em></div>`:''}
    <div class="up-row op ${d>0?'late':d<0?'early':''}"><span>운영개시 예상</span><b></b><em>${P.op0?schD(P.op0):'미정'}${P.op1!==P.op0?` → ${P.op1?schD(P.op1):'미정'}`:''}${d?` (${d>0?'+':''}${d}일)`:P.op1===P.op0?' · 변화 없음':''}${P.moved?` · 예상일이 바뀌는 액션 ${P.moved}건`:''}</em></div>
    ${P.same?'<p class="up-say">지금 프로젝트에 들어 있는 내용과 같습니다. 바뀌는 것이 없습니다.</p>':''}
    ${P.replaced?`<p class="up-wn">앱에서 고친 값 가운데 ${P.replaced}건은 엑셀에서도 바뀐 칸이라 엑셀 값이 됩니다.</p>`:''}${P.warn.map(w=>`<p class="up-wn">${esc(w)}</p>`).join('')}
    <p class="up-ft">올리지 않은 구역, 앱에서 고친 값과 직접 추가한 액션은 그대로 둡니다. 적용한 뒤에도 되돌릴 수 있습니다.</p></div>`; }
function schUpDraw(){ const box=$('#dlg.sch-up .box'); if(!box)return; const pid=SCHUP.pid, P=SCHUP.plan, n=SCHUP.files.length, reading=SCHUP.files.some(f=>f.reading), cur=(SCHED[pid]||{}).src;
  const can=!!P&&!P.error&&!P.none&&!P.same&&!reading&&!SCHUP.busy, keep=box.scrollTop;
  box.innerHTML=`<h3 class="up-ttl">엑셀 업로드</h3><p class="up-sub">가이드 엑셀 양식(.xlsx) · 마스터 파일 하나 또는 구역별 파일 여러 개</p>
    <label class="up-drop ${n?'small':''}" tabindex="0"><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple hidden>
      <svg class="up-pic" viewBox="0 0 64 50" aria-hidden="true"><path d="M3 7a4 4 0 0 1 4-4h16.2a4 4 0 0 1 3 1.4L30 9h27a4 4 0 0 1 4 4v10H3z" fill="#a8a8a8"/><rect x="3" y="17" width="58" height="30" rx="4" fill="#2b2b2b"/></svg>
      <span>${n?'파일 더 올리기':'파일을 여기에 끌어다 놓거나 눌러서 선택'}</span></label>
    ${n?`<div class="up-files">${SCHUP.files.map(schUpFileHtml).join('')}</div>`:`<p class="up-hint">일정 · 리스트 · 관계도 · 외부설비 · 승인게이트 · 근거 및 확약을 한 번에 또는 따로 올릴 수 있습니다.</p>`}
    ${reading?'':schUpResultHtml(P)}${SCHUP.fail?`<p class="up-fail">${esc(SCHUP.fail)}</p>`:''}
    ${cur&&cur.name?`<p class="up-cur">지금 반영된 엑셀 · ${esc(String(cur.name))} · ${cur.at?schD(String(cur.at).slice(0,10)):''}${cur.by?' · '+esc(userName(cur.by)):''}</p>`:''}
    <div class="bt"><button data-up="x">${n?'취소':'닫기'}</button><button data-up="ok" class="pri" ${can?'':'disabled'}>${SCHUP.busy?'반영하는 중…':'적용'}</button></div>`;
  box.scrollTop=keep; }
async function schUpAdd(list){ const run=SCHUP.run; if(!list.length||SCHUP.busy)return;
  for(const f of list){ const ent=/\.xlsx$/i.test(f.name)?{name:f.name,size:f.size,file:f,reading:true}:{name:f.name,size:f.size,err:'엑셀(.xlsx) 파일만 올릴 수 있습니다.'}; const at=SCHUP.files.findIndex(x=>x.name===f.name); if(at>=0)SCHUP.files[at]=ent; else SCHUP.files.push(ent); }
  schUpDraw(); if(SCHUP.reading)return; SCHUP.reading=true;                                    // one file after the other (reading a large workbook takes a few seconds)
  try{ for(;;){ const ent=SCHUP.files.find(f=>f.reading&&f.file); if(!ent||run!==SCHUP.run)break;
      try{ const X=await schXlsx(); ent.res=await X.readSheets(ent.file); }catch(e){ ent.err=String(e&&e.message||e); }
      ent.reading=false; ent.file=null; if(run!==SCHUP.run)break; schUpPlan(); schUpDraw(); } }
  finally{ SCHUP.reading=false; } }
async function schGzip(text){ const raw=new TextEncoder().encode(text); if(typeof CompressionStream==='undefined')return {bytes:raw,gz:false};
  return {bytes:new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()),gz:true}; }
async function schUpApply(){ const pid=SCHUP.pid, run=SCHUP.run; if(SCHUP.busy||SCHUP.files.some(f=>f.reading))return; schUpPlan(); const P=SCHUP.plan; if(!P||P.error||P.none||P.same){schUpDraw();return;}
  SCHUP.busy=true; schUpDraw(); const want=schSrcWant(pid), reads=SCHUP.files.filter(f=>f.res).map(f=>f.res);
  try{ const json=JSON.stringify(P.src), z=await schGzip(json);
    if(z.bytes.length>1887436)throw new Error('올린 내용이 저장 한도(1.8MB)를 넘습니다. 쓰지 않는 행을 줄인 뒤 다시 올려주세요.');
    const d=await sharedUploadFile(new File([z.bytes],`${pid}-일정원본-${TODAY}.json${z.gz?'.gz':''}`,{type:z.gz?'application/gzip':'application/json'}),'sched-src-'+pid);
    if(run!==SCHUP.run)return;
    // what the server sent meanwhile is in: the merge is worked out once more on what is there now
    const P2=schSrcWant(pid)===want&&schReady(pid)?schUpMerge(pid,reads):null;
    if(!P2||P2.error||P2.none||JSON.stringify(P2.src)!==json){ SCHUP.busy=false; schUpPlan(); SCHUP.fail='그 사이에 이 프로젝트의 일정이 바뀌어 다시 계산했습니다. 내용을 확인하고 적용을 다시 눌러주세요.'; schUpDraw(); return; }
    const root=SCHED[pid]||(SCHED[pid]={}), before={}, after=Object.assign({src:{id:d.id,name:P.src.sourceFile,at:new Date().toISOString(),by:sharedUser,parts:['tasks','links','proc','gates','evid'].filter(k=>P.has[k]),n:{tasks:P.src.tasks.length,links:P.src.dependencies.length}}},P2.changes);
    for(const k of Object.keys(after))before[k]=root[k]===undefined?null:copy(root[k]);
    SCH.arch[d.id]=P.src;                                                         // this page has the plan it just sent: no need to ask for it
    for(const [k,v] of Object.entries(after)){if(v===null)delete root[k];else root[k]=copy(v);}
    SCH.memo[pid]=null; SCH.undo.push({pid,sc:'',raw:true,before,after,label:'엑셀 업로드'}); if(SCH.undo.length>100)SCH.undo.shift(); SCH.redo.length=0;
    const said=[]; if(P.has.tasks)said.push(`액션 ${P.n.tasks}건`); if(P.has.links)said.push(`관계 ${P.n.links}건`); if(P.has.proc)said.push(`외부설비 ${P.n.proc}건`); if(P.has.gates)said.push(`승인게이트 ${P.n.gates}건`); if(P.has.evid)said.push(`근거·확약 ${P.n.evid}건`);
    schUpClose(); toast('엑셀 내용을 반영했습니다'+(said.length?' · '+said.join(' · '):''),6000,{t:'되돌리기',fn:schUndo,keep:true}); schRedraw(true);
  }catch(e){ if(run!==SCHUP.run)return; SCHUP.busy=false; SCHUP.fail=String(e&&e.message||e); schUpDraw(); } }
function schUpOpen(pid){ if(!schHas(pid)||$('#dlg'))return; if(!schReady(pid)){toast(SCH.failed[pid]||'일정을 불러오는 중입니다. 잠시 뒤에 다시 눌러주세요.',3200);return;}
  closePop(); SCHUP.run++; SCHUP.pid=pid; SCHUP.files=[]; SCHUP.plan=null; SCHUP.busy=false; SCHUP.fail='';
  const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-dlg sch-up'; d.innerHTML='<div class="box" role="dialog" aria-label="엑셀 업로드"></div>'; document.body.appendChild(d);
  const zone=()=>$('.up-drop',d), stop=e=>e.preventDefault();                       // a file let go beside the window must not open in the browser
  const key=e=>{ if(e.key==='Escape'){e.stopPropagation();e.preventDefault();schUpClose();} else if(e.key==='Enter'&&e.target&&e.target.classList&&e.target.classList.contains('up-drop')){e.preventDefault();e.target.click();} };
  SCHUP.off=()=>{document.removeEventListener('keydown',key,true);window.removeEventListener('dragover',stop);window.removeEventListener('drop',stop);};
  document.addEventListener('keydown',key,true); window.addEventListener('dragover',stop); window.addEventListener('drop',stop);
  d.addEventListener('click',e=>{ if(e.target===d){ if(!SCHUP.files.length&&!SCHUP.busy)schUpClose(); return; } const b=e.target.closest('[data-up]'); if(!b||SCHUP.busy)return; const k=b.dataset.up;
    if(k==='x')schUpClose(); else if(k==='ok')schUpApply(); else if(k==='rm'){ e.preventDefault(); SCHUP.files.splice(+b.dataset.i,1); schUpPlan(); schUpDraw(); } });
  d.addEventListener('change',e=>{ const i=e.target; if(i&&i.type==='file'){ const l=[...i.files]; i.value=''; schUpAdd(l); } });
  d.addEventListener('dragover',e=>{ e.preventDefault(); const z=zone(); if(z)z.classList.add('over'); });
  d.addEventListener('dragleave',e=>{ if(!e.relatedTarget||!d.contains(e.relatedTarget)){const z=zone(); if(z)z.classList.remove('over');} });
  d.addEventListener('drop',e=>{ e.preventDefault(); const z=zone(); if(z)z.classList.remove('over'); schUpAdd([...((e.dataTransfer&&e.dataTransfer.files)||[])]); });
  schUpDraw(); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-schup]'); if(!b)return; e.preventDefault(); schUpOpen(S.proj); });
