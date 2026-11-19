// 프로젝트 도구: what the Schedule app offered around the plan itself. Backup (same JSON the Schedule app writes and reads),
// CSV for spreadsheets, scenarios, the status date, the path that decides the operation date, and going back to the source plan.
function schDownload(name,text,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:type||'application/json'})); a.download=name; a.addEventListener('click',e=>e.stopPropagation()); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }
const schCsv=rows=>'﻿'+rows.map(r=>r.map(v=>{if(v===null||v===undefined)return '';if(typeof v==='number')return String(v);let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
const schScenarios=pid=>Object.entries(SCHED[pid]||{}).filter(([k,v])=>k.startsWith('sc:')&&v).map(([k,v])=>({id:k.slice(3),name:v.name||'시나리오',by:v.by,at:v.at,ov:v.ov||{}}));
function schPlanOf(pid,ov){ const A=AIDCSchedule; const plan=A.applyOverrides(SCH.base[pid],ov); return {plan,res:A.calculate(plan)}; }
// the Schedule app's backup: source + scenarios (the shared plan is its "base" scenario)
function schBackup(pid){ const root=SCHED[pid]||{}, A=AIDCSchedule, strip=o=>Object.fromEntries(Object.entries(o).filter(([k])=>A.isPlanKey(k)));
  const base=A.applyOverrides(SCH.base[pid],strip(root)); base.id='base'; base.name='기본 계획';
  const scs=schScenarios(pid).map(s=>{const p=A.applyOverrides(SCH.base[pid],s.ov);p.id=s.id;p.name=s.name;return p;});
  return {schemaVersion:1,projectId:'pangyo-aidc',source:SCH.src[pid],scenarios:[base,...scs],activeId:'base',preferences:{view:'gantt',date:base.statusDate,scale:'month',collapsed:[...new Set(base.tasks.map(t=>t.phase))],masterTree:true,fitTimeline:true,showReference:true,showLinks:true,gridWidth:640},audit:[]}; }
function schImportBackup(pid,text){ const A=AIDCSchedule; let w; try{w=JSON.parse(text);}catch(e){toast('JSON 파일을 읽지 못했습니다.',3200);return;}
  if(!w||w.schemaVersion!==1||!Array.isArray(w.scenarios)||!w.scenarios.length){toast('SUNJIN Schedule에서 내보낸 JSON 백업(v1)이 아닙니다.',3600);return;}
  const base=SCH.base[pid], ids=new Set(base.tasks.map(t=>t.id)), active=w.scenarios.find(p=>p.id===w.activeId)||w.scenarios[0];
  const shared=active.tasks.filter(t=>ids.has(t.id)).length; if(shared<base.tasks.length*0.5){toast('이 프로젝트의 원본 일정과 다른 원본으로 만든 백업입니다. 가져오지 않았습니다.',4200);return;}
  let ov; try{A.calculate(active);ov=A.diffPlans(base,active);}catch(e){toast('백업의 일정을 계산할 수 없습니다: '+String(e&&e.message||e),4200);return;}
  const others=w.scenarios.filter(p=>p!==active), n=Object.keys(ov).length, root=SCHED[pid]||(SCHED[pid]={}), cur=Object.keys(root).filter(A.isPlanKey).length;
  confirmDlg(`“${active.name||'기본 계획'}”을 공유 일정으로 가져올까요? 지금의 변경 ${cur}건이 백업의 변경 ${n}건으로 바뀝니다.${others.length?` 다른 시나리오 ${others.length}개는 시나리오로 추가됩니다.`:''} (되돌리기 가능)`,[{t:'가져오기',pri:true,fn:()=>{
    const before={}, after={}; for(const k of Object.keys(root))if(A.isPlanKey(k)){before[k]=copy(root[k]);after[k]=null;} for(const [k,v] of Object.entries(ov)){if(!(k in before))before[k]=null;after[k]=v;}
    for(const p of others){try{A.calculate(p);}catch(e){continue;}const key='sc:'+(/^[\w-]{1,40}$/.test(p.id)&&p.id!=='base'?p.id:crypto.randomUUID().slice(0,8));before[key]=root[key]===undefined?null:copy(root[key]);after[key]={name:p.name||'가져온 시나리오',by:sharedUser,at:new Date().toISOString(),ov:A.diffPlans(base,p)};}
    for(const [k,v] of Object.entries(after)){if(v===null)delete root[k];else root[k]=copy(v);} SCHU.scn=''; SCH.memo[pid]=null;
    SCH.undo.push({pid,sc:'',raw:true,before,after,label:'일정 가져오기'}); SCH.redo.length=0; toast('일정을 가져왔습니다.',4200,{t:'되돌리기',fn:schUndo}); schRedraw(true); }},{t:'취소',fn:()=>{}}]); }
function schExportCsv(pid,kind){ const m=schModel(pid), stamp=schToday(); let rows;
  if(kind==='tasks')rows=[['ID','WBS','단계','업무명','작업유형','참조시작','참조완료','관리시작','관리완료','예상시작','예상완료','달력기간','실제시작','실제완료','잔여일','진척률(0~1)','상태','담당 멤버','실행 역할','중요도','URL','추가지연','운영여유','완료기준','조건·확약','증빙']]
    .concat(m.plan.tasks.map(t=>{const x=m.res.tasks[t.id];return [t.id,t.wbs,t.phaseLabel,t.name,t.kind==='milestone'?'마일스톤':'작업',t.referenceStart,t.referenceFinish,t.plannedStart,t.plannedFinish,x.start,x.finish,x.duration,t.actualStart,t.actualFinish,t.remaining,t.progress,schStatus(t),schPeople(t).map(userName).join(', '),schRole(t),priTxt[schPri(m,t)]+(t.pri?'':' (자동)'),t.url||'',t.delay,x.slack,t.criteria,t.conditions,t.evidence];}));
  else rows=[['관계ID','원연결번호','선행WBS','후행WBS','유형','추가간격(달력일)','활성','조건']].concat(m.plan.dependencies.map(e=>[e.id,e.sourceId,m.byId.get(e.from).wbs,m.byId.get(e.to).wbs,e.type,e.lag,e.active?'적용':'조건부 제외',e.condition]));
  schDownload(`${proj(pid).tag}_${kind==='tasks'?'업무':'업무연결'}_${stamp}.csv`,schCsv(rows),'text/csv;charset=utf-8'); toast('CSV 파일을 내려받았습니다. 엑셀에서 바로 열 수 있습니다.',2800); }
function schToolsMenu(el,pid){ const m=schModel(pid); if(!m)return; const A=AIDCSchedule, root=SCHED[pid]||{}, scs=schScenarios(pid), cur=schScenario(pid), changed=Object.keys(schOv(pid)).filter(A.isPlanKey).length;
  const items=[{hd:`${proj(pid).tag} 일정 · 변경 ${changed}건${cur?' (시나리오)':''}`},
    {t:'되돌리기'+(SCH.undo.length?` · ${SCH.undo[SCH.undo.length-1].label||''}`:''),fn:schUndo},{t:'다시 적용',fn:schRedo},'-',
    {t:'운영개시를 결정하는 경로 보기',fn:()=>openPanel(`st-${pid}-path`)},{t:`상태일 변경 (지금 ${schD(m.plan.statusDate)})`,fn:()=>datePick(el,m.plan.statusDate,v=>{if(v)schCommit(pid,d=>{d.statusDate=v;},'상태일 '+schD(v));})},
    {t:'진행률 계산 방식',fn:()=>openPanel(`st-${pid}-progress`)},'-',{hd:'시나리오 (가정을 따로 검토)'},
    {t:'기본 계획'+(cur?'':' · 보는 중'),sel:!cur,fn:()=>{SCHU.scn='';SCH.memo[pid]=null;schUiSave();schRedraw(true);}},
    ...scs.map(s=>({t:s.name+(cur===s.id?' · 보는 중':''),sel:cur===s.id,fn:()=>{SCHU.scn=s.id;SCH.memo[pid]=null;schUiSave();schRedraw(true);toast(`시나리오 “${s.name}”를 보고 있습니다. 여기서 고친 내용은 기본 계획에 반영되지 않습니다.`,3600);}})),
    {t:'+ 지금 계획을 복제해 새 시나리오',fn:()=>askInput('시나리오 이름','지연 검토',v=>{v=(v||'').trim();if(!v)return;const id=crypto.randomUUID().slice(0,8);const ov=Object.fromEntries(Object.entries(schOv(pid)).filter(([k])=>A.isPlanKey(k)).map(([k,x])=>[k,copy(x)]));schSet(pid,'sc:'+id,{name:v,by:sharedUser,at:new Date().toISOString(),ov},'시나리오를 만들었습니다');SCHU.scn=id;SCH.memo[pid]=null;schUiSave();schRedraw(true);})}];
  if(scs.length)items.push({t:'시나리오 비교',fn:()=>openPanel(`st-${pid}-compare`)});
  if(cur)items.push({t:'이 시나리오를 기본 계획에 반영',fn:()=>confirmDlg('이 시나리오의 내용으로 공유 기본 계획을 바꿀까요? (되돌리기 가능)',[{t:'반영',pri:true,fn:()=>{const ov=(root['sc:'+cur]||{}).ov||{};const before={},after={};for(const k of Object.keys(root))if(A.isPlanKey(k)){before[k]=copy(root[k]);after[k]=null;}for(const [k,v] of Object.entries(ov)){if(!(k in before))before[k]=null;after[k]=v;}for(const [k,v] of Object.entries(after)){if(v===null)delete root[k];else root[k]=copy(v);}SCHU.scn='';SCH.memo[pid]=null;SCH.undo.push({pid,sc:'',raw:true,before,after,label:'시나리오 반영'});SCH.redo.length=0;toast('기본 계획에 반영했습니다.',4200,{t:'되돌리기',fn:schUndo});schRedraw(true);}},{t:'취소',fn:()=>{}}])},
    {t:'이 시나리오 삭제',danger:true,fn:()=>confirmDlg('이 시나리오를 삭제할까요?',[{t:'삭제',pri:true,fn:()=>{const id=cur;SCHU.scn='';schSet(pid,'sc:'+id,null,'시나리오를 삭제했습니다');}},{t:'취소',fn:()=>{}}])});
  items.push('-',{hd:'파일'},{t:'백업 내보내기 (JSON · SUNJIN Schedule 호환)',fn:()=>{schDownload(`${proj(pid).tag}_일정_백업_${schToday()}.json`,JSON.stringify(schBackup(pid),null,1));toast('백업 파일을 내려받았습니다.',2400);}},
    {t:'백업 가져오기 (JSON)',fn:()=>{const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;if(f.size>25*1024*1024){toast('25MB 이하의 파일을 선택해주세요.');return;}schImportBackup(pid,await f.text());};inp.click();}},
    {t:'업무 목록 내려받기 (CSV · 엑셀)',fn:()=>schExportCsv(pid,'tasks')},{t:'업무 관계 내려받기 (CSV · 엑셀)',fn:()=>schExportCsv(pid,'deps')},'-',
    {t:cur?'이 시나리오의 변경 모두 지우기':'원본 일정으로 되돌리기 (변경 모두 지우기)',danger:true,fn:()=>{ if(!changed){toast('지울 변경이 없습니다.');return;} confirmDlg(`일정 변경 ${changed}건을 지우고 원본 일정으로 되돌릴까요? 담당자·중요도 지정도 함께 지워집니다. (되돌리기 가능)`,[{t:'되돌리기',pri:true,fn:()=>{const ch={};for(const k of Object.keys(schOv(pid)))if(A.isPlanKey(k))ch[k]=null;const before={};for(const k of Object.keys(ch))before[k]=copy(schOv(pid)[k]);schWrite(pid,ch);SCH.undo.push({pid,sc:cur,before,after:ch,label:'원본 일정으로'});SCH.redo.length=0;toast('원본 일정으로 되돌렸습니다.',4200,{t:'되돌리기',fn:schUndo});schRedraw(true);}},{t:'취소',fn:()=>{}}]); }});
  menuPop(el,items.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)}),{cls:'link'}); }
// information panels of the tools menu (ids st-<project>-path / -progress / -compare)
function schToolPanelHtml(pid,kind){ const m=schModel(pid), A=AIDCSchedule, R=(k,inner)=>`<div class="pr" style="height:auto"><span class="k">${k}</span><span class="v sch-v">${inner}</span></div>`;
  const wrap=(type,title,body)=>`<div class="itype"><i>${pict('action')}</i>${type}</div><div class="ihead"></div><div class="ititle">${esc(title)}</div><div class="props simple sch-simple"><div>${body}</div></div>`;
  if(kind==='path'){ const steps=A.drivingPath(m.plan,m.res), crit=m.plan.tasks.filter(t=>m.res.tasks[t.id].criticality==='critical');
    return wrap('프로젝트 도구','운영개시를 결정하는 경로',`<p class="sch-p">운영개시 예상 <b>${schD(m.res.operationDate)}</b>${m.res.operationDelay?` (목표 대비 ${m.res.operationDelay>0?'+':''}${m.res.operationDelay}일)`:''}을 결정하는 대표 경로입니다. 이 업무들이 하루 늦어지면 운영개시도 늦어집니다. 같은 날짜를 만드는 다른 경로가 더 있을 수 있습니다.</p>
      <div class="sch-path">${steps.map(s=>`<div class="st" data-open="${schItemId(s.taskId)}"><b>${schWbs(s.wbs)})</b><span>${esc(s.name)}</span><em>${schD(s.start)} → ${schD(s.finish)}</em><small>${esc(s.cause)}</small></div>`).join('')}</div>
      <p class="sch-p" style="margin-top:22px">여유가 0일인 업무 ${crit.length}건: ${crit.map(t=>`<a class="sch-wl" data-open="${schItemId(t.id)}" title="${esc(t.name)}">${schWbs(t.wbs)}</a>`).join(' · ')||'없음'}</p>`); }
  if(kind==='progress')return wrap('프로젝트 도구','진행률 계산 방식',`<p class="sch-p">단계와 전체의 진행률은 업무마다 <b>가중치 × 달성도</b>를 더해 전체 가중치로 나눈 값입니다.</p>
      ${R('가중치','<span class="plain wrap">√기간(일) × 중요도 × 마일스톤\n· 기간: 길수록 크게, 다만 제곱근으로 완만하게 (12일 → 3.5, 90일 → 9.5)\n· 중요도: 높음 1.5 · 중간 1 · 낮음 0.7 (지정 전에는 운영개시 경로·근접 업무가 높음)\n· 마일스톤: 2주짜리 업무로 보고 1.5배</span>')}
      ${R('달성도','<span class="plain wrap">· 완료: 100%\n· 진척률을 입력한 업무: 그 값\n· 착수만 한 업무: 지난 기간 ÷ 전체 기간 (10~90%)\n· 그 밖: 0%\n· ‘조건부 미발동’ 업무는 계산에서 뺍니다</span>')}
      ${R('지금 값',`<span class="plain wrap">${m.phases.map(g=>{const p=schProgress(m,g.tasks);return `${schPhaseLabel(g)}: ${schPct(p)}% (완료 ${p.done}/${p.total})`;}).join('\n')}\n전체: ${schPct(schProgress(m,m.plan.tasks))}%</span>`)}`);
  if(kind==='compare'){ const base=schPlanOf(pid,Object.fromEntries(Object.entries(SCHED[pid]||{}).filter(([k])=>A.isPlanKey(k)))); let h=`<p class="sch-p">기본 계획과 각 시나리오의 차이입니다. 운영개시 예상: 기본 계획 <b>${schD(base.res.operationDate)}</b></p>`;
    for(const s of schScenarios(pid)){ let x; try{x=schPlanOf(pid,s.ov);}catch(e){h+=R(esc(s.name),`<span class="plain">계산할 수 없습니다: ${esc(e.message)}</span>`);continue;}
      const d=A.dates.diffDays(x.res.operationDate,base.res.operationDate), diff=x.plan.tasks.filter(t=>{const a=base.res.tasks[t.id],b=x.res.tasks[t.id];return !a||a.start!==b.start||a.finish!==b.finish;});
      h+=R(esc(s.name),`<span class="plain wrap"><b>운영개시 ${schD(x.res.operationDate)}</b> (${d===0?'차이 없음':(d>0?'+':'')+d+'일'}) · 날짜가 달라지는 업무 ${diff.length}건\n${diff.slice(0,40).map(t=>{const a=base.res.tasks[t.id],b=x.res.tasks[t.id];return `${schWbs(t.wbs)}) ${esc(t.name)}: ${a?schD(a.finish):'-'} → ${schD(b.finish)}`;}).join('\n')}${diff.length>40?`\n… 외 ${diff.length-40}건`:''}</span>`); }
    return wrap('프로젝트 도구','시나리오 비교',h); }
  return ''; }
