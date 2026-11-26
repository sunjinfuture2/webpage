/* ---------- a project's Excel in the form of the guide workbook (forty-ninth round) ---------- */
// Owner, 2026-11-26: "엑셀은 누르면 내가 저번에 첨부해줬던 요거 대로 각 요약형태랑 풀버전 뜯어만들어. 이걸 반대로 넣었을때도 정상적으로
// 데이터가 입력될수 있게 형식 가이드로 등록도 하고". The export window's 엑셀 follows the parts that are ticked and the form of each:
//   진행 현황 요약 → 검토요약 · 액션 일정 → 마스터스케줄 (+ FULL: 단계별업무분장, 업무연결) · 외부설비 조달 → 외부설비 조달대장 ·
//   승인게이트 → 승인게이트 · 근거 및 확약 → FULL: 책임경계 … 보완·확약관리 (the guide's six sheets), 요약: one count sheet ·
//   사업 개요 / 미팅 / 협력업체 → sheets of their own in the same manner (the guide has none; they are not read back).
// The sheets keep the guide's names, head rows and titles, so a FULL sheet goes back in through the upload window exactly as it
// came out (readSheets finds every column by its title). The values are the project as it stands now: managed dates (members'
// changes included) in 시작일 / 완료일, the engine's forecast in 예상 시작일 / 예상 완료일, the key WBS of every task (never the
// number shown when an action was put in between: a task is matched by it). A 요약 sheet is for reading: the file names it in
// its hidden sheet __AIDC_EXPORT and the upload leaves it out. SCHEDULE.md "The Excel format" is the guide to all of it.
const SCH_XG_HEAD={
  tasks:['WBS','개발단계','업무패키지','시작일','완료일','기간 Day','선행 WBS·유형','승인 역할','실행 역할','협의 역할','완료기준·조건','주 담당','부 담당','진척률','상태','근거·원자료','기간 Week','운영 총여유 Day','운영 CP 구분','작업유형','기타 추가지연 Day','실제 시작일','실제 완료일','잔여기간 Day','갱신일','확약·조건 / 원상태','증빙·확인사항','예상 시작일','예상 완료일','달력·휴일 조건','투입인원','입력 확인'],
  links:['연결번호','선행 WBS','후행 WBS','유형','연계 조건','선행 기준시작','선행 기준완료','후행 기준시작','후행 기준완료','요구 기준일','기준 간격 Day','기준 판정','간트 표시','기본 경로 적용','추가간격 Day','예상 요구일','예상 후행일','예상 간격 Day','예상 판정'],
  gantt:['WBS','작업명','기간 Day','기간 Week','예상 시작일','예상 완료일','선행 WBS [유형]','후속 WBS [유형]','진척률','주 담당','부 담당','운영 여유 / CP'],
  gates:['게이트','연결 WBS','승인 사항','계획 승인일','통과 증빙','승인 역할','미충족 처리','연계업무','상태'],
  proc:['패키지','설비','포함 범위','공급/소유 경계','계약·PO WBS','PO 목표','납품완료 목표','설치완료 목표','단위 SAT 목표','계획창 Week','확약 납기 Week','납기 검토','업체·계약상태','발주/검수 증빙','연결 WBS 순서','실행 역할','설치·통합 조건','PO 추가지연 Day','운영 총여유 Day','변경 설치완료','견적 확보일','납기 기산조건','기산조건 충족일','추가 운송 Day','확약 기준 예상납품','확약 상태','견적·조건 증빙'],
  responsibilityBoundaries:['경계','주요 책임 역할','공동 확인','확정할 항목','WBS 연결','적용'],
  assumptionsAndReferences:['ID','구분','항목','내용·판교 반영','근거·원문 링크','연결 업무'],
  sourceMappings:['원ID','원단계','원업무명','판교 WBS','처리','원산출물','원완료기준'],
  nvisScheduleReview:['구분','항목','시작','완료','WBS·기간','성립 조건','근거'],
  offtakers:['구분','업체','공개 확인 사실','판교 적용 검토(추론)','협의 필수사항','현재 상태','출처'],
  commitmentReviews:['ID','검토 항목','연결 WBS·위치','모델 반영내용','남은 확인·입력','확인 역할','관리기한','확인상태','완료 확인일','확약·완료 증빙','담당자']};
// the look of each sheet as the guide has it: title row, head row, widths, type size, bands, the frozen corner
const SCH_XG_LOOK={
  '검토요약':{headRow:4,widths:[24,48,91],size:11,band:1,freeze:[0,4],tab:'203D62'},
  '마스터스케줄':{titleRow:1,headRow:5,widths:[10,13,44,10,13,13,13,30,26,9,11,13,14],size:10,freeze:[3,6],tab:'203D62'},
  '단계별업무분장':{headRow:4,widths:[8,23,48,14,13,12,43,18,24,26,95,15,13,12,25,42,14,18,13,16,17,13,13,13,13,38,13,16,13,30,17,21],size:10,freeze:[3,4],title:'개발 단계별 업무분장 및 일정 입력'},
  '승인게이트':{headRow:4,widths:[11,13,29,15,72,21,68,32,15],size:11,band:1,freeze:[0,4],title:'단계별 승인 및 중단 조건'},
  '책임경계':{headRow:4,widths:[24,34,30,64,27,70],size:11,band:1,freeze:[0,4],title:'발주·수행 책임 경계'},
  '전제와참고자료':{headRow:4,widths:[10,17,28,87,100,33],size:11,band:1,freeze:[0,4],title:'일정 전제·확인사항 및 참고자료'},
  '원자료대조':{headRow:4,widths:[12,13,76,23,20,43,95],size:11,band:1,freeze:[0,4],title:'원자료와 업무 연결'},
  'NVIS일정검토':{headRow:4,widths:[22,35,15,13,16,85,30],size:10,freeze:[0,4],tab:'D69E36',title:'운영개시 목표 및 NVIS 역산 조건'},
  '업무연결':{titleRow:1,headRow:6,widths:[10,15,13,10,40,14,13,13,13,13,12,13,17,13,13,13,13,16,13],size:10,freeze:[3,6],headFill:'203C60',title:'업무 연결 및 일정 정합성'},
  '오프테이커 후보검토':{titleRow:1,headRow:5,widths:[17,27,48,45,70,27,80],size:10,freeze:[2,5],title:'GPU 오프테이커·판매 파트너 후보 검토'},
  '외부설비 조달대장':{titleRow:1,headRow:5,widths:[12,28,57,60,15,13,13,13,13,14,16,28,13,90,70,30,75,20,13,13,19,13,13,13,13,13,45],size:10,freeze:[2,5],title:'외부설비 조달·설치 대장'},
  '보완·확약관리':{headRow:5,widths:[8,23,33,45,50,24,15,20,15,40,20],size:10,freeze:[0,5],headFill:'203C60',font:'맑은 고딕',titleSize:15,titleColor:'213547',title:'수정 반영 및 남은 확약사항'},
  '근거 및 확약 요약':{headRow:4,widths:[28,12,16,16],size:11,band:1,freeze:[0,4],title:'근거 및 확약 — 구분별 건수'},
  '사업개요':{headRow:4,widths:[26,110],size:11,band:1,freeze:[0,4]},
  '미팅':{headRow:4,widths:[13,40,24,50,40,40],size:10,band:1,freeze:[0,4],title:'미팅 기록'},
  '협력업체':{headRow:4,widths:[26,24,30,90],size:10,band:1,freeze:[0,4],title:'협력업체'}};
const schXgSlack=x=>x&&typeof x.slack==='number'?(x.slack<=0?'CP · ':x.slack<=14?'주의 · ':'여유 · ')+x.slack+'일':'대상 외';
const schXgTone=x=>x&&typeof x.slack==='number'?(x.slack<=0?'cp':x.slack<=14?'warn':''):'';
function schXgRecHeads(kind,recs){ const base=(SCH_XG_HEAD[kind]||[]).slice(), keys=[...new Set(recs.flatMap(r=>Object.keys(r||{})))];
  if(kind==='responsibilityBoundaries'){ const own=keys.find(k=>/적용$/.test(k)); if(own)base[5]=own; }   // the guide names this column after its project ("판교 적용")
  return base.concat(keys.filter(k=>!base.includes(k)&&!/^[A-Z]{1,3}$/.test(k))); }
function schXlSpec(pid,parts,forms){ const P=PROJECTS[pid], name=P.full||pname(P), m=schHas(pid)&&schReady(pid)?schModel(pid):null, has=k=>parts.includes(k), full=k=>(forms||{})[k]==='full';
  const today=schToday(), sheets=[], form={}, src=SCH.src[pid]||{}, root=SCHED[pid]||{}, res=t=>m.res.tasks[t.id]||{}, wbsOf=id=>{const t=m&&m.byId.get(id);return t?t.wbs:'';};
  const sheet=(nm,f,o)=>{ form[nm]=f; sheets.push(Object.assign({type:'table',name:nm,head:[],rows:[]},SCH_XG_LOOK[nm]||{},o)); };
  const note=f=>`${name} · AIDC WorkSpace에서 내보냄 ${today}${f==='sum'?' · 요약형 (보기용: 다시 올려도 반영되지 않습니다)':' · FULL (그대로 다시 올릴 수 있습니다)'}`;
  if(has('ov')){ const rows=schXProjRows(pid).slice(1); sheet('사업개요',full('ov')?'full':'sum',{title:`${name} 사업 개요`,note:note('sum').replace(' (보기용: 다시 올려도 반영되지 않습니다)',''),head:['항목','내용'],rows:full('ov')?rows:rows.filter(r=>r.length&&r[1]!==undefined&&r[1]!=='').slice(0,14)}); }
  if(has('state')&&m){ const tasks=m.plan.tasks, crit=tasks.filter(t=>res(t).criticality==='critical').length, near=tasks.filter(t=>res(t).criticality==='near').length, open=m.plan.procurement.filter(x=>!x.commitment||x.commitment==='미확약').length, noOwner=tasks.filter(t=>!t.primary).length;
    const pr=tasks.length?schProgress(m,m.phases.flatMap(g=>g.tasks)):null, late=tasks.filter(t=>schLate(m,t)).length, F=full('state');
    let rows;
    const sum=(src.sourceProjectSummary||[]), hi=sum.findIndex(r=>String((r.values||{}).A||'').replace(/\s+/g,'')==='항목');
    if(F&&hi>=0){ const put={'기준일':m.plan.statusDate,'현재 CP 업무 수':crit,'근접 업무 수':near,'납기 미확약 패키지':open,'주담당 미지정 업무':noOwner};
      rows=sum.slice(hi+1).map(r=>{ const v=r.values||{}, a=v.A==null?'':String(v.A); return [a,a in put?put[a]:(v.B==null?'':v.B),v.C==null?'':v.C]; }); }
    else { rows=[['기준일',m.plan.statusDate,'예측 상태일 (일정 계산의 기준)'],['프로젝트',name,''],['운영개시 예상',m.res.operationDate||'미정',m.res.operationDelay?`목표 대비 ${m.res.operationDelay>0?'+':''}${m.res.operationDelay}일`:''],
        ['전체 진행률',pr?schPct(pr)/100:'',`업무 ${tasks.length}건`],['지연 업무',late,'예상 완료일이 지난 미완료 업무'],['현재 CP 업무 수',crit,'운영개시 경로의 업무'],['근접 업무 수',near,'여유 14일 이하']];
      if(F)rows.push(['전체 범위',`${tasks.length}개 업무 / ${m.plan.dependencies.length}개 관계 / 외부설비 ${m.plan.procurement.length}개`,''],['납기 미확약 패키지',open,''],['주담당 미지정 업무',noOwner,''],['승인게이트',`${schGates(pid,m).filter(g=>g.st==='승인').length} / ${schGates(pid,m).length} 승인`,'']); }
    sheet('검토요약',F?'full':'sum',{title:`${name} 개발 마스터스케줄`,note:note(F?'full':'sum'),head:['항목',`${P.tag||name} 적용`,'설명'],rows,pct:F?[]:[1]}); }
  if(has('act')&&m&&m.plan.tasks.length){ const F=full('act'), ph=m.phases.filter(g=>g.tasks.length), pred=new Map(), succ=new Map();
    for(const e of m.plan.dependencies){ (pred.get(e.to)||pred.set(e.to,[]).get(e.to)).push(e); (succ.get(e.from)||succ.set(e.from,[]).get(e.from)).push(e); }
    const span=ts=>{ let a='9999',z=''; for(const t of ts){ const x=res(t); if(x.start<a)a=x.start; if(x.finish>z)z=x.finish; } return [a,z]; }, D=AIDCSchedule.dates;
    const all=ph.flatMap(g=>g.tasks), [a0,z0]=span(all), mS=d=>d.slice(0,8)+'01', addM=(d,k)=>{const t=new Date(d+'T00:00:00Z');t.setUTCMonth(t.getUTCMonth()+k);return t.toISOString().slice(0,10);};
    let to=addM(mS(z0),1); if(m.res.operationDate){ const c=addM(mS(m.res.operationDate),7); if(c<to)to=c; } if(to>addM(mS(a0),48))to=addM(mS(a0),48);
    const blocks=[]; for(const g of ph){ const [a,z]=span(g.tasks), pr=schProgress(m,g.tasks), d=D.diffDays(z,a)+1;
      blocks.push({ph:1,cells:[g.code,g.label,d,Math.round(d/7*10)/10,a,z,'','',schPct(pr)/100,'','',''],s:a,e:z});
      if(F)for(const t of g.tasks){ const x=res(t), dd=t.kind==='milestone'?0:D.diffDays(x.finish,x.start)+1, lst=(l,f)=>(l||[]).map(e=>`${wbsOf(f(e))} [${e.type}]`).join(', ')||'—';
        blocks.push({cells:[t.wbs,t.name,dd,Math.round(dd/7*10)/10,x.start,x.finish,lst(pred.get(t.id),e=>e.from),lst(succ.get(t.id),e=>e.to),t.progress==null?'':t.progress,t.primary||'',t.secondary||'',schXgSlack(x)],s:x.start,e:x.finish,pct:t.progress||0,tone:schXgTone(x),ms:t.kind==='milestone'}); } }
    form['마스터스케줄']=F?'full':'sum';
    sheets.push(Object.assign({type:'gantt',name:'마스터스케줄',head:SCH_XG_HEAD.gantt,title:`${name} 통합 개발 일정`,line2:m.res.operationDate?`운영개시 예상 ${m.res.operationDate}${m.res.operationDelay?` · 목표 대비 ${m.res.operationDelay>0?'+':''}${m.res.operationDelay}일`:''}`:'운영개시 예상 미정',
      notes:[`업무 ${m.plan.tasks.length}개 · 관계 ${m.plan.dependencies.length}개. 막대: 빨강 CP(여유 0일 이하) · 주황 주의(14일 이하) · 파랑 그 밖. 가운데 진한 선은 진척률.${F?'':' 요약형: 단계만.'}`,`상태일 ${m.plan.statusDate} · ${note(F?'full':'sum')}`],
      blocks,from:mS(a0),to,dates:[4,5],pct:[8]},SCH_XG_LOOK['마스터스케줄']));
    if(F){ const cal=new Map((src.tasks||[]).map(s=>[s.id,s]));
      sheet('단계별업무분장','full',{notes:[   // rows in the plan's own order: loaded back, nothing moves
        `D/E는 관리 기준일(앱에서 고친 날짜 포함), AB/AC는 예상일(계산 결과). WBS는 업무의 고정 키입니다.`,note('full')],head:SCH_XG_HEAD.tasks,
        rows:m.plan.tasks.map(t=>{ const x=res(t), s0=cal.get(t.id)||{}, dd=t.kind==='milestone'?0:D.diffDays(t.plannedFinish,t.plannedStart)+1, cells=(s0.sourceCells||{});
          return [t.wbs,t.phaseLabel||'',t.name,t.plannedStart,t.plannedFinish,dd,(pred.get(t.id)||[]).map(e=>`${wbsOf(e.from)} ${e.type}${e.lag?(e.lag>0?'+':'')+e.lag:''}`).join(';')||'-',t.roles.A||'',t.roles.R||'',t.roles.C||'',t.criteria||'',t.primary||'',t.secondary||'',t.progress==null?'':t.progress,t.status||'',cells.P==null?'':String(cells.P),
            Math.round(dd/7*10)/10,x.slack==null?'':x.slack,{critical:'크리티컬',near:'근접',normal:'일반',outside:'경로 밖'}[x.criticality]||'',t.kind==='milestone'?'마일스톤':'작업',t.delay||0,t.actualStart||'',t.actualFinish||'',t.remaining==null?'':t.remaining,m.plan.statusDate,t.conditions||'',t.evidence||'',x.start,x.finish,s0.sourceCalendarCondition||'달력일',t.headcount==null?'':t.headcount,'']; }),pct:[13]});
      sheet('업무연결','full',{notes:['FS: 선행 완료 뒤 시작 · SS: 선행 시작 뒤 시작 · FF: 선행 완료 뒤 완료 · SF: 선행 시작 뒤 완료. 추가간격은 달력일.','기본 경로 적용이 “적용”인 관계만 일정 계산에 들어갑니다.',note('full')],head:SCH_XG_HEAD.links,
        rows:m.plan.dependencies.map((e,i)=>{ const A=m.byId.get(e.from), B=m.byId.get(e.to); if(!A||!B)return null; const ra=res(A), rb=res(B);
          return [e.sourceId||('L'+String(i+1).padStart(3,'0')),A.wbs,B.wbs,e.type,e.condition||'',A.plannedStart,A.plannedFinish,B.plannedStart,B.plannedFinish,'','','','표시',e.active?'적용':'조건부 제외',e.lag||0,'',rb.start||'','','']; }).filter(Boolean)}); } }
  if(has('gate')&&m){ const gs=schGates(pid,m), F=full('gate');
    if(F){ let n=0; const rows=gs.map(g=>{ const f=g.f||{}; if(g.user){ n++; return [`추가${n}`,g.t?g.t.wbs:'',g.title,'',f['통과 증빙']||'',f['승인 역할']||'',f['미충족 처리']||'','',g.st]; } return [g.code,String(f['연결 WBS']||''),g.title,f['계획 승인일']==null?'':schDayOnly(f['계획 승인일'])||String(f['계획 승인일']),f['통과 증빙']||'',f['승인 역할']||'',f['미충족 처리']||'',f['연계업무']||'',g.st]; });
      sheet('승인게이트','full',{note:'계획 승인일은 원래 계획, 상태는 지금의 승인 상태. '+note('full'),head:SCH_XG_HEAD.gates,rows}); }
    else sheet('승인게이트','sum',{note:'예상 승인일은 연결 업무의 예상 완료일. '+note('sum'),head:['게이트','연결 WBS','승인 사항','예상 승인일','상태'],widths:[11,13,40,15,15],rows:gs.map(g=>[g.user?'추가':g.code,g.t?g.t.wbs:'',g.title,g.date||'',g.st])}); }
  if(has('evid')&&m){ if(full('evid')){ for(const kind of SCH_UP_EVK){ const recs=(src[kind]||[]).map((r,i)=>{ const f=Object.assign({},r.fields||{}), o=root[schEvKey(kind,i,r.fields||{})]||{};
          if(o.status){ if(kind==='commitmentReviews')f['확인상태']=o.status; else if(kind==='offtakers')f['현재 상태']=o.status; } return f; });
        for(const [k,v] of Object.entries(root))if(k.startsWith('e:u:')&&v&&v.kind===kind){ if(kind==='commitmentReviews')recs.push({ID:'추가','검토 항목':v.title||'','연결 WBS·위치':v.link||'','남은 확인·입력':v.body||'','확인 역할':v.role||'','관리기한':v.due||'','확인상태':v.status||''});
          else recs.push({ID:'추가','구분':v.cat||'','항목':v.title||'','내용·판교 반영':v.body||'','근거·원문 링크':v.ref||'','연결 업무':v.link||''}); }
        const head=schXgRecHeads(kind,recs); sheet(SCH_XL_SHEET[kind],'full',{note:note('full'),head,rows:recs.map(f=>head.map(h=>f[h]==null?'':f[h]))}); } }
    else { const kinds=SCH_UP_EVK.map(k=>({k,rows:schEvRows(pid,k)})).filter(x=>x.rows.length);
      sheet('근거 및 확약 요약','sum',{note:note('sum'),head:['구분','건수','완료·확인 외','완료·확인'],rows:kinds.map(x=>{ const open=x.rows.filter(r=>!/완료|확인|충족|종결/.test(String(r.st||''))).length; return [SCH_XL_SHEET[x.k],x.rows.length,open,x.rows.length-open]; })}); } }
  if(has('proc')&&m&&m.plan.procurement.length){ const F=full('proc'), fin=id=>{const t=m.byId.get(id);return t?t.plannedFinish:'';}, byIdx=new Map(m.plan.procurement.map(x=>[x.sourceIndex,x]));
    if(F){ const recs=(src.procurementPackages||[]).map((r,i)=>{ const x=byIdx.get(i); if(!x)return null; const f=Object.assign({},r.fields||{}), po=fin(x.poTaskId), dl=fin(x.deliveryTaskId), ins=fin(x.installTaskId), sat=fin(x.satTaskId), ri=m.res.tasks[x.installTaskId]||{};
        Object.assign(f,{'PO 목표':po,'납품완료 목표':dl,'설치완료 목표':ins,'단위 SAT 목표':sat,'계획창 Week':po&&dl?Math.round(AIDCSchedule.dates.diffDays(dl,po)/7*10)/10:'','확약 납기 Week':x.leadWeeks==null?'':x.leadWeeks,'업체·계약상태':x.supplier||'','PO 추가지연 Day':x.delay||0,
          '운영 총여유 Day':ri.slack==null?'':ri.slack,'변경 설치완료':ri.finish||'','납기 기산조건':x.trigger||'','기산조건 충족일':x.triggerDate||'','추가 운송 Day':x.transport||0,'확약 상태':x.commitment||'미확약','견적·조건 증빙':x.evidence||''}); return f; }).filter(Boolean);
      const head=schXgRecHeads('proc',recs); sheet('외부설비 조달대장','full',{notes:['날짜는 연결 업무의 관리 기준 완료일. 확약 납기·기산조건·지연은 지금의 입력값.',note('full')],head,rows:recs.map(f=>head.map(h=>f[h]==null?'':f[h]))}); }
    else sheet('외부설비 조달대장','sum',{notes:[note('sum')],head:['패키지','설비','계약·PO WBS','예상 PO','예상 설치완료','확약 상태','업체·계약상태'],widths:[12,32,14,14,15,14,28],
      rows:m.plan.procurement.map(x=>[x.id,x.name,wbsOf(x.poTaskId),(m.res.tasks[x.poTaskId]||{}).start||'',(m.res.tasks[x.installTaskId]||{}).finish||'',x.commitment||'미확약',x.supplier||''])}); }
  if(has('meet')){ const ms=liveItems('meeting',pid).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))), F=full('meet');
    if(ms.length)sheet('미팅',F?'full':'sum',{note:note('sum').replace(' (보기용: 다시 올려도 반영되지 않습니다)',''),head:['일자','제목','장소','주요안건','참석자 (선진)','상대 참여자'],rows:(F?ms:ms.slice(0,5)).map(i=>{ const mp=meetParts(i); return [i.date||'',oneLine(i.title),mp.place||'',mp.agenda||'',(i.people||[]).map(userName).join(', '),mp.guests||'']; })}); }
  if(has('part')){ const h=headOf(pid), names=(h.partners||[]).map(x=>String(x).replace(/^@/,'').trim()).filter(Boolean), F=full('part');
    if(names.length)sheet('협력업체',F?'full':'sum',{note:note('sum').replace(' (보기용: 다시 올려도 반영되지 않습니다)',''),head:['업체','구분','홈페이지','설명'],rows:names.map(nm=>{ const pt=PARTNERS.find(q=>!q.trash&&norm(q.name)===norm(nm))||{}; return F?[nm,partnerCategories(pt.cat).join(', '),pt.site&&pt.site!=='-'?pt.site:'',oneLine(partnerDesc(pt))]:[nm,partnerCategories(pt.cat).join(', '),'','']; })}); }
  // the guide's order of sheets; the app's own sheets (사업개요 first, 미팅 / 협력업체 last)
  const ORDER=['사업개요','검토요약','마스터스케줄','단계별업무분장','승인게이트','책임경계','전제와참고자료','원자료대조','NVIS일정검토','업무연결','오프테이커 후보검토','외부설비 조달대장','보완·확약관리','근거 및 확약 요약','미팅','협력업체'];
  sheets.sort((a,b)=>ORDER.indexOf(a.name)-ORDER.indexOf(b.name));
  for(const s of sheets)if(s.type==='table'&&!s.title)s.title=s.name;
  const fs=Object.values(form), kind=fs.length&&fs.every(f=>f==='full')?'FULL':fs.every(f=>f==='sum')?'요약':'맞춤';
  return {project:name,exported:today,forms:form,sheets,file:`${schXSafe(pname(P))}_엑셀(${kind})_${today.replace(/-/g,'')}`}; }
async function schXlGuideSave(pid,parts,forms){ const spec=schXlSpec(pid,parts,forms); if(!spec.sheets.length){ toast('엑셀로 낼 내용이 없습니다. 일정 · 조달 · 승인게이트 같은 항목을 골라주세요.',3600); return false; }
  toast('엑셀 파일을 만드는 중입니다…',20000); const X=await schXlsx(), bytes=await X.makeGuideBook(spec); schExpSave(spec.file+'.xlsx',new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); return true; }
