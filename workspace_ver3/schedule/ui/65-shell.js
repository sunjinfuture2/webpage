// Sixth round (owner, 2026-11-20), the frame around the pages while the preview is on: the tree of recent items in the sidebar,
// notices with a title and a text, the footer.

/* ---------- recent items: project › kind › item (the owner's picture) ---------- */
const schRecOff=()=>{try{return new Set(JSON.parse(localStorage.getItem('aidc-recoff')||'[]'));}catch{return new Set();}};
function schRecentHtml(){ const G=new Map(), off=schRecOff();
  const grp=(key,label,go)=>{ if(!G.has(key))G.set(key,{label,go,kinds:new Map()}); return G.get(key); };
  for(const k of S.recent){
    if(k==='archive'){grp('archive','자료실','archive');continue;}
    if(k.startsWith('project:')){const p=PROJECTS[k.slice(8)]; if(p)grp(k,pname(p),k); continue;}
    if(!k.startsWith('item:'))continue; const id=k.slice(5), it=item(id); if(!it||(ITEMS.includes(it)&&!canSee(it)))continue;
    let g, kind; const tab=archTabOf(it);
    if(it.agent){g=grp('agent','에이전트','');kind='에이전트 페이지';}
    else if(freeResearch(it)){g=grp('research','리서치','');kind='';}
    else if(tab){g=grp('archive','자료실','archive');kind=tab;}
    else {const p=PROJECTS[it.proj]; g=p?grp('project:'+it.proj,pname(p),'project:'+it.proj):grp('etc','기타',''); kind=TYPE_NAME[it.type]||'기타';}
    if(!g.kinds.has(kind))g.kinds.set(kind,[]); g.kinds.get(kind).push({id,title:oneLine(it.title)||'제목 없음'}); }
  let h='';
  for(const [key,g] of G){ h+=`<div class="item r0" ${g.go?`data-go="${esc(g.go)}"`:''}><span class="tx">${esc(g.label)}</span></div>`;
    for(const [kind,list] of g.kinds){ const rk=key+'|'+kind, shut=off.has(rk);
      if(!kind){ h+=list.map(x=>`<div class="item r2 flat" data-open="${esc(x.id)}" title="${esc(x.title)}"><i class="dot"></i><span class="tx">${esc(x.title)}</span></div>`).join(''); continue; }   // no kind between the group and its items
      h+=`<div class="item ${shut?'r3':'r1'}" data-rec="${esc(rk)}" role="button" aria-expanded="${!shut}" title="${shut?'펼치기':'접기'}">${shut?svg('i-chev-r',3.6,6.3,'color:#8e8e8e'):svg('i-chev-d',7.1,3.5,'color:#8e8e8e')}<span class="tx">${esc(kind)}</span></div>`;
      if(!shut)h+=list.map(x=>`<div class="item r2" data-open="${esc(x.id)}" title="${esc(x.title)}"><i class="dot"></i><span class="tx">${esc(x.title)}</span></div>`).join(''); } }
  return h||'<div class="item none"><span class="tx">최근 연 항목이 여기에 표시됩니다</span></div>'; }

/* ---------- notices: a title and a text; + while the bar is open; new ones carry a green mark ---------- */
const schNtTitle=x=>x.title||String(x.text||'').split(' — ')[0];
const schNtBody=x=>x.body!==undefined?x.body:String(x.text||'').split(' — ').slice(1).join(' — ');
const schNtList=()=>NOTICES.slice().sort((a,b)=>String(b.at||b.date).localeCompare(String(a.at||a.date)));
// New for me: somebody else's notice of the last 14 days that I have not opened.
function schNtNew(x){ if(!x||x.by===sharedUser||(INBOX_STATE.nseen||[]).includes(x.id))return false; const t=new Date(x.at||x.date+'T00:00:00').getTime(); return isFinite(t)&&Date.now()-t<14*864e5; }
function schNoticeDraw(){ const n=$('#notice'); if(!n)return; const act=document.activeElement; if(act&&n.contains(act)&&act.matches('input,textarea'))return;   // somebody is writing one
  const list=schNtList(), fresh=list.filter(schNtNew).length, ui=SCH.nt||(SCH.nt={});
  if(!$('.nplus',n))n.insertAdjacentHTML('beforeend',`<button class="nplus" data-nt="add" title="공지사항 쓰기" aria-label="공지사항 쓰기">${svg('i-plus',10,10)}</button>`);
  $('.lb',n).innerHTML=`공지사항${fresh?`<i class="nb" title="새 공지 ${fresh}건"></i>`:''}`;
  $('.msg',n).textContent=list.length?schNtTitle(list[0]):'등록된 공지사항이 없습니다.';
  const form=ui.form?`<li class="nform"><input id="nt-title" placeholder="제목" maxlength="60" value="${esc(ui.title||'')}"><textarea id="nt-body" placeholder="내용" rows="3" maxlength="1000">${esc(ui.body||'')}</textarea><div class="bt"><button data-nt="cancel">취소</button><button class="pri" data-nt="save">등록</button></div></li>`:'';
  $('.list',n).innerHTML=form+(list.map(x=>{ const on=ui.open===x.id, body=schNtBody(x);
    return `<li class="nrow ${on?'on':''}" data-nt="open" data-id="${esc(x.id)}"><time>${esc(x.date)}</time><span class="nt">${schNtNew(x)?'<i class="nb" title="새 공지"></i>':''}${esc(schNtTitle(x))}</span><span class="by">${esc(x.by?userName(x.by):'')}</span>${canAdmin()||x.by===sharedUser?`<button class="ndel" data-ndel="${esc(x.id)}" title="공지 삭제">×</button>`:'<span class="ndel"></span>'}</li>${on?`<li class="nbody">${body?esc(body):'<span class="none">내용이 없습니다.</span>'}</li>`:''}`; }).join('')||(form?'':'<li class="nnone">등록된 공지사항이 없습니다. + 버튼으로 첫 공지를 쓰세요.</li>')); }
function schNoticeClose(){ const n=$('#notice'); if(!n||!n.classList.contains('open'))return; const ui=SCH.nt||{}; if(ui.form){const t=$('#nt-title'),b=$('#nt-body'); ui.title=t?t.value:''; ui.body=b?b.value:'';}   // what was typed waits for the next opening
  n.classList.remove('open'); if(document.activeElement&&n.contains(document.activeElement))document.activeElement.blur(); }
function schNoticeSave(){ const t=$('#nt-title'), b=$('#nt-body'), title=(t.value||'').replace(/\s+/g,' ').trim(), body=(b.value||'').trim(); if(!title){t.focus();toast('공지 제목을 입력하세요.');return;}
  const id='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  NOTICES=NOTICES.concat({id,date:TODAY,at:new Date().toISOString(),title,body,text:title+(body?' — '+body.replace(/\s+/g,' '):''),by:sharedUser});
  SCH.nt={open:id}; t.blur(); schNoticeDraw(); toast('공지사항을 등록했습니다.'); }

/* ---------- footer: the same on every page, below the same amount of room ---------- */
// The company's places outside the workspace. Their addresses are a workspace setting (설정 › 워크스페이스 › 일반): the three
// social ones are small grey marks, the two others words. One without an address is pale and says so.
const SCH_FLINKS=[['groupware','그룹웨어'],['home','회사 홈페이지'],['youtube','YouTube'],['instagram','Instagram'],['facebook','Facebook']];
const SCH_FICON={youtube:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.800 19 12 19 12 19s6.2 0 7.8-.4a2.500 2.500 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.200 3z"/></svg>',
  instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M7.500 3h9A4.500 4.500 0 0 1 21 7.500v9a4.500 4.500 0 0 1-4.500 4.500h-9A4.500 4.500 0 0 1 3 16.500v-9A4.500 4.500 0 0 1 7.500 3zm0 1.800A2.700 2.700 0 0 0 4.800 7.500v9a2.700 2.700 0 0 0 2.700 2.700h9a2.700 2.700 0 0 0 2.700-2.700v-9a2.700 2.700 0 0 0-2.700-2.700zM12 7.600a4.400 4.400 0 1 1 0 8.800 4.400 4.400 0 0 1 0-8.800zm0 1.800a2.600 2.600 0 1 0 0 5.200 2.600 2.600 0 0 0 0-5.200zm4.700-3.200a1.050 1.050 0 1 1 0 2.100 1.050 1.050 0 0 1 0-2.100z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-1.560 19.880v-6.990H7.900V12h2.540V9.800c0-2.510 1.490-3.890 3.780-3.890 1.090 0 2.240.190 2.240.190v2.460h-1.260c-1.240 0-1.630.770-1.630 1.560V12h2.770l-.440 2.890h-2.330v6.990A10 10 0 0 0 12 2z"/></svg>'};
function schFooterHtml(){ const ws=SETTINGS.wsName||'AIDC WorkSpace', y=TODAY.slice(0,4), L=SETTINGS.links||{};
  const col=(t,rows)=>`<div class="fc"><b>${t}</b>${rows.join('')}</div>`, a=(attr,t)=>`<a ${attr}>${esc(t)}</a>`;
  const out=(k,t)=>{ const u=urlHref(L[k]||''), ic=SCH_FICON[k]||''; return u?`<a class="fx ${ic?'ic':''}" href="${esc(u)}" target="_blank" rel="noopener" data-stop title="${esc(t)}" aria-label="${esc(t)}">${ic||esc(t)}</a>`:`<a class="fx off ${ic?'ic':''}" data-foot="nolink" data-k="${k}" title="${esc(t)} · 주소가 아직 등록되지 않았습니다" aria-label="${esc(t)}">${ic||esc(t)}</a>`; };
  return `<footer class="pfoot" id="pfoot"><div class="fline"></div><div class="fgrid">
    <div class="fb"><div class="flogo" data-go="main">${esc(ws)}</div><p>${esc(SETTINGS.org||'')}</p><p class="mut">프로젝트의 미팅 · 액션 · 리서치와 일정을 한곳에서 보는 업무 공간.</p><div class="fout">${SCH_FLINKS.filter(x=>!SCH_FICON[x[0]]).map(x=>out(...x)).join('')}<span class="fsns">${SCH_FLINKS.filter(x=>SCH_FICON[x[0]]).map(x=>out(...x)).join('')}</span></div></div>
    ${col('바로가기',[a('data-go="main"','메인 페이지'),a('data-go="archive"','자료실'),a('data-ext="dropbox"','부서 드롭박스'),a('data-foot="search"','검색')])}
    ${col('내 계정',[a('data-foot="account"','계정'),a('data-foot="inbox"','수신함'),a('data-foot="settings"','설정'),a('data-foot="trash"','휴지통')])}
   </div><div class="fend"><span>© ${y} 선진엔지니어링 · ${esc(SETTINGS.org||ws)}</span><span class="sp"></span><span class="mut">사내 업무용 · 외부 공유 금지</span><button class="ftop" data-foot="top" title="맨 위로">맨 위로 ${svg('i-chev-d',8,4,'transform:rotate(180deg)')}</button></div></footer>`; }
// The pictogram of a kind in the calendar, in a colour (the copies made for the section titles take the text colour).
const schCalPict=(type,color)=>`<svg class="pict" aria-hidden="true" style="color:${type==='research'?'#787878':esc(color||'#6f6f6f')}"><use href="#${type==='action'?'i-sch-tag':'i-sch-'+type}"/></svg>`;
// Called after every draw of a page: the footer goes below the page's last section, which ends with the same room everywhere.
function schFooter(){ if(!PREVIEW_ON)return; for(const pw of $$('#main-pw,#proj-pw,#arch-pw')){ const old=$('.pfoot',pw); if(old)old.remove(); if(!pw.closest('.page.on')||!pw.children.length)continue;
    const last=pw.lastElementChild; if(last){last.style.paddingBottom='0px';} pw.insertAdjacentHTML('beforeend',schFooterHtml()); }
  // the colour of the open project, for what is tinted with it on its page (tags of filters, pickers that are set)
  const pg=$('#page-project'); if(pg)pg.style.setProperty('--pjc',S.page==='project'&&PROJECTS[S.proj]?PROJECTS[S.proj].color:'#5c5c5c'); }

/* ---------- sidebar: the name and the arrow of a row are one link, underlined as a whole ---------- */
// (에이전트: name and arrow open the service in a new tab, the square at the right opens its page here; 저장소: the whole row.)
function schSbLinks(){ if(!PREVIEW_ON)return; for(const row of $$('#sb .agent .item')){ if(row.querySelector('.sb-lk'))continue; const tx=row.querySelector('.tx'), ext=row.querySelector('a.service-arrow')||row.querySelector('svg.ext'); if(!tx||!ext)continue;
    const w=document.createElement('span'); w.className='sb-lk'; row.insertBefore(w,tx); w.appendChild(tx); w.appendChild(ext); const c=row.querySelector('.cnt'); if(c)c.title='에이전트 페이지 열기'; } }
schSbLinks();

/* ---------- clicks of this file ---------- */
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const T=e.target; let el;
  if(el=T.closest('[data-rec]')){ const off=schRecOff(), k=el.dataset.rec; if(off.has(k))off.delete(k); else off.add(k); try{localStorage.setItem('aidc-recoff',JSON.stringify([...off].slice(-60)));}catch{} sbState(); return; }
  if(el=T.closest('[data-foot]')){ const k=el.dataset.foot; if(k==='top')$('#content').scrollTo({top:0,behavior:myPref('calm')?'auto':'smooth'}); else if(k==='nolink'){ if(canAdmin()){openModal('settings.general'); toast('설정 › 워크스페이스 › 일반에서 주소를 등록하세요.',3200);} else toast('주소가 아직 등록되지 않았습니다. 소유자·관리자가 설정에서 등록합니다.',3200); }
    else if(k==='search'){const b=$('#sb-search'); if(b){ if($('#app').classList.contains('sb-off')){$('#app').classList.remove('sb-off');render(true);} setTimeout(()=>b.click(),0);} } else openModal(k); return; }
  const n=$('#notice'); if(!n)return;
  if(el=T.closest('#notice [data-nt]')){ const k=el.dataset.nt, ui=SCH.nt||(SCH.nt={});
    if(k==='add'){ ui.form=true; n.classList.add('open'); schNoticeDraw(); const t=$('#nt-title'); if(t)t.focus(); return; }
    if(k==='cancel'){ SCH.nt={open:ui.open}; schNoticeDraw(); return; }
    if(k==='save'){ schNoticeSave(); return; }
    if(k==='open'){ if(T.closest('.ndel'))return; const id=el.dataset.id; ui.open=ui.open===id?null:id; if(ui.form){const t=$('#nt-title'),b=$('#nt-body'); ui.title=t?t.value:''; ui.body=b?b.value:'';}
      if(ui.open&&!(INBOX_STATE.nseen||[]).includes(id)){ const live=new Set(NOTICES.map(x=>x.id)); INBOX_STATE.nseen=(INBOX_STATE.nseen||[]).filter(x=>live.has(x)).concat(id); }
      const a=document.activeElement; if(a&&n.contains(a))a.blur(); schNoticeDraw(); return; } }
  // a click anywhere else closes the open bar
  if(n.classList.contains('open')&&!T.closest('#notice,.dlg,.pop,#toast'))schNoticeClose();
});
document.addEventListener('keydown',e=>{ if(!PREVIEW_ON)return; const t=e.target; if(!t||!t.closest||!t.closest('#notice'))return;
  if(e.key==='Escape'){e.stopPropagation(); schNoticeClose(); return;}
  if(t.id==='nt-title'&&e.key==='Enter'&&!e.isComposing){e.preventDefault(); const b=$('#nt-body'); if(b)b.focus();}
  if(t.id==='nt-body'&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing){e.preventDefault(); schNoticeSave();} },true);
