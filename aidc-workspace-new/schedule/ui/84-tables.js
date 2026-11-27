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
// at the right of the title 미팅: the two views and the search box; below the title, where every section has them, the row of pickers
// (twenty-sixth round: they stood in the row of the title)
const schMeetTools=()=>`<div class="sch-vtools">${schViewToggle('meet')}${searchBox('meeting','미팅 검색')}</div><div class="sch-filters meetf" data-vpick="meet">${schMeetPicks()}</div>`;
function schMeetMenu(el,k){ const c=schMtf(), go=()=>{S.mtPage=1;schMeetRedraw();}, fl=(val,item)=>({...item,sel:(c[k]||'')===val,fn:()=>{if(val)c[k]=val;else delete c[k];go();}}); let items;
  if(k==='when')items=[fl('',{t:'전체 기간'}),...Object.entries(SCH_MT_WHEN).map(([v,t])=>fl(v,{t}))];
  else if(k==='who'){ const ppl=[...new Set(liveItems('meeting',S.proj).flatMap(m=>m.people||[]))].sort((x,y)=>userName(x).localeCompare(userName(y),'ko')); items=[fl('',{t:'전체 참석자'}),...ppl.map(u=>fl(u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')}))]; }
  else items=[fl('',{t:'최신 순'}),...Object.entries(SCH_MT_SORT).map(([v,t])=>fl(v,{t}))];
  menuPop(el,items.map((x,i)=>({...x,k:String(i)})),{cls:'sch-colmenu'}); }
function schMeetTable(pid){ const rows=schMeetRows(pid), total=Math.max(1,Math.ceil(rows.length/SCH_V_PER)); S.mtPage=Math.min(Math.max(1,S.mtPage||1),total); const page=rows.slice((S.mtPage-1)*SCH_V_PER,S.mtPage*SCH_V_PER), c=schMtf(), th=t=>`<span><em>${t}</em></span>`;
  // column titles that order and filter, like the other tables (owner, 2026-11-24): they change the same conditions as the pickers beside the title
  const tm=(k,t,on,srt)=>`<span data-vcol="meet:${k}" class="${srt?'sorted':''} ${on?'flt':''}" title="눌러서 정렬 · 조건 선택"><em>${t}</em>${svg('i-chev-d',8,4)}</span>`;
  let h=`<div class="tbl sch-proc sch-vtbl vt-meet"><div class="hd">${tm('date','날짜',!!c.when,c.sort==='old')}${th('시간')}${tm('name','미팅명',false,c.sort==='name')}${th('장소')}${th('안건')}${tm('who','참석자',!!c.who,false)}${tm('guest','외부 참석',!!c.guest,false)}${tm('file','회의록',!!c.file,false)}</div>`;
  for(const m of page){ const p=meetParts(m), ppl=m.people||[], cell=v=>{const t=oneLine(v);return `<div class="tx" title="${esc(t)}"><span class="e">${esc(t)}</span></div>`;};   // (thirty-eighth round, owner: "써진 항목없으면 -로 표기하지 말고 그냥 비워놔") nothing is written for what is not there
    h+=`<div class="rw ${S.panel===m.id?'sel':''}" data-open="${esc(m.id)}"><div class="w">${esc(schD(m.date)||'-')}</div><div class="tm">${esc(meetTimeTxt(p.time))}</div><div class="nm" title="${esc(oneLine(m.title))}">${dotsHtml(m,'tdots')}<span class="e">${esc(oneLine(m.title)||'(제목 없음)')}</span></div>${cell(p.place)}${cell(p.agenda)}
      <div class="who" title="${esc(ppl.map(userName).join(', '))}">${ppl.length?ppl.slice(0,2).map(k=>`<span data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')+(ppl.length>2?`<em class="more-n">+${ppl.length-2}</em>`:''):emptyPerson()}</div>${cell(p.guests)}
      <div class="fl">${hasFiles(m)?`<button class="sh-btn" data-act="dl" data-id="${esc(m.id)}" title="회의록 다운로드">다운로드 ${svg('i-dl',10,11,'color:#4f4f4f;margin-top:1px')}</button>`:''}</div></div>`; }
  if(!rows.length)h+=`<div class="none">${schMeetFiltered()?'조건에 맞는 미팅이 없습니다.':'등록된 미팅이 없습니다. + 버튼으로 새 미팅을 만드세요.'}</div>`;
  return h+`<div class="ft"></div></div>${rows.length>SCH_V_PER?schVPager('meet',S.mtPage,total):''}`; }
// the whole section as a table (renderProject uses its own markup for the cards)
const schMeetTableSection=pid=>`<div class="meet tv" style="margin-top:117.2px"><div class="sec-title sch-title" style="top:0">${schTitleIcon('meeting')}미팅${plusBtn('new-meeting','새 미팅')}<button class="sh-btn lib" data-lib="meeting">라이브러리</button><span class="car-cnt" id="meet-cnt"></span></div>${schMeetTools()}<div data-vbody="meet">${schMeetTable(pid)}</div></div>`;
function schMeetRedraw(){ const pid=S.proj, pk=$('.page.on [data-vpick="meet"]'); if(pk)pk.innerHTML=schMeetPicks();
  const body=$('.page.on [data-vbody="meet"]'), inner=$('#meet-inner');
  if(body)body.innerHTML=schMeetTable(pid); else if(inner&&inner.offsetParent){ inner.innerHTML=meetingCards(pid,schMeetRows(pid)); S.car.meet=0; applyCarousel('meet'); } afterNav(); }

/* ---------- research as a table (fortieth round, owner 2026-11-25: "리서치도 표형태로 볼수있게") ---------- */
// The same rows the cards show (the search, the pickers above and the order are the section's own: researchSecHtml), ten a
// page, in the meeting table's design. The switch stands beside the section's search box; the choice is this browser's own
// (`aidc-view`.res) and holds for the main page and the project pages alike.
function schResTable(rows){ const th=t=>`<span><em>${t}</em></span>`;
  let h=`<div class="tbl sch-proc sch-vtbl vt-res"><div class="hd">${th('날짜')}${th('제목')}${th('상태')}${th('중요도')}${th('담당자')}${th('최종수정')}${th('URL')}</div>`;
  for(const r of rows){ const ppl=r.people||[], ttl=schResearchBodyTitle(r);
    h+=`<div class="rw ${S.panel===r.id?'sel':''}" data-open="${esc(r.id)}"><div class="w">${esc(dateShow(r))}</div><div class="nm" title="${esc(ttl)}">${dotsHtml(r,'tdots')}<span class="e">${schResearchPreviewTitle(r)}</span></div>
      <div class="res-state">${stIcon(r.st||'prog')}</div><div class="res-priority"><span class="pri pri-${esc(r.pri||'mid')}">${esc(priTxt[r.pri||'mid']||'중간')}</span></div>
      <div class="who" title="${esc(ppl.map(userName).join(', '))}">${ppl.slice(0,2).map(k=>`<span data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')+(ppl.length>2?`<em class="more-n">+${ppl.length-2}</em>`:ppl.length?'':emptyPerson())}</div>
      <div class="tx"><span class="e">${esc(modDate(r)?modTxt(r,true):'')}</span></div>
      <div class="fl url">${r.url?schUrlCell(r.url):''}${hasFiles(r)?`<button class="sh-btn" data-act="dl" data-id="${esc(r.id)}" title="첨부 다운로드">다운로드 ${svg('i-dl',10,11,'color:#4f4f4f;margin-top:1px')}</button>`:''}</div></div>`; }
  if(!rows.length)h+=`<div class="none">${S.q.research?'검색 결과가 없습니다.':Object.keys(S.rf||{}).some(k=>k!=='sort')?'조건에 맞는 리서치가 없습니다.':'등록된 리서치가 없습니다.'}</div>`;
  return h+`<div class="ft"></div></div>`; }

/* ---------- projects of the main page ---------- */
const schProjTools=()=>`<div class="sch-vtools">${schViewToggle('proj')}${searchBox('proj','프로젝트 검색')}</div>`;
// (since the twenty-fourth round the table is the development review list itself: schRepTable in 88-report.js, all of it on one page)
const schProjTable=()=>schRepTable();
const schProjTableSection=()=>`<div class="projects tv" style="margin-top:111.5px"><div class="sec-title" style="top:0">프로젝트${schRepCount()}${plusBtn('new-proj','새 프로젝트')}<span class="car-cnt" id="proj-cnt"></span></div>${schProjTools()}${schProjBar()}<div data-vbody="proj">${schProjTable()}</div></div>`;
function schProjRedraw(){ const body=$('.page.on [data-vbody="proj"]'), inner=$('#proj-inner'), n=$('.page.on .projects .rep-n'); if(n)n.textContent=schProjFilter(orderedProjects()).length;
  if(body)body.innerHTML=schProjTable(); else if(inner&&inner.offsetParent){ inner.innerHTML=projectCards(); S.car.proj=0; applyCarousel('proj'); } afterNav(); }
// The Excel file of the projects: one sheet with what the list holds now (the search and the pickers apply), in its order, with the
// columns of the development review list.
// The menu of a column title of the two tables. Meetings: the conditions of schMtf (the pickers show them too); projects: the
// section's own menus (schProjMenu: 프로젝트 = 정렬 · 구분 · 집중 추진, 위치, 추진 단계, 최초자료일 = 정렬).
function schVColMenu(el,k,col){ if(k==='proj'){ schProjMenu(el,col); return; }
  const c=schMtf(), go=()=>{S.mtPage=1;schMeetRedraw();}, fl=(key,val,item)=>({...item,sel:(c[key]||'')===val,fn:()=>{if(val)c[key]=val;else delete c[key];go();}}); let items=[];
  if(col==='date')items=[{hd:'정렬'},fl('sort','',{t:'최신 순'}),fl('sort','old',{t:'오래된 순'}),'-',{hd:'기간'},fl('when','',{t:'전체 기간'}),...Object.entries(SCH_MT_WHEN).map(([v,t])=>fl('when',v,{t}))];
  else if(col==='name')items=[{hd:'정렬'},fl('sort','name',{t:'제목 순'}),fl('sort','',{t:'최신 순'})];
  else if(col==='who'){ const ppl=[...new Set(liveItems('meeting',S.proj).flatMap(m=>m.people||[]))].sort((x,y)=>userName(x).localeCompare(userName(y),'ko')); items=[{hd:'참석자'},fl('who','',{t:'전체 참석자'}),...ppl.map(u=>fl('who',u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')}))]; }
  else if(col==='file'||col==='guest')items=[{hd:SCH_MT_YN[col][0]},fl(col,'',{t:'전체'}),fl(col,'y',{t:SCH_MT_YN[col][0]+' 있음'}),fl(col,'n',{t:SCH_MT_YN[col][0]+' 없음'})];
  menuPop(el,items.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)}),{cls:'sch-colmenu'}); }

/* ---------- handlers ---------- */
document.addEventListener('click',e=>{ if(!PREVIEW_ON||!e.target.closest)return; let el;
  if(el=e.target.closest('[data-vt]')){ e.stopPropagation(); const [k,v]=el.dataset.vt.split(':'); if(schViewOf(k)===v)return; schViewSet(k,v); if(k==='meet'){S.mtPage=1;S.car.meet=0;} else if(k==='res'){S.resPage=1;} else {S.pjPage=1;S.car.proj=0;} render(true); return; }
  if(el=e.target.closest('[data-mtpick]')){ e.stopPropagation(); schMeetMenu(el,el.dataset.mtpick); return; }
  if(el=e.target.closest('[data-vcol]')){ e.stopPropagation(); const [k,col]=el.dataset.vcol.split(':'); schVColMenu(el,k,col); return; }
  if(el=e.target.closest('[data-mtchip]')){ e.stopPropagation(); delete schMtf()[el.dataset.mtchip]; S.mtPage=1; schMeetRedraw(); return; }
  if(el=e.target.closest('[data-vpg]')){ e.stopPropagation(); const k=el.closest('.pager').dataset.vk, key=k==='meet'?'mtPage':'pjPage', v=el.dataset.vpg; let cur=S[key]||1;
    if(v==='prev')cur--; else if(v==='next')cur++; else if(v==='first')cur=1; else if(v==='last')cur=1e9; else cur=+v||1; S[key]=cur; if(k==='meet')schMeetRedraw(); else schProjRedraw(); return; }
},true);
document.addEventListener('input',e=>{ const t=e.target; if(!PREVIEW_ON||!t||!t.matches||!t.matches('input[data-q="meeting"],input[data-q="proj"]'))return; S.q[t.dataset.q]=t.value;
  if(t.dataset.q==='meeting'){ S.mtPage=1; schMeetRedraw(); } else { S.pjPage=1; schProjRedraw(); } });
