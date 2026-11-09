import fs from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('./',import.meta.url);
let html=await fs.readFile(new URL('public/index.html',root),'utf8');
if(!html.includes('let sharedUser='))await fs.writeFile(new URL('original.html',root),html);
html=(await fs.readFile(new URL('original.html',root),'utf8')).replace(/\r\n/g,'\n');
const data=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const seed=vm.runInNewContext(data+`; const out={}; ITEMS.filter(x=>x.status!=='new'&&x.status!=='draft').forEach(x=>out['item:'+x.id]=x);Object.entries(PROJECTS).forEach(([k,v])=>out['project:'+k]=v);PARTNERS.forEach(x=>out['partner:'+x.id]=x);Object.assign(out,{'meta:order':PROJ_ORDER,'meta:roadmap':ROADMAP,'meta:head':PHEAD,'meta:archive':ARCH_SECTIONS,'meta:tabs':ARCH_TABS,'meta:rows':ARCH_ROWS});JSON.stringify(out);`);
await fs.writeFile(new URL('seed.json',root),seed);

// Every anchor below must exist in original.html. When the design file moves or rewrites one of them,
// the build fails here instead of silently dropping a shared feature (login, server save, edit locks).
let step=0;
function rep(search,replacement,{all=false}={}){
 step++;
 const count=typeof search==='string'?html.split(search).length-1:(html.match(search)||[]).length;
 const label=String(typeof search==='string'?search:search.source).slice(0,110);
 if(!count)throw new Error(`build-shared: anchor #${step} not found in original.html: ${label}`);
 if(count>1&&!all)throw new Error(`build-shared: anchor #${step} matched ${count} times, expected 1: ${label}`);
 html=all?html.replaceAll(search,()=>replacement):html.replace(search,()=>replacement);
}

/* ---- identity: the logged-in employee replaces the demo user "최원 기사" ---- */
rep("const ME='최원 기사';","let ME='최원 기사';");
rep("const id=type[0]+Date.now(); const base={id,type,","const id=type[0]+crypto.randomUUID(); const base={id,type,createdAt:new Date().toISOString(),authorId:sharedUser,");
rep("it.comments.push({who:ME,text:v,at:'방금'})","it.comments.push({authorId:sharedUser,who:sharedName,text:v,at:'방금'})");
rep("who:'최원 기사',text:","authorId:sharedUser,who:sharedName,text:",{all:true});
rep("esc(c.who)","esc(c.authorId?userName(c.authorId):c.who)",{all:true});
rep("(i.people||[]).includes('choi')","(i.authorId===sharedUser||(i.people||[]).includes(sharedUser))");
rep("const d=ITEMS.filter(i=>i.status==='draft')","const d=ITEMS.filter(i=>i.status==='draft'&&i.authorId===sharedUser)");
rep("{hd:'junsoo2514@sunjin.co.kr'}","{hd:'사번: '+sharedUser}");
rep('value="최원 기사"','value="${esc(sharedName)}"');

/* ---- assignees: any number of people, shown as "first +N" ---- */
rep("who(it.people.slice(0,1))","who(it.people)");
rep("who(it.people.slice(0,2))","who(it.people)");
rep("const who=(ppl)=>ppl.map(k=>`<span class=\"who\">${av()}${esc(PEOPLE[k])}</span>`).join('')+(it.type==='action'?'<span class=\"ghost\"></span>':'');","const who=(ppl)=>ppl.length?ppl.map(k=>`<span class=\"who\">${av()}${esc(userName(k))}</span>`).join(''):'<span class=\"plain\">비어 있음</span>';");
rep("if(k==='people'){menuPop(el,[{hd:'담당자 선택'}]","if(k==='people'){menuPop(el,[]");
rep("if(!it.people.length)it.people=[id];","");

/* ---- edit locks: "locked" comes from the server lock table, not from a status value ---- */
rep("const locked=it.status==='locked';","const locked=!!otherLock('item:'+it.id);");
rep("function canEditItem(it){return !!(it&&it.status!=='locked'&&(","function canEditItem(it){return !!(it&&!otherLock('item:'+it.id)&&(");
rep("if(it.status==='locked')return false;","if(otherLock('item:'+it.id))return false;");
rep("if(locked) head=`<span class=\"lock sh-btn\">${av('av21')}박재남 전무<span>님이 수정 중</span></span>","if(locked) head=`<button class=\"lock sh-btn\" disabled>${esc(userName(otherLock('item:'+it.id)?.employee))}님이 수정 중입니다</button>");
rep("else if(it.status==='published'&&!it.editing) head=","else if((it.status==='published'||it.status==='locked')&&!it.editing) head=");

/* ---- item edit lifecycle: acquire the lock before editing, keep a full snapshot, release on cancel ---- */
rep("document.addEventListener('click',e=>{\n  const T=e.target; const q=s=>T.closest(s);","document.addEventListener('click',async e=>{\n  const T=e.target; const q=s=>T.closest(s);");
rep("if(k==='edit'&&it){if(it.status==='locked'){toast('다른 사용자가 수정 중입니다.');return;} it.editing=true; it.snap=","if(k==='edit'&&it){if(otherLock('item:'+it.id)){toast('다른 사용자가 수정 중입니다.');return;}if(!await sharedBeginEdit('item:'+it.id))return;if(it.status==='locked')it.status='published';it._editOriginal=copy(it);it.editing=true; it.snap=");
rep("async function trashItem(it){it.status='trash';","async function trashItem(it){if(!await sharedBeginEdit('item:'+it.id))return;it.editing=false;it.dirty=false;delete it.snap;delete it._editOriginal;it.status='trash';");
rep("it.status='published'; it.mod=nowTxt(); it.editing=false; it.dirty=false;","it.status='published'; it.mod=nowTxt(); it.editing=false; it.dirty=false; delete it.snap; delete it._editOriginal;");
rep("if(it.status==='published'){it.updated=TODAY;} delete it.snap;}","if(it.status==='published'){it.updated=TODAY;} delete it.snap; delete it._editOriginal;}");
rep("function revertItem(it){if(it.snap){Object.assign(it,JSON.parse(it.snap));delete it.snap;} it.editing=false; it.dirty=false;}","function revertItem(it){const original=it._editOriginal;if(original){Object.keys(it).forEach(k=>delete it[k]);Object.assign(it,original);}else if(it.snap){Object.assign(it,JSON.parse(it.snap));}delete it.snap;delete it._editOriginal;it.editing=false;it.dirty=false;sharedRelease('item:'+it.id);}");

/* ---- project overview edit: lock the project, save through the server ---- */
rep("if(el=q('[data-editproj]')){if(S.editProj){saveProjectHead();S.editProj=false;render(true);toast('저장했습니다.');}else{S.editProj=true;S.collapsed=false;render(true);}return;}","if(el=q('[data-editproj]')){if(S.editProj){await sharedSaveProject(el);}else{if(!await sharedBeginEdit('project:'+S.proj))return;S.editProj=true;S.collapsed=false;render(true);}return;}");
rep("if(el=q('[data-canceledit]')){S.editProj=false;","if(el=q('[data-canceledit]')){S.editProj=false;await sharedRelease('project:'+S.proj);");

/* ---- editor fields: read from the view that is actually open (panel or full page) ---- */
rep("$('.ititle[data-f=\"title\"]')","$('.ititle[data-f=\"title\"]',S.full?$('#item-pin'):$('#panel-pin'))",{all:true});
rep("$('.ibody[data-f=\"body\"]')","$('.ibody[data-f=\"body\"]',S.full?$('#item-pin'):$('#panel-pin'))",{all:true});

/* ---- main page side list: demo ids may not exist in the shared database ---- */
rep("const evs=(main?['m1','m4']:['m1']).map(item).concat(fresh('meeting')); const ais=[main?item('a1'):item('a2')].concat(fresh('action')), rss=[item('r_q')].concat(fresh('research'));","const evs=(main?['m1','m4']:['m1']).map(item).filter(Boolean).concat(fresh('meeting')); const ais=[main?item('a1'):item('a2')].filter(Boolean).concat(fresh('action')), rss=[item('r_q')].filter(Boolean).concat(fresh('research'));");

/* ---- login screen: employee id + display name, no password ---- */
rep('<div class="err" id="lg-err">','<input class="field" id="lg-name" placeholder="이름 (처음 로그인할 때 입력)" autocomplete="name" maxlength="40"><div class="err" id="lg-err">');
rep('</style>',`#login .logo-ph{left:calc(50% - 60px);top:calc(50% - 240px);width:120px;height:120px}#login h1{top:calc(50% - 105px)}#login .field,#login .submit,#login .err{left:calc(50% - 162px)}#login .f1{top:calc(50% - 25px)}#login #lg-name{top:calc(50% + 30px)}#login .f2{display:none}#login .keep{display:none}#login .err{top:calc(50% + 80px);width:323px;line-height:1.5}#login .submit{top:calc(50% + 145px)}button:disabled{cursor:not-allowed;color:#888}.ihead .lock{font-size:13px;color:#888;white-space:nowrap}</style>`);

/* ---- finally swap the demo login for the shared client (done last so the rules above never touch it) ---- */
const sharedClient=await fs.readFile(new URL('shared-client.js',root),'utf8');
rep(/\/\* ===================== LOGIN ===================== \*\/[\s\S]*?(?=<\/script>)/,sharedClient);

await fs.writeFile(new URL('public/index.html',root),html);
for(const [i,s] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries())new vm.Script(s[1],{filename:'script-'+i});
console.log(`Built and syntax checked. ${step} replacements applied. Seed records: ${Object.keys(JSON.parse(seed)).length}`);
