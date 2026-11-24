// Parts of the project page outside the 액션 section: the forecast operation date in the overview and the lower section
// (외부설비 조달 · 승인게이트 · 근거 및 확약). Their rows open in the right panel (ids sp- / sg- / se-, see schPanelHtml).
function schOpsRow(pid){ const m=schModel(pid); if(!m)return `<div class="fr"><b>운영개시 예상</b><span class="v" style="color:#c4c4c4">계산 중…</span></div>`;
  const r=m.res, d=r.operationDelay;
  return `<div class="fr"><b>운영개시 예상</b><span class="v sch-ops" data-sch="ops" title="일정에서 계산한 날짜입니다 (${SCH_SOURCES[pid]?'상용서비스 개시 업무의 예상 완료일':'가장 늦게 끝나는 업무의 예상 완료일'}). 눌러서 일정 보기">${r.operationDate?schD(r.operationDate):'<span style="color:#c4c4c4">미정 · 일정에 업무를 추가하면 계산됩니다</span>'}${d?`<em class="${d>0?'late':'early'}">목표 대비 ${d>0?'+':''}${d}일</em>`:''}${r.operationValid?'':'<em class="late">전력 경로 재승인 전 · 참고값</em>'}</span></div>`; }

const SCH_COMMIT=['미확약','견적 수령','조건부 확약','확약'];   // drawn with the status marks (SCH_MARK_OF)
const SCH_TRIGGERS=['미확정','PO 발행','선금 지급','도면 승인','복합 조건'];
const SCH_GATE_ST=['확인 전','준비 중','검토 요청','승인','보완·반려'];
const SCH_EV=[['commitmentReviews','보완·확약'],['assumptionsAndReferences','전제·근거'],['responsibilityBoundaries','책임경계'],['nvisScheduleReview','NVIS 일정검토'],['offtakers','오프테이커 후보'],['sourceMappings','원자료 대조']];
const SCH_EV_ST=['확인 필요','확인 중','반영 완료','조건부 미발동','보류'];
// "W7.10~W7.18", "W6.8/W6.27" ...: every WBS in a text becomes a link to its task
function schWbsLinks(m,text){ return esc(String(text??'')).replace(/W(\d+)\.(\d+)/g,(w,a,b)=>{const t=m.byWbs.get(w);return t?`<a class="sch-wl" data-open="${schItemId(t.id)}" title="${esc(schTaskTitle(t))}">${schNo(t)}</a>`:`${a}-${b}`;}); }   // (a text names a task by its key; it shows the number the task shows now)
const schDayOnly=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'';
const schPkgNo=x=>String(x.id).replace(/^\D+/,'')||x.id;
const schSrcFields=(pid,kind,i)=>(((SCH.src[pid]||{})[kind]||[])[i]||{}).fields||{};
const schEvKey=(kind,i,f)=>'e:'+kind+':'+(f.ID||f['원ID']||i);
// every record of one evidence collection, the member-added ones included, in one shape
function schEvRows(pid,kind){ const m=schModel(pid), src=(SCH.src[pid]||{})[kind]||[], root=SCHED[pid]||{}; const s=v=>v==null?'':String(v);
  const rows=src.map((r,i)=>{const f=r.fields, o=root[schEvKey(kind,i,f)]||{}; let x;
    if(kind==='commitmentReviews')x={no:s(f.ID),cat:'보완·확약',title:s(f['검토 항목']),link:s(f['연결 WBS·위치']),st:s(f['확인상태']),role:s(f['확인 역할']),due:schDayOnly(f['관리기한']),body:s(f['남은 확인·입력'])};
    else if(kind==='assumptionsAndReferences')x={no:s(f.ID),cat:s(f['구분']),title:s(f['항목']),link:s(f['연결 업무']),st:'',role:'',due:'',body:s(f['내용·판교 반영']),ref:s(f['근거·원문 링크'])};
    else if(kind==='responsibilityBoundaries')x={no:String(i+1).padStart(2,'0'),cat:'책임경계',title:s(f['경계']),link:s(f['WBS 연결']),st:'',role:s(f['주요 책임 역할']),due:'',body:s(f['확정할 항목'])};
    else if(kind==='nvisScheduleReview')x={no:String(i+1).padStart(2,'0'),cat:s(f['구분']),title:s(f['항목']),link:s(f['WBS·기간']),st:'',role:'',due:schDayOnly(f['완료']),body:s(f['성립 조건']),ref:s(f['근거'])};
    else if(kind==='offtakers')x={no:String(i+1).padStart(2,'0'),cat:s(f['구분']),title:s(f['업체']),link:'',st:s(f['현재 상태']),role:'',due:'',body:s(f['판교 적용 검토(추론)']),ref:s(f['출처'])};
    else x={no:s(f['원ID']),cat:s(f['처리']),title:s(f['원업무명']),link:s(f['판교 WBS']),st:'',role:'',due:'',body:s(f['원완료기준'])};
    return Object.assign(x,{id:`se-${pid}-${kind}-${i}`,key:schEvKey(kind,i,f),fields:f,st0:x.st},o.status?{st:o.status}:{},o.note?{note:o.note}:{}); });
  for(const [k,v] of Object.entries(root))if(k.startsWith('e:u:')&&v&&v.kind===kind)rows.push({id:`se-${pid}-u-${k.slice(4)}`,key:k,user:true,no:'추가',cat:v.cat||(kind==='commitmentReviews'?'보완·확약':'전제·근거'),title:v.title||'',link:v.link||'',st:v.status||'',role:v.role||'',due:v.due||'',body:v.body||'',ref:v.ref||'',note:v.note||'',by:v.by,at:v.at,fields:{}});
  return rows; }

function schLowChips(){ const out=[], chip=(k,label)=>out.push(`<button class="sch-chip" data-sch="chip" data-k="${k}" title="이 조건 지우기">${esc(label)}<i>✕</i></button>`);
  if(SCHU.sec==='proc'&&SCHU.procState)chip('procState','확약 상태: '+SCHU.procState); if(SCHU.sec==='evid'&&SCHU.evState)chip('evState','상태: '+SCHU.evState); return out.join(''); }
function schLowerSection(pid){ const tabs=[['proc','외부설비 조달'],['gate','승인게이트'],['evid','근거 및 확약']];
  return `<div class="sec sch-sec" id="sch-lower" style="margin-top:128px"><div class="sec-title sch-title" style="margin-left:-2.8px"><span class="sch-tabs lead" style="margin-left:0">${tabs.map(([k,t],i)=>`${i?'<i>·</i>':''}<button class="${SCHU.sec===k?'on':''}" data-sch="sec" data-k="${k}">${t}</button>`).join('')}<span data-sch="lowadd" class="sch-evadd up" title="${esc((tabs.find(x=>x[0]===SCHU.sec)||tabs[0])[1])}에 추가">${plusBtn('','추가')}</span></span>
      <label class="srch box">${svg('pic-search',15,15)}<input data-schq="lq" placeholder="검색" value="${esc(SCHU.lq||'')}">${qx(SCHU.lq)}</label></div>
    <div class="sch-chipwrap"><div class="sch-chiprow" data-chips="low">${schLowChips()}</div></div><div data-sec="sch-low">${schLowerBody(pid)}</div></div>`; }
// The + of the lower section stands above the middle of the tab that is open.
function schLowAddPlace(){ const box=$('#sch-lower .sch-tabs.lead'), on=box&&$('button.on',box), add=box&&$('.sch-evadd.up',box); if(!on||!add)return; add.style.left=(on.offsetLeft+on.offsetWidth/2)+'px'; }
function schLowerBody(pid){ const m=schModel(pid); if(!m)return `<div class="sch-empty">${SCH.failed[pid]?esc(SCH.failed[pid]):'일정을 불러오는 중입니다…'}</div>`;
  return SCHU.sec==='gate'?schGatesHtml(pid,m):SCHU.sec==='evid'?schEvidHtml(pid,m):schProcHtml(pid,m); }
function schLowerRefresh(){ const el=$('[data-sec="sch-low"]'); if(!el||!schHas(S.proj))return; el.innerHTML=schLowerBody(S.proj); $$('#sch-lower .sch-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.k===SCHU.sec)); { const ch=$('#sch-lower [data-chips]'); if(ch)ch.innerHTML=schLowChips(); } schLowAddPlace(); schUiSave(); afterNav(); }
const schSf=(k,label,set,cls='')=>`<div class="sf ${cls} ${set?'set':''}" data-sch="pick" data-k="${k}"><span>${esc(label)}</span>${svg('i-chev-d',9,4.6)}</div>`;

/* ---------- 외부설비 조달 ---------- */
function schProcHtml(pid,m){ const q=(SCHU.lq||'').trim(); const list=m.plan.procurement.filter(x=>(!SCHU.procState||x.commitment===SCHU.procState)&&(!q||matchQ(q,x.name,x.id,x.supplier,x.commitment,schSrcFields(pid,'procurementPackages',x.sourceIndex)['실행 역할'])));
  const th=t=>`<span><em>${t}</em></span>`;
  let h=`<div class="sch-filters">${schSf('procState',SCHU.procState||'전체 상태',!!SCHU.procState)}<div class="right">${schUpBtn('ext')}</div></div>
    <div class="tbl sch-proc"><div class="hd">${th('No.')}${th('설비')}${th('계약·PO 업무')}${th('예상 PO → 예상 설치완료')}${th('PO 추가지연')}${th('상태')}${th('담당자')}${th('운영 여유')}${th('확약 납기')}</div>`;
  for(const x of list){ const po=m.byId.get(x.poTaskId), pr=m.res.tasks[x.poTaskId], ins=m.res.tasks[x.installTaskId], f=schSrcFields(pid,'procurementPackages',x.sourceIndex), ppl=Array.isArray(x.people)?x.people:[], dl=m.res.deliveries[x.id];
    h+=`<div class="rw ${S.panel===`sp-${pid}-${x.id}`?'sel':''}" data-open="sp-${pid}-${esc(x.id)}"><div class="w">${x.sourceIndex<0?'추가':esc(schPkgNo(x))}</div><div class="nm">${esc(x.name)}</div><div class="lk">${po?`<a data-open="${schItemId(po.id)}" title="${esc(schTaskTitle(po))}">${schNo(po)}${svg('i-sch-ext',9,9)}</a>`:'-'}</div>
      <div class="rg">${pr&&ins?schRange(pr.start,ins.finish):'-'}</div><div class="dl"><span class="sf-e" data-schc="pdelay" data-k="${esc(x.id)}" title="PO 추가지연 (일) 변경">${x.delay?x.delay+'일':'-'}</span></div>
      <div>${schStateMark(x.commitment||'미확약','sf-e',`data-schc="pcommit" data-k="${esc(x.id)}" title="확약 상태 변경"`)}</div>
      <div class="who">${ppl.length?ppl.map(k=>`<span data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join(''):'<span class="sch-role none">미지정</span>'}</div><div class="sl">${ins&&ins.slack!==null?ins.slack+'일':'<span style="color:#c4c4c4">대상 외</span>'}</div>
      <div class="lead">${x.leadWeeks!==null?`${+(+x.leadWeeks).toFixed(1)}주${dl?` <small>${schD(dl)} 납품</small>`:''}`:'-'}</div></div>`; }
  if(!list.length)h+=`<div class="none">조건에 맞는 설비가 없습니다.</div>`;
  return h+`<div class="ft"></div></div>`; }

/* ---------- 승인게이트 ---------- */
function schGates(pid,m){ const root=SCHED[pid]||{}; const list=((SCH.src[pid]||{}).gates||[]).map((r,i)=>{const f=r.fields, t=m.byWbs.get(String(f['연결 WBS'])), o=root['g:'+f['게이트']]||{};
    return {i,code:String(f['게이트']),title:String(f['승인 사항']),t,date:t?m.res.tasks[t.id].finish:schDayOnly(f['계획 승인일']),plan:schDayOnly(f['계획 승인일']),st:o.status||String(f['상태']||'확인 전'),o,f};});
  for(const [k,v] of Object.entries(root)){ if(!k.startsWith('g:u:')||!v)continue; const t=m.byId.get(v.task)||null; // a gate a member added: its date is the forecast finish of the task it waits for
    list.push({user:true,code:k.slice(2),title:v.title||'승인게이트',t,date:t?m.res.tasks[t.id].finish:'',plan:'',st:v.status||'확인 전',o:v,f:{'승인 역할':v.role||'','통과 증빙':v.evidence||'','미충족 처리':v.fallback||'','연계업무':''}}); }
  return list.sort((a,b)=>(a.date||'9').localeCompare(b.date||'9')); }
function schGatesHtml(pid,m){ const q=(SCHU.lq||'').trim(), today=schToday(), D=AIDCSchedule.dates; const list=schGates(pid,m).filter(g=>!q||matchQ(q,g.code,g.title,g.f['통과 증빙'],g.f['승인 역할'],g.st));
  let h=`<div class="sch-filters"><div class="right" style="margin-left:0;font-size:12.5px;color:#8e8e8e">날짜는 연결된 업무의 예상 완료일입니다. 날짜가 지나도 자동으로 승인되지 않습니다.</div><div class="right">${schUpBtn('ext')}</div></div><div class="sch-gates">`;
  // the line is black only where it leads into an approved gate, and only as far as that gate's dot (owner, 2026-11-19)
  list.forEach((g,i)=>{ const ok=g.st==='승인', nextOk=!!list[i+1]&&list[i+1].st==='승인', slip=g.plan&&g.date?D.diffDays(g.date,g.plan):0;
    h+=`<div class="gt ${ok?'ok':'wait'} ${nextOk?'to-ok':''} ${S.panel===`sg-${pid}-${g.code}`?'sel':''}" data-open="sg-${pid}-${esc(g.code)}">${i?'':`<i class="ln0 ${ok?'ok':''}"></i>`}<i class="ln"></i><div class="date">${g.date?schD(g.date):'<span style="color:#c4c4c4;font-weight:500">업무 미연결</span>'}${slip?`<em class="${slip>0?'late':''}">${slip>0?'+':''}${slip}일</em>`:''}</div><i class="dot"></i>
      <div class="hd2"><div class="cat"><small>${g.user?'추가':esc(g.code)}</small>${esc(g.title)}</div>${g.t?`<span class="chip pj-g" data-open="${schItemId(g.t.id)}" title="${esc(schTaskTitle(g.t))}"><span class="t">${esc(schTaskTitle(g.t))}</span></span>`:''}${schStateMark(g.st,'sf-e',`data-schc="gstate" data-k="${esc(g.code)}" title="승인 상태 변경"`)}</div>
      <dl><dt>승인 역할</dt><dd>${esc(g.f['승인 역할']||'-')}</dd><dt>통과 증빙</dt><dd>${esc(g.f['통과 증빙']||'-')}</dd><dt>미충족 처리</dt><dd>${esc(g.f['미충족 처리']||'-')}</dd></dl></div>`; });
  if(!list.length)h+=`<div class="sch-empty">조건에 맞는 승인게이트가 없습니다.</div>`;
  return h+`</div>`; }

/* ---------- 근거 및 확약 ---------- */
function schEvidHtml(pid,m){ const kind=SCHU.evKind, q=(SCHU.lq||'').trim(); let rows=schEvRows(pid,kind); const allN=rows.length, sts=[...new Set(rows.map(r=>r.st).filter(Boolean))];
  if(SCHU.evState&&!sts.includes(SCHU.evState))SCHU.evState='';
  rows=rows.filter(r=>(!SCHU.evState||r.st===SCHU.evState)&&(!q||matchQ(q,r.no,r.cat,r.title,r.link,r.st,r.role,r.body,r.ref)));
  const per=20, total=Math.max(1,Math.ceil(rows.length/per)); SCHU.evPage=Math.min(Math.max(1,SCHU.evPage),total); const page=rows.slice((SCHU.evPage-1)*per,SCHU.evPage*per);
  const src=SCH.src[pid]||{}, name=(SCH_EV.find(x=>x[0]===kind)||SCH_EV[0])[1], th=t=>`<span><em>${t}</em></span>`;
  let h=`<div class="sch-filters">${schSf('evKind',`${name} (${allN})`,true)}${sts.length?schSf('evState',SCHU.evState||'전체 상태',!!SCHU.evState):''}<div class="right">${schUpBtn('ext')}</div></div>
    <div class="tbl sch-ev"><div class="hd">${th('ID')}${th('구분')}${th('제목')}${th('연결 업무')}${th('상태')}${th('확인 역할')}${th('기한')}${th('내용')}</div>`;
  for(const r of page)h+=`<div class="rw ${S.panel===r.id?'sel':''}" data-open="${esc(r.id)}"><div class="w">${esc(r.no)}</div><div class="ct">${esc(r.cat)}</div><div class="nm"><span class="tx">${esc(r.title)}</span></div><div class="lk"><span class="tx">${schWbsLinks(m,r.link)||'-'}</span></div>
      <div>${r.st||r.user||kind==='commitmentReviews'?(r.st?schStateMark(r.st,'sf-e',`data-schc="estate" data-k="${esc(r.key)}" title="상태 변경"`):`<span class="sf-e sch-cm cm-none" data-schc="estate" data-k="${esc(r.key)}" title="상태 변경">상태 없음</span>`):'<span style="color:#c4c4c4">-</span>'}</div>
      <div class="rl"><span class="tx">${esc(r.role||'-')}</span></div><div class="du">${r.due?schD(r.due):'-'}</div><div class="bd"><span class="tx">${esc(r.body)}</span></div></div>`;
  if(!page.length)h+=`<div class="none">조건에 맞는 기록이 없습니다.</div>`;
  return h+`<div class="ft"></div></div>${total>1?schPager(SCHU.evPage,total,'evPage',32):''}`; }

/* ---------- these rows in the right panel ---------- */
function schPanelHtml(id){ const mm=/^s([pget])-([^-]+)-(.+)$/.exec(id||''); if(!mm)return ''; const pid=mm[2]; if(!schReady(pid))return ''; const m=schModel(pid), rest=mm[3];
  if(mm[1]==='t')return schToolPanelHtml(pid,rest);
  const none='<span class="plain" style="color:#c4c4c4">없음</span>', R=(k,inner,tall)=>`<div class="pr" ${tall?'style="height:auto"':''}><span class="k">${k}</span><span class="v sch-v">${inner}</span></div>`;
  const txt=v=>v!=null&&String(v).trim()!==''?`<span class="plain wrap">${esc(String(v))}</span>`:none, e=(k,inner,title='')=>`<span class="sf-e" data-schx="${k}" ${title?`title="${esc(title)}"`:''}>${inner}</span>`, ph=t=>`<i>${t}</i>`;
  const wrap=(icon,type,title,rows,foot='')=>`<div class="itype"><i>${pict(icon)}</i>${type}</div><div class="ihead"><span class="last" style="margin-left:0">값을 누르면 바로 바뀝니다 · 되돌리기 Ctrl+Z</span></div><div class="ititle">${esc(title)}</div><div class="props simple sch-simple"><div>${rows.join('')}</div>${foot}</div>`;
  if(mm[1]==='p'){ const x=m.plan.procurement.find(q=>q.id===rest); if(!x)return ''; const f=schSrcFields(pid,'procurementPackages',x.sourceIndex), po=m.byId.get(x.poTaskId), T=tid=>{const t=m.byId.get(tid);return t?`<a class="sch-wl" data-open="${schItemId(t.id)}">${esc(schTaskTitle(t))}</a> <span class="plain" style="color:#8e8e8e">${schD(m.res.tasks[tid].start)} → ${schD(m.res.tasks[tid].finish)}</span>`:none;};
    const ins=m.res.tasks[x.installTaskId], ppl=Array.isArray(x.people)?x.people:[], dl=m.res.deliveries[x.id];
    return wrap('action','외부설비 조달 · '+esc(x.sourceIndex<0?'추가':x.id),x.name,[
      ...(x.sourceIndex<0?[R('설비 이름',e('name',`<span class="plain wrap">${esc(x.name)}</span>`))]:[]),
      R('확약 상태',e('commitment',schStateMark(x.commitment||'미확약'))),R('담당자',e('people',ppl.length?`<span class="people">${ppl.map(k=>`<span class="who" data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')}</span>`:'<span class="sch-role none" style="font-size:14px">미지정</span>')),
      R('PO 추가지연',e('delay',x.delay?x.delay+'일':ph('없음'),'계약·PO 업무에 더하는 지연 일수')),R('확약 납기',e('leadWeeks',x.leadWeeks!==null?(+(+x.leadWeeks).toFixed(2))+'주':ph('미입력'),'공급사가 확약한 납기 (주)')+(dl?`<span class="plain" style="color:#8e8e8e;margin-left:8px">확약 기준 예상 납품 ${schD(dl)}</span>`:'')),
      R('납기 기산조건',e('trigger',esc(x.trigger||'미확정'))+(x.trigger&&x.trigger!=='PO 발행'&&x.trigger!=='미확정'?`<span class="plain" style="margin:0 6px;color:#c4c4c4">충족일</span>`+e('triggerDate',x.triggerDate?schD(x.triggerDate):ph('입력')):'')),R('별도 운송',e('transport',x.transport?x.transport+'일':ph('없음'))),
      R('공급사·계약상태',e('supplier',x.supplier?`<span class="plain wrap">${esc(x.supplier)}</span>`:ph('입력')),true),R('견적·조건 증빙',e('evidence',x.evidence?`<span class="plain wrap">${esc(x.evidence)}</span>`:ph('입력')),true),
      R('계약·PO',T(x.poTaskId)+(x.sourceIndex<0?e('ptask:poTaskId',ph('변경')):''),true),R('납품',T(x.deliveryTaskId)+(x.sourceIndex<0?e('ptask:deliveryTaskId',ph('변경')):''),true),R('설치',T(x.installTaskId)+(x.sourceIndex<0?e('ptask:installTaskId',ph('변경')):''),true),R('단위 SAT',T(x.satTaskId)+(x.sourceIndex<0?e('ptask:satTaskId',ph('변경')):''),true),R('운영 여유',`<span class="plain">${ins&&ins.slack!==null?ins.slack+'일':'대상 외'}</span>`),
      R('포함 범위',txt(f['포함 범위']),true),R('공급/소유 경계',txt(f['공급/소유 경계']),true),R('연결 업무 순서',`<span class="plain wrap">${schWbsLinks(m,f['연결 WBS 순서'])}</span>`,true),R('설치·통합 조건',`<span class="plain wrap">${schWbsLinks(m,f['설치·통합 조건'])}</span>`,true),R('발주/검수 증빙',txt(f['발주/검수 증빙']),true),R('납기 검토 (원본)',txt(f['납기 검토']),true)],x.sourceIndex<0?`<div style="padding-top:8px"><button class="sh-btn sp-del" data-schx="pdel">이 패키지 삭제</button></div>`:''); }
  if(mm[1]==='g'){ const g=schGates(pid,m).find(q=>q.code===rest); if(!g)return ''; const slip=g.plan&&g.date?AIDCSchedule.dates.diffDays(g.date,g.plan):0, U=g.user;
    const ue=(k,v,p)=>U?e('gu:'+k,v?`<span class="plain wrap">${esc(v)}</span>`:ph(p)):txt(v);
    return wrap('action','승인게이트 · '+(U?'추가':esc(g.code)),g.title,[
      ...(U?[R('승인 사항',e('gu:title',`<span class="plain wrap">${esc(g.title)}</span>`))]:[]),
      R('승인 상태',e('gstate',schStateMark(g.st))+(g.o.by?`<span class="plain" style="color:#8e8e8e;margin-left:10px">${esc(userName(g.o.by))} · ${esc(schD((g.o.at||'').slice(0,10)))}</span>`:'')),
      R('예상 승인일',`<span class="plain">${g.date?schD(g.date):'-'}</span>${slip?`<em class="sch-delta ${slip>0?'late':''}">계획 대비 ${slip>0?'+':''}${slip}일</em>`:''}`),...(U?[]:[R('계획 승인일',`<span class="plain">${g.plan?schD(g.plan):'-'}</span>`)]),
      R('연결 업무',(g.t?`<a class="sch-wl" data-open="${schItemId(g.t.id)}">${esc(schTaskTitle(g.t))}</a>`:none)+(U?e('gu:task',ph(g.t?'변경':'선택')):''),true),...(U?[]:[R('연계 업무',`<span class="plain wrap">${schWbsLinks(m,g.f['연계업무'])}</span>`,true)]),
      R('승인 역할',ue('role',g.f['승인 역할'],'입력')),R('통과 증빙',ue('evidence',g.f['통과 증빙'],'입력'),true),R('미충족 처리',ue('fallback',g.f['미충족 처리'],'입력'),true),R('메모',e('gnote',g.o.note?`<span class="plain wrap">${esc(g.o.note)}</span>`:ph('입력')),true)],
      U?`<div style="padding-top:8px"><button class="sh-btn sp-del" data-schx="gu:del">이 승인게이트 삭제</button></div>`:''); }
  const um=/^u-(.+)$/.exec(rest), km=/^([A-Za-z]+)-(\d+)$/.exec(rest); let r=null, kind='';
  if(um){const v=(SCHED[pid]||{})['e:u:'+um[1]];if(!v)return '';kind=v.kind;r=schEvRows(pid,kind).find(q=>q.key==='e:u:'+um[1]);} else if(km){kind=km[1];r=schEvRows(pid,kind)[+km[2]];}
  if(!r)return ''; const name=(SCH_EV.find(q=>q[0]===kind)||['',''])[1], isUrl=v=>/^https?:\/\/\S+$/.test(String(v||'').trim());
  const rows=[R('상태',e('estate',r.st?schStateMark(r.st):ph('지정'))+(r.st0&&r.st!==r.st0?`<span class="plain" style="color:#8e8e8e;margin-left:10px">원본: ${esc(r.st0)}</span>`:''))];
  if(r.user){ const ue=(k,v,p)=>e('u:'+k,v?`<span class="plain wrap">${esc(v)}</span>`:ph(p));
    rows.push(R('제목',ue('title',r.title,'입력'),true),R('구분',ue('cat',r.cat,'입력')),R('연결 업무',r.link?`<span class="plain wrap">${schWbsLinks(m,r.link)}</span>${e('u:link',ph('변경'))}`:ue('link','','예: W4.24 또는 4-24'),true),R('확인 역할',ue('role',r.role,'입력')),R('기한',e('u:due',r.due?schD(r.due):ph('입력'))),R('내용',ue('body',r.body,'입력'),true),R('근거·URL',r.ref&&isUrl(r.ref)?`<a class="url" style="margin-left:0" href="${esc(r.ref)}" target="_blank" rel="noopener" data-stop>${esc(r.ref)}</a>${e('u:ref',ph('변경'))}`:ue('ref',r.ref,'입력'),true),
      R('작성',`<span class="plain">${esc(userName(r.by))} · ${esc(schD((r.at||'').slice(0,10)))}</span>`)); }
  else for(const [k,v] of Object.entries(r.fields)){ if(v==null||String(v).trim()==='')continue; const day=schDayOnly(v);
    rows.push(R(esc(k),isUrl(v)?`<a class="url" style="margin-left:0" href="${esc(String(v).trim())}" target="_blank" rel="noopener" data-stop>${esc(v)}</a>`:day&&/^\d{4}-\d{2}-\d{2}(T00:00:00)?$/.test(String(v))?`<span class="plain">${schD(day)}</span>`:`<span class="plain wrap">${/WBS|업무|위치/.test(k)?schWbsLinks(m,v):esc(String(v))}</span>`,true)); }
  rows.push(R('메모',e('enote',r.note?`<span class="plain wrap">${esc(r.note)}</span>`:ph('입력')),true));
  return wrap('research','근거 및 확약 · '+esc(name),r.title||'(제목 없음)',rows,r.user?`<div style="padding-top:8px"><button class="sh-btn sp-del" data-schx="u:del">이 항목 삭제</button></div>`:''); }
