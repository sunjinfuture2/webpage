// WorkSpace x Schedule (owner's brief, 2026-11-19): a project page shows the project's master schedule.
// The calculation is window.AIDCSchedule (schedule/index.ts). This file holds what every schedule view shares:
// the preview switch, loading the source plan, the calculated model, saving a change and undoing it, and small formatters.
// Nothing here runs for a project without a schedule, or while the preview is off.

const SCH_SOURCES={pangyo:'/schedule/pangyo.json'};           // projects that have a master schedule (static source plans)
const SCH={src:{},base:{},memo:{},loading:{},failed:{},undo:[],redo:[],virt:{}};
// Preview (owner, 2026-11-19): the combined page is shown only to a browser that opened the site with ?v=2 once; ?v=1 turns it off again.
(function(){try{const v=new URLSearchParams(location.search).get('v');if(v==='2')localStorage.setItem('aidc-preview','1');else if(v==='1')localStorage.removeItem('aidc-preview');}catch(e){}})();
const schPreview=()=>{try{return localStorage.getItem('aidc-preview')==='1';}catch(e){return false;}};
const schHas=pid=>!!pid&&schPreview()&&!!SCH_SOURCES[pid]&&!!window.AIDCSchedule;
const schReady=pid=>schHas(pid)&&!!SCH.base[pid];

/* ---------- view state (per tab of the browser, like the other filters) ---------- */
const SCH_UI_DEFAULT={tab:'gantt',phase:'',scope:'all',scale:'fit',ref:false,links:true,today:true,open:[],q:'',page:1,per:20,who:'',sort:'wbs',dir:1,netMode:'focus',netDepth:1,netDir:'both',sel:'',
  sec:'proc',procState:'',procQ:'',evKind:'commitmentReviews',evQ:'',evPage:1,upage:1,scn:''};
const SCHU=(()=>{let v={};try{v=JSON.parse(sessionStorage.getItem('aidc-sch-ui')||'{}')||{};}catch(e){}return Object.assign({},SCH_UI_DEFAULT,v);})();
function schUiSave(){try{sessionStorage.setItem('aidc-sch-ui',JSON.stringify(SCHU));}catch(e){}}

/* ---------- source plan and model ---------- */
function schLoad(pid){ if(!schHas(pid)||SCH.base[pid]||SCH.loading[pid])return; SCH.loading[pid]=true; delete SCH.failed[pid];
  fetch(SCH_SOURCES[pid]).then(r=>{if(!r.ok)throw new Error('일정 원본을 불러오지 못했습니다 ('+r.status+')');return r.json();})
    .then(src=>{SCH.src[pid]=src;SCH.base[pid]=AIDCSchedule.planFromSource(src);SCH.loading[pid]=false;schRedraw();schOpenWanted();})
    .catch(e=>{SCH.loading[pid]=false;SCH.failed[pid]=String(e&&e.message||e);schRedraw();}); }
// An address that names a task (or a package / gate / record) of a schedule that has not arrived yet: remembered, opened after loading.
function schDeferRoute(r){ if(!schPreview())return; for(const k of ['full','panel']){const id=r[k]; if(!id||!/^(wt-|s[pget]-)/.test(id))continue; if(Object.keys(SCH_SOURCES).every(p=>SCH.base[p]))continue; SCH.want=Object.assign(SCH.want||{},{[k]:id}); r[k]=null; Object.keys(SCH_SOURCES).forEach(schLoad);} }
function schOpenWanted(){ const w=SCH.want; if(!w||!sharedReady)return; SCH.want=null; if(w.full&&item(w.full)&&!S.full){S.full=w.full;render();} if(w.panel&&!S.panel&&panelExists(w.panel))openPanel(w.panel,true); }
// The overrides in force: the shared ones, or those of the scenario this browser is looking at.
const schScenario=pid=>{const id=SCHU.scn;return id&&SCHED[pid]&&SCHED[pid]['sc:'+id]?id:'';};
const schOv=pid=>{const root=SCHED[pid]||{};const sc=schScenario(pid);return sc?(root['sc:'+sc].ov||{}):root;};
function schModel(pid){ if(!schReady(pid))return null; const A=AIDCSchedule, m0=SCH.memo[pid], now=performance.now();
  if(m0&&now-m0.at<40)return m0;                                    // many callers per redraw: look at the overrides once
  const ov=schOv(pid), keys=Object.keys(ov).filter(A.isPlanKey).sort(), key=schScenario(pid)+'|'+JSON.stringify(keys.map(k=>[k,ov[k]]));
  if(m0&&m0.key===key){m0.at=now;return m0;}
  const base=SCH.base[pid]; let plan=A.applyOverrides(base,ov), res=null, err='';
  try{res=A.calculate(plan);}
  catch(e){ err=String(e&&e.message||e); // changes of two members that do not fit together (a loop): the relations added on top are left out until one is removed
    const safe={};for(const k of keys)if(!(k.startsWith('d:')&&ov[k]&&ov[k]._new))safe[k]=ov[k];
    try{plan=A.applyOverrides(base,safe);res=A.calculate(plan);}catch(e2){plan=A.applyOverrides(base,{});res=A.calculate(plan);} }
  const byId=new Map(plan.tasks.map(t=>[t.id,t])), byWbs=new Map(plan.tasks.map(t=>[t.wbs,t])), phases=[], pm=new Map();
  for(const t of plan.tasks.slice().sort((a,b)=>a.phase.localeCompare(b.phase,undefined,{numeric:true})||a.order-b.order)){let g=pm.get(t.phase);if(!g){g={code:t.phase,label:t.phaseLabel,tasks:[]};pm.set(t.phase,g);phases.push(g);}g.tasks.push(t);}
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
  try{draft=A.validatedPlan(m.plan,mutate);res2=A.calculate(draft);}catch(e){toast(String(e&&e.message||'변경을 적용하지 못했습니다.'),3600);return false;}
  const ov=schOv(pid), ch=A.overrideChanges(SCH.base[pid],ov,draft); if(!Object.keys(ch).length)return true;
  const before={};for(const k of Object.keys(ch))before[k]=ov[k]===undefined?null:copy(ov[k]);
  const opBefore=m.res.operationDate; schWrite(pid,ch); SCH.undo.push({pid,sc:schScenario(pid),before,after:ch,label}); if(SCH.undo.length>100)SCH.undo.shift(); SCH.redo.length=0;
  const d=A.dates.diffDays(res2.operationDate,opBefore);
  if(!quiet)toast((label||'일정을 변경했습니다')+(d?` · 운영개시 ${d>0?'+':''}${d}일 (${schD(res2.operationDate)})`:''),d?5200:3200,{t:'되돌리기',fn:schUndo});
  if(!noRedraw)schRedraw(true); return true; }
// Other schedule records that are not part of the calculation (gate state, evidence state, scenarios): one field each.
function schSet(pid,key,value,label){ const root=SCHED[pid]||(SCHED[pid]={}); const before=root[key]===undefined?null:copy(root[key]);
  if(same(before,value??null))return; if(value==null)delete root[key];else root[key]=copy(value);
  SCH.undo.push({pid,sc:'',raw:true,before:{[key]:before},after:{[key]:value??null},label}); SCH.redo.length=0; SCH.memo[pid]=null; if(label)toast(label,3200,{t:'되돌리기',fn:schUndo}); schRedraw(true); }
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
const SCH_ST={'완료':{c:'done',ic:'i-check',w:9.3,h:7.1},'진행':{c:'prog',ic:'i-prog',w:10.5,h:10.5},'확인 전':{c:'ask',ic:'i-sch-bang',w:3,h:10.5},'계획':{c:'plan',ic:'i-sch-plan',w:11,h:11},'조건부 미발동':{c:'cond',ic:'i-sch-plan',w:11,h:11}};
const SCH_STATUSES=['계획','확인 전','진행','완료','조건부 미발동'];
const schStatus=t=>{const P=AIDCSchedule.progress;return P.isDone(t)?'완료':(t.status==='완료'?'진행':t.status||'계획');};
const schStIcon=st=>{const d=SCH_ST[st]||SCH_ST['계획'];return `<span class="sch-st st-${d.c}">${svg(d.ic,d.w,d.h)}${esc(st)}</span>`;};
// D-day of a task that is not finished: against its forecast finish. Late ones read "n일 지연".
function schDday(finish,done){ if(done||!finish)return null; const n=AIDCSchedule.dates.diffDays(finish,schToday()); return {n,txt:n===0?'D-Day':n>0?'D-'+n:Math.abs(n)+'일 지연',hot:n<=30,late:n<0}; }
const schDdayHtml=(finish,done)=>{const d=schDday(finish,done);return d?`<span class="sch-dd ${d.hot?'hot':''} ${d.late?'late':''}">${d.txt}</span>`:'';};
const schPri=(m,t)=>t.pri||AIDCSchedule.progress.defaultPriority(m.res,t.id);
const schPriHtml=(m,t)=>{const p=schPri(m,t);return `<span class="pri pri-${p} ${t.pri?'':'auto'}" ${t.pri?'':'title="아직 지정하지 않아 일정 여유로 정한 값입니다 (운영개시 경로와 근접 업무는 높음)"'}>${priTxt[p]}</span>`;};
const schPeople=t=>Array.isArray(t.people)?t.people:[];
// Assignees: members once they are set, else the role that carries the task out in the source plan, in grey.
const schRole=t=>((t.roles||{}).R||'').trim();
function schWhoHtml(t,mode){ const ppl=schPeople(t); if(ppl.length)return mode==='stack'?avstack(ppl,3):ppl.map(k=>`<span>${av()}${esc(userName(k))}</span>`).join('');
  const r=schRole(t); return r?`<span class="sch-role" title="실행 역할 (담당 멤버 미지정)">${esc(r)}</span>`:(mode==='stack'?'':'<span class="sch-role none">미지정</span>'); }
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
function schProjOfTask(taskId){for(const pid of Object.keys(SCH_SOURCES)){const m=schModel(pid);if(m&&m.byId.has(taskId))return pid;}return null;}
function schVirtualItem(id){ const taskId=schTaskIdOf(id); if(!taskId)return undefined; const pid=schProjOfTask(taskId); if(!pid)return undefined; const m=schModel(pid), t=m.byId.get(taskId), r=m.res.tasks[taskId];
  const v=SCH.virt[id]||(SCH.virt[id]={id,type:'action',task:taskId,own:true,status:'published',body:'',comments:[],created:r.start});
  Object.assign(v,{proj:pid,title:t.name,date:r.start,end:r.finish,people:schPeople(t),pri:schPri(m,t),st:AIDCSchedule.progress.isDone(t)?'done':'prog',url:t.url||''}); return v; }
function schAdopt(it){ if(!it||ITEMS.includes(it)||!schTaskIdOf(it.id)||SCH.virt[it.id]!==it)return false; delete SCH.virt[it.id]; it.createdAt=new Date().toISOString(); it.authorId=sharedUser; ITEMS.push(it); return true; }
const schLinked=(pid,taskId)=>ITEMS.filter(i=>i.task===taskId&&!i.own&&i.proj===pid&&isLive(i));
const schUnlinked=pid=>liveItems('action',pid).filter(i=>!i.task);
