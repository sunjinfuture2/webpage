/* Upload2: opt-in, mapped action rows; the original importer is untouched. */
const U2_FIELDS=[
 ['key','업무 번호',['wbs','업무번호','번호','id']],
 ['name','업무명',['업무명','작업명','업무패키지','task','제목']],
 ['plannedStart','시작일',['시작일','착수일','시작예정일','start','예상시작일']],
 ['plannedFinish','완료일',['완료일','종료일','완료예정일','종료예정일','finish','end','예상완료일']],
 ['people','담당자',['담당자','담당','주담당','assignee']],
 ['status','상태',['상태','진행상태','status']],
 ['progress','진척률',['진척률','진행률','progress']],
 ['phaseLabel','단계',['개발단계','단계','phase']]
];
let SCHUP2=null;
const schUp2Btn=()=>'<button class="sh-btn lib sch-xl sch-upb" data-upload2 title="열을 연결하고 변경 내용을 확인한 뒤 적용">업로드2</button>';
const u2norm=v=>String(v??'').replace(/\s+/g,'').toLowerCase();
const u2value=v=>Array.isArray(v)?v.map(userName).join(', '):v==null?'':String(v);
function u2Day(v){
 const s=String(v).trim();if(/^\d{5}(\.\d+)?$/.test(s)){const n=+s;if(n>20000&&n<80000)return new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000).toISOString().slice(0,10);}
 const m=s.match(/^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?$/);
 if(!m)return null;const d=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'), t=new Date(d+'T00:00:00Z');return !isNaN(+t)&&t.toISOString().slice(0,10)===d?d:null;
}
function u2AutoMap(row){const out={};for(const [key,,aliases] of U2_FIELDS){const hits=row.map((v,i)=>aliases.includes(u2norm(v))?i:-1).filter(i=>i>=0);out[key]=hits.length===1?hits[0]:-1;}return out;}
function u2Sheet(){return SCHUP2.book.sheets[SCHUP2.sheet];}
function u2MapKey(){return 'aidc-upload2-map:'+JSON.stringify((u2Sheet().rows[SCHUP2.head]||[]).map(u2norm));}
function u2ChooseSheet(){
 const u=SCHUP2,s=u2Sheet();let best=-1,at=0;
 s.rows.slice(0,100).forEach((r,i)=>{const m=u2AutoMap(r),score=Object.values(m).filter(c=>c>=0).length+(m.name>=0?3:0);if(score>best){best=score;at=i;}});
 u.head=at;u2ChooseHeader();
}
function u2ChooseHeader(){
 const u=SCHUP2;u.map=u2AutoMap(u2Sheet().rows[u.head]||[]);
 try{const m=JSON.parse(localStorage.getItem(u2MapKey())||'null');if(m&&U2_FIELDS.every(([k])=>Number.isInteger(m[k])&&m[k]>=-1&&m[k]<(u2Sheet().rows[u.head]||[]).length))u.map=m;}catch(e){}
 u.rows=null;u.fail='';
}
function u2ResetReview(){SCHUP2.rows=null;SCHUP2.removed=new Set();SCHUP2.fail='';}
function u2ReadRows(){
 const u=SCHUP2,sh=u2Sheet(),m=schModel(u.pid);if(!m)throw Error('일정을 불러오지 못했습니다.');
 if(u.map.name<0)throw Error('업무명 열을 연결해주세요.');
 const cols=Object.values(u.map).filter(c=>c>=0);if(new Set(cols).size!==cols.length)throw Error('같은 엑셀 열을 여러 항목에 연결할 수 없습니다.');
 const keys=(SCHED[u.pid]||{}).up2keys||{}, seen=new Map();u.snapshot=JSON.stringify(SCHED[u.pid]||{});u.rows=[];
 for(let i=u.head+1;i<sh.rows.length;i++){
  const raw=sh.rows[i];if(!raw.some(v=>String(v).trim()))continue;
  const get=k=>u.map[k]>=0?String(raw[u.map[k]]??'').trim():'';
  const r={row:i+1,key:get('key'),values:{},blank:[],errors:[],target:'new',choices:{},id:crypto.randomUUID()};
  for(const [k,label] of U2_FIELDS){
   if(u.map[k]<0||k==='key')continue;
   const error=sh.errors[(i+1)+':'+(u.map[k]+1)];if(error){r.errors.push(label+': '+error);continue;}
   let v=get(k);
   if(!v){r.blank.push(k);continue;}
   if(k==='plannedStart'||k==='plannedFinish'){v=u2Day(v);if(!v)r.errors.push(label+': 날짜 형식을 확인해주세요.');}
   if(k==='progress'){const str=v;v=Number(str.replace(/%$/,''));if(!Number.isFinite(v)||v<0||v>100)r.errors.push('진척률: 0~100%로 입력해주세요.');else if(str.endsWith('%')||v>1)v/=100;}
   if(k==='status'){v=({'예정':'계획','진행중':'진행','진행 중':'진행','완료됨':'완료'})[v]||v;if(!['계획','확인 전','진행','완료','보류','조건부 미발동'].includes(v))r.errors.push('상태: 계획·확인 전·진행·완료·보류·조건부 미발동 중 하나로 입력해주세요.');}
   if(k==='people'){const ids=[];for(const name of v.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean)){const hits=Object.keys(sharedUsers).filter(id=>id===name||userName(id)===name);if(hits.length!==1)r.errors.push('담당자 “'+name+'”: 등록 멤버의 이름 또는 사번을 확인해주세요.');else ids.push(hits[0]);}v=[...new Set(ids)];}
   r.values[k]=v;
  }
  if(u.map.key>=0){const er=sh.errors[(i+1)+':'+(u.map.key+1)];if(er)r.errors.push('업무 번호: '+er);}
  if(r.key){const normalized=u2norm(r.key);if(seen.has(normalized)){r.errors.push('중복 업무 번호: '+r.key);seen.get(normalized).errors.push('중복 업무 번호: '+r.key);}else seen.set(normalized,r);
   const alias=keys[normalized],hits=m.plan.tasks.filter(t=>u2norm(t.wbs)===normalized||t.id===alias);
   if(hits.length===1)r.target=hits[0].id;else if(hits.length>1)r.target='choose';
  }
  if(r.target==='new'&&r.values.name&&m.plan.tasks.some(t=>u2norm(t.name)===u2norm(r.values.name)))r.target='choose';
  u.rows.push(r);
 }
 if(!u.rows.length)throw Error('머리글 아래에 읽을 행이 없습니다.');
 u.removed=new Set();u.fail='';
}
function u2Build(){
 const u=SCHUP2,m=schModel(u.pid),draft=copy(m.plan),by=new Map(draft.tasks.map(t=>[t.id,t])),used=new Set(),errors=[],diff=[],aliases={...((SCHED[u.pid]||{}).up2keys||{})};
 const phases=new Map(m.phases.map(g=>[u2norm(g.label),{code:g.code,label:g.label}]));
 let nextPhase=Math.max(0,...m.phases.map(g=>Number(g.code.replace(/^W/,''))||0));
 const phaseFor=label=>{const code=m.phases.find(g=>u2norm(g.code)===u2norm(label));if(code)return {code:code.code,label:code.label};const key=u2norm(label);if(!phases.has(key))phases.set(key,{code:'W'+(++nextPhase),label});return phases.get(key);};
 let adds=0,updates=0,skips=0;const fields=U2_FIELDS.filter(x=>x[0]!=='key');
 for(const r of u.rows||[]){
  if(r.target==='skip'){skips++;continue;}
  const bad=r.errors.slice();if(r.target==='choose')bad.push('기존 업무 연결 또는 새 업무 추가를 선택해주세요.');
  let t=by.get(r.target),isNew=r.target==='new';
  if(!isNew&&!t&&r.target!=='choose')bad.push('연결한 업무가 없어졌습니다.');
  if(t&&used.has(t.id))bad.push('같은 기존 업무에 두 행을 연결할 수 없습니다.');
  if(t)used.add(t.id);
  if(isNew){
   if(!r.values.name)bad.push('새 업무는 업무명이 필요합니다.');
   if(!r.values.plannedStart||!r.values.plannedFinish)bad.push('새 업무는 시작일과 완료일이 필요합니다.');
   const phase=r.values.phaseLabel?phaseFor(r.values.phaseLabel).code:'W1';
   t=AIDCSchedule.newTask(draft,phase);t.id=r.id;t.order=Math.max(0,...draft.tasks.map(q=>+q.order||0))+1;
   if(/^W\d+\.\d+$/i.test(r.key)&&!draft.tasks.some(q=>u2norm(q.wbs)===u2norm(r.key))){t.wbs=r.key.toUpperCase();t.phase=t.wbs.split('.')[0];}
  }
  const changes=[];
  if(t)for(const [key,label] of fields){
   const blank=r.blank.includes(key);if(!(key in r.values)&&!blank)continue;
   const clearable=['people','status','progress'].includes(key);
   if(blank&&!clearable)continue;
   const next=blank?(key==='people'?[]:key==='progress'?null:'계획'):r.values[key];
   if(same(t[key]??null,next??null))continue;
   const selected=r.choices[key]===undefined?!blank:r.choices[key];
   changes.push({key,label,old:t[key],next,blank,selected});
   if(isNew||selected){if(key==='phaseLabel'){const ph=phaseFor(next);t.phase=ph.code;t.phaseLabel=ph.label;}else t[key]=copy(next);}
  }
  if(t&&t.plannedFinish<t.plannedStart)bad.push('완료일이 시작일보다 빠릅니다.');
  if(t&&t.kind==='milestone'&&t.plannedStart!==t.plannedFinish)bad.push('마일스톤은 시작일과 완료일이 같아야 합니다.');
  if(bad.length){errors.push(...bad.map(s=>r.row+'행: '+s));}
  else if(t){
   if(isNew){t.referenceStart=t.plannedStart;t.referenceFinish=t.plannedFinish;t.sourceSheet='업로드2: '+u2Sheet().name;t.sourceRow=r.row;draft.tasks.push(t);adds++;}
   else if(changes.some(c=>c.selected))updates++;
   if(r.key)aliases[u2norm(r.key)]=t.id;
  }
  diff.push({r,t,isNew,changes,errors:bad});
 }
 const missing=m.plan.tasks.filter(t=>!used.has(t.id));
 const remove=[...u.removed].filter(id=>missing.some(t=>t.id===id));
 if(remove.length){try{AIDCSchedule.removeTasks(draft,remove);}catch(e){errors.push(e.message);}}
 for(const k of Object.keys(aliases))if(!draft.tasks.some(t=>t.id===aliases[k]))delete aliases[k];
 let result=null;
 if(!errors.length)try{AIDCSchedule.validatedPlan(m.plan,d=>Object.assign(d,draft));result=schCalc(draft);}catch(e){errors.push(e.message);}
 const mappingChanged=!same(aliases,(SCHED[u.pid]||{}).up2keys||{});
 return {draft,aliases,errors,diff,missing,remove,adds,updates,skips,result,mappingChanged,oldResult:m.res};
}
function u2Close(){if(SCHUP2?.busy)return;SCHUP2=null;$('#dlg.sch-up2')?.remove();}
async function u2File(file){
 const u=SCHUP2;if(!file||u.busy)return;u.busy=true;u.fail='';u2Draw();
 try{const X=await schXlsx(),book=await X.readUpload2(file);if(SCHUP2!==u)return;u.book=book;u.sheet=0;u2ChooseSheet();}
 catch(e){u.fail=e.message;}finally{if(SCHUP2===u){u.busy=false;u2Draw();}}
}
function u2Draw(){
 const u=SCHUP2,box=$('#dlg.sch-up2 .box');if(!u||!box)return;const top=box.scrollTop;
 let h='<h3>액션 업로드2</h3><p class="u2-muted">파일 선택 → 열 연결 → 변경 내용 확인 → 적용</p>';
 if(!u.book){h+='<label class="u2-drop">엑셀(.xlsx) 파일 선택<input type="file" data-u2file accept=".xlsx"></label><p>기존 업로드와 별개로 액션 목록을 가져옵니다. 관계도·조달·게이트는 기존 업로드를 사용해주세요.</p>';}
 else if(!u.rows){
  const sheets=u.book.sheets,sh=u2Sheet(),head=sh.rows[u.head]||[];
  h+='<p>'+esc(u.book.name)+'</p><div class="u2-controls"><label>시트 <select data-u2sheet>'+sheets.map((s,i)=>'<option value="'+i+'" '+(i===u.sheet?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label><label>머리글 행 <input data-u2head type="number" min="1" max="'+Math.max(1,sh.rows.length)+'" value="'+(u.head+1)+'"></label><button data-u2="file">다른 파일</button></div>';
  h+='<div class="u2-map">'+U2_FIELDS.map(([k,label])=>'<label>'+label+'<select data-u2map="'+k+'"><option value="-1">연결 안 함 · 기존값 유지</option>'+head.map((v,i)=>'<option value="'+i+'" '+(u.map[k]===i?'selected':'')+'>'+String.fromCharCode(65+Math.floor(i/26)-1).replace('@','')+(i<26?'': '')+String.fromCharCode(65+i%26)+'열 · '+esc(v||'(제목 없음)')+'</option>').join('')+'</select></label>').join('')+'</div>';
  h+='<p class="u2-muted">업무명 열은 필수입니다. 신규 업무는 시작일·완료일도 필요합니다. 연결하지 않은 열은 변경하지 않습니다. 같은 열 구성의 연결 설정은 이 브라우저에서 기억합니다.</p><details><summary>원본 미리보기</summary><div class="u2-scroll"><table>'+sh.rows.slice(u.head,u.head+6).map((r,i)=>'<tr><th>'+(u.head+i+1)+'</th>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</table></div></details>';
 }else{
  const p=u2Build();u.preview=p;
  h+='<p>'+esc(u.book.name)+' · '+esc(u2Sheet().name)+'</p><p class="u2-count">신규 '+p.adds+' · 변경 '+p.updates+' · 파일에 없음 '+p.missing.length+' (기본 유지) · 제외 '+p.skips+'</p>';
  h+='<p class="u2-muted">기존 업무를 연결하면 본문·댓글·첨부와 내부 번호를 유지합니다. 체크된 값만 엑셀 값으로 바뀝니다. 빈칸은 기본 유지합니다.</p>';
  const tasks=schModel(u.pid).plan.tasks;
  h+=p.diff.map(({r,t,isNew,changes,errors})=>'<section class="u2-row"><b>'+r.row+'행 · '+esc(r.values.name||r.key||'(업무명 없음)')+'</b><select data-u2target="'+r.row+'"><option value="choose" '+(r.target==='choose'?'selected':'')+'>연결할 업무를 선택해주세요</option><option value="new" '+(r.target==='new'?'selected':'')+'>새 업무 추가</option><option value="skip">이 행 제외</option>'+tasks.map(q=>'<option value="'+esc(q.id)+'" '+(r.target===q.id?'selected':'')+'>'+esc(q.wbs+' · '+q.name)+'</option>').join('')+'</select>'+errors.map(e=>'<p class="u2-error">'+esc(e)+'</p>').join('')+
  (isNew?'<p>'+esc(r.values.plannedStart||'시작일 없음')+' ~ '+esc(r.values.plannedFinish||'완료일 없음')+'</p>':'')+
  changes.map(c=>'<label class="u2-change"><input type="checkbox" data-u2choice="'+r.row+'" data-field="'+c.key+'" '+(c.selected||isNew?'checked':'')+' '+(isNew?'disabled':'')+'><b>'+c.label+'</b><span>'+esc(c.key==='progress'&&c.old!=null?Math.round(c.old*100)+'%':u2value(c.old)||'(없음)')+' → '+esc(c.blank?'빈칸으로 지우기':c.key==='progress'?Math.round(c.next*100)+'%':u2value(c.next))+'</span></label>').join('')+(r.blank.length?'<p class="u2-muted">빈칸: '+r.blank.map(k=>U2_FIELDS.find(f=>f[0]===k)[1]).join(', ')+' · 체크하지 않으면 유지</p>':'')+'</section>').join('');
  const skipped=u.rows.filter(r=>r.target==='skip');if(skipped.length)h+='<details><summary>제외한 행 '+skipped.length+'개</summary>'+skipped.map(r=>'<p>'+r.row+'행 '+esc(r.values.name||r.key)+' <button data-u2restore="'+r.row+'">다시 검토</button></p>').join('')+'</details>';
  h+='<details><summary>파일에 없는 기존 업무 '+p.missing.length+'개 · 유지가 기본</summary><p>삭제를 선택하면 연결 관계도 제거됩니다. 조달 등에 연결된 업무는 삭제가 차단됩니다.</p>'+p.missing.map(t=>'<label class="u2-change"><input type="checkbox" data-u2delete="'+esc(t.id)+'" '+(u.removed.has(t.id)?'checked':'')+'>삭제 선택: '+esc(t.wbs+' · '+t.name)+'</label>').join('')+'</details>';
  if(p.result)h+='<p>운영개시 예상: '+esc(p.oldResult.operationDate||'미정')+' → '+esc(p.result.operationDate||'미정')+'</p>';
  if(p.errors.length)h+='<div class="u2-error">적용 전 확인이 필요합니다.<br>'+p.errors.map(esc).join('<br>')+'</div>';
 }
 if(u.fail)h+='<p class="u2-error" role="alert">'+esc(u.fail)+'</p>';
 h+='<div class="bt"><button data-u2="close" '+(u.busy?'disabled':'')+'>닫기</button>'+(u.rows?'<button data-u2="back">열 연결로 돌아가기</button>':'')+(u.book?'<button class="pri" data-u2="'+(u.rows?'apply':'review')+'" '+(u.busy||(u.rows&&(u.preview.errors.length||!(u.preview.adds+u.preview.updates+u.preview.remove.length+Number(u.preview.mappingChanged))))?'disabled':'')+'>'+(u.busy?'처리 중…':u.rows?'선택한 내용 적용':'변경 내용 확인')+'</button>':'')+'</div>';
 box.innerHTML=h;box.scrollTop=top;
}
async function u2Apply(){
 const u=SCHUP2;if(!u||u.busy)return;
 if(schScenario(u.pid)){u.fail='기본 일정에서 적용해주세요.';u2Draw();return;}
 if(JSON.stringify(SCHED[u.pid]||{})!==u.snapshot){u.fail='검토 중 일정이 변경되었습니다. 열 연결로 돌아가 최신 내용과 다시 비교해주세요.';u2Draw();return;}
 const p=u2Build();if(p.errors.length||!(p.adds+p.updates+p.remove.length+Number(p.mappingChanged)))return;
 if(p.remove.length&&!window.confirm('선택한 기존 업무 '+p.remove.length+'개와 연결 관계를 삭제하고 적용하시겠습니까?'))return;
 u.busy=true;u2Draw();
 const root=SCHED[u.pid]||(SCHED[u.pid]={}),beforeMeta={up2keys:copy(root.up2keys||null),up2last:copy(root.up2last||null)};
 try{
  const previousUndo=SCH.undo[SCH.undo.length-1];
  if(!schCommit(u.pid,d=>Object.assign(d,p.draft),'업로드2',true,true))throw Error('변경을 적용하지 못했습니다.');
  const last={file:u.book.name,sheet:u2Sheet().name,at:new Date().toISOString(),by:sharedUser,added:p.adds,updated:p.updates,removed:p.remove.length};
  root.up2keys=p.aliases;root.up2last=last;
  const undo=SCH.undo[SCH.undo.length-1];if(undo!==previousUndo&&undo?.pid===u.pid){Object.assign(undo.before,beforeMeta);Object.assign(undo.after,{up2keys:copy(p.aliases),up2last:copy(last)});}else{SCH.undo.push({pid:u.pid,sc:'',before:beforeMeta,after:{up2keys:copy(p.aliases),up2last:copy(last)},label:'업로드2'});SCH.redo.length=0;}
  try{localStorage.setItem(u2MapKey(),JSON.stringify(u.map));}catch(e){}
  const saved=await sharedFlush(true);
  u.busy=false;u2Close();schRedraw(true);
  toast(saved?'업로드2 내용을 저장했습니다.':'화면에 반영했지만 서버 저장을 확인하지 못했습니다. 연결 후 저장 상태를 확인해주세요.',6000,{t:'되돌리기',fn:schUndo,keep:true});
 }catch(e){u.busy=false;u.fail=e.message;u2Draw();}
}
function u2Open(pid){
 if($('#dlg'))return;if(!schReady(pid)){toast('일정을 불러온 뒤 다시 눌러주세요.');return;}
 if(schScenario(pid)){toast('업로드2는 기본 일정에서 사용해주세요.');return;}
 closePop();SCHUP2={pid,book:null,sheet:0,head:0,map:{},rows:null,removed:new Set(),busy:false,fail:''};
 const d=document.createElement('div');d.id='dlg';d.className='dlg sch-dlg sch-up2';d.innerHTML='<div class="box" role="dialog" aria-modal="true" aria-label="액션 업로드2"></div>';document.body.append(d);
 d.addEventListener('dragover',e=>e.preventDefault());
 d.addEventListener('drop',e=>{e.preventDefault();if(!SCHUP2.busy&&e.dataTransfer?.files.length){SCHUP2.book=null;u2ResetReview();u2File(e.dataTransfer.files[0]);}});
 d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();u2Close();}});
 d.addEventListener('change',e=>{
  const t=e.target,u=SCHUP2;if(!u||u.busy)return;
  if(t.matches('[data-u2file]')){u2File(t.files[0]);return;}
  if(t.matches('[data-u2sheet]')){u.sheet=+t.value;u2ChooseSheet();}
  if(t.matches('[data-u2head]')){u.head=Math.max(0,Math.min(u2Sheet().rows.length-1,(+t.value||1)-1));u2ChooseHeader();}
  if(t.matches('[data-u2map]'))u.map[t.dataset.u2map]=+t.value;
  if(t.matches('[data-u2target]')){const r=u.rows.find(r=>r.row===+t.dataset.u2target);r.target=t.value;r.choices={};u.removed.clear();}
  if(t.matches('[data-u2choice]'))u.rows.find(r=>r.row===+t.dataset.u2choice).choices[t.dataset.field]=t.checked;
  if(t.matches('[data-u2delete]'))t.checked?u.removed.add(t.dataset.u2delete):u.removed.delete(t.dataset.u2delete);
  u2Draw();
 });
 d.addEventListener('click',e=>{
  const b=e.target.closest('[data-u2],[data-u2restore]');if(!b||SCHUP2?.busy)return;
  if(b.dataset.u2restore){SCHUP2.rows.find(r=>r.row===+b.dataset.u2restore).target='choose';u2Draw();return;}
  const k=b.dataset.u2;if(k==='close')u2Close();else if(k==='file'){SCHUP2.book=null;u2ResetReview();u2Draw();}
  else if(k==='back'){u2ResetReview();u2Draw();}else if(k==='review'){try{u2ReadRows();}catch(e){SCHUP2.fail=e.message;}u2Draw();}else if(k==='apply')u2Apply();
 });
 u2Draw();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-upload2]')){e.preventDefault();e.stopPropagation();u2Open(S.proj);}});
(function(){const s=document.createElement('style');s.textContent='.sch-up2 .box{width:min(1000px,calc(100vw - 48px));max-height:90vh;overflow:auto;padding:24px}.sch-up2 h3{font-size:21px;margin:0 0 12px}.sch-up2 p{font-size:13px;line-height:1.6;margin:8px 0}.sch-up2 select,.sch-up2 input[type=number]{border:1px solid #ccc;border-radius:4px;background:#fff;color:#333;padding:7px;font:inherit;max-width:100%}.u2-controls,.u2-map{display:flex;flex-wrap:wrap;gap:14px;margin:16px 0}.u2-map>label{display:grid;gap:5px;width:calc(50% - 14px);font-size:13px}.u2-controls input{width:70px}.u2-drop{display:block;border:1px dashed #aaa;padding:30px;margin:20px 0}.u2-drop input{display:block;margin-top:14px}.u2-muted{color:#888}.u2-row{border:1px solid #ddd;border-radius:6px;padding:14px;margin:12px 0}.u2-row>select{display:block;width:100%;margin:10px 0}.u2-change{display:flex;align-items:center;gap:10px;font-size:13px;margin:9px 0}.u2-change input{appearance:auto;flex:none;width:14px;height:14px;accent-color:#777}.u2-change b{min-width:65px}.u2-error{color:#c33;font-size:13px;line-height:1.6}.u2-scroll{overflow:auto;max-height:220px}.u2-scroll td,.u2-scroll th{padding:6px;border:1px solid #ddd;white-space:nowrap;font-size:12px}.sch-up2 details{margin:14px 0;font-size:13px}.sch-up2 .bt{position:sticky;bottom:-24px;background:white;padding:15px 0;margin-top:18px;display:flex;justify-content:flex-end;gap:10px}.sch-up2 button:disabled{opacity:.45;cursor:default}';document.head.append(s);})();
