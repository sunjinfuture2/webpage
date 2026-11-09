let sharedUser='',sharedBase={},sharedBusy=false,sharedReady=false,sharedSocket,sharedBlocked=false;
let sharedName='',sharedUsers={},sharedLocks={},sharedPendingRedraw=false,sharedToken='',sharedRestoreRoute=true;
const ownedLocks=new Set();
// Client-only fields of an item: never sent to the server, never compared for changes.
const TRANSIENT=['editing','_editOriginal','snap','dirty','sessionNew'];
const stripTransient=v=>{for(const k of TRANSIENT)delete v[k];return v;};
// Keep the notice at the document top, inside the scrolling content area.
$('#content').prepend($('#notice'));
$('#notice').style.top='8.3px';
const navigationType=performance.getEntriesByType('navigation')[0]?.type;
if(navigationType==='reload')sharedToken=sessionStorage.getItem('aidc-tab-token')||'';
else sessionStorage.removeItem('aidc-tab-token');
function apiFetch(url,options={}){return fetch(url,{...options,headers:{...options.headers,...(sharedToken?{Authorization:'Bearer '+sharedToken}:{})}});}
const userName=id=>sharedUsers[id]||PEOPLE[id]||id||'';
const copy=v=>JSON.parse(JSON.stringify(v));
function sharedRecords(){
 const out={};
 ITEMS.forEach(v=>{const id='item:'+v.id;if(v.editing||v.status==='new'||v.status==='draft'){if(sharedBase[id])out[id]=copy(sharedBase[id]);return;}const r=stripTransient(copy(v));out[id]=r;});
 Object.entries(PROJECTS).forEach(([k,v])=>out['project:'+k]=copy(v));
 PARTNERS.forEach(v=>out['partner:'+v.id]=copy(v));
 Object.assign(out,{'meta:order':copy(PROJ_ORDER),'meta:roadmap':copy(ROADMAP),'meta:head':copy(PHEAD),'meta:archive':copy(ARCH_SECTIONS),'meta:tabs':copy(ARCH_TABS),'meta:rows':copy(ARCH_ROWS)});
 return out;
}
function sharedDiff(a,b){const changes=[];for(const id of new Set([...Object.keys(a),...Object.keys(b)])){
 if(JSON.stringify(a[id])===JSON.stringify(b[id]))continue;
 if((id.startsWith('meta:')&&id!=='meta:head')||!a[id]||!b[id]){changes.push({id,before:a[id]??null,after:b[id]??null});continue;}
 for(const field of new Set([...Object.keys(a[id]),...Object.keys(b[id])]))if(JSON.stringify(a[id][field]??null)!==JSON.stringify(b[id][field]??null))changes.push({id,field,before:a[id][field]??null,after:b[id][field]??null});
 }return changes;}
function sharedApply(records){
 const local=sharedRecords();
 for(const [key,v] of Object.entries(records)){
 const dirty=JSON.stringify(local[key])!==JSON.stringify(sharedBase[key]);
 if(dirty||key.startsWith('item:')&&item(key.slice(5))?.editing)continue;
 if(v===null)delete sharedBase[key];else sharedBase[key]=copy(v);
 if(key.startsWith('item:')){const id=key.slice(5),idx=ITEMS.findIndex(x=>x.id===id);if(v===null){if(idx>=0)ITEMS.splice(idx,1);}else if(idx>=0){Object.keys(ITEMS[idx]).forEach(k=>delete ITEMS[idx][k]);Object.assign(ITEMS[idx],copy(v));}else ITEMS.push(copy(v));}
 else if(key.startsWith('project:')){if(v===null)delete PROJECTS[key.slice(8)];else PROJECTS[key.slice(8)]=copy(v);}
 else if(key.startsWith('partner:')){const idx=PARTNERS.findIndex(x=>x.id===key.slice(8));if(idx>=0)PARTNERS.splice(idx,1,...(v?[copy(v)]:[]));else if(v)PARTNERS.push(copy(v));}
 else if(key==='meta:order')PROJ_ORDER.splice(0,PROJ_ORDER.length,...v);
 else if(key==='meta:roadmap')ROADMAP.splice(0,ROADMAP.length,...v);
 else if(key==='meta:head')Object.assign(PHEAD,v);
 else if(key==='meta:archive')ARCH_SECTIONS=copy(v);
 else if(key==='meta:tabs')ARCH_TABS=copy(v);
 else if(key==='meta:rows')Object.assign(ARCH_ROWS,v);
 }
}
function sharedRedraw(){if(!sharedReady)return;sharedUi();const active=document.activeElement;
 if(active?.matches('input,textarea,[contenteditable="true"]')||popEl||S.editProj||itemFromEvent()?.editing||['new','draft'].includes(itemFromEvent()?.status)){sharedPendingRedraw=true;return;}
 sharedPendingRedraw=false;
 if(S.full&&!item(S.full)){S.full=null;toast('해당 게시물이 삭제되었습니다.');}
 if(S.panel&&!item(S.panel)&&!PARTNERS.some(p=>p.id===S.panel)&&!S.panel.includes(':'))closePanel();
 const scroll=$('#content').scrollTop,panelScroll=$('#panel').scrollTop;render();if(S.panel)rerenderItem();$('#content').scrollTop=scroll;$('#panel').scrollTop=panelScroll;
 const pane=$('#mnav .item.on')?.dataset.pane;if($('#ovl').classList.contains('on')&&pane)renderPane(pane);
}
// Routine connection/save states stay silent; only problems surface, as a toast, at most once per 10 seconds per message.
let lastStatus='',lastStatusAt=0;
function sharedStatus(text){if(!/못했|확인|필요|보관|겹칩|재시도|실패/.test(text||''))return;const now=Date.now();if(text===lastStatus&&now-lastStatusAt<10000)return;lastStatus=text;lastStatusAt=now;toast(text,2600);}
// Attachments are stored by the Worker (/api/file); the page embeds only the file id, so records stay small.
async function sharedUploadFile(file,itemId){if(!sharedReady)throw Error('서버에 연결된 후 첨부할 수 있습니다.');if(file.size>1887436)throw Error('파일은 1.8MB까지 첨부할 수 있습니다. ('+file.name+')');
 const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(Error('파일을 읽지 못했습니다.'));r.readAsDataURL(file);});
 const r=await apiFetch('/api/file',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,type:file.type,size:file.size,item:itemId||'',data})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'파일을 올리지 못했습니다.');return d;}
async function sharedListFiles(){const r=await apiFetch('/api/files');if(!r.ok)throw Error('첨부 파일 목록을 가져오지 못했습니다.');return (await r.json()).files||[];}
function preserveLocal(){if(!sharedUser)return;localStorage.setItem('aidc-recovery:'+sharedUser,JSON.stringify({at:Date.now(),items:ITEMS.filter(x=>(x.editing||x.status==='new'||x.status==='draft')&&(!x.authorId||x.authorId===sharedUser||x.editing)),changes:sharedDiff(sharedBase,sharedRecords())}));}
async function sharedFlush(wait=false){if(wait===true&&sharedBusy){while(sharedBusy)await new Promise(r=>setTimeout(r,50));}if(!sharedReady||sharedBusy||sharedBlocked)return false;preserveLocal();const sent=sharedRecords(),changes=sharedDiff(sharedBase,sent);if(!changes.length)return true;sharedBusy=true;sharedStatus('저장 중…');
 try{const r=await apiFetch('/api/change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({changes})});const data=await r.json();if(!r.ok){if(r.status===409||r.status===423){sharedBlocked=true;sharedStatus(data.error+' · 작성 내용 보관됨');}throw Error(data.error);}
 for(const [key,v] of Object.entries(data.records)){if(v===null)delete sharedBase[key];else sharedBase[key]=copy(v);if(key.startsWith('item:')||key.startsWith('project:')){const it=key.startsWith('item:')?item(key.slice(5)):PROJECTS[key.slice(8)];if(it&&v){it.authorId=v.authorId;it.authorName=v.authorName;it.updatedBy=v.updatedBy;it.updatedAt=v.updatedAt;}}}
 for(const key of [...ownedLocks])if(!(key.startsWith('item:')?item(key.slice(5))?.editing:S.editProj))await sharedRelease(key);
 sharedStatus('실시간 연결 · 저장 완료');preserveLocal();return true;
 }catch(e){if(!sharedBlocked)sharedStatus('저장하지 못했습니다 · 연결 확인 후 다시 저장해주세요');return false;}finally{sharedBusy=false;sharedRedraw();}
}
async function sharedSaveProject(button){
 const id=S.proj,root=$('#proj-pw'),title=$('[data-k="__full"]',root)?.textContent.trim();if(!title){toast('프로젝트명을 입력해주세요.');return;}
 saveProjectHead();
 button.disabled=true;button.textContent='저장 중…';
 try{const ok=await sharedFlush(true);if(!ok){toast('저장에 실패했습니다. 입력 내용은 유지됩니다.');return;}S.editProj=false;await sharedRelease('project:'+id);render(true);toast('저장했습니다.');}
 finally{if(button.isConnected){button.disabled=false;button.textContent='저장';}}
}
function sharedConnect(){clearTimeout(sharedConnect.timer);sharedSocket=new WebSocket(location.origin.replace('http','ws')+'/api/live?token='+encodeURIComponent(sharedToken));
 sharedSocket.onmessage=async e=>{if(e.data==='pong')return;const d=JSON.parse(e.data);sharedMeta(d);if(d.records){if(sharedBusy){setTimeout(sharedRefresh,400);return;}sharedApply(d.records);sharedRedraw();}};
 sharedSocket.onopen=()=>{sharedStatus('실시간 연결됨');sharedRefresh();};
 sharedSocket.onclose=()=>{if(sharedReady){sharedStatus('연결 재시도 중…');sharedConnect.timer=setTimeout(sharedConnect,3000);}};
}
async function sharedRefresh(){if(sharedBusy||!sharedReady)return;try{const r=await apiFetch('/api/state');if(r.status===401){sharedEnd();return;}if(!r.ok)return;const d=await r.json();sharedMeta(d);const delta={...d.records};Object.keys(sharedBase).forEach(k=>{if(!(k in d.records))delta[k]=null;});const changed=JSON.stringify(delta)!==JSON.stringify(sharedBase);sharedApply(delta);if(changed)sharedRedraw();}catch{}}
async function sharedStart(){if(!sharedToken)return false;const r=await apiFetch('/api/state');if(!r.ok){sessionStorage.removeItem('aidc-tab-token');sharedToken='';return false;}const data=await r.json();sharedUser=data.employee;sharedName=data.name;ME=sharedName;sharedMeta(data);const agentFixtures=ITEMS.filter(i=>i.agent).map(copy);sharedBase=sharedRecords();sharedApply({...Object.fromEntries(Object.keys(sharedBase).map(k=>[k,null])),...data.records});sharedBase=copy(data.records);
 // Agent pages (일일동향·시뮬레이터·용어사전) ship with the design; create them once in the shared database.
 for(const a of agentFixtures)if(!item(a.id))ITEMS.push(copy(a));
 // The archive gained a 기타 tab in the design; add it once to shared databases created before it existed.
 if(!ARCH_TABS.includes("기타")){ARCH_TABS.push("기타");if(!ARCH_ROWS["기타"])ARCH_ROWS["기타"]=[];}
 PEOPLE[sharedUser]=sharedName;sharedReady=true;sharedBlocked=false;
 const recovery=JSON.parse(localStorage.getItem('aidc-recovery:'+sharedUser)||'null');
 if(recovery){const recovered=new Map((recovery.items||[]).map(x=>[x.id,x]));for(const c of recovery.changes||[]){if(!c.id.startsWith('item:')||!c.after)continue;const id=c.id.slice(5);let v=recovered.get(id)||copy(item(id)||{});if(c.field)v[c.field]=c.after;else v=copy(c.after);recovered.set(id,v);}
 for(const v of recovered.values()){if(!v.title&&!v.body)continue;v.id='recovery-'+crypto.randomUUID();v.title=(v.title||'').startsWith('[복구 초안]')?v.title:'[복구 초안] '+(v.title||'제목 없음');v.status='draft';v.authorId=sharedUser;v.editing=false;v.table=false;v.card=false;ITEMS.push(v);}}
 for(const [id,l] of Object.entries(sharedLocks))if(l.employee===sharedUser){ownedLocks.add(id);await sharedRelease(id);}
 $('#login').style.display='none';$('#app').hidden=false;$('#tb-user .nm').textContent=sharedName;const mn=$('#mnav .me .nm');if(mn)mn.textContent=sharedName;restoreRoute();render();if(S.panel)openPanel(S.panel);sharedUi();sharedConnect();return true;
}
async function login(){const employee=$('#lg-id').value.trim();if(!employee){$('#lg-err').textContent='사번을 입력하세요.';$('#lg-err').style.display='block';return;}$('#lg-btn').disabled=true;
 try{const r=await apiFetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employee,name:$('#lg-name').value.trim()})});const d=await r.json();if(!r.ok)throw Error(d.error);sharedToken=d.token;sessionStorage.setItem('aidc-tab-token',sharedToken);localStorage.setItem('aidc-known-name:'+d.employee,d.name);await sharedStart();}catch(e){$('#lg-err').textContent=e.message;$('#lg-err').style.display='block';}finally{$('#lg-btn').disabled=false;}}
async function logout(){if(typeof closeModal==='function')closeModal();if(typeof closePanel==='function')closePanel(true);await sharedFlush();preserveLocal();await apiFetch('/api/logout',{method:'POST'});sharedEnd();location.hash='';}
function sharedEnd(){preserveLocal();sharedReady=false;sharedSocket?.close();sharedToken='';sessionStorage.removeItem('aidc-tab-token');$('#app').hidden=true;$('#login').style.display='';sharedStatus('로그인이 필요합니다.');}
$('#login').style.display='';$('#app').hidden=true;$('#lg-err').style.display='none';
$('#lg-btn').addEventListener('click',login);['#lg-id','#lg-pw'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key==='Enter')login();}));
$('#lg-name').addEventListener('keydown',e=>{if(e.key==='Enter')login();});
$('#lg-id').addEventListener('input',()=>{const n=localStorage.getItem('aidc-known-name:'+$('#lg-id').value.trim().toUpperCase());$('#lg-name').value=n||'';});
setInterval(sharedFlush,250);setInterval(sharedRefresh,15000);window.addEventListener('online',sharedRefresh);window.addEventListener('beforeunload',()=>{preserveLocal();saveRoute();});
setInterval(async()=>{if(!sharedReady)return;try{const r=await apiFetch('/api/heartbeat',{method:'POST'});if(r.status===401){sharedEnd();return;}sharedMeta(await r.json());}catch{}},20000);
setInterval(()=>{if(sharedPendingRedraw)sharedRedraw();saveRoute();},600);
function sharedMeta(data){const changed=data.locks&&JSON.stringify(data.locks)!==JSON.stringify(sharedLocks);if(data.users){sharedUsers=data.users;Object.assign(PEOPLE,sharedUsers);}if(data.locks){sharedLocks=data.locks;for(const id of [...ownedLocks])if(sharedLocks[id]?.employee!==sharedUser){ownedLocks.delete(id);const it=id.startsWith('item:')?item(id.slice(5)):null;if(it?.editing){sharedKeepDraft(it);preserveLocal();Object.assign(it,it._editOriginal||{});delete it._editOriginal;it.editing=false;sharedStatus('편집 잠금이 해제되어 작성 내용을 초안으로 보관했습니다.');rerenderItem();}if(id.startsWith('project:'))S.editProj=false;}}sharedUi();if(changed&&sharedReady)sharedRedraw();}
function otherLock(id){const l=sharedLocks[id];return l&&l.expires>Date.now()&&l.employee!==sharedUser?l:null;}
function sharedKeepDraft(it){const v=stripTransient(copy(it));const original=stripTransient(copy(it._editOriginal||{}));if(JSON.stringify(v)===JSON.stringify(original))return;const signature=JSON.stringify(v);if(ITEMS.some(x=>x._recoverySignature===signature))return;ITEMS.push({...v,id:'recovery-'+crypto.randomUUID(),title:'[복구 초안] '+(v.title||'제목 없음'),status:'draft',authorId:sharedUser,editing:false,table:false,card:false,_recoverySignature:signature});}
async function sharedBeginEdit(id){if(!sharedReady)return false;if(!sharedBase[id])return true;
 try{const r=await apiFetch('/api/lock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action:'acquire'})});const d=await r.json();sharedMeta(d);if(!r.ok){toast(d.error);return false;}ownedLocks.add(id);if(d.record){sharedApply({[id]:d.record});}return true;}catch{toast('연결을 확인한 후 수정해주세요.');return false;}}
async function sharedRelease(id){if(!ownedLocks.has(id))return;try{const r=await apiFetch('/api/lock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action:'release'})});if(r.ok){ownedLocks.delete(id);sharedMeta(await r.json());}}catch{}}
function sharedUi(){if(!sharedReady)return;
 const it=itemFromEvent(),id=it?'item:'+it.id:null,l=id?otherLock(id):null;
 for(const b of $$('[data-ed="edit"]')){b.disabled=!!l;b.textContent=l?userName(l.employee)+'님이 수정 중입니다':'수정';b.title=l?'다른 사용자의 편집이 끝나면 수정할 수 있습니다.':'';}
 const p=otherLock('project:'+S.proj);for(const b of $$('[data-editproj]')){b.disabled=!!p;b.textContent=p?userName(p.employee)+'님이 수정 중입니다':S.editProj?'저장':'수정';}
 for(const el of $$('.ititle[data-f="title"],.ibody[data-f="body"]'))el.contentEditable=it&&!l&&(it.editing||['new','draft'].includes(it.status))?'true':'false';
 for(const b of $$('[data-pick], [data-ed="trash"]')){b.style.opacity=l?'.5':'';b.title=l?userName(l.employee)+'님이 수정 중입니다':'';}
 $('#tb-user .nm').textContent=sharedName;const n=$('#mnav .me .nm');if(n)n.textContent=sharedName;
}
let renewTimer=0;
document.addEventListener('input',()=>{if(!ownedLocks.size||Date.now()-renewTimer<5000)return;renewTimer=Date.now();for(const id of ownedLocks)apiFetch('/api/lock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action:'renew'})}).then(r=>r.json()).then(sharedMeta).catch(()=>{});});
function saveRoute(){if(!sharedReady||sharedRestoreRoute)return;const route={page:S.page,proj:S.proj,panel:S.panel,full:S.full,actPage:S.actPage,resPage:S.resPage,ptPage:S.ptPage,archTab:S.archTab,archPage:S.archPage,calY:S.calY,calM:S.calM,calYp:S.calYp,calMp:S.calMp,scroll:$('#content').scrollTop,panelScroll:$('#panel').scrollTop};
 sessionStorage.setItem('aidc-route:'+sharedUser,JSON.stringify(route));const params=new URLSearchParams();for(const k of ['page','proj','panel','full'])if(route[k])params.set(k,route[k]);const hash='#'+params.toString();if(location.hash!==hash)history.replaceState(null,'',hash);}
function restoreRoute(){let r={};try{if(navigationType==='reload')r=JSON.parse(sessionStorage.getItem('aidc-route:'+sharedUser)||'{}');const q=new URLSearchParams(location.hash.slice(1));for(const k of ['page','proj','panel','full'])if(q.has(k))r[k]=q.get(k);}catch{}
 if(!['main','project','archive'].includes(r.page))r.page='main';if(r.page==='project'&&!PROJECTS[r.proj]){r.page='main';r.proj=null;}
 if(r.full&&!item(r.full))r.full=null;if(r.panel&&!item(r.panel)&&!PARTNERS.some(p=>p.id===r.panel)&&!/^\d+:/.test(r.panel))r.panel=null;
 Object.assign(S,r);S.editProj=false;sharedRestoreRoute=false;setTimeout(()=>{$('#content').scrollTop=r.scroll||0;$('#panel').scrollTop=r.panelScroll||0;saveRoute();},0);}
for(const name of ['render','rerenderItem','openPanel','renderPane']){const original=eval(name);const decorated=function(...args){const result=original(...args);sharedUi();saveRoute();return result;};if(name==='render')render=decorated;else if(name==='rerenderItem')rerenderItem=decorated;else if(name==='openPanel')openPanel=decorated;else renderPane=decorated;}
setInterval(()=>{if(!sharedReady||sharedBusy)return;const diff=sharedDiff(sharedBase,sharedRecords());for(const id of [...ownedLocks]){const it=id.startsWith('item:')?item(id.slice(5)):null;if(it?.editing&&it.id!==S.panel&&it.id!==S.full){sharedKeepDraft(it);preserveLocal();const backup=it._editOriginal;Object.keys(it).forEach(k=>delete it[k]);Object.assign(it,backup||sharedBase[id]);it.editing=false;}if(!it?.editing&&!(id==='project:'+S.proj&&S.editProj)&&!diff.some(c=>c.id===id))sharedRelease(id);}},3000);
renderPane('inbox');
sharedStart().catch(()=>sharedStatus('서버 연결을 확인해주세요.'));

