// Twenty-first round (owner, 2026-11-24): the meetings of a project and the projects of the main page can be seen as a table too
// ("많아졌을 때를 대비해서 표 형태로도", in the design of the 외부설비 조달 table), each with a search box; the meetings with filters
// (period, participant, order), the projects with an Excel file of what is listed.
//  - Which of the two views a member looks at is this browser's own (localStorage `aidc-view`), like the widths of the panels.
//  - The cards and the table list the same rows: schMeetRows(pid) / schProjFilter(ids) (the search of the projects is part of it).
//  - While somebody types, only the cards or the table are drawn again, never the search box itself.
const SCH_VIEW=(()=>{try{const v=JSON.parse(localStorage.getItem('aidc-view')||'{}');return v&&typeof v==='object'?v:{};}catch(e){return {};}})();
const schViewOf=k=>SCH_VIEW[k]==='table'?'table':'cards';
function schViewSet(k,v){ SCH_VIEW[k]=v; try{localStorage.setItem('aidc-view',JSON.stringify(SCH_VIEW));}catch(e){} }
const SCH_VT_IC={cards:'<svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>',
  table:'<svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><rect x="1" y="2" width="12" height="2" rx="1"/><rect x="1" y="6" width="12" height="2" rx="1"/><rect x="1" y="10" width="12" height="2" rx="1"/></svg>'};
const schViewToggle=k=>`<div class="sch-vt" role="group" aria-label="보기 방식">${['cards','table'].map(v=>`<button type="button" class="${schViewOf(k)===v?'on':''}" data-vt="${k}:${v}" title="${v==='cards'?'카드로 보기':'표로 보기'}" aria-pressed="${schViewOf(k)===v}">${SCH_VT_IC[v]}</button>`).join('')}</div>`;
const schVPager=(k,cur,total)=>pager(cur,total,'pg-v').replace(/data-pg=/g,'data-vpg=').replace('class="pager',`data-vk="${k}" style="margin-top:44px" class="pager`);
const SCH_V_PER=10;

/* ---------- meetings of a project ---------- */
const schMtf=()=>S.mtf||(S.mtf={});
const SCH_MT_WHEN={next:'예정된 미팅',past:'지난 미팅',month:'이번 달'}, SCH_MT_SORT={old:'오래된 순',name:'제목 순'};
function schMeetRows(pid){ const q=(S.q.meeting||'').trim(), c=schMtf();
  const ms=liveItems('meeting',pid).filter(m=>{ const p=meetParts(m), d=String(m.date||'');
    if(q&&!matchQ(q,m.title,p.place,p.agenda,p.guests,dateDot(d),...(m.people||[]).map(userName)))return false;
    if(c.who&&!(m.people||[]).includes(c.who))return false; if(c.file&&(c.file==='y')!==!!hasFiles(m))return false; if(c.guest&&(c.guest==='y')!==!!String(p.guests||'').trim())return false;
    if(c.when==='next'&&!(d>=TODAY))return false; if(c.when==='past'&&!(d&&d<TODAY))return false; if(c.when==='month'&&d.slice(0,7)!==TODAY.slice(0,7))return false; return true; });
  if(c.sort==='old')ms.sort((a,b)=>String(a.date).localeCompare(String(b.date))||newestFirst(b,a));
  else if(c.sort==='name')ms.sort((a,b)=>norm(a.title).localeCompare(norm(b.title),'ko'));
  else ms.sort((a,b)=>String(b.date).localeCompare(String(a.date))||newestFirst(a,b));
  return ms; }
const schMeetFiltered=()=>{ const c=schMtf(); return !!((S.q.meeting||'').trim()||c.who||c.when||c.file||c.guest); };
const SCH_MT_YN={file:['회의록',{y:'있음',n:'없음'}],guest:['외부 참석',{y:'있음',n:'없음'}]};
function schMeetPicks(){ const c=schMtf(), tags=['file','guest'].filter(k=>c[k]).map(k=>`<button class="sch-chip" data-mtchip="${k}" title="이 조건 지우기">${SCH_MT_YN[k][0]}: ${SCH_MT_YN[k][1][c[k]]}<i>✕</i></button>`).join('');   // what only the table's head can choose shows as a tag
  return tags+schSf2('mtpick','when',c.when?SCH_MT_WHEN[c.when]:'전체 기간',!!c.when)+schSf2('mtpick','who',c.who?userName(c.who):'전체 참석자',!!c.who)+schSf2('mtpick','sort',c.sort?SCH_MT_SORT[c.sort]:'최신 순',!!c.sort); }
// what stands at the right of the title 미팅: the pickers, the two views, the search box
const schMeetTools=()=>`<div class="sch-vtools"><div class="sch-filters" data-vpick="meet">${schMeetPicks()}</div>${schViewToggle('meet')}${searchBox('meeting','미팅 검색')}</div>`;
function schMeetMenu(el,k){ const c=schMtf(), go=()=>{S.mtPage=1;schMeetRedraw();}, fl=(val,item)=>({...item,sel:(c[k]||'')===val,fn:()=>{if(val)c[k]=val;else delete c[k];go();}}); let items;
  if(k==='when')items=[fl('',{t:'전체 기간'}),...Object.entries(SCH_MT_WHEN).map(([v,t])=>fl(v,{t}))];
  else if(k==='who'){ const ppl=[...new Set(liveItems('meeting',S.proj).flatMap(m=>m.people||[]))].sort((x,y)=>userName(x).localeCompare(userName(y),'ko')); items=[fl('',{t:'전체 참석자'}),...ppl.map(u=>fl(u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')}))]; }
  else items=[fl('',{t:'최신 순'}),...Object.entries(SCH_MT_SORT).map(([v,t])=>fl(v,{t}))];
  menuPop(el,items.map((x,i)=>({...x,k:String(i)})),{cls:'sch-colmenu'}); }
function schMeetTable(pid){ const rows=schMeetRows(pid), total=Math.max(1,Math.ceil(rows.length/SCH_V_PER)); S.mtPage=Math.min(Math.max(1,S.mtPage||1),total); const page=rows.slice((S.mtPage-1)*SCH_V_PER,S.mtPage*SCH_V_PER), c=schMtf(), th=t=>`<span><em>${t}</em></span>`;
  // column titles that order and filter, like the other tables (owner, 2026-11-24): they change the same conditions as the pickers beside the title
  const tm=(k,t,on,srt)=>`<span data-vcol="meet:${k}" class="${srt?'sorted':''} ${on?'flt':''}" title="눌러서 정렬 · 조건 선택"><em>${t}</em>${svg('i-chev-d',8,4)}</span>`;
  let h=`<div class="tbl sch-proc sch-vtbl vt-meet"><div class="hd">${tm('date','날짜',!!c.when,c.sort==='old')}${th('시간')}${tm('name','미팅명',false,c.sort==='name')}${th('장소')}${th('안건')}${tm('who','참석자',!!c.who,false)}${tm('guest','외부 참석',!!c.guest,false)}${tm('file','회의록',!!c.file,false)}</div>`;
  for(const m of page){ const p=meetParts(m), ppl=m.people||[], cell=v=>{const t=oneLine(v);return `<div class="tx" title="${esc(t)}"><span class="e">${esc(t||'-')}</span></div>`;};
    h+=`<div class="rw ${S.panel===m.id?'sel':''}" data-open="${esc(m.id)}"><div class="w">${esc(schD(m.date)||'-')}</div><div class="tm">${esc(meetTimeTxt(p.time)||'-')}</div><div class="nm" title="${esc(oneLine(m.title))}"><span class="e">${esc(oneLine(m.title)||'(제목 없음)')}</span></div>${cell(p.place)}${cell(p.agenda)}
      <div class="who" title="${esc(ppl.map(userName).join(', '))}">${ppl.length?ppl.slice(0,2).map(k=>`<span data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')+(ppl.length>2?`<em class="more-n">+${ppl.length-2}</em>`:''):'<span class="sch-role none">미지정</span>'}</div>${cell(p.guests)}
      <div class="fl">${hasFiles(m)?`<button class="sh-btn" data-act="dl" data-id="${esc(m.id)}" title="회의록 다운로드">다운로드 ${svg('i-dl',10,11,'color:#4f4f4f;margin-top:1px')}</button>`:'<span class="nil">-</span>'}</div></div>`; }
  if(!rows.length)h+=`<div class="none">${schMeetFiltered()?'조건에 맞는 미팅이 없습니다.':'등록된 미팅이 없습니다. + 버튼으로 새 미팅을 만드세요.'}</div>`;
  return h+`<div class="ft"></div></div>${rows.length>SCH_V_PER?schVPager('meet',S.mtPage,total):''}`; }
// the whole section as a table (renderProject uses its own markup for the cards)
const schMeetTableSection=pid=>`<div class="meet tv" style="margin-top:117.2px"><div class="sec-title sch-title" style="top:0">${schTitleIcon('meeting')}미팅${plusBtn('new-meeting','새 미팅')}<button class="sh-btn lib" data-lib="meeting">라이브러리</button><span class="car-cnt" id="meet-cnt"></span></div>${schMeetTools()}<div data-vbody="meet">${schMeetTable(pid)}</div></div>`;
function schMeetRedraw(){ const pid=S.proj, pk=$('.page.on [data-vpick="meet"]'); if(pk)pk.innerHTML=schMeetPicks();
  const body=$('.page.on [data-vbody="meet"]'), inner=$('#meet-inner');
  if(body)body.innerHTML=schMeetTable(pid); else if(inner&&inner.offsetParent){ inner.innerHTML=meetingCards(pid,schMeetRows(pid)); S.car.meet=0; applyCarousel('meet'); } afterNav(); }

/* ---------- projects of the main page ---------- */
const schProjTools=()=>`<div class="sch-vtools">${schViewToggle('proj')}${searchBox('proj','프로젝트 검색')}</div>`;
const schProjXlBtn=()=>`<button class="sh-btn lib sch-xl" data-pjxl title="지금 목록에 있는 프로젝트를 (검색·조건이 걸려 있으면 그 결과만) 엑셀 파일(.xlsx)로 내려받습니다">${svg('i-sch-xls',12,12)}엑셀로 내보내기</button>`;
function schProjTable(){ const ids=schProjFilter(orderedProjects()), total=Math.max(1,Math.ceil(ids.length/SCH_V_PER)); S.pjPage=Math.min(Math.max(1,S.pjPage||1),total); const from=(S.pjPage-1)*SCH_V_PER, page=ids.slice(from,from+SCH_V_PER), c=schPf(), th=t=>`<span><em>${t}</em></span>`;
  const tm=(k,t,on,srt)=>`<span data-vcol="proj:${k}" class="${srt?'sorted':''} ${on?'flt':''}" title="눌러서 정렬 · 조건 선택"><em>${t}</em>${svg('i-chev-d',8,4)}</span>`;
  let h=`<div class="tbl sch-proc sch-vtbl vt-proj"><div class="hd">${th('No.')}${tm('name','프로젝트',false,c.sort==='name'||c.sort==='new')}${tm('st','분류',!!c.st,false)}${tm('ops','운영개시 예상',false,c.sort==='ops')}${tm('owner','담당자',!!c.owner,false)}${th('부지')}${th('총사업비')}${th('공사 면적')}${th('총 수전용량')}${th('IT 용량')}${th('서버')}</div>`;
  page.forEach((k,i)=>{ const p=PROJECTS[k], hd=PHEAD[k]||{}, cell=v=>`<div class="tx" title="${esc(v||'')}"><span class="e">${esc(v||'-')}</span></div>`;
    h+=`<div class="rw" data-go="project:${esc(k)}"><div class="w">${from+i+1}</div><div class="nm" style="color:${esc(p.color||'')}" title="${esc(p.full||'')}"><span class="e">${esc(p.full||pname(p))}</span></div><div class="st"><span style="color:${esc(p.stColor||'#4f4f4f')}"><i></i>${esc(p.status||'-')}</span></div><div class="ops">${schCardOps(k)}</div>
      <div class="who"><span>${av()}${esc(hd.owner||p.owner||'-')}</span></div>${cell(siteOf(p,hd))}${cell(hd.cost||p.cost)}${cell(scaleOf(hd,0,p.area))}${cell(scaleOf(hd,2,p.power))}${cell(scaleOf(hd,1,p.it))}${cell(scaleOf(hd,3,p.server))}</div>`; });
  if(!ids.length)h+=`<div class="none">조건에 맞는 프로젝트가 없습니다.</div>`;
  return h+`<div class="ft"></div></div>${ids.length>SCH_V_PER?schVPager('proj',S.pjPage,total):''}`; }
const schProjTableSection=()=>`<div class="projects tv" style="margin-top:111.5px"><div class="sec-title" style="top:0">프로젝트${plusBtn('new-proj','새 프로젝트')}<span class="car-cnt" id="proj-cnt"></span></div>${schProjTools()}${schProjBar()}<div data-vbody="proj">${schProjTable()}</div></div>`;
function schProjRedraw(){ const body=$('.page.on [data-vbody="proj"]'), inner=$('#proj-inner');
  if(body)body.innerHTML=schProjTable(); else if(inner&&inner.offsetParent){ inner.innerHTML=projectCards(); S.car.proj=0; applyCarousel('proj'); } afterNav(); }
// The Excel file of the projects: one sheet with what the list holds now (the search and the pickers apply), in its order.
async function schProjXlsx(){ toast('엑셀 파일을 만드는 중입니다…',20000);
  try{ const X=await schXlsx(), ids=schProjFilter(orderedProjects()), c=schPf(), cond=[(S.q.proj||'').trim()?'검색: '+S.q.proj.trim():'',c.st?'분류: '+c.st:'',c.owner?'담당자: '+c.owner:'',c.sort?'정렬: '+SCH_PSORT[c.sort]:''].filter(Boolean).join(' / ')||'조건 없음 (전체)';
    const rows=[['No.','프로젝트','분류','운영개시 예상','목표 대비(일)','담당자','부지','총사업비','공사 면적','총 수전용량','IT 용량','서버']].concat(ids.map((k,i)=>{ const p=PROJECTS[k], hd=PHEAD[k]||{}, m=schHas(k)?schModel(k):null;
      return [i+1,p.full||pname(p),p.status||'',(m&&m.res.operationDate)||'',m&&m.res.operationDate?(m.res.operationDelay||0):'',hd.owner||p.owner||'',siteOf(p,hd),hd.cost||p.cost||'',scaleOf(hd,0,p.area),scaleOf(hd,2,p.power),scaleOf(hd,1,p.it),scaleOf(hd,3,p.server)]; }));
    const bytes=await X.makeBook([{name:'프로젝트',rows,widths:[7,40,12,16,14,16,34,18,16,16,14,14]},{name:'내보낸 조건',rows:[['항목','값'],['내보낸 날',TODAY],['조건',cond],['프로젝트 수',ids.length]],widths:[18,60]}],'프로젝트');
    schExpSave(`프로젝트 목록_${schToday()}.xlsx`,new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); toast(`엑셀 파일을 내려받았습니다 · 프로젝트 ${ids.length}건`,3600); }
  catch(e){ console.error(e); toast('엑셀 파일을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.',4200); } }

// The menu of a column title of the two tables. Meetings: the conditions of schMtf (the pickers show them too); projects: the
// section's own menus (schProjMenu: 분류, 담당자, 정렬).
function schVColMenu(el,k,col){ if(k==='proj'){ schProjMenu(el,col==='st'?'st':col==='owner'?'owner':'sort'); return; }
  const c=schMtf(), go=()=>{S.mtPage=1;schMeetRedraw();}, fl=(key,val,item)=>({...item,sel:(c[key]||'')===val,fn:()=>{if(val)c[key]=val;else delete c[key];go();}}); let items=[];
  if(col==='date')items=[{hd:'정렬'},fl('sort','',{t:'최신 순'}),fl('sort','old',{t:'오래된 순'}),'-',{hd:'기간'},fl('when','',{t:'전체 기간'}),...Object.entries(SCH_MT_WHEN).map(([v,t])=>fl('when',v,{t}))];
  else if(col==='name')items=[{hd:'정렬'},fl('sort','name',{t:'제목 순'}),fl('sort','',{t:'최신 순'})];
  else if(col==='who'){ const ppl=[...new Set(liveItems('meeting',S.proj).flatMap(m=>m.people||[]))].sort((x,y)=>userName(x).localeCompare(userName(y),'ko')); items=[{hd:'참석자'},fl('who','',{t:'전체 참석자'}),...ppl.map(u=>fl('who',u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')}))]; }
  else if(col==='file'||col==='guest')items=[{hd:SCH_MT_YN[col][0]},fl(col,'',{t:'전체'}),fl(col,'y',{t:SCH_MT_YN[col][0]+' 있음'}),fl(col,'n',{t:SCH_MT_YN[col][0]+' 없음'})];
  menuPop(el,items.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)}),{cls:'sch-colmenu'}); }

/* ---------- handlers ---------- */
document.addEventListener('click',e=>{ if(!PREVIEW_ON||!e.target.closest)return; let el;
  if(el=e.target.closest('[data-vt]')){ e.stopPropagation(); const [k,v]=el.dataset.vt.split(':'); if(schViewOf(k)===v)return; schViewSet(k,v); if(k==='meet'){S.mtPage=1;S.car.meet=0;} else {S.pjPage=1;S.car.proj=0;} render(true); return; }
  if(el=e.target.closest('[data-mtpick]')){ e.stopPropagation(); schMeetMenu(el,el.dataset.mtpick); return; }
  if(el=e.target.closest('[data-vcol]')){ e.stopPropagation(); const [k,col]=el.dataset.vcol.split(':'); schVColMenu(el,k,col); return; }
  if(el=e.target.closest('[data-mtchip]')){ e.stopPropagation(); delete schMtf()[el.dataset.mtchip]; S.mtPage=1; schMeetRedraw(); return; }
  if(el=e.target.closest('[data-pjxl]')){ e.stopPropagation(); schProjXlsx(); return; }
  if(el=e.target.closest('[data-vpg]')){ e.stopPropagation(); const k=el.closest('.pager').dataset.vk, key=k==='meet'?'mtPage':'pjPage', v=el.dataset.vpg; let cur=S[key]||1;
    if(v==='prev')cur--; else if(v==='next')cur++; else if(v==='first')cur=1; else if(v==='last')cur=1e9; else cur=+v||1; S[key]=cur; if(k==='meet')schMeetRedraw(); else schProjRedraw(); return; }
},true);
document.addEventListener('input',e=>{ const t=e.target; if(!PREVIEW_ON||!t||!t.matches||!t.matches('input[data-q="meeting"],input[data-q="proj"]'))return; S.q[t.dataset.q]=t.value;
  if(t.dataset.q==='meeting'){ S.mtPage=1; schMeetRedraw(); } else { S.pjPage=1; schProjRedraw(); } });
