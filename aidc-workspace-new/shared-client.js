/* Shared client: login, server sync, edit locks, conflict recovery and routing.
   build-shared.mjs injects this file into the app script at the LOGIN marker, so it uses the app's globals (ITEMS, S, render, …). */
const CLIENT_VERSION=4;                       // must be >= MIN_CLIENT in shared-worker.mjs
const TOKEN_KEY='aidc-token';                 // one login per browser, shared by all its tabs
let sharedUser='',sharedName='',sharedToken='',sharedBase={},sharedUsers={},sharedLocks={};
let sharedReady=false,sharedBusy=false,sharedPendingRedraw=false,sharedRestoreRoute=true,sharedRetryAt=0,sharedSocket;
const ownedLocks=new Set();
let META_FLAGS={};                            // one-time migrations already applied to this shared database
// Client-only fields of an item: never sent to the server, never compared for changes.
const TRANSIENT=['editing','_editOriginal','snap','dirty','sessionNew','_recoverySignature','_co'];
const stripTransient=v=>{for(const k of TRANSIENT)delete v[k];return v;};
const copy=v=>JSON.parse(JSON.stringify(v));
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const userName=id=>sharedUsers[id]||PEOPLE[id]||id||'';
// Meta records that are compared field by field (two people changing different fields do not collide).
const FIELD_META=new Set(['meta:head','meta:rows','meta:members','meta:settings','meta:flags']);
// A project's schedule (meta:sched:<project>) is one such record too: one field per changed task / relation / package (see schedule/overlay.ts).
const schedKey=key=>key.startsWith('meta:sched:');
const isFieldMeta=key=>FIELD_META.has(key)||schedKey(key);
const metaTarget=key=>schedKey(key)?(SCHED[key.slice(11)]||(SCHED[key.slice(11)]={})):({'meta:head':PHEAD,'meta:rows':ARCH_ROWS,'meta:members':MEMBERS_META,'meta:settings':SETTINGS,'meta:flags':META_FLAGS})[key];
const SETTINGS_DEFAULT=copy(SETTINGS);
const FIXTURE_DRAFT_TITLES=new Set(ITEMS.filter(i=>i.status==='draft').map(i=>i.title)); // demo drafts shipped with the page

// Keep the notice at the document top, inside the scrolling content area.
$('#content').prepend($('#notice'));
$('#notice').style.top='8.3px';
const navigationType=performance.getEntriesByType('navigation')[0]?.type;
sessionStorage.removeItem('aidc-tab-token');  // older builds kept a per-tab login here
sharedToken=localStorage.getItem(TOKEN_KEY)||'';
function apiFetch(url,options={}){return fetch(url,{...options,headers:{...options.headers,'X-AIDC-Client':String(CLIENT_VERSION),...(sharedToken?{Authorization:'Bearer '+sharedToken}:{})}});}
const postJson=(url,body)=>apiFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

/* ---------- local state <-> records ---------- */
function sharedRecords(){
  const out={};
  for(const v of ITEMS){const id='item:'+v.id;
    if(v.status==='new')continue;                                                  // never saved: stays in this browser
    if(v.editing){if(sharedBase[id])out[id]=copy(sharedBase[id]);continue;}        // my unsaved edit: the server copy stands until I press 저장
    out[id]=stripTransient(copy(v));}
  const hold=S.editProj&&!S._projSaving?S.proj:null;                               // project overview being edited: held until saved or cancelled
  for(const [k,v] of Object.entries(PROJECTS))out['project:'+k]=(k===hold&&sharedBase['project:'+k])?copy(sharedBase['project:'+k]):copy(v);
  for(const v of PARTNERS)out['partner:'+v.id]=copy(v);
  for(const [key,label] of Object.entries(partnerCategoryHistory))out['meta:partner-category:'+key]={label};
  const head=copy(PHEAD);if(hold&&sharedBase['meta:head']&&sharedBase['meta:head'][hold])head[hold]=copy(sharedBase['meta:head'][hold]);
  Object.assign(out,{'meta:order':copy(PROJ_ORDER),'meta:roadmap':copy(ROADMAP),'meta:head':head,'meta:archive':copy(ARCH_SECTIONS),'meta:tabs':copy(ARCH_TABS),'meta:rows':copy(ARCH_ROWS),
    'meta:flags':copy(META_FLAGS),'meta:notices':copy(NOTICES),'meta:settings':copy(SETTINGS),'meta:members':copy(MEMBERS_META)});
  if(sharedUser)out['meta:inbox:'+sharedUser]=copy(INBOX_STATE);
  for(const [pid,ov] of Object.entries(SCHED))if(Object.keys(ov).length||sharedBase['meta:sched:'+pid])out['meta:sched:'+pid]=copy(ov);
  for(const k of Object.keys(sharedBase))if(!(k in out)&&k.startsWith('meta:'))out[k]=copy(sharedBase[k]); // records this page does not model (other people's inbox state, future keys)
  return out;
}
function sharedDiff(a,b){const changes=[];for(const id of new Set([...Object.keys(a),...Object.keys(b)])){
  if(same(a[id],b[id]))continue;
  if((id.startsWith('meta:')&&!isFieldMeta(id))||!a[id]||!b[id]){changes.push({id,before:a[id]??null,after:b[id]??null});continue;}
  for(const field of new Set([...Object.keys(a[id]),...Object.keys(b[id])]))if(!same(a[id][field],b[id][field]))changes.push({id,field,before:a[id][field]??null,after:b[id][field]??null});
 }return changes;}
// Writes one server record into the page state, whatever is there now.
function applyRecord(key,v){
  if(v==null)delete sharedBase[key];else sharedBase[key]=copy(v);
  if(key.startsWith('item:')){const id=key.slice(5),idx=ITEMS.findIndex(x=>x.id===id);
    if(v==null){if(idx>=0)ITEMS.splice(idx,1);}
    else if(idx>=0){Object.keys(ITEMS[idx]).forEach(k=>delete ITEMS[idx][k]);Object.assign(ITEMS[idx],copy(v));}
    else ITEMS.push(copy(v));}
  else if(key.startsWith('project:')){const k=key.slice(8);if(v==null)delete PROJECTS[k];else PROJECTS[k]=copy(v);}
  else if(key.startsWith('partner:')){const idx=PARTNERS.findIndex(x=>x.id===key.slice(8));if(idx>=0)PARTNERS.splice(idx,1,...(v?[copy(v)]:[]));else if(v)PARTNERS.push(copy(v));}
  else if(schedKey(key)){const t=metaTarget(key);for(const k of Object.keys(t))if(!v||!(k in v))delete t[k];if(v)Object.assign(t,copy(v));}
  else if(v==null)return;                                                           // a meta record missing on the server keeps the page default
  else if(key.startsWith('meta:partner-category:')){const id=key.slice('meta:partner-category:'.length);if(v&&typeof v.label==='string')partnerCategoryHistory[id]=v.label;else delete partnerCategoryHistory[id];}
  else if(key==='meta:order')PROJ_ORDER.splice(0,PROJ_ORDER.length,...v);
  else if(key==='meta:roadmap')ROADMAP.splice(0,ROADMAP.length,...copy(v));
  else if(key==='meta:head'){for(const k of Object.keys(PHEAD))if(!(k in v))delete PHEAD[k];Object.assign(PHEAD,copy(v));}
  else if(key==='meta:archive')ARCH_SECTIONS=copy(v);
  else if(key==='meta:tabs')ARCH_TABS=copy(v);
  else if(key==='meta:rows'){for(const k of Object.keys(ARCH_ROWS))if(!(k in v))delete ARCH_ROWS[k];Object.assign(ARCH_ROWS,copy(v));}
  else if(key==='meta:flags')META_FLAGS=copy(v);
  else if(key==='meta:notices')NOTICES=copy(v);
  else if(key==='meta:settings')SETTINGS=Object.assign(copy(SETTINGS_DEFAULT),copy(v));
  else if(key==='meta:members')MEMBERS_META=copy(v);
  else if(key==='meta:inbox:'+sharedUser){INBOX_STATE=Object.assign({read:[],checked:[]},copy(v));if(typeof myPrefsApply==='function')myPrefsApply();}
}
// Records that are saved field by field, and the live object behind each of them.
const fieldLevel=key=>key.startsWith('item:')||key.startsWith('project:')||isFieldMeta(key);
const targetOf=key=>key.startsWith('item:')?ITEMS.find(x=>x.id===key.slice(5)):key.startsWith('project:')?PROJECTS[key.slice(8)]:metaTarget(key);
// Takes a server record over field by field. A field I have changed since `mine` (my last known copy) keeps my value; everything else follows the server.
function mergeRecord(key,v,mine){const cur=targetOf(key);
  for(const f of new Set([...Object.keys(v),...Object.keys(mine),...Object.keys(cur)])){if(TRANSIENT.includes(f)||!same(cur[f],mine[f])||same(cur[f],v[f]))continue;if(v[f]===undefined)delete cur[f];else cur[f]=copy(v[f]);}
  sharedBase[key]=copy(v);}
function sharedApply(records){
  const notes=typeof schNoticeSettle==='function'; if(notes)schNoticeSettle(false); // what differs up to here is this member's own doing
  try{ sharedApplyRecords(records); } finally{ if(notes)schNoticeSettle(true); }  // what differs from here on came from the others
}
function sharedApplyRecords(records){
  const local=sharedRecords();
  for(const [key,v] of Object.entries(records)){
    if(same(v,sharedBase[key]))continue; // nothing new from the server: leave the live objects untouched
    const it=key.startsWith('item:')?ITEMS.find(x=>x.id===key.slice(5)):null;
    if(it&&it.editing){ // my unsaved edit stands until I save; comments other people add meanwhile still come through
      const base=sharedBase[key];if(v&&base&&same(it.comments??[],base.comments??[])){const c=v.comments||[];it.comments=copy(c);base.comments=copy(c);if(it._editOriginal)it._editOriginal.comments=copy(c);}
      // editing together: a member of the session saved the shared body. It becomes what my own save builds on (and what 취소 goes back to).
      if(v&&base&&it._co)for(const f of ['body','ed','bodyV1','files','updatedAt','updatedBy']){for(const o of [base,it,it._editOriginal]){if(!o)continue;if(v[f]===undefined)delete o[f];else o[f]=copy(v[f]);}}
      continue;}
    if(v&&sharedBase[key]&&fieldLevel(key)&&targetOf(key)){mergeRecord(key,v,sharedBase[key]);continue;}
    if(!same(local[key],sharedBase[key]))continue; // my pending change stands; the server copy arrives after my save
    applyRecord(key,v);}
}
const openItems=()=>[S.panel,S.full].map(id=>id&&ITEMS.find(x=>x.id===id)).filter(Boolean);
// Redraw after a change from the server, but never while this person is typing, choosing from a menu or editing something.
function sharedRedraw(){if(!sharedReady)return;sharedUi();const active=document.activeElement;
 if(active?.matches('input,textarea,select,[contenteditable="true"]')||popEl||$('#dlg')||S.editProj||S.editSimple||(typeof SCH!=='undefined'&&SCH.drag)||openItems().some(x=>x.editing||x.status==='new'||(x.status==='draft'&&canEditItem(x)))){sharedPendingRedraw=true;return;}
 sharedPendingRedraw=false;
 if(S.full&&!item(S.full)){S.full=null;toast('해당 게시물이 삭제되었습니다.');}
 if(S.panel&&!panelExists(S.panel))closePanel(true);
 const scroll=$('#content').scrollTop,panelScroll=$('#panel').scrollTop;render();if(S.panel)rerenderItem(S.panel);$('#content').scrollTop=scroll;$('#panel').scrollTop=panelScroll;
 const pane=$('#mnav .item.on')?.dataset.pane; // panes with a form or a server-side list are left alone
 if($('#ovl').classList.contains('on')&&['inbox','members','mine','drafts','trash','teamspace','analytics'].includes(pane)){const st=$('#mbody').scrollTop;renderPane(pane);$('#mbody').scrollTop=st;}
 if(PREVIEW_ON&&typeof mpLive==='function')mpLive();
}
// Routine connection/save states stay silent; only problems surface, as a toast, at most once per 10 seconds per message.
let lastStatus='',lastStatusAt=0;
function sharedStatus(text){if(!/못했|확인|필요|보관|겹|재시도|실패/.test(text||''))return;const now=Date.now();if(text===lastStatus&&now-lastStatusAt<10000)return;lastStatus=text;lastStatusAt=now;toast(text,2600);}

/* ---------- attachments, history, members ---------- */
// Attachments are stored by the Worker (/api/file); the page embeds only the file id, so records stay small.
// version history of one item (kept by the server at every save of its title or body)
async function sharedVersions(id){const r=await apiFetch('/api/versions?item='+encodeURIComponent(id));if(!r.ok)throw new Error('versions');return (await r.json()).versions||[];}
async function sharedVersion(n){const r=await apiFetch('/api/version?id='+encodeURIComponent(n));if(!r.ok)throw new Error('version');return (await r.json()).version;}
async function sharedUnfurl(u){if(!sharedReady)return null;const r=await apiFetch('/api/unfurl?url='+encodeURIComponent(u));if(!r.ok)return null;const d=await r.json();return d&&d.ok?d:null;}
async function sharedUploadFile(file,itemId){if(!sharedReady)throw Error('서버에 연결된 후 첨부할 수 있습니다.');if(file.size>1887436)throw Error('파일은 1.8MB까지 첨부할 수 있습니다. ('+file.name+')');
 const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(Error('파일을 읽지 못했습니다.'));r.readAsDataURL(file);});
 const r=await postJson('/api/file',{name:file.name,type:file.type,size:file.size,item:itemId||'',data});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'파일을 올리지 못했습니다.');return d;}
async function sharedListFiles(){const r=await apiFetch('/api/files');if(!r.ok)throw Error('첨부 파일 목록을 가져오지 못했습니다.');return (await r.json()).files||[];}
async function sharedHistory(limit=100,before=0,audit=false){const r=await apiFetch(`/api/history?limit=${limit}${before?'&before='+before:''}${audit?'&audit=1':''}`);if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'활동 기록을 가져오지 못했습니다.');}return r.json();}
// My logins (my page > 계정 > 로그인·기기)
async function sharedSessions(){const r=await apiFetch('/api/sessions');if(r.status===401){sharedEnd();throw Error('로그인이 필요합니다.');}if(!r.ok)throw Error('로그인 기기를 가져오지 못했습니다.');return r.json();}
async function sharedEndSession(body){const r=await postJson('/api/session',body);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'로그아웃하지 못했습니다.');return d;}
async function sharedDeleteFile(id){try{await apiFetch('/api/file/'+encodeURIComponent(id),{method:'DELETE'});}catch{}}
async function sharedSetName(name){const r=await postJson('/api/me',{name});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'이름을 바꾸지 못했습니다.');sharedName=d.name;ME=sharedName;sharedMeta(d);localStorage.setItem('aidc-known-name:'+sharedUser,d.name);return d.name;}
async function sharedAddUser(employee,name){const r=await postJson('/api/user',{employee,name});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'멤버를 추가하지 못했습니다.');sharedMeta(d);return d;}

/* ---------- unsaved work kept in this browser ---------- */
const recoveryKey=()=>'aidc-recovery:'+sharedUser;
function sharedKeepCopy(v){v=stripTransient(copy(v));if(!v.title&&!v.body)return;const sig=JSON.stringify([v.title,v.body]);if(ITEMS.some(x=>x._recoverySignature===sig))return;
 ITEMS.push({...v,id:'recovery-'+crypto.randomUUID(),title:'[복구 초안] '+(v.title||'제목 없음').replace(/^(\[복구 초안\]\s*)+/,''),status:'draft',authorId:sharedUser,editing:false,arch:undefined,trashedAt:undefined,_recoverySignature:sig});}
function sharedKeepDraft(it){const v=stripTransient(copy(it));const original=stripTransient(copy(it._editOriginal||{}));if(same(v,original))return;sharedKeepCopy(v);}
// Only work that the server does not have yet is kept: open edits, never-saved new items and changes that failed to send.
function preserveLocal(capture){if(!sharedUser||!sharedReady)return;if(capture&&typeof captureEditor==='function')captureEditor();
 const items=ITEMS.filter(x=>(x.editing&&!same(stripTransient(copy(x)),stripTransient(copy(x._editOriginal||{}))))||(x.status==='new'&&(x.title||x.body))).map(x=>stripTransient(copy({...x,_was:x.editing?'editing':'new'})));
 const changes=sharedDiff(sharedBase,sharedRecords()).filter(c=>c.id.startsWith('item:')&&c.after);
 if(!items.length&&!changes.length){localStorage.removeItem(recoveryKey());return;}
 localStorage.setItem(recoveryKey(),JSON.stringify({v:2,at:Date.now(),items,changes}));}
function restoreLocal(){const raw=localStorage.getItem(recoveryKey());if(!raw)return;localStorage.removeItem(recoveryKey());let rec;try{rec=JSON.parse(raw);}catch{return;}
 const bare=t=>(t||'').replace(/^(\[복구 초안\]\s*)+/,'');
 const seen=new Set(ITEMS.filter(i=>i.status==='draft'&&i.authorId===sharedUser).map(i=>JSON.stringify([bare(i.title),i.body||''])));
 const add=v=>{if(!v||(!v.title&&!v.body))return;const sig=JSON.stringify([bare(v.title),v.body||'']);if(seen.has(sig))return;seen.add(sig);const c=stripTransient(copy(v));delete c._was;
  ITEMS.push({...c,id:'recovery-'+crypto.randomUUID(),title:'[복구 초안] '+(bare(c.title)||'제목 없음'),status:'draft',authorId:sharedUser,arch:undefined,trashedAt:undefined});};
 for(const x of rec.items||[]){
  if(rec.v===2){const cur=item(x.id);if(x._was==='new'){if(!cur)add(x);}else if(!cur||cur.title!==x.title||(cur.body||'')!==(x.body||''))add(x);}
  else if(x.editing||x.status==='new')add(x);                                          // older format: only real unsaved work …
  else if(x.status==='draft'&&x.authorId===sharedUser&&!FIXTURE_DRAFT_TITLES.has(bare(x.title)))add(x); // … and the person's own drafts, not copies of the demo drafts
 }
 for(const c of rec.changes||[]){if(!c.id.startsWith('item:')||!c.after)continue;const cur=item(c.id.slice(5));
  if(c.field){if(c.field!=='title'&&c.field!=='body')continue;if(cur&&same(cur[c.field],c.after))continue;add({...(cur?copy(cur):{}),[c.field]:c.after});}
  else if(!cur)add(c.after);}
}

/* ---------- saving ---------- */
async function sharedFlush(wait=false){
 if(wait===true)while(sharedBusy)await new Promise(r=>setTimeout(r,50));
 if(!sharedReady||sharedBusy||(wait!==true&&Date.now()<sharedRetryAt))return false;
 const sent=sharedRecords();const changes=sharedDiff(sharedBase,sent);if(!changes.length)return true;
 sharedBusy=true;preserveLocal();
 try{const r=await postJson('/api/change',{changes});const data=await r.json().catch(()=>({}));
  if(r.status===401){sharedEnd(data.error);return false;}
  if(r.status===409||r.status===423){await sharedResolveConflict();return false;}
  if(r.status===403&&data.denied){await sharedDenied(data);return false;}
  if(!r.ok)throw Error(data.error||'save failed');
  for(const [key,v] of Object.entries(data.records)){
   if(v===null){delete sharedBase[key];continue;}
   const cur=fieldLevel(key)?targetOf(key):null;
   if(cur&&sent[key]&&!cur.editing)mergeRecord(key,v,sent[key]); // also brings in what others changed meanwhile, the cleaned body and the author / time stamps
   else sharedBase[key]=copy(v);}
  for(const key of [...ownedLocks])if(!(key.startsWith('item:')?item(key.slice(5))?.editing:S.editProj))await sharedRelease(key);
  if(data.denied)sharedDeniedNote(data);
  sharedRetryAt=0;preserveLocal();return true;
 }catch(e){sharedRetryAt=Date.now()+3000;sharedStatus('저장하지 못했습니다 · 연결을 확인해 주세요. 내용은 이 브라우저에 보관됩니다.');return false;}
 finally{sharedBusy=false;sharedRedraw();}
}
// The server refused my changes because someone else changed (or is editing) the same thing.
// Take the server copy, keep what can be merged (my comments, untouched fields) and park the rest as a recovery draft.
// The server refused a change because of my role (my-page spec): its copy is taken back, whatever the page shows, and the reason is said.
let sharedDeniedAt=0,sharedDeniedWhy='';
function sharedDeniedNote(data){sharedDeniedAt=Date.now();sharedDeniedWhy=data.error||'권한이 없어 적용되지 않았습니다.';toast(sharedDeniedWhy,3600);if($('#ovl').classList.contains('on')&&typeof renderPane==='function')setTimeout(()=>{if($('#ovl').classList.contains('on'))renderPane();},0);}
async function sharedDenied(data){const ids=(data.denied||[]).map(d=>d.id);
 try{const r=await apiFetch('/api/state');if(r.status===401){sharedEnd();return;}if(r.ok){const d=await r.json();sharedMeta(d);for(const id of ids)applyRecord(id,d.records[id]??null);}else sharedRetryAt=Date.now()+3000;}catch{sharedRetryAt=Date.now()+3000;}
 sharedDeniedNote(data);}
async function sharedResolveConflict(){
 const r=await apiFetch('/api/state');if(r.status===401){sharedEnd();return;}if(!r.ok){sharedRetryAt=Date.now()+3000;return;}
 const d=await r.json();sharedMeta(d);const local=sharedRecords();let lost=0,kept=0;
 const rest=a=>{const x={...(a||{})};delete x.comments;return x;};
 for(const key of new Set([...Object.keys(local),...Object.keys(sharedBase),...Object.keys(d.records)])){
  const mine=local[key]??null,base=sharedBase[key]??null,server=d.records[key]??null;
  const editing=key.startsWith('item:')&&item(key.slice(5))?.editing;
  if(same(mine,base)){if(!same(server,base)&&!editing)applyRecord(key,server);continue;}        // nothing of mine pending here: just catch up
  if(same(server,base)&&!otherLock(key))continue;                                                 // the server did not move: my change is simply retried
  if(key.startsWith('item:')&&mine){
   const baseC=(base&&base.comments)||[];const added=(mine.comments||[]).filter(c=>!baseC.some(b=>same(b,c)));
   if(!same(rest(mine),rest(base))){lost++;if(!same(mine.title,(base||{}).title)||!same(mine.body||'',(base||{}).body||'')){sharedKeepCopy(mine);kept++;}}
   applyRecord(key,server);
   if(server&&added.length){const it=item(key.slice(5));it.comments=(it.comments||[]).concat(added);}                  // my comments go on top of the server copy
  }else if(isFieldMeta(key)&&mine&&server){
   const keep={};for(const f of new Set([...Object.keys(mine),...Object.keys(base||{})])){if(same(mine[f],(base||{})[f]))continue;if(same(server[f],(base||{})[f]))keep[f]=mine[f];else lost++;}
   applyRecord(key,server);const target=metaTarget(key);for(const [f,v] of Object.entries(keep)){if(v===undefined)delete target[f];else target[f]=copy(v);}
  }else{applyRecord(key,server);lost++;}
 }
 if(lost)toast('다른 사용자의 변경과 겹쳐 방금 한 수정 일부가 적용되지 않았습니다.'+(kept?' 작성하던 내용은 ‘작성 중인 초안’에 보관했습니다.':' 화면에는 최신 내용이 표시됩니다.'),3800);
}
async function sharedSaveProject(button){
 const id=S.proj,root=$('#proj-pw'),title=$('[data-k="__full"]',root)?.textContent.trim();if(!title){toast('프로젝트명을 입력해주세요.');return;}
 saveProjectHead();S._projSaving=true;
 if(button){button.disabled=true;button.textContent='저장 중…';}
 try{const ok=await sharedFlush(true);if(!ok&&sharedDiff(sharedBase,sharedRecords()).length){toast('저장에 실패했습니다. 입력 내용은 유지됩니다.');return;}S.editProj=false;S._projSnap=null;await sharedRelease('project:'+id);render(true);toast('저장했습니다.');}
 finally{S._projSaving=false;if(button&&button.isConnected){button.disabled=false;button.textContent='저장';}}
}

/* ---------- connection ---------- */
function sharedConnect(){clearTimeout(sharedConnect.timer);sharedSocket=new WebSocket(location.origin.replace('http','ws')+'/api/live?v='+CLIENT_VERSION+'&token='+encodeURIComponent(sharedToken));
 sharedSocket.onmessage=async e=>{if(e.data==='pong')return;const d=JSON.parse(e.data);if(d.y){sharedYMessage(d);return;}sharedMeta(d);if(d.records){if(sharedBusy){setTimeout(sharedRefresh,400);return;}sharedApply(d.records);sharedRedraw();}};
 sharedSocket.onopen=()=>{sharedRefresh();for(const item of ySubs.keys())sharedYSend({y:'join',item,cid:sharedCid});};
 sharedSocket.onclose=()=>{if(sharedReady)sharedConnect.timer=setTimeout(sharedConnect,3000);};
}
async function sharedRefresh(){if(sharedBusy||!sharedReady)return;try{const r=await apiFetch('/api/state');if(r.status===401){sharedEnd();return;}if(!r.ok)return;const d=await r.json();sharedMeta(d);
 const delta={...d.records};Object.keys(sharedBase).forEach(k=>{if(!(k in d.records))delta[k]=null;});const changed=!same(delta,sharedBase);sharedApply(delta);if(changed)sharedRedraw();}catch{}}
// One-time addition (2026-11-16, owner request): the public reference links of the 판교 master schedule workbook go into 자료실.
// Ids are fixed, so a second browser running this at the same moment cannot create duplicates. Deleting an entry later is final.
// Each row: [title, url, description, first wording]. Descriptions are short notes, not polite sentences (owner's style rule);
// databases that already hold the first wording get it replaced once (archLinksStyleV2), unless someone has edited the text since.
function referenceLinks(){return {tabs:{
  '법규':[['전기안전 검사 신청 규정 (국가법령정보센터)','https://law.go.kr/LSW/lsLinkCommonInfo.do?lspttninfSeq=167269','검사일 7일 전까지 검사 신청 (2026-09-18 시행 규칙 제6조제5항). 실행 전 현행 규정 재확인 필요.','검사일 7일 전까지 검사를 신청하도록 한 규정입니다 (2026-09-18 시행 규칙 제6조제5항). 실행 전에 현행 규정을 다시 확인합니다.'],
   ['전기안전관리자 선임 규정 (국가법령정보센터)','https://law.go.kr/LSW/lsLinkCommonInfo.do?lspttninfSeq=167321','적용 대상의 선임 시점 확인 규정 (제25조제2항).','적용 대상의 선임 시점을 확인하는 규정입니다 (제25조제2항).'],
   ['관세청 수입통관 안내','https://www2.customs.go.kr/kcs/cm/cntnts/cntntsView.do?cntntsId=817&mi=2819','품목분류, 요건확인, 신고·검사, 수리, 반출 절차 안내.','품목분류, 요건확인, 신고·검사, 수리, 반출 절차 안내입니다.'],
   ['관세청 가격신고 안내','https://customs.go.kr/kcs/cm/cntnts/cntntsView.do?cntntsId=821&mi=2823','과세가격 산출과 관련 거래·가격 자료 안내. 실제 세율·세액은 관세사 확인 필요.','과세가격 산출과 관련 거래·가격 자료 안내입니다. 실제 세율·세액은 관세사 확인이 필요합니다.'],
   ['국립전파연구원 적합성평가 안내','https://www.rra.go.kr/ko/license/A_a_about.do','장비 모델별 적합인증, 등록, 자기적합확인, 잠정인증과 해당 여부 확인 안내.','장비 모델별 적합인증, 등록, 자기적합확인, 잠정인증과 해당 여부 확인 안내입니다.'],
   ['ICC Incoterms 2020: EXW와 DDP','https://academy.iccwbo.org/incoterms/article/incoterms-2020-exw-or-ddp/','DDP 조건의 수입통관, 관세·세금, 지정 목적지 인도 책임 설명.','DDP 조건에서 수입통관, 관세·세금, 지정 목적지 인도 책임을 설명합니다.'],
   ['미국 연방조달규정 FAR 5.2 (공고·제안기간)','https://www.acquisition.gov/far/subpart-5.2','미국 연방조달의 공고·제안기간 기준. 참고 사례이며 국내 민간 발주에는 법적 적용 없음.','미국 연방조달의 공고와 제안기간 기준입니다. 참고 사례이며 국내 민간 발주에 법적으로 적용되지 않습니다.']],
  '설계':[['Schneider/APC WP140: 데이터센터 구축 표준 절차','https://www.facilitiesnet.com/whitepapers/pdfs/APC_083011.pdf','Prepare, Design, Acquire, Implement 4단계와 업무별 입력·산출물·책임·승인 구조 (pp.4~10, 16).','Prepare, Design, Acquire, Implement 4단계와 업무별 입력·산출물·책임·승인 구조를 설명합니다 (pp.4~10, 16).'],
   ['US DOE/LANL 커미셔닝 가이드','https://www.energy.gov/sites/prod/files/2013/12/f5/sustainable_guide_ch9.pdf','개념설계부터 시험, 교육, 운영까지 커미셔닝(Cx) 참여 방법 (pp.2~3).','개념설계부터 시험, 교육, 운영까지 커미셔닝(Cx)이 참여하는 방법을 설명합니다 (pp.2~3).'],
   ['GAO 일정평가 가이드 (Schedule Assessment Guide)','https://www.gao.gov/assets/gao-16-89g.pdf','공정표의 선후행 연결과 일정 검증 기준 (pp.33~34).','공정표의 선후행 연결과 일정 검증 기준입니다 (pp.33~34).'],
   ['Microsoft Project: 작업 의존관계 (FS/SS/FF)','https://support.microsoft.com/en-US/project/link-tasks-in-a-project','작업 사이의 FS, SS, FF 연결 방식 설명.','작업 사이의 FS, SS, FF 연결 방식 설명입니다.'],
   ['Microsoft Project: 크리티컬 패스','https://support.microsoft.com/en-us/project/manage-your-project-s-critical-path','총여유가 없는 업무를 크리티컬로 구분하는 방법.','총여유가 없는 업무를 크리티컬로 구분하는 방법 설명입니다.']],
  '기술':[['NVIDIA Infrastructure Services (NVIS)','https://www.nvidia.com/en-us/support/enterprise/infrastructure-services/','계획·설계, 사전준비, 현장구축, 시험검증, 교육, 최종이관으로 이어지는 NVIS 수행 범위.','계획·설계, 사전준비, 현장구축, 시험검증, 교육, 최종이관으로 이어지는 NVIS 수행 범위 안내입니다.'],
   ['NVIS 공식 데이터시트 (PDF)','https://cdn.pathfactory.com/assets/10412/contents/867639/163243c3-8c8f-4b02-85fc-17d95d392d72.pdf','2024년 8월 자료. 초기 참여, 프로젝트별 SOW·일정, 검증·인계 업무 설명.','2024년 8월 자료입니다. 초기 참여, 프로젝트별 SOW·일정, 검증·인계 업무를 설명합니다.'],
   ['Vertiv: CDU(냉각수 분배 장치) 이해','https://www.vertiv.com/en-asia/insights/articles/educational-articles/understanding-coolant-distribution-units-cdus-for-liquid-cooling/','시설 냉각수(FWS)와 장비 냉각수(TCS)의 분리, CDU 접속 경계 설명.','시설 냉각수(FWS)와 장비 냉각수(TCS)의 분리, CDU 접속 경계를 설명합니다.'],
   ['Vertiv: 액체냉각 서비스','https://www.vertiv.com/en-asia/campaigns/liquid-cooling-services/','유체 관리, 오염 제거, 에어퍼지, 수질, 설치·시운전 검토 항목.','유체 관리, 오염 제거, 에어퍼지, 수질, 설치·시운전 검토 항목 참고 자료입니다.'],
   ['Rystad Energy: 전력기기 시장 전망','https://www.rystadenergy.com/insights/grid-equipment-market-outlook','변압기 등 전력기기 조달기간이 길어지는 시장 상황. 실제 납기는 업체 견적 우선.','변압기 등 전력기기의 조달기간이 길어지는 시장 상황 참고 자료입니다. 실제 납기는 업체 견적이 우선입니다.']],
  '기타':[['Texas A&M–WWT 계약·SOW (미국 실제 계약)','https://assets.system.tamus.edu/files/budgets-acct/pdf/SB20_Contracts/AB0990978.pdf','발주자·OEM 일정 통합과 변경관리 참고 사례 (pp.18~19, 21~22, 50~53).','발주자·OEM 일정 통합과 변경관리 참고 사례입니다 (pp.18~19, 21~22, 50~53).'],
   ['Texas A&M AI CoE RFP (미국 실제 발주)','https://assets.system.tamus.edu/files/budgets-acct/pdf/HUB_Solicitations/CIO-25-229.pdf','설계·구축·현장 준비·통합·교육 책임과 제안평가, 질의응답 일정 구조 참고 사례 (Section 3, pp.9~11).','설계·구축·현장 준비·통합·교육 책임과 제안평가, 질의응답 일정 구조 참고 사례입니다 (Section 3, pp.9~11).']]},
 cards:[['Elice','https://www.dell.com/en-us/learn/customer-stories/lp/customer-stories-elice','GPUaaS와 자체 AI 인프라를 운영하는 국내 업체.\n(Dell 고객 사례)','GPUaaS와 자체 AI 인프라를 운영하는 국내 업체입니다.\n(Dell 고객 사례)'],
  ['FPT Smart Cloud · NAVER Cloud','https://navercorp.com/en/media/pressReleasesDetail?seq=10034762','2026년 10월 AI Factory·GPUaaS APAC 협력 발표.\n(네이버 보도자료)','2026년 10월 AI Factory·GPUaaS APAC 협력을 발표했습니다.\n(네이버 보도자료)'],
  ['NHN Cloud GPU Instance','https://www.gov-nhncloud.com/kr/service/compute/gpu-instance','NHN Cloud의 GPU 인스턴스 서비스 안내.','NHN Cloud의 GPU 인스턴스 서비스 안내입니다.'],
  ['Runpod','https://www.runpod.io/legal/compliance','데이터센터·인프라 파트너와 지역별로 협업하는 GPU 클라우드.\n(컴플라이언스 안내)','데이터센터·인프라 파트너와 지역별로 협업하는 GPU 클라우드입니다.\n(컴플라이언스 안내)'],
  ['FriendliAI','https://friendli.ai/pricing?product=serverless-endpoints','고객 GPU에서 추론 스택을 운영하는 방식(BYOG) 제공.\n(요금 안내)','고객 GPU에서 추론 스택을 운영하는 방식(BYOG)을 제공합니다.\n(요금 안내)']]};}
function addReferenceLinksV1(){
 const L=referenceLinks(), now=Date.now(); let n=0;
 for(const [want,rows] of Object.entries(L.tabs)){const tab=ARCH_TABS.includes(want)?want:(ARCH_TABS.includes('기타')?'기타':ARCH_TABS[0]);
  rows.forEach(r=>{const id='lnk1_'+(n++); if(!tab||item(id))return;
   ITEMS.push({id,type:'research',arch:tab,title:r[0],url:r[1],src:hostOf(r[1]),body:'<p>'+esc(r[2])+'</p>',proj:PROJECTS.pangyo?'pangyo':(orderedProjects()[0]||''),date:TODAY,created:TODAY,createdAt:new Date(now-n).toISOString(),status:'published',st:'prog',pri:'mid',people:[],comments:[]});});}
 let sec=ARCH_SECTIONS.find(x=>x.name==='웹사이트')||ARCH_SECTIONS[0]; if(!sec){sec={name:'웹사이트',cards:[]};ARCH_SECTIONS.push(sec);}
 L.cards.forEach((c,i)=>{const id='lk1_'+i; if(!sec.cards.some(x=>x.id===id))sec.cards.push({id,name:c[0],url:c[1],desc:c[2]});});
}
// Rewrites the first wording of those descriptions into note style, only where the text is still exactly as it was added.
function restyleReferenceLinksV2(){
 const L=referenceLinks(); let n=0;
 for(const rows of Object.values(L.tabs))rows.forEach(r=>{const id='lnk1_'+(n++); const it=ITEMS.find(x=>x.id===id); if(it&&!it.editing&&it.body==='<p>'+esc(r[3])+'</p>')it.body='<p>'+esc(r[2])+'</p>';});
 L.cards.forEach((c,i)=>{for(const sec of ARCH_SECTIONS){const x=sec.cards.find(k=>k.id==='lk1_'+i); if(x&&x.desc===c[3])x.desc=c[2];}});
}
// One-time reorganisation (2026-11-16, owner request): 자료실 link cards are grouped by what they are used for instead of by medium,
// the 19 links of "AIDC 아카이브 추가 링크 정리" are added, and repeated copies of the same card are dropped.
// Only exact copies (same address, name and description) are removed; a card somebody changed, and any section or card this does not know, is left alone.
// Card rows: [id, name, url, description, caution]. Texts are short notes, not polite sentences (owner's style rule).
function reorganizeArchiveV3(){
 const key=u=>{const h=urlHref(u==='#'?'':u);return h?h.toLowerCase().replace(/\/+$/,''):'';};
 const PLAN=[
  ['입지·전력 확보',[
   ['lk3_kepco','한전ON 여유용량','https://online.kepco.co.kr/EWM104D04','지역·변전소별 전력공급 여유정보를 표와 지도로 확인하는 한전 공식 서비스. AIDC 후보지의 초기 전력 검토에 활용.','여유용량 조회는 공급 확약이 아님. 실제 수전 가능 여부는 세부 검토와 한전 협의 필요.'],
   ['lk3_dcmap','Data Center Map (한국)','https://www.datacentermap.com/south-korea/','국내 데이터센터를 지역별로 찾아보는 전문 디렉터리. 후보지 주변 데이터센터 분포와 운영사·경쟁시설 조사에 활용.','최신 시설 수는 미확정. 개별 시설 정보는 운영사 원문과 대조.']]],
  ['설계·냉각 레퍼런스',[
   ['lk3_se','Schneider Reference Designs','https://www.se.com/ww/en/work/solutions/ai-factory/reference-designs/','전력·냉각·IT 공간을 통합한 AI 데이터센터 표준 설계안 공식 라이브러리. GB200·GB300 등 플랫폼별 설계 요약과 도면·장비목록 패키지의 출발점.','여러 설계안을 계속 찾아보는 포털. 일부 엔지니어링 패키지는 별도 요청 필요.'],
   ['lk3_dsx','NVIDIA DSX 기술문서','https://docs.nvidia.com/dsx','AI Factory의 설계·시뮬레이션·전력 최적화·GPU 운영 기술자료를 연결하는 공식 문서 허브. 시설과 IT 인프라를 함께 검토할 때의 기준 자료.','일부 레퍼런스 설계는 NVOnline 접근 권한 필요.'],
   ['lk3_tetra','Tetra Tech 액체냉각 가이드','https://www.tetratech.com/insights/optimizing-data-center-direct-to-chip-liquid-cooling-with-pg-25/','Direct-to-Chip 액체냉각의 냉각유체·재료 선정·부식 방지·유지관리 설계 가이드. DLC 설계 검토와 공급사 질의사항 작성에 활용.','개별 설계 조건과 냉각유체 사양에 맞춰 적용. 모든 서버·설비의 공통 기준으로 쓰지 않음.']]],
  ['GPU 요금·사업성 조사',[
   ['lk3_cw','CoreWeave Pricing','https://www.coreweave.com/pricing','온디맨드·스팟 요금과 예약 사용 조건을 확인하는 GPU 인스턴스 공식 요금 페이지. 스토리지·네트워크 비용까지 함께 비교 가능.','인스턴스당 가격과 GPU 1장당 가격 구분. GPU 구성·리전·약정기간을 맞춰 비교.'],
   ['lk3_crusoe','Crusoe Cloud Pricing','https://www.crusoe.ai/cloud/pricing','GPU·CPU·스토리지부터 관리형 Kubernetes, 추론 서비스까지의 공식 요금 체계. 시간당 임대와 모델·토큰 기반 서비스의 상품 구조 비교용.','현재 요금과 시행 예정 요금이 함께 표시될 수 있어 적용일 확인 필요.'],
   ['lk3_metro','Metronome Pricing Index','https://metronome.com/pricing-index/crusoe-cloud','클라우드 서비스의 가격 스냅샷·과금 방식·변경 이력을 정리한 보조 조사자료. 요금 구조와 과거 변화의 맥락 파악용.','제3자 자료. 최신 가격은 업체 공식 요금표와 대조.'],
   ['lk3_wayback','Wayback Machine','https://web.archive.org/','과거 웹페이지 보관본을 날짜별로 확인하는 도구. GPU 공식 요금표의 과거 가격과 상품 구성 변경 추적에 활용.','보관되지 않은 날짜가 있고 동적 가격표는 누락 가능. 관측한 가격과 실제 변경일 구분.']]],
  ['GPU 클라우드 사업자',[]],
  ['GPU 운영·서비스 상품화',[
   ['lk3_backend','Backend.AI GPU 가상화','https://www.backend.ai/platform/gpu-virtualization','GPU 분할·공유와 다중 사용자 자원 배분 기능을 설명하는 래블업 공식 제품 페이지. GPUaaS 운영 방식과 부서·고객별 자원 할당 정책 검토용.','기능·효과는 공급사 설명. 실제 성능과 도입 적합성은 대상 장비·워크로드 기준으로 검증 필요.'],
   ['lk3_ixcsp','INFINITIX ixCSP','https://www.infinitix.ai/en/products/ixcsp/','GPU·모델·토큰 서비스 상품화를 위한 사용량 계량·과금·테넌트 관리 플랫폼. 고객 포털과 종량제 상품 구성 검토용.','공급사 제품 설명 기준. 실제 과금 연동·운영 성능과 도입 조건은 별도 확인 필요.']]],
  ['분산전원·에너지 대안',[
   ['lk3_clearbrook','Clearbrook Energy','https://clearbrookenergysolutions.com/','배터리 시스템과 AI 기반 에너지 관리 기술을 결합한 에너지 솔루션 기업. BESS와 에너지 운영을 결합한 사업모델·협력사 사례 조사용.','기업 소개 기준의 사례 조사용 링크. 성능·경제성·국내 적용 가능성은 미검증.'],
   ['lk3_skeco','SK에코플랜트 뉴스룸','https://news.skecoplant.com/board/18768','데이터센터의 SOFC 적용과 연료전지 폐열 활용 사례를 설명하는 기업 공식 콘텐츠. 국내 프로젝트와 전력·냉각 연계 방식 확인용.','사업자 발표와 홍보성 해설 구분. 개별 프로젝트의 최신 진행 상태는 별도 확인.'],
   ['lk3_h2news','월간수소경제','https://www.h2news.kr/news/articleView.html?idxno=13968','수소·연료전지·온사이트 발전의 기술과 사업 동향을 다루는 전문 매체. 계통접속 지연 대응과 분산전원 도입 사례 조사용.','동향 파악용 보조자료. 기술기준·인허가·경제성은 공식 자료와 실견적으로 확인. 링크는 관련 기사.'],
   ['lk3_gasnews','가스신문','https://www.gasnews.com/news/articleView.html?idxno=123524','가스·연료전지 분야 산업 동향과 데이터센터 현장발전 사례를 다루는 전문 매체. SOFC 적용 조건과 전력·열 활용 이슈 조사용.','전문 매체 해설을 공식 설계·안전 기준으로 쓰지 않음. 링크는 관련 기사.']]],
  ['산업동향·기업 검증',[
   ['lk3_dcd','Data Center Dynamics','https://www.datacenterdynamics.com/en/','글로벌 데이터센터의 개발·투자·전력·냉각·운영 동향을 다루는 전문 매체. 뉴스 외에 백서·보고서·웨비나 제공.','기사는 원 사업자 발표와 교차 확인. 콘텐츠별 공개·등록 조건 확인.'],
   ['lk3_lkg','이강기 블로그 (데이터센터)','https://blog.naver.com/lkg5626/224315008583','데이터센터 구축·설비·입지·인허가를 한국어로 풀어 설명하는 전문가 블로그. 기초 이해와 검토 질문 정리용 보조자료.','법령·기간·비용은 공식 원문과 대조. 링크는 대표 글.'],
   ['lk3_dart','금융감독원 DART','https://dart.fss.or.kr/','국내 기업의 사업보고서·재무제표·투자설명서를 조회하는 공식 공시시스템. GPU 운영사와 장비·전력·냉각 업체의 사업구조·재무현황 검증용.','정정 여부·공시일·대상 기간, 별도·연결 기준 확인.'],
   ['lk3_edgar','SEC EDGAR 공시검색','https://www.sec.gov/edgar/search/','미국 증권당국의 공식 공시검색 서비스. NVIDIA 등 미국 공시기업의 연차·분기보고서에서 투자지출·계약·사업위험 확인용.','보고서 종류·공시일·회계기간과 정정 여부 구분.']]]];
 // where the cards that are already there belong
 const HOME={'https://getdeploying.com':'GPU 요금·사업성 조사','https://research.aimultiple.com':'GPU 요금·사업성 조사','https://gpus.io':'GPU 요금·사업성 조사'};
 const homeOf=c=>String(c.id).startsWith('lk1_')?'GPU 클라우드 사업자':HOME[key(c.url)];
 // 1. the same card registered several times: keep the first one, drop the exact copies
 const first=new Map(); ARCH_SECTIONS.forEach(sec=>sec.cards.forEach(c=>{const k=key(c.url); if(k&&!c.trash&&!first.has(k))first.set(k,c);}));
 ARCH_SECTIONS.forEach(sec=>{sec.cards=sec.cards.filter(c=>{const f=first.get(key(c.url)); return !f||f===c||!(f.name===c.name&&(f.desc||'')===(c.desc||''));});});
 // 2. topic sections first, in this order; whatever else exists stays behind them
 const topic=PLAN.map(([name])=>ARCH_SECTIONS.find(x=>x.name===name)||{name,cards:[]});
 const rest=ARCH_SECTIONS.filter(x=>!topic.includes(x));
 // 3. known cards move to their topic
 rest.forEach(sec=>{sec.cards=sec.cards.filter(c=>{const t=topic.find(x=>x.name===homeOf(c)); if(!t)return true; t.cards.push(c); return false;});});
 // 4. the new links (skipped when the id or the address is already there)
 const have=new Set(), ids=new Set(); topic.concat(rest).forEach(sec=>sec.cards.forEach(c=>{ids.add(c.id); if(key(c.url))have.add(key(c.url));}));
 PLAN.forEach(([name,rows],i)=>rows.forEach(r=>{if(ids.has(r[0])||have.has(key(r[2])))return; topic[i].cards.push({id:r[0],name:r[1],url:r[2],desc:r[3],note:r[4]});}));
 // 5. the one demo description that was a polite sentence
 const gp=first.get('https://gpus.io'); if(gp&&gp.desc==='32개 이상의 클라우드 및 GPU 마켓플레이스 제공업체의\n실시간 가격을 단일 테이블로 정규화하여 가장 저렴한\nGPU를 찾아줍니다.')gp.desc='32개 이상의 클라우드·GPU 마켓플레이스 가격을 단일 테이블로 정규화해 최저가 GPU를 찾는 비교 사이트.';
 // 6. the old medium sections disappear once they are empty
 ARCH_SECTIONS=topic.filter(x=>x.cards.length).concat(rest.filter(x=>x.cards.length||!['웹사이트','유튜브','블로그'].includes(x.name)));
}
async function sharedStart(){if(!sharedToken)return false;const r=await apiFetch('/api/state');
 if(!r.ok){localStorage.removeItem(TOKEN_KEY);sharedToken='';return false;}
 const data=await r.json();sharedUser=data.employee;sharedName=data.name;ME=sharedName;sharedMeta(data);
 const agentFixtures=ITEMS.filter(i=>i.agent).map(copy);
 sharedBase=sharedRecords();sharedApply({...Object.fromEntries(Object.keys(sharedBase).map(k=>[k,null])),...data.records});sharedBase=copy(data.records);
 // Agent pages (일일동향·시뮬레이터·용어사전) ship with the design; create them once in the shared database.
 for(const a of agentFixtures)if(!item(a.id))ITEMS.push(copy(a));
 // One-time data fixes, recorded in meta:flags so they run once per database.
 if(!ARCH_TABS.includes('기타')){ARCH_TABS.push('기타');if(!ARCH_ROWS['기타'])ARCH_ROWS['기타']=[];}
 if(!META_FLAGS.projectStatusV2){const want={pangyo:'진행중',incheon:'완료',sunlight:'초기기획사업'};Object.keys(PROJECTS).forEach(id=>applyProjectStatus(id,want[id]||PROJECTS[id].status));META_FLAGS.projectStatusV2=1;}
 if(!META_FLAGS.projectTagV1){ // saving the overview used to overwrite the short project name with the long one
  const short={'판교 AI 데이터센터':'판교 AIDC','부산 AI 데이터센터':'부산 AIDC','인천 청라 AI 데이터센터':'인천 청라 AIDC','인천 청라 AI 데이터센':'인천 청라 AIDC'};
  Object.values(PROJECTS).forEach(p=>{if(short[p.tag])p.tag=short[p.tag];});META_FLAGS.projectTagV1=1;}
 if(!META_FLAGS.trashStampV1){const at=new Date().toISOString();ITEMS.forEach(i=>{if(i.status==='trash'&&!i.trashedAt)i.trashedAt=at;});META_FLAGS.trashStampV1=1;} // older trash had no date: its 30 days start now
 if(!META_FLAGS.archLinksV1){addReferenceLinksV1();META_FLAGS.archLinksV1=1;META_FLAGS.archLinksStyleV2=1;}
 if(!META_FLAGS.archLinksStyleV2){restyleReferenceLinksV2();META_FLAGS.archLinksStyleV2=1;}
 if(!META_FLAGS.archCardsV3){reorganizeArchiveV3();META_FLAGS.archCardsV3=1;}
 PEOPLE[sharedUser]=sharedName;sharedReady=true;sharedRetryAt=0;
 restoreLocal();
 for(const [id,l] of Object.entries(sharedLocks))if(l.employee===sharedUser&&!ownedLocks.has(id)){ownedLocks.add(id);await sharedRelease(id);} // locks left over from a closed tab
 $('#login').style.display='none';$('#app').hidden=false;
 if(typeof myPrefsApply==='function')myPrefsApply();
 restoreRoute();render();if(S.panel)openAny(S.panel);if(S.my&&PREVIEW_ON&&typeof mpOpen==='function')mpOpen(S.my);S.my=null;sharedUi();sharedConnect();return true;
}
async function login(){const employee=$('#lg-id').value.trim();if(!employee){$('#lg-err').textContent='사번을 입력하세요.';$('#lg-err').style.display='block';return;}$('#lg-btn').disabled=true;
 try{const r=await postJson('/api/login',{employee,name:$('#lg-name').value.trim()});const d=await r.json();if(!r.ok)throw Error(d.error);
  sharedToken=d.token;localStorage.setItem(TOKEN_KEY,sharedToken);localStorage.setItem('aidc-known-name:'+d.employee,d.name);$('#lg-err').style.display='none';await sharedStart();}
 catch(e){$('#lg-err').textContent=e.message;$('#lg-err').style.display='block';}finally{$('#lg-btn').disabled=false;}}
async function logout(){closeModal();closePanel(true);await sharedFlush(true);preserveLocal(true);try{await apiFetch('/api/logout',{method:'POST'});}catch{}sharedEnd();history.replaceState(null,'',location.pathname);}
function sharedEnd(message){preserveLocal(true);sharedReady=false;sharedSocket?.close();sharedToken='';localStorage.removeItem(TOKEN_KEY);lastHash=null;sharedRestoreRoute=true;
 $('#app').hidden=true;$('#login').style.display='';if(message){$('#lg-err').textContent=message;$('#lg-err').style.display='block';}}
$('#login').style.display='';$('#app').hidden=true;$('#lg-err').style.display='none';
$('#lg-btn').addEventListener('click',login);['#lg-id','#lg-pw','#lg-name'].forEach(s=>$(s)?.addEventListener('keydown',e=>{if(e.key==='Enter')login();}));
$('#lg-id').addEventListener('input',()=>{const n=localStorage.getItem('aidc-known-name:'+$('#lg-id').value.trim().toUpperCase());$('#lg-name').value=n||'';});
// Logging in or out in another tab of this browser applies here too.
window.addEventListener('storage',e=>{if(e.key!==TOKEN_KEY||e.newValue===sharedToken)return;if(!e.newValue){if(sharedReady)sharedEnd();}else if(!sharedReady){sharedToken=e.newValue;sharedStart().catch(()=>{});}});
setInterval(sharedFlush,250);setInterval(sharedRefresh,15000);window.addEventListener('online',sharedRefresh);
window.addEventListener('beforeunload',()=>{preserveLocal(true);saveRoute();});
setInterval(async()=>{if(!sharedReady)return;try{const r=await apiFetch('/api/heartbeat',{method:'POST'});if(r.status===401){sharedEnd();return;}sharedMeta(await r.json());}catch{}},20000);
setInterval(()=>{if(sharedPendingRedraw)sharedRedraw();saveRoute();},600);
function sharedMeta(data){const changed=data.locks&&!same(data.locks,sharedLocks);if(data.users){sharedUsers=data.users;Object.assign(PEOPLE,sharedUsers);}
 if(data.minClient>CLIENT_VERSION&&sessionStorage.getItem('aidc-reloaded-for')!==String(data.minClient)){ // a newer build is live
  if(!openItems().some(x=>x.editing||x.status==='new')&&!S.editProj){sessionStorage.setItem('aidc-reloaded-for',String(data.minClient));location.reload();}else toast('새 버전이 배포되었습니다. 저장한 뒤 새로고침해 주세요.',5000);}
 if(data.locks){sharedLocks=data.locks;for(const id of [...ownedLocks])if(!lockMine(sharedLocks[id])){ownedLocks.delete(id);const it=id.startsWith('item:')?item(id.slice(5)):null;
  if(it?.editing){sharedKeepDraft(it);const o=it._editOriginal;if(o){Object.keys(it).forEach(k=>delete it[k]);Object.assign(it,o);}it.editing=false;sharedStatus('편집 잠금이 해제되어 작성 내용을 초안으로 보관했습니다.');rerenderItem();}
  if(id.startsWith('project:')&&S.editProj&&id==='project:'+S.proj){restoreProjectSnap();S.editProj=false;render(true);}}}
 sharedUi();if(changed&&sharedReady){sharedRedraw();if(typeof nbCoWatch==='function')nbCoWatch();}}
// A lock is mine when I hold it or when I edit along with the member who holds it (l.co: those who joined).
const lockMine=l=>!!l&&(l.employee===sharedUser||(l.co||[]).some(c=>c.employee===sharedUser));
function otherLock(id){const l=sharedLocks[id];return l&&l.expires>Date.now()&&!lockMine(l)?l:null;}
// Edit an item along with the member who is editing it. Resolves to {co:true} when joined, {co:false} when the lock was free after all, null when refused.
async function sharedJoinEdit(id){if(!sharedReady||!sharedBase[id])return null;
 try{const r=await postJson('/api/lock',{id,action:'join'});const d=await r.json();if(!r.ok){sharedMeta(d);toast(d.error||'함께 수정할 수 없습니다.');return null;}ownedLocks.add(id);sharedMeta(d);if(d.record&&!d.co)sharedApply({[id]:d.record});return {co:!!d.co};}catch{toast('연결을 확인한 후 다시 시도해 주세요.');return null;}}
/* ---------- the shared document of an item that is edited together (messages go over the live socket) ---------- */
const sharedCid=(crypto.randomUUID?crypto.randomUUID():String(Math.random())).replace(/-/g,'').slice(0,12); // this page
const ySubs=new Map(); // item id -> handler of incoming messages
function sharedYSend(o){if(sharedSocket&&sharedSocket.readyState===1){try{sharedSocket.send(JSON.stringify(o));return true;}catch{}}return false;}
function sharedYOpen(item,handler){ySubs.set(item,handler);sharedYSend({y:'join',item,cid:sharedCid});}
function sharedYClose(item){if(!ySubs.has(item))return;ySubs.delete(item);sharedYSend({y:'leave',item,cid:sharedCid});}
function sharedYMessage(d){const h=ySubs.get(d.item);if(h){try{h(d);}catch(e){console.error(e);}}else if(d.y==='no'&&typeof nbCoRefused==='function')nbCoRefused(d.item);}
async function sharedBeginEdit(id){if(!sharedReady)return false;if(!sharedBase[id])return true;
 try{const r=await postJson('/api/lock',{id,action:'acquire'});const d=await r.json();sharedMeta(d);if(!r.ok){toast(d.error);return false;}ownedLocks.add(id);if(d.record){sharedApply({[id]:d.record});}return true;}catch{toast('연결을 확인한 후 수정해주세요.');return false;}}
async function sharedRelease(id){if(!ownedLocks.has(id))return;try{const r=await postJson('/api/lock',{id,action:'release'});if(r.ok){ownedLocks.delete(id);sharedMeta(await r.json());}}catch{}}
function sharedUi(){if(!sharedReady)return;
 for(const [id,pin] of [[S.panel,$('#panel-pin')],[S.full,$('#item-pin')]]){const it=id&&ITEMS.find(x=>x.id===id);if(!it||pin.dataset.id!==id)continue;const l=otherLock('item:'+id);
  for(const b of $$('[data-ed="edit"]',pin)){b.disabled=!!l;b.textContent=l?userName(l.employee)+'님이 수정 중입니다':'수정';b.title=l?'다른 사용자의 편집이 끝나면 수정할 수 있습니다.':'';}
  for(const el of $$('.ititle[data-f="title"],.ibody[data-f="body"]:not([data-nb])',pin))el.contentEditable=canEditItem(it)?'true':'false';
  for(const b of $$('[data-pick], [data-ed="trash"]',pin)){b.style.opacity=l?'.5':'';b.title=l?userName(l.employee)+'님이 수정 중입니다':'';}}
 const p=otherLock('project:'+S.proj);for(const b of $$('[data-editproj]')){b.disabled=!!p;b.textContent=p?userName(p.employee)+'님이 수정 중입니다':S.editProj?'저장':'수정';}
 $('#tb-user .nm').textContent=sharedName;const n=$('#mnav .me .nm');if(n)n.textContent=sharedName;
}
let renewTimer=0;
document.addEventListener('input',()=>{if(!ownedLocks.size||Date.now()-renewTimer<5000)return;renewTimer=Date.now();for(const id of ownedLocks)postJson('/api/lock',{id,action:'renew'}).then(r=>r.json()).then(sharedMeta).catch(()=>{});});
setInterval(()=>{if(!sharedReady||sharedBusy)return;const diff=sharedDiff(sharedBase,sharedRecords());for(const id of [...ownedLocks]){const it=id.startsWith('item:')?item(id.slice(5)):null;
 if(it?.editing&&it.id!==S.panel&&it.id!==S.full){sharedKeepDraft(it);const backup=it._editOriginal;Object.keys(it).forEach(k=>delete it[k]);Object.assign(it,backup||sharedBase[id]);it.editing=false;}
 if(!it?.editing&&!(id==='project:'+S.proj&&S.editProj)&&!diff.some(c=>c.id===id))sharedRelease(id);}},3000);

/* ---------- routing: the address always describes the open page, so reload, back/forward and shared links work ---------- */
const ROUTE_KEYS=['page','proj','full','panel','my'];
let lastHash=null,routeApplying=false;
const panelExists=id=>!!(item(id)||(typeof schPanelHtml==='function'&&/^s[pget]-/.test(id)&&schPanelHtml(id))||PARTNERS.some(p=>p.id===id&&!p.trash)||/^lib:(meeting|action|research)$/.test(id)||(/^\d+:/.test(id)&&(ARCH_SECTIONS[+id.split(':')[0]]||{cards:[]}).cards.some(c=>c.id===id.split(':')[1]&&!c.trash)));
const routeHash=r=>{const p=new URLSearchParams();for(const k of ROUTE_KEYS)if(r[k])p.set(k,r[k]);const s=p.toString();return s?'#'+s:'';};
function cleanRoute(r){r={...r};if(!['main','project','archive'].includes(r.page))r.page='main';if(r.page==='project'&&!PROJECTS[r.proj]){r.page='main';r.proj=null;}if(r.page!=='project')r.proj=null;
 if(typeof schDeferRoute==='function')schDeferRoute(r); // a task of a schedule that is still loading is opened once it is there
 if(r.full&&!item(r.full))r.full=null;if(r.panel&&!panelExists(r.panel))r.panel=null;return r;}
function openAny(id){if(id.startsWith('lib:'))openLibrary(id.slice(4));else openPanel(id,true);}
function afterNav(){sharedUi();saveRoute();if(typeof schAfterNav==='function')schAfterNav();}
function saveRoute(){if(!sharedReady||sharedRestoreRoute||routeApplying)return;
 const route={page:S.page,proj:S.proj,panel:S.panel,full:S.full,actPage:S.actPage,resPage:S.resPage,ptPage:S.ptPage,archTab:S.archTab,archPage:S.archPage,calY:S.calY,calM:S.calM,calYp:S.calYp,calMp:S.calMp,
  q:S.q,filters:S.filters,typeOff:S.typeOff,partnerCat:S.partnerCat,actPer:S.actPer,selDate:S.selDate,sort:S.sort,scroll:$('#content').scrollTop,panelScroll:$('#panel').scrollTop,my:typeof mpRoute==='function'?mpRoute():null};
 sessionStorage.setItem('aidc-route:'+sharedUser,JSON.stringify(route));
 const hash=routeHash(route);if(hash===lastHash)return;
 const url=location.pathname+location.search+hash;if(lastHash===null)history.replaceState({aidc:1},'',url);else history.pushState({aidc:1},'',url);lastHash=hash;}
function restoreRoute(){let r={};try{if(navigationType==='reload')r=JSON.parse(sessionStorage.getItem('aidc-route:'+sharedUser)||'{}');const q=new URLSearchParams(location.hash.slice(1));if([...q.keys()].length){for(const k of ROUTE_KEYS)r[k]=q.get(k)||null;}}catch{}
 r=cleanRoute(r);const scroll=r.scroll||0,panelScroll=r.panelScroll||0;delete r.scroll;delete r.panelScroll;
 if(r.q)r.q=Object.assign({action:'',research:'',partner:''},r.q);if(r.filters)r.filters=Object.assign({},S.filters,r.filters);
 for(const k of Object.keys(r))if(r[k]===undefined)delete r[k];
 Object.assign(S,r);S.editProj=false;sharedRestoreRoute=false;sharedJumpBlock();setTimeout(()=>{$('#content').scrollTop=scroll;$('#panel').scrollTop=panelScroll;saveRoute();},0);}
// Back / forward: show whatever the address now says. What was being edited is saved first (guardLeave); nothing is asked.
function applyRoute(r,force){
 if(!force){let done=false;if(guardLeave(()=>{done=true;applyRoute(r,true);},'all')){if(!done)history.pushState({aidc:1},'',location.pathname+location.search+(lastHash||''));return;}}
 routeApplying=true;try{closePop();closeModal();const d=$('#dlg');if(d)d.remove();
  if(S.editProj){restoreProjectSnap();sharedRelease('project:'+S.proj);S.editProj=false;}
  S.page=r.page;S.proj=r.proj;S.full=r.full;S.panel=null;$('#panel').classList.remove('on');$('#app').classList.remove('panel-open');
  render();if(r.panel)openAny(r.panel);if(r.my&&typeof mpOpen==='function'&&PREVIEW_ON)mpOpen(r.my);
 }finally{routeApplying=false;}
 lastHash=routeHash({page:S.page,proj:S.proj,full:S.full,panel:S.panel,my:typeof mpRoute==='function'?mpRoute():null});
 if(location.hash!==lastHash)history.replaceState({aidc:1},'',location.pathname+location.search+lastHash);sharedUi();}
// An address may end in &block=<id>: once the item is open, that block is scrolled to and flashed.
function sharedJumpBlock(){const b=new URLSearchParams(location.hash.slice(1)).get('block');if(b&&typeof nbJump==='function')setTimeout(()=>nbJump(b),450);}
window.addEventListener('popstate',()=>{if(!sharedReady)return;const q=new URLSearchParams(location.hash.slice(1));const r={};for(const k of ROUTE_KEYS)r[k]=q.get(k)||null;const b=q.get('block');applyRoute(cleanRoute(r));if(b&&typeof nbJump==='function')setTimeout(()=>nbJump(b),450);});

sharedStart().catch(()=>sharedStatus('서버 연결을 확인해주세요.'));

/* Sidebar service links: only title text and arrow navigate externally. */
(()=>{
 const links={ag_daily:'https://sunjinfuture2.github.io/sunjin-aidcnews/',ag_sim:'https://sunjinfuture2.github.io/simulator/AIDC_Revenue-Structure_Simulator_3y_rev14.6.html',ag_glossary:'https://sunjinfuture2.github.io/AIDC_Infrastructure_Glossary/3d/'};
 const style=document.createElement('style');style.textContent='#sb .agent a[data-service-link]{color:inherit;text-decoration:none;cursor:pointer}#sb .agent a[data-service-link]:hover{text-decoration:underline}#sb .agent a[data-service-link]:focus-visible{outline:2px solid #ff7900;outline-offset:3px}#sb .agent a.service-arrow{display:inline-flex;align-items:center;flex:none}';document.head.append(style);
 function setup(){for(const [id,url] of Object.entries(links)){const row=document.querySelector('#sb .agent [data-open="'+id+'"]');if(!row)continue;const label=row.querySelector('.tx');if(label&&!label.querySelector('[data-service-link]')){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.dataset.stop='';a.dataset.serviceLink=id;a.title=label.textContent+' (새 탭)';a.append(...label.childNodes);label.append(a);}const arrow=row.querySelector('svg.ext');if(arrow&&!arrow.closest('[data-service-link]')){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.dataset.stop='';a.dataset.serviceLink=id;a.className='service-arrow';a.setAttribute('aria-label',(label?.textContent||'서비스')+' 새 탭에서 열기');arrow.before(a);a.append(arrow);}}}
 setup();const sb=document.querySelector('#sb');if(sb)new MutationObserver(setup).observe(sb,{childList:true,subtree:true});
})();
