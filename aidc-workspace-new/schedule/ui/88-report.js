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

/* ---------- reading ---------- */
// a value as it is shown: the three marks of the list
const schRepTxt=s=>esc(s||'').replace(/(확인 필요|보완 필요)/g,'<em class="rq">$1</em>').replace(/자료 없음/g,'<em class="na">자료 없음</em>');
// What the list says of a project (nothing is written). A project from before the list answers with what its overview held.
// (twenty-sixth round: the overview no longer shows these cells as a block of their own — "요약쪽은 메인페이지 … 그 내용이 같이 연동되기만
// 하면 돼". A cell left empty follows the sheet: the rows 위치 · 사업주체 · 대지면적 · 연면적 of the table, the first 핵심 지표 that speaks of IT /
// 수전; a cell that is filled in — the short form the list has — wins.)
function schRepOf(k){ const p=PROJECTS[k]||{}, h=PHEAD[k]||{}, s=x=>typeof x==='string'?x.trim():'', sc=i=>scaleOf(h,i,p[SCALE_FB[i]]), it=sc(1), pw=sc(2);
  const rows=Array.isArray(h.rows)?h.rows.filter(Array.isArray):[], row=l=>s((rows.find(r=>norm(r[0])===norm(l))||[])[1]);
  const kp=(Array.isArray(h.kpi)?h.kpi.filter(Array.isArray):[]).find(r=>/IT|수전|전력/i.test(String(r[1]||'')));
  return { grp:REP_GRPS.includes(h.grp)?h.grp:'', focus:!!h.focus, sub:s(h.sub), first:s(h.first), asof:s(h.asof), stage:normStatus(p.status),
    site:s(h.lsite)||row('위치')||siteOf(p,h), dev:s(h.ldev)||row('사업주체')||s(h.dev), area:s(h.larea)||row('대지면적'), gfa:s(h.lgfa)||row('연면적')||sc(0),
    load:s(h.lload)||s(kp&&kp[0])||(it&&pw?`${it} (수전 ${pw})`:it||pw), memo:s(h.memo), owner:s(h.owner)||s(p.owner) }; }
// 2024.04.22 / 2025.12 / "2026.11.12 수신" -> a key that orders them (a month alone comes before its days, as in the list)
const schRepKey=s=>{ const m=String(s||'').match(/(\d{4})(?:\D{1,3}(\d{1,2}))?(?:\D{1,3}(\d{1,2}))?/); return m?[m[1],m[2],m[3]].filter(Boolean).map(x=>x.padStart(2,'0')).join('.'):'9999'; };
function schRepSort(ids){ const o=id=>{const i=PROJ_ORDER.indexOf(id);return i<0?1e6:i;}, g=id=>{const i=REP_GRPS.indexOf((PHEAD[id]||{}).grp);return i<0?REP_GRPS.length:i;}, f=id=>schRepKey((PHEAD[id]||{}).first);
  return ids.slice().sort((a,b)=>g(a)-g(b)||f(a).localeCompare(f(b))||o(a)-o(b)); }
// the numbers of all projects (01, 02, …), whatever the list is narrowed to
function schRepNos(){ const out={}; orderedProjects().forEach((k,i)=>out[k]=String(i+1).padStart(2,'0')); return out; }
// 시·도 of a place ("충남 아산시" -> 충남)
const schRepRegion=k=>(schRepOf(k).site.replace(/^[^가-힣A-Za-z]+/,'').split(/[\s,(]/)[0]||'');
// in the title 프로젝트: how many are listed — the number alone, in the title's size, light grey (owner, 2026-11-24: "프로젝트 17 +";
// the day the list is of is no longer written there, the Excel file still names it)
function schRepCount(){ return `<span class="rep-n" title="목록에 있는 프로젝트 수">${schProjFilter(orderedProjects()).length}</span>`; }

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
  // The cells of the main page's list are not a block of the overview (twenty-sixth round): read, they follow the sheet (schRepOf); while
  // the overview is edited they can be given a short form of their own, the placeholder showing what the list uses otherwise.
  const R=schRepOf(pid), lf=(label,k,rk,ph)=>`<label><b>${label}</b>${cell('span',k,R[rk]&&!d[k]?R[rk]:(ph||'입력'),d[k],'v')}</label>`;
  const lk=(t,k)=>`<span class="lk">${schPartnerMark(t)}<a class="${EC}" ${E?edk(k,'업체명'):`data-partnername="${esc(t)}" title="협력업체 정보 보기"`}>${esc(t)}</a></span>`;
  const blk=(t,body,cls)=>`<div class="rb ${cls||''}"><div class="rt">${t}</div>${body}</div>`;
  const meta=`<div class="rmeta">${no?`<span class="m no">No. ${no}</span>`:''}<span class="m grp ${E?'pk':''}" ${E?'data-reppick="grp"':''}>${esc(REP_GRPS.includes(d.grp)?d.grp:'구분 없음')}${chev}</span>${E?`<button type="button" class="m fo ${d.focus?'on':''}" data-repfocus title="현재 집중 추진 중인 프로젝트로 표시합니다">집중 추진</button>`:d.focus?'<span class="m fo on">집중 추진</span>':''}
     <span class="m st ${E?'stpick':''}" ${E?'data-pickstatus':''}><b>추진 단계</b>${statusBadge(p.status)}${chev}</span><i class="sep"></i>
     <span class="m who ${E?'pk':''}" ${E?'data-pickowner':''}><b>담당자</b>${av()}<span>${esc(d.owner)||'<span class="nil">미지정</span>'}</span>${chev}</span>
     <span class="m dt"><b>최초자료일</b>${cell('span','first','2026.01.01',d.first||(E?'':'-'))}</span><span class="m dt"><b>기준일</b>${cell('span','asof','2026.01.01',d.asof||(E?'':'-'))}</span></div>`;
  const list=E?blk('메인 페이지 목록에 표시되는 값',`<div class="rlf">${lf('위치','lsite','site','시·도 시·군·구')}${lf('사업주체','ldev','dev')}${lf('대지면적(m²)','larea','area')}${lf('연면적(m²)','lgfa','gfa')}${lf('IT LOAD (수전용량)','lload','load')}${lf('비고','memo','memo','목록의 비고 칸')}</div><small class="rhint">프로젝트 카드와 표에 나오는 값입니다. 비워 두면 아래 표 · 지표의 값(흐리게 보이는 값)을 그대로 씁니다.</small>`,'rcells'):'';
  // the two rows of figures
  const stats=`<div class="rstats">${blk('핵심 지표',kp('kpi',''))}${blk('사업성 지표',`<div style="--pc:${esc(p.color||'#1c1c1c')}">${kp('fin','fin')}</div>${d.finNote||E?`<div class="rnote${EC}" ${edk('finNote','지표의 기준 · 출처 (예: 2026.04 IM 기준 추정치)')}>${E?esc(d.finNote):schRepTxt(d.finNote)}</div>`:''}`)}</div>`;
  // the map stands where the place is written: inside the row 위치 of the table (not for a place that is not known)
  const mapOf=r=>norm(r[0])===norm('위치')&&mapQuery(d.loc)&&!/자료 없음|확인 필요|보완 필요/.test(d.loc)?`<div class="rmapbox">${mapBox(d.loc,'')}</div>`:'';
  const ops=SC?schOpsRow(pid).replace('<div class="fr">','<div class="r ops">'):'';
  const c1=blk('사업 개요',text('main','사업의 내용을 적습니다',false))+blk('입지 및 전력 인프라',text('infra','한 줄에 한 항목씩 적습니다',true))+blk('사업 구조 및 수익 모델',text('struct','사업 구조와 수익 모델을 적습니다',false))+blk('추진 현황 및 주요 특성',text('stat','여러 줄로 적으면 항목으로 나뉩니다'))
    +blk('주요 리스크 및 검토사항',text('risk','한 줄에 한 항목씩 적습니다',true))
    +blk('협력업체',`<div class="partners">${d.partners.map((t,i)=>lk(t,'partner:'+i)).join('')}${!d.partners.length&&!E?nil:''}${E?`<button class="sh-btn lib" data-addpartnerrow style="margin:4px 0 0;height:22px;font-size:12px">+ 협력업체</button><small class="at-hint">@를 치면 협력업체 목록에서 고를 수 있습니다</small>`:''}</div>`,'pt')
    +schRepDocs(pid,d,E);
  const c2=blk('사업 개요 표',`<div class="rtb">${ops}${d.rows.map((r,i)=>`<div class="r">${cell('b',`rows:${i}:0`,'구분',r[0])}${cell('span',`rows:${i}:1`,'내용',r[1])}${del('rows',i)}${mapOf(r)}</div>`).join('')}${!d.rows.length&&!E&&!ops?nil:''}${add('rows','+ 행')}</div>`)
    +blk('추진 일정',`<div class="rtb plan">${d.plan.length?'<div class="r th"><b>시기</b><span>내용</span><i>상태</i></div>':''}${d.plan.map((r,i)=>`<div class="r">${cell('b',`plan:${i}:0`,'시기',r[0])}${cell('span',`plan:${i}:1`,'내용',r[1])}<i class="${E?'pk':''}" ${E?`data-k="plan:${i}:2" data-repstate title="상태 선택"`:''}>${schRepState(r[2])}${chev}</i>${del('plan',i)}</div>`).join('')}${!d.plan.length&&!E?nil:''}${add('plan','+ 일정')}</div>`);
  const src=lines(d.src);
  return `<div class="phead rep ${S.collapsed?'collapsed':''} ${E?'ed':''}"><div class="ttl"><h1 class="${EC}" style="color:${p.color}" ${edk('__full','사업명')}>${esc(p.full)}</h1><button class="sh-btn edit ${E?'on':''}" data-editproj>${E?'저장':'수정'}</button>${SC&&!E?`<button class="sh-btn upx" data-schup title="가이드 엑셀(.xlsx)을 올려 일정 · 리스트 · 관계도 · 외부설비 · 승인게이트 · 근거 및 확약을 채웁니다">${svg('i-sch-xls',13,13)}엑셀 업로드</button>`:''}${E?`<button class="cancel" data-canceledit>취소</button>`:''}</div>${!E?`<button class="trash pdel" data-projdel title="프로젝트 삭제" aria-label="프로젝트 삭제"><svg class="pict" aria-hidden="true"><use href="#pic-trash"/></svg></button>`:''}
    ${d.sub||E?`<div class="rsub${EC}" ${edk('sub','부제 (한 줄 설명)')}>${esc(d.sub)}</div>`:''}
    <div class="ov" data-collapse>사업개요 ${svg('i-chev-d',7.1,3.5,'color:#8e8e8e')}</div><div class="hr"></div>
    <div class="rep-in">${meta}${list}${stats}<div class="rcols"><div class="rc rc1">${c1}</div><div class="rc rc2">${c2}</div></div>
     ${src.length||E?`<div class="rsrc"><b>출처</b>${E?`<div class="rtx editable" ${edk('src','한 줄에 한 자료씩 적습니다')}>${esc(d.src)}</div>`:`<span>${src.map(schRepTxt).join('<i>/</i>')}</span>`}</div>`:''}</div>
    <div class="hr bt"></div></div>`; }
// What other screens still read from the overview follows the table: the address (map, search), 용도지역, 사업주체, 총사업비.
function schRepMirror(h,p){ const arr=a=>Array.isArray(a)?a.filter(Array.isArray):[], row=l=>{ const r=arr(h.rows).find(r=>norm(r[0])===norm(l)); return r?r[1]:null; }, set=(k,v)=>{ if(v!=null)h[k]=v; };
  set('loc',row('위치')); set('zone',row('용도지역')); set('dev',row('사업주체')); const c=arr(h.fin).find(r=>/총\s*(사업비|투자비|CAPEX)/i.test(r[1])); if(c&&c[0])h.cost=c[0]; }

/* ---------- PDFs put to a project ---------- */
// (twenty-sixth round, owner 2026-11-24: "프로젝트 만들때 pdf 첨부하는 칸") The window that makes a project takes one, the overview takes more
// while it is edited. They are ordinary stored files (POST /api/file, 1.8 MB each, item "proj-doc-<project>"); the record keeps
// {id, name, size} in `docs`. Opening is the browser's own PDF view in a new tab.
const SCH_DOC_MAX=1887436;
const schRepDocList=h=>(Array.isArray(h&&h.docs)?h.docs:[]).filter(x=>x&&typeof x.id==='string'&&/^[0-9a-f-]{36}$/.test(x.id));
const schRepDocBad=f=>!f?'파일을 고르지 못했습니다.':!(/\.pdf$/i.test(f.name||'')||f.type==='application/pdf')?'PDF 파일만 첨부할 수 있습니다.':f.size>SCH_DOC_MAX?`PDF는 한 파일 1.8MB까지 첨부할 수 있습니다. (${fmtSize(f.size)})`:'';
async function schRepDocUpload(f,pid){ const d=await sharedUploadFile(f,'proj-doc-'+pid); return {id:d.id,name:d.name||f.name,size:d.size||f.size}; }
function schRepDocs(pid,d,E){ const docs=schRepDocList(d); if(!docs.length&&!E)return '';
  return `<div class="rb rdocs"><div class="rt">첨부 자료 (PDF)</div><div class="rdl">${docs.map((x,i)=>`<div class="rd"><a class="nm" href="/api/file/${esc(x.id)}?inline=1" target="_blank" rel="noopener" title="새 탭에서 열기"><i><svg class="pict" aria-hidden="true"><use href="#pic-research"/></svg></i><span>${esc(x.name||'PDF')}</span></a><em>${x.size?fmtSize(x.size):''}</em><a class="dl" href="/api/file/${esc(x.id)}" download="${esc(x.name||'')}">내려받기</a>${E?`<button class="rx" data-docdel="${i}" title="이 파일 빼기" aria-label="이 파일 빼기">✕</button>`:''}</div>`).join('')}${E?`<button class="sh-btn lib radd" data-docadd>+ PDF 첨부</button><small class="rhint">PDF, 한 파일 1.8MB까지</small>`:''}</div></div>`; }
function schRepDocPick(){ const inp=document.createElement('input'); inp.type='file'; inp.accept='application/pdf,.pdf'; inp.style.display='none'; inp.dataset.repdoc='1'; document.body.appendChild(inp);
  inp.addEventListener('change',async()=>{ const f=inp.files&&inp.files[0]; inp.remove(); if(!f)return; const bad=schRepDocBad(f); if(bad){toast(bad,4600);return;} if(!S.editProj)return; const pid=S.proj;
    toast('PDF를 올리는 중입니다…',20000);
    try{ const doc=await schRepDocUpload(f,pid); if(S.proj!==pid||!S.editProj||!PHEAD[pid]){toast('올린 파일을 붙이지 못했습니다. 다시 시도해 주세요.',4200);return;} saveProjectHead(); PHEAD[pid].docs=schRepDocList(PHEAD[pid]).concat(doc); render(true); toast('PDF를 붙였습니다. 저장하면 반영됩니다.',3200); }
    catch(e){ toast(String(e&&e.message||'PDF를 올리지 못했습니다.'),4600); } }); inp.click(); }

// a cell of the main page's list: 자료 없음 is a dash there (owner, 2026-11-24: "카드형 표형 둘다 자료없음은 -로"); the marks as elsewhere
const schRepListTxt=v=>{ const s=String(v||'').replace(/자료 없음/g,'-').trim(); return !s||s==='-'?'<span class="nil">-</span>':schRepTxt(s); };

/* ---------- the cards of the main page ---------- */
// (twenty-fifth round, owner 2026-11-24) A card has a star: it is the page's own favourite (the star at the top right of a project
// page, the list in the sidebar; kept in this browser like those), and starred cards stand first, whatever the order of the rest.
const schRepPinned=k=>S.favs.includes('project:'+k);
function schRepCards(ids){ ids=[...ids.filter(schRepPinned),...ids.filter(k=>!schRepPinned(k))]; const line=(l,v)=>`<div><b>${l}</b><span class="e" title="${esc(v||'')}">${schRepListTxt(v)}</span></div>`;
  const star=on=>`<svg width="20" height="19" viewBox="0 0 21 20" aria-hidden="true"><path d="M10.4 1.4l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L1.7 7.7l6-.9z" fill="${on?'#ffce00':'none'}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return ids.map(k=>{ const p=PROJECTS[k], r=schRepOf(k), m=schHas(k)?schModel(k):null, ops=m&&m.res.operationDate;
    return `<div class="pcard rep ${r.focus?'focus':''} ${schRepPinned(k)?'pinned':''}" data-go="project:${k}"><div class="img" style="height:${schCardImgH(p)}px">${p.img?`<img class="photo" src="${esc(p.img)}" alt="" data-pk="${esc(k)}">`:''}<button class="img-btn" data-pimg="${k}" title="이미지 교체">${svg('i-img',14,14)}</button><button type="button" class="pstar ${schRepPinned(k)?'on':''}" data-pstar="${k}" aria-pressed="${schRepPinned(k)}" title="${schRepPinned(k)?'즐겨찾기 해제 (맨 앞 고정 풀기)':'즐겨찾기 · 카드를 맨 앞에 고정'}">${star(schRepPinned(k))}</button><div class="grad" style="height:90px;background:linear-gradient(to bottom,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 28%,${p.grad} 100%)"></div><span class="st" style="color:${PSTATUS[r.stage]||'#8e8e8e'}"><i></i>${esc(r.stage||'미정')}</span>${r.focus?'<span class="fo">집중 추진</span>':''}</div>
  <h3 style="color:${p.color}" title="${esc([p.full,r.sub].filter(Boolean).join(' — '))}">${esc(p.full)}</h3>
  <div class="info">${ops?`<div class="ops"><b>운영개시 예상</b>${schCardOps(k)}</div>`:''}${line('위치',r.site)}${line('사업주체',r.dev)}${line('대지면적',r.area)}${line('연면적',r.gfa)}${line('IT LOAD',r.load)}${line('최초자료일',r.first)}</div></div>`; }).join(''); }

/* ---------- the table of the main page (the list itself) ---------- */
function schRepTable(){ const ids=schProjFilter(orderedProjects()), c=schPf(), nos=schRepNos(), grouped=!c.sort;
  const th=t=>`<span><em>${t}</em></span>`, tm=(k,t,on,srt)=>`<span data-vcol="proj:${k}" class="${srt?'sorted':''} ${on?'flt':''}" title="눌러서 정렬 · 조건 선택"><em>${t}</em>${svg('i-chev-d',8,4)}</span>`;
  const cell=(v,cls)=>`<div class="tx ${cls||''}" title="${esc(v||'')}"><span class="e">${schRepListTxt(v)}</span></div>`;
  const row=k=>{ const p=PROJECTS[k], r=schRepOf(k);
    return `<div class="rw ${r.focus?'focus':''}" data-go="project:${esc(k)}"><div class="w no"><span>${nos[k]||''}</span></div><div class="nm" style="color:${esc(p.color||'')}" title="${esc(p.full||'')}${r.sub?' — '+esc(r.sub):''}">${r.focus?'<i class="fo" title="현재 집중 추진 중인 프로젝트">집중</i>':''}<span class="e">${esc(p.full||pname(p))}</span></div>${cell(r.site)}${cell(r.dev)}${cell(r.area,'num')}${cell(r.gfa,'num')}${cell(r.load)}<div class="st"><span style="color:${esc(PSTATUS[r.stage]||'#8e8e8e')}"><i></i>${esc(r.stage||'미정')}</span></div>${cell(r.first,'dt')}${cell(r.memo)}</div>`; };
  let h=`<div class="tbl sch-proc sch-vtbl vt-proj vt-rep"><div class="hd">${th('NO.')}${tm('name','프로젝트',!!c.grp||!!c.focus,!!c.sort&&c.sort!=='first')}${tm('region','위치',!!c.region,false)}${th('사업주체')}${th('대지면적(m²)')}${th('연면적(m²)')}${th('IT LOAD (수전용량)')}${tm('st','추진 단계',!!c.st,false)}${tm('first','최초자료일',false,c.sort==='first')}${th('비고')}</div>`;
  if(grouped){ for(const g of REP_GRPS.concat('')){ const part=ids.filter(k=>schRepOf(k).grp===g); if(!part.length)continue; h+=`<div class="grp" data-grp="${esc(g)}"><b>${esc(REP_GRP_T[g])}</b><span>${part.length}건</span></div>`+part.map(row).join(''); } }
  else h+=ids.map(row).join('');
  if(!ids.length)h+=`<div class="none">조건에 맞는 프로젝트가 없습니다.</div>`;
  return h+`<div class="ft"></div></div><div class="rep-foot">* 최초자료일: 프로젝트별로 처음 받은 자료의 작성일(작성일이 없으면 수신일). 각 묶음 안에서 최초자료일이 오래된 순으로 정렬. 이름 앞의 "집중"은 현재 집중 추진 중인 프로젝트.</div>`; }

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
  if(el=T.closest('[data-docadd]')){ if(!S.editProj)return; schRepDocPick(); return; }
  if(el=T.closest('[data-docdel]')){ if(!S.editProj)return; saveProjectHead(); const a=schRepDocList(h()); a.splice(+el.dataset.docdel,1); h().docs=a; render(true); return; }
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
    if(!id){ id=x.id&&!PROJECTS[x.id]?x.id:'p'+(Date.now()+(n++)); const T=nextProjTone();
      PROJECTS[id]={id,tag:x.name,full:x.name,cls:T.cls,color:T.color,status:'',stColor:'#9a9a9a',grad:T.grad,imgH:207.8,owner:x.owner||'',site:'',cost:'',area:'',power:'',it:'',server:''};
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

/* ---------- the star of a card ---------- */
// (before the page's own click handler, which would open the project the card stands for)
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const el=e.target.closest&&e.target.closest('[data-pstar]'); if(!el)return; e.stopPropagation(); e.preventDefault();
  const on=toggleFav('project:'+el.dataset.pstar); S.car.proj=0; const inner=$('#proj-inner'); if(inner&&inner.offsetParent){ inner.innerHTML=projectCards(); applyCarousel('proj'); if(typeof schMobApply==='function'){ const t=inner.closest('.track'); if(t)t.scrollLeft=0; } }
  toast(on?'즐겨찾기에 추가했습니다 · 카드가 맨 앞에 고정됩니다.':'즐겨찾기를 해제했습니다.',2600); },true);

/* ---------- the main calendar's project tags: one line, the rest folded ---------- */
// (twenty-seventh round, owner 2026-11-24: "프로젝트 태그들 1줄만 나오고 접히게") The button stands at the end of the line and says how many tags
// are folded away; it is not shown when all of them fit. Called after every draw (schAfterNav).
function schCalPillsFit(){ const box=$('.page.on .cal > .filters'), btn=box&&box.querySelector('[data-calpills]'); if(!btn)return; const pills=[...box.querySelectorAll('.pill')]; if(!pills.length){btn.hidden=true;return;}
  const top0=pills[0].offsetTop, more=pills.filter(p=>p.offsetTop>top0+2).length, open=box.classList.contains('open');
  btn.hidden=!more; btn.innerHTML=open?`접기${svg('i-chev-d',8,4,'transform:rotate(180deg)')}`:`+${more}${svg('i-chev-d',8,4)}`; btn.title=open?'프로젝트 태그를 한 줄로 접기':`프로젝트 태그 ${more}개 더 보기`; btn.setAttribute('aria-expanded',String(open)); }
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const el=e.target.closest&&e.target.closest('[data-calpills]'); if(!el)return; e.stopPropagation(); S.calPillsOpen=!S.calPillsOpen; refreshSec('cal'); });
