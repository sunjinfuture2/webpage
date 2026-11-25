// Project contracts are ordinary, independently typed items. Meetings keep their original cards and records.
function schProjectMeetSection(pid,PV=schPreview()){return PV&&schViewOf('meet')==='table'?schMeetTableSection(pid):`<div class="meet" style="margin-top:117.2px;height:${PV?441.7:352.1}px"><div class="sec-title ${PV?'sch-title':''}" style="top:0">${PV?schTitleIcon('meeting'):''}미팅${plusBtn('new-meeting','새 미팅')}<button class="sh-btn lib" data-lib="meeting">라이브러리</button><span class="car-cnt" id="meet-cnt"></span></div>${PV?schMeetTools():''}
     <div class="track" style="top:${PV?147:57.4}px"><div class="inner" id="meet-inner">${meetingCards(pid,PV?schMeetRows(pid):null)}</div></div>${PV?'<div class="fade l"></div><div class="fade r"></div>':''}
     <button class="circ l" data-car="meet:-1" title="이전">${svg('i-arr-l',6.6,13.2,'color:#8e8e8e;margin-left:-1px')}</button><button class="circ r" data-car="meet:1" title="다음">${svg('i-arr-r',6.6,13.2,'color:#8e8e8e;margin-left:2px')}</button></div>`;}

const SCH_CONTRACT_COLS=[['name','계약서명'],['date','날짜'],['st','상태'],['pri','중요도'],['who','담당자'],['meetings','관련 미팅'],['actions','관련 액션']];
const SCH_CONTRACT_FILTERS={};
function schContractFilter(pid=S.proj){if(!SCH_CONTRACT_FILTERS[pid]){try{SCH_CONTRACT_FILTERS[pid]=JSON.parse(sessionStorage.getItem('aidc-contract-filter:'+pid)||'{}')||{};}catch{SCH_CONTRACT_FILTERS[pid]={};}}return SCH_CONTRACT_FILTERS[pid];}
function schContractFilterSave(){try{sessionStorage.setItem('aidc-contract-filter:'+S.proj,JSON.stringify(schContractFilter()));}catch{}}
const schContractActive=c=>Object.entries(c).some(([k,v])=>k!=='dir'&&!!v);
const schContractLinked=(it,key)=>(it[key]||[]).map(item).filter(x=>x&&isLive(x));
function schContractRows(pid){
 const c=schContractFilter(pid),all=liveItems('contract',pid);
 const rows=all.filter(it=>{
  const meetings=schContractLinked(it,'meetings'),actions=schContractLinked(it,'actions');
  if(c.q&&!matchQ(c.q,it.title,dateShow(it),...(it.people||[]).map(userName),...meetings.map(x=>x.title),...actions.map(x=>x.title)))return false;
  if(c.name&&!matchQ(c.name,it.title))return false;
  if(c.st&&(it.st==='done'?'done':'prog')!==c.st)return false;
  if(c.pri&&(it.pri||'mid')!==c.pri)return false;
  if(c.who&&(c.who==='__none'?(it.people||[]).length:!(it.people||[]).includes(c.who)))return false;
  for(const key of ['meetings','actions'])if(c[key]){const links=key==='meetings'?meetings:actions;if(c[key]==='__none'?links.length:c[key]==='__any'?!links.length:!links.some(x=>x.id===c[key]))return false;}
  const d=it.date||'';
  if(c.date==='today'&&d!==TODAY||c.date==='month'&&d.slice(0,7)!==TODAY.slice(0,7)||c.date==='past'&&(!d||d>=TODAY)||c.date==='next'&&d<TODAY||c.date==='__none'&&d)return false;
  if(c.from&&(!d||d<c.from)||c.to&&(!d||d>c.to))return false;
  return true;
 });
 const val=it=>c.sort==='name'?oneLine(it.title):c.sort==='date'?it.date||'':c.sort==='st'?(it.st==='done'?1:0):c.sort==='pri'?({high:0,mid:1,low:2})[it.pri||'mid']:c.sort==='who'?(it.people||[]).map(userName).join(','):schContractLinked(it,c.sort).map(x=>oneLine(x.title)).join(',');
 return rows.sort(c.sort?(a,b)=>{const x=val(a),y=val(b);return (x<y?-1:x>y?1:0)*(c.dir||1)||newestFirst(a,b);}:newestFirst);
}
function schContractChips(pid){
 const c=schContractFilter(pid),labels={st:{prog:'진행',done:'완료'},pri:priTxt,date:{today:'오늘',month:'이번 달',past:'지난 날짜',next:'오늘 이후',__none:'날짜 없음'}};
 const chips=SCH_CONTRACT_COLS.filter(([k])=>c[k]).map(([k,t])=>{const v=c[k],txt=labels[k]?.[v]||(k==='who'?(v==='__none'?'미지정':userName(v)):['actions','meetings'].includes(k)?(v==='__none'?'연결 없음':v==='__any'?'연결 있음':oneLine(item(v)?.title)||'연결 항목'):v);return '<button class="sch-chip" data-contract-clear="'+k+'">'+t+': '+esc(txt)+'<i>✕</i></button>';});
 if(c.from||c.to)chips.push('<button class="sch-chip" data-contract-clear="range">기간: '+esc(c.from||'전체')+' ~ '+esc(c.to||'전체')+'<i>✕</i></button>');
 if(c.q||chips.length||c.sort)chips.push('<button class="sh-btn lib" data-contract-clear="all">초기화</button>');
 return chips.join('');
}
function schContractSection(pid){
 const c=schContractFilter(pid);
 return '<div class="sec contract-section" style="margin-top:117.2px"><div class="sec-title sch-title"><span class="sch-ic">'+pict('contract')+'</span>계약서'+plusBtn('new-contract','새 계약서')+'<label class="srch box">'+svg('pic-search',15,15)+'<input data-contract-search aria-label="계약서 검색" placeholder="검색" value="'+esc(c.q||'')+'"><button type="button" data-contract-clear="q" aria-label="검색 지우기" class="contract-qclear" '+(c.q?'':'hidden')+'>×</button></label></div><div class="contract-filter-chips">'+schContractChips(pid)+'</div><div class="contract-scroll">'+schContractTable(pid)+'</div></div>';
}
function schContractRefresh(){
 schContractFilterSave();const root=document.querySelector('.contract-section');if(!root)return;
 root.querySelector('.contract-scroll').innerHTML=schContractTable(S.proj);root.querySelector('.contract-filter-chips').innerHTML=schContractChips(S.proj);
 root.querySelector('.contract-qclear').hidden=!schContractFilter().q;
}
function schContractColMenu(el,key){
 const c=schContractFilter(),set=v=>()=>{if(v)c[key]=v;else delete c[key];if(key==='date'){delete c.from;delete c.to;}schContractRefresh();};
 const sort=dir=>()=>{c.sort=key;c.dir=dir;schContractRefresh();};
 let opts=[{hd:'정렬'},{t:'오름차순',sel:c.sort===key&&c.dir!==-1,fn:sort(1)},{t:'내림차순',sel:c.sort===key&&c.dir===-1,fn:sort(-1)},{t:'기본 순서',fn:()=>{delete c.sort;delete c.dir;schContractRefresh();}},'-',{hd:'필터'},{t:'전체',sel:!c[key],fn:set('')}];
 const add=(value,label)=>opts.push({t:label,sel:c[key]===value,fn:set(value)});
 const all=liveItems('contract',S.proj);
 if(key==='st'){add('prog','진행');add('done','완료');}
 else if(key==='pri')for(const v of ['high','mid','low'])add(v,priTxt[v]);
 else if(key==='who'){add('__none','미지정');for(const id of [...new Set(all.flatMap(x=>x.people||[]))])add(id,userName(id));}
 else if(key==='date'){for(const[v,t]of Object.entries({today:'오늘',month:'이번 달',past:'지난 날짜',next:'오늘 이후',__none:'날짜 없음'}))add(v,t);opts.push({t:'기간 직접 지정…',fn:()=>schContractRange(el)});}
 else if(key==='name')opts.push({t:'포함하는 제목…',fn:()=>askInput('계약서명에 포함된 글자',c.name||'',v=>{c.name=(v||'').trim();schContractRefresh();})});
 else {add('__any','연결 있음');add('__none','연결 없음');for(const x of [...new Map(all.flatMap(it=>schContractLinked(it,key)).map(x=>[x.id,x])).values()])add(x.id,oneLine(x.title)||'(제목 없음)');}
 menuPop(el,opts.map((x,i)=>x==='-'||x.hd?x:{...x,k:String(i)}),{cls:'sch-colmenu'});
}
function schContractRange(el){
 const c=schContractFilter(),p=openPop(el,'<div class="hd">날짜 범위</div><div style="padding:8px"><label>시작일<input type="date" data-cfrom value="'+esc(c.from||'')+'"></label><label>종료일<input type="date" data-cto value="'+esc(c.to||'')+'"></label><div role="status" data-cerror></div><button type="button" class="sh-btn" data-capply>적용</button></div>');
 p.querySelector('[data-capply]').onclick=()=>{const from=p.querySelector('[data-cfrom]').value,to=p.querySelector('[data-cto]').value;if(from&&to&&from>to){p.querySelector('[data-cerror]').textContent='종료일은 시작일 이후로 선택해주세요.';return;}delete c.date;c.from=from;c.to=to;closePop();schContractRefresh();};
}
document.addEventListener('input',e=>{if(!e.target.matches('[data-contract-search]')||e.isComposing)return;schContractFilter().q=e.target.value;schContractRefresh();});
document.addEventListener('compositionend',e=>{if(!e.target.matches('[data-contract-search]'))return;schContractFilter().q=e.target.value;schContractRefresh();});
document.addEventListener('click',e=>{const col=e.target.closest('[data-contract-col]');if(col){e.stopPropagation();schContractColMenu(col,col.dataset.contractCol);return;}const clear=e.target.closest('[data-contract-clear]');if(!clear)return;const c=schContractFilter(),k=clear.dataset.contractClear;if(k==='all')Object.keys(c).forEach(k=>delete c[k]);else if(k==='range'){delete c.from;delete c.to;}else delete c[k];if(k==='all'||k==='q')document.querySelector('[data-contract-search]').value='';schContractRefresh();});
document.addEventListener('keydown',e=>{const col=e.target.closest('[data-contract-col]');if(col&&['Enter',' '].includes(e.key)){e.preventDefault();schContractColMenu(col,col.dataset.contractCol);}});
function schContractTable(pid){
 const rows=schContractRows(pid),c=schContractFilter(pid);
 const th=([k,t])=>'<span data-contract-col="'+k+'" class="'+(c[k]||(k==='date'&&(c.from||c.to))?'flt ':'')+(c.sort===k?'sorted':'')+'" role="button" tabindex="0" title="정렬 · 필터"><em>'+t+'</em>'+svg('i-chev-d',8,4)+'</span>';
 return '<div class="tbl sch-proc contract-table"><div class="hd">'+SCH_CONTRACT_COLS.map(th).join('')+'</div>'+rows.map(it=>{
  const meetings=(it.meetings||[]).map(item).filter(x=>x&&x.type==='meeting'&&isLive(x)),actions=(it.actions||[]).map(item).filter(x=>x&&x.type==='action'&&isLive(x)),ppl=it.people||[];
  return '<div class="rw" data-open="'+esc(it.id)+'"><div class="nm" title="'+esc(oneLine(it.title))+'"><span class="e">'+esc(oneLine(it.title)||'(제목 없음)')+'</span></div><div>'+esc(dateShow(it))+'</div><div>'+schStIcon(it.st==='done'?'완료':'진행')+'</div><div><span class="pri pri-'+esc(it.pri||'mid')+'">'+esc(priTxt[it.pri||'mid'])+'</span></div><div class="who">'+(ppl.length?ppl.map(k=>'<span data-user="'+esc(k)+'">'+av()+esc(userName(k))+'</span>').join(''):'<span class="sch-role none">미지정</span>')+'</div><div class="contract-links contract-meetings">'+meetings.map(m=>chipFull(m)).join('')+'</div><div class="contract-links contract-actions">'+actions.map(a=>chipFull(a)).join('')+'</div></div>';
 }).join('')+(rows.length?'':'<div class="none">'+(schContractActive(c)?'조건에 맞는 계약서가 없습니다.':'등록된 계약서가 없습니다.')+'</div>')+'<div class="ft"></div></div>';
}
const schContractStyle=document.createElement('style');schContractStyle.textContent=`
.contract-section .contract-scroll{margin-top:34px;overflow-x:auto}
.contract-filter-chips{display:flex;gap:8px;flex-wrap:wrap}.contract-filter-chips:not(:empty){margin-top:18px;margin-bottom:-16px}
.contract-table .hd [data-contract-col]{cursor:pointer;gap:5px}.contract-table .hd [data-contract-col] svg{flex:none;color:#6f6f6f}.contract-qclear{border:0;background:transparent;color:#8e8e8e;cursor:pointer;font-size:18px}.contract-qclear[hidden]{display:none}
.contract-section .srch input{min-width:0}html.mob .contract-section .srch.box input{width:110px}
svg.pict:has(> use[href="#pic-contract"]){transform:scaleX(-1)}
svg.pict > use[href="#pic-contract"]{stroke:currentColor!important;stroke-width:.85;stroke-linejoin:round}
.contract-table .hd,.contract-table .rw{grid-template-columns:minmax(180px,1.1fr) 125px 80px 75px 140px minmax(170px,1fr) minmax(170px,1fr)!important}
.contract-table{min-width:1000px}.contract-table .rw{min-height:48px;height:auto}.contract-table .who,.contract-links{display:flex;flex-wrap:wrap;gap:6px}
.contract-links{min-width:0;align-items:center;padding:8px 0}.contract-links .chip{max-width:100%;min-width:0;box-sizing:border-box;cursor:pointer}.contract-links .chip .t{min-width:0}
html.mob .contract-section .contract-scroll{max-width:calc(100vw - 32px)}
`;document.head.appendChild(schContractStyle);

function schContractActionCandidates(it){
 const ordinary=ITEMS.filter(x=>x.type==='action'&&isLive(x));
 const tasks=schReady(it.proj)?schMainTasks(it.proj).map(r=>item(r.id)).filter(Boolean):[];
 return [...new Map([...ordinary,...tasks].map(x=>[x.id,x])).values()];
}
function schContractActionPick(el,it){
 const candidates=schContractActionCandidates(it),selected=it.actions||[];
 const p=openPop(el,'<div class="hd">관련 액션 · 눌러서 추가 / 해제</div><input class="contract-link-search" placeholder="액션 검색" aria-label="관련 액션 검색"><div class="contract-action-options"></div>',{cls:'multi link'});
 const input=p.querySelector('input'),box=p.querySelector('.contract-action-options');
 const draw=()=>{const q=input.value.trim();const rows=candidates.filter(x=>!q||matchQ(q,x.title)).sort((a,b)=>selected.includes(b.id)-selected.includes(a.id));box.innerHTML=rows.slice(0,60).map(x=>'<div class="it '+(selected.includes(x.id)?'sel':'')+'" data-action-id="'+esc(x.id)+'">'+esc(oneLine(x.title)||'(제목 없음)')+'</div>').join('')||'<div class="msg">연결할 액션이 없습니다.</div>';};
 input.style.cssText='box-sizing:border-box;width:calc(100% - 16px);margin:4px 8px 8px;padding:7px;border:1px solid #ddd;border-radius:4px;font:inherit';
 input.addEventListener('input',draw);box.addEventListener('click',e=>{const row=e.target.closest('[data-action-id]');if(!row)return;const id=row.dataset.actionId;it.actions=selected.includes(id)?selected.filter(x=>x!==id):selected.concat(id);it.dirty=true;closePop();rerenderItem(it.id);});draw();input.focus();
}
