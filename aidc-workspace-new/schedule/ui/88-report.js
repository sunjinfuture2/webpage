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
const REP_PLAN_ST={'완료':'done','진행':'prog','예정':'plan','목표':'cond'};
const REP_KIND='aidc-dev-report';

/* ---------- reading ---------- */
// a value as it is shown: the three marks of the list
// (twenty-eighth round, owner: "주황색으로 보완필요, 확인필요 … 프로젝트 포인트컬러로") the two marks take the colour of the project they stand in:
// the overview, a row of the table and a card hand it down as --pc (schRepPc); without one they stay orange.
// (thirtieth round, owner: "넘버랑 프로젝트 사이에 넣고 컬러는 둘다 밝은 그레이로 통일") the group of a project as a small light grey badge:
// between the number and the name — after the number in a row of the table and in the overview's first line. On a card, which has
// no number, it stands after the name (thirty-first round), and 집중 추진 after it in the colours of the table's mark. No group, no badge.
const schRepGrpTag=g=>REP_GRPS.includes(g)?`<i class="gtag">${esc(g)}</i>`:'';
const schRepPc=p=>p&&/^#[0-9a-f]{3,8}$/i.test(p.color||'')?` style="--pc:${p.color}"`:'';
const schRepTxt=s=>esc(s||'').replace(/(확인 필요|보완 필요)/g,'<em class="rq">$1</em>').replace(/자료 없음/g,'<em class="na">자료 없음</em>');
// What the list says of a project (nothing is written). A project from before the list answers with what its overview held.
// (twenty-sixth round: the overview no longer shows these cells as a block of their own — "요약쪽은 메인페이지 … 그 내용이 같이 연동되기만
// 하면 돼". A cell left empty follows the sheet: the rows 위치 · 사업주체 · 대지면적 · 연면적 of the table, the first 핵심 지표 that speaks of IT /
// 수전; a cell that is filled in — the short form the list has — wins.)
// Keep the full address in the overview; only derive the administrative area for lists.
function schRepShortAddress(value){
 const full=String(value||'').trim(), clean=full.replace(/^대한민국\s+/,'').split(/[\n(（]/)[0].trim(), parts=clean.split(/\s+/);
 const province=/^(서울(?:특별시|시)?|부산(?:광역시|시)?|대구(?:광역시|시)?|인천(?:광역시|시)?|광주(?:광역시|시)?|대전(?:광역시|시)?|울산(?:광역시|시)?|세종(?:특별자치시)?|경기(?:도)?|강원(?:도|특별자치도)?|충북|충남|충청북도|충청남도|전북|전남|전라북도|전라남도|전북특별자치도|경북|경남|경상북도|경상남도|제주(?:도|특별자치도)?)$/;
 if(!province.test(parts[0]||''))return full;
 const out=[parts[0]];
 if(parts[1]&&/^[가-힣]+[시군구]$/.test(parts[1])){
  out.push(parts[1]);
  if(/시$/.test(parts[1])&&parts[2]&&/^[가-힣]+구$/.test(parts[2]))out.push(parts[2]);
 }
 return out.join(' ');
}
function schRepOf(k){ const p=PROJECTS[k]||{}, h=PHEAD[k]||{}, s=x=>typeof x==='string'?x.trim():'', sc=i=>scaleOf(h,i,p[SCALE_FB[i]]), it=sc(1), pw=sc(2);
  const rows=Array.isArray(h.rows)?h.rows.filter(Array.isArray):[], row=l=>{const found=rows.find(r=>norm(r[0])===norm(l));return found?s(found[1]):null;};
  const kp=(Array.isArray(h.kpi)?h.kpi.filter(Array.isArray):[]).find(r=>/IT|수전|전력/i.test(String(r[1]||'')));
  return { grp:REP_GRPS.includes(h.grp)?h.grp:'', focus:!!h.focus, sub:s(h.sub), first:s(h.first), asof:s(h.asof), stage:normStatus(p.status),
    site:schRepShortAddress(row('위치')??(s(h.loc)||s(h.lsite)||siteOf(p,h))), dev:row('사업주체')??(s(h.ldev)||s(h.dev)), area:row('대지면적')??s(h.larea), gfa:row('연면적')??(s(h.lgfa)||sc(0)),
    load:kp?s(kp[0]):(it&&pw?`${it} (수전 ${pw})`:it||pw||s(h.lload)), memo:s(h.memo), owner:s(h.owner)||s(p.owner) }; }
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
// the blocks of the sheet and the titles they have unless the project gave one its own (`ttl` in the record: {<block>: title})
const REP_TTL={kpi:'핵심 지표',fin:'사업성 지표',main:'사업 개요',plan:'추진 일정',infra:'입지 및 전력 인프라',struct:'사업 구조 및 수익 모델',stat:'추진 현황 및 주요 특성',risk:'주요 리스크 및 검토사항',partners:'협력업체'};
const schRepTtl=(h,k)=>{ const t=h&&h.ttl&&typeof h.ttl==='object'&&typeof h.ttl[k]==='string'?h.ttl[k].replace(/\s+/g,' ').trim():''; return t||REP_TTL[k]||''; };
const REP_PLUS='<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M7.5 1.5v12M1.5 7.5h12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const schRepState=s=>REP_PLAN_ST[s]?schMark(REP_PLAN_ST[s],s):`<span class="nil">${esc(s||'-')}</span>`;
// the export and delete pictograms of a project's title line (every project's head carries them while it is not edited)
const schRepExpBtn=()=>`<button type="button" class="pexp" data-projexp title="내보내기 — 이 프로젝트의 지금 진행 상황을 보고서로 (범위 · 요약형/풀버전 · PDF/Word/엑셀)" aria-label="내보내기">${svg('i-sch-exp2',24,24)}</button>`;
const schRepDelBtn=()=>`<button class="trash pdel" data-projdel title="프로젝트 삭제" aria-label="프로젝트 삭제"><svg class="pict" aria-hidden="true"><use href="#pic-trash"/></svg></button>`;
// (owner, 2026-11-26: "여기에는 왜 프로젝트 삭제 픽토그램이 안뜨는지 확인해보고 수정해") the AI trial projects draw a head of their
// own (schAIHead in 89-ai-project.js, another session's file — left as it is) that had neither pictogram; they are put into its
// title line here, as on every other project, and left out while its overview is edited
function schRepTitleTools(html){ if(/data-ai-direct="save"/.test(html))return html; const k='</h1></div>', i=html.indexOf(k); if(i<0)return html;
  return html.slice(0,i)+'</h1>'+schRepExpBtn()+'</div>'+schRepDelBtn()+html.slice(i+k.length); }
function schRepHead(pid){ if(schAIProject(pid))return schRepTitleTools(schAIHead(pid)); const p=PROJECTS[pid], d=headOf(pid), E=!!S.editProj, SC=schHas(pid), EC=E?' editable':'', no=schRepNos()[pid]||'';
  const edk=(k,ph='입력')=>E?`contenteditable="true" data-k="${k}" data-ph="${esc(ph)}"`:'', chev=E?svg('i-chev-d',7.2,3.6,'color:#8e8e8e'):'';
  const lines=s=>String(s||'').split('\n').map(x=>x.replace(/^\s*[•·\-–]\s+/,'').trim()).filter(Boolean), nil='<span class="nil">내용 없음</span>';
  // a text: as it was typed, or a list (always for `list`, for 추진 현황 when it has more than one line)
  const text=(k,ph,list)=>{ if(E)return `<div class="rtx editable" ${edk(k,ph)}>${esc(d[k])}</div>`; const L=lines(d[k]); if(!L.length)return `<div class="rtx">${nil}</div>`;
    return list===true||(list==null&&L.length>1)?`<ul class="rul">${L.map(x=>`<li>${schRepTxt(x)}</li>`).join('')}</ul>`:`<div class="rtx">${schRepTxt(d[k].trim())}</div>`; };
  const del=(a,i)=>E?`<button class="rx" data-repdel="${a}:${i}" title="이 줄 삭제" aria-label="이 줄 삭제">✕</button>`:'', add=(a,t)=>E?`<button class="sh-btn lib radd" data-repadd="${a}" title="${t} 추가" aria-label="${t} 추가">${REP_PLUS}</button>`:'';   // (thirty-sixth round, owner: "+만 남겨놓고 +사이즈를 좀 더 키워줘") what it adds is said by where it stands and by its title
  const cell=(tag,k,ph,v,cls)=>`<${tag} class="${cls||''}${EC}" ${edk(k,ph)}>${E?esc(v):schRepTxt(v)}</${tag}>`;
  const kp=(a,cls)=>`<div class="rkp ${cls}">${d[a].map((r,i)=>`<div class="k">${cell('b',`${a}:${i}:0`,'값',r[0])}${cell('span',`${a}:${i}:1`,'무엇의 값인지',r[1])}${del(a,i)}</div>`).join('')}${!d[a].length&&!E?nil:''}${add(a,'지표')}</div>`;
  // The cells of the main page's list are not a block of the overview (twenty-sixth round): read, they follow the sheet (schRepOf); while
  // the overview is edited they can be given a short form of their own, the placeholder showing what the list uses otherwise.
  const R=schRepOf(pid), lf=(label,k,rk,ph)=>`<label><b>${label}</b><span class="v">${esc(R[rk])||'<span class="nil">-</span>'}</span></label>`;
  const lk=(t,k)=>`<span class="lk">${schPartnerMark(t)}<a class="${EC}" ${E?edk(k,'업체명'):`data-partnername="${esc(t)}" title="협력업체 정보 보기"`}>${esc(t)}</a>${E&&k.startsWith('partner:')?`<button type="button" class="partner-unlink" data-partner-unlink="${k.slice(8)}" title="협력업체 연결 제거" aria-label="협력업체 연결 제거">×</button>`:''}</span>`;
  // a block: `t` is one of the sheet's blocks (a key of REP_TTL) or, for a block of the page's own, its title as it is. A block of
  // the sheet writes the title the project gave it (schRepTtl), which can be changed while the overview is edited (thirty-sixth
  // round, owner: "수정 눌렀을때 핵심 지표, 사업성 지표같은 소제목들 텍스트도 수정가능하게"); `fk` says that files can be put to it.
  const blk=(t,body,cls,fk)=>{ const key=REP_TTL[t]?t:'', ttl=key?schRepTtl(d,key):t;
    return `<div class="rb ${cls||''}"${fk&&E?` data-fzone="${fk}"`:''}><div class="rt">${key&&E?`<span class="editable" contenteditable="true" data-k="ttl:${key}" data-ph="${esc(REP_TTL[key])}" title="소제목 수정">${esc(ttl)}</span>`:esc(ttl)}</div>${body}${key?schRepFileRows(d,key,E,!!fk):''}</div>`; };
  // (thirty-fourth round, owner: "수정이랑 개요업로드를 최초자료일, 기준일 있는 곳으로 … 최초자료일이랑 기준일은 버튼 아래에 오게 하고 두 줄짜리로")
  // the first line: what the project is at the left (.rml); at the right (.rmr) the two buttons and, below them, the two dates, a line each.
  const meta=`<div class="rmeta"><div class="rml">${no?`<span class="m no">No. ${no}</span>`:''}<span class="m grp ${E?'pk':''}" ${E?'data-reppick="grp"':''}>${esc(REP_GRPS.includes(d.grp)?d.grp:'구분 없음')}${chev}</span>${E?`<button type="button" class="m fo ${d.focus?'on':''}" data-repfocus title="현재 집중 추진 중인 프로젝트로 표시합니다">집중 추진</button>`:d.focus?'<span class="m fo on">집중 추진</span>':''}
     <span class="m st ${E?'stpick':''}" ${E?'data-pickstatus':''}><b>추진 단계</b>${statusBadge(p.status)}${chev}</span><i class="sep"></i>
     <span class="m who ${E?'pk':''}" ${E?'data-pickowner':''}><b>담당자</b>${av()}<span>${esc(d.owner)}</span>${chev}</span></div>
     <div class="rmr"><div class="rbt"><button class="sh-btn edit ${E?'on save':''}" data-editproj>${E?'저장':'수정'}</button>${E?`<button class="cancel" data-canceledit>취소</button>`:`<button class="sh-btn upx" data-schup title="PDF 또는 엑셀 문서로 이 프로젝트의 사업개요를 채웁니다">${svg('i-sch-fup',13,13)}개요 업로드</button>`}</div>
       <div class="rdt"><b>최초자료일</b>${cell('span','first','2026.01.01',d.first||(E?'':'-'))}<b>기준일</b>${cell('span','asof','2026.01.01',d.asof||(E?'':'-'))}</div></div></div>`;
  const list=E?blk('메인 페이지 목록에 표시되는 값',`<div class="rlf">${lf('위치','lsite','site','시·도 시·군·구')}${lf('사업주체','ldev','dev')}${lf('대지면적(m²)','larea','area')}${lf('연면적(m²)','lgfa','gfa')}${lf('IT LOAD (수전용량)','lload','load')}</div><small class="rhint">아래 사업 개요 표와 핵심 지표에서 수정하면 자동 반영됩니다. 위치는 메인 목록에서 시·군·구까지만 표시합니다.</small>`,'rcells'):'';
  // the two rows of figures
  const stats=`<div class="rstats">${blk('kpi',kp('kpi',''))}${blk('fin',`<div style="--pc:${esc(p.color||'#1c1c1c')}">${kp('fin','fin')}</div>`)}</div>`;   // (thirty-sixth round) no files on the two rows of figures   // (twenty-ninth round) the note under the figures (finNote) and the line 출처 (src) are not shown or edited any more; both stay in the record
  // the map stands where the place is written: inside the row 위치 of the table (not for a place that is not known)
  const mapOf=r=>norm(r[0])===norm('위치')&&mapQuery(d.loc)&&!/자료 없음|확인 필요|보완 필요/.test(d.loc)?`<div class="rmapbox">${mapBox(d.loc,'')}</div>`:'';
  const ops=SC?schOpsRow(pid).replace('<div class="fr">','<div class="r ops">'):'';
  // (thirty-fourth round, owner: "사업개요를 사업개요 표 안 맨 위로 삽입하고 … 표라는 말은 떼 … 사업개요 + 표, 추진일정을 왼쪽으로 … 그 외 … 협력업체까지 오른쪽으로")
  // left: 사업 개요 (its text, then its table) and 추진 일정; right: the other texts, 협력업체, the PDFs.
  const mainTx=E||lines(d.main).length?`<div class="rmain">${text('main','사업의 내용을 적습니다',false)}</div>`:'';
  const cR=blk('infra',text('infra','한 줄에 한 항목씩 적습니다',true),'','infra')+blk('struct',text('struct','사업 구조와 수익 모델을 적습니다',false),'','struct')+blk('stat',text('stat','여러 줄로 적으면 항목으로 나뉩니다'),'','stat')
    +blk('risk',text('risk','한 줄에 한 항목씩 적습니다',true),'','risk')
    +blk('partners',`<div class="partners">${d.partners.map((t,i)=>lk(t,'partner:'+i)).join('')}${!d.partners.length&&!E?nil:''}${E?`<button class="sh-btn lib radd" data-addpartnerrow title="협력업체 추가" aria-label="협력업체 추가">${REP_PLUS}</button><small class="at-hint">업체명을 누르면 목록에서 선택할 수 있습니다</small>`:''}</div>`,'pt','partners')
    +schRepDocs(pid,d,E);
  const cL=blk('main',`${mainTx}<div class="rtb">${ops}${d.rows.map((r,i)=>`<div class="r">${cell('b',`rows:${i}:0`,'구분',r[0])}${cell('span',`rows:${i}:1`,'내용',r[1])}${del('rows',i)}${mapOf(r)}</div>`).join('')}${d.memo||E?`<div class="r memo"><b>비고</b>${cell('span','memo','비고 (짧은 메모)',d.memo)}</div>`:''}${!d.rows.length&&!E&&!ops&&!d.memo&&!mainTx?nil:''}${add('rows','행')}</div>`,'','main')
    +blk('plan',`<div class="rtb plan">${d.plan.length?'<div class="r th"><b>시기</b><span>내용</span><i>상태</i></div>':''}${d.plan.map((r,i)=>`<div class="r">${cell('b',`plan:${i}:0`,'시기',r[0])}${cell('span',`plan:${i}:1`,'내용',r[1])}<i class="${E?'pk':''}" ${E?`data-k="plan:${i}:2" data-repstate title="상태 선택"`:''}>${schRepState(r[2])}${chev}</i>${del('plan',i)}</div>`).join('')}${!d.plan.length&&!E?nil:''}${add('plan','일정')}</div>`,'','plan');
  return `<div class="phead rep ${schProjectCompact(pid,E)?'collapsed':''} ${E?'ed':''}"${schRepPc(p)}><div class="ttl"><h1 class="${EC}" style="color:${p.color}" ${edk('__full','사업명')}>${esc(p.full)}</h1>${!E?schRepExpBtn():''}</div>${!E?schRepDelBtn():''}
    ${schProjectDetailButton(pid,E)}<div class="hr"></div>
    <div class="rep-in">${meta}${list}${stats}<div class="rcols"><div class="rc rc1">${cL}</div><div class="rc rc2">${cR}</div></div></div>
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
  return `<div class="rb rdocs"><div class="rt">첨부 자료 (PDF)</div><div class="rdl">${docs.map((x,i)=>`<div class="rd"><a class="nm" href="/api/file/${esc(x.id)}?inline=1" target="_blank" rel="noopener" title="새 탭에서 열기"><i><svg class="pict" aria-hidden="true"><use href="#pic-research"/></svg></i><span>${esc(x.name||'PDF')}</span></a><em>${x.size?fmtSize(x.size):''}</em><a class="dl" href="/api/file/${esc(x.id)}" download="${esc(x.name||'')}">내려받기</a>${E?`<button class="rx" data-docdel="${i}" title="이 파일 빼기" aria-label="이 파일 빼기">✕</button>`:''}</div>`).join('')}${E?`<button class="sh-btn lib radd" data-docadd title="PDF 첨부" aria-label="PDF 첨부">${REP_PLUS}</button><small class="rhint">PDF, 한 파일 1.8MB까지</small>`:''}</div></div>`; }
function schRepDocPick(){ const inp=document.createElement('input'); inp.type='file'; inp.accept='application/pdf,.pdf'; inp.style.display='none'; inp.dataset.repdoc='1'; document.body.appendChild(inp);
  inp.addEventListener('change',async()=>{ const f=inp.files&&inp.files[0]; inp.remove(); if(!f)return; const bad=schRepDocBad(f); if(bad){toast(bad,4600);return;} if(!S.editProj)return; const pid=S.proj;
    toast('PDF를 올리는 중입니다…',20000);
    try{ const doc=await schRepDocUpload(f,pid); if(S.proj!==pid||!S.editProj||!PHEAD[pid]){toast('올린 파일을 붙이지 못했습니다. 다시 시도해 주세요.',4200);return;} saveProjectHead(); PHEAD[pid].docs=schRepDocList(PHEAD[pid]).concat(doc); render(true); toast('PDF를 붙였습니다. 저장하면 반영됩니다.',3200); }
    catch(e){ toast(String(e&&e.message||'PDF를 올리지 못했습니다.'),4600); } }); inp.click(); }

/* ---------- files put to a block of the overview ---------- */
// (thirty-fifth round, owner 2026-11-25: "사업개요 수정 누르면 각 단락에 파일 업로드 가능하게도 만들어주고 파일업로드 가능하다는 표시도 해줘")
// Every titled block of the overview can carry files of its own. The record keeps them as `att` = {<block>: [{id, name, size}]}
// (blocks: SCH_REP_FBLOCKS); they are ordinary stored files like the PDFs above (item "proj-doc-<project>", 1.8 MB each, any
// kind). While the overview is edited every block ends in a dashed row that says so: pressed, it asks for files; files let go
// anywhere on the block are taken too. Read, a block lists its files below what it says (a PDF or a picture opens in a new tab,
// anything else comes down). Like every change of the edited overview they are part of the record only after 저장.
const SCH_REP_FBLOCKS=['main','plan','infra','struct','stat','risk','partners'];   // (thirty-sixth round, owner: "핵심지표랑 사업성지표에는 파일첨부 기능 꺼줘") a file that was put to one of the two before is still listed and can be taken off
const schRepFiles=(h,k)=>{ const f=h&&h.att; return (f&&typeof f==='object'&&Array.isArray(f[k])?f[k]:[]).filter(x=>x&&typeof x.id==='string'&&/^[0-9a-f-]{36}$/.test(x.id)); };
function schRepFileSet(h,k,list){ h.att=h.att&&typeof h.att==='object'&&!Array.isArray(h.att)?Object.assign({},h.att):{}; if(list.length)h.att[k]=list; else delete h.att[k]; }
function schRepFileRows(d,k,E,canAdd){ const fs=schRepFiles(d,k); if(!fs.length&&!(E&&canAdd))return ''; const inl=x=>/\.(pdf|png|jpe?g|gif|webp)$/i.test(x.name||'');
  return `<div class="rfl">${fs.map((x,i)=>`<div class="rf"><a class="nm" href="/api/file/${esc(x.id)}${inl(x)?'?inline=1':''}" ${inl(x)?'target="_blank" rel="noopener" title="새 탭에서 열기"':`download="${esc(x.name||'')}" title="내려받기"`}>${svg('i-clip',12,12)}<span>${esc(x.name||'파일')}</span></a><em>${x.size?fmtSize(x.size):''}</em>${E?`<button class="rx" data-fdel="${k}:${i}" title="이 파일 빼기" aria-label="이 파일 빼기">✕</button>`:`<a class="dl" href="/api/file/${esc(x.id)}" download="${esc(x.name||'')}" title="내려받기" aria-label="내려받기">${svg('i-dl',10,11)}</a>`}</div>`).join('')}${E&&canAdd?`<button type="button" class="rfdrop" data-fadd="${k}" title="이 단락에 파일 첨부 — 눌러서 고르거나 이 단락에 끌어다 놓기 · 한 파일 1.8MB까지">${svg('i-sch-fup',13,13)}<b>파일 첨부</b></button>`:''}</div>`; }
async function schRepFileTake(k,files){ files=[...(files||[])]; if(!files.length||!S.editProj||!SCH_REP_FBLOCKS.includes(k))return; const pid=S.proj, big=files.filter(f=>f.size>SCH_DOC_MAX), ok=files.filter(f=>f.size<=SCH_DOC_MAX).slice(0,10);
  if(big.length)toast(`한 파일 1.8MB까지 첨부할 수 있습니다. (${big[0].name}${big.length>1?` 외 ${big.length-1}개`:''})`,4600); if(!ok.length)return;
  if(!big.length)toast(`파일 ${ok.length}개를 올리는 중입니다…`,20000); const done=[]; let bad='';
  for(const f of ok){ try{ const x=await sharedUploadFile(f,'proj-doc-'+pid); done.push({id:x.id,name:x.name||f.name,size:x.size||f.size}); }catch(e){ bad=String(e&&e.message||'파일을 올리지 못했습니다.'); break; } }
  if(!done.length){ toast(bad||'파일을 올리지 못했습니다.',4600); return; }
  if(S.proj!==pid||!S.editProj||!PHEAD[pid]){ toast('올린 파일을 붙이지 못했습니다. 다시 시도해 주세요.',4200); return; }
  saveProjectHead(); schRepFileSet(PHEAD[pid],k,schRepFiles(PHEAD[pid],k).concat(done)); render(true); toast(bad?`파일 ${done.length}개를 붙였습니다 · 나머지는 올리지 못했습니다: ${bad}`:`파일 ${done.length}개를 붙였습니다. 저장하면 반영됩니다.`,bad?5200:3200); }
function schRepFilePick(k){ const inp=document.createElement('input'); inp.type='file'; inp.multiple=true; inp.style.display='none'; inp.dataset.repfile=k; document.body.appendChild(inp);
  inp.addEventListener('change',()=>{ const fs=[...(inp.files||[])]; inp.remove(); schRepFileTake(k,fs); }); inp.click(); }
// files let go on a block of the edited overview (anywhere else on it they are refused, so the browser does not open them in place of the page)
(()=>{ const has=e=>!!(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')), inEd=e=>S.editProj&&e.target&&e.target.closest?e.target.closest('.phead.rep.ed'):null, clear=()=>$$('.phead.rep .rb.fover').forEach(x=>x.classList.remove('fover'));
  document.addEventListener('dragover',e=>{ if(!has(e))return; const ed=inEd(e); clear(); if(!ed)return; e.preventDefault(); const z=e.target.closest('[data-fzone]'); if(z)z.classList.add('fover'); e.dataTransfer.dropEffect=z?'copy':'none'; });
  document.addEventListener('dragleave',e=>{ if(!e.relatedTarget)clear(); });
  document.addEventListener('drop',e=>{ if(!has(e))return; const ed=inEd(e); clear(); if(!ed)return; e.preventDefault(); e.stopPropagation(); const z=e.target.closest('[data-fzone]'); if(!z){ toast('파일은 붙일 단락 위에 놓아 주세요.',3000); return; } schRepFileTake(z.dataset.fzone,e.dataTransfer.files); }); })();

// a cell of the main page's list: 자료 없음 is a dash there (owner, 2026-11-24: "카드형 표형 둘다 자료없음은 -로"); the marks as elsewhere
const schRepListTxt=v=>{ const s=String(v||'').replace(/자료 없음/g,'-').trim(); return !s||s==='-'?'<span class="nil">-</span>':schRepTxt(s); };

/* ---------- the cards of the main page ---------- */
// (twenty-fifth round, owner 2026-11-24) A card has a star: it is the page's own favourite (the star at the top right of a project
// page, the list in the sidebar; kept in this browser like those), and starred cards stand first, whatever the order of the rest.
const schRepPinned=k=>S.favs.includes('project:'+k);
function schRepCards(ids){ ids=[...ids.filter(schRepPinned),...ids.filter(k=>!schRepPinned(k))]; const line=(l,v)=>`<div><b>${l}</b><span class="e" title="${esc(v||'')}">${schRepListTxt(v)}</span></div>`;
  const star=on=>`<svg width="20" height="19" viewBox="0 0 21 20" aria-hidden="true"><path d="M10.4 1.4l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L1.7 7.7l6-.9z" fill="${on?'#ffce00':'#fff'}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return ids.map(k=>{ const p=PROJECTS[k], r=schRepOf(k), m=schHas(k)?schModel(k):null, ops=m&&m.res.operationDate;
    return `<div class="pcard rep ${r.focus?'focus':''} ${schRepPinned(k)?'pinned':''}" data-go="project:${k}"${schRepPc(p)}><div class="img" style="height:${schCardImgH(p)}px">${p.img?`<img class="photo" src="${esc(p.img)}" alt="" data-pk="${esc(k)}">`:''}<button class="img-btn" data-pimg="${k}" title="이미지 교체">${svg('i-img',14,14)}</button><button type="button" class="pstar ${schRepPinned(k)?'on':''}" data-pstar="${k}" aria-pressed="${schRepPinned(k)}" title="${schRepPinned(k)?'즐겨찾기 해제 (맨 앞 고정 풀기)':'즐겨찾기 · 카드를 맨 앞에 고정'}">${star(schRepPinned(k))}</button><div class="grad" style="height:90px;background:linear-gradient(to bottom,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 28%,${p.grad} 100%)"></div><span class="st" style="color:${PSTATUS[r.stage]||'#8e8e8e'}"><i></i>${esc(r.stage||'미정')}</span></div>
  <h3 style="color:${p.color}" title="${esc([p.full,r.sub].filter(Boolean).join(' — '))}"><span class="pnm">${esc(p.full)}</span>${schRepGrpTag(r.grp)}${r.focus?'<i class="gtag gfo" title="현재 집중 추진 중인 프로젝트">집중 추진</i>':''}</h3>
  <div class="info">${ops?`<div class="ops"><b>운영개시 예상</b>${schCardOps(k)}</div>`:''}${line('위치',r.site)}${line('사업주체',r.dev)}${line('대지면적',r.area)}${line('연면적',r.gfa)}${line('IT LOAD',r.load)}${line('최초자료일',r.first)}</div></div>`; }).join(''); }

/* ---------- the table of the main page (the list itself) ---------- */
// (twenty-eighth round, owner 2026-11-24: 비고 moved into the project's overview; ten rows a page — "10개단위로 페이지 넘기면서"; the note
// below the table is gone. Thirtieth round: no headings of groups either — "AIDC 프로젝트 9건, Small AIDC 9건 이건 빼고"; the order
// stays group by group and a row says its group with the badge.)
// schRepSeq: the projects in the order the table lists them (group by group unless an order was chosen).
function schRepSeq(ids){ return schPf().sort?ids:REP_GRPS.concat('').flatMap(g=>ids.filter(k=>schRepOf(k).grp===g)); }
// (fiftieth round, owner: "프로젝트 선택에 표형태로 봤을때도 즐겨찾기 별모양 넘버랑 프로젝트 사이에 넣어줘") the table has the cards'
// star too, in a column of its own between NO. and 프로젝트, and starred rows stand first as starred cards do
const schRepStarT=on=>`<svg width="18" height="17" viewBox="0 0 21 20" aria-hidden="true"><path d="M10.4 1.4l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L1.7 7.7l6-.9z" fill="${on?'#ffce00':'#fff'}" stroke="${on?'#f2b600':'#c4c4c4'}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
function schRepTable(){ const ids=schProjFilter(orderedProjects()), c=schPf(), nos=schRepNos();
  const seq0=schRepSeq(ids), seq=[...seq0.filter(schRepPinned),...seq0.filter(k=>!schRepPinned(k))], total=Math.max(1,Math.ceil(seq.length/SCH_V_PER)); S.pjPage=Math.min(Math.max(1,S.pjPage||1),total);
  const page=seq.slice((S.pjPage-1)*SCH_V_PER,S.pjPage*SCH_V_PER);
  const th=t=>`<span><em>${t}</em></span>`, tm=(k,t,on,srt)=>`<span data-vcol="proj:${k}" class="${srt?'sorted':''} ${on?'flt':''}" title="눌러서 정렬 · 조건 선택"><em>${t}</em>${svg('i-chev-d',8,4)}</span>`;
  const cell=(v,cls)=>`<div class="tx ${cls||''}" title="${esc(v||'')}"><span class="e">${schRepListTxt(v)}</span></div>`;
  const row=k=>{ const p=PROJECTS[k], r=schRepOf(k);
    return `<div class="rw ${r.focus?'focus':''}" data-go="project:${esc(k)}"${schRepPc(p)}><div class="w no"><span>${nos[k]||''}</span>${schRepGrpTag(r.grp)}</div><div class="w pfav"><button type="button" class="pstar t ${schRepPinned(k)?'on':''}" data-pstar="${esc(k)}" aria-pressed="${schRepPinned(k)}" title="${schRepPinned(k)?'즐겨찾기 해제 (맨 앞 고정 풀기)':'즐겨찾기 · 맨 앞에 고정'}">${schRepStarT(schRepPinned(k))}</button></div><div class="nm" style="color:${esc(p.color||'')}" title="${esc(p.full||'')}${r.sub?' — '+esc(r.sub):''}">${r.focus?'<i class="fo" title="현재 집중 추진 중인 프로젝트">집중</i>':''}<span class="e">${esc(p.full||pname(p))}</span></div>${cell(r.site)}${cell(r.dev)}${cell(r.area,'num')}${cell(r.gfa,'num')}${cell(r.load)}<div class="st"><span style="color:${esc(PSTATUS[r.stage]||'#8e8e8e')}"><i></i>${esc(r.stage||'미정')}</span></div>${cell(r.first,'dt')}</div>`; };
  let h=`<div class="tbl sch-proc sch-vtbl vt-proj vt-rep"><div class="hd">${th('NO.')}<span class="pfav" title="즐겨찾기"></span>${tm('name','프로젝트',!!c.grp||!!c.focus,!!c.sort&&c.sort!=='first')}${tm('region','위치',!!c.region,false)}${th('사업주체')}${th('대지면적(m²)')}${th('연면적(m²)')}${th('IT LOAD (수전용량)')}${tm('st','추진 단계',!!c.st,false)}${tm('first','최초자료일',false,c.sort==='first')}</div>`;
  h+=page.map(row).join('');
  if(!ids.length)h+=`<div class="none">조건에 맞는 프로젝트가 없습니다.</div>`;
  return h+`<div class="ft"></div></div>${seq.length>SCH_V_PER?schVPager('proj',S.pjPage,total):''}`; }

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
  if(el=T.closest('[data-fadd]')){ if(!S.editProj)return; e.preventDefault(); schRepFilePick(el.dataset.fadd); return; }
  if(el=T.closest('[data-fdel]')){ if(!S.editProj)return; saveProjectHead(); const [fk,fi]=el.dataset.fdel.split(':'), a=schRepFiles(h(),fk).slice(); a.splice(+fi,1); schRepFileSet(h(),fk,a); render(true); return; }
  if(el=T.closest('[data-docadd]')){ if(!S.editProj)return; schRepDocPick(); return; }
  if(el=T.closest('[data-docdel]')){ if(!S.editProj)return; saveProjectHead(); const a=schRepDocList(h()); a.splice(+el.dataset.docdel,1); h().docs=a; render(true); return; }
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
// a window that says what will happen before anything is changed (a data file, or what a document was read as: 89-docread.js)
function schRepAsk(data,fname){ closePop(); const old=$('#dlg'); if(old)old.remove(); const plan=schRepPlan(data), make=plan.rows.filter(r=>!r.k&&!r.back), upd=plan.rows.filter(r=>r.k||r.back);
  const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-np sch-repin'; const names=a=>a.map(r=>`<li>${esc(r.x.name)}${r.k&&norm(PROJECTS[r.k].full)!==norm(r.x.name)?` <span>← ${esc(PROJECTS[r.k].full)}</span>`:r.back?' <span>← 휴지통에서 되살림</span>':''}</li>`).join('');
  d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="${data.noRest?'문서로 프로젝트 만들기':'자료 파일 가져오기'}"><div class="np-hd"><b>${data.noRest?'문서로 프로젝트 만들기':'자료 파일 가져오기'}</b><span>${esc(fname||'')}${data.asof?` · 기준일 ${esc(String(data.asof))}`:''} · ${plan.rows.length}건</span></div>
    <div class="rin">${make.length?`<div class="g"><b>새로 만들기 ${make.length}건</b><ul>${names(make)}</ul></div>`:''}${upd.length?`<div class="g"><b>덮어쓰기 ${upd.length}건</b><small>사업개요만 파일 내용으로 바뀝니다. 일정 · 액션 · 미팅 · 담당자 · 협력업체는 그대로 둡니다.</small><ul>${names(upd)}</ul></div>`:''}
      ${plan.rest.length&&!data.noRest?`<div class="g"><b>파일에 없는 프로젝트 ${plan.rest.length}건</b><ul>${plan.rest.map(k=>`<li>${esc(PROJECTS[k].full)}</li>`).join('')}</ul><label class="ck"><input type="checkbox" id="rin-others" ${data.others==='trash'?'checked':''}> 이 프로젝트들을 휴지통으로 보내기 <em>(30일 안에 되살릴 수 있습니다)</em></label></div>`:''}</div>
    <div class="np-bt"><button data-rin="x">취소</button><button class="pri" data-rin="ok">가져오기</button></div></div>`;
  document.body.appendChild(d); const close=()=>d.remove();
  d.addEventListener('click',e=>{ e.stopPropagation(); const a=e.target.closest('[data-rin]'); if(e.target===d||(a&&a.dataset.rin==='x')){close();return;} if(!a)return;
    if(S.editProj){ toast('사업개요를 수정하는 중에는 가져올 수 없습니다. 먼저 저장하거나 취소해 주세요.',4600); return; }
    const others=!!(d.querySelector('#rin-others')||{}).checked, here=S.page==='project'?S.proj:'', r=schRepApply(data,others); close();
    if(here&&!PROJECTS[here])go('main'); else render(true);
    toast(`${data.noRest?'문서 내용을 반영했습니다':'자료를 가져왔습니다'} · 새로 만들기 ${r.made}건 · 덮어쓰기 ${r.upd}건${r.gone?` · 휴지통 ${r.gone}건`:''}`,5200); });
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'){e.stopPropagation();close();} }); }
/* ---------- the star of a card ---------- */
// (before the page's own click handler, which would open the project the card stands for)
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const el=e.target.closest&&e.target.closest('[data-pstar]'); if(!el)return; e.stopPropagation(); e.preventDefault();
  const on=toggleFav('project:'+el.dataset.pstar); S.car.proj=0; const body=$('.page.on [data-vbody="proj"]'), inner=$('#proj-inner');
  if(body){ S.pjPage=1; body.innerHTML=schProjTable(); }
  else if(inner&&inner.offsetParent){ inner.innerHTML=projectCards(); applyCarousel('proj'); if(typeof schMobApply==='function'){ const t=inner.closest('.track'); if(t)t.scrollLeft=0; } }
  toast(on?`즐겨찾기에 추가했습니다 · ${body?'표':'카드'}의 맨 앞에 고정됩니다.`:'즐겨찾기를 해제했습니다.',2600); },true);

/* ---------- the main calendar's project tags: one line, the rest folded ---------- */
// (twenty-seventh round, owner 2026-11-24: "프로젝트 태그들 1줄만 나오고 접히게") The button stands at the end of the line and says how many tags
// are folded away; it is not shown when all of them fit. Called after every draw (schAfterNav).
const SCH_CALPILL_GAP=10;   // between the last tag that shows and the button that opens the rest
function schCalPillsFit(){ const box=$('.page.on .cal > .filters'), btn=box&&box.querySelector('[data-calpills]'); if(!btn)return; const pills=[...box.querySelectorAll('.pill')]; if(!pills.length){btn.hidden=true;return;}
  const top0=pills[0].offsetTop, more=pills.filter(p=>p.offsetTop>top0+2).length, open=box.classList.contains('open');
  btn.hidden=!more; btn.innerHTML=open?`접기${svg('i-chev-d',8,4,'transform:rotate(180deg)')}`:`+${more}${svg('i-chev-d',8,4)}`; btn.title=open?'프로젝트 태그를 한 줄로 접기':`프로젝트 태그 ${more}개 더 보기`; btn.setAttribute('aria-expanded',String(open));
  // (thirty-second round, owner: "배경 없애고 프로젝트 뱃지랑 거리 확 붙여놔. 너무 붙지는 않게") the button stands right after the last tag that
  // shows — the last one of the first line while folded, the very last one while open — and no longer at the far end of the row.
  if(more){ const line=open?pills:pills.filter(p=>p.offsetTop<=top0+2), last=line[line.length-1]; btn.style.right='auto'; btn.style.left=(last.offsetLeft+last.offsetWidth+SCH_CALPILL_GAP)+'px'; btn.style.top=last.offsetTop+'px'; } }
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const el=e.target.closest&&e.target.closest('[data-calpills]'); if(!el)return; e.stopPropagation(); S.calPillsOpen=!S.calPillsOpen; refreshSec('cal'); });
