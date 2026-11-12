/* Shared client: login, server sync, edit locks, conflict recovery and routing.
   build-shared.mjs injects this file into the app script at the LOGIN marker, so it uses the app's globals (ITEMS, S, render, …). */
const CLIENT_VERSION=2;                       // must be >= MIN_CLIENT in shared-worker.mjs
const TOKEN_KEY='aidc-token';                 // one login per browser, shared by all its tabs
let sharedUser='',sharedName='',sharedToken='',sharedBase={},sharedUsers={},sharedLocks={};
let sharedReady=false,sharedBusy=false,sharedPendingRedraw=false,sharedRestoreRoute=true,sharedRetryAt=0,sharedSocket;
const ownedLocks=new Set();
let META_FLAGS={};                            // one-time migrations already applied to this shared database
// Client-only fields of an item: never sent to the server, never compared for changes.
const TRANSIENT=['editing','_editOriginal','snap','dirty','sessionNew','_recoverySignature'];
const stripTransient=v=>{for(const k of TRANSIENT)delete v[k];return v;};
const copy=v=>JSON.parse(JSON.stringify(v));
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const userName=id=>sharedUsers[id]||PEOPLE[id]||id||'';
// Meta records that are compared field by field (two people changing different fields do not collide).
const FIELD_META=new Set(['meta:head','meta:rows','meta:members','meta:settings','meta:flags']);
const metaTarget=key=>({'meta:head':PHEAD,'meta:rows':ARCH_ROWS,'meta:members':MEMBERS_META,'meta:settings':SETTINGS,'meta:flags':META_FLAGS})[key];
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
  const head=copy(PHEAD);if(hold&&sharedBase['meta:head']&&sharedBase['meta:head'][hold])head[hold]=copy(sharedBase['meta:head'][hold]);
  Object.assign(out,{'meta:order':copy(PROJ_ORDER),'meta:roadmap':copy(ROADMAP),'meta:head':head,'meta:archive':copy(ARCH_SECTIONS),'meta:tabs':copy(ARCH_TABS),'meta:rows':copy(ARCH_ROWS),
    'meta:flags':copy(META_FLAGS),'meta:notices':copy(NOTICES),'meta:settings':copy(SETTINGS),'meta:members':copy(MEMBERS_META)});
  if(sharedUser)out['meta:inbox:'+sharedUser]=copy(INBOX_STATE);
  for(const k of Object.keys(sharedBase))if(!(k in out)&&k.startsWith('meta:'))out[k]=copy(sharedBase[k]); // records this page does not model (other people's inbox state, future keys)
  return out;
}
function sharedDiff(a,b){const changes=[];for(const id of new Set([...Object.keys(a),...Object.keys(b)])){
  if(same(a[id],b[id]))continue;
  if((id.startsWith('meta:')&&!FIELD_META.has(id))||!a[id]||!b[id]){changes.push({id,before:a[id]??null,after:b[id]??null});continue;}
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
  else if(v==null)return;                                                           // a meta record missing on the server keeps the page default
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
  else if(key==='meta:inbox:'+sharedUser)INBOX_STATE=Object.assign({read:[],checked:[]},copy(v));
}
// Records that are saved field by field, and the live object behind each of them.
const fieldLevel=key=>key.startsWith('item:')||key.startsWith('project:')||FIELD_META.has(key);
const targetOf=key=>key.startsWith('item:')?ITEMS.find(x=>x.id===key.slice(5)):key.startsWith('project:')?PROJECTS[key.slice(8)]:metaTarget(key);
// Takes a server record over field by field. A field I have changed since `mine` (my last known copy) keeps my value; everything else follows the server.
function mergeRecord(key,v,mine){const cur=targetOf(key);
  for(const f of new Set([...Object.keys(v),...Object.keys(mine),...Object.keys(cur)])){if(TRANSIENT.includes(f)||!same(cur[f],mine[f]))continue;if(v[f]===undefined)delete cur[f];else cur[f]=copy(v[f]);}
  sharedBase[key]=copy(v);}
function sharedApply(records){
  const local=sharedRecords();
  for(const [key,v] of Object.entries(records)){
    const it=key.startsWith('item:')?ITEMS.find(x=>x.id===key.slice(5)):null;
    if(it&&it.editing){ // my unsaved edit stands until I save; comments other people add meanwhile still come through
      const base=sharedBase[key];if(v&&base&&same(it.comments??[],base.comments??[])){const c=v.comments||[];it.comments=copy(c);base.comments=copy(c);if(it._editOriginal)it._editOriginal.comments=copy(c);}
      continue;}
    if(v&&sharedBase[key]&&fieldLevel(key)&&targetOf(key)){mergeRecord(key,v,sharedBase[key]);continue;}
    if(!same(local[key],sharedBase[key]))continue; // my pending change stands; the server copy arrives after my save
    applyRecord(key,v);}
}
const openItems=()=>[S.panel,S.full].map(id=>id&&ITEMS.find(x=>x.id===id)).filter(Boolean);
// Redraw after a change from the server, but never while this person is typing, choosing from a menu or editing something.
function sharedRedraw(){if(!sharedReady)return;sharedUi();const active=document.activeElement;
 if(active?.matches('input,textarea,select,[contenteditable="true"]')||popEl||$('#dlg')||S.editProj||openItems().some(x=>x.editing||x.status==='new'||(x.status==='draft'&&canEditItem(x)))){sharedPendingRedraw=true;return;}
 sharedPendingRedraw=false;
 if(S.full&&!item(S.full)){S.full=null;toast('해당 게시물이 삭제되었습니다.');}
 if(S.panel&&!panelExists(S.panel))closePanel(true);
 const scroll=$('#content').scrollTop,panelScroll=$('#panel').scrollTop;render();if(S.panel)rerenderItem(S.panel);$('#content').scrollTop=scroll;$('#panel').scrollTop=panelScroll;
 const pane=$('#mnav .item.on')?.dataset.pane; // panes with a form or a server-side list are left alone
 if($('#ovl').classList.contains('on')&&['inbox','members','mine','drafts','trash','teamspace','analytics'].includes(pane)){const st=$('#mbody').scrollTop;renderPane(pane);$('#mbody').scrollTop=st;}
}
// Routine connection/save states stay silent; only problems surface, as a toast, at most once per 10 seconds per message.
let lastStatus='',lastStatusAt=0;
function sharedStatus(text){if(!/못했|확인|필요|보관|겹|재시도|실패/.test(text||''))return;const now=Date.now();if(text===lastStatus&&now-lastStatusAt<10000)return;lastStatus=text;lastStatusAt=now;toast(text,2600);}

/* ---------- attachments, history, members ---------- */
// Attachments are stored by the Worker (/api/file); the page embeds only the file id, so records stay small.
async function sharedUploadFile(file,itemId){if(!sharedReady)throw Error('서버에 연결된 후 첨부할 수 있습니다.');if(file.size>1887436)throw Error('파일은 1.8MB까지 첨부할 수 있습니다. ('+file.name+')');
 const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(Error('파일을 읽지 못했습니다.'));r.readAsDataURL(file);});
 const r=await postJson('/api/file',{name:file.name,type:file.type,size:file.size,item:itemId||'',data});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'파일을 올리지 못했습니다.');return d;}
async function sharedListFiles(){const r=await apiFetch('/api/files');if(!r.ok)throw Error('첨부 파일 목록을 가져오지 못했습니다.');return (await r.json()).files||[];}
async function sharedHistory(limit=100,before=0){const r=await apiFetch(`/api/history?limit=${limit}${before?'&before='+before:''}`);if(!r.ok)throw Error('활동 기록을 가져오지 못했습니다.');return r.json();}
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
  if(!r.ok)throw Error(data.error||'save failed');
  for(const [key,v] of Object.entries(data.records)){
   if(v===null){delete sharedBase[key];continue;}
   const cur=fieldLevel(key)?targetOf(key):null;
   if(cur&&sent[key]&&!cur.editing)mergeRecord(key,v,sent[key]); // also brings in what others changed meanwhile, the cleaned body and the author / time stamps
   else sharedBase[key]=copy(v);}
  for(const key of [...ownedLocks])if(!(key.startsWith('item:')?item(key.slice(5))?.editing:S.editProj))await sharedRelease(key);
  sharedRetryAt=0;preserveLocal();return true;
 }catch(e){sharedRetryAt=Date.now()+3000;sharedStatus('저장하지 못했습니다 · 연결을 확인해 주세요. 내용은 이 브라우저에 보관됩니다.');return false;}
 finally{sharedBusy=false;sharedRedraw();}
}
// The server refused my changes because someone else changed (or is editing) the same thing.
// Take the server copy, keep what can be merged (my comments, untouched fields) and park the rest as a recovery draft.
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
  }else if(FIELD_META.has(key)&&mine&&server){
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
 sharedSocket.onmessage=async e=>{if(e.data==='pong')return;const d=JSON.parse(e.data);sharedMeta(d);if(d.records){if(sharedBusy){setTimeout(sharedRefresh,400);return;}sharedApply(d.records);sharedRedraw();}};
 sharedSocket.onopen=()=>{sharedRefresh();};
 sharedSocket.onclose=()=>{if(sharedReady)sharedConnect.timer=setTimeout(sharedConnect,3000);};
}
async function sharedRefresh(){if(sharedBusy||!sharedReady)return;try{const r=await apiFetch('/api/state');if(r.status===401){sharedEnd();return;}if(!r.ok)return;const d=await r.json();sharedMeta(d);
 const delta={...d.records};Object.keys(sharedBase).forEach(k=>{if(!(k in d.records))delta[k]=null;});const changed=!same(delta,sharedBase);sharedApply(delta);if(changed)sharedRedraw();}catch{}}
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
 purgeOldTrash();
 PEOPLE[sharedUser]=sharedName;sharedReady=true;sharedRetryAt=0;
 restoreLocal();
 for(const [id,l] of Object.entries(sharedLocks))if(l.employee===sharedUser&&!ownedLocks.has(id)){ownedLocks.add(id);await sharedRelease(id);} // locks left over from a closed tab
 $('#login').style.display='none';$('#app').hidden=false;
 restoreRoute();render();if(S.panel)openAny(S.panel);sharedUi();sharedConnect();return true;
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
 if(data.locks){sharedLocks=data.locks;for(const id of [...ownedLocks])if(sharedLocks[id]?.employee!==sharedUser){ownedLocks.delete(id);const it=id.startsWith('item:')?item(id.slice(5)):null;
  if(it?.editing){sharedKeepDraft(it);const o=it._editOriginal;if(o){Object.keys(it).forEach(k=>delete it[k]);Object.assign(it,o);}it.editing=false;sharedStatus('편집 잠금이 해제되어 작성 내용을 초안으로 보관했습니다.');rerenderItem();}
  if(id.startsWith('project:')&&S.editProj&&id==='project:'+S.proj){restoreProjectSnap();S.editProj=false;render(true);}}}
 sharedUi();if(changed&&sharedReady)sharedRedraw();}
function otherLock(id){const l=sharedLocks[id];return l&&l.expires>Date.now()&&l.employee!==sharedUser?l:null;}
async function sharedBeginEdit(id){if(!sharedReady)return false;if(!sharedBase[id])return true;
 try{const r=await postJson('/api/lock',{id,action:'acquire'});const d=await r.json();sharedMeta(d);if(!r.ok){toast(d.error);return false;}ownedLocks.add(id);if(d.record){sharedApply({[id]:d.record});}return true;}catch{toast('연결을 확인한 후 수정해주세요.');return false;}}
async function sharedRelease(id){if(!ownedLocks.has(id))return;try{const r=await postJson('/api/lock',{id,action:'release'});if(r.ok){ownedLocks.delete(id);sharedMeta(await r.json());}}catch{}}
function sharedUi(){if(!sharedReady)return;
 for(const [id,pin] of [[S.panel,$('#panel-pin')],[S.full,$('#item-pin')]]){const it=id&&ITEMS.find(x=>x.id===id);if(!it||pin.dataset.id!==id)continue;const l=otherLock('item:'+id);
  for(const b of $$('[data-ed="edit"]',pin)){b.disabled=!!l;b.textContent=l?userName(l.employee)+'님이 수정 중입니다':'수정';b.title=l?'다른 사용자의 편집이 끝나면 수정할 수 있습니다.':'';}
  for(const el of $$('.ititle[data-f="title"],.ibody[data-f="body"]',pin))el.contentEditable=canEditItem(it)?'true':'false';
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
const ROUTE_KEYS=['page','proj','full','panel'];
let lastHash=null,routeApplying=false;
const panelExists=id=>!!(item(id)||PARTNERS.some(p=>p.id===id&&!p.trash)||/^lib:(meeting|action|research)$/.test(id)||(/^\d+:/.test(id)&&(ARCH_SECTIONS[+id.split(':')[0]]||{cards:[]}).cards.some(c=>c.id===id.split(':')[1]&&!c.trash)));
const routeHash=r=>{const p=new URLSearchParams();for(const k of ROUTE_KEYS)if(r[k])p.set(k,r[k]);const s=p.toString();return s?'#'+s:'';};
function cleanRoute(r){r={...r};if(!['main','project','archive'].includes(r.page))r.page='main';if(r.page==='project'&&!PROJECTS[r.proj]){r.page='main';r.proj=null;}if(r.page!=='project')r.proj=null;
 if(r.full&&!item(r.full))r.full=null;if(r.panel&&!panelExists(r.panel))r.panel=null;return r;}
function openAny(id){if(id.startsWith('lib:'))openLibrary(id.slice(4));else openPanel(id,true);}
function afterNav(){sharedUi();saveRoute();}
function saveRoute(){if(!sharedReady||sharedRestoreRoute||routeApplying)return;
 const route={page:S.page,proj:S.proj,panel:S.panel,full:S.full,actPage:S.actPage,resPage:S.resPage,ptPage:S.ptPage,archTab:S.archTab,archPage:S.archPage,calY:S.calY,calM:S.calM,calYp:S.calYp,calMp:S.calMp,
  q:S.q,filters:S.filters,typeOff:S.typeOff,partnerCat:S.partnerCat,actPer:S.actPer,selDate:S.selDate,sort:S.sort,scroll:$('#content').scrollTop,panelScroll:$('#panel').scrollTop};
 sessionStorage.setItem('aidc-route:'+sharedUser,JSON.stringify(route));
 const hash=routeHash(route);if(hash===lastHash)return;
 const url=location.pathname+location.search+hash;if(lastHash===null)history.replaceState({aidc:1},'',url);else history.pushState({aidc:1},'',url);lastHash=hash;}
function restoreRoute(){let r={};try{if(navigationType==='reload')r=JSON.parse(sessionStorage.getItem('aidc-route:'+sharedUser)||'{}');const q=new URLSearchParams(location.hash.slice(1));if([...q.keys()].length){for(const k of ROUTE_KEYS)r[k]=q.get(k)||null;}}catch{}
 r=cleanRoute(r);const scroll=r.scroll||0,panelScroll=r.panelScroll||0;delete r.scroll;delete r.panelScroll;
 if(r.q)r.q=Object.assign({action:'',research:'',partner:''},r.q);if(r.filters)r.filters=Object.assign({},S.filters,r.filters);
 for(const k of Object.keys(r))if(r[k]===undefined)delete r[k];
 Object.assign(S,r);S.editProj=false;sharedRestoreRoute=false;setTimeout(()=>{$('#content').scrollTop=scroll;$('#panel').scrollTop=panelScroll;saveRoute();},0);}
// Back / forward: show whatever the address now says. Unsaved edits get the usual "저장할까요?" question first.
function applyRoute(r,force){
 if(!force&&guardLeave(()=>applyRoute(r,true))){history.pushState({aidc:1},'',location.pathname+location.search+(lastHash||''));return;}
 routeApplying=true;try{closePop();closeModal();const d=$('#dlg');if(d)d.remove();
  if(S.editProj){restoreProjectSnap();sharedRelease('project:'+S.proj);S.editProj=false;}
  S.page=r.page;S.proj=r.proj;S.full=r.full;S.panel=null;$('#panel').classList.remove('on');$('#app').classList.remove('panel-open');
  render();if(r.panel)openAny(r.panel);
 }finally{routeApplying=false;}
 lastHash=routeHash({page:S.page,proj:S.proj,full:S.full,panel:S.panel});
 if(location.hash!==lastHash)history.replaceState({aidc:1},'',location.pathname+location.search+lastHash);sharedUi();}
window.addEventListener('popstate',()=>{if(!sharedReady)return;const q=new URLSearchParams(location.hash.slice(1));const r={};for(const k of ROUTE_KEYS)r[k]=q.get(k)||null;applyRoute(cleanRoute(r));});

sharedStart().catch(()=>sharedStatus('서버 연결을 확인해주세요.'));
