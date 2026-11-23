// Eleventh round (owner, 2026-11-23): the archive while the preview is on.
//  - Its search and the kinds of document stand at the top; the documents and the reference sites are two views of the page
//    (documents first), so finding a document does not mean scrolling past every site card.
//  - The document table shows the importance too; a title that opens a site carries a pale link pictogram at its right;
//    the last column is the Dropbox address (an arrow, as in the action lists) instead of the source's name.
//  - The search looks through every kind at once (title, source, address, assignees, text) and through the site cards.
// renderArchive (original.html) hands over to schArchRender; every handler of the page (tabs, + buttons, menus, pages) is the old one.
const SCH_ARCH={q:'',view:'docs'};
const schArchDbx=r=>{ const d=String(r.dbx||'').trim(); if(d)return d; const u=String(r.url||'').trim(); return /^(https?:\/\/)?(www\.)?dropbox\.com\/\S+/i.test(u)&&!/^dropbox\.com\.{3,}$/.test(u)?u:''; };
const schArchLink=r=>{ const u=urlHref(r.url); return u&&!/^dropbox\.com\.{3,}$/.test(String(r.url||'').trim())?u:''; };   // the address the title opens, if it opens one
const schArchText=r=>String(r.body||'').replace(/<[^>]+>/g,' ');
function schArchFind(q){ const docs=[], cards=[]; for(const t of ARCH_TABS)for(const r of archList(t))if(matchQ(q,r.title,r.src,r.url,r.dbx,t,...(r.people||[]).map(userName),schArchText(r)))docs.push({r,t});
  ARCH_SECTIONS.forEach((sec,si)=>sec.cards.forEach(c=>{ if(!c.trash&&matchQ(q,c.name,c.desc,c.url,c.note,sec.name))cards.push({c,si}); })); return {docs,cards}; }
function schArchRow(r,t){ const u=schArchLink(r), ttl=esc(oneLine(r.title)), dbx=schArchDbx(r);
  return `<div class="rw" data-open="${r.id}"><div class="ttl">${(r.dot||isFresh(r)||(r.dots||[]).includes('g'))?'<i class="gd"></i>':''}${t?`<span class="ar-cat">${esc(t)}</span>`:''}${u?`<a class="tx ttl-link" href="${esc(u)}" target="_blank" rel="noopener" data-stop title="사이트 열기">${ttl}</a><i class="ttl-ic" title="제목을 누르면 사이트가 새 탭에서 열립니다">${svg('i-sch-link',13,13)}</i>`:`<span class="tx">${ttl}</span>`}<span class="acts"><button class="sh-btn" data-act="open" data-id="${r.id}">열기</button>${hasFiles(r)?`<button class="sh-btn" data-act="dl" data-id="${r.id}">다운로드 ${svg('i-dl',10,11,'color:#4f4f4f;margin-top:1px')}</button>`:''}</span></div>
    <div class="who">${(r.people||[]).map(k=>`<span data-user="${esc(k)}">${av()}${esc(userName(k))}</span>`).join('')||'<span class="nil">-</span>'}</div><div class="d">${esc(dateShow(r))}</div><div class="pr"><span class="pri pri-${r.pri||'mid'}">${priTxt[r.pri||'mid']}</span></div><div class="mod">${esc(modTxt(r,true))}</div><div class="src">${schUrlCell(dbx)}</div></div>`; }
function schArchDocsHtml(found){ const q=SCH_ARCH.q.trim(), rows=q?found.docs:archList(S.archTab).map(r=>({r,t:''})), total=Math.max(1,Math.ceil(rows.length/10)); S.archPage=Math.min(Math.max(1,S.archPage),total); const page=rows.slice((S.archPage-1)*10,S.archPage*10);
  return `<div class="tabs ${q?'searching':''}" style="--tabn:${ARCH_TABS.length};--tabidx:${Math.max(0,ARCH_TABS.indexOf(S.archTab))}">${plusBtn('addtab','이 구분에 자료 추가').replace('class="sh-btn','data-addrow class="sh-btn')}<button class="tabmenu" data-tabmenu title="탭 추가 · 이름 변경 · 삭제">${svg('i-more2',2.5,13.7)}</button><ul style="height:53.5px">${ARCH_TABS.map(t=>`<li class="${!q&&t===S.archTab?'on':''}" data-tab="${esc(t)}">${esc(t)}${q?`<small>${found.docs.filter(x=>x.t===t).length}</small>`:''}</li>`).join('')}</ul><div class="bar"><i style="left:calc(100%/${ARCH_TABS.length}*${Math.max(0,ARCH_TABS.indexOf(S.archTab))})"></i></div></div>
    ${q?`<div class="ar-note">모든 분류에서 찾은 문서 <b>${rows.length}</b>건 · 분류 이름을 누르면 검색을 지우고 그 분류로 이동</div>`:''}
    <div class="tbl archive pv"><div class="hd"><span><em>제목</em></span><span><em>담당자</em></span><span><em>기한</em></span><span><em>중요도</em></span><span><em>최종수정일자</em></span><span><em>드롭박스 URL</em></span></div>
    ${page.map(x=>schArchRow(x.r,x.t)).join('')}${page.length?'':`<div class="none">${q?'검색어에 맞는 문서가 없습니다.':'등록된 자료가 없습니다. 탭 위의 + 버튼으로 추가하세요.'}</div>`}<div class="ft"></div></div>${pager(S.archPage,total,'pg-arch').replace('class="pager','style="margin-top:44px" class="pager')}`; }
function schArchSitesHtml(found){ const q=SCH_ARCH.q.trim(); let h='', n=0;
  ARCH_SECTIONS.forEach((sec,si)=>{ const live=sec.cards.filter(c=>!c.trash&&(!q||found.cards.some(x=>x.c===c))); if(q&&!live.length)return;
    h+=`<div class="asec" style="${n++===0?'padding-top:0':'padding-top:58px'}"><div class="h"><span class="nm" data-secname="${si}">${esc(sec.name)}</span><button class="menu" data-secmenu="${si}">${svg('i-more2',2.5,13.7)}</button></div>`;
    const cells=[...live.map(c=>({c})),...(q?[]:[{add:true}])], nrows=Math.ceil(cells.length/4); h+=`<div class="agrid">`;
    for(let r=0;r<nrows;r++)for(let k=0;k<4;k++){ const idx=r*4+k, cell=cells[idx], full=(r*4+3<cells.length)&&!cells[r*4+3].add;
      if(!cell){h+=`<div class="cell" style="border-left:0"></div>`;continue;}
      h+=`<div class="cell ${k===3&&full?'last-line':''} ${k===0?'first':''}">`;
      if(cell.add)h+=plusBtn('add','자료 추가').replace('class="sh-btn','data-addcard="'+si+'" class="sh-btn');
      else h+=`<div class="acard" data-acard="${si}:${cell.c.id}"><div class="ic"><svg class="pict" aria-hidden="true"><use href="#pic-research"/></svg>${logoImg(cell.c.url)}</div><h4 title="${esc(cell.c.name)}">${urlHref(cell.c.url==='#'?'':cell.c.url)?`<a class="ttl-link" href="${esc(urlHref(cell.c.url))}" target="_blank" rel="noopener" data-stop title="사이트 열기">${esc(cell.c.name)}</a>`:esc(cell.c.name)}</h4><p>${esc(cell.c.desc)}</p><button class="more" data-cardmenu="${si}:${cell.c.id}">${svg('i-more2',2.5,13.7)}</button></div>`;
      h+=`</div>`; }
    h+=`</div></div>`; });
  if(q&&!n)h+='<div class="ar-none">검색어에 맞는 참고사이트가 없습니다.</div>';
  return h+(q?'':`<button class="sh-btn newsec" data-newsec>구분 새로 만들기</button>`); }
function schArchBody(){ const q=SCH_ARCH.q.trim(), found=q?schArchFind(q):{docs:[],cards:[]}, docsN=q?found.docs.length:ARCH_TABS.reduce((n,t)=>n+archList(t).length,0), sitesN=q?found.cards.length:ARCH_SECTIONS.reduce((n,s)=>n+s.cards.filter(c=>!c.trash).length,0);
  $$('#arch-pw [data-arview]').forEach(b=>{ b.classList.toggle('on',b.dataset.arview===SCH_ARCH.view); const s=b.querySelector('small'); if(s)s.textContent=b.dataset.arview==='docs'?docsN:sitesN; });
  const box=$('#ar-body'); if(box)box.innerHTML=SCH_ARCH.view==='sites'?`<div class="ar-sites">${schArchSitesHtml(found)}</div>`:`<div class="ar-docs">${schArchDocsHtml(found)}</div>`; }
function schArchRender(){ if(!ARCH_TABS.includes(S.archTab))S.archTab=ARCH_TABS[0]||''; const pw=$('#arch-pw'), keep=pw.querySelector('input[data-arq]'), had=keep&&document.activeElement===keep, pos=had?keep.selectionStart:0;
  pw.innerHTML=`<div class="arch-title">자료실</div><div class="ar-pv"><div class="ar-top"><div class="ar-views" role="tablist"><button data-arview="docs" role="tab">문서 목록<small></small></button><button data-arview="sites" role="tab">참고사이트<small></small></button></div>
      <label class="srch box ar-q" title="자료실 검색">${svg('pic-search',15,15)}<input data-arq placeholder="자료실 검색 (문서 · 참고사이트)" aria-label="자료실 검색" value="${esc(SCH_ARCH.q)}" autocomplete="off">${qx(SCH_ARCH.q)}</label></div>
    <div id="ar-body"></div>${partnerSection('margin-top:120px;padding-bottom:206.7px')}</div>`;
  schArchBody(); if(had){ const i=pw.querySelector('input[data-arq]'); if(i){i.focus();try{i.setSelectionRange(pos,pos);}catch(_){}} } }
let schArchT=0;
document.addEventListener('input',e=>{ const t=e.target; if(!t||!t.matches||!t.matches('input[data-arq]'))return; SCH_ARCH.q=t.value; S.archPage=1; clearTimeout(schArchT); schArchT=setTimeout(schArchBody,140); });
document.addEventListener('click',e=>{ if(!PREVIEW_ON||!e.target.closest)return; const v=e.target.closest('#arch-pw [data-arview]');
  if(v){ e.stopPropagation(); SCH_ARCH.view=v.dataset.arview; S.archPage=1; schArchBody(); return; }
  const tab=e.target.closest('#arch-pw .tabs.searching [data-tab]'); if(tab){ SCH_ARCH.q=''; const i=$('#arch-pw input[data-arq]'); if(i){i.value='';const x=i.parentElement.querySelector('.q-x');if(x)x.hidden=true;} }   // the page's own handler then opens that kind
},true);
