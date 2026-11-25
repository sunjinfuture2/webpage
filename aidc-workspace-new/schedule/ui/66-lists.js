// Sixth round (owner, 2026-11-20), lists of the main and the project page while the preview is on: filters of the research cards,
// the small tags that show what is filtered, the operation date on a project card, the window that makes a project, partners linked
// from a project's overview with @.

/* ---------- research: a row of pickers above the cards ---------- */
const schRf=()=>S.rf||(S.rf={});
const SCH_RF={when:['기간',{'30':'최근 30일',month:'이번 달',year:'올해',old:'30일보다 이전'}],file:['첨부',{y:'첨부 있음',n:'첨부 없음'}]};
// The tags members write in square brackets in front of a title, most used first (a tag used once is not offered).
// 구분 (owner, 2026-11-23): what a member chose in the detail (`cats` on the item) together with the [..] at the start of the
// title, as before. Every one in use can be filtered by (it used to take two items with the same one), several at once.
const schTagNorm=t=>String(t||'').replace(/\s+/g,' ').trim().toUpperCase();
const schResCats=i=>[...new Set((Array.isArray(i.cats)?i.cats:[]).map(schTagNorm).filter(Boolean))];
const schResTitleTags=i=>[...String(i.title||'').split('\n')[0].matchAll(/\[([^\[\]\n]{1,16})\]/g)].map(m=>schTagNorm(m[1])).filter(Boolean);
const schResTagsOf=i=>[...new Set(schResCats(i).concat(schResTitleTags(i)).filter(t=>t!=='기타'))];
function schResTags(pool){ const n=new Map(); for(const i of pool)for(const t of schResTagsOf(i))n.set(t,(n.get(t)||0)+1); return [...n].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,80); }
const schRfTags=c=>{ if(c.tag){c.tags=[c.tag];delete c.tag;} return Array.isArray(c.tags)?c.tags.filter(t=>schTagNorm(t)!=='기타'):[]; };   // the single choice of before becomes a list
const schTagLabel=t=>t==='-'?'구분 없음':'['+t+']';
// A list one can tick several of; it stays open. all: [[value, count|null]], isOn(value), toggle(value); tail: html below the list.
function schMultiPop(el,title,all,isOn,toggle,tail,none,rename){ const draw=()=>`<div class="hd">${esc(title)}</div>${none?`<div class="it ${all.some(([t])=>isOn(t))?'':'sel'}" data-none>${esc(none)}</div><div class="sep"></div>`:''}`+(all.map(([t,n])=>`<div class="it ${isOn(t)?'sel':''}" data-t="${esc(t)}"><i class="ck">${isOn(t)?svg('i-check',9,7.5):''}</i><b>${esc(schTagLabel(t))}</b>${n!=null?`<span class="n">${n}</span>`:''}${rename&&t!=='-'?`<button type="button" class="rn" data-rn="${esc(t)}" title="이 구분의 이름 바꾸기 (모든 리서치에 적용)">이름 바꾸기</button>`:''}</div>`).join('')||'<div class="msg">아직 쓰인 구분이 없습니다.</div>')+(tail||'');
  const p=openPop(el,draw(),{cls:'sch-colmenu sch-multi'}); p._draw=()=>{const y=p.scrollTop;p.innerHTML=draw();p.scrollTop=y;if(p._after)p._after();};
  p.addEventListener('click',e=>{ const rn=rename&&e.target.closest('[data-rn]'); if(rn){e.stopPropagation();closePop();rename(rn.dataset.rn);return;} const it=e.target.closest('.it[data-t]'), no=e.target.closest('.it[data-none]'); if(no){e.stopPropagation();toggle(null);closePop();return;} if(!it)return; e.stopPropagation(); toggle(it.dataset.t); p._draw(); }); return p; }
// The 구분 of a research note in its detail: chips, and while it is edited a list of those in use to tick and a box for a new one.
// A 구분 renamed in every research note at once (owner, 2026-11-23: a wrong one could only be fixed note by note): the notes' own
// lists and the [..] of their titles. A note somebody else is editing is left out and counted. One undo in the toast.
function schCatRename(old,done){ askInput(`“${old}” 구분의 새 이름 (모든 리서치에 적용)`,old,v=>{ const nw=schTagNorm(v); if(!nw||nw===old)return; const back=[]; let n=0, skip=0;
  for(const i of ITEMS){ if(i.type!=='research'||i.status==='trash')continue; const inC=schResCats(i).includes(old), inT=schResTitleTags(i).includes(old); if(!inC&&!inT)continue;
    if(i.status==='draft'&&i.authorId&&i.authorId!==sharedUser)continue; if(otherLock('item:'+i.id)){skip++;continue;}
    back.push([i.id,Array.isArray(i.cats)?i.cats.slice():null,i.title]);
    if(inC)i.cats=[...new Set(schResCats(i).map(t=>t===old?nw:t))];
    if(inT){ const lines=String(i.title||'').split('\n'); lines[0]=lines[0].replace(/\[([^\[\]\n]{1,16})\]/g,(m,t)=>schTagNorm(t)===old?'['+nw+']':m); i.title=lines.join('\n'); }
    if(!i.editing){i.updatedAt=new Date().toISOString();i.updatedBy=sharedUser;} n++; }
  const c=typeof schRf==='function'?schRf():null; if(c&&Array.isArray(c.tags)&&c.tags.includes(old))c.tags=[...new Set(c.tags.map(t=>t===old?nw:t))];
  render(true); const cur=curItem(); if(cur&&cur.type==='research')rerenderItem(cur.id);
  toast(`구분 “${old}”을(를) “${nw}”(으)로 바꿨습니다 · 리서치 ${n}건${skip?` (다른 멤버가 수정 중인 ${skip}건 제외)`:''}`,6000,{t:'되돌리기',fn:()=>{ for(const [id,cats,title] of back){const i=ITEMS.find(q=>q.id===id); if(!i)continue; if(cats)i.cats=cats; else delete i.cats; i.title=title;} render(true); const q=curItem(); if(q&&q.type==='research')rerenderItem(q.id); }});
  if(done)done(nw); }); }
function schCatsField(it,E){ const own=schResCats(it).filter(t=>t!=='기타'), auto=schResTitleTags(it).filter(t=>t!=='기타'&&!own.includes(t));
  const chips=own.map(t=>`<span class="rc-tag">${esc(t)}${E?`<button type="button" data-pick="uncat" data-k="${esc(t)}" title="이 구분 빼기">${svg('i-x',7,7)}</button>`:''}</span>`).join('')+auto.map(t=>`<span class="rc-tag auto" title="제목의 [${esc(t)}] 에서 온 구분입니다">${esc(t)}</span>`).join('');
  return `<span class="rc-tags">${chips}${E?'<span class="chip add" data-pick="cats">+ 구분 선택</span>':(chips?'':'<span class="plain" style="color:#c4c4c4">없음</span>')}</span>`; }
function schCatsPick(el,it){ const redraw=()=>{ it.dirty=true; const box=$('.rc-tags',pinOf(it)); if(box)box.outerHTML=schCatsField(it,true); };
  const set=l=>{ if(l.length)it.cats=l; else delete it.cats; redraw(); }, has=t=>schResCats(it).includes(t);
  const all=()=>{ const m=new Map(schResTags(liveItems('research',null))); for(const t of schResCats(it))if(t!=='기타'&&!m.has(t))m.set(t,null); return [...m]; };
  let list=all(); const p=schMultiPop(el,'구분 선택 (여러 개 가능)',list,has,t=>{ set(has(t)?schResCats(it).filter(x=>x!==t):schResCats(it).concat(t)); },
    `<div class="msg rc-new"><input id="rc-new" maxlength="16" placeholder="새 구분 입력 후 Enter" autocomplete="off"></div>`,null,old=>schCatRename(old));
  const wire=()=>{ const inp=p.querySelector('#rc-new'); if(!inp)return; inp.addEventListener('keydown',e=>{ if(e.key!=='Enter'||e.isComposing)return; e.preventDefault(); const t=schTagNorm(inp.value); if(!t||t==='기타')return; if(!has(t))set(schResCats(it).concat(t)); if(!list.some(x=>x[0]===t))list.push([t,null]); p._draw(); const n=p.querySelector('#rc-new'); if(n)n.focus(); }); };
  p._after=wire; wire(); }
function schResFilter(list){ const c=schRf(), today=TODAY, d30=localDate(new Date(Date.now()-30*864e5).toISOString());
  list=list.filter(i=>{ const d=i.date||localDate(i.createdAt||'')||'';
    const ts=schRfTags(c); if(ts.length){ const own=schResTagsOf(i); if(!ts.some(t=>t==='-'?!own.length:own.includes(t)))return false; }
    if(c.who&&!(i.people||[]).includes(c.who))return false; if(c.file&&(c.file==='y')!==hasFiles(i))return false;   // 담당자 (the detail says 담당자 too), not who wrote it
    if(c.when==='range'&&!((!c.from||d>=c.from)&&(!c.to||d<=c.to)))return false;
    if(c.when==='30'&&!(d>=d30))return false; if(c.when==='month'&&d.slice(0,7)!==today.slice(0,7))return false; if(c.when==='year'&&d.slice(0,4)!==today.slice(0,4))return false; if(c.when==='old'&&!(d<d30))return false;
    return true; });
  return sortResearch(list); }
function schResChips(pid){ const c=schRf(), out=[], chip=(k,label)=>out.push(`<button class="sch-chip" data-rchip="${k}" title="이 조건 지우기">${esc(label)}<i>✕</i></button>`);
  for(const t of schRfTags(c))chip('tag:'+t,'구분: '+schTagLabel(t)); if(c.who)chip('who','담당자: '+userName(c.who));
  for(const k of ['when','file']){ if(c[k])chip(k,SCH_RF[k][0]+': '+(k==='when'&&c.when==='range'?schRangeTxt(c):(SCH_RF[k][1][c[k]]||c[k]))); }
  return out.join(''); }
function schResBar(pid){ const c=schRf();
  return `<div class="sch-chipwrap"><div class="sch-chiprow" data-chips="res">${schResChips(pid)}</div></div>
    <div class="sch-filters res">${schSf2('rpick','tag',schRfTags(c).length?(schRfTags(c).length===1?schTagLabel(schRfTags(c)[0]):`구분 ${schRfTags(c).length}개`):'전체 구분',!!schRfTags(c).length)}${schSf2('rpick','when',c.when?(c.when==='range'?schRangeTxt(c):SCH_RF.when[1][c.when]):'전체 기간',!!c.when)}${schSf2('rpick','who',c.who?userName(c.who):'전체 담당자',!!c.who)}${schSf2('rpick','file',c.file?SCH_RF.file[1][c.file]:'첨부 전체',!!c.file)}</div>`; }
function schResMenu(el,k){ const c=schRf(), pid=S.page==='project'?S.proj:null, go=()=>{S.resPage=1;refreshSec('research');};
  const fl=(val,item)=>({...item,sel:(c[k]||'')===val,fn:()=>{if(val)c[k]=val;else delete c[k];go();}});
  const pool=liveItems('research',null); let items=[];
  if(k==='tag'){ const has=t=>schRfTags(c).includes(t); schMultiPop(el,'구분 (여러 개 선택 가능)',schResTags(pool).concat([['-',pool.filter(i=>!schResTagsOf(i).length).length]]),has,t=>{ if(t===null)delete c.tags; else{ const l=has(t)?schRfTags(c).filter(x=>x!==t):schRfTags(c).concat(t); if(l.length)c.tags=l; else delete c.tags; } go(); },'','전체 구분',old=>schCatRename(old)); return; }
  else if(k==='who')items=[fl('',{t:'전체 담당자'}),...[...new Set(pool.flatMap(i=>i.people||[]).filter(Boolean))].sort((x,y)=>userName(x).localeCompare(userName(y))).map(u=>fl(u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')}))];
  else items=[fl('',{t:k==='when'?'전체 기간':'첨부 전체'}),...Object.entries(SCH_RF[k][1]).map(([v,t])=>fl(v,{t}))];
  if(k==='when')items.push('-',{t:'직접 설정…',sel:c.when==='range',fn:()=>schRangePick(el,c.from||'',c.to||'',(a,b)=>{ if(a||b){c.when='range';c.from=a;c.to=b;} else{delete c.when;delete c.from;delete c.to;} go(); })});
  menuPop(el,items.map((x,i)=>x==='-'?x:({...x,k:String(i)})),{cls:'sch-colmenu'}); }
const schRangeTxt=c=>`${c.from?schD(c.from):'처음'} ~ ${c.to?schDto(c.from,c.to):'오늘'}`;
// Two months side by side: the first press is the first day, the second the last (pressing an earlier day starts over), the days
// between are shaded while the pointer moves. 적용 hands both back; 지우기 hands back none.
function schRangePick(anchor,from,to,cb){ let a=from||'', b=to||'', hov='', [y,m]=(a||TODAY).split('-').map(Number);
  const month=(yy,mm)=>{ const first=new Date(yy,mm-1,1).getDay(), dim=new Date(yy,mm,0).getDate(); let g=`<div class="rp-m"><div class="rp-t">${yy}년 ${mm}월</div><div class="rp-g">${['일','월','화','수','목','금','토'].map(x=>`<span>${x}</span>`).join('')}${'<b></b>'.repeat(first)}`;
    const hi=b||(a&&hov&&hov>=a?hov:'');
    for(let n=1;n<=dim;n++){ const ds=ymd(yy,mm,n), cls=[ds===a?'a':'',ds===b?'b':'',a&&hi&&ds>a&&ds<hi?'in':'',!b&&a&&ds===hi&&ds!==a?'hv':'',ds===TODAY?'tdy':''].filter(Boolean).join(' '); g+=`<button data-rd="${ds}" class="${cls}">${n}</button>`; }
    return g+'</div></div>'; };
  const draw=()=>{ const m2=m===12?1:m+1, y2=m===12?y+1:y; return `<div class="rp"><div class="rp-h"><button data-rn="-1" aria-label="이전 달">‹</button><span class="rp-s"><em class="${a?'':'ph'}">${a?schD(a):'시작일'}</em>${svg('i-sch-arr',12,8)}<em class="${b?'':'ph'}">${b?schDto(a,b):'종료일'}</em></span><button data-rn="1" aria-label="다음 달">›</button></div><div class="rp-ms">${month(y,m)}${month(y2,m2)}</div><div class="rp-f"><span>${!a?'시작일을 누르세요':!b?'종료일을 누르세요':'기간이 정해졌습니다'}</span><button data-rx="clear">지우기</button><button data-rx="ok" class="pri" ${a?'':'disabled'}>적용</button></div></div>`; };
  const p=openPop(anchor,draw(),{cls:'sch-rp'}), redraw=()=>{p.innerHTML=draw();};
  p.addEventListener('click',e=>{ e.stopPropagation(); const t=e.target.closest('button'); if(!t)return;
    if(t.dataset.rn){ m+=+t.dataset.rn; if(m<1){m=12;y--;} if(m>12){m=1;y++;} redraw(); }
    else if(t.dataset.rd){ const d=t.dataset.rd; if(!a||b||d<a){a=d;b='';} else b=d; hov=''; redraw(); }
    else if(t.dataset.rx==='clear'){ closePop(); cb('',''); }
    else if(t.dataset.rx==='ok'&&a){ closePop(); cb(a,b||a); } });
  p.addEventListener('mouseover',e=>{ const t=e.target.closest('[data-rd]'); if(!t||!a||b)return; if(hov!==t.dataset.rd){ hov=t.dataset.rd; p.querySelectorAll('[data-rd]').forEach(x=>{ const ds=x.dataset.rd; x.classList.toggle('in',hov>a&&ds>a&&ds<hov); x.classList.toggle('hv',ds===hov&&ds>a); }); } }); }
// As many cards on a page as fill whole rows (two rows; the number of columns follows the width, so nothing is left empty when the
// sidebar is folded).
function schResPer(){ const t=document.createElement('div'); t.style.cssText='position:absolute;visibility:hidden;height:0;width:var(--pw)'; $('#app').appendChild(t); const w=t.offsetWidth; t.remove();
  return Math.max(1,Math.floor((w+15)/(210.3+15)))*2; }   // (the gap of .sch-on .rgrid)
// the tag of the partner list's filter (구분)
const schPartnerChips=()=>S.partnerCat?`<button class="sch-chip" data-catclear title="이 조건 지우기">구분: ${esc(S.partnerCat)}<i>✕</i></button>`:'';

/* ---------- project cards: a row of pickers, and how tall a card's picture is ---------- */
// (owner, 2026-11-20: a few plain ones only; 2026-11-24: the ones of the development review list) 구분 · 추진 단계 · 위치 · 담당자 ·
// 집중 추진 · 정렬. Without an order of its own the list stands as the review list has it (group, 최초자료일, see schRepSort).
const schPf=()=>S.pf||(S.pf={});
const SCH_PSORT={first:'최초자료일 최근 순',name:'이름순',ops:'운영개시 빠른 순',new:'최근 만든 순'};
const schProjOwner=k=>String((PHEAD[k]||{}).owner||PROJECTS[k].owner||'').trim();
function schProjFilter(ids){ const c=schPf(), q=((S.q||{}).proj||'').trim();
  ids=ids.filter(k=>{ const r=schRepOf(k); return (!c.st||r.stage===c.st)&&(!c.owner||schProjOwner(k)===c.owner)&&(!c.grp||r.grp===c.grp)&&(!c.focus||r.focus)&&(!c.region||schRepRegion(k)===c.region); });
  if(q)ids=ids.filter(k=>{ const p=PROJECTS[k], r=schRepOf(k); return matchQ(q,p.full,pname(p),p.tag,r.sub,r.stage,r.grp,r.site,r.dev,r.load,r.memo,schProjOwner(k)); });   // the search box of the section (twenty-first round)
  const ops=k=>{const m=schHas(k)?schModel(k):null;return (m&&m.res.operationDate)||'9999';};
  if(c.sort==='name')ids=ids.slice().sort((a,b)=>String(PROJECTS[a].full||'').localeCompare(String(PROJECTS[b].full||''),'ko'));
  else if(c.sort==='ops')ids=ids.slice().sort((a,b)=>ops(a).localeCompare(ops(b)));
  else if(c.sort==='new')ids=ids.slice().sort((a,b)=>(/^p\d{10,}$/.test(b)?+b.slice(1):0)-(/^p\d{10,}$/.test(a)?+a.slice(1):0));
  else if(c.sort==='first')ids=ids.slice().sort((a,b)=>schRepKey(schRepOf(b).first).replace('9999','0000').localeCompare(schRepKey(schRepOf(a).first).replace('9999','0000')));
  return ids; }
function schProjBar(){ const c=schPf(), chip=(k,label)=>`<button class="sch-chip" data-pchip="${k}" title="이 조건 지우기">${esc(label)}<i>✕</i></button>`;
  const chips=(c.grp?chip('grp','구분: '+c.grp):'')+(c.st?chip('st','추진 단계: '+c.st):'')+(c.region?chip('region','위치: '+c.region):'')+(c.owner?chip('owner','담당자: '+c.owner):'')+(c.focus?chip('focus','집중 추진만'):'')+(c.sort?chip('sort','정렬: '+SCH_PSORT[c.sort]):'');
  return `<div class="pfil"><div class="sch-chiprow" data-chips="proj">${chips}</div><div class="sch-filters">${schSf2('ppick','grp',c.grp||'전체 구분',!!c.grp)}${schSf2('ppick','st',c.st||'전체 단계',!!c.st)}${schSf2('ppick','region',c.region||'전체 위치',!!c.region)}${schSf2('ppick','owner',c.owner||'전체 담당자',!!c.owner)}${schSf2('ppick','focus',c.focus?'집중 추진만':'집중 추진 포함',!!c.focus)}${schSf2('ppick','sort',c.sort?SCH_PSORT[c.sort]:'기본 순서',!!c.sort)}<div class="right"><button class="sh-btn lib sch-xl" data-mainexp title="프로젝트 개요를 내보냅니다: 목록과 프로젝트별 1장 요약 (PDF · Word · 엑셀)">${svg('i-sch-fdn',12,12)}내보내기</button></div></div></div>`; }
function schProjMenu(el,k){ const c=schPf(), go=()=>{S.car.proj=0;S.pjPage=1;render(true);}, fl=(key,val,item)=>({...item,sel:(c[key]||'')===val,fn:()=>{if(val)c[key]=val;else delete c[key];go();}}), dot=(s,col)=>`<span style="display:inline-flex;align-items:center;gap:7px"><i style="width:6px;height:6px;border-radius:50%;background:${col}"></i>${esc(s)}</span>`;
  const all=orderedProjects(), sts=[...new Set(all.map(p=>normStatus(PROJECTS[p].status)).filter(Boolean))].sort((x,y)=>(PSTATUS_ORDER.indexOf(x)+1||99)-(PSTATUS_ORDER.indexOf(y)+1||99));
  const grp=()=>[fl('grp','',{t:'전체 구분'}),...REP_GRPS.map(g=>fl('grp',g,{t:g}))], focus=()=>[fl('focus','',{t:'집중 추진 포함 (전체)'}),fl('focus','1',{t:'집중 추진만',html:'<span style="color:#d9202e;font-weight:600">집중 추진만</span>'})];
  const sort=keys=>[fl('sort','',{t:'기본 순서 (번호순)'}),...keys.map(v=>fl('sort',v,{t:SCH_PSORT[v]}))]; let items;
  if(k==='st')items=[fl('st','',{t:'전체 단계'}),...sts.map(s=>fl('st',s,{t:s,html:dot(s,PSTATUS[s]||'#8e8e8e')}))];
  else if(k==='owner')items=[fl('owner','',{t:'전체 담당자'}),...[...new Set(all.map(schProjOwner).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')).map(o=>fl('owner',o,{t:o,ico:av('av15')}))];
  else if(k==='grp')items=grp();
  else if(k==='focus')items=focus();
  else if(k==='region')items=[fl('region','',{t:'전체 위치'}),...[...new Set(all.map(schRepRegion).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')).map(r=>fl('region',r,{t:r}))];
  else if(k==='name')items=[{hd:'정렬'},...sort(['name','ops','new']),'-',{hd:'구분'},...grp(),'-',{hd:'집중 추진'},...focus()];   // the table's column 프로젝트
  else if(k==='first')items=[{hd:'정렬'},...sort(['first'])];                                                                    // the table's column 최초자료일
  else items=sort(Object.keys(SCH_PSORT));
  menuPop(el,items.map((x,i)=>x==='-'?x:{...x,k:String(i)}),{cls:'sch-colmenu'}); }
// A card's picture: without one, the height of 판교's card; with one, as tall as the picture's own shape makes it at the card's width,
// but never taller than 부산's card was (what is over is cut evenly above and below) and never a sliver.
const SCH_IMG={w:379.5,base:207.8,max:296.2,min:150};
const schCardImgH=p=>p.img&&p.imgR>0?Math.round(Math.max(SCH_IMG.min,Math.min(SCH_IMG.max,SCH_IMG.w*p.imgR))*10)/10:SCH_IMG.base;
const schImgRatio=file=>new Promise(ok=>{ const u=URL.createObjectURL(file), im=new Image(); im.onload=()=>{URL.revokeObjectURL(u);ok(im.naturalWidth?Math.round(im.naturalHeight/im.naturalWidth*1000)/1000:0);}; im.onerror=()=>{URL.revokeObjectURL(u);ok(0);}; im.src=u; });
// a picture put up before its shape was recorded: measured when it has loaded (for this view only)
document.addEventListener('load',e=>{ const im=e.target; if(!PREVIEW_ON||!im||!im.matches||!im.matches('.pcard .img .photo'))return; const p=PROJECTS[im.dataset.pk]; if(!p||p.imgR>0||!im.naturalWidth)return;
  im.parentElement.style.height=schCardImgH({img:1,imgR:im.naturalHeight/im.naturalWidth})+'px'; },true);

/* ---------- project cards: the operation date the schedule arrives at ---------- */
function schCardOps(k){ if(!schHas(k))return '<span class="nil">미정</span>'; const m=schModel(k); if(!m)return '<span class="nil">계산 중…</span>'; const d=m.res.operationDelay;
  if(!m.res.operationDate)return '<span class="nil">미정</span>';
  return `${schD(m.res.operationDate)}${d?`<em class="${d>0?'late':'early'}">${d>0?'+':''}${d}일</em>`:''}`; }

/* ---------- the window that makes a project ---------- */
// (thirty-third round, owner 2026-11-24) A project is made from a document — a PDF or an Excel file whose content fills the overview
// (89-docread.js) — or, without one, from its group and its name. The field for the document looks like the Excel upload's;
// 부지 and the PDF that was only attached are gone. The button is on when there is a name, or a document that could be read.
function schNewProject(){ closePop(); const old=$('#dlg'); if(old)old.remove(); const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-np sch-npdoc'; let st=PSTATUS_ORDER[0], grp=REP_GRPS[0], busy=false, auto=''; const doc={};
  const sts=PSTATUS_ORDER;
  d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="새 프로젝트"><div class="np-hd"><b>새 프로젝트</b><span>문서를 올리면 그 내용으로 사업개요를 채웁니다. 문서 없이 구분과 사업명만으로도 만들 수 있습니다.</span></div>
    <div class="np-doc sch-up" data-docfield></div><p class="np-many" id="np2-many" hidden></p>
    <div class="np-f"><label for="np2-name">사업명 <em>필수</em></label><div><input id="np2-name" maxlength="60" placeholder="예: 대전 AI 데이터센터" autocomplete="off"><small class="err" id="np2-err"></small></div>
      <label>구분</label><div class="np-st" id="np2-grp">${REP_GRPS.map(g=>`<button type="button" data-grp="${g}" class="${g===grp?'on':''}">${g}</button>`).join('')}</div>
      <label>추진 단계</label><div class="np-st" id="np2-st">${sts.map(s=>`<button type="button" data-st="${s}" class="${s===st?'on':''}"><i style="background:${PSTATUS[s]}"></i>${s}</button>`).join('')}</div>
      <label for="np2-owner">담당자</label><div><input id="np2-owner" maxlength="40" value="${esc(sharedName)}" autocomplete="off"></div></div>
    <div class="np-bt"><button data-np2="x">취소</button><button class="pri" data-np2="ok" disabled>프로젝트 만들기</button></div></div>`;
  document.body.appendChild(d); const $n=s=>d.querySelector(s); setTimeout(()=>$n('#np2-name').focus(),0);
  const close=()=>{ doc.run=(doc.run||0)+1; d.remove(); }, name=()=>$n('#np2-name').value.replace(/\s+/g,' ').trim(), many=()=>!!doc.rep&&(doc.rep.projects.length>1||(!!doc.doc&&doc.doc.kind==='json')), one=()=>doc.rep&&!many()&&doc.rep.projects.length===1?doc.rep.projects[0]:null;   // (a data file always goes through the window that says what will happen)
  const pick=(box,key,v)=>{ for(const b of $n(box).querySelectorAll('button'))b.classList.toggle('on',b.dataset[key]===v); };
  // what the document says is put into the fields (a member may still change them); a name typed by hand is not written over
  const sync=()=>{ const e=one(), ok=$n('[data-np2="ok"]'), m=$n('#np2-many');
    if(e){ if(!name()||name()===auto){ $n('#np2-name').value=e.name; auto=e.name; } if(REP_GRPS.includes(e.grp)){ grp=e.grp; pick('#np2-grp','grp',grp); } if(PSTATUS[e.stage]){ st=e.stage; pick('#np2-st','st',st); } }
    m.hidden=!many(); if(many())m.textContent=`문서에 프로젝트가 ${doc.rep.projects.length}건 있습니다. 한 번에 만들거나 덮어씁니다 (아래 사업명 · 구분 · 추진 단계는 쓰지 않습니다).`;
    for(const i of d.querySelectorAll('.np-f input, .np-f button'))i.disabled=many(); $n('.np-f').classList.toggle('dim',many());
    ok.disabled=busy||!!doc.reading||!(many()||name()); ok.textContent=many()?`${doc.rep.projects.length}건 만들기`:'프로젝트 만들기'; };
  schDocField($n('[data-docfield]'),doc,sync,'PDF 또는 엑셀 문서를 여기에 끌어다 놓거나 눌러서 선택'); sync();
  const make=async()=>{ if(busy||doc.reading)return;
    if(many()){ const rep=doc.rep, fn=doc.file?doc.file.name:''; close(); schRepAsk(rep,fn); return; }
    const n=name(); if(!n){$n('#np2-err').textContent='사업명을 입력하세요.';$n('#np2-name').focus();return;}
    const owner=$n('#np2-owner').value.trim()||sharedName, e=one(), dup=Object.values(PROJECTS).some(p=>norm(p.full)===norm(n));
    if(e){ // the document's sheet under the name, the group and the stage the window shows
      const entry=Object.assign({},e,{name:n,grp,stage:st,owner:e.owner||owner,first:e.first||dateDot(TODAY).replace(/ /g,'')}), data={kind:REP_KIND,v:1,projects:[entry],noRest:true}, fn=doc.file?doc.file.name:'';
      if(dup){ close(); schRepAsk(data,fn); return; }   // a project of that name is there: the window that says "덮어쓰기 1건" asks first
      close(); schRepApply(data,false); const id=Object.keys(PROJECTS).find(k=>norm(PROJECTS[k].full)===norm(n)); if(id){ go('project:'+id); toast(`문서 내용으로 프로젝트를 만들었습니다 · ${schDocSays(entry)}`,5200); } else render(true); return; }
    if(dup){$n('#np2-err').textContent='같은 이름의 프로젝트가 있습니다.';$n('#np2-name').focus();return;}
    const tag=n, id='p'+Date.now(), T=nextProjTone();   // a colour no project has yet
    PROJECTS[id]={id,tag,full:n,cls:T.cls,color:T.color,status:st,stColor:PSTATUS[st],grad:T.grad,imgH:207.8,owner,site:'',cost:'',area:'',power:'',it:'',server:''};
    PHEAD[id]={cls:st,prog:'',owner,loc:'',alt:'',zone:'',kind:'',dev:'',land:'',fund:'',cost:'',fundType:'',scale:[['공사면적:',''],['IT 용량:',''],['총 수전용량 :',''],['서버:','']],partners:[],struct:'',main:'',grp,first:dateDot(TODAY).replace(/ /g,''),lsite:'',docs:[]};
    PROJ_ORDER.push(id); S.filters[id]=true; close(); go('project:'+id);
    if(S.page==='project'&&S.proj===id){S._projSnap={id,project:copy(PROJECTS[id]),head:copy(PHEAD[id])}; S.editProj=true; render(true);}
    toast('프로젝트를 만들었습니다. 사업개요를 채운 뒤 저장하세요.',3200); };
  d.addEventListener('click',e=>{ e.stopPropagation(); const b=e.target.closest('[data-st]'); if(b){st=b.dataset.st; d.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x===b)); return;}
    const gb=e.target.closest('[data-grp]'); if(gb){grp=gb.dataset.grp; d.querySelectorAll('[data-grp]').forEach(x=>x.classList.toggle('on',x===gb)); return;}
    const a=e.target.closest('[data-np2]'); if(e.target===d||(a&&a.dataset.np2==='x')){close();return;} if(a&&a.dataset.np2==='ok')make(); });
  d.addEventListener('input',e=>{ if(e.target.id==='np2-name'){ $n('#np2-err').textContent=''; sync(); } });
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'){e.stopPropagation();close();} else if(e.key==='Enter'&&!e.isComposing&&e.target.tagName==='INPUT'&&e.target.type!=='file'){e.preventDefault();make();} }); }

/* ---------- 사업개요: a partner is linked the way a person is called, with @ ---------- */
const schPartnerOf=name=>{const n=norm(name||''); return n?PARTNERS.find(p=>!p.trash&&norm(p.name)===n):null;};
// the small logo in front of a linked company (the first letter stands in until the logo is there, or when there is none)
function schPartnerMark(name){ const p=schPartnerOf(name); if(!p)return `<i><svg class="pict" aria-hidden="true"><use href="#pic-company"/></svg></i>`;
  const u=p.site&&p.site!=='-'?urlHref(p.site):''; return `<i class="plogo" title="협력업체 목록에 등록된 업체">${esc([...String(p.name||'').trim()][0]||'')}${u?logoImg(p.site):''}</i>`; }
let schAtEl=null;
function schAtClose(){ if(schAtEl){schAtEl=null; if(popEl&&popEl.classList.contains('sch-at'))closePop();} }
function schAtShow(el){ const txt=el.textContent, at=txt.lastIndexOf('@'); if(at<0){schAtClose();return;} const q=norm(txt.slice(at+1));
  const hits=PARTNERS.filter(p=>!p.trash&&(!q||norm(p.name).includes(q)||norm(p.cat||'').includes(q))).slice(0,8); schAtEl=el;
  const p=openPop(el,`<div class="hd">협력업체 ${q?`“${esc(txt.slice(at+1).trim())}”`:'목록'}</div>${hits.map((x,i)=>`<div class="it ${i?'':'sel'}" data-at="${esc(x.id)}">${schPartnerMark(x.name)}<span class="t">${esc(x.name)}</span><span class="m">${esc(x.cat||'')}</span></div>`).join('')||'<div class="msg" style="padding-top:0">맞는 협력업체가 없습니다. 이름을 그대로 적어도 됩니다.</div>'}`,{cls:'sch-at'});
  p.addEventListener('mousedown',e=>{ const b=e.target.closest('[data-at]'); if(!b)return; e.preventDefault(); schAtPick(b.dataset.at); }); }
function schAtPick(id){ const p=PARTNERS.find(x=>x.id===id), el=schAtEl; if(!p||!el)return; const txt=el.textContent, at=txt.lastIndexOf('@'); el.textContent=(at>0?txt.slice(0,at):'')+p.name; schAtClose();
  const r=document.createRange(); r.selectNodeContents(el); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }
document.addEventListener('input',e=>{ if(!PREVIEW_ON)return; const t=e.target; if(t&&t.matches&&t.matches('.phead [contenteditable][data-k^="partner:"],.phead [contenteditable][data-k="dev"],.phead [contenteditable][data-k="land"]'))schAtShow(t); });
document.addEventListener('keydown',e=>{ if(!schAtEl||!popEl||!popEl.classList.contains('sch-at'))return; const its=[...popEl.querySelectorAll('[data-at]')], cur=its.findIndex(x=>x.classList.contains('sel'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ if(!its.length)return; e.preventDefault(); const n=(cur+(e.key==='ArrowDown'?1:-1)+its.length)%its.length; its.forEach((x,i)=>x.classList.toggle('sel',i===n)); }
  else if(e.key==='Enter'&&!e.isComposing){ if(cur>=0){e.preventDefault();e.stopPropagation();schAtPick(its[cur].dataset.at);} }
  else if(e.key==='Escape'){e.stopPropagation();schAtClose();} },true);
document.addEventListener('focusout',e=>{ if(schAtEl&&e.target===schAtEl)setTimeout(schAtClose,120); });

/* ---------- clicks of this file ---------- */
document.addEventListener('click',e=>{ if(!PREVIEW_ON)return; const T=e.target; let el;
  if(el=T.closest('[data-mcol]')){e.stopPropagation();schMainColMenu(el,el.dataset.mcol);return;}
  if(el=T.closest('[data-mpick]')){e.stopPropagation();schMainColMenu(el,el.dataset.mpick,true);return;}
  if(el=T.closest('[data-mchip]')){delete schMf()[el.dataset.mchip];S.actPage=1;refreshSec('action');return;}
  if(el=T.closest('[data-rpick]')){e.stopPropagation();schResMenu(el,el.dataset.rpick);return;}
  if(el=T.closest('[data-ppick]')){e.stopPropagation();schProjMenu(el,el.dataset.ppick);return;}
  if(el=T.closest('[data-pchip]')){e.stopPropagation();delete schPf()[el.dataset.pchip];S.car.proj=0;S.pjPage=1;render(true);return;}
  if(el=T.closest('[data-rchip]')){const c=schRf(), rk=el.dataset.rchip; if(rk.startsWith('tag:')){const l=schRfTags(c).filter(t=>t!==rk.slice(4)); if(l.length)c.tags=l; else delete c.tags;} else delete c[rk]; if(rk==='when'){delete c.from;delete c.to;}S.resPage=1;refreshSec('research');return;}
},true);
