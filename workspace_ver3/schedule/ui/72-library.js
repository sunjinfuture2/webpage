// Eighth round (owner, 2026-11-20): a library (the files attached to the meetings, actions or research notes) looks like a wall of
// pins: columns of one width, cards of their own height, a picture where the file is one and a coloured sheet with the kind of
// file where it is not; the name and where it belongs below; on the pointer the two things one can do (download, open the item).
// So that a late project with thousands of files opens at once:
//  - the list is one request that carries no file, only names and sizes (the Worker's /api/files);
//  - cards are made 36 at a time, the next ones when the end of the wall comes near (IntersectionObserver), never all at once;
//  - a picture is only fetched when its card comes near the window (loading="lazy") and is decoded off the main thread;
//  - a card goes to the column that is shortest, so nothing that is already there moves when more arrive.
const SCH_LIB={rows:[],all:[],shown:0,cols:[],h:[],type:'',q:'',kind:'',io:null};
const SCH_LIB_KIND=[['','전체'],['img','이미지'],['pdf','PDF'],['doc','문서'],['sheet','표'],['slide','발표'],['etc','기타']];
const schLibExt=n=>{const m=/\.([a-z0-9]{1,6})$/i.exec(n||'');return m?m[1].toLowerCase():'';};
function schLibKind(f){ const e=schLibExt(f.name), t=String(f.type||''); if(/^image\/(png|jpe?g|gif|webp)$/.test(t)||/^(png|jpe?g|gif|webp)$/.test(e))return 'img'; if(e==='pdf')return 'pdf'; if(/^(docx?|hwpx?|txt|md|rtf)$/.test(e))return 'doc'; if(/^(xlsx?|csv)$/.test(e))return 'sheet'; if(/^(pptx?|key)$/.test(e))return 'slide'; return 'etc'; }
const SCH_LIB_TILE={pdf:[250,'#fbe9e7','#c0392b'],doc:[215,'#e8f0fb','#2c5fa8'],sheet:[185,'#e7f4ea','#1e7b3c'],slide:[200,'#fdf0e3','#c66a12'],etc:[160,'#f0f0ef','#6f6f6f']};
function schLibCard(f){ const it=item(f.item), kind=schLibKind(f), ext=(schLibExt(f.name)||'file').toUpperCase(), who=f.employee?userName(f.employee):'', when=(f.at||'').slice(0,10).replace(/-/g,'.');
  const media=kind==='img'?`<img src="/api/file/${esc(f.id)}?inline=1" alt="" loading="lazy" decoding="async">`:`<div class="lb-tile" style="height:${SCH_LIB_TILE[kind][0]}px;background:${SCH_LIB_TILE[kind][1]};color:${SCH_LIB_TILE[kind][2]}"><b>${esc(ext)}</b><span>${esc(f.name)}</span></div>`;
  return `<div class="lb-card ${kind==='img'?'img':''}" data-fid="${esc(f.id)}"><div class="lb-media">${media}<div class="lb-ov"><a class="lb-bt dl" href="/api/file/${esc(f.id)}" download="${esc(f.name)}" data-stop title="내려받기">${svg('i-dl',11,12)}다운로드</a>${it?`<button class="lb-bt" data-open="${esc(it.id)}" title="이 파일이 첨부된 내용 열기">내용 보기</button>`:''}</div></div>
    <div class="lb-t" title="${esc(f.name)}">${esc(f.name)}</div><div class="lb-s">${it?esc(oneLine(it.title)||'제목 없음'):''}</div><div class="lb-m">${[who,when,f.size?fmtSize(f.size):''].filter(Boolean).map(esc).join(' · ')}</div></div>`; }
function schLibDraw(pin,type,label,rows){ const L=SCH_LIB; if(L.type!==type){L.q='';L.kind='';} L.type=type; L.all=rows; if(L.io){L.io.disconnect();L.io=null;}
  pin.innerHTML=`<div class="lib-view lb"><div class="libhd"><b>${esc(label)} 라이브러리</b><span class="m" id="lb-cnt"></span></div>
    <div class="lb-bar"><label class="lb-q">${svg('pic-search',15,15)}<input id="lb-q" placeholder="파일 이름 · 내용 제목 검색" value="${esc(L.q)}" autocomplete="off"></label><div class="lb-kinds">${SCH_LIB_KIND.map(([k,t])=>`<button class="${L.kind===k?'on':''}" data-lbk="${k}">${t}</button>`).join('')}</div></div>
    <div class="lb-wall" id="lb-wall"></div><div class="lb-more" id="lb-more"></div></div>`;
  schLibFill(); }
// The wall for what is asked for now (search, kind): columns by the room there is, the first cards, a watch on its end.
function schLibFill(){ const L=SCH_LIB, wall=$('#lb-wall'), more=$('#lb-more'); if(!wall)return; const q=norm(L.q);
  L.rows=L.all.filter(f=>(!L.kind||schLibKind(f)===L.kind)&&(!q||norm(f.name).includes(q)||norm((item(f.item)||{}).title||'').includes(q)));
  const cnt=$('#lb-cnt'); if(cnt)cnt.textContent=L.rows.length===L.all.length?`${L.all.length}개 파일`:`${L.all.length}개 중 ${L.rows.length}개`;
  if(!L.all.length){ wall.innerHTML=''; more.innerHTML=`<div class="libempty">첨부된 파일이 아직 없습니다.<br>내용을 수정할 때 첨부한 파일과 이미지가 여기에 모입니다.</div>`; return; }
  if(!L.rows.length){ wall.innerHTML=''; more.innerHTML='<div class="libempty">조건에 맞는 파일이 없습니다.</div>'; return; }
  const z=LAYOUT.zoom||1, w=wall.getBoundingClientRect().width/z, n=Math.max(2,Math.min(7,Math.floor((w+16)/(210+16))));
  wall.innerHTML=Array.from({length:n},()=>'<div class="lb-col"></div>').join(''); L.cols=[...wall.children]; L.h=L.cols.map(()=>0); L.shown=0; more.innerHTML='<i class="lb-end" id="lb-end"></i>';
  schLibMore(); if(L.io)L.io.disconnect(); L.io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting))schLibMore(); },{root:$('#panel'),rootMargin:'0px 0px 900px 0px'}); const end=$('#lb-end'); if(end)L.io.observe(end); }
function schLibMore(){ const L=SCH_LIB; if(!L.cols.length||L.shown>=L.rows.length)return; const part=L.rows.slice(L.shown,L.shown+36), cw=L.cols[0].getBoundingClientRect().width/(LAYOUT.zoom||1)||236;
  for(const f of part){ let c=0; for(let i=1;i<L.h.length;i++)if(L.h[i]<L.h[c]-1)c=i; const kind=schLibKind(f); L.cols[c].insertAdjacentHTML('beforeend',schLibCard(f));
    L.h[c]+=(kind==='img'?cw*0.78:SCH_LIB_TILE[kind][0])+78;   // a picture's height is not known before it has come: taken as a little wider than tall, put right when it loads
    if(kind==='img'){ const card=L.cols[c].lastElementChild, im=card.querySelector('img'), col=c, guess=cw*0.78; im.addEventListener('load',()=>{ if(im.naturalWidth)L.h[col]+=cw*im.naturalHeight/im.naturalWidth-guess; card.classList.add('in'); },{once:true}); im.addEventListener('error',()=>{card.classList.add('bad');},{once:true}); } }
  L.shown+=part.length; const more=$('#lb-more'); if(L.shown>=L.rows.length&&more){ if(L.io){L.io.disconnect();L.io=null;} more.innerHTML=L.rows.length>36?`<div class="lb-done">${L.rows.length}개를 모두 보여 드렸습니다</div>`:''; } }
let schLibT=0;
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='lb-q'){ SCH_LIB.q=e.target.value; clearTimeout(schLibT); schLibT=setTimeout(schLibFill,160); } });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-lbk]'); if(!b)return; e.stopPropagation(); SCH_LIB.kind=b.dataset.lbk; $$('.lb-kinds button').forEach(x=>x.classList.toggle('on',x===b)); schLibFill(); },true);
window.addEventListener('resize',()=>{ if($('#lb-wall')&&SCH_LIB.all.length){ clearTimeout(schLibT); schLibT=setTimeout(()=>{ const wall=$('#lb-wall'); if(!wall)return; const n=Math.max(2,Math.min(7,Math.floor((wall.getBoundingClientRect().width/(LAYOUT.zoom||1)+16)/226))); if(n!==SCH_LIB.cols.length)schLibFill(); },200); } });
