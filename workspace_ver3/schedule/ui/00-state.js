// WorkSpace x Schedule (owner's brief, 2026-11-19): a project page shows the project's master schedule.
// The calculation is window.AIDCSchedule (schedule/index.ts). This file holds what every schedule view shares:
// the preview switch, loading the source plan, the calculated model, saving a change and undoing it, and small formatters.
// Nothing here runs for a project without a schedule, or while the preview is off.

const SCH_SOURCES={pangyo:'/schedule/pangyo.json'};           // projects whose plan came from a workbook (static source plans)
const SCH={src:{},base:{},memo:{},loading:{},failed:{},undo:[],redo:[],virt:{},note:{},last:{},tick:0};
// Preview (owner, 2026-11-19): the combined page is shown only to a browser that opened the site with ?v=2 once; ?v=1 turns it off again.
(function(){try{const v=new URLSearchParams(location.search).get('v');if(v==='2')localStorage.setItem('aidc-preview','1');else if(v==='1')localStorage.removeItem('aidc-preview');}catch(e){}})();
const schPreview=()=>{try{return localStorage.getItem('aidc-preview')==='1';}catch(e){return false;}};
// Every project has the schedule sections (owner, 2026-11-20: the layout, functions and structure of 판교, without its contents).
// A project without a workbook starts from an empty plan; what members add is stored the same way (meta:sched:<project>).
const schHas=pid=>!!pid&&schPreview()&&!!PROJECTS[pid]&&!!window.AIDCSchedule;
const schPids=()=>Object.keys(PROJECTS).filter(schHas);
const schEmptySource=()=>({schemaVersion:'analysis-seed-1',sourceFile:'',statusDate:'2026-01-01',tasks:[],dependencies:[],procurementPackages:[],gates:[],responsibilityBoundaries:[],assumptionsAndReferences:[],sourceMappings:[],nvisScheduleReview:[],offtakers:[],commitmentReviews:[],sourceProjectSummary:[]});
const schReady=pid=>schHas(pid)&&!!(SCH.base[pid]||(!SCH_SOURCES[pid]&&(schLoad(pid),SCH.base[pid])));
// The engine wants at least one task; a plan without any has nothing to work out.
const schCalc=plan=>plan.tasks.length?AIDCSchedule.calculate(plan):{planId:plan.id,tasks:{},order:[],operationDate:'',operationDelay:0,operationValid:true,criticalCount:0,nearCount:0,changedCount:0,deliveries:{},issues:[]};

/* ---------- view state (per tab of the browser, like the other filters) ---------- */
const SCH_UI_DEFAULT={tab:'gantt',phase:'',scope:'all',scale:'fit',ref:false,links:true,today:true,open:[],q:'',page:1,per:20,who:'',sort:'wbs',dir:1,netMode:'focus',netDepth:1,netDir:'both',sel:'',
  sec:'proc',procState:'',procQ:'',evKind:'commitmentReviews',evQ:'',evPage:1,upage:1,scn:''};
const SCHU=(()=>{let v={};try{v=JSON.parse(sessionStorage.getItem('aidc-sch-ui')||'{}')||{};}catch(e){}return Object.assign({},SCH_UI_DEFAULT,v);})();
function schUiSave(){try{sessionStorage.setItem('aidc-sch-ui',JSON.stringify(SCHU));}catch(e){}}

/* ---------- source plan and model ---------- */
function schLoad(pid){ if(!schHas(pid)||SCH.base[pid]||SCH.loading[pid])return;
  if(!SCH_SOURCES[pid]){ const src=schEmptySource(); SCH.src[pid]=src; SCH.base[pid]=AIDCSchedule.planFromSource(src); return; }   // no workbook: an empty plan, there at once
  SCH.loading[pid]=true; delete SCH.failed[pid];
  fetch(SCH_SOURCES[pid]).then(r=>{if(!r.ok)throw new Error('일정 원본을 불러오지 못했습니다 ('+r.status+')');return r.json();})
    .then(src=>{SCH.src[pid]=src;SCH.base[pid]=AIDCSchedule.planFromSource(src);SCH.loading[pid]=false;schRedraw();schOpenWanted();})
    .catch(e=>{SCH.loading[pid]=false;SCH.failed[pid]=String(e&&e.message||e);schRedraw();}); }
// An address that names a task (or a package / gate / record) of a schedule that has not arrived yet: remembered, opened after loading.
function schDeferRoute(r){ if(!schPreview())return; for(const k of ['full','panel']){const id=r[k]; if(!id||!/^(wt-|s[pget]-)/.test(id))continue; schPids().forEach(schLoad); if(schPids().every(p=>SCH.base[p]))continue; SCH.want=Object.assign(SCH.want||{},{[k]:id}); r[k]=null;} }
function schOpenWanted(){ const w=SCH.want; if(!w||!sharedReady)return; SCH.want=null; if(w.full&&item(w.full)&&!S.full){S.full=w.full;render();} if(w.panel&&!S.panel&&panelExists(w.panel))openPanel(w.panel,true); }
// The overrides in force: the shared ones, or those of the scenario this browser is looking at.
const schScenario=pid=>{const id=SCHU.scn;return id&&SCHED[pid]&&SCHED[pid]['sc:'+id]?id:'';};
const schOv=pid=>{const root=SCHED[pid]||{};const sc=schScenario(pid);return sc?(root['sc:'+sc].ov||{}):root;};
function schModel(pid){ if(!schReady(pid))return null; const A=AIDCSchedule, m0=SCH.memo[pid], now=performance.now();
  if(m0&&now-m0.at<40)return m0;                                    // many callers per redraw: look at the overrides once
  const ov=schOv(pid), keys=Object.keys(ov).filter(A.isPlanKey).sort(), root=SCHED[pid]||{}, phk=Object.keys(root).filter(k=>k.startsWith('ph:')).sort(), key=schScenario(pid)+'|'+JSON.stringify(keys.map(k=>[k,ov[k]]))+'|'+phk.map(k=>k+':'+((root[k]||{}).label||'')).join(',');
  if(m0&&m0.key===key){m0.at=now;return m0;}
  const base=SCH.base[pid]; let plan=A.applyOverrides(base,ov), res=null, err='';
  try{res=schCalc(plan);}
  catch(e){ err=String(e&&e.message||e); // changes of two members that do not fit together (a loop): the relations added on top are left out until one is removed
    const safe={};for(const k of keys)if(!(k.startsWith('d:')&&ov[k]&&ov[k]._new))safe[k]=ov[k];
    try{plan=A.applyOverrides(base,safe);res=schCalc(plan);}catch(e2){plan=A.applyOverrides(base,{});res=schCalc(plan);} }
  const byId=new Map(plan.tasks.map(t=>[t.id,t])), byWbs=new Map(plan.tasks.map(t=>[t.wbs,t])), phases=[], pm=new Map();
  for(const t of plan.tasks.slice().sort((a,b)=>a.phase.localeCompare(b.phase,undefined,{numeric:true})||a.order-b.order)){let g=pm.get(t.phase);if(!g){g={code:t.phase,label:t.phaseLabel,tasks:[]};pm.set(t.phase,g);phases.push(g);}g.tasks.push(t);}
  // phases members added (records ph:<code> {label}); one that has no task yet still shows, so that tasks and actions can be put into it
  for(const k of phk){ const code=k.slice(3); if(!root[k])continue; if(pm.has(code)){const g=pm.get(code); if(root[k].label)g.label=root[k].label; g.user=true; continue;}
    const g={code,label:root[k].label||code,tasks:[],user:true};pm.set(code,g);phases.push(g); }
  phases.sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));
  const pred=new Map(plan.tasks.map(t=>[t.id,[]])), succ=new Map(plan.tasks.map(t=>[t.id,[]]));
  for(const e of plan.dependencies){if(!byId.has(e.from)||!byId.has(e.to))continue;pred.get(e.to).push(e);succ.get(e.from).push(e);}
  return SCH.memo[pid]={key,at:now,pid,plan,res,err,byId,byWbs,phases,pred,succ};
}
const schTask=(pid,id)=>{const m=schModel(pid);return m?m.byId.get(id):null;};

/* ---------- saving a change ---------- */
// A change is tried on a copy of the plan first (validation + loop check), then only what differs from the source plan is stored.
// It applies at once; the toast offers 되돌리기 (and Ctrl+Z while a schedule view has the focus).
function schWrite(pid,changes){ const root=SCHED[pid]||(SCHED[pid]={}); const sc=schScenario(pid);
  if(sc){const rec=copy(root['sc:'+sc]);rec.ov=rec.ov||{};for(const [k,v] of Object.entries(changes)){if(v===null)delete rec.ov[k];else rec.ov[k]=copy(v);}rec.at=new Date().toISOString();root['sc:'+sc]=rec;}
  else for(const [k,v] of Object.entries(changes)){if(v===null)delete root[k];else root[k]=copy(v);}
  SCH.memo[pid]=null; }
function schCommit(pid,mutate,label,quiet,noRedraw){ const m=schModel(pid); if(!m)return false; const A=AIDCSchedule; let draft,res2;
  try{draft=A.validatedPlan(m.plan,mutate);res2=schCalc(draft);}catch(e){toast(String(e&&e.message||'변경을 적용하지 못했습니다.'),3600);return false;}
  const ov=schOv(pid), ch=A.overrideChanges(SCH.base[pid],ov,draft); if(!Object.keys(ch).length)return true;
  const before={};for(const k of Object.keys(ch))before[k]=ov[k]===undefined?null:copy(ov[k]);
  const opBefore=m.res.operationDate; schWrite(pid,ch); SCH.undo.push({pid,sc:schScenario(pid),before,after:ch,label,tag:SCH.tag||''}); if(SCH.undo.length>100)SCH.undo.shift(); SCH.redo.length=0;
  const d=res2.operationDate&&opBefore?A.dates.diffDays(res2.operationDate,opBefore):0;
  if(!quiet)toast((label||'일정을 변경했습니다')+(d?` · 운영개시 ${d>0?'+':''}${d}일 (${schD(res2.operationDate)})`:''),d?5200:3200,{t:'되돌리기',fn:schUndo,keep:true});   // stays until closed
  if(!noRedraw)schRedraw(true); return true; }
// Other schedule records that are not part of the calculation (gate state, evidence state, scenarios): one field each.
function schSet(pid,key,value,label){ const root=SCHED[pid]||(SCHED[pid]={}); const before=root[key]===undefined?null:copy(root[key]);
  if(same(before,value??null))return; if(value==null)delete root[key];else root[key]=copy(value);
  SCH.undo.push({pid,sc:'',raw:true,before:{[key]:before},after:{[key]:value??null},label,tag:SCH.tag||''}); SCH.redo.length=0; SCH.memo[pid]=null; if(label)toast(label,3200,{t:'되돌리기',fn:schUndo}); schRedraw(true); }
function schStep(from,to,word){ const u=from.pop(); if(!u){toast(word==='undo'?'되돌릴 변경이 없습니다.':'다시 적용할 변경이 없습니다.');return;}
  const values=word==='undo'?u.before:u.after;
  if(u.raw){const root=SCHED[u.pid]||(SCHED[u.pid]={});for(const [k,v] of Object.entries(values)){if(v===null)delete root[k];else root[k]=copy(v);}SCH.memo[u.pid]=null;}
  else{const keep=SCHU.scn;SCHU.scn=u.sc||'';schWrite(u.pid,values);SCHU.scn=keep;}
  to.push(u); toast((word==='undo'?'되돌렸습니다':'다시 적용했습니다')+(u.label?' · '+u.label:''),2600,word==='undo'?{t:'다시 적용',fn:schRedo}:null); schRedraw(true); }
function schUndo(){schStep(SCH.undo,SCH.redo,'undo');}
function schRedo(){schStep(SCH.redo,SCH.undo,'redo');}
// Redraws what is on screen. A change from this browser redraws at once; a change from the server waits while somebody is typing (sharedRedraw).
function schRedraw(now){ if(typeof sharedReady==='undefined'||!sharedReady)return; if(!now||$('#dlg')){sharedRedraw();return;}
  const a=document.activeElement, typing=!!(a&&a.matches&&a.matches('input:not([data-schq]),textarea,[contenteditable="true"]'));
  if(S.editProj||S.editSimple||typing){ if(S.page==='project'&&!S.full){schRefresh();schLowerRefresh();} sharedPendingRedraw=true; }   // somebody is typing in the page: only the schedule sections are drawn again now
  else{ const keep=schKeepScroll(); render(true); schRestoreScroll(keep); }
  const open=curItem(); if(open&&schTaskIdOf(open.id)){ if(open.editing)schPropsRefresh(open); else rerenderItem(open.id); } schPanelRefresh(); }
// While the body of a task is being edited only its schedule block is drawn again (the title and the editor stay as they are).
function schPropsRefresh(it){ const pin=pinOf(it), old=pin&&$('.sch-props',pin); if(!old||!schOwn(it))return; const box=document.createElement('div'); box.innerHTML=schItemProps(it,canEditItem(it),S.full===it.id&&S.ctx==='full'); if(box.firstElementChild){old.replaceWith(box.firstElementChild);fitTitle(pin);} }
function schKeepScroll(){const g=$('#sch-gantt .sg-scroll'),n=$('#sch-net .sn-scroll');return {gx:g?g.scrollLeft:null,gy:g?g.scrollTop:null,nx:n?n.scrollLeft:null,ny:n?n.scrollTop:null};}
function schRestoreScroll(k){const g=$('#sch-gantt .sg-scroll'),n=$('#sch-net .sn-scroll');if(g&&k.gx!=null){g.scrollLeft=k.gx;g.scrollTop=k.gy;}if(n&&k.nx!=null){n.scrollLeft=k.nx;n.scrollTop=k.ny;}}

/* ---------- formatters ---------- */
const schD=d=>d?d.slice(2).replace(/-/g,'.'):'';                                   // 2026-11-02 -> 26.11.02
const schRange=(a,b)=>`<span class="sch-rg"><span>${schD(a)}</span>${svg('i-sch-arr',11,8)}<span>${schD(b)}</span></span>`;
const schWbs=w=>String(w||'').replace(/^W/,'').replace('.','-');                    // W1.1 -> 1-1 (display only)
const schPhaseNo=c=>String(c||'').replace(/^W/,'');
const schPhaseName=l=>String(l||'').replace(/^\d+\s*/,'');                          // "1 사업정의·RFP" -> "사업정의·RFP"
const schPhaseLabel=g=>`${schPhaseNo(g.code)}) ${schPhaseName(g.label)}`;
const schToday=()=>TODAY;
// One status design for the whole page (owner's sheet, 2026-11-19): a mark and a word in one colour. Six kinds:
// plan (grey, spokes), ask (amber, !), prog (blue, open ring), done (green, check), hold (red, pause), cond (purple, triangle).
// The marks are symbols i-st-<kind> (10-actions.js); their sizes are in em so they follow the size of the word beside them.
const SCH_ST={'계획':{c:'plan'},'확인 전':{c:'ask'},'진행':{c:'prog'},'완료':{c:'done'},'보류':{c:'hold'},'조건부 미발동':{c:'cond'}};
const SCH_STATUSES=['계획','확인 전','진행','완료','보류','조건부 미발동'];
// States of other things that are shown with the same six marks: gates, evidence records, supplier commitments.
const SCH_MARK_OF={'확인 전':'ask','준비 중':'plan','검토 요청':'prog','승인':'done','보완·반려':'hold','확인 필요':'ask','확인 중':'prog','반영 완료':'done','조건부 미발동':'cond','보류':'hold','미확약':'plan','견적 수령':'ask','조건부 확약':'cond','확약':'done'};
const schMark=(kind,label,cls,attrs)=>`<span class="sch-st st-${kind} ${cls||''}" ${attrs||''}><i class="si"><svg class="si-${kind}" aria-hidden="true"><use href="#i-st-${kind}"/></svg></i>${esc(label)}</span>`;
const schStateMark=(label,cls,attrs)=>schMark(SCH_MARK_OF[label]||'plan',label,cls,attrs);
const schStatus=t=>{const P=AIDCSchedule.progress;return P.isDone(t)?'완료':(t.status==='완료'?'진행':t.status||'계획');};
const schStIcon=st=>schMark((SCH_ST[st]||SCH_ST['계획']).c,st);
// D-day of a task that is not finished: against its forecast finish. Late ones read "n일 지연".
function schDday(finish,done){ if(done||!finish)return null; const n=AIDCSchedule.dates.diffDays(finish,schToday()); return {n,txt:n===0?'D-Day':n>0?'D-'+n:Math.abs(n)+'일 지연',hot:n<=30,late:n<0}; }
const schDdayHtml=(finish,done)=>{const d=schDday(finish,done);return d?`<span class="sch-dd ${d.hot?'hot':''} ${d.late?'late':''}">${d.txt}</span>`:'';};
const schPri=(m,t)=>t.pri||AIDCSchedule.progress.defaultPriority(m.res,t.id);
const schPriHtml=(m,t)=>{const p=schPri(m,t);return `<span class="pri pri-${p}" ${t.pri?'':'title="아직 지정하지 않아 일정 여유로 정한 값입니다 (운영개시 경로와 근접 업무는 높음)"'}>${priTxt[p]}</span>`;};
const schPeople=t=>Array.isArray(t.people)?t.people:[];
// Assignees: members once they are set, else the role that carries the task out in the source plan, in grey.
const schRole=t=>((t.roles||{}).R||'').trim();
function schWhoHtml(t,mode){ const ppl=schPeople(t); if(ppl.length)return mode==='stack'?avstack(ppl,3):ppl.map(k=>`<span>${av()}${esc(userName(k))}</span>`).join('');
  return '<span class="sch-role none">미지정</span>'; }   // owner, 2026-11-19: nothing else is written where nobody is assigned
// the whole page knows that the preview is on (styles of the item panel that only the preview changes hang on this)
if(schPreview())document.documentElement.classList.add('sch-on');
const schTaskTitle=t=>`${schWbs(t.wbs)}) ${t.name}`;
const schMine=t=>!!sharedUser&&schPeople(t).includes(sharedUser);
const schOpen=(m,t)=>!AIDCSchedule.progress.isDone(t);
const schLate=(m,t)=>schOpen(m,t)&&m.res.tasks[t.id].finish<schToday();
const schOnDay=(m,t,day)=>{const r=m.res.tasks[t.id];return r.start<=day&&r.finish>=day;};
// Progress of a group of tasks by the weighted rule (schedule/progress.ts).
const schProgress=(m,tasks)=>AIDCSchedule.progress.of(tasks,m.res,id=>(m.byId.get(id)||{}).pri,schToday());
const schPct=p=>Math.round(p.pct*100);
const SCH_PROGRESS_TIP='진행률 = Σ(가중치 × 달성도) ÷ Σ가중치\n가중치 = √기간(일) × 중요도(높음 1.5 · 중간 1 · 낮음 0.7) × 마일스톤 1.5 (마일스톤은 2주 업무로 계산)\n달성도 = 완료 100% · 입력한 진척률 · 착수 후에는 지난 기간의 비율(최대 90%)';

/* ---------- a task as an item of the right panel ---------- */
// The body, comments and files of a task are an ordinary item ("wt-<task id>", type action) that comes into being the first
// time somebody writes one; until then item() hands out this stand-in (same idea as the 자료실 rows, see adoptRow).
// The schedule fields (dates, state, assignees, importance, address) are never kept in the item: they are overrides of the task.
const schTaskIdOf=id=>typeof id==='string'&&id.startsWith('wt-')?id.slice(3):'';
const schItemId=taskId=>'wt-'+taskId;
function schProjOfTask(taskId){for(const pid of schPids()){const m=schModel(pid);if(m&&m.byId.has(taskId))return pid;}return null;}
function schVirtualItem(id){ const taskId=schTaskIdOf(id); if(!taskId)return undefined; const pid=schProjOfTask(taskId); if(!pid)return undefined; const m=schModel(pid), t=m.byId.get(taskId), r=m.res.tasks[taskId];
  const v=SCH.virt[id]||(SCH.virt[id]={id,type:'action',task:taskId,own:true,status:'published',body:'',comments:[],created:r.start});
  Object.assign(v,{proj:pid,title:t.name,date:r.start,end:r.finish,people:schPeople(t),pri:schPri(m,t),st:AIDCSchedule.progress.isDone(t)?'done':'prog',url:t.url||''}); return v; }
function schAdopt(it){ if(!it||ITEMS.includes(it)||!schTaskIdOf(it.id)||SCH.virt[it.id]!==it)return false; delete SCH.virt[it.id]; it.createdAt=new Date().toISOString(); it.authorId=sharedUser; ITEMS.push(it); return true; }
const schLinked=(pid,taskId)=>ITEMS.filter(i=>i.task===taskId&&!i.own&&i.proj===pid&&isLive(i));
const schUnlinked=pid=>liveItems('action',pid).filter(i=>!i.task);

/* ---------- notices on actions (owner, 2026-11-19) ----------
   green: the action's schedule starts today.
   red:   something changed on an action that concerns me (I am one of its assignees, I am mentioned in it, or it is linked with an
          action of mine) and I have not opened it since.
   What I have seen is kept per member in the inbox record (meta:inbox:<사번>): seen = {<item id>: signature of the action}. An action
   that newly concerns me has no entry, so it is red until I open it. The first time a member meets a project everything is taken as
   seen (seenInit), otherwise the whole list would start red.
   Whose change it was: what differs right after data came from the server (SCH.tick moved) is somebody else's; what differs while no
   server data came in between is my own and is taken as seen (schNoticeSettle is called before and after every merge). */
const schHash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
const schMeIn=it=>{ if(!it||!sharedUser)return false; if((it.people||[]).includes(sharedUser))return true; const first=String(ME||'').split(' ')[0];
  if(first&&(it.comments||[]).some(c=>c.authorId!==sharedUser&&String(c.text||'').includes('@'+first)))return true; return typeof it.body==='string'&&it.body.includes('data-id="'+sharedUser+'"'); };
const schItemSig=it=>!it?'':[it.title||'',it.date||'',it.end||'',it.st||'',it.pri||'',(it.people||[]).join(','),it.task||'',it.url||'',schHash(String(it.body||'')),(it.comments||[]).filter(c=>c.authorId!==sharedUser).map(c=>c.id||c.ts||'').join(',')].join('|');
function schNotices(pid){ const now=Date.now(), c=SCH.note[pid]; if(c&&now-c.at<300)return c;
  const out={at:now,red:new Set(),green:new Set(),sig:new Map()}; SCH.note[pid]=out;
  const m=schHas(pid)?schModel(pid):null, P=AIDCSchedule.progress, acts=liveItems('action',pid).filter(i=>!i.own);
  if(m)for(const t of m.plan.tasks){ if(!P.isDone(t)&&!P.isExcluded(t)&&m.res.tasks[t.id].start===TODAY)out.green.add(schItemId(t.id)); }
  for(const i of acts)if(i.st!=='done'&&i.date===TODAY)out.green.add(i.id);
  if(!sharedUser||(schHas(pid)&&!m)||schScenario(pid))return out;   // nothing to compare with yet, or a scenario is being looked at
  // what concerns me, with its signature
  const rel=new Map(), mineItems=new Set(acts.filter(schMeIn).map(i=>i.id)), mineTasks=new Set(), byTask=new Map(), own=new Map();
  for(const i of acts)if(i.task){if(!byTask.has(i.task))byTask.set(i.task,[]);byTask.get(i.task).push(i);}
  if(m){ for(const i of ITEMS)if(i.own&&i.task&&i.proj===pid&&isLive(i))own.set(i.task,i);
    for(const t of m.plan.tasks)if(schPeople(t).includes(sharedUser)||schMeIn(own.get(t.id)))mineTasks.add(t.id);
    for(const t of m.plan.tasks){ const linked=byTask.get(t.id)||[], refs=(((SCHED[pid]||{})['c:'+t.id]||{}).ids||[]);
      if(!(mineTasks.has(t.id)||linked.some(i=>mineItems.has(i.id))||refs.some(id=>schMeIn(ITEMS.find(i=>i.id===id)))))continue; const r=m.res.tasks[t.id];
      rel.set(schItemId(t.id),schHash([t.name,schStatus(t),r.start,r.finish,t.plannedStart,t.plannedFinish,t.actualStart||'',t.actualFinish||'',t.progress??'',schPeople(t).join(','),t.pri||'',t.url||'',linked.map(i=>i.id+':'+i.st).join(','),refs.join(','),schItemSig(own.get(t.id))].join('|'))); } }
  for(const i of acts)if(mineItems.has(i.id)||(i.task&&mineTasks.has(i.task)))rel.set(i.id,schHash(schItemSig(i)));
  const st=INBOX_STATE, seen=st.seen||{}, last=SCH.last[pid]; let next=null; const put=(id,v)=>{next=next||{...seen}; if(v===null)delete next[id]; else next[id]=v;};
  if(!(st.seenInit&&st.seenInit[pid])){ for(const [id,sig] of rel)put(id,sig); st.seenInit={...(st.seenInit||{}),[pid]:1}; }
  else{ for(const [id,sig] of rel){ if(seen[id]===sig)continue;
      if(id===S.panel||id===S.full){put(id,sig);continue;}                                                     // I am looking at it
      if(last&&last.tick===SCH.tick&&last.sig.get(id)!==sig&&!last.red.has(id)){put(id,sig);continue;}          // my own change
      out.red.add(id); }
    for(const id of Object.keys(seen)){ if(rel.has(id))continue; const tid=schTaskIdOf(id), x=tid?null:ITEMS.find(i=>i.id===id);   // no longer mine: forget, so that it is red again if it comes back
      if(tid?(m&&m.byId.has(tid)):(!x||x.proj===pid))put(id,null); } }
  if(next)st.seen=next; out.sig=rel; SCH.last[pid]={tick:SCH.tick,sig:rel,red:out.red}; return out; }
// Called by the sync code before (false) and after (true) data from the server is merged in.
function schNoticeSettle(remote){ if(!schPreview()||!sharedUser)return; if(remote)SCH.tick++;
  for(const pid of schPids()){ if(!SCH.base[pid])continue; if(remote&&SCH.memo[pid])SCH.memo[pid].at=-1e9;   // the model looks at the overrides again (it would trust its copy for 40 ms)
    SCH.note[pid]=null; schNotices(pid); } }
// Opening an action is seeing it: its red mark goes at once (the rest of the page is redrawn later as usual).
function schSeenOpen(id){ if(!sharedUser||!schPreview())return; const it=item(id), pid=it&&it.proj; if(!pid||!SCH.last[pid]||!SCH.last[pid].red.has(id))return;
  SCH.note[pid]=null; schNotices(pid); $$('[data-open="'+CSS.escape(id)+'"] .sdot.r').forEach(x=>x.remove());
  const b=$('#page-project .cal .cell.today .acnt'); if(b&&S.proj===pid)b.outerHTML=schCalBadge(pid,TODAY,+((b.querySelector('b')||{}).textContent)||0); }
const schDotsHtml=(n,id)=>{const r=n.red.has(id), g=n.green.has(id);return (r?'<i class="sdot r" title="내가 담당·호출·연결된 액션에 변동이 있습니다"></i>':'')+(g?`<i class="sdot g ${r?'two':''}" title="오늘 일정이 시작된 액션입니다"></i>`:'');};
