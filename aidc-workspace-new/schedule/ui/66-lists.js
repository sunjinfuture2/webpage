// Sixth round (owner, 2026-11-20), lists of the main and the project page while the preview is on: filters of the research cards,
// the small tags that show what is filtered, the operation date on a project card, the window that makes a project, partners linked
// from a project's overview with @.

/* ---------- research: a row of pickers above the cards ---------- */
const schRf=()=>S.rf||(S.rf={});
const SCH_RF={when:['기간',{'30':'최근 30일',month:'이번 달',year:'올해',old:'30일보다 이전'}],file:['첨부',{y:'첨부 있음',n:'첨부 없음'}],sort:['정렬',{new:'최신순',old:'오래된순',title:'제목순'}]};
// The tags members write in square brackets in front of a title, most used first (a tag used once is not offered).
const schResTagsOf=i=>[...String(i.title||'').split('\n')[0].matchAll(/\[([^\[\]\n]{1,16})\]/g)].map(m=>m[1].trim().toUpperCase()).filter(Boolean);
function schResTags(pool){ const n=new Map(); for(const i of pool)for(const t of new Set(schResTagsOf(i)))n.set(t,(n.get(t)||0)+1); return [...n].filter(([,k])=>k>1).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12); }
function schResFilter(list){ const c=schRf(), today=TODAY, d30=localDate(new Date(Date.now()-30*864e5).toISOString());
  list=list.filter(i=>{ const d=i.date||localDate(i.createdAt||'')||'';
    if(c.tag&&!(c.tag==='-'?!schResTagsOf(i).length:schResTagsOf(i).includes(c.tag)))return false; if(c.who&&i.authorId!==c.who)return false; if(c.file&&(c.file==='y')!==hasFiles(i))return false;
    if(c.when==='30'&&!(d>=d30))return false; if(c.when==='month'&&d.slice(0,7)!==today.slice(0,7))return false; if(c.when==='year'&&d.slice(0,4)!==today.slice(0,4))return false; if(c.when==='old'&&!(d<d30))return false;
    return true; });
  if(c.sort==='new')return list.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||newestFirst(a,b));
  if(c.sort==='old')return list.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||newestFirst(b,a));
  if(c.sort==='title')return list.slice().sort((a,b)=>norm(a.title).localeCompare(norm(b.title),'ko'));
  return sortResearch(list); }
function schResChips(pid){ const c=schRf(), out=[], chip=(k,label)=>out.push(`<button class="sch-chip" data-rchip="${k}" title="이 조건 지우기">${esc(label)}<i>✕</i></button>`);
  if(c.tag)chip('tag','태그: '+(c.tag==='-'?'태그 없음':'['+c.tag+']')); if(c.who)chip('who','작성자: '+userName(c.who));
  for(const k of ['when','file','sort']){ if(c[k])chip(k,SCH_RF[k][0]+': '+(SCH_RF[k][1][c[k]]||c[k])); }
  return out.join(''); }
function schResBar(pid){ const c=schRf();
  return `<div class="sch-chipwrap"><div class="sch-chiprow" data-chips="res">${schResChips(pid)}</div></div>
    <div class="sch-filters res">${schSf2('rpick','tag',c.tag?(c.tag==='-'?'태그 없음':'['+c.tag+']'):'전체 태그',!!c.tag)}${schSf2('rpick','when',c.when?SCH_RF.when[1][c.when]:'전체 기간',!!c.when)}${schSf2('rpick','who',c.who?userName(c.who):'전체 작성자',!!c.who)}${schSf2('rpick','file',c.file?SCH_RF.file[1][c.file]:'첨부 전체',!!c.file)}<div class="right">${schSf2('rpick','sort',c.sort?SCH_RF.sort[1][c.sort]:'기본 순서',!!c.sort)}</div></div>`; }
function schResMenu(el,k){ const c=schRf(), pid=S.page==='project'?S.proj:null, go=()=>{S.resPage=1;refreshSec('research');};
  const fl=(val,item)=>({...item,sel:(c[k]||'')===val,fn:()=>{if(val)c[k]=val;else delete c[k];go();}});
  const pool=liveItems('research',pid); let items=[];
  if(k==='tag')items=[fl('',{t:'전체 태그'}),...schResTags(pool).map(([t,n])=>fl(t,{t:`[${t}]`,html:`<b style="font-weight:600">[${esc(t)}]</b><span style="margin-left:8px;color:#a6a6a6;font-size:11px">${n}</span>`})),fl('-',{t:'태그 없음'})];
  else if(k==='who')items=[fl('',{t:'전체 작성자'}),...[...new Set(pool.map(i=>i.authorId).filter(Boolean))].sort((x,y)=>userName(x).localeCompare(userName(y))).map(u=>fl(u,{t:userName(u)+(u===sharedUser?' (나)':''),ico:av('av15')}))];
  else items=[fl('',{t:k==='when'?'전체 기간':k==='file'?'첨부 전체':'기본 순서'}),...Object.entries(SCH_RF[k][1]).map(([v,t])=>fl(v,{t}))];
  menuPop(el,items.map((x,i)=>({...x,k:String(i)})),{cls:'sch-colmenu',right:k==='sort'}); }
// As many cards on a page as fill whole rows (two rows; the number of columns follows the width, so nothing is left empty when the
// sidebar is folded).
function schResPer(){ const t=document.createElement('div'); t.style.cssText='position:absolute;visibility:hidden;height:0;width:var(--pw)'; $('#app').appendChild(t); const w=t.offsetWidth; t.remove();
  return Math.max(1,Math.floor((w+15.2)/(210.3+15.2)))*2; }
// the tag of the partner list's filter (구분)
const schPartnerChips=()=>S.partnerCat?`<button class="sch-chip" data-catclear title="이 조건 지우기">구분: ${esc(S.partnerCat)}<i>✕</i></button>`:'';

/* ---------- project cards: the operation date the schedule arrives at ---------- */
function schCardOps(k){ if(!schHas(k))return '<span class="nil">미정</span>'; const m=schModel(k); if(!m)return '<span class="nil">계산 중…</span>'; const d=m.res.operationDelay;
  return `${schD(m.res.operationDate)}${d?`<em class="${d>0?'late':'early'}">${d>0?'+':''}${d}일</em>`:''}`; }

/* ---------- the window that makes a project ---------- */
function schNewProject(){ closePop(); const old=$('#dlg'); if(old)old.remove(); const d=document.createElement('div'); d.id='dlg'; d.className='dlg sch-np'; let st='계획중';
  const sts=['계획중','진행중','완료','초기기획사업'].filter(s=>PSTATUS[s]);
  d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="새 프로젝트"><div class="np-hd"><b>새 프로젝트</b><span>이름만 있으면 만들 수 있습니다. 나머지는 프로젝트 페이지의 사업개요에서 채웁니다.</span></div>
    <div class="np-f"><label for="np2-name">사업명 <em>필수</em></label><div><input id="np2-name" maxlength="60" placeholder="예: 대전 AI 데이터센터" autocomplete="off"><small class="err" id="np2-err"></small></div>
      <label for="np2-tag">약칭</label><div><input id="np2-tag" maxlength="20" placeholder="목록과 태그에 쓰는 짧은 이름 (예: 대전 AIDC)" autocomplete="off"></div>
      <label>분류</label><div class="np-st" id="np2-st">${sts.map(s=>`<button type="button" data-st="${s}" class="${s===st?'on':''}"><i style="background:${PSTATUS[s]}"></i>${s}</button>`).join('')}</div>
      <label for="np2-owner">담당자</label><div><input id="np2-owner" maxlength="40" value="${esc(sharedName)}" autocomplete="off"></div>
      <label for="np2-site">부지</label><div><input id="np2-site" maxlength="120" placeholder="주소 또는 위치" autocomplete="off"></div></div>
    <div class="np-bt"><button data-np2="x">취소</button><button class="pri" data-np2="ok">프로젝트 만들기</button></div></div>`;
  document.body.appendChild(d); const $n=s=>d.querySelector(s); setTimeout(()=>$n('#np2-name').focus(),0);
  const close=()=>d.remove();
  const make=()=>{ const n=$n('#np2-name').value.replace(/\s+/g,' ').trim(); if(!n){$n('#np2-err').textContent='사업명을 입력하세요.';$n('#np2-name').focus();return;}
    if(Object.values(PROJECTS).some(p=>norm(p.full)===norm(n))){$n('#np2-err').textContent='같은 이름의 프로젝트가 있습니다.';$n('#np2-name').focus();return;}
    const tag=$n('#np2-tag').value.replace(/\s+/g,' ').trim()||n, owner=$n('#np2-owner').value.trim()||sharedName, site=$n('#np2-site').value.trim();
    const id='p'+Date.now(), ci=(PROJ_ORDER.length-4+6)%6, TONE=[['#5b6b8a','#d7dde7'],['#7a6a5a','#e4ddd6'],['#5e7a5a','#d9e4d7'],['#8a5a6b','#e8d9df'],['#4f7a7a','#d4e3e3'],['#8a7a4a','#e6e1d1']][ci];
    PROJECTS[id]={id,tag,full:n,cls:'pj-c'+ci,color:TONE[0],status:st,stColor:PSTATUS[st],grad:TONE[1],imgH:207.8,owner,site,cost:'',area:'',power:'',it:'',server:''};
    PHEAD[id]={cls:st,prog:'초기 기획',owner,loc:site,alt:'',zone:'',kind:'',dev:'',land:'',fund:'',cost:'',fundType:'',scale:[['공사면적:',''],['IT 용량:',''],['총 수전용량 :',''],['서버:','']],partners:[],struct:'',main:''};
    PROJ_ORDER.push(id); S.filters[id]=true; close(); go('project:'+id);
    if(S.page==='project'&&S.proj===id){S._projSnap={id,project:copy(PROJECTS[id]),head:copy(PHEAD[id])}; S.editProj=true; render(true);}
    toast('프로젝트를 만들었습니다. 사업개요를 채운 뒤 저장하세요.',3200); };
  d.addEventListener('click',e=>{ e.stopPropagation(); const b=e.target.closest('[data-st]'); if(b){st=b.dataset.st; d.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x===b)); return;}
    const a=e.target.closest('[data-np2]'); if(e.target===d||(a&&a.dataset.np2==='x')){close();return;} if(a&&a.dataset.np2==='ok')make(); });
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'){e.stopPropagation();close();} else if(e.key==='Enter'&&!e.isComposing&&e.target.tagName==='INPUT'){e.preventDefault();make();} else if(e.target.id==='np2-name')$n('#np2-err').textContent=''; }); }

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
  if(el=T.closest('[data-rchip]')){delete schRf()[el.dataset.rchip];S.resPage=1;refreshSec('research');return;}
},true);
