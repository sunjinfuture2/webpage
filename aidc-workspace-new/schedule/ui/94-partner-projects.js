/* Research preview and shared partner/project relationships.
   PHEAD[project].partners is the single source of membership; partner rows derive their project tags. */
function schResearchLeading(it){
 const title=String(it.title||''), tags=[];let rest=title;
 while(true){const m=rest.match(/^\s*\[([^\[\]\n]{1,24})\]\s*/);if(!m)break;tags.push(m[1].trim());rest=rest.slice(m[0].length);}
 return {tags,title:rest.trim()};
}
function schResearchBodyTitle(it){
 if(it.type!=='research'||archTabOf(it))return String(it.title||'');
 return schResearchLeading(it).title;
}
function schResearchCategoryLabel(key,it){
 const raw=[...(it&&Array.isArray(it.cats)?it.cats:[]),...(it?schResearchLeading(it).tags:[]),
 ...ITEMS.filter(i=>i.type==='research').flatMap(i=>[...(Array.isArray(i.cats)?i.cats:[]),...schResearchLeading(i).tags])];
 return raw.find(t=>schTagNorm(t)===schTagNorm(key))||key;
}
function schResearchPreviewTags(it){return schResTagsOf(it).map(t=>schResearchCategoryLabel(t,it));}
function schResearchPreviewText(it){return schResearchPreviewTags(it).map(t=>'['+t+']').concat(schResearchBodyTitle(it)).join(' ');}
function schResearchPreviewTitle(it){
 return schResearchPreviewTags(it).map(t=>'<strong class="research-prefix">['+esc(t)+']</strong> ').join('')+
 '<span class="research-title-text">'+esc(schResearchBodyTitle(it)||'(제목 없음)')+'</span>';
}
function schResearchPrepareEdit(it){
 if(it.type!=='research'||archTabOf(it))return;
 const lead=schResearchLeading(it);if(!lead.tags.length)return;
 const cats=Array.isArray(it.cats)?it.cats.slice():[];
 for(const t of lead.tags)if(!cats.some(x=>schTagNorm(x)===schTagNorm(t)))cats.push(t);
 it.cats=cats;it.title=lead.title;
}
function schPartnerProjects(pt){
 return orderedProjects().filter(id=>!PROJECTS[id].trash&&(PHEAD[id]?.partners||[]).some(n=>norm(n)===norm(pt.name)));
}
function schPartnerScope(scope){
 if(S.ptScope===scope)return;
 S.ptScope=scope;S.partnerProject=scope==='main'?'':scope;S.partnerCat=null;S.q.partner='';S.ptPage=1;S.ptHold=0;
}
function schPartnerProjectTags(pt,editable){
 const ids=schPartnerProjects(pt);
 return ids.map(id=>'<button type="button" class="pt-project-tag" data-pt-project-pick="'+esc(pt.id)+'" title="관련 프로젝트 선택">'+esc(PROJECTS[id].tag||PROJECTS[id].full)+'</button>').join('')+
 (editable?'<button type="button" class="pt-project-add" data-pt-project-pick="'+esc(pt.id)+'" aria-label="관련 프로젝트 선택">+</button>':'');
}
function schPartnerFilterChip(){
 const id=S.partnerProject;
 return id&&PROJECTS[id]?'<button class="sch-chip" data-pt-project-clear>프로젝트: '+esc(PROJECTS[id].tag||PROJECTS[id].full)+'<i>✕</i></button>':'';
}
function schEnsureProjectPartners(pid){
 const names=PHEAD[pid]?.partners||[];
 for(const name of names){if(!String(name).trim()||PARTNERS.some(p=>!p.trash&&norm(p.name)===norm(name)))continue;
 PARTNERS.push({id:'pt'+crypto.randomUUID(),name:String(name).trim(),site:'',cat:'',desc:'',body:'',meet:null});}
}
async function schPartnerToggleProject(pt,pid){
 if(!pt||!PROJECTS[pid]||PROJECTS[pid].trash)return false;
 if(S.editProj){toast('작성 중인 프로젝트 개요를 먼저 저장해 주세요.');return false;}
 if(!await sharedBeginEdit('project:'+pid))return false;
 try{
  const h=headOf(pid),old=h.partners.slice(),on=old.some(n=>norm(n)===norm(pt.name));
  h.partners=on?old.filter(n=>norm(n)!==norm(pt.name)):old.concat(pt.name);
  const ok=await sharedFlush(true);
  if(!ok){toast('연결을 저장하지 못했습니다. 최신 상태를 확인한 후 다시 선택해 주세요.');return false;}
  return true;
 }finally{await sharedRelease('project:'+pid);}
}
function schPartnerProjectPick(el,pt){
 if(!pt)return;const selected=()=>schPartnerProjects(pt);
 const pop=openPop(el,'<div class="hd">관련 프로젝트 · 복수 선택</div><div class="msg" style="padding-top:0"><input class="pt-project-query" placeholder="검색" aria-label="프로젝트 검색"></div><div class="pt-project-options"></div>',{cls:'pt-project-picker'});
 let busy=false;const input=pop.querySelector('input'),box=pop.querySelector('.pt-project-options');
 const draw=()=>{const ids=orderedProjects().filter(id=>!PROJECTS[id].trash&&matchQ(input.value,PROJECTS[id].tag,PROJECTS[id].full)),sel=selected();
 box.innerHTML=ids.map(id=>'<button type="button" class="it '+(sel.includes(id)?'sel':'')+'" data-pt-project-id="'+esc(id)+'"><i class="ck">'+(sel.includes(id)?svg('i-check',9,8):'')+'</i><span>'+esc(PROJECTS[id].full||PROJECTS[id].tag)+'</span></button>').join('')||'<div class="msg">검색 결과가 없습니다.</div>';};
 input.addEventListener('input',draw);
 box.addEventListener('click',async e=>{const b=e.target.closest('[data-pt-project-id]');if(!b||busy)return;e.preventDefault();e.stopPropagation();busy=true;b.disabled=true;
 try{await schPartnerToggleProject(pt,b.dataset.ptProjectId);
 const scroll=$('#content').scrollTop;render(true);$('#content').scrollTop=scroll;
 if(S.panel===pt.id){const tags=$('#panel-pin .pt-projects');if(tags)tags.innerHTML=schPartnerProjectTags(pt,true);}
 }finally{busy=false;if(pop.isConnected)draw();}
 });draw();input.focus();
}
document.addEventListener('click',e=>{
 const el=e.target.closest&&e.target.closest('[data-pt-project-pick],[data-pt-project-filter],[data-pt-project-clear]');if(!el)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(el.hasAttribute('data-pt-project-pick')){schPartnerProjectPick(el,PARTNERS.find(p=>p.id===el.dataset.ptProjectPick&&!p.trash));return;}
 if(el.hasAttribute('data-pt-project-clear')){S.partnerProject='';S.ptPage=1;ptKeep(()=>render(true));return;}
 menuPop(el,[{t:'전체 프로젝트',k:'all',sel:!S.partnerProject,fn:()=>{S.partnerProject='';S.ptPage=1;ptKeep(()=>render(true));}},
 ...orderedProjects().filter(id=>!PROJECTS[id].trash).map(id=>({t:PROJECTS[id].full||PROJECTS[id].tag,k:id,sel:S.partnerProject===id,fn:()=>{S.partnerProject=id;S.ptPage=1;ptKeep(()=>render(true));}}))],{cls:'sch-colmenu'});
},true);
