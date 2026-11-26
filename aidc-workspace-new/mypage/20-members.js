/* Member selection is transient; no live record is changed before confirmation. */
const MEM_SELECTION = new Set();
let memDeleting = false;
const memCanDelete = id => canAdmin() && id !== sharedUser && (canOwner() || roleOf(id) !== '소유자');
const memIds = () => Object.keys(sharedUsers).sort((a,b) => ({소유자:0,관리자:1,멤버:2}[roleOf(a)] - {소유자:0,관리자:1,멤버:2}[roleOf(b)]) || userName(a).localeCompare(userName(b),'ko'));
const memRenderBase = renderPaneBase;
renderPaneBase = function(pane) {
  memRenderBase(pane);
  if(pane !== 'members' || !canAdmin())return;
  const ids=memIds(), eligible=ids.filter(memCanDelete);
  for(const id of MEM_SELECTION)if(!eligible.includes(id))MEM_SELECTION.delete(id);
  const root=$('#mbody .mem'); if(!root)return;
  root.classList.add('mem-selectable');
  const tools=root.querySelector('.tools');
  tools.innerHTML='<span class="mem-count" aria-live="polite"></span><button type="button" class="mem-delete" data-member-delete>삭제</button>';
  const head=root.querySelector('.tbl .hd > span');
  const all=document.createElement('input'); all.type='checkbox'; all.dataset.memberAll=''; all.setAttribute('aria-label','전체 사용자 선택'); all.title='모든 페이지의 삭제 가능한 사용자 전체 선택';
  head.prepend(all);
  const pageIds=ids.slice((S.memPage-1)*10,S.memPage*10);
  root.querySelectorAll('.tbl .rw').forEach((row,i)=>{
    const id=pageIds[i]; if(!id)return;
    const box=document.createElement('input'); box.type='checkbox'; box.dataset.memberCheck=id;
    box.setAttribute('aria-label',userName(id)+' 선택'); box.disabled=!memCanDelete(id)||memDeleting;
    if(!memCanDelete(id))box.title=id===sharedUser?'현재 로그인한 사용자는 삭제할 수 없습니다.':'소유자는 소유자만 삭제할 수 있습니다.';
    row.querySelector('.nm').prepend(box);
  });
  memSyncSelection();
};
function memSyncSelection() {
  const root=$('#mbody .mem'); if(!root)return;
  const ids=memIds().filter(memCanDelete);
  for(const id of MEM_SELECTION)if(!ids.includes(id))MEM_SELECTION.delete(id);
  root.querySelectorAll('[data-member-check]').forEach(b=>{b.checked=MEM_SELECTION.has(b.dataset.memberCheck);b.disabled=memDeleting||!memCanDelete(b.dataset.memberCheck);});
  const all=root.querySelector('[data-member-all]');
  if(all){all.checked=!!ids.length&&ids.every(id=>MEM_SELECTION.has(id));all.indeterminate=MEM_SELECTION.size>0&&!all.checked;all.disabled=memDeleting||!ids.length;}
  const del=root.querySelector('[data-member-delete]');if(del){del.disabled=memDeleting||!MEM_SELECTION.size;del.textContent=memDeleting?'삭제 중…':'삭제';}
  const count=root.querySelector('.mem-count');if(count)count.textContent=MEM_SELECTION.size?MEM_SELECTION.size+'명 선택':'';
}
document.addEventListener('change',e=>{
  const b=e.target;
  if(b.matches('[data-member-all]')){MEM_SELECTION.clear();if(b.checked)memIds().filter(memCanDelete).forEach(id=>MEM_SELECTION.add(id));memSyncSelection();}
  else if(b.matches('[data-member-check]')){if(b.checked&&memCanDelete(b.dataset.memberCheck))MEM_SELECTION.add(b.dataset.memberCheck);else MEM_SELECTION.delete(b.dataset.memberCheck);memSyncSelection();}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('[data-member-delete]')||memDeleting||!canAdmin())return;
  const ids=[...MEM_SELECTION].filter(memCanDelete);if(!ids.length)return;
  confirmDlg('선택한 사용자를 삭제하시겠습니까?',[
    {t:'취소',fn:()=>{}},
    {t:'삭제',pri:true,fn:()=>memDeleteSelected(ids)}
  ]);
  const d=$('#dlg');if(d){d.classList.add('mem-confirm');const b=d.querySelector('button');if(b)b.focus();}
});
async function memDeleteSelected(ids) {
  if(memDeleting)return;memDeleting=true;memSyncSelection();
  try {
    const r=await apiFetch('/api/members/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
    const data=await r.json();if(!r.ok)throw Error(data.error||'멤버를 삭제하지 못했습니다.');
    sharedSeq++; sharedMeta(data);
    for(const id of data.deleted||[]){delete MEMBERS_META[id];if(sharedBase['meta:members'])delete sharedBase['meta:members'][id];MEM_SELECTION.delete(id);}
    sharedApply(data.records||{});
    toast((data.deleted||[]).length+'명의 사용자를 삭제했습니다.');
  } catch(err) {toast(err.message||'멤버를 삭제하지 못했습니다.');}
  finally {memDeleting=false;if($('#mbody .mem'))renderPaneBase('members');}
}
/* A portal menu must not stay at an unrelated viewport position as its anchor scrolls away.
   Scroll inside the menu remains available, including nested option lists. */
document.addEventListener('scroll',e=>{
  if(!popEl||popEl.contains(e.target))return;
  const a=popEl._anchor;
  if(a&&(e.target===document||e.target===window||(e.target.contains&&e.target.contains(a))))closePop();
},true);
window.addEventListener('resize',()=>{if(popEl&&popEl._anchor)closePop();});
