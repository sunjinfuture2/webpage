// Twenty-fourth round (owner, 2026-11-24): the project overview and the list of projects follow the company's
// "AIDC 프로젝트 개발검토 리스트" — a list (NO. · 프로젝트 · 위치 · 사업주체 · 대지면적 · 연면적 · IT LOAD · 추진 단계 · 최초자료일 · 비고,
// in two groups, the ones being pushed marked red) and one sheet per project (핵심 지표, 사업성 지표, four texts, the table 사업 개요,
// 추진 일정, 주요 리스크 및 검토사항, 출처).
//  - Everything of the sheet is in the project's overview record (PHEAD[id], see headOf): sub, grp, focus, first, asof, the cells
//    of the list (lsite, ldev, larea, lgfa, lload, memo), kpi / fin (+ finNote), main (사업 개요) · infra · struct (사업 구조 및 수익
//    모델) · stat, rows, plan, risk, src. 추진 단계 is the project's `status` (PSTATUS in original.html).
//  - The number of a project is not stored: the group first, then 최초자료일 (oldest first), then the saved order (schRepSort).
//  - "확인 필요" / "보완 필요" are written orange and "자료 없음" grey wherever a value is shown (schRepTxt); while the overview is
//    edited the text is plain.
//  - A data file (.json, kind "aidc-dev-report") makes or updates projects in one go and can be written out again
//    (schRepImport / schRepExport): the way the list gets into a workspace without its figures standing in the page's code.

const REP_GRPS=['AIDC','Small AIDC'];
const REP_GRP_T={'AIDC':'AIDC 프로젝트','Small AIDC':'Small AIDC','':'구분 없음'};
const REP_PLAN_ST={'완료':'done','진행':'prog','예정':'plan','목표':'cond'};
const REP_KIND='aidc-dev-report';
const REP_TONES=[['#5b6b8a','#d7dde7'],['#7a6a5a','#e4ddd6'],['#5e7a5a','#d9e4d7'],['#8a5a6b','#e8d9df'],['#4f7a7a','#d4e3e3'],['#8a7a4a','#e6e1d1']];

/* ---------- reading ---------- */
// a value as it is shown: the three marks of the list
const schRepTxt=s=>esc(s||'').replace(/(확인 필요|보완 필요)/g,'<em class="rq">$1</em>').replace(/자료 없음/g,'<em class="na">자료 없음</em>');
// What the list says of a project (nothing is written). A project from before the list answers with what its overview held.
function schRepOf(k){ const p=PROJECTS[k]||{}, h=PHEAD[k]||{}, s=x=>typeof x==='string'?x.trim():'', sc=i=>scaleOf(h,i,p[SCALE_FB[i]]), it=sc(1), pw=sc(2);
  return { grp:REP_GRPS.includes(h.grp)?h.grp:'', focus:!!h.focus, sub:s(h.sub), first:s(h.first), asof:s(h.asof), stage:normStatus(p.status),
    site:s(h.lsite)||siteOf(p,h), dev:s(h.ldev)||s(h.dev), area:s(h.larea), gfa:s(h.lgfa)||sc(0), load:s(h.lload)||(it&&pw?`${it} (수전 ${pw})`:it||pw), memo:s(h.memo), owner:s(h.owner)||s(p.owner) }; }
// 2024.04.22 / 2025.12 / "2026.11.12 수신" -> a key that orders them (a month alone comes before its days, as in the list)
const schRepKey=s=>{ const m=String(s||'').match(/(\d{4})(?:\D{1,3}(\d{1,2}))?(?:\D{1,3}(\d{1,2}))?/); return m?[m[1],m[2],m[3]].filter(Boolean).map(x=>x.padStart(2,'0')).join('.'):'9999'; };
function schRepSort(ids){ const o=id=>{const i=PROJ_ORDER.indexOf(id);return i<0?1e6:i;}, g=id=>{const i=REP_GRPS.indexOf((PHEAD[id]||{}).grp);return i<0?REP_GRPS.length:i;}, f=id=>schRepKey((PHEAD[id]||{}).first);
  return ids.slice().sort((a,b)=>g(a)-g(b)||f(a).localeCompare(f(b))||o(a)-o(b)); }
// the numbers of all projects (01, 02, …), whatever the list is narrowed to
function schRepNos(){ const out={}; orderedProjects().forEach((k,i)=>out[k]=String(i+1).padStart(2,'0')); return out; }
// 시·도 of a place ("충남 아산시" -> 충남)
const schRepRegion=k=>(schRepOf(k).site.replace(/^[^가-힣A-Za-z]+/,'').split(/[\s,(]/)[0]||'');
// beside the title 프로젝트: the day the list is of (set by a data file) and how many there are
function schRepCount(){ const n=Object.keys(PROJECTS).length, d=typeof META_FLAGS.repAsof==='string'?META_FLAGS.repAsof:''; return `<span class="rep-cnt">${d?`기준일 ${esc(d)} · `:''}총 ${n}건</span>`; }

/* ---------- the overview of a project ---------- */
const schRepState=s=>REP_PLAN_ST[s]?schMark(REP_PLAN_ST[s],s):`<span class="nil">${esc(s||'-')}</span>`;
function schRepHead(pid){ const p=PROJECTS[pid], d=headOf(pid), E=!!S.editProj, SC=schHas(pid), EC=E?' editable':'', no=schRepNos()[pid]||'';
  const edk=(k,ph='입력')=>E?`contenteditable="true" data-k="${k}" data-ph="${esc(ph)}"`:'', chev=E?svg('i-chev-d',7.2,3.6,'color:#8e8e8e'):'';
  const lines=s=>String(s||'').split('\n').map(x=>x.replace(/^\s*[•·\-–]\s+/,'').trim()).filter(Boolean), nil='<span class="nil">내용 없음</span>';
  // a text: as it was typed, or a list (always for `list`, for 추진 현황 when it has more than one line)
  const text=(k,ph,list)=>{ if(E)return `<div class="rtx editable" ${edk(k,ph)}>${esc(d[k])}</div>`; const L=lines(d[k]); if(!L.length)return `<div class="rtx">${nil}</div>`;
    return list===true||(list==null&&L.length>1)?`<ul class="rul">${L.map(x=>`<li>${schRepTxt(x)}</li>`).join('')}</ul>`:`<div class="rtx">${schRepTxt(d[k].trim())}</div>`; };
  const del=(a,i)=>E?`<button class="rx" data-repdel="${a}:${i}" title="이 줄 삭제" aria-label="이 줄 삭제">✕</button>`:'', add=(a,t)=>E?`<button class="sh-btn lib radd" data-repadd="${a}">${t}</button>`:'';
  const cell=(tag,k,ph,v,cls)=>`<${tag} class="${cls||''}${EC}" ${edk(k,ph)}>${E?esc(v):schRepTxt(v)}</${tag}>`;
  const kp=(a,cls)=>`<div class="rkp ${cls}">${d[a].map((r,i)=>`<div class="k">${cell('b',`${a}:${i}:0`,'값',r[0])}${cell('span',`${a}:${i}:1`,'무엇의 값인지',r[1])}${del(a,i)}</div>`).join('')}${!d[a].length&&!E?nil:''}${add(a,'+ 지표')}</div>`;
  // 요약 shows what the list shows (schRepOf: a project from before the list answers with what its overview held); edited, the stored value
  const R=schRepOf(pid), fr=(label,k,rk,ph)=>`<div class="fr"><b>${label}</b>${E?cell('span',k,(!d[k]&&R[rk])||ph||'입력',d[k],'v'):`<span class="v">${R[rk]?schRepTxt(R[rk]):'<span class="nil">-</span>'}</span>`}</div>`;
  const lk=(t,k)=>`<span class="lk">${schPartnerMark(t)}<a class="${EC}" ${E?edk(k,'업체명'):`data-partnername="${esc(t)}" title="협력업체 정보 보기"`}>${esc(t)}</a></span>`;
  const blk=(t,body,cls)=>`<div class="rb ${cls||''}"><div class="rt">${t}</div>${body}</div>`;
  const meta=`<div class="rmeta">${no?`<span class="m no">No. ${no}</span>`:''}<span class="m grp ${E?'pk':''}" ${E?'data-reppick="grp"':''}>${esc(REP_GRPS.includes(d.grp)?d.grp:'구분 없음')}${chev}</span>${E?`<button type="button" class="m fo ${d.focus?'on':''}" data-repfocus title="현재 집중 추진 중인 프로젝트로 표시합니다">집중 추진</button>`:d.focus?'<span class="m fo on">집중 추진</span>':''}
     <span class="m st ${E?'stpick':''}" ${E?'data-pickstatus':''}><b>추진 단계</b>${statusBadge(p.status)}${chev}</span><i class="sep"></i>
     <span class="m who ${E?'pk':''}" ${E?'data-pickowner':''}><b>담당자</b>${av()}<span>${esc(d.owner)||'<span class="nil">미지정</span>'}</span>${chev}</span>
     <span class="m dt"><b>최초자료일</b>${cell('span','first','2026.01.01',d.first||(E?'':'-'))}</span><span class="m dt"><b>기준일</b>${cell('span','asof','2026.01.01',d.asof||(E?'':'-'))}</span></div>`;
  const c1=blk('요약',`${SC?schOpsRow(pid):''}${fr('위치','lsite','site','시·도 시·군·구')}${fr('사업주체','ldev','dev')}${fr('대지면적(m²)','larea','area')}${fr('연면적(m²)','lgfa','gfa')}${fr('IT LOAD','lload','load','IT 용량 (수전용량)')}${fr('비고','memo','memo')}${E?'<small class="rhint">메인 페이지의 프로젝트 목록에 그대로 표시되는 값입니다.</small>':''}`,'sum')
    +blk('핵심 지표',kp('kpi',''))+blk('사업성 지표',`<div style="--pc:${esc(p.color||'#1c1c1c')}">${kp('fin','fin')}</div>${d.finNote||E?`<div class="rnote${EC}" ${edk('finNote','지표의 기준 · 출처 (예: 2026.04 IM 기준 추정치)')}>${E?esc(d.finNote):schRepTxt(d.finNote)}</div>`:''}`)
    +blk('위치 지도',mapBox(d.loc,''),'rmap');
  const c2=blk('사업 개요',text('main','사업의 내용을 적습니다',false))+blk('입지 및 전력 인프라',text('infra','한 줄에 한 항목씩 적습니다',true))+blk('사업 구조 및 수익 모델',text('struct','사업 구조와 수익 모델을 적습니다',false))+blk('추진 현황 및 주요 특성',text('stat','여러 줄로 적으면 항목으로 나뉩니다'))
    +blk('협력업체',`<div class="partners">${d.partners.map((t,i)=>lk(t,'partner:'+i)).join('')}${!d.partners.length&&!E?nil:''}${E?`<button class="sh-btn lib" data-addpartnerrow style="margin:4px 0 0;height:22px;font-size:12px">+ 협력업체</button><small class="at-hint">@를 치면 협력업체 목록에서 고를 수 있습니다</small>`:''}</div>`,'pt');
  const c3=blk('사업 개요 표',`<div class="rtb">${d.rows.map((r,i)=>`<div class="r">${cell('b',`rows:${i}:0`,'구분',r[0])}${cell('span',`rows:${i}:1`,'내용',r[1])}${del('rows',i)}</div>`).join('')}${!d.rows.length&&!E?nil:''}${add('rows','+ 행')}</div>`)
    +blk('추진 일정',`<div class="rtb plan">${d.plan.length?'<div class="r th"><b>시기</b><span>내용</span><i>상태</i></div>':''}${d.plan.map((r,i)=>`<div class="r">${cell('b',`plan:${i}:0`,'시기',r[0])}${cell('span',`plan:${i}:1`,'내용',r[1])}<i class="${E?'pk':''}" ${E?`data-k="plan:${i}:2" data-repstate title="상태 선택"`:''}>${schRepState(r[2])}${chev}</i>${del('plan',i)}</div>`).join('')}${!d.plan.length&&!E?nil:''}${add('plan','+ 일정')}</div>`)
    +blk('주요 리스크 및 검토사항',text('risk','한 줄에 한 항목씩 적습니다',true));
  const src=lines(d.src);
  return `<div class="phead rep ${S.collapsed?'collapsed':''} ${E?'ed':''}"><div class="ttl"><h1 class="${EC}" style="color:${p.color}" ${edk('__full','사업명')}>${esc(p.full)}</h1><button class="sh-btn edit ${E?'on':''}" data-editproj>${E?'저장':'수정'}</button>${SC&&!E?`<button class="sh-btn upx" data-schup title="가이드 엑셀(.xlsx)을 올려 일정 · 리스트 · 관계도 · 외부설비 · 승인게이트 · 근거 및 확약을 채웁니다">${svg('i-sch-xls',13,13)}엑셀 업로드</button>`:''}${E?`<button class="cancel" data-canceledit>취소</button>`:''}</div>${!E?`<button class="trash pdel" data-projdel title="프로젝트 삭제" aria-label="프로젝트 삭제"><svg class="pict" aria-hidden="true"><use href="#pic-trash"/></svg></button>`:''}
    ${d.sub||E?`<div class="rsub${EC}" ${edk('sub','부제 (한 줄 설명)')}>${esc(d.sub)}</div>`:''}
    <div class="ov" data-collapse>사업개요 ${svg('i-chev-d',7.1,3.5,'color:#8e8e8e')}</div><div class="hr"></div>
    <div class="rep-in">${meta}<div class="rcols"><div class="rc rc1">${c1}</div><div class="rc rc2">${c2}</div><div class="rc rc3">${c3}</div></div>
     ${src.length||E?`<div class="rsrc"><b>출처</b>${E?`<div class="rtx editable" ${edk('src','한 줄에 한 자료씩 적습니다')}>${esc(d.src)}</div>`:`<span>${src.map(schRepTxt).join('<i>/</i>')}</span>`}</div>`:''}</div>
    <div class="hr bt"></div></div>`; }
// What other screens still read from the overview follows the table: the address (map, search), 용도지역, 사업주체, 총사업비.
function schRepMirror(h,p){ const arr=a=>Array.isArray(a)?a.filter(Array.isArray):[], row=l=>{ const r=arr(h.rows).find(r=>norm(r[0])===norm(l)); return r?r[1]:null; }, set=(k,v)=>{ if(v!=null)h[k]=v; };
  set('loc',row('위치')); set('zone',row('용도지역')); set('dev',row('사업주체')); const c=arr(h.fin).find(r=>/총\s*(사업비|투자비|CAPEX)/i.test(r[1])); if(c&&c[0])h.cost=c[0]; }

/* ---------- the cards of the main page ---------- */
function schRepCards(ids){ const nos=schRepNos(), line=(l,v)=>`<div><b>${l}</b><span class="e" title="${esc(v||'')}">${v?schRepTxt(v):'<span class="nil">-</span>'}</span></div>`;
  return ids.map(k=>{ const p=PROJECTS[k], r=schRepOf(k), m=schHas(k)?schModel(k):null, ops=m&&m.res.operationDate;
    return `<div class="pcard rep ${r.focus?'focus':''}" data-go="project:${k}"><div class="img" style="height:${schCardImgH(p)}px">${p.img?`<img class="photo" src="${esc(p.img)}" alt="" data-pk="${esc(k)}">`:''}<button class="img-btn" data-pimg="${k}" title="이미지 교체">${svg('i-img',14,14)}</button><div class="grad" style="height:90px;background:linear-gradient(to bottom,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 28%,${p.grad} 100%)"></div><span class="st" style="color:${PSTATUS[r.stage]||'#8e8e8e'}"><i></i>${esc(r.stage||'미정')}</span>${r.focus?'<span class="fo">집중 추진</span>':''}</div>
  <h3 style="color:${p.color}"><em>${nos[k]||''}</em>${esc(p.full)}</h3><div class="sub" title="${esc(r.sub)}">${esc([r.grp,r.sub].filter(Boolean).join(' · '))||'&nbsp;'}</div>
  <div class="info">${ops?`<div class="ops"><b>운영개시 예상</b>${schCardOps(k)}</div>`:''}${line('위치',r.site)}${line('사업주체',r.dev)}${line('대지면적',r.area)}${line('연면적',r.gfa)}${line('IT LOAD',r.load)}${line('최초자료일',r.first)}</div></div>`; }).join(''); }

/* ---------- the table of the main page (the list itself) ---------- */
function schRepTable(){ const ids=schProjFilter(orderedProjects()), c=schPf(), nos=schRepNos(), grouped=!c.sort;
  const th=t=>`<span><em>${t}</em></span>`, tm=(k,t,on,srt)=>`<span data-vcol="proj:${k}" class="${srt?'sorted':''} ${on?'flt':''}" title="눌러서 정렬 · 조건 선택"><em>${t}</em>${svg('i-chev-d',8,4)}</span>`;
  const cell=(v,cls)=>`<div class="tx ${cls||''}" title="${esc(v||'')}"><span class="e">${v?schRepTxt(v):'<span class="nil">-</span>'}</span></div>`;
  const row=k=>{ const p=PROJECTS[k], r=schRepOf(k);
    return `<div class="rw ${r.focus?'focus':''}" data-go="project:${esc(k)}"><div class="w no"><span>${nos[k]||''}</span></div><div class="nm" style="color:${esc(p.color||'')}" title="${esc(p.full||'')}${r.sub?' — '+esc(r.sub):''}"><span class="e">${esc(p.full||pname(p))}</span></div>${cell(r.site)}${cell(r.dev)}${cell(r.area,'num')}${cell(r.gfa,'num')}${cell(r.load)}<div class="st"><span style="color:${esc(PSTATUS[r.stage]||'#8e8e8e')}"><i></i>${esc(r.stage||'미정')}</span></div>${cell(r.first,'dt')}${cell(r.memo)}</div>`; };
  let h=`<div class="tbl sch-proc sch-vtbl vt-proj vt-rep"><div class="hd">${th('NO.')}${tm('name','프로젝트',!!c.grp||!!c.focus,!!c.sort&&c.sort!=='first')}${tm('region','위치',!!c.region,false)}${th('사업주체')}${th('대지면적(m²)')}${th('연면적(m²)')}${th('IT LOAD (수전용량)')}${tm('st','추진 단계',!!c.st,false)}${tm('first','최초자료일',false,c.sort==='first')}${th('비고')}</div>`;
  if(grouped){ for(const g of REP_GRPS.concat('')){ const part=ids.filter(k=>schRepOf(k).grp===g); if(!part.length)continue; h+=`<div class="grp" data-grp="${esc(g)}"><b>${esc(REP_GRP_T[g])}</b><span>${part.length}건</span></div>`+part.map(row).join(''); } }
  else h+=ids.map(row).join('');
  if(!ids.length)h+=`<div class="none">조건에 맞는 프로젝트가 없습니다.</div>`;
  return h+`<div class="ft"></div></div><div class="rep-foot">* 최초자료일: 프로젝트별로 처음 받은 자료의 작성일(작성일이 없으면 수신일). 각 묶음 안에서 최초자료일이 오래된 순으로 정렬. 빨간 번호 · 바탕은 현재 집중 추진 중인 프로젝트.</div>`; }

/* ---------- the overview while it is edited: rows of its lists, the state of a step, the group ---------- */
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const T=e.target; let el; const h=()=>PHEAD[S.proj];
  if(el=T.closest('[data-repadd]')){ if(!S.editProj)return; saveProjectHead(); const a=el.dataset.repadd; h()[a]=(h()[a]||[]).concat([a==='plan'?['','','예정']:['','']]); render(true);
    const last=$$(`.page.on .phead [data-k^="${a}:"]`).filter(x=>x.dataset.k.endsWith(':0')).pop(); last&&last.focus(); return; }
  // a row is taken away by emptying it: saving drops the rows left empty (so no place has to be counted)
  if(el=T.closest('[data-repdel]')){ if(!S.editProj)return; const was=el.closest('.r,.k'); if(was)was.querySelectorAll('[data-k]').forEach(x=>{x.textContent='';}); saveProjectHead(); render(true); return; }
  // the state of a step is the text of its cell (read when the overview is saved like the cells beside it)
  if(el=T.closest('[data-repstate]')){ if(!S.editProj)return; e.stopPropagation(); const cur=(el.textContent||'').trim();
    menuPop(el,Object.keys(REP_PLAN_ST).map(s=>({t:s,html:schRepState(s),k:s,sel:cur===s,fn:()=>{ if(el.isConnected)el.innerHTML=schRepState(s)+svg('i-chev-d',7.2,3.6,'color:#8e8e8e'); }})),{cls:'sch-colmenu'}); return; }
  if(el=T.closest('[data-reppick="grp"]')){ if(!S.editProj)return; e.stopPropagation(); menuPop(el,REP_GRPS.map(g=>({t:g,k:g,sel:h().grp===g,fn:()=>{ saveProjectHead(); h().grp=g; render(true); }})),{cls:'sch-colmenu'}); return; }
  if(el=T.closest('[data-repfocus]')){ if(!S.editProj)return; saveProjectHead(); h().focus=!h().focus; render(true); return; }
  if(el=T.closest('[data-repio]')){ e.stopPropagation(); menuPop(el,[{t:'자료 파일 가져오기 (.json)',k:'in',fn:schRepPick},{t:'자료 파일로 내보내기 (.json)',k:'out',fn:schRepExport}],{cls:'sch-colmenu'}); return; }
});

/* ---------- a data file of the list: read ---------- */
// One project of a data file -> what the workspace stores. Lists may be given as arrays of lines.
function schRepNorm(e){ const s=x=>x==null?'':String(x).trim(), L=x=>Array.isArray(x)?x.map(s).filter(Boolean).join('\n'):s(x), l=e.list&&typeof e.list==='object'?e.list:{};
  const P=(a,n)=>Array.isArray(a)?a.filter(Array.isArray).map(r=>Array.from({length:n},(_,i)=>s(r[i]))).filter(r=>r.some(Boolean)):[];
  return { id:/^[a-z0-9][a-z0-9-]{1,40}$/.test(s(e.id))?s(e.id):'', name:s(e.name).replace(/\s+/g,' '), alias:(Array.isArray(e.match)?e.match:[]).map(s).filter(Boolean), stage:normStatus(e.stage), owner:s(e.owner),
    head:{ grp:REP_GRPS.includes(s(e.grp))?s(e.grp):'', focus:!!e.focus, sub:s(e.sub), first:s(e.first), asof:s(e.asof), lsite:s(l.site), ldev:s(l.dev), larea:s(l.area), lgfa:s(l.gfa), lload:s(l.load), memo:s(l.memo),
      kpi:P(e.kpi,2), fin:P(e.fin,2), finNote:s(e.finNote), main:L(e.ov), infra:L(e.infra), struct:L(e.model), stat:L(e.stat), rows:P(e.rows,2), plan:P(e.plan,3), risk:L(e.risk), src:L(e.src) } }; }
// Which project of the workspace an entry is: its id, else its name (or one of the names it had before).
function schRepPlan(data){ const used=new Set(), bin=SETTINGS.projTrash||{}, list=(data.projects||[]).filter(x=>x&&typeof x==='object').map(schRepNorm).filter(x=>x.name);
  const rows=list.map(x=>{ const names=[x.name,...x.alias].map(norm); let k=x.id&&PROJECTS[x.id]&&!used.has(x.id)?x.id:Object.keys(PROJECTS).find(id=>!used.has(id)&&names.includes(norm(PROJECTS[id].full)))||'';
    const back=!k&&x.id&&bin[x.id]?x.id:''; if(k)used.add(k); return {x,k,back}; });
  return { rows, rest:Object.keys(PROJECTS).filter(k=>!used.has(k)) }; }
function schRepApply(data,others){ const plan=schRepPlan(data), ids=[]; let made=0, upd=0, n=0;
  for(const {x,k,back} of plan.rows){ let id=k;
    if(!id&&back){ restoreProject(back); id=back; }
    if(!id){ id=x.id&&!PROJECTS[x.id]?x.id:'p'+(Date.now()+(n++)); const ci=PROJ_ORDER.length%6, T=REP_TONES[ci];
      PROJECTS[id]={id,tag:x.name,full:x.name,cls:'pj-c'+ci,color:T[0],status:'',stColor:'#9a9a9a',grad:T[1],imgH:207.8,owner:x.owner||'',site:'',cost:'',area:'',power:'',it:'',server:''};
      PHEAD[id]={owner:x.owner||'',partners:[]}; if(!PROJ_ORDER.includes(id))PROJ_ORDER.push(id); S.filters[id]=true; made++; } else upd++;
    // the overview is the file's now: what the sheet does not have (진행도, 대체부지, 사업형태, 자금조달 …) is emptied, the old fields that
    // other screens read follow the new ones; 담당자 and 협력업체 stay unless the file names an owner
    const p=PROJECTS[id], h=headOf(id); p.full=x.name; Object.assign(h,copy(x.head),{prog:'',alt:'',kind:'',land:'',fund:'',fundType:'',cost:'',loc:'',zone:'',dev:''});
    if(x.owner){h.owner=x.owner;p.owner=x.owner;} if(x.stage)applyProjectStatus(id,x.stage); schRepMirror(h,p);
    h.scale=[['공사면적:',h.lgfa],['IT 용량:',h.lload],['총 수전용량 :',''],['서버:','']]; p.area=h.lgfa; p.it=h.lload; p.power=''; p.server=''; p.site=h.loc; p.cost=h.cost; ids.push(id); }
  // the saved order follows the file, so equal dates stand as the list has them
  const rest=PROJ_ORDER.filter(q=>!ids.includes(q)); PROJ_ORDER.splice(0,PROJ_ORDER.length,...ids,...rest);
  let gone=0; if(others)for(const k of plan.rest){ if(PROJECTS[k]){ trashProject(k); gone++; } }
  if(typeof data.asof==='string'&&data.asof.trim())META_FLAGS.repAsof=data.asof.trim().slice(0,20);
  return {made,upd,gone}; }
// the file chooser, then a window that says what will happen before anything is changed
function schRepPick(){ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.style.display='none'; inp.dataset.repfile='1'; document.body.appendChild(inp);
  inp.addEventListener('change',async()=>{ const f=inp.files&&inp.files[0]; inp.remove(); if(!f)return; let data=null; try{ data=JSON.parse(await f.text()); }catch(err){ data=null; }
    if(!data||data.kind!==REP_KIND||!Array.isArray(data.projects)||!data.projects.length){ toast('개발검토 리스트 자료 파일이 아닙니다. "자료 파일로 내보내기"로 만든 .json 파일을 올려 주세요.',5200); return; }
    schRepAsk(data,f.name); }); inp.click(); }
function schRepAsk(data,fname){ closePop(); const old=$('#dlg'); if(old)old.remove(); const plan=schRepPlan(data), make=plan.rows.filter(r=>!r.k&&!r.back), upd=plan.rows.filter(r=>r.k||r.back);
  const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-np sch-repin'; const names=a=>a.map(r=>`<li>${esc(r.x.name)}${r.k&&norm(PROJECTS[r.k].full)!==norm(r.x.name)?` <span>← ${esc(PROJECTS[r.k].full)}</span>`:r.back?' <span>← 휴지통에서 되살림</span>':''}</li>`).join('');
  d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="자료 파일 가져오기"><div class="np-hd"><b>자료 파일 가져오기</b><span>${esc(fname||'')}${data.asof?` · 기준일 ${esc(String(data.asof))}`:''} · ${plan.rows.length}건</span></div>
    <div class="rin">${make.length?`<div class="g"><b>새로 만들기 ${make.length}건</b><ul>${names(make)}</ul></div>`:''}${upd.length?`<div class="g"><b>덮어쓰기 ${upd.length}건</b><small>사업개요만 파일 내용으로 바뀝니다. 일정 · 액션 · 미팅 · 담당자 · 협력업체는 그대로 둡니다.</small><ul>${names(upd)}</ul></div>`:''}
      ${plan.rest.length?`<div class="g"><b>파일에 없는 프로젝트 ${plan.rest.length}건</b><ul>${plan.rest.map(k=>`<li>${esc(PROJECTS[k].full)}</li>`).join('')}</ul><label class="ck"><input type="checkbox" id="rin-others" ${data.others==='trash'?'checked':''}> 이 프로젝트들을 휴지통으로 보내기 <em>(30일 안에 되살릴 수 있습니다)</em></label></div>`:''}</div>
    <div class="np-bt"><button data-rin="x">취소</button><button class="pri" data-rin="ok">가져오기</button></div></div>`;
  document.body.appendChild(d); const close=()=>d.remove();
  d.addEventListener('click',e=>{ e.stopPropagation(); const a=e.target.closest('[data-rin]'); if(e.target===d||(a&&a.dataset.rin==='x')){close();return;} if(!a)return;
    if(S.editProj){ toast('사업개요를 수정하는 중에는 가져올 수 없습니다. 먼저 저장하거나 취소해 주세요.',4600); return; }
    const others=!!(d.querySelector('#rin-others')||{}).checked, here=S.page==='project'?S.proj:'', r=schRepApply(data,others); close();
    if(here&&!PROJECTS[here])go('main'); else render(true);
    toast(`자료를 가져왔습니다 · 새로 만들기 ${r.made}건 · 덮어쓰기 ${r.upd}건${r.gone?` · 휴지통 ${r.gone}건`:''}`,5200); });
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'){e.stopPropagation();close();} }); }
// everything the list holds, in the shape it is read in (a file the same workspace, or another one, can take back)
function schRepExport(){ const L=s=>String(s||'').split('\n').map(x=>x.trim()).filter(Boolean), ids=orderedProjects();
  const projects=ids.map(k=>{ const p=PROJECTS[k], h={...headOf(k)}; return { id:k, name:p.full, grp:h.grp, focus:!!h.focus, sub:h.sub, stage:normStatus(p.status), owner:h.owner||p.owner||'', first:h.first, asof:h.asof,
    list:{site:h.lsite,dev:h.ldev,area:h.larea,gfa:h.lgfa,load:h.lload,memo:h.memo}, kpi:h.kpi, fin:h.fin, finNote:h.finNote, ov:h.main, infra:L(h.infra), model:h.struct, stat:L(h.stat).length>1?L(h.stat):h.stat, rows:h.rows, plan:h.plan, risk:L(h.risk), src:L(h.src) }; });
  const out={kind:REP_KIND,v:1,asof:typeof META_FLAGS.repAsof==='string'?META_FLAGS.repAsof:'',exported:TODAY,projects};
  schExpSave(`AIDC 프로젝트 개발검토 리스트_${schToday()}.json`,new Blob([JSON.stringify(out,null,1)],{type:'application/json'})); toast(`자료 파일을 내려받았습니다 · 프로젝트 ${ids.length}건`,3600); }
