// Thirty-third round (owner, 2026-11-24): files are handed out in two places only (a content panel's own "내보내기" stays as it is).
//   1) the main page — the projects' overview: the list and one summary sheet per project ("프로젝트 개요와 1장씩 요약");
//   2) a project page, beside its name — a report of the project as it stands now, after a window that asks what to put in
//      ("어떤 범위로 … 뭘 넣고 뭘 뺄지 … 요약형으로 할지 풀버전으로 볼지").
// Both write the one document model of 70-export.js ({file, head, title, label, sections}) and so come out as a Word file or
// through the print window as a PDF, in the company's report sheet; a section may ask for a new page (`brk`). The Excel choice
// writes workbooks: the projects as a list plus one sheet per project (a file 89-docread.js reads back), a project's schedule
// data as the sections' workbook (schXlsxSection).
// The words of a report are rules over the data (counts, dates, what is late): no service is called.
const schXP=(t,o)=>({k:'p',runs:[{t:String(t==null?'':t),b:!!(o&&o.b)}],ind:(o&&o.ind)||0});
const schXT=(head,rows,widths)=>({k:'tbl',head,rows:rows.map(r=>r.map(c=>c==null?'':String(c))),widths});
const schXLines=s=>Array.isArray(s)?s:String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
const schXDay=d=>d?dateDot(d):'';
const schXHead=()=>`${SETTINGS.org||SETTINGS.wsName||'AIDC WorkSpace'}  Rev. Date: ${dateDot(TODAY)}`;
const schXSafe=s=>String(s||'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60)||'문서';

/* ---------- the overview of one project as blocks ---------- */
function schXOverview(pid,full){ const h=headOf(pid), out=[];
  if(h.kpi.length)out.push(schXT(['핵심 지표','값'],h.kpi.map(x=>[x[1],x[0]]),[3400,3800]));
  if(h.fin.length)out.push(schXT(['사업성 지표','값'],h.fin.map(x=>[x[1],x[0]]),[3400,3800]));
  if(h.main){ out.push(schXP('사업 개요',{b:1})); out.push(schXP(h.main)); }
  if(full)for(const [t,k] of [['입지 및 전력 인프라','infra'],['사업 구조 및 수익 모델','struct'],['추진 현황 및 주요 특성','stat'],['주요 리스크 및 검토사항','risk']]){ const ls=schXLines(h[k]); if(!ls.length)continue; out.push(schXP(t,{b:1})); ls.forEach(x=>out.push(schXP((ls.length>1?'• ':'')+x,{ind:ls.length>1?1:0}))); }
  const rows=h.rows.filter(x=>x[0]||x[1]).concat(h.memo?[['비고',h.memo]]:[]); if(rows.length)out.push(schXT(['구분','내용'],rows,[1900,5300]));
  if(h.plan.length)out.push(schXT(['시기','추진 일정','상태'],h.plan,[1500,4700,1000]));
  return out; }
const schXMeta=pid=>{ const p=PROJECTS[pid], r=schRepOf(pid); return [r.grp,r.stage||'단계 미정',r.focus?'집중 추진':'',r.first?'최초자료일 '+r.first:'',r.asof?'기준일 '+r.asof:'',r.owner?'담당자 '+r.owner:''].filter(Boolean).join(' · '); };

/* ---------- 1) the main page: the list and a sheet per project ---------- */
function schXMainIds(scope){ const all=orderedProjects(); return scope==='all'?all:scope==='focus'?all.filter(k=>schRepOf(k).focus):schRepSeq(schProjFilter(all)); }
function schXMainDoc(ids,parts){ const nos=schRepNos(), sections=[], asof=typeof META_FLAGS.repAsof==='string'?META_FLAGS.repAsof:'';
  if(parts.list)sections.push({h:'프로젝트 목록',blocks:[schXT(['NO.','프로젝트','구분','위치','사업주체','IT LOAD (수전용량)','추진 단계','최초자료일'],ids.map(k=>{ const p=PROJECTS[k], r=schRepOf(k); return [nos[k]||'',(r.focus?'[집중] ':'')+(p.full||pname(p)),r.grp,r.site,r.dev,r.load,r.stage,r.first]; }),[520,1750,760,900,1250,1300,760,860])]});
  if(parts.sheets)for(const k of ids){ const p=PROJECTS[k]; sections.push({h:`${nos[k]?nos[k]+'  ':''}${p.full||pname(p)}`,raw:true,brk:sections.length>0,blocks:[schXP(schXMeta(k)),...schXOverview(k,false)]}); }
  let n=0; sections.forEach(s=>{ if(!s.raw)s.h=`${++n}. ${s.h}`; });
  return {file:`AIDC 프로젝트 개발검토 리스트_${TODAY.replace(/-/g,'')}`,head:schXHead(),title:['AIDC 프로젝트 개발검토 리스트'],label:[asof?'기준일 '+asof:'',`총 ${ids.length}건`].filter(Boolean).join('  |  '),sections}; }
// the same as a workbook: the list, and one sheet per project written downwards (label | value, then the sheet's titles)
function schXProjRows(k){ const p=PROJECTS[k], h=headOf(k), r=schRepOf(k), rows=[['항목','내용'],['프로젝트',p.full||pname(p)],['구분',r.grp],['추진 단계',r.stage],['집중 추진',r.focus?'예':''],['최초자료일',r.first],['기준일',r.asof],['담당자',r.owner],['부제',r.sub]];
  for(const [l,f] of [['위치(목록)','lsite'],['사업주체(목록)','ldev'],['대지면적(목록)','larea'],['연면적(목록)','lgfa'],['IT LOAD(목록)','lload']])if(h[f])rows.push([l,h[f]]);
  if(h.memo)rows.push(['비고',h.memo]);
  const sec=(t,list)=>{ if(list.length){ rows.push([]); rows.push([t]); rows.push(...list); } };
  sec('핵심 지표',h.kpi.map(x=>[x[0],x[1]])); sec('사업성 지표',h.fin.map(x=>[x[0],x[1]])); if(h.finNote){ if(!h.fin.length){ rows.push([]); rows.push(['사업성 지표']); } rows.push([(/^\*/.test(h.finNote)?'':'* ')+h.finNote]); }
  sec('사업 개요',h.main?[[h.main]]:[]); sec('입지 및 전력 인프라',schXLines(h.infra).map(x=>[x])); sec('사업 구조 및 수익 모델',h.struct?[[h.struct]]:[]); sec('추진 현황 및 주요 특성',schXLines(h.stat).map(x=>[x])); sec('주요 리스크 및 검토사항',schXLines(h.risk).map(x=>[x]));
  sec('사업 개요 표',h.rows.filter(x=>x[0]||x[1]).map(x=>[x[0],x[1]])); sec('추진 일정',h.plan.map(x=>[x[0],x[1],x[2]])); sec('출처',schXLines(h.src).map(x=>[x]));
  return rows; }
function schXMainSheets(ids,parts){ const nos=schRepNos(), sheets=[], used=new Set(['프로젝트 목록']);
  if(parts.list)sheets.push({name:'프로젝트 목록',rows:[['NO.','구분','프로젝트','부제','위치','사업주체','대지면적(m²)','연면적(m²)','IT LOAD (수전용량)','추진 단계','집중 추진','최초자료일','기준일','비고','담당자','운영개시 예상']].concat(ids.map(k=>{ const p=PROJECTS[k], r=schRepOf(k), m=schHas(k)&&schReady(k)?schModel(k):null;
      return [nos[k]||'',r.grp,p.full||pname(p),r.sub,r.site,r.dev,r.area,r.gfa,r.load,r.stage,r.focus?'집중 추진':'',r.first,r.asof,r.memo,r.owner,(m&&m.res.operationDate)||'']; })),widths:[7,12,30,36,16,30,16,16,30,12,10,14,12,44,14,14]});
  if(parts.sheets)for(const k of ids){ let nm=schXSafe(PROJECTS[k].full||k).replace(/[\[\]']/g,' ').slice(0,28), i=2; const base=nm; while(used.has(nm))nm=`${base.slice(0,25)} ${i++}`; used.add(nm); sheets.push({name:nm,rows:schXProjRows(k),widths:[30,96,14]}); }
  return sheets; }

/* ---------- 2) a project: the report of where it stands ---------- */
// what the report can hold, with how much there is of each (a part without content cannot be ticked)
function schXProjParts(pid){ const m=schHas(pid)&&schReady(pid)?schModel(pid):null, h=headOf(pid), tasks=m?m.phases.flatMap(g=>g.tasks):[];
  const ov=h.kpi.length+h.fin.length+h.rows.length+h.plan.length+(h.main?1:0), ev=m?SCH_UP_EVK.reduce((n,k)=>n+schEvRows(pid,k).length,0):0, meets=liveItems('meeting',pid).length;
  return [{k:'state',t:'진행 현황 요약',n:1,say:'추진 단계 · 진행률 · 지연 · 다음 일정'},{k:'ov',t:'사업 개요',n:ov,say:ov?'지표 · 개요 · 표 · 추진 일정':''},{k:'act',t:'액션 일정',n:tasks.length,say:tasks.length?`업무 ${tasks.length}건`:''},
    {k:'proc',t:'외부설비 조달',n:m?m.plan.procurement.length:0,say:m&&m.plan.procurement.length?`${m.plan.procurement.length}건`:''},{k:'gate',t:'승인게이트',n:m?schGates(pid,m).length:0,say:m&&schGates(pid,m).length?`${schGates(pid,m).length}건`:''},
    {k:'evid',t:'근거 및 확약',n:ev,say:ev?`${ev}건`:''},{k:'meet',t:'미팅',n:meets,say:meets?`${meets}건`:''},{k:'part',t:'협력업체',n:(h.partners||[]).length,say:(h.partners||[]).length?`${h.partners.length}곳`:''}]; }
function schXProjDoc(pid,opt){ const P=PROJECTS[pid], h=headOf(pid), r=schRepOf(pid), m=schHas(pid)&&schReady(pid)?schModel(pid):null, full=opt.form==='full', has=k=>opt.parts.includes(k), sections=[], D=AIDCSchedule.dates, today=schToday();
  const tasks=m?m.phases.flatMap(g=>g.tasks):[], res=t=>m.res.tasks[t.id], who=t=>schPeople(t).map(userName).join(', ')||'미지정', late=tasks.filter(t=>schLate(m,t)).sort((a,b)=>res(a).finish.localeCompare(res(b).finish));
  const done=tasks.filter(t=>AIDCSchedule.progress.isDone(t)), soonEnd=D.addDays(today,opt.days||60), soon=tasks.filter(t=>schOpen(m,t)&&!schLate(m,t)&&res(t).start<=soonEnd).sort((a,b)=>res(a).start.localeCompare(res(b).start)||res(a).finish.localeCompare(res(b).finish));
  const cut=(a,n)=>full?a:a.slice(0,n), more=(a,n)=>!full&&a.length>n?[schXP(`외 ${a.length-n}건 (풀버전에 전체 수록)`)]:[];
  if(has('state')){ const rows=[['추진 단계',r.stage||'미정'],['구분',r.grp||'구분 없음'],['담당자',r.owner||'미지정']], say=[];
    if(r.focus)rows.push(['집중 추진','예']);
    if(m){ const pr=tasks.length?schProgress(m,tasks):null, ms=tasks.filter(t=>t.kind==='milestone'&&schOpen(m,t)).sort((a,b)=>res(a).start.localeCompare(res(b).start))[0], gs=schGates(pid,m), okG=gs.filter(g=>g.st==='승인').length;
      rows.push(['운영개시 예상',m.res.operationDate?schXDay(m.res.operationDate)+(m.res.operationDelay?` (목표 대비 ${m.res.operationDelay>0?'+':''}${m.res.operationDelay}일)`:''):'미정 (일정에 업무 없음)']);
      if(pr)rows.push(['전체 진행률',`${schPct(pr)}% (업무 ${tasks.length}건 중 완료 ${done.length}건)`]);
      if(tasks.length)rows.push(['액션 현황',`완료 ${done.length} · 지연 ${late.length} · 진행·예정 ${tasks.length-done.length-late.length}`]);
      if(ms)rows.push(['다음 마일스톤',`${schTaskTitle(ms)} · ${schXDay(res(ms).start)}`]);
      if(gs.length)rows.push(['승인게이트',`승인 ${okG} / 전체 ${gs.length}`]);
      if(m.plan.procurement.length)rows.push(['외부설비',`${m.plan.procurement.length}건 · 확약 ${m.plan.procurement.filter(x=>x.commitment&&x.commitment!=='미확약').length}건`]);
      rows.push(['일정 기준일',schXDay(m.plan.statusDate)]);
      say.push(`추진 단계 ${r.stage||'미정'}${pr?`, 전체 진행률 ${schPct(pr)}%`:''}.`);
      if(late.length){ const w=late[0]; say.push(`지연 ${late.length}건. 가장 오래 지연된 업무는 ${schTaskTitle(w)} (${D.diffDays(today,res(w).finish)}일 지연, 담당 ${who(w)}).`); } else if(tasks.length)say.push('지연 업무 없음.');
      if(ms)say.push(`다음 마일스톤은 ${ms.name} (${schXDay(res(ms).start)}).`); if(m.res.operationDate)say.push(`운영개시 예상 ${schXDay(m.res.operationDate)}.`); }
    rows.push(['보고서 작성일',schXDay(TODAY)]);
    sections.push({h:'진행 현황',blocks:[...(say.length?[schXP(say.join(' '))]:[]),schXT(['항목','내용'],rows,[1900,5300])]}); }
  if(has('ov')){ const b=schXOverview(pid,full); if(b.length)sections.push({h:'사업 개요',blocks:b}); }
  if(has('act')&&m&&tasks.length){ const b=[];
    b.push(schXP('단계별 진행',{b:1})); b.push(schXT(['개발 단계','업무','완료','진행률','기간'],m.phases.filter(g=>g.tasks.length).map(g=>{ const pr=schProgress(m,g.tasks); let a='9999',z=''; for(const t of g.tasks){ const x=res(t); if(x.start<a)a=x.start; if(x.finish>z)z=x.finish; } return [schPhaseLabel(g),g.tasks.length,pr.done,schPct(pr)+'%',`${schXDay(a)} ~ ${schXDay(z)}`]; }),[2700,700,700,800,2300]));
    if(late.length){ b.push(schXP(`지연 업무 ${late.length}건`,{b:1})); b.push(schXT(['WBS','업무','예상 완료','지연','담당','지연 사유'],cut(late,8).map(t=>[schNo(t),t.name,schXDay(res(t).finish),D.diffDays(today,res(t).finish)+'일',who(t),t.why||'']),[700,2500,1100,700,1100,1100])); b.push(...more(late,8)); }
    if(soon.length){ b.push(schXP(`진행 중이거나 ${opt.days||60}일 안에 시작하는 업무 ${soon.length}건`,{b:1})); b.push(schXT(['WBS','업무','시작','완료','상태','담당'],cut(soon,10).map(t=>[schNo(t),t.name,schXDay(res(t).start),t.kind==='milestone'?'':schXDay(res(t).finish),schStatus(t),who(t)]),[700,2700,1100,1100,700,900])); b.push(...more(soon,10)); }
    if(full&&opt.act==='all'){ b.push(schXP(`전체 업무 ${tasks.length}건`,{b:1})); b.push(schXT(['WBS','단계','업무','시작','완료','상태','담당'],tasks.map(t=>[schNo(t),schPhaseLabel(m.phases.find(g=>g.code===t.phase)),t.name,schXDay(res(t).start),t.kind==='milestone'?'':schXDay(res(t).finish),schStatus(t),who(t)]),[650,1300,2300,950,950,650,900])); }
    const loose=liveItems('action',pid).filter(i=>!i.own&&!i.task); if(loose.length){ b.push(schXP(`일정 미연결 액션 ${loose.length}건`,{b:1})); if(full)b.push(schXT(['제목','시작','종료','상태','담당자'],loose.map(i=>[oneLine(i.title),schXDay(i.date),schXDay(itemEnd(i)),schItemSt(i),(i.people||[]).map(userName).join(', ')]),[3300,1000,1000,800,1100])); }
    sections.push({h:'액션 일정',blocks:b}); }
  if(has('proc')&&m&&m.plan.procurement.length)sections.push({h:'외부설비 조달',blocks:[schXT(['패키지','설비','예상 PO','예상 설치완료','확약 상태','공급사·계약상태'],m.plan.procurement.map(x=>{ const pr=m.res.tasks[x.poTaskId], ins=m.res.tasks[x.installTaskId]; return [x.id,x.name,pr?schXDay(pr.start):'',ins?schXDay(ins.finish):'',x.commitment||'미확약',x.supplier||'']; }),[800,2300,1000,1100,900,1100])]});
  if(has('gate')&&m){ const gs=schGates(pid,m); if(gs.length)sections.push({h:'승인게이트',blocks:[schXT(['게이트','승인 사항','연결 업무','예상 승인일','상태'],gs.map(g=>[g.user?'추가':g.code,g.title,g.t?schNo(g.t):'',schXDay(g.date),g.st]),[800,3300,900,1200,1000])]}); }
  if(has('evid')&&m){ const kinds=SCH_UP_EVK.map(k=>({k,name:SCH_XL_SHEET[k],rows:schEvRows(pid,k)})).filter(x=>x.rows.length); if(kinds.length){ const b=[schXT(['구분','건수','완료·확인 외'],kinds.map(x=>[x.name,x.rows.length,x.rows.filter(r=>!/완료|확인|충족|종결/.test(String(r.st||''))).length]),[3600,1200,1600])];
      if(full)for(const x of kinds){ b.push(schXP(x.name,{b:1})); b.push(schXT(['ID','제목','상태','기한'],x.rows.slice(0,60).map(r=>[r.no,r.title,r.st,r.due]),[900,4000,1100,1200])); }
      sections.push({h:'근거 및 확약',blocks:b}); } }
  if(has('meet')){ const ms=liveItems('meeting',pid).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))); if(ms.length)sections.push({h:'미팅',blocks:[schXT(['일자','제목','주요안건','참석자'],cut(ms,5).map(i=>{ const mp=meetParts(i); return [schXDay(i.date),oneLine(i.title),mp.agenda||'',(i.people||[]).map(userName).join(', ')]; }),[1100,2500,2300,1300]),...more(ms,5)]}); }
  if(has('part')&&(h.partners||[]).length)sections.push({h:'협력업체',blocks:[schXP(h.partners.map(x=>String(x).replace(/^@/,'')).join(', '))]});
  sections.forEach((s,i)=>{ s.h=`${i+1}. ${s.h}`; });
  const no=schRepNos()[pid];
  return {file:`${schXSafe(pname(P))}_보고서(${full?'풀버전':'요약'})_${TODAY.replace(/-/g,'')}`,head:schXHead(),title:[P.full||pname(P),`프로젝트 보고서 · ${full?'풀버전':'요약형'}`],label:[no?'No. '+no:'',r.grp,r.stage].filter(Boolean).join('  |  '),sections}; }

/* ---------- the window ---------- */
async function schXOut(doc,file){ if(file==='docx'){ toast('Word 문서를 만드는 중입니다…',8000); const blob=await schExpDocx(doc); schExpSave(doc.file+'.docx',blob); toast('Word 문서를 내려받았습니다.',2600); } else schExpPrint(doc); }
function schExpWin(kind,pid){ if($('#dlg'))return; if(kind==='proj'&&!PROJECTS[pid])return; closePop();
  const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-np sch-xw'; const main=kind==='main', nShown=main?schXMainIds('shown').length:0, nAll=main?orderedProjects().length:0, nFocus=main?schXMainIds('focus').length:0, parts=main?[]:schXProjParts(pid);
  const rd=(name,val,label,note,on)=>`<label class="xw-o"><input type="radio" name="${name}" value="${val}" ${on?'checked':''}><span>${esc(label)}${note?`<em>${esc(note)}</em>`:''}</span></label>`;
  const ck=(key,label,note,on,off)=>`<label class="xw-o ${off?'off':''}"><input type="checkbox" data-xwp="${key}" ${on&&!off?'checked':''} ${off?'disabled':''}><span>${esc(label)}${note?`<em>${esc(note)}</em>`:''}</span></label>`;
  d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="내보내기"><div class="np-hd"><b>내보내기</b><span>${main?'프로젝트 개요 — 목록과 프로젝트별 1장 요약':esc(`${PROJECTS[pid].full||pname(PROJECTS[pid])} — 지금 진행 상황으로 만드는 보고서`)}</span></div>
    <div class="xw">${main?`<div class="xw-g"><h5>범위</h5>${nShown!==nAll?rd('xw-scope','shown','지금 목록',`${nShown}건 · 검색·조건 적용`,true):''}${rd('xw-scope','all','전체 프로젝트',`${nAll}건`,nShown===nAll)}${nFocus&&nFocus!==nAll?rd('xw-scope','focus','집중 추진만',`${nFocus}건`,false):''}</div>
      <div class="xw-g"><h5>넣을 내용</h5>${ck('list','프로젝트 목록 표','',true)}${ck('sheets','프로젝트별 1장 요약','지표 · 개요 · 표 · 추진 일정',true)}</div>`
     :`<div class="xw-g"><h5>형식</h5>${rd('xw-form','sum','요약형','핵심만 · 표는 앞의 몇 건',true)}${rd('xw-form','full','풀버전','본문 전체 · 표 전체',false)}</div>
      <div class="xw-g" data-xwparts><h5>넣을 내용</h5>${parts.map(p=>ck(p.k,p.t,p.n?p.say:'내용 없음',p.k!=='evid'&&p.k!=='part',!p.n)).join('')}</div>
      <div class="xw-g" data-xwact><h5>액션 범위</h5>${rd('xw-act','near','지연 · 진행 중 · 앞으로 60일','',true)}${rd('xw-act','all','전체 업무 목록까지','풀버전에서',false)}</div>`}
      <div class="xw-g"><h5>파일</h5>${rd('xw-file','pdf','PDF','인쇄 창에서 ‘PDF로 저장’',true)}${rd('xw-file','docx','Word (.docx)','',false)}${rd('xw-file','xlsx','엑셀 (.xlsx)',main?'목록 + 프로젝트별 시트 · 다시 올릴 수 있는 형식':'일정 자료 전체 (시트별)',false)}</div>
      <p class="xw-nt" data-xwnt></p></div>
    <div class="np-bt"><button data-xw="x">취소</button><button class="pri" data-xw="ok">${svg('i-sch-fdn',13,13)}내보내기</button></div></div>`;
  document.body.appendChild(d); const $n=s=>d.querySelector(s), val=n=>(d.querySelector(`input[name="${n}"]:checked`)||{}).value||'', picked=()=>[...d.querySelectorAll('[data-xwp]:checked')].map(x=>x.dataset.xwp), close=()=>d.remove();
  const sync=()=>{ const file=val('xw-file'), xl=file==='xlsx', ok=$n('[data-xw="ok"]'), nt=$n('[data-xwnt]'); let say='';
    if(!main){ for(const g of d.querySelectorAll('[data-xwparts],[data-xwact]'))g.classList.toggle('dim',xl); const g=$n('[data-xwact]'); if(g&&!xl)g.classList.toggle('dim',val('xw-form')!=='full'||!picked().includes('act')); if(xl)say='엑셀은 일정 · 리스트 · 관계 · 외부설비 · 승인게이트 · 근거 및 확약을 시트별로 모두 내보냅니다.'; }
    const none=!picked().length&&!(xl&&!main); ok.disabled=none; if(none)say='넣을 내용을 하나 이상 골라 주세요.'; nt.textContent=say; };
  d.addEventListener('change',sync); sync();
  d.addEventListener('click',async e=>{ const a=e.target.closest&&e.target.closest('[data-xw]'); if(e.target===d||(a&&a.dataset.xw==='x')){ e.stopPropagation(); close(); return; } if(!a||a.dataset.xw!=='ok'||a.disabled)return; e.stopPropagation();
    const file=val('xw-file'), ps=picked();
    try{ if(main){ const ids=schXMainIds(val('xw-scope')||'all'), want={list:ps.includes('list'),sheets:ps.includes('sheets')}; if(!ids.length){ toast('내보낼 프로젝트가 없습니다.',3200); return; } close();
        if(file==='xlsx'){ toast('엑셀 파일을 만드는 중입니다…',20000); const X=await schXlsx(), bytes=await X.makeBook(schXMainSheets(ids,want),want.list?'프로젝트 목록':undefined); schExpSave(`AIDC 프로젝트 개발검토 리스트_${schToday()}.xlsx`,new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); toast(`엑셀 파일을 내려받았습니다 · 프로젝트 ${ids.length}건`,3600); }
        else await schXOut(schXMainDoc(ids,want),file); }
      else { close(); if(file==='xlsx'){ await schXlsxSection(pid,'gantt',''); return; } await schXOut(schXProjDoc(pid,{form:val('xw-form')==='full'?'full':'sum',parts:ps,act:val('xw-act')==='all'?'all':'near',days:60}),file); } }
    catch(err){ console.error(err); toast('내보내지 못했습니다: '+String(err&&err.message||err),4200); } });
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); close(); } }); }
document.addEventListener('click',e=>{ if(!PREVIEW_ON||!e.target.closest)return; let el;
  if(el=e.target.closest('[data-mainexp]')){ e.stopPropagation(); e.preventDefault(); schExpWin('main'); return; }
  if(el=e.target.closest('[data-projexp]')){ e.stopPropagation(); e.preventDefault(); if(S.editProj){ toast('사업개요를 수정하는 중에는 내보낼 수 없습니다. 먼저 저장하거나 취소해 주세요.',4200); return; } schExpWin('proj',S.proj); return; }
},true);
