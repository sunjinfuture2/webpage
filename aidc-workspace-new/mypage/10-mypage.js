/* My page (preview switch on): 계정 · 수신함 · 설정 · 휴지통, after the owner's specification "마이페이지 고도화 개발 명세서" (2026-11-19).
   It draws into the modal the page already has (#ovl / #modal / #mnav / #mbody). The screens it did not have to change (멤버, 팀스페이스,
   업데이트, 보안, 감사 로그, 사용 현황) are still drawn by renderPaneBase() in original.html; everything else is here.
   MYPAGE.md lists what of the specification is done, what is not, and why. */
const MP={open:false,menu:'inbox',tab:'',back:null,
  inbox:{tab:'all',type:'',proj:'',q:'',sel:new Set()},
  act:{tab:'wrote',q:'',type:'',proj:'',n:50},
  trash:{q:'',type:'',sel:new Set()},
  draft:{},state:{},sess:null,sq:'',hit:''};
const MP_MENUS=[
  {k:'account',t:'계정',pic:'members',groups:[{tabs:[['profile','프로필'],['logins','로그인 · 기기'],['activity','내 활동']]}]},
  {k:'inbox',t:'수신함',pic:'inbox'},
  {k:'settings',t:'설정',pic:'general',groups:[
    {t:'개인',tabs:[['prefs','기본 설정'],['notif','알림']]},
    {t:'워크스페이스',tabs:[['general','일반'],['members','멤버'],['teamspace','팀스페이스'],['updates','업데이트']]},
    {t:'관리자',admin:true,tabs:[['security','보안'],['audit','감사 로그'],['analytics','사용 현황']]}]},
  {k:'trash',t:'휴지통',pic:'trash'}];
// The names the old screens went by (openModal('members') …) still lead somewhere.
const MP_OLD={mine:'account.activity',drafts:'account.activity',general:'settings.general',members:'settings.members',teamspace:'settings.teamspace',updates:'settings.updates',security:'settings.security',audit:'settings.audit',analytics:'settings.analytics'};
// What the search of the settings knows: label, where it is, the row it marks, more words to find it by.
const MP_INDEX=[
  ['댓글 입력 방식','settings.prefs','cmtEnter','enter 엔터 ctrl 등록 전송'],['화면 움직임 줄이기','settings.prefs','calm','애니메이션 접근성 모션'],['테마','settings.prefs','theme','다크 라이트 색'],['언어 · 날짜 · 시간대','settings.prefs','locale','한국어 형식'],['개인 설정 초기화','settings.prefs','reset','되돌리기 기본값'],
  ['멘션 알림','settings.notif','nMention','@ 수신함'],['댓글 알림','settings.notif','nComment','수신함'],['날짜 알림 (리마인더)','settings.notif','nRemind','기한 수신함'],['이메일 · 브라우저 알림','settings.notif','channels','메일 푸시'],
  ['워크스페이스 이름','settings.general','wsName','브랜드 로고'],['소속','settings.general','org','부서'],['부서 드롭박스 주소','settings.general','dropboxUrl','dropbox 링크'],['푸터 링크 (그룹웨어 · 홈페이지 · SNS)','settings.general','lk_groupware','footer 유튜브 인스타 페이스북 youtube instagram facebook',1],
  ['멤버 · 역할','settings.members','','소유자 관리자 추가 사번'],['팀스페이스','settings.teamspace','','팀 접근'],['업데이트','settings.updates','','최근 변경'],
  ['로그인 유지 기간','settings.security','','세션 보안',1],['감사 로그','settings.audit','','활동 기록',1],['사용 현황','settings.analytics','','통계 애널리틱스',1],
  ['프로필 (이름 · 사진 · 이메일)','account.profile','','계정 직책'],['로그인 기기','account.logins','','세션 로그아웃'],['내 활동','account.activity','','작성 담당 초안'],['수신함','inbox','','알림'],['휴지통','trash','','복원 삭제']];

/* ---------- where am I ---------- */
const mpTabs=m=>(m.groups||[]).filter(g=>!g.admin||canAdmin()).flatMap(g=>g.tabs.map(t=>t[0]));
function mpParse(to){ to=String(to||'inbox'); if(to==='drafts')MP.act.tab='drafts'; else if(to==='mine')MP.act.tab='wrote';
  to=MP_OLD[to]||to; let [menu,tab]=to.split('.'); const m=MP_MENUS.find(x=>x.k===menu)||MP_MENUS[1]; const tabs=mpTabs(m);
  if(tabs.length&&!tabs.includes(tab))tab=m.k===MP.menu&&tabs.includes(MP.tab)?MP.tab:tabs[0]; if(!tabs.length)tab='';
  return {menu:m.k,tab}; }
const mpKey=()=>MP.menu+(MP.tab?'.'+MP.tab:'');
function mpRoute(){ return MP.open?mpKey():null; }
function mpOpen(to){ closePop(); const first=!MP.open; if(first){MP.back=document.activeElement; try{const s=JSON.parse(localStorage.getItem('aidc-mp:'+sharedUser)||'{}'); if(['all','unread','arch'].includes(s.inbox))MP.inbox.tab=s.inbox;}catch{}}
  MP.open=true; const m=$('#modal'); $('#ovl').classList.add('on'); m.classList.add('mp'); m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','마이페이지'); m.tabIndex=-1;
  if(!$('.mp-x',m))m.insertAdjacentHTML('beforeend','<button class="mp-x" data-mp="close" aria-label="닫기" title="닫기 (Esc)">×</button>');
  mpGo(to||'inbox'); if(first)setTimeout(()=>{const f=$('#mnav .mi.on')||m; try{f.focus({preventScroll:true});}catch{}},0); }
function mpClosed(){ if(!MP.open)return; MP.open=false; const d=$('#mp-prev'); if(d)d.remove(); const b=MP.back; MP.back=null; if(b&&b.isConnected&&b.focus)try{b.focus({preventScroll:true});}catch{}
  const dirty=Object.keys(MP.draft).find(k=>mpDirty(k)); if(dirty)toast('저장하지 않은 변경이 있습니다. 입력한 내용은 그대로 두었습니다.',5000,{t:'이어서 편집',fn:()=>mpOpen(dirty==='ws'?'settings.general':'account.profile')}); }
function mpGo(to){ const r=mpParse(to), moved=r.menu!==MP.menu||r.tab!==MP.tab; MP.menu=r.menu; MP.tab=r.tab; if(moved){MP.inbox.sel.clear();MP.trash.sel.clear();} mpRender(undefined,moved); }
// Called for remote changes (sharedRedraw): lists follow, forms and server-side lists are left alone.
function mpLive(){ if(!MP.open)return; mpNav(); if(['inbox','trash','account.activity','settings.members','settings.teamspace','settings.analytics'].includes(mpKey()))mpRender(); }

/* ---------- frame ---------- */
function mpNav(){ const nav=$('#mnav'); if(!nav)return; const un=unreadNotes().length, act=document.activeElement, keep=act&&nav.contains(act)?act.dataset.mp:'', sq=$('#mp-sq'), sel=sq&&sq===act?[sq.selectionStart,sq.selectionEnd]:null;
  const sub=m=>`<div class="sub">${m.k==='settings'?`<input id="mp-sq" class="mp-sq" type="search" placeholder="설정 검색" value="${esc(MP.sq)}" aria-label="설정 검색" autocomplete="off"><div id="mp-sres">${mpFound()}</div>`:''}<div class="tabs" ${m.k==='settings'&&MP.sq.trim()?'hidden':''}>${m.groups.filter(g=>!g.admin||canAdmin()).map(g=>`${g.t?`<div class="gh">${esc(g.t)}</div>`:''}${g.tabs.map(([k,t])=>`<button class="si ${MP.tab===k?'on':''}" data-mp="go:${m.k}.${k}" ${MP.tab===k?'aria-current="page"':''}>${esc(t)}${(k==='profile'&&mpDirty('profile'))||(k==='general'&&mpDirty('ws'))?'<i class="dty" title="저장하지 않은 변경"></i>':''}</button>`).join('')}`).join('')}</div></div>`;
  nav.innerHTML=`<div class="me">${avOf(sharedUser,'av22')}<span class="nm">${esc(sharedName)}</span><span class="role">${esc(roleOf(sharedUser))}</span></div>
    <div class="mp-nav scroll" role="navigation" aria-label="마이페이지 메뉴">${MP_MENUS.map(m=>`<button class="mi ${MP.menu===m.k?'on':''}" data-mp="go:${m.k}" ${MP.menu===m.k&&!m.groups?'aria-current="page"':''}><i>${pict(m.pic)}</i>${esc(m.t)}${m.k==='inbox'?`<span class="mp-badge" id="m-inbox-badge" ${un?'':'style="display:none"'}>${un>99?'99+':un}</span>`:''}</button>${m.groups&&MP.menu===m.k?sub(m):''}`).join('')}</div>
    <button class="mi out" data-mp="logout"><i>${pict('logout')}</i>로그아웃</button>`;
  if(sel){const n=$('#mp-sq'); if(n){n.focus();try{n.setSelectionRange(sel[0],sel[1]);}catch{}}} else if(keep){const n=nav.querySelector(`[data-mp="${keep}"]`); if(n)try{n.focus({preventScroll:true});}catch{}} }
function mpFound(){ const q=MP.sq.trim().toLowerCase(); if(!q)return ''; const hits=MP_INDEX.filter(x=>(!x[4]||canAdmin())&&(x[0]+' '+x[3]).toLowerCase().includes(q));
  return hits.length?hits.map(x=>`<button class="si" data-mp="find:${x[1]}|${x[2]}">${esc(x[0])}<span>${esc(mpWhere(x[1]))}</span></button>`).join(''):'<div class="none">찾는 설정이 없습니다.</div>'; }
function mpWhere(key){ const [a,b]=key.split('.'); const m=MP_MENUS.find(x=>x.k===a); const t=m&&b?(m.groups||[]).flatMap(g=>g.tabs).find(x=>x[0]===b):null; return m?m.t+(t?' › '+t[1]:''):''; }
function mpRender(pane,moved){ if(!MP.open)return; if(pane){const r=mpParse(pane); if(r.menu!==MP.menu||r.tab!==MP.tab)moved=true; MP.menu=r.menu; MP.tab=r.tab;}
  { const r=mpParse(mpKey()); MP.menu=r.menu; MP.tab=r.tab; }                      // a tab I may no longer see (my role changed) falls back
  const B=$('#mbody'), st=B.scrollTop, key=mpKey(); mpNav();
  const old={members:1,teamspace:1,updates:1,security:1,audit:1,analytics:1}[MP.tab];
  if(MP.menu==='settings'&&old){ renderPaneBase(MP.tab); if(MP.tab==='analytics'){const h=$('#mbody h2'); if(h)h.textContent='사용 현황';} }
  else { const h=key==='inbox'?mpInbox():key==='trash'?mpTrash():key==='account.profile'?mpProfile():key==='account.logins'?mpLogins():key==='account.activity'?mpActivity():key==='settings.prefs'?mpPrefs():key==='settings.notif'?mpNotif():mpWs();
    B.innerHTML=`<div class="pane on"><div class="mpp" data-key="${key}">${h}</div></div>`; if(key==='account.logins')mpLoadSessions(); }
  B.scrollTop=moved?0:st; updateBadges();
  if(MP.hit){const n=B.querySelector(`[data-row="${MP.hit}"]`); MP.hit=''; if(n){n.classList.add('hit');n.scrollIntoView({block:'center'});setTimeout(()=>n.classList.remove('hit'),2200);}} }
const mpHead=(t,d,extra='')=>`<div class="mp-hd"><h2>${esc(t)}</h2>${extra}</div>${d?`<div class="mp-desc">${d}</div>`:''}`;
const mpSel=(name,val,opts,label)=>`<select class="mp-sel" data-mpc="${name}" aria-label="${esc(label)}">${opts.map(([v,t])=>`<option value="${esc(v)}" ${v===val?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
const mpProjOpts=()=>[['','모든 프로젝트']].concat(orderedProjects().map(k=>[k,pname(PROJECTS[k])]));
const mpTitle=i=>(i&&i.title||'').split('\n').join(' ').trim()||'(제목 없음)';
const mpWhen=ts=>{const n=new Date(ts); return !ts||isNaN(n)?'':fmtStampShort(n);};
const mpCheck=(on,act,label)=>`<button class="mp-cb ${on?'on':''}" role="checkbox" aria-checked="${on?'true':'false'}" data-mp="${act}" aria-label="${esc(label)}">${on?svg('i-check-lt',9.6,8.3):''}</button>`;

/* ---------- saving: nothing reads "저장됨" before the Worker has it ---------- */
// Sends what is pending and says how it went: '' = the server has it, otherwise the reason.
async function mpCommit(ids){ const t=Date.now(); await sharedFlush(true); if(sharedDeniedAt>=t)return sharedDeniedWhy||'권한이 없어 적용되지 않았습니다.';
  return sharedDiff(sharedBase,sharedRecords()).some(c=>ids.includes(c.id))?'pending':''; }
// After a failed send the change stays queued (the page retries by itself); the form says so until it is through.
function mpWatch(form,ids){ clearInterval(MP['w_'+form]); let n=0; MP['w_'+form]=setInterval(()=>{ n++; const left=sharedReady&&sharedDiff(sharedBase,sharedRecords()).some(c=>ids.includes(c.id));
  if(!left||n>120){clearInterval(MP['w_'+form]); if(!left&&MP.state[form]&&MP.state[form].k==='pending'){MP.state[form]={k:'saved',at:Date.now()};mpFormState(form);}} },1000); }
function mpFormState(form){ const box=$(`[data-mpstate="${form}"]`), btn=$(`[data-mp="save:${form}"]`), s=MP.state[form]||{}, dirty=mpDirty(form), err=mpErrors(form);
  if(btn){btn.disabled=s.k==='saving'||!dirty||!!Object.keys(err).length; btn.textContent=s.k==='saving'?'저장 중…':'변경 사항 저장';}
  if(box){box.className='mp-state '+(s.k||''); box.textContent=s.k==='saving'?'':s.k==='error'?s.m:s.k==='pending'?'아직 서버에 저장되지 않았습니다. 연결되면 자동으로 다시 보냅니다.':dirty?'저장하지 않은 변경이 있습니다.':s.k==='saved'?'저장됨':'';}
  $$(`[data-mperr^="${form}."]`).forEach(n=>{const m=err[n.dataset.mperr.split('.')[1]]||''; n.textContent=m; const inp=$(`[data-mpf="${n.dataset.mperr}"]`); if(inp)inp.setAttribute('aria-invalid',m?'true':'false');});
  const dot=$(`#mnav [data-mp="go:${form==='ws'?'settings.general':'account.profile'}"]`); if(dot){const has=!!$('.dty',dot); if(has!==dirty)mpNav();} }
const mpClean=v=>String(v||'').replace(/\s+/g,' ').trim();
function mpOrigin(form){ const me=MEMBERS_META[sharedUser]||{}; return form==='profile'?{name:sharedName||'',title:me.title||'',email:me.email||'',phone:me.phone||''}:{wsName:SETTINGS.wsName||'',org:SETTINGS.org||'',dropboxUrl:SETTINGS.dropboxUrl||'',...Object.fromEntries(MP_LINKS.map(([k])=>['lk_'+k,(SETTINGS.links||{})[k]||''])),holidays:(Array.isArray(SETTINGS.holidays)?SETTINGS.holidays:[]).join(', ')}; }
// The company's places the footer links to (설정 › 워크스페이스 › 일반).
const mpDays=v=>{ const parts=String(v||'').split(/[\s,]+/).filter(Boolean), ok=parts.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(new Date(x+'T00:00:00'))); return {days:[...new Set(ok)].sort(),bad:ok.length!==parts.length}; };
const MP_LINKS=[['groupware','그룹웨어'],['home','회사 홈페이지'],['youtube','YouTube'],['instagram','Instagram'],['facebook','Facebook']];
function mpDraft(form){ return MP.draft[form]||(MP.draft[form]={...mpOrigin(form)}); }
function mpDirty(form){ const d=MP.draft[form]; if(!d)return false; const o=mpOrigin(form); return Object.keys(o).some(k=>mpClean(d[k])!==mpClean(o[k])); }
function mpErrors(form){ const d=MP.draft[form]||mpOrigin(form), e={};
  if(form==='profile'){ const n=mpClean(d.name); if(!n)e.name='이름을 입력하세요.'; else if(n.length>40)e.name='이름은 40자까지 쓸 수 있습니다.'; else if(/[\u0000-\u001f\u007f]/.test(String(d.name)))e.name='이름에 쓸 수 없는 문자가 있습니다.';
    if(mpClean(d.title).length>40)e.title='직책은 40자까지 쓸 수 있습니다.';
    { const ph=mpClean(d.phone); if(ph&&!/^[0-9+\-() .]{7,30}$/.test(ph))e.phone='전화번호 형식이 아닙니다. (예: 010-1234-5678)'; }
    const em=mpClean(d.email).toLowerCase(); if(em){ if(em.length>80||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))e.email='이메일 주소 형식이 아닙니다. (예: name@sunjin.co.kr)'; else if(Object.entries(MEMBERS_META).some(([id,m])=>id!==sharedUser&&m&&String(m.email||'').toLowerCase()===em))e.email='다른 멤버가 쓰고 있는 주소입니다.'; } }
  else { if(!mpClean(d.wsName))e.wsName='워크스페이스 이름을 입력하세요.'; else if(mpClean(d.wsName).length>30)e.wsName='30자까지 쓸 수 있습니다.'; if(mpClean(d.org).length>60)e.org='60자까지 쓸 수 있습니다.';
    const u=mpClean(d.dropboxUrl); if(u&&!/^https:\/\/[^\s]+$/.test(u))e.dropboxUrl='https:// 로 시작하는 주소를 입력하세요.';
    for(const [k] of MP_LINKS){ const v=mpClean(d['lk_'+k]); if(v&&!/^https?:\/\/[^\s]+$/.test(v))e['lk_'+k]='http:// 또는 https:// 로 시작하는 주소를 입력하세요.'; }
    if(mpDays(d.holidays).bad)e.holidays='날짜는 2026-06-03 처럼 쓰고 쉼표로 나눕니다.'; }
  return e; }
const mpField=(form,k,label,o={})=>{ const d=mpDraft(form); return `<label class="fl" data-row="${k}"><span>${esc(label)}</span><div><input data-mpf="${form}.${k}" value="${esc(d[k])}" maxlength="${o.max||80}" ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.ro?'readonly':''} ${o.type?`type="${o.type}"`:''} autocomplete="off">${o.note?`<small>${o.note}</small>`:''}<em class="err" data-mperr="${form}.${k}" role="alert"></em></div></label>`; };
const mpFixed=(label,val,o={})=>`<div class="fl ro" ${o.row?`data-row="${o.row}"`:''}><span>${esc(label)}</span><div><span class="val">${val}</span>${o.note?`<small>${o.note}</small>`:''}</div></div>`;
async function mpSave(form){ if((MP.state[form]||{}).k==='saving'||!mpDirty(form)||Object.keys(mpErrors(form)).length)return; const d=mpDraft(form), ids=form==='profile'?['meta:members']:['meta:settings'];
  if(form==='ws'&&!canAdmin()){toast('워크스페이스 설정은 소유자·관리자만 바꿀 수 있습니다.');return;}
  MP.state[form]={k:'saving'}; mpFormState(form);
  try{ if(form==='profile'){ const name=mpClean(d.name), title=mpClean(d.title), email=mpClean(d.email).toLowerCase(), phone=mpClean(d.phone), cur=MEMBERS_META[sharedUser]||{};
        if(name!==sharedName)await sharedSetName(name);                                                   // the Worker checks the name itself and answers with the stored one
        if(title!==(cur.title||'')||email!==(cur.email||'')||phone!==(cur.phone||'')){ const next={...cur,title,email,phone}; if(!title)delete next.title; if(!email)delete next.email; if(!phone)delete next.phone; MEMBERS_META[sharedUser]=next; } }
      else { SETTINGS.wsName=mpClean(d.wsName); SETTINGS.org=mpClean(d.org); SETTINGS.dropboxUrl=mpClean(d.dropboxUrl);
        const links=Object.fromEntries(MP_LINKS.map(([k])=>[k,mpClean(d['lk_'+k])]).filter(([,v])=>v)); if(JSON.stringify(links)!==JSON.stringify(SETTINGS.links||{}))SETTINGS.links=links;
        const hd=mpDays(d.holidays).days; if(JSON.stringify(hd)!==JSON.stringify(SETTINGS.holidays||[]))SETTINGS.holidays=hd; }
      const why=await mpCommit(ids);
      if(why==='pending'){MP.state[form]={k:'pending'};mpWatch(form,ids);} else if(why){MP.state[form]={k:'error',m:why}; delete MP.draft[form];} else {MP.state[form]={k:'saved',at:Date.now()}; delete MP.draft[form];}
  }catch(err){ MP.state[form]={k:'error',m:(err&&err.message)||'저장하지 못했습니다. 입력한 내용은 그대로 있습니다.'}; }
  applyBranding(); render(true); if(MP.open&&((form==='profile'&&mpKey()==='account.profile')||(form==='ws'&&mpKey()==='settings.general')))mpRender(); }

/* ---------- 계정 › 프로필 ---------- */
function mpProfile(){ const me=MEMBERS_META[sharedUser]||{}, ws=me.ws||[];
  return mpHead('프로필','다른 멤버에게 보이는 내 정보입니다. 사번·역할·소속은 여기서 바꿀 수 없습니다.')+`
  <div class="mp-av" data-row="avatar">${avOf(sharedUser,'big')}<div><div class="bts"><button class="mp-btn sec" data-mp="avatar">사진 ${me.avatar?'바꾸기':'올리기'}</button>${me.avatar?'<button class="mp-btn sec" data-mp="avatar-x">사진 지우기</button>':''}<input type="file" id="mp-avf" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div><small>JPG · PNG · WebP · GIF, 10MB 이하. 가운데를 정사각형으로 잘라 256px로 저장합니다.</small></div></div>
  <div class="mp-form">${mpField('profile','name','이름',{max:40})}${mpField('profile','title','직책',{max:40,ph:'예: 책임 · 팀장'})}
    ${mpField('profile','email','이메일',{max:80,ph:'name@sunjin.co.kr',type:'email',note:me.email?'<i class="tag">미인증</i> 인증 메일을 보내는 기능이 없어 주소 형식과 중복만 확인합니다.':'알림 메일은 보내지 않습니다. 연락처로만 표시됩니다.'})}
    ${mpField('profile','phone','연락처',{max:30,ph:'010-0000-0000',note:'담당자 이름을 눌렀을 때 뜨는 멤버 정보에 이메일과 함께 표시됩니다.'})}
    ${mpFixed('사번',`${esc(sharedUser)} <button class="mp-link" data-mp="copy-id">복사</button>`,{note:'로그인에 쓰는 고유 번호라 바꿀 수 없습니다.'})}
    ${mpFixed('역할',esc(roleOf(sharedUser)),{note:hasOwner()?'역할은 소유자가 설정 › 멤버에서 바꿉니다.':'아직 소유자가 지정되지 않았습니다.'})}
    ${mpFixed('소속',esc(SETTINGS.org||'—')+(ws.length?` · ${ws.map(esc).join(', ')}`:''),{note:'팀스페이스 소속은 소유자·관리자가 지정합니다.'})}</div>
  <div class="mp-foot"><button class="mp-btn" data-mp="save:profile" disabled>변경 사항 저장</button>${mpDirty('profile')?'<button class="mp-btn sec" data-mp="undo:profile">되돌리기</button>':''}<span class="mp-state" data-mpstate="profile" role="status"></span></div>`+mpAfter('profile'); }
// The state line and the errors are filled once the form is in the page.
function mpAfter(form){ setTimeout(()=>mpFormState(form),0); return ''; }
async function mpAvatar(file){ if(!file)return; if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){toast('JPG · PNG · WebP · GIF 이미지만 올릴 수 있습니다.',2600);return;} if(file.size>10485760){toast('사진은 10MB까지 올릴 수 있습니다.',2600);return;}
  try{ const url=URL.createObjectURL(file); const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('이미지를 읽지 못했습니다.'));i.src=url;}); const s=Math.min(img.naturalWidth,img.naturalHeight); if(!s)throw Error('이미지를 읽지 못했습니다.');
    const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,256,256); g.drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,256,256); URL.revokeObjectURL(url);
    const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',.86)); if(!blob)throw Error('이미지를 바꾸지 못했습니다.');
    const up=await sharedUploadFile(new File([blob],'avatar.jpg',{type:'image/jpeg'}),'avatar:'+sharedUser); const cur=MEMBERS_META[sharedUser]||{}, old=cur.avatar;
    MEMBERS_META[sharedUser]={...cur,avatar:up.id}; const why=await mpCommit(['meta:members']); if(why&&why!=='pending'){sharedDeleteFile(up.id);return;}
    if(old)sharedDeleteFile(old); render(true); mpRender(); toast('프로필 사진을 바꿨습니다.');
  }catch(err){ toast((err&&err.message)||'사진을 올리지 못했습니다.',2800); } }
async function mpAvatarOff(){ const cur=MEMBERS_META[sharedUser]||{}; if(!cur.avatar)return; const old=cur.avatar, next={...cur}; delete next.avatar; MEMBERS_META[sharedUser]=next; const why=await mpCommit(['meta:members']); if(!why)sharedDeleteFile(old); render(true); mpRender(); if(!why)toast('프로필 사진을 지웠습니다.'); }

/* ---------- 계정 › 로그인 · 기기 ---------- */
function mpUa(ua){ ua=String(ua||''); if(!ua)return '알 수 없는 기기'; const b=/Edg\//.test(ua)?'Edge':/Whale\//.test(ua)?'Whale':/SamsungBrowser/.test(ua)?'Samsung Internet':/OPR\//.test(ua)?'Opera':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'브라우저';
  const o=/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Mac OS X/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':''; return b+(o?' · '+o:''); }
function mpLogins(){ const days=+(SETTINGS.security||{}).sessionDays||14;
  return mpHead('로그인 · 기기','내 계정으로 로그인된 기기입니다. 모르는 기기가 있으면 로그아웃시키세요.')+`
  <div class="mp-form narrow">${mpFixed('로그인 방식','사번 로그인',{note:'비밀번호·2단계 인증·SSO는 사용하지 않습니다. (워크스페이스 결정)'})}${mpFixed('로그인 유지',`마지막 사용 후 ${days}일`,{note:'기간은 소유자·관리자가 설정 › 보안에서 정합니다.'})}</div>
  <div class="mp-sub"><h3>로그인된 기기</h3><span class="sp"></span><button class="mp-btn sec" data-mp="sess-reload">새로고침</button><button class="mp-btn sec" data-mp="sess-others" id="mp-sess-others" disabled>다른 기기 모두 로그아웃</button></div>
  <div class="mp-tbl sess" id="mp-sess" aria-live="polite"><div class="none">불러오는 중…</div></div>
  <div class="mp-foot"><button class="mp-btn sec" data-mp="logout">이 기기에서 로그아웃</button></div>`; }
async function mpLoadSessions(){ let r; try{ r=await sharedSessions(); }catch(err){ const b=$('#mp-sess'); if(b)b.innerHTML=`<div class="none err">${esc((err&&err.message)||'로그인 기기를 가져오지 못했습니다.')} <button class="mp-link" data-mp="sess-reload">다시 시도</button></div>`; return; }
  MP.sess=r.sessions||[]; const b=$('#mp-sess'); if(!b)return; const others=MP.sess.filter(s=>!s.current).length; const ob=$('#mp-sess-others'); if(ob)ob.disabled=!others;
  b.innerHTML=`<div class="hd"><span>기기</span><span>로그인한 때</span><span>마지막 사용</span><span></span></div>`+MP.sess.map(s=>`<div class="rw"><span class="t1"><i class="on ${s.online?'y':''}" title="${s.online?'지금 접속 중':'접속 중 아님'}"></i>${esc(mpUa(s.ua))}${s.current?'<i class="tag me">현재 기기</i>':''}</span><span class="mut">${esc(s.created?mpWhen(s.created):'기록 없음')}</span><span class="mut">${esc(s.current?'지금':relTime(s.seen)||mpWhen(s.seen))}</span><span>${s.current?'':`<button class="mp-btn sec sm" data-mp="sess-end:${esc(s.id)}">로그아웃</button>`}</span></div>`).join(''); }
async function mpEndSession(body,msg){ try{ const r=await sharedEndSession(body); toast(r.ended?msg:'이미 로그아웃된 기기입니다.'); }catch(err){ toast((err&&err.message)||'로그아웃하지 못했습니다.',2600); } if(mpKey()==='account.logins')mpLoadSessions(); }

/* ---------- 계정 › 내 활동 ---------- */
function mpActLists(){ const me=sharedUser, pool=ITEMS.filter(i=>canSee(i)&&!i.agent); return {wrote:pool.filter(i=>i.authorId===me&&i.status!=='draft'),assigned:pool.filter(i=>(i.people||[]).includes(me)&&i.status!=='draft'),drafts:pool.filter(i=>i.status==='draft'&&i.authorId===me)}; }
const mpGroup=i=>i.arch?'자료실':(TYPE_NAME[i.type]||'기타');
function mpActivity(){ const L=mpActLists(), a=MP.act; if(!L[a.tab])a.tab='wrote';
  const tabs=[['wrote','내가 작성'],['assigned','내 담당'],['drafts','초안']];
  return mpHead('내 활동','내가 작성했거나 담당자로 지정된 항목, 아직 게시하지 않은 초안입니다. 초안은 나에게만 보입니다.')+`
  <div class="mp-seg" role="tablist">${tabs.map(([k,t])=>`<button role="tab" aria-selected="${a.tab===k}" class="${a.tab===k?'on':''}" data-mp="act-tab:${k}">${t}<b>${L[k].length}</b></button>`).join('')}</div>
  <div class="mp-tools">${mpSel('act.type',a.type,[['','모든 구분'],['미팅','미팅'],[ACT,ACT],['리서치','리서치'],['자료실','자료실']],'구분')}${mpSel('act.proj',a.proj,mpProjOpts(),'프로젝트')}<input class="mp-q" type="search" data-mpq="act" value="${esc(a.q)}" placeholder="제목 검색" aria-label="제목 검색"></div>
  <div data-mplist="act">${mpActList()}</div>`; }
function mpActList(){ const a=MP.act, all=mpActLists()[a.tab]||[], q=a.q.trim().toLowerCase();
  const rows=all.filter(i=>(!a.type||mpGroup(i)===a.type)&&(!a.proj||(!i.arch&&i.proj===a.proj))&&(!q||mpTitle(i).toLowerCase().includes(q))).sort((x,y)=>String(y.updatedAt||y.createdAt||'').localeCompare(String(x.updatedAt||x.createdAt||''))||newestFirst(x,y));
  if(!all.length)return `<div class="mp-none">${a.tab==='drafts'?'작성 중인 초안이 없습니다.':a.tab==='assigned'?'담당자로 지정된 항목이 없습니다.':'아직 작성한 항목이 없습니다.'}</div>`;
  if(!rows.length)return '<div class="mp-none">조건에 맞는 항목이 없습니다. <button class="mp-link" data-mp="act-clear">필터 지우기</button></div>';
  return `<div class="mp-tbl act"><div class="hd"><span>제목</span><span>구분</span><span>프로젝트</span><span>상태</span><span>마지막 수정</span></div>${rows.slice(0,a.n).map(i=>`<div class="rw"><button class="t1 lk" data-mopen="${esc(i.id)}">${esc(mpTitle(i))}</button><span class="mut">${esc(typeName(i))}</span><span class="mut">${esc(i.arch?'':pname(proj(i.proj)))}</span><span class="mut">${i.status==='draft'?'초안':'게시됨'}</span><span class="mut">${esc(mpWhen(i.updatedAt||i.createdAt))}</span></div>`).join('')}</div>
  <div class="mp-more"><span>${rows.length}건 중 ${Math.min(a.n,rows.length)}건 표시</span>${rows.length>a.n?'<button class="mp-btn sec" data-mp="act-more">더 보기</button>':''}</div>`; }

/* ---------- 수신함 ---------- */
const mpKind=n=>n.kind==='body'?'mention':n.kind;
function mpNotes(){ const rd=new Set(INBOX_STATE.read||[]), ar=new Set(INBOX_STATE.archived||[]); return notifications().map(n=>({...n,read:rd.has(n.id),arch:ar.has(n.id),it:item(n.item)||{}})); }
function mpInboxRows(all){ const s=MP.inbox, q=s.q.trim().toLowerCase();
  return all.filter(n=>(s.tab==='arch'?n.arch:!n.arch&&(s.tab!=='unread'||!n.read))&&(!s.type||mpKind(n)===s.type)&&(!s.proj||(!n.it.arch&&n.it.proj===s.proj))&&(!q||(mpTitle(n.it)+' '+(n.text||'')+' '+userName(n.who)).toLowerCase().includes(q))); }
function mpInbox(){ const all=mpNotes(), s=MP.inbox, cnt={all:all.filter(n=>!n.arch).length,unread:all.filter(n=>!n.arch&&!n.read).length,arch:all.filter(n=>n.arch).length};
  return mpHead('수신함','',`<span class="cnt" id="mp-uncnt">${cnt.unread?`읽지 않음 ${cnt.unread>99?'99+':cnt.unread}`:''}</span><span class="sp"></span><button class="mp-link" data-mp="go:settings.notif">알림 설정</button>`)+`
  <div class="mp-seg" role="tablist">${[['all','전체'],['unread','읽지 않음'],['arch','보관함']].map(([k,t])=>`<button role="tab" aria-selected="${s.tab===k}" class="${s.tab===k?'on':''}" data-mp="in-tab:${k}">${t}<b>${cnt[k]>99?'99+':cnt[k]}</b></button>`).join('')}</div>
  <div class="mp-tools">${mpSel('inbox.type',s.type,[['','모든 유형'],['mention','멘션'],['comment','댓글'],['remind','날짜 알림']],'알림 유형')}${mpSel('inbox.proj',s.proj,mpProjOpts(),'프로젝트')}<input class="mp-q" type="search" data-mpq="inbox" value="${esc(s.q)}" placeholder="제목 · 내용 · 보낸 사람 검색" aria-label="알림 검색"></div>
  <div data-mplist="inbox">${mpInboxList(all)}</div>`; }
function mpInboxList(all){ all=all||mpNotes(); const s=MP.inbox, rows=mpInboxRows(all); const ids=new Set(rows.map(n=>n.id)); [...s.sel].forEach(id=>{if(!ids.has(id))s.sel.delete(id);}); const n=s.sel.size, unread=rows.filter(x=>!x.read).length, readN=rows.filter(x=>x.read).length;
  if(!all.length)return '<div class="mp-none">알림이 없습니다.<br>다른 멤버가 내가 작성했거나 담당하는 글에 댓글을 달거나, @로 나를 멘션하면 여기에 표시됩니다.</div>';
  if(!rows.length)return `<div class="mp-none">${s.type||s.proj||s.q.trim()?'조건에 맞는 알림이 없습니다. <button class="mp-link" data-mp="in-clear">필터 지우기</button>':s.tab==='unread'?'읽지 않은 알림이 없습니다.':s.tab==='arch'?'보관한 알림이 없습니다.':'새 알림이 없습니다. 지난 알림은 보관함에 있습니다.'}</div>`;
  const bar=`<div class="mp-bulk">${mpCheck(n>0&&n===rows.length,'in-all','보이는 알림 모두 선택')}<span class="n">${n?`${n}건 선택`:`${rows.length}건`}</span>${n?`<button class="mp-btn sec sm" data-mp="in-bulk:read">읽음</button><button class="mp-btn sec sm" data-mp="in-bulk:unread">읽지 않음</button><button class="mp-btn sec sm" data-mp="in-bulk:${s.tab==='arch'?'unarch':'arch'}">${s.tab==='arch'?'보관 해제':'보관'}</button>`:''}<span class="sp"></span>${unread?`<button class="mp-btn sec sm" data-mp="in-readall">모두 읽음 (${unread})</button>`:''}${s.tab!=='arch'&&readN?`<button class="mp-btn sec sm" data-mp="in-archread">읽은 알림 보관 (${readN})</button>`:''}</div>`;
  return bar+`<div class="mp-notes">${rows.map(x=>{ const it=x.it, ok=!!it.id&&panelExists(it.id)&&(!ITEMS.includes(it)||canSee(it)), date=x.date?x.date.replace(/^(\d+)-0?(\d+)-0?(\d+)$/,'$1. $2. $3'):'';
    const what=!ok?'<span class="gone">삭제되었거나 볼 수 없는 항목의 알림입니다.</span>':`${x.kind==='remind'?'<b>알림</b>':`<b>${esc(userName(x.who))}</b>님이`} <span class="chip">${esc(typeName(it))}</span><button class="ti" data-mp="in-open:${esc(x.id)}">${esc(mpTitle(it))}</button>${x.kind==='remind'?`에 적힌 날짜 ${esc(date)}${x.date===TODAY?'이 오늘입니다.':'이 다가옵니다.'}`:x.kind==='mention'?'의 댓글에서 회원님을 멘션했습니다.':x.kind==='body'?'의 본문에서 회원님을 멘션했습니다.':'에 댓글을 달았습니다.'}`;
    return `<div class="mp-n ${x.read?'read':'unread'} ${s.sel.has(x.id)?'sel':''}">${mpCheck(s.sel.has(x.id),'in-sel:'+esc(x.id),'알림 선택')}<div class="bd"><div class="dt">${esc(x.ts?fmtStamp(new Date(x.ts)):'')}${x.read?'':'<i title="읽지 않음"></i>'}</div><div class="ln">${avOf(x.kind==='remind'?'':x.who,'av22')}<span class="tx">${what}</span></div>${ok&&x.text?`<div class="cm">${mentionHtml(x.text)}</div>`:''}${ok&&x.kind!=='remind'?`<div class="rp" data-inbox-reply="${esc(x.id)}">${svg('i-reply',11.6,19.2,'')}${av()}<span class="tx">댓글 추가</span></div>`:''}</div>
      <div class="ops"><button class="mp-link" data-mp="in-read:${esc(x.id)}">${x.read?'읽지 않음으로':'읽음으로'}</button><button class="mp-link" data-mp="in-arch:${esc(x.id)}">${x.arch?'보관 해제':'보관'}</button></div></div>`; }).join('')}</div>`; }
function mpSetRead(ids,on){ if(on)markRead(ids); else INBOX_STATE.read=(INBOX_STATE.read||[]).filter(id=>!ids.includes(id)); }
function mpSetArch(ids,on){ const cur=INBOX_STATE.archived||[]; INBOX_STATE.archived=on?[...new Set(cur.concat(ids))]:cur.filter(id=>!ids.includes(id)); }
function mpInboxDo(){ if(mpKey()==='inbox')mpRender(); else {mpNav();updateBadges();} }

/* ---------- 설정 › 개인 ---------- */
function mpSetPref(k,v){ const p={...(INBOX_STATE.prefs||{})}; if(v===MY_PREFS[k])delete p[k]; else p[k]=v; INBOX_STATE.prefs=p; myPrefsApply(); mpSaved('prefs'); mpRender(); render(true); }
// Switches and choices apply at once; "저장됨" appears when the Worker has taken them.
async function mpSaved(form){ MP.state[form]={k:'saving'}; const why=await mpCommit(['meta:inbox:'+sharedUser]); MP.state[form]=why?{k:'pending'}:{k:'saved',at:Date.now()}; if(why)mpWatch(form,['meta:inbox:'+sharedUser]); const b=$(`[data-mpstate="${form}"]`); if(b){b.className='mp-state '+MP.state[form].k; b.textContent=why?'아직 서버에 저장되지 않았습니다. 연결되면 자동으로 다시 보냅니다.':'저장됨';} }
const mpSwitch=(k,on,label,note,o={})=>`<div class="mp-row" data-row="${k}"><div><b>${esc(label)}</b>${note?`<small>${note}</small>`:''}</div><button class="mp-sw ${on?'on':''}" role="switch" aria-checked="${on?'true':'false'}" aria-label="${esc(label)}" ${o.fixed?'disabled':`data-mp="pref:${k}"`}><i></i></button></div>`;
const mpInfo=(k,label,val,note)=>`<div class="mp-row" data-row="${k}"><div><b>${esc(label)}</b>${note?`<small>${note}</small>`:''}</div><span class="fixed">${esc(val)}</span></div>`;
function mpPrefs(){ const mode=myPref('cmtEnter'), tz=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{return '';}})(), changed=Object.keys(INBOX_STATE.prefs||{}).length;
  return mpHead('기본 설정','나에게만 적용되고, 로그인한 모든 기기에 따라옵니다. 바꾸면 바로 저장됩니다.',`<span class="sp"></span><span class="mp-state" data-mpstate="prefs" role="status"></span>`)+`
  <div class="mp-rows"><div class="gh">입력</div>
    <div class="mp-row" data-row="cmtEnter"><div><b>댓글 입력 방식</b><small>한글을 조합하는 중에 누른 Enter는 어느 쪽에서도 등록으로 치지 않습니다.</small></div><div class="mp-radio" role="radiogroup" aria-label="댓글 입력 방식"><button role="radio" aria-checked="${mode!=='mod'}" class="${mode!=='mod'?'on':''}" data-mp="prefv:cmtEnter=enter">Enter로 등록</button><button role="radio" aria-checked="${mode==='mod'}" class="${mode==='mod'?'on':''}" data-mp="prefv:cmtEnter=mod">Ctrl(⌘)+Enter로 등록</button></div></div>
    <div class="gh">접근성</div>${mpSwitch('calm',!!myPref('calm'),'화면 움직임 줄이기','패널이 열리는 움직임 같은 전환 효과를 끕니다.')}
    <div class="gh">표시</div>${mpInfo('theme','테마','라이트','다크 테마·고대비 화면은 아직 없습니다.')}${mpInfo('locale','언어 · 날짜 · 시간대',`한국어 · ${fmtStampShort(new Date()).slice(0,10)} · ${tz||'브라우저 시간대'}`,'언어와 날짜 형식은 한 가지이고, 시각은 이 브라우저의 시간대로 보여 줍니다.')}
    <div class="gh">초기화</div><div class="mp-row" data-row="reset"><div><b>개인 설정 초기화</b><small>기본 설정과 알림 설정을 처음 상태로 되돌립니다. 읽음·보관 기록은 그대로입니다.</small></div><button class="mp-btn sec" data-mp="pref-reset" ${changed?'':'disabled'}>초기화</button></div></div>`; }
function mpNotif(){ return mpHead('알림','수신함에 무엇을 받을지 정합니다. 바꾸면 바로 저장됩니다.',`<span class="sp"></span><span class="mp-state" data-mpstate="prefs" role="status"></span>`)+`
  <div class="mp-rows"><div class="gh">수신함 알림</div>
    ${mpSwitch('nMention',true,'멘션','댓글이나 본문에서 @로 나를 부르면 알립니다. 놓치면 안 되는 알림이라 끌 수 없습니다.',{fixed:true})}
    ${mpSwitch('nComment',!!myPref('nComment'),'댓글','내가 작성했거나 담당하는 글에 댓글이 달리면 알립니다.')}
    ${mpSwitch('nRemind',!!myPref('nRemind'),'날짜 알림 (리마인더)','글에 적어 둔 날짜 알림이 다가오면 알립니다.')}
    <div class="gh">다른 채널</div>${mpInfo('channels','이메일 · 브라우저 알림','지원하지 않음','메일을 보내는 설비와 푸시 알림이 없어 수신함으로만 알립니다.')}
    <div class="mp-note">알림을 꺼도 지난 알림의 읽음·보관 기록은 지워지지 않습니다. 다시 켜면 그대로 돌아옵니다.</div></div>`; }

/* ---------- 설정 › 워크스페이스 › 일반 ---------- */
function mpWs(){ const adm=canAdmin();
  if(!adm)return mpHead('일반','워크스페이스 기본 정보입니다. 소유자·관리자만 바꿀 수 있습니다.')+`<div class="mp-form">${mpFixed('워크스페이스 이름',esc(SETTINGS.wsName||'AIDC WorkSpace'),{row:'wsName'})}${mpFixed('소속',esc(SETTINGS.org||'—'),{row:'org'})}${mpFixed('부서 드롭박스 주소',SETTINGS.dropboxUrl?esc(SETTINGS.dropboxUrl):'—',{row:'dropboxUrl'})}</div>`;
  return mpHead('일반','워크스페이스 기본 정보입니다. 모든 멤버의 화면에 적용됩니다.')+`
  <div class="mp-form">${mpField('ws','wsName','워크스페이스 이름',{max:30,note:'왼쪽 위 로고와 브라우저 탭 제목에 쓰입니다.'})}${mpField('ws','org','소속',{max:60})}${mpField('ws','dropboxUrl','부서 드롭박스 주소',{max:300,ph:'https://www.dropbox.com/...'})}</div>
  <div class="mp-sub" style="margin-top:34px"><h3>푸터 링크</h3></div><div class="mp-desc" style="font-size:12.5px;font-weight:400;color:#8e8e8e">모든 페이지 맨 아래에 표시됩니다. 비워 두면 흐리게 보이고 눌러도 열리지 않습니다.</div>
  <div class="mp-form" style="margin-top:16px">${MP_LINKS.map(([k,t])=>mpField('ws','lk_'+k,t,{max:300,ph:'https://'})).join('')}</div>
  ${PREVIEW_ON?`<div class="mp-sub" style="margin-top:34px"><h3>캘린더 공휴일</h3></div><div class="mp-desc" style="font-size:12.5px;font-weight:400;color:#8e8e8e">법정 공휴일과 대체공휴일은 자동으로 빨간 날짜가 됩니다. 선거일·임시공휴일처럼 따로 정해지는 날만 여기에 적습니다.</div>
  <div class="mp-form" style="margin-top:16px">${mpField('ws','holidays','추가 공휴일',{max:400,ph:'예: 2026-06-03, 2027-03-03'})}</div>`:''}
  <div class="mp-foot"><button class="mp-btn" data-mp="save:ws" disabled>변경 사항 저장</button>${mpDirty('ws')?'<button class="mp-btn sec" data-mp="undo:ws">되돌리기</button>':''}<span class="mp-state" data-mpstate="ws" role="status"></span></div>`+mpAfter('ws'); }

/* ---------- 휴지통 ---------- */
const mpLeft=at=>at?Math.max(0,30-Math.floor((Date.now()-new Date(at).getTime())/864e5)):null;
function mpTrashRows(){ const s=MP.trash, q=s.q.trim().toLowerCase(); return trashList().filter(x=>(!s.type||x.g===s.type)&&(!q||(x.t+' '+x.where+' '+userName(x.by)).toLowerCase().includes(q))); }
function mpTrash(){ const all=trashList(), s=MP.trash, own=canOwner(), types=[...new Set(all.map(x=>x.g))];
  return mpHead('휴지통',`삭제한 항목은 30일 동안 보관된 뒤 서버에서 자동으로 영구 삭제됩니다. ${own?'':'영구 삭제와 휴지통 비우기는 소유자만 할 수 있습니다.'}`)+`
  <div class="mp-tools">${mpSel('trash.type',s.type,[['','모든 구분']].concat(types.map(t=>[t,t])),'구분')}<input class="mp-q" type="search" data-mpq="trash" value="${esc(s.q)}" placeholder="제목 · 원래 위치 · 삭제한 사람 검색" aria-label="휴지통 검색"><span class="sp"></span>${own&&all.length?`<button class="mp-btn danger" data-mp="tr-empty">휴지통 비우기 (${all.length})</button>`:''}</div>
  <div data-mplist="trash">${mpTrashList()}</div>`; }
function mpTrashList(){ const all=trashList(), rows=mpTrashRows(), s=MP.trash, own=canOwner(); const keys=new Set(rows.map(x=>x.k+'|'+x.id)); [...s.sel].forEach(k=>{if(!keys.has(k))s.sel.delete(k);}); const n=s.sel.size;
  if(!all.length)return '<div class="mp-none">휴지통이 비어 있습니다.</div>';
  if(!rows.length)return '<div class="mp-none">조건에 맞는 항목이 없습니다. <button class="mp-link" data-mp="tr-clear">필터 지우기</button></div>';
  return `<div class="mp-bulk">${mpCheck(n>0&&n===rows.length,'tr-all','보이는 항목 모두 선택')}<span class="n">${n?`${n}건 선택`:`${rows.length}건`}</span>${n?`<button class="mp-btn sec sm" data-mp="tr-restore-sel">선택 복원</button>`:''}</div>
  <div class="mp-tbl trash ${own?'own':''}"><div class="hd"><span></span><span>제목</span><span>구분</span><span>원래 위치</span><span>삭제한 사람</span><span>삭제한 때</span><span>남은 기간</span><span></span></div>${rows.map(x=>{ const key=esc(x.k+'|'+x.id), left=mpLeft(x.at);
    return `<div class="rw ${s.sel.has(x.k+'|'+x.id)?'sel':''}">${mpCheck(s.sel.has(x.k+'|'+x.id),'tr-sel:'+key,'항목 선택')}<button class="t1 lk" data-mp="tr-view:${key}" title="미리보기">${esc(x.t)}</button><span class="mut">${esc(x.ty)}${x.k==='item'&&x.was==='draft'?' · 초안':''}</span><span class="mut">${esc(x.where||'—')}</span><span class="mut">${esc(x.by?userName(x.by):'—')}</span><span class="mut">${esc(mpWhen(x.at)||'—')}</span><span class="mut ${left!==null&&left<=3?'soon':''}">${left===null?'—':left+'일 후 삭제'}</span><span class="acts"><button class="mp-btn sec sm" data-mp="tr-restore:${key}">복원</button>${own?`<button class="mp-btn sec sm" data-mp="tr-purge:${key}">영구 삭제</button>`:''}</span></div>`; }).join('')}</div>`; }
function mpRestore(keys){ let n=0, drafts=0; for(const key of keys){const i=key.indexOf('|'); const how=restoreOne(key.slice(0,i),key.slice(i+1)); if(how){n++; if(how==='draft')drafts++;}} MP.trash.sel.clear(); render(true); mpRender();
  toast(n?`${n>1?n+'건을 ':''}복원했습니다.${drafts?` ${drafts>1?drafts+'건은 ':''}삭제 전 상태 기록이 없어 게시하지 않고 초안으로 돌려놓았습니다.`:''}`:'복원할 항목이 없습니다.',drafts?4200:1800); }
// A look at what is in the trash without bringing it back: nothing here can be changed.
function mpTrashView(key){ const i=key.indexOf('|'), k=key.slice(0,i), id=key.slice(i+1), x=trashList().find(y=>y.k===k&&y.id===id); if(!x)return; let body='', rows=[['구분',x.ty],['원래 위치',x.where||'—'],['삭제한 사람',x.by?userName(x.by):'—'],['삭제한 때',mpWhen(x.at)||'—']];
  if(k==='item'){ const it=ITEMS.find(y=>y.id===id)||{}; rows.push(['작성자',userName(it.authorId)||'—'],['삭제 전 상태',x.was==='draft'?'초안':x.was?'게시됨':'기록 없음 (복원하면 초안)']); const doc=new DOMParser().parseFromString(String(it.body||''),'text/html'); doc.querySelectorAll('script,style').forEach(n=>n.remove()); doc.querySelectorAll('p,div,li,h1,h2,h3,h4,tr,br').forEach(n=>n.append('\n')); body=(doc.body.textContent||'').replace(/\n{3,}/g,'\n\n').trim().slice(0,4000); }
  else if(k==='partner'){ const p=PARTNERS.find(y=>y.id===id)||{}; body=[p.cat,p.desc,p.site,p.contact].filter(Boolean).join('\n'); }
  else if(k==='project'){ const p=((SETTINGS.projTrash||{})[id]||{}).project||{}; body=[p.full,p.status,p.desc].filter(Boolean).join('\n'); }
  else { const [si,cid]=id.split(':'); const c=((ARCH_SECTIONS[si]||{cards:[]}).cards||[]).find(y=>y.id===cid)||{}; body=[c.desc,c.url].filter(Boolean).join('\n'); }
  const back=document.activeElement, d=document.createElement('div'); d.id='mp-prev'; d.className='dlg mp-prev'; d.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="삭제된 항목 미리보기" tabindex="-1"><div class="ro">읽기 전용 · 휴지통에 있는 항목</div><h3>${esc(x.t)}</h3><dl>${rows.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl><div class="tx scroll">${body?esc(body):'<span class="mut">본문이 없습니다.</span>'}</div><div class="bt"><button data-pv="x">닫기</button><button class="pri" data-pv="restore">복원</button></div></div>`;
  document.body.appendChild(d); const box=$('.box',d); box.focus(); const close=()=>{d.remove(); if(back&&back.isConnected)try{back.focus();}catch{}};
  d.addEventListener('click',e=>{ e.stopPropagation(); const b=e.target.closest('[data-pv]'); if(e.target===d||(b&&b.dataset.pv==='x')){close();return;} if(b&&b.dataset.pv==='restore'){d.remove();mpRestore([key]);} }); }
function mpPurge(keys,done){ if(!canOwner()){toast('영구 삭제는 소유자만 할 수 있습니다.');return;} for(const key of keys){const i=key.indexOf('|'); purgeOne(key.slice(0,i),key.slice(i+1));} MP.trash.sel.clear(); mpRender(); render(true);
  mpCommit(keys.map(k=>k.startsWith('item|')?'item:'+k.slice(5):k.startsWith('partner|')?'partner:'+k.slice(8):k.startsWith('project|')?'meta:settings':'meta:archive')).then(why=>{ if(!why)toast(done); else if(why==='pending')toast('아직 서버에 반영되지 않았습니다. 연결되면 자동으로 다시 보냅니다.',3200); if(MP.open)mpRender(); }); }

/* ---------- what is clicked, typed, chosen ---------- */
document.addEventListener('click',e=>{ if(!MP.open)return; const el=e.target.closest('[data-mp]'); if(!el||!el.closest('#modal'))return; const a=el.dataset.mp, i=a.indexOf(':'), k=i<0?a:a.slice(0,i), v=i<0?'':a.slice(i+1); const I=MP.inbox, T=MP.trash;
  const notes=()=>mpInboxRows(mpNotes());
  if(k==='close'){closeModal();return;}
  if(k==='go'){mpGo(v);return;}
  if(k==='find'){const [to,row]=v.split('|'); MP.sq=''; MP.hit=row; mpGo(to); return;}
  if(k==='logout'){logout();return;}
  if(k==='save'){mpSave(v);return;}
  if(k==='undo'){delete MP.draft[v]; delete MP.state[v]; mpRender(); return;}
  if(k==='copy-id'){const done=()=>toast('사번을 복사했습니다.'); if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(sharedUser).then(done,()=>toast('복사하지 못했습니다.')); else toast('이 브라우저에서는 복사할 수 없습니다.'); return;}
  if(k==='avatar'){const f=$('#mp-avf'); if(f){f.value='';f.click();} return;}
  if(k==='avatar-x'){mpAvatarOff();return;}
  if(k==='sess-reload'){const b=$('#mp-sess'); if(b)b.innerHTML='<div class="none">불러오는 중…</div>'; mpLoadSessions(); return;}
  if(k==='sess-end'){mpEndSession({id:v},'그 기기에서 로그아웃했습니다.');return;}
  if(k==='sess-others'){const n=(MP.sess||[]).filter(s=>!s.current).length; if(!n)return; confirmDlg(`이 기기를 뺀 ${n}개 기기에서 모두 로그아웃할까요? 그 기기에서 저장하지 않은 입력은 그 브라우저에 남습니다.`,[{t:'모두 로그아웃',pri:true,fn:()=>mpEndSession({others:true},`${n}개 기기에서 로그아웃했습니다.`)},{t:'취소',fn:()=>{}}]); return;}
  if(k==='act-tab'){MP.act.tab=v; MP.act.n=50; mpRender(undefined,true); return;}
  if(k==='act-more'){MP.act.n+=50; const b=$('[data-mplist="act"]'); if(b)b.innerHTML=mpActList(); return;}
  if(k==='act-clear'){Object.assign(MP.act,{q:'',type:'',proj:''}); mpRender(); return;}
  if(k==='in-tab'){I.tab=v; I.sel.clear(); try{localStorage.setItem('aidc-mp:'+sharedUser,JSON.stringify({inbox:v}));}catch{} mpRender(undefined,true); return;}
  if(k==='in-clear'){Object.assign(I,{q:'',type:'',proj:''}); mpRender(); return;}
  if(k==='in-sel'){if(I.sel.has(v))I.sel.delete(v); else I.sel.add(v); const b=$('[data-mplist="inbox"]'); if(b)b.innerHTML=mpInboxList(); return;}                 // choosing is not reading
  if(k==='in-all'){const rows=notes(); if(I.sel.size===rows.length)I.sel.clear(); else rows.forEach(n=>I.sel.add(n.id)); const b=$('[data-mplist="inbox"]'); if(b)b.innerHTML=mpInboxList(); return;}
  if(k==='in-read'){const n=mpNotes().find(x=>x.id===v); if(!n)return; mpSetRead([v],!n.read); mpInboxDo(); return;}
  if(k==='in-arch'){const n=mpNotes().find(x=>x.id===v); if(!n)return; const on=!n.arch; mpSetArch([v],on); I.sel.delete(v); mpInboxDo(); toast(on?'보관했습니다.':'보관을 해제했습니다.',5000,{t:'실행 취소',fn:()=>{mpSetArch([v],!on);mpInboxDo();}}); return;}
  if(k==='in-bulk'){const ids=[...I.sel]; if(!ids.length)return; const was=mpNotes().filter(n=>ids.includes(n.id));
    if(v==='read'||v==='unread'){mpSetRead(ids,v==='read'); toast(`${ids.length}건을 ${v==='read'?'읽음':'읽지 않음'}으로 표시했습니다.`);}
    else {const on=v==='arch'; mpSetArch(ids,on); I.sel.clear(); toast(`${ids.length}건을 ${on?'보관했습니다':'보관 해제했습니다'}.`,5000,{t:'실행 취소',fn:()=>{mpSetArch(was.filter(n=>n.arch!==on).map(n=>n.id),!on);mpInboxDo();}});}
    mpInboxDo(); return;}
  if(k==='in-readall'){const ids=notes().filter(n=>!n.read).map(n=>n.id); if(!ids.length)return; mpSetRead(ids,true); mpInboxDo(); toast(`${ids.length}건을 읽음으로 표시했습니다.`,5000,{t:'실행 취소',fn:()=>{mpSetRead(ids,false);mpInboxDo();}}); return;}
  if(k==='in-archread'){const ids=notes().filter(n=>n.read&&!n.arch).map(n=>n.id); if(!ids.length)return; mpSetArch(ids,true); I.sel.clear(); mpInboxDo(); toast(`읽은 알림 ${ids.length}건을 보관했습니다.`,5000,{t:'실행 취소',fn:()=>{mpSetArch(ids,false);mpInboxDo();}}); return;}
  if(k==='in-open'){const n=mpNotes().find(x=>x.id===v); if(!n)return; const it=n.it; if(!it.id||!panelExists(it.id)||(ITEMS.includes(it)&&!canSee(it))){toast('삭제되었거나 볼 수 없는 항목입니다.');return;} mpSetRead([v],true); closeModal(); openPanel(it.id); return;}   // read only once it really opens
  if(k==='pref'){mpSetPref(v,!myPref(v));return;}
  if(k==='prefv'){const [pk,pv]=v.split('='); mpSetPref(pk,pv); return;}
  if(k==='pref-reset'){const old=INBOX_STATE.prefs; if(!old||!Object.keys(old).length)return; delete INBOX_STATE.prefs; myPrefsApply(); mpSaved('prefs'); mpRender(); render(true); toast('개인 설정을 처음 상태로 되돌렸습니다.',5000,{t:'실행 취소',fn:()=>{INBOX_STATE.prefs=old;myPrefsApply();mpSaved('prefs');mpRender();render(true);}}); return;}
  if(k==='tr-sel'){if(T.sel.has(v))T.sel.delete(v); else T.sel.add(v); const b=$('[data-mplist="trash"]'); if(b)b.innerHTML=mpTrashList(); return;}
  if(k==='tr-all'){const rows=mpTrashRows(); if(T.sel.size===rows.length)T.sel.clear(); else rows.forEach(x=>T.sel.add(x.k+'|'+x.id)); const b=$('[data-mplist="trash"]'); if(b)b.innerHTML=mpTrashList(); return;}
  if(k==='tr-clear'){Object.assign(T,{q:'',type:''}); mpRender(); return;}
  if(k==='tr-view'){mpTrashView(v);return;}
  if(k==='tr-restore'){mpRestore([v]);return;}
  if(k==='tr-restore-sel'){mpRestore([...T.sel]);return;}
  if(k==='tr-purge'){if(!canOwner())return; const x=trashList().find(y=>y.k+'|'+y.id===v); if(!x)return; confirmDlg(`“${x.t}”을(를) 영구 삭제할까요? 되돌릴 수 없습니다.`,[{t:'영구 삭제',pri:true,fn:()=>mpPurge([v],'영구 삭제했습니다.')},{t:'취소',fn:()=>{}}]); return;}
  if(k==='tr-empty'){if(!canOwner())return; const all=trashList(); if(!all.length)return; confirmDlg(`휴지통의 ${all.length}건을 모두 영구 삭제할까요? 지금 목록에 있는 ${all.length}건만 지우며, 되돌릴 수 없습니다.`,[{t:`${all.length}건 영구 삭제`,pri:true,fn:()=>mpPurge(all.map(x=>x.k+'|'+x.id),'휴지통을 비웠습니다.')},{t:'취소',fn:()=>{}}]); return;}
});
document.addEventListener('input',e=>{ if(!MP.open)return; const t=e.target; if(!t.closest||!t.closest('#modal'))return;
  if(t.id==='mp-sq'){MP.sq=t.value; const r=$('#mp-sres'), tabs=$('#mnav .sub .tabs'); if(r)r.innerHTML=mpFound(); if(tabs)tabs.hidden=!!MP.sq.trim(); return;}
  if(t.dataset.mpq){const w=t.dataset.mpq; (w==='act'?MP.act:w==='inbox'?MP.inbox:MP.trash).q=t.value; if(w==='act')MP.act.n=50; const b=$(`[data-mplist="${w}"]`); if(b)b.innerHTML=w==='act'?mpActList():w==='inbox'?mpInboxList():mpTrashList(); return;}
  if(t.dataset.mpf){const [form,k]=t.dataset.mpf.split('.'); mpDraft(form)[k]=t.value; if(MP.state[form]&&MP.state[form].k!=='saving')delete MP.state[form]; mpFormState(form); return;} });
document.addEventListener('change',e=>{ if(!MP.open)return; const t=e.target; if(t.id==='mp-avf'){mpAvatar(t.files&&t.files[0]);return;}
  if(t.dataset&&t.dataset.mpc){const [w,k]=t.dataset.mpc.split('.'); (w==='act'?MP.act:w==='inbox'?MP.inbox:MP.trash)[k]=t.value; if(w==='act')MP.act.n=50; const b=$(`[data-mplist="${w}"]`); if(b)b.innerHTML=w==='act'?mpActList():w==='inbox'?mpInboxList():mpTrashList();} });
// Keyboard: Tab stays inside the window (or inside the preview on top of it), Enter in a form field saves, Esc closes the preview first.
document.addEventListener('keydown',e=>{ if(!MP.open)return; const pv=$('#mp-prev');
  if(e.key==='Escape'&&pv){e.stopPropagation();e.preventDefault();pv.click();return;}
  if(e.key==='Enter'&&!e.isComposing&&e.target.dataset&&e.target.dataset.mpf){e.preventDefault();mpSave(e.target.dataset.mpf.split('.')[0]);return;}
  if(e.key!=='Tab'||popEl||$('#dlg'))return; const root=pv||$('#modal'); const f=[...root.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter(n=>!n.disabled&&!n.hidden&&n.type!=='hidden'&&n.offsetParent!==null); if(!f.length)return;
  const first=f[0], last=f[f.length-1], cur=document.activeElement; if(!root.contains(cur)){e.preventDefault();first.focus();} else if(e.shiftKey&&cur===first){e.preventDefault();last.focus();} else if(!e.shiftKey&&cur===last){e.preventDefault();first.focus();} },true);
