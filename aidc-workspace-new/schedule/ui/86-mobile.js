// Twenty-second round (owner, 2026-11-24: "모바일 호환되게"): the page on a phone.
// A phone used to get the 1920 wide page shrunk to its screen (the viewport tag said width=1920). Now a small screen (the shorter
// side of the screen under 700 px) or a window under 700 px gets `html.mob`, set before anything is painted by the early script
// in the head of original.html, which also turns the viewport tag to the width of the device. In that mode:
//  - fitLayout (original.html) does not scale anything: the page is as wide as the screen, with 16 px at each side, and `--d`
//    is what is left of the 1338 wide column (a large negative number), so everything that is "1338 + d" wide fits by itself;
//  - record lists wrap to the viewport. Spatial views (the gantt and the relation map) and card carousels can be panned;
//  - the sidebar is a drawer over the page (the page's own collapsed state `sb-off`), the panel of an item and the windows
//    take the whole screen. The rules are schedule/mobile.css; this file holds what needs code.
// Tablets and the ?v=1 page are left as they were.
const schMob=()=>document.documentElement.classList.contains('mob');
const schMobWant=()=>{ try{ return schPreview()&&(Math.min(screen.width||9999,screen.height||9999)<700||window.innerWidth<700); }catch(e){ return false; } };
function schMobApply(){ const want=schMobWant(), html=document.documentElement; if(want===schMob())return false; html.classList.toggle('mob',want);
  const m=document.querySelector('meta[name="viewport"]'); if(m)m.setAttribute('content',want?'width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover':'width=1920');
  const app=$('#app'); if(app){ if(want)app.classList.add('sb-off'); app.style.zoom=''; } return true; }
// a window pulled narrower or wider than the limit changes the mode (a phone turned round stays a phone)
window.addEventListener('resize',()=>{ if(schMobApply()){ const app=$('#app'); if(app&&!app.hidden){ fitLayout(); render(true); } } });
(function(){ const app=$('#app'); if(schMob()&&app)app.classList.add('sb-off'); })();
// the drawer: the grey square of the top bar opens it (the page's own handler takes `sb-off` away); a press beside it, or on
// anything in it that leads somewhere, closes it again
document.addEventListener('click',e=>{ if(!schMob()||!e.target.closest)return; const app=$('#app'); if(!app||app.classList.contains('sb-off'))return;
  const inSb=e.target.closest('#sb'), opener=e.target.closest('#sb-open');
  if(opener)return;
  if(!inSb){ app.classList.add('sb-off'); e.stopPropagation(); e.preventDefault(); return; }       // the dimmed page
  if(e.target.closest('#sb-collapse'))return;                                                    // the page's handler closes it
  if(e.target.closest('.item,[data-go],[data-open],a,#sb-inbox,#sb-search,.agent'))setTimeout(()=>{ app.classList.add('sb-off'); },0);
},true);
// (Rows of cards that the desktop page pushes with arrows are moved with the finger here: mobile.css takes the offset of the
// arrows away and lets the row scroll.)

const schMobDetails = new Set();
function schMobProjectDetail(pid, open){
  if(open)schMobDetails.add(pid); else schMobDetails.delete(pid);
}
function schProjectCompact(pid, editing){
  return schMob() ? !editing && !schMobDetails.has(pid) : S.collapsed;
}
function schProjectDetailButton(pid, editing){
  const expanded=!schProjectCompact(pid,editing);
  return `<button type="button" class="ov" data-collapse aria-expanded="${expanded}">프로젝트 상세 ${svg('i-chev-d',9,5)}</button>`;
}

// The short list and its continuation share the same rows, order and item links.
const schMobAgendaOpen = new Set();
function schMobAgenda(list, row, key, label, limit=4){
  const first=list.slice(0,limit).map(row).join('');
  if(list.length<=limit)return first;
  const rest=list.slice(limit);
  return first+`<details class="mob-agenda-more" data-agenda-key="${esc(key)}" ${schMobAgendaOpen.has(key)?'open':''}>
    <summary><span class="more-label">${label} ${rest.length}건 더 보기</span><span class="less-label">${label} 접기</span>${svg('i-chev-d',10,6)}</summary>
    ${rest.map(row).join('')}</details>`;
}
document.addEventListener('toggle',e=>{
  const el=e.target;
  if(!el.isConnected||!el.matches?.('details[data-agenda-key]'))return;
  if(el.open)schMobAgendaOpen.add(el.dataset.agendaKey); else schMobAgendaOpen.delete(el.dataset.agendaKey);
},true);

// A record has one set of cells. On phones the name and these summary fields come first.
// The other populated cells keep their original links, buttons and labels inside a disclosure.
const schMobColumns = [
  ['.vt-res', ['날짜','구분']],
  ['.vt-meet', ['날짜','시간','참석자']],
  ['.vt-proj', ['추진 단계','위치']],
  ['.sch-ev', ['ID','상태','기한']],
  ['.contract-table', ['날짜','상태']],
  ['.sch-proc', ['No.','상태','운영 여유']],
  ['.sch-list, .actions', ['프로젝트','WBS','상태','기한']],
  ['.partners', ['구분']],
  ['.archive', ['기한','담당자']]
];
const schMobExpanded = new Set();
let schMobControlId = 0;
function schMobToggle(target, key, label, name, iconOnly=false){
  const button=document.createElement('button');
  button.type='button';
  button.className=iconOnly?'mob-record-more':'mob-column-toggle';
  if(!iconOnly)button.append(label+' ');
  button.insertAdjacentHTML('beforeend',svg('i-chev-d',12,7));
  target.id='mob-record-'+(++schMobControlId);
  button.setAttribute('aria-controls',target.id);
  button.setAttribute('aria-label',[name,label].filter(Boolean).join(' '));
  const show=open=>{target.hidden=!open; button.setAttribute('aria-expanded',String(open));};
  show(schMobExpanded.has(key));
  button.addEventListener('click',e=>{
    e.stopPropagation();
    const open=target.hidden;
    if(open)schMobExpanded.add(key); else schMobExpanded.delete(key);
    show(open);
  });
  return button;
}
function schMobKeyButton(el){
  if(el.hasAttribute('role'))return;
  el.setAttribute('role','button');
  el.tabIndex=0;
  el.addEventListener('keydown',e=>{
    if(e.target===el && (e.key==='Enter'||e.key===' ')){e.preventDefault();el.click();}
  });
}
function schMobField(label, cell, summary){
  const field=document.createElement('div');
  field.className=summary?'mob-summary-field':'mob-detail-field';
  const caption=document.createElement('span');
  caption.className='mob-field-label';
  caption.textContent=label;
  // Dates, tags and state marks already identify themselves. Keep their label for assistive technology.
  if(summary && !['기한','운영 여유','WBS','No.','ID'].includes(label))caption.classList.add('mob-sr-only');
  field.append(caption,cell);
  return field;
}
function schMobRecord(row, labels, summary, tableKey){
  const cells=Array.from(row.children), title=row.querySelector(':scope > .nm, :scope > .ttl');
  if(!title)return;
  const name=title.querySelector('.e,.tx')?.textContent.trim()||Array.from(title.childNodes)
    .filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).join(' ')||title.title;
  const key=tableKey+'|'+(row.dataset.open||row.dataset.go||row.dataset.partner);
  const meta=document.createElement('div'), details=document.createElement('div');
  meta.className='mob-record-meta';
  details.className='mob-record-details';
  for(const [i,cell] of cells.entries()){
    if(cell===title)continue;
    const label=labels[i], value=cell.textContent.trim();
    if((!value || value==='-') && !cell.querySelector('a,button,[data-schc]'))continue;
    const primary=summary.includes(label);
    (primary?meta:details).append(schMobField(label,cell,primary));
    // The desktop shows two faces and a hover tooltip. The full roster is also readable by touch.
    if(cell.matches('.who[title]') && cell.querySelector('.more-n')){
      const names=document.createElement('span');
      names.textContent=cell.title;
      details.append(schMobField('전체 '+label,names,false));
    }
  }
  const actions=title.querySelector('.acts');
  if(actions){
    const download=actions.querySelector('[data-act="dl"]'), open=actions.querySelector('[data-act="open"]');
    if(open && title.querySelector('a[href]'))details.append(schMobField('문서',open,false));
    if(download)details.append(schMobField('첨부',download,false));
  }
  title.classList.add('mob-record-title');
  if(!title.querySelector('a[href]'))schMobKeyButton(title);
  row.replaceChildren(title);
  if(details.childElementCount){
    row.classList.add('mob-has-details');
    row.append(schMobToggle(details,key,'추가 정보',name,true));
  }
  if(meta.childElementCount)row.append(meta);
  if(details.childElementCount)row.append(details);
  row.querySelectorAll('[data-schc],a[data-open]:not([href]),.mob-detail-field .chip[data-open],a[data-cat]').forEach(schMobKeyButton);
}
function schMobTables(root=document.querySelector('.page.on')){
  if(!root || !schMob())return;
  for(const table of root.querySelectorAll('.tbl:not(.mob-records)')){
    const config=schMobColumns.find(([selector])=>table.matches(selector));
    const head=table.querySelector(':scope > .hd');
    if(!config||!head)continue;
    table.classList.add('mob-records');
    const key=[S.page,S.proj||'',config[0]].join('|');
    const columns=Array.from(head.children);
    const labels=columns.map(col=>col.textContent.replace(/[▲▼]/g,'').trim());
    for(const row of table.querySelectorAll(':scope > .rw'))schMobRecord(row,labels,config[1],key);
    const controls=columns.filter(col=>col.matches('[data-vcol],[data-mcol],[data-sch="col"],[data-contract-col],[data-arcol],[data-sort]'));
    if(controls.length){
      controls.forEach(schMobKeyButton);
      head.replaceChildren(...controls);
      head.before(schMobToggle(head,key+'|columns','정렬·필터',''));
    }else head.hidden=true;
  }
}
