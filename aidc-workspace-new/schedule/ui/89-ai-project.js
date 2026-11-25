// Only the report above the existing calendar of the explicit trial project.
const AI_PROJECT_ID='ai-application-test';
const schAIProject=pid=>['ai-application-test','ai-upload-test'].includes(pid);
let schAILib;
const schAIEndpoint=(action,pid=S.proj)=>'/api/ai-project/'+action+'?project='+encodeURIComponent(pid);
const schAIRefs=()=>'';

let schAIDraft=null,schAIDirectBusy=false;

const schAIZone=s=>s.zone|| (s.type==='metrics'?(/재무|사업성|조달|수익|투자/.test(s.title)?'fin':'kpi'):/일정|마일스톤/.test(s.title)?'plan':/사업 개요|시설|인프라 현황|조달 구조/.test(s.title)?'main':'right');
const schAISection=(type,title,zone)=>({title,type,zone,paragraphs:[],bullets:[],columns:type==='table'?['항목','내용']:[],rows:[],metrics:[],refs:[]});
const schAIBlank=()=>({title:'사업 개요',summary:'',sections:[schAISection('metrics','핵심 지표','kpi'),schAISection('metrics','사업성 지표','fin'),schAISection('table','사업 정보','main'),{...schAISection('table','추진 일정','plan'),columns:['시기','내용','상태']},schAISection('paragraphs','사업 내용','right')],warnings:[]});
function schAIInline(path,value,tag='span',cls='',ph='입력'){
 return '<'+tag+' class="'+cls+(schAIDraft?' editable':'')+'"'+(schAIDraft?' contenteditable="true" data-ai-inline="'+path+'" data-ph="'+esc(ph)+'"':'')+'>'+(schAIDraft?esc(value):schRepTxt(value))+'</'+tag+'>';
}
function schAIReport(r,editing=false){
 if(!r)r=schAIBlank();
 const E=editing&&!!schAIDraft;
 const field=(path,v,tag='span',cls='',ph='입력')=>E?schAIInline(path,v,tag,cls,ph):'<'+tag+' class="'+cls+'">'+schRepTxt(v)+'</'+tag+'>';
 const action=(a,i,t)=>E?'<button type="button" class="sh-btn lib radd" title="행 추가" aria-label="행 추가" data-ai-action="'+a+'" data-ai-index="'+i+'">'+t+'</button>':'';
 const blocks=r.sections.map((s,i)=>{
  const key='sections.'+i,zone=schAIZone(s);let body='';
  if(s.type==='metrics')body='<div class="rkp '+(zone==='fin'?'fin':'')+'">'+s.metrics.map((m,j)=>'<div class="k">'+field(key+'.metrics.'+j+'.value',m.value,'b')+field(key+'.metrics.'+j+'.label',m.label)+field(key+'.metrics.'+j+'.note',m.note)+(E?'<button class="rx" data-ai-action="delmetric" data-ai-index="'+i+'" data-ai-row="'+j+'">✕</button>':'')+'</div>').join('')+action('row',i,'＋')+'</div>';
  else if(s.type==='table'){
   const plan=zone==='plan'&&s.columns.length===3;
   const locationMap=row=>!E&&zone==='main'&&s.columns.length===2&&/^(위치|주소|소재지)$/.test(String(row[0]||'').trim())&&mapQuery(row[1])&&!/자료 없음|확인 필요|보완 필요/.test(row[1])?'<div class="rmapbox">'+mapBox(row[1],'')+'</div>':'';
   body='<div class="rtb '+(plan?'plan':'')+'"><div class="r th" '+(!plan&&s.columns.length!==2?'style="grid-template-columns:repeat('+Math.max(1,s.columns.length)+',minmax(0,1fr))"':'')+'>'+s.columns.map((c,j)=>field(key+'.columns.'+j,c,j===0?'b':'span')).join('')+'</div>'+s.rows.map((row,j)=>'<div class="r" '+(!plan&&s.columns.length!==2?'style="grid-template-columns:repeat('+Math.max(1,s.columns.length)+',minmax(0,1fr))"':'')+'>'+row.map((c,k)=>plan&&k===2&&!E?'<i>'+schRepState(c)+'</i>':field(key+'.rows.'+j+'.'+k,c,k===0?'b':'span')).join('')+(E?'<button class="rx" data-ai-action="delrow" data-ai-index="'+i+'" data-ai-row="'+j+'">✕</button>':'')+locationMap(row)+'</div>').join('')+'</div>'+action('row',i,'＋');
  }else if(E)body=field(key+'.'+s.type,s[s.type].join(s.type==='paragraphs'?'\n\n':'\n'),'div','rtx',s.type==='paragraphs'?'내용 입력':'한 줄에 한 항목');
  else body=s.type==='bullets'?'<ul class="rul">'+s.bullets.map(t=>'<li>'+schRepTxt(t)+'</li>').join('')+'</ul>':s.paragraphs.map(t=>'<div class="rtx">'+schRepTxt(t)+'</div>').join('');
  const controls=E?'<div class="ai-block-controls"><button type="button" data-ai-action="up" data-ai-index="'+i+'">↑</button><button type="button" data-ai-action="down" data-ai-index="'+i+'">↓</button><button type="button" data-ai-action="remove" data-ai-index="'+i+'">삭제</button></div>':'';
  return {zone,type:s.type,body,html:'<div class="rb ai-section"><div class="rt">'+field(key+'.title',s.title)+'</div>'+controls+body+(!E?schAIRefs(s):'')+'</div>'};
 });
 const group=z=>blocks.filter(b=>z.includes(b.zone)).map(b=>b.html).join('');
 const mainTable=!E?blocks.find(b=>b.zone==='main'&&b.type==='table'):null;
 const intro='<div class="rb"><div class="rt">'+field('title',r.title||'사업 개요')+'</div><div class="rmain">'+field('summary',r.summary,'div','rtx','사업의 내용을 적습니다')+'</div>'+(mainTable?mainTable.body:'')+'</div>';
 const mainRest=blocks.filter(b=>['main','plan'].includes(b.zone)&&b!==mainTable).map(b=>b.html).join('');
 const warns='';
 return '<div class="ai-report"><div class="rstats">'+group(['kpi','fin'])+'</div><div class="rcols"><div class="rc rc1">'+intro+mainRest+'</div><div class="rc rc2">'+group(['right'])+warns+'</div></div></div>';
}
function schAIHead(pid){
 if(schAIDraft&&schAIDraft.project!==pid)schAIDraft=null;
 const p=PROJECTS[pid],d=headOf(pid),saved=d.aiOverview,E=!!schAIDraft;
 const report=E?schAIDraft.report:saved?.report;
 const no=schRepNos()[pid]||'';
 return '<div class="phead rep ai-overview '+(S.collapsed?'collapsed ':'')+(E?'ed':'')+'"'+schRepPc(p)+'><div class="ttl"><h1 style="color:'+esc(p.color)+'">'+esc(p.full)+'</h1></div><div class="ov" data-collapse>프로젝트 상세 '+svg('i-chev-d',7.1,3.5,'color:#8e8e8e')+'</div><div class="hr"></div><div class="rep-in"><div class="rmeta"><div class="rml"><span class="m no">No. '+no+'</span><span class="m grp">'+esc(d.grp||'구분 없음')+'</span>'+(d.focus?'<span class="m fo on">집중 추진</span>':'')+'<span class="m st"><b>추진 단계</b>'+statusBadge(p.status)+'</span><i class="sep"></i><span class="m who"><b>담당자</b>'+av()+'<span>'+esc(d.owner||p.owner||'미지정')+'</span></span></div><div class="rmr"><div class="rbt">'+(E?'<button type="button" class="sh-btn edit on" data-ai-direct="save">저장</button><button type="button" class="cancel" data-ai-direct="cancel">취소</button>':'<button type="button" class="sh-btn edit" data-ai-direct="edit">수정</button><button type="button" class="sh-btn upx" data-ai-open="upload">'+svg('i-sch-fup',13,13)+'AI 개요 업로드</button>')+'</div><div class="rdt"><b>최초자료일</b><span>'+esc(d.first||'-')+'</span><b>기준일</b><span>'+esc(d.asof||'-')+'</span></div></div></div>'+schAIReport(report,E)+(E?'<div class="ai-add-section"><select data-ai-new-type aria-label="추가할 내용 형식"><option value="paragraphs">문단</option><option value="bullets">목록</option><option value="metrics">지표</option><option value="table">표</option></select><button type="button" class="sh-btn" data-ai-action="add">＋ 항목 추가</button></div>':'')+'</div><div class="hr bt"></div></div>';
}
function schAISetField(report,path,value){
 const keys=path.split('.');let node=report;for(const k of keys.slice(0,-1))node=node[k];const key=keys.at(-1);
 node[key]=key==='paragraphs'?value.split(/\n\s*\n/).filter(Boolean):['bullets','warnings'].includes(key)?value.split('\n').filter(Boolean):value;
}
document.addEventListener('input',e=>{if(!schAIDraft||!e.target.matches('[data-ai-inline]'))return;schAISetField(schAIDraft.report,e.target.dataset.aiInline,e.target.innerText);});

document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-ai-direct],[data-ai-action]');if(!b||!schAIProject(S.proj))return;e.preventDefault();e.stopPropagation();
 if(schAIDirectBusy)return;
 const mode=b.dataset.aiDirect;
 if(mode==='edit'){
  try{schAIDirectBusy=true;const d=await schAICall('status');schAIDraft={project:S.proj,report:copy(d.saved?.report||schAIBlank()),source:d.saved?.source||{name:'직접 입력',kind:'manual'},revision:d.saved?.revision||0};render(true);}catch(err){toast(err.message);}finally{schAIDirectBusy=false;}return;
 }
 if(!schAIDraft)return;
 if(mode==='cancel'){schAIDraft=null;render(true);return;}
 if(mode==='save'){
  schAIDirectBusy=true;
  try{const d=await schAICall('save',schAIDraft);sharedApply(d.records);schAIDraft=null;render(true);toast('개요를 저장했습니다.');}catch(err){toast(err.message,5000);}finally{schAIDirectBusy=false;}return;
 }
 const a=b.dataset.aiAction,i=+b.dataset.aiIndex,j=+b.dataset.aiRow,r=schAIDraft.report,s=r.sections[i];
 if(a==='add'){if(r.sections.length>=20){toast('항목은 최대 20개입니다.');return;}const type=document.querySelector('[data-ai-new-type]').value;r.sections.push(schAISection(type,'새 항목',type==='metrics'?'kpi':'right'));}
 if(a==='remove')r.sections.splice(i,1);
 if(a==='row'){if(s.type==='metrics')s.metrics.push({label:'',value:'',note:''});else s.rows.push(s.columns.map(()=>''));}

 if(a==='delrow')s.rows.splice(j,1);
 if(a==='delmetric')s.metrics.splice(j,1);
 if(a==='up'&&i>0)[r.sections[i-1],r.sections[i]]=[s,r.sections[i-1]];
 if(a==='down'&&i<r.sections.length-1)[r.sections[i+1],r.sections[i]]=[s,r.sections[i+1]];
 render(true);
});

async function schAICall(action,body,pid=S.proj){
 const r=await apiFetch(schAIEndpoint(action,pid),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 let d;try{d=await r.json();}catch{throw Error('서버 응답을 읽지 못했습니다.');}if(!r.ok)throw Error(d.error||'요청에 실패했습니다.');return d;
}
function schAIEditForm(r){
 const inp=(path,val,area=false)=>area?'<textarea data-ai-field="'+path+'">'+esc(val)+'</textarea>':'<input data-ai-field="'+path+'" value="'+esc(val)+'">';
 return '<label>문서 제목'+inp('title',r.title)+'</label><label>핵심 요약'+inp('summary',r.summary,true)+'</label>'+r.sections.map((s,i)=>{
 const pre='sections.'+i;let inner='';
 if(s.type==='paragraphs'||s.type==='bullets')inner='<label>'+(s.type==='paragraphs'?'문단 (빈 줄로 구분)':'항목 (한 줄에 하나)')+inp(pre+'.'+s.type,s[s.type].join(s.type==='paragraphs'?'\n\n':'\n'),true)+'</label>';
 if(s.type==='metrics')inner=s.metrics.map((m,j)=>'<div class="ai-metric-edit">'+['label','value','note'].map((k,n)=>'<label>'+['지표 이름','값·단위','조건·가정'][n]+inp(pre+'.metrics.'+j+'.'+k,m[k])+'</label>').join('')+'</div>').join('');
 if(s.type==='table')inner='<label>열 제목 (탭으로 구분)'+inp(pre+'.columns',s.columns.join('\t'),true)+'</label><label>표 내용 (행은 줄바꿈, 셀은 탭으로 구분)'+inp(pre+'.rows',s.rows.map(row=>row.join('\t')).join('\n'),true)+'</label>';
 return '<fieldset><legend>섹션 '+(i+1)+'</legend>'+inp(pre+'.title',s.title)+inner+schAIRefs(s)+'<button type="button" data-ai-remove="'+i+'">이 섹션 제외</button></fieldset>';
 }).join('');
}
async function schAIOpen(mode){
 if(!schAIProject(S.proj)||document.getElementById('dlg'))return;
 const pid=S.proj;
 const dialog=document.createElement('div');dialog.id='dlg';dialog.className='dlg ai-dialog';
 dialog.innerHTML='<div class="box" role="dialog" aria-modal="true" aria-label="AI 프로젝트 개요"><header><h3>AI 프로젝트 개요</h3><button type="button" data-ai-close aria-label="닫기">✕</button></header><div class="ai-scroll"><p data-ai-status role="status">설정을 확인하고 있습니다…</p><div data-ai-upload><label class="ai-drop">PDF / PPTX 선택 또는 끌어놓기 · 최대 10MB<input type="file" accept=".pdf,.pptx" data-ai-file></label><p data-ai-filename></p><p class="ai-note">PDF는 페이지 전체를, PPTX는 텍스트를 분석합니다. 그림·차트가 중요한 PPT는 PDF로 저장해 올려주세요. 분석할 때 Claude API로 전송되며 원본 파일은 이 기능에서 서버에 보관하지 않습니다.</p><label>대상 사업 또는 중점 사항 (선택)<input data-ai-hint placeholder="여러 사업이 있는 보고서라면 대상 사업명을 적어주세요"></label><details><summary>분석 프롬프트 확인 · 추가 지침</summary><pre data-ai-prompt></pre><textarea data-ai-instruction placeholder="예: 투자 의사결정에 중요한 조건을 우선 정리"></textarea></details><button type="button" data-ai-analyze disabled>AI로 개요 구성</button></div><div data-ai-result></div></div><footer><button type="button" data-ai-close>닫기</button><button type="button" data-ai-save disabled>이 개요 적용</button></footer></div>';
 document.body.append(dialog);
 let ready=false,busy=false,report=null,source=null,revision=0,file=null,alive=true;
 const find=s=>dialog.querySelector(s), status=t=>{if(alive)find('[data-ai-status]').textContent=t;};
 const close=()=>{if(busy){status('처리 중입니다. 완료된 뒤 닫아주세요.');return;}alive=false;dialog.remove();};
 const draw=()=>{find('[data-ai-result]').innerHTML=report?'<h3>결과 확인 · 수정</h3><div class="ai-preview">'+schAIReport(report)+'</div><details class="ai-edit"><summary>내용 수정</summary>'+schAIEditForm(report)+'</details>':'';find('[data-ai-save]').disabled=!report||busy;};
 const take=f=>{if(!f||busy)return;if(f.size>10*1024*1024||!(/\.(pdf|pptx)$/i.test(f.name))){status('10MB 이하의 PDF 또는 PPTX를 선택해주세요. .ppt는 PPTX 또는 PDF로 저장해주세요.');return;}file=f;report=null;draw();find('[data-ai-filename]').textContent=f.name;find('[data-ai-analyze]').disabled=!ready;status(ready?'문서를 선택했습니다. 분석 버튼을 눌러주세요.':'API 키 등록 후 이 창을 다시 열어주세요.');};
 dialog.addEventListener('change',e=>{if(e.target.matches('[data-ai-file]'))take(e.target.files[0]);});
 const drop=find('.ai-drop');drop.addEventListener('dragover',e=>e.preventDefault());drop.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();take(e.dataTransfer.files[0]);});
 dialog.addEventListener('input',e=>{const path=e.target.dataset.aiField;if(!path||!report)return;const keys=path.split('.');let node=report;for(const k of keys.slice(0,-1))node=node[k];const key=keys.at(-1),v=e.target.value;
  node[key]=key==='rows'?v.split('\n').filter(Boolean).map(x=>x.split('\t')):key==='columns'?v.split('\t'):key==='paragraphs'?v.split(/\n\s*\n/).filter(Boolean):['bullets','warnings'].includes(key)?v.split('\n').filter(Boolean):v;
  const preview=find('.ai-preview');if(preview)preview.innerHTML=schAIReport(report);
 });
 dialog.addEventListener('click',async e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.hasAttribute('data-ai-close')){close();return;}
  if(btn.hasAttribute('data-ai-remove')){report.sections.splice(+btn.dataset.aiRemove,1);draw();return;}
  if(btn.hasAttribute('data-ai-analyze')){
   if(!file||!ready||busy)return;busy=true;btn.disabled=true;find('[data-ai-save]').disabled=true;status('문서 분석 중… 분량에 따라 최대 4분 정도 걸릴 수 있습니다.');
   try{
    let input;
    if(/\.pdf$/i.test(file.name)){const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(',')[1]);fr.onerror=()=>reject(Error('파일을 읽지 못했습니다.'));fr.readAsDataURL(file);});input={kind:'pdf',name:file.name,data};}
    else {if(!window.AIDCAIDocuments){schAILib||=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/ai-documents.js?v=1';s.onload=resolve;s.onerror=()=>{schAILib=null;reject(Error('PPTX 읽기 기능을 불러오지 못했습니다.'));};document.head.append(s);});await schAILib;}input=await window.AIDCAIDocuments.read(file);}
    const d=await schAICall('analyze',{...input,hint:find('[data-ai-hint]').value,instruction:find('[data-ai-instruction]').value},pid);
    report=d.report;source=d.source;if(input.notice)report.warnings.push(input.notice);
    status('분석 완료 · 입력 '+d.usage.input_tokens+' / 출력 '+d.usage.output_tokens+' 토큰. 원문과 비교한 뒤 적용해주세요.');
   }catch(err){status(err.message);}finally{busy=false;btn.disabled=!ready;draw();}return;
  }
  if(btn.hasAttribute('data-ai-save')){
   if(!report||busy)return;busy=true;btn.disabled=true;status('개요를 저장하고 있습니다…');
   try{const d=await schAICall('save',{report,source,revision},pid);sharedApply(d.records);render(true);busy=false;close();toast('프로젝트 개요를 저장했습니다.');}
   catch(err){status(err.message);busy=false;btn.disabled=false;}return;
  }
 });
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 try{const d=await schAICall('status',undefined,pid);if(!alive)return;ready=d.ready;revision=d.saved?.revision||0;find('[data-ai-prompt]').textContent=d.prompt;
  status(ready?'Claude 연결 설정이 등록되어 있습니다.': 'API 키 미등록: Cloudflare → sunjin-aidc-workspace-demo → Settings → Variables and Secrets → Secret ANTHROPIC_API_KEY 추가 후 Deploy. 키는 이 화면에 입력하지 않습니다.');
  if(mode==='edit'&&d.saved){report=copy(d.saved.report);source=d.saved.source;find('[data-ai-upload]').hidden=true;draw();find('.ai-edit').open=true;}
 }catch(err){status(err.message);}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai-open]');if(b&&schAIProject(S.proj)){e.preventDefault();e.stopPropagation();schAIOpen(b.dataset.aiOpen);}});
const aiStyle=document.createElement('style');aiStyle.textContent=`
.ai-overview .ai-block-controls{display:flex;gap:8px;align-items:center;margin:0 0 10px;font-size:12px}.ai-overview .ai-block-controls button,.ai-overview .ai-block-controls select,.ai-overview .ai-add-section select{font:inherit;border:1px solid #ddd;background:var(--bg,#fff);color:inherit;padding:4px 8px;border-radius:4px}.ai-overview .ai-add-section{display:flex;gap:12px;margin-top:28px}.ai-overview [data-ai-inline]{white-space:pre-wrap;min-height:20px}.ai-overview [data-ai-inline]:empty:before{content:attr(data-ph);color:#bbb}.ai-overview .rtx + .rtx{margin-top:10px}.ai-overview .ai-refs,.ai-dialog .ai-refs{font-size:11px;color:#8e8e8e;margin-top:12px}.ai-overview .ai-refs p{line-height:1.6}.ai-dialog .rcols{column-gap:32px}.ai-dialog .rstats .rkp{grid-template-columns:repeat(4,minmax(0,1fr))}.ai-dialog .ai-report{--pc:#375cdb}.ai-dialog .ai-report h2{font-size:20px}
.ai-dialog{z-index:12000}.ai-dialog .box{width:min(1100px,94vw);max-height:90vh;display:flex;flex-direction:column;padding:0;overflow:hidden}.ai-dialog header,.ai-dialog footer{padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e5e9}.ai-dialog footer{border-top:1px solid #e2e5e9;border-bottom:0;justify-content:flex-end;gap:10px}.ai-scroll{padding:20px 24px;overflow:auto;min-height:0}.ai-dialog label{display:block;margin:14px 0;font-size:14px}.ai-dialog input,.ai-dialog textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid #d6dce5;border-radius:5px;font:inherit}.ai-dialog textarea{min-height:90px;resize:vertical}.ai-dialog pre{white-space:pre-wrap;font:12px/1.7 sans-serif;max-height:220px;overflow:auto}.ai-drop{padding:24px;border:1px dashed #a8b8d4;background:#f6f8fc;border-radius:8px}.ai-dialog fieldset{border:1px solid #e1e5eb;border-radius:6px;margin:16px 0;padding:14px}.ai-metric-edit{display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px}.ai-preview{padding:20px 0}.ai-edit{margin:12px 0}.ai-dialog [data-ai-status]{white-space:pre-wrap;line-height:1.7}@media(max-width:700px){.ai-sections{grid-template-columns:1fr}.ai-metric-edit{grid-template-columns:1fr}.ai-dialog .box{width:96vw}.ai-overview .ttl{flex-wrap:wrap}}
`;document.head.append(aiStyle);
