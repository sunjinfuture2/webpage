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
  if(h.kpi.length)out.push(schXT([schRepTtl(h,'kpi'),'값'],h.kpi.map(x=>[x[1],x[0]]),[3400,3800]));
  if(h.fin.length)out.push(schXT([schRepTtl(h,'fin'),'값'],h.fin.map(x=>[x[1],x[0]]),[3400,3800]));
  if(h.main){ out.push(schXP(schRepTtl(h,'main'),{b:1})); out.push(schXP(h.main)); }
  if(full)for(const k of ['infra','struct','stat','risk']){ const ls=schXLines(h[k]), t=schRepTtl(h,k); if(!ls.length)continue; out.push(schXP(t,{b:1})); ls.forEach(x=>out.push(schXP((ls.length>1?'• ':'')+x,{ind:ls.length>1?1:0}))); }
  const rows=h.rows.filter(x=>x[0]||x[1]).concat(h.memo?[['비고',h.memo]]:[]); if(rows.length)out.push(schXT(['구분','내용'],rows,[1900,5300]));
  if(h.plan.length)out.push(schXT(['시기',schRepTtl(h,'plan'),'상태'],h.plan,[1500,4700,1000]));
  return out; }
const schXMeta=pid=>{ const p=PROJECTS[pid], r=schRepOf(pid); return [r.grp,r.stage||'단계 미정',r.focus?'집중 추진':'',r.first?'최초자료일 '+r.first:'',r.asof?'기준일 '+r.asof:'',r.owner?'담당자 '+r.owner:''].filter(Boolean).join(' · '); };

/* ---------- 1) the main page: the list and a sheet per project ---------- */
function schXMainIds(scope){ const all=orderedProjects(); return scope==='all'?all:scope==='focus'?all.filter(k=>schRepOf(k).focus):schRepSeq(schProjFilter(all)); }
function schXMainDoc(ids,parts){ const nos=schRepNos(), sections=[], asof=typeof META_FLAGS.repAsof==='string'?META_FLAGS.repAsof:'';
  if(parts.list)sections.push({h:'프로젝트 목록',blocks:[schXT(['NO.','프로젝트','구분','위치','사업주체','IT LOAD (수전용량)','추진 단계','최초자료일'],ids.map(k=>{ const p=PROJECTS[k], r=schRepOf(k); return [nos[k]||'',(r.focus?'[집중] ':'')+(p.full||pname(p)),r.grp,r.site,r.dev,r.load,r.stage,r.first]; }),[520,1750,760,900,1250,1300,760,860])]});
  if(parts.sheets)for(const k of ids){ const p=PROJECTS[k]; sections.push({h:`${nos[k]?nos[k]+'  ':''}${p.full||pname(p)}`,raw:true,brk:sections.length>0,blocks:[schXP(schXMeta(k)),...schXOverview(k,parts.sheets==='full')]}); }
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
// (thirty-fifth round, owner 2026-11-25: "넣을 내용을 먼저 고르게 하고 그걸 각각 요약으로 할 건지 풀버전으로 할 건지 고르게 해") every part
// has a form of its own. What the report can hold, how much there is of each (a part without content cannot be ticked) and, in a
// line, what each form gives — the window shows that line beside the part.
function schXProjParts(pid){ const m=schHas(pid)&&schReady(pid)?schModel(pid):null, h=headOf(pid), tasks=m?m.phases.flatMap(g=>g.tasks):[], today=schToday();
  const ov=h.kpi.length+h.fin.length+h.rows.length+h.plan.length+(h.main?1:0), txt=['infra','struct','stat','risk'].filter(k=>schXLines(h[k]).length).length, ev=m?SCH_UP_EVK.reduce((n,k)=>n+schEvRows(pid,k).length,0):0, meets=liveItems('meeting',pid).length;
  const late=m?tasks.filter(t=>schLate(m,t)).length:0, soonEnd=AIDCSchedule.dates.addDays(today,60), soon=m?tasks.filter(t=>schOpen(m,t)&&!schLate(m,t)&&m.res.tasks[t.id].start<=soonEnd).length:0;
  const pk=m?m.plan.procurement.length:0, gs=m?schGates(pid,m):[], gOk=gs.filter(g=>g.st==='승인').length, gRest=gs.length-gOk, pn=(h.partners||[]).length, few=(n,c)=>n>c?`앞의 ${c}건 (전체 ${n}건)`:`${n}건`;
  return [{k:'state',t:'진행 현황 요약',n:1,sum:'핵심 문장 · 주요 지표',full:'지표 전체 (승인게이트 · 외부설비 · 기준일까지)'},
    {k:'ov',t:'사업 개요',n:ov+txt,sum:'지표 · 개요 · 표 · 추진 일정',full:'입지 · 사업 구조 · 추진 현황 · 리스크까지'},
    {k:'act',t:'액션 일정',n:tasks.length,sum:`단계별 진행 · 지연 ${Math.min(late,8)}건 · 60일 안 ${Math.min(soon,10)}건`,full:`지연 ${late}건 · 60일 안 ${soon}건 · 전체 업무 ${tasks.length}건 목록`},
    {k:'proc',t:'외부설비 조달',n:pk,sum:`${few(pk,8)} · 설치완료 · 확약 상태`,full:`전체 ${pk}건 · 예상 PO · 공급사까지`},
    {k:'gate',t:'승인게이트',n:gs.length,sum:`승인 ${gOk} / ${gs.length}${gRest?` · 남은 게이트 ${Math.min(gRest,8)}건`:''}`,full:`전체 ${gs.length}건 · 연결 업무까지`},
    {k:'evid',t:'근거 및 확약',n:ev,sum:'구분별 건수',full:`구분별 목록 ${ev}건`},
    {k:'meet',t:'미팅',n:meets,sum:meets>5?`최근 5건 (전체 ${meets}건)`:`${meets}건`,full:`전체 ${meets}건`},
    {k:'part',t:'협력업체',n:pn,sum:`업체명 ${pn}곳`,full:'구분 · 홈페이지 · 설명까지'}]; }
// opt: {parts:[keys], forms:{key:'sum'|'full'}} — `form` is the form of a part that names none; `act:'near'` leaves the list of
// every task out of a full 액션 일정 (the window of the thirty-third round asked for that separately; now the full form holds it).
function schXProjDoc(pid,opt){ const P=PROJECTS[pid], h=headOf(pid), r=schRepOf(pid), m=schHas(pid)&&schReady(pid)?schModel(pid):null, forms=opt.forms||{}, fullOf=k=>(forms[k]||opt.form)==='full', has=k=>opt.parts.includes(k), sections=[], D=AIDCSchedule.dates, today=schToday();
  const tasks=m?m.phases.flatMap(g=>g.tasks):[], res=t=>m.res.tasks[t.id], who=t=>schPeople(t).map(userName).join(', ')||'미지정', late=tasks.filter(t=>schLate(m,t)).sort((a,b)=>res(a).finish.localeCompare(res(b).finish));
  const done=tasks.filter(t=>AIDCSchedule.progress.isDone(t)), soonEnd=D.addDays(today,opt.days||60), soon=tasks.filter(t=>schOpen(m,t)&&!schLate(m,t)&&res(t).start<=soonEnd).sort((a,b)=>res(a).start.localeCompare(res(b).start)||res(a).finish.localeCompare(res(b).finish));
  const cut=(k,a,n)=>fullOf(k)?a:a.slice(0,n), more=(k,a,n)=>!fullOf(k)&&a.length>n?[schXP(`외 ${a.length-n}건 (풀버전에 전체 수록)`)]:[];
  if(has('state')){ const F=fullOf('state'), rows=[['추진 단계',r.stage||'미정']], say=[];
    if(F){ rows.push(['구분',r.grp||'구분 없음'],['담당자',r.owner||'미지정']); if(r.focus)rows.push(['집중 추진','예']); }
    if(m){ const pr=tasks.length?schProgress(m,tasks):null, ms=tasks.filter(t=>t.kind==='milestone'&&schOpen(m,t)).sort((a,b)=>res(a).start.localeCompare(res(b).start))[0], gs=schGates(pid,m), okG=gs.filter(g=>g.st==='승인').length;
      rows.push(['운영개시 예상',m.res.operationDate?schXDay(m.res.operationDate)+(m.res.operationDelay?` (목표 대비 ${m.res.operationDelay>0?'+':''}${m.res.operationDelay}일)`:''):'미정 (일정에 업무 없음)']);
      if(pr)rows.push(['전체 진행률',`${schPct(pr)}% (업무 ${tasks.length}건 중 완료 ${done.length}건)`]);
      if(tasks.length)rows.push(['액션 현황',`완료 ${done.length} · 지연 ${late.length} · 진행·예정 ${tasks.length-done.length-late.length}`]);
      if(ms)rows.push(['다음 마일스톤',`${schTaskTitle(ms)} · ${schXDay(res(ms).start)}`]);
      if(F&&gs.length)rows.push(['승인게이트',`승인 ${okG} / 전체 ${gs.length}`]);
      if(F&&m.plan.procurement.length)rows.push(['외부설비',`${m.plan.procurement.length}건 · 확약 ${m.plan.procurement.filter(x=>x.commitment&&x.commitment!=='미확약').length}건`]);
      if(F)rows.push(['일정 기준일',schXDay(m.plan.statusDate)]);
      say.push(`추진 단계 ${r.stage||'미정'}${pr?`, 전체 진행률 ${schPct(pr)}%`:''}.`);
      if(late.length){ const w=late[0]; say.push(`지연 ${late.length}건. 가장 오래 지연된 업무는 ${schTaskTitle(w)} (${D.diffDays(today,res(w).finish)}일 지연, 담당 ${who(w)}).`); } else if(tasks.length)say.push('지연 업무 없음.');
      if(ms)say.push(`다음 마일스톤은 ${ms.name} (${schXDay(res(ms).start)}).`); if(m.res.operationDate)say.push(`운영개시 예상 ${schXDay(m.res.operationDate)}.`); }
    rows.push(['보고서 작성일',schXDay(TODAY)]);
    sections.push({k:'state',h:'진행 현황',blocks:[...(say.length?[schXP(say.join(' '))]:[]),schXT(['항목','내용'],rows,[1900,5300])]}); }
  if(has('ov')){ const b=schXOverview(pid,fullOf('ov')); if(b.length)sections.push({k:'ov',h:'사업 개요',blocks:b}); }
  if(has('act')&&m&&tasks.length){ const b=[], full=fullOf('act');
    b.push(schXP('단계별 진행',{b:1})); b.push(schXT(['개발 단계','업무','완료','진행률','기간'],m.phases.filter(g=>g.tasks.length).map(g=>{ const pr=schProgress(m,g.tasks); let a='9999',z=''; for(const t of g.tasks){ const x=res(t); if(x.start<a)a=x.start; if(x.finish>z)z=x.finish; } return [schPhaseLabel(g),g.tasks.length,pr.done,schPct(pr)+'%',`${schXDay(a)} ~ ${schXDay(z)}`]; }),[2700,700,700,800,2300]));
    if(late.length){ b.push(schXP(`지연 업무 ${late.length}건`,{b:1})); b.push(schXT(['WBS','업무','예상 완료','지연','담당','지연 사유'],cut('act',late,8).map(t=>[schNo(t),t.name,schXDay(res(t).finish),D.diffDays(today,res(t).finish)+'일',who(t),t.why||'']),[700,2500,1100,700,1100,1100])); b.push(...more('act',late,8)); }
    if(soon.length){ b.push(schXP(`진행 중이거나 ${opt.days||60}일 안에 시작하는 업무 ${soon.length}건`,{b:1})); b.push(schXT(['WBS','업무','시작','완료','상태','담당'],cut('act',soon,10).map(t=>[schNo(t),t.name,schXDay(res(t).start),t.kind==='milestone'?'':schXDay(res(t).finish),schStatus(t),who(t)]),[700,2700,1100,1100,700,900])); b.push(...more('act',soon,10)); }
    if(full&&opt.act!=='near'){ b.push(schXP(`전체 업무 ${tasks.length}건`,{b:1})); b.push(schXT(['WBS','단계','업무','시작','완료','상태','담당'],tasks.map(t=>[schNo(t),schPhaseLabel(m.phases.find(g=>g.code===t.phase)),t.name,schXDay(res(t).start),t.kind==='milestone'?'':schXDay(res(t).finish),schStatus(t),who(t)]),[650,1300,2300,950,950,650,900])); }
    const loose=liveItems('action',pid).filter(i=>!i.own&&!i.task); if(loose.length){ b.push(schXP(`일정 미연결 액션 ${loose.length}건`,{b:1})); if(full)b.push(schXT(['제목','시작','종료','상태','담당자'],loose.map(i=>[oneLine(i.title),schXDay(i.date),schXDay(itemEnd(i)),schItemSt(i),(i.people||[]).map(userName).join(', ')]),[3300,1000,1000,800,1100])); }
    sections.push({k:'act',h:'액션 일정',blocks:b}); }
  if(has('proc')&&m&&m.plan.procurement.length){ const all=m.plan.procurement, F=fullOf('proc'), day=(id,f)=>{ const x=m.res.tasks[id]; return x?schXDay(x[f]):''; };
    sections.push({k:'proc',h:'외부설비 조달',blocks:F?[schXT(['패키지','설비','예상 PO','예상 설치완료','확약 상태','공급사·계약상태'],all.map(x=>[x.id,x.name,day(x.poTaskId,'start'),day(x.installTaskId,'finish'),x.commitment||'미확약',x.supplier||'']),[800,2300,1000,1100,900,1100])]
      :[schXT(['패키지','설비','예상 설치완료','확약 상태'],all.slice(0,8).map(x=>[x.id,x.name,day(x.installTaskId,'finish'),x.commitment||'미확약']),[900,3700,1400,1200]),...more('proc',all,8)]}); }
  if(has('gate')&&m){ const gs=schGates(pid,m); if(gs.length){ const b=[], rest=gs.filter(g=>g.st!=='승인');
      if(fullOf('gate'))b.push(schXT(['게이트','승인 사항','연결 업무','예상 승인일','상태'],gs.map(g=>[g.user?'추가':g.code,g.title,g.t?schNo(g.t):'',schXDay(g.date),g.st]),[800,3300,900,1200,1000]));
      else { b.push(schXP(`승인 ${gs.length-rest.length}건 / 전체 ${gs.length}건${rest.length?` · 남은 게이트 ${rest.length}건`:''}`)); if(rest.length){ b.push(schXT(['게이트','승인 사항','예상 승인일','상태'],rest.slice(0,8).map(g=>[g.user?'추가':g.code,g.title,schXDay(g.date),g.st]),[900,3900,1300,1100])); b.push(...more('gate',rest,8)); } }
      sections.push({k:'gate',h:'승인게이트',blocks:b}); } }
  if(has('evid')&&m){ const kinds=SCH_UP_EVK.map(k=>({k,name:SCH_XL_SHEET[k],rows:schEvRows(pid,k)})).filter(x=>x.rows.length); if(kinds.length){ const b=[schXT(['구분','건수','완료·확인 외'],kinds.map(x=>[x.name,x.rows.length,x.rows.filter(r=>!/완료|확인|충족|종결/.test(String(r.st||''))).length]),[3600,1200,1600])];
      if(fullOf('evid'))for(const x of kinds){ b.push(schXP(x.name,{b:1})); b.push(schXT(['ID','제목','상태','기한'],x.rows.slice(0,60).map(r=>[r.no,r.title,r.st,r.due]),[900,4000,1100,1200])); }
      sections.push({k:'evid',h:'근거 및 확약',blocks:b}); } }
  if(has('meet')){ const ms=liveItems('meeting',pid).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))); if(ms.length)sections.push({k:'meet',h:'미팅',blocks:[schXT(['일자','제목','주요안건','참석자'],cut('meet',ms,5).map(i=>{ const mp=meetParts(i); return [schXDay(i.date),oneLine(i.title),mp.agenda||'',(i.people||[]).map(userName).join(', ')]; }),[1100,2500,2300,1300]),...more('meet',ms,5)]}); }
  if(has('part')&&(h.partners||[]).length){ const names=h.partners.map(x=>String(x).replace(/^@/,'').trim()).filter(Boolean);
    sections.push({k:'part',h:'협력업체',blocks:fullOf('part')?[schXT(['업체','구분','홈페이지','설명'],names.map(nm=>{ const pt=PARTNERS.find(q=>!q.trash&&norm(q.name)===norm(nm))||{}; return [nm,partnerCategories(pt.cat).join(', '),pt.site&&pt.site!=='-'?pt.site:'',oneLine(pt.desc||'')]; }),[1500,1300,1700,2700])]:[schXP(names.join(', '))]}); }
  const fs=sections.map(s=>fullOf(s.k)), kind=fs.length&&fs.every(Boolean)?'full':fs.some(Boolean)?'mix':'sum';
  sections.forEach((s,i)=>{ s.h=`${i+1}. ${s.h}`; });
  const no=schRepNos()[pid];
  return {file:`${schXSafe(pname(P))}_보고서(${({sum:'요약',full:'풀버전',mix:'맞춤'})[kind]})_${TODAY.replace(/-/g,'')}`,head:schXHead(),title:[P.full||pname(P),`프로젝트 보고서 · ${({sum:'요약형',full:'풀버전',mix:'맞춤 구성'})[kind]}`],label:[no?'No. '+no:'',r.grp,r.stage].filter(Boolean).join('  |  '),sections}; }
// how much a document holds, section by section (the window's right side says it before the file is made)
const schXMeasure=doc=>doc.sections.map(s=>{ let tables=0, lines=0; for(const b of s.blocks){ if(b.k==='tbl'){ tables++; lines+=b.rows.length; } else if(b.k==='p')lines++; } return {k:s.k||'',tables,lines}; });

/* ---------- the window ---------- */
// (thirty-fifth round, owner: "옵션 많은 제품 견적 고르는 ui들을 참고해서") The window is put together like the page on which a product
// with many options is configured: at the left the options — a part is ticked first, and a ticked part shows its own choice of
// 요약 / 풀버전 with a line that says what that form gives; at the right, like the sheet of an estimate, what was put together (a
// line per part with its form and how many lines it comes to, the sum below), then the file and the button.
async function schXOut(doc,file){ if(file==='docx'){ toast('Word 문서를 만드는 중입니다…',8000); const blob=await schExpDocx(doc); schExpSave(doc.file+'.docx',blob); toast('Word 문서를 내려받았습니다.',2600); } else schExpPrint(doc); }
function schExpWin(kind,pid){ if($('#dlg'))return; if(kind==='proj'&&!PROJECTS[pid])return; closePop();
  const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-np sch-xw'; const main=kind==='main', nShown=main?schXMainIds('shown').length:0, nAll=main?orderedProjects().length:0, nFocus=main?schXMainIds('focus').length:0;
  const parts=main?[{k:'list',t:'프로젝트 목록 표',n:1,one:'번호 · 구분 · 위치 · 사업주체 · IT LOAD · 추진 단계'},{k:'sheets',t:'프로젝트별 요약',n:1,sum:'프로젝트마다 1장 — 지표 · 개요 · 표 · 추진 일정',full:'입지 · 사업 구조 · 추진 현황 · 리스크까지'}]:schXProjParts(pid);
  const forms={}; for(const p of parts)forms[p.k]='sum';
  const card=(name,val,label,note,on)=>`<label class="xq-card"><input type="radio" name="${name}" value="${val}" ${on?'checked':''}><b>${esc(label)}</b>${note?`<em>${esc(note)}</em>`:''}</label>`;
  const row=p=>`<div class="xq-row" data-xwrow="${p.k}"><label class="xq-ck"><input type="checkbox" data-xwp="${p.k}" ${p.n&&p.k!=='evid'&&p.k!=='part'?'checked':''} ${p.n?'':'disabled'}><span class="xq-nm">${esc(p.t)}</span></label><span class="xq-say" data-xwsay></span>${p.one?'':`<span class="xq-seg" role="group" aria-label="${esc(p.t)} 형식"><button type="button" data-xwf="sum">요약</button><button type="button" data-xwf="full">풀버전</button></span>`}</div>`;
  let step=0; const st=()=>`<i>${++step}</i>`;
  d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="내보내기"><div class="np-hd"><b>내보내기</b><span>${main?'프로젝트 개요 — 목록과 프로젝트별 요약':esc(`${PROJECTS[pid].full||pname(PROJECTS[pid])} — 지금 진행 상황으로 만드는 보고서`)}</span></div>
    <div class="xq-body"><div class="xq-opts">${main?`<div class="xq-sec"><h5>${st()}범위</h5><div class="xq-cards">${nShown!==nAll?card('xw-scope','shown','지금 목록',`${nShown}건 · 검색 · 조건 적용`,true):''}${card('xw-scope','all','전체 프로젝트',`${nAll}건`,nShown===nAll)}${nFocus&&nFocus!==nAll?card('xw-scope','focus','집중 추진만',`${nFocus}건`,false):''}</div></div>`:''}
      <div class="xq-sec" data-xwparts><h5>${st()}넣을 내용<small>고른 항목마다 요약 / 풀버전을 정합니다</small><span class="xq-pre"><button type="button" data-xwall="pick">전체 선택</button><button type="button" data-xwall="sum">모두 요약</button><button type="button" data-xwall="full">모두 풀버전</button></span></h5><div class="xq-rows">${parts.map(row).join('')}</div></div></div>
      <div class="xq-side"><h5>구성</h5><ul class="xq-list" data-xwlist></ul><p class="xq-tot" data-xwtot></p>
        <h5>${st()}파일</h5><div class="xq-files">${card('xw-file','pdf','PDF','인쇄 창',true)}${card('xw-file','docx','Word','.docx',false)}${card('xw-file','xlsx','엑셀','.xlsx',false)}</div>
        <p class="xw-nt" data-xwnt></p><div class="np-bt"><button data-xw="x">취소</button><button class="pri" data-xw="ok">${svg('i-sch-fdn',13,13)}내보내기</button></div></div></div></div>`;
  document.body.appendChild(d); const $n=s=>d.querySelector(s), val=n=>(d.querySelector(`input[name="${n}"]:checked`)||{}).value||'', picked=()=>[...d.querySelectorAll('[data-xwp]:checked')].map(x=>x.dataset.xwp), close=()=>d.remove();
  const want=ps=>({list:ps.includes('list'),sheets:ps.includes('sheets')?(forms.sheets==='full'?'full':true):false}), tag=k=>`<em class="${forms[k]}">${forms[k]==='full'?'풀버전':'요약'}</em>`;
  const sync=()=>{ const file=val('xw-file'), xl=file==='xlsx', ok=$n('[data-xw="ok"]'), ps=picked(); let say='', list='', tot='';
    for(const p of parts){ const r=$n(`[data-xwrow="${p.k}"]`), on=ps.includes(p.k), fix=main&&xl&&p.k==='sheets'; r.classList.toggle('on',on); r.classList.toggle('none',!p.n); r.classList.toggle('fix',fix);
      for(const b of r.querySelectorAll('[data-xwf]')){ const cur=b.dataset.xwf===forms[p.k]; b.classList.toggle('on',cur); b.setAttribute('aria-pressed',String(cur)); b.disabled=!on||fix; }
      r.querySelector('[data-xwsay]').textContent=!p.n?'내용 없음':fix?'개요 전체 (다시 올릴 수 있는 형식)':p.one||p[forms[p.k]]; }
    $n('[data-xwparts]').classList.toggle('dim',xl&&!main); const able=parts.filter(p=>p.n).map(p=>p.k); $n('[data-xwall="pick"]').textContent=able.every(k=>ps.includes(k))?'전체 해제':'전체 선택';
    if(xl&&!main){ list='<li class="all">일정 · 리스트 · 관계 · 외부설비 · 승인게이트 · 근거 및 확약</li>'; tot='시트별 전체'; say='엑셀은 고른 항목과 상관없이 일정 자료 전체를 시트별로 내보냅니다.'; }
    else if(!ps.length){ list='<li class="nil">고른 항목이 없습니다</li>'; say='넣을 내용을 하나 이상 골라 주세요.'; }
    else if(main){ const ids=schXMainIds(val('xw-scope')||'all'), w=want(ps); list=(w.list?`<li><span>프로젝트 목록 표</span><em>표</em><i>${ids.length}행</i></li>`:'')+(w.sheets?`<li><span>프로젝트별 요약</span>${xl?'<em class="full">전체</em>':tag('sheets')}<i>${ids.length}${xl?'시트':'장'}</i></li>`:'');
      if(xl)tot=`프로젝트 ${ids.length}건 · 시트 ${(w.list?1:0)+(w.sheets?ids.length:0)}개`; else { const ms=schXMeasure(schXMainDoc(ids,w)); tot=`프로젝트 ${ids.length}건 · 표 ${ms.reduce((n,x)=>n+x.tables,0)}개 · ${ms.reduce((n,x)=>n+x.lines,0)}줄`; } }
    else { const ms=schXMeasure(schXProjDoc(pid,{parts:ps,forms})); list=parts.filter(p=>ps.includes(p.k)).map(p=>{ const x=ms.find(s=>s.k===p.k); return `<li><span>${esc(p.t)}</span>${tag(p.k)}<i>${x?x.lines+'줄':'-'}</i></li>`; }).join(''); tot=`항목 ${ms.length}개 · 표 ${ms.reduce((n,x)=>n+x.tables,0)}개 · ${ms.reduce((n,x)=>n+x.lines,0)}줄`; }
    if(!say)say=file==='pdf'?'PDF는 인쇄 창이 열리면 ‘PDF로 저장’을 고르면 됩니다.':xl&&main?'엑셀은 목록과 프로젝트별 시트로 내보내며, 그대로 다시 올릴 수 있습니다.':'';   // (after the chain above: it must not stand between its branches)
    $n('[data-xwlist]').innerHTML=list; $n('[data-xwtot]').textContent=tot; $n('[data-xwnt]').textContent=say; ok.disabled=!ps.length&&!(xl&&!main); };
  d.addEventListener('change',sync); sync();
  d.addEventListener('click',async e=>{ const T=e.target; if(!T.closest)return; const f=T.closest('[data-xwf]'), all=T.closest('[data-xwall]'), a=T.closest('[data-xw]');
    if(f){ e.stopPropagation(); if(!f.disabled){ forms[f.closest('[data-xwrow]').dataset.xwrow]=f.dataset.xwf; sync(); } return; }
    if(all){ e.stopPropagation(); const v=all.dataset.xwall, boxes=[...d.querySelectorAll('[data-xwp]:not(:disabled)')]; if(v==='pick'){ const every=boxes.every(b=>b.checked); boxes.forEach(b=>{ b.checked=!every; }); } else for(const p of parts)if(!p.one)forms[p.k]=v; sync(); return; }
    if(T===d||(a&&a.dataset.xw==='x')){ e.stopPropagation(); close(); return; } if(!a||a.dataset.xw!=='ok'||a.disabled)return; e.stopPropagation();
    const file=val('xw-file'), ps=picked();
    try{ if(main){ const ids=schXMainIds(val('xw-scope')||'all'), w=want(ps); if(!ids.length){ toast('내보낼 프로젝트가 없습니다.',3200); return; } close();
        if(file==='xlsx'){ toast('엑셀 파일을 만드는 중입니다…',20000); const X=await schXlsx(), bytes=await X.makeBook(schXMainSheets(ids,w),w.list?'프로젝트 목록':undefined); schExpSave(`AIDC 프로젝트 개발검토 리스트_${schToday()}.xlsx`,new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); toast(`엑셀 파일을 내려받았습니다 · 프로젝트 ${ids.length}건`,3600); }
        else await schXOut(schXMainDoc(ids,w),file); }
      else { close(); if(file==='xlsx'){ await schXlsxSection(pid,'gantt',''); return; } await schXOut(schXProjDoc(pid,{parts:ps,forms:Object.assign({},forms)}),file); } }
    catch(err){ console.error(err); toast('내보내지 못했습니다: '+String(err&&err.message||err),4200); } });
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); close(); } }); }
document.addEventListener('click',e=>{ if(!PREVIEW_ON||!e.target.closest)return; let el;
  if(el=e.target.closest('[data-mainexp]')){ e.stopPropagation(); e.preventDefault(); schExpWin('main'); return; }
  if(el=e.target.closest('[data-projexp]')){ e.stopPropagation(); e.preventDefault(); if(S.editProj){ toast('사업개요를 수정하는 중에는 내보낼 수 없습니다. 먼저 저장하거나 취소해 주세요.',4200); return; } schExpWin('proj',S.proj); return; }
},true);
